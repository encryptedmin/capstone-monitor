import mimetypes
from pathlib import PurePosixPath
import string

from django.http import FileResponse, Http404
from django.utils.http import content_disposition_header


def display_file_name(name):
    filename = PurePosixPath(name).name
    prefix, separator, remainder = filename[:32], filename[32:33], filename[33:]
    if separator == "_" and len(prefix) == 32 and all(char in string.hexdigits for char in prefix):
        return remainder
    return filename


def private_file_response(file_field):
    """Stream an uploaded file from its storage without exposing a public URL."""
    if not file_field or not file_field.name:
        raise Http404("File not found.")

    try:
        stream = file_field.open("rb")
    except (FileNotFoundError, OSError, ValueError) as exc:
        raise Http404("File not found.") from exc

    filename = display_file_name(file_field.name)
    content_type = (
        getattr(stream, "content_type", None)
        or mimetypes.guess_type(filename)[0]
        or "application/octet-stream"
    )
    response = FileResponse(stream, content_type=content_type)
    response["Content-Disposition"] = content_disposition_header(False, filename)
    response["Cache-Control"] = "private, no-store"
    return response
