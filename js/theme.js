/* דוד הספר – ערכות עיצוב משותפות (אתר הלקוחות + פאנל הניהול).
   המנהל בוחר ערכה בדף ההגדרות; היא נשמרת ב-settings.theme בשרת וחלה על כולם. */
(function () {
  'use strict';

  // 8 ערכות — id תואם ל-[data-theme="id"] ב-CSS. bg/accent משמשים לתצוגה מקדימה בכפתור.
  var THEMES = [
    { id: '1', name: 'זהב קלאסי',   bg: '#0f1720', accent: '#d9a441' },
    { id: '2', name: 'כחול ים',     bg: '#0c1826', accent: '#38b6c9' },
    { id: '3', name: 'ירוק יער',    bg: '#0c1a15', accent: '#3fb27f' },
    { id: '4', name: 'יין בורדו',   bg: '#1e0f13', accent: '#e0637a' },
    { id: '5', name: 'סגול מלכותי', bg: '#150e26', accent: '#9b7be0' },
    { id: '6', name: 'פחם וכתום',   bg: '#131314', accent: '#f0863a' },
    { id: '7', name: 'בהיר נקי',    bg: '#f4f7fb', accent: '#2f7be0' },
    { id: '8', name: 'בהיר חם',     bg: '#faf5ec', accent: '#c08a2e' }
  ];
  var CACHE_KEY = 'davidTheme';
  var DEFAULT = '1';

  function normalize(id) {
    id = String(id == null ? '' : id);
    return THEMES.some(function (t) { return t.id === id; }) ? id : DEFAULT;
  }

  function apply(id) {
    id = normalize(id);
    var root = document.documentElement;
    if (id === DEFAULT) root.removeAttribute('data-theme');
    else root.setAttribute('data-theme', id);
    try { localStorage.setItem(CACHE_KEY, id); } catch (e) {}
    // מעדכן את צבע סרגל הדפדפן בנייד
    var t = THEMES.filter(function (x) { return x.id === id; })[0] || THEMES[0];
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', t.bg);
    return id;
  }

  function cached() {
    try { return normalize(localStorage.getItem(CACHE_KEY)); } catch (e) { return DEFAULT; }
  }

  window.DavidTheme = { THEMES: THEMES, apply: apply, cached: cached, normalize: normalize, DEFAULT: DEFAULT };
})();
