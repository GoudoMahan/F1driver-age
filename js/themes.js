/* F1 Age Chart — poster themes (extensible registry). */
(function () {
  'use strict';
  const F1 = (window.F1 = window.F1 || {});
  const U = F1.util;

  const registry = {};
  const order = [];

  function register(id, def) {
    if (!registry[id]) order.push(id);
    registry[id] = Object.assign({ id }, def);
    return registry[id];
  }

  function get(id) {
    return registry[id] || registry.pastel;
  }

  function list() {
    return order.map((id) => registry[id]);
  }

  register('pastel', {
    label: '粉彩 · 参考原图',
    swatch: '#FFD6DF',
    bg: '#FFFFFF',
    ink: '#15161B',
    muted: '#6C6E77',
    faint: '#9A9CA5',
    hairline: '#E6E3DD',
    dash: '#CDCDD5',
    headerRule: '#15161B',
    axisTop: '#FFC4D2',
    axisBottom: '#C3E3FF',
    axisText: '#15161B',
    cardBorder: 'rgba(21,22,27,0.26)',
    cardShadow: 'rgba(21,22,27,0.12)',
    photoPlaceholder: '#F0F0F3',
    noteInk: '#D20A2E',
    bandBase: '#15161B',
    labelMuted: 'rgba(21,22,27,0.58)',
    columnTint(accent) {
      return U.mix(accent, '#FFFFFF', 0.82);
    },
    cardTint(accent) {
      return U.mix(accent, '#FFFFFF', 0.72);
    },
    photoBg(accent) {
      return U.mix(accent, '#FFFFFF', 0.93);
    },
    textAccent(accent) {
      return U.mix(accent, '#15161B', 0.16);
    },
    badgeBg(accent) {
      return U.mix(accent, '#FFFFFF', 0.88);
    },
  });

  register('sand', {
    label: '暖纸 · 低饱和',
    swatch: '#EFE3D3',
    bg: '#FBF8F2',
    ink: '#1E1B17',
    muted: '#78726A',
    faint: '#A39B90',
    hairline: '#E1D8C9',
    dash: '#CDC3B4',
    headerRule: '#1E1B17',
    axisTop: '#F3D2C0',
    axisBottom: '#D6E5DE',
    axisText: '#1E1B17',
    cardBorder: 'rgba(30,27,23,0.27)',
    cardShadow: 'rgba(30,27,23,0.13)',
    photoPlaceholder: '#F2ECE2',
    noteInk: '#B7232F',
    bandBase: '#1E1B17',
    labelMuted: 'rgba(30,27,23,0.6)',
    columnTint(accent) {
      return U.mix(accent, '#FBF8F2', 0.82);
    },
    cardTint(accent) {
      return U.mix(accent, '#FBF8F2', 0.72);
    },
    photoBg(accent) {
      return U.mix(accent, '#FBF8F2', 0.92);
    },
    textAccent(accent) {
      return U.mix(accent, '#1E1B17', 0.22);
    },
    badgeBg(accent) {
      return U.mix(accent, '#FBF8F2', 0.86);
    },
  });

  register('night', {
    label: '夜赛 · 深色',
    swatch: '#1B2130',
    bg: '#0D1016',
    ink: '#F3F4F7',
    muted: '#9AA0AC',
    faint: '#6E7583',
    hairline: '#232A36',
    dash: '#2E3643',
    headerRule: '#F3F4F7',
    axisTop: '#3B1E2B',
    axisBottom: '#16293C',
    axisText: '#F3F4F7',
    cardBorder: 'rgba(255,255,255,0.24)',
    cardShadow: 'rgba(0,0,0,0.45)',
    photoPlaceholder: '#171C26',
    noteInk: '#FF5C7C',
    bandBase: '#0D1016',
    labelMuted: 'rgba(244,245,248,0.62)',
    columnTint(accent) {
      return U.mix(accent, '#0D1016', 0.78);
    },
    cardTint(accent) {
      return U.mix(accent, '#0D1016', 0.66);
    },
    photoBg(accent) {
      return U.mix(accent, '#0D1016', 0.9);
    },
    textAccent(accent) {
      return U.mix(accent, '#FFFFFF', 0.38);
    },
    badgeBg(accent) {
      return U.mix(accent, '#0D1016', 0.62);
    },
  });

  F1.themes = { registry, order, register, get, list };
})();
