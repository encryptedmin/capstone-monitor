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
| Uploaded file bytes   | `uploads`       | File metadata and one-megabyte chunks stored in the configured MySQL database |
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
defines **one Docker Web Service** named `capstone-monitor`. Its Docker build
compiles the React/Vite frontend and packages it with Django, so the UI and API
share one Render service and hostname. The frontend opens at `/`, the API is
under `/api/`, and Django admin is under `/django-admin/`.

Before deploying:

1. In Aiven, confirm the MySQL service is running. Create a database named
   `capstone_monitor` under the service's **Connect → Databases** page.
2. Get the hostname, port, username, and password from Aiven's connection
   information. The configured hostname is
   `mysql-3b48df12-digitalfortress20-a405.b.aivencloud.com`; use the port shown
   by Aiven because it is not necessarily `3306`.
3. Download the Aiven project CA certificate from the service's Overview page.
   In Render, open the `capstone-monitor` service's **Environment** page and
   add a secret file named `aiven-ca.pem` containing the certificate. Render
   exposes it to the service at `/etc/secrets/aiven-ca.pem`.
4. Set the service environment variables listed below. The Aiven database
   user needs permission to create and alter tables in `capstone_monitor` so
   Django can apply migrations.
5. In Render, open the service's **Connect → Outbound** tab and copy its
   outbound IP ranges. Add those ranges to Aiven's MySQL service IP allowlist
   if you have restricted inbound access. Aiven's default IP filter permits
   all sources; avoid removing that rule until Render's ranges are added.
6. Deploy the Blueprint. Review that it updates the existing `capstone-monitor`
   service and defines only that one service. Do not add a separate Static Site.

Render environment variables:

| Key | Value |
|---|---|
| `DJANGO_SECRET_KEY` | Generate a long random secret; the Blueprint generates one |
| `DJANGO_DEBUG` | `False` |
| `DJANGO_ALLOWED_HOSTS` | `capstone-monitor.onrender.com` (replace if the service URL differs; Render's assigned hostname is also added automatically) |
| `DB_NAME` | `capstone_monitor` |
| `DB_USER` | Aiven MySQL username |
| `DB_PASSWORD` | Password for that Aiven user |
| `DB_HOST` | `mysql-3b48df12-digitalfortress20-a405.b.aivencloud.com` |
| `DB_PORT` | Port shown in Aiven connection information |
| `DB_SSL_MODE` | `VERIFY_IDENTITY` |
| `DB_SSL_CA` | `/etc/secrets/aiven-ca.pem` |

If configuring the existing service manually, set its runtime to **Docker**,
Dockerfile path to `./Dockerfile`, and Docker context to the repository root.
Do not set a subdirectory as its root directory. The Dockerfile builds the
frontend, runs `collectstatic`, applies Django migrations before startup, and
starts Gunicorn. Create the Aiven database before the first deploy.

Render's free service can sleep when idle, and uploaded media is stored on the
service's ephemeral filesystem. Use external object storage before relying on
uploads across restarts.

The API is served at `http://127.0.0.1:8000/api/`. Django admin is at
`/django-admin/` for quick data inspection.

Create the first admin account with the Django shell. After signing in, an
administrator can create additional admin or adviser accounts from the Users
page; students register themselves:

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

Uploaded file bytes are stored in `uploads_storedfile` and
`uploads_storedfilechunk` in the same MySQL database. File downloads read those
rows through authenticated API endpoints; Render's local filesystem is not
used for uploaded files.

Files uploaded by an older deployment while it used Render's local filesystem
are not copied by this migration. If those bytes are no longer available on
that service, the corresponding documents must be uploaded again.

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
