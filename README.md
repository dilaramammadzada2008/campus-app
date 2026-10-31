# Campus Life

AI-powered app for VILNIUS TECH dormitory residents (Saulėtekis campus).

## Features (prototype)

- **Rooms** — pick your bed like an airplane seat: building → block → floor → room. Rules are enforced automatically (girls with girls, boys with boys; international rooms; rooms under repair). Shows citizenship and suggests rooms with compatriots.
- **Room registration** — after picking a bed, download a prefilled application form (PDF) in Lithuanian or English, chosen by the student, sign it by hand, upload the scan or photo and send it; the registration is confirmed. Moving between rooms is not offered: the administrator assigns places (dormitory rules, point 10).
- **Dormitory rules** — mixed-gender request to the Student Representation (point 14), online guest registration with overnight approval (point 16), quiet-hours reminder (point 17), violation points meter (point 26).
- **Laundry** — see whether washers and dryers are free without going to the basement, get notified when one frees up. Status comes from Primus and QR scans; AI reads the remaining time from a photo of the machine display.
- **Team finder** — post or find teammates for hackathons, olympiads and course projects. AI fills the post from one sentence and matches people by skills.
- **Chat** — room, floor and building channels plus direct messages, with AI translation of Lithuanian and English messages.
- **Complaints** — report a problem to the building administrator (komendantas). AI writes a formal message in Lithuanian; track its status.
- **Sign up / Sign in** — passwordless, VILNIUS TECH e-mail only, one-time code sent by e-mail (Resend).

## Project layout

- `client/` — React app (Vite). Screens are in `client/src/pages/`, shared state and sample data in `client/src/store.js`.
- `server/index.js` — Express API: e-mail codes, accounts, sessions.
- `prototype/index.html` — the original single-file prototype, kept for reference.

## Run it

Requires Node.js 20 or newer.

```
npm install
npm run dev
```

Then open http://localhost:5180. The API runs on port 3001 behind the Vite proxy. On Windows you can also double-click `dev.cmd`.
Room, laundry, chat and other data is still sample data, and the AI parts are simulated.

For production: `npm run build`, then `npm start` serves the built app and the API from one port (`PORT`, default 3001).

### E-mail codes (Resend)

1. Create an API key at https://resend.com/api-keys.
2. Copy `.env.example` to `.env` and put the key in `RESEND_API_KEY`. `.env` is git-ignored; never commit it.
3. Restart the server.

Without a key the server runs in dev mode and shows the code on screen instead of sending it.

**Gmail instead of Resend (no domain needed):** set `GMAIL_USER` and `GMAIL_APP_PASSWORD` in `.env` (create the App Password at https://myaccount.google.com/apppasswords; the Google account needs 2-Step Verification). When both are set, codes are sent from that Gmail account to any address.
With the default sender `onboarding@resend.dev`, Resend only delivers to the e-mail address of your own Resend account. To test with that address, add its domain to `ALLOWED_EMAIL_DOMAINS` (for example `gmail.com`). To send to any student, verify your own domain in Resend and set `RESEND_FROM`.

Accounts, sessions, room requests and uploaded forms are stored in `data/` (git-ignored).

### Room approval

A student's room registration (bed + signed form) is sent to the server as a **pending** request. Administrators — the e-mails listed in `ADMIN_EMAILS` in `.env` — get an **Admin** page where they see each request with automatic rule checks and the uploaded form, and approve or reject it (rejections need a reason). The student's app picks up the decision within a few seconds, and they also get an e-mail.
