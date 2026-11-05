import mimetypes
from pathlib import PurePosixPath

from django.http import FileResponse, Http404
from django.utils.http import content_disposition_header


def private_file_response(file_field):
    """Stream an uploaded file from its storage without exposing a public URL."""
    if not file_field or not file_field.name:
        raise Http404("File not found.")

    try:
        stream = file_field.open("rb")
    except (FileNotFoundError, OSError, ValueError) as exc:
        raise Http404("File not found.") from exc

    filename = PurePosixPath(file_field.name).name
    content_type = mimetypes.guess_type(filename)[0] or "application/octet-stream"
    response = FileResponse(stream, content_type=content_type)
    response["Content-Disposition"] = content_disposition_header(False, filename)
    response["Cache-Control"] = "private, no-store"
    return response
