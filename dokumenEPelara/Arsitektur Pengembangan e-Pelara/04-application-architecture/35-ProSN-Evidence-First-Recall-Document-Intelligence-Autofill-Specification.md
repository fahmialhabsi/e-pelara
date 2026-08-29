# Spesifikasi 35 — ProSN Evidence-First + Document Intelligence + Recall Data + Source-Driven Auto-Fill (B.1.1–B.1.4)

Status: **DESIGN SPECIFICATION — DRAFT UNTUK REVIEW CEA/Project Owner** (belum diimplementasikan; belum APPROVED FOR IMPLEMENTATION)
Riwayat revisi: v1 draft awal → v2 (documentation corrective pass) — 3 koreksi wajib CEA diterapkan (semantik produk hukum §8, ownership validation Renstra recall §13/§19, backend retry-idempotency §27/§31), OD-1/OD-2/OD-3 di-RESOLVE → **v3 (micro corrective pass P0)** — Final Gate CEA menemukan 1 defect P0 tersisa: desain idempotency v2 mengunci baris TARGET evidence link yang belum ada saat first-apply (tidak memberi titik serialisasi valid, dua request bersamaan bisa lolos bersamaan) — diperbaiki dengan mengunci baris **staging evidence binding** (`entity_type='PENGISIAN'`, sudah ada sejak upload) sebagai canonical serialization lock, §31 ditulis ulang penuh (STEP 1-10), Test R diperkeras dari "maksimal 1" menjadi "EXACTLY ONE". Siap untuk CEA Final Verification bertarget — **bukan** pernyataan approval implementasi.
Dasar: Read-Only Reuse Audit (accepted) atas modul Recall Data lintas-modul, Penatausahaan, LAKIP, DPA source-driven, Document Intelligence/OCR, Ollama/narasi Manajemen Risiko.
Baseline yang wajib dipertahankan tanpa perubahan: Specification 34 (ProSN Indicator Foundation), Corrective Pass B.1.1–B.1.4 (commit `91a6844e`), rule engine, evidence gate, tenant isolation, authorization, ownership, source-driven DPA B.1.3, MBG 2.1–2.7.

---

## 1. Executive Summary

Spesifikasi ini merancang lapisan **input assistance** di depan Kertas Kerja ProSN B.1.1–B.1.4 yang sudah ACCEPTED, dengan alur: **Upload Evidence → Extract → Classify → Recall → Preview (confidence+provenance) → Confirm → Create Register → Bind Evidence → Score (existing)**. Prinsip inti: sistem hanya boleh mengisi fakta yang benar-benar dapat ditemukan (dari dokumen atau sumber internal terverifikasi), field yang tidak ditemukan harus eksplisit `NOT_FOUND` (bukan 0/ditebak/dikarang AI), dan setiap nilai auto-fill harus punya provenance yang bisa ditelusuri.

Audit reuse membuktikan **tidak ada satu mekanisme existing yang mencakup seluruh alur ini**, tetapi tersedia 6 building block matang yang dikomposisikan (bukan dibangun ulang): primitif recall generik, service DPA source-driven B.1.3 (ACCEPTED, tidak disentuh), pola provenance `ProsnCadanganTarget.source_*`, pola UX konfirmasi `SdiAutofillModal.jsx`, plumbing OCR (`pdf-parse`+`tesseract.js`), dan arsitektur provider narasi (`narrativeProviderFactory.js`). Database delta yang diperlukan **hanya kolom aditif** (0 tabel baru, 9 kolom baru total lintas 5 tabel) — lihat §25.

---

## 2. Accepted Audit Facts (ringkasan, rujuk audit read-only sebelumnya untuk detail lengkap)

1. Penatausahaan **tidak** menyimpan target/realisasi indikator fisik — hanya `dpa.anggaran` (pagu) dan `SUM(penatausahaan.jumlah) JOIN dpa_id` (realisasi anggaran). Tidak ada `tenant_id` di Penatausahaan/DPA/BKU.
2. Target/realisasi indikator fisik yang sah secara numerik ada di `indikator_renstra.target_tahun_N` (target) dan `realisasi_indikator_renstra.nilai_realisasi` (realisasi), terhubung via `IndikatorRenstra` (nama model, file `renstra_indikatorModel.js`, tabel `indikator_renstra`) — **bukan** dari `Lakip.target`/`Lakip.realisasi` (STRING bebas, tidak aman diparse otomatis).
3. `prosnpDpaSourceService.js` (source-driven DPA B.1.3) ACCEPTED, bekerja, TIDAK diredesain oleh spesifikasi ini — hanya direuse untuk B.1.1/B.1.2/B.1.4.
4. Evidence gate entity-scoped ACCEPTED. `createBukti()` mensyaratkan `entity_id` sudah ada KECUALI `entity_type='PENGISIAN'` (tidak butuh `entity_id`, selalu NULL di DB, di-scope via `pengisian_id`) — jalur inilah yang dipakai untuk staging evidence-first.
5. OCR/PDF plumbing tersedia (`pdf-parse`, `pdfjs-dist`, `canvas`, `tesseract.js`) tapi bespoke untuk tabel SIPD (`realisasiSipdPdfImportService.js`) — direuse dependency-nya saja, parser field ditulis baru.
6. Ollama (`ollamaNarrativeProvider.js`) sudah dipakai arah *data terstruktur → narasi*, belum pernah arah *dokumen → data terstruktur*. Tidak ada validator skema untuk output AI (hanya `JSON.parse`).
7. Pola UX konfirmasi paling cocok dengan target Project Owner adalah `SdiAutofillModal.jsx` (preview per-field: nilai usulan + tag keyakinan + tooltip alasan + checkbox + edit inline + tombol "Terapkan N usulan") — bukan pola MR wizard (silent auto-apply, confidence dihasilkan backend tapi tidak ditampilkan frontend).
8. `ProsnCadanganTarget` sudah punya pola provenance minimal (`source_type`, `source_tahun`, `source_opd_id`, `source_dpa_id`, `source_pagu_dpa`, `source_realisasi`, `source_snapshot_at`, `manual_override_alasan`) — dijadikan **template** kolom provenance baru.
9. `perangkat_daerah_opd_mapping` adalah satu-satunya jembatan sah `perangkat_daerah_id ↔ opd_penanggung_jawab_id`; `Dpa.opd_id` berada di ruang `opd_penanggung_jawab`, BUKAN `perangkat_daerah.id`.
10. `getProsnNomenklaturMapping` (`ProsnNomenklaturMapping`) mengembalikan HANYA metadata nomenklatur (kode/nama Program-Kegiatan-SubKegiatan + status_relevansi) — **tidak** membawa pagu/realisasi; field itu harus diambil terpisah via `prosnpDpaSourceService`.
11. Multer config ProSN (`prosnpUpload.js`) sudah menerima PDF/XLSX/DOCX/JPG/PNG, maks 10MB, disimpan `backend/uploads/prosnp/<tenantId>/<uuid>.<ext>` — direuse apa adanya, tidak ada perubahan validasi upload.

---

## 3. Architecture Decisions

| # | Keputusan | Alasan |
|---|---|---|
| D1 | Evidence-first staging memakai `entity_type='PENGISIAN'` existing — **tidak ada endpoint upload baru**. | Reuse penuh, chicken-and-egg sudah terselesaikan oleh desain existing (fakta audit §2.4). |
| D2 | Extraction preview & recall preview **stateless di backend** — hasil dikembalikan penuh dalam response API, TIDAK disimpan sebagai draft di server. Frontend menahan hasil di state lokal (React), sama seperti `SdiAutofillModal`. | Menghindari tabel/kolom staging baru; requirement §31 (minimal, additive) terpenuhi; pola sudah terbukti di SDI. |
| D3 | Provenance disimpan sebagai **1 kolom JSON aditif `provenance`** per tabel register (bukan kolom-per-field, bukan tabel audit terpisah). | Field bervariasi per tipe_form (10+ field berbeda lintas B.1.1–B.1.4); kolom JSON menghindari ledakan skema sekaligus tetap queryable via `JSON_EXTRACT` bila dibutuhkan laporan. |
| D4 | Teks hasil ekstraksi (OCR/pdf-parse) di-cache pada `ProsnBuktiDukung` (kolom baru), bukan di-generate ulang tiap kali preview/apply. | Menghindari re-OCR berulang (mahal), sekaligus jadi bukti audit "apa yang benar-benar dibaca sistem" untuk hallucination guard (§22). |
| D5 | Deterministic mapping ProSN↔Renstra untuk Target/Realisasi Indikator memakai **1 kolom FK baru** `prosnp_master_indikator.indikator_renstra_id` (nullable, diisi HANYA lewat endpoint ADMIN baru §27, default NULL). Bila NULL → langsung `INDICATOR_MAPPING_NOT_FOUND`, tidak ada percobaan name-matching. **Revisi v2**: FK yang terisi TIDAK otomatis dipercaya — setiap pemakaian FK ini (baik saat recall §19 maupun saat admin menyimpan mapping §27) WAJIB melalui validasi ownership OPD server-side (`INDICATOR_MAPPING_OPD_MISMATCH` bila gagal). "FK valid" dan "ownership valid" adalah dua hal berbeda yang keduanya harus lolos. | Audit membuktikan tidak ada mapping otomatis yang sah; name-matching eksplisit dilarang mandat. **Koreksi CEA #2**: kepercayaan pada konfigurasi Admin tidak boleh menggantikan validasi otorisasi runtime. |
| D6 | Jenis Dokumen (**7 kanonis**, direvisi dari 6 — lihat §8) disimpan di kolom **existing** `ProsnBuktiDukung.jenis_bukti` (STRING, sudah ada, sebelumnya bebas/tidak dipakai konsisten) — divalidasi di application layer terhadap daftar tetap, BUKAN ENUM DB baru. | Zero migration untuk enum; additive; menghindari ALTER TYPE yang berisiko pada kolom yang sudah ada data lama. **Koreksi CEA #1**: Keputusan Gubernur/Kepala Daerah adalah produk hukum berbeda dari Peraturan Gubernur — keduanya butuh identifier kanonis terpisah, sehingga 6→7 jenis. |
| D7 | Orkestrasi auto-fill adalah **satu service koordinator** (`ProsnAutoFillOrchestrator`) yang memanggil adapter-adapter kecil bertipe (Document/Nomenclature/DPA/Penatausahaan/RenstraIndicator/Narrative) — bukan satu fungsi raksasa per-indikator, bukan "magic global recall". | Sesuai mandat §13; setiap adapter punya contract sempit, mudah diuji terpisah. |
| D8 | Evidence rebind adalah **1 service function generik** dipakai lintas tipe_form, dipanggil baik dari endpoint manual rebind maupun secara internal oleh endpoint apply-autofill. | Hindari duplikasi logic; satu titik penegakan tenant/pengisian/idempotency. |
| D9 | Ollama TIDAK diaktifkan default. Ekstraksi field utama (nomor/tanggal/pejabat/angka) **rule-based/regex dulu** (Fase 3); Ollama hanya untuk (a) saran klasifikasi jenis dokumen sekunder, (b) draft Catatan/ringkasan naratif — keduanya WAJIB lolos validator (§17) sebelum masuk preview, dan keduanya default OFF sampai eksplisit diaktifkan (Fase 7 — **FINAL, lihat OD-3 RESOLVED**). | Sesuai §17/§26 mandat: AI tidak boleh jadi authority fakta; kontrol aktivasi konsisten dgn pola MR yang sudah ada. |
| D10 | Skor **tidak** dihitung ulang otomatis oleh alur auto-fill. Tombol "Hitung Ulang Skor" existing (`ProsnSkorIndikatifCard`) tetap satu-satunya pemicu. | Nol perubahan pada integrasi rule engine (§33 mandat). |
| D11 | `/autofill-apply` **retry-idempotent DAN concurrency-safe** berdasarkan identity `(bukti_id, pengisian_id, entity_type)` — bukan hanya diproteksi disable-button frontend. Serialisasi dilakukan dgn mengunci baris **staging evidence binding** (`ProsnBuktiIndikator` `entity_type='PENGISIAN'`, sudah ada sejak Phase A) via `transaction.LOCK.UPDATE` SEBELUM cek/membuat target binding apa pun — **bukan** mengunci baris target yang belum tentu ada (revisi Micro Corrective Pass P0, lihat §31 root cause). Retry/concurrent identik dgn identity sama mengembalikan `created:false, idempotent_replay:true` atas entity PERTAMA yang berhasil dibuat, bukan membuat entity kedua. | **Koreksi CEA #3**: frontend disable-button adalah UX guard, bukan integrity guard; network retry/replay/direct API call/2 request bersamaan harus tetap aman secara backend — mengunci baris yang belum ada tidak memberi titik serialisasi yang valid. |
| D12 | Canonical document type membedakan tegas **Keputusan Gubernur/Kepala Daerah** (`keputusan_gubernur`) dari **Peraturan Gubernur** (`peraturan_gubernur`) dan dari **Peraturan Daerah** (`peraturan_daerah`) — Perda TIDAK PERNAH memenuhi requirement Perkada (B.1.4) atau Keputusan Gubernur (B.1.3) secara otomatis. | **Koreksi CEA #1** — kesalahan semantik hukum berisiko salah menilai kelengkapan B.1.3/B.1.4. |
| D13 | Mapping `indikator_renstra_id` dikelola HANYA lewat 1 endpoint ADMIN-only baru (bukan SQL manual), dengan validasi ownership OPD wajib saat disimpan DAN audit trail via `ActivityLog` (model generik existing, direuse — **bukan** subsistem audit baru). | **OD-2 RESOLVED, Option B** — konsisten pola governance ProSN existing (semua perubahan master data lewat endpoint beraudit). |

---

## 4. Scope / Non-Scope

**In-scope**: B.1.1–B.1.4 Ketahanan Pangan sahaja. Upload evidence generik (staging) → ekstraksi teks → klasifikasi jenis dokumen (rule-based, AI sekunder opsional) → ekstraksi field terstruktur (rule-based) → resolusi nomenklatur (reuse) → recall DPA (reuse) → recall Penatausahaan (baru, OPD-scoped) → recall indikator Renstra (baru, deterministic-mapping-only) → draft narasi Catatan (reuse provider, opsional) → preview UI (confidence+provenance+confirm) → create register entity (reuse alur existing) → bind evidence (baru) → (tidak menyentuh scoring).

**Non-scope** (sesuai §26 mandat, verbatim tidak diringkas ulang): integrasi API nasional ProSN, integrasi SIWASIAT/e-Monev nasional, redesign EA, modul Penatausahaan baru, target fisik palsu di Penatausahaan, rule engine/bobot/formula/indikator ProSN, workflow approval nasional, AI menentukan skor, penghapusan manual fallback, perbaikan auth-refresh (workstream lain), MBG 2.1–2.7 (tidak disentuh sama sekali, hanya diregresi-uji).

---

## 5. Existing Capability Reuse Map

| Kapabilitas | Status pakai di spesifikasi ini |
|---|---|
| `prosnpWorkflowService.createBukti` (entity_type=PENGISIAN) | **REUSE AS-IS** — evidence staging |
| `prosnpUpload.js` (multer) | **REUSE AS-IS** — tidak ada validasi baru |
| `prosnpDpaSourceService.js` | **REUSE AS-IS** — dipanggil dari adapter baru, tidak diubah satu baris pun |
| `ProsnNomenklaturMapping` / `getProsnNomenklaturMapping` | **REUSE AS-IS** — sumber kandidat nomenklatur |
| `perangkat_daerah_opd_mapping` | **REUSE AS-IS** — resolusi OPD wajib |
| `narrativeProviderFactory.js` + provider mock/rule_enhanced/ollama | **REUSE AS-IS**, dipanggil dgn prompt ProSN baru (bukan mengubah factory) |
| Pola kolom `ProsnCadanganTarget.source_*` | **REUSE SEBAGAI TEMPLATE** desain kolom `provenance` |
| Pola UX `SdiAutofillModal.jsx` | **REUSE SEBAGAI TEMPLATE** struktur komponen frontend baru |
| `pdf-parse`, `tesseract.js`, `canvas`, `pdfjs-dist` (dependency) | **REUSE dependency**, kode ekstraksi baru |
| Evidence gate (`prosnpEvidenceGateService.js`) | **TIDAK DISENTUH** — rebind additive, tidak mengubah fungsi existing |
| Rule engine (`ruleEngine/*.js`) | **TIDAK DISENTUH** |

---

## 6. Target End-to-End Flow

```
[1] User buka indikator B.1.x pada Kertas Kerja (existing page)
[2] User klik "+ Unggah & Analisis Dokumen" (tombol BARU, di dalam masing2 Section B.1.1-4)
[3] Modal upload: pilih file + (opsional) pilih dugaan Jenis Dokumen
[4] POST /prosnp/pengisian/:pengisianId/bukti  (EXISTING, entity_type=PENGISIAN) → bukti_dukung_id
[5] POST /prosnp/bukti/:buktiId/analisis  (BARU) → orchestrator jalan sinkron:
      extract → cache text → classify → field-extract (rule-based, +opsional AI suggestion tervalidasi)
      → resolve nomenklatur (reuse) → recall DPA (reuse) → recall Penatausahaan (baru, OPD-scoped)
      → recall indikator Renstra (baru, deterministic-only) → (opsional) narrative draft
      → response: { klasifikasi, fields[], narrative_draft, warnings[] }
[6] Frontend render modal "Analisis Dokumen & Recall Data" (pola SdiAutofillModal) — user centang/edit/tolak per field
[7] User klik "Gunakan N Hasil"
[8] POST /prosnp/pengisian/:pengisianId/autofill-apply  (BARU) — 1 transaksi (detail lengkap §31 STEP 1-10):
      a. KUNCI baris staging evidence binding (entity_type='PENGISIAN') — serialization point, SEBELUM apa pun di bawah
      b. cek target binding sudah ada? → bila YA: idempotent success, STOP di sini (tidak lanjut ke c-f)
      c. re-validasi staleness sumber DPA/Penatausahaan (bandingkan source_snapshot_at)
      d. create entity register (ProsnSuratPenugasan/ProsnRapatForkopimda/ProsnCadanganTarget+transaksi/ProsnInovasi) — REUSE service existing per tipe
      e. set kolom provenance dgn confirmed_by/confirmed_at
      f. panggil prosnpEvidenceRebindService.rebindBuktiKeEntity(buktiId, entityType, entityId) — additive, non-destructive
[9] User (opsional, terpisah, TIDAK otomatis) klik "Hitung Ulang Skor" (EXISTING, tidak diubah)
```

---

## 7. Evidence-First Architecture

### Phase A — Staging (REUSE, tanpa kode baru)
Upload memakai endpoint existing `POST /prosnp/pengisian/:id/bukti` dengan `entity_type=PENGISIAN`. Berkas tersimpan, `bukti_dukung_id` didapat, TIDAK ada entity register yang perlu ada terlebih dahulu.

### Phase B — Extraction (BARU)
Dipicu terpisah oleh `POST /prosnp/bukti/:buktiId/analisis` (lihat §9/§27). Hasil teks di-cache ke `ProsnBuktiDukung.extracted_text_cache`.

### Phase C — Confirm (BARU, frontend)
Modal preview, tidak ada state tersimpan server selain apa yang dikirim balik oleh user saat apply.

### Phase D — Create Entity (REUSE alur existing per tipe_form)
Menggunakan service CRUD existing per register (`prosnpSuratPenugasanService.js`, dll.) — dipanggil dari controller baru `autofillApply`, BUKAN diubah service-nya.

### Phase E — Evidence Binding (BARU) — `prosnpEvidenceRebindService.js`

```
Nama fungsi : rebindBuktiKeEntity(buktiDukungId, entityType, entityId, actor, tenantId, transaction)
Input       : buktiDukungId (int, wajib), entityType (enum ENTITY_MODEL_BY_TYPE existing), entityId (int, wajib),
              actor (req.user), tenantId, transaction (opsional — dipakai jika dipanggil dari dalam transaksi apply-autofill)
Output      : { link: ProsnBuktiIndikator, created: boolean }  // created=false bila idempotent-hit
Authorization: WRITE_ROLES (sama dgn createBukti) — dicek di controller, service sendiri tidak re-cek role (menerima actor tervalidasi)
Validasi    :
  1. bukti = ProsnBuktiDukung.findOne({id: buktiDukungId, tenant_id: tenantId}) — 404 jika tidak ada/beda tenant
  2. link_asal = ProsnBuktiIndikator.findOne({bukti_dukung_id: buktiDukungId, entity_type:'PENGISIAN', tenant_id: tenantId})
     — WAJIB ADA (bukti harus berasal dari staging PENGISIAN yang sah). 404 PROSNP_EVIDENCE_NOT_STAGED jika tidak ada.
  3. entity = db[ENTITY_MODEL_BY_TYPE[entityType]].findOne({id: entityId, tenant_id: tenantId}) — 404 jika tidak ada
  4. GUARD ANTI-LEAKAGE (P0): entity.pengisian_id HARUS SAMA PERSIS dengan link_asal.pengisian_id.
     Jika beda → 409 PROSNP_EVIDENCE_CROSS_PENGISIAN (bukti milik pengisian lain tidak boleh dipakai ulang ke indikator lain).
  5. IDEMPOTENCY: cek ProsnBuktiIndikator.findOne({bukti_dukung_id, entity_type, entity_id, tenant_id}) — jika sudah ada,
     return {link: existing, created:false} TANPA insert baru (bukan error).
  6. kategori (untuk evidence gate) diturunkan dari body request eksplisit oleh caller (bukan ditebak) — wajib salah satu
     dari daftar kategori valid untuk entityType tsb (sama seperti EntityBuktiManager saat ini).
Transaction : WAJIB dijalankan di dalam transaksi DB (baik transaksi sendiri utk endpoint manual, maupun transaksi
              bersama saat dipanggil dari apply-autofill) — insert ProsnBuktiIndikator baru, TIDAK menghapus/mengubah
              link_asal (additive, generic PENGISIAN binding tetap ada selamanya sebagai jejak staging awal).
Rollback    : Jika langkah manapun gagal, seluruh transaksi (termasuk create entity di Phase D bila dipanggil dari
              apply-autofill) di-rollback — tidak ada entity "yatim" tanpa evidence bila proses gagal di tengah jalan.
Duplicate prevention: lihat langkah 5 di atas (unique check aplikasi, BUKAN unique index DB — kombinasi
              bukti_dukung_id+entity_type+entity_id secara teori bisa legitimate diulang dari race condition,
              ditangani via idempotent-read-before-insert dalam transaksi yang sama, lock row link_asal saat SELECT).
```

---

## 8. Document Type Model

**[Direvisi v2 — Koreksi Wajib CEA #1: Regulatory Semantics]**

### Dasar semantik hukum (konteks Pemerintah Provinsi)

- **Peraturan Kepala Daerah / Perkada** (tingkat provinsi) **= Peraturan Gubernur**. Identifier kanonis: `peraturan_gubernur`.
- **Peraturan Daerah (Perda)** adalah produk hukum BERBEDA (ditetapkan bersama DPRD, prosedur legislasi berbeda dari Pergub) — **Perda TIDAK PERNAH menjadi substitusi otomatis Peraturan Kepala Daerah/Peraturan Gubernur**, baik untuk requirement Perkada B.1.4 maupun requirement Keputusan Kepala Daerah B.1.3.
- **Keputusan Gubernur / Keputusan Kepala Daerah** adalah produk hukum tersendiri, BERBEDA dari Peraturan Gubernur (Keputusan = penetapan bersifat individual-konkret mis. penetapan target/tim, bukan pengaturan norma umum seperti Peraturan). Identifier kanonis yang dipilih: **`keputusan_gubernur`** (mengikuti istilah literal "Keputusan Kepala Daerah" yang dipakai form B.1.3 existing — `nomor_keputusan`/`tanggal_keputusan` pada `ProsnCadanganTarget` — sehingga identifier ini konsisten dengan kolom yang sudah ada, bukan istilah baru yang bersaing).
- Perda **boleh** menjadi supporting evidence/dasar hukum (mis. dasar pembentukan kelembagaan) bila memang relevan, tetapi diklasifikasikan `INTERNAL-CONTROL`/pendukung, **tidak pernah** `REGULATORY-DIRECT` pengganti Perkada atau Keputusan Gubernur.

### Canonical document type — **7 jenis** (direvisi dari 6; jumlah disinkronkan di seluruh dokumen ini)

```
JENIS_DOKUMEN_PROSN = [
  'surat_penugasan',
  'sk_penugasan',
  'keputusan_gubernur',       // BARU v2 — Keputusan Gubernur/Kepala Daerah, TERPISAH dari peraturan_gubernur
  'peraturan_daerah',
  'peraturan_gubernur',        // = Peraturan Kepala Daerah/Perkada tingkat provinsi
  'laporan_pelaksanaan',
  'notulen_rapat_koordinasi',
]
```

### Compatibility Matrix (regulatory relevance vs internal control) — **direvisi**

| document_type | B.1.1 | B.1.2 | B.1.3 | B.1.4 | Klasifikasi |
|---|---|---|---|---|---|
| surat_penugasan | **Utama** | — | — | — | REGULATORY-DIRECT (objek penilaian B.1.1) |
| sk_penugasan | **Utama** (varian surat_penugasan) | — | — | — | REGULATORY-DIRECT utk B.1.1 |
| keputusan_gubernur | — | — | **Utama** (penetapan Target Cadangan Pangan) | — | REGULATORY-DIRECT utk B.1.3 — **INI yang dimaksud "Keputusan Kepala Daerah" pada form existing `ProsnCadanganTarget`, BUKAN Pergub** |
| peraturan_daerah | Pendukung (dasar hukum, bila relevan) | — | Pendukung (dasar hukum, bila relevan) | Pendukung/dasar hukum SAJA — **TIDAK PERNAH berstatus Perkada** | INTERNAL-CONTROL / supporting legal basis di seluruh indikator — **tidak pernah REGULATORY-DIRECT pengganti Perkada/Keputusan Gubernur** |
| peraturan_gubernur | Pendukung | — | Pendukung (bila target juga dikuatkan Pergub, TIDAK menggantikan `keputusan_gubernur` sbg dokumen penetapan utama) | **Utama** (memenuhi requirement Perkada) | REGULATORY-DIRECT utk B.1.4 (Perkada = Pergub tingkat provinsi); SUPPORTING utk B.1.3 |
| laporan_pelaksanaan | — | Pendukung (lampiran notulen) | Pendukung (laporan capaian stok) | **Utama** (laporan implementasi inovasi) | SUPPORTING utk B.1.2/B.1.3; REGULATORY-DERIVED bukti implementasi utk B.1.4 |
| notulen_rapat_koordinasi | — | **Utama** | — | — | REGULATORY-DIRECT (objek penilaian B.1.2, bersama undangan+daftar hadir) |

**Konfirmasi eksplisit** (acceptance criteria §S mandat): Perda ≠ Perkada; Keputusan Gubernur/KDH ≠ Pergub; Pergub ≠ Perda. Ketiganya diberi identifier kanonis terpisah dan baris matrix terpisah di atas.

Catatan governance (§32 mandat): tabel di atas adalah **pemetaan relevansi internal e-PeLARA** untuk mengarahkan UX (dokumen mana ditawarkan untuk indikator mana) — **bukan** daftar jenis dokumen literal dari Kepmendagri 700.1.1.4-180/2026 (yang hanya menyebut objek kertas kerja, tidak mendaftar jenis dokumen administratif secara rinci). Label wajib ditampilkan di UI: *"Jenis dokumen ini adalah bantuan klasifikasi internal, bukan daftar resmi jenis dokumen dari Kepmendagri."*

---

## 9. Document Extraction Architecture

```
UPLOAD (existing, entity_type=PENGISIAN)
  ↓
FILE VALIDATION (existing multer — TIDAK diubah)
  ↓
TEXT EXTRACTION  — backend/services/prosnp/autofill/prosnpDocumentTextExtractor.js (BARU)
  1. Jika mime='application/pdf': coba pdf-parse dulu.
     - Jika hasil.text.trim().length >= TEXT_LAYER_MIN_CHARS (default 40): pakai ini, method='pdf_text_layer'.
     - Jika kosong/kurang: lanjut ke langkah 2 (OCR), method='ocr_pdf_render'.
  2. Jika mime='image/jpeg'|'image/png' ATAU PDF tanpa text layer memadai:
     render (utk PDF: pdfjs-dist+canvas per halaman, reuse teknik dari realisasiSipdPdfImportService.js
     TANPA reuse parser tabelnya) → Tesseract.createWorker('ind+eng') → recognize() → gabungkan text semua halaman.
     method='ocr_image'|'ocr_pdf_render'.
  3. Jika mime bukan pdf/image (docx/xlsx) — DILUAR SCOPE ekstraksi otomatis Fase 3 (lihat §26 Non-Scope implisit):
     kembalikan EXTRACT_FAILED dgn reason "Ekstraksi otomatis belum mendukung format ini — isi manual."
  4. Simpan: ProsnBuktiDukung.update({extracted_text_cache, extracted_at: now(), extraction_method: method})
  5. Jika seluruh percobaan gagal/teks kosong: EXTRACT_FAILED, field-field tetap muncul di preview sbg NOT_FOUND,
     TIDAK menggagalkan seluruh request /analisis (partial-degradation, bukan hard failure).
```

---

## 10. Classification Architecture

```
backend/services/prosnp/autofill/prosnpDocumentClassifier.js (BARU)

RULE-BASED (selalu jalan duluan, wajib):
  - Pola nomor surat (regex umum format nomor dinas: /\d+\/[\w.\-]+\/\d{4}/ dsb, per jenis)
  - Heading/frasa kunci per jenis (**direvisi v2** — `keputusan_gubernur` dipisah tegas dari `peraturan_gubernur`, keduanya sering tertukar bila hanya mencocokkan kata "GUBERNUR" saja):
      surat_penugasan/sk_penugasan: "MENUGASKAN", "Kesatu", "Menimbang", "SURAT TUGAS", "SURAT KEPUTUSAN"
      keputusan_gubernur: heading persis **"KEPUTUSAN GUBERNUR"** (BUKAN "PERATURAN GUBERNUR") + "MEMUTUSKAN" + "Menetapkan" — pola penomoran keputusan (mis. "NOMOR .../KPTS/...") berbeda dari pola penomoran peraturan
      peraturan_daerah: "PERATURAN DAERAH", "DENGAN RAHMAT TUHAN YANG MAHA ESA" + "DPRD" + "PERSETUJUAN BERSAMA"
      peraturan_gubernur: heading persis **"PERATURAN GUBERNUR"** (BUKAN "KEPUTUSAN GUBERNUR") + "GUBERNUR MALUKU UTARA" + "DENGAN RAHMAT TUHAN YANG MAHA ESA" (tanpa "DPRD"/"PERSETUJUAN BERSAMA" — pembeda dari peraturan_daerah)
      notulen_rapat_koordinasi: "NOTULEN", "DAFTAR HADIR", "RAPAT KOORDINASI"
      laporan_pelaksanaan: "LAPORAN PELAKSANAAN", "LAPORAN KEGIATAN"
  - **Aturan disambiguasi wajib**: bila heading mengandung "GUBERNUR" tapi kata kunci PERSIS "KEPUTUSAN" dan "PERATURAN" SAMA-SAMA tidak ditemukan (dokumen ambigu/scan buruk) → classifier TIDAK BOLEH menebak salah satu — hasil `confidence:NONE`, `requires_review:true`, alasan eksplisit "Tidak dapat membedakan Keputusan Gubernur vs Peraturan Gubernur dari teks — periksa manual." Menebak keliru di titik ini berisiko fatal (salah anggap Pergub sbg Keputusan Gubernur atau sebaliknya, lihat §19/§23).
  - Skor kecocokan = jumlah pola cocok / jumlah pola diharapkan jenis tsb.
  - confidence: HIGH jika >=2 pola kuat cocok (termasuk heading definitif), MEDIUM jika 1 pola cocok,
    LOW jika hanya kemiripan lemah (mis. keyword umum), NONE jika tidak ada pola cocok sama sekali.
  - reason: daftar pola yang cocok (human-readable), disimpan.

AI SECONDARY (opsional, default OFF — gate PROSNP_AUTOFILL_AI_CLASSIFICATION_ENABLED, pola sama dgn
MR_NARRATIVE_EXTERNAL_ENABLED/ALLOW_EXTERNAL):
  - HANYA dipanggil jika rule-based confidence == LOW atau NONE.
  - Hasil AI selalu diberi source_type='AI_SUGGESTED', TIDAK PERNAH menimpa hasil rule-based confidence
    MEDIUM/HIGH.
  - Bila AI dipanggil, hasil tetap requires_review=true tanpa memandang confidence yang diklaim AI sendiri
    (AI classification TIDAK PERNAH auto-checked di preview, lihat §15).

OUTPUT: { jenis_dokumen, confidence, reason, method: 'rule_based'|'ai_suggested', requires_review }
```

---

## 11. Structured Field Extraction Contract

Kontrak tetap untuk SETIAP field yang dikembalikan endpoint `/analisis`, `/autofill-preview` (bila dipisah), dan dikirim balik saat `/autofill-apply`:

```json
{
  "field_key": "nomor_dokumen",
  "value": "090/123/DISPANGAN/2025",
  "source_type": "DOCUMENT_EXTRACTED",
  "source_reference": { "bukti_dukung_id": 42, "text_offset": [120, 148] },
  "confidence": "HIGH",
  "reason": "Cocok pola nomor surat pada baris ke-3 dokumen.",
  "extraction_method": "regex_nomor_surat_v1",
  "requires_review": false
}
```

`source_type` (persis daftar mandat §8, tidak ditambah/diringkas):
`DOCUMENT_EXTRACTED | RULE_DERIVED | DPA_RECALL | PENATAUSAHAAN_RECALL | RENSTRA_RECALL | INDIKATOR_RENSTRA_RECALL | AI_SUGGESTED | USER_CONFIRMED | NOT_FOUND`

`confidence`: `HIGH | MEDIUM | LOW | NONE`. Aturan checkbox default di UI (§15): HIGH=tercentang, MEDIUM=tercentang+ditandai review, LOW=tidak tercentang, NONE=`NOT_FOUND` (disabled, tidak checkable).

---

## 12. Recall Orchestration Architecture

```
backend/services/prosnp/autofill/
  prosnpAutoFillOrchestrator.js        (koordinator, entry point tunggal dipanggil controller)
  prosnpDocumentTextExtractor.js       (§9)
  prosnpDocumentClassifier.js          (§10)
  extractors/
    suratPenugasanFieldExtractor.js    (B.1.1, rule-based regex/heuristik per field)
    rapatForkopimdaFieldExtractor.js   (B.1.2)
    cadanganTargetFieldExtractor.js    (B.1.3 — HANYA nomor/tanggal keputusan + target ton, BUKAN pagu/realisasi)
    inovasiFieldExtractor.js           (B.1.4)
  adapters/
    nomenclatureResolverAdapter.js     (wrap getProsnNomenklaturMapping existing, TIDAK mengubahnya)
    dpaRecallAdapter.js                (wrap prosnpDpaSourceService.ambilSnapshot existing, TIDAK mengubahnya)
    penatausahaanRecallAdapter.js      (BARU, OPD-scoped, §20)
    renstraIndicatorRecallAdapter.js   (BARU, deterministic-mapping-only, §19)
    narrativeDraftAdapter.js           (wrap narrativeProviderFactory existing dgn prompt ProSN baru)
  prosnpAiOutputValidator.js           (§22, dipakai classifier+narrativeDraftAdapter)
  prosnpEvidenceRebindService.js       (§7 Phase E)
```

**Contract orchestrator** — `buildAutoFillPreview(input)`:

INPUT:
```
{
  bukti_id,            // wajib
  pengisian_id,        // wajib (dari route param)
  tenant_id,           // dari req.tenantId
  actor,               // req.user
  jenis_dokumen_hint    // opsional, string dari salah satu JENIS_DOKUMEN_PROSN
}
```
Orchestrator SENDIRI yang mengambil `periode_id`, `tahun`, `semester`, `perangkat_daerah_id`, `indikator.tipe_form`, `master_indikator_id` via join `ProsnPengisian→ProsnIndikator→ProsnPeriode` (tidak diterima dari client, mencegah manipulasi scope — §19 authorization).

OUTPUT:
```
{
  bukti_id,
  klasifikasi: { jenis_dokumen, confidence, reason, method, requires_review },
  fields: [ FieldSuggestion, ... ],   // kontrak §11
  narrative_draft: { catatan: string, source_type:'AI_SUGGESTED'|'RULE_DERIVED', confidence, requires_review } | null,
  warnings: [ "..." ]   // mis. "Ekstraksi PDF text-layer kosong, memakai OCR — periksa ulang hasil."
}
```
Tidak ada write DB selain caching `extracted_text_cache`/`extraction_method`/`extracted_at`/`klasifikasi_meta` pada `ProsnBuktiDukung` (idempotent — analisis ulang menimpa cache, bukan menambah baris baru).

---

## 13. OPD Isolation Model (P0, NON-NEGOTIABLE)

**[Direvisi v2 — Koreksi Wajib CEA #2: konsisten dengan §19, tidak lagi kontradiktif]**

```
resolveOpdScope(periode, tenantId, transaction):
  1. perangkat_daerah_id = periode.perangkat_daerah_id   (WAJIB ada, sudah kolom existing prosnp_periode)
  2. mapping = PerangkatDaerahOpdMapping.findOne({ perangkat_daerah_id, transaction })
  3. Jika !mapping: return { ok:false, code:'OPD_MAPPING_NOT_FOUND' }   ← STOP, jangan lanjut query apa pun
  4. opd_penanggung_jawab_id = mapping.opd_penanggung_jawab_id
  5. return { ok:true, opd_penanggung_jawab_id, perangkat_daerah_id }
```
**Setiap** adapter yang menyentuh `Dpa`/`Penatausahaan`/`IndikatorRenstra` WAJIB memanggil `resolveOpdScope()` di awal dan menyertakan hasilnya sbg filter WHERE — TIDAK ADA query DPA/Penatausahaan/Renstra yang boleh berjalan hanya dengan `tahun` + kode, tanpa filter OPD (larangan eksplisit mandat §3). Bila `resolveOpdScope` gagal, SELURUH field yang bersumber dari DPA/Penatausahaan/Renstra di response `/analisis` diisi `{value:null, source_type:'NOT_FOUND', confidence:'NONE', reason:'OPD_MAPPING_NOT_FOUND — periode ini belum terhubung ke ruang ID OPD lama, hubungi Administrator.'}` — TIDAK PERNAH fallback ke pencarian tanpa scope.

**PRINSIP TEGAS (berlaku sama untuk SEMUA adapter, termasuk Renstra Indicator recall — lihat §19)**: `resolveOpdScope()` menghasilkan **ruang ID `opd_penanggung_jawab`**. Verifikasi read-only terhadap `backend/models/renstra_opdModel.js` membuktikan `RenstraOPD.opd_id` **juga** `belongsTo(OpdPenanggungJawab, {foreignKey:'opd_id'})` — Renstra berada di RUANG ID YANG SAMA dengan DPA (`opd_penanggung_jawab`), BUKAN di ruang `perangkat_daerah_id` langsung seperti draft v1 spesifikasi ini keliru asumsikan. Ini kabar baik untuk konsistensi desain: **satu output `resolveOpdScope()` (`opd_penanggung_jawab_id`) dipakai identik untuk validasi ownership DPA, Penatausahaan, MAUPUN Renstra** — tidak perlu jalur resolusi kedua. **Tidak ada pengecualian "dipercaya karena Admin yang isi konfigurasi"** untuk sumber manapun — OPD isolation berlaku identik untuk data yang datang dari FK admin-curated (Renstra) maupun dari query dinamis (DPA/Penatausahaan). Kegagalan validasi ownership pada FK admin-curated dilaporkan dengan kode berbeda (`INDICATOR_MAPPING_OPD_MISMATCH`, §19/§30) dari kegagalan resolusi bridge OPD (`OPD_MAPPING_NOT_FOUND`) atau pelanggaran keamanan pada boundary request (`CROSS_OPD_ACCESS_DENIED`) — ketiganya BEDA KONDISI, didokumentasikan terpisah di §30.

---

## 14. Source Priority Rules (per-field, bukan global)

| Field | Prioritas 1 | Prioritas 2 | Prioritas 3 | Bila semua gagal |
|---|---|---|---|---|
| Pagu Anggaran | `DPA_RECALL` (`prosnpDpaSourceService.ambilSnapshot`) | — | — | `NOT_FOUND` |
| Realisasi Anggaran | `PENATAUSAHAAN_RECALL` (OPD-scoped, `dpa_id` dari hasil DPA_RECALL) | — | — | `NOT_FOUND` |
| Target Indikator (fisik) | Dokumen resmi (`DOCUMENT_EXTRACTED`, bila SK/Pergub eksplisit menyebut angka target) | `INDIKATOR_RENSTRA_RECALL` (`indikator_renstra.target_tahun_N`, HANYA jika `prosnp_master_indikator.indikator_renstra_id` terisi) | — | `NOT_FOUND` |
| Realisasi Indikator (fisik) | `RENSTRA_RECALL` (`realisasi_indikator_renstra.nilai_realisasi`, HANYA jika mapping FK terisi) | — | — | `NOT_FOUND` |
| Nomor/Tanggal Dokumen, Pejabat Penandatangan | `DOCUMENT_EXTRACTED` | — | — | `NOT_FOUND` |
| OPD Penerima Tugas | `DOCUMENT_EXTRACTED` (nama OPD dari teks) + cross-check `RULE_DERIVED` terhadap master `PerangkatDaerah` | — | — | `NOT_FOUND` (nama tetap ditampilkan mentah dgn `requires_review=true` bila cross-check gagal, TIDAK di-drop) |
| Nomenklatur Program/Kegiatan/SubKegiatan | `RULE_DERIVED` (`nomenclatureResolverAdapter`, exact-match whitelist) | — | — | Daftar kosong → user pilih manual (dropdown existing tetap ada) |
| Cakupan Tugas / Topik / Relevansi (boolean) | `DOCUMENT_EXTRACTED` (keyword match) — SELALU `requires_review=true` minimal MEDIUM, TIDAK PERNAH HIGH auto-checked untuk field boolean substantif ini | — | — | `NOT_FOUND` (unchecked, user putuskan) |
| Catatan | `RULE_DERIVED` (template ringkas dari field lain yg sudah confirmed) | `AI_SUGGESTED` (`narrativeDraftAdapter`, hanya jika diaktifkan) | — | Kosong (blank, bukan NOT_FOUND — Catatan memang optional) |

**Larangan tegas** (persis mandat §14): tidak boleh memakai sumber lebih lemah bila sumber lebih kuat tersedia dan berhasil. Orchestrator berhenti pada prioritas pertama yang `ok`, tidak "menggabung" nilai dari 2 sumber berbeda untuk field yang sama.

---

## 15. Auto-Fill Preview UX (frontend, pola SdiAutofillModal)

Komponen baru: `frontend/src/features/prosnp/components/ProsnAutofillModal.jsx`.

1. Tombol pemicu **"+ Unggah & Analisis Dokumen"** di setiap Section register (`PenugasanKdhSection.jsx`, `KoordinasiForkopimdaSection.jsx`, `CadanganPanganBerasSection.jsx` — hanya bagian Target, `InovasiPerkadaSection.jsx`) — terpisah dari tombol "+ Tambah Surat"/dst existing (yang tetap ada untuk isi manual murni).
2. Sub-modal 1: pilih file + (opsional) dropdown Jenis Dokumen (§8) → submit ke endpoint staging existing (§7 Phase A).
3. Tombol **"Analisis & Isi Otomatis"** → panggil `POST /prosnp/bukti/:buktiId/analisis` → tampilkan progress statis (label berurutan sesuai §15 mandat, ditampilkan client-side selama menunggu SATU response, bukan streaming server — durasi realistis ekstraksi+recall lokal biasanya <5 detik non-OCR, <20 detik dgn OCR).
4. Preview table (kolom persis mandat): Field | Nilai Usulan (editable `Input`) | Sumber (`Tag` warna per source_type) | Confidence (`Tag` warna: HIGH=hijau, MEDIUM=kuning, LOW=abu, NONE=merah+disabled) | Alasan (`Tooltip`) | Gunakan? (`Checkbox`, default state sesuai §11).
5. Baris `NOT_FOUND`: checkbox disabled, label **"Data tidak ditemukan"**, value input disabled/placeholder abu-abu (bukan kosong-bisa-diisi — mencegah user mengira ini kolom manual kosong biasa; ada tautan kecil "Isi manual" yang meng-enable input bila user memang mau override manual dengan tanda `USER_CONFIRMED` eksplisit).
6. Tombol **`[Batal]` / `[Gunakan N Hasil]`** — N = jumlah baris tercentang saat ini (reaktif).
7. Klik "Gunakan N Hasil" → `POST /prosnp/pengisian/:pengisianId/autofill-apply` dgn payload hanya field tercentang (nilai FINAL setelah edit user, bukan nilai asli usulan) → sukses → tutup modal → reload data section (pola `onChanged` existing) → entity baru otomatis muncul di tabel register dengan badge kecil "Dibuat dari analisis dokumen" pada baris tsb (baca dari `provenance` JSON, bukan kolom baru khusus badge).
8. **Tidak ada auto-save**. Menutup modal tanpa klik "Gunakan Hasil" tidak menciptakan apa pun (selain bukti yang sudah ter-upload di Phase A, yang tetap tersedia untuk dianalisis ulang kapan saja — tidak hilang).

---

## 16. Catatan Otomatis (Narrative Draft)

- Reuse `narrativeProviderFactory.js` APA ADANYA (tidak diubah). Panggilan baru dari `narrativeDraftAdapter.js` dengan prompt BARU khusus ProSN (bukan prompt MR yang ada — prompt MR spesifik risiko/5-Why, tidak relevan).
- Prioritas provider **RULE_ENHANCED terlebih dahulu** (template kalimat dari field-field yang sudah `USER_CONFIRMED`/tervalidasi tinggi — tidak butuh LLM sama sekali untuk kasus umum), Ollama HANYA sebagai peningkatan opsional (gate env terpisah `PROSNP_NARRATIVE_OLLAMA_ENABLED`, default false).
- Field `catatan` hasil draft SELALU dikembalikan dengan `source_type` sesuai provider yang benar-benar dipakai (`RULE_DERIVED` atau `AI_SUGGESTED`) dan `requires_review:true` tanpa terkecuali.
- UI: textarea Catatan menampilkan placeholder **"Draft otomatis — silakan tinjau sebelum digunakan."** saat nilai berasal dari draft belum dikonfirmasi; begitu user submit form (Simpan), nilai final apa pun yang ada di textarea tersimpan sebagai teks biasa (kolom `catatan` existing, tidak berubah tipe) — metadata `AUTO_DRAFT` disimpan HANYA di `provenance.catatan.source_type`, bukan mengubah semantik kolom `catatan` itu sendiri.

---

## 17. Ollama Guard / Hallucination Guard — `prosnpAiOutputValidator.js`

```
validateAiFieldSuggestion({ fieldKey, suggestedValue, sourceText, fieldSchema }):
  1. Type check sesuai fieldSchema.type ('string'|'date'|'number'|'enum'|'boolean').
     Gagal parse → REJECT (drop suggestion, tidak diteruskan ke preview sama sekali).
  2. Enum check (jenis_dokumen, cakupan_*) → harus persis salah satu nilai valid → gagal → REJECT.
  3. Date check → format tanggal Indonesia umum (regex daftar tetap: "DD Bulan YYYY", "DD/MM/YYYY", "DD-MM-YYYY")
     → gagal parse → REJECT.
  4. Numeric check (pagu/realisasi/target bila AI ikut menyuntingnya) → harus finite, > 0, < CEILING_SANITY
     (mis. 1e15 utk Rupiah) → gagal → REJECT.
  5. GROUNDING CHECK (wajib utk field faktual: nomor_dokumen, tanggal_dokumen, pejabat_penandatangan,
     opd_penerima_tugas, angka apa pun):
     normalisasi (lowercase, strip spasi berlebih) suggestedValue HARUS ditemukan sbg substring approksimatif
     (Levenshtein toleransi kecil utk typo OCR, threshold ketat) di dalam `sourceText` (extracted_text_cache)
     ATAU sudah menjadi nilai dari source_type non-AI lain yang sudah lolos (mis. hasil DPA_RECALL) —
     TIDAK ditemukan di keduanya → REJECT, field otomatis jadi {source_type:'NOT_FOUND', confidence:'NONE'}.
  6. max_length check per field (cegah AI mengembalikan paragraf panjang utk field nomor/tanggal).
  Return: { valid: boolean, reason_if_rejected }
```
Field yang REJECT tidak pernah sampai ke response `/analisis` sebagai suggestion — langsung dikonversi jadi `NOT_FOUND`. Validator ini **tidak berlaku** untuk field `DOCUMENT_EXTRACTED` murni rule-based (karena by construction sudah berasal dari teks, bukan diklaim AI) — hanya untuk apa pun berlabel `AI_SUGGESTED`.

**Ollama availability**: timeout existing 30 detik (`MR_NARRATIVE_TIMEOUT_MS`, reuse pola sama dgn env baru `PROSNP_NARRATIVE_TIMEOUT_MS` bila ingin dipisah) — kegagalan/timeout **tidak pernah** menggagalkan endpoint `/analisis` secara keseluruhan; field yang bergantung Ollama (klasifikasi sekunder, narasi) jatuh ke `warnings[]` + `NOT_FOUND`/kosong, field lain (rule-based, DPA, Penatausahaan, Renstra) tetap dikembalikan normal.

---

## 18. Confidence & User Confirmation — sudah tercakup §15. Ringkasan aturan checkbox default:

| Confidence | Default checkbox | Editable | Catatan |
|---|---|---|---|
| HIGH | ✅ tercentang | Ya | — |
| MEDIUM | ✅ tercentang | Ya | Baris diberi visual highlight kuning "perlu ditinjau" |
| LOW | ⬜ tidak tercentang | Ya | Warna abu, user harus sadar memilih |
| NONE (`NOT_FOUND`) | disabled | Tidak (kecuali klik "Isi manual") | Tidak pernah auto-checked |

---

## 19. Target/Realisasi Indicator Resolution

**[Direvisi v2 — Koreksi Wajib CEA #2: P0 OPD Ownership Validation, menghapus kontradiksi dengan §13]**

**Prinsip dasar (menggantikan asumsi v1 yang salah)**: FK `prosnp_master_indikator.indikator_renstra_id` yang terisi bukan bukti ownership yang sah — **valid FK ≠ valid ownership**. Backend WAJIB membuktikan ulang secara runtime bahwa `IndikatorRenstra` yang ditunjuk FK benar-benar berasal dari Renstra milik `perangkat_daerah_id` yang sama dengan konteks ProSN aktif, SETIAP kali recall dijalankan — bukan hanya saat FK disimpan (§27 endpoint ADMIN mapping juga memvalidasi ini saat SIMPAN, tapi validasi saat RECALL tetap wajib berjalan independen, sebagai defense-in-depth terhadap kemungkinan data legacy/insert manual di luar endpoint).

```
renstraIndicatorRecallAdapter.recall({ masterIndikatorId, tahun, opdPenanggungJawabId, transaction }):
  // opdPenanggungJawabId = hasil resolveOpdScope() (§13), DITURUNKAN SERVER-SIDE dari
  // ProsnPengisian→ProsnIndikator→ProsnPeriode.perangkat_daerah_id → perangkat_daerah_opd_mapping
  // (via orchestrator, §12) — TIDAK PERNAH diterima dari request body/query manapun. SAMA PERSIS
  // dgn nilai yang dipakai dpaRecallAdapter/penatausahaanRecallAdapter (§13, §20) — satu resolusi,
  // dipakai ulang, bukan jalur ownership kedua yang terpisah.

  1. master = ProsnMasterIndikator.findByPk(masterIndikatorId)
  2. Jika !master.indikator_renstra_id → return { target: NOT_FOUND(code:'INDICATOR_MAPPING_NOT_FOUND'),
                                                    realisasi: NOT_FOUND(code:'INDICATOR_MAPPING_NOT_FOUND') }
  3. indikator = IndikatorRenstra.findByPk(master.indikator_renstra_id, { include: [{ association: 'renstra' }], transaction })
     // association 'renstra' → RenstraOPD (renstra_indikatorModel.js: belongsTo(RenstraOPD, {foreignKey:'renstra_id'}))
  4. Jika !indikator ATAU !indikator.renstra → return NOT_FOUND(code:'INDICATOR_MAPPING_NOT_FOUND') utk target & realisasi
     // FK menunjuk baris yang sudah dihapus/tidak lengkap — diperlakukan sama seperti FK kosong, BUKAN error keras.

  5. — OWNERSHIP VALIDATION (P0, WAJIB, TIDAK BOLEH DILEWATI) —
     Dibuktikan read-only (backend/models/renstra_opdModel.js:28-31): `RenstraOPD.opd_id` ber-`belongsTo`
     `OpdPenanggungJawab` — RUANG ID YANG SAMA dgn `Dpa.opd_id` (bukan `perangkat_daerah_id` langsung).
     Karena itu perbandingan ownership memakai `RenstraOPD.opd_id` vs `opdPenanggungJawabId` LANGSUNG
     (TIDAK perlu bridge kedua — `resolveOpdScope()` sudah menghasilkan nilai di ruang yang tepat):

     Jika Number(indikator.renstra.opd_id) !== Number(opdPenanggungJawabId):
       return { target: NOT_FOUND(code:'INDICATOR_MAPPING_OPD_MISMATCH'),
                realisasi: NOT_FOUND(code:'INDICATOR_MAPPING_OPD_MISMATCH') }
       // STOP DI SINI. Jangan lanjut ke langkah manapun di bawah. Jangan mencari indikator Renstra lain
       // (tidak ada fallback/name-matching). Tidak ada nilai (target/realisasi) OPD lain yang boleh
       // ikut terkirim dalam response manapun, termasuk di dalam pesan error/log level DEBUG.
     // Bedakan dari CROSS_OPD_ACCESS_DENIED (§30): kode ini KHUSUS utk "FK administratif mengarah ke
     // OPD yang salah" (kesalahan konfigurasi data), BUKAN "user mencoba mengakses scope OPD lain lewat
     // parameter request" (pelanggaran keamanan langsung) — dua kondisi berbeda, log/monitoring harus
     // bisa membedakan keduanya (yang pertama = tiket ke Admin utk perbaiki mapping; yang kedua = insiden
     // keamanan/authorization).

  6. — RESOLUSI TAHUN → KOLOM target_tahun_N —
     Fungsi existing YANG SUDAH DITEMUKAN dan WAJIB DIREUSE formulanya (bukan ditulis ulang dari nol) —
     **OD-1 RESOLVED, existing resolver ditemukan**:
       `pilihTargetTahun(indikatorRenstra, tahunTarget, tahunAwalRenstra)` di `backend/services/lakipBridgeService.js:14-18`.
       Formula intinya: `offset = tahunTarget - tahunAwalRenstra + 1`.
     **Sumber `tahunAwalRenstra`**: dibuktikan read-only bahwa `RenstraOPD` (alias `renstra` pada langkah 3)
     TIDAK punya kolom `tahun_awal` langsung (hanya `tahun_akhir` — lihat `renstra_opdModel.js:52`) dan TIDAK
     punya association Sequelize bernama ke periode RPJMD-nya (`rpjmd_id` adalah kolom FK polos tanpa
     `belongsTo` terdefinisi di model ini). Pemanggil existing (`lakipBridgeService.js:37`) memperoleh
     `tahunAwalRenstra` dari `PeriodeRpjmd.tahun_awal` via rantai `RenjaDokumen→periode` (bukan lewat
     `RenstraOPD` langsung) — rantai itu TIDAK bisa dipakai apa adanya di sini karena orchestrator ProSN
     tidak mulai dari `RenjaDokumen`. Implementer Fase 4 WAJIB melakukan `PeriodeRpjmd.findByPk(indikator.renstra.rpjmd_id)`
     (query langsung by FK, tanpa perlu association baru) untuk memperoleh `tahun_awal` — ATAU, bila
     `tahun_akhir` saja yang tersedia dan periode Renstra diketahui selalu 6 tahun (pola existing
     `target_tahun_1..6`), fallback aman: `tahunAwalRenstra = tahun_akhir - 5`. **PENTING — perbedaan
     kontrak yang WAJIB ditangani**: `pilihTargetTahun()` existing MENG-CLAMP offset di luar jangkauan ke
     `[1,6]` (`Math.min(Math.max(offset,1),6)`) — perilaku ini cocok untuk kebutuhan LAKIP (selalu tampilkan
     kolom terdekat), TAPI TIDAK cocok untuk kontrak §14 mandat ini yang mensyaratkan `RENSTRA_YEAR_OUT_OF_RANGE`
     eksplisit, bukan nilai tahun lain yang dipakai diam-diam. Karena itu:
       a. HITUNG `offset` dengan formula yang SAMA PERSIS (`tahunTarget - tahunAwalRenstra + 1`)
          — reuse formula-nya, BUKAN reuse pemanggilan fungsi `pilihTargetTahun()` apa adanya (fungsi itu
          sendiri TIDAK dipanggil dari adapter ini persis krn clamping-nya; hanya rumusnya yang direuse).
       b. SEBELUM mengambil kolom apa pun: jika `offset < 1 || offset > 6` →
          return NOT_FOUND(code:'RENSTRA_YEAR_OUT_OF_RANGE') utk target (realisasi lanjut independen ke
          langkah 8, karena `realisasi_indikator_renstra` di-keyed oleh `tahun` STRING langsung, tidak
          memakai offset kolom — tidak terpengaruh boundary ini).
       c. Jika dalam jangkauan: `kolomTarget = 'target_tahun_' + offset`, lanjut ke langkah 7.
  7. targetValue = indikator[kolomTarget] ?? NOT_FOUND(code:'INDICATOR_VALUE_NOT_FOUND')
  8. realisasiRow = RealisasiIndikatorRenstra.findOne({ indikator_renstra_id: indikator.id, tahun: String(tahun), transaction })
  9. realisasiValue = realisasiRow?.nilai_realisasi ?? NOT_FOUND(code:'INDICATOR_VALUE_NOT_FOUND')
  10. return { target: {value: targetValue, source_type:'INDIKATOR_RENSTRA_RECALL', source_reference:{indikator_renstra_id: indikator.id, kolom: kolomTarget}, ...},
               realisasi: {value: realisasiValue, source_type:'RENSTRA_RECALL', source_reference:{indikator_renstra_id: indikator.id}, ...} }
```

**Negative test wajib** (lihat §36 Test O): FK valid secara ID tapi menunjuk `IndikatorRenstra` yang `RenstraOPD.opd_id`-nya berbeda dari `opd_penanggung_jawab_id` konteks ProSN aktif HARUS menghasilkan `INDICATOR_MAPPING_OPD_MISMATCH` pada percobaan recall, bukan mengembalikan nilai OPD lain.

**Out-of-Scope Observation** (dicatat, TIDAK diperbaiki dalam spesifikasi ini): komentar di `backend/models/renstra_opdModel.js:4-7` menyatakan `RenstraOPD` adalah "model legacy... untuk dokumen Renstra refactor/canonical gunakan model `Renstra`" — repo tampaknya sedang dalam transisi 2 skema Renstra (legacy `RenstraOPD` vs canonical `Renstra` yang lebih baru). `IndikatorRenstra.renstra_id` saat ini terhubung ke `RenstraOPD` (dibuktikan dari association existing), jadi spesifikasi ini benar mengikuti KODE YANG ADA — namun bila migrasi legacy→canonical Renstra kelak dijalankan modul lain, adapter `renstraIndicatorRecallAdapter.js` perlu ditinjau ulang apakah association-nya masih valid. Ini murni observasi arsitektur lintas-modul, di luar scope Spesifikasi 35.

---

## 20. DPA/Penatausahaan Resolution

**DPA (Pagu)** — REUSE PENUH `prosnpDpaSourceService.ambilSnapshot(masterIndikatorId, tahun, opdId, kodeSubKegiatan)`. `dpaRecallAdapter.js` hanya wrapper tipis yang menerjemahkan hasil `nomenclatureResolverAdapter` (kode_sub_kegiatan terpilih) menjadi argumen fungsi existing tsb. TIDAK ADA baris kode `prosnpDpaSourceService.js` yang diubah.

**Penatausahaan (Realisasi Anggaran)** — BARU, `penatausahaanRecallAdapter.js`:
```
recall({ dpaId, opdPenanggungJawabId, transaction }):
  1. dpa = Dpa.findOne({ id: dpaId, opd_id: opdPenanggungJawabId, transaction })
     // FILTER OPD WAJIB DI QUERY INI SENDIRI (bukan cuma dipercaya dari caller) — defense in depth P0.
  2. Jika !dpa → return NOT_FOUND(code:'DPA_NOT_FOUND')  // termasuk kasus dpa_id valid tapi opd tidak cocok
  3. totalRealisasi = SUM(Penatausahaan.jumlah) WHERE dpa_id = dpa.id
  4. Jika totalRealisasi query kosong (0 baris, BUKAN SUM=0 dari baris yg ada) → NOT_FOUND(code:'PENATAUSAHAAN_NOT_FOUND')
     // Beda eksplisit: 0 baris = "belum pernah dicatat" (NOT_FOUND) vs SUM=0 dari baris yg memang bernilai 0
     // (nilai 0 valid, tetap dikembalikan sbg value:0, source_type:'PENATAUSAHAAN_RECALL', BUKAN NOT_FOUND).
  5. return { value: totalRealisasi, source_type:'PENATAUSAHAAN_RECALL',
              source_reference:{dpa_id: dpa.id}, source_snapshot_at: now() }
```

---

## 21. B.1.1 Field Mapping

| Field | Source Type | Adapter/Extractor | Confidence dasar |
|---|---|---|---|
| Nomor Dokumen | DOCUMENT_EXTRACTED | `suratPenugasanFieldExtractor` (regex nomor surat) | HIGH bila pola nomor baku cocok persis, MEDIUM bila parsial |
| Tanggal Dokumen | DOCUMENT_EXTRACTED | idem (regex tanggal dekat kata "tanggal"/"pada") | HIGH/MEDIUM |
| Jenis Dokumen | RULE_DERIVED (+AI_SUGGESTED sekunder) | `prosnpDocumentClassifier` | §10 |
| Pejabat Penandatangan | DOCUMENT_EXTRACTED | idem (baris dekat "ttd"/nama+jabatan di akhir dokumen) | MEDIUM (nama sulit dipastikan tanpa master pejabat cocok) |
| OPD Penerima Tugas | DOCUMENT_EXTRACTED + cross-check `PerangkatDaerah` | idem + `nomenclatureResolverAdapter`-adjacent lookup | MEDIUM |
| Unit Kerja/Bidang Pelaksana | DOCUMENT_EXTRACTED | idem | LOW–MEDIUM (free text bervariasi) |
| Tanggal Berlaku/Berakhir | DOCUMENT_EXTRACTED | idem | MEDIUM |
| Ringkasan Isi Penugasan | RULE_DERIVED (ringkas kalimat kunci) atau AI_SUGGESTED | `narrativeDraftAdapter` (opsional) | Selalu requires_review |
| Cakupan (Pengadaan/Pengelolaan/Penyaluran) | DOCUMENT_EXTRACTED (keyword) | idem | MEDIUM, tidak pernah HIGH-autocheck (§14) |
| Nomenklatur Program/Kegiatan/SubKegiatan | RULE_DERIVED | `nomenclatureResolverAdapter` (reuse) | HIGH bila match tunggal, MEDIUM bila multi-kandidat |
| Pagu | DPA_RECALL | `dpaRecallAdapter` (reuse) | HIGH bila DPA ditemukan |
| Realisasi Anggaran | PENATAUSAHAAN_RECALL | `penatausahaanRecallAdapter` (baru) | HIGH bila baris ditemukan |
| Target Indikator | INDIKATOR_RENSTRA_RECALL / DOCUMENT_EXTRACTED | `renstraIndicatorRecallAdapter` | Lihat §19, sering NOT_FOUND (mapping FK kosong = kondisi awal) |
| Realisasi Indikator | RENSTRA_RECALL | idem | idem |
| Catatan | RULE_DERIVED / AI_SUGGESTED | `narrativeDraftAdapter` | Selalu requires_review |

---

## 22. B.1.2 Field Mapping

| Field | Source Type | Catatan |
|---|---|---|
| Tanggal Rapat, Nama Forum, Jenis Forum, Pimpinan Rapat, Lokasi | DOCUMENT_EXTRACTED | `rapatForkopimdaFieldExtractor`, dari Undangan/Notulen |
| Unsur Forkopimda Hadir | DOCUMENT_EXTRACTED (dari Daftar Hadir) | **LOW default** — name-matching daftar hadir terhadap `UNSUR_FORKOPIMDA` existing rawan salah, wajib review manual, TIDAK auto-checked meski confidence diklaim tinggi oleh extractor (override kebijakan §14 khusus field ini) |
| Topik ProSN (Pengadaan/Pengelolaan/Penyaluran) | DOCUMENT_EXTRACTED (keyword) | MEDIUM |
| Agenda, Masalah, Keputusan, Tindak Lanjut | DOCUMENT_EXTRACTED / RULE_DERIVED ringkas | requires_review |
| Sub Kegiatan Pendukung | RULE_DERIVED | `nomenclatureResolverAdapter` (reuse) |
| Pagu / Realisasi Anggaran | DPA_RECALL / PENATAUSAHAAN_RECALL | sama pola B.1.1 |
| Evidence (Undangan+Hadir+Notulen) | — | **TIDAK DISENTUH** — evidence gate existing (3 kategori wajib per-rapat) tetap berlaku utuh; rebind (§7 Phase E) hanya menambah binding tambahan, tidak mengganti mekanisme cek kelengkapan `rapatMemilikiBuktiLengkap` |

---

## 23. B.1.3 Field Mapping

**TIDAK MENYENTUH** alur source-driven DPA existing (Program→Kegiatan→SubKegiatan→Pagu→Realisasi tetap 100% jalur lama, modal Target existing tidak diubah satu baris kode pun). Auto-fill BARU hanya untuk bagian yang memang belum otomatis:

| Field | Source Type | Catatan |
|---|---|---|
| Nomor Keputusan KDH | DOCUMENT_EXTRACTED | `cadanganTargetFieldExtractor`, **khusus dari dokumen bertipe `keputusan_gubernur`** (§8 v2 — "Keputusan Kepala Daerah" pada form existing = Keputusan Gubernur, BUKAN Peraturan Gubernur/Pergub). Dokumen bertipe `peraturan_gubernur` boleh diterima sbg SUPPORTING (dasar penguat), TIDAK PERNAH menggantikan kebutuhan dokumen `keputusan_gubernur` itu sendiri — bila hanya Pergub yang ter-upload, field ini tetap `NOT_FOUND`/`requires_review`, bukan diisi dari Pergub |
| Tanggal Keputusan | DOCUMENT_EXTRACTED | idem — sumber sama, `keputusan_gubernur` |
| Target Cadangan Pangan (Ton) | DOCUMENT_EXTRACTED (angka eksplisit di dokumen `keputusan_gubernur`) | Prioritas 1 — dokumen resmi; TIDAK ada fallback Renstra untuk field khusus B.1.3 ini (target Ton cadangan pangan bukan indikator kinerja Renstra generik — beda objek) |
| Pagu/Realisasi (existing) | DPA_RECALL (existing, TIDAK DIUBAH) | Tetap lewat modal cascading existing |
| Transaksi/Mutasi Stok | MANUAL_REQUIRED (tetap) | Penatausahaan TIDAK relevan (bukan data fisik stok beras) — auto-fill dokumen pengadaan/BA di luar scope Fase 1-8 ini, dicatat sbg kandidat fase lanjutan bila Project Owner memutuskan |
| Persentase Capaian | SERVER_DERIVED (existing, TIDAK DIUBAH) | — |

---

## 24. B.1.4 Field Mapping

| Field | Source Type | Catatan |
|---|---|---|
| Nama Inovasi, Masalah Awal, Tujuan, Unsur Kebaruan, Proses Sebelum/Sesudah | DOCUMENT_EXTRACTED / AI_SUGGESTED (ringkasan) | requires_review wajib |
| Relevansi (Pengadaan/Pengelolaan/Penyaluran) | DOCUMENT_EXTRACTED (SUGGESTION only) | **TIDAK PERNAH auto-checked** (mandat §12 eksplisit — keputusan substantif, risiko tinggi) |
| Status Implementasi | MANUAL_REQUIRED | tidak ada sumber dokumen yang cukup pasti untuk status ini, tetap manual |
| Status Perkada, Nomor/Tanggal Perkada | DOCUMENT_EXTRACTED (dari dokumen Perkada) | HIGH **hanya bila dokumen berjenis `peraturan_gubernur`** dgn nomor jelas (§8 v2 — Perkada tingkat provinsi = Peraturan Gubernur). Bila dokumen ter-klasifikasi `peraturan_daerah`, field ini **TIDAK PERNAH** diisi HIGH/auto — Perda bukan Perkada, ditandai `requires_review` + catatan eksplisit "Dokumen ini Peraturan Daerah, bukan Peraturan Gubernur/Perkada — tidak memenuhi requirement Perkada B.1.4 kecuali direview manual" |
| Hasil Kuantitatif/Kualitatif | NOT_AVAILABLE saat ini | Tidak ada sumber deterministic teridentifikasi — selalu MANUAL_REQUIRED, tidak dipaksakan |
| Pagu/Realisasi (bila relevan) | DPA_RECALL / PENATAUSAHAAN_RECALL | sama pola B.1.1, opsional (inovasi tidak selalu punya sub-kegiatan pendukung eksplisit) |
| Evidence (Bukti Implementasi, Perkada) | — | **TIDAK DISENTUH** — evidence gate existing tetap berlaku |

---

## 25. Database Changes

Seluruh perubahan **ADDITIVE, NON-DESTRUCTIVE, BACKWARD COMPATIBLE** — nol kolom/tabel existing diubah tipe atau dihapus, `prosnp_periode` tidak disentuh sama sekali.

| Table/Column | Purpose | Nullability | Default | Index | FK | Backfill | Migration Risk |
|---|---|---|---|---|---|---|---|
| `prosnp_bukti_dukung.extracted_text_cache` (TEXT) | Cache teks hasil pdf-parse/OCR | NULL | NULL | — | — | Tidak perlu (kosong utk data lama, wajar) | RENDAH — ADD COLUMN TEXT nullable |
| `prosnp_bukti_dukung.extracted_at` (DATETIME) | Kapan ekstraksi terakhir jalan | NULL | NULL | — | — | Tidak perlu | RENDAH |
| `prosnp_bukti_dukung.extraction_method` (STRING(32)) | `pdf_text_layer`\|`ocr_pdf_render`\|`ocr_image`\|`manual` | NULL | NULL | — | — | Tidak perlu | RENDAH |
| `prosnp_bukti_dukung.klasifikasi_meta` (JSON) | `{jenis_dokumen, confidence, reason, method}` hasil klasifikasi | NULL | NULL | — | — | Tidak perlu | RENDAH |
| `prosnp_surat_penugasan.provenance` (JSON) | Provenance per-field (§3 D3) | NULL | NULL | — | — | Tidak perlu (baris lama = NULL = "diisi manual sebelum fitur ini ada", ditampilkan UI sbg tanpa badge) | RENDAH |
| `prosnp_rapat_forkopimda.provenance` (JSON) | idem | NULL | NULL | — | — | idem | RENDAH |
| `prosnp_cadangan_target.provenance` (JSON) | Provenance utk nomor_keputusan/tanggal_keputusan/target_ton SAJA (bukan pagu/realisasi — itu tetap pakai `source_*` existing) | NULL | NULL | — | — | idem | RENDAH |
| `prosnp_inovasi.provenance` (JSON) | idem | NULL | NULL | — | — | idem | RENDAH |
| `prosnp_master_indikator.indikator_renstra_id` (INTEGER) | Deterministic mapping ke `indikator_renstra.id` (§19, D5) | NULL | NULL | Index biasa (bukan unique — 1 indikator Renstra secara teori bisa dipetakan lbh dari 1 indikator ProSN meski jarang) | `indikator_renstra.id` (soft FK, `constraints:false` mengikuti pola FK polimorfik lain di repo mis. `IndikatorRenstra.ref_id`) | Default NULL utk SEMUA baris (termasuk 4 Ketahanan Pangan existing) — **diisi HANYA lewat endpoint ADMIN §27 (bukan SQL manual, bukan backfill otomatis)** — OD-2 RESOLVED | RENDAH — ADD COLUMN nullable, TIDAK ada perubahan pada 8 baris existing (4 KP × 2 periode tidak tersentuh krn kolom ini di `prosnp_master_indikator`, bukan `prosnp_indikator`) |

**Total tetap**: 0 tabel baru, 9 kolom baru lintas 5 tabel existing — **tidak berubah oleh corrective pass v2**. Koreksi #2 (ownership validation) dan #3 (idempotency) sama sekali tidak menambah kolom/tabel: ownership validation murni logic baca (§19), idempotency memakai kombinasi kolom `ProsnBuktiIndikator` yang SUDAH ADA (`bukti_dukung_id`+`entity_type`+`entity_id`+`pengisian_id` — tidak ada unique index DB baru, dicek di application layer dalam transaksi terkunci, lihat §31).

---

## 26. Backend Services

| File | Action | Purpose |
|---|---|---|
| `backend/services/prosnp/autofill/prosnpAutoFillOrchestrator.js` | **NEW** | Koordinator utama, §12 |
| `backend/services/prosnp/autofill/prosnpDocumentTextExtractor.js` | **NEW** | §9 |
| `backend/services/prosnp/autofill/prosnpDocumentClassifier.js` | **NEW** | §10 |
| `backend/services/prosnp/autofill/extractors/suratPenugasanFieldExtractor.js` | **NEW** | §21 |
| `backend/services/prosnp/autofill/extractors/rapatForkopimdaFieldExtractor.js` | **NEW** | §22 |
| `backend/services/prosnp/autofill/extractors/cadanganTargetFieldExtractor.js` | **NEW** | §23 |
| `backend/services/prosnp/autofill/extractors/inovasiFieldExtractor.js` | **NEW** | §24 |
| `backend/services/prosnp/autofill/adapters/nomenclatureResolverAdapter.js` | **NEW** (wrapper tipis) | Bungkus `getProsnNomenklaturMapping`/`ProsnNomenklaturMapping` |
| `backend/services/prosnp/autofill/adapters/dpaRecallAdapter.js` | **NEW** (wrapper tipis) | Bungkus `prosnpDpaSourceService.ambilSnapshot` |
| `backend/services/prosnp/autofill/adapters/penatausahaanRecallAdapter.js` | **NEW** | §20 |
| `backend/services/prosnp/autofill/adapters/renstraIndicatorRecallAdapter.js` | **NEW** | §19 |
| `backend/services/prosnp/autofill/renstraOwnershipValidator.js` | **NEW** | §19 Koreksi #2 — fungsi kecil `assertRenstraOwnership(indikatorRenstra, opdPenanggungJawabId)`, dipakai BERSAMA oleh `renstraIndicatorRecallAdapter.js` (saat recall) DAN `prosnpMasterIndikatorService.js` (saat admin menyimpan mapping, §27) — satu titik kebenaran validasi, tidak diduplikasi di 2 tempat |
| `backend/services/prosnp/autofill/adapters/narrativeDraftAdapter.js` | **NEW** (wrapper) | Bungkus `narrativeProviderFactory.executeNarrativeProvider` dgn prompt ProSN baru |
| `backend/services/prosnp/autofill/prosnpAiOutputValidator.js` | **NEW** | §17 |
| `backend/services/prosnp/prosnpEvidenceRebindService.js` | **NEW** (mencakup fungsi idempotency-check §31) | §7 Phase E, §31 |
| `backend/services/prosnp/prosnpMasterIndikatorService.js` | **MODIFY** (tambah 1 fungsi `setIndikatorRenstraMapping(masterIndikatorId, indikatorRenstraId, actor, tenantId)`) | §27 — file existing ini sudah menampung fungsi ADMIN master indikator lain (`updateKriteriaSkor` dkk, dipakai `updateKriteriaSkorMasterIndikator`) — konsisten menambah di file yang sama, bukan file baru |
| `backend/services/prosnp/prosnpDpaSourceService.js` | **REUSE, TIDAK DIUBAH** | — |
| `backend/services/prosnp/prosnpWorkflowService.js` | **REUSE, TIDAK DIUBAH** (createBukti dipakai apa adanya) | — |
| `backend/services/mr/narrativeProviders/narrativeProviderFactory.js` | **REUSE, TIDAK DIUBAH** | Dipanggil, bukan dimodifikasi |
| `backend/services/prosnp/prosnpSuratPenugasanService.js` dll (4 service register) | **REUSE, TIDAK DIUBAH** — dipanggil dari controller baru untuk create entity di Phase D | — |
| `ActivityLog` (model generik, `backend/models/`) | **REUSE, TIDAK DIUBAH** | Audit trail endpoint ADMIN mapping (§27) — dipakai persis pola `renjaRecallService.js`/`renstraOpdRecallService.js` (`ActivityLog.create({action, entity_type, entity_id, new_data})`), BUKAN subsistem audit baru |

---

## 27. API Contract

Konvensi rute ProSN existing diverifikasi (`backend/routes/prosnpRoutes.js`): kebab-case multi-kata, nested `/pengisian/:pengisianId/<resource>`, role dari set tetap (`READ`/`ADMIN`/`WRITE`/`REVIEW`/`INPUT`). Endpoint baru mengikuti pola ini persis.

| Method | Route | Role | Request | Response | Error codes | Transaction | Idempotent |
|---|---|---|---|---|---|---|---|
| POST | `/prosnp/bukti/:buktiId/analisis` | WRITE | `{ jenis_dokumen_hint?: string }` | §12 output contract | `DOCUMENT_REQUIRED, UNSUPPORTED_DOCUMENT, EXTRACT_FAILED, OPD_MAPPING_NOT_FOUND` (parsial, di dalam `warnings`/per-field) | Tidak perlu transaksi DB (hanya 1 UPDATE cache di akhir) | **YA** — panggil ulang = re-analisis, menimpa cache, tidak menciptakan baris baru |
| POST | `/prosnp/pengisian/:pengisianId/autofill-apply` | WRITE | `{ bukti_id, entity_type, fields: [{field_key, value, source_type, confidence, extraction_method}] }` | `{ entity: {...}, evidence_link: {...}, created: boolean, idempotent_replay: boolean, warnings: [] }` | `AUTOFILL_STALE, EVIDENCE_BINDING_INVALID, CROSS_OPD_ACCESS_DENIED, PROSNP_VERSION_CONFLICT, PROSNP_EVIDENCE_NOT_STAGED` | **1 transaksi DB**: STEP 2 lock staging `ProsnBuktiIndikator` (`entity_type='PENGISIAN'`) → STEP 4 cek target binding → [bila belum ada] create entity + rebind evidence + set provenance (§31 STEP 1–10) | **[Direvisi v3 — Micro Corrective Pass P0] YA, retry-idempotent DAN concurrency-safe.** Identity: `(bukti_id, pengisian_id, entity_type)`. Serialization: **LOCK UPDATE pada staging PENGISIAN binding** (bukan pada target binding yang belum tentu ada — lihat §31 root cause fix). First call: `created:true, idempotent_replay:false`. Concurrent/serial identical replay: `created:false, idempotent_replay:true`. Tidak ada duplicate entity, baik pada retry serial maupun pada dua request yang datang bersamaan. |
| POST | `/prosnp/bukti/:buktiId/rebind` | WRITE | `{ entity_type, entity_id, kategori }` | `{ link: {...}, created: boolean }` | `PROSNP_EVIDENCE_NOT_STAGED, PROSNP_EVIDENCE_ENTITY_NOT_FOUND, PROSNP_EVIDENCE_CROSS_PENGISIAN` | 1 transaksi | **YA** (§7 Phase E langkah 5 — sudah idempotent sejak v1, tidak berubah) |
| PUT | `/prosnp/master-indikator/:id/mapping-renstra` | **ADMIN** (`SUPER_ADMIN, ADMINISTRATOR`) | `{ indikator_renstra_id: number \| null }` (`:id` = `master_indikator_id`, konsisten dgn pola existing `PUT /master-indikator/:id/kriteria-skor`) | `{ master_indikator: {...}, mapping_previous: number\|null, mapping_new: number\|null }` | `INDICATOR_MAPPING_OPD_MISMATCH` (bila `indikator_renstra_id` yang diajukan berbeda OPD dari yang selama ini dipetakan indikator ProSN tsb — lihat catatan di bawah), `404` (master indikator/indikator Renstra tidak ditemukan) | 1 transaksi: validasi ownership (reuse `renstraOwnershipValidator.js`, §26) → update `prosnp_master_indikator.indikator_renstra_id` → `ActivityLog.create({action:'prosnp_set_indikator_renstra_mapping', entity_type:'prosnp_master_indikator', entity_id, old_data:{indikator_renstra_id: lama}, new_data:{indikator_renstra_id: baru}, user_id: actor.id})` | Idempotent secara alami (SET operation — memanggil ulang dgn nilai sama = no-op, `mapping_previous === mapping_new`) |

**[BARU v2]** Catatan penting endpoint ADMIN mapping: karena `prosnp_master_indikator` bersifat **global lintas-tenant/OPD** (bukan per-periode/per-OPD seperti `prosnp_indikator` — lihat CLAUDE.md: "`prosnp_master_indikator` tidak tenant-scoped"), validasi ownership DI SINI **berbeda konteks** dari §19: yang divalidasi bukan "apakah OPD periode aktif cocok" (tidak ada periode aktif tunggal saat admin mengatur master data), melainkan **konsistensi tematik** — `renstraOwnershipValidator` di titik ini memvalidasi bahwa `indikator_renstra_id` yang diajukan menunjuk ke `IndikatorRenstra` milik OPD yang **relevan dengan indikator ProSN tsb** (utk 4 indikator Ketahanan Pangan, itu berarti `RenstraOPD.opd_id` harus resolve ke OPD yang sama dgn `perangkat_daerah_id=3` "Dinas Pangan" via `perangkat_daerah_opd_mapping`, ATAU OPD kontributor lain yang tercatat sah di `prosnp_indikator_kontributor` — implementer WAJIB memverifikasi daftar OPD "sah" ini dari data `prosnp_indikator_kontributor`/`responsible_opd_id` existing per periode aktif saat endpoint dipanggil, bukan hardcode ke Dinas Pangan, konsisten dgn D4 Spesifikasi 34 "jangan hardcode default ke Dinas Pangan"). Bila tidak ada OPD yang cocok sama sekali → `INDICATOR_MAPPING_OPD_MISMATCH`.

**Tidak dibuat** endpoint terpisah `/evidence-stage` (dilarang buat baru — reuse `POST /prosnp/pengisian/:id/bukti` existing, §5/§7) maupun `/autofill-preview` terpisah dari `/analisis` (digabung satu panggilan, §6 keputusan desain — mengurangi round-trip, semua sumber [dokumen+DPA+Penatausahaan+Renstra] dipanggil dalam satu request server-side).

**Authorization derivation** (§19 mandat): `pengisianId`/`buktiId` di route param SELALU dipakai untuk MENURUNKAN `tenant_id`+`perangkat_daerah_id`+`opd_penanggung_jawab_id` dari data itu sendiri (join ke `ProsnPengisian→ProsnIndikator→ProsnPeriode`) — **tidak pernah** menerima `opd_id`/`tenant_id`/`perangkat_daerah_id` dari body/query request manapun untuk endpoint-endpoint ini. `verifyToken`+`allowRoles(WRITE)` tetap dipasang seperti seluruh route ProSN lain; endpoint mapping Renstra memakai `allowRoles(ADMIN)` (pola sama persis `updateKriteriaSkorMasterIndikator`, `backend/routes/prosnpRoutes.js:112`).

**[BARU v2] Frontend note untuk endpoint ADMIN mapping**: dikonfirmasi read-only bahwa endpoint ADMIN existing sejenis (`updateKriteriaSkorMasterIndikator`) memiliki fungsi client di `prosnpApi.js` TAPI **tidak dikonsumsi komponen frontend manapun** (API-first, dioperasikan Admin teknis langsung, bukan lewat UI) — endpoint mapping baru ini mengikuti pola yang SAMA (API-first) di Fase 1, konsisten dengan precedent existing; UI admin ringan adalah perbaikan opsional fase lanjutan, TIDAK termasuk File Impact Matrix wajib §41.

---

## 28. Frontend Components

| File | Action | Purpose |
|---|---|---|
| `frontend/src/features/prosnp/components/ProsnAutofillModal.jsx` | **NEW** | §15, pola `SdiAutofillModal.jsx` |
| `frontend/src/features/prosnp/services/prosnpApi.js` | **MODIFY** (tambah 3 fungsi: `analisisBuktiProsn`, `terapkanAutofillProsn`, `rebindBuktiProsn`) | Client API baru, TIDAK mengubah fungsi existing |
| `frontend/src/features/prosnp/components/PenugasanKdhSection.jsx` | **MODIFY** (tambah 1 tombol pemicu modal baru) | B.1.1 |
| `frontend/src/features/prosnp/components/KoordinasiForkopimdaSection.jsx` | **MODIFY** (idem) | B.1.2 |
| `frontend/src/features/prosnp/components/CadanganPanganBerasSection.jsx` | **MODIFY** (tambah tombol khusus di area Target, TIDAK menyentuh modal DPA cascading existing) | B.1.3 |
| `frontend/src/features/prosnp/components/InovasiPerkadaSection.jsx` | **MODIFY** (idem) | B.1.4 |

---

## 29. Authorization

| Aksi | Role | Catatan |
|---|---|---|
| Upload (staging) | WRITE (`SUPER_ADMIN, ADMINISTRATOR, PELAKSANA`) | Reuse existing `createBukti` role gate |
| Analisis dokumen | WRITE | Sama dgn upload — bukan aksi terpisah secara hak akses |
| Preview | WRITE | Melekat pada respons `/analisis`, tidak ada endpoint GET terpisah |
| Apply autofill | WRITE | Sama seperti create entity manual existing per tipe_form |
| Create register | WRITE | Existing, tidak berubah |
| Rebind evidence | WRITE | Sama dgn upload bukti |
| Refresh recall | WRITE | = panggil ulang `/analisis`, role sama |
| **[BARU v2]** Set/Update Mapping Indikator Renstra | **ADMIN** (`SUPER_ADMIN, ADMINISTRATOR`) | Bukan WRITE biasa — mengubah master data lintas-OPD (§27), sama tingkat sensitivitas dgn `updateKriteriaSkorMasterIndikator` existing yang juga ADMIN-only |

Reviewer (`PENGAWAS`) dan `ADMIN` tetap punya akses REVIEW/ADMIN existing (verifikasi bukti, dsb.) — TIDAK ADA hak baru diberikan ke role manapun; auto-fill murni mempercepat aksi yang sudah bisa dilakukan role WRITE secara manual. Satu-satunya hak BARU adalah endpoint mapping Renstra (ADMIN-only, §27) — konsisten dengan D13.

---

## 30. Error Contract

| Code | HTTP | Arti |
|---|---|---|
| `DOCUMENT_REQUIRED` | 422 | Belum ada berkas ter-upload/staged |
| `UNSUPPORTED_DOCUMENT` | 422 | MIME/ekstensi di luar dukungan ekstraksi otomatis (docx/xlsx) |
| `EXTRACT_FAILED` | 200 (di dalam `warnings`, bukan HTTP error — partial degradation) | Teks tidak terbaca sama sekali |
| `CLASSIFICATION_UNCERTAIN` | 200 (`klasifikasi.requires_review=true`) | Tidak error keras, hanya penanda |
| `FIELD_NOT_FOUND` | 200 (`source_type:'NOT_FOUND'` per field) | Bukan HTTP error |
| `OPD_MAPPING_NOT_FOUND` | 200 (field-level) | §13 |
| `NOMENCLATURE_NOT_FOUND` | 200 (field-level) | Tidak ada kandidat whitelist cocok |
| `DPA_NOT_FOUND` | 200 (field-level) | §20 |
| `PENATAUSAHAAN_NOT_FOUND` | 200 (field-level) | §20 |
| `INDICATOR_MAPPING_NOT_FOUND` | 200 (field-level) | §19, FK `indikator_renstra_id` kosong (NULL) — kondisi awal normal, bukan error |
| `INDICATOR_MAPPING_OPD_MISMATCH` | **[BARU v2]** 200 (field-level, saat recall §19) / 422 (saat SIMPAN mapping di endpoint ADMIN §27) | FK **terisi** tapi menunjuk `IndikatorRenstra` milik OPD yang BERBEDA dari konteks yang sah — beda dari `OPD_MAPPING_NOT_FOUND` (bridge OPD ProSN sendiri tidak ketemu) dan beda dari `CROSS_OPD_ACCESS_DENIED` (percobaan akses lintas-OPD lewat parameter request, bukan kesalahan konfigurasi data) — lihat penjelasan pembeda di §19/§13 |
| `RENSTRA_YEAR_OUT_OF_RANGE` | **[BARU v2]** 200 (field-level) | §19 langkah 6 — tahun yang diminta berada di luar rentang `target_tahun_1..6` periode Renstra terkait (offset `<1` atau `>6`); TIDAK mengambil kolom manapun secara clamp/tebakan |
| `INDICATOR_VALUE_NOT_FOUND` | 200 (field-level) | FK ada, ownership valid, tahun dalam jangkauan, TAPI baris/kolom nilai tahun tsb kosong |
| `OLLAMA_UNAVAILABLE` | 200 (di `warnings`) | Tidak menggagalkan request |
| `EVIDENCE_BINDING_INVALID` | 404/409 | Saat rebind: entity tidak ada / entity_type tidak dikenal |
| `CROSS_OPD_ACCESS_DENIED` | 403 | Bila resolveOpdScope mendeteksi percobaan akses OPD lain (defense-in-depth, seharusnya tidak pernah tercapai krn scope diturunkan dari data sendiri) — **security boundary violation**, beda dari `INDICATOR_MAPPING_OPD_MISMATCH` (kesalahan konfigurasi data admin, bukan percobaan akses) |
| `AUTOFILL_STALE` | 409 | §22/§32 — sumber berubah sejak preview |
| `PROSNP_EVIDENCE_NOT_STAGED` | 404 | §7 Phase E langkah 2 |
| `PROSNP_EVIDENCE_CROSS_PENGISIAN` | 409 | §7 Phase E langkah 4 (reuse kode existing yg sudah ada persis nama ini di `assertEntityBinding`) |

Prinsip tetap: **`NOT_FOUND` bukan `0`** — field numerik yang `NOT_FOUND` (termasuk varian `INDICATOR_MAPPING_OPD_MISMATCH`/`RENSTRA_YEAR_OUT_OF_RANGE`, keduanya tetap kategori "tidak ditemukan/tidak sah", bukan hard HTTP error) dikirim sbg `value:null`, bukan `value:0`, di seluruh lapisan (API response, DB provenance JSON, maupun form frontend — input tetap kosong/disabled, bukan menampilkan angka 0). Sesuai §L mandat: recall absence tetap field-level degradation (HTTP 200), sedangkan pelanggaran keamanan/otorisasi (`CROSS_OPD_ACCESS_DENIED`) tetap hard failure (HTTP 403).

---

## 31. Transaction & Idempotency

**[Direvisi v3 — Micro Corrective Pass P0: Idempotency Serialization Fix]**

Operasi READ-ONLY/preview (`/analisis`) tidak butuh transaksi DB (kecuali 1 UPDATE cache, auto-commit). Operasi WRITE (`/autofill-apply`, `/rebind`, mapping ADMIN §27) WAJIB dalam 1 transaksi Sequelize (`db.sequelize.transaction`) mengikuti pola existing di seluruh `prosnpWorkflowService.js`.

### `/autofill-apply` — retry-idempotency via staging-row serialization

**Prinsip**: frontend disable-button tetap ada sbg UX guard, TAPI backend adalah authority terakhir — network retry, timeout, double-click, pemanggilan API langsung berulang, ATAU dua request nyaris bersamaan TIDAK BOLEH menciptakan entity register kedua.

**Root cause desain v2 yang diperbaiki** (§C Laporan): desain v2 mengunci baris TARGET evidence link (`entity_type = entityType`) dengan `lock: transaction.LOCK.UPDATE` SEBELUM baris itu ada. `SELECT ... FOR UPDATE` terhadap baris yang belum ada TIDAK mengunci apa pun yang berguna — ia hanya mengembalikan 0 baris tanpa efek serialisasi. Dua transaksi (A dan B) yang berjalan hampir bersamaan SAMA-SAMA menemukan "belum ada" dan SAMA-SAMA lanjut membuat entity — menghasilkan dua entity duplikat. Ini adalah defect desain P0, bukan sekadar celah kecil.

**Perbaikan final**: kunci baris yang **SUDAH PASTI ADA** sebelum `/autofill-apply` dipanggil sama sekali — yaitu baris **staging evidence binding** (`ProsnBuktiIndikator` dgn `entity_type='PENGISIAN'`, dibuat di Phase A §7 saat upload). Baris ini menjadi **canonical serialization lock**: unik per `(bukti_dukung_id, pengisian_id, tenant_id)`, sudah tenant-scoped, dan wajib ada (bila tidak ada, `/autofill-apply` memang harus ditolak `PROSNP_EVIDENCE_NOT_STAGED` — bukan kondisi yang butuh serialisasi).

**Canonical duplicate identity**: `(bukti_id, pengisian_id, entity_type)` — TIDAK memakai tabel idempotency baru, TIDAK memakai unique index DB baru. Serialization key EFEKTIF adalah staging binding `bukti_id + pengisian_id + tenant_id`; `entity_type` tetap dipakai pada duplicate lookup (langkah 4 di bawah) untuk membedakan target entity yang dimaksud.

```
autofillApply(buktiId, pengisianId, entityType, fields, actor, tenantId):
  db.sequelize.transaction(async (transaction) => {

    // STEP 1 — VALIDATE INPUT
    // Validasi buktiId, pengisianId, entityType dikenal (ENTITY_MODEL_BY_TYPE), tenantId, actor,
    // authorization (allowRoles(WRITE) di level route, sudah terjadi sebelum fungsi ini dipanggil).

    // STEP 2 — LOCK STAGING BINDING (SERIALIZATION POINT, SEBELUM APA PUN YANG LAIN)
    const stagingLink = await ProsnBuktiIndikator.findOne({
      where: {
        bukti_dukung_id: buktiId,
        entity_type: 'PENGISIAN',
        pengisian_id: pengisianId,
        tenant_id: tenantId,
      },
      transaction,
      lock: transaction.LOCK.UPDATE,   // baris ini SUDAH ADA sejak Phase A (§7) — locking di sini
                                        // punya efek serialisasi nyata, beda dari desain v2 yang
                                        // mengunci baris target yang belum tentu ada.
    });
    if (!stagingLink) throw new ProsnError(..., 404, 'PROSNP_EVIDENCE_NOT_STAGED');
    // Request B yang datang hampir bersamaan dgn identity sama WAJIB MENUNGGU (blocked oleh row
    // lock DB) sampai transaksi A yang memegang lock ini commit/rollback — inilah titik serialisasi.

    // STEP 3 — VERIFY STAGING OWNERSHIP
    // stagingLink.pengisian_id === pengisianId dan stagingLink tenant_id === tenantId SUDAH
    // dijamin oleh WHERE clause langkah 2 sendiri (bukan pengecekan terpisah setelah fetch) —
    // tidak ada parameter scope yang dipercaya dari client di luar apa yang sudah difilter di sini.

    // STEP 4 — CHECK EXISTING TARGET BINDING (SETELAH lock staging diperoleh, SEBELUM create apa pun)
    const existingLink = await ProsnBuktiIndikator.findOne({
      where: { bukti_dukung_id: buktiId, entity_type: entityType, tenant_id: tenantId },
      include: [{ association: entityTypeAssocName, where: { pengisian_id: pengisianId }, required: true }],
      transaction,
      // TIDAK butuh lock: transaction.LOCK.UPDATE tambahan di sini — serialisasi SUDAH terjadi di
      // STEP 2. Begitu transaksi A mencapai titik ini dan sudah lolos STEP 2, tidak ada transaksi
      // lain yang bisa mendahului menulis target binding untuk identity yang sama (mereka masih
      // menunggu lock STEP 2 mereka sendiri sampai transaksi A commit).
    });

    if (existingLink) {
      // IDEMPOTENT SUCCESS — JANGAN update provenance, JANGAN update created_at, JANGAN create
      // entity, JANGAN create evidence link baru. Kembalikan hasil dari percobaan PERTAMA apa adanya.
      return {
        entity: await loadEntity(entityType, existingLink.entity_id, transaction),
        evidence_link: existingLink,
        created: false,
        idempotent_replay: true,
      };
    }

    // STEP 5 — REVALIDATE STALENESS (§32) — bila stale: rollback transaksi, throw AUTOFILL_STALE.

    // STEP 6 — CREATE ENTITY (reuse service register existing sesuai tipe_form: ProsnSuratPenugasan/
    //           ProsnRapatForkopimda/ProsnCadanganTarget(+transaksi)/ProsnInovasi)

    // STEP 7 — WRITE PROVENANCE (set provenance + confirmed_by + confirmed_at)

    // STEP 8 — REBIND EVIDENCE — prosnpEvidenceRebindService.rebindBuktiKeEntity(...) DENGAN
    //           transaction YANG SAMA (bukan transaksi baru — satu unit kerja atomik STEP 2-8).

    // STEP 9 — RETURN FIRST SUCCESS
    return { entity, evidence_link, created: true, idempotent_replay: false };

    // STEP 10 — COMMIT (implisit, keluar dari db.sequelize.transaction(...) tanpa exception)
  });
```

### Concurrency Semantics (eksplisit)

Skenario Request A dan Request B datang hampir bersamaan dengan identity sama `(bukti_id, pengisian_id, entity_type)`:

```
REQUEST A                                    REQUEST B
1. acquire LOCK UPDATE staging row  ✅        1. mencoba lock staging row yang sama
2. target binding belum ada                   2. WAIT — diblokir DB, menunggu transaksi A selesai
3. create entity                              (masih menunggu...)
4. create target binding                      (masih menunggu...)
5. COMMIT                                     3. lock staging row akhirnya diperoleh
                                               4. cek target binding → SEKARANG SUDAH ADA (dibuat A)
                                               5. return created:false, idempotent_replay:true
                                               6. TIDAK membuat entity kedua
```

**Invariant yang dijamin**: EXACTLY ONE target entity untuk identity yang sama. EXACTLY ONE target evidence binding untuk identity yang sama. Staging PENGISIAN binding tetap EXACTLY ONE (tidak bertambah, tidak dihapus — hanya dikunci sementara selama transaksi berjalan).

**Wording presisi (dihindari klaim berlebihan)**: dengan storage engine/transaction semantics yang mendukung `SELECT ... FOR UPDATE` seperti konfigurasi aplikasi yang digunakan (MySQL/InnoDB via Sequelize `transaction.LOCK.UPDATE`), staging-row lock menjadi serialization point yang deterministik untuk request dengan identity yang sama. Ini BUKAN klaim "mathematically impossible under every DB implementation" — ini adalah properti transaksional standar row-locking pada engine yang mendukungnya, dan batasan verifikasi otomatis di lingkungan self-test dicatat eksplisit di §36 Test R.

### Lock Scope

Serialization key efektif = staging binding untuk `bukti_id + pengisian_id + tenant_id`. `entity_type` target tetap dipakai pada duplicate lookup (STEP 4), bukan sebagai bagian kunci yang di-lock. Alasan staging row (bukan target row) yang dikunci: (1) sudah ada SEBELUM apply dipanggil; (2) satu bukti staging punya `pengisian_id` sumber yang jelas dan tetap; (3) tenant-scoped; (4) dapat dikunci secara deterministik (row nyata, bukan row hipotetis); (5) tidak memerlukan skema tambahan apa pun.

### Legitimate Multi-Entity Use (tidak rusak oleh guard ini)

Satu `bukti_dukung_id` yang sama TETAP dapat secara sah terikat ke `entity_type` LAIN bila workflow memang mengizinkan (mis. bukti yang sama dipakai sbg supporting evidence di konteks berbeda lewat binding manual eksplisit via `EntityBuktiManager`/endpoint rebind manual) — guard STEP 2/4 di atas HANYA mencegah **retry/replay `/autofill-apply` untuk identity `(bukti_id, pengisian_id, entity_type)` YANG SAMA PERSIS** menciptakan entity kedua. Manual workflow existing (create entity tanpa lewat `/autofill-apply`, isi form biasa) TETAP TIDAK melalui pengecekan ini sama sekali — mekanisme ini HANYA aktif pada jalur `/autofill-apply`.

### `prosnpEvidenceRebindService` idempotency ≠ `/autofill-apply` idempotency

Dua guard yang saling melengkapi, TIDAK saling menggantikan:
- **Rebind service idempotency** (§7 Phase E langkah 5, TIDAK berubah oleh pass ini): melindungi terhadap duplicate LINK ke entity yang **SUDAH ADA** (`bukti_dukung_id + entity_type + entity_id` — ketiganya termasuk `entity_id` yang sudah diketahui).
- **Autofill apply serialization** (STEP 2/4 di atas, BARU pada pass ini): melindungi terhadap duplicate ENTITY **sebelum `entity_id` bahkan tersedia** — masalah yang secara struktural tidak bisa diselesaikan rebind service sendiri karena rebind baru relevan SETELAH entity ada.

Bila salah satu langkah gagal (create entity gagal, atau rebind gagal), SELURUHNYA rollback, tidak ada state parsial (entity tanpa evidence, atau evidence ter-rebind tanpa entity valid).

---

## 32. Stale Recall Handling

```
Setiap field ber-source_type DPA_RECALL/PENATAUSAHAAN_RECALL/INDIKATOR_RENSTRA_RECALL/RENSTRA_RECALL
menyertakan source_snapshot_at (timestamp saat /analisis dijalankan).

Saat /autofill-apply menerima field-field tsb:
  1. Re-jalankan resolver yang sama (dpaRecallAdapter/penatausahaanRecallAdapter/renstraIndicatorRecallAdapter)
     SEKALI LAGI dgn parameter identik.
  2. Bandingkan value BARU vs value yang dikirim client (yang berasal dari preview lama).
  3. Jika BEDA (bukan hanya beda floating-point kecil — pakai perbandingan exact untuk DECIMAL) →
     TOLAK seluruh request dgn 409 AUTOFILL_STALE, response menyertakan { field_key, old_value, new_value }
     utk SEMUA field yang berubah sekaligus (bukan berhenti di field pertama) — user re-preview sekali,
     bukan trial-error berulang.
  4. Jika SAMA → lanjut proses normal (§31).
Field ber-source_type DOCUMENT_EXTRACTED/RULE_DERIVED/AI_SUGGESTED/USER_CONFIRMED TIDAK di-restale-check
(sumbernya adalah dokumen statis yang sudah diupload, tidak berubah sendiri antara preview dan apply).
```

---

## 33. Existing Rule Engine Integration

**Tidak ada perubahan pada satu baris pun** di `backend/services/prosnp/ruleEngine/*.js`, `prosnpRuleEngineService.js`, atau `prosnpEvidenceGateService.js`. Entity yang dibuat lewat `/autofill-apply` adalah baris `ProsnSuratPenugasan`/`ProsnRapatForkopimda`/`ProsnCadanganTarget`+transaksi/`ProsnInovasi` yang **strukturnya identik** dengan baris yang dibuat lewat form manual existing — rule engine tidak dapat dan tidak perlu membedakan asal-usul baris (manual vs auto-fill), hanya membaca kolom domain yang sudah ada. Kolom `provenance` (JSON baru) **tidak dibaca rule engine sama sekali** — murni metadata audit/UI.

---

## 34. Evidence Gate Integration

Evidence gate (`prosnpEvidenceGateService.js`, `assertKelengkapanTipeBaru` di `prosnpWorkflowService.js`) **tidak diubah**. Binding baru dari `prosnpEvidenceRebindService.rebindBuktiKeEntity()` menghasilkan baris `ProsnBuktiIndikator` dengan bentuk **identik** (kolom yang sama: `entity_type`, `entity_id`, `kategori`, `checklist_status` default `belum_dicek`) dengan binding yang dihasilkan `EntityBuktiManager` manual existing — evidence gate query (`kategoriValidSetUntukEntity`, dst.) akan menemukan binding ini dengan cara yang PERSIS SAMA seperti binding manual, tanpa perlu tahu bahwa binding tsb berasal dari alur auto-fill. Binding `entity_type='PENGISIAN'` awal (staging) **tetap ada selamanya** setelah rebind — tidak dihapus — sehingga jejak "dokumen asal" tetap tertaut ke level pengisian juga (dua binding untuk satu `bukti_dukung_id`, keduanya sah, keduanya additive).

---

## 35. Migration Plan

9 kolom aditif (§25) dibagi jadi 2 file migration (mengikuti pola repo: 1 migration boleh berisi beberapa ALTER TABLE terkait tema yang sama, mengikuti gaya `20260807111000-prosn-indicator-foundation-master-dan-ownership.js` yang sudah menggabungkan beberapa ALTER):

1. `<timestamp>-prosn-autofill-evidence-cache-dan-provenance.js` — 4 kolom `prosnp_bukti_dukung` + 4 kolom `provenance` (surat_penugasan, rapat_forkopimda, cadangan_target, inovasi).
2. `<timestamp>-prosn-master-indikator-renstra-mapping.js` — 1 kolom `prosnp_master_indikator.indikator_renstra_id`.

Kedua migration: `up` = `addColumn` murni (tidak ada `changeColumn`/`removeColumn`), `down` = `removeColumn` simetris. **Tidak ada backfill/UPDATE statement** di migration manapun (kolom baru semua defaultnya NULL; pengisian `indikator_renstra_id` dilakukan belakangan oleh Admin lewat endpoint `PUT /prosnp/master-indikator/:id/mapping-renstra` — **OD-2 RESOLVED, endpoint ini RESMI bagian Spesifikasi 35 §27, dibangun di Fase 1 §40** — bukan di luar scope).

Timestamp migration harus dipilih **setelah** migration korektif terakhir yang sudah ada (`20260808090001-add-rpjmd-approval-status.js`, per pengecekan git log working tree saat ini) dan dijalankan via `--to <filename>` per konvensi yang sudah dipakai sepanjang sesi ini, untuk menghindari memicu migration lain yang sedang pending dari workstream berbeda.

---

## 36. Test Plan

Mapping persis ke §24 mandat (A–N), semua isolated test periode (pola `prosnpIntegrationSelfTest.js`/`prosnpMbgIntegrationSelfTest.js` existing — tahun fiktif, cleanup total di akhir):

| # | Skenario | Metode |
|---|---|---|
| A | OPD Isolation: OPD A tidak pernah dapat DPA/realisasi/indikator OPD B | Buat 2 periode uji beda `perangkat_daerah_id`/mapping OPD berbeda, panggil adapter langsung, assert hasil OPD B `NOT_FOUND`/`OPD_MAPPING_NOT_FOUND` saat diminta dari konteks OPD A |
| B | Evidence Staging: upload PENGISIAN berhasil sebelum entity ada | Upload bukti sebelum ada baris `ProsnSuratPenugasan` sama sekali, assert 201 |
| C | Evidence Rebind: entity dibuat → bukti terikat ke entity benar | Panggil `/autofill-apply`, assert `ProsnBuktiIndikator` baru dgn `entity_id` = entity yang baru dibuat, DAN binding PENGISIAN lama tetap ada |
| D | Cross-Indicator Leakage: evidence B.1.1 tidak terlihat B.1.2 | Upload staging di pengisian B.1.1, coba rebind paksa ke entity B.1.2 (pengisian beda) → assert `PROSNP_EVIDENCE_CROSS_PENGISIAN` |
| E | Document Extraction: PDF text-layer, scanned PDF OCR, image OCR, unreadable | 4 fixture file kecil disertakan di `backend/scripts/fixtures/prosnp-autofill/`, assert `extraction_method` sesuai & `EXTRACT_FAILED` utk fixture rusak |
| F | Hallucination Guard: nomor dokumen/angka fabricated dari AI ditolak | Mock provider AI mengembalikan nilai yang sengaja TIDAK ada di `sourceText` fixture → assert validator REJECT → field jadi NOT_FOUND |
| G | DPA: pagu dari DPA benar | Reuse pola assertion existing `prosnpIntegrationSelfTest.js` §Source-Driven DPA, tambah assert lewat adapter baru |
| H | Penatausahaan: realisasi SUM benar & OPD benar | Seed 2 baris `penatausahaan` beda `dpa_id`/OPD, assert SUM hanya menjumlah yang cocok OPD diminta |
| I | Target/Realisasi Indikator: tidak dari Penatausahaan; fallback Renstra hanya jika mapping valid | Assert adapter TIDAK PERNAH query tabel `penatausahaan`/`dpa` sama sekali (spy/assert query log) untuk field ini; assert `INDICATOR_MAPPING_NOT_FOUND` saat FK NULL |
| J | Not Found ≠ 0 | Assert `value === null`, bukan `value === 0`, utk seluruh kasus NOT_FOUND lintas adapter |
| K | Score: client tidak bisa kirim skor manual | Reuse pola serangan existing (`prosnpFinalGateVerification.js`) — kirim `skor_indikatif_internal` di body `/autofill-apply`, assert diabaikan sepenuhnya |
| L | B.1.3 Regression: source-driven DPA existing tetap bekerja | Re-run `prosnpIntegrationSelfTest.js` PENUH tanpa modifikasi, assert 11/11 tetap lulus |
| M | Workflow: evidence gate existing tidak rusak | Re-run seluruh regression existing (31+20+11+14+3 = 79 assertion) tanpa modifikasi |
| N | Production Data: 2 periode 2025 tidak berubah | Snapshot count register (surat/rapat/target/transaksi/inovasi) sebelum & sesudah SELURUH test suite baru dijalankan, assert identik (pola persis §22 mandat corrective pass sebelumnya) |

**[BARU v2 — Koreksi Wajib CEA]**

| # | Skenario | Metode |
|---|---|---|
| O | **Renstra Cross-OPD Mapping** (Koreksi #2, P0) | Buat `IndikatorRenstra` uji milik `RenstraOPD` dgn `opd_id` = OPD B. Set `prosnp_master_indikator.indikator_renstra_id` (di test isolated, BUKAN 4 indikator produksi) menunjuk baris tsb. Panggil `renstraIndicatorRecallAdapter.recall()` dari konteks periode ProSN milik OPD A. Assert: `target`/`realisasi` KEDUANYA `INDICATOR_MAPPING_OPD_MISMATCH`, TIDAK ADA nilai OPD B (baik target maupun realisasi) yang ikut terkirim di response manapun. |
| P | **Admin Mapping Ownership** (Koreksi #2) | (i) Admin memetakan indikator ProSN OPD A → `IndikatorRenstra` milik OPD A → assert sukses, `mapping_new` tersimpan, `ActivityLog` tercatat. (ii) Admin memetakan indikator ProSN OPD A → `IndikatorRenstra` milik OPD B → assert `422 INDICATOR_MAPPING_OPD_MISMATCH`, FK TIDAK berubah dari nilai sebelumnya. |
| Q | **Autofill Idempotent Retry — Serial** (Koreksi #3, direvisi Micro Pass P0) | Panggil `/autofill-apply` dgn identity `(bukti_id, pengisian_id, entity_type)` X **secara serial** (bukan konkuren) → panggilan pertama assert `created:true, idempotent_replay:false`. Panggilan KEDUA persis identity yang sama → assert `created:false, idempotent_replay:true`. Assert: jumlah baris entity target **exactly 1** (query count sebelum/sesudah identik); jumlah `ProsnBuktiIndikator` link ke entity target tsb **exactly 1** (tidak duplikat); **[BARU]** jumlah baris staging binding (`entity_type='PENGISIAN'` utk `bukti_id`+`pengisian_id` yang sama) TETAP TIDAK BERUBAH (tidak bertambah, tidak dihapus oleh proses lock); **[BARU]** `entity_id` pada `evidence_link` hasil panggilan KEDUA (replay) SAMA PERSIS dgn `entity_id` hasil panggilan PERTAMA; `provenance`/`created_at` entity pertama TIDAK berubah setelah retry. |
| R | **Concurrent Duplicate Apply** (Koreksi #3, **diperkeras Micro Pass P0**) | Jalankan 2 request `/autofill-apply` identity SAMA PERSIS secara **concurrent** (`Promise.all` atau mekanisme concurrency paling nyata yang tersedia pada harness test). Urutan response A/B tidak penting, TAPI hasil akhir WAJIB: **EXACTLY 1** (bukan "maksimal 1") response ber-`created:true, idempotent_replay:false`; **EXACTLY 1** response ber-`created:false, idempotent_replay:true`; database final: entity target count = **1** (bukan "maksimal 1"), target evidence binding count = **1**, staging PENGISIAN binding tetap = **1**, provenance HANYA ada pada entity pertama, TIDAK ADA duplicate register row dalam kondisi apa pun. **Batasan lingkungan test diakui secara eksplisit tanpa melemahkan requirement desain**: bila harness self-test Node.js single-process existing (`prosnpIntegrationSelfTest.js` dkk., berjalan di atas koneksi DB yang sama/​`sequelize` instance yang sama) tidak dapat mensimulasikan 2 KONEKSI DB independen secara benar-benar konkuren (mis. Promise.all pada driver yang tetap serialize internal), maka test ini WAJIB mendokumentasikan keterbatasan tsb secara eksplisit sbg limitation laporan hasil — **BUKAN sbg alasan melonggarkan Definition of Done menjadi "maksimal satu"/"best effort"**. Requirement desain tetap **EXACTLY ONE** tanpa syarat. Jika lingkungan test tidak mampu membuktikan concurrent transaction sungguhan, tambahkan catatan wajib: **"API concurrency verification diperlukan di lingkungan dengan koneksi DB independen sebelum production-ready claim"** — tanpa mengubah desain arsitektur §31. |
| S | **Document Type Regulatory Semantics** (Koreksi #1) | Assert: (i) dokumen ber-klasifikasi `peraturan_daerah` TIDAK PERNAH menghasilkan field Status Perkada B.1.4 = HIGH/auto-checked; (ii) dokumen heading "PERATURAN GUBERNUR" ter-klasifikasi `peraturan_gubernur`, BUKAN `keputusan_gubernur`; (iii) dokumen heading "KEPUTUSAN GUBERNUR" ter-klasifikasi `keputusan_gubernur`, BUKAN `peraturan_gubernur`; (iv) `cadanganTargetFieldExtractor` B.1.3 HANYA menerima Nomor/Tanggal Keputusan dari dokumen `keputusan_gubernur`, dokumen `peraturan_gubernur` tidak mengisi field tsb; (v) dokumen `peraturan_daerah` tidak pernah mengisi Status Perkada B.1.4 = terpenuhi. |
| T | **Renstra Year Boundary** (OD-1) | `offset<1` (tahun sebelum `tahunAwalRenstra`) → assert `RENSTRA_YEAR_OUT_OF_RANGE`, bukan clamp ke `target_tahun_1`. `offset>6` → assert `RENSTRA_YEAR_OUT_OF_RANGE`, bukan clamp ke `target_tahun_6`. Assert TIDAK PERNAH mengakses properti `target_tahun_0` atau `target_tahun_7`/lebih (guard sebelum akses, bukan akses lalu tangkap undefined). |

Test A–N (v1) **tidak dihapus**, tetap dipertahankan penuh.

---

## 37. Browser UAT Plan

Mengikuti pola Puppeteer existing (`prosnpBrowserUAT.js`/`prosnpMbgBrowserUAT.js`) — periode uji terisolasi (tahun fiktif), token SUPER_ADMIN + flag `_epelara_sso` (pola sudah terbukti bekerja, lihat sesi corrective pass), TIDAK PERNAH menyentuh periode 2025 Semester I/II nyata dengan write:

1. **B.1.1**: upload Surat/SK fixture → klik "Analisis & Isi Otomatis" → tunggu preview → assert minimal 1 baris HIGH tercentang, minimal 1 baris NOT_FOUND ter-disable → klik "Gunakan N Hasil" → assert entity baru muncul di tabel Register Surat Penugasan → buka "Bukti" pada baris tsb → assert bukti yang sama muncul (rebind sukses) → (opsional) klik Hitung Ulang Skor, assert tidak error.
2. **B.1.2**: upload Notulen fixture → assert field Unsur Forkopimda Hadir TIDAK tercentang otomatis (LOW-by-design) → user centang manual → create rapat → assert evidence per-record.
3. **B.1.3**: assert cascading DPA existing (Tahun→OPD→Program→Kegiatan→SubKegiatan) TIDAK regresi (screenshot dibandingkan dgn baseline corrective pass) → terpisah, upload dokumen keputusan target → assert nomor_keputusan/tanggal_keputusan/target_ton ter-extract → transaksi stok tidak terpengaruh sama sekali.
4. **B.1.4**: upload dokumen inovasi/Perkada fixture → assert Relevansi TIDAK auto-checked → narrative draft muncul dgn label "Draft otomatis — silakan tinjau" → user confirm → evidence binding.

Verifikasi tambahan lintas skenario: tidak ada manual typing yang tidak perlu (field HIGH sudah terisi tanpa diketik), status field NOT_FOUND jelas visual, draft AI dapat diedit sebelum simpan, provenance terlihat (tooltip/badge), confidence terlihat (tag warna).

---

## 38. Regression Guards

- Full suite existing (§36 poin L, M) WAJIB 100% lulus tanpa modifikasi sebelum PR/commit implementasi manapun dianggap selesai.
- MBG 2.1–2.7 diregresi penuh (`prosnpMbgIntegrationSelfTest.js`, `prosnpMbgRuleEngineSelfTest.js`) meski TIDAK disentuh sama sekali oleh spesifikasi ini — memastikan tidak ada efek samping tak sengaja lewat shared file (`prosnpWorkflowService.js`, `ProsnBuktiIndikator` model, dll.).
- Workflow compliance guard (`workflowComplianceValidationSelfTest.js`) dijalankan utk model baru bila ada (spesifikasi ini tidak menambah model BARU, hanya kolom pada model existing — kemungkinan besar tidak memicu guard sama sekali, tapi tetap dijalankan sbg sanity check).

---

## 39. Rollback Strategy

- **Migration**: seluruh migration `down()` simetris (`removeColumn`) — rollback penuh tanpa kehilangan data existing (kolom baru semua nullable, tidak ada data existing yang bergantung padanya).
- **Kode**: seluruh file BARU (§26/§28) dapat dihapus/di-revert tanpa mempengaruhi file existing manapun (tidak ada file existing yang di-MODIFY untuk memanggil kode baru KECUALI 4 frontend Section component menambah 1 tombol — revert 4 file itu = fitur hilang, tidak ada breakage). Tidak ada "titik tanpa jalan kembali" (no point of no return) di desain ini.
- **Data**: entity register yang sudah terlanjur dibuat lewat auto-fill (sebelum rollback kode) TETAP VALID selamanya (strukturnya identik entity manual) — rollback kode tidak memerlukan rollback data.

---

## 40. Implementation Sequence

**[Direvisi v2]** Divalidasi terhadap dependency nyata repo:

| Fase | Isi | Dependency |
|---|---|---|
| 1 | Migration §25 (kedua file) + `resolveOpdScope` helper + kerangka `prosnpAutoFillOrchestrator` (skeleton, adapter dummy) + **`renstraOwnershipValidator.js`** (§26) + **endpoint ADMIN mapping `PUT /master-indikator/:id/mapping-renstra`** (§27, dapat mulai begitu kolom `indikator_renstra_id` tersedia dari migration di fase yang sama) + test P (§36) | Tidak ada — bisa mulai segera |
| 2 | `prosnpEvidenceRebindService.js` (mencakup fungsi cek idempotency rebind §7 Phase E) + endpoint `/rebind` + **staging-row serialization primitive** (fungsi kunci `ProsnBuktiIndikator` `entity_type='PENGISIAN'` via `transaction.LOCK.UPDATE`, §31 STEP 2 — dibangun di fase ini SEBAGAI PRIMITIVE, bukan ditambahkan belakangan setelah endpoint apply selesai) + test C/D | Fase 1 |
| 3 | `prosnpDocumentTextExtractor.js` + `prosnpDocumentClassifier.js` (rule-based, **dgn disambiguasi Keputusan Gubernur vs Peraturan Gubernur vs Peraturan Daerah — Koreksi #1**) + 4 extractor B.1.1-4 (rule-based murni, TANPA Ollama dulu) + test E/S | Fase 1 |
| 4 | `dpaRecallAdapter` (wrapper) + `penatausahaanRecallAdapter` (baru) + `renstraIndicatorRecallAdapter` (baru, **dgn ownership validation §19 + resolusi tahun ber-boundary, reuse formula `pilihTargetTahun`**) + test G/H/I/O/T | Fase 1 (kolom `indikator_renstra_id` + `renstraOwnershipValidator` harus sudah ada) |
| 5 | `ProsnAutofillModal.jsx` (frontend) + endpoint `/analisis` (gabung Fase 3+4) + endpoint `/autofill-apply` — **menggunakan staging-row serialization primitive dari Fase 2 SECARA PENUH sejak endpoint ini pertama kali dibangun** (STEP 1-10 §31 lengkap, bukan versi sementara tanpa lock yang "diperkuat belakangan") + integrasi 4 Section component + test Q/R | Fase 2, 3, 4 |
| 6 | `narrativeDraftAdapter.js` (RULE_ENHANCED dulu, prompt baru, tanpa Ollama) + UI Catatan draft | Fase 5 |
| 7 (opsional, **default OFF — OD-3 RESOLVED, Option A**) | Aktivasi Ollama sekunder (klasifikasi + narasi) di belakang env gate, + `prosnpAiOutputValidator.js` penuh + test F **wajib lulus sebelum Fase 7 dianggap eligible diaktifkan** | Fase 3, 6 |
| 8 | Integration test A–T penuh (bukan hanya A/B/J/K/L/M/N) + Browser UAT §37 + regresi MBG | Semua fase sebelumnya |

Catatan urutan: endpoint ADMIN mapping (OD-2) sengaja dimasukkan **Fase 1** (bukan fase terpisah di akhir) karena tanpa itu tidak ada cara sah mengisi `indikator_renstra_id` untuk menguji Fase 4 — memajukannya ke Fase 1 menghindari Fase 4 terhambat menunggu keputusan/mekanisme yang seharusnya sudah tersedia sejak awal.

---

## 41. Exact File Impact Matrix

*(Konsolidasi §26/§28/§25/§27 — lihat tabel di masing-masing bagian untuk detail Purpose/Risk/Dependency; ringkasan aksi per kategori)*

| Kategori | NEW | MODIFY | REUSE (tidak diubah) |
|---|---|---|---|
| Migration | 2 file | — | — |
| Model | — | `prosnpBuktiDukungModel.js`, `prosnpSuratPenugasanModel.js`, `prosnpRapatForkopimdaModel.js`, `prosnpCadanganTargetModel.js`, `prosnpInovasiModel.js`, `prosnpMasterIndikatorModel.js` (tambah field definisi kolom baru, TIDAK ada logic association yang diubah) | `prosnpPengisianModel.js`, `prosnpBuktiIndikatorModel.js`, seluruh model lain |
| Service (backend) | 15 file (§26 — **+1 v2**: `renstraOwnershipValidator.js`) | `prosnpMasterIndikatorService.js` (**+1 fungsi v2**: `setIndikatorRenstraMapping`) | `prosnpDpaSourceService.js`, `prosnpWorkflowService.js`, `narrativeProviderFactory.js`, 4 service register existing, `ActivityLog` model |
| Controller | `prosnpB1xController.js` (tambah 4 fungsi v2: `analisisBukti`, `terapkanAutofill`, `rebindBukti`, **`setMappingIndikatorRenstra`**) | — | `prosnpController.js` (tidak disentuh sama sekali di spesifikasi ini — berbeda dari corrective pass sebelumnya) |
| Route | — | `prosnpRoutes.js` (tambah **4 baris route v2**, termasuk 1 route ADMIN mapping) | — |
| Frontend Component | 1 file baru (`ProsnAutofillModal.jsx`) | 4 Section component (§28) + `prosnpApi.js` | Seluruh komponen lain |
| Test | Fixture baru + 1 script integration test baru (`prosnpAutofillIntegrationSelfTest.js`, pola sama persis existing, **mencakup Test A–T v2**) | — | Seluruh script test existing dijalankan ulang sbg regresi, tidak diubah |

---

## 42. Risks

**P0**
- Cross-OPD leakage bila `resolveOpdScope`/filter OPD lupa dipasang di adapter baru manapun — mitigasi: unit test A wajib per-adapter, bukan hanya end-to-end.
- **[BARU v2]** Cross-OPD leakage via FK admin-curated (`indikator_renstra_id`) yang salah/basi — mitigasi: ownership validation §19 WAJIB dijalankan ulang setiap recall (bukan hanya saat mapping disimpan), test O.
- Hallucination lolos ke preview sbg data faktual — mitigasi: validator §17 wajib, test F wajib sebelum Fase 7 (Ollama) diaktifkan.
- Evidence rebind salah sasaran (leakage antar pengisian) — mitigasi: guard langkah 4 §7 Phase E + test D.
- **[Direvisi Micro Pass P0]** Duplicate entity register akibat retry/replay/concurrent apply `/autofill-apply` — **mitigasi final: staging PENGISIAN row lock (`transaction.LOCK.UPDATE` pada baris yang SUDAH ADA sejak Phase A) sebagai serialization point, dilakukan SEBELUM target binding lookup dan SEBELUM create entity apa pun, di dalam satu transaksi** (§31 STEP 2-4) — BUKAN lagi mengandalkan locking pada baris target yang belum tentu ada (desain v2 sebelumnya terbukti P0 defect, lihat §31 "Root cause desain v2 yang diperbaiki"). Diverifikasi test Q (serial retry) dan test R (concurrent identical apply, requirement EXACTLY ONE).
- **[BARU v2]** Salah klasifikasi Peraturan Gubernur vs Keputusan Gubernur vs Peraturan Daerah menyebabkan B.1.3/B.1.4 keliru dianggap terpenuhi secara hukum — mitigasi: disambiguasi eksplisit §8/§10 (default ke `requires_review` bila ambigu, tidak pernah menebak), test S.

**P1**
- `indikator_renstra_id` kosong selamanya sampai Admin mengisi via endpoint §27 → Target/Realisasi Indikator recall permanen `NOT_FOUND` untuk semua indikator — ini SESUAI DESAIN (bukan bug) tapi berisiko disalahpahami sbg "fitur rusak" oleh Project Owner bila tidak dikomunikasikan (OD-2 RESOLVED — endpoint sudah masuk scope Fase 1, mengurangi risiko ini dibanding v1).
- **[BARU v2]** Fungsi resolusi tahun→kolom Renstra (`pilihTargetTahun` di `lakipBridgeService.js`) memakai perilaku CLAMP yang TIDAK cocok dgn kontrak `RENSTRA_YEAR_OUT_OF_RANGE` — mitigasi: §19 eksplisit menginstruksikan reuse FORMULA saja (bukan pemanggilan fungsi apa adanya), boundary check ditambahkan terpisah, test T.
- Ollama timeout/unavailable saat beban tinggi — mitigasi: sudah fallback berlapis existing, tapi UX loading harus jelas menyatakan "melanjutkan tanpa AI" bila terjadi.
- OCR akurasi rendah pada dokumen scan kualitas buruk → banyak field jatuh ke LOW/NOT_FOUND — bukan bug, tapi ekspektasi Project Owner perlu dikelola (dokumentasikan di UAT).

**P2**
- Kolom `provenance` JSON tidak terindeks — bila kelak dibutuhkan laporan "berapa % data diisi otomatis vs manual", perlu query JSON_EXTRACT (lebih lambat dari kolom biasa) — diterima sbg trade-off desain minimal (§3 D3).
- **[Direvisi Micro Pass P0]** Test R (concurrent duplicate apply) diakui memiliki keterbatasan simulasi pada arsitektur self-test single-process existing (kemungkinan tidak benar-benar menguji 2 koneksi DB independen) — keterbatasan ini didokumentasikan APA ADANYA di hasil test, **TANPA mengubah requirement desain yang tetap EXACTLY ONE entity** (bukan "maksimal satu"/"best effort", lihat §36 Test R). Bila keterbatasan ini terbukti nyata, verifikasi concurrency independen (2 koneksi DB terpisah) wajib dilakukan sebelum klaim production-ready, sesuai catatan wajib di §36.

---

## 43. Definition of Done (Spesifikasi ini, bukan implementasi)

**[v2]** Definition of Done untuk DOKUMEN SPESIFIKASI ini terpenuhi ketika: 3 koreksi wajib CEA diterapkan (§8/§10 regulatory semantics; §13/§19 OPD ownership Renstra; §27/§31 idempotency) DAN OD-1/OD-2/OD-3 berstatus RESOLVED (lihat §"Resolved Architecture Decisions") DAN seluruh section terdampak (§8,§13,§19,§25–§31,§36,§40–§44) tersinkronisasi tanpa kontradiksi internal — **seluruhnya dipenuhi oleh corrective pass v2 ini**. Definition of Done untuk IMPLEMENTASI (kode nyata) TETAP terpisah dan BELUM dimulai — lihat Laporan Akhir corrective pass ini untuk konfirmasi eksplisit "IMPLEMENTATION: NOT STARTED".

---

## 44. Implementation Prompt Candidate

**[Direvisi v3 — Micro Corrective Pass P0]** *(Draf, untuk dipakai CEA/Project Owner sebagai mandat implementasi terpisah bila spesifikasi ini disetujui pada Final Gate berikutnya — BUKAN dieksekusi sekarang)*

> Implementasikan persis Spesifikasi 35 v3 (`dokumenEPelara/Arsitektur Pengembangan e-Pelara/04-application-architecture/35-ProSN-Evidence-First-Recall-Document-Intelligence-Autofill-Specification.md`), mengikuti urutan Fase 1–8 (§40, termasuk endpoint ADMIN mapping Renstra §27 di Fase 1) tanpa melompat fase, tanpa menyimpang dari File Impact Matrix (§41), tanpa mengubah rule engine/evidence gate/DPA source-driven B.1.3 existing (§33/§34/§23)/MBG 2.1–2.7. WAJIB mengimplementasikan keempat koreksi berikut sebagai bagian tidak terpisahkan dari desain (bukan opsional): (1) **Autofill idempotency MUST serialize concurrent identical apply requests by locking the existing staging `ProsnBuktiIndikator` row (`entity_type='PENGISIAN'`) before checking/creating any target entity** (§31 STEP 2-4) — implementer TIDAK memiliki ruang interpretasi untuk kembali ke desain lama (mengunci baris target yang belum ada, sudah terbukti P0 defect); (2) **Renstra OPD ownership validation** pada setiap pemanggilan recall indikator Renstra, termasuk saat endpoint ADMIN mapping menyimpan FK (§19/§27), dengan kode `INDICATOR_MAPPING_OPD_MISMATCH` yang dibedakan tegas dari `OPD_MAPPING_NOT_FOUND` dan `CROSS_OPD_ACCESS_DENIED`; (3) **7 canonical document type** dengan Peraturan Daerah/Peraturan Gubernur/Keputusan Gubernur dibedakan tegas (§8) — Perda tidak pernah memenuhi requirement Perkada atau Keputusan Kepala Daerah secara otomatis; (4) Test R (§36) WAJIB membuktikan **EXACTLY ONE** entity target pada concurrent identical apply — bukan "maksimal satu"/"best effort". Jalankan Test Plan (§36, A–T) dan Browser UAT (§37) penuh sebelum dinyatakan selesai — regresi MBG dan suite existing (79 assertion) WAJIB 100% lulus tanpa modifikasi. OD-1/OD-2/OD-3 **sudah RESOLVED** (lihat §"Resolved Architecture Decisions") — implementer TIDAK PERLU lagi meminta keputusan Project Owner untuk ketiganya, ikuti keputusan final yang sudah tercantum. Ollama (Fase 7) **default OFF**, jangan diaktifkan tanpa instruksi eksplisit terpisah dari Project Owner. Jika ditemukan detail lain yang tidak dapat ditentukan dari spesifikasi ini, STOP dan tanyakan — jangan menebak.

---

## Resolved Architecture Decisions

*(sebelumnya "Open Decisions" — ketiganya telah diputuskan CEA/Project Owner pada mandat Documentation Corrective Pass, dan tidak lagi berstatus terbuka)*

| # | Keputusan | Status |
|---|---|---|
| **OD-1** | **RESOLVED** — Existing resolver first, guarded fallback allowed. Formula `pilihTargetTahun` (`backend/services/lakipBridgeService.js:14-18`, `offset = tahunTarget - tahunAwalRenstra + 1`) WAJIB direuse (bukan ditulis ulang), TAPI dipanggil dengan boundary-check terpisah (bukan clamp existing) sehingga `offset` di luar `[1,6]` menghasilkan `RENSTRA_YEAR_OUT_OF_RANGE`, bukan nilai kolom tahun lain yang dipakai diam-diam. Sumber `tahunAwalRenstra` (`RenstraOPD` tidak punya kolom ini langsung) diresolusi via `PeriodeRpjmd` melalui `RenstraOPD.rpjmd_id`, dengan fallback `tahun_akhir - 5` bila diperlukan. Detail lengkap: §19. | **FINAL** |
| **OD-2** | **RESOLVED** — Option B. Mapping `prosnp_master_indikator.indikator_renstra_id` dikelola HANYA lewat endpoint ADMIN-only baru (`PUT /prosnp/master-indikator/:id/mapping-renstra`, §27), dengan validasi ownership OPD wajib saat disimpan (reuse `renstraOwnershipValidator.js`) dan audit trail via `ActivityLog` (model generik existing, direuse — bukan subsistem baru). SQL manual BUKAN mekanisme operasional yang diizinkan. Tidak ada backfill otomatis 4 indikator existing — mapping dimulai dari NULL, diisi eksplisit oleh Admin. Endpoint ini RESMI masuk scope Fase 1 (§40). | **FINAL** |
| **OD-3** | **RESOLVED** — Option A. Ollama tetap Fase 7, opsional, default OFF. Fase 1–6 sepenuhnya usable tanpa Ollama (ekstraksi rule-based, recall DPA/Penatausahaan/Renstra tidak bergantung AI sama sekali). AI hanya boleh: (a) saran klasifikasi sekunder, (b) draft narasi Catatan — tidak pernah menentukan skor/fakta final/target/realisasi/OPD ownership/nomenklatur authoritative. `prosnpAiOutputValidator` (§17) wajib lolos SEBELUM Fase 7 dianggap eligible diaktifkan; Test F (§36) wajib lulus lebih dulu. | **FINAL** |

Ketiganya TIDAK LAGI ditampilkan sebagai kalimat "PERLU KONFIRMASI PROJECT OWNER" di bagian manapun dokumen ini — keputusan sudah final per mandat Documentation Corrective Pass.

---

*(Akhir dokumen — Spesifikasi 35, v2 — documentation corrective pass)*
