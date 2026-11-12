import hashlib
import mimetypes
import os
import uuid
from bisect import bisect_right

from django.core.files.storage import Storage
from django.db import IntegrityError, transaction
from django.db.models.functions import Length

from .models import StoredFile, StoredFileChunk

CHUNK_SIZE = 1024 * 1024
INSERT_BATCH_SIZE = 4


def _key_for(name):
    return hashlib.sha256(name.encode("utf-8")).hexdigest()


class AivenDatabaseFile:
    """Seekable, read-only stream that fetches file chunks from MySQL as needed."""

    def __init__(self, name, size, content_type):
        self.name = name
        self.size = size
        self.content_type = content_type
        self.position = 0
        self.closed = False
        self._cached_index = None
        self._cached_chunk = b""
        self._chunk_layout = None
        self._chunk_starts = None

    def readable(self):
        return True

    def seekable(self):
        return True

    def tell(self):
        return self.position

    def seek(self, offset, whence=os.SEEK_SET):
        if whence == os.SEEK_SET:
            position = offset
        elif whence == os.SEEK_CUR:
            position = self.position + offset
        elif whence == os.SEEK_END:
            position = self.size + offset
        else:
            raise ValueError(f"Invalid seek mode: {whence}")
        if position < 0:
            raise ValueError("Cannot seek before the start of a stored file.")
        self.position = position
        return position

    def read(self, size=-1):
        if self.closed:
            raise ValueError("I/O operation on closed file.")
        if size is None or size < 0:
            size = max(self.size - self.position, 0)
        size = min(size, max(self.size - self.position, 0))
        if size == 0:
            return b""

        self._load_chunk_layout()
        result = bytearray()
        remaining = size
        layout_index = bisect_right(self._chunk_starts, self.position) - 1
        while remaining:
            if layout_index < 0 or layout_index >= len(self._chunk_layout):
                raise OSError("Stored file content is incomplete.")

            chunk_index, chunk_start, chunk_size = self._chunk_layout[layout_index]
            chunk_end = chunk_start + chunk_size
            if self.position >= chunk_end:
                layout_index += 1
                continue
            if self.position < chunk_start:
                raise OSError("Stored file content is incomplete.")

            if self._cached_index != chunk_index:
                try:
                    self._cached_chunk = bytes(
                        StoredFileChunk.objects.values_list("content", flat=True).get(
                            stored_file_id=_key_for(self.name),
                            chunk_index=chunk_index,
                        )
                    )
                except StoredFileChunk.DoesNotExist as exc:
                    raise OSError("Stored file content is incomplete.") from exc
                if len(self._cached_chunk) != chunk_size:
                    raise OSError("Stored file content is incomplete.")
                self._cached_index = chunk_index

            chunk_offset = self.position - chunk_start
            count = min(remaining, len(self._cached_chunk) - chunk_offset)
            if count <= 0:
                raise OSError("Stored file content is incomplete.")
            result.extend(self._cached_chunk[chunk_offset : chunk_offset + count])
            self.position += count
            remaining -= count
            if self.position >= chunk_end:
                layout_index += 1
        return bytes(result)

    def _load_chunk_layout(self):
        if self._chunk_layout is not None:
            return

        layout = []
        offset = 0
        rows = (
            StoredFileChunk.objects.filter(stored_file_id=_key_for(self.name))
            .order_by("chunk_index")
            .values_list("chunk_index", Length("content"))
        )
        for chunk_index, chunk_size in rows:
            chunk_size = int(chunk_size or 0)
            if chunk_size == 0:
                continue
            layout.append((chunk_index, offset, chunk_size))
            offset += chunk_size

        if offset != self.size:
            raise OSError("Stored file content is incomplete.")
        self._chunk_layout = layout
        self._chunk_starts = [chunk_start for _, chunk_start, _ in layout]

    def validate(self):
        """Check stored chunk lengths before streaming the response headers."""
        self._load_chunk_layout()

    def close(self):
        self._cached_chunk = b""
        self.closed = True

    def __enter__(self):
        if self.closed:
            raise ValueError("I/O operation on closed file.")
        return self

    def __exit__(self, exc_type, exc_value, traceback):
        self.close()


class AivenDatabaseStorage(Storage):
    """Django storage backend that keeps uploaded file bytes in the app database."""

    def _open(self, name, mode="rb"):
        if mode not in ("rb", "r"):
            raise ValueError("AivenDatabaseStorage only supports reading files.")
        try:
            stored_file = StoredFile.objects.get(key=_key_for(name), name=name)
        except StoredFile.DoesNotExist as exc:
            raise FileNotFoundError(name) from exc
        return AivenDatabaseFile(name, stored_file.size, stored_file.content_type)

    def _save(self, name, content):
        name = name.replace("\\", "/")
        candidate = name
        content_type = (
            getattr(content, "content_type", None)
            or mimetypes.guess_type(name)[0]
            or "application/octet-stream"
        )

        while True:
            key = _key_for(candidate)
            try:
                with transaction.atomic():
                    StoredFile.objects.create(
                        key=key,
                        name=candidate,
                        content_type=content_type,
                        size=0,
                    )
                    batch = []
                    total_size = 0
                    chunk_index = 0
                    for upload_chunk in content.chunks(chunk_size=CHUNK_SIZE):
                        upload_chunk = memoryview(upload_chunk)
                        for offset in range(0, len(upload_chunk), CHUNK_SIZE):
                            chunk = bytes(upload_chunk[offset : offset + CHUNK_SIZE])
                            batch.append(
                                StoredFileChunk(
                                    stored_file_id=key,
                                    chunk_index=chunk_index,
                                    content=chunk,
                                )
                            )
                            total_size += len(chunk)
                            chunk_index += 1
                            if len(batch) >= INSERT_BATCH_SIZE:
                                StoredFileChunk.objects.bulk_create(batch)
                                batch.clear()
                    if batch:
                        StoredFileChunk.objects.bulk_create(batch)
                    StoredFile.objects.filter(key=key).update(size=total_size)
                return candidate
            except IntegrityError:
                if not StoredFile.objects.filter(key=key).exists():
                    raise
                directory, filename = os.path.split(name)
                stem, extension = os.path.splitext(filename)
                replacement = f"{stem}_{uuid.uuid4().hex}{extension}"
                candidate = os.path.join(directory, replacement).replace("\\", "/")

    def delete(self, name):
        StoredFile.objects.filter(key=_key_for(name), name=name).delete()

    def exists(self, name):
        return StoredFile.objects.filter(key=_key_for(name), name=name).exists()

    def size(self, name):
        try:
            return StoredFile.objects.values_list("size", flat=True).get(
                key=_key_for(name), name=name
            )
        except StoredFile.DoesNotExist as exc:
            raise FileNotFoundError(name) from exc

    def listdir(self, path):
        prefix = path.strip("/")
        if prefix:
            prefix += "/"
        names = StoredFile.objects.filter(name__startswith=prefix).values_list("name", flat=True)
        directories = set()
        files = set()
        for name in names:
            relative = name[len(prefix) :]
            if "/" in relative:
                directories.add(relative.split("/", 1)[0])
            else:
                files.add(relative)
        return sorted(directories), sorted(files)

    def url(self, name):
        # There is intentionally no general-purpose file URL: the application
        # serves each file through an authenticated, permission-scoped API
        # action. Returning an empty URL also lets Django's generic admin file
        # widget render without creating a public or unscoped link.
        return ""
