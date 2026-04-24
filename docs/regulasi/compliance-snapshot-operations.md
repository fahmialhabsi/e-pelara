# Operasional: compliance snapshot — jadwal, trend API, webhook

Panduan ini melengkapi [`rollout-checklist-sub-kegiatan.md`](./rollout-checklist-sub-kegiatan.md) (job token) dan [`rollout-phase-2-roadmap.md`](./rollout-phase-2-roadmap.md).

**Prasyarat:** API backend **selalu berjalan** (staging/production dengan PM2, Windows Service, Docker, dll.). Job `npm run job:compliance-record` hanya melakukan HTTP ke server yang sudah hidup — **bukan** menggantikan server.

---

## 1. Penjadwal (Task Scheduler / cron)

### Windows — Penjadwal Tugas (GUI)

1. Buka **Penjadwal Tugas** → **Buat Tugas** (bukan Tugas Dasar), beri nama mis. `ePeLARA compliance record`.
2. **Umum:** pilih **Jalankan hanya saat pengguna masuk** atau **Jalankan apakah pengguna masuk atau tidak**; centang **Jalankan dengan hak istimewa tertinggi** hanya jika perlu.
3. **Pemicu:** **Baru** → mis. **Setiap hari** lalu **Tingkat lanjut** atur pengulangan tiap **1 jam** (atau satu kali sehari pukul tertentu).
4. **Tindakan:** **Baru** → **Mulai program**
   - **Program/skrip:** path penuh ke `node.exe` (contoh: `C:\Program Files\nodejs\node.exe` — cek dengan `where.exe node` di PowerShell).
   - **Tambahkan argumen:** `scripts\recordComplianceSnapshotJob.js`
   - **Mulai di:** folder absolut backend, mis. `E:\1-MyApp\React\ePeLARA\backend`
5. **Kondisi:** nonaktifkan “Mulai hanya jika komputer menggunakan daya AC” jika ingin jalan di laptop baterai (opsional).
6. Pengguna yang menjalankan tugas harus punya akses ke **`backend/.env`** (atau set variabel lingkungan yang sama di tab **Tindakan** → **Konfigurasi** untuk tugas tersebut).

**Penting:** Jangan menghentikan proses server untuk menjalankan tugas ini. Server backend dan tugas terjadwal harus **bersamaan**.

### Linux — cron

Tiap jam (menit ke-0):

```cron
0 * * * * cd /path/to/ePeLARA/backend && /usr/bin/node scripts/recordComplianceSnapshotJob.js >> /var/log/epelara-compliance-record.log 2>&1
```

Sekali sehari jam 06:15:

```cron
15 6 * * * cd /path/to/ePeLARA/backend && /usr/bin/node scripts/recordComplianceSnapshotJob.js >> /var/log/epelara-compliance-record.log 2>&1
```

Sesuaikan path `node` (`which node`) dan path repo. Pastikan user cron punya file `.env` di folder `backend` atau export variabel `EPELARA_COMPLIANCE_RECORD_*` di baris cron.

---

## 2. Trend di API (`trendHours`)

Histori diisi oleh **`POST /api/v1/app-policy/compliance-snapshot/record`** (UI admin, atau job di atas). Tanpa record berkala, array `trend` akan kosong.

**Endpoint (baca):**

```http
GET /api/v1/app-policy/compliance-snapshot?trendHours=168
Authorization: Bearer <JWT role admin | PENGAWAS | PELAKSANA>
```

- **`trendHours`** (opsional): jendela waktu ke belakang dalam jam (maks. 8760). Contoh `168` = 7 hari.
- Respons memuat snapshot **live** (angka terkini) plus **`trend`**: deret titik dari tabel `compliance_snapshot_history`, dan **`trendMeta`** (`pointCount`, `cappedAtRows`, dll.).

Contoh `curl` (set `BASE_URL` dan token):

```bash
curl -sS -X GET "${BASE_URL}/api/v1/app-policy/compliance-snapshot?trendHours=168" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Accept: application/json"
```

---

## 3. Webhook alert (setelah POST record)

Webhook **hanya** dijalankan setelah penyimpanan histori berhasil lewat **`POST …/compliance-snapshot/record`** (bukan pada setiap `GET` snapshot).

| Variabel | Wajib | Keterangan |
|----------|--------|------------|
| `EPELARA_COMPLIANCE_ALERT_WEBHOOK_URL` | Ya, untuk mengaktifkan | URL yang menerima `POST` JSON (Slack Incoming Webhook, n8n, Teams workflow, dll.) |
| `EPELARA_COMPLIANCE_ALERT_WEBHOOK_SECRET` | Tidak | Jika di-set, dikirim sebagai header `X-Webhook-Secret` |
| `EPELARA_COMPLIANCE_ALERT_MIN_INVALID_MASTER` | Tidak | Default **1**. Webhook dikirim hanya jika `invalidMasterRowsMissingFk` **≥** nilai ini |

**Kondisi pengiriman:** `invalidMasterRowsMissingFk` pada snapshot yang baru direkam memenuhi ambang (default: ada minimal **1** baris MASTER tanpa FK lengkap).

**Isi body JSON (ringkas):**

- `event`: `"compliance.snapshot_recorded"`
- `generatedAt`, `invalidMasterRowsMissingFk`, `approximateMasterSharePercent`, `totalSubKegiatanRows`, `effectiveSubKegiatanMode`, `operationalMode`
- `previous`: ringkasan snapshot sebelumnya (jika ada), untuk membandingkan tren

Timeout request webhook: 8 detik; kegagalan webhook **tidak** membatalkan penyimpanan DB (hanya di-log di server).

Tambahkan variabel di **`backend/.env`** pada server yang memproses **POST record** (proses `node server.js` / container yang sama).

---

## Referensi cepat

| Topik | Lokasi |
|--------|--------|
| Job Node + token | `backend/scripts/recordComplianceSnapshotJob.js`, `npm run job:compliance-record` |
| Contoh env | `backend/.env.example` |
| Rute API | `backend/routes/appPolicyRoutes.js` |

_Versi: 1.0_
