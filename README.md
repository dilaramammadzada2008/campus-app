# Campus Life

AI-powered app for VILNIUS TECH dormitory residents (Saulėtekis campus).

## Features (prototype)

- **Rooms** — pick your bed like an airplane seat: building → block → floor → room. Rules are enforced automatically (girls with girls, boys with boys; international rooms; rooms under repair). Shows citizenship and suggests rooms with compatriots.
- **Room registration** — after picking a bed, download a prefilled application form in Lithuanian and English (PDF), sign it by hand, upload the scan or photo and send it; the registration is confirmed. Moving between rooms is not offered: the administrator assigns places (dormitory rules, point 10).
- **Dormitory rules** — mixed-gender request to the Student Representation (point 14), online guest registration with overnight approval (point 16), quiet-hours reminder (point 17), violation points meter (point 26).
- **Laundry** — see whether washers and dryers are free without going to the basement, get notified when one frees up. Status comes from Primus and QR scans; AI reads the remaining time from a photo of the machine display.
- **Team finder** — post or find teammates for hackathons, olympiads and course projects. AI fills the post from one sentence and matches people by skills.
- **Chat** — room, floor and building channels plus direct messages, with AI translation of Lithuanian and English messages.
- **Complaints** — report a problem to the building administrator (komendantas). AI writes a formal message in Lithuanian; track its status.
- **Sign-in** — passwordless, VILNIUS TECH e-mail only, one-time code.

## Run the prototype

Open `prototype/index.html` in a browser. It is a single static file; all data is sample data and the AI parts are simulated.
