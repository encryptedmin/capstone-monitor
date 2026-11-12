from django.db import models


class StoredFile(models.Model):
    """Metadata for an uploaded file whose bytes are stored in MySQL chunks."""

    key = models.CharField(max_length=64, primary_key=True)
    name = models.CharField(max_length=512)
    content_type = models.CharField(max_length=255, blank=True)
    size = models.PositiveBigIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name


class StoredFileChunk(models.Model):
    """A one-megabyte piece of a file, keeping each SQL write packet small."""

    stored_file = models.ForeignKey(
        StoredFile,
        on_delete=models.CASCADE,
        related_name="chunks",
    )
    chunk_index = models.PositiveIntegerField()
    content = models.BinaryField()

    class Meta:
        ordering = ["chunk_index"]
        constraints = [
            models.UniqueConstraint(
                fields=["stored_file", "chunk_index"],
                name="uploads_file_chunk_unique",
            )
        ]

    def __str__(self):
        return f"{self.stored_file.name} [{self.chunk_index}]"
