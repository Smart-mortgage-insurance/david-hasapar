/* דוד הספר – ערכות עיצוב משותפות (אתר הלקוחות + פאנל הניהול).
   המנהל בוחר ערכה בדף ההגדרות; היא נשמרת ב-settings.theme בשרת וחלה על כולם. */
(function () {
  'use strict';

  // 10 ערכות — id תואם ל-[data-theme="id"] ב-CSS. bg/accent משמשים לתצוגה מקדימה בכפתור.
  var THEMES = [
    { id: '1',  name: 'זהב חם',       bg: '#14110b', accent: '#e0a63a' },
    { id: '2',  name: 'אינדיגו',      bg: '#0b0f1a', accent: '#6366f1' },
    { id: '3',  name: 'אמרלד',        bg: '#0a1411', accent: '#10b981' },
    { id: '4',  name: 'טורקיז',       bg: '#08151a', accent: '#06b6d4' },
    { id: '5',  name: 'סגול',         bg: '#120e1c', accent: '#8b5cf6' },
    { id: '6',  name: 'נייבי-אלמוג',  bg: '#0b1220', accent: '#fb7245' },
    { id: '7',  name: 'מונוכרום',     bg: '#0d0d0f', accent: '#e4e4e7' },
    { id: '8',  name: 'בהיר אינדיגו', bg: '#f7f8fc', accent: '#4f46e5' },
    { id: '9',  name: 'ספא בז׳',      bg: '#faf7f2', accent: '#b08968' },
    { id: '10', name: 'ורוד בלאש',    bg: '#fdf3f7', accent: '#ec4899' }
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
