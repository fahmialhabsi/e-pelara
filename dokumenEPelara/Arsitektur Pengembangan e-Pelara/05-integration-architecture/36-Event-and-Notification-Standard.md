---
document_id: STD-INT-002
title: Event and Notification Standard
system: e-PeLARA Next Generation
classification: Architecture Standard
domain: Integration Architecture
version: 1.0.0
status: Approved
owner: Chief Enterprise Architect
approver: Project Owner
effective_date: 2026-08-05
last_reviewed: 2026-08-05
parent_document: ../05-integration-architecture/34-Integration-Architecture.md
conforms_to: ../00-governance/01-Repository-Structure.md
roadmap_reference: ../11-roadmaps/02-Enterprise-Architecture-Roadmap.md
gate: G3 — Integrated Target Architecture
roadmap_dependency: Integration Architecture, workflow model
intended_repository_path: 05-integration-architecture/36-Event-and-Notification-Standard.md
prepared_by: Claude Work (Operator / Acting Chief Enterprise Architect / Delegated Project Owner-Project Authority, di bawah mandat Project Owner Fahmi Alhabsi tanggal 2026-08-05)
---

# 36 — Event and Notification Standard

## 1. Tujuan dan Kedudukan

Dokumen ini menetapkan **prinsip desain event dan notification** yang berlaku pada pola "Internal Asynchronous/Event" (ARCH-INT-001 §7, Approved, batch ini) — tanpa menetapkan event schema/payload aktual atau teknologi message broker. Dokumen ini secara eksplisit merutekan AIR-003 (status model Notification tidak konsisten) tanpa menyelesaikannya, karena resolusi status baseline memerlukan verifikasi terhadap kode/implementasi existing yang di luar scope batch ini.

## 2. Ruang Lingkup

Dalam scope: prinsip desain event (naming, versioning konseptual, delivery guarantee di level prinsip), klasifikasi notification, dan boundary dengan Integration Architecture. Di luar scope: event schema/payload aktual, teknologi message broker, dan disposition Gate.

## 3. Sumber yang Benar-Benar Dibaca Langsung

- `05-integration-architecture/34-Integration-Architecture.md` (ARCH-INT-001, Approved, batch ini) §6-7 — pola Internal Asynchronous/Event dan konteks notification.
- `00-governance/03-Architecture-Issue-Register.md` — AIR-003 (status model Notification tidak konsisten antara dua sumber baseline, Open, target G3).
- `03-data-architecture/data-lineage/22-Data-Lineage-and-Traceability-Blueprint.md` (BP-DATA-003, Approved) §5 — model lineage yang menjadi basis "event sebagai lineage capture."

## 4. Klasifikasi Evidence

Documented Current Fact; Documented Assessment; Candidate Target Direction; Evidence Pending.

## 5. Prinsip Desain Event

1. **Event mencatat fakta yang telah terjadi** (past tense semantics), bukan perintah/command; event tidak diasumsikan memicu efek samping tertentu tanpa kontrak eksplisit pada level implementasi.
2. **Event naming domain-aligned**: nama event mencerminkan application domain (ARCH-APP-001 §6) dan bounded context (BP-APP-001 §6) yang menerbitkannya.
3. **Event sebagai lineage capture**: event yang dikonsumsi APP-DKM-001 (ARCH-INT-001 §6) selaras dengan model lineage BP-DATA-003 (Origin-Transformation-Consumption-Publication, Approved) — dokumen ini tidak menciptakan model lineage baru.
4. **Delivery guarantee** (at-least-once/at-most-once/exactly-once) adalah keputusan level implementasi teknis; dokumen ini hanya mensyaratkan bahwa pilihan tersebut eksplisit dan terdokumentasi, tidak diasumsikan default.
5. **Idempotency di level prinsip**: consumer event idealnya idempotent terhadap event duplikat; detail mekanisme adalah scope implementasi.

## 6. Klasifikasi Notification

| Jenis Notification | Definisi Konseptual | Batas |
| --- | --- | --- |
| System-internal Event | Event antar application domain untuk lineage/state capture (§5 poin 3). | Bukan notification yang dilihat pengguna akhir. |
| User-facing Notification | Notifikasi yang ditujukan kepada pengguna (mis. status dokumen berubah). | Tidak menetapkan channel (in-app/email/SMS) — Evidence Pending. |
| Cross-domain Alert | Notifikasi lintas-domain untuk kondisi tertentu (mis. finding governance). | Tidak menetapkan mekanisme trigger teknis. |

## 7. Routing AIR-003 (Tanpa Resolusi)

AIR-003 mencatat kontradiksi antara dua sumber baseline mengenai status model Notification: satu sumber menyatakan field belum didefinisikan, sumber lain menyatakan field sudah lengkap. Dokumen ini **tidak** menyelesaikan kontradiksi tersebut — penyelesaian memerlukan verifikasi langsung terhadap kode/skema implementasi existing, yang merupakan resolution evidence bagi AIR-003 itu sendiri (Issue Register), bukan scope standar arsitektur ini. Dokumen ini hanya menyediakan **prinsip target** yang berlaku terlepas dari hasil verifikasi tersebut.

## 8. Boundary dengan Integration Architecture (Seq 34, Approved — Batch Ini)

ARCH-INT-001 mengklasifikasikan "Internal Asynchronous/Event" sebagai pola integrasi; dokumen ini memperdalam prinsip desainnya. Dokumen ini tidak mengubah klasifikasi pola integrasi ARCH-INT-001.

## 9. Boundary dengan BP-DATA-003 (Approved) dan REF-INT-001 (Seq 37, Batch Ini)

Event sebagai lineage capture menggunakan model BP-DATA-003 sebagai struktur dasar (§5 poin 3), tanpa modifikasi. Katalog event aktual (bila tersedia) dicatat pada REF-INT-001, bukan pada dokumen ini.

## 10. Evidence Pending Register dan Routing

| Item | Placeholder | Routing |
| --- | --- | --- |
| Event schema/payload aktual | To be assigned by Project Owner — Evidence Pending | REF-INT-001 Seq 37 / implementasi teknis |
| Resolusi status model Notification (AIR-003) | To be assigned by Project Owner — Evidence Pending | AIR-EA-001 (verifikasi kode/implementasi existing) |
| Teknologi message broker | To be assigned by Project Owner — Evidence Pending | ARCH-TECH-001 (Approved, batch ini) / STD-TECH-001 Seq 41 |
| Channel user-facing notification | To be assigned by Project Owner — Evidence Pending | Implementasi teknis |

## 11. Assumptions dan Program State

1. ARCH-INT-001 dan BP-DATA-003 (1.0.0, Approved) adalah dependency; tidak diubah oleh dokumen ini.
2. AIR-003 tetap Open; tidak diselesaikan oleh dokumen ini.
3. G1 DEFERRED; G2 tanpa disposition.
4. Dokumen ini tidak menetapkan disposition G3.

## 12. Batas Kewenangan AI

**Diizinkan**: Menyusun prinsip desain event/notification berdasarkan Integration Architecture dan BP-DATA-003 yang Approved, routing AIR-003 tanpa resolusi, routing Evidence Pending, self-review, dan finalisasi dalam batas delegasi.

**Dilarang**: Menetapkan event schema/payload aktual, teknologi message broker, menyelesaikan AIR-003, atau disposition Gate.

## 13. Persetujuan

| Peran | Nama/Identitas | Status | Catatan | Tanggal |
| --- | --- | --- | --- | --- |
| Penyusun Dokumen / File Operator | Claude Work | Selesai | Draft disusun berdasarkan dependency normatif Approved. | 2026-08-05 |
| Acting Chief Enterprise Architect (self-review) | Claude Work | Approved | Substantive self-review PASSED; AIR-003 dirutekan tanpa resolusi, sesuai batas. | 2026-08-05 |
| Project Owner / Delegation Authority | Fahmi Alhabsi | Mandat tercatat | Delegasi melalui 10-Artifact Autonomous Batch Mandate tanggal 2026-08-05. | 2026-08-05 |

## 14. Change Log Dokumen (Lokal)

| Versi | Tanggal | Perubahan | Penyusun | Status |
| --- | --- | --- | --- | --- |
| 0.1.0 | 2026-08-05 | Penyusunan awal Event and Notification Standard sebagai STD-INT-002 Seq 36, berdasarkan ARCH-INT-001 dan BP-DATA-003 (Approved). Cakupan: prinsip desain event, klasifikasi notification, routing AIR-003 tanpa resolusi. | Claude Work | Draft for Review |
| — | 2026-08-05 | Substantive Self-Review PASSED. | Claude Work | Review Outcome: PASSED |
| 1.0.0 | 2026-08-05 | Finalisasi menjadi Version 1.0.0 Approved, efektif 2026-08-05. | Claude Work | Approved |

## 15. Validation Checklist (Version 1.0.0 Approved)

1. ✓ Metadata final: version 1.0.0, status Approved, effective_date 2026-08-05.
2. ✓ Dependency (ARCH-INT-001, BP-DATA-003) Approved dan tidak diubah.
3. ✓ Tidak ada event schema/payload/teknologi konkret ditetapkan.
4. ✓ AIR-003 dirutekan, tidak diselesaikan; tidak ada klaim resolusi.
5. ✓ Boundary Integration Architecture/BP-DATA-003/REF-INT-001 akurat.
6. ✓ G1 DEFERRED, G2 tanpa disposition dicatat akurat.
7. ✓ Tidak ada file lain tersentuh.

## 16. State Aktual Dokumen

Version 1.0.0, status **Approved**, effective_date 2026-08-05. Dependency Approved dan tidak diubah. AIR-003 tetap Open. G1 DEFERRED; G2 tanpa disposition.
