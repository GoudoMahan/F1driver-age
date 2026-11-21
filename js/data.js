/* F1 Age Chart — 2027 + 2026 season datasets (editable at runtime).
   Birthdays: Wikipedia / F1.com, checked 2026-11.
   2027: 22 drivers, all seats announced.
   2026: 25 drivers who actually started at least one 2026 Grand Prix through round 21
   (including substitutes Tsunoda, Hirakawa and Câmara). */
(function () {
  'use strict';
  const F1 = (window.F1 = window.F1 || {});

  const TEAMS = [
    { id: 'mclaren',     name: 'McLaren',       code: 'MCL', accent: '#FF8000' },
    { id: 'mercedes',    name: 'Mercedes',      code: 'MER', accent: '#00A19B' },
    { id: 'redbull',     name: 'Red Bull',      code: 'RBR', accent: '#3671C6' },
    { id: 'ferrari',     name: 'Ferrari',       code: 'FER', accent: '#E8002D' },
    { id: 'astonmartin', name: 'Aston Martin',  code: 'AST', accent: '#229971' },
    { id: 'alpine',      name: 'Alpine',        code: 'ALP', accent: '#FF87BC' },
    { id: 'williams',    name: 'Williams',      code: 'WIL', accent: '#005AFF' },
    { id: 'audi',        name: 'Audi',          code: 'AUD', accent: '#4A4A50' },
    { id: 'racingbulls', name: 'Racing Bulls',  code: 'RB',  accent: '#6692FF' },
    { id: 'haas',        name: 'Haas',          code: 'HAA', accent: '#7A7F85' },
    { id: 'cadillac',    name: 'Cadillac',      code: 'CAD', accent: '#C0A062' },
  ];

  const DRIVERS = [
    { id: 'norris',     name: 'Lando Norris',        shortName: 'Norris',     nameZh: '诺里斯',     teamId: 'mclaren',     country: 'GBR', birthday: '1999-11-13', status: 'confirmed' },
    { id: 'piastri',    name: 'Oscar Piastri',       shortName: 'Piastri',    nameZh: '皮亚斯特里', teamId: 'mclaren',     country: 'AUS', birthday: '2001-04-06', status: 'confirmed' },
    { id: 'russell',    name: 'George Russell',      shortName: 'Russell',    nameZh: '拉塞尔',     teamId: 'mercedes',    country: 'GBR', birthday: '1998-02-15', status: 'confirmed' },
    { id: 'antonelli',  name: 'Kimi Antonelli',      shortName: 'Antonelli',  nameZh: '安东内利',   teamId: 'mercedes',    country: 'ITA', birthday: '2006-08-25', status: 'confirmed' },
    { id: 'verstappen', name: 'Max Verstappen',      shortName: 'Verstappen', nameZh: '维斯塔潘',   teamId: 'redbull',     country: 'NED', birthday: '1997-09-30', status: 'confirmed' },
    { id: 'hadjar',     name: 'Isack Hadjar',        shortName: 'Hadjar',     nameZh: '哈贾尔',     teamId: 'redbull',     country: 'FRA', birthday: '2004-09-28', status: 'confirmed' },
    { id: 'leclerc',    name: 'Charles Leclerc',     shortName: 'Leclerc',    nameZh: '勒克莱尔',   teamId: 'ferrari',     country: 'MON', birthday: '1997-10-16', status: 'confirmed', photoFocus: { x: 0.5, y: 0.3, z: 1.02 } },
    { id: 'hamilton',   name: 'Lewis Hamilton',      shortName: 'Hamilton',   nameZh: '汉密尔顿',   teamId: 'ferrari',     country: 'GBR', birthday: '1985-01-07', status: 'confirmed', photoFocus: { x: 0.5, y: 0.3, z: 1.05 } },
    { id: 'alonso',     name: 'Fernando Alonso',     shortName: 'Alonso',     nameZh: '阿隆索',     teamId: 'astonmartin', country: 'ESP', birthday: '1981-07-29', status: 'confirmed', photoFocus: { x: 0.5, y: 0.28, z: 1.02 } },
    { id: 'stroll',     name: 'Lance Stroll',        shortName: 'Stroll',     nameZh: '斯特罗尔',   teamId: 'astonmartin', country: 'CAN', birthday: '1998-10-29', status: 'confirmed', photoFocus: { x: 0.5, y: 0.32, z: 1.05 } },
    { id: 'gasly',      name: 'Pierre Gasly',        shortName: 'Gasly',      nameZh: '加斯利',     teamId: 'alpine',      country: 'FRA', birthday: '1996-02-07', status: 'confirmed', photoFocus: { x: 0.5, y: 0.3, z: 1.1 } },
    { id: 'colapinto',  name: 'Franco Colapinto',    shortName: 'Colapinto',  nameZh: '科拉平托',   teamId: 'alpine',      country: 'ARG', birthday: '2003-05-27', status: 'confirmed' },
    { id: 'albon',      name: 'Alexander Albon',     shortName: 'Albon',      nameZh: '阿尔本',     teamId: 'williams',    country: 'THA', birthday: '1996-03-23', status: 'confirmed', photoFocus: { x: 0.48, y: 0.3, z: 1.1 } },
    { id: 'sainz',      name: 'Carlos Sainz',        shortName: 'Sainz',      nameZh: '塞恩斯',     teamId: 'williams',    country: 'ESP', birthday: '1994-09-01', status: 'confirmed', photoFocus: { x: 0.5, y: 0.28, z: 1.08 } },
    { id: 'hulkenberg', name: 'Nico Hülkenberg',     shortName: 'Hülkenberg', nameZh: '霍肯伯格',   teamId: 'audi',        country: 'GER', birthday: '1987-08-19', status: 'confirmed', photoFocus: { x: 0.5, y: 0.3, z: 1.08 } },
    { id: 'bortoleto',  name: 'Gabriel Bortoleto',   shortName: 'Bortoleto',  nameZh: '博尔托莱托', teamId: 'audi',        country: 'BRA', birthday: '2004-10-14', status: 'confirmed' },
    { id: 'lawson',     name: 'Liam Lawson',         shortName: 'Lawson',     nameZh: '劳森',       teamId: 'racingbulls', country: 'NZL', birthday: '2002-02-11', status: 'confirmed' },
    { id: 'lindblad',   name: 'Arvid Lindblad',      shortName: 'Lindblad',   nameZh: '林德布拉德', teamId: 'racingbulls', country: 'GBR', birthday: '2007-08-08', status: 'confirmed' },
    { id: 'perez',      name: 'Sergio Pérez',        shortName: 'Pérez',      nameZh: '佩雷兹',     teamId: 'cadillac',    country: 'MEX', birthday: '1990-01-26', status: 'confirmed', photoFocus: { x: 0.5, y: 0.28, z: 1.12 } },
    { id: 'bottas',     name: 'Valtteri Bottas',     shortName: 'Bottas',     nameZh: '博塔斯',     teamId: 'cadillac',    country: 'FIN', birthday: '1989-08-28', status: 'confirmed', photoFocus: { x: 0.53, y: 0.26, z: 1.12 } },
    { id: 'bearman',    name: 'Oliver Bearman',      shortName: 'Bearman',    nameZh: '贝尔曼',     teamId: 'haas',        country: 'GBR', birthday: '2005-05-08', status: 'confirmed' },
    { id: 'camara',     name: 'Rafael Câmara',       shortName: 'Câmara',     nameZh: '卡马拉',     teamId: 'haas',        country: 'BRA', birthday: '2005-05-05', status: 'confirmed' },
  ];

  /* Drivers with at least one 2026 race start who are not on the 2027 grid.
     Sources: 2026 World Championship entries + in-season changes (Wikipedia / F1). */
  const DRIVERS_2026_EXTRA = [
    { id: 'ocon',       name: 'Esteban Ocon',        shortName: 'Ocon',       nameZh: '奥康',       teamId: 'haas',        country: 'FRA', birthday: '1996-09-17', status: 'confirmed', photoFocus: { x: 0.5, y: 0.3, z: 1.02 } },
    { id: 'hirakawa',   name: 'Ryo Hirakawa',        shortName: 'Hirakawa',   nameZh: '平川亮',     teamId: 'haas',        country: 'JPN', birthday: '1994-07-07', status: 'confirmed', photoFocus: { x: 0.5, y: 0.3, z: 1.02 } },
    { id: 'tsunoda',    name: 'Yuki Tsunoda',        shortName: 'Tsunoda',    nameZh: '角田裕毅',   teamId: 'racingbulls', country: 'JPN', birthday: '2000-05-11', status: 'confirmed', photoFocus: { x: 0.5, y: 0.3, z: 1.02 } },
  ];

  const DRIVERS_2026 = DRIVERS.concat(DRIVERS_2026_EXTRA);

  const SEASONS = {
    2027: {
      season: 2027,
      title: '2027 车手生日 / 年龄均排',
      asOfDate: '2027-03-01',
      headerSubNote: '2027 赛季 22 位车手席位已全部官宣。',
      footerRight: 'F1 AGE CHART · 2027 SEASON',
      teams: TEAMS,
      drivers: DRIVERS,
    },
    2026: {
      season: 2026,
      title: '2026 车手生日 / 年龄均排',
      asOfDate: '2026-12-31',
      headerSubNote: '2026 赛季正赛参赛车手 25 人（含替补；截至第 21 轮）。',
      footerRight: 'F1 AGE CHART · 2026 SEASON',
      teams: TEAMS,
      drivers: DRIVERS_2026,
    },
  };

  const COUNTRY_ZH = {
    GBR: '英国', AUS: '澳大利亚', ITA: '意大利', NED: '荷兰', FRA: '法国',
    MON: '摩纳哥', ESP: '西班牙', CAN: '加拿大', NZL: '新西兰', BRA: '巴西',
    GER: '德国', THA: '泰国', MEX: '墨西哥', FIN: '芬兰', ARG: '阿根廷',
    JPN: '日本', CHN: '中国', USA: '美国', DEN: '丹麦', SUI: '瑞士',
    BEL: '比利时', AUT: '奥地利', POL: '波兰', SWE: '瑞典', RSA: '南非',
    IRL: '爱尔兰', POR: '葡萄牙', COL: '哥伦比亚', VEN: '委内瑞拉', CHI: '智利',
  };

  const MONTH_EN = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  const MONTH_ZH = ['1 月', '2 月', '3 月', '4 月', '5 月', '6 月', '7 月', '8 月', '9 月', '10 月', '11 月', '12 月'];

  /* Pleasant categorical palette used for country / month / decade columns. */
  const GROUP_PALETTE = [
    '#D1495B', '#00798C', '#EDAE49', '#2E86AB', '#6C6EA0', '#4C9F70',
    '#C08497', '#B88746', '#5B8C5A', '#9B5DE5', '#F15BB5', '#17BEBB',
    '#E4572E', '#6A994E',
  ];

  function decadeOf(year) {
    return Math.floor(year / 10) * 10;
  }

  function decadeZh(decade) {
    return String(decade).slice(2) + ' 后';
  }

  F1.data = {
    TEAMS,
    DRIVERS,
    DRIVERS_2026,
    SEASONS,
    COUNTRY_ZH,
    MONTH_EN,
    MONTH_ZH,
    GROUP_PALETTE,
    decadeOf,
    decadeZh,
  };
})();
