/* F1 Age Chart — application state, persistence, datasets. */
(function () {
  'use strict';
  const F1 = (window.F1 = window.F1 || {});
  const U = F1.util;
  const D = F1.data;

  const STATE_KEY = 'f1age.state.v1';
  const DATASETS_KEY = 'f1age.datasets.v1';

  function defaultFocus() {
    return { x: 0.5, y: 0.35, z: 1 };
  }

  function lastWord(name) {
    const parts = String(name || '').trim().split(/\s+/);
    return parts.length ? parts[parts.length - 1] : '';
  }

  function normalizeDriver(driver, index) {
    const d = Object.assign({}, driver);
    d.id = String(d.id || U.uid('drv'));
    d.name = String(d.name || d.shortName || 'Driver ' + (index + 1)).trim();
    d.shortName = String(d.shortName || lastWord(d.name)).trim();
    d.nameZh = String(d.nameZh || '').trim();
    d.teamId = String(d.teamId || '');
    d.country = String(d.country || '').toUpperCase().slice(0, 3);
    d.birthday = String(d.birthday || '').trim();
    d.status = d.status === 'pending' ? 'pending' : 'confirmed';
    d.highlight = !!d.highlight;
    d.photo = typeof d.photo === 'string' && d.photo ? d.photo : null;
    d.photoHidden = !!d.photoHidden;
    const f = d.photoFocus && typeof d.photoFocus === 'object' ? d.photoFocus : {};
    d.photoFocus = {
      x: U.clamp(Number(f.x != null ? f.x : 0.5), 0, 1),
      y: U.clamp(Number(f.y != null ? f.y : 0.35), 0, 1),
      z: U.clamp(Number(f.z != null ? f.z : 1), 1, 2.4),
    };
    return d;
  }

  function normalizeTeam(team, index) {
    const t = Object.assign({}, team);
    t.id = String(t.id || U.uid('team'));
    t.name = String(t.name || 'Team ' + (index + 1)).trim();
    t.code = String(t.code || t.name.slice(0, 3)).toUpperCase().slice(0, 4);
    t.accent = /^#[0-9a-fA-F]{6}$/.test(t.accent || '') ? t.accent : D.GROUP_PALETTE[index % D.GROUP_PALETTE.length];
    return t;
  }

  function seasonPreset(season) {
    const key = Number(season) === 2026 ? 2026 : 2027;
    return D.SEASONS[key] || D.SEASONS[2027];
  }

  function defaultState(season) {
    const preset = seasonPreset(season);
    return {
      schema: 2,
      season: preset.season,
      asOfDate: preset.asOfDate,
      title: preset.title,
      subtitle: '',
      headerNote: '* 年龄截至 {date} 统计，数据来自 F1 官方与 Wikipedia。',
      headerSubNote: preset.headerSubNote,
      footerRight: preset.footerRight,
      theme: 'pastel',
      groupBy: 'month',
      sortMode: 'labelAsc',
      columnOrder: [],
      cardScale: 1,
      cardFill: 0.92,
      verticalDensity: 0.4,
      fontScale: 1.08,
      compactRows: false,
      cardName: 'latin',
      showPhotos: true,
      showAgeBadge: true,
      showCountry: false,
      showBand: false,
      showFooter: false,
      axisGradient: true,
      teams: U.clone(preset.teams).map(normalizeTeam),
      drivers: U.clone(preset.drivers).map(normalizeDriver),
    };
  }

  function normalizeState(raw) {
    const incoming = Number(raw && raw.schema) || 0;
    const base = defaultState();
    const s = Object.assign(base, raw && typeof raw === 'object' ? raw : {});

    /* v2 poster restyle: drop the old document-like chrome and use the
       full-bleed, flatter, denser defaults. User data is preserved. */
    if (incoming < 2) {
      s.subtitle = '';
      s.showCountry = false;
      s.showBand = false;
      s.showFooter = false;
      s.cardFill = 0.92;
      s.verticalDensity = 0.4;
      s.fontScale = 1.08;
      s.compactRows = false;
      s.groupBy = 'month';
      s.sortMode = 'labelAsc';
      s.headerSubNote = base.headerSubNote;
      const focusUpdates = {
        hamilton: { x: 0.5, y: 0.3, z: 1.05 },
        leclerc: { x: 0.5, y: 0.3, z: 1.02 },
        alonso: { x: 0.5, y: 0.28, z: 1.02 },
      };
      if (Array.isArray(s.drivers)) {
        s.drivers = s.drivers.map((d) => {
          if (!d) return d;
          if (d.id === 'bearman') return Object.assign({}, d, { status: 'confirmed' });
          if (focusUpdates[d.id]) return Object.assign({}, d, { photoFocus: focusUpdates[d.id] });
          return d;
        });
      }
    }
    s.schema = 2;

    s.season = Number.isFinite(Number(s.season)) ? Number(s.season) : 2027;
    if (!A_parse(s.asOfDate)) s.asOfDate = base.asOfDate;
    s.title = String(s.title != null ? s.title : base.title);
    s.subtitle = String(s.subtitle != null ? s.subtitle : base.subtitle);
    s.headerNote = String(s.headerNote != null ? s.headerNote : base.headerNote);
    s.headerSubNote = String(s.headerSubNote != null ? s.headerSubNote : base.headerSubNote);
    s.footerRight = String(s.footerRight != null ? s.footerRight : base.footerRight);

    if (!F1.themes.registry[s.theme]) s.theme = 'pastel';
    if (!F1.groups.registry[s.groupBy]) s.groupBy = 'team';
    const sortIds = F1.layout.SORTS.map((x) => x.id);
    if (sortIds.indexOf(s.sortMode) < 0) s.sortMode = 'avgDesc';
    s.columnOrder = Array.isArray(s.columnOrder) ? s.columnOrder.map(String) : [];
    s.cardScale = U.clamp(Number(s.cardScale) || 1, 0.7, 1.35);
    s.cardFill = U.clamp(Number.isFinite(Number(s.cardFill)) ? Number(s.cardFill) : 0.92, 0.7, 0.97);
    s.verticalDensity = U.clamp(
      Number.isFinite(Number(s.verticalDensity)) ? Number(s.verticalDensity) : 0.4,
      0.3,
      1
    );
    s.fontScale = U.clamp(Number.isFinite(Number(s.fontScale)) ? Number(s.fontScale) : 1.08, 0.85, 1.3);
    s.compactRows = !!s.compactRows;
    s.cardName = ['latin', 'zh', 'full'].indexOf(s.cardName) >= 0 ? s.cardName : 'latin';
    s.showPhotos = !!s.showPhotos;
    s.showAgeBadge = !!s.showAgeBadge;
    s.showCountry = !!s.showCountry;
    s.showBand = !!s.showBand;
    s.showFooter = !!s.showFooter;
    s.axisGradient = s.axisGradient !== false;

    const teams = Array.isArray(s.teams) ? s.teams.map(normalizeTeam) : [];
    s.teams = teams.length ? teams : base.teams;
    const seen = new Set();
    const drivers = Array.isArray(s.drivers) ? s.drivers.map(normalizeDriver) : base.drivers;
    drivers.forEach((d) => {
      if (seen.has(d.id)) d.id = U.uid('drv');
      seen.add(d.id);
    });
    s.drivers = drivers;
    return s;
  }

  function A_parse(v) {
    return F1.age.parseISO(v);
  }

  function load() {
    try {
      const raw = localStorage.getItem(STATE_KEY);
      if (!raw) return defaultState();
      return normalizeState(JSON.parse(raw));
    } catch (e) {
      return defaultState();
    }
  }

  const listeners = [];
  let persistTimer = 0;
  let persistError = null;

  function persistNow() {
    try {
      localStorage.setItem(STATE_KEY, JSON.stringify(state));
      persistError = null;
    } catch (e) {
      persistError = e;
      if (listeners.length) listeners.forEach((fn) => fn({ type: 'error', error: e }));
    }
  }

  function persist() {
    clearTimeout(persistTimer);
    persistTimer = setTimeout(persistNow, 220);
  }

  const state = load();

  function emit(meta) {
    listeners.forEach((fn) => {
      try {
        fn(meta || {});
      } catch (e) {
        console.error(e);
      }
    });
  }

  function set(mutator, meta) {
    mutator(state);
    persist();
    emit(meta || { type: 'settings' });
  }

  function setField(key, value) {
    set((s) => {
      s[key] = value;
    }, { type: 'setting', key });
  }

  function setGroupBy(id) {
    set((s) => {
      s.groupBy = id;
      s.columnOrder = [];
      if (s.sortMode === 'manual') s.sortMode = 'avgDesc';
    }, { type: 'setting', key: 'groupBy' });
  }

  function setSortMode(id) {
    set((s) => {
      s.sortMode = id;
    }, { type: 'setting', key: 'sortMode' });
  }

  function teamById(id) {
    return state.teams.find((t) => t.id === id) || null;
  }

  function updateTeam(id, patch) {
    set((s) => {
      const t = s.teams.find((x) => x.id === id);
      if (t) Object.assign(t, patch);
    }, { type: 'setting', key: 'team' });
  }

  function addTeam() {
    set((s) => {
      const idx = s.teams.length;
      s.teams.push(
        normalizeTeam(
          {
            name: 'New Team',
            code: 'NEW',
            accent: D.GROUP_PALETTE[idx % D.GROUP_PALETTE.length],
          },
          idx
        )
      );
    }, { type: 'data', scope: 'teams' });
  }

  function removeTeam(id) {
    if (state.drivers.some((d) => d.teamId === id)) return false;
    set((s) => {
      s.teams = s.teams.filter((t) => t.id !== id);
    }, { type: 'data', scope: 'teams' });
    return true;
  }

  function addDriver(partial) {
    const team = state.teams[0];
    const driver = normalizeDriver(
      Object.assign(
        {
          name: 'New Driver',
          shortName: 'Driver',
          nameZh: '',
          teamId: team ? team.id : '',
          country: '',
          birthday: '2005-01-01',
          status: 'pending',
        },
        partial || {}
      ),
      state.drivers.length
    );
    set((s) => {
      s.drivers.push(driver);
    }, { type: 'data', scope: 'drivers' });
    return driver;
  }

  function updateDriver(id, patch) {
    set((s) => {
      const d = s.drivers.find((x) => x.id === id);
      if (!d) return;
      Object.assign(d, patch);
      if (patch && patch.name && !patch.shortName) d.shortName = lastWord(patch.name);
      normalizeDriverInPlace(d);
    }, { type: 'data', scope: 'drivers' });
  }

  function normalizeDriverInPlace(d) {
    const n = normalizeDriver(d);
    Object.keys(d).forEach((k) => delete d[k]);
    Object.assign(d, n);
  }

  function removeDriver(id) {
    set((s) => {
      s.drivers = s.drivers.filter((d) => d.id !== id);
    }, { type: 'data', scope: 'drivers' });
  }

  function resetAll() {
    set((s) => {
      const base = defaultState(s.season);
      Object.keys(s).forEach((k) => delete s[k]);
      Object.assign(s, base);
    }, { type: 'reset' });
  }

  function loadSeasonPreset(season) {
    const preset = seasonPreset(season);
    set((s) => {
      s.season = preset.season;
      s.asOfDate = preset.asOfDate;
      s.title = preset.title;
      s.headerSubNote = preset.headerSubNote;
      s.footerRight = preset.footerRight;
      s.teams = U.clone(preset.teams).map(normalizeTeam);
      s.drivers = U.clone(preset.drivers).map(normalizeDriver);
      s.columnOrder = [];
    }, { type: 'season', season: preset.season });
    return preset.season;
  }

  function exportData() {
    return {
      schema: 2,
      season: state.season,
      asOfDate: state.asOfDate,
      title: state.title,
      subtitle: state.subtitle,
      headerNote: state.headerNote,
      headerSubNote: state.headerSubNote,
      footerRight: state.footerRight,
      theme: state.theme,
      groupBy: state.groupBy,
      sortMode: state.sortMode,
      columnOrder: state.columnOrder.slice(),
      cardScale: state.cardScale,
      cardFill: state.cardFill,
      verticalDensity: state.verticalDensity,
      fontScale: state.fontScale,
      compactRows: state.compactRows,
      cardName: state.cardName,
      showPhotos: state.showPhotos,
      showAgeBadge: state.showAgeBadge,
      showCountry: state.showCountry,
      showBand: state.showBand,
      showFooter: state.showFooter,
      axisGradient: state.axisGradient,
      teams: U.clone(state.teams),
      drivers: U.clone(state.drivers),
      exportedAt: new Date().toISOString(),
    };
  }

  function importData(obj) {
    if (!obj || typeof obj !== 'object') throw new Error('JSON 格式不正确');
    if (!Array.isArray(obj.drivers)) throw new Error('缺少 drivers 数组');
    if (obj.drivers.length > 200) throw new Error('车手数量过多（最多 200）');
    const teams = Array.isArray(obj.teams) ? obj.teams.map(normalizeTeam) : state.teams;
    const teamIds = new Set(teams.map((t) => t.id));
    const missing = obj.drivers.filter((d) => d && d.teamId && !teamIds.has(d.teamId));
    if (missing.length && !teams.length) throw new Error('缺少车队数据');
    const next = normalizeState(
      Object.assign({}, state, obj, {
        teams,
        drivers: obj.drivers.map(normalizeDriver),
      })
    );
    set((s) => {
      Object.keys(s).forEach((k) => delete s[k]);
      Object.assign(s, next);
    }, { type: 'import' });
    return next;
  }

  /* ------------------------------ datasets (named local snapshots) */

  function readDatasets() {
    try {
      const raw = localStorage.getItem(DATASETS_KEY);
      const data = raw ? JSON.parse(raw) : {};
      return data && typeof data === 'object' ? data : {};
    } catch (e) {
      return {};
    }
  }

  function writeDatasets(data) {
    localStorage.setItem(DATASETS_KEY, JSON.stringify(data));
  }

  function saveDataset(name) {
    const key = String(name || '').trim();
    if (!key) throw new Error('请输入数据集名称');
    const all = readDatasets();
    all[key] = exportData();
    writeDatasets(all);
    return key;
  }

  function listDatasets() {
    return Object.keys(readDatasets());
  }

  function loadDataset(name) {
    const all = readDatasets();
    if (!all[name]) throw new Error('数据集不存在');
    importData(all[name]);
  }

  function deleteDataset(name) {
    const all = readDatasets();
    delete all[name];
    writeDatasets(all);
  }

  F1.state = state;
  F1.store = {
    state,
    subscribe(fn) {
      listeners.push(fn);
      return () => {
        const i = listeners.indexOf(fn);
        if (i >= 0) listeners.splice(i, 1);
      };
    },
    set,
    setField,
    setGroupBy,
    setSortMode,
    teamById,
    updateTeam,
    addTeam,
    removeTeam,
    addDriver,
    updateDriver,
    removeDriver,
    resetAll,
    seasonPreset,
    loadSeasonPreset,
    exportData,
    importData,
    saveDataset,
    listDatasets,
    loadDataset,
    deleteDataset,
    persistNow,
    getPersistError() {
      return persistError;
    },
    normalizeState,
    defaultState,
  };
})();
