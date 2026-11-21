/* F1 Age Chart — canvas poster renderer.
   Everything is drawn in layout units; the caller scales the context. */
(function () {
  'use strict';
  const F1 = (window.F1 = window.F1 || {});
  const U = F1.util;
  const A = F1.age;
  const L = F1.layout;

  const imageCache = new Map();
  let imageListener = null;

  function setImageListener(fn) {
    imageListener = fn;
  }

  function photoOf(driver) {
    if (driver.photoHidden) return null;
    return driver.photo || (window.F1AGE_PHOTOS && window.F1AGE_PHOTOS[driver.id]) || null;
  }

  function getImage(src) {
    if (!src) return null;
    let entry = imageCache.get(src);
    if (entry) return entry;
    entry = { img: null, status: 'loading' };
    const img = new Image();
    img.decoding = 'async';
    if (/^https?:\/\//i.test(src)) img.crossOrigin = 'anonymous';
    img.onload = () => {
      entry.status = 'ready';
      entry.img = img;
      if (imageListener) imageListener(src);
    };
    img.onerror = () => {
      entry.status = 'error';
      if (imageListener) imageListener(src);
    };
    img.src = src;
    imageCache.set(src, entry);
    return entry;
  }

  function preload(state) {
    const jobs = [];
    (state.drivers || []).forEach((driver) => {
      const src = photoOf(driver);
      if (!src) return;
      const entry = getImage(src);
      if (entry.status === 'ready') return;
      jobs.push(
        new Promise((resolve) => {
          if (entry.status !== 'loading') {
            resolve(entry);
            return;
          }
          const img = new Image();
          img.decoding = 'async';
          if (/^https?:\/\//i.test(src)) img.crossOrigin = 'anonymous';
          img.onload = () => {
            entry.status = 'ready';
            entry.img = img;
            resolve(entry);
          };
          img.onerror = () => {
            entry.status = 'error';
            resolve(entry);
          };
          img.src = src;
        })
      );
    });
    return Promise.all(jobs);
  }

  function initials(driver) {
    const zh = (driver.nameZh || '').trim();
    if (zh && /[\u3400-\u9fff]/.test(zh)) return zh.slice(0, 1);
    const words = String(driver.name || driver.shortName || '?').trim().split(/\s+/);
    if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
    return (words[0][0] + words[words.length - 1][0]).toUpperCase();
  }

  function accentInk(theme, accent) {
    if (theme.id === 'night') return U.mix(accent, '#FFFFFF', 0.34);
    return U.luminance(accent) > 0.42
      ? U.mix(accent, '#15161B', 0.3)
      : U.mix(accent, '#15161B', 0.12);
  }

  /* ---------------------------------------------------------------- header */

  function drawBand(ctx, geom, theme, state) {
    if (!state.showBand) return;
    ctx.fillStyle = theme.bandBase;
    ctx.fillRect(0, 0, geom.width, geom.bandH);
    geom.columns.forEach((col) => {
      ctx.fillStyle = col.accent;
      ctx.fillRect(col.x, 0, Math.max(0, col.width - 2), geom.bandH);
    });
  }

  function drawLogo(ctx, x, y, size, theme) {
    const r = size * 0.2;
    const night = theme.id === 'night';
    ctx.save();
    ctx.fillStyle = night ? '#F3F4F7' : theme.bandBase;
    U.roundRect(ctx, x, y, size, size, r);
    ctx.fill();
    ctx.fillStyle = night ? '#0D1016' : '#FFFFFF';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    U.font(ctx, size * 0.52, 800, '"Bahnschrift", "Segoe UI", sans-serif');
    ctx.fillText('F1', x + size / 2, y + size * 0.47);
    ctx.fillStyle = '#E10600';
    ctx.fillRect(x + size * 0.27, y + size * 0.72, size * 0.46, size * 0.055);
    ctx.restore();
  }

  function drawHeader(ctx, geom, theme, state) {
    const W = geom.width;
    const padL = 18;
    const padR = 18;
    const logoSize = 46;
    const logoY = 23;
    drawLogo(ctx, padL, logoY, logoSize, theme);

    const titleX = padL + logoSize + 12;
    const asOf = state.asOfDate;
    const note1 = String(state.headerNote || '')
      .replace(/\{date\}/g, A.formatNoteDate(asOf))
      .replace(/\{iso\}/g, A.formatISO(asOf));
    const note2 = String(state.headerSubNote || '');
    const noteMax = Math.min(470, W * 0.44);

    let n1Size = note1 ? U.fitFont(ctx, note1, noteMax, 10.4, 700, U.FONT_CN, 7.6) : 10.4;
    const n1W = note1 ? ctx.measureText(note1).width : 0;
    let n2Size = note2 ? U.fitFont(ctx, note2, noteMax, 9, 500, U.FONT_CN, 7.2) : 9;
    const n2W = note2 ? ctx.measureText(note2).width : 0;
    const noteW = Math.max(n1W, n2W, 140);
    const right = W - padR;

    const titleMax = Math.max(220, W - titleX - noteW - 40);
    const title = state.title || '车手生日 / 年龄均排';
    const tSize = U.fitFont(ctx, title, titleMax, 31, 800, U.FONT_CN, 19);
    const subtitle = state.subtitle || '';
    const sSize = subtitle ? U.fitFont(ctx, subtitle, titleMax, 9.6, 500, U.FONT_NUM, 7.4) : 9.6;

    ctx.save();
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = theme.ink;
    U.letterSpacing(ctx, -0.3);
    U.font(ctx, tSize, 800, U.FONT_CN);
    ctx.fillText(title, titleX, 57);
    U.letterSpacing(ctx, 0);

    if (subtitle) {
      ctx.fillStyle = theme.muted;
      U.letterSpacing(ctx, 1.35);
      U.font(ctx, sSize, 500, U.FONT_NUM);
      ctx.fillText(U.truncate(ctx, subtitle.toUpperCase(), titleMax), titleX, 77);
      U.letterSpacing(ctx, 0);
    }

    if (note1) {
      ctx.textAlign = 'right';
      ctx.fillStyle = theme.noteInk;
      U.font(ctx, n1Size, 700, U.FONT_CN);
      ctx.fillText(note1, right, 45);
    }
    if (note2) {
      ctx.textAlign = 'right';
      ctx.fillStyle = theme.muted;
      U.font(ctx, n2Size, 500, U.FONT_CN);
      ctx.fillText(U.truncate(ctx, note2, noteMax), right, 62);
    }

    /* header rule with a red timing-strip segment */
    const ruleY = geom.headerH - 3;
    ctx.strokeStyle = theme.headerRule;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(padL, ruleY);
    ctx.lineTo(W - 2, ruleY);
    ctx.stroke();
    ctx.strokeStyle = '#E10600';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(padL, ruleY);
    ctx.lineTo(padL + 54, ruleY);
    ctx.stroke();
    ctx.restore();
  }

  /* -------------------------------------------------------- column headers */

  function drawColumnHeaders(ctx, geom, theme, state) {
    const f = U.clamp(Number(state.fontScale) || 1, 0.85, 1.3);
    const y1 = geom.headerH + 22;
    const y2 = geom.headerH + 40;

    geom.columns.forEach((col) => {
      const cx = col.x + col.width / 2;
      const codeSize = Math.round(17.5 * U.clamp(geom.cardScale, 0.85, 1.14) * f);
      const avgSize = codeSize + 0.8;

      U.font(ctx, codeSize, 700, U.FONT_NUM);
      const codeText = String(col.title);
      const codeW = ctx.measureText(codeText).width;
      U.font(ctx, 11 * f, 500, U.FONT_NUM);
      const slashW = ctx.measureText(' / ').width;
      U.font(ctx, avgSize, 600, U.FONT_NUM);
      const avgText = col.avg.toFixed(1);
      const avgW = ctx.measureText(avgText).width;

      let total = codeW + slashW + avgW;
      let shrink = 1;
      if (total > col.width - 12) {
        shrink = (col.width - 12) / total;
        total = col.width - 12;
      }
      let x = cx - total / 2;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'alphabetic';

      U.font(ctx, codeSize * shrink, 700, U.FONT_NUM);
      ctx.fillStyle = accentInk(theme, col.accent);
      ctx.fillText(codeText, x, y1);
      x += codeW * shrink;

      U.font(ctx, 11 * f * shrink, 500, U.FONT_NUM);
      ctx.fillStyle = theme.faint;
      ctx.fillText(' / ', x, y1 + 0.5);
      x += slashW * shrink;

      U.font(ctx, avgSize * shrink, 600, U.FONT_NUM);
      ctx.fillStyle = theme.ink;
      ctx.fillText(avgText, x, y1);

      if (col.subtitle) {
        ctx.textAlign = 'center';
        ctx.fillStyle = theme.muted;
        U.font(ctx, 9.2 * f, 500, U.FONT_CN);
        ctx.fillText(U.truncate(ctx, String(col.subtitle), col.width - 14), cx, y2);
      }
    });

    /* axis header */
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    const avgLabel = geom.avgAll.toFixed(1);
    U.font(ctx, 9.6 * f, 500, U.FONT_NUM);
    const labelW = ctx.measureText('Avg=').width;
    U.font(ctx, 18 * f, 700, U.FONT_NUM);
    const valW = ctx.measureText(avgLabel).width;
    const start = geom.axisW / 2 - (labelW + valW) / 2;
    U.font(ctx, 9.6 * f, 500, U.FONT_NUM);
    ctx.fillStyle = theme.muted;
    ctx.textAlign = 'left';
    ctx.fillText('Avg=', start, y1 - 3);
    U.font(ctx, 18 * f, 700, U.FONT_NUM);
    ctx.fillStyle = theme.ink;
    ctx.fillText(avgLabel, start + labelW, y1);

    U.font(ctx, 7.4 * f, 600, U.FONT_NUM);
    ctx.fillStyle = theme.faint;
    U.letterSpacing(ctx, 0.7);
    ctx.textAlign = 'center';
    ctx.fillText(`${geom.totalDrivers} DRIVERS`, geom.axisW / 2, y2 + 1);
    U.letterSpacing(ctx, 0);

    /* hairlines */
    ctx.save();
    ctx.strokeStyle = theme.hairline;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 0; i < geom.columns.length; i++) {
      const x = Math.round(geom.columns[i].x) + 0.5;
      ctx.moveTo(x, geom.headerH + 4);
      ctx.lineTo(x, geom.plotBottom);
    }
    ctx.moveTo(Math.round(geom.plotX + geom.plotW) + 0.5, geom.headerH + 4);
    ctx.lineTo(Math.round(geom.plotX + geom.plotW) + 0.5, geom.plotBottom);
    ctx.stroke();
    ctx.restore();

    /* axis divider */
    ctx.save();
    ctx.strokeStyle = theme.hairline;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(geom.plotX + 0.5, geom.headerH + 4);
    ctx.lineTo(geom.plotX + 0.5, geom.plotBottom);
    ctx.stroke();
    ctx.restore();
  }

  /* --------------------------------------------------------------- plot */

  function drawPlot(ctx, geom, theme, state) {
    const x0 = 0;
    const top = geom.plotTop;
    const bottom = geom.plotBottom;

    /* axis gradient */
    if (state.axisGradient !== false) {
      const grad = ctx.createLinearGradient(0, top, 0, bottom);
      grad.addColorStop(0, theme.axisTop);
      grad.addColorStop(1, theme.axisBottom);
      ctx.fillStyle = grad;
    } else {
      ctx.fillStyle = U.mix(theme.axisTop, theme.bg, 0.55);
    }
    ctx.fillRect(x0, top, geom.axisW, bottom - top);

    /* column tints */
    geom.columns.forEach((col) => {
      ctx.fillStyle = theme.columnTint(col.accent);
      ctx.fillRect(col.x, top, col.width, bottom - top);
      const g = ctx.createLinearGradient(0, top, 0, bottom);
      g.addColorStop(0, U.alpha(theme.ink, 0.035));
      g.addColorStop(0.4, U.alpha(theme.ink, 0));
      ctx.fillStyle = g;
      ctx.fillRect(col.x, top, col.width, bottom - top);
    });

    /* saturated accent strip at the top of every column */
    geom.columns.forEach((col) => {
      ctx.fillStyle = col.accent;
      ctx.fillRect(col.x, top, col.width, 3);
    });

    /* top line over the age axis */
    ctx.strokeStyle = theme.hairline;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, top + 0.5);
    ctx.lineTo(geom.plotX, top + 0.5);
    ctx.stroke();

    /* dashed row separators */
    ctx.save();
    ctx.strokeStyle = theme.dash;
    ctx.lineWidth = 1;
    ctx.setLineDash([3.5, 4]);
    geom.rows.forEach((row, i) => {
      if (i === 0) return;
      const y = Math.round(row.y) + 0.5;
      ctx.beginPath();
      ctx.moveTo(geom.plotX + 1, y);
      ctx.lineTo(geom.plotX + geom.plotW, y);
      ctx.stroke();
    });
    const yb = Math.round(geom.rowsBottom) + 0.5;
    ctx.beginPath();
    ctx.moveTo(geom.plotX + 1, yb);
    ctx.lineTo(geom.plotX + geom.plotW, yb);
    ctx.stroke();
    ctx.restore();

    /* age labels */
    const f = U.clamp(Number(state.fontScale) || 1, 0.85, 1.3);
    ctx.save();
    ctx.textBaseline = 'middle';
    geom.rows.forEach((row) => {
      const cy = row.y + row.h / 2;
      const ageText = String(row.age);
      U.font(ctx, 16.5 * f, 700, U.FONT_NUM);
      const ageW = ctx.measureText(ageText).width;
      U.font(ctx, 9.5 * f, 500, U.FONT_NUM);
      const yW = ctx.measureText('y').width;
      const total = ageW + 2 + yW;
      const startX = geom.axisW - 13 - total;
      ctx.textAlign = 'left';
      U.font(ctx, 16.5 * f, 700, U.FONT_NUM);
      ctx.fillStyle = theme.axisText;
      ctx.fillText(ageText, startX, cy + 0.5);
      U.font(ctx, 9.5 * f, 500, U.FONT_NUM);
      ctx.fillStyle = theme.id === 'night' ? 'rgba(243,244,247,0.62)' : 'rgba(21,22,27,0.5)';
      ctx.fillText('y', startX + ageW + 2, cy + 2.8);
    });
    ctx.restore();
  }

  /* --------------------------------------------------------------- cards */

  function drawPlaceholder(ctx, card, theme, state) {
    const { x, y, w, photoH, driver, accent } = card;
    ctx.fillStyle = theme.photoBg(accent);
    ctx.fillRect(x, y, w, photoH);
    ctx.save();
    ctx.globalAlpha = 0.5;
    ctx.strokeStyle = U.alpha(accent, 0.16);
    ctx.lineWidth = 1;
    for (let i = -1; i < 5; i++) {
      ctx.beginPath();
      ctx.moveTo(x + i * 26, y + photoH);
      ctx.lineTo(x + i * 26 + 50, y);
      ctx.stroke();
    }
    ctx.restore();

    const r = Math.min(w, photoH) * 0.26;
    const cx = x + w / 2;
    const cy = y + photoH * 0.5;
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = U.alpha(accent, 0.16);
    ctx.fill();
    ctx.strokeStyle = U.alpha(accent, 0.34);
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = accentInk(theme, accent);
    U.font(ctx, r * 0.66, 700, U.FONT_NUM);
    ctx.fillText(initials(driver), cx, cy + 0.5);
    ctx.restore();
  }

  function drawCard(ctx, card, geom, theme, state) {
    const { x, y, w, h, photoH, labelH, accent, driver } = card;
    const f = U.clamp(Number(state.fontScale) || 1, 0.85, 1.3);
    const r = 3;
    const rr = [r, r, r, r];

    U.roundRect(ctx, x, y, w, h, rr);
    ctx.fillStyle = theme.cardTint(accent);
    ctx.fill();

    /* photo */
    ctx.save();
    U.roundRect(ctx, x, y, w, photoH, [r, r, 0, 0]);
    ctx.clip();
    const src = state.showPhotos === false ? null : photoOf(driver);
    if (src) {
      const entry = getImage(src);
      if (entry && entry.status === 'ready' && entry.img) {
        const img = entry.img;
        const focus = driver.photoFocus || {};
        const fx = typeof focus.x === 'number' ? focus.x : 0.5;
        const fy = typeof focus.y === 'number' ? focus.y : 0.35;
        const z = typeof focus.z === 'number' ? focus.z : 1;
        const scale = Math.max(w / img.naturalWidth, photoH / img.naturalHeight) * z;
        const dw = img.naturalWidth * scale;
        const dh = img.naturalHeight * scale;
        const dx = x - (dw - w) * fx;
        const dy = y - (dh - photoH) * fy;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, dx, dy, dw, dh);
        /* soft floor so the label blends in */
        const g = ctx.createLinearGradient(0, y + photoH - 18, 0, y + photoH);
        g.addColorStop(0, 'rgba(0,0,0,0)');
        g.addColorStop(1, 'rgba(0,0,0,0.10)');
        ctx.fillStyle = g;
        ctx.fillRect(x, y + photoH - 18, w, 18);
      } else {
        drawPlaceholder(ctx, card, theme, state);
      }
    } else {
      drawPlaceholder(ctx, card, theme, state);
    }
    /* thin photo frame, like a print */
    ctx.strokeStyle = U.alpha(theme.ink, 0.2);
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 0.5, y + 0.5, w - 1, photoH - 1);
    ctx.restore();

    /* accent divider between photo and label */
    ctx.fillStyle = accent;
    ctx.fillRect(x, y + photoH - 1.5, w, 2.5);

    /* border */
    U.roundRect(ctx, x + 0.5, y + 0.5, w - 1, h - 1, rr);
    ctx.strokeStyle = theme.cardBorder;
    ctx.lineWidth = 1;
    ctx.stroke();

    /* age badge */
    if (state.showAgeBadge !== false) {
      const bw = Math.round(20 * f);
      const bh = Math.round(14.5 * f);
      const bx = x + w - bw - Math.round(5 * f);
      const by = y + Math.round(5 * f);
      U.roundRect(ctx, bx, by, bw, bh, 3);
      ctx.fillStyle = theme.badgeBg(accent);
      ctx.fill();
      ctx.strokeStyle = U.alpha(accent, 0.35);
      ctx.lineWidth = 0.8;
      ctx.stroke();
      ctx.fillStyle = accentInk(theme, accent);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      U.font(ctx, 9.2 * f, 700, U.FONT_NUM);
      ctx.fillText(String(card.age), bx + bw / 2, by + bh / 2 + 0.3);
    }

    /* label */
    const nameY = y + photoH + labelH * 0.47;
    const dateY = y + photoH + labelH * 0.81;
    const maxText = w - 12;
    const name = L.nameOf(driver, state);
    const pending = driver.status === 'pending';
    const spare = pending ? 8 : 0;
    let nameSize = U.clamp(w * 0.138, 10, 16.5) * f;
    nameSize = U.fitFont(ctx, name, maxText - spare, nameSize, 700, U.FONT_NUM, 9);
    U.font(ctx, nameSize, 700, U.FONT_NUM);
    const drawnName = U.truncate(ctx, name, maxText - spare);
    const nameW = ctx.measureText(drawnName).width;
    const qW = pending ? ctx.measureText('?').width * 0.78 + 1.5 : 0;
    const nx = x + w / 2 - (nameW + qW) / 2;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = theme.ink;
    ctx.fillText(drawnName, nx, nameY);
    if (pending) {
      U.font(ctx, nameSize * 0.78, 700, U.FONT_NUM);
      ctx.fillStyle = accentInk(theme, accent);
      ctx.fillText('?', nx + nameW + 1.5, nameY - 1);
    }

    const country = state.showCountry === false ? '' : String(driver.country || '').trim();
    const dateText = A.formatBirthday(driver.birthday, 'yyyy/mm/dd');
    const sub = country ? `${country} · ${dateText}` : dateText;
    const dateSize = U.fitFont(ctx, sub, maxText, 9.5 * f, 500, U.FONT_NUM, 7.2);
    U.font(ctx, dateSize, 500, U.FONT_NUM);
    ctx.fillStyle = theme.labelMuted;
    ctx.textAlign = 'center';
    ctx.fillText(U.truncate(ctx, sub, maxText), x + w / 2, dateY);

    /* highlight */
    if (driver.highlight) {
      U.roundRect(ctx, x + 1, y + 1, w - 2, h - 2, 3);
      ctx.strokeStyle = '#FF2D78';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }

  function drawCards(ctx, geom, theme, state) {
    geom.cards.forEach((card) => drawCard(ctx, card, geom, theme, state));
  }

  /* -------------------------------------------------------------- footer */

  function drawFooter(ctx, geom, theme, state) {
    const W = geom.width;
    const yRule = geom.plotBottom + 14;
    ctx.save();
    ctx.strokeStyle = theme.hairline;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(18, yRule + 0.5);
    ctx.lineTo(W - 18, yRule + 0.5);
    ctx.stroke();

    const bits = [
      `数据基准日 ${A.formatISO(state.asOfDate)}`,
      `${geom.totalDrivers} 位车手`,
      `${geom.teamCount} 支车队`,
    ];
    if (geom.invalid && geom.invalid.length) bits.push(`${geom.invalid.length} 人生日待补充`);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = theme.muted;
    U.font(ctx, 8.8, 500, U.FONT_CN);
    ctx.fillText(bits.join('  ·  '), 18, yRule + 17);

    ctx.textAlign = 'right';
    ctx.fillStyle = theme.faint;
    U.letterSpacing(ctx, 1.1);
    U.font(ctx, 8.4, 600, U.FONT_NUM);
    ctx.fillText(String(state.footerRight || 'F1 AGE CHART'), W - 18, yRule + 17);
    U.letterSpacing(ctx, 0);
    ctx.restore();
  }

  /* --------------------------------------------------------------- root */

  function draw(ctx, state, geom, theme, opts = {}) {
    ctx.save();
    ctx.fillStyle = theme.bg;
    ctx.fillRect(0, 0, geom.width, geom.height);

    if (geom.empty) {
      ctx.fillStyle = theme.ink;
      ctx.textAlign = 'center';
      U.font(ctx, 28, 700, U.FONT_CN);
      ctx.fillText('暂无车手数据', geom.width / 2, geom.height / 2 - 8);
      ctx.fillStyle = theme.muted;
      U.font(ctx, 11, 500, U.FONT_CN);
      ctx.fillText('在右侧「车手数据」中添加车手，或导入 JSON 数据集', geom.width / 2, geom.height / 2 + 18);
      ctx.restore();
      return;
    }

    drawBand(ctx, geom, theme, state);
    drawHeader(ctx, geom, theme, state);
    drawColumnHeaders(ctx, geom, theme, state);
    drawPlot(ctx, geom, theme, state);
    if (opts.cards !== false) drawCards(ctx, geom, theme, state);
    if (state.showFooter) drawFooter(ctx, geom, theme, state);
    ctx.restore();
  }

  F1.render = {
    draw,
    preload,
    setImageListener,
    getImage,
    photoOf,
    initials,
    accentInk,
  };
})();
