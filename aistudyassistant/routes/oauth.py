from flask import Blueprint, redirect, request, session, url_for
from authlib.integrations.flask_client import OAuth
from aistudyassistant.extensions import db
from aistudyassistant.models.user import User
import os

oauth_bp = Blueprint("oauth", __name__)
oauth = OAuth()

# Google OAuth Config
oauth.register(
    name='google',
    client_id=os.getenv('GOOGLE_CLIENT_ID'),
    client_secret=os.getenv('GOOGLE_CLIENT_SECRET'),
    server_metadata_url='https://accounts.google.com/.well-known/openid-configuration',
    client_kwargs={'scope': 'openid email profile'}
)



@oauth_bp.route('/api/auth/google')
def google_login():
    redirect_uri = url_for('oauth.google_callback', _external=True)
    return oauth.google.authorize_redirect(redirect_uri)

@oauth_bp.route('/api/auth/google/callback')
def google_callback():
    token = oauth.google.authorize_access_token()
    user_info = token.get('userinfo')
    
    # Find or create user
    user = User.query.filter_by(Email=user_info['email']).first()
    
    if not user:
        user = User(
            Email=user_info['email'],
            FirstName=user_info.get('given_name'),
            LastName=user_info.get('family_name'),
            PasswordHash='oauth_google'  # No password for OAuth users
        )
        db.session.add(user)
        db.session.commit()
    
    session['user_id'] = user.UserID
    
    # Redirect to frontend dashboard
    return redirect('https://cs-456-project-huy8.vercel.app/dashboard')

@oauth_bp.route('/api/auth/apple')
def apple_login():
    redirect_uri = url_for('oauth.apple_callback', _external=True)
    return oauth.apple.authorize_redirect(redirect_uri)

@oauth_bp.route('/api/auth/apple/callback')
def apple_callback():
    token = oauth.apple.authorize_access_token()
    user_info = token.get('userinfo')
    
    # Similar logic as Google
    user = User.query.filter_by(Email=user_info['email']).first()
    
    if not user:
        user = User(
            Email=user_info['email'],
            FirstName=user_info.get('name', {}).get('firstName'),
            LastName=user_info.get('name', {}).get('lastName'),
            PasswordHash='oauth_apple'
        )
        db.session.add(user)
        db.session.commit()
    
    session['user_id'] = user.UserID
    
    return redirect('https://cs-456-project-huy8.vercel.app/dashboard')