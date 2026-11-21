/* F1 Age Chart — full-resolution export (PNG / JPEG / clipboard). */
(function () {
  'use strict';
  const F1 = (window.F1 = window.F1 || {});
  const L = F1.layout;

  const MAX_DIM = 12000;
  const MAX_PIXELS = 72e6;

  function resolveScale(state, scale) {
    const geom = L.build(state);
    let s = Number(scale) || 2;
    if (geom.empty) return { geom, scale: s };
    s = Math.min(s, MAX_DIM / geom.width, MAX_DIM / geom.height, Math.sqrt(MAX_PIXELS / (geom.width * geom.height)));
    s = Math.max(0.5, s);
    return { geom, scale: s };
  }

  async function renderCanvas(state, scale) {
    await F1.render.preload(state);
    if (document.fonts && document.fonts.ready) {
      try {
        await document.fonts.ready;
      } catch (err) {
        /* fonts are best-effort */
      }
    }
    const theme = F1.themes.get(state.theme);
    const { geom, scale: s } = resolveScale(state, scale);
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(geom.width * s));
    canvas.height = Math.max(1, Math.round(geom.height * s));
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.scale(canvas.width / geom.width, canvas.height / geom.height);
    F1.render.draw(ctx, state, geom, theme);
    return { canvas, geom, actualScale: s, theme, requestedScale: scale };
  }

  function toBlob(canvas, type, quality) {
    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error('图片编码失败，稍后再试'))),
        type || 'image/png',
        quality
      );
    });
  }

  function filename(state, ext) {
    const date = String(state.asOfDate || '').replace(/-/g, '') || 'chart';
    return `F1-${state.season || 'season'}-driver-age-${date}.${ext || 'png'}`;
  }

  async function exportImage(state, opts) {
    const o = opts || {};
    const format = o.format === 'jpeg' ? 'jpeg' : 'png';
    const { canvas, geom, actualScale } = await renderCanvas(state, o.scale || 2);
    const mime = format === 'jpeg' ? 'image/jpeg' : 'image/png';
    const blob = await toBlob(canvas, mime, format === 'jpeg' ? (o.quality == null ? 0.92 : o.quality) : undefined);
    const name = o.filename || filename(state, format === 'jpeg' ? 'jpg' : 'png');
    F1.util.downloadBlob(blob, name);
    return { blob, name, width: canvas.width, height: canvas.height, geom, scale: actualScale, format };
  }

  async function copyImage(state) {
    if (!navigator.clipboard || !window.ClipboardItem) throw new Error('当前浏览器不支持复制图片，请使用「导出 PNG」');
    await F1.render.preload(state);
    const { canvas } = await renderCanvas(state, 2);
    const blob = await toBlob(canvas, 'image/png');
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
    return { width: canvas.width, height: canvas.height };
  }

  function sizeOf(state, scale) {
    const { geom, scale: s } = resolveScale(state, scale);
    return {
      width: Math.round(geom.width * s),
      height: Math.round(geom.height * s),
      widthCss: geom.width,
      heightCss: geom.height,
      scale: s,
      megapixels: (geom.width * s * geom.height * s) / 1e6,
    };
  }

  F1.exporter = { renderCanvas, exportImage, copyImage, sizeOf, resolveScale, filename, toBlob };
})();
