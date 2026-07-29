/* =========================================================================
   דוד הספר – שכבת נתונים (צד אתר) מול ה-Cloudflare Worker
   -------------------------------------------------------------------------
   כל הנתונים מגיעים מה-Worker (שמחזיק את פרטי ימות בשרת). אין כאן סיסמאות.
   הממשק הציבורי זהה לגרסה הקודמת, כך ש-booking.js ו-admin.js לא השתנו.
   אם ה-Worker לא נגיש (רשת מסוננת) — נזרקת שגיאה, וה-UI מציג הפניה לטלפון.
   ========================================================================= */

const Store = (function () {
  'use strict';

  const WORKER = (typeof window !== 'undefined' && window.DAVID_WORKER_URL) || '';
  const SLOT_MINUTES = 10;
  const DAY_NAMES = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'מוצ"ש'];

  /* ---- עזרי זמן ---- */
  function toMinutes(hhmm) { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m; }
  function toHHMM(mins) { return String(Math.floor(mins/60)).padStart(2,'0')+':'+String(mins%60).padStart(2,'0'); }
  function ymd(d) { return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }
  function weekdayOf(s) { const [y,m,d]=s.split('-').map(Number); return new Date(y,m-1,d).getDay(); }
  function hoursFor(s, wd) {   // שעות ליום מסוים (עם נפילה חזרה לברירת מחדל גלובלית)
    const dh = s.dayHours && s.dayHours[wd];
    return { start: (dh && dh.start) || s.startTime, end: (dh && dh.end) || s.endTime };
  }

  /* ---- קריאות ל-Worker ---- */
  async function api(path, body) {
    const opt = body
      ? { method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify(body) }
      : {};
    let res;
    try { res = await fetch(WORKER + path, opt); }
    catch (e) { const err = new Error('WORKER_UNREACHABLE'); err.unreachable = true; throw err; }
    let data; try { data = await res.json(); } catch (e) { data = {}; }
    return { status: res.status, data };
  }

  let _pw = null;                    // סיסמת ניהול (נשמרת אחרי כניסה)
  let _state = null, _stateAt = 0;   // מטמון מצב ציבורי

  async function state(force) {
    if (!force && _state && Date.now() - _stateAt < 4000) return _state;
    const { data } = await api('/api/state');
    if (!data.ok) throw new Error('state failed');
    // בונים אובייקט data תואם ללוגיקה: bookings עם date+time בלבד
    _state = { settings: data.settings, blocks: data.blocks || [], bookings: data.taken || [] };
    _stateAt = Date.now();
    return _state;
  }

  /* ---- לוגיקה עסקית (פועלת על אובייקט data) ---- */
  function slotBlocked(data, dateStr, tMin) {
    return data.blocks.some(b => b.date===dateStr && (b.allDay || (tMin>=toMinutes(b.from) && tMin<toMinutes(b.to))));
  }
  function availableSlots(data, dateStr) {
    const s = data.settings;
    if (!s.workDays.includes(weekdayOf(dateStr))) return [];
    const wh = hoursFor(s, weekdayOf(dateStr));
    const start = toMinutes(wh.start), end = toMinutes(wh.end);
    const now = new Date(), isToday = dateStr===ymd(now), nowM = now.getHours()*60+now.getMinutes();
    const taken = new Set(data.bookings.filter(b=>b.date===dateStr).map(b=>b.time));
    const out = [];
    for (let t=start, step=s.slotMinutes||10; t+step<=end; t+=step) {
      const time = toHHMM(t);
      if (isToday && t<=nowM) continue;
      if (taken.has(time)) continue;
      if (slotBlocked(data, dateStr, t)) continue;
      out.push(time);
    }
    return out;
  }
  function isFree(data, dateStr, time) {
    const s = data.settings;
    if (!s.workDays.includes(weekdayOf(dateStr))) return false;
    const t = toMinutes(time);
    const wh = hoursFor(s, weekdayOf(dateStr));
    if (t < toMinutes(wh.start) || t >= toMinutes(wh.end)) return false;
    if (slotBlocked(data, dateStr, t)) return false;
    return !data.bookings.some(b => b.date===dateStr && b.time===time);
  }

  /* ---- ניהול: שליפת נתונים מלאים ---- */
  async function adminList() {
    if (_pw == null) throw new Error('not authenticated');
    const { data } = await api('/api/admin', { password: _pw, action: 'list' });
    if (!data.ok) throw new Error('admin list failed');
    return data;   // { settings, blocks, bookings }
  }

  return {
    SLOT_MINUTES, DAY_NAMES, ymd, weekdayOf, toMinutes, toHHMM,
    get backendName() { return 'worker'; },

    /* ----- ציבורי ----- */
    async getSettings() { return (await state()).settings; },
    async getAvailableSlots(dateStr) { return availableSlots(await state(), dateStr); },
    async isSlotFree(dateStr, time) { return isFree(await state(), dateStr, time); },
    async upcomingOpenDays() {
      const data = await state();
      const s = data.settings, out = [], today = new Date();
      for (let i=0; i<(s.bookAheadDays||21); i++) {
        const d = new Date(today); d.setDate(today.getDate()+i);
        const dateStr = ymd(d);
        if (!s.workDays.includes(d.getDay())) continue;
        if (data.blocks.some(b=>b.date===dateStr && b.allDay)) continue;
        out.push({ date:dateStr, weekday:d.getDay(), dayName:DAY_NAMES[d.getDay()], freeCount: availableSlots(data, dateStr).length });
      }
      return out;
    },
    async book({ date, time, name, phone }) {
      const { data } = await api('/api/book', { date, time, name, phone });
      _state = null;   // רענון מטמון
      return data;     // { ok, booking } | { ok:false, error }
    },

    /* ----- ניהול (מוגן סיסמה) ----- */
    async checkPassword(pw) {
      const { status, data } = await api('/api/admin', { password: pw, action: 'list' });
      if (status === 200 && data.ok) { _pw = pw; return true; }
      return false;
    },
    async getBookings(dateStr) {
      const all = (await adminList()).bookings;
      return (dateStr ? all.filter(b=>b.date===dateStr) : all)
        .sort((a,b)=>(a.date+a.time).localeCompare(b.date+b.time));
    },
    async cancelBooking(id) {
      const { data } = await api('/api/admin', { password:_pw, action:'cancel', id });
      _state = null; return !!data.ok;
    },
    async getBlocks() { return (await adminList()).blocks; },
    async addBlock(block) {
      const { data } = await api('/api/admin', { password:_pw, action:'addBlock', block });
      _state = null; return data.block;
    },
    async removeBlock(id) {
      await api('/api/admin', { password:_pw, action:'removeBlock', id });
      _state = null;
    },
    async closeEarly(dateStr, fromTime) {
      const s = (await adminList()).settings;
      return this.addBlock({ date:dateStr, from:fromTime, to:s.endTime });
    },
    async closeDay(dateStr) { return this.addBlock({ date:dateStr, allDay:true }); },
    async saveSettings(partial) {
      const { data } = await api('/api/admin', { password:_pw, action:'settings', settings: partial });
      _state = null; return data.settings;
    }
  };
})();

window.Store = Store;
