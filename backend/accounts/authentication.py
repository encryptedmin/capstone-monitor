from django.conf import settings
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import AuthenticationFailed, InvalidToken

from .models import LoginSession


class StrictJWTAuthentication(JWTAuthentication):
    """
    Accept JWTs only when they point to a live LoginSession for this server
    process. This lets us invalidate tokens on logout, tab-close cleanup,
    replacement login on the same device, and backend restart.
    """

    def get_user(self, validated_token):
        user = super().get_user(validated_token)
        session = self._get_active_session(validated_token, user)
        session.touch()
        return user

    def _get_active_session(self, validated_token, user):
        session_id = validated_token.get("sid")
        device_id = validated_token.get("did")
        server_instance_id = validated_token.get("srv")

        if not session_id or not device_id or not server_instance_id:
            raise InvalidToken("Token is missing session information.")

        try:
            session = LoginSession.objects.get(id=session_id, user=user, device_id=device_id)
        except LoginSession.DoesNotExist as exc:
            raise AuthenticationFailed("Session is no longer active.") from exc

        if session.server_instance_id != settings.SESSION_SERVER_INSTANCE_ID:
            session.end(LoginSession.END_SERVER_RESTART)
            raise AuthenticationFailed("Session expired after server restart.")

        if server_instance_id != settings.SESSION_SERVER_INSTANCE_ID:
            session.end(LoginSession.END_SERVER_RESTART)
            raise AuthenticationFailed("Session expired after server restart.")

        if not session.is_active:
            raise AuthenticationFailed("Session is no longer active.")

        return session
