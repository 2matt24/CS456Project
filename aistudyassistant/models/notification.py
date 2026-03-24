from datetime import datetime

from aistudyassistant.extensions import db


class Notification(db.Model):
    __tablename__ = "Notifications"

    NotificationID = db.Column(db.Integer, primary_key=True)
    UserID         = db.Column(db.Integer, db.ForeignKey("Users.UserID"), nullable=False)
    Title          = db.Column(db.Unicode(100), nullable=False)
    Message        = db.Column(db.UnicodeText, nullable=False)
    IsRead         = db.Column(db.Boolean, default=False, nullable=False)
    Type           = db.Column(db.String(50), nullable=True)  # 'study_reminder' | 'achievement' | 'note_summary' | 'system'
    CreatedAt      = db.Column(db.DateTime, default=datetime.utcnow)
