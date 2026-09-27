#!/usr/bin/env python3
"""Build catalog and processed table datasets as JSON for Node.js / Express backend.
Uses standard Python library only (csv, json, re, pathlib).
"""
import csv
import json
import math
import os
import re
from pathlib import Path

import catalog as cat
import geo_dept as gd

HERE = Path(__file__).resolve().parent
DATASETS_DIR = HERE / "datasets"
PROV_NAMES_PATH = HERE / "province_names.json"
OUT_CATALOG_PATH = HERE / "catalog.json"
OUT_TABLES_DIR = HERE / "tables"
MANIFEST_PATH = HERE.parent / "pipeline" / "manifest.csv"

_TEMPORAL_KEYS = ("anio", "ano", "year", "ym", "periodo", "trimestre", "trim_start")
_SKIP_PREVIEW = {
    'n', 'nn', 'n_hh', 'n_m', 'n_h', 'n_obs', 'n_depto', 'waves',
    'wt', 'wt_raw', 'cluster', 'caseid', 'codigo', 'codciudad', 'oficial',
    'pet', 'release', 'wave', 'window', 'cob_peso'
}

def load_manifest():
    if not MANIFEST_PATH.exists():
        return {}
    with open(MANIFEST_PATH, newline="", encoding="utf-8") as f:
        return {r["table"]: r.get("producing_script", "") for r in csv.DictReader(f)}

def load_prov_names():
    if PROV_NAMES_PATH.exists():
        with open(PROV_NAMES_PATH, encoding="utf-8") as f:
            return json.load(f)
    return {}

def try_parse_num(val):
    if val is None or val == "":
        return None
    val_s = str(val).strip()
    try:
        if "." in val_s or "e" in val_s.lower():
            f = float(val_s)
            return f if not math.isnan(f) else None
        return int(val_s)
    except ValueError:
        return None

def infer_col_type(values):
    non_empty = [v for v in values if v is not None and v != ""]
    if not non_empty:
        return "VARCHAR"
    num_count = sum(1 for v in non_empty if try_parse_num(v) is not None)
    if num_count / len(non_empty) >= 0.8:
        # Check if integer or double
        has_dot = any("." in str(v) for v in non_empty)
        return "DOUBLE" if has_dot else "BIGINT"
    # check bool
    bools = sum(1 for v in non_empty if str(v).lower() in ("true", "false", "1", "0"))
    if bools == len(non_empty) and set(str(v).lower() for v in non_empty) <= {"true", "false"}:
        return "BOOLEAN"
    return "VARCHAR"

def is_num_type(ty):
    return (ty or "").upper() in ("INT", "BIGINT", "INTEGER", "DOUBLE", "DECIMAL", "FLOAT", "REAL", "NUMERIC", "HUGEINT")

def eligible_files():
    out = []
    for p in sorted(DATASETS_DIR.glob("*.csv")):
        if p.stem in cat.EXCLUDE or cat.table_name(p.stem) in cat.EXCLUDE:
            continue
        if p.stat().st_size > cat.MAX_MB * 1024 * 1024:
            continue
        out.append(p)
    return out

def apply_transforms_to_rows(stem, rows, cols):
    # column renames
    renames = cat.COLUMN_RENAMES.get(stem, {})
    if renames:
        new_rows = []
        for r in rows:
            new_r = {}
            for k, v in r.items():
                new_key = renames.get(k, k)
                new_r[new_key] = v
            new_rows.append(new_r)
        rows = new_rows
        cols = [renames.get(c, c) for c in cols]

    # special transforms
    if stem == "eea_demografia_sector":
        # filter pond and sort by year, sector
        rows = [r for r in rows if str(r.get("pond", "")).lower() in ("true", "1", "t")]
        cols = ["year", "sector", "n", "share"]
        rows = [{c: r.get(c) for c in cols} for r in rows]
        rows.sort(key=lambda r: (str(r.get("year", "")), str(r.get("sector", ""))))

    elif stem == "transferencias_cobertura_2013_2025":
        cols = ["year", "n_hh", "Juntos", "Pension 65"]
        rows = [{c: r.get(c) for c in cols} for r in rows]
        rows.sort(key=lambda r: str(r.get("year", "")))

    elif stem == "informalidad_reconstruida":
        cols = ["year", "informal_reconstruido", "informal_oficial", "concordancia_%"]
        rows = [{c: r.get(c) for c in cols} for r in rows]
        rows.sort(key=lambda r: str(r.get("year", "")))

    elif stem == "evento_maternidad_empleo":
        # pivot: evt, emp, ref by sexo ('mujer', 'hombre')
        by_evt = {}
        for r in rows:
            evt = r.get("evt")
            sexo = r.get("sexo")
            if evt not in by_evt:
                by_evt[evt] = {"anios_desde_primer_hijo": evt, "empleo_madre": None, "empleo_padre": None, "ref_madre": None, "ref_padre": None}
            if sexo == "mujer":
                by_evt[evt]["empleo_madre"] = r.get("emp")
                by_evt[evt]["ref_madre"] = r.get("ref")
            elif sexo == "hombre":
                by_evt[evt]["empleo_padre"] = r.get("emp")
                by_evt[evt]["ref_padre"] = r.get("ref")
        def _to_num(x):
            try:
                return float(x)
            except:
                return 0
        sorted_evts = sorted(by_evt.keys(), key=_to_num)
        rows = [by_evt[e] for e in sorted_evts]
        cols = ["anios_desde_primer_hijo", "empleo_madre", "empleo_padre", "ref_madre", "ref_padre"]

    return rows, cols

def main():
    print("Building Node.js data bundle...")
    OUT_TABLES_DIR.mkdir(parents=True, exist_ok=True)
    manifest = load_manifest()
    prov_names = load_prov_names()
    files = eligible_files()

    catalog = {}
    cols_map = {}
    dept_map = {}
    prov_map = {}
    temporal_map = {}
    category_map = {}
    flow_map = {}
    years_map = {}
    previews_map = {s: {} for s in cat.DATABASES}

    seen = {}
    table_records = []

    for p in files:
        stem = p.stem
        schema = cat.schema_for(stem)
        tname = cat.table_name(stem)
        if tname in seen:
            tname = f"{tname}_{abs(hash(stem)) % 1000}"
        seen[tname] = p.name

        theme_key, theme_label = cat.theme_for(stem, schema)
        topic_key, topic_label = cat.topic_for(stem, schema)
        family, window = cat.family_for(stem)
        pipeline_script = manifest.get(stem, "")
        title = cat.title_for(stem)

        # Read CSV
        raw_rows = []
        with open(p, newline="", encoding="utf-8", errors="replace") as f:
            reader = csv.reader(f)
            header = next(reader, None)
            if not header:
                continue
            for r in reader:
                raw_rows.append(dict(zip(header, r)))

        raw_rows, header = apply_transforms_to_rows(stem, raw_rows, header)

        # Infer types and convert numbers
        col_types = {}
        for c in header:
            col_vals = [r.get(c) for r in raw_rows]
            col_types[c] = infer_col_type(col_vals)

        typed_rows = []
        for r in raw_rows:
            tr = {}
            for c in header:
                v = r.get(c)
                if is_num_type(col_types[c]):
                    nv = try_parse_num(v)
                    tr[c] = nv
                else:
                    tr[c] = v if v != "" else None
            typed_rows.append(tr)

        n_rows = len(typed_rows)
        n_cols = len(header)

        key = f"{schema}.{tname}"
        cols_map[key] = col_types

        # Dept detection
        dc = gd.detect_dept_col(header)
        if dc:
            vals = [r.get(dc) for r in typed_rows if r.get(dc) is not None][:60]
            if vals and sum(1 for v in vals if gd.canonical(v) is not None) / len(vals) >= 0.6:
                dept_map[key] = dc

        # Province detection
        if key not in dept_map and prov_names:
            low = {c.lower(): c for c in header}
            pcol = low.get("prov") or low.get("ubigeo")
            if pcol:
                is_ubi = pcol.lower() == "ubigeo"
                pvals = [r.get(pcol) for r in typed_rows if r.get(pcol) is not None][:80]
                def _p4(v):
                    s = str(v).split(".")[0].zfill(6 if is_ubi else 4)
                    return s[:4]
                if pvals and sum(1 for v in pvals if _p4(v) in prov_names) / len(pvals) >= 0.6:
                    prov_map[key] = {"col": pcol, "is_ubigeo": is_ubi}

        # Temporal column
        for c in header:
            if c.lower() in _TEMPORAL_KEYS:
                temporal_map[key] = c
                break

        # Flow detection
        low_cols = {c.lower() for c in header}
        is_flow = ({"origen", "source", "desde"} & low_cols) and ({"destino", "target", "hacia"} & low_cols)
        if is_flow:
            src = next(c for c in header if c.lower() in ("origen", "source", "desde"))
            svals = [r.get(src) for r in typed_rows if r.get(src) is not None][:40]
            hits = sum(1 for v in svals if gd.canonical(v) is not None)
            flow_map[key] = bool(svals) and (hits / len(svals) >= 0.6)

        # Years range
        tc = temporal_map.get(key)
        if tc:
            tvals = [r.get(tc) for r in typed_rows if r.get(tc) is not None]
            if tvals:
                try:
                    lo, hi = min(tvals), max(tvals)
                    years_map[key] = f"{str(lo)[:4]}–{str(hi)[:4]}"
                except Exception:
                    pass

        # Category column
        cat_col = next((c for c in header if c.lower() in ("indicator", "indicador", "variable", "concepto")), None)
        tcol = temporal_map.get(key)
        dcol = dept_map.get(key)
        if not cat_col and not is_flow and (tcol or dcol) and n_rows:
            for c, ty in col_types.items():
                if c in (tcol, dcol) or is_num_type(ty) or "BOOL" in ty.upper():
                    continue
                if c.lower() in ("departamento", "dpto", "dep", "depto", "region", "provincia", "distrito", "ciudad", "dominio"):
                    continue
                vals = [r.get(c) for r in typed_rows if r.get(c) is not None][:30]
                if vals and sum(1 for v in vals if gd.canonical(v) is not None) / len(vals) >= 0.5:
                    continue
                distinct_cnt = len(set(r.get(c) for r in typed_rows if r.get(c) is not None))
                if 2 <= distinct_cnt <= 30 and distinct_cnt * 1.5 < n_rows:
                    cat_col = c
                    break
        if cat_col:
            category_map[key] = cat_col

        # Previews sparkline
        if tc:
            val_col = next((c for c, ty in col_types.items()
                            if c != tc and is_num_type(ty)
                            and c.lower() not in _SKIP_PREVIEW and not c.endswith('_missing')), None)
            if val_col:
                # sort by tc
                s_rows = sorted(typed_rows, key=lambda r: str(r.get(tc, "")))
                p_vals = [r.get(val_col) for r in s_rows if isinstance(r.get(val_col), (int, float))]
                if len(p_vals) >= 3:
                    if len(p_vals) > 60:
                        step = (len(p_vals) + 59) // 60
                        p_vals = p_vals[::step]
                    previews_map[schema][tname] = [round(v, 4) for v in p_vals]

        # Save table JSON
        table_file = OUT_TABLES_DIR / f"{schema}_{tname}.json"
        with open(table_file, "w", encoding="utf-8") as f:
            json.dump({
                "schema": schema,
                "table": tname,
                "columns": header,
                "types": col_types,
                "rows": typed_rows
            }, f, separators=(",", ":"))

        table_records.append({
            "schema": schema,
            "table": tname,
            "source_file": p.name,
            "theme_key": theme_key,
            "theme_label": theme_label,
            "topic_key": topic_key,
            "topic_label": topic_label,
            "family": family,
            "window": window,
            "pipeline_script": pipeline_script,
            "title": title,
            "n_rows": n_rows,
            "n_cols": n_cols,
            "columns": header,
        })

    # Build catalog output
    # compute mappable & kinds
    for tr in table_records:
        sc, tb = tr["schema"], tr["table"]
        key = f"{sc}.{tb}"
        has_dept = key in dept_map
        has_prov = key in prov_map
        geo_lvl = "dept" if has_dept else ("prov" if has_prov else None)
        gk = dept_map.get(key) or (prov_map[key]["col"] if has_prov else None)

        tcols = cols_map.get(key, {})
        skip_set = {gk, temporal_map.get(key)}
        mappable = bool(gk and any(is_num_type(t) and c not in skip_set for c, t in tcols.items()))
        tr["mappable"] = mappable
        tr["geo_level"] = geo_lvl
        tr["dept_col"] = gk
        tr["temporal_col"] = temporal_map.get(key)
        tr["category_col"] = category_map.get(key)
        tr["years"] = years_map.get(key)

        # kinds
        low_c = [c.lower() for c in tcols]
        if key in flow_map:
            tr["kinds"] = ["red", "flujos"] if flow_map[key] else ["red"]
        elif any(c.endswith("_destino") for c in low_c) and tr["n_rows"] <= 8:
            tr["kinds"] = ["matriz"]
        elif geo_lvl:
            tr["kinds"] = ["mapa", "carrera"] if (tr["temporal_col"] and geo_lvl == "dept") else ["mapa"]
        elif tr["temporal_col"]:
            tr["kinds"] = ["lineas", "apilado", "barras"]
        else:
            tr["kinds"] = ["barras"]

    # catalog.json contents
    full_catalog = {
        "databases": cat.DATABASES,
        "topics": cat.TOPICS,
        "tables": {f"{r['schema']}.{r['table']}": r for r in table_records},
        "previews": previews_map
    }

    with open(OUT_CATALOG_PATH, "w", encoding="utf-8") as f:
        json.dump(full_catalog, f, separators=(",", ":"))

    print(f"Done! Processed {len(table_records)} tables.")
    print(f"Catalog saved to {OUT_CATALOG_PATH}")

if __name__ == "__main__":
    main()
