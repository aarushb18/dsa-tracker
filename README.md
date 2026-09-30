# PrepPilot

A personal planner for a first-year Software Developer internship: today's checklist, a day-by-day month
planner (1 Oct 2026 → internship), and a weekly re-plan that adjusts to what you actually finished.
Plain HTML/CSS/JS. There is no build step and no server, so it deploys to Vercel as-is.

## Use it
- **Today** shows what's due, with exam banners and reminders. Tick items as you finish them.
- **Planner** is the whole plan by month. Click a day to see it. Block a day (hackathon, travel, sick) and it won't count as behind.
- **Progress** shows milestones (target vs projected), DSA by step, hours by track and the weekly re-plan log.
- **Sync** brings in your Striver A2Z progress with one click, and exports/imports a backup.

### Weekly re-plan
On the first open of each week the app compares hours you were meant to do with hours you did.
- Behind: up to +25% work that week. If you're more than ~2 weeks behind it stops inflating and asks you to rescope.
- Ahead: the plan continues from where you really are, so nothing is repeated and later milestones move earlier.
- A late or at-risk milestone gets extra priority that week.

### Striver sync
1. Open **Sync**, drag **PrepPilot sync** to your bookmarks bar.
2. On your Striver A2Z sheet page (logged in), click the bookmark.
3. This site opens with your progress applied.

The bookmarklet reads only the "done / total" counters next to each step name, in your own browser.
Nothing is sent to a server. If takeUforward changes its page and no counters are found, it tells you.

## Deploy (Vercel)
Import this GitHub repo in Vercel, keep every default (Framework: Other, no build command) and deploy.
Every push to `main` redeploys.

## Data
Progress is stored in your browser (localStorage). Use **Sync → Export backup** to keep a copy or move devices.

## Change the plan
Everything (calendar, hours per day, phases, task lists, milestones) is in `planner/plan-data.js`.
The scheduling logic is in `planner/scheduler.js`; state and the weekly re-plan are in `store.js`.

## Test
`npm test` simulates a whole year at several effort levels (100%, 80%, uneven weeks) and prints milestone outcomes.
