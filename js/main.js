/* F1 Age Chart — bootstrap, preview rendering, interactions. */
(function () {
  'use strict';
  const F1 = (window.F1 = window.F1 || {});
  const U = F1.util;
  const state = F1.state;
  const S = F1.store;
  const $ = (id) => document.getElementById(id);

  let geom = null;
  let zoom = 100;
  let scheduled = false;
  let cssW = 0;
  let cssH = 0;
  let hovered = null;
  let tooltip = null;

  function ensureTooltip() {
    if (tooltip) return tooltip;
    tooltip = document.createElement('div');
    tooltip.className = 'chart-tooltip';
    tooltip.hidden = true;
    document.body.appendChild(tooltip);
    return tooltip;
  }

  function previewMetrics() {
    const stage = $('stage');
    const avail = Math.max(320, stage.clientWidth - 52);
    const fit = Math.min(avail, geom.width);
    const w = Math.max(280, Math.round((fit * zoom) / 100));
    return { w, h: Math.round((w * geom.height) / geom.width) };
  }

  function render() {
    if (!geom) geom = F1.layout.build(state);
    const theme = F1.themes.get(state.theme);
    const canvas = $('chart');
    const metrics = previewMetrics();
    cssW = metrics.w;
    cssH = metrics.h;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let scale = U.clamp((cssW * dpr * 1.35) / geom.width, 0.6, 2.4);
    scale = Math.min(scale, 10000 / geom.height, Math.sqrt(26e6 / (geom.width * geom.height)));
    const pxW = Math.max(1, Math.round(geom.width * scale));
    const pxH = Math.max(1, Math.round(geom.height * scale));
    if (canvas.width !== pxW || canvas.height !== pxH) {
      canvas.width = pxW;
      canvas.height = pxH;
    }
    canvas.style.width = cssW + 'px';
    canvas.style.height = cssH + 'px';
    const ctx = canvas.getContext('2d');
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.scale(pxW / geom.width, pxH / geom.height);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    F1.render.draw(ctx, state, geom, theme);
    hideHover();
  }

  function schedule() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      geom = F1.layout.build(state);
      render();
      if (F1.ui && F1.ui.updateExportSize) F1.ui.updateExportSize();
      if (F1.ui && F1.ui.renderManualOrder) F1.ui.renderManualOrder();
    });
  }

  function cardAt(clientX, clientY) {
    if (!geom || !geom.cards || !geom.cards.length) return null;
    const canvas = $('chart');
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return null;
    const x = ((clientX - rect.left) / rect.width) * geom.width;
    const y = ((clientY - rect.top) / rect.height) * geom.height;
    for (let i = geom.cards.length - 1; i >= 0; i--) {
      const c = geom.cards[i];
      if (x >= c.x && x <= c.x + c.w && y >= c.y && y <= c.y + c.h) return c;
    }
    return null;
  }

  function hideHover() {
    hovered = null;
    const ring = $('cardRing');
    if (ring) ring.hidden = true;
    const tip = ensureTooltip();
    tip.hidden = true;
  }

  function showHover(card, clientX, clientY) {
    hovered = card;
    const ring = $('cardRing');
    const canvas = $('chart');
    const rect = canvas.getBoundingClientRect();
    const sx = rect.width / geom.width;
    const sy = rect.height / geom.height;
    ring.hidden = false;
    ring.style.left = card.x * sx + 'px';
    ring.style.top = card.y * sy + 'px';
    ring.style.width = card.w * sx + 'px';
    ring.style.height = card.h * sy + 'px';

    const team = S.teamById(card.driver.teamId);
    const tip = ensureTooltip();
    const d = card.driver;
    tip.innerHTML =
      `<b>${U.escapeHtml(d.name)}</b>` +
      (d.nameZh ? `<span class="zh">${U.escapeHtml(d.nameZh)}</span>` : '') +
      `<span class="row">${U.escapeHtml(team ? team.name : '未归属车队')} · ${U.escapeHtml(d.country || '—')}</span>` +
      `<span class="row">生日 ${U.escapeHtml(A_fmt(d.birthday))} · ${card.age} 岁</span>` +
      (d.status === 'pending' ? '<span class="pending">席位待官宣</span>' : '');
    tip.hidden = false;
    const tw = tip.offsetWidth;
    const th = tip.offsetHeight;
    let left = clientX + 16;
    let top = clientY + 18;
    if (left + tw > window.innerWidth - 12) left = clientX - tw - 14;
    if (top + th > window.innerHeight - 12) top = clientY - th - 14;
    tip.style.left = Math.max(10, left) + 'px';
    tip.style.top = Math.max(10, top) + 'px';
  }

  function A_fmt(v) {
    return F1.age.formatBirthday(v, 'yyyy/mm/dd');
  }

  function bindCanvas() {
    const canvas = $('chart');
    const stage = $('stage');

    stage.addEventListener('pointermove', (e) => {
      const card = cardAt(e.clientX, e.clientY);
      if (card) {
        canvas.style.cursor = 'pointer';
        if (!hovered || hovered.driver.id !== card.driver.id) showHover(card, e.clientX, e.clientY);
        else {
          const tip = ensureTooltip();
          if (!tip.hidden) {
            let left = e.clientX + 16;
            let top = e.clientY + 18;
            if (left + tip.offsetWidth > window.innerWidth - 12) left = e.clientX - tip.offsetWidth - 14;
            if (top + tip.offsetHeight > window.innerHeight - 12) top = e.clientY - tip.offsetHeight - 14;
            tip.style.left = Math.max(10, left) + 'px';
            tip.style.top = Math.max(10, top) + 'px';
          }
        }
      } else if (hovered) {
        canvas.style.cursor = '';
        hideHover();
      }
    });

    stage.addEventListener('pointerleave', () => {
      canvas.style.cursor = '';
      hideHover();
    });

    canvas.addEventListener('click', (e) => {
      const card = cardAt(e.clientX, e.clientY);
      if (card && F1.ui) F1.ui.openDriver(card.driver.id);
    });

    /* drag & drop a portrait onto a card */
    const clearDrop = () => canvas.classList.remove('drop-target');
    canvas.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
      const card = cardAt(e.clientX, e.clientY);
      canvas.classList.toggle('drop-target', !!card);
    });
    canvas.addEventListener('dragleave', clearDrop);
    canvas.addEventListener('drop', async (e) => {
      e.preventDefault();
      clearDrop();
      const card = cardAt(e.clientX, e.clientY);
      if (!card) {
        F1.ui.toast('请把照片拖到某张车手卡片上', 'error');
        return;
      }
      const file = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
      if (!file) return;
      try {
        const dataUrl = await U.readImageFile(file, 420);
        S.updateDriver(card.driver.id, { photo: dataUrl, photoHidden: false });
        F1.ui.toast(`已替换 ${card.driver.name} 的照片，点击卡片可调整裁剪`, 'success');
      } catch (err) {
        F1.ui.toast(err.message || '照片读取失败', 'error');
      }
    });

    /* preview zoom */
    const zoomInput = $('inPreviewZoom');
    const zoomLabel = $('previewZoomLabel');
    zoomInput.addEventListener('input', () => {
      zoom = Number(zoomInput.value) || 100;
      zoomLabel.textContent = Math.round(zoom) + '%';
      render();
    });
    $('btnFit').addEventListener('click', () => {
      zoom = 100;
      zoomInput.value = '100';
      zoomLabel.textContent = '100%';
      render();
    });

    let raf = 0;
    const onResize = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        if (geom) render();
      });
    };
    if (window.ResizeObserver) {
      const ro = new ResizeObserver(onResize);
      ro.observe(stage);
    } else {
      window.addEventListener('resize', onResize);
    }
    window.addEventListener('resize', onResize);
  }

  function init() {
    F1.ui.init();
    S.subscribe(() => schedule());
    F1.render.setImageListener(() => schedule());

    geom = F1.layout.build(state);
    bindCanvas();
    render();
    F1.render.preload(state).then(() => schedule());
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => schedule());
    window.addEventListener('beforeunload', () => {
      try {
        S.persistNow();
      } catch (e) {
        /* ignore */
      }
    });
    F1.app = {
      getGeom: () => geom,
      render,
      schedule,
    };
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
