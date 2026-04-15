# Document Engine — dokumen Renja OPD & RKPD resmi (ePelara)

Dokumen ini memetakan **struktur bab**, **sumber data**, dan **perbedaan** antara data internal, preview, dan dokumen resmi.

## Tiga lapisan output

| Lapisan | Arti | Endpoint / UI |
|--------|------|----------------|
| **Data internal** | Baris `renja_item` / `rkpd_item`, FK, log teknis | Halaman kelola item |
| **Preview dokumen** | Ringkasan tabel via `html-to-docx` / pdfkit ringkas, berlabel preview | `POST .../generate-docx`, `.../generate-pdf` |
| **Dokumen resmi** | BAB terstruktur, OOXML `docx`, PDF terstruktur (Document Engine) | `POST .../generate-official-docx`, `.../generate-official-pdf` |

## Renja OPD — struktur bab

| BAB | Isi | Sumber data | Tabel / field |
|-----|-----|-------------|----------------|
| **I Pendahuluan** | Latar, ruang lingkup, tahun, PD, periode | Boilerplate + `renja_dokumen` | `renja_dokumen.judul`, `tahun`, `periode_id` → `periode_rpjmds`; `perangkat_daerah_id` → `perangkat_daerah` |
| | Narasi kustom (opsional) | Override | `renja_dokumen.text_bab1` |
| **II Evaluasi Renja tahun lalu** | Ringkasan capaian/pagu tahun sebelumnya | Dokumen Renja tahun `tahun−1` sama PD & periode; atau narasi manual | Query `renja_dokumen` + `renja_item`; `text_bab2` |
| **III Tujuan & sasaran PD** | Acuan strategis PD | `renstra_pd_dokumen`; tujuan dari `renstra_tujuan` jika `renstra_opd_id` terisi | `renstra_pd_dokumen`, `renstra_tujuan.renstra_id` = `renstra_opd_id` |
| **IV Rencana kerja & pendanaan** | Program–kegiatan–sub, indikator, target, pagu | Baris rencana tahun berjalan | `renja_item.*` |
| **V Penutup** | Penutup standar | Boilerplate | `text_bab5` opsional |

**Relasi utama:** `renja_dokumen` → `renstra_pd_dokumen`, `rkpd_dokumen` (opsional), `perangkat_daerah`, `periode_rpjmds`; `renja_item.renja_dokumen_id`.

## RKPD — struktur bab (engine)

| BAB | Isi | Sumber |
|-----|-----|--------|
| I | Pendahuluan | `rkpd_dokumen`, `periode_rpjmds` |
| II | Analisis kondisi & kebijakan | Judul/status dokumen + placeholder narasi |
| III | Prioritas pembangunan | Agregat unik `rkpd_item.prioritas_daerah` |
| IV | Program, kegiatan, pendanaan | `rkpd_item` |
| V | Penutup | Boilerplate |

## Data uji vs operasional

- Kolom **`is_test`** pada `perangkat_daerah`, `renstra_pd_dokumen`, `rkpd_dokumen` (default `false`).
- Referensi dropdown: `WHERE is_test = false` kecuali `?include_test=1`.
- Heuristik judul/kode tetap sebagai cadangan untuk baris lama.
- Skrip `scripts/smoke-planning-api-temp.js` menandai baris smoke dengan `is_test` / update pasca-API.

## File implementasi

- `backend/services/planningOfficialDocumentEngine.js` — generator resmi (DOCX `docx`, PDF `pdfkit`).
- `backend/services/planningDocumentExportService.js` — preview (html-to-docx).
- `backend/migrations/20260411140000-planning-is-test-and-official-narrative.js`

## Yang belum otomatis penuh

- Evaluasi BAB II mendalam (capaian kinerja, realisasi anggaran) memerlukan integrasi **monev / LAKIP / DPA** atau input manual `text_bab2`.
- Penyesuaian **format perda/perkada** setempat (kop surat, halaman pengesahan) — tambah template Word terpisah atau field metadata pengesahan.
- **Paraf digital** / TTE tidak termasuk dalam generator ini.

## Bukti format Word

Unduh **Dokumen resmi (Word)** dari UI; berkas berawalan `renja-opd-resmi-*.docx` / `rkpd-resmi-*.docx` — berisi heading OOXML dan tabel, **bukan** HTML tunggal seperti preview.
