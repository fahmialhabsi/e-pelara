# Sprint 3 — Kontrak widget / panel dashboard (RKPD & Renja v2)

## Audit singkat Dashboard Renstra (referensi UX)

| Elemen | Pola yang diadopsi |
|--------|---------------------|
| Layout | `container-fluid` + **sidebar kiri** (`col-lg-3`) + **konten** (`col-lg-9`) — `RenstraDashboard` + `DashboardLayout` |
| Header | Judul + subtitle (OPD / periode) + badge konteks |
| Kartu ringkasan | `Row` / `Col`, `Card` dengan `border-top border-4 border-{color}` |
| Statistik klik | Renstra: kartu angka menuju modul — RKPD/Renja: fokus ringkasan v2 |
| Ringkasan pagu | Blok terpisah dengan format Rupiah |
| Footer info | Card `bg-light` dengan disclaimer |

---

## Dashboard RKPD — widget → endpoint → stabilitas

| Panel / widget | Endpoint | Tabel / sumber | Stabilitas | Risiko salah tafsir |
|----------------|----------|----------------|----------|---------------------|
| Header & konteks periode | — (picker dokumen + `usePeriodeAktif`) | `periode_rpjmds` (via ID) | Stabil (ID) | — |
| Kartu: dokumen / item / pagu / turunan Renja | `GET /api/rkpd/dashboard-v2` | `rkpd_dokumen`, `rkpd_item`, `renja_dokumen`, `renja_rkpd_item_map` | Semi | Pagu = derivasi/teks, bukan APBD |
| Status draft/review/final | sama | `rkpd_dokumen.status` | Stabil enum | — |
| Progress bar mapping → Renja | sama | hitung map per `rkpd_item` | Semi | Item bisa belum wajib map menurut bisnis |
| Distribusi pagu per dokumen | sama | agregasi `pagu` per dokumen | Semi | — |
| Panel audit | `GET /api/audit/perencanaan-consistency` | logika domain | Semi | False positive |
| Accordion **legacy** + `RkpdTable` | `GET /api/rkpd` (useRkpdData) | tabel **legacy** `rkpd` | Legacy | **Jangan** jumlahkan dengan kartu v2 |

---

## Dashboard Renja — widget → endpoint → stabilitas

| Panel / widget | Endpoint | Tabel / sumber | Stabilitas | Risiko salah tafsir |
|----------------|----------|----------------|----------|---------------------|
| Kartu ringkasan | `GET /api/renja/dashboard-v2` | `renja_dokumen`, `renja_item`, `renja_rkpd_item_map`, join PD/RKPD/Renstra PD | Semi | — |
| Status & progress mapping RKPD | sama | map 1:1 item | Semi | — |
| Tabel identitas & referensi | sama | teks judul + FK | Semi | RKPD opsional (`rkpd_dokumen_id` null) |
| Kolom **legacy bridge** | sama | `legacy_renja_id` | **Label legacy** | Bukan pagu Renja v2 |
| Peringatan audit | `GET /api/audit/perencanaan-consistency` | aturan domain | Semi | — |
| Distribusi pagu (kartu) | sama | `renja_item.pagu` | Semi | Bukan realisasi |
| Accordion **legacy** `ListRenjaOPD` | API renja legacy (`renjaApi`) | tabel **`renja`** | Legacy | Terpisah dari v2 |

---

## Panel stabil vs semi-stabil (ringkas)

- **Stabil:** enum `status` dokumen v2, FK IDs, jumlah dokumen (count) pada filter yang dipakai.
- **Semi-stabil:** total pagu, persentase mapping, peringatan audit, judul referensi.
- **Legacy (berlabel):** isi accordion RKPD/Renja lama.

---

## Gap UI / data tersisa

- Tidak ada grafik time-series; distribusi pagu sebagai kartu/grid.
- Filter PD khusus di Renja (query `perangkat_daerah_id`) belum diekspos di UI — bisa ditambah.
- Endpoint audit memindai global; filter per-dokumen di UI hanya client-side.
