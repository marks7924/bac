/**
 * utils.js \u2014 Shared utility functions
 */

const Utils = (() => {

  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  function todayStr() {
    const d = new Date();
    return formatDateKey(d);
  }

  function formatDateKey(date) {
    const d = typeof date === 'string' ? new Date(date + 'T00:00:00') : date;
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  }

  function parseDate(str) {
    if (!str) return null;
    return new Date(str + 'T00:00:00');
  }

  function isAr() {
    return (window.lang === 'ar') || (document.documentElement.lang === 'ar') || (document.documentElement.dir === 'rtl');
  }

  function formatDisplayDate(str) {
    if (!str) return '';
    const d = parseDate(str);
    const today = new Date();
    const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate()+1);
    const yesterday = new Date(); yesterday.setDate(yesterday.getDate()-1);
    const ar = isAr();
    if (formatDateKey(d) === formatDateKey(today)) return ar ? 'اليوم' : 'Today';
    if (formatDateKey(d) === formatDateKey(tomorrow)) return ar ? 'غداً' : 'Tomorrow';
    if (formatDateKey(d) === formatDateKey(yesterday)) return ar ? 'الأمس' : 'Yesterday';
    return d.toLocaleDateString(ar ? 'ar-EG' : 'en-US', { month: 'short', day: 'numeric' });
  }

  function formatLongDate(date) {
    const d = typeof date === 'string' ? parseDate(date) : date;
    const ar = isAr();
    return d.toLocaleDateString(ar ? 'ar-EG' : 'en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  }

  function formatShortDate(str) {
    if (!str) return '';
    const d = parseDate(str);
    const ar = isAr();
    return d.toLocaleDateString(ar ? 'ar-EG' : 'en-US', { month: 'short', day: 'numeric' });
  }

  function formatMonthYear(date) {
    const ar = isAr();
    return date.toLocaleDateString(ar ? 'ar-EG' : 'en-US', { month: 'long', year: 'numeric' });
  }

  function formatTime(timeStr) {
    if (!timeStr) return '';
    const [h, m] = timeStr.split(':').map(Number);
    const isArabic = isAr();
    const ampm = h >= 12 ? (isArabic ? 'م' : 'PM') : (isArabic ? 'ص' : 'AM');
    const h12 = h % 12 || 12;
    return `${h12}:${String(m).padStart(2,'0')} ${ampm}`;
  }

  function formatDuration(minutes) {
    if (!minutes) return '';
    const ar = isAr();
    if (minutes < 60) return ar ? `${minutes}د` : `${minutes}m`;
    const h = Math.floor(minutes/60);
    const m = minutes % 60;
    if (ar) return m ? `${h}س ${m}د` : `${h}س`;
    return m ? `${h}h ${m}m` : `${h}h`;
  }

  function greeting() {
    const h = new Date().getHours();
    const ar = isAr();
    if (h < 12) return ar ? 'صباح الخير.' : 'Good morning.';
    if (h < 17) return ar ? 'مساء الخير.' : 'Good afternoon.';
    if (h < 21) return ar ? 'مساء الخير.' : 'Good evening.';
    return ar ? 'تصبح على خير.' : 'Good night.';
  }

  function daysUntil(dateStr) {
    if (!dateStr) return null;
    const today = parseDate(todayStr());
    const target = parseDate(dateStr);
    return Math.round((target - today) / (1000*60*60*24));
  }

  function isOverdue(dateStr) {
    if (!dateStr) return false;
    return daysUntil(dateStr) < 0;
  }

  function sanitizeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function escapeRegExp(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function clamp(val, min, max) {
    return Math.min(Math.max(val, min), max);
  }

  function debounce(fn, ms) {
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), ms);
    };
  }

  function addDays(dateStr, n) {
    const d = parseDate(dateStr);
    d.setDate(d.getDate() + n);
    return formatDateKey(d);
  }

  // Get weekday occurrences for recurrence
  function getRecurrenceDatesInRange(recurrence, startDate, endDate) {
    const dates = [];
    const start = parseDate(startDate);
    const end = parseDate(endDate);
    let cur = new Date(start);
    while (cur <= end) {
      const dow = cur.getDay(); // 0=Sun
      const key = formatDateKey(cur);
      let matches = false;
      if (recurrence.frequency === 'daily') {
        matches = true;
      } else if (recurrence.frequency === 'weekdays') {
        matches = dow >= 1 && dow <= 5;
      } else if (recurrence.frequency === 'weekly') {
        const startDow = parseDate(recurrence.startDate).getDay();
        matches = dow === startDow;
      } else if (recurrence.frequency === 'custom') {
        const days = recurrence.daysOfWeek || [];
        matches = days.includes(String(dow));
      }
      if (matches) dates.push(key);
      cur.setDate(cur.getDate() + 1);
    }
    return dates;
  }

  function parseDurationToHM(raw) {
    if (!raw && raw !== 0) return '';
    const s = String(raw).trim();
    if (!s) return '';

    // 1. HH:MM:SS or H:MM:SS or HH:MM (e.g. 1:30:00 -> 1h 30m, no seconds!)
    const timeMatch = s.match(/^(\d+):(\d{1,2})(?::(\d{1,2}))?$/);
    if (timeMatch) {
      const hours = parseInt(timeMatch[1], 10);
      const mins = parseInt(timeMatch[2], 10);
      if (hours > 0 && mins > 0) return `${hours}h ${mins}m`;
      if (hours > 0) return `${hours}h`;
      return `${mins}m`;
    }

    // 2. Pure number (minutes e.g. 90 -> 1h 30m) or "90m" / "90min"
    const pureMinMatch = s.match(/^(\d+)\s*(?:m|min|mins|minutes?)?$/i);
    if (pureMinMatch) {
      const totalMinutes = parseInt(pureMinMatch[1], 10);
      const hours = Math.floor(totalMinutes / 60);
      const mins = totalMinutes % 60;
      if (hours > 0 && mins > 0) return `${hours}h ${mins}m`;
      if (hours > 0) return `${hours}h`;
      return `${mins}m`;
    }

    // 3. Decimal hours like "1.5h" or "1.5 hr"
    const decMatch = s.match(/^([\d.]+)\s*(?:h|hr|hours?)$/i);
    if (decMatch && decMatch[1].includes('.')) {
      const totalMinutes = Math.round(parseFloat(decMatch[1]) * 60);
      const hours = Math.floor(totalMinutes / 60);
      const mins = totalMinutes % 60;
      if (hours > 0 && mins > 0) return `${hours}h ${mins}m`;
      if (hours > 0) return `${hours}h`;
      return `${mins}m`;
    }

    // 4. "1h 30" (hours and minutes without m on second number)
    const hmShortMatch = s.match(/^(\d+)\s*(?:h|hr|hours?)\s*(\d+)$/i);
    if (hmShortMatch) {
      const h = parseInt(hmShortMatch[1], 10);
      const m = parseInt(hmShortMatch[2], 10);
      if (h > 0 && m > 0) return `${h}h ${m}m`;
      if (h > 0) return `${h}h`;
      return `${m}m`;
    }

    // 5. Strings like "1h 30m", "1 hr 30 min", "1h30m", "1 hour 30 mins", "2 hrs", "45 min", "50m"
    let h = 0;
    let m = 0;
    const hFound = s.match(/(\d+)\s*(?:h|hr|hours?)/i);
    const mFound = s.match(/(\d+)\s*(?:m|min|mins|minutes?)/i);
    if (hFound || mFound) {
      if (hFound) h = parseInt(hFound[1], 10);
      if (mFound) m = parseInt(mFound[1], 10);
      if (m >= 60 && h === 0) {
        h = Math.floor(m / 60);
        m = m % 60;
      }
      if (h > 0 && m > 0) return `${h}h ${m}m`;
      if (h > 0) return `${h}h`;
      if (m > 0) return `${m}m`;
    }

    return s;
  }

  return {
    uid, todayStr, formatDateKey, parseDate, formatDisplayDate,
    formatLongDate, formatShortDate, formatMonthYear, formatTime,
    formatDuration, parseDurationToHM, greeting, daysUntil, isOverdue, sanitizeHTML,
    escapeRegExp, clamp, debounce, addDays, getRecurrenceDatesInRange
  };
})();

if (typeof window !== 'undefined') window.parseDurationToHM = Utils.parseDurationToHM;
