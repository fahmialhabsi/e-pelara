# -*- coding: utf-8 -*-
"""
Klasifikasi v2: kurangi positif palsu (logika internal / hook / header global).
"""
import re
import sys
from collections import Counter
from pathlib import Path

LINE_RE = re.compile(r"^(.+?\.(?:jsx?|tsx?)):(\d+):(.*)$", re.IGNORECASE)

# DOMAIN: nama field / kunci data / atribut form terikat kolom (bukan copy promosi ke user)
DOMAIN_RE = re.compile(
    r"(target_tahun_|pagu_tahun_|capaian_tahun_|tahun_awal|tahun_akhir|tahun_mulai|"
    r"tahun_\d{4}|tahun_penetapan|tahunRpjmd|dataIndex:\s*[\"'][^\"']*tahun[^\"']*[\"']|"
    r"key:\s*[\"'][^\"']*tahun[^\"']*[\"']|"
    r"name=[\"'][^\"']*tahun[^\"']*[\"']|"
    r"getItem\([\"']tahun[\"']\)|setItem\([\"']tahun[\"']\)|removeItem\([\"']tahun[\"']\))",
    re.I,
)

def has_user_facing_tahun_string(c: str) -> bool:
    """Heuristik: ada substring user-facing berbahasa Indonesia/Inggris soal Tahun."""
    if re.search(
        r'["\']([^"\']*\b[Tt]ahun\b[^"\']*|Per\s+Tahun|Pilih\s+Tahun|Tahun\s+Penetapan|'
        r"Capaian\s+Tahun|Target\s+Tahun|Tahun\s+Awal|Tahun\s+Akhir|Tiap\s+Tahun|"
        r"Dokumen\s+dan\s+tahun|jenis\s+dokumen\s+belum)[^\"\']*[\"']",
        c,
    ):
        return True
    if re.search(r">[^<[{]*[Tt]ahun[^<]*<", c):
        return True
    if re.search(r"\{[^}]*[Tt]ahun[^}]*\}", c) and (
        "header:" in c
        or "title:" in c
        or "label:" in c
        or "Form.Label" in c
        or "toast." in c
        or "setError(" in c
        or "Alert" in c
    ):
        return True
    return False


def classify(path: str, content: str) -> tuple:
    c = content.strip()
    p = path.replace("\\", "/").lower()

    # Impor / ekspor: nama file mengandung "Tahun" ≠ UI filter
    if c.startswith("import ") or c.startswith("export "):
        return "INTERNAL_TEKNIS", "AMAN", "BIARKAN"

    # Header global: picker tahun dipakai lintas modul — bukan HARUS DIHAPUS otomatis
    if "globaldokumentahunpicker" in c.lower() or "globaldokumentahunpickermodal" in c.lower():
        if "import " in c or "export default function" in c:
            return "INTERNAL_TEKNIS", "AMAN", "BIARKAN"
        if "<GlobalDokumenTahunPicker" in c or "<GlobalDokumenTahunPickerModal" in c:
            return "UI_FILTER", "PERLU VALIDASI", "ESKALASI VALIDASI PRODUK"
        if "Form.Label" in c or "option" in c.lower() or "Pilih" in c:
            return "UI_FILTER", "PERLU VALIDASI", "ESKALASI VALIDASI PRODUK"

    if DOMAIN_RE.search(c):
        return "DOMAIN_DATA", "AMAN", "BIARKAN"

    # Kunci API / daftar field wizard (bukan label UI)
    if re.match(r'^\s*["\']tahun["\']\s*,?\s*$', c):
        return "DOMAIN_DATA", "AMAN", "BIARKAN"

    # Panggilan API / penyimpanan konteks (bukan label)
    if re.search(r"\b(api\.(get|post|put|patch|delete)|axios\.|fetch\s*\()", c):
        return "INTERNAL_TEKNIS", "AMAN", "BIARKAN"
    if "sessionStorage" in c or "localStorage" in c:
        return "INTERNAL_TEKNIS", "AMAN", "BIARKAN"
    if re.search(r"\b(setValue|setFieldValue)\(\s*[`'\"]tahun[`'\"]", c):
        return "INTERNAL_TEKNIS", "AMAN", "BIARKAN"
    if re.search(r"\b(prev|snap|values|data|row|item|d|initialValues)\.tahun\b", c):
        return "INTERNAL_TEKNIS", "AMAN", "BIARKAN"
    if re.search(r"\bvalue:\s*tahun\b", c):
        return "INTERNAL_TEKNIS", "AMAN", "BIARKAN"

    if "formrenstraopd" in p and (
        "label=" in c or "placeholder=" in c or "yup" in c.lower() or "{/* tahun" in c.lower()
    ):
        return "UI_LABEL", "PERLU VALIDASI", "ESKALASI VALIDASI PRODUK"

    if re.search(
        r"\b(selectedYear|yearFilter|filterTahun|tahunAcuan|activeYear)\b", c, re.I
    ):
        return "STATE_PROP", "PERLU VALIDASI", "ESKALASI VALIDASI PRODUK"

    # Logika murni (tanpa string UI Tahun)
    if not has_user_facing_tahun_string(c):
        if re.search(r"\b(year|tahun)\b", c, re.I):
            return "INTERNAL_TEKNIS", "AMAN", "BIARKAN"
        return "UNKNOWN", "PERLU VALIDASI", "ESKALASI VALIDASI PRODUK"

    # Opsi agregat waktu monitoring / log (bukan filter dokumen RPJMD)
    if "aktivitasfilter" in p or "dashboardmonitoring" in p:
        if "<option" in c and "tahun" in c.lower():
            return "UI_LABEL", "PERLU VALIDASI", "ESKALASI VALIDASI PRODUK"
        return "INTERNAL_TEKNIS", "AMAN", "BIARKAN"

    # String UI: bedakan indikator RPJMD (periode 5 th) vs metadata penetapan
    if "tahun penetapan" in c.lower() or "tahun_penetapan" in c.lower():
        return "UI_LABEL", "PERLU VALIDASI", "ESKALASI VALIDASI PRODUK"

    if "wizard" in p or "indikator" in p or "cascading" in p or "step" in p:
        if "th. ke" in c.lower() or "periode" in c.lower():
            return "UI_LABEL", "AMAN", "BIARKAN"
        return "UI_LABEL", "HARUS DIUBAH", "PATCH SEKARANG"

    if "mui sidebarglobal" in p.replace("/", "") and "tahun" in c.lower():
        return "UI_LABEL", "PERLU VALIDASI", "ESKALASI VALIDASI PRODUK"

    # Kunci JSON murni (bukan copy ke pengguna)
    if re.match(r'^[\s]*["\']tahun["\'][\s,]*$', c):
        return "DOMAIN_DATA", "AMAN", "BIARKAN"

    # Kata "tahun" dalam identifier (tahunAwal, tahun_akhir) — bukan label UI
    if re.search(r"\btahun_(awal|akhir|mulai|penetapan)\b", c, re.I):
        return "INTERNAL_TEKNIS", "AMAN", "BIARKAN"

    # Hanya jika "tahun" sebagai kata utuh (bukan substring tahunAwal)
    if re.search(r"\b[Tt]ahun\b", c):
        return "UI_LABEL", "HARUS DIUBAH", "PATCH SEKARANG"

    return "UNKNOWN", "PERLU VALIDASI", "ESKALASI VALIDASI PRODUK"


def esc_md(s: str, max_len: int = 120) -> str:
    s = s.replace("|", "\\|").replace("\n", " ")
    if len(s) > max_len:
        s = s[: max_len - 3] + "..."
    return s


def main():
    root = Path(__file__).resolve().parents[1]
    inp = root / "audit-rpjmd-renstra-grep-full.txt"
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
        cat, status, act = classify(path, content)
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

    out_md = root / "audit-rpjmd-renstra-classification-full-v2.md"
    lines_out = [
        "# Audit klasifikasi penuh v2 (setiap baris grep)",
        "",
        "Perbaikan v2: logika `if/return/api` tanpa string UI tidak lagi ditandai "
        "`HARUS DIUBAH`; komponen header `GlobalDokumenTahun*` dikelompokkan "
        "`PERLU VALIDASI` (lintas modul).",
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

    key_ct = Counter((r["cat"], r["status"], r["act"]) for r in rows)
    sum_lines = [
        "## Ringkasan v2 (cat, status, tindakan)",
        "",
        "| Kategori | Status | Tindakan | Jumlah |",
        "|----------|--------|----------|--------|",
    ]
    for (cat, st, act), n in sorted(key_ct.items(), key=lambda x: (-x[1], x[0])):
        sum_lines.append(f"| {cat} | {st} | {act} | {n} |")
    (root / "audit-rpjmd-renstra-classification-summary-v2.md").write_text(
        "\n".join(sum_lines), encoding="utf-8"
    )

    patch_rows = [r for r in rows if r["status"] in ("HARUS DIHAPUS", "HARUS DIUBAH")]
    patch_lines = ["# PATCH queue v2 (HARUS DIHAPUS / HARUS DIUBAH)", ""]
    for r in patch_rows:
        patch_lines.append(
            f"- `{r['path']}:{r['line']}` — {r['status']} — {esc_md(r['content'], 200)}"
        )
    (root / "audit-rpjmd-renstra-patch-queue-v2.md").write_text(
        "\n".join(patch_lines), encoding="utf-8"
    )

    print(len(rows), "rows v2")
    print("PATCH queue v2:", len(patch_rows))


if __name__ == "__main__":
    main()
