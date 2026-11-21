/* F1 Age Chart — control panel + driver editor. */
(function () {
  'use strict';
  const F1 = (window.F1 = window.F1 || {});
  const U = F1.util;
  const A = F1.age;
  const S = F1.store;
  const state = F1.state;
  const $ = (id) => document.getElementById(id);

  let editingId = null;
  let draft = null;
  let toastTimer = 0;
  let saveTimer = 0;
  const previewImages = new Map();

  /* ------------------------------------------------------------- helpers */

  function toast(message, type) {
    const el = $('toast');
    if (!el) return;
    clearTimeout(toastTimer);
    el.textContent = message;
    el.hidden = false;
    el.className = 'toast show' + (type ? ' ' + type : '');
    toastTimer = setTimeout(() => {
      el.classList.remove('show');
      setTimeout(() => {
        if (!el.classList.contains('show')) el.hidden = true;
      }, 220);
    }, 3200);
  }

  function setBusy(on, text) {
    const el = $('busyChip');
    if (!el) return;
    el.hidden = !on;
    if (on && text) el.querySelector('span:last-child').textContent = text;
  }

  function markSaving() {
    const el = $('saveState');
    if (!el) return;
    el.textContent = '保存中…';
    el.className = 'save-state saving';
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      const err = S.getPersistError();
      if (err) {
        el.textContent = '本地保存失败（可能容量不足）';
        el.className = 'save-state error';
      } else {
        el.textContent = '已自动保存';
        el.className = 'save-state';
      }
    }, 420);
  }

  function fillSelect(select, items, value) {
    select.innerHTML = '';
    items.forEach((item) => {
      const opt = document.createElement('option');
      opt.value = item.value;
      opt.textContent = item.label;
      select.appendChild(opt);
    });
    if (value != null) select.value = value;
  }

  function inputValue(id, value) {
    const el = $(id);
    if (!el) return;
    if (el.type === 'checkbox') {
      if (el.checked !== !!value) el.checked = !!value;
    } else if (document.activeElement !== el && el.value !== String(value)) {
      el.value = value;
    }
  }

  function teamById(id) {
    return state.teams.find((t) => t.id === id) || null;
  }

  /* ------------------------------------------------------------ populate */

  function populateStatic() {
    fillSelect(
      $('inGroupBy'),
      F1.groups.list().map((g) => ({ value: g.id, label: g.label })),
      state.groupBy
    );
    fillSelect(
      $('inSortMode'),
      F1.layout.SORTS.map((s) => ({ value: s.id, label: s.label })),
      state.sortMode
    );
    fillSelect(
      $('inTheme'),
      F1.themes.list().map((t) => ({ value: t.id, label: t.label })),
      state.theme
    );
    const hints = F1.groups.list().map((g) => `${g.label}：${g.hint || ''}`).join('\n');
    $('inGroupBy').title = hints;
  }

  function populateTeamSelect(select, value) {
    select.innerHTML = '';
    state.teams.forEach((t) => {
      const opt = document.createElement('option');
      opt.value = t.id;
      opt.textContent = `${t.name}（${t.code}）`;
      select.appendChild(opt);
    });
    if (value != null) select.value = value;
  }

  /* --------------------------------------------------------------- sync */

  function syncControls() {
    inputValue('inAsOf', state.asOfDate);
    inputValue('inCardName', state.cardName);
    inputValue('inTitle', state.title);
    inputValue('inSubtitle', state.subtitle);
    inputValue('inHeaderNote', state.headerNote);
    inputValue('inHeaderSubNote', state.headerSubNote);
    inputValue('inFooterRight', state.footerRight);
    inputValue('inCompactRows', state.compactRows);
    inputValue('inShowPhotos', state.showPhotos);
    inputValue('inShowAgeBadge', state.showAgeBadge);
    inputValue('inShowCountry', state.showCountry);
    inputValue('inShowBand', state.showBand);
    inputValue('inShowFooter', state.showFooter);
    inputValue('inAxisGradient', state.axisGradient);
    inputValue('inGroupBy', state.groupBy);
    inputValue('inSortMode', state.sortMode);
    inputValue('inTheme', state.theme);
    inputValue('inCardScale', state.cardScale);
    inputValue('inFontScale', state.fontScale);
    inputValue('inCardFill', state.cardFill);
    inputValue('inVerticalDensity', state.verticalDensity);
    $('seasonChip').value = String(state.season);
    document.title = `${state.title} — F1 Age Chart`;
    document.querySelectorAll('[data-season]').forEach((btn) => {
      btn.classList.toggle('active', Number(btn.dataset.season) === Number(state.season));
    });
    const seasonHint = $('seasonHint');
    if (seasonHint) {
      seasonHint.textContent =
        state.season === 2026
          ? '2026 赛季实际参加过正赛的 25 位车手（含替补；截至第 21 轮）。切换会载入内置阵容。'
          : '2027 为已官宣的 22 位车手；2026 为实际参加过正赛的 25 位（含替补）。切换会载入内置阵容。';
    }
    $('cardScaleVal').textContent = Math.round(state.cardScale * 100) + '%';
    $('fontScaleVal').textContent = Math.round(state.fontScale * 100) + '%';
    $('cardFillVal').textContent = Math.round(state.cardFill * 100) + '%';
    $('densityVal').textContent = Math.round(state.verticalDensity * 100) + '%';
    $('inExportFormat').value = $('inExportFormat').value || 'png';
  }

  function syncDynamic() {
    renderTeamList();
    renderDriverList();
    renderDatasetOptions();
    renderManualOrder();
    updateExportSize();
  }

  function syncAll() {
    syncControls();
    syncDynamic();
  }

  /* --------------------------------------------------------------- teams */

  function renderTeamList() {
    const wrap = $('teamList');
    const used = new Set(state.drivers.map((d) => d.teamId));
    wrap.innerHTML = '';
    state.teams.forEach((team) => {
      const row = document.createElement('div');
      row.className = 'team-row';

      const color = document.createElement('input');
      color.type = 'color';
      color.value = team.accent;
      color.title = '车队颜色';
      color.addEventListener('input', () => S.updateTeam(team.id, { accent: color.value }));

      const name = document.createElement('input');
      name.type = 'text';
      name.value = team.name;
      name.title = '车队名称';
      name.maxLength = 30;
      name.addEventListener('change', () => S.updateTeam(team.id, { name: name.value.trim() || team.name }));

      const code = document.createElement('input');
      code.type = 'text';
      code.className = 'code';
      code.value = team.code;
      code.maxLength = 4;
      code.title = '三字码';
      code.addEventListener('change', () => S.updateTeam(team.id, { code: (code.value || team.code).toUpperCase() }));

      const del = document.createElement('button');
      del.type = 'button';
      del.className = 'team-del';
      del.textContent = '×';
      del.title = used.has(team.id) ? '该车队仍有车手' : '删除车队';
      del.disabled = used.has(team.id);
      del.addEventListener('click', () => {
        if (used.has(team.id)) {
          toast('该车队仍有车手，先给车手换队', 'error');
          return;
        }
        if (!confirm(`删除车队「${team.name}」？`)) return;
        S.removeTeam(team.id);
        afterDataChange();
      });

      row.appendChild(color);
      row.appendChild(name);
      row.appendChild(code);
      row.appendChild(del);
      wrap.appendChild(row);
    });
  }

  /* -------------------------------------------------------------- drivers */

  function driverAge(driver) {
    return A.ageOn(driver.birthday, state.asOfDate);
  }

  function renderDriverList() {
    const wrap = $('driverList');
    wrap.innerHTML = '';
    const teamOrder = new Map(state.teams.map((t, i) => [t.id, i]));
    const rows = state.drivers.slice().sort((a, b) => {
      const ta = teamOrder.has(a.teamId) ? teamOrder.get(a.teamId) : 999;
      const tb = teamOrder.has(b.teamId) ? teamOrder.get(b.teamId) : 999;
      if (ta !== tb) return ta - tb;
      return (A.monthDayValue(a.birthday) || 9999) - (A.monthDayValue(b.birthday) || 9999);
    });

    rows.forEach((driver) => {
      const team = teamById(driver.teamId);
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'driver-row';
      btn.addEventListener('click', () => openDriver(driver.id));

      const sw = document.createElement('span');
      sw.className = 'sw';
      sw.style.background = team ? team.accent : '#9AA0A6';

      const nm = document.createElement('span');
      nm.className = 'nm';
      const b = document.createElement('b');
      b.textContent = (driver.nameZh ? driver.nameZh + ' ' : '') + (driver.shortName || driver.name);
      const sub = document.createElement('span');
      sub.textContent = `${team ? team.name : '未归属'} · ${driver.country || '—'}`;
      nm.appendChild(b);
      nm.appendChild(sub);

      const dt = document.createElement('span');
      dt.className = 'dt';
      const age = driverAge(driver);
      dt.textContent = `${A.formatBirthday(driver.birthday, 'yy/mm/dd')}${age == null ? '' : ' · ' + age + 'y'}`;

      const go = document.createElement('span');
      go.className = 'go';
      go.textContent = '›';

      if (driver.status === 'pending') {
        const q = document.createElement('span');
        q.className = 'flag';
        q.textContent = '?';
        dt.appendChild(q);
      }
      btn.appendChild(sw);
      btn.appendChild(nm);
      btn.appendChild(dt);
      btn.appendChild(go);
      wrap.appendChild(btn);
    });
  }

  /* --------------------------------------------------------- manual order */

  function renderManualOrder() {
    const wrap = $('manualOrderWrap');
    if (!wrap) return;
    wrap.hidden = state.sortMode !== 'manual';
    if (state.sortMode !== 'manual') return;
    const list = $('manualOrder');
    list.innerHTML = '';
    const cols = F1.layout.build(state).columns;
    cols.forEach((col, i) => {
      const item = document.createElement('div');
      item.className = 'order-item';
      item.draggable = true;
      item.dataset.key = col.key;

      const sw = document.createElement('span');
      sw.className = 'sw';
      sw.style.background = col.accent;
      const label = document.createElement('span');
      label.textContent = `${col.label || col.title} · ${col.avg.toFixed(1)}y`;
      label.style.cssText = 'flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap';
      const ord = document.createElement('span');
      ord.className = 'ord';
      ord.textContent = String(i + 1).padStart(2, '0');

      item.appendChild(sw);
      item.appendChild(label);
      item.appendChild(ord);

      item.addEventListener('dragstart', (e) => {
        item.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', col.key);
      });
      item.addEventListener('dragend', () => item.classList.remove('dragging'));
      item.addEventListener('dragover', (e) => e.preventDefault());
      item.addEventListener('drop', (e) => {
        e.preventDefault();
        const from = e.dataTransfer.getData('text/plain');
        if (!from || from === col.key) return;
        const keys = cols.map((c) => c.key);
        const fi = keys.indexOf(from);
        const ti = keys.indexOf(col.key);
        if (fi < 0 || ti < 0) return;
        keys.splice(fi, 1);
        keys.splice(ti, 0, from);
        S.set((s) => {
          s.columnOrder = keys;
          s.sortMode = 'manual';
        }, { type: 'setting', key: 'columnOrder' });
        toast('列顺序已更新');
      });

      list.appendChild(item);
    });
  }

  /* ------------------------------------------------------------- datasets */

  function renderDatasetOptions() {
    const sel = $('datasetSelect');
    if (!sel) return;
    const names = S.listDatasets();
    sel.innerHTML = '';
    const ph = document.createElement('option');
    ph.value = '';
    ph.textContent = names.length ? '本机数据集…' : '（暂无数据集）';
    sel.appendChild(ph);
    names.forEach((name) => {
      const opt = document.createElement('option');
      opt.value = name;
      opt.textContent = name;
      sel.appendChild(opt);
    });
  }

  /* ------------------------------------------------------------ exporting */

  function currentExportSettings() {
    return {
      format: $('inExportFormat').value === 'jpeg' ? 'jpeg' : 'png',
      scale: Number($('inExportScale').value) || 2,
      quality: Number($('inJpegQuality').value) / 100,
    };
  }

  function updateExportSize() {
    const el = $('exportSize');
    if (!el) return;
    const cfg = currentExportSettings();
    const s = F1.exporter.sizeOf(state, cfg.scale);
    el.innerHTML =
      `<b>${s.width.toLocaleString()} × ${s.height.toLocaleString()} px</b> · ` +
      `${s.megapixels.toFixed(1)} MP · 实际倍率 ${s.scale.toFixed(2)}× · ` +
      `画布 ${s.widthCss} × ${s.heightCss}`;
    const q = $('inJpegQuality');
    q.disabled = cfg.format !== 'jpeg';
    $('qualityVal').textContent = String(Math.round(cfg.quality * 100));
  }

  async function doExport(forcePng) {
    try {
      setBusy(true, '正在生成图片…');
      $('btnExport').disabled = true;
      $('btnExportTop').disabled = true;
      await new Promise((r) => setTimeout(r, 30));
      const cfg = currentExportSettings();
      if (forcePng) cfg.format = 'png';
      const res = await F1.exporter.exportImage(state, cfg);
      toast(`已导出 ${res.width} × ${res.height} px · ${res.name}`, 'success');
    } catch (err) {
      console.error(err);
      toast('导出失败：' + (err && err.message ? err.message : '未知错误'), 'error');
    } finally {
      setBusy(false);
      $('btnExport').disabled = false;
      $('btnExportTop').disabled = false;
    }
  }

  async function doCopy() {
    try {
      setBusy(true, '正在复制到剪贴板…');
      await F1.exporter.copyImage(state);
      toast('已复制图片到剪贴板，可直接粘贴', 'success');
    } catch (err) {
      console.error(err);
      toast('复制失败：' + (err && err.message ? err.message : '剪贴板不可用'), 'error');
    } finally {
      setBusy(false);
    }
  }

  /* ------------------------------------------------------------ dialog */

  function defaultPhotoFor(driver) {
    return driver && window.F1AGE_PHOTOS ? window.F1AGE_PHOTOS[driver.id] || null : null;
  }

  function openDriver(id) {
    const dialog = $('driverDialog');
    const original = id ? state.drivers.find((d) => d.id === id) : null;
    editingId = original ? original.id : null;
    draft = original
      ? U.clone(original)
      : {
          id: '',
          name: '',
          shortName: '',
          nameZh: '',
          teamId: state.teams[0] ? state.teams[0].id : '',
          country: '',
          birthday: '2005-01-01',
          status: 'pending',
          highlight: false,
          photo: null,
          photoHidden: false,
          photoFocus: { x: 0.5, y: 0.35, z: 1 },
        };
    if (!draft.photoFocus) draft.photoFocus = { x: 0.5, y: 0.35, z: 1 };

    $('dialogTitle').textContent = original ? '编辑车手' : '新增车手';
    $('dialogSub').textContent = original ? `${original.name} · 修改后立即生效` : '填写车手资料，保存后加入图表';
    $('btnDeleteDriver').style.visibility = original ? 'visible' : 'hidden';

    $('inDriverName').value = draft.name;
    $('inDriverShort').value = draft.shortName || '';
    $('inDriverZh').value = draft.nameZh || '';
    $('inDriverCountry').value = draft.country || '';
    $('inDriverBirthday').value = draft.birthday || '';
    $('inDriverStatus').value = draft.status === 'pending' ? 'pending' : 'confirmed';
    $('inDriverHighlight').checked = !!draft.highlight;
    populateTeamSelect($('inDriverTeam'), draft.teamId);
    $('inFocusX').value = draft.photoFocus.x;
    $('inFocusY').value = draft.photoFocus.y;
    $('inFocusZ').value = draft.photoFocus.z;

    updatePhotoHint();
    updateAgeHint();
    drawPhotoPreview();
    if (!dialog.open) dialog.showModal();
    setTimeout(() => $('inDriverName').focus(), 40);
  }

  function closeDialog() {
    const dialog = $('driverDialog');
    if (dialog.open) dialog.close();
    editingId = null;
    draft = null;
  }

  function currentDraftPhoto() {
    if (!draft) return null;
    if (draft.photoHidden) return null;
    return draft.photo || defaultPhotoFor(draft);
  }

  function updatePhotoHint() {
    const has = !!currentDraftPhoto();
    $('photoEmpty').hidden = has;
    $('btnClearPhoto').disabled = !has;
    const restore = $('btnRestorePhoto');
    if (restore) restore.hidden = !(draft && draft.photoHidden && defaultPhotoFor(draft));
  }

  function updateAgeHint() {
    const hint = $('driverAgeHint');
    if (!draft) return;
    const age = A.ageOn(draft.birthday, state.asOfDate);
    if (age == null) {
      hint.textContent = '生日无效，无法计算年龄。';
      hint.style.color = '#b52228';
      return;
    }
    hint.style.color = '';
    hint.textContent = `基准日 ${A.formatISO(state.asOfDate)} 时 ${age} 岁 · 生日 ${A.formatBirthday(draft.birthday, 'yyyy/mm/dd')}`;
  }

  function drawPhotoPreview() {
    const canvas = $('photoPreview');
    if (!canvas || !draft) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const cssW = 220;
    const cssH = 264;
    if (canvas.width !== Math.round(cssW * dpr)) {
      canvas.width = Math.round(cssW * dpr);
      canvas.height = Math.round(cssH * dpr);
    }
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cssW, cssH);
    const src = currentDraftPhoto();
    updatePhotoHint();
    if (!src) return;

    let entry = previewImages.get(src);
    if (!entry) {
      const img = new Image();
      entry = { img, ready: false };
      img.onload = () => {
        entry.ready = true;
        drawPhotoPreview();
      };
      img.src = src;
      previewImages.set(src, entry);
    }
    if (!entry.ready) return;
    const img = entry.img;
    const f = draft.photoFocus;
    const z = f.z || 1;
    const scale = Math.max(cssW / img.naturalWidth, cssH / img.naturalHeight) * z;
    const dw = img.naturalWidth * scale;
    const dh = img.naturalHeight * scale;
    const dx = -(dw - cssW) * f.x;
    const dy = -(dh - cssH) * f.y;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, dx, dy, dw, dh);
  }

  async function pickPhoto() {
    if (!draft) return;
    const file = await U.pickFile('image/*');
    if (file) await applyPhotoFile(file);
  }

  async function applyPhotoFile(file) {
    const targetDraft = draft;
    if (!targetDraft) return;
    try {
      const dataUrl = await U.readImageFile(file, 420);
      if (!draft || draft !== targetDraft) return;
      targetDraft.photo = dataUrl;
      targetDraft.photoHidden = false;
      drawPhotoPreview();
      updatePhotoHint();
      toast('照片已载入，未保存前可继续调整');
    } catch (err) {
      toast(err.message || '照片读取失败', 'error');
    }
  }

  function bindDialog() {
    $('btnCloseDialog').addEventListener('click', closeDialog);
    $('btnCancelDialog').addEventListener('click', closeDialog);
    $('btnPickPhoto').addEventListener('click', pickPhoto);
    $('photoInput').addEventListener('change', (e) => {
      const file = e.target.files && e.target.files[0];
      if (file) applyPhotoFile(file);
      e.target.value = '';
    });
    $('photoDrop').addEventListener('click', pickPhoto);
    $('photoDrop').addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        pickPhoto();
      }
    });
    ['dragenter', 'dragover'].forEach((evt) =>
      $('photoDrop').addEventListener(evt, (e) => {
        e.preventDefault();
        $('photoDrop').classList.add('dragover');
      })
    );
    ['dragleave', 'drop'].forEach((evt) =>
      $('photoDrop').addEventListener(evt, (e) => {
        e.preventDefault();
        $('photoDrop').classList.remove('dragover');
      })
    );
    $('photoDrop').addEventListener('drop', (e) => {
      const file = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
      if (file) applyPhotoFile(file);
    });
    $('btnClearPhoto').addEventListener('click', () => {
      draft.photo = null;
      draft.photoHidden = true;
      drawPhotoPreview();
    });
    $('btnRestorePhoto').addEventListener('click', () => {
      draft.photo = null;
      draft.photoHidden = false;
      drawPhotoPreview();
      updatePhotoHint();
    });
    $('btnDeleteDriver').addEventListener('click', () => {
      if (!editingId) return;
      const d = state.drivers.find((x) => x.id === editingId);
      if (!d) return;
      if (!confirm(`从图表中删除「${d.name}」？`)) return;
      S.removeDriver(d.id);
      closeDialog();
      toast('已删除车手');
    });

    $('inDriverName').addEventListener('input', () => {
      draft.name = $('inDriverName').value;
      if (!$('inDriverShort').value) draft.shortName = draft.name.trim().split(/\s+/).pop() || '';
    });
    $('inDriverShort').addEventListener('input', () => (draft.shortName = $('inDriverShort').value));
    $('inDriverZh').addEventListener('input', () => (draft.nameZh = $('inDriverZh').value));
    $('inDriverCountry').addEventListener('input', () => {
      const v = $('inDriverCountry').value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 3);
      $('inDriverCountry').value = v;
      draft.country = v;
    });
    $('inDriverBirthday').addEventListener('input', () => {
      draft.birthday = $('inDriverBirthday').value;
      updateAgeHint();
    });
    $('inDriverTeam').addEventListener('change', () => (draft.teamId = $('inDriverTeam').value));
    $('inDriverStatus').addEventListener('change', () => (draft.status = $('inDriverStatus').value));
    $('inDriverHighlight').addEventListener('change', () => (draft.highlight = $('inDriverHighlight').checked));
    ['inFocusX', 'inFocusY', 'inFocusZ'].forEach((id) => {
      $(id).addEventListener('input', () => {
        draft.photoFocus.x = Number($('inFocusX').value);
        draft.photoFocus.y = Number($('inFocusY').value);
        draft.photoFocus.z = Number($('inFocusZ').value);
        drawPhotoPreview();
      });
    });

    $('driverDialog').addEventListener('click', (e) => {
      if (e.target === $('driverDialog')) closeDialog();
    });

    $('driverForm').addEventListener('submit', (e) => {
      e.preventDefault();
      saveDraft();
    });
  }

  function saveDraft() {
    if (!draft) return;
    if (!draft.name || !draft.name.trim()) {
      toast('请填写车手姓名', 'error');
      $('inDriverName').focus();
      return;
    }
    if (A.ageOn(draft.birthday, state.asOfDate) == null) {
      toast('请填写有效的生日', 'error');
      $('inDriverBirthday').focus();
      return;
    }
    const payload = {
      name: draft.name.trim(),
      shortName: (draft.shortName || '').trim(),
      nameZh: (draft.nameZh || '').trim(),
      teamId: draft.teamId,
      country: (draft.country || '').toUpperCase(),
      birthday: draft.birthday,
      status: draft.status,
      highlight: !!draft.highlight,
      photo: draft.photo,
      photoHidden: !!draft.photoHidden,
      photoFocus: draft.photoFocus,
    };
    if (editingId) {
      S.updateDriver(editingId, payload);
      toast('车手资料已更新');
    } else {
      S.addDriver(payload);
      toast('已新增车手');
    }
    closeDialog();
  }

  /* ---------------------------------------------------------- import/export */

  async function importJson() {
    try {
      const file = await U.pickFile('application/json,.json');
      if (!file) return;
      const text = await file.text();
      const obj = JSON.parse(text);
      S.importData(obj);
      closeDialog();
      toast('数据已导入', 'success');
    } catch (err) {
      console.error(err);
      toast('导入失败：' + (err && err.message ? err.message : 'JSON 解析失败'), 'error');
    }
  }

  function exportJson() {
    try {
      const data = S.exportData();
      const name = `F1-${data.season}-drivers-${String(data.asOfDate).replace(/-/g, '')}.json`;
      U.downloadText(JSON.stringify(data, null, 2), name);
      toast('已导出数据 JSON', 'success');
    } catch (err) {
      toast('导出失败：' + err.message, 'error');
    }
  }

  function afterDataChange() {
    syncDynamic();
  }

  /* ---------------------------------------------------------------- bind */

  function bindControls() {
    $('inGroupBy').addEventListener('change', (e) => {
      const next = e.target.value;
      const prev = state.groupBy;
      S.setGroupBy(next);
      if (prev !== next && (next === 'month' || next === 'decade') && state.sortMode === 'avgDesc') {
        S.setSortMode('labelAsc');
      }
      syncControls();
      requestAnimationFrame(() => {
        renderManualOrder();
        updateExportSize();
      });
    });

    $('inSortMode').addEventListener('change', (e) => {
      const mode = e.target.value;
      if (mode === 'manual') {
        const keys = F1.layout.build(state).columns.map((c) => c.key);
        S.set((s) => {
          if (!s.columnOrder.length || !keys.every((k) => s.columnOrder.indexOf(k) >= 0)) s.columnOrder = keys;
          s.sortMode = 'manual';
        }, { type: 'setting', key: 'sortMode' });
      } else {
        S.setSortMode(mode);
      }
      renderManualOrder();
    });

    $('inAsOf').addEventListener('input', (e) => {
      if (A.parseISO(e.target.value)) S.setField('asOfDate', e.target.value);
    });
    document.querySelectorAll('[data-date]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const value = btn.dataset.date === 'today' ? A.todayISO() : btn.dataset.date;
        if (A.parseISO(value)) {
          S.setField('asOfDate', value);
          $('inAsOf').value = value;
        }
      });
    });

    $('inCardName').addEventListener('change', (e) => S.setField('cardName', e.target.value));
    $('inCardScale').addEventListener('input', (e) => {
      const v = Number(e.target.value);
      $('cardScaleVal').textContent = Math.round(v * 100) + '%';
      S.setField('cardScale', v);
    });
    $('inFontScale').addEventListener('input', (e) => {
      const v = Number(e.target.value);
      $('fontScaleVal').textContent = Math.round(v * 100) + '%';
      S.setField('fontScale', v);
    });
    $('inCardFill').addEventListener('input', (e) => {
      const v = Number(e.target.value);
      $('cardFillVal').textContent = Math.round(v * 100) + '%';
      S.setField('cardFill', v);
    });
    $('inVerticalDensity').addEventListener('input', (e) => {
      const v = Number(e.target.value);
      $('densityVal').textContent = Math.round(v * 100) + '%';
      S.setField('verticalDensity', v);
    });
    $('inCompactRows').addEventListener('change', (e) => S.setField('compactRows', e.target.checked));
    $('inShowPhotos').addEventListener('change', (e) => S.setField('showPhotos', e.target.checked));
    $('inShowAgeBadge').addEventListener('change', (e) => S.setField('showAgeBadge', e.target.checked));
    $('inShowCountry').addEventListener('change', (e) => S.setField('showCountry', e.target.checked));
    $('inShowBand').addEventListener('change', (e) => S.setField('showBand', e.target.checked));
    $('inShowFooter').addEventListener('change', (e) => S.setField('showFooter', e.target.checked));
    $('inAxisGradient').addEventListener('change', (e) => S.setField('axisGradient', e.target.checked));

    $('inTitle').addEventListener('input', (e) => S.setField('title', e.target.value));
    $('inSubtitle').addEventListener('input', (e) => S.setField('subtitle', e.target.value));
    $('inHeaderNote').addEventListener('input', (e) => S.setField('headerNote', e.target.value));
    $('inHeaderSubNote').addEventListener('input', (e) => S.setField('headerSubNote', e.target.value));
    $('inFooterRight').addEventListener('input', (e) => S.setField('footerRight', e.target.value));

    $('inTheme').addEventListener('change', (e) => S.setField('theme', e.target.value));

    function switchSeason(season) {
      if (!Number.isFinite(season) || season === Number(state.season)) return;
      S.loadSeasonPreset(season);
      syncAll();
      toast(`已切换到 ${season} 赛季`, 'success');
    }

    $('seasonChip').addEventListener('change', (e) => switchSeason(Number(e.target.value)));
    document.querySelectorAll('[data-season]').forEach((btn) => {
      btn.addEventListener('click', () => switchSeason(Number(btn.dataset.season)));
    });

    $('btnAddTeam').addEventListener('click', () => {
      S.addTeam();
      afterDataChange();
    });

    $('btnAddDriver').addEventListener('click', () => openDriver(null));
    $('btnImportJson').addEventListener('click', importJson);
    $('btnExportJson').addEventListener('click', exportJson);

    $('btnSaveDataset').addEventListener('click', () => {
      const suggested = `${state.season} 赛季 · ${new Date().toLocaleDateString('zh-CN')}`;
      const name = prompt('保存为本机数据集（可随时载入）', suggested);
      if (!name) return;
      try {
        S.saveDataset(name);
        renderDatasetOptions();
        toast(`已保存数据集「${name}」`, 'success');
      } catch (err) {
        toast(err.message, 'error');
      }
    });
    $('btnLoadDataset').addEventListener('click', () => {
      const name = $('datasetSelect').value;
      if (!name) {
        toast('请选择数据集');
        return;
      }
      if (!confirm(`载入数据集「${name}」？当前未保存的改动会被替换。`)) return;
      try {
        S.loadDataset(name);
        closeDialog();
        syncAll();
        toast('数据集已载入', 'success');
      } catch (err) {
        toast(err.message, 'error');
      }
    });
    $('btnDeleteDataset').addEventListener('click', () => {
      const name = $('datasetSelect').value;
      if (!name) {
        toast('请选择数据集');
        return;
      }
      if (!confirm(`删除数据集「${name}」？`)) return;
      S.deleteDataset(name);
      renderDatasetOptions();
      toast('已删除数据集');
    });

    $('inExportFormat').addEventListener('change', updateExportSize);
    $('inExportScale').addEventListener('change', updateExportSize);
    $('inJpegQuality').addEventListener('input', updateExportSize);
    $('btnExport').addEventListener('click', () => doExport(false));
    $('btnExportTop').addEventListener('click', () => doExport(true));
    $('btnCopy').addEventListener('click', doCopy);
    $('btnCopyTop').addEventListener('click', doCopy);

    $('btnResetTop').addEventListener('click', () => {
      if (!confirm(`恢复默认的 ${state.season} 赛季阵容、排版与配色？所有本地修改会丢失。`)) return;
      S.resetAll();
      syncAll();
      toast('已恢复默认设置');
    });

    const togglePanel = () => {
      const panel = $('panel');
      const collapsed = panel.classList.toggle('collapsed');
      $('btnTogglePanel').setAttribute('aria-expanded', String(!collapsed));
    };
    $('btnTogglePanel').addEventListener('click', togglePanel);
    $('btnClosePanel').addEventListener('click', togglePanel);
  }

  /* ---------------------------------------------------------------- init */

  function init() {
    populateStatic();
    bindControls();
    bindDialog();
    syncAll();
    S.subscribe((meta) => {
      if (meta && meta.type === 'error') {
        toast('本地保存失败：浏览器存储空间不足', 'error');
        return;
      }
      markSaving();
      syncControls();
      if (meta && (meta.type === 'data' || meta.type === 'reset' || meta.type === 'import' || meta.type === 'season')) {
        syncDynamic();
      } else if (meta && meta.type === 'setting' && meta.key === 'groupBy') {
        syncDynamic();
      } else {
        updateExportSize();
        if (meta && meta.type === 'setting' && (meta.key === 'sortMode' || meta.key === 'columnOrder')) {
          renderManualOrder();
        }
      }
    });
    window.addEventListener('beforeunload', () => {
      try {
        S.persistNow();
      } catch (e) {
        /* ignore */
      }
    });
  }

  F1.ui = { init, openDriver, closeDialog, toast, setBusy, updateExportSize, syncAll, renderManualOrder };
})();
