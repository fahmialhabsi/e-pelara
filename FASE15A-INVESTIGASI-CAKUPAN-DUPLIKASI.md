# Fase 15A — Investigasi Cakupan Penuh Duplikasi Data

**Status:** Murni investigasi. **Tidak ada data yang diubah** — seluruh temuan lewat query `SELECT` read-only dan pembacaan kode (`Read`/`Grep`), dikonfirmasi `git status` bersih dari perubahan data.

**TEMUAN UTAMA (mengoreksi asumsi Fase 13/14):** Duplikasi `misi`/`tujuan` **BUKAN bug data** seperti diasumsikan sebelumnya — itu adalah **arsitektur clone-per-`jenis_dokumen` yang sengaja dan masih aktif** (RKPD, RKA, dan Renja masing-masing punya salinan Misi/Tujuan/Sasaran sendiri, terpisah dari RPJMD sumber). Bug sesungguhnya jauh lebih sempit: **query LAKIP tidak memfilter `jenis_dokumen`**, sehingga menampilkan gabungan 4 salinan yang sah seolah-olah itu 1 data yang terduplikasi. Detail lengkap di §1 dan §3. `renstra_program` (Poin 3 Fase 13) tetap punya akar masalah **BERBEDA** (skema `kebijakan_id` scalar, sudah dikonfirmasi ulang, lihat §2).

---

## 1. Pola pasti duplikasi Misi & Tujuan

### Misi — bukan 4x acak, tapi 4 salinan per `jenis_dokumen`

```sql
SELECT id, no_misi, jenis_dokumen, tahun, periode_id, rpjmd_id, created_at FROM misi ORDER BY no_misi, id;
```

24 baris = 6 `no_misi` unik × **4 `jenis_dokumen` berbeda**: `rpjmd` (id 1-6, periode_id=1, sumber asli), `rkpd` (id 7-12, periode_id=2), `rka` (id 13-18, periode_id=2), `renja` (id 19-24, periode_id=2). Tiap `jenis_dokumen` punya PERSIS 6 baris (no_misi 1-6), tidak ada duplikat DI DALAM 1 jenis_dokumen yang sama.

**Random check byte-per-byte** (`no_misi=1`, `isi_misi`+`rpjmd_id`, dibandingkan across ke-4 jenis_dokumen): identik 100%. Dicek juga strict `===` di JS untuk sepasang baris — `true`, panjang string sama (54 karakter). **Tidak ditemukan perbedaan halus/typo** antar salinan — isi teksnya benar-benar sama persis, konsisten dengan "clone", bukan "re-entry manual yang mungkin typo beda".

### Tujuan — pola sama, dengan 3 anomali kecil

```sql
SELECT t.id, t.misi_id, t.no_tujuan, t.jenis_dokumen, t.tahun, t.periode_id, m.no_misi
FROM tujuan t LEFT JOIN misi m ON m.id = t.misi_id ORDER BY t.jenis_dokumen, t.no_tujuan, t.id;
```

26 baris, mayoritas mengikuti pola sama: `rpjmd`(6) + `rkpd`(7) + `rka`(6) + `renja`(6) = 25, plus:
- **1 baris genuinely tambahan** (bukan dupe): `misi_id=9` (no_misi=3, jenis_dokumen `rkpd`) punya 2 Tujuan (`T3-01` dan `T3-02` — "Mewujudkan Administrasi Perkantoran Yang Efektif dan Efisien", teks BEDA, benar-benar 2 Tujuan berbeda di bawah 1 Misi).
- **1 baris anomali nyasar**: `id=5`, `misi_id=1` (yang jenis_dokumen-nya `rpjmd`), tapi baris Tujuan ini sendiri berlabel `jenis_dokumen='renstra'` — **satu-satunya baris berlabel 'renstra'** di seluruh tabel `tujuan` (Misi tidak punya salinan 'renstra' sama sekali). Kemungkinan sisa dari eksperimen/pengetesan awal modul Renstra sebelum modul itu pindah memakai `renstra_tujuan` (tabel terpisah, sudah dikonfirmasi bersih — lihat §2). Baris ini **tidak dipakai LAKIP maupun modul Renstra manapun** (LAKIP baca `renstra_tujuan`, bukan `tujuan` legacy) — kemungkinan besar dead/orphan, tapi TIDAK diverifikasi lebih jauh karena di luar scope "murni investigasi" (butuh cek semua consumer `tujuan` dulu sebelum menyimpulkan aman dihapus).
- **1 inkonsistensi kapitalisasi**: `id=26` (`misi_id=4`, no_tujuan T4-01) berlabel `jenis_dokumen='RPJMD'` (huruf besar), beda dari 25 baris lain yang konsisten huruf kecil `'rpjmd'`. MySQL default collation (`utf8_general_ci`) case-insensitive untuk perbandingan string, jadi kemungkinan besar TIDAK menyebabkan query `WHERE jenis_dokumen='rpjmd'` gagal menangkap baris ini — tapi tetap data hygiene issue yang perlu dicatat.

**Random check byte-per-byte**: dibandingkan `tujuan.id=1` (jenis_dokumen rpjmd, misi_id=1) vs `tujuan.id=5` (jenis_dokumen renstra, misi_id=1 juga) — `isi_tujuan` identik strict `===`. Tidak ditemukan perbedaan konten pada sampel yang dicek.

---

## 2. Cakupan tabel `renstra_*` lain (Renstra OPD "Dinas Pangan", `renstra_id=1`)

```
renstra_tujuan   : total=2   distinct(no_tujuan+isi_tujuan)=2    → BERSIH
renstra_sasaran  : total=4   distinct(nomor+isi_sasaran)=4       → BERSIH
renstra_strategi : total=6   distinct(sasaran_id)=4              → TERLIHAT tumpuk tapi BUKAN masalah
renstra_kebijakan: total=17  distinct(kode_kebjkn+deskripsi)=17  → BERSIH (sudah dikonfirmasi Fase 14)
renstra_program  : total=17  distinct(nama_program)=5            → TERDUPLIKASI (akar masalah beda, lihat di bawah)
renstra_kegiatan : total=16  distinct(nama_kegiatan)=16          → BERSIH
```

**`renstra_strategi`** (6 baris untuk 4 `sasaran_id`) sekilas terlihat seperti pola yang sama dengan Program, tapi **dicek isinya BUKAN duplikat** — tiap baris punya `deskripsi`/`kode_strategi` yang beda (mis. `sasaran_id=3` punya 3 Strategi berbeda: "Meningkatkan Diversifikasi Pangan...", "Meningkatkan Pemenuhan Pangan Pada Wilayah Rentan...", "Meningkatkan Pengentasan Kerawanan Pangan..."). Ini memang desain yang sah — 1 Sasaran boleh punya banyak Strategi, dan `renstra_strategi.sasaran_id` (FK di sisi anak, menunjuk ke 1 induk) sudah benar secara struktural untuk kasus ini (beda dengan Program yang butuh 1 Program menopang BANYAK Kebijakan — arah relasinya kebalik).

**`renstra_program` (Poin 3 Fase 13/14) — akar masalah BERBEDA, dikonfirmasi ulang:**
- 17 baris, 5 nama unik. 12 baris "stub" (0 Kegiatan, 0 indikator) masing-masing menunjuk `kebijakan_id` yang BERBEDA-BEDA dan **valid** (dikonfirmasi Fase 14: semua 12 Kebijakan sumbernya punya `deskripsi`/`kode_kebjkn` yang genuinely berbeda, bukan data sampah).
- **BUKAN** pola clone-per-`jenis_dokumen` seperti Misi/Tujuan (`renstra_program` malah tidak punya kolom `jenis_dokumen` sama sekali — hanya discope oleh `renstra_id`).
- Akar masalah: `renstra_program.kebijakan_id` adalah kolom scalar tunggal (1 Program cuma bisa simpan 1 induk Kebijakan). Karena beberapa Kebijakan sah menopang Program yang sama, satu-satunya cara yang tersedia adalah bikin baris Program baru per Kebijakan tambahan — bukan clone berkala seperti Misi/Tujuan, tapi konsekuensi struktural skema yang terjadi setiap kali ada Kebijakan baru yang perlu "menempel" ke Program yang sudah ada.
- **Kesimpulan: pola duplikasi Program BENAR-BENAR beda akar masalah dari Misi/Tujuan** — bukan proses clone yang sama, jangan disamakan solusinya.

---

## 3. Akar masalah & status aktif/berhenti

### Misi/Tujuan/Sasaran (legacy RPJMD level): mekanisme clone-on-read yang MASIH AKTIF

Ditemukan `backend/utils/autoCloneMisiIfNeeded.js`, `autoCloneTujuanIfNeeded.js`, `autoCloneSasaranIfNeeded.js` — 3 fungsi utilitas yang secara eksplisit **mengkloning** Misi/Tujuan/Sasaran dari sumber `jenis_dokumen='rpjmd'` ke `jenis_dokumen` target (`rkpd`/`rka`/`renja`), **dipanggil on-demand (lazy)** setiap kali endpoint terkait diakses dengan parameter `jenis_dokumen`+`tahun`:

```js
// autoCloneMisiIfNeeded.js — inti logikanya
const cacheKey = `misi:cloned:${periode_id}:${normalizedDokumen}:${normalizedTahun}`;
if (await safeGet(redisClient, cacheKey)) return;  // guard cache Redis, TTL 24 jam
const sourceRows = await Misi.findAll({ where: { jenis_dokumen: "rpjmd", tahun } });
const existingRows = await Misi.findAll({ where: { jenis_dokumen: normalizedDokumen, tahun, periode_id } });
const rowsToClone = sourceRows.filter(item => !existingKeys.has(`${item.visi_id}:${item.no_misi}`));
await Misi.bulkCreate(rowsToClone, { ignoreDuplicates: true });  // hanya insert yg belum ada
```

**Dipanggil dari** (konfirmasi via grep, semua live/terpasang di route):
- `visiController.js` (`getAllVisi`, `getVisiById`) — trigger tiap GET Visi dengan query `jenis_dokumen`+`tahun`.
- `misiController.js` — trigger langsung.
- `rkpdInitController.js` — trigger Tujuan+Sasaran clone saat inisialisasi RKPD.
- `utils/autoCloneHelper.js` — orchestrator gabungan (Misi→Tujuan→Sasaran berurutan), dipanggil dari **16 controller** lain: `kegiatanController`, `subKegiatanController`, `indikatorSubKegiatanController`, `arahKebijakanController`, `tujuanController`, `programController`, `indikatorKegiatanController`, `indikatorTujuanController`, `indikatorSasaranController`, `indikatorProgramController`, `sasaranController`, `prioritasNasionalController`/`prioritasGubernurController`/`prioritasDaerahController`, `indikatorControllerDetail`, `rpjmdBulkFromMasterService`.

**Kesimpulan: mekanisme ini MASIH SANGAT AKTIF dan tertanam luas** di seluruh modul yang bergantung pada hierarki RPJMD (bukan proses masa lalu yang sudah berhenti). Ini **BUKAN bug yang perlu dihentikan** — ini pola arsitektur yang disengaja (tiap dokumen turunan RPJMD punya salinan sendiri, kemungkinan supaya perubahan di 1 modul tidak mengganggu modul lain / supaya tiap dokumen bisa diedit independen). **Akan terus menghasilkan baris baru yang sah** setiap kali modul/tahun kombinasi baru pertama kali diakses (dijaga idempoten oleh cache Redis 24 jam + cek `existingKeys` sebelum insert — TIDAK menghasilkan duplikat GANDA di dalam 1 `jenis_dokumen` yang sama, sudah dikonfirmasi di §1: tiap jenis_dokumen tetap 6 baris rapi).

**Kenapa 4 gelombang waktu berbeda (2025-08-02, 2026-04-01, 2026-07-08×2)?** Ini konsisten dengan 4 modul (`rpjmd` asal, lalu `rkpd`/`rka`/`renja`) pertama kali diakses di 4 momen berbeda — bukan bug re-run, tapi penggunaan modul yang wajar berjalan seiring waktu (RKPD dipakai duluan ~April 2026, RKA dan Renja baru dipakai pertama kali di hari yang sama, 8 Juli 2026, berselisih 1 detik — kemungkinan besar RKA dan Renja diinisialisasi berurutan dalam 1 sesi kerja).

### `renstra_program` (Poin 3): TIDAK ada mekanisme "auto-generate" yang jalan berkala

Berbeda dari Misi/Tujuan, tidak ditemukan fungsi `autoCloneProgramIfNeeded` atau sejenisnya untuk `renstra_program`. Baris stub kemungkinan besar dibuat **manual** lewat form input Kebijakan (via `renstra_kebijakanController` atau wizard cascading) setiap kali operator menambahkan Kebijakan baru dan sistem/form tidak menawarkan opsi "pakai Program yang sudah ada", sehingga default-nya membuat baris Program baru. **Status: berpotensi TERUS TERJADI ke depan** setiap kali ada Kebijakan baru ditambahkan untuk Program yang sudah ada — tapi ini bukan proses otomatis berjalan sendiri seperti autoClone, melainkan konsekuensi dari alur input manual + keterbatasan skema (lihat §2). Tidak diverifikasi lebih jauh alur form-nya karena di luar scope "murni investigasi data"; kalau mau dipastikan, perlu ditelusuri terpisah alur `renstra_kebijakanController.js`/frontend wizard cascading Kebijakan-Program.

---

## 4. Konsumen lain (di luar LAKIP) yang berisiko

Dicek semua file yang query tabel `misi` langsung (`grep FROM misi|Misi.findAll|Misi.findOne`, 12 file). Yang BUKAN bagian mekanisme clone/CRUD normal Misi sendiri, dicek satu-satu apakah memfilter `jenis_dokumen`:

| Controller | Filter yang dipakai | Aman? |
|---|---|---|
| `exportController.js` (export Excel Misi) | `if (jenis_dokumen) where.jenis_dokumen = jenis_dokumen;` + `tahun` | ✅ Aman — sudah scoped dengan benar |
| `renstraGenerateController.js` | `where: { id: misiIds }` (id spesifik hasil resolusi lain) | Kemungkinan aman (perlu trace asal `misiIds`, tidak digali lebih jauh — bukan mengandung filter jenis_dokumen eksplisit di titik ini, tapi ids sudah diresolusi sebelumnya) |
| **`monitoringController.js`** (`getMonitoring`) | **TIDAK ADA `where` sama sekali** — `Misi.findAll({ include: [...] })` polos, include penuh Tujuan→Sasaran→Program→Kegiatan | ❌ **BERISIKO** — akan menampilkan seluruh 24 baris Misi (4 jenis_dokumen tercampur) plus seluruh cabang Tujuan/Sasaran/Program/Kegiatan masing-masing jenis_dokumen, berpotensi sama persis dengan gejala LAKIP (Misi 4x, dst) |
| **`laporanRpjmdController.js`** (`getLaporanRpjmd`) | `where: { rpjmd_id: rpjmd.id }` — **TIDAK termasuk `jenis_dokumen`**, dan semua 24 baris Misi berbagi `rpjmd_id` yang sama | ❌ **BERISIKO** — filter `rpjmd_id` saja tidak cukup untuk mengecualikan salinan rkpd/rka/renja |
| `misiController.js`, `tujuanController.js`, `rkpdInitController.js` | Bagian dari mekanisme clone sendiri, sudah filter jenis_dokumen sesuai desainnya | ✅ Sesuai desain |
| `indikatorMisiController.js` | Tidak query tabel `misi` langsung (pakai model `IndikatorMisi` terpisah) | Tidak relevan |
| `dashboardRpjmdController.js` | Tidak query tabel `misi` langsung (pakai model `IndikatorMisi`) | Tidak relevan |

**2 konsumen berisiko dikonfirmasi live & routed:**
- `GET /api/monitoring` (`routes/monitoringRoutes.js`, role `SUPER_ADMIN/ADMINISTRATOR/PENGAWAS/PELAKSANA`, dipasang di `server.js:500`). Belum ditemukan halaman frontend yang secara pasti masih memanggil route persis ini dalam pencarian yang dilakukan (kandidat terdekat `RpjmdMonitoringOPD.jsx`/`RpjmdMonitoringHeatmap.jsx` hanya ditemukan berisi link navigasi ke rute FRONTEND `/dashboard-rpjmd/monitoring-*`, belum ditelusuri apakah keduanya benar-benar fetch dari endpoint backend ini atau dari endpoint lain) — endpoint backend-nya sendiri tetap live/reachable terlepas dari status pemakaian frontend saat ini.
- `GET /api/laporan/...` (`routes/laporanRpjmdRoutes.js`, dipasang di `server.js:487`) — fungsi bernama `getLaporanRpjmd` ("Laporan RPJMD"), sangat mungkin dipakai untuk menampilkan laporan resmi RPJMD per OPD/tahun.

**`renstra_program` (Poin 3-nya sendiri):** ditemukan `renstraGenerateController.js` (generator dokumen Renstra, tabel T-C.27) **SUDAH PUNYA proteksi untuk masalah yang sama** — komentar eksplisit di baris ~908-914: *"Program milik satu Sasaran, dideduplikasi per kode nomenklatur. Satu Program sah menopang beberapa Arah Kebijakan sehingga tersimpan sebagai beberapa baris renstra_program. Pada T-C.27 ia harus tampil SEKALI saja — Kegiatan dari seluruh baris kembarannya digabung..."* — fungsi `programGroupsOfSasaran()` mengelompokkan by `kode_program` dan MENGGABUNGKAN (bukan cuma suppress) Kegiatan dari semua baris kembar. Ini konfirmasi independen bahwa tim sebelumnya SUDAH SADAR akan pola ini di modul Renstra sendiri dan sudah menanganinya di sana — **HANYA LAKIP yang belum**, sampai Fase 15B.

---

## 5. Ringkasan cakupan

| Tabel | Level | Status duplikasi | Akar masalah | Masih aktif? |
|---|---|---|---|---|
| `misi` | RPJMD legacy | 24 baris = 6×4 jenis_dokumen (SAH, bukan bug) | Clone-on-read `autoCloneMisiIfNeeded` | ✅ Aktif, akan terus jalan |
| `tujuan` | RPJMD legacy | 26 baris, pola sama + 1 extra sah + 1 anomali nyasar + 1 typo kapital | Clone-on-read `autoCloneTujuanIfNeeded` | ✅ Aktif |
| `sasaran` (legacy) | RPJMD legacy | Sebagian mengikuti pola sama (di luar scope Renstra OPD "Dinas Pangan") | Clone-on-read `autoCloneSasaranIfNeeded` | ✅ Aktif |
| `strategi`/`arah_kebijakan`/`program` (legacy) | RPJMD legacy | Nyaris bersih (duplikasi "mengecil" makin ke bawah cascade — operator jarang lanjut isi cabang duplikat) | Tidak digali (di luar scope Renstra OPD "Dinas Pangan", cakupan legacy penuh tidak jadi fokus Fase 15A) | Tidak diketahui |
| `renstra_tujuan/sasaran/strategi/kebijakan/kegiatan` | Renstra OPD | BERSIH | — | — |
| `renstra_program` | Renstra OPD | 17 baris = 5 nama × avg 3.4 (TIDAK sah, 12 stub kosong) | Skema `kebijakan_id` scalar tunggal + alur input manual Kebijakan | Berpotensi terus terjadi tiap Kebijakan baru ditambahkan, TAPI bukan proses otomatis berjalan sendiri |

**Konsumen berisiko dikonfirmasi:** `GET /api/monitoring` (`monitoringController.getMonitoring`) dan `GET /api/laporan/...` (`laporanRpjmdController.getLaporanRpjmd`) — keduanya query `misi` tanpa filter `jenis_dokumen` yang memadai, berpotensi menampilkan gejala visual sama seperti LAKIP (Misi/Tujuan/Sasaran tercetak berulang per jenis_dokumen). `renstraGenerateController.js` (Renstra T-C.27) **sudah aman**, ada dedup eksplisit untuk masalah `renstra_program`.

**TIDAK ada usulan cleanup data di laporan ini** sesuai instruksi — keputusan cleanup (kalau ada) menunggu pembahasan terpisah setelah cakupan penuh ini dipahami. Catatan penting untuk pembahasan itu nanti: karena Misi/Tujuan/Sasaran clone adalah **arsitektur yang disengaja**, "cleanup" yang benar BUKAN "hapus duplikat" seperti asumsi Fase 13/14 — melainkan **memperbaiki query konsumen (LAKIP, Monitoring, Laporan RPJMD) supaya memfilter `jenis_dokumen` dengan benar**, mengikuti pola yang sudah dipakai `exportController.js`. Fix LAKIP untuk ini sudah dikerjakan di Fase 14 (secara tidak sengaja — `GROUP BY no_misi, isi_misi` yang dipakai kebetulan bekerja karena isi antar jenis_dokumen memang identik saat ini, tapi TIDAK filter berdasarkan `jenis_dokumen` yang benar secara semantik; kalau suatu saat 1 modul mengedit salinannya sendiri sehingga isinya berbeda dari salinan lain, fix Fase 14 akan diam-diam menggabungkan versi yang berbeda alih-alih memilih yang benar — rekomendasi: query LAKIP diubah untuk eksplisit `WHERE jenis_dokumen = 'rpjmd'` sebagai perbaikan lanjutan, di luar scope eksekusi Fase 15A yang murni investigasi).
