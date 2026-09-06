# FAST FORWARD

**Small choices. Kept promises. More life.**

A mobile-first PWA for fasting, hydration, movement, habits and health discipline.
Dark-mode first, built to be installed on a phone and used every day.

---

## What's in it

| Area | What it does |
|---|---|
| **Today** | Live dashboard — fast clock, Pop Pact streak, hydration, walking, weight, and Today's Votes. Cards appear and disappear with your tracking modules. |
| **The Fast Lane** | Presets (16:8 → 48h), custom durations, backdated starts, optional targets, extended-fast day counting, milestone history, stats and charts. No failure state. |
| **The Pop Pact** | First-class streak feature with milestones, custom reasons, honest slip logging, and the Fizz Emergency craving screen. |
| **Hydration Station** | Custom containers, quick-add, entry history, and a reminder engine that counts from your last drink. |
| **Electrolytes** | Your own products with your own numbers. No dosing advice. |
| **Walk This Weigh** | Minutes, distance, steps, weekly chart, and a one-tap Tiny Win so a short day is never a zero. |
| **Weight** | Trend-weighted average, 7/30/90/all-time charts, neutral copy in both directions. |
| **Tiny Wins** | Identity statement, cue, habit stack, normal goal *and* minimum version per habit. Per-weekday scheduling and 30-day rep counts. |
| **Workouts** | Generic by design — each exercise declares which fields apply (sets/reps/weight/duration/distance). |
| **Timeline** | Every logged event, chronologically, as a daily health journal. |
| **Reminders** | Web push with Nag Levels 1–5, four personalities, quiet hours, habit-stack triggers and an evening recap. |

---

## Stack

Next.js 15 (App Router) · React 19 · TypeScript · Tailwind · Prisma · PostgreSQL · Recharts · web-push

Single deployable Railway service. The reminder scheduler runs in-process.

---

## Deploying to Railway

**The app configures itself.** On first boot it generates its own push keypair
and session signing secret and stores them in the database, so the only
variable you have to set is `DATABASE_URL`. No terminal required — the whole
deploy can be done from a phone browser.

**1. Create the project**

Railway → *New Project* → *Deploy from GitHub repo* → pick this repo.
Under *Settings → Source*, set the branch you want to deploy.

**2. Add PostgreSQL**

*New → Database → PostgreSQL* in the same project.

**3. Point the app at the database**

On the app service, *Variables* → add:

```
DATABASE_URL = ${{Postgres.DATABASE_URL}}
```

**4. Generate a domain**

*Settings → Networking → Generate Domain*.

That's it. `npm run start` syncs the schema and boots. Visit `/signup` to
create your account — water containers, fasting presets, starter Tiny Wins and
the Pop Pact are all seeded automatically.

### Optional variables

| Variable | Why you'd set it |
|---|---|
| `VAPID_SUBJECT` | `mailto:you@example.com` — the contact address on your push messages |
| `SESSION_SECRET` | Supply your own signing secret instead of the generated one |
| `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` | Supply your own push keys (`npm run genkeys`) |
| `ENABLE_IN_PROCESS_CRON` | `false` to run reminders from Railway Cron instead |
| `CRON_SECRET` | Required if you use the external cron endpoint |

Generated secrets live in the `AppConfig` table and persist across redeploys,
so you stay signed in and your push subscriptions keep working. Setting the
matching environment variable always overrides the stored value.

Seeding from a terminal, if you ever want to:

```bash
SEED_EMAIL=you@example.com SEED_PASSWORD=... SEED_NAME=... npm run db:seed
```

## Install it on your phone

**iPhone** — open the URL in Safari → Share → **Add to Home Screen**.
This step is required: iOS only delivers push notifications to an installed PWA,
never to a Safari tab.

**Android** — Chrome will offer *Install app*, or use the ⋮ menu.

Then open the app and tap **Enable Reminders** in Settings → Notifications.
The permission prompt only appears on that explicit tap.

---

## How the water reminder engine works

Eligibility is computed from your **last logged drink**, never from a timer tick:

```
last water 1:45 PM + 60-minute interval  →  next reminder 2:45 PM
```

A cron pass at 2:00 PM stays silent. On top of that:

- an idle guard suppresses a nudge if you drank recently
- reaching your goal stops reminders for the rest of the day
- quiet hours and the active window are both respected
- every send is deduped per day, so overlapping ticks can't double-notify

These rules are covered by `tests/reminders.test.ts`:

```bash
npm run test
```

### Running the scheduler externally instead

Set `ENABLE_IN_PROCESS_CRON=false` and point Railway Cron at:

```
GET /api/cron/tick?secret=$CRON_SECRET
```

Every 5 minutes is a good cadence. The endpoint is idempotent.

---

## Local development

```bash
npm install
cp .env.example .env      # fill in DATABASE_URL and SESSION_SECRET
npm run genkeys >> .env   # optional, for push
npm run db:push
npm run db:seed
npm run dev
```

## Scripts

| Command | Does |
|---|---|
| `npm run dev` | Dev server |
| `npm run build` | Generate the Prisma client and build |
| `npm run start` | Sync schema, then start (Railway's start command) |
| `npm run test` | Reminder-engine rules |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run db:push` | Push the schema |
| `npm run db:seed` | Seed an account + the Pop Pact |
| `npm run genkeys` | Generate VAPID keys |

---

## A note on scope

Fast Forward is a **tracker**. It records what you tell it and shows it back to
you. It does not diagnose, prescribe, recommend electrolyte doses, or write
refeeding plans — and it never encourages continuing a fast. Extended fasts
surface a notice recommending medical supervision, and you can end any fast at
any moment without the app treating it as a failure.
