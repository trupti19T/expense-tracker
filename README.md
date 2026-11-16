# Expense Tracker

A personal finance tracker built with **Python, Flask, SQLAlchemy, PostgreSQL and vanilla HTML/CSS/JavaScript**. It keeps the original soft, pastel design and adds individual accounts so each person sees only their own financial records.

**Live Demo:** [Open Expense Tracker](https://expense-tracker-oqwd.onrender.com)

## Features

- Create an account, sign in and sign out
- Passwords stored as secure password hashes (never stored as plain text)
- Each expense and income row belongs to one account; database queries are scoped by the signed-in user's ID
- Add and delete expenses with a confirmation dialog
- Record income and calculate savings for the current week, month and year
- Category-wise spending summary
- Weekly, monthly and yearly income-versus-spending reports
- Six themes: pink, green, blue, white, red and night
- Responsive layout, server-side input validation and CSRF protection
- PostgreSQL for hosted deployment; SQLite for local development
- Health endpoint at `/health`

## Technology

| Layer | Technology |
|---|---|
| Backend | Python 3.12, Flask |
| Authentication | Flask-Login, Werkzeug password hashing |
| Database | Flask-SQLAlchemy, PostgreSQL (psycopg 3) |
| Forms/security | Flask-WTF CSRF protection, secure session-cookie settings |
| Frontend | Jinja2, HTML, CSS, vanilla JavaScript |
| Production server | Gunicorn |
| Hosting configuration | Render Blueprint |

## Run locally (Windows PowerShell)

Python 3.12 is recommended.

```powershell
git clone https://github.com/trupti19T/expense-tracker.git
cd expense-tracker
py -3.12 -m venv .venv
.\\.venv\\Scripts\\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt
python app.py
```

Open **http://127.0.0.1:5000**. The app creates its local SQLite database automatically. Create an account on the landing page to start.

## Deploy publicly

**Live website:** [https://expense-tracker-oqwd.onrender.com](https://expense-tracker-oqwd.onrender.com)

The project is deployed on Render using a Blueprint. To create your own deployment, use [Render Blueprints](https://dashboard.render.com/blueprints), select this repository and the `feature/multi-user-production` branch for the initial deployment, then apply the Blueprint. The `render.yaml` file provisions the web service and connects a PostgreSQL database automatically. Render generates the app's `SECRET_KEY`.

The `/health` endpoint is used by Render to check service health.

**Free-tier warning:** Render's free web service can sleep after 15 minutes without traffic, and its free PostgreSQL database expires after 30 days. It is suitable for a short demo, not long-term storage of real financial records. Upgrade the database or use a persistent paid database before relying on it. Back up any data you care about. See [Render's free-instance limitations](https://render.com/docs/free).

## Data separation and legacy data

The account-based version uses new tables named `app_users`, `app_expenses` and `app_income`. The old demo tables are not automatically imported or assigned to the first registered account. This avoids exposing earlier shared demo entries to a new user. Keep a backup of any old database file before replacing or deleting it.

## Screenshots

Add genuine screenshots from the running application here after local testing (landing page, registration, dashboard, reports). No mock screenshots are used.

## Project structure

```
app.py                 Flask routes, authentication and validation
database.py            SQLAlchemy models and user-scoped queries
requirements.txt       Python dependencies
Procfile               Gunicorn start command
render.yaml            Render deployment blueprint
runtime.txt            Python runtime
static/
  style.css            Existing themes and responsive design
  theme.js             Theme switcher and page decorations
templates/
  base.html             Shared layout and account navigation
  landing.html          Public landing page
  register.html         Account creation
  login.html            Sign-in
  index.html            Personal dashboard
  add.html              Add expense
  add_income.html       Add income
  report.html           Weekly/monthly/yearly reports
  error.html            Friendly error page
```

## What this project demonstrates

- Designing a multi-user web application
- Authentication, password hashing and session management
- Relational database design with user ownership and foreign keys
- CRUD operations and aggregation queries
- Server-side validation and CSRF protection
- Separating development and production database configuration
- Preparing a Flask application for deployment with Gunicorn

## Author

**Trupti R**
