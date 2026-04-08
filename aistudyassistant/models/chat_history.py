from datetime import datetime, timezone

from aistudyassistant.extensions import db


class ChatHistory(db.Model):
    __tablename__ = "ChatHistory"

    ChatID            = db.Column(db.Integer, primary_key=True)
    UserID            = db.Column(db.Integer, db.ForeignKey("Users.UserID"), nullable=False)
    NoteID            = db.Column(db.Integer, db.ForeignKey("Notes.NoteID"), nullable=True)
    Message           = db.Column(db.Text, nullable=False)
    Response          = db.Column(db.Text, nullable=False)
    CreatedAt         = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    # Conversation grouping (added for sidebar history feature)
    SessionID         = db.Column(db.String(100), nullable=True, index=True)
    ConversationTitle = db.Column(db.String(255), nullable=True)
    CourseID          = db.Column(db.Integer,     nullable=True)
