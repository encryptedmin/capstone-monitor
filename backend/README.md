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

## Setup

```bash
python -m venv venv
source venv/bin/activate        # venv\Scripts\activate on Windows
pip install -r requirements.txt

python manage.py migrate
python manage.py createsuperuser   # prompts for email + password; role is set to admin automatically
python manage.py runserver
```

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

## Database: SQLite vs MySQL

The project defaults to **SQLite** — zero setup, perfect for development and
for a capstone demo/defense. Switch to **MySQL** for the actual ITE
Department deployment by setting environment variables before running the
server (no code changes needed):

```bash
export DB_ENGINE=mysql
export DB_NAME=capstone_monitor
export DB_USER=capstone_user
export DB_PASSWORD=yourpassword
export DB_HOST=localhost
export DB_PORT=3306
```

Then uncomment `mysqlclient` in `requirements.txt`, `pip install -r
requirements.txt` again, and re-run `python manage.py migrate`.

**Why MySQL for production:** the paper's own problem statement notes
students tend to submit "only a day before the scheduled date" — i.e.
submission and milestone-update traffic clusters right before deadlines.
SQLite serializes all writes against a single file lock, which can cause
contention or `database is locked` errors under exactly that kind of burst.
MySQL (or PostgreSQL) handles concurrent writes properly and is the safer
choice once this is running for the whole department rather than on one
developer's machine.

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
