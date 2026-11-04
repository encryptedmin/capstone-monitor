# Web-Based Capstone Project Monitoring System — Backend (Django)

Backend for an Information Technology Education department's capstone monitoring system. Built on
Django + Django REST Framework (originally proposed as ASP.NET Core /
Blazor), designed to pair with a React (Vite) frontend.

## What's included

| ERD concept          | App             | Notes |
|-----------------------|-----------------|-------|
| Users                 | `accounts`      | Custom `User` model with `role` (admin/adviser/student), JWT auth |
| Admin / Teacher / Students | `accounts` | `AdviserProfile`, `StudentProfile` extend `User` |
| Groups / GroupMembers | `capstones`     | Renamed `CapstoneGroup` to avoid clashing with Django's built-in `auth.Group` |
| Milestones            | `milestones`    | Status: pending / in_progress / completed / overdue |
| Submissions           | `submissions`   | File uploads + `Feedback` (adviser comments) |
| Notifications         | `notifications` | Per-recipient alerts, auto-created on milestone/submission events |
| Reports (new)         | `reports`       | JSON analytics + printable PDF, matching the "Automated Reporting" objective |

Real-time updates (originally SignalR) are implemented as a **poll-friendly
notifications endpoint** (`GET /api/notifications/?is_read=false`) rather
than websockets — simpler to run and defend, and swappable for Django
Channels later without changing any other code.

## Setup (Windows)

Install MySQL Server, Python, and Node.js. From the repository root, run
`start system.bat`. On its first run, the launcher copies
`backend/.env.example` to `backend/.env`; edit `DB_PASSWORD` (and any other
MySQL connection values) there. The launcher creates the Python environment,
installs missing dependencies, starts the configured local MySQL service,
creates the database if needed, applies migrations, and opens the API and
frontend in separate windows.

The MySQL user must be allowed to create the database on first run. After
creation, it only needs access to that database. From the repository root,
run Django commands with `backend/venv/Scripts/python.exe` and set the working
directory to `backend`.

The API is served at `http://127.0.0.1:8000/api/`. Django admin is at
`/admin/` for quick data inspection.

Creating the very first admin account needs the Django shell once, since
account creation is admin-gated by design (only the Administrator's "Create
User" use case creates adviser/student accounts afterwards):

```python
python manage.py shell
>>> from accounts.models import User
>>> User.objects.create_superuser("admin@ck.edu", "yourpassword")
```

## Demo data

```bash
python manage.py seed_demo          # add demo data (no-op if already seeded)
python manage.py seed_demo --reset  # rebuild it; only touches @ck.edu / @student.ck.edu accounts
```

Creates 4 advisers, 9 student accounts (one per capstone), 7 capstone groups (accepted / pending /
rejected, across a past and the active term), milestones, submissions with
adviser feedback, notifications, and announcements. All demo accounts use the
password `Demo@12345` and log in with their email, e.g. `maria.santos@ck.edu` (adviser) or `juan.delacruz@student.ck.edu` (student).

## Database: MySQL

MySQL is the only configured database backend. Connection settings are read
from `backend/.env` or the process environment:

```dotenv
DB_NAME=capstone_monitor
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_HOST=127.0.0.1
DB_PORT=3306
```

The startup script runs `python manage.py ensure_database` followed by
`python manage.py migrate --noinput`. These migrations create the current
application schema and include a MySQL-compatible active-login uniqueness
rule.

The previous local database file, if present, is not used or modified by the
MySQL backend. `migrate` creates schema; it does not copy records from that
file. Export/import any records you need to keep before retiring the old
local database.

## API overview

| Endpoint | Who | Purpose |
|---|---|---|
| `POST /api/auth/login/` | anyone | Body: `email`, `password`, `device_id`. There is no username; email (case-insensitive) is the login. Returns JWT access/refresh tokens (role embedded in token) |
| `POST /api/auth/refresh/` | anyone | Refresh access token |
| `GET /api/auth/me/` | authenticated | Current user profile |
| `GET/POST/PUT/DELETE /api/users/` | admin | Manage Users module |
| `GET/POST/PUT/DELETE /api/groups/` | role-scoped | Capstone Project Tracking |
| `GET/POST /api/group-members/` | admin/adviser | Enroll students into a group |
| `GET/POST/PUT/DELETE /api/milestones/` | role-scoped | Milestone Management |
| `GET/POST/PUT/DELETE /api/submissions/` | role-scoped | Students submit; advisers review |
| `GET/POST /api/feedback/` | admin/adviser | Adviser feedback on a submission |
| `GET /api/notifications/`, `POST /api/notifications/{id}/mark_read/` | authenticated | Real-time-style alerts |
| `GET /api/reports/analytics/` | admin/adviser | Dashboard JSON (milestone/submission counts) |
| `GET /api/reports/pdf/` | admin/adviser | Printable departmental progress report |

All list endpoints are automatically scoped by role: students only ever see
their own group's data, advisers only see groups assigned to them, and
admins see everything — enforcing the RBAC described in the proposal's Use
Case Diagram.

## Suggested React (Vite) frontend wiring

- Store `access`/`refresh` tokens from `/api/auth/login/`; attach
  `Authorization: Bearer <access>` via an axios interceptor.
- Decode the JWT (or call `/api/auth/me/`) to get `role` and route to the
  Student / Adviser / Admin dashboard accordingly.
- Poll `/api/notifications/?is_read=false` every ~15–30s for a notification
  badge, or upgrade to Django Channels later for true push updates.
- File uploads: `multipart/form-data` POST to `/api/submissions/` with
  `group`, `milestone`, and `file` fields.
