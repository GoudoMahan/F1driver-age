/* F1 Age Chart — column grouping strategies (extensible registry).
   A grouper receives the app state and returns an array of columns:
   { key, title, subtitle, label, accent, drivers[], meta? } */
(function () {
  'use strict';
  const F1 = (window.F1 = window.F1 || {});
  const U = F1.util;
  const D = F1.data;
  const A = F1.age;

  const registry = {};
  const order = [];

  function register(id, def) {
    if (!def || typeof def.build !== 'function') throw new Error('grouper.build is required');
    if (!registry[id]) order.push(id);
    registry[id] = Object.assign({ id, label: id }, def);
    return registry[id];
  }

  function list() {
    return order.map((id) => registry[id]);
  }

  function sortByAvg(a, b) {
    return b.avg - a.avg;
  }

  function teamColor(team) {
    return (team && team.accent) || '#8A8F98';
  }

  register('team', {
    label: '车队',
    hint: '按 2027 赛季车队分组',
    build(state) {
      const teams = state.teams || [];
      const byId = new Map(teams.map((t) => [t.id, t]));
      const map = new Map();
      (state.drivers || []).forEach((driver) => {
        const team = byId.get(driver.teamId);
        const key = 'team:' + (team ? team.id : 'free');
        if (!map.has(key)) {
          map.set(key, {
            key,
            title: team ? team.code || team.name : 'N/A',
            subtitle: team ? team.name : '未归属车队',
            label: team ? team.name : '未归属车队',
            accent: team ? teamColor(team) : '#9AA0A6',
            drivers: [],
            meta: { type: 'team', teamId: team ? team.id : null },
          });
        }
        map.get(key).drivers.push(driver);
      });
      return Array.from(map.values());
    },
  });

  register('country', {
    label: '国籍',
    hint: '按车手国籍 / 注册地分组',
    build(state) {
      const map = new Map();
      (state.drivers || []).forEach((driver) => {
        const code = (driver.country || '---').toUpperCase();
        const key = 'country:' + code;
        if (!map.has(key)) {
          const idx = Math.abs(U.hashString(code)) % D.GROUP_PALETTE.length;
          map.set(key, {
            key,
            title: code,
            subtitle: D.COUNTRY_ZH[code] || code,
            label: code,
            accent: D.GROUP_PALETTE[idx],
            drivers: [],
            meta: { type: 'country', country: code },
          });
        }
        map.get(key).drivers.push(driver);
      });
      return Array.from(map.values());
    },
  });

  register('month', {
    label: '生日月份',
    hint: '原图同款：按出生月份分组',
    build(state) {
      const map = new Map();
      (state.drivers || []).forEach((driver) => {
        const d = A.parseISO(driver.birthday);
        const m = d ? d.m : 0;
        const key = 'month:' + U.pad2(m || 0);
        if (!map.has(key)) {
          map.set(key, {
            key,
            title: m ? U.pad2(m) : '??',
            subtitle: m ? D.MONTH_EN[m - 1] + ' · ' + D.MONTH_ZH[m - 1] : '日期未知',
            label: m ? D.MONTH_ZH[m - 1] : '日期未知',
            accent: D.GROUP_PALETTE[(Math.max(0, m - 1)) % D.GROUP_PALETTE.length],
            drivers: [],
            meta: { type: 'month', month: m },
          });
        }
        map.get(key).drivers.push(driver);
      });
      return Array.from(map.values());
    },
  });

  register('decade', {
    label: '出生年代',
    hint: '按出生年代分组（80 后 / 90 后 / 00 后）',
    build(state) {
      const map = new Map();
      (state.drivers || []).forEach((driver) => {
        const d = A.parseISO(driver.birthday);
        const decade = d ? D.decadeOf(d.y) : 0;
        const key = 'decade:' + (decade || 0);
        if (!map.has(key)) {
          const idx = Math.max(0, Math.floor((decade - 1980) / 10)) % D.GROUP_PALETTE.length;
          map.set(key, {
            key,
            title: decade ? decade + 's' : '????',
            subtitle: decade ? D.decadeZh(decade) : '日期未知',
            label: decade ? decade + 's' : '日期未知',
            accent: D.GROUP_PALETTE[idx],
            drivers: [],
            meta: { type: 'decade', decade },
          });
        }
        map.get(key).drivers.push(driver);
      });
      return Array.from(map.values());
    },
  });

  F1.groups = { registry, order, register, list, sortByAvg };
})();
