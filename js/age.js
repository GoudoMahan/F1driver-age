/* F1 Age Chart — date + age helpers. */
(function () {
  'use strict';
  const F1 = (window.F1 = window.F1 || {});
  const U = F1.util;

  function parseISO(value) {
    if (value instanceof Date && !isNaN(value)) {
      return { y: value.getFullYear(), m: value.getMonth() + 1, d: value.getDate() };
    }
    const m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(String(value || '').trim());
    if (!m) return null;
    const y = Number(m[1]);
    const mo = Number(m[2]);
    const d = Number(m[3]);
    if (mo < 1 || mo > 12) return null;
    if (d < 1 || d > daysInMonth(y, mo)) return null;
    return { y, m: mo, d };
  }

  function daysInMonth(y, m) {
    return [31, isLeap(y) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][m - 1];
  }

  function isLeap(y) {
    return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
  }

  function isoString(d) {
    return `${d.y}-${U.pad2(d.m)}-${U.pad2(d.d)}`;
  }

  /** Completed years between birthday and the reference date. */
  function ageOn(birthday, asOf) {
    const b = parseISO(birthday);
    const r = parseISO(asOf);
    if (!b || !r) return null;
    let age = r.y - b.y;
    if (r.m < b.m || (r.m === b.m && r.d < b.d)) age -= 1;
    return Math.max(0, age);
  }

  function avgAge(drivers, asOf) {
    const ages = (drivers || []).map((d) => ageOn(d.birthday, asOf)).filter((a) => typeof a === 'number');
    return U.mean(ages);
  }

  function formatBirthday(birthday, style) {
    const d = parseISO(birthday);
    if (!d) return '—';
    const yy = String(d.y).slice(2);
    switch (style || 'yyyy/mm/dd') {
      case 'yy/mm/dd':
        return `${yy}/${U.pad2(d.m)}/${U.pad2(d.d)}`;
      case 'mm/dd':
        return `${U.pad2(d.m)}/${U.pad2(d.d)}`;
      case 'iso':
        return `${d.y}-${U.pad2(d.m)}-${U.pad2(d.d)}`;
      case 'yyyy.mm.dd':
        return `${d.y}.${U.pad2(d.m)}.${U.pad2(d.d)}`;
      case 'yyyy/mm/dd':
      default:
        return `${d.y}/${U.pad2(d.m)}/${U.pad2(d.d)}`;
    }
  }

  function formatNoteDate(asOf) {
    const d = parseISO(asOf);
    if (!d) return '—';
    return `${String(d.y).slice(2)}/${U.pad2(d.m)}/${U.pad2(d.d)}`;
  }

  function formatISO(asOf) {
    const d = parseISO(asOf);
    return d ? isoString(d) : '—';
  }

  function monthDayValue(birthday) {
    const d = parseISO(birthday);
    return d ? d.m * 100 + d.d : 9999;
  }

  function sortByBirthday(a, b) {
    return monthDayValue(a.birthday) - monthDayValue(b.birthday);
  }

  function todayISO() {
    const n = new Date();
    return `${n.getFullYear()}-${U.pad2(n.getMonth() + 1)}-${U.pad2(n.getDate())}`;
  }

  F1.age = {
    parseISO,
    isoString,
    ageOn,
    avgAge,
    formatBirthday,
    formatNoteDate,
    formatISO,
    monthDayValue,
    sortByBirthday,
    daysInMonth,
    todayISO,
  };
})();
