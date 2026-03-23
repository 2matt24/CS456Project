from urllib.parse import urlencode
import os

from authlib.integrations.flask_client import OAuth
from flask import Blueprint, redirect, request, session, url_for

from aistudyassistant.extensions import db
from aistudyassistant.models.user import User
from aistudyassistant.services.auth_tokens import issue_auth_token

oauth_bp = Blueprint("oauth", __name__)
oauth = OAuth()

FRONTEND_URL = os.getenv("FRONTEND_URL", "https://cs-456-project-huy8.vercel.app").rstrip("/")


def _frontend_redirect(path: str = "/", **params):
    url = f"{FRONTEND_URL}{path}"
    if params:
        url = f"{url}?{urlencode(params)}"
    return redirect(url)


def _upsert_oauth_user(email: str, first_name: str | None, last_name: str | None, password_stub: str):
    normalized_email = (email or "").strip().lower()
    if not normalized_email:
        raise ValueError("OAuth provider did not return an email address")

    user = User.query.filter_by(Email=normalized_email).first()
    if not user:
        user = User(
            Email=normalized_email,
            FirstName=first_name,
            LastName=last_name,
            PasswordHash=password_stub,
        )
        db.session.add(user)
        db.session.commit()
    else:
        changed = False
        if first_name and not user.FirstName:
            user.FirstName = first_name
            changed = True
        if last_name and not user.LastName:
            user.LastName = last_name
            changed = True
        if changed:
            db.session.commit()

    session["user_id"] = user.UserID
    return user


def _oauth_error(message: str):
    return _frontend_redirect("/", oauthError=message)


oauth.register(
    name="google",
    client_id=os.getenv("GOOGLE_CLIENT_ID"),
    client_secret=os.getenv("GOOGLE_CLIENT_SECRET"),
    server_metadata_url="https://accounts.google.com/.well-known/openid-configuration",
    client_kwargs={"scope": "openid email profile"},
)

oauth.register(
    name="apple",
    client_id=os.getenv("APPLE_CLIENT_ID"),
    client_secret=os.getenv("APPLE_CLIENT_SECRET"),
    server_metadata_url="https://appleid.apple.com/.well-known/openid-configuration",
    client_kwargs={"scope": "name email"},
)


@oauth_bp.route("/api/auth/google")
def google_login():
    if not os.getenv("GOOGLE_CLIENT_ID") or not os.getenv("GOOGLE_CLIENT_SECRET"):
        return _oauth_error("Google sign-in is not configured on the server.")

    redirect_uri = url_for("oauth.google_callback", _external=True)
    return oauth.google.authorize_redirect(redirect_uri)


@oauth_bp.route("/api/auth/google/callback")
def google_callback():
    error_param = request.args.get("error")
    if error_param:
        return _oauth_error(f"Google login failed: {error_param}")

    try:
        token = oauth.google.authorize_access_token()
        user_info = token.get("userinfo") or oauth.google.userinfo()
        user = _upsert_oauth_user(
            email=user_info.get("email"),
            first_name=user_info.get("given_name"),
            last_name=user_info.get("family_name"),
            password_stub="oauth_google",
        )
    except Exception as exc:
        return _oauth_error(f"Google login failed: {exc}")

    return _frontend_redirect("/dashboard", token=issue_auth_token(user.UserID))


@oauth_bp.route("/api/auth/apple")
def apple_login():
    if not os.getenv("APPLE_CLIENT_ID") or not os.getenv("APPLE_CLIENT_SECRET"):
        return _oauth_error("Apple sign-in is not configured on the server.")

    redirect_uri = url_for("oauth.apple_callback", _external=True)
    return oauth.apple.authorize_redirect(redirect_uri)


@oauth_bp.route("/api/auth/apple/callback")
def apple_callback():
    error_param = request.args.get("error")
    if error_param:
        return _oauth_error(f"Apple login failed: {error_param}")

    try:
        token = oauth.apple.authorize_access_token()
        user_info = token.get("userinfo") or {}
        name = user_info.get("name") or {}
        user = _upsert_oauth_user(
            email=user_info.get("email"),
            first_name=name.get("firstName"),
            last_name=name.get("lastName"),
            password_stub="oauth_apple",
        )
    except Exception as exc:
        return _oauth_error(f"Apple login failed: {exc}")

    return _frontend_redirect("/dashboard", token=issue_auth_token(user.UserID))
