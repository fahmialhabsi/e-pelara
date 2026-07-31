# -*- coding: utf-8 -*-
"""
Ekstraksi Tabel C-1, C-2, C-3, dan C-6 dari Lampiran Permendagri 14/2026
menjadi berkas JSON yang di-commit ke repo, lalu di-seed ke basis data oleh
`node scripts/seedPermendagri14TabelC.js`.

Mengapa dipisah dua langkah:
  Tabel C adalah lampiran referensi nasional pada satu dokumen regulasi yang
  tidak berubah. Ekstraksinya cukup dilakukan sekali, jadi produksi tidak perlu
  bergantung pada Python maupun parser PDF. Berkas JSON hasilnya bisa ditinjau
  dan di-diff seperti kode — penting untuk data yang berasal dari regulasi.

Tabel C-4, C-5, dan C-7 sengaja TIDAK diekstrak: itu versi Kabupaten/Kota,
sedangkan ePeLARA dipakai pemerintah provinsi.

Cara pakai (butuh pdfplumber):
    python scripts/extract_permendagri14_tabel_c.py \
        "../dokumenEPelara/29. Permendagri No. 14 Tahun 2026.pdf" \
        seeders/data/permendagri14-tabel-c.json
"""

import json
import os
import re
import sys

import pdfplumber

# Batas halaman diverifikasi dengan memindai judul "Tabel C - N" per halaman.
RENTANG = {
    "c1": (29, 29),
    "c2": (30, 37),
    "c3": (38, 40),
    "c6": (53, 64),
}

RE_KODE = re.compile(r"\d\.\d{2}\.\d{2}\.\d\.\d{2}\.\d{3,4}")
# Kolom "Proyek/Kegiatan" pada Tabel C-1 diberi nomor "1)", "2)", dst.
RE_NOMOR_PROYEK = re.compile(r"^\s*\d+\s*\)\s*")


def rapikan(sel):
    """Satukan teks sel yang terpecah baris; kembalikan None bila kosong."""
    if sel is None:
        return None
    teks = re.sub(r"\s+", " ", str(sel)).strip()
    return teks or None


def baris_header(sel_pertama, sel_semua):
    """Baris judul kolom dan baris penomoran "(1) (2) ..." harus dibuang."""
    depan = (sel_pertama or "").strip().upper().rstrip(".")
    if depan in {"NO", "NOMOR"}:
        return True
    padat = [s for s in sel_semua if s]
    if padat and all(re.fullmatch(r"\(\d+\)", s) for s in padat):
        return True
    return False


def sambung_ke_sel_terbuka(hasil, kolom, teks):
    """
    Tempelkan potongan teks ke sel terakhir yang masih terbuka PADA KOLOM YANG
    SAMA — bukan ke baris tepat sebelumnya — karena sel bergabung (mis. kolom
    Asta Cita pada Tabel C-6) bisa bermula belasan baris di atas.
    Mengembalikan True bila berhasil disambung.
    """
    for sebelum in reversed(hasil):
        if kolom < len(sebelum["sel"]) and sebelum["sel"][kolom]:
            sebelum["sel"][kolom] = f'{sebelum["sel"][kolom]} {teks}'
            return True
    return False


def ambil_baris_tabel(pdf, hal_awal, hal_akhir, kolom_kode=None, kolom_grup=()):
    """
    Kumpulkan baris mentah seluruh halaman sebuah tabel, header dibuang.

    Isi sel yang terpotong pergantian halaman disambung kembali. Ada dua bentuk:

    1. Seluruh baris adalah ekor — baris data pertama sebuah halaman tanpa nomor
       maupun kode subkegiatan. Semua selnya ditempelkan ke atas, barisnya
       dibuang.
    2. Barisnya data baru (punya kode sendiri) tetapi SEBAGIAN selnya masih ekor
       dari halaman sebelumnya. Ini dikenali dari teks yang diawali huruf kecil
       atau tanda kurung buka; pada tabel-tabel ini nilai sel yang sebenarnya
       selalu diawali huruf kapital. Potongannya disambung ke atas lalu selnya
       dikosongkan agar diisi ulang oleh mekanisme isi-turun.

    Tanpa penanganan kedua, indikator seperti "Rasio Jumlah Cadangan Beras
    Pemerintah Daerah (CBPD) terhadap Target ..." akan tercatat terbelah dua.
    """
    hasil = []
    for nomor in range(hal_awal, hal_akhir + 1):
        halaman = pdf.pages[nomor - 1]
        baris_pertama_halaman = True
        for tabel in halaman.extract_tables():
            for mentah in tabel:
                sel = [rapikan(c) for c in mentah]
                if not any(sel):
                    continue
                if baris_header(sel[0], sel):
                    continue

                awal_halaman_lanjutan = baris_pertama_halaman and nomor > hal_awal and hasil
                baris_pertama_halaman = False

                if awal_halaman_lanjutan:
                    kode = (
                        sel[kolom_kode]
                        if kolom_kode is not None and kolom_kode < len(sel)
                        else None
                    )
                    punya_kode = bool(kode and RE_KODE.fullmatch(kode))

                    if not sel[0] and not punya_kode:
                        # Bentuk 1: seluruh baris adalah ekor sel.
                        tersambung = True
                        for j, teks in enumerate(sel):
                            if teks and not sambung_ke_sel_terbuka(hasil, j, teks):
                                # Tidak ada sel terbuka di kolom itu — jangan
                                # buang barisnya supaya teks tidak hilang.
                                tersambung = False
                        if tersambung:
                            continue
                    else:
                        # Bentuk 2: baris data baru dengan sebagian sel ekor.
                        for j in kolom_grup:
                            if j < len(sel) and sel[j] and re.match(r"^[a-z(]", sel[j]):
                                if sambung_ke_sel_terbuka(hasil, j, sel[j]):
                                    sel[j] = None

                hasil.append({"halaman": nomor, "sel": sel})
    return hasil


def isi_turun(sel, sebelumnya, indeks_gabung):
    """
    Tiruan sel ter-merge: kolom pengelompokan yang kosong mewarisi nilai baris
    sebelumnya. Yang dikembalikan hanya salinan hasil isi-turun — `sel` asli
    tetap dipakai untuk menilai apakah baris ini benar-benar berisi.
    """
    penuh = list(sel)
    for i in indeks_gabung:
        if i < len(penuh) and not penuh[i] and i < len(sebelumnya):
            penuh[i] = sebelumnya[i]
    return penuh


def kode_bidang_urusan(kode):
    """"2.09.03.1.01.0006" -> "2.09" (kunci penyaring per bidang urusan OPD)."""
    if not kode:
        return None
    m = re.match(r"(\d\.\d{2})", kode)
    return m.group(1) if m else None


def extract_c1(pdf):
    """
    NO | Pro-SN | PROYEK/KEGIATAN — tata letak paling kacau di antara Tabel C:
    nama Pro-SN maupun teks proyek terpecah lintas kolom 2-3 DAN lintas beberapa
    baris fisik, sehingga tidak bisa dibaca baris-demi-baris.

    Kolom NO tidak bisa dijadikan jangkar: karena isi sel diratakan tengah
    secara vertikal, baris pertama sebuah sel kerap tercetak SATU BARIS DI ATAS
    penanda nomornya. Yang stabil justru penomoran "1)", "2)", ... di dalam teks
    proyek itu sendiri. Jadi seluruh potongan teks digabung menurut urutan baris
    lalu dipecah pada penanda tersebut.

    Nama Pro-SN dikelompokkan dengan jarak baris (potongan yang berdekatan =
    satu nama), lalu dipasangkan berurutan dengan kelompok yang penomoran
    proyeknya kembali ke "1)".
    """
    baris_tabel = ambil_baris_tabel(pdf, *RENTANG["c1"])

    potongan_teks = []
    potongan_pro_sn = []  # (idx, teks)
    for idx, baris in enumerate(baris_tabel):
        sel = baris["sel"] + [None] * (4 - len(baris["sel"]))
        if sel[1]:
            potongan_pro_sn.append((idx, sel[1]))
        for kolom in (2, 3):
            if sel[kolom]:
                potongan_teks.append(sel[kolom])

    arus = re.sub(r"\s+", " ", " ".join(potongan_teks)).strip()

    # Pecah pada "N)" sambil mempertahankan nomornya.
    bagian = re.split(r"(?=\b\d+\s*\))", arus)
    proyek = []
    for b in bagian:
        b = b.strip()
        m = re.match(r"^(\d+)\s*\)\s*(.+)$", b, re.S)
        if not m:
            continue
        proyek.append({"no_dalam_kelompok": int(m.group(1)), "teks": m.group(2).strip()})

    # Kelompokkan potongan nama Pro-SN berdasarkan kedekatan baris.
    nama_kelompok = []
    for idx, teks in potongan_pro_sn:
        if nama_kelompok and idx - nama_kelompok[-1]["idx_akhir"] <= 2:
            nama_kelompok[-1]["bagian"].append(teks)
            nama_kelompok[-1]["idx_akhir"] = idx
        else:
            nama_kelompok.append({"idx_akhir": idx, "bagian": [teks]})
    nama_kelompok = [
        re.sub(r"\s+", " ", " ".join(k["bagian"])).strip() for k in nama_kelompok
    ]

    keluaran = []
    kelompok_ke = -1
    for p in proyek:
        if p["no_dalam_kelompok"] == 1:
            kelompok_ke += 1
        pro_sn = nama_kelompok[kelompok_ke] if 0 <= kelompok_ke < len(nama_kelompok) else None
        keluaran.append(
            {
                "no": len(keluaran) + 1,
                "pro_sn": pro_sn,
                "proyek_kegiatan": p["teks"],
                "urutan": len(keluaran) + 1,
            }
        )

    if len(nama_kelompok) != kelompok_ke + 1:
        print(
            f"  [C-1] PERINGATAN: {len(nama_kelompok)} nama Pro-SN vs "
            f"{kelompok_ke + 1} kelompok penomoran — periksa hasilnya.",
            file=sys.stderr,
        )
    return keluaran


# C-2: No. | Pro-SN | Proyek/Kegiatan | Outcome | Indikator | Satuan |
#      Pengampu Bidang Urusan Utama | Bidang Urusan Terkait | Program | Kode | Sub Kegiatan
C2_GABUNG = [0, 1, 2, 3, 4, 5, 6, 7, 8]


def extract_c2(pdf):
    keluaran = []
    sebelumnya = []
    for baris in ambil_baris_tabel(pdf, *RENTANG["c2"], kolom_kode=9, kolom_grup=C2_GABUNG):
        sel = baris["sel"]
        if len(sel) < 11:
            sel = sel + [None] * (11 - len(sel))
        penuh = isi_turun(sel, sebelumnya, C2_GABUNG)
        sebelumnya = penuh
        if not any(sel):  # baris kosong murni
            continue
        kode = sel[9] if sel[9] and RE_KODE.fullmatch(sel[9]) else None
        # Baris yang tidak membawa kode maupun konten baru hanyalah luberan
        # sel ter-merge dari baris sebelumnya, bukan data.
        if not kode and not any(sel[i] for i in (1, 2, 3, 4, 8, 10)):
            continue
        keluaran.append(
            {
                "jenis": "pro_sn",
                "pro_sn": penuh[1],
                "proyek_kegiatan": penuh[2],
                "outcome": penuh[3],
                "indikator_outcome": penuh[4],
                "satuan": penuh[5],
                "pengampu_bidang_urusan_utama": penuh[6],
                "bidang_urusan_terkait": penuh[7],
                "program": penuh[8],
                "kode": kode,
                "sub_kegiatan": sel[10],
                "kode_bidang_urusan": kode_bidang_urusan(kode),
                "urutan": len(keluaran) + 1,
            }
        )
    return keluaran


# C-3: No. | Tematik Pembangunan | Outcome | Indikator | Satuan |
#      Pengampu Bidang Urusan Utama | Bidang Urusan Terkait | Program | Kode | Sub Kegiatan
C3_GABUNG = [0, 1, 2, 3, 4, 5, 6, 7]


def extract_c3(pdf):
    keluaran = []
    sebelumnya = []
    for baris in ambil_baris_tabel(pdf, *RENTANG["c3"], kolom_kode=8, kolom_grup=C3_GABUNG):
        sel = baris["sel"]
        if len(sel) < 10:
            sel = sel + [None] * (10 - len(sel))
        penuh = isi_turun(sel, sebelumnya, C3_GABUNG)
        sebelumnya = penuh
        if not any(sel):
            continue
        kode = sel[8] if sel[8] and RE_KODE.fullmatch(sel[8]) else None
        if not kode and not any(sel[i] for i in (1, 2, 3, 7, 9)):
            continue
        keluaran.append(
            {
                "jenis": "tematik",
                "tematik_pembangunan": penuh[1],
                "outcome": penuh[2],
                "indikator_outcome": penuh[3],
                "satuan": penuh[4],
                "pengampu_bidang_urusan_utama": penuh[5],
                "bidang_urusan_terkait": penuh[6],
                "program": penuh[7],
                "kode": kode,
                "sub_kegiatan": sel[9],
                "kode_bidang_urusan": kode_bidang_urusan(kode),
                "urutan": len(keluaran) + 1,
            }
        )
    return keluaran


# C-6: NO | ASTA CITA | BIDANG URUSAN | OUTCOME PRIORITAS | INDIKATOR |
#      SATUAN | PROGRAM | KODE SUBKEGIATAN | SUBKEGIATAN
C6_GABUNG = [0, 1, 2, 3, 4, 5, 6]


def extract_c6(pdf):
    keluaran = []
    sebelumnya = []
    no_baris = None
    for baris in ambil_baris_tabel(pdf, *RENTANG["c6"], kolom_kode=7, kolom_grup=C6_GABUNG):
        sel = baris["sel"]
        if len(sel) < 9:
            sel = sel + [None] * (9 - len(sel))
        penuh = isi_turun(sel, sebelumnya, C6_GABUNG)
        sebelumnya = penuh
        if not any(sel):
            continue
        # Kolom NO Tabel C-6 adalah nomor urut baris, bukan nomor Asta Cita.
        if sel[0] and re.fullmatch(r"\d+", sel[0]):
            no_baris = int(sel[0])
        kode = sel[7] if sel[7] and RE_KODE.fullmatch(sel[7]) else None
        if not kode and not any(sel[i] for i in (1, 2, 3, 4, 6, 8)):
            continue
        keluaran.append(
            {
                "no_baris_c6": no_baris,
                "asta_cita": penuh[1],
                "bidang_urusan": penuh[2],
                "outcome_prioritas": penuh[3],
                "indikator": penuh[4],
                "satuan": penuh[5],
                "program": penuh[6],
                "kode_subkegiatan": kode,
                "subkegiatan": sel[8],
                "kode_bidang_urusan": kode_bidang_urusan(kode),
                "urutan": len(keluaran) + 1,
            }
        )
    return keluaran


def main():
    if len(sys.argv) < 3:
        print(__doc__)
        return 1
    sumber, tujuan = sys.argv[1], sys.argv[2]

    with pdfplumber.open(sumber) as pdf:
        data = {
            "sumber": os.path.basename(sumber),
            "regulasi": "Permendagri Nomor 14 Tahun 2026",
            "keterangan": (
                "Tabel C-1/C-2/C-3/C-6 Lampiran Permendagri 14/2026 "
                "(Kesepakatan Rakortekbang Tahun 2026, jenjang Provinsi). "
                "Tabel C-4/C-5/C-7 tidak disertakan karena berlaku untuk "
                "Kabupaten/Kota."
            ),
            "halaman": {k: list(v) for k, v in RENTANG.items()},
            "c1_pro_sn_master": extract_c1(pdf),
            "c2_dukungan_pro_sn": extract_c2(pdf),
            "c3_dukungan_tematik": extract_c3(pdf),
            "c6_outcome_asta_cita": extract_c6(pdf),
        }

    os.makedirs(os.path.dirname(tujuan), exist_ok=True)
    with open(tujuan, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        f.write("\n")

    for kunci in ("c1_pro_sn_master", "c2_dukungan_pro_sn", "c3_dukungan_tematik", "c6_outcome_asta_cita"):
        baris = data[kunci]
        berkode = sum(1 for b in baris if b.get("kode") or b.get("kode_subkegiatan"))
        print(f"{kunci:24s} : {len(baris):4d} baris ({berkode} berkode subkegiatan)")
    print("ditulis ke", tujuan)
    return 0


if __name__ == "__main__":
    sys.exit(main())
