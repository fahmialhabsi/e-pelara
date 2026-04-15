# Checklist rollout — enforcement SubKegiatan & mode operasional

Dokumen resmi untuk rollout bertahap **LEGACY → TRANSITION → MASTER** pada jalur **SubKegiatan** (API, policy, clone). Isi kolom evidence saat uji di staging/production agar keputusan naik mode **objektif** dan terlacak.

## Quick start (1 halaman)

| # | Langkah (super ringkas) | Detail di dokumen |
|---|-------------------------|-------------------|
| **1** | Pahami **tujuan** & **batas sistem** | [§1 Tujuan](#1-tujuan-rollout) · [§19 Known limitations](#19-known-limitations-ekspektasi-realistis) |
| **2** | **Smoke test** ~5 menit — pastikan API/DB/log hidup | [§2 Smoke test](#2-smoke-test-5-menit-wajib) |
| **3** | **Mode & darurat:** baca/set policy, titik toggle cepat | [§5 Konfigurasi mode](#5-konfigurasi-mode) · [Emergency toggle](#emergency-toggle) |
| **4** | **Gate → uji → DB/log → evidence** (sampai siap naik MASTER) | [§6](#nav-gate-master) · [§7](#7-skenario-uji-mode-transition) · [§8](#8-skenario-uji-mode-master-hanya-setelah-gate-6) · [§9](#9-validasi-hasil-di-database) · [§10](#10-validasi-log-aplikasi) · [§11](#11-post-rollout-monitoring-setelah-switch-ke-master) · [§13](#13-evidence-table-bukti-uji) |
| **5** | **Keputusan, komunikasi, rollback** | [§15 Verdict](#15-verdict-akhir) · [§12 Rollback](#12-rollback-plan) · [§18 Komunikasi](#18-communication-plan-rollout-insiden) |

**Insiden / abu-abu:** [§3 Abort](#3-abort-condition-hentikan-rollout) · [Severity](#incident-severity) · [§11 T+ monitoring](#11-post-rollout-monitoring-setelah-switch-ke-master) · [Command snippets](#command-snippets-eksekusi-cepat) · [Tautan tim](#single-source-of-truth-tautan-tim)

<a id="emergency-one-liner"></a>

> **One-line emergency playbook (panic):** set `sub_kegiatan_mode` → **`TRANSITION`** (via `PUT` atau env + restart) → **`GET` verifikasi** → pantau log → catat **§13 Evidence**. Rinci: [§5.4 Emergency toggle](#emergency-toggle).

<a id="emergency-who"></a>

### Siapa boleh mengeksekusi playbook darurat

| Tindakan | Siapa (sesuaikan SLA organisasi) |
|----------|----------------------------------|
| **`PUT` policy** (`/api/v1/app-policy/operational-mode`) | Role **SUPER_ADMIN** / **ADMINISTRATOR** + token; hindari dua orang melakukan `PUT` bersamaan tanpa koordinasi |
| **Ubah env** `EPELARA_OPERATIONAL_MODE_SUB_KEGIATAN` + **restart** proses Node | **Ops / DevOps** (akses host atau secret manager) |
| **Pantau log & isi Evidence** | On-call / Tech lead sesuai §11 / §18 |

<a id="emergency-stabilize"></a>

### Ekspektasi waktu stabilisasi (setelah rollback ke TRANSITION)

Isi angka setelah **rehearsal** di staging — supaya saat panic ekspektasi jelas:

| Fase | Ekspektasi (tim isi) |
|------|----------------------|
| Policy terbaca ulang (cache default **10 s**; restart jika pakai env) | **~____ menit** |
| Error rate & log kembali mendekati baseline | **~____ menit** hingga **~____ jam** |
| Trafik API tidak ada lonjakan 400 tak terduga | Pantau hingga checkpoint **§11.1** berikutnya |

---

## Command snippets (eksekusi cepat)

Ganti `BASE_URL` dan JWT admin sebelum dijalankan. `jq` opsional (pretty-print).

```bash
export BASE_URL="http://localhost:3000"
export AUTH_HEADER="Authorization: Bearer ISI_JWT_ADMIN_DISINI"

# Cek mode operasional + effective sub_kegiatan
curl -sS -X GET "${BASE_URL}/api/v1/app-policy/operational-mode" \
  -H "${AUTH_HEADER}" \
  -H "Accept: application/json"

# Snapshot compliance (agregat input_mode + anomaly MASTER)
curl -sS -X GET "${BASE_URL}/api/v1/app-policy/compliance-snapshot" \
  -H "${AUTH_HEADER}" \
  -H "Accept: application/json"

# Trend dari histori (butuh migrasi + POST record terjadwal)
curl -sS -X GET "${BASE_URL}/api/v1/app-policy/compliance-snapshot?trendHours=168" \
  -H "${AUTH_HEADER}" \
  -H "Accept: application/json"

# Simpan satu titik histori (admin); webhook opsional lewat env
curl -sS -X POST "${BASE_URL}/api/v1/app-policy/compliance-snapshot/record" \
  -H "${AUTH_HEADER}" \
  -H "Accept: application/json"

# Set contoh: global LEGACY, pilot sub TRANSITION
curl -sS -X PUT "${BASE_URL}/api/v1/app-policy/operational-mode" \
  -H "${AUTH_HEADER}" \
  -H "Content-Type: application/json" \
  -d "{\"mode\":\"LEGACY\",\"sub_kegiatan_mode\":\"TRANSITION\"}"

# Hapus override sub (inherit ke mode global)
curl -sS -X PUT "${BASE_URL}/api/v1/app-policy/operational-mode" \
  -H "${AUTH_HEADER}" \
  -H "Content-Type: application/json" \
  -d "{\"sub_kegiatan_mode\":null}"
```

**Job terjadwal `POST …/compliance-snapshot/record` (JWT admin)**

Detail penjadwalan Windows/Linux, trend `GET …?trendHours=`, dan webhook: [`compliance-snapshot-operations.md`](./compliance-snapshot-operations.md).

1. Di `backend/.env` atau `backend/.env.local` set **salah satu** jalur token:
   - `EPELARA_COMPLIANCE_RECORD_JWT` — token dari login **SUPER_ADMIN** / **ADMINISTRATOR** (tanpa `Bearer `).
   - `EPELARA_COMPLIANCE_RECORD_JWT_FILE` — path file satu baris JWT (relatif ke folder `backend`).
   - `EPELARA_COMPLIANCE_RECORD_LOGIN_EMAIL` + `EPELARA_COMPLIANCE_RECORD_LOGIN_PASSWORD` — job memanggil `POST /api/auth/login` (disarankan akun khusus job).
   - Opsional: `EPELARA_COMPLIANCE_RECORD_BASE_URL` (default `http://127.0.0.1:` + `PORT`).
2. Tes manual dari folder `backend`: `npm run job:compliance-record`
3. **Windows — Penjadwal Tugas:** Tindakan = `node`, Argumen = `scripts\recordComplianceSnapshotJob.js`, Mulai di = folder absolut `…\ePeLARA\backend`, jalankan sebagai user yang punya `.env` yang sama (atau set variabel lingkungan di tab tugas). Pemicu = mis. setiap 1 jam atau sekali sehari.
4. **Linux — cron:** `0 * * * * cd /path/to/backend && /usr/bin/node scripts/recordComplianceSnapshotJob.js >> /var/log/epelara-compliance-record.log 2>&1`

**Payload minimal `POST /api/sub-kegiatan`** (sesuaikan `kegiatan_id`, string OPD, `jenis_dokumen` / tahun dengan data valid di DB Anda):

```json
{
  "kegiatan_id": 1,
  "kode_sub_kegiatan": "5.01.01.01.01.0001",
  "nama_sub_kegiatan": "Smoke test sub kegiatan",
  "nama_opd": "OPD Contoh",
  "nama_bidang_opd": "Bidang Contoh",
  "sub_bidang_opd": "Sub bidang contoh",
  "jenis_dokumen": "RENJA",
  "tahun": 2025,
  "pagu_anggaran": 0
}
```

```bash
# Simpan body ke file lalu POST (hindari escaping panjang di shell)
curl -sS -X POST "${BASE_URL}/api/sub-kegiatan" \
  -H "${AUTH_HEADER}" \
  -H "Content-Type: application/json" \
  -d @subkegiatan-min.json
```

### Contoh log aplikasi (interpretasi cepat)

Backend mencetak baris seperti berikut saat create/update SubKegiatan (bentuk persis bisa sedikit bervariasi tergantung versi Node / serialisasi objek):

```text
[ENFORCEMENT] { mode: 'TRANSITION', entity: 'sub_kegiatan', action: 'create', isMasterPayload: false }
```

- **`mode`**: mode efektif untuk jalur sub_kegiatan (override / env / global).
- **`isMasterPayload: true`**: body mengirimkan field master; di TRANSITION harus lengkap atau dapat error validasi.

**Clone** (alur terpisah): `[CLONE_LOCK] { effectiveMode, skippedNoMaster, rowsInsertedApprox, ... }`.

### Contoh error API (enforcement / mode)

Respons JSON terstruktur (contoh; pesan persis bisa sedikit berbeda):

```json
{
  "code": "MASTER_FIELDS_REQUIRED",
  "message": "Mode MASTER: pembuatan sub_kegiatan wajib menyertakan master_sub_kegiatan_id dan regulasi_versi_id."
}
```

Contoh lain: `"code": "INVALID_HIERARCHY"`, `"details": ["…"]` (array alasan hierarki).

**Catatan:** `PUT` policy memerlukan role **SUPER_ADMIN** atau **ADMINISTRATOR**. Produksi: HTTPS wajib; jangan commit token.

---

## Single source of truth (tautan tim)

| Sumber | URL atau lokasi (isi — **satu** rujukan resmi per baris) |
|--------|----------------------------------------------------------|
| Dashboard monitoring rollout / compliance | API: `GET /api/v1/app-policy/compliance-snapshot` (fondasi); UI / roadmap: [`rollout-phase-2-roadmap.md`](./rollout-phase-2-roadmap.md) |
| Log viewer / APM (mis. Grafana, CloudWatch, atau file `backend/combined.log`) | |
| Migrasi & split (mis. `GET/POST /api/v1/migration`, Postman, Swagger internal) | |
| Dokumen ini (versi di repo) | `docs/regulasi/rollout-checklist-sub-kegiatan.md` |

---

## 1. Tujuan rollout

- Memastikan transaksi **SubKegiatan** baru dan perubahan data mematuhi **master regulasi** sesuai mode operasional.
- Menutup celah **clone** agar selaras dengan mode efektif (`[CLONE_LOCK]`).
- Menggunakan **override** `sub_kegiatan_mode` / env agar pilot **tanpa** memaksa seluruh sistem (policy global tetap bisa LEGACY).
- Menyediakan **rollback** terukur sebelum go-live penuh mode MASTER.

---

## 2. Smoke test (~5 menit, wajib)

**Lakukan sebelum checklist panjang** untuk memastikan environment tidak rusak (auth, DB, route, log).

| #   | Langkah                                                                                                                                                          | Ekspektasi                                                       | OK? | Tanggal / PIC |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- | --- | ------------- |
| S1  | `GET /api/v1/app-policy/operational-mode` (dengan token)                                                                                                         | `200`, body berisi `mode` dan `effective_sub_kegiatan`           | [ ] |               |
| S2  | `POST /api/sub-kegiatan` dengan **payload minimal** yang sudah valid untuk app Anda (kegiatan_id, kode/nama, opd, jenis_dokumen, tahun, dll. — sesuai validator) | `201` atau error validasi yang **jelas** (bukan 500 tanpa jejak) | [ ] |               |
| S3  | Cek **satu baris** di DB untuk id yang baru dibuat (atau baris uji)                                                                                              | Kolom tersimpan masuk akal (`input_mode`, master bila dikirim)   | [ ] |               |
| S4  | Cek **minimal satu baris log** server: `[ENFORCEMENT]` pada request create tadi                                                                                  | Log muncul dengan `entity: sub_kegiatan`                         | [ ] |               |

**Owner smoke test:** _________________

Jika salah satu langkah gagal tidak terduga → perbaiki environment dulu; **jangan** lanjutkan checklist penuh sampai S1–S4 lulus.

---

## 3. Abort condition (hentikan rollout)

**Jika salah satu kondisi di bawah ini terjadi, hentikan eskalasi mode** (tetap di TRANSITION / LEGACY), investigasi, dan dokumentasikan di evidence sebelum lanjut.

| #   | Kondisi pemicu                                                                                 | Tindakan awal                                                          |
| --- | ---------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| A1  | Lonjakan **400** tidak terduga (bukan skenario uji negatif) pada endpoint SubKegiatan / policy | Cek log, revert override / mode, kumpulkan sample request-id           |
| A2  | **Log error** enforcement / DB / clone naik signifikan vs baseline harian                      | Pause pilot; bandingkan versi deploy & query                           |
| A3  | **Clone** menghasilkan data tidak valid (MASTER tanpa FK, orphan, duplikat kritis)             | Nonaktifkan jalur clone trigger jika perlu; set mode lebih konservatif |
| A4  | **Mismatch mapping master** massal (hierarki gagal di banyak baris)                            | Tunda MASTER; fokus migrasi / regulasi / data sumber                   |
| A5  | Tim tidak bisa **rollback** dalam SLA yang disepakati                                          | Jangan naikkan mode sampai R1–R4 (§12) teruji ulang                    |

<a id="incident-severity"></a>

### 3.1 Tingkat keparahan insiden (opsional — kondisi abu-abu)

Bila insiden **tidak** persis memetakan ke baris A1–A5, gunakan level ini agar respons tetap konsisten (selaras §11.1 keputusan Lanjut / Observasi / Rollback parsial):

| Level | Arti | Tindakan disarankan |
| ----- | ---- | -------------------- |
| **Sev 1** | Kritis — risiko data besar / layanan utama down | **Rollback segera** enforcement (§5.4 Emergency toggle + §12); template komunikasi §18 “abort”; post-mortem |
| **Sev 2** | Menengah — degradasi nyata namun belum krisis penuh | **Observasi** ketat + **rollback parsial** (mis. `sub_kegiatan_mode` → `TRANSITION`); isi checkpoint T+ berikutnya |
| **Sev 3** | Rendah — anomali terbatas / noise | **Monitor**; catat di §13 Evidence; tinjau pada checkpoint terjadwal |

**Klasifikasi insiden terakhir (jika ada):** [ ] Sev 1 [ ] Sev 2 [ ] Sev 3 — **Tanggal:** _________________ **PIC:** _________________

**Keputusan abort dicatat oleh:** _________________ **Tanggal:** _________________

---

## 4. Prasyarat

| #   | Item                                                                                                                                              | Status (centang) | Catatan              |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- | -------------------- |
| P1  | Migration DB termasuk `app_policy` sudah dijalankan di environment target                                                                         | [ ]              |                      |
| P2  | Backend versi rollout ter-deploy                                                                                                                  | [ ]              |                      |
| P3  | Redis (jika dipakai cache clone) tersedia atau fallback aman                                                                                      | [ ]              | Opsional             |
| P4  | Akses admin untuk `PUT /api/v1/app-policy/operational-mode` terjamin                                                                              | [ ]              |                      |
| P5  | Tim memahami prioritas mode: **env `EPELARA_OPERATIONAL_MODE_SUB_KEGIATAN` → policy `operational_mode_sub_kegiatan` → policy `operational_mode`** | [ ]              | Lihat `.env.example` |
| P6  | Dokumen API / consumer tahu field **`master_sub_kegiatan_id`**, **`regulasi_versi_id`**, respons **`meta.enforcementWarning`**                    | [ ]              |                      |

**Owner prasyarat:** _________________

---

## 5. Konfigurasi mode

**Owner bagian ini:** _________________

### 5.1 Baca keadaan saat ini

- **Endpoint:** `GET /api/v1/app-policy/operational-mode`
- **Periksa:** `mode` (global), `effective_sub_kegiatan`, `sources` (global, sub policy, env).

### 5.2 Set mode (admin)

- **Endpoint:** `PUT /api/v1/app-policy/operational-mode`
- **Contoh pilot TRANSITION hanya SubKegiatan:**  
  `{ "sub_kegiatan_mode": "TRANSITION" }`  
  (global `mode` boleh tetap `LEGACY`).
- **Hapus override sub (inherit global):**  
  `{ "sub_kegiatan_mode": null }`
- **Override staging via env (prioritas tertinggi):**  
  `EPELARA_OPERATIONAL_MODE_SUB_KEGIATAN=TRANSITION|MASTER|LEGACY`
- **Cache policy (opsional):** `EPELARA_POLICY_CACHE_MS` (0 = nonaktif).

### 5.3 Catatan bentuk respons GET

Respons GET memuat field tambahan di luar `mode` agar pilot dan sumber kebenaran terlihat jelas. Klien lama yang hanya membaca `mode` tetap kompatibel; klien ketat harus diuji ulang.

<a id="emergency-toggle"></a>

### 5.4 Emergency toggle — lokasi kontrol cepat

**Saat insiden, gunakan tabel ini** — tidak perlu mencari di codebase.

| Kontrol                                                           | Lokasi / detail                                                                                                                                                                          |
| ----------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Endpoint baca mode**                                            | `GET /api/v1/app-policy/operational-mode`                                                                                                                                                |
| **Endpoint ubah mode**                                            | `PUT /api/v1/app-policy/operational-mode` — body JSON: `mode` (global), `sub_kegiatan_mode` (pilot sub_kegiatan), atau keduanya; `sub_kegiatan_mode: null` = inherit global (lihat §5.2) |
| **Env override (prioritas tertinggi untuk sub_kegiatan + clone)** | `EPELARA_OPERATIONAL_MODE_SUB_KEGIATAN` = `LEGACY` \| `TRANSITION` \| `MASTER` — set di `.env` / secret manager / orchestrator; **restart proses Node** agar perubahan terbaca           |
| **Siapa punya akses**                                             | **PUT policy:** pengguna dengan role **SUPER_ADMIN** atau **ADMINISTRATOR** (Bearer token). **Env / restart server:** **Ops / DevOps** atau PIC deployment yang ditunjuk organisasi      |
| **Setelah toggle**                                                | Wajib `GET` verifikasi; catat di **§13 Evidence** jika kejadian insiden                                                                                                                  |

**Ringkas saat panic:** sama dengan [One-line emergency playbook](#emergency-one-liner) di Quick start — `TRANSITION` → `GET` → log → Evidence.

**Siapa & berapa lama:** [Siapa mengeksekusi](#emergency-who) · [Ekspektasi stabilisasi](#emergency-stabilize)

---

<a id="nav-gate-master"></a>

## 6. Gate sebelum naik ke `sub_kegiatan_mode = MASTER`

**Jangan** set `sub_kegiatan_mode` (atau env) ke **MASTER** sampai **semua** poin di bawah ini terpenuhi, **baseline §17 (Data snapshot)** sudah diisi, dan bukti terdokumentasi di **Evidence table** (§13).

| #   | Syarat minimal                                                                                                                                                      | Bukti yang disetujui                          |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| G1  | **Semua skenario TRANSITION** di §7 lulus (sesuai ekspektasi hasil + log)                                                                                           | Baris evidence + PIC                          |
| G2  | **Clone** terbukti aman: baris hasil clone membawa master bila sumber punya master; di mode MASTER, baris tanpa master sumber **diskip**; log `[CLONE_LOCK]` sesuai | Query DB + log                                |
| G3  | **Split / migrasi:** unresolved split **kritis** untuk domain yang go-live sudah ditangani (sesuai kebijakan DPA)                                                   | Referensi tiket / `split-coverage` / resolusi |
| G4  | **Frontend / consumer API target** sudah rutin mengirim field master saat create/update yang relevan                                                                | Evidence API atau UAT                         |
| G5  | **Rollback** diuji minimal sekali (turun ke TRANSITION atau LEGACY / hapus override)                                                                                | Evidence PUT + GET setelah rollback           |

**Penanggung jawab gate:** _________________ **Tanggal gate disetujui:** _________________

### 6.1 Success criteria eksplisit (anti-subjektif)

Isi ambang **X** dan **Y** serta rentang waktu sebelum go-live; dipakai juga untuk menilai **§15 Verdict** “sukses”.

| #   | Kriteria                                                                                                                               | Target (tim isi)                                                                   | OK? |
| --- | -------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- | --- |
| SC1 | Error rate gabungan (5xx + 400 tak terduga) pada **`/api/sub-kegiatan`** dan **`/api/v1/app-policy/*`** vs baseline **sebelum** switch | Tidak meningkat lebih dari **____%** dibanding baseline minggu/hari sebelumnya | [ ] |
| SC2 | `meta.enforcementWarning` pada response create/update **saat `effective_sub_kegiatan` = MASTER**                                       | **0** dalam window monitoring (kecuali pengecualian tertulis & disetujui)          | [ ] |
| SC3 | **Transaksi baru** SubKegiatan (periode pantau: dari `____` s/d `____`) ber-`input_mode` **MASTER**                                    | Minimal **____%** untuk jalur / consumer yang dinyatakan wajib master | [ ] |
| SC4 | **Tidak ada** pemicu **§3 Abort condition** selama window T+ (§11.1)                                                                   | Ya — atau jelaskan di evidence                                                     | [ ] |
| SC5 | Integritas DB (MASTER tanpa FK)                                                                                                        | Sesuai §9 D1 — **0 baris**                                                         | [ ] |

---

## 7. Skenario uji — mode TRANSITION

**Owner / PIC bagian ini:** _________________

Lingkungan disarankan: **staging** dulu, beberapa hari, pantau jumlah warning dan endpoint legacy.

| ID  | Skenario                                                                         | Ekspektasi utama                                                                                 |
| --- | -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| T1  | **POST** `/api/sub-kegiatan` **tanpa** master                                    | `201`, `input_mode = LEGACY`, ada **`meta.enforcementWarning`** (transaksi legacy di TRANSITION) |
| T2  | **POST** `/api/sub-kegiatan` **dengan** master valid                             | `201`, `input_mode = MASTER`, master FK + hierarki valid, tanpa warning legacy                   |
| T3  | **PUT** sub_kegiatan **legacy** (baris LEGACY), body **tanpa** master            | `200`, tetap legacy path sesuai aturan; warning bila relevan                                     |
| T4  | **PUT** baris yang **sudah MASTER** (punya master), body tidak menurunkan master | `200`, **`input_mode` tetap MASTER**, tidak turun ke LEGACY                                      |

**Log yang diharapkan:** `[ENFORCEMENT]` dengan `mode: TRANSITION` (atau effective), `entity: sub_kegiatan`, `action` create/update, `isMasterPayload` benar.

---

## 8. Skenario uji — mode MASTER (hanya setelah gate §6)

**Owner / PIC bagian ini:** _________________

| ID  | Skenario                                                    | Ekspektasi utama                                  |
| --- | ----------------------------------------------------------- | ------------------------------------------------- |
| M1  | **POST** tanpa master lengkap                               | `400`, code **`MASTER_FIELDS_REQUIRED`**          |
| M2  | **POST** dengan master valid                                | `201`, `input_mode = MASTER`                      |
| M3  | **PUT** baris sudah MASTER tanpa kirim ulang master di body | `200`, tetap terikat master (merge dari existing) |
| M4  | **PUT** mencoba mengosongkan master pada baris MASTER       | `400`, **`MASTER_FIELDS_REQUIRED`**               |

---

## 9. Validasi hasil di database

**Owner / PIC bagian ini:** _________________

Query contoh (sesuaikan nama DB / filter):

```sql
-- Sampel cek mode transaksi per jenis dokumen / tahun (sesuaikan WHERE)
SELECT input_mode, COUNT(*) AS n
FROM sub_kegiatan
WHERE tahun = ? AND jenis_dokumen = ?
GROUP BY input_mode;

-- Baris MASTER harus punya kedua FK
SELECT id, input_mode, master_sub_kegiatan_id, regulasi_versi_id
FROM sub_kegiatan
WHERE input_mode = 'MASTER'
  AND (master_sub_kegiatan_id IS NULL OR regulasi_versi_id IS NULL);
-- Harus 0 baris.
```

| #   | Pemeriksaan                                                                                     | Hasil OK? |
| --- | ----------------------------------------------------------------------------------------------- | --------- |
| D1  | Tidak ada `input_mode = 'MASTER'` dengan FK master NULL                                         | [ ]       |
| D2  | Setelah clone di mode MASTER, tidak ada lonjakan LEGACY tak terduga dari jalur clone            | [ ]       |
| D3  | Policy `app_policy` untuk `operational_mode` / `operational_mode_sub_kegiatan` sesuai keputusan | [ ]       |

---

## 10. Validasi log aplikasi

**Owner / PIC bagian ini:** _________________

| #   | Log / sumber      | Yang dicek                                                                                                                   |
| --- | ----------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| L1  | `[ENFORCEMENT]`   | Ada pada create/update SubKegiatan yang diuji; field `mode`, `isMasterPayload` konsisten                                     |
| L2  | `[CLONE_LOCK]`    | Setelah alur yang memicu `autoCloneSubKegiatanIfNeeded`: `effectiveMode`, `skippedNoMaster`, `rowsInsertedApprox` masuk akal |
| L3  | Error terstruktur | `INVALID_HIERARCHY`, `MASTER_FIELDS_REQUIRED` sesuai skenario negatif                                                        |

---

## 11. Post-rollout monitoring (setelah switch ke MASTER)

**Owner monitoring:** _________________ **Periode pantau (mis. 48–72 jam pertama):** _________________

Setelah `effective_sub_kegiatan` = **MASTER** (atau global MASTER), pantau secara berkala:

| #   | Metrik / pemeriksaan                                                                       | Cara cek                                                                              | Baseline / catatan |
| --- | ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------- | ------------------ |
| PM1 | Jumlah **request gagal** (5xx / 400 tak terduga) pada SubKegiatan & policy                 | Log APM / access log                                                                  |                    |
| PM2 | **`meta.enforcementWarning`** pada create/update baru                                      | Harus **nol** atau mendekati nol di MASTER (path legacy tidak dipakai konsumen wajib) |                    |
| PM3 | **Row baru** dengan `input_mode = 'MASTER'` vs LEGACY (per hari / per OPD jika ada filter) | Query agregat                                                                         |                    |
| PM4 | **Error enforcement** di log (`MASTER_FIELDS_REQUIRED`, `INVALID_HIERARCHY`)               | Harus proporsional dengan traffic; lonjakan → tinjau §3                               |                    |
| PM5 | **Clone** pasca-switch (jika ada job/trigger)                                              | Sampel `[CLONE_LOCK]` + spot-check DB                                                 |                    |

### 11.1 T+ monitoring checkpoints

**T0** = waktu switch efektif ke MASTER (atau mulai window monitoring pasca-naik): `________________` (TZ: _________________).

Isi **setiap** baris pada waktu yang dijanjikan agar tim tidak melewatkan pantauan pasca-switch.

| Checkpoint     | Waktu aktual (isi saat eksekusi) | Ringkas metrik **PM1–PM5** (angka / ya-tidak / satu baris) | Keputusan                                                 |
| -------------- | -------------------------------- | ---------------------------------------------------------- | --------------------------------------------------------- |
| **T+5 menit**  |                                  | PM1: **_ PM2: _** PM3: **_ PM4: _** PM5: \_\_\_            | [ ] **Lanjut** [ ] **Observasi** [ ] **Rollback parsial** |
| **T+30 menit** |                                  |                                                            | [ ] **Lanjut** [ ] **Observasi** [ ] **Rollback parsial** |
| **T+2 jam**    |                                  |                                                            | [ ] **Lanjut** [ ] **Observasi** [ ] **Rollback parsial** |
| **T+24 jam**   |                                  |                                                            | [ ] **Lanjut** [ ] **Observasi** [ ] **Rollback parsial** |

**PIC checkpoint (jadwal & eskalasi):** _________________

**Review singkat pasca-monitoring (tanggal):** _________________ **Hasil:** [ ] Stabil [ ] Perlu tuning [ ] Rollback parsial (jelaskan): _________________

**Catatan:** Untuk verdict “sukses” pasca-MASTER, cross-check **§6.1 Success criteria** (SC1–SC5).

---

## 12. Rollback plan

| Langkah | Aksi                                                                      | Sudah diuji? |
| ------- | ------------------------------------------------------------------------- | ------------ |
| R1      | Set `PUT { "sub_kegiatan_mode": "TRANSITION" }` atau `"LEGACY"`           | [ ]          |
| R2      | Atau `PUT { "sub_kegiatan_mode": null }` agar inherit `mode` global       | [ ]          |
| R3      | Hapus / ubah env `EPELARA_OPERATIONAL_MODE_SUB_KEGIATAN`, restart backend | [ ]          |
| R4      | Verifikasi dengan `GET /api/v1/app-policy/operational-mode`               | [ ]          |

**Owner rollback drill:** _________________

**Catatan:** Rollback **tidak** mengembalikan data transaksi yang sudah tersimpan; hanya mengendurkan **enforcement** ke depan.

### 12.1 Rollback drill result (bukan sekadar teori)

| Field                               | Isi                                                                          |
| ----------------------------------- | ---------------------------------------------------------------------------- |
| **Tanggal terakhir rollback diuji** | ___ / ___ / ______ |
| **Environment**                     |                                                                              |
| **Hasil**                           | [ ] **OK** — perilaku sesuai harapan setelah PUT + GET policy                |
|                                     | [ ] **Issue** — jelaskan: _________________________________________________ |
| **Evidence**                        | (screenshot / nomor tiket / id request)                                      |
| **PIC**                             |                                                                              |

---

## 13. Evidence table (bukti uji)

Salin baris per skenario / gate. Tujuan: bukan hanya “sudah tes”, tapi **ada bukti dan hasilnya apa**.

| Tanggal uji | Environment (dev/staging/prod) | Endpoint | Payload ringkas | Hasil (HTTP / ringkasan) | Bukti (log path, screenshot, query ID, lampiran) | PIC |
| ----------- | ------------------------------ | -------- | --------------- | ------------------------ | ------------------------------------------------ | --- |
|             |                                |          |                 |                          |                                                  |     |
|             |                                |          |                 |                          |                                                  |     |
|             |                                |          |                 |                          |                                                  |     |
|             |                                |          |                 |                          |                                                  |     |
|             |                                |          |                 |                          |                                                  |     |

---

## 14. Sign-off

| Peran                           | Nama | Tanggal | Tanda tangan / paraf digital |
| ------------------------------- | ---- | ------- | ---------------------------- |
| Tech lead / backend             |      |         |                              |
| QA / UAT                        |      |         |                              |
| Perencanaan / domain (opsional) |      |         |                              |
| Ops / deployment                |      |         |                              |

---

## 15. Verdict akhir

**Keputusan setelah checklist:**

- [ ] **Ditunda** — alasan: _________________________________________________
- [ ] **Lanjut pilot TRANSITION** di environment: _________________ hingga tanggal: _________________
- [ ] **Naik ke MASTER** (sub override atau global) — tanggal efektif: _________________ — dengan catatan: _________________

**Bila memilih “Naik ke MASTER” atau menutup fase sebagai sukses:** centang bahwa **§6.1 (SC1–SC5)** terpenuhi atau pengecualian tertulis disetujui PIC.

### 15.1 Owner final decision (hindari deadlock)

**Siapa yang berwenang memberi keputusan final** untuk opsi §15 di atas (pilih per SLA organisasi; hanya peran yang disepakati yang mengikat):

| Peran | Berwenang final? | Nama | Paraf / tanggal |
| ----- | ---------------- | ---- | ----------------- |
| Tech lead / Engineering | [ ] Ya | | |
| Ops / Infrastructure | [ ] Ya | | |
| Product / domain perencanaan | [ ] Ya | | |
| Lainnya (sebutkan): _________________ | [ ] Ya | | |

**Keputusan final tertulis (“Ya / Tidak / Tunda”) untuk langkah kritis:** _________________

**PIC yang menyampaikan keputusan ke tim:** _________________

**Kesimpulan singkat (1–3 kalimat):**

________________________________________________________________________________

________________________________________________________________________________

---

## 16. Time window & freeze (hari-H)

**Isi bagian ini saat jadwal rollout ditetapkan** — mencegah deploy lain bertabrakan.

| Field                              | Isi                                                                                                                          |
| ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| **Waktu mulai rollout (TZ lokal)** |                                                                                                                              |
| **Waktu estimasi selesai**         |                                                                                                                              |
| **Freeze window**                  | Dari _________________ hingga _________________ — **tidak ada** deploy fitur lain / migrasi besar kecuali hotfix disetujui PIC |
| **PIC koordinasi deploy**          |                                                                                                                              |
| **Disetujui oleh (ops)**           |                                                                                                                              |

---

## 17. Data snapshot reference (baseline sebelum switch ke MASTER)

**Ambil sebelum** menyetujui naik ke MASTER; dipakai untuk perbandingan cepat pasca-rollout (query ulang angka yang sama).

| Field                                              | Isi |
| -------------------------------------------------- | --- |
| **Tanggal & jam snapshot**                         |     |
| **Environment**                                    |     |
| **Filter scope** (tahun / jenis_dokumen / lainnya) |     |

**Hasil query — `COUNT(*)` `sub_kegiatan` by `input_mode`** (tempel hasil):

| `input_mode`             | `n` |
| ------------------------ | --- |
| LEGACY                   |     |
| MASTER                   |     |
| _(NULL / lain jika ada)_ |     |

**Unresolved split (kritis untuk domain go-live):**

| Sumber                                                                            | Nilai / catatan |
| --------------------------------------------------------------------------------- | --------------- |
| Jumlah / daftar (mis. dari `GET …/split-coverage`, dashboard migrasi, atau tiket) |                 |
| PIC data / migrasi                                                                |                 |

**Lampiran opsional:** export CSV, id query tersimpan, link dashboard.

---

## 18. Communication plan (rollout & insiden)

| Field                              | Isi                                        |
| ---------------------------------- | ------------------------------------------ |
| **Channel komunikasi utama**       | (mis. Slack `#…`, WA group, Teams channel) |
| **PIC komunikasi / incident coms** | Nama + kontak: _________________ |
| **Cadangan channel**               |                                            |

### Template pesan — mulai rollout

```
[Rollout SubKegiatan] Mulai: <waktu TZ>. Environment: <staging|prod>.
Mode target: <TRANSITION|MASTER>. Freeze window: <rentang>.
PIC teknis: <nama>. Pantau channel ini untuk update.
```

### Template pesan — abort

```
[Rollout SubKegiatan] ABORT — eskalasi mode dihentikan. Alasan: <singkat>.
Tindakan: <mis. sub_kegiatan_mode dikembalikan ke TRANSITION>.
PIC: <nama>. Tindak lanjut: <tiket/link>.
```

### Template pesan — sukses / selesai fase

```
[Rollout SubKegiatan] Fase <TRANSITION|MASTER> selesai <waktu>.
Ringkasan: <stabil / monitoring 48j / dll>.
Evidence & sign-off: <lokasi dokumen / link>. Terima kasih tim.
```

**Severity di pesan (opsional):** sertakan `Sev 1/2/3` (§3.1) di baris pertama agar channel respons konsisten.

---

## 19. Known limitations (ekspektasi realistis)

Stakeholder perlu memahami batas sistem **saat dokumen ini ditulis**:

| Area | Batasan | Dampak operasional |
| ---- | ------- | ------------------- |
| **Cakupan enforcement** | Hanya **SubKegiatan** (create/update API + clone lock); **Program** / **Kegiatan** transaksi belum enforcement serupa | Compliance penuh hierarki masih bertumpu pada titik SubKegiatan |
| **OPD / scope** | Filter OPD di beberapa alur masih **berbasis string** (mis. `opd_penanggung_jawab`); belum granular **per-OPD** di policy rollout | Pilot “per unit” butuh desain lanjutan |
| **Split / migrasi** | Resolusi SPLIT + coverage **tidak otomatis 100%**; sisa LEGACY mungkin masih ada sampai migrasi & resolusi selesai | Gate §6 G3 dan snapshot §17 tetap relevan |
| **GET policy** | Bentuk respons `GET …/operational-mode` memuat field tambahan; klien parse ketat perlu dicek | |
| **Rollback** | Mengendurkan **enforcement ke depan**, bukan mengembalikan data historis baris transaksi | |

---

## Referensi cepat (teknis)

| Topik                      | Lokasi / endpoint                                                                                 |
| -------------------------- | ------------------------------------------------------------------------------------------------- |
| Policy GET/PUT             | `/api/v1/app-policy/operational-mode`                                                             |
| Compliance snapshot        | `GET …/compliance-snapshot` (baca: admin + PENGAWAS + PELAKSANA); `?trendHours=`; `POST …/record` (admin) |
| SubKegiatan API            | `/api/sub-kegiatan` (create/update dengan middleware mode efektif)                                |
| Clone                      | `utils/autoCloneSubKegiatanIfNeeded.js`, log `[CLONE_LOCK]`                                       |
| Migrasi / split / coverage | `/api/v1/migration` (sesuai rute yang dipakai tim)                                                |
| Env pilot                  | `EPELARA_OPERATIONAL_MODE_SUB_KEGIATAN`, `EPELARA_POLICY_CACHE_MS` — lihat `backend/.env.example` |

---

_Versi dokumen: 1.10 — tautan `compliance-snapshot-operations.md` (jadwal, trend, webhook); roadmap fase 2._

**Naik level (dashboard / alert / per-OPD):** lihat [`rollout-phase-2-roadmap.md`](./rollout-phase-2-roadmap.md).
