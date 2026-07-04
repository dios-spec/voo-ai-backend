# Voo AI — Backend

Express + MongoDB + JWT auth, ready to pair with the Next.js frontend.

## Run it

```bash
npm install
cp .env.example .env   # fill in MONGO_URI, JWT_SECRET, etc.
npm run dev
```

Server boots on :5000. `GET /health` for a liveness check.

## What's built

- **Auth**: signup, login, Google login, forgot/reset password, logout, `/me` — JWT in httpOnly cookie
- **Models**: User, Chat, Message, Settings, Analytics
- **Chats**: create, list (history + search), get with messages, add message, delete
- **Users**: get/update settings, update profile, admin stats endpoint
- **Security**: helmet, CORS locked to CLIENT_URL, rate limiting on auth + chat, centralized error handler
- **Socket.io**: scaffold wired for Live Mode (`live:message` → `live:token` stream → `live:done`) —
  TODO left to call the same AI provider client the Next.js `/api/chat` route uses

## Not built yet

- Cloudinary upload route + OCR (multer scaffold is installed but no route yet)
- Admin panel frontend (this backend's `/api/users/admin/stats` is ready for it)
- Real email delivery for password reset (currently logs the token to console)
- Wiring Socket.io's echo stub to real Groq/Claude/Gemini streaming
