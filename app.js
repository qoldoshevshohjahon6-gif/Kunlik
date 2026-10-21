'use strict';
/* Kunlik: shaxsiy samaradorlik ilovasi.
   Arxitektura: Store (saqlash, versiyali) -> hisob-kitob funksiyalari -> ko'rinishlar -> hodisalar.
   Har bir yozuvda id va updatedAt bor: kelajakda bulutli sinxronlash qo'shish oson.
   Android (ilovalarni to'sish, ekran vaqti) keyingi native bosqichda; veb-ilovada yo'q. */
(function () {
  /* ---------- yordamchilar ---------- */
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const MONTHS = ['yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun', 'iyul', 'avgust', 'sentabr', 'oktabr', 'noyabr', 'dekabr'];
  const DAYS = ['Yakshanba', 'Dushanba', 'Seshanba', 'Chorshanba', 'Payshanba', 'Juma', 'Shanba'];
  const DSH = ['Yak', 'Du', 'Se', 'Chor', 'Pay', 'Ju', 'Sha'];
  const PL = { high: 'Yuqori', mid: "O'rta", low: 'Past' };
  const RANK = { high: 0, mid: 1, low: 2 };
  const LV = { y: 'Yillik', m: 'Oylik', w: 'Haftalik', d: 'Kunlik' };
  const pad = n => String(n).padStart(2, '0');
  const ymd = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const parse = s => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || ''); if (!m) return null; const d = new Date(+m[1], +m[2] - 1, +m[3]); return ymd(d) === s ? d : null; };
  const addD = (s, n) => { const d = parse(s); d.setDate(d.getDate() + n); return ymd(d); };
  const TD = () => ymd(new Date());
  const dowOf = s => parse(s).getDay();
  const diffD = (a, b) => Math.round((parse(b) - parse(a)) / 864e5);
  const longDate = s => { const d = parse(s); return `${DAYS[d.getDay()]}, ${d.getDate()}-${MONTHS[d.getMonth()]}`; };
  const shortDate = s => `${+s.slice(8)}-${MONTHS[+s.slice(5, 7) - 1]}`;
  const mondayOf = s => { const d = parse(s); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return ymd(d); };
  const isoWeek = s => { const m = parse(mondayOf(s)), t = new Date(m); t.setDate(t.getDate() + 3); const jm = parse(mondayOf(ymd(new Date(t.getFullYear(), 0, 4)))); return `${t.getFullYear()}-H${pad(1 + Math.round((m - jm) / 6048e5))}`; };
  const periodKey = (lv, s) => lv === 'y' ? s.slice(0, 4) : lv === 'm' ? s.slice(0, 7) : lv === 'w' ? isoWeek(s) : s;
  const periodLabel = (lv, p) => lv === 'y' ? `${p}-yil` : lv === 'm' ? `${MONTHS[+p.slice(5) - 1]} ${p.slice(0, 4)}` : lv === 'w' ? `${p.slice(0, 4)}, ${+p.slice(6)}-hafta` : shortDate(p);
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

  /* ---------- ikonlar ---------- */
  const IC = {
    home: '<path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/><path d="M10 20v-6h4v6"/>',
    tasks: '<path d="M10 6h10M10 12h10M10 18h10"/><path d="M3.5 6l1.5 1.5L7.5 5M3.5 12l1.5 1.5L7.5 11M3.5 18l1.5 1.5L7.5 17"/>',
    target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.2"/>',
    chart: '<path d="M5 20V11M12 20V4M19 20v-6"/>',
    sliders: '<path d="M4 7h9M17 7h3M4 17h3M11 17h9"/><circle cx="15" cy="7" r="2"/><circle cx="9" cy="17" r="2"/>',
    plus: '<path d="M12 5v14M5 12h14"/>', x: '<path d="M6 6l12 12M18 6L6 18"/>',
    edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/>',
    trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
    timer: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l3 2M9 2h6"/>',
    flame: '<path d="M12 3c1 4 5 5 5 10a5 5 0 0 1-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-3-1-5 1-9z"/>',
    repeat: '<path d="M4 11V9a3 3 0 0 1 3-3h11l-3-3M20 13v2a3 3 0 0 1-3 3H6l3 3"/>',
    check: '<path d="M5 12l5 5 9-10"/>',
    play: '<path d="M7 5l12 7-12 7z"/>', pause: '<path d="M8 5v14M16 5v14"/>',
    reset: '<path d="M4 12a8 8 0 1 0 3-6.2M4 4v4h4"/>',
    down: '<path d="M12 4v11M7 11l5 5 5-5M5 20h14"/>', up: '<path d="M12 16V5M7 9l5-5 5 5M5 20h14"/>',
    repeatH: '<path d="M4 12h16M4 6h16M4 18h10"/>', inbox: '<path d="M3 13l3-8h12l3 8v6H3z"/><path d="M3 13h5l1 3h6l1-3h5"/>',
    alert: '<path d="M12 4l9 16H3z"/><path d="M12 10v4M12 17.5v.5"/>', flag: '<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>',
    archive: '<path d="M3 7h18v4H3zM5 11v9h14v-9M10 15h4"/>', link: '<path d="M10 14a4 4 0 0 0 6 0l3-3a4 4 0 0 0-6-6l-1 1M14 10a4 4 0 0 0-6 0l-3 3a4 4 0 0 0 6 6l1-1"/>',
    layers: '<path d="M12 3l9 5-9 5-9-5z"/><path d="M3 13l9 5 9-5"/>', chevL: '<path d="M15 5l-7 7 7 7"/>', chevR: '<path d="M9 5l7 7-7 7"/>',
    expand: '<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>', phone: '<rect x="7" y="2" width="10" height="20" rx="2"/><path d="M11 18h2"/>'
  };
  const ic = (n, s = 22) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${IC[n] || ''}</svg>`;

  /* ---------- saqlash (Store) ---------- */
  // Kalit nomi o'zgarmaydi: eski (1-versiya) ma'lumotlar yo'qolmasligi uchun. Migratsiya buzmaydi, asl nusxa .v1backup kalitiga saqlanadi.
  const KEY = 'kunlik.v1', DBV = 2;
  let mem = false, bootMsg = '', migrated = false;
  const blank = () => ({ v: DBV, settings: { name: '', theme: 'dark', focusMin: 25, installDismissed: false }, tasks: [], goals: [], milestones: [], goalEntries: [], habits: [], habitLogs: {}, focus: [] });
  function periodStart(lv, p) {
    if (lv === 'd') return parse(p) ? p : null;
    if (lv === 'y') return /^\d{4}$/.test(p) ? p + '-01-01' : null;
    if (lv === 'm') return /^\d{4}-\d{2}$/.test(p) ? p + '-01' : null;
    const m = /^(\d{4})-H(\d{2})$/.exec(p); if (!m) return null;
    return addD(mondayOf(`${m[1]}-01-04`), (+m[2] - 1) * 7);
  }
  const periodRange = (lv, s) => lv === 'y' ? [s.slice(0, 4) + '-01-01', s.slice(0, 4) + '-12-31'] : lv === 'm' ? [s.slice(0, 7) + '-01', ymd(new Date(+s.slice(0, 4), +s.slice(5, 7), 0))] : lv === 'w' ? [mondayOf(s), addD(mondayOf(s), 6)] : [s, s];
  function norm(d) {
    const b = blank(); if (!d || typeof d !== 'object') return b;
    const arr = x => Array.isArray(x) ? x : [];
    const s = Object.assign(b.settings, d.settings && typeof d.settings === 'object' ? d.settings : {});
    s.name = String(s.name || '').slice(0, 40); s.theme = s.theme === 'light' ? 'light' : 'dark'; s.focusMin = Math.min(120, Math.max(5, Math.round(+s.focusMin) || 25)); s.installDismissed = !!s.installDismissed;
    b.settings = s;
    b.tasks = arr(d.tasks).filter(t => t && t.id && parse(t.date)).map(t => ({
      id: String(t.id), title: String(t.title || '').slice(0, 120), desc: String(t.desc || '').slice(0, 500), date: t.date,
      priority: RANK[t.priority] != null ? t.priority : 'mid', category: String(t.category || '').slice(0, 30),
      rec: t.rec === 'daily' || t.rec === 'weekly' ? t.rec : 'none', done: !!t.done, doneDates: [...new Set(arr(t.doneDates).filter(x => parse(x)))],
      goalId: t.goalId ? String(t.goalId) : null, contrib: t.contrib == null ? !!t.goalId : !!t.contrib, goalValue: +t.goalValue > 0 ? +t.goalValue : 1,
      createdAt: +t.createdAt || Date.now(), updatedAt: +t.updatedAt || Date.now()
    }));
    b.goalEntries = arr(d.goalEntries).filter(e => e && e.goalId && parse(e.date) && +e.value > 0).map(e => ({ id: String(e.id || uid()), goalId: String(e.goalId), date: e.date, value: +e.value, note: String(e.note || '').slice(0, 120), createdAt: +e.createdAt || Date.now() }));
    b.goals = arr(d.goals).filter(g => g && g.id && LV[g.type || g.level]).map(g => {
      const id = String(g.id), type = LV[g.type] ? g.type : g.level, legacy = g.mode == null;
      let start = parse(g.start) ? g.start : '', end = parse(g.deadline) ? g.deadline : '', mode = g.mode === 'binary' ? 'binary' : 'measure';
      if (legacy) {
        const r = periodRange(type, periodStart(type, String(g.period || '')) || TD()); start = r[0]; end = r[1];
        mode = b.tasks.some(t => t.goalId === id && t.rec === 'none') ? 'binary' : 'measure';
        if (mode === 'measure' && +g.progress > 0) b.goalEntries.push({ id: uid(), goalId: id, date: ymd(new Date(+g.createdAt || Date.now())), value: Math.min(100, Math.round(+g.progress)), note: 'Oldingi taraqqiyot', createdAt: Date.now() });
      }
      if (!start) start = TD(); if (!end || end < start) end = start;
      return {
        id, title: String(g.title || '').slice(0, 120), desc: String(g.desc || '').slice(0, 500), category: String(g.category || '').slice(0, 30), type, start, deadline: end, mode,
        target: mode === 'measure' ? (legacy ? 100 : (+g.target > 0 ? +g.target : 1)) : 0, unit: legacy ? '%' : String(g.unit || '').slice(0, 20),
        priority: RANK[g.priority] != null ? g.priority : 'mid', status: g.status === 'done' ? 'done' : 'active', archived: !!g.archived,
        createdAt: +g.createdAt || Date.now(), updatedAt: +g.updatedAt || Date.now()
      };
    });
    const gids = new Set(b.goals.map(g => g.id));
    b.tasks.forEach(t => { if (t.goalId && !gids.has(t.goalId)) { t.goalId = null; t.contrib = false; } });
    b.goalEntries = b.goalEntries.filter(e => gids.has(e.goalId));
    b.milestones = arr(d.milestones).filter(m => m && m.goalId && gids.has(String(m.goalId)) && parse(m.date)).map(m => ({ id: String(m.id || uid()), goalId: String(m.goalId), title: String(m.title || '').slice(0, 120), date: m.date, done: !!m.done, doneAt: +m.doneAt || 0, createdAt: +m.createdAt || Date.now(), updatedAt: +m.updatedAt || Date.now() }));
    b.habits = arr(d.habits).filter(h => h && h.id).map(h => {
      const id = String(h.id), fr = h.freq && typeof h.freq === 'object' ? h.freq : {};
      let ft = ['daily', 'days', 'times'].includes(fr.type) ? fr.type : 'daily';
      const days = [...new Set(arr(fr.days).map(Number).filter(x => x >= 0 && x <= 6))].sort();
      if (ft === 'days' && !days.length) ft = 'daily';
      const logs = d.habitLogs && Array.isArray(d.habitLogs[id]) ? [...new Set(d.habitLogs[id].filter(x => parse(x)))] : [];
      b.habitLogs[id] = logs;
      const cd = ymd(new Date(+h.createdAt || Date.now())), first = logs.reduce((m, x) => x < m ? x : m, cd);
      return {
        id, title: String(h.title || '').slice(0, 80), desc: String(h.desc || '').slice(0, 300), category: String(h.category || '').slice(0, 30),
        freq: { type: ft, days: ft === 'days' ? days : [], times: ft === 'times' ? Math.min(7, Math.max(1, Math.round(+fr.times) || 3)) : 0 },
        start: parse(h.start) ? h.start : first, pauses: arr(h.pauses).filter(p => p && parse(p.from) && (!p.to || parse(p.to))).map(p => ({ from: p.from, to: p.to || null })),
        createdAt: +h.createdAt || Date.now(), updatedAt: +h.updatedAt || Date.now()
      };
    });
    b.focus = arr(d.focus).filter(f => f && parse(f.date) && +f.min > 0).map(f => ({ id: String(f.id || uid()), date: f.date, min: Math.round(+f.min), at: +f.at || 0 }));
    return b;
  }
  function load() {
    let raw = null;
    try { raw = localStorage.getItem(KEY); } catch (e) { mem = true; return blank(); }
    if (!raw) return blank();
    try {
      const d = JSON.parse(raw);
      if ((+d.v || 1) < DBV) { migrated = true; try { if (!localStorage.getItem(KEY + '.v1backup')) localStorage.setItem(KEY + '.v1backup', raw); } catch (_) { } }
      return norm(d);
    } catch (e) {
      try { localStorage.setItem(KEY + '.bad', raw); } catch (_) { }
      bootMsg = "Saqlangan ma'lumotni o'qib bo'lmadi. Nusxasi alohida saqlandi, ilova bo'sh holatda ochildi.";
      return blank();
    }
  }
  let db = load();
  if (migrated) save();

  function save() {
    if (mem) return false;
    try { localStorage.setItem(KEY, JSON.stringify(db)); return true; }
    catch (e) { mem = true; toast("Saqlab bo'lmadi. Ma'lumotlar faqat shu sessiyada qoladi."); return false; }
  }

  /* ---------- hisob-kitob ---------- */
  const occurs = (t, d) => t.rec === 'daily' ? d >= t.date : t.rec === 'weekly' ? (d >= t.date && dowOf(d) === dowOf(t.date)) : t.date === d;
  const isDone = (t, d) => t.rec !== 'none' ? t.doneDates.includes(d) : t.done;
  const bySort = (a, b) => RANK[a.priority] - RANK[b.priority] || a.createdAt - b.createdAt;
  const tasksOn = d => db.tasks.filter(t => occurs(t, d)).sort(bySort);
  function dayStat(d) { const l = tasksOn(d), n = l.filter(t => isDone(t, d)).length; return { d, total: l.length, done: n, pct: l.length ? Math.round(n / l.length * 100) : 0 }; }
  const history = n => { const t = TD(), o = []; for (let i = n - 1; i >= 0; i--) o.push(dayStat(addD(t, -i))); return o; };
  function toggleTask(t, d) {
    if (t.rec === 'none') t.done = !t.done;
    else { const i = t.doneDates.indexOf(d); if (i < 0) t.doneDates.push(d); else t.doneDates.splice(i, 1); }
    t.updatedAt = Date.now();
  }
  /* --- maqsadlar --- */
  const nf = n => String(Math.round(n * 100) / 100);
  const gEntries = g => db.goalEntries.filter(e => e.goalId === g.id);
  const gMs = g => db.milestones.filter(m => m.goalId === g.id).sort((a, b) => a.date < b.date ? -1 : a.date > b.date ? 1 : a.createdAt - b.createdAt);
  const gTasks = g => db.tasks.filter(t => t.goalId === g.id && t.contrib);
  // Vazifa hissasi holatdan hisoblanadi (qo'shib borilmaydi), shuning uchun ikki marta sanalmaydi.
  const taskVal = (g, t) => { const v = +t.goalValue > 0 ? +t.goalValue : 1; return t.rec === 'none' ? (t.done ? v : 0) : t.doneDates.filter(d => d >= g.start && d <= g.deadline).length * v; };
  const goalMode = gid => { const g = db.goals.find(x => x.id === gid); return g ? g.mode : null; };
  function gCur(g) { return g.mode === 'measure' ? Math.max(0, gEntries(g).reduce((a, e) => a + e.value, 0) + gTasks(g).reduce((a, t) => a + taskVal(g, t), 0)) : 0; }
  function gProg(g) {
    if (g.mode === 'measure') { const cur = gCur(g); return { cur, pct: g.target > 0 ? Math.min(100, Math.round(cur / g.target * 100)) : 0, text: `${nf(cur)} / ${nf(g.target)} ${g.unit}`.trim(), cond: true }; }
    const ms = gMs(g); if (ms.length) { const n = ms.filter(m => m.done).length; return { pct: Math.round(n / ms.length * 100), text: `${n} / ${ms.length} bosqich`, cond: true }; }
    const ts = gTasks(g).filter(t => t.rec === 'none'); if (ts.length) { const n = ts.filter(t => t.done).length; return { pct: Math.round(n / ts.length * 100), text: `${n} / ${ts.length} vazifa`, cond: true }; }
    return { pct: g.status === 'done' ? 100 : 0, text: g.status === 'done' ? 'Bajarilgan' : 'Bajarilmagan', cond: false };
  }
  function gState(g) { const p = gProg(g), t = TD(), done = g.status === 'done' || (p.cond && p.pct >= 100); return { p, done, overdue: !done && !g.archived && g.deadline < t, days: diffD(t, g.deadline) }; }
  /* --- odatlar --- */
  const hPausedOn = (h, d) => h.pauses.some(p => d >= p.from && (!p.to || d <= p.to));
  const hDoneOn = (h, d) => (db.habitLogs[h.id] || []).includes(d);
  const hSched = (h, d) => h.freq.type !== 'times' && d >= h.start && !hPausedOn(h, d) && (h.freq.type === 'daily' || h.freq.days.includes(dowOf(d)));
  function hDayState(h, d) {
    const t = TD(); if (hDoneOn(h, d)) return 'done'; if (hPausedOn(h, d)) return 'pause'; if (d < h.start) return 'off';
    if (h.freq.type === 'times') return d > t ? 'future' : 'free';
    if (!hSched(h, d)) return 'off'; return d < t ? 'miss' : 'due';
  }
  function hRecord(h, d) { if (d > TD()) return false; const l = db.habitLogs[h.id] = db.habitLogs[h.id] || [], i = l.indexOf(d); if (i < 0) { l.push(d); if (d < h.start) h.start = d; } else l.splice(i, 1); h.updatedAt = Date.now(); return true; }
  function hStats(h) {
    const t = TD(), T = h.freq.type, logs = new Set(db.habitLogs[h.id] || []); let run = 0, best = 0;
    if (T !== 'times') {
      for (let d = h.start; d <= t; d = addD(d, 1)) { if (!hSched(h, d)) continue; if (logs.has(d)) { run++; if (run > best) best = run; } else if (d < t) run = 0; }
    } else {
      const cw = mondayOf(t);
      for (let w = mondayOf(h.start); w <= cw; w = addD(w, 7)) {
        let av = 0, c = 0; for (let i = 0; i < 7; i++) { const d = addD(w, i); if (d < h.start || hPausedOn(h, d)) continue; av++; if (d <= t && logs.has(d)) c++; }
        const req = Math.min(h.freq.times, av); if (!req) continue;
        if (c >= req) { run++; if (run > best) best = run; } else if (w < cw) run = 0;
      }
    }
    const win = n => {
      const from0 = addD(t, -(n - 1)), from = from0 < h.start ? h.start : from0;
      if (T !== 'times') { let s = 0, c = 0; for (let d = from; d <= t; d = addD(d, 1)) { if (!hSched(h, d)) continue; if (logs.has(d)) { c++; s++; } else if (d < t) s++; } return s ? Math.round(c / s * 100) : null; }
      let av = 0, c = 0; for (let d = from; d <= t; d = addD(d, 1)) { if (hPausedOn(h, d)) continue; av++; if (logs.has(d)) c++; }
      const tg = h.freq.times * av / 7; return tg > 0 ? Math.min(100, Math.round(c / tg * 100)) : null;
    };
    return { cur: run, best, r7: win(7), r30: win(30), total: logs.size };
  }
  const habitsToday = () => { const t = TD(); return db.habits.filter(h => !hPausedOn(h, t) && (h.freq.type === 'times' || hSched(h, t))); };
  const hWeekCount = h => { const t = TD(); let c = 0; for (let d = mondayOf(t); d <= t; d = addD(d, 1)) if (!hPausedOn(h, d) && hDoneOn(h, d)) c++; return c; };
  const WD = [1, 2, 3, 4, 5, 6, 0], DSH_M = ['Du', 'Se', 'Chor', 'Pay', 'Ju', 'Sha', 'Yak'];
  const schedText = h => h.freq.type === 'daily' ? 'Har kuni' : h.freq.type === 'days' ? WD.filter(x => h.freq.days.includes(x)).map(x => DSH[x]).join(', ') : `Haftada ${h.freq.times} marta`;
  function weekHabit() {
    const t = TD(), days = Array.from({ length: 7 }, (_, i) => addD(t, i - 6));
    const cols = days.map(d => { let s = 0, c = 0; db.habits.forEach(h => { if (hSched(h, d)) { s++; if (hDoneOn(h, d)) c++; } }); return { d, s, c }; });
    const rs = db.habits.filter(h => !hPausedOn(h, t)).map(h => hStats(h).r7).filter(x => x != null);
    return { cols, rate: rs.length ? Math.round(rs.reduce((a, x) => a + x, 0) / rs.length) : null };
  }
  function dayStreak(H) { let n = 0; for (let i = H.length - 1; i >= 0; i--) { const x = H[i]; if (x.total > 0 && x.pct >= 70) n++; else if (i !== H.length - 1) break; } return n; }
  const focusOn = d => db.focus.filter(f => f.date === d).reduce((a, f) => a + f.min, 0);

  /* ---------- holat va chizish ---------- */
  const ui = { tab: 'home', scope: 'today', fs: 'all', fp: 'all', gtab: 'goals', gl: 'all', gs: 'active' };
  const TABS = [['home', 'Bosh sahifa', 'home'], ['tasks', 'Vazifalar', 'tasks'], ['goals', 'Maqsadlar', 'target'], ['stats', 'Statistika', 'chart'], ['settings', 'Sozlamalar', 'sliders']];
  const ring = (pct, size, sw, inner) => { const r = (size - sw) / 2, c = 2 * Math.PI * r; return `<div class="ring" style="width:${size}px;height:${size}px"><svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><circle class="rt" cx="${size / 2}" cy="${size / 2}" r="${r}" stroke-width="${sw}"/><circle class="rp" id="${inner.id || ''}" cx="${size / 2}" cy="${size / 2}" r="${r}" stroke-width="${sw}" stroke-dasharray="${c}" stroke-dashoffset="${c * (1 - pct / 100)}" style="--c:${c}"/></svg><div class="ri">${inner.html || ''}</div></div>`; };
  const empty = (icon, title, text, btn) => `<div class="empty"><div class="eic">${ic(icon, 26)}</div><b>${title}</b>${text}${btn ? `<div style="margin-top:14px">${btn}</div>` : ''}</div>`;
  const addBtn = (act, label) => `<button class="btn" data-act="${act}">${ic('plus', 18)}${label}</button>`;

  function taskRow(t, d, late) {
    const dn = isDone(t, d), meta = [`<span class="pri p-${t.priority}">${PL[t.priority]}</span>`];
    if (t.category) meta.push(`<span>${esc(t.category)}</span>`);
    if (t.rec !== 'none') meta.push(`<span class="mi">${ic('repeat', 13)}${t.rec === 'daily' ? 'Har kuni' : 'Har hafta'}</span>`);
    if (late || (t.rec === 'none' && d !== TD())) meta.push(`<span class="${late ? 'late' : ''}">${shortDate(d)}</span>`);
    const g = t.goalId && db.goals.find(x => x.id === t.goalId); if (g) meta.push(`<span class="mi">${ic('target', 13)}${esc(g.title)}</span>`);
    return `<div class="task${dn ? ' done' : ''}" data-id="${t.id}" data-d="${d}"><button class="chk" data-act="toggle" aria-pressed="${dn}" aria-label="${dn ? 'Bajarilmagan deb belgilash' : 'Bajarildi deb belgilash'}">${ic('check', 16)}</button><div class="tb" data-act="edit"><div class="tt">${esc(t.title)}</div>${t.desc ? `<div class="td">${esc(t.desc)}</div>` : ''}<div class="tm">${meta.join('')}</div></div><button class="ib" data-act="edit" aria-label="Tahrirlash">${ic('edit', 17)}</button><button class="ib" data-act="del" aria-label="O'chirish">${ic('trash', 17)}</button></div>`;
  }
  function weekChart(H) {
    if (!H.some(x => x.total)) return empty('chart', "Hali ma'lumot yo'q", `<div class="note">Vazifa qo'shing, haftalik diagramma shu yerda paydo bo'ladi.</div>`);
    return `<div class="bars">${H.map(x => `<div class="bcol"><div class="bval">${x.total ? x.pct + '%' : ''}</div><div class="btrack"><div class="bfill${x.d === TD() ? ' today' : ''}" style="height:${x.pct}%"></div></div><div class="blab">${DSH[dowOf(x.d)]}</div></div>`).join('')}</div>`;
  }

  /* --- umumiy ko'rinish yordamchilari --- */
  const goalSort = (a, b) => (gState(b).overdue - gState(a).overdue) || (a.deadline < b.deadline ? -1 : a.deadline > b.deadline ? 1 : 0) || RANK[a.priority] - RANK[b.priority];
  const whenTxt = d => { const n = diffD(TD(), d); return n === 0 ? 'Bugun' : n === 1 ? 'Ertaga' : n > 1 ? `${n} kun qoldi` : `${-n} kun kechikdi`; };
  const stBadge = (g, s) => g.archived ? '<span class="bd">Arxivlangan</span>' : s.done ? '<span class="bd ok">Bajarildi</span>' : s.overdue ? `<span class="bd bad">${-s.days} kun kechikdi</span>` : '<span class="bd">Faol</span>';
  let installEv = null;
  const isStandalone = () => (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true;
  const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  function installBlock(full) {
    if (isStandalone()) return full ? '<div class="note">Kunlik ilova rejimida ishlayapti.</div>' : '';
    if (installEv) return `<button class="btn${full ? ' sec' : ''}" data-act="install">${ic('phone', 18)}Bosh ekranga o'rnatish</button>`;
    if (isIOS()) return `<div class="note">iPhone/iPad: Safari'da "Ulashish" tugmasini bosib, "Bosh ekranga qo'shish"ni tanlang.</div>`;
    return full ? `<div class="note">Brauzer menyusidan "Ilovani o'rnatish" yoki "Bosh ekranga qo'shish"ni tanlang. Brauzer taklifi hali chiqmagan bo'lishi mumkin.</div>` : '';
  }
  function upcoming() {
    const t = TD(), lim = addD(t, 14), o = [];
    db.milestones.forEach(m => { const g = db.goals.find(x => x.id === m.goalId); if (!g || g.archived || m.done || gState(g).done) return; if (m.date >= t && m.date <= lim) o.push({ k: 'ms', d: m.date, m, g }); });
    db.goals.forEach(g => { if (g.archived) return; const s = gState(g); if (s.done || s.overdue) return; if (g.deadline >= t && g.deadline <= lim) o.push({ k: 'dl', d: g.deadline, g }); });
    return o.sort((a, b) => a.d < b.d ? -1 : a.d > b.d ? 1 : 0);
  }
  function miniGoal(g) {
    const s = gState(g), p = s.p;
    return `<div class="mg" data-id="${g.id}" data-act="gOpen" role="button" tabindex="0"><div class="row" style="justify-content:space-between;flex-wrap:nowrap"><span class="nm">${esc(g.title)}</span><b class="pc">${p.pct}%</b></div><div class="bar" style="margin:6px 0"><i style="width:${p.pct}%"></i></div><div class="gm" style="margin:0"><span>${esc(p.text)}</span><span class="${s.overdue ? 'late' : ''}">${whenTxt(g.deadline)}</span></div></div>`;
  }

  function vHome() {
    const t = TD(), s = dayStat(t), H = history(7), hr = new Date().getHours();
    const gr = hr >= 5 && hr < 11 ? 'Xayrli tong' : hr >= 11 && hr < 17 ? 'Xayrli kun' : hr >= 17 && hr < 22 ? 'Xayrli kech' : 'Xayrli tun';
    const nm = db.settings.name ? `, ${esc(db.settings.name)}` : '';
    const msg = !s.total ? "Bugun uchun vazifa yo'q" : s.pct === 100 ? 'Ajoyib! Bugungi barcha vazifalar bajarildi' : s.pct >= 50 ? "Yaxshi ketyapsiz, oz qoldi" : s.done ? 'Yaxshi boshladingiz, davom eting' : 'Birinchi vazifadan boshlang';
    const todayAll = tasksOn(t), shown = [...todayAll.filter(x => !isDone(x, t)), ...todayAll.filter(x => isDone(x, t))].slice(0, 5);
    const over = db.goals.filter(g => gState(g).overdue);
    const ag = db.goals.filter(g => !g.archived && !gState(g).done).sort(goalSort).slice(0, 3);
    const hl = habitsToday(), hdn = hl.filter(h => hDoneOn(h, t)).length, wh = weekHabit(), up = upcoming().slice(0, 5);
    const ib = !db.settings.installDismissed ? installBlock(false) : '';
    return `<div class="view"><div class="top"><div class="brand"><img src="icon-192.png" alt=""><div><b>Kunlik</b><span>Bugungi intizom. Ertangi natija.</span></div></div></div>
<div class="greet"><h1>${gr}${nm}</h1><p>${longDate(t)}, ${parse(t).getFullYear()}</p></div>
<div class="card hero">${ring(s.pct, 120, 12, { html: `${s.pct}%<small>bugun</small>`, id: 'homeRing' })}<div><div class="big">${s.done} / ${s.total}</div><div class="sm">vazifa bajarildi</div><div class="sm" style="margin-top:10px;font-weight:600;opacity:1">${msg}</div></div></div>
${over.length ? `<button class="warn alert" data-act="goOver">${ic('alert', 20)}<span><b>${over.length} ta maqsad muddati o'tgan</b><br><span class="note">${esc(over.slice(0, 2).map(g => g.title).join(', '))}${over.length > 2 ? ' va boshqalar' : ''}</span></span></button>` : ''}
${ib ? `<div class="card inst"><h3>Ilovani o'rnating<button class="lnk" data-act="installDismiss">Keyinroq</button></h3><p class="note" style="margin:0 0 12px">Bosh ekranda to'liq ekranli ilova sifatida ochiladi.</p>${ib}</div>` : ''}
<div class="card"><h3>Ustuvor vazifalar<button class="lnk" data-act="nav" data-v="tasks">Hammasi</button></h3>
${s.total === 0 ? empty('inbox', "Bugun vazifa yo'q", `<div class="note">Birinchi vazifangizni qo'shing.</div>`, addBtn('addTask', "Vazifa qo'shish")) : shown.map(x => taskRow(x, t)).join('')}</div>
<div class="card"><h3>Faol maqsadlar<button class="lnk" data-act="nav" data-v="goals">Hammasi</button></h3>
${ag.length ? ag.map(miniGoal).join('') : empty('target', "Faol maqsad yo'q", `<div class="note">Maqsad yarating va uni bosqichlarga bo'ling.</div>`, addBtn('addGoal', "Maqsad qo'shish"))}</div>
<div class="card"><h3>Bugungi odatlar${hl.length ? `<span class="note">${hdn} / ${hl.length}</span>` : ''}</h3>
${hl.length ? `<div class="hchips">${hl.map(h => `<button class="hc${hDoneOn(h, t) ? ' on' : ''}" data-act="hToggle" data-id="${h.id}" aria-pressed="${hDoneOn(h, t)}">${hDoneOn(h, t) ? ic('check', 15) : ''}${esc(h.title)}${h.freq.type === 'times' ? ` <small>${hWeekCount(h)}/${h.freq.times}</small>` : ''}</button>`).join('')}</div>
<div class="wk"><div class="wkd">${wh.cols.map(c => `<div><i class="${!c.s ? 'off' : c.c === c.s ? 'full' : c.c > 0 ? 'part' : c.d < t ? 'miss' : 'none'}" title="${shortDate(c.d)}: ${c.c}/${c.s}"></i><span>${DSH[dowOf(c.d)]}</span></div>`).join('')}</div><div class="note" style="text-align:right">Haftalik: <b>${wh.rate == null ? '—' : wh.rate + '%'}</b></div></div>`
      : db.habits.length ? `<div class="note">Bugun rejalashtirilgan odat yo'q.</div>` : empty('repeat', "Odatlar yo'q", `<div class="note">Har kunlik odat qo'shib, ketma-ketlikni kuzating.</div>`, `<button class="btn sec" data-act="goHabits">Odat qo'shish</button>`)}</div>
<div class="card"><h3>Yaqin bosqichlar va muddatlar</h3>${up.length ? up.map(x => x.k === 'ms'
      ? `<div class="mrow" data-id="${x.m.id}"><button class="chk" data-act="msToggle" aria-pressed="false" aria-label="Bosqich bajarildi">${ic('check', 16)}</button><div class="mb"><div class="tt">${esc(x.m.title)}</div><div class="td">${esc(x.g.title)}</div></div><span class="note">${whenTxt(x.d)}</span></div>`
      : `<div class="mrow" data-id="${x.g.id}" data-act="gOpen" role="button" tabindex="0"><span class="flg">${ic('flag', 18)}</span><div class="mb"><div class="tt">Muddat: ${esc(x.g.title)}</div><div class="td">${shortDate(x.d)}</div></div><span class="note">${whenTxt(x.d)}</span></div>`).join('') : `<div class="note">Keyingi 14 kunda bosqich yoki muddat yo'q.</div>`}</div>
<div class="card"><h3>Fokus</h3><div class="row" style="align-items:center;justify-content:space-between;flex-wrap:nowrap"><div><div class="big" style="font-size:26px;font-weight:800" id="hFocus">${fmt(F.left)}</div><div class="note">Bugun fokusda: ${focusOn(t)} daqiqa</div></div><button class="btn" data-act="focus">${ic(F.on ? 'timer' : 'play', 18)}${F.on ? 'Ochish' : 'Boshlash'}</button></div></div>
<div class="card"><h3>Haftalik taraqqiyot</h3>${weekChart(H)}</div></div>`;
  }

  function scopeItems() {
    const t = TD(); let out = [];
    if (ui.scope === 'today') { tasksOn(t).forEach(x => out.push({ t: x, d: t, g: 'Bugun' })); db.tasks.filter(x => x.rec === 'none' && !x.done && x.date < t).sort((a, b) => a.date < b.date ? -1 : 1).forEach(x => out.push({ t: x, d: x.date, g: 'Kechiktirilgan' })); }
    else if (ui.scope === 'up') { for (let i = 1; i <= 14; i++) { const d = addD(t, i); tasksOn(d).forEach(x => out.push({ t: x, d, g: longDate(d) })); } }
    else db.tasks.slice().sort((a, b) => a.date < b.date ? 1 : a.date > b.date ? -1 : bySort(a, b)).forEach(x => out.push({ t: x, d: x.rec === 'none' ? x.date : t, g: '' }));
    return out.filter(o => (ui.fs === 'all' || (ui.fs === 'done') === isDone(o.t, o.d)) && (ui.fp === 'all' || o.t.priority === ui.fp));
  }
  function vTasks() {
    const items = scopeItems(), seg = (k, l) => `<button class="${ui.scope === k ? 'on' : ''}" data-act="scope" data-v="${k}">${l}</button>`;
    const chip = (act, cur, v, l) => `<button class="chip${cur === v ? ' on' : ''}" data-act="${act}" data-v="${v}">${l}</button>`;
    let body = '';
    if (!items.length) {
      const filtered = ui.fs !== 'all' || ui.fp !== 'all';
      body = filtered ? empty('tasks', 'Hech narsa topilmadi', `<div class="note">Filtrlarni o'zgartirib ko'ring.</div>`, `<button class="btn sec" data-act="clearF">Filtrlarni tozalash</button>`)
        : ui.scope === 'up' ? empty('tasks', 'Kelgusi 14 kunda vazifa yo\'q', '', addBtn('addTask', "Vazifa qo'shish"))
          : ui.scope === 'all' ? empty('tasks', "Hali vazifa yo'q", `<div class="note">Birinchi vazifangizni yarating.</div>`, addBtn('addTask', "Vazifa qo'shish"))
            : empty('check', "Bugun vazifa yo'q", `<div class="note">Dam oling yoki yangi vazifa qo'shing.</div>`, addBtn('addTask', "Vazifa qo'shish"));
    } else {
      let last = null; body = '<div class="card" style="padding:6px 16px">';
      for (const o of items) { if (o.g && o.g !== last) { body += `<div class="gh${o.g === 'Kechiktirilgan' ? ' late' : ''}">${o.g}</div>`; last = o.g; } body += taskRow(o.t, o.d, o.g === 'Kechiktirilgan'); }
      body += '</div>';
    }
    return `<div class="view"><div class="pg"><h1>Vazifalar</h1><p>${db.tasks.length} ta vazifa</p></div>
<div class="seg">${seg('today', 'Bugun')}${seg('up', 'Kelgusi')}${seg('all', 'Hammasi')}</div>
<div class="flab">Holat</div><div class="chips">${chip('fs', ui.fs, 'all', 'Barchasi')}${chip('fs', ui.fs, 'open', 'Bajarilmagan')}${chip('fs', ui.fs, 'done', 'Bajarilgan')}</div>
<div class="flab">Muhimlik</div><div class="chips">${chip('fp', ui.fp, 'all', 'Barchasi')}${chip('fp', ui.fp, 'high', 'Yuqori')}${chip('fp', ui.fp, 'mid', "O'rta")}${chip('fp', ui.fp, 'low', 'Past')}</div>${body}</div>`;
  }

  function goalCard(g) {
    const s = gState(g), p = s.p, ms = gMs(g), mdn = ms.filter(m => m.done).length;
    const act = g.archived ? '' : (!s.done && g.mode === 'measure') ? `<div class="gact"><button class="btn sm" data-act="entryAdd">${ic('plus', 16)}Natija qo'shish</button></div>`
      : (!p.cond) ? `<div class="gact"><button class="btn sm${s.done ? ' sec' : ''}" data-act="gDone">${s.done ? 'Qayta ochish' : 'Bajarildi deb belgilash'}</button></div>` : '';
    return `<div class="card gc" data-id="${g.id}"><div class="gmain" data-act="gOpen" role="button" tabindex="0"><div class="gt"><div class="nm">${esc(g.title)}</div>${stBadge(g, s)}</div>
<div class="gm"><span class="lv">${LV[g.type]}</span><span class="pri p-${g.priority}">${PL[g.priority]}</span>${g.category ? `<span>${esc(g.category)}</span>` : ''}${ms.length ? `<span class="mi">${ic('flag', 13)}${mdn}/${ms.length} bosqich</span>` : ''}</div>
<div class="row" style="align-items:center;flex-wrap:nowrap"><div class="bar" style="flex:1"><i style="width:${s.p.pct}%"></i></div><b class="pc">${s.p.pct}%</b></div>
<div class="gm" style="margin:8px 0 0"><span>${esc(p.text)}</span><span class="${s.overdue ? 'late' : ''}">Muddat: ${shortDate(g.deadline)}${s.done ? '' : ' · ' + whenTxt(g.deadline)}</span></div></div>${act}</div>`;
  }
  function habitCard(h) {
    const t = TD(), st = hStats(h), paused = hPausedOn(h, t), isT = h.freq.type === 'times', days = Array.from({ length: 7 }, (_, i) => addD(t, i - 6)), dn = hDoneOn(h, t);
    return `<div class="card hcard" data-id="${h.id}"><div class="hmain" data-act="hOpen" role="button" tabindex="0"><div class="gt"><div class="nm">${esc(h.title)}</div>${paused ? `<span class="bd">To'xtatilgan</span>` : `<span class="fl">${ic('flame', 15)}${st.cur}</span>`}</div>
<div class="gm"><span class="lv">${schedText(h)}</span>${h.category ? `<span>${esc(h.category)}</span>` : ''}${isT ? `<span>Shu hafta: ${hWeekCount(h)}/${h.freq.times}</span>` : ''}</div>
<div class="dots2">${days.map(d => `<i class="${hDayState(h, d)}" title="${shortDate(d)}"></i>`).join('')}</div>
<div class="gm" style="margin:8px 0 0"><span>7 kun: ${st.r7 == null ? '—' : st.r7 + '%'}</span><span>30 kun: ${st.r30 == null ? '—' : st.r30 + '%'}</span><span>Eng yaxshi: ${st.best} ${isT ? 'hafta' : 'kun'}</span></div></div>
<div class="gact">${paused ? `<button class="btn sm sec" data-act="hPause">Davom ettirish</button>` : `<button class="btn sm${dn ? ' sec' : ''}" data-act="hToggle">${dn ? 'Bugun bajarilgan (bekor qilish)' : 'Bugun bajardim'}</button>`}</div></div>`;
  }
  function vGoals() {
    const seg = (k, l) => `<button class="${ui.gtab === k ? 'on' : ''}" data-act="gtab" data-v="${k}">${l}</button>`;
    let body;
    if (ui.gtab === 'goals') {
      const all = db.goals.map(g => ({ g, s: gState(g) }));
      const F2 = { active: x => !x.g.archived && !x.s.done, overdue: x => x.s.overdue, done: x => !x.g.archived && x.s.done, archived: x => x.g.archived };
      const cnt = k => all.filter(F2[k]).length;
      const list = all.filter(F2[ui.gs] || F2.active).filter(x => ui.gl === 'all' || x.g.type === ui.gl).map(x => x.g).sort(goalSort);
      const sc = (k, l) => `<button class="chip${ui.gs === k ? ' on' : ''}" data-act="gs" data-v="${k}">${l} ${cnt(k)}</button>`;
      const tc = (v, l) => `<button class="chip${ui.gl === v ? ' on' : ''}" data-act="gl" data-v="${v}">${l}</button>`;
      body = `<div class="chips">${sc('active', 'Faol')}${sc('overdue', 'Kechikkan')}${sc('done', 'Bajarilgan')}${sc('archived', 'Arxiv')}</div><div class="chips">${tc('all', 'Barcha turlar')}${Object.keys(LV).map(k => tc(k, LV[k])).join('')}</div>`
        + (list.length ? list.map(goalCard).join('') : db.goals.length ? `<div class="card">${empty('target', "Bu filtrda maqsad yo'q", '<div class="note">Boshqa filtrni tanlang.</div>')}</div>`
          : `<div class="card">${empty('target', "Maqsadlar yo'q", `<div class="note">Masalan: "Yilda 24 ta kitob o'qish". Maqsadni miqdor, muddat va bosqichlar bilan belgilang.</div>`, addBtn('addGoal', "Maqsad qo'shish"))}</div>`);
    } else {
      const act = db.habits.filter(h => !hPausedOn(h, TD())), ps = db.habits.filter(h => hPausedOn(h, TD()));
      body = db.habits.length ? [...act, ...ps].map(habitCard).join('') : `<div class="card">${empty('repeat', "Odatlar yo'q", `<div class="note">Kitob o'qish, mashq, suv ichish kabi odatlarni qo'shing va ketma-ket kunlarni kuzating.</div>`, addBtn('addHabit', "Odat qo'shish"))}</div>`;
    }
    return `<div class="view"><div class="pg"><h1>Maqsadlar</h1><p>Maqsadlar va odatlar</p></div><div class="seg">${seg('goals', 'Maqsadlar')}${seg('habits', 'Odatlar')}</div>${body}</div>`;
  }

  function vStats() {
    const t = TD(), all = db.tasks.filter(x => x.date <= t);
    if (!all.length) return `<div class="view"><div class="pg"><h1>Statistika</h1><p>Natijalaringiz tahlili</p></div><div class="card">${empty('chart', "Statistika uchun ma'lumot yetarli emas", `<div class="note">Kamida bitta vazifa qo'shing va bajaring. Hisob-kitoblar faqat saqlangan ma'lumotlaringizdan olinadi.</div>`, addBtn('addTask', "Vazifa qo'shish"))}</div></div>`;
    const first = all.reduce((m, x) => x.date < m ? x.date : m, t), span = Math.min(365, diffD(first, t) + 1), H = history(span);
    const total = H.reduce((a, x) => a + x.total, 0), done = H.reduce((a, x) => a + x.done, 0), rate = total ? Math.round(done / total * 100) : 0, left = total - done;
    const W = history(7), maxD = Math.max(1, ...W.map(x => x.done)), H30 = history(30), act = H30.filter(x => x.total), avg = act.length ? Math.round(act.reduce((a, x) => a + x.pct, 0) / act.length) : 0;
    const c = 2 * Math.PI * 44, dd = total ? c * done / total : 0;
    const wf = [0, 1, 2, 3, 4, 5, 6].reduce((a, i) => a + focusOn(addD(t, -i)), 0);
    return `<div class="view"><div class="pg"><h1>Statistika</h1><p>${span === 1 ? "Bugungi ma'lumotlar" : `Oxirgi ${span} kun ma'lumotlari`}</p></div>
<div class="kpis"><div class="kpi"><b>${rate}%</b><span>Umumiy bajarilish</span></div><div class="kpi"><b>${dayStreak(H)}</b><span>Ketma-ket kunlar (kuniga 70%+)</span></div><div class="kpi"><b>${focusOn(t)}</b><span>Bugun fokus (daqiqa)</span></div><div class="kpi"><b>${wf}</b><span>7 kunda fokus (daqiqa)</span></div></div>
<div class="card"><h3>Bajarilgan va bajarilmagan</h3><div class="donut"><svg width="110" height="110" viewBox="0 0 110 110" style="transform:rotate(-90deg)"><circle cx="55" cy="55" r="44" fill="none" stroke="var(--bad)" stroke-opacity=".55" stroke-width="14"/><circle cx="55" cy="55" r="44" fill="none" stroke="var(--a)" stroke-width="14" stroke-linecap="${done && left ? 'round' : 'butt'}" stroke-dasharray="${dd} ${c}"/></svg><div class="leg"><div><i style="background:var(--a)"></i>Bajarilgan: <b>${done}</b></div><div><i style="background:var(--bad);opacity:.6"></i>Bajarilmagan: <b>${left}</b></div><div class="note">Jami: ${total}</div></div></div></div>
<div class="card"><h3>Haftalik faollik<span class="note">bajarilgan vazifalar</span></h3>${W.some(x => x.total) ? `<div class="bars">${W.map(x => `<div class="bcol"><div class="bval">${x.total ? x.done : ''}</div><div class="btrack"><div class="bfill${x.d === t ? ' today' : ''}" style="height:${Math.round(x.done / maxD * 100)}%"></div></div><div class="blab">${DSH[dowOf(x.d)]}</div></div>`).join('')}</div>` : empty('chart', "Bu hafta ma'lumot yo'q", '')}</div>
<div class="card"><h3>Kunlik taraqqiyot tarixi<span class="note">${act.length ? `o'rtacha ${avg}%` : ''}</span></h3>${act.length ? `<div class="hist">${H30.map(x => `<i class="${x.total ? '' : 'z'}" style="height:${x.total ? Math.max(3, x.pct) : 3}%" title="${shortDate(x.d)}: ${x.total ? x.pct + '%' : 'vazifa yo\'q'}"></i>`).join('')}</div><div class="hl"><span>${shortDate(H30[0].d)}</span><span>${shortDate(H30[29].d)}</span></div>` : empty('chart', "Oxirgi 30 kunda ma'lumot yo'q", '')}</div></div>`;
  }

  function vSettings() {
    const s = db.settings;
    return `<div class="view"><div class="pg"><h1>Sozlamalar</h1><p>Kunlik v1</p></div>
${mem ? `<div class="warn">Brauzer saqlashga ruxsat bermayapti. Ma'lumotlar yopilganda yo'qoladi. Nusxa olib qo'ying.</div>` : ''}
<div class="card"><h3>Profil</h3><label for="s-name">Ismingiz</label><input type="text" id="s-name" maxlength="40" value="${esc(s.name)}" placeholder="Salomlashish uchun" data-set="name">
<label for="s-theme">Mavzu</label><select id="s-theme" data-set="theme"><option value="dark"${s.theme === 'dark' ? ' selected' : ''}>Qorong'i</option><option value="light"${s.theme === 'light' ? ' selected' : ''}>Yorug'</option></select>
<label for="s-focus">Fokus seansi (daqiqa)</label><input type="number" id="s-focus" min="5" max="120" value="${s.focusMin}" data-set="focusMin"></div>
<div class="card"><h3>Ma'lumotlar</h3><p class="note" style="margin-top:0">Ma'lumotlar faqat shu qurilmada (brauzer xotirasida) saqlanadi. Boshqa telefonga o'tkazish uchun nusxa oling.</p>
<div class="row"><button class="btn sec" data-act="export">${ic('down', 18)}Nusxa olish</button><label class="btn sec" style="margin:0;cursor:pointer;color:var(--t)">${ic('up', 18)}Tiklash<input type="file" id="s-imp" accept=".json,application/json" hidden></label><button class="btn dng" data-act="wipe">${ic('trash', 18)}Hammasini o'chirish</button></div></div>
<div class="card"><h3>Ilova rejimi</h3><p class="note" style="margin-top:0">Hozirgi rejim: <b>${isStandalone() ? 'Ilova (standalone)' : document.fullscreenElement ? "To'liq ekran" : 'Brauzer oynasi'}</b></p>${installBlock(true)}
${document.fullscreenEnabled ? `<div style="margin-top:10px"><button class="btn sec" data-act="fsToggle">${ic('expand', 18)}${document.fullscreenElement ? "To'liq ekrandan chiqish" : "To'liq ekran"}</button></div>` : `<div class="note" style="margin-top:10px">Bu brauzer to'liq ekran rejimini qo'llamaydi.</div>`}
<p class="note" style="margin-bottom:0">Veb-sayt Android tizim panellarini doimiy yashira olmaydi: to'liq ekran faqat tugma bosilganda yoqiladi va chetdan surilganda panellar qaytishi mumkin. Eng yaxshi natija uchun ilovani bosh ekranga o'rnating.</p></div>
<div class="card"><h3>Cheklovlar</h3><p class="note" style="margin:0">Boshqa ilovalarni to'sish va telefon ekran vaqtini avtomatik o'lchash veb-ilovada mumkin emas. Bu imkoniyatlar keyingi bosqichda Android ilovasi bilan qo'shiladi. Hozircha fokus taymeri va qo'lda hisob ishlaydi.</p></div></div>`;
  }

  /* ---------- fokus taymeri ---------- */
  const fmt = s => `${pad(Math.floor(s / 60))}:${pad(s % 60)}`;
  const F = { min: db.settings.focusMin, left: db.settings.focusMin * 60, on: false, end: 0 };
  function paint() {
    const a = $('#fTime'), b = $('#hFocus'); if (a) a.textContent = fmt(F.left); if (b) b.textContent = fmt(F.left);
    const r = $('#fRing'); if (r) { const c = +r.getAttribute('stroke-dasharray'); r.style.animation = 'none'; r.setAttribute('stroke-dashoffset', c * (1 - (1 - F.left / (F.min * 60)))); }
  }
  setInterval(() => {
    if (!F.on) return; F.left = Math.max(0, Math.ceil((F.end - Date.now()) / 1000));
    if (F.left <= 0) {
      F.on = false; db.focus.push({ id: uid(), date: TD(), min: F.min, at: Date.now() }); F.left = F.min * 60; save();
      try { navigator.vibrate && navigator.vibrate([200, 100, 200]); } catch (e) { }
      toast(`Fokus seansi tugadi: ${F.min} daqiqa`); render(); if (sheetKind === 'focus') focusSheet();
    } else paint();
  }, 500);
  function focusSheet() {
    const dis = F.on;
    sheet(`<div class="sh-h"><h2>Fokus rejimi</h2><button class="ib" data-act="close" aria-label="Yopish">${ic('x')}</button></div><div class="fwrap">
<div class="chips" style="justify-content:center;margin:6px 0 0">${[15, 25, 45, 60].map(m => `<button class="chip${F.min === m ? ' on' : ''}" data-act="fmin" data-v="${m}" ${dis ? 'disabled style="opacity:.5"' : ''}>${m} daq</button>`).join('')}</div>
${ring(100 * (1 - F.left / (F.min * 60)), 200, 14, { html: `<span class="ftime" id="fTime" style="font-size:40px">${fmt(F.left)}</span>`, id: 'fRing' })}
<div class="note">Bugun fokusda: ${focusOn(TD())} daqiqa. Faqat tugagan seanslar hisoblanadi.</div></div>
<div class="sh-a"><button class="btn" data-act="fToggle">${ic(F.on ? 'pause' : 'play', 18)}${F.on ? 'Pauza' : F.left < F.min * 60 ? 'Davom etish' : 'Boshlash'}</button><button class="btn sec" data-act="fReset">${ic('reset', 18)}Qayta</button></div>`, 'focus');
  }

  /* ---------- oyna, toast, tasdiqlash ---------- */
  let sheetKind = null, toastT, subBack = null, askYes = null, askBack = null, curGoal = null, curHabit = null, calMonth = null;
  function sheet(html, kind) {
    const r = $('#sheet-root'), k = kind || 'form', old = $('.sheet', r), same = !!old && sheetKind === k && r.classList.contains('open'), st = same ? old.scrollTop : 0;
    r.innerHTML = `<div class="back" data-act="close"></div><div class="sheet" role="dialog" aria-modal="true">${html}</div>`;
    document.body.classList.add('lock'); sheetKind = k;
    if (same) $('.sheet', r).scrollTop = st; else { r.classList.remove('open'); void r.offsetWidth; r.classList.add('open'); }
  }
  function closeSheet() { const r = $('#sheet-root'); r.classList.remove('open'); r.innerHTML = ''; document.body.classList.remove('lock'); sheetKind = null; subBack = null; }
  function dismiss() { const b = subBack; if (b && sheetKind === 'form') { subBack = null; b(); } else closeSheet(); }
  function toast(m, type) { const t = $('#toast'); t.textContent = m; t.className = 'show' + (type === 'err' ? ' err' : ''); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 2800); }
  function ask(title, text, label, yes, back) {
    askYes = yes; askBack = back || null;
    sheet(`<div class="sh-h"><h2>${title}</h2></div><p class="note">${text}</p><div class="sh-a"><button class="btn sec" data-act="askNo">Bekor qilish</button><button class="btn dng" data-act="askYes">${label}</button></div>`, 'ask');
  }
  function refreshSheet() { if (sheetKind === 'goal' && curGoal) goalDetail(curGoal); else if (sheetKind === 'habit' && curHabit) habitDetail(curHabit); }

  /* ---------- formalar ---------- */
  const xb = `<button type="button" class="ib" data-act="close" aria-label="Yopish">${ic('x')}</button>`;
  function taskForm(id, goal0) {
    const t = id ? db.tasks.find(x => x.id === id) : null, v = t || { title: '', desc: '', date: TD(), priority: 'mid', category: '', rec: 'none', goalId: goal0 || '', contrib: !!goal0, goalValue: 1 };
    const goals = db.goals.slice().sort((a, b) => 'ymwd'.indexOf(a.type) - 'ymwd'.indexOf(b.type));
    sheet(`<form id="tf" novalidate><div class="sh-h"><h2>${t ? 'Vazifani tahrirlash' : 'Yangi vazifa'}</h2>${xb}</div>
<label for="f-title">Nomi</label><input type="text" id="f-title" maxlength="120" value="${esc(v.title)}" placeholder="Masalan: 20 daqiqa kitob o'qish" autocomplete="off">
<label for="f-desc">Tavsif <span class="opt">(ixtiyoriy)</span></label><textarea id="f-desc" maxlength="500" rows="2">${esc(v.desc)}</textarea>
<div class="two"><div><label for="f-date">Sana</label><input type="date" id="f-date" value="${v.date}"></div><div><label for="f-rec">Takrorlanish</label><select id="f-rec"><option value="none"${v.rec === 'none' ? ' selected' : ''}>Takrorlanmaydi</option><option value="daily"${v.rec === 'daily' ? ' selected' : ''}>Har kuni</option><option value="weekly"${v.rec === 'weekly' ? ' selected' : ''}>Har hafta</option></select></div></div>
<div class="lab">Muhimlik</div><div class="seg" id="f-pri" style="margin:0">${['high', 'mid', 'low'].map(p => `<button type="button" class="${v.priority === p ? 'on' : ''}" data-act="pri" data-v="${p}">${PL[p]}</button>`).join('')}</div>
<div class="two"><div><label for="f-cat">Kategoriya <span class="opt">(ixtiyoriy)</span></label><input type="text" id="f-cat" maxlength="30" list="cats" value="${esc(v.category)}" autocomplete="off"><datalist id="cats"><option value="Shaxsiy"><option value="Ish"><option value="O'qish"><option value="Sog'liq"><option value="Moliya"></datalist></div>
<div><label for="f-goal">Maqsad <span class="opt">(ixtiyoriy)</span></label><select id="f-goal"><option value="">Bog'lanmagan</option>${goals.map(g => `<option value="${g.id}"${v.goalId === g.id ? ' selected' : ''}>${LV[g.type]}: ${esc(g.title)}</option>`).join('')}</select></div></div>
<div id="f-gx" ${v.goalId ? '' : 'hidden'}><label class="pick" style="margin-top:8px"><input type="checkbox" id="f-contrib" ${v.contrib ? 'checked' : ''}><span>Maqsad taraqqiyotiga hissa qo'shsin</span></label><div id="f-valw" ${v.goalId && goalMode(v.goalId) === 'measure' ? '' : 'hidden'}><label for="f-gval">Har bajarilganda hissa (birlik)</label><input type="number" id="f-gval" min="0" step="any" inputmode="decimal" value="${v.goalValue || 1}"></div></div>
<div class="err" id="f-err" role="alert"></div><div class="sh-a"><button type="button" class="btn sec" data-act="close">Bekor qilish</button><button type="submit" class="btn">${t ? 'Saqlash' : "Qo'shish"}</button></div></form>`);
    const gsel = $('#f-goal'), gsync = () => { const gi = gsel.value; $('#f-gx').hidden = !gi; $('#f-valw').hidden = !(gi && goalMode(gi) === 'measure'); };
    gsel.addEventListener('change', () => { if (gsel.value && !(t && t.goalId === gsel.value)) $('#f-contrib').checked = true; gsync(); });
    $('#tf').addEventListener('submit', e => {
      e.preventDefault();
      const title = $('#f-title').value.trim(), desc = $('#f-desc').value.trim(), date = $('#f-date').value, cat = $('#f-cat').value.trim(), rec = $('#f-rec').value, pri = $('#f-pri .on').dataset.v, goalId = $('#f-goal').value || null, contrib = !!goalId && $('#f-contrib').checked, gval = +$('#f-gval').value;
      const err = !title ? 'Vazifa nomini kiriting.' : title.length > 120 ? 'Nom 120 belgidan oshmasin.' : !parse(date) ? "To'g'ri sanani tanlang." : (contrib && goalMode(goalId) === 'measure' && !(gval > 0)) ? "Hissa miqdori 0 dan katta bo'lsin." : '';
      if (err) { $('#f-err').textContent = err; return; }
      if (t) {
        if (t.rec !== 'none' && rec === 'none') t.done = false; if (t.rec === 'none' && rec !== 'none') t.doneDates = t.done ? [t.date] : [];
        Object.assign(t, { title, desc, date, category: cat, rec, priority: pri, goalId, contrib, goalValue: gval > 0 ? gval : 1, updatedAt: Date.now() });
      } else db.tasks.push({ id: uid(), title, desc, date, priority: pri, category: cat, rec, done: false, doneDates: [], goalId, contrib, goalValue: gval > 0 ? gval : 1, createdAt: Date.now(), updatedAt: Date.now() });
      commit(); dismiss(); toast(t ? 'Vazifa yangilandi' : "Vazifa qo'shildi");
    });
    setTimeout(() => { const i = $('#f-title'); i && !id && i.focus(); }, 320);
  }
  const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
  const priSeg = (id, cur) => `<div class="seg" id="${id}" style="margin:0">${['high', 'mid', 'low'].map(p => `<button type="button" class="${cur === p ? 'on' : ''}" data-act="pri" data-v="${p}">${PL[p]}</button>`).join('')}</div>`;
  const errBtns = (eid, label) => `<div class="err" id="${eid}" role="alert"></div><div class="sh-a"><button type="button" class="btn sec" data-act="close">Bekor qilish</button><button type="submit" class="btn">${label}</button></div>`;

  /* ---------- maqsad: tafsilot oynasi ---------- */
  function goalDetail(id) {
    const g = db.goals.find(x => x.id === id); if (!g) { closeSheet(); return; }
    curGoal = id;
    const s = gState(g), p = s.p, ms = gMs(g), t = TD(), tk = db.tasks.filter(x => x.goalId === g.id);
    const en = gEntries(g).slice().sort((a, b) => a.date < b.date ? 1 : a.date > b.date ? -1 : b.createdAt - a.createdAt);
    const fromT = g.mode === 'measure' ? gTasks(g).reduce((a, x) => a + taskVal(g, x), 0) : 0, u = esc(g.unit);
    const acts = [];
    if (!g.archived && !s.done && g.mode === 'measure') acts.push(`<button class="btn sm" data-act="entryAdd">${ic('plus', 16)}Natija</button>`);
    if (!g.archived && !p.cond) acts.push(`<button class="btn sm${s.done ? ' sec' : ''}" data-act="gDone">${s.done ? 'Qayta ochish' : 'Bajarildi'}</button>`);
    acts.push(`<button class="btn sm sec" data-act="gEdit">${ic('edit', 16)}Tahrirlash</button>`, `<button class="btn sm sec" data-act="gArch">${ic('archive', 16)}${g.archived ? 'Arxivdan chiqarish' : 'Arxivlash'}</button>`, `<button class="btn sm dng" data-act="gDel">${ic('trash', 16)}O'chirish</button>`);
    sheet(`<div class="sh-h"><h2>${esc(g.title)}</h2><button class="ib" data-act="close" aria-label="Yopish">${ic('x')}</button></div>
<div class="gm">${stBadge(g, s)}<span class="lv">${LV[g.type]}</span><span class="pri p-${g.priority}">${PL[g.priority]}</span>${g.category ? `<span>${esc(g.category)}</span>` : ''}</div>
${g.desc ? `<p class="note" style="margin:4px 0 10px">${esc(g.desc)}</p>` : ''}
<div class="row" style="align-items:center;flex-wrap:nowrap"><div class="bar" style="flex:1"><i style="width:${p.pct}%"></i></div><b class="pc">${p.pct}%</b></div>
<div class="gm" style="margin:8px 0 0"><span>${esc(p.text)}</span><span>${shortDate(g.start)} – ${shortDate(g.deadline)}</span>${s.done ? '' : `<span class="${s.overdue ? 'late' : ''}">${whenTxt(g.deadline)}</span>`}</div>
<div class="row" style="margin:14px 0 4px">${acts.join('')}</div>
<h3 class="sec-h">Bosqichlar<span class="row" style="gap:4px;flex-wrap:nowrap">${g.type !== 'd' ? `<button class="ib" data-act="breakOpen" aria-label="Bo'laklarga ajratish">${ic('layers', 19)}</button>` : ''}<button class="ib" data-act="msAdd" aria-label="Bosqich qo'shish">${ic('plus', 19)}</button></span></h3>
${ms.length ? ms.map(m => `<div class="mrow${m.done ? ' done' : ''}" data-id="${m.id}"><button class="chk${m.done ? ' on' : ''}" data-act="msToggle" aria-pressed="${m.done}" aria-label="Bosqich bajarildi">${ic('check', 16)}</button><div class="mb"><div class="tt">${esc(m.title)}</div><div class="td ${!m.done && m.date < t ? 'late' : ''}">${shortDate(m.date)}</div></div><button class="ib" data-act="msEdit" aria-label="Tahrirlash">${ic('edit', 17)}</button><button class="ib" data-act="msDel" aria-label="O'chirish">${ic('trash', 17)}</button></div>`).join('') : `<div class="note">${g.type === 'd' ? "Kunlik maqsad uchun bosqich shart emas, xohlasangiz qo'shing." : "Bosqichlar yo'q. Maqsadni kichik qadamlarga bo'ling."}</div>`}
<h3 class="sec-h">Bog'langan vazifalar<span class="row" style="gap:4px;flex-wrap:nowrap"><button class="ib" data-act="linkOpen" aria-label="Vazifa bog'lash">${ic('link', 19)}</button><button class="ib" data-act="newTaskFor" aria-label="Yangi vazifa">${ic('plus', 19)}</button></span></h3>
${tk.length ? tk.map(x => { const dn = x.rec === 'none' ? x.done : x.doneDates.includes(t), cnt = x.contrib && (g.mode === 'measure' || x.rec === 'none'); return `<div class="mrow${dn ? ' done' : ''}" data-id="${x.id}"><button class="chk${dn ? ' on' : ''}" data-act="gtToggle" aria-pressed="${dn}" aria-label="Vazifa bajarildi">${ic('check', 16)}</button><div class="mb"><div class="tt">${esc(x.title)}</div><div class="td">${x.rec === 'none' ? shortDate(x.date) : x.rec === 'daily' ? 'Har kuni' : 'Har hafta'} · ${cnt ? (g.mode === 'measure' ? `+${nf(+x.goalValue)} ${u}` : 'hisobga olinadi') : 'hisobga olinmaydi'}</div></div><button class="ib" data-act="unlink" aria-label="Bog'lanishni olib tashlash">${ic('x', 17)}</button></div>`; }).join('') : `<div class="note">Vazifa bog'lanmagan. Bog'langan vazifa bajarilganda taraqqiyot yangilanadi.</div>`}
${g.mode === 'measure' ? `<h3 class="sec-h">Natijalar tarixi<span class="note">${fromT ? `vazifalardan: ${nf(fromT)} ${u}` : ''}</span></h3>${en.length ? en.map(e => `<div class="mrow" data-id="${e.id}"><div class="mb"><div class="tt">+${nf(e.value)} ${u}</div><div class="td">${shortDate(e.date)}${e.note ? ' · ' + esc(e.note) : ''}</div></div><button class="ib" data-act="enDel" aria-label="O'chirish">${ic('trash', 17)}</button></div>`).join('') : `<div class="note">Qo'lda kiritilgan natija yo'q.</div>`}` : ''}`, 'goal');
  }

  function goalForm(id) {
    const g = id ? db.goals.find(x => x.id === id) : null, r0 = periodRange('y', TD());
    const v = g || { title: '', desc: '', category: '', type: 'y', start: r0[0], deadline: r0[1], mode: 'measure', target: '', unit: '', priority: 'mid' };
    sheet(`<form id="gf" novalidate><div class="sh-h"><h2>${g ? 'Maqsadni tahrirlash' : 'Yangi maqsad'}</h2>${xb}</div>
<label for="g-title">Maqsad nomi</label><input type="text" id="g-title" maxlength="120" value="${esc(v.title)}" placeholder="Masalan: Yilda 24 ta kitob o'qish" autocomplete="off">
<label for="g-desc">Tavsif <span class="opt">(ixtiyoriy)</span></label><textarea id="g-desc" maxlength="500" rows="2">${esc(v.desc)}</textarea>
<div class="two"><div><label for="g-type">Turi</label><select id="g-type">${Object.keys(LV).map(k => `<option value="${k}"${v.type === k ? ' selected' : ''}>${LV[k]}</option>`).join('')}</select></div><div><label for="g-cat">Kategoriya</label><input type="text" id="g-cat" maxlength="30" list="cats" value="${esc(v.category)}" autocomplete="off"></div></div>
<div class="two"><div><label for="g-start">Boshlanish</label><input type="date" id="g-start" value="${v.start}"></div><div><label for="g-end">Muddat</label><input type="date" id="g-end" value="${v.deadline}"></div></div>
<div class="lab">O'lchov turi</div><div class="seg" id="g-mode" style="margin:0"><button type="button" class="${v.mode === 'measure' ? 'on' : ''}" data-act="gmode" data-v="measure">Miqdoriy</button><button type="button" class="${v.mode === 'binary' ? 'on' : ''}" data-act="gmode" data-v="binary">Ha / yo'q</button></div>
<div id="g-mw" ${v.mode === 'measure' ? '' : 'hidden'}><div class="two"><div><label for="g-target">Maqsad miqdori</label><input type="number" id="g-target" min="0" step="any" inputmode="decimal" value="${v.target || ''}" placeholder="24"></div><div><label for="g-unit">Birlik</label><input type="text" id="g-unit" maxlength="20" list="units" value="${esc(v.unit)}" placeholder="kitob" autocomplete="off"><datalist id="units"><option value="kitob"><option value="soat"><option value="mashg'ulot"><option value="km"><option value="daqiqa"><option value="bet"></datalist></div></div>
${g ? '' : `<label for="g-init">Hozirgi qiymat <span class="opt">(ixtiyoriy)</span></label><input type="number" id="g-init" min="0" step="any" inputmode="decimal" placeholder="0">`}</div>
<div class="lab">Muhimlik</div>${priSeg('g-pri', v.priority)}
${errBtns('g-err', g ? 'Saqlash' : "Qo'shish")}</form>`);
    $('#g-type').addEventListener('change', e => { if (!g) { const r = periodRange(e.target.value, TD()); $('#g-start').value = r[0]; $('#g-end').value = r[1]; } });
    $('#gf').addEventListener('submit', e => {
      e.preventDefault();
      const title = $('#g-title').value.trim(), desc = $('#g-desc').value.trim(), type = $('#g-type').value, cat = $('#g-cat').value.trim(), start = $('#g-start').value, end = $('#g-end').value;
      const mode = $('#g-mode .on').dataset.v, target = +$('#g-target').value, unit = $('#g-unit').value.trim(), pri = $('#g-pri .on').dataset.v, initRaw = $('#g-init') ? $('#g-init').value : '', init = initRaw === '' ? 0 : +initRaw;
      const err = !title ? 'Maqsad nomini kiriting.' : !parse(start) || !parse(end) ? "Boshlanish va muddat sanalarini tanlang." : end < start ? "Muddat boshlanish sanasidan oldin bo'lishi mumkin emas."
        : mode === 'measure' && !(target > 0 && target <= 1e9) ? "Maqsad miqdori 0 dan katta son bo'lsin." : mode === 'measure' && !(init >= 0 && init <= 1e9) ? "Hozirgi qiymat manfiy bo'lishi mumkin emas." : '';
      if (err) { $('#g-err').textContent = err; return; }
      const f = { title, desc, category: cat, type, start, deadline: end, mode, target: mode === 'measure' ? target : 0, unit: mode === 'measure' ? unit : '', priority: pri, updatedAt: Date.now() };
      if (g) { Object.assign(g, f); commit(); toast('Maqsad yangilandi'); dismiss(); }
      else {
        const ng = Object.assign({ id: uid(), status: 'active', archived: false, createdAt: Date.now() }, f); db.goals.push(ng);
        if (mode === 'measure' && init > 0) db.goalEntries.push({ id: uid(), goalId: ng.id, date: TD(), value: init, note: "Boshlang'ich qiymat", createdAt: Date.now() });
        commit(); subBack = null; goalDetail(ng.id); toast("Maqsad qo'shildi");
      }
    });
    setTimeout(() => { const i = $('#g-title'); i && !id && i.focus(); }, 320);
  }

  function entryForm(gid) {
    const g = db.goals.find(x => x.id === gid); if (!g) return;
    sheet(`<form id="ef" novalidate><div class="sh-h"><h2>Natija qo'shish</h2>${xb}</div><p class="note" style="margin:0">${esc(g.title)}</p>
<label for="e-val">Qiymat${g.unit ? ', ' + esc(g.unit) : ''}</label><input type="number" id="e-val" min="0" step="any" inputmode="decimal" placeholder="1">
<label for="e-date">Sana</label><input type="date" id="e-date" value="${TD()}" max="${TD()}">
<label for="e-note">Izoh <span class="opt">(ixtiyoriy)</span></label><input type="text" id="e-note" maxlength="120" autocomplete="off">
${errBtns('e-err', "Qo'shish")}</form>`);
    $('#ef').addEventListener('submit', e => {
      e.preventDefault(); const val = +$('#e-val').value, date = $('#e-date').value, note = $('#e-note').value.trim();
      const err = !($('#e-val').value !== '' && Number.isFinite(val) && val > 0 && val <= 1e9) ? "Qiymat 0 dan katta son bo'lsin." : !parse(date) ? "To'g'ri sanani tanlang." : date > TD() ? "Kelajak sanasiga natija kiritib bo'lmaydi." : '';
      if (err) { $('#e-err').textContent = err; return; }
      db.goalEntries.push({ id: uid(), goalId: g.id, date, value: val, note, createdAt: Date.now() }); g.updatedAt = Date.now();
      commit(); dismiss(); toast("Natija qo'shildi");
    });
    setTimeout(() => { const i = $('#e-val'); i && i.focus(); }, 320);
  }

  function msForm(gid, mid) {
    const g = db.goals.find(x => x.id === gid), m = mid ? db.milestones.find(x => x.id === mid) : null; if (!g) return;
    sheet(`<form id="mf" novalidate><div class="sh-h"><h2>${m ? 'Bosqichni tahrirlash' : 'Yangi bosqich'}</h2>${xb}</div>
<label for="m-title">Bosqich nomi</label><input type="text" id="m-title" maxlength="120" value="${esc(m ? m.title : '')}" placeholder="Masalan: Yanvar: 2 ta kitob" autocomplete="off">
<label for="m-date">Sana</label><input type="date" id="m-date" value="${m ? m.date : g.deadline}">
${errBtns('m-err', m ? 'Saqlash' : "Qo'shish")}</form>`);
    $('#mf').addEventListener('submit', e => {
      e.preventDefault(); const title = $('#m-title').value.trim(), date = $('#m-date').value;
      const err = !title ? 'Bosqich nomini kiriting.' : !parse(date) ? "To'g'ri sanani tanlang." : '';
      if (err) { $('#m-err').textContent = err; return; }
      if (m) Object.assign(m, { title, date, updatedAt: Date.now() }); else db.milestones.push({ id: uid(), goalId: g.id, title, date, done: false, doneAt: 0, createdAt: Date.now(), updatedAt: Date.now() });
      commit(); dismiss(); toast(m ? 'Bosqich yangilandi' : "Bosqich qo'shildi");
    });
    setTimeout(() => { const i = $('#m-title'); i && !mid && i.focus(); }, 320);
  }

  function linkSheet(gid) {
    const g = db.goals.find(x => x.id === gid); if (!g) return;
    const list = db.tasks.filter(t => !t.goalId).sort((a, b) => a.date < b.date ? 1 : -1);
    sheet(`<div class="sh-h"><h2>Vazifa bog'lash</h2>${xb}</div><p class="note" style="margin:0 0 6px">Tanlangan vazifa bajarilganda ${g.mode === 'measure' ? "taraqqiyotga hissa qo'shadi" : 'maqsad hisobiga kiradi'}. Har vazifa faqat bitta maqsadga bog'lanadi va bir marta hisoblanadi.</p>
${list.length ? `<div class="pickbox">${list.map(t => `<label class="pick"><input type="checkbox" value="${t.id}"><span>${esc(t.title)}<small>${t.rec !== 'none' ? 'Takrorlanuvchi' : shortDate(t.date)}</small></span></label>`).join('')}</div>` : empty('tasks', "Bog'lanmagan vazifa yo'q", '<div class="note">Yangi vazifa yarating.</div>')}
${g.mode === 'measure' && list.length ? `<label for="l-val">Har bajarilganda hissa${g.unit ? ', ' + esc(g.unit) : ''}</label><input type="number" id="l-val" min="0" step="any" value="1" inputmode="decimal">` : ''}
<div class="err" id="l-err" role="alert"></div><div class="sh-a"><button type="button" class="btn sec" data-act="close">Bekor qilish</button>${list.length ? `<button type="button" class="btn" data-act="linkSave">Bog'lash</button>` : `<button type="button" class="btn" data-act="newTaskFor">Yangi vazifa</button>`}</div>`);
  }

  function breakRows(g) {
    const rows = [], n0 = () => rows.length;
    if (g.type === 'y') { let cur = g.start.slice(0, 7) + '-01'; while (cur <= g.deadline && rows.length < 24) { const y = +cur.slice(0, 4), mo = +cur.slice(5, 7) - 1, e = ymd(new Date(y, mo + 1, 0)); rows.push({ k: cap(MONTHS[mo]), date: e > g.deadline ? g.deadline : e }); cur = ymd(new Date(y, mo + 1, 1)); } }
    else if (g.type === 'm') { let cur = mondayOf(g.start), k = 1; while (cur <= g.deadline && rows.length < 6) { const e = addD(cur, 6); rows.push({ k: `${k}-hafta`, date: e > g.deadline ? g.deadline : e }); cur = addD(cur, 7); k++; } }
    else if (g.type === 'w') { for (let d = g.start; d <= g.deadline && rows.length < 14; d = addD(d, 1)) rows.push({ k: DAYS[dowOf(d)], date: d }); }
    const n = rows.length || 1, share = g.mode === 'measure' ? Math.round(g.target / n * 10) / 10 : 0;
    return rows.map(r => ({ title: g.type === 'w' ? `${g.title}: ${r.k}` : g.mode === 'measure' ? `${r.k}: ${nf(share)} ${g.unit}`.trim() : `${r.k} bosqichi`, date: r.date, value: share }));
  }
  function breakSheet(gid) {
    const g = db.goals.find(x => x.id === gid); if (!g || g.type === 'd') return;
    const rows = breakRows(g), isW = g.type === 'w', what = g.type === 'y' ? 'oylik bosqichlarga' : g.type === 'm' ? 'haftalik bosqichlarga' : 'kunlik vazifalarga';
    sheet(`<div class="sh-h"><h2>Bo'laklarga ajratish</h2>${xb}</div><p class="note" style="margin:0 0 6px">${esc(g.title)} maqsadi ${what} bo'linadi. Saqlashdan oldin nom, sana${isW && g.mode === 'measure' ? ' va hissani' : 'ni'} tahrirlang yoki keraksizini o'chirib qo'ying.${isW ? " Kunlik amallar vazifa sifatida yaratiladi va maqsadga bog'lanadi." : ''}</p>
${rows.length ? rows.map((r, i) => `<div class="brow" data-i="${i}"><input type="checkbox" checked aria-label="Qo'shish"><div class="bf"><input type="text" class="b-t" maxlength="120" value="${esc(r.title)}" aria-label="Nomi"><div class="two"><input type="date" class="b-d" value="${r.date}" aria-label="Sana">${isW && g.mode === 'measure' ? `<input type="number" class="b-v" min="0" step="any" value="${r.value}" inputmode="decimal" aria-label="Hissa">` : '<span></span>'}</div></div></div>`).join('') : `<div class="note">Bu davr uchun bo'laklar topilmadi. Sana oralig'ini tekshiring.</div>`}
<div class="err" id="b-err" role="alert"></div><div class="sh-a"><button type="button" class="btn sec" data-act="close">Bekor qilish</button>${rows.length ? `<button type="button" class="btn" data-act="breakSave">Saqlash</button>` : ''}</div>`);
  }
  function breakSave() {
    const g = db.goals.find(x => x.id === curGoal); if (!g) return; const isW = g.type === 'w'; let add = 0, bad = '';
    const rows = $$('.brow').filter(r => $('input[type=checkbox]', r).checked).map(r => ({ title: $('.b-t', r).value.trim(), date: $('.b-d', r).value, value: $('.b-v', r) ? +$('.b-v', r).value : 1 }));
    if (!rows.length) { $('#b-err').textContent = 'Kamida bitta qatorni tanlang.'; return; }
    for (const r of rows) { if (!r.title) { bad = 'Nom bo\'sh bo\'lmasin.'; break; } if (!parse(r.date)) { bad = "Sanani to'g'ri kiriting."; break; } if (isW && g.mode === 'measure' && !(r.value > 0)) { bad = "Hissa 0 dan katta bo'lsin."; break; } }
    if (bad) { $('#b-err').textContent = bad; return; }
    for (const r of rows) {
      if (isW) { if (db.tasks.some(t => t.goalId === g.id && t.date === r.date && t.title === r.title)) continue; db.tasks.push({ id: uid(), title: r.title, desc: '', date: r.date, priority: g.priority, category: g.category, rec: 'none', done: false, doneDates: [], goalId: g.id, contrib: true, goalValue: g.mode === 'measure' ? r.value : 1, createdAt: Date.now() + add, updatedAt: Date.now() }); }
      else { if (db.milestones.some(m => m.goalId === g.id && m.date === r.date && m.title === r.title)) continue; db.milestones.push({ id: uid(), goalId: g.id, title: r.title, date: r.date, done: false, doneAt: 0, createdAt: Date.now() + add, updatedAt: Date.now() }); }
      add++;
    }
    commit(); dismiss(); toast(add ? `${add} ta ${isW ? 'vazifa' : 'bosqich'} qo'shildi` : "Yangi qo'shiladigan narsa topilmadi");
  }

  /* ---------- odat: forma va tafsilot ---------- */
  function habitForm(id) {
    const h = id ? db.habits.find(x => x.id === id) : null, f = h ? h.freq : { type: 'daily', days: [1, 2, 3, 4, 5], times: 3 }, ft = f.type;
    sheet(`<form id="hf" novalidate><div class="sh-h"><h2>${h ? 'Odatni tahrirlash' : 'Yangi odat'}</h2>${xb}</div>
<label for="h-title">Odat nomi</label><input type="text" id="h-title" maxlength="80" value="${esc(h ? h.title : '')}" placeholder="Masalan: Kitob o'qish" autocomplete="off">
<label for="h-desc">Tavsif <span class="opt">(ixtiyoriy)</span></label><textarea id="h-desc" maxlength="300" rows="2">${esc(h ? h.desc : '')}</textarea>
<label for="h-cat">Kategoriya <span class="opt">(ixtiyoriy)</span></label><input type="text" id="h-cat" maxlength="30" list="cats" value="${esc(h ? h.category : '')}" autocomplete="off">
<div class="lab">Takrorlanish</div><div class="seg" id="h-freq" style="margin:0">${[['daily', 'Har kuni'], ['days', 'Hafta kunlari'], ['times', 'Haftada N marta']].map(([k, l]) => `<button type="button" class="${ft === k ? 'on' : ''}" data-act="hfreq" data-v="${k}">${l}</button>`).join('')}</div>
<div id="h-dw" ${ft === 'days' ? '' : 'hidden'}><div class="lab">Kunlarni tanlang</div><div class="days" id="h-days">${WD.map(x => `<button type="button" class="day${(f.days || []).includes(x) ? ' on' : ''}" data-act="hday" data-v="${x}" aria-pressed="${(f.days || []).includes(x)}">${DSH[x]}</button>`).join('')}</div></div>
<div id="h-tw" ${ft === 'times' ? '' : 'hidden'}><label for="h-times">Haftada necha marta</label><select id="h-times">${[1, 2, 3, 4, 5, 6, 7].map(n => `<option value="${n}"${(f.times || 3) === n ? ' selected' : ''}>${n} marta</option>`).join('')}</select></div>
${errBtns('h-err', h ? 'Saqlash' : "Qo'shish")}</form>`);
    $('#hf').addEventListener('submit', e => {
      e.preventDefault(); const title = $('#h-title').value.trim(), type = $('#h-freq .on').dataset.v, days = $$('#h-days .on').map(b => +b.dataset.v), times = +$('#h-times').value;
      const err = !title ? 'Odat nomini kiriting.' : type === 'days' && !days.length ? 'Kamida bitta hafta kunini tanlang.' : '';
      if (err) { $('#h-err').textContent = err; return; }
      const freq = { type, days: type === 'days' ? days.sort() : [], times: type === 'times' ? times : 0 }, o = { title, desc: $('#h-desc').value.trim(), category: $('#h-cat').value.trim(), freq, updatedAt: Date.now() };
      if (h) Object.assign(h, o); else { const nh = Object.assign({ id: uid(), start: TD(), pauses: [], createdAt: Date.now() }, o); db.habits.push(nh); db.habitLogs[nh.id] = []; }
      commit(); dismiss(); toast(h ? 'Odat yangilandi' : "Odat qo'shildi");
    });
    setTimeout(() => { const i = $('#h-title'); i && !id && i.focus(); }, 320);
  }
  function calGrid(h) {
    const [y, m] = calMonth.split('-').map(Number), lead = (parse(`${calMonth}-01`).getDay() + 6) % 7, n = new Date(y, m, 0).getDate(), t = TD();
    let c = DSH_M.map(x => `<b>${x}</b>`).join('') + '<span></span>'.repeat(lead);
    for (let i = 1; i <= n; i++) { const d = `${calMonth}-${pad(i)}`; c += `<button class="cd ${hDayState(h, d)}${d === t ? ' today' : ''}" data-act="calDay" data-d="${d}" ${d > t ? 'disabled' : ''} aria-label="${shortDate(d)}: ${hDoneOn(h, d) ? 'bajarilgan' : 'bajarilmagan'}">${i}</button>`; }
    return `<div class="cal">${c}</div>`;
  }
  function habitDetail(id) {
    const h = db.habits.find(x => x.id === id); if (!h) { closeSheet(); return; }
    curHabit = id; if (!calMonth) calMonth = TD().slice(0, 7);
    const st = hStats(h), paused = hPausedOn(h, TD()), isT = h.freq.type === 'times', [y, m] = calMonth.split('-').map(Number), un = isT ? 'hafta' : 'kun', atMax = calMonth >= TD().slice(0, 7);
    sheet(`<div class="sh-h"><h2>${esc(h.title)}</h2><button class="ib" data-act="close" aria-label="Yopish">${ic('x')}</button></div>
<div class="gm"><span class="lv">${schedText(h)}</span>${h.category ? `<span>${esc(h.category)}</span>` : ''}${paused ? `<span class="bd">To'xtatilgan</span>` : ''}${isT ? `<span>Shu hafta: ${hWeekCount(h)}/${h.freq.times}</span>` : ''}</div>
${h.desc ? `<p class="note" style="margin:4px 0 8px">${esc(h.desc)}</p>` : ''}
<div class="kp4"><div class="kpi"><b>${st.cur}</b><span>Joriy seriya (${un})</span></div><div class="kpi"><b>${st.best}</b><span>Eng yaxshi (${un})</span></div><div class="kpi"><b>${st.r7 == null ? '—' : st.r7 + '%'}</b><span>7 kun</span></div><div class="kpi"><b>${st.r30 == null ? '—' : st.r30 + '%'}</b><span>30 kun</span></div></div>
<div class="calh"><button class="ib" data-act="calPrev" aria-label="Oldingi oy">${ic('chevL', 20)}</button><b>${cap(MONTHS[m - 1])} ${y}</b><button class="ib" data-act="calNext" aria-label="Keyingi oy" ${atMax ? 'disabled' : ''}>${ic('chevR', 20)}</button></div>
${calGrid(h)}
<div class="leg2"><span><i class="done"></i>Bajarilgan</span><span><i class="miss"></i>O'tkazilgan</span><span><i class="due"></i>Rejada</span><span><i class="pause"></i>To'xtatilgan</span></div>
<p class="note" style="margin:6px 0 0">Kunni bosib yozuvni qo'shing yoki bekor qiling.${isT ? '' : " Rejalashtirilmagan kunlar seriyani uzmaydi."}</p>
<div class="row" style="margin-top:14px"><button class="btn sm sec" data-act="hEdit">${ic('edit', 16)}Tahrirlash</button><button class="btn sm sec" data-act="hPause">${ic(paused ? 'play' : 'pause', 16)}${paused ? 'Davom ettirish' : "To'xtatish"}</button><button class="btn sm dng" data-act="hDel">${ic('trash', 16)}O'chirish</button></div>`, 'habit');
  }

  /* ---------- asosiy chizish va hodisalar ---------- */
  const VIEWS = { home: vHome, tasks: vTasks, goals: vGoals, stats: vStats, settings: vSettings };
  function render() {
    if (!VIEWS[ui.tab]) ui.tab = 'home';
    $('#view').innerHTML = VIEWS[ui.tab]();
    $('#nav').innerHTML = TABS.map(([k, l, i]) => `<button data-act="nav" data-v="${k}" class="${k === ui.tab ? 'on' : ''}" ${k === ui.tab ? 'aria-current="page"' : ''}>${ic(i, 22)}<span>${l}</span></button>`).join('');
    const fab = $('#fab'), show = ui.tab === 'home' || ui.tab === 'tasks' || ui.tab === 'goals';
    fab.hidden = !show; fab.innerHTML = ic('plus', 26); fab.setAttribute('aria-label', ui.tab === 'goals' ? (ui.gtab === 'goals' ? "Maqsad qo'shish" : "Odat qo'shish") : "Vazifa qo'shish");
    const th = db.settings.theme; document.documentElement.dataset.theme = th; const mt = $('meta[name=theme-color]'); if (mt) mt.content = th === 'light' ? '#f1f5f2' : '#0c110f';
  }
  const commit = () => { save(); render(); refreshSheet(); };
  function go(tab) { if (location.hash !== '#/' + tab) location.hash = '#/' + tab; else render(); }
  function fromHash() { const t = (location.hash.match(/^#\/(\w+)/) || [])[1]; ui.tab = VIEWS[t] ? t : 'home'; render(); window.scrollTo(0, 0); }
  window.addEventListener('hashchange', fromHash);

  document.addEventListener('click', e => {
    const el = e.target.closest('[data-act]'); if (!el) return;
    const row = el.closest('[data-id]'), id = el.dataset.id || (row && row.dataset.id), d = el.dataset.d || (row && row.dataset.d), v = el.dataset.v, a = el.dataset.act;
    const task = () => db.tasks.find(x => x.id === id);
    const gid = (id && db.goals.some(x => x.id === id)) ? id : curGoal, hid = (id && db.habits.some(x => x.id === id)) ? id : curHabit;
    const A = {
      nav: () => go(v), close: dismiss, askNo: () => { const b = askBack; askBack = null; b ? b() : closeSheet(); }, askYes: () => { const f = askYes; closeSheet(); f && f(); },
      fab: () => ui.tab === 'goals' ? (ui.gtab === 'goals' ? goalForm() : habitForm()) : taskForm(),
      addTask: () => taskForm(), addGoal: () => goalForm(), addHabit: () => habitForm(), goHabits: () => { ui.gtab = 'habits'; go('goals'); },
      pri: () => { $$('button', el.parentElement).forEach(b => b.classList.toggle('on', b === el)); },
      scope: () => { ui.scope = v; render(); }, fs: () => { ui.fs = v; render(); }, fp: () => { ui.fp = v; render(); }, clearF: () => { ui.fs = ui.fp = 'all'; render(); },
      gtab: () => { ui.gtab = v; render(); }, gl: () => { ui.gl = v; render(); },
      toggle: () => { const t = task(); if (t) { toggleTask(t, d || TD()); commit(); } },
      edit: () => taskForm(id),
      del: () => { const t = task(); if (t) ask("Vazifani o'chirish", `"${esc(t.title)}" butunlay o'chiriladi.`, "O'chirish", () => { db.tasks = db.tasks.filter(x => x.id !== t.id); commit(); toast("Vazifa o'chirildi"); }); },
      gOpen: () => { subBack = null; goalDetail(id); },
      entryAdd: () => { const g = db.goals.find(x => x.id === gid); if (!g) return; subBack = sheetKind === 'goal' ? () => goalDetail(g.id) : null; entryForm(g.id); },
      gEdit: () => { subBack = () => goalDetail(curGoal); goalForm(curGoal); },
      gDone: () => { const g = db.goals.find(x => x.id === gid); if (!g) return; g.status = g.status === 'done' ? 'active' : 'done'; g.updatedAt = Date.now(); commit(); toast(g.status === 'done' ? 'Maqsad bajarildi deb belgilandi' : 'Maqsad qayta ochildi'); },
      gArch: () => { const g = db.goals.find(x => x.id === gid); if (!g) return; g.archived = !g.archived; g.updatedAt = Date.now(); commit(); toast(g.archived ? 'Maqsad arxivlandi' : 'Maqsad arxivdan chiqarildi'); },
      gDel: () => { const g = db.goals.find(x => x.id === gid); if (!g) return; ask("Maqsadni o'chirish", `"${esc(g.title)}", uning bosqichlari va natijalari butunlay o'chiriladi. Bog'langan vazifalar saqlanadi.`, "O'chirish", () => { db.goals = db.goals.filter(x => x.id !== g.id); db.milestones = db.milestones.filter(m => m.goalId !== g.id); db.goalEntries = db.goalEntries.filter(e => e.goalId !== g.id); db.tasks.forEach(t => { if (t.goalId === g.id) { t.goalId = null; t.contrib = false; } }); curGoal = null; commit(); toast("Maqsad o'chirildi"); }, () => goalDetail(g.id)); },
      enDel: () => { const e = db.goalEntries.find(x => x.id === id); if (!e) return; ask("Natijani o'chirish", `+${nf(e.value)} (${shortDate(e.date)}) yozuvi o'chiriladi.`, "O'chirish", () => { db.goalEntries = db.goalEntries.filter(x => x.id !== e.id); commit(); goalDetail(curGoal); toast("Natija o'chirildi"); }, () => goalDetail(curGoal)); },
      msToggle: () => { const m = db.milestones.find(x => x.id === id); if (!m) return; m.done = !m.done; m.doneAt = m.done ? Date.now() : 0; m.updatedAt = Date.now(); commit(); },
      msAdd: () => { subBack = () => goalDetail(curGoal); msForm(curGoal); },
      msEdit: () => { subBack = () => goalDetail(curGoal); msForm(curGoal, id); },
      msDel: () => { const m = db.milestones.find(x => x.id === id); if (!m) return; ask("Bosqichni o'chirish", `"${esc(m.title)}" o'chiriladi.`, "O'chirish", () => { db.milestones = db.milestones.filter(x => x.id !== m.id); commit(); goalDetail(curGoal); toast("Bosqich o'chirildi"); }, () => goalDetail(curGoal)); },
      linkOpen: () => { subBack = () => goalDetail(curGoal); linkSheet(curGoal); },
      linkSave: () => {
        const g = db.goals.find(x => x.id === curGoal); if (!g) return; const ids = $$('.pickbox input:checked').map(i => i.value), vi = $('#l-val'), val = vi ? +vi.value : 1;
        if (!ids.length) { $('#l-err').textContent = 'Kamida bitta vazifani tanlang.'; return; }
        if (g.mode === 'measure' && !(val > 0)) { $('#l-err').textContent = "Hissa 0 dan katta bo'lsin."; return; }
        db.tasks.forEach(t => { if (ids.includes(t.id) && !t.goalId) { t.goalId = g.id; t.contrib = true; t.goalValue = val > 0 ? val : 1; t.updatedAt = Date.now(); } });
        commit(); dismiss(); toast(`${ids.length} ta vazifa bog'landi`);
      },
      newTaskFor: () => { subBack = () => goalDetail(curGoal); taskForm(null, curGoal); },
      unlink: () => { const t = task(); if (!t) return; t.goalId = null; t.contrib = false; t.updatedAt = Date.now(); commit(); toast("Bog'lanish olib tashlandi"); },
      gtToggle: () => { const t = task(); if (t) { toggleTask(t, TD()); commit(); } },
      breakOpen: () => { subBack = () => goalDetail(curGoal); breakSheet(curGoal); },
      breakSave: () => breakSave(),
      gmode: () => { $$('#g-mode button').forEach(b => b.classList.toggle('on', b === el)); $('#g-mw').hidden = v !== 'measure'; },
      gs: () => { ui.gs = v; render(); },
      goOver: () => { ui.gtab = 'goals'; ui.gs = 'overdue'; ui.gl = 'all'; go('goals'); },
      hOpen: () => { subBack = null; calMonth = TD().slice(0, 7); habitDetail(id); },
      hToggle: () => { const h = db.habits.find(x => x.id === id); if (h && hRecord(h, TD())) commit(); },
      hEdit: () => { subBack = () => habitDetail(curHabit); habitForm(curHabit); },
      hPause: () => {
        const h = db.habits.find(x => x.id === hid); if (!h) return; const t = TD(), op = h.pauses.find(p => !p.to);
        if (op) { if (op.from >= t) h.pauses = h.pauses.filter(p => p !== op); else op.to = addD(t, -1); } else h.pauses.push({ from: t, to: null });
        h.updatedAt = Date.now(); commit(); toast(hPausedOn(h, t) ? "Odat to'xtatildi" : 'Odat davom ettirildi');
      },
      hDel: () => { const h = db.habits.find(x => x.id === hid); if (!h) return; ask("Odatni o'chirish", `"${esc(h.title)}" va uning butun tarixi o'chiriladi. Bu amalni qaytarib bo'lmaydi.`, "O'chirish", () => { db.habits = db.habits.filter(x => x.id !== h.id); delete db.habitLogs[h.id]; curHabit = null; commit(); toast("Odat o'chirildi"); }, () => habitDetail(h.id)); },
      calPrev: () => { const [y, m] = calMonth.split('-').map(Number); calMonth = ymd(new Date(y, m - 2, 1)).slice(0, 7); habitDetail(curHabit); },
      calNext: () => { const [y, m] = calMonth.split('-').map(Number), n = ymd(new Date(y, m, 1)).slice(0, 7); if (n <= TD().slice(0, 7)) { calMonth = n; habitDetail(curHabit); } },
      calDay: () => { const h = db.habits.find(x => x.id === curHabit); if (h && d && hRecord(h, d)) commit(); },
      hfreq: () => { $$('#h-freq button').forEach(b => b.classList.toggle('on', b === el)); $('#h-dw').hidden = v !== 'days'; $('#h-tw').hidden = v !== 'times'; },
      hday: () => { el.classList.toggle('on'); el.setAttribute('aria-pressed', el.classList.contains('on')); },
      install: async () => { if (!installEv) return; installEv.prompt(); try { const r = await installEv.userChoice; toast(r.outcome === 'accepted' ? "Ilova o'rnatilmoqda" : "O'rnatish bekor qilindi"); } catch (x) { } installEv = null; render(); },
      installDismiss: () => { db.settings.installDismissed = true; commit(); },
      fsToggle: () => { const dc = document; if (dc.fullscreenElement) dc.exitFullscreen().catch(() => { }); else if (dc.documentElement.requestFullscreen) dc.documentElement.requestFullscreen({ navigationUI: 'hide' }).catch(() => toast("To'liq ekranga o'tib bo'lmadi", 'err')); },
      focus: focusSheet,
      fmin: () => { if (F.on) return; F.min = +v; F.left = F.min * 60; focusSheet(); },
      fToggle: () => { if (F.on) { F.left = Math.max(1, Math.ceil((F.end - Date.now()) / 1000)); F.on = false; } else { F.end = Date.now() + F.left * 1000; F.on = true; } focusSheet(); render(); },
      fReset: () => { F.on = false; F.left = F.min * 60; focusSheet(); render(); },
      export: () => { try { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(db, null, 1)], { type: 'application/json' })); a.download = `kunlik-nusxa-${TD()}.json`; document.body.appendChild(a); a.click(); a.remove(); toast('Nusxa yuklab olindi'); } catch (x) { toast("Nusxa olib bo'lmadi"); } },
      wipe: () => ask("Hammasini o'chirish", "Barcha vazifa, maqsad, odat va sozlamalar o'chadi. Bu amalni qaytarib bo'lmaydi.", "Hammasini o'chirish", () => { db = blank(); F.on = false; F.min = 25; F.left = 1500; commit(); toast("Barcha ma'lumot o'chirildi"); })
    };
    if (A[a]) { if (el.tagName === 'A') e.preventDefault(); A[a](); }
  });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && sheetKind) dismiss(); if ((e.key === 'Enter' || e.key === ' ') && e.target.classList && e.target.classList.contains('tb')) { e.preventDefault(); e.target.click(); } });
  document.addEventListener('change', e => {
    const t = e.target;
    if (t.dataset.set) {
      const k = t.dataset.set; let val = t.value;
      if (k === 'name') val = val.trim().slice(0, 40);
      if (k === 'focusMin') { val = Math.min(120, Math.max(5, Math.round(+val) || 25)); t.value = val; if (!F.on) { F.min = val; F.left = val * 60; } }
      db.settings[k] = val; save(); if (k === 'theme') render(); toast('Saqlandi');
    } else if (t.dataset.gp) { const g = db.goals.find(x => x.id === t.dataset.gp); if (g) { g.progress = +t.value; g.updatedAt = Date.now(); commit(); } }
    else if (t.id === 's-imp' && t.files[0]) {
      const r = new FileReader();
      r.onload = () => { try { const d = JSON.parse(r.result); if (!d || !Array.isArray(d.tasks)) throw 0; const n = norm(d); ask('Nusxani tiklash', `Joriy ma'lumotlar almashtiriladi: ${n.tasks.length} vazifa, ${n.goals.length} maqsad, ${n.habits.length} odat.`, 'Tiklash', () => { db = n; commit(); toast('Ma\'lumotlar tiklandi'); }); } catch (x) { toast("Fayl noto'g'ri yoki buzilgan"); } t.value = ''; };
      r.onerror = () => toast("Faylni o'qib bo'lmadi"); r.readAsText(t.files[0]);
    }
  });
  document.addEventListener('visibilitychange', () => { if (!document.hidden && !sheetKind) render(); });

  if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) navigator.serviceWorker.register('sw.js').catch(() => { });
  window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); installEv = e; if (ui.tab === 'home' || ui.tab === 'settings') render(); });
  window.addEventListener('appinstalled', () => { installEv = null; toast("Kunlik o'rnatildi"); render(); });
  document.addEventListener('fullscreenchange', () => { if (ui.tab === 'settings') render(); });
  const vv = () => { const v = window.visualViewport; if (!v) return; const st = document.documentElement.style; st.setProperty('--vh', v.height + 'px'); st.setProperty('--vt', v.offsetTop + 'px'); };
  if (window.visualViewport) { visualViewport.addEventListener('resize', vv); visualViewport.addEventListener('scroll', vv); vv(); }
  document.addEventListener('focusin', e => { const t = e.target; if (t.closest && t.closest('.sheet') && /INPUT|TEXTAREA|SELECT/.test(t.tagName)) setTimeout(() => t.scrollIntoView({ block: 'center', behavior: 'smooth' }), 320); });
  fromHash();
  if (bootMsg) toast(bootMsg, 'err');
  if (/[?&]add=task\b/.test(location.search)) { window.history.replaceState(null, '', location.pathname + location.hash); taskForm(); }
  window.__kunlik = { get db() { return db; }, TD, gProg, gState, hStats, habitsToday, hSched };
})();
