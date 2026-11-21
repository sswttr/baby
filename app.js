/* Baby · 孕期产检记录  —  所有数据只保存在本机浏览器（localStorage + IndexedDB） */
(function () {
  'use strict';

  // ---------- 基础工具 ----------
  const STORE_KEY = 'baby.data.v1';
  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const pad = (n) => String(n).padStart(2, '0');
  const parseD = (s) => { if (!s) return null; const [y, m, d] = s.split('-').map(Number); const dt = new Date(y, m - 1, d); return isNaN(dt) ? null : dt; };
  const fmtD = (dt) => dt.getFullYear() + '-' + pad(dt.getMonth() + 1) + '-' + pad(dt.getDate());
  const addDays = (s, n) => { const d = parseD(s); d.setDate(d.getDate() + n); return fmtD(d); };
  const diffDays = (a, b) => Math.round((parseD(a) - parseD(b)) / 86400000);
  const WD = ['日', '一', '二', '三', '四', '五', '六'];
  const md = (s) => { const d = parseD(s); return d ? (d.getMonth() + 1) + '月' + d.getDate() + '日' : ''; };
  const short = (s) => { const d = parseD(s); return d ? (d.getMonth() + 1) + '/' + d.getDate() : ''; };
  const ymd = (s) => { const d = parseD(s); return d ? d.getFullYear() + '年' + (d.getMonth() + 1) + '月' + d.getDate() + '日' : ''; };
  const num = (v) => { const n = parseFloat(String(v).replace(/[^\d.]/g, '')); return isNaN(n) ? null : n; };
  const todayOverride = new URLSearchParams(location.search).get('today');
  const today = () => todayOverride || fmtD(new Date());

  const ICON = {
    plus: '<svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
    close: '<svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',
    chev: '<svg aria-hidden="true" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M9 6l6 6-6 6"/></svg>',
    chevR: '<svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M9 6l6 6-6 6"/></svg>',
    cam: '<svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><rect x="3" y="6" width="18" height="14" rx="3"/><circle cx="12" cy="13" r="3.5"/><path d="M9 6l1.5-2h3L15 6"/></svg>',
    cal: '<svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>',
    user: '<svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/></svg>',
    heart: '<svg aria-hidden="true" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#B84A70" stroke-width="1.6" stroke-linecap="round"><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/></svg>',
    down: '<svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M12 4v12M7 11l5 5 5-5"/><path d="M4 20h16"/></svg>',
    up: '<svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M12 16V4M7 9l5-5 5 5"/><path d="M4 20h16"/></svg>',
    home: '<svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 11l9-7 9 7v9H3z"/></svg>',
    doc: '<svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M6 3h9l4 4v14H6z"/><path d="M9 12h7M9 16h7"/></svg>',
    calNav: '<svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>',
    trash: '<svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>'
  };

  // ---------- 产检时间表（天数从末次月经算） ----------
  const SCHEDULE = [
    { id: 'c1', n: 1, tri: 1, s: 42, e: 76, name: '建档检查', weeks: '孕6–10周', fasting: true,
      short: '抽血全套、尿常规、心电图、B超',
      items: ['血常规、尿常规', '血型（ABO、Rh）', '肝肾功能、空腹血糖', '甲状腺功能', '乙肝、梅毒、艾滋病筛查', '心电图', 'B超（确认宫内孕、胎心、孕周）', '建立孕产妇保健手册'] },
    { id: 'c2', n: 2, tri: 1, s: 77, e: 97, name: 'NT检查', weeks: '孕11–13⁺⁶周',
      short: 'NT超声、早期唐筛（部分医院）',
      items: ['NT超声（颈项透明层厚度）', '早期唐筛（部分医院）', '血压、体重'] },
    { id: 'c3', n: 3, tri: 2, s: 105, e: 146, name: '唐筛 / 无创DNA', weeks: '孕15–20周',
      short: '唐筛或无创、血尿常规',
      items: ['中期唐筛（15–20周）或无创DNA（12周后）', '血常规、尿常规', '血压、体重、宫高腹围、胎心'] },
    { id: 'c4', n: 4, tri: 2, s: 140, e: 174, name: '大排畸', weeks: '孕20–24周',
      short: '系统超声、胎盘位置',
      items: ['系统超声（大排畸）', '胎盘位置', '血压、体重、胎心'] },
    { id: 'c5', n: 5, tri: 2, s: 168, e: 195, name: '糖耐量', weeks: '孕24–28周', fasting: true,
      short: 'OGTT（需空腹）、血尿常规',
      items: ['OGTT 糖耐量（空腹抽血，喝糖水后1、2小时再抽）', '血常规、尿常规', '血压、体重、胎心'] },
    { id: 'c6', n: 6, tri: 3, s: 196, e: 209, name: '常规产检', weeks: '孕28–30周',
      short: '血常规、胎位、血压体重',
      items: ['血常规、尿常规', '胎位、胎心', '血压、体重、宫高腹围', '开始每天数胎动'] },
    { id: 'c7', n: 7, tri: 3, s: 210, e: 223, name: '小排畸 / 生长B超', weeks: '孕30–32周',
      short: '胎儿生长B超、宫高腹围',
      items: ['B超（胎儿生长、羊水、胎盘）', '血压、体重、宫高腹围'] },
    { id: 'c8', n: 8, tri: 3, s: 224, e: 244, name: '胎心监护', weeks: '孕32–34周',
      short: '胎心监护、B超',
      items: ['胎心监护（NST）', '血常规、尿常规', '血压、体重'] },
    { id: 'c9', n: 9, tri: 3, s: 245, e: 258, name: 'GBS筛查', weeks: '孕35–36周',
      short: 'GBS、分娩方式评估',
      items: ['GBS（B族链球菌）筛查', '胎心监护', '和医生评估分娩方式与时间'] },
    { id: 'c10', n: 10, tri: 3, s: 259, e: 286, name: '每周产检', weeks: '孕37周起',
      short: '每周胎心监护、按计划入院',
      items: ['每周一次胎心监护', 'B超看羊水', '按医生计划入院待产'] }
  ];
  const TRI = {
    1: { name: '孕早期', sub: '第1–2次', color: 'var(--t1)', range: '0–13周' },
    2: { name: '孕中期', sub: '第3–5次 · 约每4周', color: 'var(--t2)', range: '14–27周' },
    3: { name: '孕晚期', sub: '第6–10次 · 每2周→每周', color: 'var(--t3)', range: '28–40周' }
  };
  const checkById = (id) => SCHEDULE.find((c) => c.id === id);
  const checkName = (id) => { const c = checkById(id); if (c) return '第' + c.n + '次 · ' + c.name; return id === 'recheck' ? '复查' : '其他 / 临时就诊'; };

  const SIZES = { 4: '罂粟籽', 5: '芝麻', 6: '扁豆', 7: '蓝莓', 8: '树莓', 9: '樱桃', 10: '金桔', 11: '无花果', 12: '青柠', 13: '柠檬', 14: '桃子', 15: '苹果', 16: '牛油果', 17: '梨', 18: '甜椒', 19: '芒果', 20: '香蕉', 21: '胡萝卜', 22: '木瓜', 23: '葡萄柚', 24: '玉米', 25: '花椰菜', 26: '生菜', 27: '卷心菜', 28: '茄子', 29: '南瓜', 30: '大白菜', 31: '椰子', 32: '哈密瓜', 33: '菠萝', 34: '香瓜', 35: '蜜瓜', 36: '木瓜', 37: '冬瓜', 38: '南瓜', 39: '西瓜', 40: '大西瓜' };

  function weeklyTips(w) {
    if (w < 13) return ['每天补充叶酸 0.4mg', '避免提重物、剧烈运动', '孕吐时少食多餐，多喝水', '用药前先问医生', '不吸烟、不喝酒，远离二手烟'];
    if (w < 20) return ['按医生建议补钙、补铁', '每天散步 30 分钟左右', '注意体重增长不要太快', '记得按时做唐筛 / 无创'];
    if (w < 28) return ['开始留意胎动', '少吃甜食，为糖耐量做准备', '睡觉尽量侧卧', '注意有没有水肿、头痛'];
    if (w < 37) return ['每天早中晚各数 1 小时胎动', '左侧卧休息', '留意血压和水肿', '开始准备待产包'];
    return ['待产包放在门口', '规律宫缩、见红、破水要去医院', '每天数胎动', '保持手机有电，路线提前规划好'];
  }
  function emergencyText(w) {
    const base = ['腹痛', '阴道出血', '剧烈呕吐吃不下', '头晕眼花、心慌'];
    if (w >= 20) base.push('胎动明显减少或消失', '阴道流水（破水）', '头痛、视物模糊、明显水肿');
    return base.join(' · ');
  }

  // ---------- 数据 ----------
  const blank = () => ({ v: 1, profile: { lmp: '', preWeight: null, hospital: '' }, checks: {}, records: [], issues: [], vitals: [], tips: {}, myTips: [], lastBackup: '' });
  let S = load();
  function load() {
    try { const raw = localStorage.getItem(STORE_KEY); if (raw) return Object.assign(blank(), JSON.parse(raw)); } catch (e) { /* ignore */ }
    return blank();
  }
  function save() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(S)); }
    catch (e) { toast('保存失败：手机存储空间不足'); }
  }

  // 照片存 IndexedDB
  const DB = (() => {
    let dbp = null;
    const open = () => dbp || (dbp = new Promise((res, rej) => {
      const r = indexedDB.open('baby-photos', 1);
      r.onupgradeneeded = () => r.result.createObjectStore('photos');
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
    }));
    const tx = (mode, fn) => open().then((db) => new Promise((res, rej) => {
      const t = db.transaction('photos', mode); const st = t.objectStore('photos');
      const out = fn(st); t.oncomplete = () => res(out && out.result !== undefined ? out.result : out); t.onerror = () => rej(t.error);
    }));
    return {
      put: (id, data) => tx('readwrite', (st) => { st.put(data, id); }),
      get: (id) => tx('readonly', (st) => st.get(id)),
      del: (id) => tx('readwrite', (st) => { st.delete(id); }),
      clear: () => tx('readwrite', (st) => { st.clear(); }),
      all: () => open().then((db) => new Promise((res, rej) => {
        const out = {}; const t = db.transaction('photos'); const c = t.objectStore('photos').openCursor();
        c.onsuccess = () => { const cur = c.result; if (cur) { out[cur.key] = cur.value; cur.continue(); } };
        t.oncomplete = () => res(out); t.onerror = () => rej(t.error);
      }))
    };
  })();
  const photoCache = {};
  function loadPhotos(ids) {
    return Promise.all(ids.filter((id) => !photoCache[id]).map((id) => DB.get(id).then((d) => { if (d) photoCache[id] = d; }).catch(() => {})));
  }

  // ---------- 计算 ----------
  const lmp = () => S.profile.lmp;
  const edd = () => lmp() ? addDays(lmp(), 280) : '';
  function gaOf(date) {
    if (!lmp() || !date) return null;
    const days = diffDays(date, lmp());
    if (days < 0) return null;
    return { days, w: Math.floor(days / 7), d: days % 7 };
  }
  const gaText = (date) => { const g = gaOf(date); return g ? g.w + (g.d ? '⁺' + g.d : '') + '周' : '—'; };
  const checkDates = (c) => ({ start: addDays(lmp(), c.s), end: addDays(lmp(), c.e) });
  const isCheckDone = (id) => !!(S.checks[id] && S.checks[id].done) || S.records.some((r) => r.checkId === id);
  function nextCheck() {
    return SCHEDULE.find((c) => !isCheckDone(c.id)) || null;
  }
  function checkStatus(c) {
    if (isCheckDone(c.id)) return 'done';
    const nx = nextCheck();
    if (nx && nx.id === c.id) return 'next';
    return 'todo';
  }
  const sortByDate = (arr, key) => arr.slice().sort((a, b) => (a[key] || '').localeCompare(b[key] || ''));

  function upsertVital(date, w, sys, dia) {
    if (w == null && sys == null) return;
    let v = S.vitals.find((x) => x.date === date);
    if (!v) { v = { id: uid(), date, w: null, sys: null, dia: null }; S.vitals.push(v); }
    if (w != null) v.w = w;
    if (sys != null) { v.sys = sys; v.dia = dia; }
  }
  const parseBP = (s) => { const m = /^\s*(\d{2,3})\s*[\/／\\\s-]\s*(\d{2,3})\s*$/.exec(s || ''); return m ? { sys: +m[1], dia: +m[2] } : null; };

  // 从粘贴的报告文字里找可能异常的项目
  function findAbnormal(text) {
    const lines = String(text || '').split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    const kw = /(↑|↓|偏高|偏低|升高|降低|增高|减低|异常|阳性|\(\+\)|（\+）|\+\+|不足|缺损|暗区|积液|建议复查|请复查|随访|[^A-Za-z]H$|[^A-Za-z]L$|\sH\s|\sL\s)/;
    const out = [];
    lines.forEach((l) => { if (kw.test(l) && !/参考|范围|正常值/.test(l.slice(0, 4))) out.push(l.replace(/\s+/g, ' ').slice(0, 80)); });
    return Array.from(new Set(out)).slice(0, 20);
  }

  // ---------- 图片压缩 ----------
  function compressImage(file) {
    return new Promise((res, rej) => {
      const fr = new FileReader();
      fr.onload = () => {
        const img = new Image();
        img.onload = () => {
          const max = 1600; let { width: w, height: h } = img;
          if (Math.max(w, h) > max) { const r = max / Math.max(w, h); w = Math.round(w * r); h = Math.round(h * r); }
          const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
          cv.getContext('2d').drawImage(img, 0, 0, w, h);
          res(cv.toDataURL('image/jpeg', 0.8));
        };
        img.onerror = () => rej(new Error('图片读取失败'));
        img.src = fr.result;
      };
      fr.onerror = () => rej(fr.error);
      fr.readAsDataURL(file);
    });
  }

  // ---------- 文件导出（日历 / 备份） ----------
  function saveFile(name, text, mime) {
    const blob = new Blob([text], { type: mime });
    const file = typeof File === 'function' ? new File([blob], name, { type: mime }) : null;
    const standalone = window.navigator.standalone || matchMedia('(display-mode: standalone)').matches;
    if (standalone && file && navigator.canShare && navigator.canShare({ files: [file] })) {
      return navigator.share({ files: [file], title: name }).catch(() => {});
    }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 2000);
    return Promise.resolve();
  }
  function addToCalendar(title, date, desc) {
    const d = date.replace(/-/g, ''); const d2 = addDays(date, 1).replace(/-/g, '');
    const now = new Date(); const stamp = now.getUTCFullYear() + pad(now.getUTCMonth() + 1) + pad(now.getUTCDate()) + 'T' + pad(now.getUTCHours()) + pad(now.getUTCMinutes()) + '00Z';
    const escI = (s) => String(s).replace(/[\\,;]/g, (m) => '\\' + m).replace(/\n/g, '\\n');
    const ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Baby//CN', 'CALSCALE:GREGORIAN', 'BEGIN:VEVENT',
      'UID:' + uid() + '@baby', 'DTSTAMP:' + stamp, 'DTSTART;VALUE=DATE:' + d, 'DTEND;VALUE=DATE:' + d2,
      'SUMMARY:' + escI(title), 'DESCRIPTION:' + escI(desc || ''),
      'BEGIN:VALARM', 'ACTION:DISPLAY', 'DESCRIPTION:' + escI(title), 'TRIGGER:-PT4H', 'END:VALARM',
      'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
    const iOS = /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    if (iOS) { window.location.href = 'data:text/calendar;charset=utf-8,' + encodeURIComponent(ics); return; }
    saveFile('baby-' + date + '.ics', ics, 'text/calendar;charset=utf-8');
  }

  // ---------- UI 状态 ----------
  const ui = { tab: 'home', addOpen: false, editId: null, pending: [], rcPending: [], cands: [], issueMode: 'none', vMetric: 'w', showResolved: false };

  function toast(msg) {
    $$('.toast').forEach((x) => x.remove());
    const t = document.createElement('div'); t.className = 'toast'; t.textContent = msg; t.setAttribute('role', 'status');
    document.body.appendChild(t); setTimeout(() => t.remove(), 2200);
  }

  // ---------- 渲染：入口 ----------
  function render() {
    const app = $('#app'); const nav = $('#nav');
    if (!lmp()) { nav.classList.add('hidden'); app.innerHTML = renderSetup(); return; }
    nav.classList.remove('hidden');
    $$('.nav button').forEach((b) => b.classList.toggle('on', b.dataset.tab === ui.tab));
    app.innerHTML = ui.tab === 'home' ? renderHome() : ui.tab === 'schedule' ? renderSchedule() : renderRecords();
    if (ui.tab === 'records') afterRecords();
  }

  function renderSetup() {
    return `<div class="setup">
      <img class="logo" src="icon-192.png" alt="Baby 图标">
      <h1>你好，欢迎使用 Baby</h1>
      <p class="muted" style="margin:0">先填一个日期，就能算出孕周、预产期和每次产检的时间。数据只保存在这台手机里。</p>
      <div class="card stack">
        <div class="seg-ctl" role="tablist">
          <button type="button" class="on" data-act="setup-mode" data-mode="lmp">按末次月经</button>
          <button type="button" data-act="setup-mode" data-mode="edd">按预产期</button>
        </div>
        <div class="field"><label for="setup-date" id="setup-label">末次月经第一天</label>
          <input class="input" id="setup-date" type="date"></div>
        <p class="small muted" style="margin:0">B超核对过孕周的话，建议按医生给的预产期填写。</p>
        <button class="btn btn-primary btn-block" data-act="setup-save">开始使用</button>
      </div>
      <button class="btn btn-ghost btn-block" data-act="import">${ICON.up}已有备份？导入 JSON</button>
    </div>`;
  }

  // ---------- 首页 ----------
  function renderHome() {
    const t = today(); const g = gaOf(t); const e = edd();
    const left = diffDays(e, t);
    const pct = g ? Math.min(100, g.days / 280 * 100) : 0;
    const wd = parseD(t);
    let heroNote = '';
    if (g && g.w >= 4 && g.w <= 40) heroNote = `宝宝现在大约${SIZES[g.w] ? '有' + SIZES[g.w] + '那么大' : '在快速长大'}。`;
    else if (g && g.w > 40) heroNote = '已经过了预产期，记得按医生安排复查或入院。';
    const banner = backupBanner();

    const open = S.issues.filter((i) => i.status !== 'resolved');
    const resolved = S.issues.filter((i) => i.status === 'resolved');
    const nx = nextCheck();

    const wkKey = g ? 'w' + g.w : 'w0';
    const tipsDone = S.tips[wkKey] || {};
    const tips = weeklyTips(g ? g.w : 0);

    return `<div class="page">
      <div class="topbar">
        <div><div class="date">${wd.getMonth() + 1}月${wd.getDate()}日 周${WD[wd.getDay()]}</div><h1>Baby</h1></div>
        <button class="pill-btn" data-act="settings">${ICON.user}孕期信息</button>
      </div>
      ${banner}
      <section class="hero" aria-label="当前孕周">
        <div class="row between" style="align-items:flex-start">
          <div class="stack" style="gap:6px">
            <div class="label">当前孕周</div>
            <div class="big">${g ? `<b>${g.w}</b><span>周</span><b style="margin-left:6px">${g.d}</b><span>天</span>` : '<span>还没到末次月经日期</span>'}</div>
          </div>
          <div class="hero-icon">${ICON.heart}</div>
        </div>
        <div class="bar" role="progressbar" aria-valuenow="${Math.round(pct)}" aria-valuemin="0" aria-valuemax="100"><i style="width:${pct}%"></i></div>
        <div class="meta"><span>预产期 ${ymd(e)}</span><span>${left >= 0 ? '还有 ' + left + ' 天' : '已过 ' + (-left) + ' 天'}</span></div>
        ${heroNote ? `<div class="note">${heroNote}</div>` : ''}
      </section>

      <div class="section-title"><h2>需要关注的问题</h2><span class="aside">跟进中 ${open.length} · 已解决 ${resolved.length}</span></div>
      <div class="grid2">
        <button class="btn btn-primary" data-act="goto-add">${ICON.cam}上传报告</button>
        <button class="btn btn-ghost" data-act="issue-new">${ICON.plus}手动添加</button>
      </div>
      <div style="margin-top:10px">
        ${open.length ? open.map(issueCard).join('') : '<div class="empty">目前没有需要跟进的问题，继续保持 ✓</div>'}
        ${resolved.length ? `<button class="link-btn" data-act="toggle-resolved">${ui.showResolved ? '收起已解决的问题' : '查看已解决的问题（' + resolved.length + '）'}</button>` : ''}
        ${ui.showResolved ? resolved.map(issueCard).join('') : ''}
      </div>

      <div class="section-title"><h2>下一次产检</h2><button class="link-btn" data-act="tab" data-tab="schedule">全部 10 次</button></div>
      ${nx ? nextCheckCard(nx) : '<div class="empty">10 次产检都完成啦</div>'}

      <div class="section-title"><h2>本周小提醒</h2><span class="aside">${g ? '孕' + g.w + '周' : ''}</span></div>
      <div class="card" style="padding:4px 16px">
        ${tips.map((tx, i) => `<div class="check ${tipsDone[i] ? 'done' : ''}"><input type="checkbox" id="tip${i}" data-act="tip" data-key="${wkKey}" data-i="${i}" ${tipsDone[i] ? 'checked' : ''}><label for="tip${i}">${esc(tx)}</label></div>`).join('')}
        ${S.myTips.map((m) => `<div class="check ${m.done ? 'done' : ''}"><input type="checkbox" id="my${m.id}" data-act="mytip" data-id="${m.id}" ${m.done ? 'checked' : ''}><label for="my${m.id}">${esc(m.text)}</label><button class="icon-btn" aria-label="删除这条提醒" data-act="mytip-del" data-id="${m.id}">${ICON.trash}</button></div>`).join('')}
        <div class="row" style="padding:10px 0">
          <input class="input" id="mytip-input" placeholder="加一条自己的提醒" style="height:42px" maxlength="60">
          <button class="btn btn-ghost" style="height:42px;flex:none" data-act="mytip-add">添加</button>
        </div>
      </div>
      <div class="alert"><h3>出现这些情况，立即就医</h3><p>${emergencyText(g ? g.w : 0)}</p></div>
    </div>`;
  }

  function backupBanner() {
    const has = S.records.length || S.issues.length || S.vitals.length;
    if (!has) return '';
    const days = S.lastBackup ? diffDays(today(), S.lastBackup.slice(0, 10)) : 999;
    if (days < 14) return '';
    return `<div class="banner"><span style="flex:1">${S.lastBackup ? '已经 ' + days + ' 天没备份了' : '还没备份过数据'}，换手机或清理浏览器会丢失。</span><button class="btn" data-act="export">去备份</button></div>`;
  }

  function issueCard(i) {
    const fs = sortByDate(i.followups || [], 'date');
    const resolved = i.status === 'resolved';
    const rec = S.records.find((r) => r.id === i.recordId);
    const foundWhere = rec ? checkName(rec.checkId) : (i.foundWhere || '');
    const fuLabel = { resolved: '已解决', better: '有好转', same: '没变化', worse: '需进一步处理' };
    return `<article class="card">
      <div class="row between" style="align-items:flex-start">
        <button style="border:none;background:none;padding:0;text-align:left;font-size:15px;font-weight:700;color:inherit;flex:1;min-height:32px" data-act="issue-view" data-id="${i.id}">${esc(i.title)}</button>
        ${resolved ? '<span class="tag tag-mint">已解决</span>' : `<button class="tag tag-amber" data-act="recheck" data-id="${i.id}">待复查${ICON.chev}</button>`}
      </div>
      <div class="tl" style="margin-top:10px">
        <div class="tl-item"><div class="tl-rail"><div class="tl-dot found"></div>${fs.length || !resolved ? '<div class="tl-line"></div>' : ''}</div>
          <div class="tl-body"><div class="tl-head">发现 · ${md(i.foundDate)}${foundWhere ? ' ' + esc(foundWhere) : ''}（孕${gaText(i.foundDate)}）</div>
          ${i.detail ? `<div class="tl-text pre">${esc(i.detail)}</div>` : ''}${i.advice ? `<div class="small muted">医生建议：${esc(i.advice)}</div>` : ''}</div></div>
        ${fs.map((f, k) => `<div class="tl-item"><div class="tl-rail"><div class="tl-dot follow"></div>${k < fs.length - 1 || !resolved ? '<div class="tl-line"></div>' : ''}</div>
          <div class="tl-body"><div class="tl-head">复查 · ${md(f.date)}${f.item ? ' ' + esc(f.item) : ''} · ${fuLabel[f.status] || ''}</div>
          ${f.result ? `<div class="tl-text pre">${esc(f.result)}</div>` : ''}${f.advice ? `<div class="small muted">医生建议：${esc(f.advice)}</div>` : ''}
          ${f.photos && f.photos.length ? `<div class="small muted">附 ${f.photos.length} 张报告照片</div>` : ''}</div></div>`).join('')}
        ${resolved ? '' : `<div class="tl-item"><div class="tl-rail"><div class="tl-dot wait"></div></div>
          <div class="tl-body"><div class="tl-head">下次复查 · ${i.nextDate ? md(i.nextDate) : '时间待定'}</div>
          <div class="tl-text muted s13">复查后点“录入复查结果”</div></div></div>`}
      </div>
      <div class="card-foot"><span class="small muted">来源：${i.source === 'import' ? '报告导入' : '手动输入'}</span>
        ${resolved ? `<button class="link-btn" data-act="issue-view" data-id="${i.id}">查看 ›</button>` : `<button class="link-btn" style="font-size:14px;font-weight:600" data-act="recheck" data-id="${i.id}">录入复查结果 ›</button>`}</div>
    </article>`;
  }

  function nextCheckCard(c) {
    const { start, end } = checkDates(c); const appt = S.checks[c.id] && S.checks[c.id].appt;
    const t = today(); const late = !appt && diffDays(t, end) > 0;
    return `<div class="card stack">
      <div class="row between"><div class="bold">第${c.n}次 · ${esc(c.name)}</div>${c.fasting ? '<span class="tag tag-rose">需空腹</span>' : ''}</div>
      <div class="s13" style="color:var(--ink-2)">${appt ? '已预约：<b>' + ymd(appt) + '</b>（孕' + gaText(appt) + '）' : '建议 ' + md(start) + ' – ' + (c.id === 'c10' ? '分娩' : md(end)) + '（' + c.weeks + '）'}</div>
      ${late ? '<div class="small" style="color:var(--red-ink)">已过建议时间，做过了的话去“记录”里补录一下</div>' : ''}
      <div class="small muted">${esc(c.items.join('、'))}</div>
      <div class="grid2">
        <button class="btn btn-primary" data-act="cal-check" data-id="${c.id}">${ICON.cal}加入手机日历</button>
        <button class="btn btn-ghost" data-act="check-view" data-id="${c.id}">${appt ? '改预约日期' : '填预约日期'}</button>
      </div>
    </div>`;
  }

  // ---------- 产检页 ----------
  function renderSchedule() {
    const g = gaOf(today()); const todayPct = g ? Math.min(100, g.days / 280 * 100) : 0;
    let lastTop = -99, lastLow = -99;
    const dots = SCHEDULE.map((c) => {
      const st = checkStatus(c); const pos = (c.s + Math.min(c.e, 280)) / 2 / 280 * 100;
      let top = 22; if (pos - lastTop < 8) { top = 46; lastLow = pos; } else { lastTop = pos; }
      const bc = TRI[c.tri].color;
      return `<button class="dot ${st}" style="left:${pos.toFixed(1)}%;top:${top}px;border-color:${st === 'todo' ? bc : '#fff'}" data-act="check-view" data-id="${c.id}" aria-label="第${c.n}次 ${esc(c.name)}">${c.n}</button>`;
    }).join('');
    const doneN = SCHEDULE.filter((c) => isCheckDone(c.id)).length;
    const groups = [1, 2, 3].map((tri) => {
      const T = TRI[tri];
      const cards = SCHEDULE.filter((c) => c.tri === tri).map((c) => {
        const st = checkStatus(c); const { start, end } = checkDates(c); const appt = S.checks[c.id] && S.checks[c.id].appt;
        const tag = st === 'done' ? '<span class="tag tag-mint">已完成</span>' : st === 'next' ? '<span class="tag tag-solid">下一次</span>' : '<span class="tag tag-gray">未开始</span>';
        return `<button class="ccard ${st}" data-act="check-view" data-id="${c.id}">
          <div class="row between" style="width:100%"><span class="num" style="background:${T.color}">${c.n}</span>${tag}</div>
          <div class="name">${esc(c.name)}</div>
          <div class="small muted">${c.weeks}</div>
          <div class="small" style="color:var(--ink-2);font-weight:600">${appt ? '预约 ' + short(appt) : c.id === 'c10' ? short(start) + ' 起' : short(start) + ' – ' + short(end)}</div>
          <div class="items">${esc(c.short)}</div>
        </button>`;
      }).join('');
      return `<div class="group-head"><i style="background:${T.color}"></i><b>${T.name}</b><span>${T.sub}</span></div><div class="grid2">${cards}</div>`;
    }).join('');
    return `<div class="page">
      <div class="topbar"><div><h1>产检时间表</h1><div class="date">共 10 次 · 已完成 ${doneN} 次 · 预产期 ${md(edd())}</div></div></div>
      <div class="card axis-card">
        <div class="row between small muted"><span>孕周轴（点圆点看详情）</span><span>今天：孕${gaText(today())}</span></div>
        <div class="axis">
          <div class="seg"><i style="width:32.5%;background:var(--t1)"></i><i style="width:35%;background:var(--t2)"></i><i style="width:32.5%;background:var(--t3)"></i></div>
          <div class="today-tag" style="left:${todayPct}%">今天</div><div class="today-line" style="left:${todayPct}%"></div>
          ${dots}
        </div>
        <div class="axis-labels"><span style="width:32.5%">孕早期</span><span style="width:35%;text-align:center">孕中期</span><span style="width:32.5%;text-align:right">孕晚期</span></div>
      </div>
      ${groups}
      <p class="small muted" style="margin:18px 4px 0">时间是按常规产检安排推算的参考，以医院和医生的安排为准。医生让增加的复查，可以在首页“需要关注的问题”里跟进。</p>
    </div>`;
  }

  // ---------- 记录页 ----------
  function renderRecords() {
    const recs = sortByDate(S.records, 'date').reverse();
    return `<div class="page">
      <div class="topbar"><div><h1>检查记录</h1><div class="date">共 ${S.records.length} 条</div></div></div>
      ${ui.addOpen ? recordForm() : `<button class="add-cta" data-act="add-open"><span class="circle">${ICON.plus}</span><span style="flex:1"><b>新增一条产检记录</b><small>拍照留存报告，填写结果和发现的问题</small></span>${ICON.chevR}</button>`}

      <div class="section-title"><h2>体重 · 血压趋势</h2></div>
      ${vitalsCard()}

      <div class="section-title"><h2>历次记录</h2></div>
      ${recs.length ? recs.map(recordItem).join('') : '<div class="empty">还没有记录。每次产检后点上面的按钮记一笔。</div>'}

      <div class="section-title"><h2>数据备份</h2></div>
      <div class="card stack">
        <div class="s13" style="color:var(--ink-2)">所有记录、问题、照片只保存在这台手机的浏览器里。换手机、清理浏览器前一定要先备份；另一台手机导入同一个文件，就能看到一样的内容。</div>
        <div class="grid2">
          <button class="btn btn-primary" data-act="export">${ICON.down}导出备份</button>
          <button class="btn btn-ghost" data-act="import">${ICON.up}导入备份</button>
        </div>
        <div class="small muted">上次备份：${S.lastBackup ? ymd(S.lastBackup.slice(0, 10)) : '还没有备份过'}</div>
      </div>
    </div>`;
  }

  function recordItem(r) {
    const iss = S.issues.filter((i) => i.recordId === r.id);
    const parts = [];
    if (r.weight != null) parts.push('体重 ' + r.weight + 'kg');
    if (r.sys != null) parts.push('血压 ' + r.sys + '/' + r.dia);
    if (r.fhr) parts.push('胎心 ' + r.fhr);
    return `<button class="rec" data-act="rec-view" data-id="${r.id}">
      <div class="row between" style="width:100%"><span class="bold">${esc(r.title || checkName(r.checkId))}</span>${iss.length ? `<span class="tag tag-amber">${iss.length} 个问题</span>` : '<span class="tag tag-mint">正常</span>'}</div>
      <div class="small muted">${ymd(r.date)} · 孕${gaText(r.date)}${r.hospital ? ' · ' + esc(r.hospital) : ''}</div>
      ${parts.length ? `<div class="s13">${parts.join('　')}</div>` : ''}
      ${r.photos && r.photos.length ? `<div class="small muted">报告照片 ${r.photos.length} 张</div>` : ''}
    </button>`;
  }

  function recordForm() {
    const r = ui.editId ? S.records.find((x) => x.id === ui.editId) : null;
    const nx = nextCheck();
    const sel = r ? r.checkId : (nx ? nx.id : 'other');
    const opts = SCHEDULE.map((c) => `<option value="${c.id}" ${sel === c.id ? 'selected' : ''}>第${c.n}次 · ${esc(c.name)}${isCheckDone(c.id) && (!r || r.checkId !== c.id) ? '（已记录）' : nx && nx.id === c.id ? '（下一次）' : ''}</option>`).join('')
      + `<option value="recheck" ${sel === 'recheck' ? 'selected' : ''}>复查</option><option value="other" ${sel === 'other' ? 'selected' : ''}>其他 / 临时就诊</option>`;
    return `<form class="card stack" id="rec-form" style="gap:16px" autocomplete="off">
      <div class="row between"><div class="bold" style="font-size:17px">${r ? '编辑记录' : '新增一条产检记录'}</div>
        <button type="button" class="icon-btn" aria-label="收起" data-act="add-close" style="margin-right:-10px">${ICON.close}</button></div>

      <div class="field"><span class="field-label">报告照片</span>
        <div class="thumbs" id="rf-thumbs"></div>
        <button type="button" class="upload" data-act="pick-photo" data-target="rec">
          <span class="row" style="gap:6px;font-weight:600">${ICON.cam}拍照或选择报告照片</span>
          <span class="small muted">可以选多张，照片会压缩后存在本机</span></button>
      </div>

      <div class="grid2">
        <div class="field" style="grid-column:1/-1"><label for="rf-check">哪一次检查</label><select class="input" id="rf-check">${opts}</select></div>
        <div class="field" style="grid-column:1/-1"><label for="rf-date">检查日期</label><input class="input" type="date" id="rf-date" value="${r ? r.date : today()}"></div>
        <div class="field" style="grid-column:1/-1"><label for="rf-hosp">医院 / 医生（选填）</label><input class="input" id="rf-hosp" value="${esc(r ? r.hospital : S.profile.hospital || '')}" maxlength="40"></div>
      </div>

      <div class="field"><span class="field-label">常规指标（选填）</span>
        <div class="grid3">
          <input class="input" id="rf-w" inputmode="decimal" placeholder="体重 kg" aria-label="体重 kg" value="${r && r.weight != null ? r.weight : ''}">
          <input class="input" id="rf-bp" placeholder="血压" aria-label="血压，如110/70" value="${r && r.sys != null ? r.sys + '/' + r.dia : ''}">
          <input class="input" id="rf-fhr" inputmode="numeric" placeholder="胎心" aria-label="胎心 次/分" value="${r && r.fhr ? esc(r.fhr) : ''}">
        </div>
        <span class="small muted">体重、血压会同步到下面的趋势</span>
      </div>

      <div class="field"><label for="rf-note">结果和医生说的话（选填）</label>
        <textarea class="input" id="rf-note" rows="3" placeholder="例如：各项正常，下次带上唐筛单">${esc(r ? r.note : '')}</textarea></div>

      ${r ? '' : `<div class="field"><span class="field-label">有没有发现问题？</span>
        <div class="grid2">
          <button type="button" class="choice ${ui.issueMode === 'none' ? 'on' : ''}" data-act="issue-mode" data-mode="none">都正常</button>
          <button type="button" class="choice ${ui.issueMode !== 'none' ? 'on' : ''}" data-act="issue-mode" data-mode="yes">有问题</button>
        </div>
        <div id="rf-issues" class="${ui.issueMode === 'none' ? 'hidden' : ''}">
          <div class="issue-edit" style="margin-top:8px">
            <div class="small" style="color:var(--ink-2)">从报告文字里自动找：用手机相册的“提取文字/识别文字”复制报告内容，粘贴到这里</div>
            <textarea class="input" id="rf-paste" rows="3" placeholder="粘贴报告文字，会自动找出带 ↑ ↓、偏高、偏低、阳性等字样的项目"></textarea>
            <button type="button" class="btn btn-ghost" data-act="paste-parse">找出异常项目</button>
            <div id="rf-cands"></div>
          </div>
          <div class="issue-edit" style="margin-top:8px">
            <div class="small" style="color:var(--ink-2)">或者手动填写</div>
            <div id="rf-manual" class="stack"></div>
            <button type="button" class="link-btn" data-act="manual-row">+ 再加一个问题</button>
          </div>
          <div class="small muted" style="margin-top:6px">保存后会出现在首页“需要关注的问题”里</div>
        </div>
      </div>`}

      <div style="display:grid;grid-template-columns:1fr 2fr;gap:10px">
        <button type="button" class="btn btn-plain" data-act="add-close">取消</button>
        <button type="button" class="btn btn-primary" data-act="rec-save">保存记录</button>
      </div>
    </form>`;
  }
  function manualRowHTML() {
    return `<div class="stack mrow" style="gap:6px;background:#fff;border-radius:12px;padding:8px">
      <input class="input m-title" placeholder="问题，例如：血红蛋白偏低" aria-label="问题" maxlength="60">
      <input class="input m-advice" placeholder="医生建议（选填）" aria-label="医生建议" maxlength="120">
      <label class="small muted" style="margin-top:2px">计划复查日期（选填）</label>
      <input class="input m-next" type="date" aria-label="计划复查日期（选填）">
    </div>`;
  }
  function afterRecords() {
    if (!ui.addOpen) return;
    renderThumbs('#rf-thumbs');
    renderCands();
    const box = $('#rf-manual'); if (box && !box.children.length) box.insertAdjacentHTML('beforeend', manualRowHTML());
  }
  function renderThumbs(sel) {
    const el = $(sel); if (!el) return;
    const list = sel === '#rc-thumbs' ? ui.rcPending : ui.pending;
    el.innerHTML = list.map((p, k) => `<div class="thumb"><img src="${p.data}" alt="报告照片 ${k + 1}"><button type="button" class="x" aria-label="移除这张照片" data-act="photo-remove" data-target="${sel === '#rc-thumbs' ? 'recheck' : 'rec'}" data-k="${k}">${ICON.trash}</button></div>`).join('');
  }
  function renderCands() {
    const el = $('#rf-cands'); if (!el) return;
    if (!ui.cands.length) { el.innerHTML = ''; return; }
    el.innerHTML = `<div class="small muted" style="margin:4px 0">找到 ${ui.cands.length} 项，勾选要跟进的：</div>` +
      ui.cands.map((c, k) => `<label class="cand"><input type="checkbox" class="cand-cb" data-k="${k}" checked><span>${esc(c)}</span></label>`).join('');
  }

  // 体重血压
  function vitalsCard() {
    const list = sortByDate(S.vitals, 'date');
    const isW = ui.vMetric === 'w';
    const pts = list.filter((e) => isW ? e.w != null : e.sys != null);
    let summary = '还没有数据';
    if (pts.length) {
      const last = pts[pts.length - 1];
      if (isW) {
        const base = S.profile.preWeight != null ? S.profile.preWeight : pts[0].w;
        const diff = +(last.w - base).toFixed(1);
        summary = '最近 ' + last.w + ' kg · 比' + (S.profile.preWeight != null ? '孕前' : '第一次') + ' ' + (diff >= 0 ? '+' : '') + diff + ' kg';
      } else summary = '最近 ' + last.sys + '/' + last.dia + ' mmHg';
    }
    const rows = list.slice().reverse().map((e) => `<div class="vt-row"><span>${short(e.date)}</span><span class="muted">${gaText(e.date)}</span><span>${e.w != null ? e.w + 'kg' : '—'}</span>
      <span style="color:${e.sys >= 140 || e.dia >= 90 ? 'var(--red-ink);font-weight:700' : 'inherit'}">${e.sys != null ? e.sys + '/' + e.dia : '—'}</span>
      <button class="icon-btn" aria-label="删除 ${short(e.date)} 这一条" data-act="vital-del" data-id="${e.id}">${ICON.trash}</button></div>`).join('');
    return `<div class="card stack" style="gap:14px">
      <div class="grid2">
        <div class="field" style="grid-column:1/-1"><label for="v-date">日期</label><input class="input" type="date" id="v-date" value="${today()}"></div>
        <div class="field"><label for="v-w">体重 kg</label><input class="input" id="v-w" inputmode="decimal" placeholder="如 52.0"></div>
        <div class="field"><label for="v-bp">血压 mmHg</label><input class="input" id="v-bp" placeholder="如 110/70"></div>
      </div>
      <button class="btn btn-primary btn-block" data-act="vital-add">添加这一条</button>
      ${list.length ? `<div class="seg-ctl">
        <button type="button" class="${isW ? 'on' : ''}" data-act="vmetric" data-m="w">体重</button>
        <button type="button" class="${isW ? '' : 'on'}" data-act="vmetric" data-m="bp">血压</button></div>
      <div class="row between"><span class="s13" style="color:var(--ink-2)">${summary}</span><span class="small muted">${pts.length ? short(pts[0].date) + ' – ' + short(pts[pts.length - 1].date) : ''}</span></div>
      ${chartSVG(pts, isW)}
      <div class="small muted">${isW ? '粉线：体重' : '粉线：收缩压　绿线：舒张压　黄虚线：140 / 90 警戒线'}</div>
      <div><div class="vt-head"><span>日期</span><span>孕周</span><span>体重</span><span>血压</span><span></span></div>${rows}</div>`
      : '<div class="empty">填了第一条之后，这里会按日期显示明细和变化曲线</div>'}
    </div>`;
  }
  function chartSVG(pts, isW) {
    const W = 320, H = 140, L = 34, R = 10, T = 10, B = 24;
    if (!pts.length) return '<div class="empty">这一项还没有数据</div>';
    const vals = isW ? pts.map((e) => e.w) : pts.flatMap((e) => [e.sys, e.dia]).concat([140, 90]);
    if (isW && S.profile.preWeight != null) vals.push(S.profile.preWeight);
    let lo = Math.min(...vals), hi = Math.max(...vals);
    const padv = Math.max((hi - lo) * 0.12, isW ? 0.5 : 5); lo -= padv; hi += padv;
    const t0 = parseD(pts[0].date).getTime(), t1 = parseD(pts[pts.length - 1].date).getTime();
    const X = (e) => pts.length < 2 || t1 === t0 ? (L + W - R) / 2 : L + (parseD(e.date).getTime() - t0) / (t1 - t0) * (W - L - R);
    const Y = (v) => T + (hi - v) / (hi - lo) * (H - T - B);
    const line = (k, c) => pts.length > 1 ? `<polyline points="${pts.map((e) => X(e).toFixed(1) + ',' + Y(e[k]).toFixed(1)).join(' ')}" fill="none" stroke="${c}" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>` : '';
    const dots = (k, c) => pts.map((e) => `<circle cx="${X(e).toFixed(1)}" cy="${Y(e[k]).toFixed(1)}" r="4" fill="#fff" stroke="${c}" stroke-width="2"/>`).join('');
    const ticks = [lo + padv, (lo + hi) / 2, hi - padv].map((v) => `<text x="${L - 6}" y="${(Y(v) + 4).toFixed(1)}" text-anchor="end" font-size="10" fill="#76666C">${isW ? v.toFixed(1) : Math.round(v)}</text><line x1="${L}" x2="${W - R}" y1="${Y(v).toFixed(1)}" y2="${Y(v).toFixed(1)}" stroke="#F7EAEF"/>`).join('');
    const ref = isW ? (S.profile.preWeight != null ? `<line x1="${L}" x2="${W - R}" y1="${Y(S.profile.preWeight)}" y2="${Y(S.profile.preWeight)}" stroke="#2F7A6B" stroke-dasharray="4 4"/><text x="${W - R}" y="${Y(S.profile.preWeight) - 4}" text-anchor="end" font-size="10" fill="#2F7A6B">孕前</text>` : '')
      : `<line x1="${L}" x2="${W - R}" y1="${Y(140)}" y2="${Y(140)}" stroke="#D9A441" stroke-dasharray="4 4"/><line x1="${L}" x2="${W - R}" y1="${Y(90)}" y2="${Y(90)}" stroke="#D9A441" stroke-dasharray="4 4"/>`;
    const xl = `<text x="${L}" y="${H - 6}" font-size="10" fill="#76666C">${short(pts[0].date)}</text>` + (pts.length > 1 ? `<text x="${W - R}" y="${H - 6}" text-anchor="end" font-size="10" fill="#76666C">${short(pts[pts.length - 1].date)}</text>` : '');
    return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${isW ? '体重' : '血压'}变化曲线">${ticks}${ref}${isW ? line('w', '#B84A70') + dots('w', '#B84A70') : line('sys', '#B84A70') + line('dia', '#2F7A6B') + dots('sys', '#B84A70') + dots('dia', '#2F7A6B')}${xl}</svg>`;
  }

  // ---------- 弹出面板 ----------
  let sheetEl = null; let sheetCtx = {};
  function openSheet(title, body, ctx) {
    closeSheet(true);
    sheetCtx = ctx || {};
    const ov = document.createElement('div'); ov.className = 'overlay'; ov.dataset.act = 'sheet-bg';
    ov.innerHTML = `<div class="sheet" role="dialog" aria-modal="true" aria-label="${esc(title)}"><div class="sheet-grip"></div>
      <div class="sheet-head"><h2>${esc(title)}</h2><button class="icon-btn" aria-label="关闭" data-act="sheet-close">${ICON.close}</button></div>${body}</div>`;
    document.body.appendChild(ov); sheetEl = ov; document.body.style.overflow = 'hidden';
  }
  function closeSheet(silent) {
    if (sheetEl) { sheetEl.remove(); sheetEl = null; document.body.style.overflow = ''; }
    if (!silent) { sheetCtx = {}; ui.rcPending = []; }
  }

  function settingsSheet() {
    const p = S.profile;
    openSheet('孕期信息', `<div class="card stack">
        <div class="field"><label for="st-lmp">末次月经第一天</label><input class="input" type="date" id="st-lmp" value="${p.lmp}"></div>
        <div class="field"><label for="st-edd">或者直接改预产期</label><input class="input" type="date" id="st-edd" value="${edd()}"></div>
        <div class="small muted">两个填一个就行，改其中一个另一个会自动跟着变。B超核对过孕周的话，以医生给的预产期为准。</div>
        <div class="grid2">
          <div class="field"><label for="st-pw">孕前体重 kg</label><input class="input" id="st-pw" inputmode="decimal" value="${p.preWeight != null ? p.preWeight : ''}"></div>
          <div class="field"><label for="st-h">常去医院</label><input class="input" id="st-h" value="${esc(p.hospital || '')}" maxlength="40"></div>
        </div>
        <button class="btn btn-primary btn-block" data-act="settings-save">保存</button>
      </div>
      <div class="card stack">
        <div class="bold">数据</div>
        <div class="grid2"><button class="btn btn-ghost" data-act="export">${ICON.down}导出备份</button><button class="btn btn-ghost" data-act="import">${ICON.up}导入备份</button></div>
        <button class="btn btn-danger btn-block" data-act="wipe">清空这台手机上的所有数据</button>
      </div>
      <p class="small muted" style="margin:12px 4px 0">Baby 不联网保存任何数据，也不会上传照片。</p>`);
    const lmpI = $('#st-lmp'), eddI = $('#st-edd');
    lmpI.addEventListener('change', () => { if (lmpI.value) eddI.value = addDays(lmpI.value, 280); });
    eddI.addEventListener('change', () => { if (eddI.value) lmpI.value = addDays(eddI.value, -280); });
  }

  function checkSheet(id) {
    const c = checkById(id); const { start, end } = checkDates(c); const ck = S.checks[id] || {};
    const recs = S.records.filter((r) => r.checkId === id);
    openSheet('第' + c.n + '次 · ' + c.name, `<div class="card stack">
        <div class="row between"><span class="s13" style="color:var(--ink-2)">${c.weeks} · 建议 ${md(start)} – ${c.id === 'c10' ? '分娩' : md(end)}</span>${c.fasting ? '<span class="tag tag-rose">需空腹</span>' : ''}</div>
        <div class="bold" style="font-size:14px">检查内容</div>
        <ul style="margin:0;padding-left:20px;font-size:14px;line-height:1.8">${c.items.map((x) => '<li>' + esc(x) + '</li>').join('')}</ul>
        <div class="small muted">各医院项目略有不同，以医院开的单子为准。</div>
      </div>
      <div class="card stack">
        <div class="field"><label for="ck-appt">预约日期</label><input class="input" type="date" id="ck-appt" value="${ck.appt || ''}"></div>
        <div class="grid2">
          <button class="btn btn-primary" data-act="check-appt-save" data-id="${id}">保存预约</button>
          <button class="btn btn-ghost" data-act="cal-check" data-id="${id}">${ICON.cal}加入日历</button>
        </div>
      </div>
      <div class="card stack">
        ${recs.length ? recs.map((r) => `<div class="s13">已记录：${ymd(r.date)}</div>`).join('') + `<button class="btn btn-ghost btn-block" data-act="tab" data-tab="records">去看记录</button>`
          : `<button class="btn btn-primary btn-block" data-act="rec-for-check" data-id="${id}">做完了，去记录结果</button>
             <label class="check" style="border:none"><input type="checkbox" data-act="check-done" data-id="${id}" ${ck.done ? 'checked' : ''}><span class="s13">不记录结果，直接标记为已完成</span></label>`}
      </div>`);
  }

  function recordSheet(id) {
    const r = S.records.find((x) => x.id === id); if (!r) return;
    const iss = S.issues.filter((i) => i.recordId === id);
    openSheet(r.title || checkName(r.checkId), `<div class="card stack">
        <div class="s13" style="color:var(--ink-2)">${ymd(r.date)} · 孕${gaText(r.date)}${r.hospital ? ' · ' + esc(r.hospital) : ''}</div>
        <div class="grid3">
          <div class="stat"><div class="k">体重</div><div class="v">${r.weight != null ? r.weight + 'kg' : '—'}</div></div>
          <div class="stat"><div class="k">血压</div><div class="v">${r.sys != null ? r.sys + '/' + r.dia : '—'}</div></div>
          <div class="stat"><div class="k">胎心</div><div class="v">${r.fhr ? esc(r.fhr) : '—'}</div></div>
        </div>
        ${r.note ? `<div class="pre s13">${esc(r.note)}</div>` : ''}
        <div class="thumbs" id="rv-thumbs">${(r.photos || []).map((p) => `<button class="thumb" data-act="photo-view" data-id="${p}" aria-label="查看报告照片"><img data-pid="${p}" alt=""></button>`).join('')}</div>
      </div>
      ${iss.length ? `<div class="card stack"><div class="bold">这次发现的问题</div>${iss.map((i) => `<button class="rec" style="padding:10px 0;border-bottom:1px solid #F7EAEF;border-radius:0" data-act="issue-view" data-id="${i.id}"><span class="row between" style="width:100%"><span>${esc(i.title)}</span><span class="tag ${i.status === 'resolved' ? 'tag-mint">已解决' : 'tag-amber">待复查'}</span></span></button>`).join('')}</div>` : ''}
      <div class="grid2" style="margin-top:12px">
        <button class="btn btn-ghost" data-act="rec-edit" data-id="${id}">编辑</button>
        <button class="btn btn-danger" data-act="rec-del" data-id="${id}">删除</button>
      </div>`);
    fillPhotos('#rv-thumbs');
  }
  function fillPhotos(sel) {
    const imgs = $$(sel + ' img[data-pid]'); const ids = imgs.map((i) => i.dataset.pid);
    loadPhotos(ids).then(() => imgs.forEach((i) => { if (photoCache[i.dataset.pid]) i.src = photoCache[i.dataset.pid]; }));
  }

  function issueFormSheet(id) {
    const i = id ? S.issues.find((x) => x.id === id) : null;
    openSheet(i ? '编辑问题' : '手动添加问题', `<div class="card stack">
        <div class="field"><label for="if-title">问题</label><input class="input" id="if-title" value="${esc(i ? i.title : '')}" placeholder="例如：血红蛋白偏低" maxlength="60"></div>
        <div class="field"><label for="if-detail">具体情况（选填）</label><textarea class="input" id="if-detail" rows="3" placeholder="报告上的数值、描述">${esc(i ? i.detail : '')}</textarea></div>
        <div class="grid2">
          <div class="field" style="grid-column:1/-1"><label for="if-date">发现日期</label><input class="input" type="date" id="if-date" value="${i ? i.foundDate : today()}"></div>
          <div class="field" style="grid-column:1/-1"><label for="if-where">在哪次检查发现（选填）</label><input class="input" id="if-where" value="${esc(i ? i.foundWhere || '' : '')}" placeholder="例如：早孕B超" maxlength="30"></div>
          <div class="field" style="grid-column:1/-1"><label for="if-next">计划复查日期（选填）</label><input class="input" type="date" id="if-next" value="${i ? i.nextDate || '' : ''}"></div>
        </div>
        <div class="field"><label for="if-advice">医生建议（选填）</label><input class="input" id="if-advice" value="${esc(i ? i.advice || '' : '')}" maxlength="120"></div>
        <button class="btn btn-primary btn-block" data-act="issue-save" data-id="${i ? i.id : ''}">保存</button>
      </div>`);
  }

  function issueSheet(id) {
    const i = S.issues.find((x) => x.id === id); if (!i) return;
    const photoIds = (i.followups || []).flatMap((f) => f.photos || []);
    openSheet(i.title, `${issueCard(i).replace('<article class="card">', '<article class="card" style="margin-top:4px">')}
      ${photoIds.length ? `<div class="card stack"><div class="bold">复查报告照片</div><div class="thumbs" id="iv-thumbs">${photoIds.map((p) => `<button class="thumb" data-act="photo-view" data-id="${p}" aria-label="查看报告照片"><img data-pid="${p}" alt=""></button>`).join('')}</div></div>` : ''}
      <div class="card stack">
        ${i.status === 'resolved' ? `<button class="btn btn-ghost btn-block" data-act="issue-reopen" data-id="${id}">重新标记为待复查</button>` : `<button class="btn btn-primary btn-block" data-act="recheck" data-id="${id}">录入复查结果</button>${i.nextDate ? `<button class="btn btn-ghost btn-block" data-act="cal-issue" data-id="${id}">${ICON.cal}复查日期加入日历</button>` : ''}`}
        <div class="grid2"><button class="btn btn-ghost" data-act="issue-edit" data-id="${id}">编辑</button><button class="btn btn-danger" data-act="issue-del" data-id="${id}">删除</button></div>
      </div>`);
    fillPhotos('#iv-thumbs');
  }

  function recheckSheet(id) {
    const i = S.issues.find((x) => x.id === id); if (!i) return;
    ui.rcPending = [];
    openSheet('录入复查结果', `<div class="card stack" style="gap:6px;margin-top:4px">
        <div class="row between"><span class="bold">${esc(i.title)}</span><span class="tag tag-amber">待复查</span></div>
        <div class="small muted">发现 · ${md(i.foundDate)}（孕${gaText(i.foundDate)}）</div>
        ${i.detail ? `<div class="s13 pre" style="color:var(--ink-2)">${esc(i.detail)}</div>` : ''}
      </div>
      <div class="card stack" style="gap:14px">
        <div class="field"><span class="field-label">复查报告照片（选填）</span><div class="thumbs" id="rc-thumbs"></div>
          <button type="button" class="upload" data-act="pick-photo" data-target="recheck"><span class="row" style="gap:6px;font-weight:600">${ICON.cam}拍照或选择报告照片</span></button></div>
        <div class="field"><label for="rc-result">复查结果</label><textarea class="input" id="rc-result" rows="3" placeholder="可以把报告上的关键数值写在这里，方便和上次对比"></textarea></div>
        <div class="grid2">
          <div class="field" style="grid-column:1/-1"><label for="rc-date">复查日期</label><input class="input" type="date" id="rc-date" value="${today()}"></div>
          <div class="field" style="grid-column:1/-1"><label for="rc-item">复查项目（选填）</label><input class="input" id="rc-item" placeholder="例如：B超" maxlength="30"></div>
        </div>
        <div class="field"><span class="field-label">这个问题现在</span>
          <div class="grid2" id="rc-status">
            <button type="button" class="choice" data-act="rc-st" data-v="resolved">已解决</button>
            <button type="button" class="choice" data-act="rc-st" data-v="better">有好转</button>
            <button type="button" class="choice" data-act="rc-st" data-v="same">没变化</button>
            <button type="button" class="choice" data-act="rc-st" data-v="worse">需进一步处理</button>
          </div></div>
        <div class="field"><label for="rc-advice">医生建议（选填）</label><input class="input" id="rc-advice" maxlength="120"></div>
        <div class="field" id="rc-next-wrap"><label for="rc-next">下次复查日期（选填）</label><input class="input" type="date" id="rc-next"></div>
        <button class="btn btn-primary btn-block" data-act="recheck-save" data-id="${id}">保存复查结果</button>
        <div class="small muted" style="text-align:center">保存后接在这个问题的时间线上，可以多次复查</div>
      </div>`, { type: 'recheck', id, status: '' });
  }

  function importSheet(data) {
    const d = data.data;
    openSheet('导入备份', `<div class="card stack">
        <div class="s13">备份时间：${data.exportedAt ? esc(data.exportedAt.slice(0, 16).replace('T', ' ')) : '未知'}</div>
        <div class="s13">包含：${d.records.length} 条记录、${d.issues.length} 个问题、${d.vitals.length} 条体重血压、${Object.keys(data.photos || {}).length} 张照片</div>
        <button class="btn btn-primary btn-block" data-act="import-merge">合并到现有数据</button>
        <button class="btn btn-danger btn-block" data-act="import-replace">覆盖现有数据</button>
        <div class="small muted">合并：两边的内容都保留，相同的条目不会重复。覆盖：这台手机上现有的内容会被替换。</div>
      </div>`, { type: 'import', data });
  }

  // ---------- 动作 ----------
  function goTab(t) { ui.tab = t; closeSheet(); render(); window.scrollTo(0, 0); }

  function saveRecord() {
    const date = $('#rf-date').value; if (!date) return toast('请选择检查日期');
    const checkId = $('#rf-check').value;
    const w = num($('#rf-w').value); const bpRaw = $('#rf-bp').value.trim(); const bp = parseBP(bpRaw);
    if (bpRaw && !bp) return toast('血压请按“110/70”的格式填写');
    if (w != null && (w < 25 || w > 200)) return toast('体重看起来不对，请检查');
    let r = ui.editId ? S.records.find((x) => x.id === ui.editId) : null;
    const isNew = !r;
    if (!r) { r = { id: uid(), createdAt: new Date().toISOString(), photos: [] }; }
    Object.assign(r, { date, checkId, title: checkName(checkId), hospital: $('#rf-hosp').value.trim(), weight: w, sys: bp ? bp.sys : null, dia: bp ? bp.dia : null, fhr: $('#rf-fhr').value.trim(), note: $('#rf-note').value.trim() });
    const keep = ui.pending.filter((p) => p.id).map((p) => p.id);
    const removed = (r.photos || []).filter((id) => !keep.includes(id)); removed.forEach((id) => DB.del(id).catch(() => {}));
    const fresh = ui.pending.filter((p) => !p.id).map((p) => { const id = 'p' + uid(); DB.put(id, p.data).catch(() => toast('照片保存失败')); photoCache[id] = p.data; return id; });
    r.photos = keep.concat(fresh);
    if (isNew) S.records.push(r);
    upsertVital(date, w, bp ? bp.sys : null, bp ? bp.dia : null);
    let added = 0;
    if (isNew && ui.issueMode !== 'none') {
      $$('.cand-cb').forEach((cb) => { if (cb.checked) { S.issues.push(newIssue(ui.cands[+cb.dataset.k], '', date, r.id, 'import', '', '')); added++; } });
      $$('.mrow').forEach((row) => {
        const t = $('.m-title', row).value.trim(); if (!t) return;
        S.issues.push(newIssue(t, '', date, r.id, 'manual', $('.m-advice', row).value.trim(), $('.m-next', row).value)); added++;
      });
    }
    save();
    ui.addOpen = false; ui.editId = null; ui.pending = []; ui.cands = []; ui.issueMode = 'none';
    render(); window.scrollTo(0, 0);
    toast(added ? '已保存，' + added + ' 个问题已加到首页' : '已保存');
  }
  const newIssue = (title, detail, foundDate, recordId, source, advice, nextDate) => ({ id: uid(), title, detail, foundDate, recordId, source, advice, nextDate: nextDate || '', status: 'open', followups: [] });

  function doExport() {
    DB.all().catch(() => ({})).then((photos) => {
      const ts = new Date().toISOString();
      S.lastBackup = ts; save();
      const payload = { app: 'baby', v: 1, exportedAt: ts, data: S, photos };
      saveFile('baby-备份-' + today() + '.json', JSON.stringify(payload), 'application/json').then(() => { render(); toast('备份文件已生成'); });
    });
  }
  function pickFile(accept, multiple) {
    return new Promise((res) => {
      const inp = document.createElement('input'); inp.type = 'file'; inp.accept = accept; if (multiple) inp.multiple = true;
      inp.style.display = 'none'; document.body.appendChild(inp);
      inp.addEventListener('change', () => { res(Array.from(inp.files || [])); inp.remove(); });
      inp.click();
    });
  }
  function doImport() {
    pickFile('.json,application/json', false).then(([f]) => {
      if (!f) return;
      f.text().then((txt) => {
        let data; try { data = JSON.parse(txt); } catch (e) { return toast('这不是有效的备份文件'); }
        if (!data || data.app !== 'baby' || !data.data || !Array.isArray(data.data.records)) return toast('这不是 Baby 的备份文件');
        data.data = Object.assign(blank(), data.data);
        if (!lmp()) return applyImport(data, true);
        importSheet(data);
      });
    });
  }
  function applyImport(data, replace) {
    const d = data.data; const photos = data.photos || {};
    const putAll = () => Promise.all(Object.keys(photos).map((k) => DB.put(k, photos[k]))).catch(() => toast('部分照片导入失败'));
    if (replace) {
      S = d; save();
      DB.clear().catch(() => {}).then(putAll).then(() => { closeSheet(); render(); toast('已导入备份'); });
      return;
    }
    const mergeArr = (a, b) => { const ids = new Set(a.map((x) => x.id)); b.forEach((x) => { if (!ids.has(x.id)) a.push(x); }); };
    mergeArr(S.records, d.records); mergeArr(S.issues, d.issues); mergeArr(S.myTips, d.myTips || []);
    d.vitals.forEach((v) => { if (!S.vitals.some((x) => x.id === v.id || x.date === v.date)) S.vitals.push(v); });
    Object.keys(d.checks || {}).forEach((k) => { S.checks[k] = Object.assign({}, d.checks[k], S.checks[k]); });
    if (!S.profile.lmp) S.profile.lmp = d.profile.lmp;
    if (S.profile.preWeight == null) S.profile.preWeight = d.profile.preWeight;
    if (!S.profile.hospital) S.profile.hospital = d.profile.hospital;
    save(); putAll().then(() => { closeSheet(); render(); toast('已合并备份'); });
  }

  function addPhotos(target) {
    pickFile('image/*', true).then((files) => {
      if (!files.length) return;
      toast('正在处理照片…');
      Promise.all(files.map((f) => compressImage(f).catch(() => null))).then((list) => {
        list.filter(Boolean).forEach((data) => (target === 'recheck' ? ui.rcPending : ui.pending).push({ data }));
        renderThumbs(target === 'recheck' ? '#rc-thumbs' : '#rf-thumbs');
      });
    });
  }

  document.addEventListener('click', (ev) => {
    const el = ev.target.closest('[data-act]'); if (!el) return;
    const act = el.dataset.act; const id = el.dataset.id;
    if (act === 'sheet-bg' && ev.target !== el) return;
    if (el.tagName === 'INPUT') return; // 复选框走 change
    switch (act) {
      case 'tab': goTab(el.dataset.tab); break;
      case 'sheet-bg': case 'sheet-close': closeSheet(); break;
      case 'setup-mode': {
        $$('[data-act="setup-mode"]').forEach((b) => b.classList.toggle('on', b === el));
        $('#setup-label').textContent = el.dataset.mode === 'lmp' ? '末次月经第一天' : '预产期'; $('#setup-date').dataset.mode = el.dataset.mode; break;
      }
      case 'setup-save': {
        const v = $('#setup-date').value; if (!v) return toast('请先选择日期');
        S.profile.lmp = $('#setup-date').dataset.mode === 'edd' ? addDays(v, -280) : v;
        const g = gaOf(today()); if (!g || g.w > 44) { S.profile.lmp = ''; return toast('日期好像不对，请再检查一下'); }
        save(); render(); break;
      }
      case 'settings': settingsSheet(); break;
      case 'settings-save': {
        const l = $('#st-lmp').value; if (!l) return toast('请填写末次月经或预产期');
        S.profile.lmp = l; S.profile.preWeight = num($('#st-pw').value); S.profile.hospital = $('#st-h').value.trim();
        save(); closeSheet(); render(); toast('已保存'); break;
      }
      case 'wipe':
        if (confirm('确定清空这台手机上 Baby 的所有数据吗？清空前建议先导出备份。')) {
          S = blank(); save(); DB.clear().catch(() => {}); closeSheet(); ui.tab = 'home'; render();
        } break;
      case 'goto-add': ui.tab = 'records'; ui.addOpen = true; ui.editId = null; ui.pending = []; ui.cands = []; ui.issueMode = 'yes'; render(); window.scrollTo(0, 0); break;
      case 'toggle-resolved': ui.showResolved = !ui.showResolved; render(); break;
      case 'issue-new': issueFormSheet(null); break;
      case 'issue-edit': issueFormSheet(id); break;
      case 'issue-view': issueSheet(id); break;
      case 'issue-save': {
        const t = $('#if-title').value.trim(); if (!t) return toast('请填写问题');
        let i = id && S.issues.find((x) => x.id === id);
        if (!i) { i = newIssue(t, '', today(), '', 'manual', '', ''); S.issues.push(i); }
        Object.assign(i, { title: t, detail: $('#if-detail').value.trim(), foundDate: $('#if-date').value || today(), foundWhere: $('#if-where').value.trim(), nextDate: $('#if-next').value, advice: $('#if-advice').value.trim() });
        save(); closeSheet(); render(); toast('已保存'); break;
      }
      case 'issue-del':
        if (confirm('删除这个问题和它的复查记录？')) {
          const i = S.issues.find((x) => x.id === id); (i.followups || []).forEach((f) => (f.photos || []).forEach((p) => DB.del(p).catch(() => {})));
          S.issues = S.issues.filter((x) => x.id !== id); save(); closeSheet(); render();
        } break;
      case 'issue-reopen': { const i = S.issues.find((x) => x.id === id); i.status = 'open'; save(); closeSheet(); render(); break; }
      case 'recheck': recheckSheet(id); break;
      case 'rc-st': $$('#rc-status .choice').forEach((b) => b.classList.toggle('on', b === el)); sheetCtx.status = el.dataset.v; $('#rc-next-wrap').classList.toggle('hidden', el.dataset.v === 'resolved'); break;
      case 'recheck-save': {
        const i = S.issues.find((x) => x.id === id);
        const result = $('#rc-result').value.trim();
        if (!result && !ui.rcPending.length) return toast('请填写复查结果，或者上传报告照片');
        if (!sheetCtx.status) return toast('请选择这个问题现在的情况');
        const photos = ui.rcPending.map((p) => { const pid = 'p' + uid(); DB.put(pid, p.data).catch(() => toast('照片保存失败')); photoCache[pid] = p.data; return pid; });
        const date = $('#rc-date').value || today();
        const next = sheetCtx.status === 'resolved' ? '' : $('#rc-next').value;
        i.followups = i.followups || [];
        i.followups.push({ id: uid(), date, item: $('#rc-item').value.trim(), result, status: sheetCtx.status, advice: $('#rc-advice').value.trim(), photos });
        i.status = sheetCtx.status === 'resolved' ? 'resolved' : 'open';
        i.nextDate = next;
        save(); ui.rcPending = []; closeSheet(); render(); toast(i.status === 'resolved' ? '太好了，已标记为解决' : '已保存复查结果'); break;
      }
      case 'cal-issue': { const i = S.issues.find((x) => x.id === id); addToCalendar('复查：' + i.title, i.nextDate, i.advice || ''); break; }
      case 'check-view': checkSheet(id); break;
      case 'check-appt-save': {
        const v = $('#ck-appt').value; S.checks[id] = Object.assign({}, S.checks[id], { appt: v }); save(); closeSheet(); render(); toast(v ? '已保存预约日期' : '已清除预约'); break;
      }
      case 'cal-check': {
        const c = checkById(id); const appt = ($('#ck-appt') && $('#ck-appt').value) || (S.checks[id] && S.checks[id].appt) || checkDates(c).start;
        addToCalendar('产检：第' + c.n + '次 ' + c.name + (c.fasting ? '（需空腹）' : ''), appt, c.items.join('、')); break;
      }
      case 'rec-for-check': ui.tab = 'records'; ui.addOpen = true; ui.editId = null; ui.pending = []; ui.cands = []; ui.issueMode = 'none'; closeSheet(); render();
        setTimeout(() => { const s = $('#rf-check'); if (s) s.value = id; }, 0); window.scrollTo(0, 0); break;
      case 'add-open': ui.addOpen = true; ui.editId = null; ui.pending = []; ui.cands = []; ui.issueMode = 'none'; render(); break;
      case 'add-close': ui.addOpen = false; ui.editId = null; ui.pending = []; ui.cands = []; render(); break;
      case 'issue-mode': ui.issueMode = el.dataset.mode; $$('[data-act="issue-mode"]').forEach((b) => b.classList.toggle('on', b === el)); $('#rf-issues').classList.toggle('hidden', ui.issueMode === 'none'); break;
      case 'paste-parse': {
        const txt = $('#rf-paste').value; if (!txt.trim()) return toast('先粘贴报告文字');
        ui.cands = findAbnormal(txt); renderCands();
        if (!ui.cands.length) toast('没找到带异常标记的项目，可以在下面手动填写'); break;
      }
      case 'manual-row': $('#rf-manual').insertAdjacentHTML('beforeend', manualRowHTML()); break;
      case 'pick-photo': addPhotos(el.dataset.target); break;
      case 'photo-remove': { const rc = el.dataset.target === 'recheck'; (rc ? ui.rcPending : ui.pending).splice(+el.dataset.k, 1); renderThumbs(rc ? '#rc-thumbs' : '#rf-thumbs'); break; }
      case 'photo-view': {
        const src = photoCache[id]; if (!src) return;
        const v = document.createElement('div'); v.className = 'viewer'; v.innerHTML = `<img src="${src}" alt="报告照片">`; v.addEventListener('click', () => v.remove()); document.body.appendChild(v); break;
      }
      case 'rec-save': saveRecord(); break;
      case 'rec-view': recordSheet(id); break;
      case 'rec-edit': {
        const r = S.records.find((x) => x.id === id);
        loadPhotos(r.photos || []).then(() => {
          ui.tab = 'records'; ui.addOpen = true; ui.editId = id; ui.cands = [];
          ui.pending = (r.photos || []).filter((p) => photoCache[p]).map((p) => ({ id: p, data: photoCache[p] }));
          closeSheet(true); render(); window.scrollTo(0, 0);
        }); break;
      }
      case 'rec-del':
        if (confirm('删除这条记录？这次记录里发现的问题会保留在首页。')) {
          const r = S.records.find((x) => x.id === id); (r.photos || []).forEach((p) => DB.del(p).catch(() => {}));
          S.records = S.records.filter((x) => x.id !== id); save(); closeSheet(); render();
        } break;
      case 'vital-add': {
        const date = $('#v-date').value; const w = num($('#v-w').value); const bpRaw = $('#v-bp').value.trim(); const bp = parseBP(bpRaw);
        if (!date) return toast('请选择日期');
        if (bpRaw && !bp) return toast('血压请按“110/70”的格式填写');
        if (w == null && !bp) return toast('体重和血压至少填一项');
        if (w != null && (w < 25 || w > 200)) return toast('体重看起来不对，请检查');
        upsertVital(date, w, bp ? bp.sys : null, bp ? bp.dia : null); save();
        if (bp && (bp.sys >= 140 || bp.dia >= 90)) toast('血压偏高，建议休息后复测，持续偏高请联系医生');
        render(); break;
      }
      case 'vital-del': S.vitals = S.vitals.filter((x) => x.id !== id); save(); render(); break;
      case 'vmetric': ui.vMetric = el.dataset.m; render(); break;
      case 'mytip-add': {
        const v = $('#mytip-input').value.trim(); if (!v) return;
        S.myTips.push({ id: uid(), text: v, done: false }); save(); render(); break;
      }
      case 'mytip-del': S.myTips = S.myTips.filter((m) => m.id !== id); save(); render(); break;
      case 'export': doExport(); break;
      case 'import': doImport(); break;
      case 'import-merge': applyImport(sheetCtx.data, false); break;
      case 'import-replace': if (confirm('覆盖后，这台手机上现有的数据会被替换，确定吗？')) applyImport(sheetCtx.data, true); break;
    }
  });
  document.addEventListener('change', (ev) => {
    const el = ev.target; const act = el.dataset && el.dataset.act; if (!act) return;
    if (act === 'tip') { const k = el.dataset.key; S.tips[k] = S.tips[k] || {}; S.tips[k][el.dataset.i] = el.checked; save(); el.closest('.check').classList.toggle('done', el.checked); }
    if (act === 'mytip') { const m = S.myTips.find((x) => x.id === el.dataset.id); m.done = el.checked; save(); el.closest('.check').classList.toggle('done', el.checked); }
    if (act === 'check-done') { S.checks[el.dataset.id] = Object.assign({}, S.checks[el.dataset.id], { done: el.checked }); save(); render(); }
  });
  document.addEventListener('keydown', (ev) => {
    if (ev.key === 'Escape' && sheetEl) closeSheet();
    if (ev.key === 'Enter' && ev.target.id === 'mytip-input') { ev.preventDefault(); $('[data-act="mytip-add"]').click(); }
  });

  // ---------- 启动 ----------
  $('#nav').innerHTML = `<div class="nav-in">
    <button data-act="tab" data-tab="home">${ICON.home}首页</button>
    <button data-act="tab" data-tab="schedule">${ICON.calNav}产检</button>
    <button data-act="tab" data-tab="records">${ICON.doc}记录</button></div>`;
  render();
  if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
  if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
  window.__baby = { get state() { return S; } };
})();
