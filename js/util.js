/* F1 Age Chart — small utility belt (no dependencies). */
(function () {
  'use strict';
  const F1 = (window.F1 = window.F1 || {});

  const FONT_CN = '"Microsoft YaHei", "PingFang SC", "Noto Sans SC", "Segoe UI", sans-serif';
  const FONT_NUM = '"Bahnschrift", "DIN Alternate", "Segoe UI", "Microsoft YaHei", sans-serif';

  function clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
  }

  function pad2(n) {
    return n < 10 ? '0' + n : String(n);
  }

  function hexToRgb(hex) {
    let h = String(hex || '').trim().replace('#', '');
    if (h.length === 3) h = h.split('').map((c) => c + c).join('');
    if (!/^[0-9a-fA-F]{6}$/.test(h)) return { r: 0, g: 0, b: 0 };
    const n = parseInt(h, 16);
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
  }

  function rgbToHex(r, g, b) {
    return '#' + [r, g, b].map((v) => clamp(Math.round(v), 0, 255).toString(16).padStart(2, '0')).join('');
  }

  /** Mix hex colors. t = 0 -> a, t = 1 -> b. */
  function mix(a, b, t) {
    const A = hexToRgb(a);
    const B = hexToRgb(b);
    return rgbToHex(A.r + (B.r - A.r) * t, A.g + (B.g - A.g) * t, A.b + (B.b - A.b) * t);
  }

  function alpha(hex, a) {
    const c = hexToRgb(hex);
    return `rgba(${c.r},${c.g},${c.b},${a})`;
  }

  function luminance(hex) {
    const c = hexToRgb(hex);
    const f = (v) => {
      v /= 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    };
    return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b);
  }

  function contrastInk(hex, dark, light) {
    return luminance(hex) > 0.45 ? dark || '#15161b' : light || '#ffffff';
  }

  function hashString(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  function uid(prefix) {
    return (prefix || 'id') + '-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 7);
  }

  function clone(v) {
    return JSON.parse(JSON.stringify(v));
  }

  function debounce(fn, wait) {
    let t = 0;
    return function (...args) {
      clearTimeout(t);
      t = setTimeout(() => fn.apply(this, args), wait);
    };
  }

  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function font(ctx, size, weight, family) {
    ctx.font = `${weight || 400} ${size}px ${family || FONT_NUM}`;
  }

  function letterSpacing(ctx, px) {
    try {
      ctx.letterSpacing = px + 'px';
    } catch (e) {
      /* older browsers */
    }
  }

  function roundRect(ctx, x, y, w, h, r) {
    const rr = typeof r === 'number' ? [r, r, r, r] : r || [0, 0, 0, 0];
    const max = Math.min(w, h) / 2;
    const [tl, tr, br, bl] = rr.map((v) => Math.min(v, max));
    ctx.beginPath();
    ctx.moveTo(x + tl, y);
    ctx.lineTo(x + w - tr, y);
    if (tr) ctx.quadraticCurveTo(x + w, y, x + w, y + tr);
    ctx.lineTo(x + w, y + h - br);
    if (br) ctx.quadraticCurveTo(x + w, y + h, x + w - br, y + h);
    ctx.lineTo(x + bl, y + h);
    if (bl) ctx.quadraticCurveTo(x, y + h, x, y + h - bl);
    ctx.lineTo(x, y + tl);
    if (tl) ctx.quadraticCurveTo(x, y, x + tl, y);
    ctx.closePath();
  }

  function truncate(ctx, text, maxWidth) {
    if (ctx.measureText(text).width <= maxWidth) return text;
    const ell = '…';
    let lo = 0;
    let hi = text.length;
    while (lo < hi) {
      const mid = Math.ceil((lo + hi) / 2);
      if (ctx.measureText(text.slice(0, mid) + ell).width <= maxWidth) lo = mid;
      else hi = mid - 1;
    }
    return lo > 0 ? text.slice(0, lo) + ell : ell;
  }

  /** Return a font size that fits text within maxWidth (never larger than size). */
  function fitFont(ctx, text, maxWidth, size, weight, family, minSize) {
    let s = size;
    const floor = minSize || 8;
    font(ctx, s, weight, family);
    if (ctx.measureText(text).width <= maxWidth) return s;
    while (s > floor) {
      s = Math.max(floor, s - 0.5);
      font(ctx, s, weight, family);
      if (ctx.measureText(text).width <= maxWidth) return s;
    }
    return floor;
  }

  function readImageFile(file, maxWidth) {
    return new Promise((resolve, reject) => {
      if (!file || !/^image\//.test(file.type)) {
        reject(new Error('请选择图片文件'));
        return;
      }
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        try {
          const scale = Math.min(1, (maxWidth || 360) / img.naturalWidth);
          const w = Math.max(1, Math.round(img.naturalWidth * scale));
          const h = Math.max(1, Math.round(img.naturalHeight * scale));
          const c = document.createElement('canvas');
          c.width = w;
          c.height = h;
          const ctx = c.getContext('2d');
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, w, h);
          resolve(c.toDataURL('image/jpeg', 0.86));
        } catch (err) {
          reject(err);
        } finally {
          URL.revokeObjectURL(url);
        }
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('图片读取失败'));
      };
      img.src = url;
    });
  }

  function loadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.decoding = 'async';
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('图片加载失败'));
      img.src = src;
    });
  }

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  }

  function downloadText(text, filename, type) {
    const blob = new Blob([text], { type: type || 'application/json;charset=utf-8' });
    downloadBlob(blob, filename);
  }

  function pickFile(accept) {
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = accept || '';
      input.onchange = () => resolve(input.files && input.files[0]);
      input.click();
    });
  }

  function mean(nums) {
    if (!nums.length) return 0;
    return nums.reduce((a, b) => a + b, 0) / nums.length;
  }

  F1.util = {
    FONT_CN,
    FONT_NUM,
    clamp,
    pad2,
    hexToRgb,
    rgbToHex,
    mix,
    alpha,
    luminance,
    contrastInk,
    hashString,
    uid,
    clone,
    debounce,
    escapeHtml,
    font,
    letterSpacing,
    roundRect,
    truncate,
    fitFont,
    readImageFile,
    loadImage,
    downloadBlob,
    downloadText,
    pickFile,
    mean,
  };
})();
