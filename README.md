# My Expense Tracker

A pastel-themed web app to track expenses and income, see savings, and view weekly, monthly and yearly reports. Built with Python, Flask and SQL (SQLite).

## Features

- Add expenses (title, amount, category, date) and income (source, amount, date)
- Delete expenses with a confirmation pop-up
- Total spending and a category summary (SQL `GROUP BY`)
- Savings for this week, this month and this year (income minus expenses)
- Reports: weekly, monthly and yearly, with an income vs spending bar chart
- Six themes: pink, green, blue, white, red and night
- Responsive layout for phone, tablet and laptop
- Input checks on the server: no future dates, no zero or negative amounts

## Tech stack

- **Backend:** Python, Flask, Jinja2 templates
- **Database:** SQLite, with SQL for INSERT, SELECT, DELETE, SUM, COUNT, GROUP BY and date grouping
- **Frontend:** HTML, CSS (variables for themes, media queries for responsive layout), vanilla JavaScript

## How it works

1. The browser sends a request to a Flask route (for example `/add`).
2. Flask validates the input and runs a parameterized SQL query (`?` placeholders, which prevent SQL injection).
3. The result is passed to a Jinja2 template, which builds the page.
4. Reports group rows by week, month or year in SQL, and Python merges income and expenses into one table and chart.

## Project structure

```
expense-tracker/
    app.py              Flask routes and validation
    database.py         SQLite connection and all SQL queries
    requirements.txt
    static/
        style.css       Themes, layout, animations
        theme.js        Theme switcher, quotes, background drawings
    templates/
        base.html       Shared layout
        landing.html    Intro page
        index.html      Dashboard
        add.html        Add expense form
        add_income.html Add income form
        report.html     Weekly / monthly / yearly reports
```

## Run it locally

Requires Python 3.8 or newer.

```
git clone https://github.com/trupti19T/expense-tracker.git
cd expense-tracker
pip install -r requirements.txt
python app.py
```

Then open http://127.0.0.1:5000 in your browser. The database file is created automatically on the first run. The fonts load from Google Fonts, so an internet connection gives the best look.

## Screenshots

(Screenshots will be added here.)

## Current limitations and next steps

- Single user: there is no login yet, and data is stored in a local SQLite file
- Planned: user accounts so each person sees only their own data, deployment with a hosted database, and CSV export

## What I learned

- Building a Flask app with routes, templates and form handling
- Writing SQL queries, including grouped results and date grouping
- Validating input on the server and protecting queries with placeholders
- Responsive design with CSS media queries, and a theme system with CSS variables

## Author

Trupti R