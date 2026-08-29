---
document_id: BP-APP-002-ANNEX-01
title: Enterprise Workflow Compliance Enforcement — Technical Specification (Partially Implemented — Tahap 1 dan 3 Implemented, Tahap 2 N/A)
system: e-PeLARA Next Generation
classification: Application Architecture Blueprint — Technical Annex
domain: Business and Application Architecture
version: 0.1.0
status: Approved
owner: Chief Enterprise Architect
approver: Project Owner
effective_date: 2026-08-06
last_reviewed: 2026-08-06
parent_document: ../04-application-architecture/32-Enterprise-Workflow-State-Model.md
conforms_to: ../00-governance/01-Repository-Structure.md
roadmap_reference: ../11-roadmaps/02-Enterprise-Architecture-Roadmap.md
gate: G3 — Integrated Target Architecture
roadmap_dependency: ADR-0005; BP-APP-002 §7a
intended_repository_path: 04-application-architecture/32a-Enterprise-Workflow-Compliance-Enforcement-Specification.md
review_outcome: PASSED
prepared_by: Claude Work (Draft File Operator, di bawah prinsip One AI, One Responsibility — Chief Enterprise Architect: ChatGPT)
---

# 32a — Enterprise Workflow Compliance Enforcement: Technical Specification

## 1. Tujuan dan Kedudukan

Lampiran ini menjabarkan **spesifikasi teknis** (kriteria pemeriksaan, struktur pseudocode, dan rancangan constraint) untuk kerangka enforcement berlapis yang dicatat BP-APP-002 §7a.3 dan ADR-0005 §3 butir 4. Dokumen ini menjawab kebutuhan Project Owner agar kerangka enforcement tidak berhenti sebagai prinsip abstrak, dengan menyediakan panduan cukup rinci untuk langsung dieksekusi oleh siapa pun yang menjalankan implementasi teknis.

**Batas eksplisit**: §4-§6 dokumen ini pada mulanya berisi **pseudocode dan spesifikasi**, bukan kode aplikasi. Eksekusi teknis nyata terhadap spesifikasi ini **telah dilakukan** pada sesi coding terpisah (2026-08-06, di luar konteks governance ini, sesuai jalur §8 opsi 2) — hasilnya dilaporkan kembali ke sesi governance ini dan dicatat di §7.1-§7.2 sebagai evidence yang **dilaporkan oleh pelaksana implementasi**, bukan diverifikasi ulang secara langsung oleh Draft File Operator (Draft File Operator tidak membaca file kode/hasil CI run yang sebenarnya; lihat batasan §5). Status governance dokumen ini adalah **Approved**; status implementasi teknisnya adalah **Partially Implemented** — Tahap 1 (lint rule) dan Tahap 3 (wiring pre-commit/guard/CI) Implemented dengan bukti dilaporkan, Tahap 2 (schema constraint) N/A karena belum ada tabel modul baru yang qualifying per 2026-08-06 (lihat §7.1-§7.2 untuk rincian dan evidence per tahap).

## 2. Ruang Lingkup

Dalam scope: kriteria validasi rinci, struktur pseudocode Tahap 1 (static check), rancangan constraint Tahap 2 (schema), opsi wiring Tahap 3 (CI/governance-lock guard), dan kriteria "Definition of Implemented" untuk Tahap 4. Di luar scope: kode aplikasi aktual, eksekusi migrasi, dan perubahan konfigurasi CI nyata.

## 3. Klasifikasi Evidence

§4-§6 (spesifikasi asli) tetap berlaku sebagai rancangan rujukan. Per pembaruan 2026-08-06 (§7.1-§7.2), sebagian isi dokumen ini telah berpindah klasifikasi dari **Candidate Target Direction** menjadi **Documented Current Fact — Dilaporkan** untuk Tahap 1 dan Tahap 3 (mekanisme dilaporkan berjalan di repository, dengan evidence berupa nama file, hasil test, dan verifikasi lokal yang dilaporkan pelaksana implementasi; belum diverifikasi ulang secara independen oleh Draft File Operator). Tahap 2 tetap **Candidate Target Direction** (belum applicable — bukan belum dikerjakan). Klasifikasi "Dilaporkan" ini secara sengaja dibedakan dari "Diverifikasi Independen" untuk menjaga kejujuran rantai evidence, konsisten dengan larangan mengarang atau mengklaim evidence yang tidak benar-benar diperiksa langsung oleh Draft File Operator.

## 4. Tahap 1 — Static Check / Lint Rule (Spesifikasi)

### 4.1 Tujuan
Memindai model Sequelize dan migration file untuk modul baru, memverifikasi kepatuhan terhadap kriteria BP-APP-002 §7a.2, dan mengembalikan exit-code 1 bila tidak patuh — mengikuti pola `backend/scripts/*ValidationSelfTest.js` yang sudah menjadi konvensi proyek (lihat CLAUDE.md: "When adding a self-check script for a module, follow this pattern... rather than introducing Jest/Mocha").

### 4.2 Kriteria Pemeriksaan

| # | Kriteria | Cara Deteksi (konseptual) |
| --- | --- | --- |
| 1 | Model memiliki satu kolom status resmi | Baca definisi model (`models/<nama>.js`); cari field bertipe STRING/ENUM dengan nama mengandung `status` atau `approval_status`. |
| 2 | Nilai domain kolom status terbatas pada 4 nilai generik | Jika kolom didefinisikan sebagai Sequelize `ENUM`, bandingkan array nilai dengan `['DRAFT','SUBMITTED','APPROVED','REJECTED']`. Jika STRING bebas (seperti pola lama Renja), tandai sebagai **warning**, bukan otomatis gagal — karena STRING bebas bisa jadi disengaja dan didokumentasikan (lihat §4.4). |
| 3 | Tidak ada kolom status paralel tanpa dokumentasi | Cari kolom lain di model yang namanya menyerupai pola status/lifecycle (mis. `*_submitted`, `*_state`, `workflow_status`) di luar kolom utama. Jika ditemukan, cek apakah modul tercantum di whitelist pengecualian (§4.4) — jika tidak, tandai sebagai **finding**. |
| 4 | Transisi tercatat sebagai log terpisah | Cek keberadaan model/tabel log terkait (pola `*_logs`, `*_history`) yang mereferensikan entity modul tersebut, selaras prinsip audit trail BP-APP-002 §5.3. Jika tidak ditemukan, tandai sebagai **warning**. |

### 4.3 Pseudocode Struktur Script

```
# File rencana: backend/scripts/workflowComplianceValidationSelfTest.js
# (nama indikatif, mengikuti konvensi *ValidationSelfTest.js — bukan final)

FUNCTION main():
  modules = discoverNewOrTargetModules()   # daftar model yang diperiksa
                                             # sumber daftar: manual/argumen CLI,
                                             # BUKAN full repository scan otomatis
                                             # (selaras batas "jangan memindai
                                             # seluruh repository" pada mandat governance)
  findings = []

  FOR EACH module IN modules:
    modelDef = loadModelDefinition(module)
    result = checkCriteria1to4(modelDef)     # lihat §4.2
    IF result.hasBlockingFinding:
      findings.append(result)

  printReport(findings)

  IF findings.any(f => f.severity == "BLOCKING"):
    EXIT with code 1
  ELSE:
    EXIT with code 0

FUNCTION checkCriteria1to4(modelDef):
  # Kriteria 1 & 2: BLOCKING jika kolom status tidak ada sama sekali
  # Kriteria 2 (ENUM tidak cocok): BLOCKING
  # Kriteria 2 (STRING bebas tanpa whitelist): WARNING
  # Kriteria 3: BLOCKING jika kolom paralel tanpa whitelist
  # Kriteria 4: WARNING (tidak BLOCKING; audit trail adalah rekomendasi kuat,
  #             bukan syarat mutlak kepatuhan status pada tahap ini)
  ...
```

### 4.4 Mekanisme Whitelist / Pengecualian

Modul existing yang sudah diketahui memiliki pola berbeda dengan alasan terdokumentasi (mis. Renja — checklist granular per BP-APP-002 §6.3) harus terdaftar di sebuah whitelist eksplisit (mis. file konfigurasi `workflowComplianceExceptions.json`) yang merujuk ADR/blueprint yang mengesahkan pengecualian tersebut. Script **tidak** menandai modul di whitelist sebagai finding, sesuai prinsip non-retroaktif ADR-0005 §3 butir 6.

### 4.4a Format Output yang Direkomendasikan

Agar hasil dapat dikonsumsi baik oleh manusia (review manual) maupun mesin (CI/guard di Tahap 3), laporan sebaiknya dicetak dalam dua bentuk sekaligus: ringkasan human-readable ke stdout, dan objek terstruktur (dicetak sebagai JSON bila dipanggil dengan flag `--json`) dengan bentuk indikatif berikut:

```
{
  "checkedAt": "<ISO timestamp>",
  "modulesChecked": ["<nama_modul>", ...],
  "findings": [
    {
      "module": "<nama_modul>",
      "criterion": 1 | 2 | 3 | 4,
      "severity": "BLOCKING" | "WARNING",
      "message": "<deskripsi temuan>",
      "location": "<path file model/migration>"
    }
  ],
  "summary": {
    "blockingCount": <int>,
    "warningCount": <int>
  },
  "exitCode": 0 | 1
}
```

Bentuk ini indikatif, bukan kontrak API final — boleh disesuaikan pelaksana selama tetap memuat field `severity` per temuan dan `exitCode` ringkasan, karena keduanya yang dipakai Tahap 3 untuk keputusan blocking/tidak.

### 4.5 Mode Operasi

Direkomendasikan berjalan dalam dua mode: (a) `--report-only` — mencetak temuan tanpa exit-code 1, untuk digunakan awal sebagai alat bantu review manual; (b) `--enforce` — exit-code 1 bila ada BLOCKING finding, untuk dipakai setelah Tahap 3 (CI wiring) matang. Rekomendasi: mulai dengan mode (a) untuk menghindari false-positive yang memblokir kerja tim secara tidak adil sebelum kriteria (§4.2) divalidasi terhadap modul existing.

## 5. Tahap 2 — Schema Constraint (Spesifikasi)

### 5.1 Tujuan
Pertahanan lapis kedua di level data: mencegah nilai status tidak valid masuk ke database meskipun lolos dari static check (mis. via manipulasi data langsung atau modul yang ditulis di luar proses review).

### 5.2 Rancangan Konseptual (bukan migrasi final)

```
-- Contoh migration Sequelize (RANCANGAN, belum dieksekusi):
-- Untuk modul baru dengan kolom `status`:

ALTER TABLE <nama_tabel_modul_baru>
  ADD CONSTRAINT chk_<nama_tabel>_status
  CHECK (status IN ('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED'));

-- Alternatif (lebih idiomatik MySQL 8+): definisikan kolom sebagai ENUM langsung
-- pada saat CREATE TABLE / migration awal modul, bukan retrofit constraint
-- pada tabel existing (retrofit ke tabel existing di luar scope Tahap 2 ini,
-- karena bersifat retroaktif — lihat batas non-retroaktif ADR-0005 §3 butir 6).
```

### 5.3 Batas Tahap 2

Konsisten dengan §7a.4 BP-APP-002: constraint ini **hanya berlaku untuk migration modul baru**, bukan retrofit paksa terhadap tabel modul existing (RPJMD, Renja, dll.) yang punya arah penyelesaian tersendiri per ADR-0002. Menambahkan CHECK constraint ke tabel existing adalah keputusan migrasi data terpisah yang memerlukan analisis dampak sendiri — tidak termasuk cakupan Tahap 2 ini.

## 6. Tahap 3 — CI / Governance-Lock Guard Wiring (Spesifikasi)

### 6.1 Kondisi Prasyarat

CLAUDE.md mengonfirmasi `scripts/check-final-locked-files.js` (governance-lock guard) **saat ini tidak terhubung ke git hook atau CI mana pun** di repository ini — ini adalah manual check yang dijalankan sendiri oleh pengguna via `npm run guard:final-lock`. Demikian juga, ketersediaan pipeline CI (GitHub Actions, GitLab CI, atau lainnya) untuk repository ini **belum diverifikasi** pada sesi governance ini — pemeriksaan itu sendiri memerlukan pembacaan konfigurasi repository di luar sumber yang dimandatkan untuk kerja governance ini.

### 6.2 Opsi Wiring (Konseptual)

| Opsi | Deskripsi | Prasyarat |
| --- | --- | --- |
| A — Tambahkan ke governance-lock guard | Panggil script Tahap 1 dari dalam `check-final-locked-files.js` sebagai pemeriksaan tambahan sebelum guard mengizinkan perubahan pada file "HIJAU"/locked. | Guard tetap manual (tidak otomatis blocking) kecuali diwire lebih lanjut ke CI — sesuai kondisi saat ini. |
| B — Tambahkan sebagai required check di CI pipeline | Jadikan Tahap 1 sebagai job CI yang harus lulus sebelum merge diizinkan. | Memerlukan CI pipeline yang sudah ada/dikonfigurasi — **belum diverifikasi tersedia**. |
| C — Pre-commit hook lokal | Jalankan Tahap 1 sebagai git pre-commit hook di mesin developer. | Tidak menjamin kepatuhan (bisa di-skip developer), tapi memberi early warning tanpa infrastruktur CI. |

### 6.3 Rekomendasi Urutan

Opsi C (pre-commit, early warning) → Opsi A (terhubung ke guard existing, masih manual trigger) → Opsi B (CI enforced) — sebagai jalur bertahap dari yang paling mudah dipasang ke yang paling kuat memblokir, konsisten dengan prinsip "tidak ada magic bullet" yang sudah disepakati Project Owner sebelumnya.

## 7. Tahap 4 — Kriteria "Definition of Implemented"

Status enforcement pada ADR-0005/BP-APP-002 §7a.3 boleh diubah dari **Candidate Target Direction** menjadi **Implemented** hanya jika seluruh berikut ini benar dan dapat dibuktikan (bukan diklaim):

1. Script Tahap 1 benar-benar ada di `backend/scripts/`, dapat dijalankan, dan telah diuji terhadap minimal satu modul baru nyata (bukan hanya modul hipotetis).
2. Constraint Tahap 2 benar-benar diterapkan pada migration modul baru yang bersangkutan (dapat dibuktikan lewat migration file yang di-commit).
3. Wiring Tahap 3 (opsi apa pun yang dipilih) benar-benar terpasang dan dapat didemonstrasikan berjalan (mis. output guard/CI yang menunjukkan pemeriksaan ini benar-benar dieksekusi, bukan hanya ada di kode tapi tidak pernah terpanggil).
4. Update dokumen (perubahan status ke Implemented) dilakukan sebagai perubahan terkontrol terpisah, dengan Change Log yang merujuk bukti konkret (commit hash / hasil uji) — bukan klaim tanpa evidence.

Sebelum keempat syarat ini terpenuhi, status **tetap Candidate Target Direction/Planned** — konsisten dengan larangan mengklaim implementasi yang belum terbukti (instruksi proyek: dilarang mengklaim "implemented", "compliant", atau "DONE" tanpa evidence).

### 7.1 Evaluasi Kriteria Per 2026-08-06 (sesi coding terpisah, di luar konteks governance §8 opsi 2)

Eksekusi teknis Tahap 1-3 telah dilakukan pada sesi coding terpisah (2026-08-06), sesuai jalur §8 opsi 2. Evaluasi jujur terhadap keempat syarat di atas — **bukan seluruhnya terpenuhi**, sehingga status enforcement keseluruhan **tetap Planned/Candidate Target Direction**, bukan Implemented. Rincian per kriteria:

**Kriteria 1 (Script Tahap 1) — TERPENUHI.**
`backend/scripts/workflowComplianceValidationSelfTest.js` ada, dapat dijalankan (`npm run check:workflow-compliance`), dan telah diuji terhadap `models/ApprovalLog.js` (model rujukan normatif ADR-0002, hasil: 0 BLOCKING/0 WARNING), terhadap fixture negatif (enum salah + kolom status paralel → 1 BLOCKING, exit 1 di `--enforce`), dan terhadap modul nyata `SubKegiatan.js` di mode `--report-only`. Whitelist `backend/scripts/workflowComplianceExceptions.json` juga sudah berisi entri nyata (ProSN-P, 3 model) dengan rujukan alasan arsitektural.

**Kriteria 2 (Constraint Tahap 2) — TIDAK TERPENUHI.**
Investigasi terhadap migration existing (§4-nya spesifikasi ini) menemukan: (a) enam tabel yang sudah memakai ENUM generik (`dpa`, `rka`, `lakip`, `renja`, `rkpd`, `renstra`) seluruhnya adalah tabel existing dari sebelum ADR-0005 — retrofit constraint ke tabel existing eksplisit di luar scope Tahap 2 (§5.3, non-retroaktif ADR-0005 §3.6); (b) satu-satunya modul benar-benar baru pasca-ADR-0005 (ProSN-P, migration `20260805100000-create-prosnp-foundation.js`) memiliki status domain berbeda by design (lifecycle pengisian, bukan approval linear) dan telah didisposisikan sebagai documented exception, bukan target constraint. **Kesimpulan: per 2026-08-06, tidak ada satu pun tabel yang memenuhi syarat sebagai target Tahap 2 yang sah.** Sebagai gantinya, template migration siap pakai telah disiapkan (`backend/migrations/templates/TEMPLATE-add-generic-status-check-constraint.js`, sengaja di luar `migrations-path` agar tidak tereksekusi otomatis oleh `sequelize-cli`) untuk modul baru berikutnya yang genuinely qualifies. Template ini **belum pernah dijalankan terhadap migration atau database nyata** — tidak ada commit migration constraint yang bisa dirujuk sebagai bukti. Catatan tambahan: versi MySQL server produksi tidak dapat diverifikasi dari sandbox eksekusi (tidak ada koneksi DB); CHECK constraint MySQL diabaikan secara diam-diam pada versi <8.0.16, sehingga bagian CHECK constraint di template memerlukan verifikasi versi server sebelum benar-benar diandalkan sebagai lapis proteksi, terlepas dari ENUM Sequelize-nya sendiri yang tetap efektif di semua versi.

**Kriteria 3 (Wiring Tahap 3) — TERPENUHI SECARA FUNGSIONAL, DENGAN SATU PERBAIKAN SCOPE PASCA-VERIFIKASI.**
Kode wiring ditambahkan ke `scripts/check-final-locked-files.js` (fungsi `runWorkflowComplianceCheck`, dipanggil setelah `changedFiles` dihitung, menjalankan Tahap 1 dalam mode `--report-only`). Project Owner menjalankan `npm run guard:final-lock` di mesin lokal (guard tidak bisa dijalankan end-to-end dari sandbox eksekusi karena `git diff` hang di lingkungan tersebut) dan **berhasil** — guard berjalan dan Tahap 1 benar-benar tereksekusi sebagai bagian darinya, dengan hasil 11 BLOCKING dan 18 WARNING.

Verifikasi nyata ini mengungkap bug scope: filter awal meneruskan **semua** file model yang tercatat "changed" oleh `getChangedFiles()` (gabungan `git diff --cached`, `git diff`, dan `git ls-files --others --exclude-standard`) ke Tahap 1 — termasuk 11 model existing legitimate (`PejabatPenandatangan.js`, beberapa `*SnapshotModel.js`, `mrPlanningRiskModel.js`, `renstra_indikatorModel.js`, `renstra_opdModel.js`, `rkpdDokumenModel.js`, dll.) yang tercatat berubah/untracked di working tree Project Owner karena sebab di luar konteks status/approval. Ini bertentangan dengan niat desain Tahap 1 (spec §4.3: hanya untuk modul baru, bukan full scan). Perbaikan: filter dipersempit dengan `git cat-file -e HEAD:<path>` — hanya file model yang **belum pernah ada di HEAD** (benar-benar baru, belum pernah di-commit) yang diteruskan ke Tahap 1; model existing yang sekadar termodifikasi tidak lagi ikut diperiksa oleh wiring otomatis ini. Diverifikasi terisolasi: file existing (`PejabatPenandatangan.js`) → dikeluarkan; file hipotetis belum pernah di-commit → tetap diperiksa.

**Project Owner memverifikasi ulang perbaikan ini di mesin lokal**: 11 BLOCKING dan 18 WARNING sudah hilang total; section "Workflow Compliance Check" tidak lagi muncul di output guard karena memang tidak ada model baru (untracked) saat verifikasi dilakukan — perilaku yang benar sesuai desain (Tahap 1 hanya aktif ketika ada file model baru). Guard final-lock (mekanisme `FINAL_GUARDED`/lock manifest) tetap berjalan normal dan terpisah dari lint rule ini, sesuai desain awal. **Kriteria 3 kini terpenuhi penuh dengan evidence nyata dari dua kali verifikasi di mesin lokal** (sebelum dan sesudah perbaikan filter).

**Trade-off yang perlu dicatat jujur**: dengan perbaikan ini, wiring otomatis TIDAK lagi menangkap kasus modul existing yang diedit untuk menambah kolom status paralel tak terdokumentasi (karena file-nya sudah ada di HEAD). Mendeteksi kasus itu memerlukan pemeriksaan manual (`npm run check:workflow-compliance -- <NamaModel.js> --report-only`) oleh reviewer, bukan otomatis lewat guard — Project Owner menerima trade-off ini secara eksplisit sebagai risiko sah, konsisten dengan prinsip non-retroaktif ADR-0005.

**Kriteria 4 (Update dokumen) — TERPENUHI**, dilakukan lewat rangkaian perubahan terkontrol pada sesi ini dengan rujukan bukti konkret di setiap tahap (bukan klaim tanpa evidence), sesuai instruksi Project Owner secara eksplisit untuk mencatat keterbatasan apa adanya.

### 7.2 Perluasan Enforcement: Pre-commit Hook (Opsi C) dan CI (Opsi B) — 2026-08-06

Menyusul keberatan Project Owner bahwa enforcement yang bergantung pada eksekusi manual (`npm run guard:final-lock`) bukan enforcement sungguhan, dua lapis tambahan diimplementasikan pada sesi lanjutan yang sama, melengkapi urutan bertahap C→A→B di §6.3:

**Opsi C — Pre-commit hook otomatis (husky + lint-staged).** `package.json` root ditambah `devDependencies` (`husky`, `lint-staged`), script `"prepare": "husky"` (aktif otomatis untuk semua developer setelah `npm install`, tidak bergantung diingat siapa pun), dan konfigurasi `lint-staged` yang menyasar `backend/models/*.js`. Wrapper baru `scripts/checkWorkflowComplianceStaged.js` memfilter file staged ke yang benar-benar baru (belum ada di `git HEAD`, logika sama dengan filter Tahap 3/Opsi A), lalu menjalankan Tahap 1 dalam mode `--enforce` — BLOCKING pada modul baru benar-benar membatalkan commit. **Diverifikasi nyata oleh Project Owner**: commit sempat diblokir otomatis karena `prosnpKategoriReferensiModel.js` (model baru tanpa kolom status) terdeteksi BLOCKING; setelah direview dan didaftarkan ke whitelist dengan alasan tertulis, commit ulang berhasil lolos tanpa campur tangan manual menjalankan script apa pun. Ini bukti operasional bahwa hook berjalan otomatis pada `git commit`, sesuai tuntutan Project Owner.

**Opsi B — CI pipeline (`workflow-compliance-check`).** File baru `.github/workflows/workflow-compliance-verify.yml`, terpisah dari `planning-audit-verify.yml` (concern berbeda). Mendeteksi model yang benar-benar *ditambahkan* (bukan sekadar dimodifikasi) lewat `git diff --diff-filter=A` terhadap base PR atau commit sebelumnya, lalu menjalankan Tahap 1 `--enforce` sebagai job CI pada `push`/`pull_request` yang menyentuh `backend/models/**`. Logika deteksi diuji terhadap data historis nyata di repo (commit asli yang menambahkan 8 model ProSN-P) — bukan skenario sintetis — dan berhasil mengidentifikasi persis 8 file yang benar-benar ditambahkan pada commit tersebut. **Catatan jujur**: karena sandbox eksekusi tidak memiliki akses ke GitHub Actions runner, job ini belum pernah benar-benar dieksekusi oleh GitHub — bukti yang ada adalah logika intinya (diff + filter + invoke Tahap 1) sudah diverifikasi benar terhadap data nyata secara lokal, bukan observasi run CI sungguhan. Verifikasi run CI aktual (via push/PR nyata) belum dilaporkan Project Owner.

**Whitelist ProSN-P kini mencakup 9 model** (bertambah dari 3 di evaluasi awal §7.1): `prosnpPeriodeModel.js`, `prosnpPengisianModel.js`, `prosnpBuktiDukungModel.js` (kriteria 2 — lifecycle bukan approval linear), `prosnpArsipModel.js`, `prosnpIndikatorModel.js`, `prosnpPemeriksaanModel.js`, `prosnpRiwayatStatusModel.js` (kriteria 1 — tidak ada kolom status, legitimately non-workflow atau setara audit log), `prosnpBuktiIndikatorModel.js` (kriteria 2 — pivot table), dan `prosnpKategoriReferensiModel.js` (kriteria 1 — master data referensi, terdeteksi otomatis oleh pre-commit hook saat Project Owner mencoba commit). Setiap entri memiliki alasan tertulis per model di `backend/scripts/workflowComplianceExceptions.json`. Satu perbaikan bug ditemukan dalam proses ini: script Tahap 1 awalnya tidak memiliki jalur whitelist untuk kriteria 1 (tidak ada kolom status) — hanya kriteria 2 dan 3 yang dicek terhadap whitelist — sudah diperbaiki dan diverifikasi (0 BLOCKING di seluruh 9 model ProSN-P setelah perbaikan).

**Disposisi per tahap (bukan status blanket)**:
- **Tahap 1 (lint rule): Implemented.** Script ada, berjalan, teruji terhadap model nyata dan fixture, dan terbukti berfungsi benar di mesin lokal Project Owner (berkali-kali verifikasi, termasuk lewat pre-commit hook nyata).
- **Tahap 2 (schema constraint): Planned/belum diterapkan.** Status tidak berubah sejak evaluasi awal — ini bukan kegagalan, melainkan kondisi aktual yang sah: tidak ada tabel yang memenuhi syarat sebagai target per 2026-08-06 (lihat kriteria 2 di atas, tidak berubah). Template migration siap pakai (`backend/migrations/templates/TEMPLATE-add-generic-status-check-constraint.js`) tersedia sehingga saat modul baru yang qualify muncul, Tahap 2 tinggal dieksekusi tanpa mulai dari nol.
- **Tahap 3 (wiring guard, Opsi A): Implemented.** Terverifikasi berjalan nyata di mesin lokal dua kali — sebelum perbaikan (menemukan bug scope) dan sesudah perbaikan (bug scope terkonfirmasi hilang, 0 BLOCKING/0 WARNING, guard final-lock tetap berjalan normal terpisah).
- **Tahap 3, Opsi C (pre-commit husky): Implemented dan terverifikasi operasional.** Commit nyata diblokir otomatis oleh model baru yang melanggar pola, lalu lolos otomatis setelah whitelist diperbarui — tanpa siapa pun perlu mengingat menjalankan script manual. Ini yang paling langsung menjawab keberatan Project Owner soal enforcement yang bergantung pada manusia.
- **Tahap 3, Opsi B (CI workflow): Implemented secara kode, belum terverifikasi lewat run CI sungguhan.** Logika inti sudah diuji terhadap data historis nyata, tapi belum ada observasi langsung job ini berjalan di GitHub Actions.
- **Tahap 4 (update dokumen): Implemented.** Sedang berlangsung lewat perubahan ini sendiri.

**Karena Kriteria 2 (§7) belum terpenuhi** — constraint belum diterapkan pada migration modul baru nyata, sesuai syarat eksplisit "seluruh [kriteria] benar dan dapat dibuktikan" — **status keseluruhan enforcement pada ADR-0005/BP-APP-002 §7a.3 tetap Sebagian Diimplementasikan, TIDAK dinaikkan menjadi Implemented penuh.** Status akan naik ke Implemented penuh saat modul baru nyata muncul, template Tahap 2 diterapkan padanya, dan constraint ter-commit sebagai migration nyata.

## 8. Batas Kewenangan dan Jalur Eksekusi

**Dokumen ini tidak mengeksekusi apa pun** — seluruh isi §4-§6 adalah spesifikasi/pseudocode untuk dieksekusi oleh pihak yang berwenang menulis kode aplikasi. Karena proyek governance ini (dengan Draft File Operator sebagai peran saya) secara eksplisit membatasi saya hanya membaca sumber yang dimandatkan dan tidak memindai/mengubah source code, eksekusi §4-§6 harus dilakukan melalui salah satu dari:

1. Project Owner menjalankan sendiri implementasi teknis berdasarkan spesifikasi ini.
2. Sesi/permintaan terpisah yang secara eksplisit berada di luar konteks instruksi proyek governance ini, di mana Claude dapat bertindak sebagai agen pengembangan kode biasa terhadap repository `E:\1-MyApp\React\ePeLARA`.

## 9. Evidence Pending Register

| Item | Status per 2026-08-06 (setelah sesi coding terpisah) | Routing |
| --- | --- | --- |
| Ketersediaan CI pipeline untuk repository ini | **Terkonfirmasi tersedia** — `.github/workflows/planning-audit-verify.yml` ditemukan di repo, path-scoped ke modul planning-audit. Tidak dipakai untuk Opsi B Tahap 3 pada sesi ini (di luar instruksi eksplisit; keputusan Opsi B memerlukan permintaan terpisah). | Selesai diverifikasi; Opsi B tetap Evidence Pending sampai ada instruksi eksplisit untuk itu. |
| Daftar modul existing yang perlu whitelist (§4.4) | **Sebagian diinventarisasi** — 3 model ProSN-P terdaftar dengan alasan (`backend/scripts/workflowComplianceExceptions.json`). ~94 model lain dengan kolom ENUM belum direview satu per satu. | Analisis lanjutan per modul, di luar scope sesi ini — lihat §7.1. |
| Bukti eksekusi Tahap 1-3 (commit hash, hasil uji) | **Sebagian ada** — Tahap 1 penuh (hasil uji terdokumentasi §7.1); Tahap 2 template ada, belum diterapkan (tidak ada tabel qualifying); Tahap 3 kode terpasang, verifikasi end-to-end tertunda (git diff hang di sandbox, menunggu konfirmasi manual Project Owner). | Lihat §7.1 untuk rincian penuh per kriteria. |

## 10. Persetujuan

| Peran | Nama/Identitas | Status | Catatan | Tanggal |
| --- | --- | --- | --- | --- |
| Penyusun Dokumen / Draft File Operator | Claude Work | Selesai | Spesifikasi teknis disusun atas permintaan Project Owner, sebagai pengganti eksekusi kode langsung yang berada di luar mandat governance sesi ini. | 2026-08-06 |
| Chief Enterprise Architect | ChatGPT | Belum dilakukan terpisah | Review substantif oleh ChatGPT belum tercatat terpisah pada sesi ini; Project Owner memberikan persetujuan final secara langsung. | — |
| Project Owner | Fahmi Alhabsi | **Approved** | Spesifikasi disetujui sebagai rencana kerja 2026-08-06; jalur eksekusi dipilih: sesi terpisah di luar konteks governance ini (§8 opsi 2). | 2026-08-06 |

## 11. Change Log Dokumen (Lokal)

| Versi | Tanggal | Perubahan | Penyusun | Status |
| --- | --- | --- | --- | --- |
| 0.1.0 | 2026-08-06 | Penyusunan awal spesifikasi teknis Tahap 1-4 enforcement berlapis, sebagai lampiran BP-APP-002 §7a.3, atas permintaan Project Owner agar kerangka enforcement tidak berhenti sebagai dokumen abstrak. Berisi pseudocode dan rancangan constraint, bukan kode aplikasi aktual. | Claude Work | Draft for Review |
| 0.1.0 (penyempurnaan) | 2026-08-06 | Ditambahkan §4.4a (format output terstruktur/JSON indikatif) sebagai hasil self-check kelengkapan, agar pelaksana Tahap 1 tidak perlu menebak struktur laporan saat diintegrasikan ke Tahap 3. Tidak ada perubahan substansi lain. | Claude Work | Draft for Review |
| 0.1.0 (final) | 2026-08-06 | **Finalisasi**: Project Owner menyetujui spesifikasi 32a sebagai rencana kerja. Status governance dinaikkan menjadi Approved, effective_date 2026-08-06, review_outcome PASSED. Status implementasi teknis (§3, §7, §12) tetap Planned/Candidate Target Direction — persetujuan ini tidak berarti Tahap 1-4 sudah dieksekusi. Eksekusi akan dilakukan Project Owner di sesi terpisah di luar konteks governance ini. | Claude Work, berdasarkan persetujuan eksplisit Project Owner | Approved |
| 0.1.0 (evaluasi implementasi) | 2026-08-06 | Ditambahkan §7.1 (evaluasi kriteria "Definition of Implemented" per kriteria) dan direvisi §12, menyusul eksekusi teknis Tahap 1-3 pada sesi coding terpisah (§8 opsi 2). Status diubah menjadi **Sebagian Diimplementasikan** — bukan Planned murni, bukan Implemented penuh: Tahap 1 implemented & teruji (bukti: hasil uji terhadap ApprovalLog.js, fixture, SubKegiatan.js); Tahap 2 mekanisme siap tapi belum diterapkan (tidak ada tabel qualifying per 2026-08-06); Tahap 3 wired dengan bukti fungsional parsial, belum terverifikasi end-to-end (git diff hang di sandbox, menunggu verifikasi manual Project Owner). Perubahan ini dilakukan atas instruksi eksplisit Project Owner agar keterbatasan dicatat apa adanya, bukan diklaim selesai tanpa evidence. | Claude (sesi coding terpisah, atas instruksi eksplisit Project Owner) | Evidence-based update |
| 0.1.0 (verifikasi guard + perbaikan scope) | 2026-08-06 | Project Owner menjalankan `npm run guard:final-lock` di mesin lokal — berhasil, Tahap 1 tereksekusi sebagai bagian guard (hasil awal: 11 BLOCKING, 18 WARNING). Verifikasi ini mengungkap bug scope: filter wiring meneruskan semua model "changed" ke Tahap 1, termasuk 11 model existing legitimate yang kebetulan tercatat berubah/untracked di working tree, bukan hanya modul baru. Diperbaiki di `scripts/check-final-locked-files.js`: filter dipersempit dengan `git cat-file -e HEAD:<path>`, hanya model yang belum pernah ada di HEAD (benar-benar baru) yang diperiksa Tahap 1. §7.1 Kriteria 3 dan §12 direvisi untuk mencatat evidence verifikasi nyata ini serta trade-off filter baru (modul existing yang diedit menambah status paralel tidak lagi tertangkap otomatis — perlu cek manual). Belum diverifikasi ulang oleh Project Owner pasca-perbaikan. | Claude, atas instruksi eksplisit Project Owner ("perbaiki filternya, jangan whitelist massal") | Bug ditemukan lewat verifikasi nyata, diperbaiki |
| 0.1.0 (verifikasi ulang pasca-perbaikan) | 2026-08-06 | Project Owner menjalankan ulang `npm run guard:final-lock` di mesin lokal pasca-perbaikan filter — dikonfirmasi 11 BLOCKING dan 18 WARNING sudah hilang total (0/0), section "Workflow Compliance Check" tidak muncul karena memang tidak ada model baru saat itu (perilaku benar sesuai desain), dan guard final-lock (`FINAL_GUARDED`) tetap berjalan normal terpisah dari lint rule. Kriteria 3 (§7) dinyatakan **Implemented** dengan evidence dua putaran verifikasi nyata. Project Owner meminta status keseluruhan diubah ke Implemented; setelah pengecekan, Kriteria 2 (§7) masih belum terpenuhi (belum ada migration constraint nyata yang di-commit, karena belum ada tabel qualifying) — status keseluruhan **tetap Sebagian Diimplementasikan**, dengan disposisi per-tahap granular: Tahap 1 Implemented, Tahap 2 Planned, Tahap 3 Implemented, Tahap 4 Implemented. Keputusan ini diambil bersama Project Owner setelah klarifikasi eksplisit bahwa §7 menuntut seluruh kriteria terbukti, bukan sebagian, untuk status "Implemented" penuh. | Claude, dikonfirmasi bersama Project Owner | Evidence lengkap per-tahap, status keseluruhan tetap Sebagian |
| 0.1.0 (perluasan pre-commit + CI) | 2026-08-06 | Project Owner menilai enforcement yang bergantung eksekusi manual bukan enforcement sungguhan. Ditambahkan §7.2: Tahap 3 Opsi C (pre-commit hook husky + lint-staged, wrapper `scripts/checkWorkflowComplianceStaged.js`) dan Opsi B (CI `.github/workflows/workflow-compliance-verify.yml`, terpisah dari `planning-audit-verify.yml`). Opsi C **diverifikasi operasional penuh oleh Project Owner**: commit diblokir otomatis oleh model baru (`prosnpKategoriReferensiModel.js`) yang melanggar pola, lolos otomatis setelah whitelist diperbarui — tanpa campur tangan manual. Opsi B diverifikasi secara kode terhadap data historis nyata (commit ProSN-P asli), belum lewat run CI sungguhan (sandbox tidak punya akses GitHub Actions runner). Whitelist ProSN-P bertambah dari 3 menjadi 9 model (`prosnpArsipModel.js`, `prosnpIndikatorModel.js`, `prosnpPemeriksaanModel.js`, `prosnpRiwayatStatusModel.js`, `prosnpBuktiIndikatorModel.js`, `prosnpKategoriReferensiModel.js` ditambahkan setelah review per-model), masing-masing dengan alasan tertulis. Bug ditemukan dan diperbaiki dalam proses: script Tahap 1 awalnya tidak punya jalur whitelist untuk kriteria 1 (tidak ada kolom status) — hanya kriteria 2/3 yang dicek terhadap whitelist — sudah diperbaiki, diverifikasi 0 BLOCKING di seluruh 9 model ProSN-P. **Status keseluruhan tetap Sebagian Diimplementasikan** — pre-commit dan CI memperkuat lapis lint-rule (Tahap 1/3), tidak menyentuh Kriteria 2 (schema constraint) yang tetap Planned karena belum ada tabel qualifying. Project Owner menyatakan sesi eksekusi selesai. | Claude, dikonfirmasi bersama Project Owner | Tahap 3 Opsi C terverifikasi operasional; Opsi B terverifikasi kode; status keseluruhan tetap Sebagian karena Kriteria 2 |
| 0.1.0 (konfirmasi status di sesi governance) | 2026-08-06 | Project Owner membawa laporan implementasi ini kembali ke sesi governance (terpisah dari sesi coding) dan meminta status 32a diperbarui secara formal dari "Planned, Not Implemented" menjadi "Partially Implemented" pada metadata/§1/§3 dokumen — sebelumnya metadata masih menyatakan "Planned" meski §7.1-§7.2 sudah mencatat evidence Implemented untuk Tahap 1/3. Draft File Operator memperbarui judul dokumen, §1, dan §3 agar konsisten dengan §7.1-§7.2/§12 yang sudah ada, dengan catatan eksplisit bahwa evidence Tahap 1/3 adalah **klaim yang dilaporkan oleh sesi coding terpisah**, belum diverifikasi ulang secara independen oleh Draft File Operator (yang tidak membaca kode/hasil run secara langsung). Tidak ada perubahan substansi pada §7.1/§7.2/§12 — hanya penyelarasan metadata/§1/§3 agar tidak lagi kontradiktif dengan isi dokumen sendiri. | Claude Work (Draft File Operator, sesi governance), berdasarkan permintaan eksplisit Project Owner | Metadata diselaraskan dengan evidence yang sudah tercatat |

## 12. State Aktual Dokumen

Version 0.1.0, status governance **Approved**, effective_date 2026-08-06, review_outcome PASSED. Disetujui Project Owner (Fahmi Alhabsi) 2026-08-06 sebagai rencana kerja definitif.

**Status implementasi teknis per 2026-08-06 (setelah sesi coding terpisah, §8 opsi 2, beberapa putaran verifikasi nyata di mesin lokal Project Owner, dan perluasan enforcement ke pre-commit hook + CI): Sebagian Diimplementasikan (Partially Implemented) — bukan Planned murni, dan bukan Implemented penuh.** Lihat §7.1 dan §7.2 untuk rincian evaluasi per kriteria. Status per tahap:

- **Tahap 1 (static check/lint rule): Implemented.** `backend/scripts/workflowComplianceValidationSelfTest.js` berjalan, teruji terhadap model nyata dan fixture, dan terbukti berfungsi benar di mesin lokal Project Owner berkali-kali, termasuk lewat pre-commit hook nyata.
- **Tahap 2 (schema constraint): Planned.** Tidak berubah sejak evaluasi awal — bukan kegagalan, kondisi aktual yang sah: tidak ada tabel yang memenuhi syarat sebagai target constraint per 2026-08-06 (tabel existing di luar scope retroaktif; satu-satunya modul baru, ProSN-P, adalah documented exception). Template migration siap pakai tersedia (`backend/migrations/templates/TEMPLATE-add-generic-status-check-constraint.js`) untuk modul baru berikutnya yang qualify.
- **Tahap 3, Opsi A (wiring governance-lock guard): Implemented.** Diverifikasi berjalan nyata di mesin lokal Project Owner sebanyak dua kali: pertama menemukan bug scope (11 BLOCKING dari model existing yang salah tertangkap filter), lalu setelah perbaikan filter dikonfirmasi bersih.
- **Tahap 3, Opsi C (pre-commit hook husky + lint-staged): Implemented dan terverifikasi operasional penuh.** Commit nyata diblokir otomatis oleh model baru (`prosnpKategoriReferensiModel.js`) yang melanggar pola generik, lalu lolos otomatis setelah whitelist diperbarui — sepenuhnya tanpa campur tangan manual menjalankan script apa pun. Ini bukti langsung bahwa enforcement tidak lagi bergantung pada manusia mengingat menjalankan pemeriksaan.
- **Tahap 3, Opsi B (CI pipeline `workflow-compliance-verify.yml`): Implemented secara kode, logika teruji terhadap data historis nyata, belum terverifikasi lewat observasi run CI sungguhan** (sandbox eksekusi tidak memiliki akses ke GitHub Actions runner).
- **Tahap 4 (update dokumen governance): Implemented.** Dilakukan lewat rangkaian perubahan terkontrol pada sesi ini dengan rujukan evidence konkret di setiap tahap, termasuk pembaruan ini sendiri.
- **Whitelist ProSN-P: 9 model**, seluruhnya dengan alasan tertulis per model di `backend/scripts/workflowComplianceExceptions.json`.

**Status enforcement keseluruhan pada ADR-0005/BP-APP-002 §7a.3 tetap Sebagian Diimplementasikan, TIDAK dinaikkan menjadi Implemented penuh**, karena Kriteria 2 di §7 (constraint diterapkan pada migration modul baru nyata, dibuktikan lewat migration file yang di-commit) belum terpenuhi — syarat §7 eksplisit menuntut *seluruh* kriteria terbukti, bukan sebagian. Ini tidak berubah meski enforcement Tahap 3 kini jauh lebih kuat (guard manual + pre-commit otomatis + CI): pre-commit dan CI memperkuat lapis lint-rule/kode, tapi tidak menyentuh lapis schema constraint sama sekali — keduanya adalah pertahanan berbeda (lint di level kode saat commit, constraint di level data di database) sesuai desain berlapis §1. Empat dari lima mekanisme enforcement (Tahap 1, Tahap 3 Opsi A, Tahap 3 Opsi C, Tahap 4) punya evidence konkret dan terverifikasi nyata; satu (Tahap 3 Opsi B/CI) terverifikasi secara kode tapi belum lewat run sungguhan; satu (Tahap 2/constraint) menunggu munculnya modul baru nyata yang qualify, dengan mekanisme sudah siap pakai agar tidak mulai dari nol saat saat itu tiba.
