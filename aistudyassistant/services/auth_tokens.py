from __future__ import annotations

import os
from typing import Optional

from flask import request, session
from itsdangerous import BadSignature, SignatureExpired, URLSafeTimedSerializer


def _serializer() -> URLSafeTimedSerializer:
    secret = os.getenv("SECRET_KEY", "dev-secret-key")
    return URLSafeTimedSerializer(secret_key=secret, salt="studybuddy-auth-token")


def issue_auth_token(user_id: int) -> str:
    return _serializer().dumps({"user_id": int(user_id)})


def _read_bearer_token() -> Optional[str]:
    header = request.headers.get("Authorization", "")
    prefix = "Bearer "
    if header.startswith(prefix):
        return header[len(prefix):].strip() or None
    return None


def get_authenticated_user_id(max_age_seconds: int = 60 * 60 * 24 * 30) -> Optional[int]:
    session_required = request.headers.get("X-StudyBuddy-Session") == "required"
    session_user_id = session.get("user_id")
    if session_user_id:
        return session_user_id


    # If the browser sent a Flask session cookie but it doesn't decode to an
    # authenticated user, treat that as unauthenticated instead of silently
    # falling back to bearer auth. This prevents a tampered/expired session
    # cookie from appearing valid after a page reload.
    if request.cookies.get("session"):
        return None

    token = _read_bearer_token()
    if not token:
        return None

    try:
        payload = _serializer().loads(token, max_age=max_age_seconds)
    except (BadSignature, SignatureExpired):
        return None

    user_id = payload.get("user_id")
    try:
        return int(user_id)
    except (TypeError, ValueError):
        return None
