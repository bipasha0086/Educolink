# Educolink

Educolink is a full-stack student productivity platform with a modern React frontend and an Express backend.

It combines learning modules, AI-powered study help, file uploads, and break-time tools into one workspace.

## Key Features

- Notes Hub with real file upload and server storage
- EducoAssist for AI chat, study plans, and syllabus analysis
- Break Zone with focus music, ambient sounds, and mini games
- Authentication with email/password and Google flow support
- User profile and preference updates
- Download helpers for study output (mindmap SVG, HTML, text)

## Tech Stack

Frontend
- React + Vite
- React Router
- Framer Motion
- react-icons

Backend
- Node.js + Express
- Multer (file upload)
- bcryptjs + JWT (auth)
- MongoDB connector support (optional)

## Project Structure

```text
Educolink-main/
	backend/
		server.js
		src/
			app.js
			routes/
			middleware/
			lib/
			constants/
		uploads/
	frontend/
		src/
			pages/
			components/
			services/
			styles/
			utils/
```

## Local Setup

### 1. Clone and install

```bash
git clone https://github.com/bipasha0086/Educolink.git
cd Educolink

cd backend
npm install

cd ../frontend
npm install
```

### 2. Environment variables

Backend: create `backend/.env` using `backend/.env.example`

Minimum backend values:

```env
PORT=5001
JWT_SECRET=change_this_secret
GROK_API_KEY=
```

Frontend: create `frontend/.env` using `frontend/.env.example`

```env
VITE_API_BASE_URL=http://localhost:5001
VITE_GOOGLE_CLIENT_ID=
```

### 3. Run the app

Terminal 1:

```bash
cd backend
npm run dev
```

Terminal 2:

```bash
cd frontend
npm run dev
```

Frontend runs on Vite default (usually `http://localhost:5173`).
Backend runs on `http://localhost:5001` by default.

## Frontend Modules

- Home
- Smart Workspace
- Notes Hub
- EducoAssist
- Study Room
- Lecture Zone
- Visual Labs
- Break Zone
- Productivity Tools
- Profile
- Settings
- Login / Register

## Backend API Overview

Health
- `GET /api/health`

Auth
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/google`

User
- `GET /api/user/me`
- `PATCH /api/user/me/preferences`

Content
- `GET /api/modules`
- `GET /api/break-zone/activities`
- `GET /api/quotes/random`
- `GET /api/search?q=...`
- `GET /api/search/web?q=...`

AI
- `POST /api/ai/ask`
- `POST /api/ai/syllabus-analyze`

Files
- `GET /api/files`
- `POST /api/files/upload`

## Notes

- Uploaded files are served from backend `uploads` storage.
- If AI features are not configured, endpoints can return configuration errors.
- CORS origins are controlled by `CORS_ORIGINS` in backend env.

## Scripts

Backend
- `npm run dev`
- `npm start`
- `npm run check`

Frontend
- `npm run dev`
- `npm run build`
- `npm run preview`
- `npm run lint`

## License

This project is currently maintained as a personal/academic repository.