# Gagan Personal Tracker — Premium 2.0

A free, private, offline-capable daily planner (tasks, habits, routines, focus timer, insights).
Everything is saved on your device. No account, no server, no cost.

## What was fixed
- **Progress chart line missing**: a line needs at least 2 recorded days. The chart now draws a continuous
  line + gradient area (0–120% axis, value labels, tooltips) exactly in the reference style, bridges
  untracked days with a dashed line, and never counts blank days as 0%.
  With only one recorded day it shows that point plus a hint. Use **Log a past day** or **Preview sample**.
- Chart no longer distorts on phones (it is drawn at real pixel width).
- "Throughout day" habit step no longer shows "12:undefined AM".
- Opening the app no longer records a fake 0% day; only real interactions are recorded.

## New premium features (all existing features kept)
Dark / Light / Auto theme · 6 accent colours · your name in greeting · "Up next" card ·
Quick add ("Gym 6:30pm", "Call mom tomorrow 5pm") · Focus timer (Pomodoro, survives closing) ·
Search · Undo on delete · Reminders while app is open · Daily mood check-in ·
Insights tab: streaks, 7-day average, 16-week heatmap, weekday pattern, mood week, 10 achievements ·
Confetti on a 100% day · Log past days · CSV + JSON export · Backup nudge ·
Keyboard shortcuts (1–5, N, /, F) · Home-screen shortcuts · Offline update toast.

## Deploy on GitHub Pages
1. Upload **all files in this folder** to the root of your repository (replace the old ones).
2. Settings → Pages → Deploy from branch → `main` / root.
3. Open the `https://…github.io/…` link in Safari → Share → **Add to Home Screen**.
4. If you still see the old version, close the app fully and reopen it twice (the service worker updates in the background).

Your saved data and history carry over automatically.
