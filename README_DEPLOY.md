# Orderly — Deployment Guide

## Quick Start (Development)

```bash
# Backend
cd backend
npm install
# Copy .env.example to .env and fill values
npm run dev

# Frontend (separate terminal)
cd frontend
npm install
npm run dev
```

---

## Production Deployment

### Step 1 — MongoDB Atlas
- Use the `+srv` connection string from Atlas → Connect → Drivers
- Whitelist `0.0.0.0/0` in Atlas Network Access (for Render dynamic IPs)

### Step 2 — Deploy Backend on Render
1. New Web Service → connect your GitHub repo
2. Root Directory: `backend`
3. Build Command: `npm install`
4. Start Command: `npm start`
5. Add these Environment Variables:

| Key | Value |
|-----|-------|
| `NODE_ENV` | `production` |
| `PORT` | `5000` |
| `MONGODB_URI` | your Atlas +srv string |
| `JWT_SECRET` | run: `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"` |
| `JWT_EXPIRES_IN` | `7d` |
| `FRONTEND_URL` | `https://yourapp.vercel.app` (set after Vercel deploy) |
| `ADMIN_EMAIL` | your admin email |
| `ADMIN_PASSWORD` | strong password |
| `EMAIL_USER` | your Gmail address |
| `EMAIL_PASS` | Gmail App Password (16 chars, no spaces) |
| `EMAIL_FROM` | `Orderly <your@gmail.com>` |

### Step 3 — Deploy Frontend on Vercel
1. New Project → connect your GitHub repo
2. Root Directory: `frontend`
3. Build Command: `npm run build`
4. Output Directory: `dist`
5. Add these Environment Variables:

| Key | Value |
|-----|-------|
| `VITE_API_URL` | `https://your-backend.onrender.com/api` |
| `VITE_SOCKET_URL` | `https://your-backend.onrender.com` |

### Step 4 — Update CORS on Render
Once your Vercel URL is live, update `FRONTEND_URL` on Render:
```
FRONTEND_URL=https://yourapp.vercel.app
```

### Gmail App Password Setup
1. Enable 2-Step Verification: https://myaccount.google.com/security
2. Go to: https://myaccount.google.com/apppasswords
3. Select "Mail" → "Other (custom name)" → name it "Orderly"
4. Copy the 16-character password → paste as `EMAIL_PASS` (no spaces)

---

## Security Notes
- Never commit `.env` files to git (`.gitignore` is already set up)
- Use a random 64-char string for `JWT_SECRET`
- Change the default `ADMIN_PASSWORD` immediately after first deploy
