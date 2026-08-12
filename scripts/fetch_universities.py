#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Globe Explorer - 数据采集脚本

拉取 THE World University Rankings 2026 JSON，按 rank_order 取前 100 条
（THE 实际可展示 rank<=100 的学校数约 94 所，因为存在并列排名）。
对每所学校，调用 en/zh 维基百科 REST summary 接口补齐：
  - lat/lng（构建期固化，运行时不再查询坐标）
  - wikibase_item (QID)
  - thumbnail / originalimage URL（同时缓存作预览）

输出: src/data/universities.ts (TypeScript 常量)
"""

import json
import os
import re
import sys
import time
import urllib.parse
import urllib.request
from pathlib import Path
from typing import Optional, Tuple, List, Dict, Any

ROOT = Path(__file__).resolve().parent.parent
OUT_FILE = ROOT / "src" / "data" / "universities.ts"

THE_URL = "https://www.timeshighereducation.com/json/ranking_tables/world_university_rankings/2026"
UA = "GlobeExplorer/0.1 (https://github.com/example/globe_explorer)"

# 维基 API 用户代理要求带联系方式
WIKI_UA = (
    "GlobeExplorer/0.1 "
    "(https://github.com/example/globe_explorer; mailto:dev@example.com) "
    "Python-urllib"
)

# 国家 EN -> ZH 映射 (手工校对首批, 100 所内只覆盖常见国家)
COUNTRY_ZH = {
    "United States": "美国",
    "United Kingdom": "英国",
    "China": "中国",
    "Hong Kong": "中国香港",
    "Switzerland": "瑞士",
    "Singapore": "新加坡",
    "Canada": "加拿大",
    "Japan": "日本",
    "Germany": "德国",
    "Australia": "澳大利亚",
    "France": "法国",
    "Netherlands": "荷兰",
    "Sweden": "瑞典",
    "Belgium": "比利时",
    "South Korea": "韩国",
    "Denmark": "丹麦",
    "Taiwan": "中国台湾",
    "Italy": "意大利",
    "Spain": "西班牙",
    "Saudi Arabia": "沙特阿拉伯",
    "Ireland": "爱尔兰",
    "Israel": "以色列",
    "Russia": "俄罗斯",
    "New Zealand": "新西兰",
    "Brazil": "巴西",
    "Mexico": "墨西哥",
    "South Africa": "南非",
    "India": "印度",
    "Norway": "挪威",
    "Finland": "芬兰",
    "Austria": "奥地利",
    "Poland": "波兰",
    "Czechia": "捷克",
    "Hungary": "匈牙利",
    "Portugal": "葡萄牙",
    "Greece": "希腊",
    "Turkey": "土耳其",
    "United Arab Emirates": "阿联酋",
    "Egypt": "埃及",
    "Chile": "智利",
    "Argentina": "阿根廷",
}


def fetch(url: str, ua: str = UA, timeout: int = 30) -> Optional[bytes]:
    req = urllib.request.Request(url, headers={"User-Agent": ua})
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            return r.read()
    except Exception as e:
        print(f"  [FETCH ERR] {url}: {e}", file=sys.stderr)
        return None


def get_wiki_summary(title: str, lang: str) -> Optional[Dict[str, Any]]:
    """调用维基 REST summary,返回 summary dict 或 None"""
    encoded = urllib.parse.quote(title.replace(" ", "_"))
    url = f"https://{lang}.wikipedia.org/api/rest_v1/page/summary/{encoded}"
    body = fetch(url, ua=WIKI_UA, timeout=15)
    if not body:
        return None
    try:
        data = json.loads(body)
        return data
    except json.JSONDecodeError:
        return None


def extract_aliases(aliases_field: str) -> List[str]:
    """THE aliases 字段可能为空字符串或多个逗号分隔名"""
    if not aliases_field:
        return []
    return [a.strip() for a in aliases_field.split(",") if a.strip()]


def pick_wiki_title(university: Dict[str, Any]) -> str:
    """优先用 THE name (最规范), aliases 按空格拆分后作为候选"""
    name = university["name"]
    aliases = extract_aliases(university.get("aliases", ""))
    # aliases 可能是空格分隔的多别名 (如 "California Institute of Technology caltech")
    all_candidates = [name]
    for a in aliases:
        all_candidates.extend(x.strip() for x in a.split(" ") if x.strip())
    return all_candidates[0]


def lookup_en_summary(university: Dict[str, Any]) -> Tuple[Optional[Dict[str, Any]], str]:
    """英文维基查 summary。遍历候选标题(名字+别名), 取第一个命中的。返回 (summary, used_title)"""
    candidates: List[str] = []
    name = university["name"]
    candidates.append(name)
    # 别名按空格拆出多个候选 (THE aliases 常把缩写/别称连在一起)
    aliases = extract_aliases(university.get("aliases", ""))
    for a in aliases:
        candidates.extend(x.strip() for x in a.split(" ") if x.strip())
    # 去重保序
    seen = set()
    uniq_candidates = [c for c in candidates if not (c in seen or seen.add(c))]

    for title in uniq_candidates:
        summary = get_wiki_summary(title, "en")
        if summary and "title" in summary and summary.get("type") != "disambiguation":
            return summary, title
    return None, name


def lookup_zh_title_from_wikidata(en_summary: Dict[str, Any]) -> Optional[str]:
    """根据 wikibase_item 查中文维基 sitelink 标题"""
    qid = en_summary.get("wikibase_item")
    if not qid:
        return None
    url = (
        f"https://www.wikidata.org/w/api.php?action=wbgetentities"
        f"&ids={qid}&props=sitelinks&sitefilter=zhwiki&format=json"
    )
    body = fetch(url, ua=WIKI_UA, timeout=15)
    if not body:
        return None
    try:
        data = json.loads(body)
        sitelinks = (
            data.get("entities", {}).get(qid, {}).get("sitelinks", {})
        )
        zh = sitelinks.get("zhwiki")
        if zh:
            return zh.get("title")
    except (json.JSONDecodeError, KeyError):
        return None
    return None


def main() -> str:  # type: ignore[no-untyped-def]
    import argparse

    parser = argparse.ArgumentParser(description="拉取 THE 世界大学排名数据")
    parser.add_argument(
        "--limit",
        type=int,
        default=100,
        help="取前 N 所 (按 rank_order), 默认 100, 可传 200 等",
    )
    parser.add_argument(
        "--json",
        type=str,
        default=None,
        help="本地 THE JSON 文件路径 (避免重复请求网络 API)",
    )
    args = parser.parse_args()
    limit = args.limit

    print("=== 1. 拉 THE 2026 JSON ===")
    if args.json:
        import pathlib

        with open(args.json, "r", encoding="utf-8") as f:
            the = json.load(f)
        print(f"使用本地文件: {args.json} ({len(the.get('data', []))} 所)")
    else:
        body = fetch(THE_URL, timeout=60)
        if not body:
            sys.exit("THE JSON 下载失败")
        the = json.loads(body)

    # 按 rank_order 排序取前 N
    ranked = sorted(the["data"], key=lambda u: int(u["rank_order"]))[:limit]
    print(f"THE rank_order 前 {limit}: {len(ranked)} 所")
    print(f"(并列排名说明: THE 显示 rank 数字可能带 '=' 前缀, 本项目用 rank_order 纯数字做排序)")

    print("\n=== 2. 维基 REST 补齐坐标+wikibase_item+thumbnail ===")
    universities: List[Dict[str, Any]] = []
    missing: List[Tuple[Any, str, str, str]] = []

    for i, u in enumerate(ranked, 1):
        rank = u["rank"]
        name = u["name"]
        loc = u["location"]
        url_path = u.get("url", "")

        en, used_title = lookup_en_summary(u)
        lat: Optional[float] = None
        lng: Optional[float] = None
        qid: Optional[str] = None
        en_title_wiki: Optional[str] = None
        if en:
            coord = en.get("coordinates") or {}
            lat_v = coord.get("lat")
            lng_v = coord.get("lon")
            lat = float(lat_v) if lat_v is not None else None
            lng = float(lng_v) if lng_v is not None else None
            qid = en.get("wikibase_item")
            en_title_wiki = en.get("title")

        zh_title = lookup_zh_title_from_wikidata(en) if qid else None
        zh_summary = None
        if zh_title:
            zh_summary = get_wiki_summary(zh_title, "zh")
            if zh_summary and zh_summary.get("coordinates"):
                coord = zh_summary["coordinates"]
                lat_v = coord.get("lat")
                lng_v = coord.get("lon")
                if lat is None and lat_v is not None:
                    lat = float(lat_v)
                if lng is None and lng_v is not None:
                    lng = float(lng_v)

        country_zh = COUNTRY_ZH.get(loc, loc)

        universities.append({
            "rank_order": i,
            "rank": rank,
            "name_en": name,
            "name_zh": (zh_summary.get("title") if zh_summary else name),
            "country_en": loc,
            "country_zh": country_zh,
            "lat": lat,
            "lng": lng,
            "wiki_title_en": en_title_wiki or used_title,
            "wiki_title_zh": zh_title or name,
            "wikidata_qid": qid,
            "website": (
                f"https://www.timeshighereducation.com{url_path}"
                if url_path else None
            ),
            "the_url": url_path,
        })

        if lat is None or lng is None:
            missing.append((rank, name, loc, url_path))

        time.sleep(0.15)  # 维基限流(200req/min内)

        status = "OK" if (lat is not None and lng is not None) else "❌no-coord"
        print(f"  [{i:3}/{len(ranked)}] #{rank} {name[:50]:50s} | {status}")

    if missing:
        print(f"\n⚠️  以下 {len(missing)} 所大学缺失坐标, 用国家中心坐标 fallback:")
        for r, n, l, u in missing:
            print(f"  #{r} {n} ({l}) -- {u}")

    # 缺失坐标 → 精确坐标表优先, 其次国家中心 fallback
    # (en.wiki 部分条目无 coordinates 字段, 这些著名大学坐标手动维护)
    PRECISE_COORDS = {
        "Imperial College London": (51.4988, -0.1749),
        "UCL": (51.5246, -0.1340),
        "KU Leuven": (50.8796, 4.7009),
        "University of Science and Technology of China": (31.84, 117.25),  # 合肥
        "UNSW Sydney": (-33.9173, 151.2313),
        "Yonsei University (Seoul campus)": (37.5663, 126.9389),
        "Penn State (Main campus)": (40.7982, -77.8599),
        "University of Massachusetts": (42.3868, -72.53),
        "Radboud University Nijmegen": (51.8192, 5.866),
        "Korea University": (37.5907, 127.0276),
        "University of Pittsburgh-Pittsburgh campus": (40.4446, -79.9533),
        "Southern University of Science and Technology (SUSTech)": (22.6006, 113.9964),  # 深圳
        "University of St Andrews": (56.3398, -2.7967),
        "Institute of Science Tokyo": (35.605, 139.6836),
        "University of Virginia (Main campus)": (38.0336, -78.508),
        "Université Paris Cité": (48.8514, 2.3522),
    }
    COUNTRY_CENTER_FALLBACK = {
        "United Kingdom": (54.0, -2.0),
        "Belgium": (50.5, 4.5),
        "China": (35.0, 105.0),
        "Australia": (-25.0, 134.0),
        "South Korea": (36.5, 127.8),
        "United States": (39.0, -98.0),
        "Netherlands": (52.2, 5.5),
        "Japan": (36.0, 138.0),
        "France": (46.0, 2.0),
    }
    fallback_count = 0
    precise_count = 0
    for u in universities:
        if u["lat"] is None or u["lng"] is None:
            precise = PRECISE_COORDS.get(u["name_en"])
            if precise:
                u["lat"], u["lng"] = precise
                precise_count += 1
            else:
                c = COUNTRY_CENTER_FALLBACK.get(u["country_en"], (0.0, 0.0))
                u["lat"], u["lng"] = c
                fallback_count += 1
    if precise_count:
        print(f"  ↳ {precise_count} 所使用精确坐标 fallback")
    if fallback_count:
        print(f"  ↳ {fallback_count} 所使用国家中心 fallback 坐标")

    # 写出 TypeScript
    print(f"\n=== 3. 写出 {OUT_FILE} ===")
    OUT_FILE.parent.mkdir(parents=True, exist_ok=True)

    header = f"""// 此文件由 scripts/fetch_universities.py 自动生成
// 数据来源:
//   - Times Higher Education World University Rankings 2026 (https://www.timeshighereducation.com/world-university-rankings)
//   - Wikipedia REST API (en.wikipedia.org / zh.wikipedia.org)
// 数据采集时间: {time.strftime('%Y-%m-%d %H:%M:%S', time.localtime())}
// 许可: THE 数据遵循 THE 使用条款; Wikipedia 内容遵循 CC BY-SA 4.0

import type {{ University }} from '../themes/universities/types';

export const universities: University[] = [
"""

    rows = []
    for u in universities:
        def fmt(v):
            if v is None:
                return "null"
            if isinstance(v, (int, float)):
                return str(v)
            return json.dumps(v, ensure_ascii=False)

        row = (
            "  {\n"
            f"    id: `uni-{u['rank_order']}`,\n"
            f"    rank: {u['rank_order']},\n"
            f"    nameEn: {fmt(u['name_en'])},\n"
            f"    nameZh: {fmt(u['name_zh'])},\n"
            f"    countryEn: {fmt(u['country_en'])},\n"
            f"    countryZh: {fmt(u['country_zh'])},\n"
            f"    lat: {fmt(u['lat'])},\n"
            f"    lng: {fmt(u['lng'])},\n"
            f"    wikiTitleEn: {fmt(u['wiki_title_en'])},\n"
            f"    wikiTitleZh: {fmt(u['wiki_title_zh'])},\n"
            f"    wikidataQid: {fmt(u['wikidata_qid']).replace('null', 'undefined')},\n"
            f"    website: {fmt(u['website'])},\n"
            "  },"
        )
        rows.append(row)

    footer = "\n];\n"

    OUT_FILE.write_text(header + "\n".join(rows) + footer, encoding="utf-8")
    print(f"✅ 已写入 {OUT_FILE} ({len(universities)} 所大学)")
    if missing:
        print(f"⚠️  其中 {len(missing)} 所缺失坐标,见上方")

    return str(OUT_FILE)


if __name__ == "__main__":
    main()