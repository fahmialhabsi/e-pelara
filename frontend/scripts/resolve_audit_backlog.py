# -*- coding: utf-8 -*-
"""Bangun tabel keputusan final untuk baris backlog UNKNOWN / PERLU VALIDASI."""
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BACK = json.loads((ROOT / "audit-backlog-ambigu.json").read_text(encoding="utf-8"))


def norm_file(f: str) -> str:
    return f.strip("`").replace("\\\\", "/")


def decide(row: dict) -> tuple[str, str, str]:
    """(keputusan, alasan, tindakan)"""
    f = norm_file(row["file"]).lower()
    sn = row["snippet"]
    ln = row["line"]

    # --- AMAN: konteks provider / state ---
    if "dokumenprovider.jsx" in f:
        return (
            "AMAN",
            "State & setter konteks dokumen (`tahun` = anchor internal), bukan filter UX RPJMD/Renstra.",
            "BIARKAN",
        )

    # --- PATCH: Renstra OPD admin form ---
    if "formrenstraopd.jsx" in f:
        return (
            "PATCH SEKARANG",
            "Teks UI masih memakai kata «Tahun» untuk pemetaan ke field `tahun_mulai`/`tahun_akhir` (periode Renstra).",
            "Ubah label/placeholder/Yup ke bahasa periode.",
        )

    if "listrenstraopd.jsx" in f and "tahunaktif" in sn.lower():
        return ("AMAN", "Dependency `useEffect` — bukan tampilan pengguna.", "BIARKAN")

    if "renstradashboard.jsx" in f:
        return (
            "PATCH SEKARANG",
            "Nama variabel `paguPerTahun` / properti `tahun` di objek ringkasan menimbulkan ambiguitas; isi kartu sudah «Th. ke-».",
            "Ganti ke `paguPerSlot` + `slot`.",
        )

    if "targetrenstra.jsx" in f:
        return (
            "AMAN",
            "State `years` + fetch `/renstra-target/tahun` adalah internal mapping backend; tidak ada filter tahun terpisah di UX.",
            "BIARKAN",
        )

    if "renstratabellistcommon.jsx" in f:
        if "prefix_tahun_" in sn or "`${prefix}_tahun_" in sn:
            return ("AMAN", "Akses field DOMAIN `*_tahun_*`.", "BIARKAN")
        return (
            "AMAN",
            "Label sudah memakai «per slot periode (th. ke-…)»; baris JSX tidak perlu patch.",
            "BIARKAN",
        )

    if "renstratabelsubkegiatanform.jsx" in f and "getfullyear" in sn.lower():
        return ("AMAN", "Fallback angka teknis saat normalisasi.", "BIARKAN")

    if "aktivitasfilter.jsx" in f or "dashboardmonitoring.jsx" in f:
        return (
            "PATCH SEKARANG",
            "Opsi agregat waktu untuk log/monitoring; redaksi «tahunan» masih mengandung konotasi kalender.",
            "Ganti label opsi agregat (bukan hapus `value=`).",
        )

    if "indikatorsimpleeditformbody.jsx" in f or "indikatorkegiataneditpage.jsx" in f:
        if "useautoisitahundantarget" in sn.lower():
            return ("AMAN", "Hook sinkron field indikator (internal).", "BIARKAN")

    if "listpagecomponent.jsx" in f:
        return ("AMAN", "Variabel fallback tahun kalender untuk utilitas list.", "BIARKAN")

    if "useperiodeaktif.jsx" in f:
        return ("AMAN", "Helper `tahunDalamPeriode` / perbandingan rentang periode.", "BIARKAN")

    if "dashboardhome.jsx" in f:
        return (
            "BIARKAN UNTUK MODUL NON-RPJMD/RENSTRA",
            "`useRequireDokumenTahun` memaksa konteks global untuk semua dashboard; nama hook tetap kompatibel.",
            "BIARKAN (nama hook = teknis; perilaku periode sudah di `usePeriodeAktif`).",
        )

    if "reportrpjmdpage.jsx" in f:
        return ("AMAN", "Sinkron `year`/`ctxTahun` dan `controlId` DOM — bukan label filter tahun ke pengguna.", "BIARKAN")

    if "mockapi.js" in f:
        return ("AMAN", "Data mock dev.", "BIARKAN")

    if "globaldokumentahunpicker" in f:
        return (
            "BIARKAN UNTUK MODUL NON-RPJMD/RENSTRA",
            "Picker konteks waktu global untuk Renja/RKPD; cabang RPJMD/Renstra sudah disembunyikan di komponen.",
            "BIARKAN",
        )

    if "requiredokumentahun.jsx" in f or "muitopbarglobal.jsx" in f or "tablertopbarglobal.jsx" in f:
        return (
            "BIARKAN UNTUK MODUL NON-RPJMD/RENSTRA",
            "Header/layout global — konteks tahun tetap diperlukan modul berbasis tahun tunggal.",
            "BIARKAN",
        )

    if "useautoisitahundantarget.js" in f:
        return ("AMAN", "Komentar path file + hook auto-field.", "BIARKAN")

    if "useindikatorbuilder.js" in f:
        return ("AMAN", "Nama fungsi `getTargetTahunValues` — DOMAIN field `target_tahun_*`.", "BIARKAN")

    if "indikatortabcontent.jsx" in f:
        if "placeholder=" in sn and "tahun_" in sn:
            return (
                "PATCH SEKARANG",
                "Placeholder/Form.Text menyebut «tahun» ke pengguna impor 2.28.",
                "Netralkan teks UI (tetap logika kolom).",
            )
        return ("AMAN", "Impor 2.28 / union tahun kolom — logika DOMAIN & internal.", "BIARKAN")

    if "rpjmdlist.jsx" in f or "rpjmdmetadataform.jsx" in f:
        if "tahun penetapan" in sn.lower():
            return (
                "PATCH SEKARANG",
                "Label tabel/form metadata RPJMD — ganti ke istilah penetapan dokumen tanpa menonjolkan «Tahun» sebagai filter.",
                "Ubah `<th>` / `Form.Label` saja; field `tahun_penetapan` tetap.",
            )

    if "sasaranform.jsx" in f:
        return (
            "PATCH SEKARANG",
            "Nama variabel `tahunFromForm` memicu positif di audit; semantik = anchor konteks form.",
            "Rename ke `konteksTahunAngka` (nilai sama).",
        )

    if "sasaranlist.jsx" in f:
        if "filename:" in sn or "filename={`" in sn or "judul" in sn.lower():
            return (
                "PATCH SEKARANG",
                "Judul export non-periode masih memakai segmen `TAHUN` / nama file dengan `tahunJudul` saja.",
                "Selaraskan judul & nama file dengan periode/slug konteks.",
            )
        return ("AMAN", "Lainnya.", "BIARKAN")

    if "arahkebijakanstep.jsx" in f or "kegiatanstep.jsx" in f or "programstep.jsx" in f:
        if "useautoisitahundantarget" in sn.lower():
            return ("AMAN", "Hook auto-field wizard.", "BIARKAN")

    if "sasaranstep.jsx" in f or "strategistep.jsx" in f or "subkegiatanstep.jsx" in f:
        if "useautoisitahundantarget" in sn.lower():
            return ("AMAN", "Hook auto-field wizard.", "BIARKAN")

    if "usesteptemplateaddandai.js" in f:
        return ("AMAN", "Regresi capaian th. ke-5 — internal.", "BIARKAN")

    if "planningdokumenutils.js" in f:
        return ("AMAN", "Helper pemilihan periode (`nowYear`, `tahunStr`) — INTERNAL_TEKNIS.", "BIARKAN")

    return ("AMAN", "Ditutup sebagai non-UX / internal setelah review aturan di atas.", "BIARKAN")


def main():
    rows_out = []
    for row in BACK:
        f = norm_file(row["file"])
        dec, why, act = decide(row)
        rows_out.append(
            {
                "file": f,
                "line": row["line"],
                "snippet": row["snippet"][:200],
                "keputusan": dec,
                "alasan": why,
                "tindakan": act,
            }
        )

    lines = [
        "# Keputusan final backlog audit (UNKNOWN / PERLU VALIDASI)",
        "",
        "| Nama File | Lokasi | Cuplikan | Keputusan Final | Alasan | Tindakan |",
        "|-----------|--------|----------|-----------------|--------|----------|",
    ]
    for r in rows_out:
        esc = (
            r["snippet"]
            .replace("|", "\\|")
            .replace("\n", " ")
        )
        lines.append(
            f"| `{r['file']}` | {r['line']} | {esc} | {r['keputusan']} | {r['alasan']} | {r['tindakan']} |"
        )
    (ROOT / "audit-backlog-keputusan-final.md").write_text("\n".join(lines), encoding="utf-8")

    patch = [r for r in rows_out if r["keputusan"] == "PATCH SEKARANG"]
    print("PATCH SEKARANG:", len(patch))
    for r in patch:
        print(r["file"], r["line"])


if __name__ == "__main__":
    main()
