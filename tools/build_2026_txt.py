"""Build the plain-text 2026 driver list, youngest to oldest (age as of 2026-12-31)."""
import json
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
season = json.loads((ROOT / 'data' / '2026-season.json').read_text(encoding='utf-8'))
season27 = json.loads((ROOT / 'data' / '2027-season.json').read_text(encoding='utf-8'))
teams = {t['id']: t for t in season['teams']}
teams27 = {t['id']: t for t in season27['teams']}
drivers27 = {d['id']: d for d in season27['drivers']}

COUNTRY_ZH = {
    'GBR': '英国', 'ITA': '意大利', 'BRA': '巴西', 'FRA': '法国', 'ARG': '阿根廷',
    'NZL': '新西兰', 'AUS': '澳大利亚', 'JPN': '日本', 'CAN': '加拿大', 'MON': '摩纳哥',
    'NED': '荷兰', 'THA': '泰国', 'ESP': '西班牙', 'MEX': '墨西哥', 'FIN': '芬兰',
    'GER': '德国',
}

NOTES = {
    'ocon': '2026：Haas 正赛 1–19 轮；第 20 轮起由 CÂMARA 接替。\n    2027：不在正赛阵容。',
    'hirakawa': '2026：Haas 第 19 轮 Mexico 替补 OCON。\n    2027：不在正赛阵容。',
    'camara': '2026：Haas 第 20 轮起替补 OCON（São Paulo 起）。\n    2027：Haas（与 BEARMAN）。',
    'tsunoda': '2026：Racing Bulls 12–14 轮替补 LAWSON（荷兰/意大利/西班牙）。\n    2027：不在正赛阵容。',
    'lawson': '2026：Racing Bulls 1–11、15–21 轮；12–14 轮替 HADJAR 出赛 Red Bull（荷兰/意大利/西班牙）。\n    2027：Racing Bulls。',
    'hadjar': '2026：Red Bull 1–11、15–21 轮；伤缺 12–14 轮（荷兰/意大利/西班牙）。\n    2027：Red Bull。',
}

# 2026 season car numbers from the official entries table.
NUMBERS = {
    'norris': 1, 'piastri': 81,
    'russell': 63, 'antonelli': 12,
    'verstappen': 3, 'hadjar': 6,
    'leclerc': 16, 'hamilton': 44,
    'alonso': 14, 'stroll': 18,
    'gasly': 10, 'colapinto': 43,
    'albon': 23, 'sainz': 55,
    'hulkenberg': 27, 'bortoleto': 5,
    'lawson': 30, 'lindblad': 41, 'tsunoda': 22,
    'bearman': 87, 'ocon': 31, 'hirakawa': 50, 'camara': 51,
    'perez': 11, 'bottas': 77,
}


def age_on(birthday: str, ref: date = date(2026, 12, 31)) -> int:
    y, m, d = (int(x) for x in birthday.split('-'))
    value = ref.year - y
    if (ref.month, ref.day) < (m, d):
        value -= 1
    return value


def status_2027(driver: dict) -> str:
    if driver['id'] not in drivers27:
        return '2027：不在正赛阵容。'
    team = teams27[drivers27[driver['id']]['teamId']]['name']
    if driver['id'] == 'camara':
        return '2027：Haas（与 BEARMAN）。'
    if driver['id'] == 'bearman':
        return '2027：Haas（与 CÂMARA）。'
    return f'2027：{team}。'


def entry(driver: dict) -> str:
    team = teams[driver['teamId']]
    country = driver.get('country', '')
    country_zh = COUNTRY_ZH.get(country, '')
    note = NOTES.get(driver['id'])
    if not note:
        note = f"2026：{team['name']} 正赛。\n    {status_2027(driver)}"
    return (
        f"车号：{NUMBERS[driver['id']]} ｜ 车队：{team['name']}（{team['code']}） ｜ 国籍：{country} {country_zh}\n"
        f"    生日：{driver['birthday']}\n"
        f"    {note}"
    )


def main() -> None:
    drivers = list(season['drivers'])
    drivers.sort(key=lambda d: (age_on(d['birthday']), -date.fromisoformat(d['birthday']).toordinal()))
    lines = [
        '2026 F1 车手生日 / 年龄一览',
        '=' * 70,
        '年龄基准：2026-12-31 ｜ 范围：实际参加过 2026 正赛的 25 人（截至第 21 轮，含替补）',
        '排序：年龄从小到大；同岁时生日更晚（更年轻）在前',
        '数据：Wikipedia — 2026 Formula One World Championship / Entries + In-season changes',
        '车号：2026 赛季 Entries 表编号（官方车号）',
        '',
    ]
    for index, driver in enumerate(drivers, start=1):
        age = age_on(driver['birthday'])
        name = driver['name']
        surname = driver.get('shortName', name.split()[-1])
        given = name[: len(name) - len(surname)].strip() if name.endswith(surname) else name
        display = f"{given} {surname.upper()}" if given else surname.upper()
        zh = driver.get('nameZh', '')
        lines.append(f"{index:02d}. {age} 岁 ｜ {display}" + (f"（{zh}）" if zh else ''))
        lines.append('    ' + entry(driver))
        lines.append('')
    lines.extend([
        '-' * 70,
        '说明：2026 数据截至第 21 轮（Las Vegas 尚未进行）；25 人 = 22 位常规 + OCON / HIRAKAWA / TSUNODA 三位实际跑过正赛的替补。',
        'CÂMARA 自第 20 轮起接替 OCON；HADJAR 伤缺 3 场，LAWSON 替补出赛 Red Bull 3 场，TSUNODA 替补出赛 Racing Bulls 3 场。',
        '年龄按 2026-12-31 计算；2027 列表示该车手是否在 2027 已官宣阵容；车号为 2026 赛季编号。',
        '来源与照片许可：见 CREDITS.md。',
        '',
    ])
    out = ROOT / 'data' / '2026-drivers-by-age.txt'
    out.write_text('\n'.join(lines), encoding='utf-8-sig')
    print(out)
    print('drivers:', len(drivers))


if __name__ == '__main__':
    main()
