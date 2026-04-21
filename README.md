# StudyBuddyAI (CS456Project)

StudyBuddyAI is a full-stack academic assistant that helps students manage courses, notes, schedules, and study workflows with AI-enhanced features.

# Project Structure

aistudyassistant/` — Flask backend API, routes, models, and services.
- `frontend/` — React + Vite frontend application.
- `requirements.txt` — Python dependencies for backend.
- `dockerfile` — Backend containerization for deployment.

# Backend
- Python + Flask
- Flask-SQLAlchemy + SQLAlchemy
- Azure SQL (via `pyodbc`)
- Authlib (OAuth)
- Gunicorn (production server)

# Frontend
- React
- Vite
- React Router

# Deployment
- Render (backend)
- Vercel (frontend)

# Key Features

- User registration and login
- Session and token-based auth support
- Course and note management
- Study session tracking
- Schedule/calendar endpoints
- Notifications support
- AI chat and text extraction integrations

# Live Deployment

- Backend URL: `https://cs456project.onrender.com`


# Local Development

## 1) Clone and setup backend

```bash
git clone <your-repo-url>
cd CS456Project
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\\Scripts\\activate
pip install -r requirements.txt
```

Create a `.env` file in the repository root and set the required variables used by `aistudyassistant/app.py` and service modules (for example DB credentials, secret key, and provider keys).

Run backend:

```bash
python -m aistudyassistant.app
```

Backend health check:

- `GET /api/health`

## 2) Setup and run frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend dev server (default): `http://localhost:5173`

## Frontend Scripts

From `frontend/`:

- `npm run dev` — Start development server
- `npm run build` — Build production bundle
- `npm run preview` — Preview production build locally
- `npm run lint` — Run ESLint

## Notes

- CORS is configured to allow localhost and Vercel origins, with optional additional origins from environment configuration.
- The frontend currently uses a hardcoded API base URL in `frontend/src/services/api.js`.