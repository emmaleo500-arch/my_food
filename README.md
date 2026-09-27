# BBN'S Local Food — website + order backend

A website for BBN'S Local Food (Afienya, off Dodowa Road) where customers pick a
day's dish and place an order. Every order is emailed straight to the kitchen inbox.

## What's in this project

```
bbns-local-food/
├── public/              ← the website (frontend)
│   ├── index.html
│   ├── css/styles.css
│   ├── js/script.js
│   └── assets/          ← logo + food photo
├── server/
│   └── server.js        ← the backend (Node + Express + Nodemailer)
├── package.json
├── .env
└── README.md
```

The frontend and backend are separate, but the backend also serves the frontend
files, so in normal use you only need to run one server.

## 1. Install

You need [Node.js](https://nodejs.org) (v18 or later) installed. Then, in this folder:

```bash
npm install
```

## 2. Set up email sending

The backend sends order emails through Gmail's SMTP server using an **App
Password** (Gmail blocks your normal password for this).

1. Turn on 2-Step Verification on the Gmail account you want to send FROM:
   https://myaccount.google.com/security
2. Create an App Password: https://myaccount.google.com/apppasswords
   (choose "Mail" as the app) — Google gives you a 16-character code.
3. Copy `.env.example` to a new file named `.env`:
   ```bash
   cp .env.example .env
   ```
4. Open `.env` and fill in:
   - `EMAIL_USER` — the Gmail address you just enabled the App Password for
   - `EMAIL_PASS` — the 16-character App Password (no spaces)
   - `TO_EMAIL` — the inbox that should receive orders (defaults to
     `nkrumahvida61@gmail.com`, the address from the flyer)

You can send FROM the same address you receive orders at, or use a separate
sending account — either works.

Using a different email provider instead of Gmail? Uncomment `SMTP_HOST` and
`SMTP_PORT` in `.env` and point them at your provider's SMTP server.

## 3. Run it

```bash
npm start
```

Open **http://localhost:3000** — that's the live site. Place a test order to
confirm the email arrives.

## 4. Put it online

This is a normal Node app, so it runs on any Node host. A few free/cheap
options that work well for a small site like this: Render, Railway, or a
small VPS. In each case:

1. Push this folder to a Git repository.
2. Create a new "Web Service" pointing at that repo.
3. Set the start command to `npm start`.
4. Add the same environment variables from your `.env` file in the host's
   dashboard (`EMAIL_USER`, `EMAIL_PASS`, `TO_EMAIL`).
5. Deploy — the host gives you a public URL for the site.

## How an order flows

1. A customer fills in the order form and submits it.
2. The browser sends the order as JSON to `POST /api/order` on this server.
3. The server checks the required fields, builds an email, and sends it via
   Gmail SMTP to `TO_EMAIL`.
4. The customer sees a confirmation message on the page.
5. If the server can't be reached (e.g. it's offline), the page instead offers
   a pre-filled `mailto:` link and a WhatsApp link, so an order can still get
   through.

## Customising the menu

The five weekday dishes live in two places — keep them in sync if you change
one:
- `public/index.html` — the radio buttons in the order form
- `public/js/script.js` — the `DAYS` object, used for the "Pick a day" cards
"# bb-food" 
"# bb-food" 
