# Fase 5 — Investigasi & Rencana Migrasi `exportDocx()` ke `docx` Native

**Sifat:** Investigasi & perencanaan murni. **Tidak ada kode ditulis.**
**Tujuan:** Mengatasi Masalah B (`FASE1B-CSS-INLINE.md`) — `html-to-docx` tidak punya cara apa pun untuk mengatur lebar kolom tabel custom (dibuktikan lewat source code, bukan asumsi, lihat §3), sehingga semua tabel di DOCX LAKIP saat ini rata sama lebar.

**Rekomendasi ringkas (detail di §5):** **TUNDA.** Bukan karena tidak bisa dikerjakan — secara teknis bisa (docx-native sudah dipakai & terbukti jalan untuk PK) — tapi effort **BESAR** (estimasi 1.500-2.000+ baris kode baru/refactor) untuk benefit yang **murni kosmetik** (lebar kolom kurang proporsional; data/border/warna/bold sudah benar sejak Fase 1b), dengan risiko nyata meregresi konsistensi PDF/DOCX yang baru saja susah payah dicapai di Fase 1. Kalau dikerjakan, rekomendasi pendekatannya ada di §5 — bukan migrasi total naif, tapi lewat "document model" perantara.

---

## 1. Inventarisasi scope — semua tabel di `buildHtml()` + Lampiran

### Tabel di dokumen utama LAKIP (`lakipGeneratorController.js`)

| # | Tabel | Kolom | Baris | Struktur | Kompleksitas migrasi |
|---|---|---|---|---|---|
| 1 | `indikatorTableHtml()` — dipakai di 6 titik pemanggilan berbeda (Sasaran/Program/Kegiatan level dalam hierarki, + orphan + IKU + IKK) | 6 (Indikator, Satuan, Target, Realisasi, Capaian, Status) | Dinamis per level | **Flat**, tapi dipanggil **rekursif bersarang 4 level** (Tujuan→Sasaran→Program→Kegiatan) diselingi heading `<h4>-<h6>` di antaranya — di data uji Fase 2/3 menghasilkan **~30+ instance tabel nyata** dalam satu dokumen | 🔴 **Tinggi** — bukan karena tabelnya rumit (flat, tanpa rowspan/colspan), tapi karena logika interleaving "heading → tabel → heading anak → tabel anak → ..." 4 tingkat harus ditulis ulang total pakai array `children` docx (urutan Paragraph/Table campur, bukan template string) |
| 2 | Perjanjian Kinerja (Bab II.B) | 5 (No, Sasaran Strategis, Indikator Kinerja, Satuan, Target) | Dinamis (≈6 di data uji) | Flat | 🟢 Rendah |
| 3 | Rincian Realisasi Program dan Kegiatan (Bab III.B) | 7 (No, Program, Kegiatan, Indikator, Target, Realisasi, Evaluasi) | Dinamis (97 di data uji — tabel `lakip`) | Flat, tapi **paling butuh** lebar kolom proporsional (kolom "Evaluasi" teksnya panjang) — inilah tabel yang paling terlihat rusak akibat Masalah B | 🟢 Rendah (tapi paling bernilai kalau dikerjakan) |
| 4 | Realisasi Anggaran (Bab III.C) | 4 (Uraian, Pagu, Realisasi, %) | 1 (statis, level OPD) | Flat, sederhana | 🟢 Rendah |
| 5 | Analisis Efisiensi (Bab III.D) | 4 (Program/Kegiatan, %Kinerja, %Anggaran, Status) | Dinamis (16 di data uji) | Flat + badge warna (span berwarna di 1 sel) | 🟢 Rendah |
| 6 | Daftar Isi (tabel 1-kolom, sekadar indentasi) | 1 | Statis (~20 baris) | Bukan tabel data sungguhan — di docx-native ini SEHARUSNYA jadi `Paragraph` dengan `indent`, bukan `Table` sama sekali | 🟢 Trivial (malah lebih sederhana di docx-native) |
| 7 | `renderRenstraTabel()` — dipakai di 4 titik (Latar Belakang/Tusi/Sumber Daya/Isu Strategis, tiap kali ada `tables[]` di JSON `renstra_bab`) | **Dinamis, arbitrary** — kolom datang langsung dari `t.columns` di JSON DB (bisa 2 kolom seperti "Tabel Sarana Prasarana", bisa lebih) | Dinamis, arbitrary | Flat, tapi **skema kolom tidak diketahui saat build-time** — ditentukan isi database, bisa beda-beda per OPD/tahun Renstra | 🔴 **Tinggi** — builder docx-native untuk tabel arbitrary-kolom harus digeneralisir (loop `columns.map()` bukan hardcode nama field seperti pola `lakipPkDocxService.js`), dan harus tetap tangguh kalau `tables` kosong/null |
| 8 | Tab-separated ad-hoc table di `renderRenstraTeks()` (mis. "Status Kepegawaian"/"Jenis Jabatan"/"Tingkat Pendidikan" di subbagian E Bab I, Fase 2) | **Tidak diketahui sama sekali** — dideteksi runtime dari baris teks bebas yang kebetulan mengandung tab, tanpa header/kolom terdefinisi | Arbitrary | Freeform, tanpa metadata struktur apa pun | 🔴 **Sangat tinggi / tidak realistis digeneralisir** — ini literally "parse teks bebas jadi tabel", tidak ada skema untuk dipetakan ke `docx.Table` yang butuh definisi kolom eksplisit |
| 9 | Lampiran 2 — Pengukuran Kinerja (Fase 3) | 6 (No, Sasaran, Indikator, Target, Realisasi, Capaian%) | Dinamis (35 di data uji) | Flat | 🟢 Rendah |

### Tabel di Lampiran 1 (reuse `buildPkHtml()`, `lakipPkExportService.js`)

| # | Tabel | Kolom | Baris | Kompleksitas |
|---|---|---|---|---|
| 10 | `outputSasaranSections` — tabel key-value Output/Realisasi/Target/Bukti Ukur | 2 (label, value) | 4 baris tetap, **1 instance per Sasaran Teknis** (dinamis jumlahnya) | 🟢 Rendah (pola sama seperti `makeKeyValueBox` yang sudah ada di `lakipPkDocxService.js`) |
| 11 | Tanda tangan PIHAK PERTAMA/KEDUA | 2×3, tanpa border | Statis | 🟢 Rendah (persis pola yang SUDAH ADA di `lakipPkDocxService.js`) |
| 12 | LAMPIRAN: INDIKATOR KINERJA UTAMA | 4 (No, Sasaran Strategis, Indikator Kinerja, Target) | Dinamis | 🟢 Rendah (**sudah ada implementasinya**: `makeKeyValueLampiranTable`) |
| 13 | Program & Anggaran | 3 (No, Program, Jumlah Anggaran) | Dinamis | 🟢 Rendah (**sudah ada implementasinya**: `makeProgramAnggaranTable`) |

**Catatan penting soal Lampiran 1:** kalau LAKIP bermigrasi ke docx-native, tabel #10-13 **TIDAK PERLU ditulis ulang dari nol** — tinggal reuse `buildPkDocxBuffer()` punya `lakipPkDocxService.js` (fungsi ini sudah menghasilkan `children` array docx-native lengkap untuk seluruh dokumen PK termasuk ke-4 tabel ini). Yang dibutuhkan hanya extract `children`-nya (perlu refactor kecil di `lakipPkDocxService.js`: pisahkan logika "bangun array children" dari `Packer.toBuffer(doc)` supaya bisa dipakai ulang sebagai potongan, mirip pola `demoteHeadings`/`extractBodyInner` yang sudah dibuat di Fase 3 untuk jalur HTML).

**Total: 13 tabel/pola tabel berbeda**, di mana 4 di antaranya (#10-13, Lampiran 1) **sudah punya implementasi docx-native siap pakai**, 7 tergolong sederhana (flat, effort kecil per tabel), dan 2 (#1 hierarki bersarang, #8 tab-separated freeform) tergolong signifikan/berisiko.

---

## 2. Preseden `lakipPkDocxService.js` — bisa direuse langsung?

**Dibaca penuh (444 baris).** Terbagi 2 lapis:

### Lapis 1 — Helper generik, **REUSABLE LANGSUNG** (≈90 baris: `makeText`, `makeParagraph`, `makeTitle`, `makeHeading`, `makeSpacer`, `makeTableCell`, `makeLabelParagraph`, `fmtRp`, `fmtPct`, `fmtTanggalIndo`, `paragraphsFromMultiline`)
Tidak ada logika spesifik-PK di lapis ini — signature-nya generik (`text, options`). Bisa dipindah ke module bersama (mis. `docxNativeHelpers.js`) dan dipakai LAKIP maupun PK tanpa modifikasi.

**Bukti konkret ini menjawab Masalah B**: `makeTableCell(text, { width, alignment })` pakai `width: { size: N, type: WidthType.PERCENTAGE }` — **kontrol lebar kolom custom per sel, persis yang tidak bisa dilakukan `html-to-docx`.** Ini sudah dipakai & terbukti jalan (PK sudah production, per `lakipPkExportController.js`).

### Lapis 2 — Table builder & document assembly, **SPESIFIK-PK, TIDAK REUSABLE**
`makeKeyValueBox`, `makeKeyValueLampiranTable`, `makeProgramAnggaranTable`, dan seluruh `buildPkDocxBuffer()` (baris 194-442, ~250 baris) — nama kolom, urutan Pasal 1-6, struktur PIHAK PERTAMA/KEDUA semuanya hardcode untuk dokumen PK. **Nol dari ini yang langsung cocok untuk struktur LAKIP** (Bab I-IV + hierarki Tujuan→Kegiatan + Lampiran) — harus ditulis baru, meski POLA-nya (bikin array `TableRow`, header row + data row map, fallback row kalau kosong) bisa dicontoh 1:1.

### Estimasi effort adaptasi realistis

- **Helper generik**: reuse langsung, ~0 effort tambahan (paling banter ekstrak ke file bersama, <1 jam).
- **Table builder LAKIP baru** (7 tabel sederhana #2-6,9 + Lampiran 2): masing-masing ~30-60 baris (mengikuti pola `makeKeyValueLampiranTable`) → **~250-350 baris total**, effort **kecil-sedang** per tabel, tapi 7-8 tabel × testing masing-masing = akumulasi waktu nyata.
- **Hierarki indikator bersarang (#1)**: ini BUKAN sekadar "table builder baru" — perlu fungsi rekursif yang menyisipkan `Paragraph` (heading level 4-6, dengan indentasi berjenjang) dan `Table` bergantian ke dalam SATU array `children` flat sesuai kedalaman Tujuan→Sasaran→Program→Kegiatan. Ini pola BARU yang tidak ada presedennya di `lakipPkDocxService.js` sama sekali (PK tidak punya struktur bersarang serupa). **Estimasi ~150-250 baris, effort sedang-tinggi**, perlu extra testing karena rekursi + banyak edge case (level kosong, indikator orphan, dst — semua yang sudah diverifikasi ketat di Fase 2/3 untuk jalur HTML harus diverifikasi ULANG di sini).
- **`renderRenstraTabel()` generik-kolom (#7)** dan **tab-separated freeform (#8)**: perlu desain baru sepenuhnya (bukan adaptasi) karena skema kolom tidak diketahui di build-time. **Estimasi ~100-150 baris untuk #7** (masih mungkin, kolom sudah terstruktur di JSON `t.columns`/`t.tabel`), tapi **#8 secara realistis TIDAK BISA digeneralisir dengan baik** — kalau dipaksa, hasilnya kemungkinan besar tetap fallback ke tampilan teks datar (kehilangan bentuk tabel sama sekali), sama seperti risiko yang sudah diketahui.
- **Perubahan di `buildHtml()`/`collectLakipData()` sendiri** untuk menghasilkan struktur data yang bisa dikonsumsi 2 renderer (lihat §5): ini bagian TERBESAR effort-nya, bukan tabelnya sendiri.

**Total estimasi kasar (lihat §5 untuk breakdown effort per pendekatan): 1.500-2.000+ baris kode baru/refactor**, dominan effort ada di restrukturisasi cara `buildHtml()` membangun dokumen (bukan di teknik dasar membuat tabel docx, yang sudah terbukti gampang lewat preseden PK).

---

## 3. Strategi migrasi — evaluasi kedua opsi

### Opsi (b) — migrasi tabel saja, campur `docx.Table` manual ke dalam alur `html-to-docx`

**Dicek langsung source code `html-to-docx` v1.7.0 (bukan asumsi) — TIDAK MEMUNGKINKAN.**

API publiknya cuma 1 fungsi: `HTMLtoDOCX(htmlString, headerHTMLString, documentOptions, footerHTMLString) → Promise<Buffer>` (dikonfirmasi dari `README.md` & pemakaian nyata di `lakipExportController.js`). Tidak ada parameter atau hook untuk menyisipkan objek `docx.Table` mentah, tidak ada opsi "insert raw XML fragment", tidak ada fungsi "merge dua buffer docx". Cuma terima HTML string, keluarkan buffer docx utuh — black box penuh.

**Satu-satunya cara teknis yang secara teori bisa** (TIDAK direkomendasikan): generate 2 dokumen docx terpisah (1 dari `html-to-docx` untuk konten non-tabel, 1 dari `docx`-native untuk tabel), lalu unzip keduanya dan **string-replace fragmen XML `<w:tbl>...</w:tbl>`** dari hasil docx-native ke posisi placeholder di `document.xml` hasil html-to-docx. Ini "bedah XML manual" tanpa dukungan library sama sekali — berisiko tinggi menghasilkan file `.docx` korup/tidak bisa dibuka (relationship ID, numbering ID, style ID bisa bentrok antar dua dokumen yang di-generate independen), dan setiap update salah satu library berpotensi mematahkan asumsi format XML yang dipakai. **Tidak layak dijadikan pendekatan produksi** — disebutkan di sini murni supaya jelas sudah dicek, bukan diabaikan tanpa alasan.

**Kesimpulan Opsi (b): mati langkah secara teknis (tanpa hack tak-didukung).**

### Opsi (a) — migrasi total, `buildDocxNative()` terpisah

**Secara teknis paling mungkin** (sudah terbukti jalan untuk PK), tapi punya 2 varian dengan trade-off sangat berbeda:

**(a-1) Migrasi total naif** — `buildDocxNative()` baru yang independen, generate ulang seluruh isi LAKIP dari `data` (hasil `collectLakipData()`) langsung ke objek `docx`, TANPA lewat HTML sama sekali.
- ✅ Effort paling kecil DIBANDING (a-2) — tinggal tulis 1 fungsi baru, tidak perlu re-arsitektur `buildHtml()`.
- ❌ **Mengembalikan LAKIP ke kondisi SEBELUM Fase 1**: PDF dari `buildHtml()`, DOCX dari `buildDocxNative()` — 2 sumber independen yang harus disinkronkan manual oleh developer setiap kali ada perubahan struktur (persis pola `buildPkHtml()`/`buildPkDocxBuffer()` di PK **HARI INI** — bukti hidup di codebase yang sama bahwa pola 2-sumber ini nyata risikonya: setiap kali PK berubah, ada 2 tempat yang harus diingat untuk diubah bersamaan, tidak ada mekanisme yang memaksa keduanya tetap sinkron).

**(a-2) Migrasi lewat "document model" perantara** (ide yang disebut di instruksi Anda) — refactor `collectLakipData()`+bagian pembangun-struktur `buildHtml()` supaya menghasilkan **1 struktur data/JSON perantara** (array section: heading/paragraf/tabel/dst, format-agnostic), lalu 2 "adapter" terpisah: `renderModelToHtml(model)` (dipakai jalur PDF, ganti `buildHtml()` yang sekarang) dan `renderModelToDocx(model)` (dipakai jalur DOCX, ganti `getHtml()`+`html-to-docx`).
- ✅ **Mempertahankan filosofi Fase 1** — 1 sumber kebenaran struktur (document model), bukan 2 dokumen independen. Kalau ada Bab baru/subbagian baru, cukup ubah 1 tempat (bagian yang membangun model), kedua adapter otomatis ikut.
- ❌ **Effort JAUH lebih besar** dari (a-1) — bukan cuma nulis 1 fungsi baru, tapi mendesain ulang REPRESENTASI dokumen itu sendiri (skema JSON section/heading/table/dst yang cukup ekspresif untuk semua 13 tabel + semua variasi Bab I-IV + Lampiran), lalu menulis ULANG `buildHtml()` yang sekarang (700+ baris template literal) supaya tidak lagi langsung menghasilkan string HTML tapi menghasilkan model itu, BARU kemudian 2 adapter membaca model tsb.

**Rekomendasi antar 2 varian ini, KALAU migrasi diputuskan jalan: (a-2), bukan (a-1).** (a-1) secara eksplisit mengulang pola yang SUDAH TERBUKTI berisiko di PK (2 sumber, harus disinkronkan manual) — memilih itu untuk LAKIP setelah 3 fase (1, 1b, 2) dihabiskan justru untuk MENGHILANGKAN pola itu akan jadi langkah mundur yang kontradiktif dengan tujuan proyek audit ini sendiri.

---

## 4. Risiko

| Risiko | Tingkat | Penjelasan |
|---|---|---|
| **Regresi konsistensi PDF vs DOCX** | 🔴 Tinggi (kalau pilih a-1) / 🟡 Sedang (kalau a-2, risiko digeser ke kompleksitas desain model, bukan hilang) | Ini persis masalah yang Fase 1 selesaikan dengan susah payah (termasuk nemu & fixing bug toolbar-bocor yang sempat lolos verifikasi Fase 1b — bukti bahwa sinkronisasi 2 jalur itu gampang meleset walau sudah hati-hati) |
| **Waktu development** | 🔴 Tinggi | Estimasi kasar 1.500-2.000+ baris (§2) — beberapa kali lipat total perubahan Fase 1+1b+2+3 digabung (yang sendiri sudah berlangsung berhari-hari lintas sesi) |
| **Testing coverage utk tabel kompleks** | 🔴 Tinggi | Hierarki indikator bersarang (#1) & tabel arbitrary-kolom (#7, #8) BELUM ADA presedennya sama sekali di `docx`-native — tidak seperti tabel flat sederhana yang tinggal contoh pola PK, ini harus dirancang dari nol DAN diverifikasi ulang dengan data nyata (pola yang sama seperti tiap Fase 1-4: generate ulang, cek `word/document.xml`, cek tidak ada NaN/data hilang) — untuk SEMUA kombinasi data (Kegiatan tanpa indikator, Renstra tanpa tabel 2.2, dst — semua edge case yang sudah ditangani jalur HTML di Fase 1-4 harus ditangani ulang) |
| **`renderRenstraTeks()` tab-separated freeform (#8)** | 🟡 Sedang, tapi TIDAK BISA DIHINDARI kalau migrasi total | Kemungkinan besar akan berakhir sebagai teks datar (bukan tabel sungguhan) di DOCX-native juga — kalaupun begitu, itu **BUKAN kemunduran** dari kondisi sekarang (di HTML/DOCX saat ini pun sudah rapuh, cuma auto-detect tab), tapi berarti sebagian benefit "semua tabel proporsional" tidak akan tercapai 100% |
| **Waktu regresi-test ulang seluruh Fase 1-4** | 🟡 Sedang | Migrasi DOCX menyentuh SATU-SATUNYA jalur yang sudah diverifikasi ketat berkali-kali (Bab order, NaN check, badge warna, dst) — setiap perubahan di sini berarti mengulang seluruh checklist verifikasi Fase 1-4 dari awal untuk DOCX |
| **`lakipPkDocxService.js` sendiri belum diaudit strukturnya** | 🟢 Rendah tapi relevan | PK sendiri MEMANG sudah 2-sumber (`buildPkHtml` vs `buildPkDocxBuffer`) — di luar scope audit LAKIP ini, tapi kalau migrasi LAKIP mengambil Lampiran 1 dari `buildPkDocxBuffer()`, drift risk PK juga ikut terwarisi ke LAKIP (kalau `buildPkHtml()` berubah suatu saat tapi `buildPkDocxBuffer()` lupa diupdate, Lampiran 1 di LAKIP PDF vs DOCX akan beda juga) |

---

## 5. Kesimpulan & rekomendasi

**Effort estimate keseluruhan: BESAR.** (bukan "sedang" — total scope 13 tabel + rearsitektur alur data + 2 tabel/pola yang secara teknis sulit/tidak realistis digeneralisir + kebutuhan re-verifikasi menyeluruh)

**Rekomendasi: TUNDA migrasi ini untuk sekarang.** Alasan:
1. Masalah B murni **kosmetik** (kolom rata, bukan data salah/hilang) — beda kelas dengan bug-bug yang sudah diperbaiki Fase 1/1b (crash, CSS bocor jadi teks, toolbar nongol) yang memang harus diperbaiki karena merusak fungsi dasar dokumen.
2. Effort besar (1.500-2.000+ baris) untuk benefit kosmetik saja tidak sepadan dibanding sisa prioritas lain (mis. Pernyataan Direviu/Lampiran sudah selesai Fase 3; kalau ada modul lain yang lebih butuh perhatian, itu ROI-nya lebih tinggi).
3. Risiko regresi ke pola 2-sumber yang justru baru saja dihilangkan dari LAKIP di Fase 1 — kalau salah pilih pendekatan (a-1), investasi 3 fase sebelumnya sebagian jadi sia-sia untuk jalur DOCX.

**Kalau nanti diputuskan tetap jalan**, urutan implementasi yang direkomendasikan (pendekatan a-2, document model):

1. **Desain skema document model** dulu (JSON: `{ type: 'heading'|'paragraph'|'table'|'pagebreak', level, text, columns, rows, ... }`) — cukup ekspresif untuk menampung SEMUA 13 tabel + semua variasi konten Bab I-IV. Validasi skema ini dengan cara "coba petakan 2-3 Bab yang sudah ada (mis. Bab II, Bab III.C) ke bentuk model dulu di atas kertas" sebelum nulis kode.
2. **Ekstrak helper generik** dari `lakipPkDocxService.js` ke module bersama (`docxNativeHelpers.js`) — zero-risk, murni pemindahan kode yang sudah terbukti jalan.
3. **Refactor `buildHtml()` jadi 2 tahap**: `buildDocumentModel(data)` (murni struktur data, tidak tahu HTML/docx) lalu `renderModelToHtml(model)` (pengganti isi `buildHtml()` sekarang) — kerjakan BAB PER BAB, verifikasi tiap Bab hasil `renderModelToHtml` byte-identical (atau visual-identical) dengan `buildHtml()` versi lama sebelum lanjut ke Bab berikutnya, supaya PDF tidak diam-diam berubah.
4. **Baru setelah §5.3 selesai & PDF terverifikasi tidak berubah**, tulis `renderModelToDocx(model)` — mulai dari tabel yang PALING SEDERHANA (Realisasi Anggaran, Analisis Efisiensi) untuk validasi pola, baru ke yang kompleks (hierarki indikator bersarang paling akhir, karena paling berisiko).
5. **Lampiran 1**: refactor kecil `lakipPkDocxService.js` (pisahkan `buildPkDocxChildren(detail, tahun)` dari `Packer.toBuffer` di `buildPkDocxBuffer`), reuse `buildPkDocxChildren` di `renderModelToDocx` — **tidak menyentuh perilaku export PK mandiri** (pola yang sama seperti aturan "jangan ubah `buildPkHtml()`" di Fase 3).
6. **Ganti `exportDocx()`** di `lakipExportController.js` untuk pakai `renderModelToDocx(buildDocumentModel(data))`, matikan `getHtml()`+`html-to-docx`+seluruh strip-function Fase 1/1b (boleh dihapus atau dibiarkan seperti `buildDocxHtml_deprecated`, ikuti preferensi Anda saat itu).
7. **Verifikasi ulang MENYELURUH**: seluruh checklist Fase 1-4 (urutan Bab, NaN/Infinity, badge warna, header bold, lebar kolom kali ini benar-benar proporsional) generate ulang dari data DB nyata, PDF dan DOCX dibandingkan urutan Bab-nya seperti sebelumnya.

Estimasi kasar tiap tahap ada di §2; total keseluruhan **BESAR**, bukan pekerjaan 1 sesi.

---

## File yang dibaca (investigasi murni, tidak ada kode ditulis)

- `backend/controllers/lakipGeneratorController.js` (inventarisasi seluruh `<table>`)
- `backend/services/lakipPkExportService.js` (struktur tabel `buildPkHtml()`)
- `backend/services/lakipPkDocxService.js` (dibaca penuh, 444 baris)
- `backend/services/lakipPkExportController.js` (konfirmasi PK sudah 2-sumber: `buildPkHtml` untuk PDF, `buildPkDocxBuffer` untuk DOCX)
- `node_modules/html-to-docx/README.md` + source (`html-to-docx.umd.js`, hasil investigasi Fase 1) — konfirmasi API surface tidak punya hook untuk raw table/XML injection
- `node_modules/docx` — konfirmasi sudah terinstal (`^9.6.1`), tidak perlu dependency baru
