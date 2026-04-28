# Property Dealer CRM (CS-4032 Assignment 03)

Full-stack Property Dealer CRM system built with Next.js App Router, MongoDB, and Mongoose.

## Features Implemented

- Authentication with signup/login, bcrypt password hashing, and JWT cookie sessions
- Role-based access control (Admin and Agent)
- Lead management CRUD with backend validation
- Rule-based lead scoring by budget:
  - Budget > 20M => High
  - Budget 10M-20M => Medium
  - Budget < 10M => Low
- Lead assignment and reassignment by Admin
- Agent-only assigned lead visibility
- Activity timeline / audit trail for each lead
- Smart follow-up checks:
  - Overdue follow-up detection
  - Stale lead detection (no recent activity)
- Admin analytics dashboard (status, priority, performance)
- WhatsApp click-to-chat integration (`https://wa.me/<countrycode><number>`)
- Email notification templates and SMTP email sender
- Real-time style updates via polling endpoint
- Validation, auth checks, and role-aware rate limiting (Agents: 50 req/min)

## Tech Stack

- Next.js 16 (App Router)
- TypeScript
- MongoDB + Mongoose
- Tailwind CSS
- JWT + bcryptjs
- Zod
- Nodemailer

## Environment Setup

Create `.env.local` from `.env.example` and update values:

```env
MONGODB_URI=mongodb://localhost:27017/property_dealer_crm
JWT_SECRET=change_this_super_secret_key
JWT_EXPIRES_IN=7d
APP_URL=http://localhost:3000
ADMIN_EMAIL=admin@crm.local
SMTP_HOST=localhost
SMTP_PORT=1025
SMTP_USER=
SMTP_PASS=
EMAIL_FROM=crm@example.com
```

## Run Locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Build Checks

```bash
npm run lint
npm run build
```

## Dockerized Run

This project includes Docker support with three services:

- `app` (Next.js production container)
- `mongo` (MongoDB)
- `mailhog` (SMTP catcher + web UI)

### Start with Docker Compose

```bash
docker compose up --build
```

### Services

- App: `http://localhost:3000`
- MongoDB: `mongodb://localhost:27017`
- MailHog UI: `http://localhost:8025`

### Stop

```bash
docker compose down
```

To remove DB volume too:

```bash
docker compose down -v
```

## API Overview

- `POST /api/auth/signup`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `GET, POST /api/leads`
- `GET, PATCH, DELETE /api/leads/:id`
- `POST /api/leads/assign`
- `GET /api/leads/:id/activities`
- `GET /api/followups`
- `GET /api/analytics`
- `GET /api/users/agents`
- `GET /api/events`

## Notes for Demo

- First registered user becomes `admin`
- Later signup users default to `agent` (or explicit role if allowed by payload)
- Proxy-based route protection is implemented in `src/proxy.ts`
