# Expense Tracker

A multi-user personal finance web application with a soft pastel interface, six selectable themes, private accounts, expense and income tracking, savings summaries, and weekly/monthly/yearly reports.

**Author:** Trupti R

## Live demo

The Firebase Hosting URL will be added here after a Firebase project is configured and the first production deployment succeeds. A live URL is deliberately not listed before it has been verified.

## Features

- Public landing page and account registration/sign-in
- Email/password authentication through Firebase Authentication
- User-specific expenses and income stored in Cloud Firestore
- Firestore Security Rules enforce account ownership
- Add and delete expenses with confirmation
- Record income and calculate weekly, monthly and yearly savings
- Category-wise spending summary
- Weekly, monthly and yearly income-versus-spending reports
- Six themes: pink, green, blue, white, red and night
- Responsive design and browser-side form validation

## Technology

| Layer | Technology |
|---|---|
| Hosting | Firebase Hosting (static site) |
| Authentication | Firebase Authentication |
| Database | Cloud Firestore |
| Frontend | HTML, existing CSS, vanilla JavaScript (ES modules) |
| Security | Firestore Security Rules; Firebase Auth |
| Free plan | Firebase Spark (no billing account required) |

The application does not require an always-running Flask server, PostgreSQL instance, Cloud Functions or a Node backend.

## Run locally

The frontend is static, but Firebase Auth requires an authorized web origin. For local development, use a local static server (for example, VS Code Live Server) and add its origin to Firebase Authentication > Settings > Authorized domains.

Before the app can connect to Firebase, configure `public/firebase-config.js` using your Firebase web app configuration. See [FIREBASE_SETUP.md](FIREBASE_SETUP.md).

## Deploy

1. Create a Firebase project on the Spark plan.
2. Enable Email/Password sign-in.
3. Create a Cloud Firestore database.
4. Configure `public/firebase-config.js`.
5. Install Firebase CLI and select the project with `firebase use --add`.
6. Deploy rules and hosting with `firebase deploy --only firestore:rules,hosting`.

Detailed instructions and verification steps: [FIREBASE_SETUP.md](FIREBASE_SETUP.md).

## Security notes

- The Firebase web configuration is public and is not a secret.
- Never commit service-account JSON, private keys, passwords, or admin credentials.
- Firestore rules scope every user record to the matching authenticated UID.
- Deploy and verify the rules before inviting public users.
- This is a portfolio/demo application, not a bank-grade financial records system. Avoid storing sensitive financial account credentials or payment-card data.

## Repository history

The previous Flask + SQLAlchemy + PostgreSQL implementation and Render configuration are retained in this branch as migration history. The Firebase Hosting configuration serves only the static `public/` directory. The old Render demo is not the production deployment target.

## Screenshots

Existing design screenshots are retained in `docs/screenshots/`. The original theme stylesheet remains at `static/style.css` and the existing theme switcher remains at `static/theme.js`.
