---
document_id: ADR-0003
title: Backup and Disaster Recovery Decision — Target RPO/RTO dan Prinsip Ketahanan Data
system: e-PeLARA Next Generation
classification: Architecture Decision Record
domain: Technology Architecture
version: 1.0.0
status: Accepted
owner: Project Owner
prepared_by: Claude Work (Acting Chief Enterprise Architect, di bawah HANDOFF-e-PeLARA-EA-2026-08-05-v10)
effective_date: 2026-08-06
decision_authority: Project Owner — Fahmi Alhabsi
roadmap_dependency:
  - AIR-009 — Architecture Issue Register (backup dan restore otomatis belum tersedia)
  - BP-TECH-003 — Resilience, Backup and Disaster Recovery Blueprint (Seq 44, artefak yang didelegasikan pada keputusan ini)
  - BP-TECH-002 — Observability and Operations Blueprint (mencatat backup/restore verification signal sebagai Evidence Pending, dirutekan ke keputusan ini)
roadmap_reference: ../../11-roadmaps/02-Enterprise-Architecture-Roadmap.md
gate: G3–G5 — Integrated Target Architecture hingga Implementation Ready; keputusan ini adalah salah satu evidence minimum, bukan disposition Gate itu sendiri
intended_repository_path: 00-governance/adr/ADR-0003-Backup-and-Disaster-Recovery-Decision.md
---

# ADR-0003 — Backup and Disaster Recovery Decision: Target RPO/RTO dan Prinsip Ketahanan Data

**Status: Accepted.** Project Owner (Fahmi Alhabsi) telah menetapkan target RPO 24 jam dengan RTO fleksibel pada 6 Agustus 2026. Dokumen ini adalah versi final ADR-0003.

---

## 1. Konteks Masalah

### 1.1 Sumber gap

Architecture Issue Register mencatat AIR-009 ("Backup dan restore otomatis belum tersedia") sebagai **Critical**/Decision Required, dengan evidence dari Charter §11 dan Roadmap BP-TECH-003/G3–G5. Peninjauan langsung terhadap kode aplikasi pada 2026-08-06 mengonfirmasi klaim ini akurat: tidak ditemukan script backup/restore otomatis di `backend/scripts/`, tidak ada konfigurasi Docker/deployment produksi yang menyinggung backup, dan `docs/DATABASE.md` tidak memuat prosedur backup/restore. BP-TECH-002 (Observability and Operations Blueprint, Approved) §6 mencatat "Backup/restore verification signal" sebagai Evidence Pending, dirutekan eksplisit ke BP-TECH-003 — mengonfirmasi bahwa bahkan observability atas proses backup pun belum memiliki dasar, karena backup itu sendiri belum ada.

### 1.2 Mengapa keputusan ini diperlukan

Tanpa target RPO/RTO yang disahkan, BP-TECH-003 tidak dapat disusun tanpa mengarang asumsi target ketahanan data. Roadmap RM-EA-001 menempatkan BP-TECH-003 (Seq 44) sebagai artefak Critical dengan dependency eksplisit ke AIR-009 dan Gate G3–G5. Definisi resolusi AIR-009 pada register mensyaratkan eksplisit "RPO/RTO, backup, restore test, dan disaster recovery target disetujui **serta dibuktikan**" — menegaskan bahwa penetapan target adalah keputusan yang lebih dulu, dan pembuktian (restore test aktual) adalah pekerjaan implementasi terpisah yang menyusul.

### 1.3 Yang TIDAK termasuk cakupan keputusan ini

- ADR-0003 tidak mengubah kode aplikasi. Keputusan ini adalah keputusan arsitektur/kebijakan; implementasi backup otomatis, script restore, dan uji restore aktual adalah work package terpisah di bawah Migration/Implementation (Seq 67+), dan **tidak dieksekusi sebagai bagian dari ADR ini**.
- ADR-0003 tidak menetapkan teknologi/tooling backup konkret (mis. `mysqldump` terjadwal vs snapshot volume vs layanan managed backup) — didelegasikan sebagai Evidence Pending ke BP-TECH-003 dan implementasi teknis.
- ADR-0003 tidak menetapkan lokasi penyimpanan backup (on-premise, cloud, offsite) — tetap Evidence Pending, memerlukan keputusan infrastruktur terpisah.
- ADR-0003 tidak menyatakan bahwa backup/restore telah diuji atau terbukti berfungsi — ADR ini hanya menetapkan **target**, bukan **pembuktian**.
- ADR-0003 tidak menetapkan disposition Gate G3–G5.

---

## 2. Opsi yang Dipertimbangkan

| Opsi | Deskripsi ringkas |
| --- | --- |
| **A — RPO 24 jam, RTO fleksibel (dipilih)** | Backup penuh harian; RTO tidak dipatok angka pasti, disesuaikan kapasitas operasional saat insiden terjadi. Realistis untuk sistem pemda skala menengah tanpa tim ops 24/7 dedicated. |
| B — RPO lebih ketat (per jam) + RTO terukur | Backup lebih sering (per jam/beberapa jam) dengan RTO target eksplisit (mis. 4-8 jam). Memerlukan infrastruktur/ops lebih matang. |
| C — Prinsip saja, tanpa angka | BP-TECH-003 hanya menetapkan prinsip wajib ada backup/restore teruji, tanpa target RPO/RTO spesifik — angka ditetapkan kemudian. |

---

## 3. Keputusan

**e-PeLARA menetapkan target ketahanan data sebagai berikut:**

1. **Recovery Point Objective (RPO): 24 jam.** Backup basis data penuh dilakukan minimal satu kali per hari (harian). Kehilangan data maksimal yang dapat diterima dalam skenario kegagalan adalah data yang dihasilkan dalam rentang 24 jam sejak backup terakhir.
2. **Recovery Time Objective (RTO): fleksibel, disesuaikan kapasitas operasional.** Tidak ditetapkan angka RTO pasti pada tahap ini; waktu pemulihan layanan pasca-insiden disesuaikan dengan kapasitas tim operasional yang tersedia saat kejadian, bukan dijanjikan sebagai SLA formal.
3. **Restore test wajib dilakukan secara berkala** (frekuensi spesifik didelegasikan ke BP-TECH-003 sebagai Candidate Target Direction) — backup yang tidak pernah diuji restore-nya tidak dianggap sebagai bukti ketahanan yang valid, konsisten dengan definisi resolusi AIR-009 yang mensyaratkan "dibuktikan", bukan hanya "disetujui".
4. **Cakupan backup**: mencakup minimal basis data produksi (MySQL). Cakupan tambahan (file upload, log, konfigurasi) didelegasikan sebagai Evidence Pending ke BP-TECH-003.
5. **Prioritas implementasi**: mengingat AIR-009 bersifat Critical dan sepenuhnya berada dalam kendali internal (tidak bergantung pihak eksternal), penyusunan BP-TECH-003 dan implementasi awal (bahkan sebagai solusi sementara/quick-win sebelum blueprint lengkap disetujui) direkomendasikan untuk diprioritaskan lebih cepat dibanding item yang bergantung pihak eksternal.

### 3.1 Pertanyaan lanjutan yang tetap terbuka (bukan bagian keputusan ADR ini)

1. Teknologi/tooling backup konkret (mis. `mysqldump` terjadwal, snapshot volume, layanan managed backup) — didelegasikan ke BP-TECH-003 dan implementasi teknis.
2. Lokasi penyimpanan backup (on-premise/cloud/offsite) dan kebijakan retensi (berapa lama backup disimpan sebelum dihapus) — tetap Evidence Pending.
3. Frekuensi dan prosedur restore test spesifik — didelegasikan ke BP-TECH-003.
4. Cakupan backup di luar basis data (file upload, log aplikasi, konfigurasi environment) — tetap Evidence Pending.
5. Siapa yang berwenang secara institusional untuk menjalankan dan memverifikasi proses backup/restore — kategori **institutional/statutory authority**, tetap `To be designated or verified by competent institutional authority — Evidence Pending`, konsisten dengan pola ADR sebelumnya.

Butir-butir ini dicatat sebagai **Evidence Pending** dan didelegasikan ke BP-TECH-003 sebagai follow-up, bukan keputusan tambahan dalam ADR ini.

---

## 4. Konsekuensi

### 4.1 Dampak positif

- Target ketahanan data yang jelas dan realistis untuk skala organisasi saat ini, menyelesaikan ambiguitas yang menjadi akar AIR-009.
- RPO 24 jam adalah target yang dapat dicapai tanpa investasi infrastruktur besar, cocok sebagai baseline awal yang dapat ditingkatkan di kemudian hari.
- Mensyaratkan restore test (bukan hanya backup) mencegah rasa aman palsu dari backup yang tidak pernah diverifikasi dapat dipulihkan.

### 4.2 Dampak yang memerlukan tindak lanjut

- Implementasi backup otomatis harian memerlukan pekerjaan teknis (script, penjadwalan, penyimpanan) — di luar cakupan ADR ini, menjadi work package Migration/Implementation.
- Prosedur dan jadwal restore test perlu didefinisikan secara konkret dalam BP-TECH-003.
- Kebijakan retensi dan lokasi penyimpanan backup perlu diputuskan sebagai bagian dari implementasi.
- Karena RTO tidak dipatok, ekspektasi pemulihan layanan pasca-insiden perlu dikomunikasikan secara realistis kepada pemangku kepentingan agar tidak menimbulkan asumsi SLA yang tidak sesuai.

### 4.3 Yang tidak berubah

- Tidak ada perubahan kode aplikasi sebagai bagian dari ADR ini.
- Tidak ada backup/restore yang telah dijalankan atau dibuktikan sebagai konsekuensi ADR ini — ADR ini murni menetapkan target, bukan pembuktian.
- Tidak ada data production yang dimodifikasi.

---

## 5. Status dan Batas Kewenangan

- Status: **Accepted**, efektif 2026-08-06.
- Keputusan diambil oleh Project Owner (Fahmi Alhabsi), bukan oleh Claude Work secara sepihak — sesuai proses eskalasi HANDOFF-e-PeLARA-EA-2026-08-05-v10 §0.6 dan §4.5.
- G3–G5 tetap tanpa disposition. ADR-0003 Accepted adalah salah satu evidence minimum untuk Gate tersebut (Roadmap §8), bukan disposition Gate itu sendiri.
- AIR-009 diperbarui menjadi Resolved sebagai konsekuensi keputusan ini (lihat pembaruan terpisah pada Architecture Issue Register); closure formal AIR-009 tetap memerlukan closure approval eksplisit Project Owner **dan bukti restore test aktual**, sesuai Definition of Closure register tersebut dan definisi resolusi AIR-009 yang eksplisit mensyaratkan pembuktian.
- ADR-0003 tidak menetapkan implementation completion, institutional authority assignment, compliance determination, atau Gate disposition apa pun di luar target RPO/RTO yang tercantum di §3.
- ADR-0003 tidak mengklaim bahwa backup/restore otomatis telah dibangun atau diuji — ADR ini hanya menetapkan **arah target**; implementasi dan pembuktian tetap menjadi pekerjaan terpisah yang belum dieksekusi.

---

## 6. Evidence dan Referensi

- Architecture Issue Register — AIR-009 (`00-governance/03-Architecture-Issue-Register.md`).
- Peninjauan langsung kode aplikasi 2026-08-06 (read-only): tidak ditemukan script backup/restore di `backend/scripts/`; tidak ada konfigurasi Docker/deployment produksi menyinggung backup; `docs/DATABASE.md` tidak memuat prosedur backup/restore.
- BP-TECH-002 — Observability and Operations Blueprint, Version 1.0.0, Approved, §6 (mencatat backup/restore verification signal sebagai Evidence Pending, dirutekan ke keputusan ini).
- Master Artifact Register — `11-roadmaps/00-Master-Artifact-Register.md`, baris Seq 44 (BP-TECH-003, status belum disusun sebelum ADR ini).
- HANDOFF-e-PeLARA-EA-2026-08-05-v10 §0.6, §3.3, §4.5 (proses eskalasi dan keputusan Project Owner).
- Keputusan Project Owner: dikonfirmasi 6 Agustus 2026 (Opsi A — RPO 24 jam, RTO fleksibel — dipilih dari draft opsi/rekomendasi yang diajukan Claude Work berdasarkan peninjauan langsung kode aplikasi).

---

## 7. Persetujuan

| Peran | Nama | Keputusan | Tanggal |
| --- | --- | --- | --- |
| Project Owner | Fahmi Alhabsi | Memilih Opsi A (RPO 24 jam, RTO fleksibel); Accepted | 2026-08-06 |
| Acting Chief Enterprise Architect | Claude Work (HANDOFF-e-PeLARA-EA-2026-08-05-v10) | Meninjau kondisi kode secara langsung, menyusun draft opsi, rekomendasi, dan finalisasi ADR sesuai keputusan Project Owner | 2026-08-06 |

## 8. Change Log

| Versi | Tanggal | Perubahan | Penyusun | Status |
| --- | --- | --- | --- | --- |
| 0.1.0 | 2026-08-06 | Draft opsi (A/B/C) dan rekomendasi disiapkan untuk eskalasi Project Owner berdasarkan peninjauan langsung kode aplikasi; tidak ada opsi dipilih. | Claude Work | Proposed — Decision Pending |
| 1.0.0 | 2026-08-06 | Project Owner memilih Opsi A (RPO 24 jam, RTO fleksibel). ADR difinalisasi dengan status Accepted, efektif 2026-08-06. | Claude Work berdasarkan keputusan Project Owner | Accepted |
