from collections import defaultdict
from datetime import date, datetime, timedelta

from flask_login import UserMixin
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import func

db = SQLAlchemy()


class User(UserMixin, db.Model):
    __tablename__ = "app_users"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(80), nullable=False)
    email = db.Column(db.String(254), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)


class Expense(db.Model):
    __tablename__ = "app_expenses"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("app_users.id", ondelete="CASCADE"), nullable=False, index=True)
    title = db.Column(db.String(120), nullable=False)
    amount = db.Column(db.Numeric(12, 2), nullable=False)
    category = db.Column(db.String(30), nullable=False)
    expense_date = db.Column(db.String(10), nullable=False, index=True)


class Income(db.Model):
    __tablename__ = "app_income"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("app_users.id", ondelete="CASCADE"), nullable=False, index=True)
    source = db.Column(db.String(120), nullable=False)
    amount = db.Column(db.Numeric(12, 2), nullable=False)
    income_date = db.Column(db.String(10), nullable=False, index=True)


def init_db():
    db.create_all()


def add_expense(user_id, title, amount, category, expense_date):
    db.session.add(Expense(
        user_id=user_id, title=title, amount=amount,
        category=category, expense_date=expense_date,
    ))
    db.session.commit()


def get_all_expenses(user_id):
    rows = Expense.query.filter_by(user_id=user_id).order_by(
        Expense.expense_date.desc(), Expense.id.desc()
    ).all()
    return [{
        "id": row.id,
        "title": row.title,
        "amount": float(row.amount),
        "category": row.category,
        "expense_date": row.expense_date,
    } for row in rows]


def get_total(user_id):
    total = db.session.query(func.coalesce(func.sum(Expense.amount), 0)).filter(
        Expense.user_id == user_id
    ).scalar()
    return float(total)


def get_category_summary(user_id):
    rows = db.session.query(
        Expense.category,
        func.sum(Expense.amount).label("total"),
        func.count(Expense.id).label("count"),
    ).filter(Expense.user_id == user_id).group_by(
        Expense.category
    ).order_by(func.sum(Expense.amount).desc()).all()
    return [{
        "category": row.category,
        "total": float(row.total),
        "count": row.count,
    } for row in rows]


def delete_expense(user_id, expense_id):
    row = Expense.query.filter_by(id=expense_id, user_id=user_id).first()
    if row is None:
        return False
    db.session.delete(row)
    db.session.commit()
    return True


def add_income(user_id, source, amount, income_date):
    db.session.add(Income(
        user_id=user_id, source=source, amount=amount, income_date=income_date
    ))
    db.session.commit()


def get_savings(user_id, start_date):
    income = db.session.query(func.coalesce(func.sum(Income.amount), 0)).filter(
        Income.user_id == user_id, Income.income_date >= start_date
    ).scalar()
    spent = db.session.query(func.coalesce(func.sum(Expense.amount), 0)).filter(
        Expense.user_id == user_id, Expense.expense_date >= start_date
    ).scalar()
    income_value, spent_value = float(income), float(spent)
    return {
        "income": income_value,
        "spent": spent_value,
        "saved": income_value - spent_value,
    }


def get_report(user_id, view):
    if view not in {"week", "month", "year"}:
        view = "month"
    expenses = Expense.query.filter_by(user_id=user_id).all()
    incomes = Income.query.filter_by(user_id=user_id).all()
    grouped = defaultdict(lambda: {"income": 0.0, "spent": 0.0})

    def period_for(value):
        parsed = date.fromisoformat(value)
        if view == "week":
            return (parsed - timedelta(days=parsed.weekday())).isoformat()
        if view == "year":
            return parsed.strftime("%Y")
        return parsed.strftime("%Y-%m")

    for row in expenses:
        grouped[period_for(row.expense_date)]["spent"] += float(row.amount)
    for row in incomes:
        grouped[period_for(row.income_date)]["income"] += float(row.amount)

    limit = {"week": 8, "month": 12, "year": 5}[view]
    periods = sorted(grouped)[-limit:]
    return [{
        "period": period,
        "income": grouped[period]["income"],
        "spent": grouped[period]["spent"],
        "saved": grouped[period]["income"] - grouped[period]["spent"],
    } for period in periods]
