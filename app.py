from datetime import date, datetime, timedelta

from flask import Flask, render_template, request, redirect, url_for
from database import (
    init_db,
    add_expense,
    get_all_expenses,
    get_total,
    get_category_summary,
    delete_expense,
    add_income,
    get_savings,
    get_report,  
)

app = Flask(__name__)
init_db()


@app.template_filter("dmy")
def format_date(value):
    return datetime.strptime(value, "%Y-%m-%d").strftime("%d-%m-%Y")


@app.route("/")
def landing():
    return render_template("landing.html")

@app.route("/dashboard")
def dashboard():
    today = date.today()
    week_start = (today - timedelta(days=today.weekday())).isoformat()
    month_start = today.replace(day=1).isoformat()
    year_start = today.replace(month=1, day=1).isoformat()

    savings = {
        "week": get_savings(week_start),
        "month": get_savings(month_start),
        "year": get_savings(year_start),
    }

    expenses = get_all_expenses()
    total = get_total()
    summary = get_category_summary()
    return render_template(
        "index.html",
        expenses=expenses,
        total=total,
        summary=summary,
        savings=savings,
    )


@app.route("/add", methods=["GET", "POST"])
def add():
    today = date.today().isoformat()
    error = None

    if request.method == "POST":
        title = request.form["title"].strip()
        amount = float(request.form["amount"])
        category = request.form["category"]
        expense_date = request.form["expense_date"]

        if not title:
            error = "Please enter what you spent on."
        elif amount <= 0:
            error = "Amount must be greater than zero."
        elif expense_date > today:
            error = "Date cannot be in the future."
        else:
            add_expense(title, amount, category, expense_date)
            return redirect(url_for("dashboard"))

    return render_template("add.html", error=error, today=today)

@app.route("/add-income", methods=["GET", "POST"])
def add_income_page():
    today = date.today().isoformat()
    error = None

    if request.method == "POST":
        source = request.form["source"].strip()
        amount = float(request.form["amount"])
        income_date = request.form["income_date"]

        if not source:
            error = "Please enter the income source."
        elif amount <= 0:
            error = "Amount must be greater than zero."
        elif income_date > today:
            error = "Date cannot be in the future."
        else:
            add_income(source, amount, income_date)
            return redirect(url_for("dashboard"))

    return render_template("add_income.html", error=error, today=today)

def label_for(view, period):
    if view == "week":
        return "Week of " + datetime.strptime(period, "%Y-%m-%d").strftime("%d-%m-%Y")
    if view == "year":
        return period
    return datetime.strptime(period, "%Y-%m").strftime("%b %Y")


@app.route("/report")
def report():
    view = request.args.get("view", "month")
    if view not in ("week", "month", "year"):
        view = "month"

    rows = get_report(view)
    biggest = max([max(r["income"], r["spent"]) for r in rows] + [1])

    for r in rows:
        r["label"] = label_for(view, r["period"])
        r["income_pct"] = max(round(r["income"] / biggest * 100, 1), 3) if r["income"] > 0 else 0
        r["spent_pct"] = max(round(r["spent"] / biggest * 100, 1), 3) if r["spent"] > 0 else 0

    return render_template("report.html", rows=rows, view=view)

@app.route("/delete/<int:expense_id>", methods=["POST"])
def delete(expense_id):
    delete_expense(expense_id)
    return redirect(url_for("dashboard"))


if __name__ == "__main__":
    app.run(debug=True)