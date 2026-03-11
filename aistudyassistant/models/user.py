# Amath Gaye Feb 17th 2026 


#creaing the model based on user database 

from aistudyassistant.extensions import db


class User(db.Model):
    __tablename__ = "Users"

    UserID = db.Column(db.Integer, primary_key=True)
    Email = db.Column(db.String(255), nullable=False, unique=True)
    PasswordHash = db.Column(db.String(255), nullable=False)
    FirstName = db.Column(db.String(100))
    LastName = db.Column(db.String(100))
    CreatedAt = db.Column(db.DateTime)
    LastLogin = db.Column(db.DateTime)