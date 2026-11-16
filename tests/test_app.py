from datetime import date
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import pytest

from app import app
from database import db


@pytest.fixture()
def client():
    app.config.update(TESTING=True, WTF_CSRF_ENABLED=False)
    with app.app_context():
        db.drop_all()
        db.create_all()
    with app.test_client() as test_client:
        yield test_client
    with app.app_context():
        db.session.remove()
        db.drop_all()


def register(client, name, email):
    return client.post("/register", data={
        "name": name,
        "email": email,
        "password": "correct-horse-battery",
        "confirm_password": "correct-horse-battery",
    }, follow_redirects=True)


def test_accounts_cannot_see_each_others_expenses(client):
    first = register(client, "First User", "first@example.com")
    assert b"Your account is ready" in first.data

    expense = client.post("/add", data={
        "title": "Private first-user expense",
        "amount": "125.50",
        "category": "Food",
        "expense_date": date.today().isoformat(),
    }, follow_redirects=True)
    assert b"Private first-user expense" in expense.data

    client.post("/logout", follow_redirects=True)
    second = register(client, "Second User", "second@example.com")
    assert b"Your account is ready" in second.data
    dashboard = client.get("/dashboard")
    assert dashboard.status_code == 200
    assert b"Private first-user expense" not in dashboard.data


def test_dashboard_requires_login(client):
    response = client.get("/dashboard")
    assert response.status_code == 302
    assert "/login" in response.headers["Location"]


def test_health_endpoint(client):
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json == {"status": "ok"}
