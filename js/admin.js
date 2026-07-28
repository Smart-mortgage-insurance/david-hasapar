/* דוד הספר – לוגיקת דף הניהול */
(function () {
  'use strict';

  const el = id => document.getElementById(id);
  let adminDate = null;

  function fmtDate(dateStr) { const [y,m,d]=dateStr.split('-'); return `${d}/${m}`; }
  function showMsg(box, text, type) { box.textContent = text; box.className = 'msg show ' + type; }

  /* ---------- כניסה ---------- */
  async function login() {
    const pw = el('pw').value;
    if (await Store.checkPassword(pw)) {
      sessionStorage.setItem('davidAdmin', '1');
      openPanel();
    } else {
      showMsg(el('loginMsg'), 'סיסמה שגויה', 'err');
    }
  }
  el('loginBtn').addEventListener('click', login);
  el('pw').addEventListener('keydown', e => { if (e.key === 'Enter') login(); });

  function openPanel() {
    el('loginCard').classList.add('hidden');
    el('panel').classList.remove('hidden');
    initTabs();
    loadAdminDays();
    loadBlocks();
    loadSettings();
    // תאריך ברירת מחדל בסגירות = היום
    el('closeDate').value = Store.ymd(new Date());
  }

  /* ---------- טאבים ---------- */
  function initTabs() {
    document.querySelectorAll('.tab-links button').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.tab-links button').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        document.querySelectorAll('.tab').forEach(t => t.classList.add('hidden'));
        el('tab-' + btn.dataset.tab).classList.remove('hidden');
      });
    });
  }

  /* ---------- תורים ---------- */
  async function loadAdminDays() {
    const s = await Store.getSettings();
    const box = el('adminDays');
    box.innerHTML = '';
    const today = new Date();
    let first = null;
    for (let i = 0; i < (s.bookAheadDays || 21); i++) {
      const d = new Date(today); d.setDate(today.getDate() + i);
      const dateStr = Store.ymd(d);
      if (!s.workDays.includes(d.getDay())) continue;
      const bookings = await Store.getBookings(dateStr);
      const div = document.createElement('div');
      div.className = 'day';
      div.innerHTML = `<div class="dname">${Store.DAY_NAMES[d.getDay()]}</div>
                       <div class="ddate">${fmtDate(dateStr)}</div>
                       <div class="dfree">${bookings.length} תורים</div>`;
      div.addEventListener('click', () => selectAdminDay(dateStr, div));
      box.appendChild(div);
      if (!first) first = { dateStr, div };
    }
    if (first) selectAdminDay(first.dateStr, first.div);
  }

  async function selectAdminDay(dateStr, div) {
    document.querySelectorAll('#adminDays .day').forEach(x => x.classList.remove('active'));
    div.classList.add('active');
    adminDate = dateStr;
    renderBookings(dateStr);
  }

  async function renderBookings(dateStr) {
    const box = el('adminBookings');
    const bookings = await Store.getBookings(dateStr);
    if (!bookings.length) {
      box.innerHTML = '<div class="empty-note">אין תורים ליום הזה.</div>';
      return;
    }
    box.innerHTML = '';
    bookings.forEach(b => {
      const row = document.createElement('div');
      row.className = 'booking-row';
      const srcLabel = b.source === 'phone' ? 'טלפון' : 'אתר';
      row.innerHTML = `
        <div class="time">${b.time}</div>
        <div class="info">
          <div class="nm">${escapeHtml(b.name)}</div>
          <div class="ph">${escapeHtml(b.phone)}</div>
        </div>
        <span class="src ${b.source === 'phone' ? 'phone' : ''}">${srcLabel}</span>
        <button class="btn danger small">בטל</button>`;
      row.querySelector('button').addEventListener('click', async () => {
        if (confirm(`לבטל את התור של ${b.name} בשעה ${b.time}?`)) {
          await Store.cancelBooking(b.id);
          renderBookings(dateStr);
          loadAdminDays();
        }
      });
      box.appendChild(row);
    });
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }

  /* ---------- סגירות ---------- */
  el('closeDayBtn').addEventListener('click', async () => {
    const date = el('closeDate').value;
    if (!date) return showMsg(el('closeMsg'), 'בחר תאריך', 'err');
    await Store.closeDay(date);
    showMsg(el('closeMsg'), `יום ${fmtDate(date)} נסגר לגמרי`, 'ok');
    loadBlocks(); loadAdminDays();
  });

  el('closeEarlyBtn').addEventListener('click', async () => {
    const date = el('closeDate').value;
    const from = el('closeFrom').value;
    if (!date || !from) return showMsg(el('closeMsg'), 'בחר תאריך ושעה', 'err');
    await Store.closeEarly(date, from);
    showMsg(el('closeMsg'), `ביום ${fmtDate(date)} סגור מהשעה ${from}`, 'ok');
    loadBlocks(); loadAdminDays();
  });

  el('blockRangeBtn').addEventListener('click', async () => {
    const date = el('closeDate').value;
    const from = el('blockFrom').value, to = el('blockTo').value;
    if (!date || !from || !to) return showMsg(el('closeMsg'), 'מלא תאריך ושעות', 'err');
    if (from >= to) return showMsg(el('closeMsg'), 'שעת סיום חייבת להיות אחרי ההתחלה', 'err');
    await Store.addBlock({ date, from, to });
    showMsg(el('closeMsg'), `נחסם ${from}–${to} ביום ${fmtDate(date)}`, 'ok');
    loadBlocks(); loadAdminDays();
  });

  async function loadBlocks() {
    const box = el('blocksList');
    const blocks = (await Store.getBlocks()).slice().sort((a,b)=> (a.date||'').localeCompare(b.date||''));
    if (!blocks.length) { box.innerHTML = '<div class="empty-note">אין סגירות.</div>'; return; }
    box.innerHTML = '';
    blocks.forEach(b => {
      const row = document.createElement('div');
      row.className = 'booking-row';
      const desc = b.allDay ? 'יום סגור לגמרי' : `סגור ${b.from}–${b.to}`;
      row.innerHTML = `<div class="time">${fmtDate(b.date)}</div>
                       <div class="info"><div class="nm">${desc}</div></div>
                       <button class="btn secondary small">בטל סגירה</button>`;
      row.querySelector('button').addEventListener('click', async () => {
        await Store.removeBlock(b.id);
        loadBlocks(); loadAdminDays();
      });
      box.appendChild(row);
    });
  }

  /* ---------- הגדרות ---------- */
  async function loadSettings() {
    const s = await Store.getSettings();
    // צ'יפים של ימים
    const box = el('dayChips');
    box.innerHTML = '';
    Store.DAY_NAMES.forEach((name, idx) => {
      const chip = document.createElement('div');
      chip.className = 'chip' + (s.workDays.includes(idx) ? ' on' : '');
      chip.textContent = name;
      chip.dataset.day = idx;
      chip.addEventListener('click', () => chip.classList.toggle('on'));
      box.appendChild(chip);
    });
    el('startTime').value = s.startTime;
    el('endTime').value = s.endTime;
    el('bizNameIn').value = s.businessName || '';
    el('bookAhead').value = s.bookAheadDays || 21;
  }

  el('saveSettingsBtn').addEventListener('click', async () => {
    const days = [...document.querySelectorAll('#dayChips .chip.on')].map(c => Number(c.dataset.day));
    const start = el('startTime').value, end = el('endTime').value;
    if (!days.length) return showMsg(el('settingsMsg'), 'בחר לפחות יום עבודה אחד', 'err');
    if (start >= end) return showMsg(el('settingsMsg'), 'שעת סגירה חייבת להיות אחרי הפתיחה', 'err');
    await Store.saveSettings({
      workDays: days.sort(),
      startTime: start,
      endTime: end,
      businessName: el('bizNameIn').value.trim() || 'דוד הספר',
      bookAheadDays: Math.max(1, Math.min(90, parseInt(el('bookAhead').value) || 21))
    });
    showMsg(el('settingsMsg'), '✅ ההגדרות נשמרו', 'ok');
    loadAdminDays();
  });

  el('savePwBtn').addEventListener('click', async () => {
    const npw = el('newPw').value.trim();
    if (npw.length < 3) return showMsg(el('settingsMsg'), 'סיסמה קצרה מדי (לפחות 3 תווים)', 'err');
    await Store.saveSettings({ adminPassword: npw });
    el('newPw').value = '';
    showMsg(el('settingsMsg'), '✅ הסיסמה עודכנה', 'ok');
  });

  /* ---------- כניסה אוטומטית אם כבר מחובר ---------- */
  if (sessionStorage.getItem('davidAdmin') === '1') openPanel();

})();
