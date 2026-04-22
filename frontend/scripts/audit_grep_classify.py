# -*- coding: utf-8 -*-
"""Klasifikasi setiap baris hasil grep audit RPJMD/Renstra."""
import re
import sys
from pathlib import Path

LINE_RE = re.compile(r"^(.+?\.(?:jsx?|tsx?)):(\d+):(.*)$", re.IGNORECASE)

# Pola DOMAIN (nama field / kolom / model)
DOMAIN_RE = re.compile(
    r"(target_tahun_|pagu_tahun_|capaian_tahun_|tahun_awal|tahun_akhir|tahun_mulai|"
    r"tahun_\d{4}|tahunRpjmd|tahun_rpjmd|dataIndex:\s*[\"']tahun|"
    r"name=[\"']tahun_mulai|name=[\"']tahun_akhir|"
    r"getItem\([\"']tahun|setItem\([\"']tahun|removeItem\([\"']tahun)",
    re.I,
)

# API / routing internal
API_TAHUN_RE = re.compile(
    r"(`[^`]*\?tahun=|&tahun=|/tahun[\"'`]|params:\s*\{[^}]*\btahun\b|"
    r"tahun:\s*[^,\n\}]+[,}\n]|\btahun\s*=\s*\{|setTahun\(|initialTahun|ctxTahun)",
    re.I,
)

# UI teks (user-facing)
UI_STRING_RE = re.compile(
    r"(label|title|placeholder|subtitle|message|description|tooltip|Alert|toast|"
    r"Form\.Label|Typography|helperText|emptyText|okText|cancelText)\s*[=:]\s*[\"'`]|"
    r">[^<{]*[Tt]ahun[^<]*<|\"[^\"]*[Tt]ahun[^\"]*\"|'[^']*[Tt]ahun[^']*'",
)

UI_FILTER_HINT = re.compile(
    r"GlobalDokumenTahunPicker|yearFilter|filterTahun|selectedYear|tahunAcuan|activeYear|"
    r"type=[\"']year[\"']|<Select[^>]*Tahun|Pilih\s+Tahun",
    re.I,
)

STATE_HINT = re.compile(
    r"useState\([^\)]*(year|tahun|Year|Tahun)|\bselectedYear\b|\bcurrentYear\b|\bactiveYear\b|"
    r"\bsetYear\b|\byears\b\s*,\s*setYears",
    re.I,
)

COMMENT_ONLY = re.compile(r"^\s*//")


def classify(path: str, line_no: str, content: str) -> tuple:
    """Return (kategori, status, tindakan, cuplikan_esc)"""
    c = content.strip()
    p = path.replace("\\", "/").lower()

    # STATE / props eksplisit
    if STATE_HINT.search(c) and "target_tahun" not in c.lower():
        if UI_FILTER_HINT.search(c):
            return "STATE_PROP", "PERLU VALIDASI", "ESKALASI VALIDASI PRODUK", c
        if "useState" in c and ("year" in c.lower() or "tahun" in c.lower()):
            if "ReportRPJMD" in p or "renstra" in p or "rpjmd" in p or "shared" in p:
                return "STATE_PROP", "PERLU VALIDASI", "ESKALASI VALIDASI PRODUK", c

    if UI_FILTER_HINT.search(c):
        return "UI_FILTER", "HARUS DIHAPUS", "PATCH SEKARANG", c

    if DOMAIN_RE.search(c):
        return "DOMAIN_DATA", "AMAN", "BIARKAN", c

    # Import path saja (nama file hook)
    if "useAutoIsiTahunDanTarget" in c or "useAutoIsiTahun" in c:
        return "INTERNAL_TEKNIS", "AMAN", "BIARKAN", c

    # Komentar developer
    if COMMENT_ONLY.match(c) or c.startswith("/*"):
        if "tahun" in c.lower() or "year" in c.lower():
            return "INTERNAL_TEKNIS", "AMAN", "BIARKAN", c

    # Provider / context — anchor tahun global
    if "dokumenprovider" in p or "dokumencontext" in p:
        return "INTERNAL_TEKNIS", "AMAN", "BIARKAN", c

    # API query lines
    if (
        "api." in c
        or "axios" in c
        or "`/" in c
        or "fetch(" in c
        or "params:" in c
        or "?tahun=" in c
        or "&tahun=" in c
    ) and re.search(r"\btahun\b", c, re.I):
        return "INTERNAL_TEKNIS", "AMAN", "BIARKAN", c

    if API_TAHUN_RE.search(c) and "<" not in c:
        return "INTERNAL_TEKNIS", "AMAN", "BIARKAN", c

    # usePeriodeAktif currentYear — internal mapping
    if "currentyear" in c.lower() and "parseint" in c.lower():
        return "INTERNAL_TEKNIS", "AMAN", "BIARKAN", c

    # Guard if (!tahun)
    if re.search(r"if\s*\([^)]*!tahun", c) or re.search(r"!\s*tahun\b", c):
        return "INTERNAL_TEKNIS", "AMAN", "BIARKAN", c

    # Dependency array
    if c.strip().startswith("]") or "], [" in c or re.search(r"^\s*\[.*tahun", c):
        if "tahun" in c and "target_tahun" not in c:
            return "INTERNAL_TEKNIS", "AMAN", "BIARKAN", c

    # FormRenstraOPD — label/placeholder Tahun Mulai/Akhir
    if "formrenstraopd" in p:
        if re.search(r'label=["\'].*[Tt]ahun', c) or re.search(
            r'placeholder=["\'].*[Tt]ahun', c
        ):
            return "UI_LABEL", "PERLU VALIDASI", "ESKALASI VALIDASI PRODUK", c
        if "yup" in c.lower() and "tahun" in c.lower():
            return "UI_LABEL", "PERLU VALIDASI", "ESKALASI VALIDASI PRODUK", c
        if "{/* Tahun" in c:
            return "UI_LABEL", "PERLU VALIDASI", "ESKALASI VALIDASI PRODUK", c

    # JSX / string UI umum
    if UI_STRING_RE.search(c) or (">" in c and re.search(r"[Tt]ahun", c)):
        if "th. ke" in c.lower() or "(th." in c.lower():
            return "UI_LABEL", "AMAN", "BIARKAN", c
        if "periode" in c.lower() and "tahun" in c.lower():
            return "UI_LABEL", "PERLU VALIDASI", "ESKALASI VALIDASI PRODUK", c
        return "UI_LABEL", "HARUS DIUBAH", "PATCH SEKARANG", c

    # Default: internal code referencing tahun variable
    if re.search(r"\btahun\b", c, re.I) or re.search(r"\byear\b", c, re.I):
        if "<" in c or "{" in c:
            return "UNKNOWN", "PERLU VALIDASI", "ESKALASI VALIDASI PRODUK", c
        return "INTERNAL_TEKNIS", "AMAN", "BIARKAN", c

    return "UNKNOWN", "PERLU VALIDASI", "ESKALASI VALIDASI PRODUK", c


def esc_md(s: str, max_len: int = 120) -> str:
    s = s.replace("|", "\\|").replace("\n", " ")
    if len(s) > max_len:
        s = s[: max_len - 3] + "..."
    return s


def main():
    root = Path(__file__).resolve().parents[1]
    inp = root / "audit-rpjmd-renstra-grep-full.txt"
    if not inp.exists():
        print("Missing", inp, file=sys.stderr)
        sys.exit(1)

    rows = []
    for raw in inp.read_text(encoding="utf-8-sig", errors="replace").splitlines():
        raw = raw.strip().lstrip("\ufeff")
        if not raw:
            continue
        m = LINE_RE.match(raw)
        if not m:
            rows.append(
                {
                    "path": "?",
                    "line": "?",
                    "content": raw,
                    "cat": "UNKNOWN",
                    "status": "PERLU VALIDASI",
                    "act": "ESKALASI VALIDASI PRODUK",
                }
            )
            continue
        path = m.group(1).lstrip("\ufeff")
        line_no, content = m.group(2), m.group(3)
        cat, status, act, _ = classify(path, line_no, content)
        abs_p = Path(path)
        try:
            rel = str(abs_p.relative_to(root.parent.resolve()))
        except ValueError:
            rel = str(abs_p)
        rows.append(
            {
                "path": rel,
                "line": line_no,
                "content": content,
                "cat": cat,
                "status": status,
                "act": act,
            }
        )

    out_md = root / "audit-rpjmd-renstra-classification-full.md"
    lines_out = [
        "# Audit klasifikasi penuh (setiap baris grep)",
        "",
        f"Total baris: **{len(rows)}**",
        "",
        "| Nama File | Lokasi | Cuplikan | Kategori | Status | Tindakan |",
        "|-----------|--------|----------|----------|--------|----------|",
    ]
    for r in rows:
        lines_out.append(
            f"| `{r['path']}` | {r['line']} | {esc_md(r['content'])} | {r['cat']} | {r['status']} | {r['act']} |"
        )
    out_md.write_text("\n".join(lines_out), encoding="utf-8")

    # Ringkasan
    from collections import Counter

    key_ct = Counter((r["cat"], r["status"], r["act"]) for r in rows)
    sum_lines = [
        "## Ringkasan (cat, status, tindakan)",
        "",
        "| Kategori | Status | Tindakan | Jumlah |",
        "|----------|--------|----------|--------|",
    ]
    for (cat, st, act), n in sorted(key_ct.items(), key=lambda x: (-x[1], x[0])):
        sum_lines.append(f"| {cat} | {st} | {act} | {n} |")
    (root / "audit-rpjmd-renstra-classification-summary.md").write_text(
        "\n".join(sum_lines), encoding="utf-8"
    )

    patch_rows = [r for r in rows if r["status"] in ("HARUS DIHAPUS", "HARUS DIUBAH")]
    patch_lines = ["# PATCH queue (HARUS DIHAPUS / HARUS DIUBAH)", ""]
    for r in patch_rows:
        patch_lines.append(f"- `{r['path']}:{r['line']}` — {r['status']} — {esc_md(r['content'],200)}")
    (root / "audit-rpjmd-renstra-patch-queue.md").write_text(
        "\n".join(patch_lines), encoding="utf-8"
    )

    print(len(rows), "rows written")
    print("PATCH queue lines:", len(patch_rows))


if __name__ == "__main__":
    main()
