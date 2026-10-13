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
    repeatH: '<path d="M4 12h16M4 6h16M4 18h10"/>', inbox: '<path d="M3 13l3-8h12l3 8v6H3z"/><path d="M3 13h5l1 3h6l1-3h5"/>'
  };
  const ic = (n, s = 22) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${IC[n] || ''}</svg>`;

  /* ---------- saqlash (Store) ---------- */
  const KEY = 'kunlik.v1';
  let mem = false, bootMsg = '';
  const blank = () => ({ v: 1, settings: { name: '', theme: 'dark', focusMin: 25 }, tasks: [], goals: [], habits: [], habitLogs: {}, focus: [] });
  function norm(d) {
    const b = blank(); if (!d || typeof d !== 'object') return b;
    const arr = x => Array.isArray(x) ? x : [];
    const s = Object.assign(b.settings, d.settings && typeof d.settings === 'object' ? d.settings : {});
    s.name = String(s.name || '').slice(0, 40); s.theme = s.theme === 'light' ? 'light' : 'dark'; s.focusMin = Math.min(120, Math.max(5, Math.round(+s.focusMin) || 25));
    b.settings = s;
    b.tasks = arr(d.tasks).filter(t => t && t.id && parse(t.date)).map(t => ({
      id: String(t.id), title: String(t.title || '').slice(0, 120), desc: String(t.desc || '').slice(0, 500), date: t.date,
      priority: RANK[t.priority] != null ? t.priority : 'mid', category: String(t.category || '').slice(0, 30),
      rec: t.rec === 'daily' || t.rec === 'weekly' ? t.rec : 'none', done: !!t.done, doneDates: arr(t.doneDates).filter(x => parse(x)),
      goalId: t.goalId || null, createdAt: +t.createdAt || Date.now(), updatedAt: +t.updatedAt || Date.now()
    }));
    b.goals = arr(d.goals).filter(g => g && g.id && LV[g.level]).map(g => ({
      id: String(g.id), title: String(g.title || '').slice(0, 120), level: g.level, period: String(g.period || ''),
      progress: Math.min(100, Math.max(0, Math.round(+g.progress) || 0)), createdAt: +g.createdAt || Date.now(), updatedAt: +g.updatedAt || Date.now()
    }));
    b.habits = arr(d.habits).filter(h => h && h.id).map(h => ({ id: String(h.id), title: String(h.title || '').slice(0, 80), createdAt: +h.createdAt || Date.now(), updatedAt: +h.updatedAt || Date.now() }));
    if (d.habitLogs && typeof d.habitLogs === 'object') for (const k of Object.keys(d.habitLogs)) if (b.habits.some(h => h.id === k)) b.habitLogs[k] = arr(d.habitLogs[k]).filter(x => parse(x));
    b.focus = arr(d.focus).filter(f => f && parse(f.date) && +f.min > 0).map(f => ({ id: String(f.id || uid()), date: f.date, min: Math.round(+f.min), at: +f.at || 0 }));
    return b;
  }
  function load() {
    let raw = null;
    try { raw = localStorage.getItem(KEY); } catch (e) { mem = true; return blank(); }
    if (!raw) return blank();
    try { return norm(JSON.parse(raw)); } catch (e) {
      try { localStorage.setItem(KEY + '.bad', raw); } catch (_) { }
      bootMsg = "Saqlangan ma'lumotni o'qib bo'lmadi. Nusxasi alohida saqlandi, ilova bo'sh holatda ochildi.";
      return blank();
    }
  }
  let db = load();
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
  const hDone = (h, d) => (db.habitLogs[h.id] || []).includes(d);
  function hStreak(h) { let d = TD(), n = 0; if (!hDone(h, d)) d = addD(d, -1); while (hDone(h, d)) { n++; d = addD(d, -1); } return n; }
  function goalProg(g) {
    const l = db.tasks.filter(t => t.goalId === g.id && t.rec === 'none');
    return l.length ? { pct: Math.round(l.filter(t => t.done).length / l.length * 100), n: l.length, done: l.filter(t => t.done).length, linked: true } : { pct: g.progress, linked: false };
  }
  function dayStreak(H) { let n = 0; for (let i = H.length - 1; i >= 0; i--) { const x = H[i]; if (x.total > 0 && x.pct >= 70) n++; else if (i !== H.length - 1) break; } return n; }
  const focusOn = d => db.focus.filter(f => f.date === d).reduce((a, f) => a + f.min, 0);

  /* ---------- holat va chizish ---------- */
  const ui = { tab: 'home', scope: 'today', fs: 'all', fp: 'all', gtab: 'goals', gl: 'all' };
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

  function vHome() {
    const t = TD(), s = dayStat(t), H = history(7), hr = new Date().getHours();
    const gr = hr >= 5 && hr < 11 ? 'Xayrli tong' : hr >= 11 && hr < 17 ? 'Xayrli kun' : hr >= 17 && hr < 22 ? 'Xayrli kech' : 'Xayrli tun';
    const nm = db.settings.name ? `, ${esc(db.settings.name)}` : '';
    const msg = !s.total ? "Bugun uchun vazifa yo'q" : s.pct === 100 ? 'Ajoyib! Bugungi barcha vazifalar bajarildi' : s.pct >= 50 ? "Yaxshi ketyapsiz, oz qoldi" : s.done ? 'Yaxshi boshladingiz, davom eting' : 'Birinchi vazifadan boshlang';
    const todayAll = tasksOn(t), shown = [...todayAll.filter(x => !isDone(x, t)), ...todayAll.filter(x => isDone(x, t))].slice(0, 5);
    const hb = db.habits, hn = hb.filter(h => hDone(h, t)).length;
    return `<div class="view"><div class="top"><div class="brand"><img src="icon-192.png" alt=""><div><b>Kunlik</b><span>Bugungi intizom. Ertangi natija.</span></div></div></div>
<div class="greet"><h1>${gr}${nm}</h1><p>${longDate(t)}, ${parse(t).getFullYear()}</p></div>
<div class="card hero">${ring(s.pct, 120, 12, { html: `${s.pct}%<small>bugun</small>`, id: 'homeRing' })}<div><div class="big">${s.done} / ${s.total}</div><div class="sm">vazifa bajarildi</div><div class="sm" style="margin-top:10px;font-weight:600;opacity:1">${msg}</div></div></div>
<div class="card"><h3>Ustuvor vazifalar<button class="lnk" data-act="nav" data-v="tasks">Hammasi</button></h3>
${s.total === 0 ? empty('inbox', "Bugun vazifa yo'q", `<div class="note">Birinchi vazifangizni qo'shing.</div>`, addBtn('addTask', "Vazifa qo'shish")) : shown.map(x => taskRow(x, t)).join('')}</div>
<div class="card"><h3>Odatlar${hb.length ? `<span class="note">${hn} / ${hb.length} bugun</span>` : ''}</h3>
${hb.length ? `<div class="hchips">${hb.map(h => `<button class="hc${hDone(h, t) ? ' on' : ''}" data-act="hToggle" data-id="${h.id}" aria-pressed="${hDone(h, t)}">${ic('check', 15)}${esc(h.title)}</button>`).join('')}</div>` : empty('repeat', "Odatlar yo'q", `<div class="note">Har kunlik odat qo'shib, ketma-ketlikni kuzating.</div>`, `<button class="btn sec" data-act="goHabits">Odat qo'shish</button>`)}</div>
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

  function vGoals() {
    const t = TD(), seg = (k, l) => `<button class="${ui.gtab === k ? 'on' : ''}" data-act="gtab" data-v="${k}">${l}</button>`;
    let body;
    if (ui.gtab === 'goals') {
      const chip = (v, l) => `<button class="chip${ui.gl === v ? ' on' : ''}" data-act="gl" data-v="${v}">${l}</button>`;
      const list = db.goals.filter(g => ui.gl === 'all' || g.level === ui.gl).sort((a, b) => 'ymwd'.indexOf(a.level) - 'ymwd'.indexOf(b.level) || (a.period < b.period ? 1 : -1));
      body = `<div class="chips">${chip('all', 'Barchasi')}${Object.keys(LV).map(k => chip(k, LV[k])).join('')}</div>` + (list.length ? `<div class="card" style="padding:6px 16px">${list.map(g => {
        const p = goalProg(g), cur = g.period === periodKey(g.level, t);
        return `<div class="goal" data-id="${g.id}"><div class="gt"><div class="nm">${esc(g.title)}</div><button class="ib" data-act="gEdit" aria-label="Tahrirlash">${ic('edit', 17)}</button><button class="ib" data-act="gDel" aria-label="O'chirish">${ic('trash', 17)}</button></div>
<div class="gm"><span class="lv">${LV[g.level]}</span><span>${periodLabel(g.level, g.period)}${cur ? '' : ' (o\'tgan davr)'}</span><span>${p.linked ? `${p.done}/${p.n} vazifa` : 'qo\'lda belgilanadi'}</span></div>
<div class="row" style="align-items:center;flex-wrap:nowrap"><div class="bar" style="flex:1"><i style="width:${p.pct}%"></i></div><b style="font-size:14px;min-width:40px;text-align:right">${p.pct}%</b></div>${p.linked ? '' : `<input type="range" min="0" max="100" step="5" value="${g.progress}" data-gp="${g.id}" aria-label="Taraqqiyot">`}</div>`;
      }).join('')}</div>` : empty('target', "Maqsadlar yo'q", `<div class="note">Yillik, oylik, haftalik yoki kunlik maqsad yarating. Vazifa qo'shganda uni maqsadga bog'lasangiz, taraqqiyot o'zi hisoblanadi.</div>`, addBtn('addGoal', "Maqsad qo'shish")));
    } else {
      const days = Array.from({ length: 7 }, (_, i) => addD(t, i - 6));
      body = db.habits.length ? `<div class="card" style="padding:6px 16px">${db.habits.map(h => { const st = hStreak(h); return `<div class="habit" data-id="${h.id}"><button class="chk${hDone(h, t) ? ' on' : ''}" data-act="hToggle" aria-pressed="${hDone(h, t)}" aria-label="Bugun bajarildi">${ic('check', 16)}</button><div class="nm">${esc(h.title)}<div class="dots">${days.map(d => `<i class="${hDone(h, d) ? 'on' : ''}"></i>`).join('')}</div></div><span class="fl">${ic('flame', 15)}${st}</span><button class="ib" data-act="hEdit" aria-label="Tahrirlash">${ic('edit', 17)}</button><button class="ib" data-act="hDel" aria-label="O'chirish">${ic('trash', 17)}</button></div>`; }).join('')}</div>` : empty('repeat', "Odatlar yo'q", `<div class="note">Har kuni takrorlanadigan odat qo'shing va ketma-ket kunlarni kuzating.</div>`, addBtn('addHabit', "Odat qo'shish"));
    }
    return `<div class="view"><div class="pg"><h1>Maqsadlar</h1><p>Uzoq muddatli maqsadlar va kunlik odatlar</p></div><div class="seg">${seg('goals', 'Maqsadlar')}${seg('habits', 'Odatlar')}</div>${body}</div>`;
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
  let sheetKind = null, toastT;
  function sheet(html, kind) {
    const r = $('#sheet-root'); r.innerHTML = `<div class="back" data-act="close"></div><div class="sheet" role="dialog" aria-modal="true">${html}</div>`;
    document.body.classList.add('lock'); sheetKind = kind || 'form'; r.classList.remove('open'); void r.offsetWidth; r.classList.add('open');
  }
  function closeSheet() { const r = $('#sheet-root'); r.classList.remove('open'); r.innerHTML = ''; document.body.classList.remove('lock'); sheetKind = null; }
  function toast(m) { const t = $('#toast'); t.textContent = m; t.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 2600); }
  let askYes = null;
  function ask(title, text, label, yes) {
    askYes = yes;
    sheet(`<div class="sh-h"><h2>${title}</h2></div><p class="note">${text}</p><div class="sh-a"><button class="btn sec" data-act="close">Bekor qilish</button><button class="btn dng" data-act="askYes">${label}</button></div>`, 'ask');
  }

  /* ---------- formalar ---------- */
  const xb = `<button type="button" class="ib" data-act="close" aria-label="Yopish">${ic('x')}</button>`;
  function taskForm(id) {
    const t = id ? db.tasks.find(x => x.id === id) : null, v = t || { title: '', desc: '', date: TD(), priority: 'mid', category: '', rec: 'none', goalId: '' };
    const goals = db.goals.slice().sort((a, b) => 'ymwd'.indexOf(a.level) - 'ymwd'.indexOf(b.level));
    sheet(`<form id="tf" novalidate><div class="sh-h"><h2>${t ? 'Vazifani tahrirlash' : 'Yangi vazifa'}</h2>${xb}</div>
<label for="f-title">Nomi</label><input type="text" id="f-title" maxlength="120" value="${esc(v.title)}" placeholder="Masalan: 20 daqiqa kitob o'qish" autocomplete="off">
<label for="f-desc">Tavsif <span class="opt">(ixtiyoriy)</span></label><textarea id="f-desc" maxlength="500" rows="2">${esc(v.desc)}</textarea>
<div class="two"><div><label for="f-date">Sana</label><input type="date" id="f-date" value="${v.date}"></div><div><label for="f-rec">Takrorlanish</label><select id="f-rec"><option value="none"${v.rec === 'none' ? ' selected' : ''}>Takrorlanmaydi</option><option value="daily"${v.rec === 'daily' ? ' selected' : ''}>Har kuni</option><option value="weekly"${v.rec === 'weekly' ? ' selected' : ''}>Har hafta</option></select></div></div>
<div class="lab">Muhimlik</div><div class="seg" id="f-pri" style="margin:0">${['high', 'mid', 'low'].map(p => `<button type="button" class="${v.priority === p ? 'on' : ''}" data-act="pri" data-v="${p}">${PL[p]}</button>`).join('')}</div>
<div class="two"><div><label for="f-cat">Kategoriya <span class="opt">(ixtiyoriy)</span></label><input type="text" id="f-cat" maxlength="30" list="cats" value="${esc(v.category)}" autocomplete="off"><datalist id="cats"><option value="Shaxsiy"><option value="Ish"><option value="O'qish"><option value="Sog'liq"><option value="Moliya"></datalist></div>
<div><label for="f-goal">Maqsad <span class="opt">(ixtiyoriy)</span></label><select id="f-goal"><option value="">Bog'lanmagan</option>${goals.map(g => `<option value="${g.id}"${v.goalId === g.id ? ' selected' : ''}>${LV[g.level]}: ${esc(g.title)}</option>`).join('')}</select></div></div>
<div class="err" id="f-err" role="alert"></div><div class="sh-a"><button type="button" class="btn sec" data-act="close">Bekor qilish</button><button type="submit" class="btn">${t ? 'Saqlash' : "Qo'shish"}</button></div></form>`);
    $('#tf').addEventListener('submit', e => {
      e.preventDefault();
      const title = $('#f-title').value.trim(), desc = $('#f-desc').value.trim(), date = $('#f-date').value, cat = $('#f-cat').value.trim(), rec = $('#f-rec').value, pri = $('#f-pri .on').dataset.v, goalId = $('#f-goal').value || null;
      const err = !title ? 'Vazifa nomini kiriting.' : title.length > 120 ? 'Nom 120 belgidan oshmasin.' : !parse(date) ? "To'g'ri sanani tanlang." : '';
      if (err) { $('#f-err').textContent = err; return; }
      if (t) {
        if (t.rec !== 'none' && rec === 'none') t.done = false; if (t.rec === 'none' && rec !== 'none') t.doneDates = t.done ? [t.date] : [];
        Object.assign(t, { title, desc, date, category: cat, rec, priority: pri, goalId, updatedAt: Date.now() });
      } else db.tasks.push({ id: uid(), title, desc, date, priority: pri, category: cat, rec, done: false, doneDates: [], goalId, createdAt: Date.now(), updatedAt: Date.now() });
      commit(); closeSheet(); toast(t ? 'Vazifa yangilandi' : "Vazifa qo'shildi");
    });
    setTimeout(() => { const i = $('#f-title'); i && !id && i.focus(); }, 320);
  }
  function goalForm(id) {
    const g = id ? db.goals.find(x => x.id === id) : null, v = g || { title: '', level: 'w', progress: 0 };
    sheet(`<form id="gf" novalidate><div class="sh-h"><h2>${g ? 'Maqsadni tahrirlash' : 'Yangi maqsad'}</h2>${xb}</div>
<label for="g-title">Maqsad</label><input type="text" id="g-title" maxlength="120" value="${esc(v.title)}" placeholder="Masalan: 12 ta kitob o'qish" autocomplete="off">
<label for="g-level">Davr</label><select id="g-level">${Object.keys(LV).map(k => `<option value="${k}"${v.level === k ? ' selected' : ''}>${LV[k]} (${periodLabel(k, periodKey(k, TD()))})</option>`).join('')}</select>
<label for="g-prog">Qo'lda taraqqiyot: <b id="g-pv">${v.progress}%</b></label><input type="range" id="g-prog" min="0" max="100" step="5" value="${v.progress}"><div class="note" style="margin-top:6px">Maqsadga vazifa bog'lansa, taraqqiyot vazifalardan avtomatik hisoblanadi.</div>
<div class="err" id="g-err" role="alert"></div><div class="sh-a"><button type="button" class="btn sec" data-act="close">Bekor qilish</button><button type="submit" class="btn">${g ? 'Saqlash' : "Qo'shish"}</button></div></form>`);
    $('#g-prog').addEventListener('input', e => { $('#g-pv').textContent = e.target.value + '%'; });
    $('#gf').addEventListener('submit', e => {
      e.preventDefault(); const title = $('#g-title').value.trim(), level = $('#g-level').value, progress = +$('#g-prog').value;
      if (!title) { $('#g-err').textContent = 'Maqsad nomini kiriting.'; return; }
      if (g) { const ch = g.level !== level; Object.assign(g, { title, level, progress, updatedAt: Date.now() }); if (ch) g.period = periodKey(level, TD()); }
      else db.goals.push({ id: uid(), title, level, period: periodKey(level, TD()), progress, createdAt: Date.now(), updatedAt: Date.now() });
      commit(); closeSheet(); toast(g ? 'Maqsad yangilandi' : "Maqsad qo'shildi");
    });
  }
  function habitForm(id) {
    const h = id ? db.habits.find(x => x.id === id) : null;
    sheet(`<form id="hf" novalidate><div class="sh-h"><h2>${h ? 'Odatni tahrirlash' : 'Yangi odat'}</h2>${xb}</div>
<label for="h-title">Odat nomi</label><input type="text" id="h-title" maxlength="80" value="${esc(h ? h.title : '')}" placeholder="Masalan: Ertalabki mashq" autocomplete="off">
<div class="err" id="h-err" role="alert"></div><div class="sh-a"><button type="button" class="btn sec" data-act="close">Bekor qilish</button><button type="submit" class="btn">${h ? 'Saqlash' : "Qo'shish"}</button></div></form>`);
    $('#hf').addEventListener('submit', e => {
      e.preventDefault(); const title = $('#h-title').value.trim(); if (!title) { $('#h-err').textContent = 'Odat nomini kiriting.'; return; }
      if (h) { h.title = title; h.updatedAt = Date.now(); } else db.habits.push({ id: uid(), title, createdAt: Date.now(), updatedAt: Date.now() });
      commit(); closeSheet(); toast(h ? 'Odat yangilandi' : "Odat qo'shildi");
    });
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
  const commit = () => { save(); render(); };
  function go(tab) { if (location.hash !== '#/' + tab) location.hash = '#/' + tab; else render(); }
  function fromHash() { const t = (location.hash.match(/^#\/(\w+)/) || [])[1]; ui.tab = VIEWS[t] ? t : 'home'; render(); window.scrollTo(0, 0); }
  window.addEventListener('hashchange', fromHash);

  document.addEventListener('click', e => {
    const el = e.target.closest('[data-act]'); if (!el) return;
    const row = el.closest('[data-id]'), id = el.dataset.id || (row && row.dataset.id), d = el.dataset.d || (row && row.dataset.d), v = el.dataset.v, a = el.dataset.act;
    const task = () => db.tasks.find(x => x.id === id);
    const A = {
      nav: () => go(v), close: closeSheet, askYes: () => { const f = askYes; closeSheet(); f && f(); },
      fab: () => ui.tab === 'goals' ? (ui.gtab === 'goals' ? goalForm() : habitForm()) : taskForm(),
      addTask: () => taskForm(), addGoal: () => goalForm(), addHabit: () => habitForm(), goHabits: () => { ui.gtab = 'habits'; go('goals'); },
      pri: () => { $$('#f-pri button').forEach(b => b.classList.toggle('on', b === el)); },
      scope: () => { ui.scope = v; render(); }, fs: () => { ui.fs = v; render(); }, fp: () => { ui.fp = v; render(); }, clearF: () => { ui.fs = ui.fp = 'all'; render(); },
      gtab: () => { ui.gtab = v; render(); }, gl: () => { ui.gl = v; render(); },
      toggle: () => { const t = task(); if (t) { toggleTask(t, d || TD()); commit(); } },
      edit: () => taskForm(id),
      del: () => { const t = task(); if (t) ask("Vazifani o'chirish", `"${esc(t.title)}" butunlay o'chiriladi.`, "O'chirish", () => { db.tasks = db.tasks.filter(x => x.id !== t.id); commit(); toast("Vazifa o'chirildi"); }); },
      gEdit: () => goalForm(id),
      gDel: () => { const g = db.goals.find(x => x.id === id); if (g) ask("Maqsadni o'chirish", `"${esc(g.title)}" o'chiriladi. Bog'langan vazifalar saqlanadi.`, "O'chirish", () => { db.goals = db.goals.filter(x => x.id !== g.id); db.tasks.forEach(t => { if (t.goalId === g.id) t.goalId = null; }); commit(); toast("Maqsad o'chirildi"); }); },
      hToggle: () => { const h = db.habits.find(x => x.id === id); if (!h) return; const l = db.habitLogs[h.id] = db.habitLogs[h.id] || [], t = TD(), i = l.indexOf(t); i < 0 ? l.push(t) : l.splice(i, 1); h.updatedAt = Date.now(); commit(); },
      hEdit: () => habitForm(id),
      hDel: () => { const h = db.habits.find(x => x.id === id); if (h) ask("Odatni o'chirish", `"${esc(h.title)}" va uning tarixi o'chiriladi.`, "O'chirish", () => { db.habits = db.habits.filter(x => x.id !== h.id); delete db.habitLogs[h.id]; commit(); toast("Odat o'chirildi"); }); },
      focus: focusSheet,
      fmin: () => { if (F.on) return; F.min = +v; F.left = F.min * 60; focusSheet(); },
      fToggle: () => { if (F.on) { F.left = Math.max(1, Math.ceil((F.end - Date.now()) / 1000)); F.on = false; } else { F.end = Date.now() + F.left * 1000; F.on = true; } focusSheet(); render(); },
      fReset: () => { F.on = false; F.left = F.min * 60; focusSheet(); render(); },
      export: () => { try { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(db, null, 1)], { type: 'application/json' })); a.download = `kunlik-nusxa-${TD()}.json`; document.body.appendChild(a); a.click(); a.remove(); toast('Nusxa yuklab olindi'); } catch (x) { toast("Nusxa olib bo'lmadi"); } },
      wipe: () => ask("Hammasini o'chirish", "Barcha vazifa, maqsad, odat va sozlamalar o'chadi. Bu amalni qaytarib bo'lmaydi.", "Hammasini o'chirish", () => { db = blank(); F.on = false; F.min = 25; F.left = 1500; commit(); toast("Barcha ma'lumot o'chirildi"); })
    };
    if (A[a]) { if (el.tagName === 'A') e.preventDefault(); A[a](); }
  });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && sheetKind) closeSheet(); if ((e.key === 'Enter' || e.key === ' ') && e.target.classList && e.target.classList.contains('tb')) { e.preventDefault(); e.target.click(); } });
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
  fromHash();
  if (bootMsg) toast(bootMsg);
  window.__kunlik = { get db() { return db; }, TD };
})();
