import sqlite3

DB_NAME = "expenses.db"


def get_connection():
    conn = sqlite3.connect(DB_NAME)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    conn = get_connection()
    conn.execute("""
        CREATE TABLE IF NOT EXISTS expenses (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            amount REAL NOT NULL,
            category TEXT NOT NULL,
            expense_date TEXT NOT NULL
        )
    """)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS income (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            source TEXT NOT NULL,
            amount REAL NOT NULL,
            income_date TEXT NOT NULL
        )
    """)
    conn.commit()
    conn.close()

def add_expense(title, amount, category, expense_date):
    conn = get_connection()
    conn.execute(
        "INSERT INTO expenses (title, amount, category, expense_date) VALUES (?, ?, ?, ?)",
        (title, amount, category, expense_date),
    )
    conn.commit()
    conn.close()


def get_all_expenses():
    conn = get_connection()
    rows = conn.execute(
        "SELECT * FROM expenses ORDER BY expense_date DESC, id DESC"
    ).fetchall()
    conn.close()
    return rows


def get_total():
    conn = get_connection()
    row = conn.execute("SELECT SUM(amount) AS total FROM expenses").fetchone()
    conn.close()
    return row["total"] or 0

def get_category_summary():
    conn = get_connection()
    rows = conn.execute(
        """
        SELECT category, SUM(amount) AS total, COUNT(*) AS count
        FROM expenses
        GROUP BY category
        ORDER BY total DESC
        """
    ).fetchall()
    conn.close()
    return rows

def delete_expense(expense_id):
    conn = get_connection()
    conn.execute("DELETE FROM expenses WHERE id = ?", (expense_id,))
    conn.commit()
    conn.close()

def add_income(source, amount, income_date):
    conn = get_connection()
    conn.execute(
        "INSERT INTO income (source, amount, income_date) VALUES (?, ?, ?)",
        (source, amount, income_date),
    )
    conn.commit()
    conn.close()

def get_savings(start_date):
    conn = get_connection()
    income = conn.execute(
        "SELECT COALESCE(SUM(amount), 0) AS t FROM income WHERE income_date >= ?",
        (start_date,),
    ).fetchone()["t"]
    spent = conn.execute(
        "SELECT COALESCE(SUM(amount), 0) AS t FROM expenses WHERE expense_date >= ?",
        (start_date,),
    ).fetchone()["t"]
    conn.close()
    return {"income": income, "spent": spent, "saved": income - spent}

def get_report(view):
    if view == "week":
        e_key = "date(expense_date, 'weekday 0', '-6 days')"
        i_key = "date(income_date, 'weekday 0', '-6 days')"
        limit = 8
    elif view == "year":
        e_key = "strftime('%Y', expense_date)"
        i_key = "strftime('%Y', income_date)"
        limit = 5
    else:
        e_key = "strftime('%Y-%m', expense_date)"
        i_key = "strftime('%Y-%m', income_date)"
        limit = 12

    conn = get_connection()
    spent_rows = conn.execute(
        f"SELECT {e_key} AS period, SUM(amount) AS total FROM expenses GROUP BY period"
    ).fetchall()
    income_rows = conn.execute(
        f"SELECT {i_key} AS period, SUM(amount) AS total FROM income GROUP BY period"
    ).fetchall()
    conn.close()

    data = {}
    for r in spent_rows:
        data.setdefault(r["period"], {"income": 0, "spent": 0})["spent"] = r["total"]
    for r in income_rows:
        data.setdefault(r["period"], {"income": 0, "spent": 0})["income"] = r["total"]

    periods = sorted(data.keys())[-limit:]
    return [
        {
            "period": p,
            "income": data[p]["income"],
            "spent": data[p]["spent"],
            "saved": data[p]["income"] - data[p]["spent"],
        }
        for p in periods
    ]    