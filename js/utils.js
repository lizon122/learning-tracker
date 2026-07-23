// utils.js — Utility functions for Learning Progress Analyzer
window.LPA = window.LPA || {};

LPA.Utils = (function() {
  function generateId() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return 'id_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 9);
  }

  function formatMinutes(min) {
    if (min <= 0) return '0m';
    var h = Math.floor(min / 60);
    var m = min % 60;
    if (h === 0) return m + 'm';
    if (m === 0) return h + 'h';
    return h + 'h ' + m + 'm';
  }

  function today() {
    var d = new Date();
    return d.getFullYear() + '-' +
      String(d.getMonth() + 1).padStart(2, '0') + '-' +
      String(d.getDate()).padStart(2, '0');
  }

  function weekRange() {
    var now = new Date();
    var day = now.getDay();
    var diff = day === 0 ? 6 : day - 1;
    var monday = new Date(now);
    monday.setDate(now.getDate() - diff);
    monday.setHours(0, 0, 0, 0);
    var sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);
    function fmt(d) {
      return d.getFullYear() + '-' +
        String(d.getMonth() + 1).padStart(2, '0') + '-' +
        String(d.getDate()).padStart(2, '0');
    }
    return { start: fmt(monday), end: fmt(sunday) };
  }

  function escapeHtml(str) {
    var div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
  }

  function showToast(msg) {
    var existing = document.querySelector('.toast');
    if (existing) existing.remove();
    var toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = msg;
    document.body.appendChild(toast);
    setTimeout(function() { toast.remove(); }, 2500);
  }

  return {
    generateId: generateId,
    formatMinutes: formatMinutes,
    today: today,
    weekRange: weekRange,
    escapeHtml: escapeHtml,
    showToast: showToast
  };
})();