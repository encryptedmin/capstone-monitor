from django.conf import settings
from django.http import FileResponse, HttpResponse, HttpResponseRedirect


def frontend_app(request, path=""):
    index_path = settings.FRONTEND_BUILD_DIR / "index.html"
    if index_path.is_file():
        return FileResponse(index_path.open("rb"), content_type="text/html")

    if settings.DEBUG:
        return HttpResponseRedirect("http://127.0.0.1:5173/")

    return HttpResponse(
        "The frontend bundle is missing from this deployment.", status=503
    )
