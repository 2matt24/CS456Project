# CS456Project
AI Enhancement for academic work project

Project Overview: StudyBuddyAI is a secure AI-enhanced digital assistant designed to help students manage notes and study schedules. This repository contains the Flask backend API deployed via Render and connected to Azure SQL Database


Tech Stack
Python (Flask)
SQLAlchemy (For flask connection to DB)
Azure SQL Database
Docker(For render DB access)
Gunicorn
Render (deployment)
React/node.js (frontend)


Features Implemented (Milestone 2):
User Registration (secure password hashing)
User Login with session-based authentication
Azure SQL database integration
Demo Production deployment via Docker on Render

Live render url: https://cs456project.onrender.com

setup instructions: 
Clone repository
Create virtual environment (venv in terminal)
Install dependencies: pip install -r requirements.txt
Run the app in terminal: python -m aistudyassistant.app

Backend is deployed using Docker on Render.
Azure SQL firewall rules configured for external access.