# Pulse — Expense Tracker

Pulse is a personal finance app for your phone. It tracks income and spending, sets monthly budgets per category, and shows how close your savings are to the things you want to buy.

It's a web app you can install on your home screen (PWA). Everything is stored **on your device only**: there's no account, no server and no sync.

## Features

### Home dashboard
- **Savings hero**: this month's savings, your savings rate, and the change from last month.
- **Savings verdict**: a short summary of the month, such as *Excellent saver*, *On track*, *A little tight* or *Overspending*.
- **Income / expense / balance** shown in one compact strip.
- **Spending analytics**: bar charts by day (last 7 days), by week (last 6 weeks) or by month (last 6 months), compared with the period before.
- **Recurring due**: rent, salary or bills waiting to be confirmed, each with one-tap confirm or skip.
- **Monthly recap** (first week of each month, dismissible): last month's savings, top 3 categories, biggest expense, change from the month before, and goals completed.
- **Budget alerts**: categories at 80% or more of their monthly target.
- **Spending calendar**: a month grid shaded by how much you spent each day. Tap a day to see its total.
- **Budget targets**: how much of each category's monthly cap you've used.
- **Recent transactions**, with a link to the full history.
- A **month picker** to look back at any earlier month.

### Adding a transaction
- A screen built around a keypad: type the amount, pick a category, done.
- Switch between **expense** and **income**.
- A date strip for logging past entries.
- An optional **note** on each entry (up to 80 characters). History search matches notes too.
- **Quick re-add**: chips for your last few category + amount pairs. Tap one to fill the form, then confirm.
- An **account** picker (Cash, bKash, bank, …), shown once you have more than one account.
- A toast when a save pushes a category past **80%** or **100%** of its monthly target.

### History
- Every transaction you've recorded, with search and filters (all / expenses / income).
- The totals at the top follow the filters, so it doubles as a quick *"how much did I spend on X?"* calculator.

### Categories
- Built-in categories for income and expenses, plus **custom categories** with your own name and icon.
- **Show/hide** any category so the entry screen lists only the ones you use.
- **Monthly targets**: set a spending cap for any expense category. A change applies from the current month on; earlier months keep their old cap.

### Recurring transactions
- Set up rent, salary, subscriptions or bills once: monthly (on a set day), weekly or yearly.
- Each occurrence shows up as **due** on Home and on the Recurring page (Settings → Recurring). Nothing is added until you confirm it. You can change the amount before confirming, or skip it.
- Missed months show up as separate overdue items. Rules can be paused; resuming doesn't bring back the months you were paused.

### Goals
A goal is something you're saving up for, such as a PS5 or AirPods.
- **Priority**: tap **Reorder** and drag goals into order. Higher-priority goals are assumed to be bought first.
- **Estimate**: "At this pace: Mar 2027", based on your average monthly savings over recent complete months, counting the goals ahead of it.
- **Price changes**: editing the price keeps the old one. Cards show "↓ ৳5,000 since added", and completed goals show the full price history.
- Each goal has a **target price**, an **icon**, an optional **target date** (with a "days left" badge) and an optional **photo**.
- **Storage check**: the goal dialog shows how much device storage is free, how many photos are stored and their total size, and the size of the photo you just picked. The line turns amber below 20 MB free, so you know when to skip the photo.
- **Product links**: save up to 5 links per goal (store pages, for example). Cards show just the site name (e.g. `daraz.com.bd ↗`), not the full URL.
- **Progress** is measured against this month's savings: the percentage saved, the amount still **left**, and a progress bar.
- Goals you can afford move to the top and their **"Got it"** button lights up.
- **Completing a goal**: say whether you *bought it with your savings* (recorded as an expense, so your savings go down) or *it was a gift* (nothing is recorded). Completed goals can be reopened.

### Settings
- Counts of everything stored on the device.
- **Accounts**: Cash plus your own (bKash, Nagad, bank, card), each with an opening balance and a live balance. **Transfers** move money between accounts without counting as income or spending. Deleting an account moves its entries to Cash.
- A link to the **Recurring** page.
- **Reload app**: picks up a new version in the installed app, which has no browser reload button.
- **Reset all data**: wipes transactions, categories, targets, goals and goal photos. You have to type a word to confirm.

## Where data is stored

| Data | Storage |
| --- | --- |
| Transactions, categories, targets, goals, accounts, transfers, recurring rules | `localStorage` (keys starting with `expense-tracker:`) |
| Goal photos | IndexedDB (`expense-tracker-media`), resized to at most 900px JPEG (~100 KB) |

Savings are never stored separately. They're always calculated from the transactions (income − expenses), so they can't drift out of sync. Clearing the browser's site data deletes everything, so treat the device as the only copy.

## Tech stack

- [Next.js](https://nextjs.org) 16 (App Router) + React 19 + TypeScript
- Tailwind CSS 4, with UI primitives from shadcn / Base UI
- Recharts for charts, lucide-react for icons
- Installable PWA (web app manifest and generated icons)

> **Note:** this project uses a recent Next.js with breaking changes. Check `node_modules/next/dist/docs/` before relying on older Next.js conventions (see `AGENTS.md`).

## Getting started

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # production build
npm run start    # serve the production build
npm run lint
```

To use it as an app, open it on your phone and choose **Add to Home Screen**.

## Sign-in and database (in progress)

The app is moving from browser storage to **Neon Postgres** (via **Drizzle**), with **Google sign-in** through **Better Auth**. Server code runs as Vercel Functions in the same deployment; there's no separate backend to host.

Step 1 is in place: the schema, migrations, Google sign-in, a `/sign-in` page and a sign-in gate. The screens still read and write browser storage until the next steps move each data type to the database. Until the variables below are set, the gate stays open and the app works as before.

**Setup**
1. **Neon:** in Vercel, open your project → **Storage** → **Create** → **Neon**. This sets `DATABASE_URL` in Vercel.
2. **Google:** in Google Cloud Console → **APIs & Services** → **Credentials**, create an **OAuth client ID** (Web application) with these redirect URIs:
   - `http://localhost:3000/api/auth/callback/google`
   - `https://<your-vercel-domain>/api/auth/callback/google`
3. **Local env:** copy `.env.example` to `.env.local` and fill in `DATABASE_URL`, `BETTER_AUTH_SECRET` (`openssl rand -base64 32`), `BETTER_AUTH_URL`, `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`. Add the same values (with your production `BETTER_AUTH_URL`) in Vercel → **Settings** → **Environment Variables**.
4. **Tables:** run `npm run db:migrate` to create the tables in Neon.

| Script | What it does |
| --- | --- |
| `npm run db:generate` | Writes a new SQL migration to `drizzle/` after you change `src/db/schema.ts` |
| `npm run db:migrate` | Applies pending migrations to the database in `DATABASE_URL` |
| `npm run db:studio` | Opens a browser view of the database |

## Project structure

```
src/
  app/
    (app)/            # Main pages: home, history, goals, categories, settings, recurring
    (entry)/          # Full-screen transaction entry
    manifest.ts       # PWA manifest
    icons/            # Generated app icons
  components/
    dashboard/        # Home page sections
    transaction/      # Entry screen, keypad, category picker
    history/  goals/  categories/  targets/  settings/  accounts/  recurring/
    layout/           # App shell, bottom nav, expandable sheet
    ui/               # Shared UI primitives
  hooks/              # localStorage-backed state (transactions, goals, …)
  db/                 # Drizzle schema and Neon client
  lib/                # Domain logic: savings, targets, goals, goal photos, accounts,
                      # recurring, budget alerts, monthly recap; auth (server + client)
  proxy.ts            # Sign-in gate (Next.js 16 "proxy", formerly middleware)
drizzle/              # Generated SQL migrations
mobile/               # Work-in-progress Flutter port (see mobile/README.md)
```
