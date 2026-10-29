(() => {
  "use strict";
  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];
  const KEY = "dayflow.v1.state"; // Same key as before, so your existing saved data keeps working.
  const LOOK_KEY = "gagan.look";
  const FOCUS_KEY = "gagan.focus";
  const NOTIFIED_KEY = "gagan.notified";
  const BASE_TITLE = "Gagan Personal Tracker";
  const pad = n => String(n).padStart(2, "0");
  const dateISO = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const today = () => dateISO();
  const parseISO = s => new Date(s + "T12:00:00");
  const addDays = (iso, n) => { const d = parseISO(iso); d.setDate(d.getDate() + n); return dateISO(d); };
  const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const escapeHtml = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const isTime = t => /^\d{1,2}:\d{2}$/.test(t || "");
  const toMin = t => { const m = /^(\d{1,2}):(\d{2})$/.exec(t || ""); return m ? (+m[1]) * 60 + (+m[2]) : null; };
  const timeLabel = t => {
    if (!t) return "Any time";
    if (!isTime(t)) return t;
    const [h, m] = t.split(":").map(Number);
    const ap = h >= 12 ? "PM" : "AM"; const hh = h % 12 || 12;
    return `${hh}:${pad(m)} ${ap}`;
  };
  const rangeTimeLabel = t => { if (!isTime(t)) return ""; const [h, m] = t.split(":").map(Number); return `${h}.${pad(m)}`; };

  /* ---------- State ---------- */
  const DEFAULT_SETTINGS = { name: "Gagan", theme: "light", accent: "sage", remind: false, lead: 5, goodDay: 50, sound: true, confetti: true, lastBackup: "" };
  const stateDefault = () => ({
    tasks: [
      { id: uid(), title: "Morning walk", date: today(), time: "07:00", endTime: "07:30", type: "task", repeat: "daily", done: false, note: "A little movement to start the day.", emoji: "☀️", color: "peach" },
      { id: uid(), title: "Read for 20 minutes", date: today(), time: "09:00", endTime: "09:20", type: "task", repeat: "daily", done: false, note: "", emoji: "📖", color: "lilac" },
      { id: uid(), title: "Plan tomorrow", date: today(), time: "20:30", endTime: "20:40", type: "task", repeat: "daily", done: false, note: "", emoji: "✦", color: "mint" }
    ],
    habits: [{ id: uid(), title: "Drink 2.3 L water", goal: 2300, unit: "ml", color: "blue", emoji: "💧", steps: [
      { id: uid(), title: "250 ml water", time: "08:05", amount: 250, done: false },
      { id: uid(), title: "200 ml water", time: "10:30", amount: 200, done: false },
      { id: uid(), title: "200 ml water", time: "11:30", amount: 200, done: false },
      { id: uid(), title: "250 ml water", time: "13:00", amount: 250, done: false },
      { id: uid(), title: "250 ml water", time: "15:00", amount: 250, done: false },
      { id: uid(), title: "250 ml water", time: "17:00", amount: 250, done: false },
      { id: uid(), title: "250 ml water", time: "19:00", amount: 250, done: false },
      { id: uid(), title: "250 ml water", time: "21:00", amount: 250, done: false },
      { id: uid(), title: "400 ml water", time: "Throughout day", amount: 400, done: false }
    ] }],
    routines: [{ id: uid(), title: "Morning reset", steps: [{ title: "Drink water", time: "07:00" }, { title: "Stretch", time: "07:10" }, { title: "Take a short walk", time: "07:25" }] }],
    waterGoal: 2300, waterLogs: [], history: {}, lastOpen: today(), journal: {}, focusLog: {}, badges: {}, settings: { ...DEFAULT_SETTINGS }
  });
  function normalize(s) {
    if (!Array.isArray(s.tasks)) s.tasks = [];
    if (!Array.isArray(s.habits)) s.habits = [];
    if (!Array.isArray(s.routines)) s.routines = [];
    s.habits.forEach(h => { if (!Array.isArray(h.steps)) h.steps = []; });
    s.routines.forEach(r => { if (!Array.isArray(r.steps)) r.steps = []; });
    if (!s.history || typeof s.history !== "object") s.history = {};
    if (!s.journal || typeof s.journal !== "object") s.journal = {};
    if (!s.focusLog || typeof s.focusLog !== "object") s.focusLog = {};
    if (!s.badges || typeof s.badges !== "object") s.badges = {};
    if (!Array.isArray(s.waterLogs)) s.waterLogs = [];
    if (!s.lastOpen) s.lastOpen = today();
    s.settings = { ...DEFAULT_SETTINGS, ...(s.settings && typeof s.settings === "object" ? s.settings : {}) };
    return s;
  }
  let state;
  try {
    const raw = JSON.parse(localStorage.getItem(KEY));
    state = raw && Array.isArray(raw.tasks) && Array.isArray(raw.habits) && Array.isArray(raw.routines) ? raw : stateDefault();
  } catch { state = stateDefault(); }
  normalize(state);

  let toastTimer;
  let storageWarned = false;
  function persist() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); }
    catch { if (!storageWarned) { storageWarned = true; toast("Could not save on this device. Export a backup soon."); } }
  }
  function toast(msg, actionLabel, fn) {
    const t = $("#toast"); t.textContent = "";
    const s = document.createElement("span"); s.textContent = msg; t.append(s);
    if (actionLabel) {
      const b = document.createElement("button"); b.type = "button"; b.className = "toast-action"; b.textContent = actionLabel;
      b.addEventListener("click", () => { t.classList.remove("show"); if (fn) fn(); });
      t.append(b);
    }
    t.classList.toggle("has-action", !!actionLabel);
    t.classList.add("show"); clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove("show"), actionLabel ? 6000 : 2400);
  }

  /* ---------- Progress recording ---------- */
  function recordTodayProgress() {
    const items = allTodayItems(), done = items.filter(x => x.done).length, total = items.length, t = today();
    if (!total) { if (state.history[t] && !state.history[t].manual) delete state.history[t]; return; }
    state.history[t] = { done, total, percent: Math.round(done / total * 100) };
  }
  function save() {
    recordTodayProgress();
    checkBadges(true);
    persist();
    render();
  }
  function withUndo(msg, mutate) {
    const snap = JSON.stringify(state);
    mutate(); save();
    toast(msg, "Undo", () => { try { state = normalize(JSON.parse(snap)); save(); applyLook(); } catch { /* ignore */ } });
  }

  /* ---------- Look & feel (theme / accent) ---------- */
  const mqDark = window.matchMedia ? matchMedia("(prefers-color-scheme: dark)") : null;
  function applyLook() {
    const s = state.settings;
    const dark = s.theme === "dark" || (s.theme === "auto" && mqDark && mqDark.matches);
    document.documentElement.dataset.theme = dark ? "dark" : "light";
    document.documentElement.dataset.accent = s.accent || "sage";
    const m = $("#themeColorMeta"); if (m) m.setAttribute("content", dark ? "#101311" : "#f7f7f4");
    try { localStorage.setItem(LOOK_KEY, JSON.stringify({ theme: s.theme, accent: s.accent })); } catch { /* ignore */ }
    if (typeof renderProgress === "function") renderProgress(false);
  }
  if (mqDark && mqDark.addEventListener) mqDark.addEventListener("change", () => { if (state.settings.theme === "auto") applyLook(); });

  /* ---------- Date / greeting ---------- */
  function setDateLabel() {
    const d = new Date(); $("#todayLabel").textContent = d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
    $("#fullDate").textContent = d.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" });
    const h = d.getHours(); const base = h < 12 ? "A FRESH START" : h < 17 ? "ONE THING AT A TIME" : "WIND DOWN WITH INTENTION";
    const nm = (state.settings.name || "").trim();
    $("#greeting").textContent = nm ? `${base} · ${nm.toUpperCase()}` : base;
    $("#headline").textContent = h < 12 ? "Make today count." : h < 17 ? "Keep your rhythm." : "Finish gently, feel good.";
  }

  /* ---------- Recurring tasks ---------- */
  function ensureRecurring() {
    const now = today();
    const previous = state.lastOpen || now;
    if (previous !== now) {
      const start = parseISO(previous), end = parseISO(now);
      const recurring = state.tasks.filter(t => t.repeat && t.repeat !== "none").map(t => ({ ...t, templateDate: t.date }));
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const ds = dateISO(d), weekday = d.getDay();
        recurring.forEach(t => {
          if (ds <= t.templateDate) return;
          const base = parseISO(t.templateDate);
          const should = t.repeat === "daily" || (t.repeat === "weekdays" && weekday >= 1 && weekday <= 5) || (t.repeat === "weekly" && weekday === base.getDay());
          if (should && !state.tasks.some(x => x.title === t.title && x.date === ds && x.repeat === t.repeat)) {
            const copy = { ...t, id: uid(), date: ds, done: false }; delete copy.templateDate; state.tasks.push(copy);
          }
        });
      }
      state.habits.forEach(h => h.steps.forEach(s => { s.done = false; }));
      state.waterLogs = (state.waterLogs || []).filter(l => l.date === now);
    }
    state.lastOpen = now; persist();
  }
  function getTodayTasks() { return state.tasks.filter(t => t.date === today()).sort((a, b) => (a.time || "99:99").localeCompare(b.time || "99:99")); }
  function allTodayItems() {
    const tasks = getTodayTasks().map(t => ({ kind: "task", id: t.id, time: t.time, title: t.title, done: t.done, source: t, note: t.note }));
    state.habits.forEach(h => h.steps.forEach(s => tasks.push({ kind: "step", id: s.id, parent: h.id, time: s.time, title: s.title, done: s.done, source: s, note: h.title })));
    return tasks.sort((a, b) => (a.time || "99:99").localeCompare(b.time || "99:99"));
  }
  const nowMinutes = () => { const n = new Date(); return n.getHours() * 60 + n.getMinutes(); };

  /* ---------- Timeline ---------- */
  function renderTimeline() {
    const items = allTodayItems(); const host = $("#timeline");
    if (!items.length) { host.innerHTML = '<div class="empty-state"><strong>Your day is open.</strong>Add a task or build a habit to start planning.</div>'; return; }
    const groups = {};
    items.forEach(it => { const k = it.time || "Any time"; (groups[k] ||= []).push(it); });
    const nm = nowMinutes();
    const nextItem = items.find(i => !i.done && toMin(i.time) !== null && toMin(i.time) >= nm);
    const nextKey = nextItem ? nextItem.time : null;
    host.innerHTML = Object.entries(groups).map(([time, arr]) => `<div class="time-group ${time === nextKey ? "is-next" : ""}"><div class="time-label">${escapeHtml(isTime(time) ? timeLabel(time) : "All day")}</div><div class="time-content">${arr.map(it => `
      <article class="task-card tone-${escapeHtml(it.source.color || (it.kind === "step" ? "blue" : "slate"))} ${it.done ? "done" : ""}">
        <div class="task-icon tone-${escapeHtml(it.source.color || (it.kind === "step" ? "blue" : "slate"))}">${escapeHtml(it.source.emoji || (it.kind === "step" ? "✦" : "◷"))}</div><input class="check" type="checkbox" data-check-kind="${it.kind}" data-id="${it.id}" ${it.done ? "checked" : ""} aria-label="Mark ${escapeHtml(it.title)} complete">
        <div class="task-main"><div class="task-title">${escapeHtml(it.title)}</div><div class="task-meta"><span>${it.kind === "step" ? "Habit step" : "Task"}</span>${it.kind === "step" ? `<span>• ${escapeHtml(it.note || "")}</span>` : ""}${it.kind === "task" && it.source.time && it.source.endTime ? `<span class="time-range">${escapeHtml(rangeTimeLabel(it.source.time))}–${escapeHtml(rangeTimeLabel(it.source.endTime))}</span>` : ""}${it.source.repeat && it.source.repeat !== "none" ? "<span>• Repeats</span>" : ""}</div>${it.note && it.kind === "task" ? `<div class="task-note">${escapeHtml(it.note)}</div>` : ""}</div>
        <div class="task-actions"><button class="tiny-btn" data-edit-kind="${it.kind}" data-id="${it.id}" aria-label="Edit">✎</button><button class="tiny-btn" data-delete-kind="${it.kind}" data-id="${it.id}" aria-label="Delete">×</button></div>
      </article>`).join("")}</div></div>`).join("");
  }

  /* ---------- Water ---------- */
  function waterInfo() {
    const h = state.habits.find(x => x.title.toLowerCase().includes("water")) || state.habits[0];
    const goal = Number(h?.goal || state.waterGoal || 2300);
    const steps = (h?.steps || []).filter(s => s.amount);
    const amount = steps.reduce((sum, s) => sum + (s.done ? Number(s.amount) : 0), 0);
    return { h, goal, steps, amount };
  }
  function renderWater() {
    const { goal, steps, amount } = waterInfo();
    $("#waterAmount").textContent = amount.toLocaleString();
    $("#waterProgress").style.width = Math.min(100, amount / goal * 100) + "%";
    $("#waterPercent").textContent = `${Math.min(100, Math.round(amount / goal * 100))}% complete`;
    $("#waterEntries").innerHTML = steps.slice(0, 4).map(s => `<div class="water-entry"><input class="check" type="checkbox" data-check-kind="step" data-id="${s.id}" ${s.done ? "checked" : ""} aria-label="Water step"><span>${escapeHtml(s.title)}</span><small>${escapeHtml(s.time || "")}</small></div>`).join("");
  }

  /* ---------- Summary + celebration ---------- */
  let lastPercent = null;
  function renderSummary() {
    const items = allTodayItems(), done = items.filter(x => x.done).length, percent = items.length ? Math.round(done / items.length * 100) : 0;
    $("#scheduledCount").textContent = items.length; $("#completedCount").textContent = done; $("#habitCount").textContent = state.habits.length;
    $("#dayPercent").textContent = percent + "%"; $("#dayRing").style.background = `conic-gradient(var(--green) ${percent}%, var(--ring-track) ${percent}%)`;
    $("#sideProgress").style.width = percent + "%"; $("#sideDone").textContent = `${done} of ${items.length} done`;
    if (lastPercent !== null && items.length && percent === 100 && lastPercent < 100) celebrate();
    lastPercent = percent;
  }
  function celebrate() {
    toast("🎉 Perfect day — every item done!");
    beep(); buzz([60, 40, 60]);
    if (!state.settings.confetti || (window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches)) return;
    try {
      const c = document.createElement("canvas"); c.className = "confetti"; c.width = innerWidth; c.height = innerHeight; document.body.appendChild(c);
      const ctx = c.getContext("2d"); const colors = ["#587a66", "#7da9cd", "#a18acb", "#dd8da1", "#f08f61", "#e6c35c"];
      const parts = Array.from({ length: 110 }, () => ({ x: Math.random() * c.width, y: -20 - Math.random() * c.height * .4, vx: (Math.random() - .5) * 3, vy: 2 + Math.random() * 4, s: 5 + Math.random() * 6, r: Math.random() * 6, vr: (Math.random() - .5) * .3, col: colors[(Math.random() * colors.length) | 0] }));
      const t0 = performance.now();
      const frame = t => {
        const el = t - t0; ctx.clearRect(0, 0, c.width, c.height);
        parts.forEach(p => { p.x += p.vx; p.y += p.vy; p.vy += .04; p.r += p.vr; ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r); ctx.globalAlpha = clamp(1 - (el - 1600) / 800, 0, 1); ctx.fillStyle = p.col; ctx.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2); ctx.restore(); });
        if (el < 2500) requestAnimationFrame(frame); else c.remove();
      };
      requestAnimationFrame(frame);
    } catch { /* ignore */ }
  }
  function buzz(pattern) {
    try { if (navigator.vibrate && (!navigator.userActivation || navigator.userActivation.hasBeenActive)) navigator.vibrate(pattern); } catch { /* ignore */ }
  }
  function beep() {
    if (!state.settings.sound) return;
    try {
      const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
      const ctx = new AC(), o = ctx.createOscillator(), g = ctx.createGain();
      o.type = "sine"; o.frequency.value = 880;
      g.gain.setValueAtTime(.0001, ctx.currentTime); g.gain.exponentialRampToValueAtTime(.22, ctx.currentTime + .03); g.gain.exponentialRampToValueAtTime(.0001, ctx.currentTime + .6);
      o.connect(g); g.connect(ctx.destination); o.start(); o.stop(ctx.currentTime + .65);
      setTimeout(() => { try { ctx.close(); } catch { /* ignore */ } }, 900);
    } catch { /* ignore */ }
  }

  /* ---------- Up next ---------- */
  function relTime(diff) {
    const a = Math.abs(diff), h = Math.floor(a / 60), m = a % 60;
    const txt = h ? `${h} h${m ? ` ${m} min` : ""}` : `${m} min`;
    return diff > 0 ? `in ${txt}` : diff < 0 ? `${txt} late` : "right now";
  }
  function renderUpNext() {
    const host = $("#upNext"); if (!host) return;
    const items = allTodayItems();
    if (!items.length) { host.hidden = true; return; }
    host.hidden = false;
    const nm = nowMinutes(), pending = items.filter(i => !i.done);
    if (!pending.length) {
      host.className = "upnext all-done";
      host.innerHTML = `<div class="up-ico">🎉</div><div class="up-main"><div class="eyebrow">ALL DONE</div><div class="up-title">You cleared today's list</div><div class="up-meta">Rest well — tomorrow starts fresh.</div></div>`;
      return;
    }
    const timed = pending.filter(i => toMin(i.time) !== null);
    const upcoming = timed.filter(i => toMin(i.time) >= nm);
    let pick, label, meta;
    if (upcoming.length) { pick = upcoming[0]; const d = toMin(pick.time) - nm; label = d === 0 ? "HAPPENING NOW" : "UP NEXT"; meta = `${timeLabel(pick.time)} · ${relTime(d)}`; }
    else if (timed.length) { pick = timed[timed.length - 1]; label = "OVERDUE"; meta = `${timeLabel(pick.time)} · ${relTime(toMin(pick.time) - nm)}`; }
    else { pick = pending[0]; label = "WHENEVER YOU'RE READY"; meta = pick.time && !isTime(pick.time) ? pick.time : "Any time today"; }
    const tone = pick.source.color || (pick.kind === "step" ? "blue" : "slate");
    host.className = `upnext tone-${tone}${label === "OVERDUE" ? " overdue" : ""}`;
    host.innerHTML = `<div class="up-ico task-icon tone-${escapeHtml(tone)}">${escapeHtml(pick.source.emoji || (pick.kind === "step" ? "✦" : "◷"))}</div>
      <div class="up-main"><div class="eyebrow">${escapeHtml(label)}</div><div class="up-title">${escapeHtml(pick.title)}</div><div class="up-meta">${escapeHtml(meta)}</div></div>
      <div class="up-actions"><button type="button" class="soft-btn" data-focus-from="${pick.kind}|${pick.id}">Focus</button><button type="button" class="primary-btn" data-upnext-done="${pick.kind}|${pick.id}">Done</button></div>`;
  }

  /* ---------- Habits / routines ---------- */
  function renderHabits() {
    const host = $("#habitsList");
    if (!state.habits.length) { host.innerHTML = '<div class="empty-state"><strong>No habits yet.</strong>Create a habit and split it into timed steps.</div>'; return; }
    host.innerHTML = state.habits.map(h => {
      const done = h.steps.filter(s => s.done).length, total = h.steps.length, progress = total ? Math.round(done / total * 100) : 0;
      const val = h.steps.reduce((sum, s) => sum + (s.done ? Number(s.amount || 0) : 0), 0);
      const goal = Number(h.goal || 0);
      return `<article class="habit-card tone-${escapeHtml(h.color || "blue")}">
        <div class="habit-card-top"><span class="habit-icon tone-${escapeHtml(h.color || "blue")}">${escapeHtml(h.emoji || "✦")}</span><div style="min-width:0;flex:1"><h3 class="habit-card-title">${escapeHtml(h.title)}</h3><div class="habit-card-sub">${goal ? `${val.toLocaleString()} / ${goal.toLocaleString()} ${escapeHtml(h.unit || "")}` : `${done} of ${total} steps complete`}</div></div><div class="task-actions"><button class="tiny-btn" data-edit-habit="${h.id}" aria-label="Edit habit">✎</button><button class="tiny-btn" data-delete-habit="${h.id}" aria-label="Delete habit">×</button></div></div>
        <div class="habit-progress-line"><span>${progress}% complete</span><strong>${done}/${total}</strong></div><div class="progress-track"><span style="width:${progress}%"></span></div>
        <div class="habit-steps" style="margin-top:15px">${h.steps.slice().sort((a, b) => (a.time || "99:99").localeCompare(b.time || "99:99")).map(s => `<div class="habit-step ${s.done ? "done" : ""}"><input class="check" type="checkbox" data-check-kind="step" data-id="${s.id}" ${s.done ? "checked" : ""} aria-label="Complete ${escapeHtml(s.title)}"><span class="step-label">${escapeHtml(s.title)}</span><span class="step-time">${escapeHtml(s.time ? timeLabel(s.time) : "Any time")}</span><button class="tiny-btn" data-edit-step="${s.id}" data-parent="${h.id}" aria-label="Edit step">✎</button></div>`).join("")}</div>
        <button class="add-step" data-add-step="${h.id}">＋ Add a timed step</button>
      </article>`;
    }).join("");
  }
  function renderRoutines() {
    const host = $("#routinesList");
    if (!state.routines.length) { host.innerHTML = '<div class="empty-state"><strong>No routines saved.</strong>Create a routine to reuse your favourite set of tasks.</div>'; return; }
    host.innerHTML = state.routines.map(r => `<article class="routine-card"><div class="routine-symbol">▦</div><h3>${escapeHtml(r.title)}</h3><p>${r.steps.length} steps · Reusable checklist</p><div class="routine-steps-preview">${r.steps.slice(0, 4).map(s => `${s.time ? escapeHtml(timeLabel(s.time)) + " · " : ""}${escapeHtml(s.title)}`).join("<br>")}${r.steps.length > 4 ? "<br>…" : ""}</div><div class="routine-actions"><button class="primary-btn" data-use-routine="${r.id}">Add to today</button><button class="soft-btn" data-edit-routine="${r.id}">Edit</button><button class="soft-btn" data-delete-routine="${r.id}">Delete</button></div></article>`).join("");
  }

  /* ---------- Progress chart ---------- */
  let progressPeriod = "month", sampleMode = false, lastChartW = 0, tipHideTimer;
  const SAMPLE = [100, 40, 60, 60, 100, 20, 80, 100, 80, 40, 100, 80, 60, 100, 80, 60];
  function buildPeriod(period) {
    const now = new Date(), hist = state.history || {};
    const rec = k => { const v = hist[k]; return v && Number.isFinite(v.percent) ? v : null; };
    const pts = []; let caption = "";
    const dayPoint = (d, label) => { const key = dateISO(d), r = rec(key); return { key, label, tip: d.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" }), value: r ? r.percent : null, done: r && r.total ? r.done : null, total: r && r.total ? r.total : null }; };
    if (period === "week") {
      const start = new Date(now); start.setHours(12, 0, 0, 0); start.setDate(now.getDate() - ((now.getDay() + 6) % 7));
      for (let i = 0; i < 7; i++) { const d = new Date(start); d.setDate(start.getDate() + i); pts.push(dayPoint(d, d.toLocaleDateString(undefined, { weekday: "short" }))); }
      caption = "Average completion this week";
    } else if (period === "month" || period === "fullmonth") {
      const y = now.getFullYear(), m = now.getMonth(), total = new Date(y, m + 1, 0).getDate(), n = period === "month" ? now.getDate() : total;
      for (let i = 1; i <= n; i++) pts.push(dayPoint(new Date(y, m, i, 12), String(i)));
      caption = period === "month" ? "Average completion this month" : "Average completion, full month";
    } else {
      const y = now.getFullYear();
      for (let m = 0; m < 12; m++) {
        const prefix = `${y}-${pad(m + 1)}-`;
        const vals = Object.entries(hist).filter(([k, v]) => k.startsWith(prefix) && v && Number.isFinite(v.percent)).map(([, v]) => v.percent);
        const d = new Date(y, m, 1, 12);
        pts.push({ key: prefix, label: d.toLocaleDateString(undefined, { month: "short" }), tip: d.toLocaleDateString(undefined, { month: "long" }) + " avg", value: vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : null, done: null, total: null });
      }
      caption = "Average completion this year";
    }
    if (sampleMode) { pts.forEach((p, i) => { p.value = SAMPLE[i % SAMPLE.length]; p.done = null; p.total = null; }); caption = "Sample data — not your real progress"; }
    return { pts, caption };
  }
  function renderProgress(animate = false) {
    const host = $("#progressChart"); if (!host) return;
    const { pts, caption } = buildPeriod(progressPeriod);
    const known = pts.map((p, i) => ({ ...p, i })).filter(p => p.value !== null);
    const avg = known.length ? Math.round(known.reduce((s, p) => s + p.value, 0) / known.length) : 0;
    $("#chartAverage").textContent = known.length ? `${avg}%` : "—"; $("#chartCaption").textContent = caption;
    $("#sampleBadge").hidden = !sampleMode; $("#sampleBtn").textContent = sampleMode ? "Hide sample" : "Preview sample";
    $$(".analytics-tab").forEach(b => { const on = b.dataset.period === progressPeriod; b.classList.toggle("active", on); b.setAttribute("aria-selected", on ? "true" : "false"); });
    let foot;
    if (!known.length) foot = "No saved progress for this period yet. Complete tasks and habits to build your chart.";
    else if (sampleMode) foot = "This is a sample preview so you can see how your chart will look. Hide it to return to your real data.";
    else if (known.length === 1) foot = "1 day recorded so far. A line needs at least 2 recorded days — it connects automatically as you track more days, or use “Log a past day” below.";
    else foot = `${known.length} recorded ${progressPeriod === "year" ? "months" : "days"}. Dashed lines bridge days without saved records; blank days are never counted as zero.`;
    $("#chartFootnote").textContent = foot;

    const W = Math.round(host.clientWidth); if (W < 60) return; // hidden view; the ResizeObserver redraws when it becomes visible
    lastChartW = W;
    const H = W < 520 ? 250 : 280, L = 42, R = 16, T = 22, B = 30, iw = W - L - R, ih = H - T - B, n = pts.length;
    const x = i => n <= 1 ? L + iw / 2 : L + i * iw / (n - 1);
    const y = v => T + (120 - v) * ih / 120;
    const grid = [0, 30, 60, 90, 120].map(v => `<g><line class="c-grid" x1="${L}" y1="${y(v)}" x2="${W - R}" y2="${y(v)}"/><text class="c-axis" x="${L - 9}" y="${y(v) + 4}" text-anchor="end">${v}%</text></g>`).join("");
    // Build continuous runs (adjacent recorded days) and dashed bridges across untracked days.
    const runs = []; let cur = [], dashed = "";
    known.forEach((p, k) => {
      if (k > 0 && p.i - known[k - 1].i > 1) { const a = known[k - 1]; dashed += `M${x(a.i)} ${y(a.value)}L${x(p.i)} ${y(p.value)}`; runs.push(cur); cur = []; }
      cur.push(p);
    });
    if (cur.length) runs.push(cur);
    const solid = runs.filter(r => r.length > 1).map(r => "M" + r.map(p => `${x(p.i)} ${y(p.value)}`).join("L")).join("");
    const base = T + ih;
    const area = known.length > 1 ? `<path class="c-area" d="M${x(known[0].i)} ${base}L${known.map(p => `${x(p.i)} ${y(p.value)}`).join("L")}L${x(known[known.length - 1].i)} ${base}Z" fill="url(#pgFill)"/>` : "";
    const dots = known.map((p, k) => (known.length <= 3 || k === known.length - 1) ? `<circle class="c-dot" cx="${x(p.i)}" cy="${y(p.value)}" r="4.5"/>` : "").join("");
    // Value labels: walk right→left so the newest value is always shown, and keep labels from colliding.
    let leftEdge = Infinity; const labelParts = [];
    for (let k = known.length - 1; k >= 0; k--) {
      const p = known[k], px = x(p.i), txt = `${p.value}%`, tw = txt.length * 6.6 + 2;
      let anchor = "middle", l = px - tw / 2, r = px + tw / 2;
      if (r > W - 2) { anchor = "end"; l = px - tw; r = px; }
      else if (l < L - 6) { anchor = "start"; l = px; r = px + tw; }
      if (r > leftEdge - 6) continue; // would collide with a label already placed to the right
      leftEdge = l;
      labelParts.push(`<text class="c-val" x="${px}" y="${Math.max(11, y(p.value) - 10)}" text-anchor="${anchor}">${txt}</text>`);
    }
    const gap = progressPeriod === "year" || progressPeriod === "week" ? 22 : 26; let lx = -Infinity;
    const xl = pts.map((p, i) => { const px = x(i); if (i !== 0 && px - lx < gap) return ""; lx = px; const anchor = i === 0 && n > 1 ? "start" : "middle"; return `<text class="c-axis" x="${anchor === "start" ? px - 4 : px}" y="${H - 8}" text-anchor="${anchor}">${escapeHtml(p.label)}</text>`; }).join("");
    const anim = animate ? `<animate attributeName="width" from="0" to="${W}" dur=".9s" fill="freeze" calcMode="spline" keyTimes="0;1" keySplines=".25 .1 .25 1"/>` : "";
    host.innerHTML = `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="${escapeHtml(caption)}">
      <defs><linearGradient id="pgFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" class="c-stop1"/><stop offset="1" class="c-stop2"/></linearGradient><clipPath id="pgClip"><rect x="0" y="0" width="${W}" height="${H}">${anim}</rect></clipPath></defs>
      ${grid}
      <g clip-path="url(#pgClip)">${area}${dashed ? `<path class="c-line c-bridge" d="${dashed}" fill="none"/>` : ""}${solid ? `<path class="c-line" d="${solid}" fill="none"/>` : ""}</g>
      ${dots}${labelParts.join("")}${xl}
      <line id="pgGuide" class="c-guide" x1="0" y1="${T}" x2="0" y2="${base}" visibility="hidden"/><circle id="pgHover" class="c-dot c-hover" r="5.5" cx="0" cy="0" visibility="hidden"/>
    </svg>`;
    const svg = host.querySelector("svg"), tip = $("#chartTip");
    const hide = () => { tip.hidden = true; $("#pgGuide")?.setAttribute("visibility", "hidden"); $("#pgHover")?.setAttribute("visibility", "hidden"); };
    const show = e => {
      if (!known.length) return;
      clearTimeout(tipHideTimer);
      const r = svg.getBoundingClientRect(), scale = r.width / W, px = (e.clientX - r.left) / scale;
      let best = known[0]; for (const p of known) if (Math.abs(x(p.i) - px) < Math.abs(x(best.i) - px)) best = p;
      const gx = x(best.i), gy = y(best.value);
      $("#pgGuide").setAttribute("x1", gx); $("#pgGuide").setAttribute("x2", gx); $("#pgGuide").setAttribute("visibility", "visible");
      $("#pgHover").setAttribute("cx", gx); $("#pgHover").setAttribute("cy", gy); $("#pgHover").setAttribute("visibility", "visible");
      tip.innerHTML = `<strong>${best.value}%</strong><span>${escapeHtml(best.tip)}</span>${best.total ? `<small>${best.done} of ${best.total} done</small>` : ""}`;
      tip.hidden = false;
      const wrapW = host.clientWidth, tw = tip.offsetWidth || 110;
      tip.style.left = clamp(gx * scale, tw / 2 + 4, wrapW - tw / 2 - 4) + "px";
      tip.style.top = Math.max(0, gy * scale - tip.offsetHeight - 14) + "px";
    };
    const leave = e => { if (e && e.pointerType === "touch") { clearTimeout(tipHideTimer); tipHideTimer = setTimeout(hide, 1800); } else hide(); };
    svg.addEventListener("pointermove", show); svg.addEventListener("pointerdown", show); svg.addEventListener("pointerleave", leave); svg.addEventListener("pointerup", leave);
  }
  if (window.ResizeObserver) {
    let raf; const ro = new ResizeObserver(() => { cancelAnimationFrame(raf); raf = requestAnimationFrame(() => { const w = Math.round($("#progressChart").clientWidth); if (w && w !== lastChartW) renderProgress(false); }); });
    ro.observe($("#progressChart"));
  } else window.addEventListener("resize", () => renderProgress(false));

  /* ---------- Streaks, badges, insights ---------- */
  function recordedDays() { return Object.entries(state.history).filter(([, v]) => v && Number.isFinite(v.percent)).sort(([a], [b]) => a < b ? -1 : 1); }
  function streaks() {
    const good = Number(state.settings.goodDay) || 50;
    const isGood = k => (state.history[k]?.percent ?? -1) >= good;
    let cur = 0, d = today(); if (!isGood(d)) d = addDays(d, -1);
    while (isGood(d)) { cur++; d = addDays(d, -1); if (cur > 4000) break; }
    let best = 0, run = 0, prev = null;
    for (const [k] of recordedDays()) {
      if (!isGood(k)) { run = 0; prev = null; continue; }
      run = prev && addDays(prev, 1) === k ? run + 1 : 1; prev = k; best = Math.max(best, run);
    }
    return { cur, best };
  }
  const focusTotal = () => Object.values(state.focusLog).reduce((s, v) => s + (Number(v) || 0), 0);
  const BADGES = [
    { id: "first", icon: "🌱", name: "First step", desc: "Track your first day", test: c => c.tracked >= 1 },
    { id: "t7", icon: "📅", name: "One week in", desc: "Track 7 days", test: c => c.tracked >= 7 },
    { id: "t30", icon: "🗓️", name: "Habit builder", desc: "Track 30 days", test: c => c.tracked >= 30 },
    { id: "perfect", icon: "💯", name: "Perfect day", desc: "Finish a day at 100%", test: c => c.perfect >= 1 },
    { id: "s3", icon: "🔥", name: "On a roll", desc: "3-day streak", test: c => c.best >= 3 },
    { id: "s7", icon: "⚡", name: "Unstoppable", desc: "7-day streak", test: c => c.best >= 7 },
    { id: "s30", icon: "👑", name: "Legend", desc: "30-day streak", test: c => c.best >= 30 },
    { id: "water", icon: "💧", name: "Hydration hero", desc: "Reach your water goal", test: c => c.waterHit },
    { id: "focus", icon: "🎯", name: "Deep focus", desc: "Focus for 100 minutes", test: c => c.focus >= 100 },
    { id: "mood", icon: "😊", name: "Self aware", desc: "Do 5 mood check-ins", test: c => c.moods >= 5 }
  ];
  function badgeContext() {
    const days = recordedDays(), { best } = streaks(), w = waterInfo();
    return { tracked: days.length, perfect: days.filter(([, v]) => v.percent >= 100).length, best, waterHit: w.amount >= w.goal && w.goal > 0, focus: focusTotal(), moods: Object.values(state.journal).filter(j => j && j.mood).length };
  }
  function checkBadges(announce) {
    const c = badgeContext(); let fresh = null;
    BADGES.forEach(b => { if (!state.badges[b.id] && b.test(c)) { state.badges[b.id] = today(); fresh = b; } });
    if (announce && fresh) setTimeout(() => toast(`${fresh.icon} Achievement unlocked: ${fresh.name}`), 400);
  }
  function renderInsights() {
    const days = recordedDays(), { cur, best } = streaks(), good = Number(state.settings.goodDay) || 50;
    const last7 = []; for (let i = 0; i < 7; i++) { const v = state.history[addDays(today(), -i)]; if (v && Number.isFinite(v.percent)) last7.push(v.percent); }
    const avg7 = last7.length ? Math.round(last7.reduce((a, b) => a + b, 0) / last7.length) + "%" : "—";
    const perfect = days.filter(([, v]) => v.percent >= 100).length, ft = state.focusLog[today()] || 0;
    const tiles = [
      ["🔥", cur, "Current streak", `days at ${good}%+`], ["🏆", best, "Best streak", `days at ${good}%+`], ["📈", avg7, "7-day average", `${last7.length} day${last7.length === 1 ? "" : "s"} recorded`],
      ["🗓️", days.length, "Days tracked", "since you started"], ["💯", perfect, "Perfect days", "100% completed"], ["🎯", ft, "Focus today", `${focusTotal()} min all time`]
    ];
    $("#statGrid").innerHTML = tiles.map(([i, v, l, s]) => `<article class="stat-card"><span class="stat-ico">${i}</span><strong>${escapeHtml(v)}</strong><span class="stat-label">${escapeHtml(l)}</span><small>${escapeHtml(s)}</small></article>`).join("");

    // Heatmap: 16 weeks, Monday at the top.
    const weeks = 16, end = today(), dow = (parseISO(end).getDay() + 6) % 7, startDate = addDays(end, -(dow + (weeks - 1) * 7));
    let cells = "";
    for (let w = 0; w < weeks; w++) for (let r = 0; r < 7; r++) {
      const key = addDays(startDate, w * 7 + r), future = key > end, v = state.history[key], pc = v && Number.isFinite(v.percent) ? v.percent : null;
      const lvl = pc === null ? 0 : pc < 40 ? 1 : pc < 70 ? 2 : pc < 100 ? 3 : 4;
      cells += `<button type="button" class="heat-cell lvl-${lvl}${key === end ? " is-today" : ""}${future ? " future" : ""}" data-heat="${key}" ${future ? "tabindex=\"-1\" aria-hidden=\"true\"" : ""} aria-label="${key}: ${pc === null ? "no record" : pc + "%"}"></button>`;
    }
    $("#heatGrid").innerHTML = cells;

    // Weekday pattern (Mon..Sun).
    const sums = Array.from({ length: 7 }, () => [0, 0]);
    days.forEach(([k, v]) => { const wd = (parseISO(k).getDay() + 6) % 7; sums[wd][0] += v.percent; sums[wd][1]++; });
    const names = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    $("#weekdayBars").innerHTML = sums.map(([s, c], i) => { const a = c ? Math.round(s / c) : null; return `<div class="wd-row"><span>${names[i]}</span><div class="wd-track"><i style="width:${a === null ? 0 : a}%"></i></div><b>${a === null ? "—" : a + "%"}</b></div>`; }).join("");

    // Mood last 7 days.
    const faces = ["", "😞", "🙁", "😐", "🙂", "😄"]; let mw = "";
    for (let i = 6; i >= 0; i--) { const k = addDays(today(), -i), j = state.journal[k], d = parseISO(k); mw += `<div class="mw-day"><span class="mw-face">${j && j.mood ? faces[j.mood] : "·"}</span><small>${d.toLocaleDateString(undefined, { weekday: "short" }).slice(0, 3)}</small></div>`; }
    $("#moodWeek").innerHTML = mw;

    // Badges
    const c = badgeContext(); let got = 0;
    $("#badgeGrid").innerHTML = BADGES.map(b => { const on = !!state.badges[b.id] || b.test(c); if (on) got++; return `<div class="badge ${on ? "on" : ""}" title="${escapeHtml(b.desc)}"><span class="badge-ico">${b.icon}</span><strong>${escapeHtml(b.name)}</strong><small>${escapeHtml(b.desc)}</small></div>`; }).join("");
    $("#badgeSummary").textContent = `${got} of ${BADGES.length} unlocked`;
  }

  /* ---------- Mood check-in ---------- */
  function renderMood() {
    const j = state.journal[today()] || {};
    $$(".mood-btn").forEach(b => b.classList.toggle("selected", Number(b.dataset.mood) === j.mood));
    const note = $("#moodNote"); if (document.activeElement !== note) note.value = j.note || "";
  }
  function saveMood(patch) {
    const t = today(); state.journal[t] = { ...(state.journal[t] || {}), ...patch };
    checkBadges(true); persist(); renderMood(); renderInsights();
    const s = $("#moodSaved"); s.textContent = "Saved ✓"; clearTimeout(s._t); s._t = setTimeout(() => { s.textContent = ""; }, 1600);
  }

  /* ---------- Settings UI ---------- */
  function syncSettingsUI() {
    const s = state.settings;
    const nm = $("#setName"); if (document.activeElement !== nm) nm.value = s.name || "";
    $$("[data-theme-set]").forEach(b => { const on = b.dataset.themeSet === s.theme; b.classList.toggle("active", on); b.setAttribute("aria-pressed", on); });
    $$("[data-accent-set]").forEach(b => { const on = b.dataset.accentSet === s.accent; b.classList.toggle("selected", on); b.setAttribute("aria-pressed", on); });
    $("#setGood").value = String(s.goodDay); $("#setLead").value = String(s.lead);
    $("#setRemind").checked = !!s.remind; $("#setSound").checked = !!s.sound; $("#setConfetti").checked = !!s.confetti;
    updateRemindStatus();
  }
  function updateRemindStatus() {
    const el = $("#remindStatus"); if (!el) return;
    if (!state.settings.remind) { el.textContent = "Reminders are off. Turn them on to get a nudge before timed tasks while the app is open."; return; }
    if (!("Notification" in window)) { el.textContent = "Reminders are on. This browser can't show system notifications, so you'll see in-app alerts while the app is open."; return; }
    const p = Notification.permission;
    el.textContent = p === "granted" ? "Reminders are on, with system notifications. They work while the app is open; iOS does not guarantee alerts when fully closed." : p === "denied" ? "Reminders are on, but notifications are blocked in your browser settings. You'll still see in-app alerts while the app is open." : "Reminders are on. Allow notifications when asked to also get system alerts.";
  }
  async function enableNotifications() {
    if ("Notification" in window && Notification.permission === "default") { try { await Notification.requestPermission(); } catch { /* ignore */ } }
    updateRemindStatus();
  }
  function systemNotify(title, body) {
    try {
      if (!("Notification" in window) || Notification.permission !== "granted") return;
      const opts = { body, icon: "icon-192.png", badge: "icon-192.png", tag: "gagan-" + title };
      if (navigator.serviceWorker && navigator.serviceWorker.controller) navigator.serviceWorker.ready.then(r => r.showNotification(title, opts)).catch(() => { try { new Notification(title, opts); } catch { /* ignore */ } });
      else new Notification(title, opts);
    } catch { /* ignore */ }
  }
  function loadNotified() { try { const o = JSON.parse(localStorage.getItem(NOTIFIED_KEY)); return o && o.date === today() ? o : { date: today(), keys: [] }; } catch { return { date: today(), keys: [] }; } }
  function checkReminders() {
    if (!state.settings.remind) return;
    const store = loadNotified(), nm = nowMinutes(), lead = Number(state.settings.lead) || 0; let changed = false;
    allTodayItems().filter(i => !i.done).forEach(i => {
      const t = toMin(i.time); if (t === null) return;
      const key = i.id + "@" + i.time;
      if (nm >= t - lead && nm <= t + 2 && !store.keys.includes(key)) {
        store.keys.push(key); changed = true;
        const d = t - nm; const msg = d > 0 ? `in ${d} min` : "now";
        toast(`⏰ ${i.title} — ${msg}`); beep(); systemNotify("Gagan Tracker", `${i.title} — ${msg}`);
        buzz(120);
      }
    });
    if (changed) try { localStorage.setItem(NOTIFIED_KEY, JSON.stringify(store)); } catch { /* ignore */ }
  }

  /* ---------- Render all ---------- */
  function render() {
    setDateLabel(); renderTimeline(); renderWater(); renderSummary(); renderUpNext(); renderHabits(); renderRoutines(); renderMood(); renderInsights(); syncSettingsUI(); populateParentSelect(); renderProgress(false);
  }
  function populateParentSelect() {
    const sel = $("#taskParent"), old = sel.value;
    sel.innerHTML = '<option value="">No parent habit</option>' + state.habits.map(h => `<option value="${h.id}">${escapeHtml(h.title)}</option>`).join("");
    if (state.habits.some(h => h.id === old)) sel.value = old;
  }
  function switchView(view) {
    $$(".view").forEach(v => v.classList.toggle("active", v.id === "view-" + view));
    $$("[data-view]").forEach(b => b.classList.toggle("active", b.dataset.view === view));
    $("#settingsBtn")?.classList.toggle("active", view === "settings");
    window.scrollTo({ top: 0, behavior: "smooth" });
    if (view === "today") renderProgress(false);
  }

  /* ---------- Modals ---------- */
  const anyModalOpen = () => $$(".modal-backdrop").some(b => !b.hidden);
  function openModal(id) { $(id).hidden = false; document.body.style.overflow = "hidden"; }
  function closeModal(id) { $(id).hidden = true; if (!anyModalOpen()) document.body.style.overflow = ""; }
  function closeAllModals() { $$(".modal-backdrop").forEach(b => { b.hidden = true; }); document.body.style.overflow = ""; }
  function openTask(item = null) {
    $("#editorForm").reset(); $("#editId").value = item?.id || ""; $("#modalTitle").textContent = item ? "Edit task" : "Add task";
    $("#taskTitle").value = item?.title || ""; $("#taskDate").value = item?.date || today(); $("#taskTime").value = item?.time || ""; $("#taskEndTime").value = item?.endTime || ""; $("#taskEmoji").value = item?.emoji || "✦"; $("#taskEmojiSearch").value = ""; $("#taskColor").value = item?.color || "slate"; renderEmojiPicker("taskEmojiSearch", "emojiResults", "taskEmoji", item?.emoji || "✦");
    $("#taskType").value = item?.type || "task"; $("#taskRepeat").value = item?.repeat || "none"; $("#taskParent").value = item?.parent || ""; $("#taskNote").value = item?.note || "";
    openModal("#modalBackdrop"); setTimeout(() => $("#taskTitle").focus(), 100);
  }
  const ICONS = [
    ["☀️", "sunrise morning wake up"], ["💧", "water drink hydration"], ["🛏️", "bed sleep rest"], ["🧘", "meditation breathe calm"], ["🏃", "run running cardio"], ["🚶", "walk walking steps"], ["🧘‍♀️", "stretch stretching mobility"], ["📋", "planning plan checklist"], ["🍳", "breakfast food cooking"], ["🍎", "food fruit healthy meal"], ["📚", "read reading study book"], ["🎯", "focus deep work target"], ["💻", "computer work laptop"], ["✍️", "write writing journal"], ["🧠", "brain learning think"], ["🎧", "music audio podcast"], ["🧹", "clean cleaning home"], ["🪥", "brush teeth hygiene"], ["🚿", "shower bath"], ["💊", "medicine vitamins"], ["🧴", "skincare skin care"], ["💪", "strength workout gym"], ["🏋️", "weights lifting gym"], ["🥗", "salad lunch nutrition"], ["☕", "coffee tea drink"], ["🌿", "nature plant wellness"], ["🛒", "shopping groceries"], ["💰", "money finance save"], ["📞", "call phone"], ["✉️", "email message"], ["🧾", "admin bills"], ["🧺", "laundry clothes"], ["🧑‍💻", "coding create"], ["🎨", "art design creative"], ["🌙", "night evening sleep"], ["⭐", "star important priority"], ["❤️", "heart love health"], ["🛡️", "safety protect"], ["🧑‍🍳", "cook kitchen"], ["🚗", "drive travel"], ["🌱", "growth habit"], ["🕯️", "quiet mindfulness"], ["📝", "notes list"], ["📈", "progress goals"], ["🔔", "reminder alert"], ["🎉", "celebrate reward"], ["🧴", "self care"], ["🧳", "trip travel"], ["🧩", "project task"], ["🧼", "wash clean"]
  ];
  function renderEmojiPicker(searchId, resultsId, hiddenId) {
    const search = $("#" + searchId), host = $("#" + resultsId); if (!search || !host) return;
    const q = search.value.trim().toLowerCase();
    const list = ICONS.filter(([emoji, words]) => !q || words.includes(q) || emoji.includes(q) || q.split(/\s+/).some(w => words.includes(w))).slice(0, 20);
    host.innerHTML = list.map(([emoji, words]) => `<button type="button" class="emoji-choice ${$("#" + hiddenId).value === emoji ? "selected" : ""}" data-emoji="${emoji}" data-hidden="${hiddenId}" title="${escapeHtml(words)}">${emoji}</button>`).join("") || '<span class="field-help">No matches. Try “focus”, “water”, “sleep” or “walk”.</span>';
  }
  ["taskEmojiSearch", "habitEmojiSearch"].forEach(id => $("#" + id)?.addEventListener("input", () => renderEmojiPicker(id, id === "taskEmojiSearch" ? "emojiResults" : "habitEmojiResults", id === "taskEmojiSearch" ? "taskEmoji" : "habitEmoji")));
  function parseSteps(raw) {
    return raw.split("\n").map(line => line.trim()).filter(Boolean).map(line => {
      const parts = line.split("|"); let time = "", title = line;
      if (parts.length > 1) { time = parts[0].trim(); title = parts.slice(1).join("|").trim(); if (!/^\d{1,2}:\d{2}$/.test(time)) time = ""; }
      return { id: uid(), title, time, amount: amountFrom(title), done: false };
    });
  }
  function amountFrom(title) { const m = String(title).match(/(\d+(?:\.\d+)?)\s*(ml|l)\b/i); return m ? Math.round(Number(m[1]) * (m[2].toLowerCase() === "l" ? 1000 : 1)) : 0; }
  function openHabit(habit = null) {
    $("#habitForm").reset(); $("#habitEditId").value = habit?.id || ""; $("#habitModalTitle").textContent = habit ? "Edit habit" : "New habit";
    $("#habitTitle").value = habit?.title || ""; $("#habitGoal").value = habit?.goal || ""; $("#habitUnit").value = habit?.unit || ""; $("#habitColor").value = habit?.color || "blue"; $("#habitEmoji").value = habit?.emoji || "💧"; $("#habitEmojiSearch").value = ""; renderEmojiPicker("habitEmojiSearch", "habitEmojiResults", "habitEmoji");
    $("#habitSteps").value = (habit?.steps || []).map(s => `${s.time || ""}${s.time ? " | " : ""}${s.title}`).join("\n");
    openModal("#habitBackdrop"); setTimeout(() => $("#habitTitle").focus(), 100);
  }
  function openRoutine(routine = null) {
    $("#routineForm").reset(); $("#routineEditId").value = routine?.id || ""; $("#routineModalTitle").textContent = routine ? "Edit routine" : "New routine";
    $("#routineTitle").value = routine?.title || ""; $("#routineSteps").value = (routine?.steps || []).map(s => `${s.time || ""}${s.time ? " | " : ""}${s.title}`).join("\n");
    openModal("#routineBackdrop"); setTimeout(() => $("#routineTitle").focus(), 100);
  }
  function findStep(id) { for (const h of state.habits) { const s = h.steps.find(s => s.id === id); if (s) return { habit: h, step: s }; } return null; }
  function toggleItem(kind, id, checked) {
    if (kind === "task") { const t = state.tasks.find(t => t.id === id); if (t) t.done = checked; }
    else { const found = findStep(id); if (found) found.step.done = checked; }
    buzz(8);
    save();
  }
  function deleteItem(kind, id) {
    withUndo("Item removed", () => {
      if (kind === "task") state.tasks = state.tasks.filter(t => t.id !== id);
      else state.habits.forEach(h => { h.steps = h.steps.filter(s => s.id !== id); });
    });
  }
  function editStepPrompt(id) {
    const f = findStep(id); if (!f) return;
    const title = prompt("Step name", f.step.title); if (title === null) return;
    const time = prompt("Time (24-hour HH:MM, or leave blank)", f.step.time || "");
    f.step.title = title.trim() || f.step.title; f.step.time = (time || "").trim(); f.step.amount = amountFrom(f.step.title) || f.step.amount || 0; save();
  }

  /* ---------- Quick add ---------- */
  function parseQuick(raw) {
    let text = raw.trim(), time = "", date = today(), repeat = "none", m;
    if ((m = text.match(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/i)) && +m[1] >= 1 && +m[1] <= 12 && (!m[2] || +m[2] < 60)) {
      let h = +m[1] % 12; if (/pm/i.test(m[3])) h += 12; time = `${pad(h)}:${m[2] || "00"}`; text = text.replace(m[0], " ");
    } else if ((m = text.match(/\b([01]?\d|2[0-3]):([0-5]\d)\b/))) { time = `${pad(+m[1])}:${m[2]}`; text = text.replace(m[0], " "); }
    if (/\btomorrow\b/i.test(text)) { date = addDays(today(), 1); text = text.replace(/\btomorrow\b/i, " "); }
    if (/\b(every ?day|daily)\b/i.test(text)) { repeat = "daily"; text = text.replace(/\b(every ?day|daily)\b/i, " "); }
    text = text.replace(/\s+/g, " ").trim().replace(/\b(at|@|by)\s*$/i, "").replace(/^[-–—,:\s]+|[-–—,:\s]+$/g, "").trim();
    const words = text.toLowerCase().split(/[^a-z]+/).filter(w => w.length >= 3);
    const hit = ICONS.find(([, kw]) => { const toks = kw.split(" "); return words.some(w => toks.includes(w)); });
    return { title: text, time, date, repeat, emoji: hit ? hit[0] : "✦" };
  }

  /* ---------- Search ---------- */
  function openSearch() { $("#searchInput").value = ""; renderSearch(""); openModal("#searchBackdrop"); setTimeout(() => $("#searchInput").focus(), 80); }
  function renderSearch(q) {
    const host = $("#searchResults"), s = q.trim().toLowerCase();
    if (!s) { host.innerHTML = '<div class="search-empty">Type to search your tasks, habits and routines.</div>'; return; }
    const tasks = state.tasks.filter(t => t.date >= today() && (t.title.toLowerCase().includes(s) || (t.note || "").toLowerCase().includes(s))).sort((a, b) => (a.date + (a.time || "")).localeCompare(b.date + (b.time || ""))).slice(0, 8);
    const habits = state.habits.filter(h => h.title.toLowerCase().includes(s) || h.steps.some(x => x.title.toLowerCase().includes(s))).slice(0, 6);
    const routines = state.routines.filter(r => r.title.toLowerCase().includes(s) || r.steps.some(x => x.title.toLowerCase().includes(s))).slice(0, 6);
    const row = (kind, id, ico, title, meta) => `<button type="button" class="search-row" data-search-kind="${kind}" data-id="${id}"><span class="sr-ico">${escapeHtml(ico)}</span><span class="sr-main"><b>${escapeHtml(title)}</b><small>${escapeHtml(meta)}</small></span><span class="sr-go">›</span></button>`;
    const parts = [];
    if (tasks.length) parts.push('<div class="sr-group">Tasks</div>' + tasks.map(t => row("task", t.id, t.emoji || "◷", t.title, `${t.date === today() ? "Today" : parseISO(t.date).toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" })}${t.time ? " · " + timeLabel(t.time) : ""}`)).join(""));
    if (habits.length) parts.push('<div class="sr-group">Habits</div>' + habits.map(h => row("habit", h.id, h.emoji || "✦", h.title, `${h.steps.length} steps`)).join(""));
    if (routines.length) parts.push('<div class="sr-group">Routines</div>' + routines.map(r => row("routine", r.id, "▦", r.title, `${r.steps.length} steps`)).join(""));
    host.innerHTML = parts.join("") || '<div class="search-empty">No matches found.</div>';
  }

  /* ---------- Log past day ---------- */
  function openLog() {
    const maxD = addDays(today(), -1); const inp = $("#logDate"); inp.max = maxD;
    let d = maxD; for (let i = 0; i < 60; i++) { const k = addDays(today(), -1 - i); if (!state.history[k]) { d = k; break; } }
    inp.value = d; syncLog(); openModal("#logBackdrop");
  }
  function syncLog() {
    const k = $("#logDate").value, rec = state.history[k];
    if (rec && Number.isFinite(rec.percent)) { $("#logPercent").value = String(Math.round(rec.percent / 5) * 5); }
    $("#logRemove").hidden = !rec; $("#logPercentLabel").textContent = $("#logPercent").value + "%";
  }

  /* ---------- Focus timer ---------- */
  const CIRC = 2 * Math.PI * 88;
  let focus = (() => { try { const f = JSON.parse(localStorage.getItem(FOCUS_KEY)); if (f && f.total > 0) return { total: f.total, remaining: f.remaining, endAt: f.endAt || null, running: !!f.running, label: f.label || "" }; } catch { /* ignore */ } return { total: 25 * 60000, remaining: 25 * 60000, endAt: null, running: false, label: "" }; })();
  const saveFocus = () => { try { localStorage.setItem(FOCUS_KEY, JSON.stringify(focus)); } catch { /* ignore */ } };
  const focusLeft = () => focus.running ? Math.max(0, focus.endAt - Date.now()) : focus.remaining;
  const fmt = ms => { const s = Math.ceil(ms / 1000); return `${pad(Math.floor(s / 60))}:${pad(s % 60)}`; };
  function updateFocusUI() {
    const left = focusLeft(), bar = $("#focusBar");
    $("#focusTime").textContent = fmt(left);
    bar.style.strokeDasharray = CIRC; bar.style.strokeDashoffset = CIRC * (1 - (focus.total ? left / focus.total : 0));
    $("#focusState").textContent = focus.running ? (focus.label || "Focusing…") : left <= 0 ? "Done" : left < focus.total ? "Paused" : "Ready";
    $("#focusToggle").textContent = focus.running ? "Pause" : left < focus.total && left > 0 ? "Resume" : "Start";
    $("#focusToday").textContent = state.focusLog[today()] || 0;
    $$("#focusPresets [data-focus-min]").forEach(b => b.classList.toggle("active", Number(b.dataset.focusMin) * 60000 === focus.total));
    $("#focusBtn").classList.toggle("running", focus.running);
    document.title = focus.running ? `⏱ ${fmt(left)} · ${BASE_TITLE}` : BASE_TITLE;
  }
  function startFocus() { if (focus.running) return; if (focus.remaining <= 0) focus.remaining = focus.total; focus.endAt = Date.now() + focus.remaining; focus.running = true; saveFocus(); updateFocusUI(); }
  function pauseFocus() { focus.remaining = focusLeft(); focus.running = false; focus.endAt = null; saveFocus(); updateFocusUI(); }
  function resetFocus() { focus.running = false; focus.endAt = null; focus.remaining = focus.total; saveFocus(); updateFocusUI(); }
  function setFocusMinutes(m) { m = clamp(Math.round(Number(m) || 25), 1, 240); focus.total = m * 60000; focus.remaining = focus.total; focus.running = false; focus.endAt = null; saveFocus(); updateFocusUI(); }
  function completeFocus(late) {
    const mins = Math.round(focus.total / 60000);
    focus.running = false; focus.endAt = null; focus.remaining = 0; saveFocus();
    state.focusLog[today()] = (Number(state.focusLog[today()]) || 0) + mins;
    checkBadges(true); persist(); updateFocusUI(); renderInsights();
    toast(late ? `🎯 ${mins}-minute focus session finished while you were away` : `🎯 ${mins} minutes of focus complete — nice work!`);
    beep(); systemNotify("Focus session complete", `${mins} minutes done.`);
    buzz([120, 60, 120]);
  }
  function openFocus(label = "") {
    const sel = $("#focusTask");
    sel.innerHTML = '<option value="">Free focus</option>' + getTodayTasks().filter(t => !t.done).map(t => `<option value="${escapeHtml(t.title)}">${escapeHtml(t.title)}</option>`).join("");
    if (label) { if (![...sel.options].some(o => o.value === label)) sel.add(new Option(label, label)); sel.value = label; if (!focus.running) focus.label = label; }
    else sel.value = [...sel.options].some(o => o.value === focus.label) ? focus.label : "";
    updateFocusUI(); openModal("#focusBackdrop");
  }

  /* ---------- Click handling ---------- */
  document.addEventListener("click", e => {
    const t = e.target;
    const pick = t.closest("[data-emoji]");
    if (pick) { $("#" + pick.dataset.hidden).value = pick.dataset.emoji; const isTask = pick.dataset.hidden === "taskEmoji"; renderEmojiPicker(isTask ? "taskEmojiSearch" : "habitEmojiSearch", isTask ? "emojiResults" : "habitEmojiResults", pick.dataset.hidden); return; }
    const closer = t.closest("[data-close]"); if (closer) { const bd = closer.closest(".modal-backdrop"); if (bd) closeModal("#" + bd.id); return; }
    const view = t.closest("[data-view]"); if (view) { switchView(view.dataset.view); return; }
    if (t.closest("#addTaskBtn") || t.closest("#addTop") || t.closest("#mobileAdd")) { openTask(); return; }
    if (t.closest("#addHabitBtn")) { openHabit(); return; }
    if (t.closest("#addRoutineBtn")) { openRoutine(); return; }
    if (t.closest("#settingsBtn")) { switchView("settings"); return; }
    if (t.closest("#mobileMenu")) { switchView("today"); return; }
    if (t.closest("#focusBtn")) { openFocus(); return; }
    if (t.closest("#searchBtn")) { openSearch(); return; }
    if (t.closest("#editWater")) { const h = state.habits.find(x => x.title.toLowerCase().includes("water")) || state.habits[0]; if (h) openHabit(h); else openHabit(); return; }
    if (t.closest("#addWater")) { const h = state.habits.find(x => x.title.toLowerCase().includes("water")); if (h) { h.steps.push({ id: uid(), title: "250 ml water", time: "", amount: 250, done: true }); save(); toast("250 ml logged"); } else toast("Create a water habit first"); return; }
    const ud = t.closest("[data-upnext-done]"); if (ud) { const [k, id] = ud.dataset.upnextDone.split("|"); toggleItem(k, id, true); return; }
    const ff = t.closest("[data-focus-from]"); if (ff) { const [k, id] = ff.dataset.focusFrom.split("|"); const it = allTodayItems().find(i => i.kind === k && i.id === id); openFocus(it ? it.title : ""); return; }
    const check = t.closest("[data-check-kind]"); if (check) { toggleItem(check.dataset.checkKind, check.dataset.id, check.checked); return; }
    const edit = t.closest("[data-edit-kind]"); if (edit) { if (edit.dataset.editKind === "task") { const tk = state.tasks.find(x => x.id === edit.dataset.id); if (tk) openTask(tk); } else editStepPrompt(edit.dataset.id); return; }
    const del = t.closest("[data-delete-kind]"); if (del) { if (confirm("Delete this item?")) deleteItem(del.dataset.deleteKind, del.dataset.id); return; }
    const eh = t.closest("[data-edit-habit]"); if (eh) { const h = state.habits.find(x => x.id === eh.dataset.editHabit); if (h) openHabit(h); return; }
    const dh = t.closest("[data-delete-habit]"); if (dh) { if (confirm("Delete this habit and its steps?")) withUndo("Habit deleted", () => { state.habits = state.habits.filter(x => x.id !== dh.dataset.deleteHabit); }); return; }
    const as = t.closest("[data-add-step]"); if (as) { const h = state.habits.find(x => x.id === as.dataset.addStep); if (h) { const title = prompt("Step name"); if (!title) return; const time = prompt("Time (24-hour HH:MM, optional)", "08:00") || ""; h.steps.push({ id: uid(), title: title.trim(), time: time.trim(), amount: amountFrom(title), done: false }); save(); } return; }
    const es = t.closest("[data-edit-step]"); if (es) { editStepPrompt(es.dataset.editStep); return; }
    const use = t.closest("[data-use-routine]"); if (use) { const r = state.routines.find(x => x.id === use.dataset.useRoutine); if (r) { r.steps.forEach(s => state.tasks.push({ id: uid(), title: s.title, date: today(), time: s.time || "", type: "task", repeat: "none", done: false, note: "" })); save(); toast("Routine added to today"); switchView("today"); } return; }
    const er = t.closest("[data-edit-routine]"); if (er) { const r = state.routines.find(x => x.id === er.dataset.editRoutine); if (r) openRoutine(r); return; }
    const dr = t.closest("[data-delete-routine]"); if (dr) { if (confirm("Delete this routine template?")) withUndo("Routine deleted", () => { state.routines = state.routines.filter(x => x.id !== dr.dataset.deleteRoutine); }); return; }
    const sr = t.closest("[data-search-kind]"); if (sr) {
      const kind = sr.dataset.searchKind, id = sr.dataset.id; closeModal("#searchBackdrop");
      if (kind === "task") { const tk = state.tasks.find(x => x.id === id); if (tk) openTask(tk); }
      else if (kind === "habit") switchView("habits"); else switchView("routines");
      return;
    }
    const heat = t.closest("[data-heat]"); if (heat && !heat.classList.contains("future")) {
      const k = heat.dataset.heat, v = state.history[k], d = parseISO(k).toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" });
      $("#heatInfo").textContent = v && Number.isFinite(v.percent) ? `${d} — ${v.percent}%${v.total ? ` (${v.done} of ${v.total} done)` : ""}` : `${d} — no record`; return;
    }
    const mood = t.closest("[data-mood]"); if (mood) { const n = Number(mood.dataset.mood), cur = (state.journal[today()] || {}).mood; saveMood({ mood: cur === n ? 0 : n }); return; }
    const fm = t.closest("[data-focus-min]"); if (fm) { setFocusMinutes(fm.dataset.focusMin); $("#focusCustom").value = ""; return; }
    if (t.closest("#focusToggle")) { focus.label = $("#focusTask").value || ""; if (focus.running) pauseFocus(); else startFocus(); return; }
    if (t.closest("#focusReset")) { resetFocus(); return; }
    const th = t.closest("[data-theme-set]"); if (th) { state.settings.theme = th.dataset.themeSet; persist(); applyLook(); syncSettingsUI(); return; }
    const ac = t.closest("[data-accent-set]"); if (ac) { state.settings.accent = ac.dataset.accentSet; persist(); applyLook(); syncSettingsUI(); return; }
    if (t.closest("#logPastBtn")) { openLog(); return; }
    if (t.closest("#sampleBtn")) { sampleMode = !sampleMode; renderProgress(true); return; }
    const period = t.closest("[data-period]"); if (period) { progressPeriod = period.dataset.period; renderProgress(true); return; }
    if (t.closest("#logRemove")) { const k = $("#logDate").value; if (state.history[k]) { delete state.history[k]; persist(); closeModal("#logBackdrop"); render(); toast("Day removed from history"); } return; }
    if (t.closest("#exportBtn")) { download(JSON.stringify(state, null, 2), "application/json", `gagan-personal-tracker-backup-${today()}.json`); state.settings.lastBackup = today(); persist(); toast("Backup exported"); return; }
    if (t.closest("#csvBtn")) { exportCSV(); return; }
    if (t.closest("#clearHistoryBtn")) { if (confirm("Clear all saved progress history? Tasks and habits are kept.")) withUndo("Progress history cleared", () => { state.history = {}; }); return; }
    if (t.closest("#resetBtn")) { if (confirm("Delete all Gagan Personal Tracker data on this device? This cannot be undone.")) { const s = state.settings; state = stateDefault(); state.settings = s; lastPercent = null; persist(); render(); toast("Tracker reset"); } return; }
    if (t.closest("#installBtn")) { if (deferredPrompt) { deferredPrompt.prompt(); deferredPrompt.userChoice.finally(() => { deferredPrompt = null; $("#installBtn").hidden = true; }); } return; }
  });
  function download(content, type, name) {
    const blob = new Blob([content], { type }); const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }
  function exportCSV() {
    const q = v => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const dates = new Set([...Object.keys(state.history), ...Object.keys(state.journal), ...Object.keys(state.focusLog)]);
    const rows = ["Date,Done,Total,Percent,Mood,Note,Focus minutes"];
    [...dates].sort().forEach(k => { const h = state.history[k] || {}, j = state.journal[k] || {}; rows.push([k, h.done ?? "", h.total ?? "", h.percent ?? "", j.mood || "", q(j.note || ""), state.focusLog[k] ?? ""].join(",")); });
    download(rows.join("\n"), "text/csv", `gagan-progress-${today()}.csv`); toast("Progress exported");
  }

  /* ---------- Forms & inputs ---------- */
  $("#editorForm").addEventListener("submit", e => {
    e.preventDefault(); const id = $("#editId").value;
    const obj = { id: id || uid(), title: $("#taskTitle").value.trim(), date: $("#taskDate").value || today(), time: $("#taskTime").value, endTime: $("#taskEndTime").value, type: $("#taskType").value, repeat: $("#taskRepeat").value, parent: $("#taskParent").value, done: false, note: $("#taskNote").value.trim(), emoji: $("#taskEmoji").value || "✦", color: $("#taskColor").value || "slate" };
    if (!obj.title) return;
    if (id) { const old = state.tasks.find(t => t.id === id); if (old) Object.assign(old, obj, { done: old.done }); else state.tasks.push(obj); }
    else state.tasks.push(obj);
    save(); closeModal("#modalBackdrop"); toast(id ? "Task updated" : "Task added");
  });
  $("#habitForm").addEventListener("submit", e => {
    e.preventDefault(); const id = $("#habitEditId").value, old = state.habits.find(h => h.id === id);
    const newSteps = parseSteps($("#habitSteps").value);
    if (old) {
      const oldByTitle = new Map(old.steps.map(s => [`${s.time}|${s.title}`, s]));
      newSteps.forEach(s => { const prev = oldByTitle.get(`${s.time}|${s.title}`); if (prev) { s.id = prev.id; s.done = prev.done; s.amount = prev.amount || s.amount; } });
    }
    const habit = { id: id || uid(), title: $("#habitTitle").value.trim(), goal: Number($("#habitGoal").value) || 0, unit: $("#habitUnit").value.trim(), color: $("#habitColor").value, emoji: $("#habitEmoji").value || "✦", steps: newSteps };
    if (!habit.title) return;
    if (old) state.habits = state.habits.map(h => h.id === id ? habit : h); else state.habits.push(habit);
    save(); closeModal("#habitBackdrop"); toast(id ? "Habit updated" : "Habit created");
  });
  $("#routineForm").addEventListener("submit", e => {
    e.preventDefault(); const id = $("#routineEditId").value;
    const routine = { id: id || uid(), title: $("#routineTitle").value.trim(), steps: parseSteps($("#routineSteps").value).map(s => ({ title: s.title, time: s.time })) };
    if (!routine.title) return;
    if (id) state.routines = state.routines.map(r => r.id === id ? routine : r); else state.routines.push(routine);
    save(); closeModal("#routineBackdrop"); toast(id ? "Routine updated" : "Routine saved");
  });
  $("#quickAdd").addEventListener("submit", e => {
    e.preventDefault(); const inp = $("#quickInput"), p = parseQuick(inp.value);
    if (!p.title) { toast("Type a task name first"); return; }
    state.tasks.push({ id: uid(), title: p.title, date: p.date, time: p.time, endTime: "", type: "task", repeat: p.repeat, done: false, note: "", emoji: p.emoji, color: "slate" });
    inp.value = ""; save();
    toast(p.date === today() ? `Added${p.time ? " for " + timeLabel(p.time) : ""}` : "Added for tomorrow — it will appear on that day");
  });
  $("#logForm").addEventListener("submit", e => {
    e.preventDefault(); const k = $("#logDate").value, pc = Number($("#logPercent").value);
    if (!k || k >= today()) { toast("Pick a date before today"); return; }
    state.history[k] = { done: 0, total: 0, percent: clamp(pc, 0, 100), manual: true };
    checkBadges(true); persist(); closeModal("#logBackdrop"); render(); toast("Day saved — your chart is updated");
  });
  $("#logDate").addEventListener("change", syncLog);
  $("#logPercent").addEventListener("input", () => { $("#logPercentLabel").textContent = $("#logPercent").value + "%"; });
  $("#searchInput").addEventListener("input", e => renderSearch(e.target.value));
  $("#focusCustom").addEventListener("change", e => { if (e.target.value) setFocusMinutes(e.target.value); });
  $("#focusTask").addEventListener("change", e => { focus.label = e.target.value; saveFocus(); updateFocusUI(); });
  $("#moodNote").addEventListener("input", e => { const t = today(); state.journal[t] = { ...(state.journal[t] || {}), note: e.target.value.slice(0, 140) }; clearTimeout(e.target._t); e.target._t = setTimeout(persist, 400); });
  $("#moodNote").addEventListener("blur", () => persist());
  $("#setName").addEventListener("input", e => { state.settings.name = e.target.value.slice(0, 24); persist(); setDateLabel(); });
  $("#setGood").addEventListener("change", e => { state.settings.goodDay = Number(e.target.value); persist(); renderInsights(); });
  $("#setLead").addEventListener("change", e => { state.settings.lead = Number(e.target.value); persist(); });
  $("#setSound").addEventListener("change", e => { state.settings.sound = e.target.checked; persist(); if (e.target.checked) beep(); });
  $("#setConfetti").addEventListener("change", e => { state.settings.confetti = e.target.checked; persist(); });
  $("#setRemind").addEventListener("change", e => { state.settings.remind = e.target.checked; persist(); if (e.target.checked) enableNotifications(); else updateRemindStatus(); });
  $("#importFile").addEventListener("change", async e => {
    const f = e.target.files?.[0]; if (!f) return;
    try {
      const data = JSON.parse(await f.text());
      if (!data || !Array.isArray(data.tasks) || !Array.isArray(data.habits) || !Array.isArray(data.routines)) throw new Error("Invalid backup");
      state = normalize(data); lastPercent = null; applyLook(); save(); toast("Backup restored");
    } catch { toast("That backup file could not be imported."); }
    e.target.value = "";
  });
  ["#modalBackdrop", "#habitBackdrop", "#routineBackdrop", "#focusBackdrop", "#searchBackdrop", "#logBackdrop"].forEach(sel => $(sel).addEventListener("click", e => { if (e.target === e.currentTarget) closeModal(sel); }));
  document.addEventListener("keydown", e => {
    if (e.key === "Escape") { closeAllModals(); return; }
    const tag = (e.target.tagName || "").toLowerCase();
    if (e.metaKey || e.ctrlKey || e.altKey || ["input", "textarea", "select"].includes(tag) || e.target.isContentEditable || anyModalOpen()) return;
    const map = { "1": "today", "2": "habits", "3": "routines", "4": "insights", "5": "settings" };
    if (map[e.key]) { switchView(map[e.key]); return; }
    if (e.key === "n" || e.key === "N") { e.preventDefault(); openTask(); }
    else if (e.key === "/" || e.key === "s") { e.preventDefault(); openSearch(); }
    else if (e.key === "f" || e.key === "F") { e.preventDefault(); openFocus(); }
  });

  /* ---------- Install (PWA) ---------- */
  let deferredPrompt = null;
  window.addEventListener("beforeinstallprompt", e => { e.preventDefault(); deferredPrompt = e; const b = $("#installBtn"); if (b) b.hidden = false; });
  window.addEventListener("appinstalled", () => { deferredPrompt = null; $("#installBtn").hidden = true; updateInstallCard(); });
  function isStandalone() { return (window.matchMedia && matchMedia("(display-mode: standalone)").matches) || navigator.standalone === true; }
  function updateInstallCard() {
    if (isStandalone()) { $("#installText").textContent = "You're running the installed app — nice. It works offline and opens full-screen."; $("#installSteps").hidden = true; }
  }

  /* ---------- Background ticks ---------- */
  function tick() {
    if (state.lastOpen !== today()) { ensureRecurring(); lastPercent = null; render(); }
    renderUpNext(); checkReminders();
  }
  setInterval(tick, 20000);
  setInterval(() => { if (focus.running) { if (focusLeft() <= 0) completeFocus(false); else updateFocusUI(); } }, 500);
  document.addEventListener("visibilitychange", () => { if (!document.hidden) { tick(); if (focus.running && focusLeft() <= 0) completeFocus(false); else updateFocusUI(); } });

  /* ---------- Start ---------- */
  ensureRecurring();
  if (state.history[today()]) recordTodayProgress(); // refresh today's entry only if it already exists
  checkBadges(false);
  applyLook();
  render();
  updateInstallCard();
  if (focus.running && focusLeft() <= 0) completeFocus(true); else updateFocusUI();
  try { navigator.storage && navigator.storage.persist && navigator.storage.persist(); } catch { /* ignore */ }
  persist();
  (() => { // Friendly backup nudge (at most once per day)
    const days = recordedDays().length, last = state.settings.lastBackup;
    const stale = !last ? days >= 7 : (parseISO(today()) - parseISO(last)) / 864e5 >= 14;
    let shown = ""; try { shown = localStorage.getItem("gagan.backupNudge") || ""; } catch { /* ignore */ }
    if (stale && shown !== today()) { try { localStorage.setItem("gagan.backupNudge", today()); } catch { /* ignore */ } setTimeout(() => toast("Tip: export a backup so your progress is safe", "Export", () => $("#exportBtn").click()), 2500); }
  })();
  const qs = new URLSearchParams(location.search);
  if (qs.get("view") && ["today", "habits", "routines", "insights", "settings"].includes(qs.get("view"))) switchView(qs.get("view"));
  if (qs.get("action") === "add") openTask(); else if (qs.get("action") === "focus") openFocus();

  if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
    const hadController = !!navigator.serviceWorker.controller;
    navigator.serviceWorker.register("./sw.js").catch(() => {});
    navigator.serviceWorker.addEventListener("controllerchange", () => { if (hadController) toast("A new version is ready", "Reload", () => location.reload()); });
  }
})();
