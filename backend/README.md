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

## Render proof-of-concept deployment

Render does not provide a managed MySQL service. The root `render.yaml`
Blueprint deploys the API and Vite frontend as separate Render services and
connects the API to the Aiven for MySQL service configured below. The API
service is named `capstone-monitor`, matching its existing
`capstone-monitor.onrender.com` hostname; the static frontend is served at
`capstone-monitor-frontend.onrender.com`. Opening the API hostname at `/`
redirects to the frontend. API endpoints remain under `/api/`.

Before deploying the Blueprint:

1. In Aiven, confirm the MySQL service is running. Create a database named
   `capstone_monitor` under the service's **Connect → Databases** page.
2. Get the hostname, port, username, and password from Aiven's connection
   information. The configured hostname is
   `mysql-3b48df12-digitalfortress20-a405.b.aivencloud.com`; use the port shown
   by Aiven because it is not necessarily `3306`.
3. Download the Aiven project CA certificate from the service's Overview page.
   In Render, open the API service's **Environment** page and add a secret file
   named `aiven-ca.pem` containing the certificate. Render exposes it to the
   service at `/etc/secrets/aiven-ca.pem`.
4. Set the API service environment variables listed below. The Aiven database
   user needs permission to create and alter tables in `capstone_monitor` so
   Django can apply migrations.
5. In Render, open the API service's **Connect → Outbound** tab and copy its
   outbound IP ranges. Add those ranges to Aiven's MySQL service IP allowlist
   if you have restricted inbound access. Aiven's default IP filter permits
   all sources; avoid removing that rule until Render's ranges are added.
6. Deploy the API. Its start command runs Django migrations before Gunicorn.

Render API environment variables:

| Key | Value |
|---|---|
| `DJANGO_SECRET_KEY` | Generate a long random secret; the Blueprint generates one |
| `DJANGO_DEBUG` | `False` |
| `DJANGO_ALLOWED_HOSTS` | `capstone-monitor.onrender.com` (replace if the service URL differs; Render's assigned hostname is also added automatically) |
| `CORS_ALLOWED_ORIGINS` | `https://capstone-monitor-frontend.onrender.com` (replace if the frontend URL differs) |
| `DB_NAME` | `capstone_monitor` |
| `DB_USER` | Aiven MySQL username |
| `DB_PASSWORD` | Password for that Aiven user |
| `DB_HOST` | `mysql-3b48df12-digitalfortress20-a405.b.aivencloud.com` |
| `DB_PORT` | Port shown in Aiven connection information |
| `DB_SSL_MODE` | `VERIFY_IDENTITY` |
| `DB_SSL_CA` | `/etc/secrets/aiven-ca.pem` |

If you created the API service manually instead of from the Blueprint, set its
Root Directory to `backend`, Build Command to `pip install -r requirements.txt`,
and Start Command to
`python manage.py migrate --noinput && gunicorn config.wsgi:application --bind 0.0.0.0:$PORT`.
You must also create a separate Render Static Site for `frontend` (Root
Directory `frontend`, Build Command `npm ci && npm run build`, Publish Directory
`dist`, and rewrite `/*` to `/index.html`). Set its `VITE_API_URL` to
`https://capstone-monitor.onrender.com/api` and set the API's
`CORS_ALLOWED_ORIGINS` and `FRONTEND_URL` to the static site's assigned URL.
Deploying a manually created API service alone does not create the frontend
service.

The Blueprint runs Django migrations before starting the API. Its free plan
uses the start command for migrations because Render pre-deploy commands are
not available on free web services. Create the database schema before the
first deploy; the app user does not need permission to create databases.

The frontend is published as a Render static site and points to the API's
`onrender.com` address. Render's free API service can sleep when idle, and this
project currently stores uploaded media on the backend filesystem; uploaded
files need external object storage before relying on them across restarts.

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
DB_SSL_MODE=
DB_SSL_CA=
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
