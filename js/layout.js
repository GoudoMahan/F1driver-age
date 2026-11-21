/* F1 Age Chart — poster layout engine.
   Pure geometry: columns, age rows, stacked cards. No drawing here.

   Vertical rhythm: the age rows are intentionally tighter than one card
   (like the reference poster), so cards span a little over one row and the
   page feels dense. Cards in the same column are pushed down only when they
   would collide. */
(function () {
  'use strict';
  const F1 = (window.F1 = window.F1 || {});
  const U = F1.util;
  const A = F1.age;

  const SORTS = [
    { id: 'avgDesc', label: '平均年龄：高 → 低' },
    { id: 'avgAsc', label: '平均年龄：低 → 高' },
    { id: 'labelAsc', label: '名称：A → Z' },
    { id: 'labelDesc', label: '名称：Z → A' },
    { id: 'countDesc', label: '人数：多 → 少' },
    { id: 'manual', label: '手动顺序（右侧拖拽）' },
  ];

  const HEADER_H = 96;
  const COL_HEAD_H = 56;
  const FOOTER_H = 46;
  const BAND_H = 6;

  function sortColumns(columns, state) {
    const mode = state.sortMode || 'avgDesc';
    const arr = columns.slice();
    const collator = new Intl.Collator('zh-Hans-CN', { numeric: true, sensitivity: 'base' });
    if (mode === 'manual') {
      const order = Array.isArray(state.columnOrder) ? state.columnOrder : [];
      const pos = new Map(order.map((k, i) => [k, i]));
      arr.sort((a, b) => {
        const ai = pos.has(a.key) ? pos.get(a.key) : Number.MAX_SAFE_INTEGER;
        const bi = pos.has(b.key) ? pos.get(b.key) : Number.MAX_SAFE_INTEGER;
        if (ai !== bi) return ai - bi;
        return collator.compare(String(a.title), String(b.title));
      });
      return arr;
    }
    if (mode === 'avgAsc') arr.sort((a, b) => a.avg - b.avg);
    else if (mode === 'labelAsc') arr.sort((a, b) => collator.compare(String(a.label), String(b.label)));
    else if (mode === 'labelDesc') arr.sort((a, b) => collator.compare(String(b.label), String(a.label)));
    else if (mode === 'countDesc') arr.sort((a, b) => b.count - a.count || b.avg - a.avg);
    else arr.sort((a, b) => b.avg - a.avg);
    return arr;
  }

  function nameOf(driver, state) {
    const mode = state.cardName || 'latin';
    if (mode === 'zh') return driver.nameZh || driver.shortName || driver.name;
    if (mode === 'full') return driver.name || driver.shortName;
    return driver.shortName || driver.name;
  }

  function build(state) {
    const grouper = F1.groups.registry[state.groupBy] || F1.groups.registry.team;
    const asOf = state.asOfDate;
    const s = U.clamp(Number(state.cardScale) || 1, 0.7, 1.35);
    const f = U.clamp(Number(state.fontScale) || 1, 0.85, 1.3);
    const fill = U.clamp(Number(state.cardFill) || 0.92, 0.7, 0.97);
    const vd = U.clamp(Number(state.verticalDensity) || 0.4, 0.3, 1);

    /* ---------- columns ---------- */
    let columns = grouper.build(state).map((group) => {
      const valid = [];
      let ageSum = 0;
      group.drivers.forEach((driver) => {
        const age = A.ageOn(driver.birthday, asOf);
        if (typeof age === 'number') {
          valid.push(driver);
          ageSum += age;
        }
      });
      const avg = valid.length ? ageSum / valid.length : 0;
      return Object.assign({}, group, {
        drivers: valid,
        count: valid.length,
        avg,
        accent: group.accent || '#8A8F98',
      });
    }).filter((col) => col.count > 0);

    const invalid = [];
    (state.drivers || []).forEach((driver) => {
      if (A.ageOn(driver.birthday, asOf) == null) invalid.push(driver);
    });

    if (!columns.length) {
      return {
        empty: true,
        width: 1000,
        height: 640,
        headerH: HEADER_H,
        colHeadH: COL_HEAD_H,
        plotTop: HEADER_H + COL_HEAD_H,
        plotBottom: HEADER_H + COL_HEAD_H,
        rowsBottom: HEADER_H + COL_HEAD_H,
        plotX: 0,
        plotW: 0,
        axisW: 0,
        colW: 0,
        pitch: 0,
        padR: 0,
        columns: [],
        rows: [],
        cards: [],
        ages: [],
        avgAll: 0,
        totalDrivers: 0,
        teamCount: 0,
        invalid,
        cardScale: s,
        fontScale: f,
        cardFill: fill,
        verticalDensity: vd,
      };
    }

    columns = sortColumns(columns, state);

    /* ---------- horizontal metrics ---------- */
    const colW = Math.round(116 * s);
    const axisW = Math.round(64 * U.clamp(s, 0.9, 1.2));
    const gutter = 0;
    const plotX = axisW + gutter;
    const padR = 0;
    const width = plotX + colW * columns.length + padR;
    const cardW = Math.max(56, Math.round(colW * fill));
    const photoH = Math.round(cardW * 1.22);
    const labelH = Math.round(U.clamp(cardW * 0.35 * f, 34, 58));
    const cardH = photoH + labelH;
    const cardGap = Math.max(6, Math.round(8 * U.clamp(f, 0.9, 1.2)));
    const rowGap = 8;
    const rowPad = 4;
    const headerH = HEADER_H;
    const colHeadH = COL_HEAD_H;
    const plotTop = headerH + colHeadH;
    const basePitch = Math.max(
      Math.round((cardH + rowGap) * vd),
      Math.round(labelH * 1.1),
      56
    );

    columns.forEach((col, i) => {
      col.index = i;
      col.x = plotX + i * colW;
      col.width = colW;
    });

    /* ---------- rows ---------- */
    const ageSet = new Set();
    const cellMap = new Map(); // colKey|age -> drivers[]
    columns.forEach((col) => {
      col.drivers.forEach((driver) => {
        const age = A.ageOn(driver.birthday, asOf);
        ageSet.add(age);
        const k = col.key + '|' + age;
        if (!cellMap.has(k)) cellMap.set(k, []);
        cellMap.get(k).push(driver);
      });
    });

    let ages;
    if (state.compactRows) {
      ages = Array.from(ageSet).sort((a, b) => b - a);
    } else {
      const min = Math.min.apply(null, Array.from(ageSet));
      const max = Math.max.apply(null, Array.from(ageSet));
      ages = [];
      for (let a = max; a >= min; a--) ages.push(a);
    }

    const rows = ages.map((age, i) => {
      const cells = columns.map((col, ci) => {
        const list = (cellMap.get(col.key + '|' + age) || []).slice();
        list.sort((a, b) => A.sortByBirthday(a, b) || String(a.name).localeCompare(String(b.name)));
        return { colIndex: ci, drivers: list };
      });
      const maxCards = Math.max.apply(null, cells.map((c) => c.drivers.length).concat([1]));
      return {
        age,
        index: i,
        cells,
        maxCards,
        y: plotTop,
        h: basePitch,
      };
    });

    /* ---------- cards ---------- */
    const cards = [];
    const bottomByCol = new Array(columns.length).fill(-1e9);
    let nextTop = plotTop;

    rows.forEach((row, ri) => {
      let top = nextTop;
      if (ri > 0) {
        /* if a card in a column would collide with the previous card in the
           same column, push the whole age row down so labels stay aligned */
        let minTop = -Infinity;
        row.cells.forEach((cell) => {
          if (!cell.drivers.length) return;
          minTop = Math.max(minTop, bottomByCol[cell.colIndex] + cardGap - rowPad);
        });
        if (minTop > top) top = minTop;
      }
      row.y = top;

      row.cells.forEach((cell) => {
        const col = columns[cell.colIndex];
        cell.drivers.forEach((driver, k) => {
          const age = A.ageOn(driver.birthday, asOf);
          const y = top + rowPad + k * (cardH + cardGap);
          const card = {
            driver,
            age,
            colIndex: col.index,
            colKey: col.key,
            rowIndex: row.index,
            x: col.x + Math.round((colW - cardW) / 2),
            y,
            w: cardW,
            h: cardH,
            photoH,
            labelH,
            accent: col.accent,
            columnTitle: col.title,
          };
          cards.push(card);
          bottomByCol[col.index] = y + cardH;
        });
      });

      const stackH =
        row.maxCards > 1
          ? row.maxCards * cardH + (row.maxCards - 1) * cardGap + rowPad * 2
          : basePitch;
      row.h = Math.max(basePitch, stackH);
      nextTop = top + row.h;
    });

    const rowsBottom = nextTop;
    const maxBottom = Math.max.apply(null, bottomByCol.concat([rowsBottom]));
    const plotBottom = Math.max(rowsBottom, maxBottom + rowPad);

    /* ---------- totals ---------- */
    const allAges = [];
    columns.forEach((col) => col.drivers.forEach((d) => allAges.push(A.ageOn(d.birthday, asOf))));
    const avgAll = allAges.length ? allAges.reduce((a, b) => a + b, 0) / allAges.length : 0;
    const teamIds = new Set((state.drivers || []).map((d) => d.teamId));
    const withFooter = !!state.showFooter;
    const height = plotBottom + (withFooter ? FOOTER_H : 0);

    return {
      empty: false,
      width,
      height,
      headerH,
      colHeadH,
      plotTop,
      plotBottom,
      rowsBottom,
      plotX,
      plotW: colW * columns.length,
      axisW,
      gutter,
      padR,
      colW,
      pitch: basePitch,
      bandH: BAND_H,
      cardW,
      cardH,
      photoH,
      labelH,
      cardGap,
      rowPad,
      columns,
      rows,
      cards,
      ages,
      avgAll,
      totalDrivers: allAges.length,
      teamCount: teamIds.size,
      invalid,
      cardScale: s,
      fontScale: f,
      cardFill: fill,
      verticalDensity: vd,
      showFooter: withFooter,
      footerH: withFooter ? FOOTER_H : 0,
    };
  }

  F1.layout = { build, SORTS, nameOf, HEADER_H, COL_HEAD_H, FOOTER_H, BAND_H };
})();
