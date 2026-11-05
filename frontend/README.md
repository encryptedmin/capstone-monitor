# Web-Based Capstone Project Monitoring System — Frontend (React + Vite)

React (Vite) frontend for the ITE Department capstone monitoring system,
built against the Django REST API in `../backend`.

## Design

- An Information Technology Education theme (deep circuit-board navy,
  electric-blue accent, cyan trace highlight) rather than a generic
  blue SaaS scheme.
- Space Grotesk for headings, Inter (sans) for UI/body text.
- Frosted-glass panels floating on an ambient gradient-mesh background.
- Motion kept to one orchestrated entrance per page plus hover/action
  feedback — no scattered per-card animations.

## Setup

```bash
npm install
cp .env.example .env   # already done for you; edit if your API runs elsewhere
npm run dev
```

The app runs at `http://localhost:5173`. By default, Vite proxies `/api` and
`/media` to Django at `http://127.0.0.1:8000`; set `VITE_API_URL` only when you
need to use a different API address. In the Render deployment, Django serves
the built frontend and API from the same hostname.

Log in with the admin account you created in the backend's setup step, then
use **Users** to create adviser/student accounts and **Capstone Groups** to
enroll students and assign advisers.

## Structure

```
src/
├── lib/api.js              axios client, JWT refresh, all endpoint calls
├── context/                 AuthContext (session), ToastContext (alerts)
├── components/
│   ├── ui.jsx                Button, Badge, GlassCard, Modal, etc.
│   ├── AppShell.jsx           sidebar + topbar layout
│   ├── NotificationBell.jsx   polls /api/notifications/ every 20s
│   └── ProtectedRoute.jsx     role-based route gating
└── pages/
    ├── LoginPage.jsx
    ├── student/    Dashboard, Milestones (timeline), Submissions (upload+feedback)
    ├── adviser/    Dashboard (assigned groups), GroupDetail (milestones+review)
    └── admin/      Dashboard (analytics+PDF), Users (CRUD), Groups (CRUD+enrollment)
```

## Notes

- Real-time notifications are implemented via polling
  (`GET /api/notifications/?is_read=false` every 20s) rather than
  websockets — simpler to run, and swappable for a websocket connection
  later without touching any other component.
- `npm run build` produces the `dist/` bundle used by the root Dockerfile
  for the single-service Render deployment.
