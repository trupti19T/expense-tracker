import os
import re
from datetime import date, datetime, timedelta
from decimal import Decimal, InvalidOperation
from functools import wraps

from flask import Flask, flash, redirect, render_template, request, url_for
from flask_login import LoginManager, current_user, login_required, login_user, logout_user
from flask_wtf.csrf import CSRFError, CSRFProtect
from werkzeug.middleware.proxy_fix import ProxyFix
from werkzeug.security import check_password_hash, generate_password_hash

from database import (
    db, User, add_expense, add_income, delete_expense, get_all_expenses,
    get_category_summary, get_report, get_savings, get_total, init_db,
)

app = Flask(__name__)
is_production = os.environ.get("FLASK_ENV") == "production" or os.environ.get("RENDER") == "true"
secret_key = os.environ.get("SECRET_KEY")
database_url = os.environ.get("DATABASE_URL")
if is_production and not database_url:
    raise RuntimeError("Set DATABASE_URL to a persistent PostgreSQL database before starting in production.")
if is_production and not secret_key:
    raise RuntimeError("Set a strong SECRET_KEY environment variable before starting in production.")
app.config.update(
    SECRET_KEY=secret_key or "local-development-key-change-before-deploy",
    SQLALCHEMY_DATABASE_URI=(database_url or "sqlite:///expenses_local.db").replace(
        "postgres://", "postgresql+psycopg://", 1
    ),
    SQLALCHEMY_TRACK_MODIFICATIONS=False,
    SQLALCHEMY_ENGINE_OPTIONS={"pool_pre_ping": True},
    SESSION_COOKIE_HTTPONLY=True,
    SESSION_COOKIE_SECURE=is_production,
    SESSION_COOKIE_SAMESITE="Lax",
    REMEMBER_COOKIE_HTTPONLY=True,
    REMEMBER_COOKIE_SECURE=is_production,
    WTF_CSRF_TIME_LIMIT=3600,
)
if is_production:
    app.wsgi_app = ProxyFix(app.wsgi_app, x_for=1, x_proto=1, x_host=1)

db.init_app(app)
csrf = CSRFProtect(app)
login_manager = LoginManager(app)
login_manager.login_view = "login"
login_manager.login_message = "Please sign in to access your personal expense tracker."
login_manager.login_message_category = "info"


@login_manager.user_loader
def load_user(user_id):
    try:
        return User.query.get(int(user_id))
    except (TypeError, ValueError):
        return None


@app.template_filter("dmy")
def format_date(value):
    if isinstance(value, (date, datetime)):
        return value.strftime("%d-%m-%Y")
    return datetime.strptime(str(value), "%Y-%m-%d").strftime("%d-%m-%Y")


@app.after_request
def security_headers(response):
    response.headers.setdefault("X-Content-Type-Options", "nosniff")
    response.headers.setdefault("X-Frame-Options", "DENY")
    response.headers.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
    response.headers.setdefault("Permissions-Policy", "camera=(), microphone=(), geolocation=()")
    if request.endpoint not in ("static",):
        response.headers.setdefault("Cache-Control", "no-store")
    return response


@app.errorhandler(CSRFError)
def handle_csrf_error(error):
    return render_template("error.html", message="This form expired or could not be verified. Please go back, refresh the page and try again."), 400


@app.route("/")
def landing():
    return render_template("landing.html")


@app.route("/health")
def health():
    return {"status": "ok"}, 200


@app.route("/register", methods=["GET", "POST"])
def register():
    if current_user.is_authenticated:
        return redirect(url_for("dashboard"))
    error = None
    if request.method == "POST":
        name = request.form.get("name", "").strip()
        email = request.form.get("email", "").strip().lower()
        password = request.form.get("password", "")
        confirm = request.form.get("confirm_password", "")
        if not name or len(name) > 80:
            error = "Please enter your name (up to 80 characters)."
        elif not re.fullmatch(r"[^\s@]+@[^\s@]+\.[^\s@]+", email) or len(email) > 254:
            error = "Please enter a valid email address."
        elif len(password) < 10:
            error = "Use a password with at least 10 characters."
        elif len(password) > 128:
            error = "Please use a password shorter than 128 characters."
        elif password != confirm:
            error = "The passwords do not match."
        elif User.query.filter_by(email=email).first():
            error = "An account with this email already exists. Please sign in instead."
        else:
            user = User(name=name, email=email, password_hash=generate_password_hash(password))
            db.session.add(user)
            db.session.commit()
            login_user(user)
            flash("Your account is ready. Welcome!", "success")
            return redirect(url_for("dashboard"))
    return render_template("register.html", error=error)


@app.route("/login", methods=["GET", "POST"])
def login():
    if current_user.is_authenticated:
        return redirect(url_for("dashboard"))
    error = None
    if request.method == "POST":
        email = request.form.get("email", "").strip().lower()
        password = request.form.get("password", "")
        user = User.query.filter_by(email=email).first()
        if user is None or not check_password_hash(user.password_hash, password):
            error = "Email or password is incorrect."
        else:
            login_user(user)
            flash("You're signed in. Welcome back!", "success")
            next_url = request.args.get("next", "")
            if next_url.startswith("/") and not next_url.startswith("//"):
                return redirect(next_url)
            return redirect(url_for("dashboard"))
    return render_template("login.html", error=error)


@app.route("/logout", methods=["POST"])
@login_required
def logout():
    logout_user()
    flash("You have been signed out safely.", "success")
    return redirect(url_for("landing"))


@app.route("/dashboard")
@login_required
def dashboard():
    today = date.today()
    week_start = (today - timedelta(days=today.weekday())).isoformat()
    month_start = today.replace(day=1).isoformat()
    year_start = today.replace(month=1, day=1).isoformat()
    savings = {
        "week": get_savings(current_user.id, week_start),
        "month": get_savings(current_user.id, month_start),
        "year": get_savings(current_user.id, year_start),
    }
    return render_template(
        "index.html",
        expenses=get_all_expenses(current_user.id),
        total=get_total(current_user.id),
        summary=get_category_summary(current_user.id),
        savings=savings,
    )


def valid_past_or_today(value, today):
    try:
        parsed = date.fromisoformat(value)
        return parsed.isoformat() == value and value <= today
    except (TypeError, ValueError):
        return False


def parse_amount(raw):
    try:
        amount = Decimal(raw).quantize(Decimal("0.01"))
        if not amount.is_finite() or amount <= 0 or amount > Decimal("9999999999.99"):
            return None
        return amount
    except (InvalidOperation, TypeError):
        return None


@app.route("/add", methods=["GET", "POST"])
@login_required
def add():
    today = date.today().isoformat()
    error = None
    if request.method == "POST":
        title = request.form.get("title", "").strip()
        amount = parse_amount(request.form.get("amount", ""))
        category = request.form.get("category", "")
        expense_date = request.form.get("expense_date", "")
        if not title or len(title) > 120:
            error = "Please enter a description (up to 120 characters)."
        elif amount is None:
            error = "Enter an amount greater than zero."
        elif category not in {"Food", "Travel", "Shopping", "Bills", "Other"}:
            error = "Please choose a valid category."
        elif not valid_past_or_today(expense_date, today):
            error = "Please choose a valid date that is not in the future."
        else:
            add_expense(current_user.id, title, amount, category, expense_date)
            flash("Expense saved.", "success")
            return redirect(url_for("dashboard"))
    return render_template("add.html", error=error, today=today)


@app.route("/add-income", methods=["GET", "POST"])
@login_required
def add_income_page():
    today = date.today().isoformat()
    error = None
    if request.method == "POST":
        source = request.form.get("source", "").strip()
        amount = parse_amount(request.form.get("amount", ""))
        income_date = request.form.get("income_date", "")
        if not source or len(source) > 120:
            error = "Please enter an income source (up to 120 characters)."
        elif amount is None:
            error = "Enter an amount greater than zero."
        elif not valid_past_or_today(income_date, today):
            error = "Please choose a valid date that is not in the future."
        else:
            add_income(current_user.id, source, amount, income_date)
            flash("Income saved.", "success")
            return redirect(url_for("dashboard"))
    return render_template("add_income.html", error=error, today=today)


def label_for(view, period):
    if view == "week":
        return "Week of " + datetime.strptime(period, "%Y-%m-%d").strftime("%d-%m-%Y")
    if view == "year":
        return period
    return datetime.strptime(period, "%Y-%m").strftime("%b %Y")


@app.route("/report")
@login_required
def report():
    view = request.args.get("view", "month")
    if view not in ("week", "month", "year"):
        view = "month"
    rows = get_report(current_user.id, view)
    biggest = max([max(float(r["income"]), float(r["spent"])) for r in rows] + [1])
    for row in rows:
        row["label"] = label_for(view, row["period"])
        row["income_pct"] = max(round(float(row["income"]) / biggest * 100, 1), 3) if row["income"] > 0 else 0
        row["spent_pct"] = max(round(float(row["spent"]) / biggest * 100, 1), 3) if row["spent"] > 0 else 0
    return render_template("report.html", rows=rows, view=view)


@app.route("/delete/<int:expense_id>", methods=["POST"])
@login_required
def delete(expense_id):
    if delete_expense(current_user.id, expense_id):
        flash("Expense deleted.", "success")
    else:
        flash("That expense was not found in your account.", "error")
    return redirect(url_for("dashboard"))


with app.app_context():
    init_db()


if __name__ == "__main__":
    app.run(debug=os.environ.get("FLASK_DEBUG") == "1")
