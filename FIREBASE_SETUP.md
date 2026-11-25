# Firebase setup and launch checklist

This project is being moved from the Render/Flask deployment to a static Firebase application. The original Flask files are intentionally retained as migration history; Firebase Hosting serves only the `public/` directory.

## 1. Create a free Firebase project

1. Open https://console.firebase.google.com/ and create a project.
2. Keep the project on the **Spark (no-cost)** plan. Do not add a billing account or upgrade to Blaze.
3. In Project settings > General, add a Web app.
4. Copy its Firebase web configuration into `public/firebase-config.js`. The web config is public by design; never put service-account JSON or private server keys in the browser.

## 2. Enable authentication

In Build > Authentication > Get started > Sign-in method, enable **Email/Password**. Do not enable phone authentication for this app.

## 3. Create Firestore

In Build > Firestore Database, create a database in production mode. Choose a region near your expected users. The app stores records under:

- `users/{uid}`
- `users/{uid}/expenses/{expenseId}`
- `users/{uid}/income/{incomeId}`

Deploy `firestore.rules` before allowing public registrations. Rules require the authenticated UID to match the document owner.

## 4. Install and deploy Firebase Hosting

Install Node.js LTS, then Firebase CLI:

```bash
npm install -g firebase-tools
firebase login
firebase use --add
firebase deploy --only firestore:rules,hosting
```

Choose the Firebase project created above when prompted by `firebase use --add`. Firebase Hosting prints the actual public URL after a successful deploy.

## 5. Verify before sharing

- Create two separate test accounts.
- Add expenses and income to each.
- Confirm account A cannot see account B's records.
- Test deleting an expense, reports, all six themes and mobile layout.
- Confirm sign-out and sign-in work.
- In Firestore Rules Playground or a second browser session, verify unauthenticated reads and cross-user reads/writes are denied.
- Check Firebase usage in the console and remain on Spark.

## Free-tier expectations

Spark is free within published quotas, not unlimited or a guarantee of uninterrupted service at any traffic level. If a quota is exceeded, Firebase may disable the affected service until the quota resets. Do not upgrade to Blaze unless you explicitly decide to accept billing.

## Data migration

The previous Render PostgreSQL data is not automatically imported. Existing demo/test records should not be assumed to be available after migration. Export anything you need before the old database expires.
