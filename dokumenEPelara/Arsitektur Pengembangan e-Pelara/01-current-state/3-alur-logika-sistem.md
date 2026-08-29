# 3. ALUR LOGIKA SISTEM e-PeLARA

> Dokumen ini menjelaskan alur logika sistem secara menyeluruh — dari autentikasi, hierarki data perencanaan, hingga siklus dokumen anggaran. Digunakan sebagai pedoman pengembangan dan perbaikan sistem.

---

## 3.1 Alur Autentikasi & Otorisasi

```
[User] → POST /api/auth/login
           ↓
     [authController.login]
           ↓
     Verifikasi username/email + bcrypt password
           ↓
     Generate JWT (local) → set HttpOnly Cookie "token"
           ↓
     Setiap request berikutnya:
     Authorization Header (Bearer token) ATAU Cookie "token"
           ↓
     [verifyToken middleware]
     → Decode JWT (tanpa verifikasi) → cek field type
       ├─ type = "sso"  → verifikasi dengan SSO_SHARED_SECRET (integrasi SIGAP)
       └─ type = local  → verifikasi dengan JWT_SECRET
           ↓
     Isi req.user: { id, username, email, role, role_id, divisions_id, opd, periode_id }
           ↓
     [allowRoles middleware]
     → Normalisasi role (uppercase, replace spasi → _)
     → Mapping role SIGAP → role e-PeLARA (via SIGAP_TO_EPELARA map)
     → Cek apakah role ada di daftar allowedRoles
       ├─ Ada  → next() → Controller
       └─ Tidak → 403 Akses Ditolak
```

### Hierarki Role

| Role e-PeLARA | Keterangan | Mapping dari SIGAP |
|---|---|---|
| `SUPER_ADMIN` | Akses penuh semua fitur, hanya 1 akun | SUPER_ADMIN |
| `ADMINISTRATOR` | Kelola data master, user, dan OPD | ADMIN, KEPALA_DINAS, SEKRETARIS |
| `PENGAWAS` | Lihat dan evaluasi data | KEPALA_BIDANG, GUBERNUR, KEPALA_UPTD |
| `PELAKSANA` | Input dan edit data operasional | FUNGSIONAL, PELAKSANA, KASUBBAG, VIEWER |

### Keamanan Autentikasi
- Token disimpan di **HttpOnly Cookie** → aman dari XSS
- Rate limiting: **10 request/10 menit** per IP (production)
- Satu SUPER ADMIN per sistem (dikunci di registrasi)
- Refresh token endpoint: `POST /api/auth/refresh-token`
- Logout: clear cookie `token` + `refreshToken`

---

## 3.2 Alur Hierarki Data Perencanaan (RPJMD)

```
PeriodeRpjmd (mis. "RPJMD 2025-2029")
  └── RPJMD
        ├── nama_rpjmd, kepala_daerah, wakil_kepala_daerah
        ├── periode_awal, periode_akhir, tahun_penetapan
        └── Visi (isi_visi, tahun_awal, tahun_akhir)
              └── Misi [1..n]  (no_misi, isi_misi)
                    └── Tujuan [1..n]  (no_tujuan, uraian_tujuan)
                          ├── IndikatorTujuan [1..n]  (target per tahun 1-5)
                          └── Sasaran [1..n]  (nomor, uraian_sasaran)
                                ├── IndikatorSasaran [1..n]
                                ├── Strategi [1..n]
                                ├── ArahKebijakan [1..n]
                                └── Program [1..n]
                                      ├── IndikatorProgram [1..n]
                                      └── Kegiatan [1..n]
                                            ├── IndikatorKegiatan [1..n]
                                            └── SubKegiatan [1..n]
```

### Aturan Bisnis Hierarki
- Setiap entitas wajib memiliki `periode_id` → memastikan data terikat satu periode RPJMD
- Tidak bisa membuat Tujuan tanpa Misi yang valid
- Tidak bisa membuat Sasaran tanpa Tujuan yang valid
- Tidak bisa membuat Program tanpa Sasaran yang valid
- Indikator Wizard memandu user mengisi indikator per level secara berurutan

---

## 3.3 Alur Cascading Keterkaitan

```
Prioritas Nasional (RPJMN / Pusat)
  ↕  (many-to-many)
Prioritas Daerah (RPJMD Provinsi/Kab-Kota)
  ↕  (many-to-many)
Prioritas Gubernur / Kepala Daerah
  ↕
Model Cascading (tabel: cascading)
  ├── misi_id
  ├── tujuan_id
  ├── sasaran_id
  ├── program_id
  ├── kegiatan_id
  ├── strategis[]       ← many-to-many via cascading_strategi
  └── arahKebijakans[]  ← many-to-many via cascading_arah_kebijakan
```

**Tujuan:** Memetakan keterkaitan antara Prioritas Nasional/Daerah/Gubernur dengan elemen RPJMD, untuk memastikan keselarasan vertikal perencanaan.

---

## 3.4 Alur Siklus Dokumen Perencanaan & Anggaran

```
[1] RPJMD (5 tahunan)
     ↓ diturunkan ke
[2] RENSTRA OPD (5 tahunan, per OPD)
     ├── Tujuan OPD → Sasaran OPD → Strategi → Kebijakan
     ├── Program → Kegiatan → Sub Kegiatan
     ├── IndikatorRenstra (target per tahun 1-6)
     └── RenstraTarget + RenstraTargetDetail
     ↓ diturunkan ke
[3] RKPD (Rencana Kerja Pemerintah Daerah, tahunan)
     ├── Mengacu: Visi, Misi, Tujuan, Sasaran, Strategi, ArahKebijakan dari RPJMD
     ├── Mengacu: RenstraProgram dari Renstra OPD
     └── Dihubungkan ke: PrioritasNasional, PrioritasDaerah, PrioritasGubernur
     ↓ diturunkan ke
[4] RENJA OPD (Rencana Kerja OPD, tahunan)
     ↓ diturunkan ke
[5] RKA (Rencana Kerja & Anggaran)
     ↓ ditetapkan menjadi
[6] DPA (Dokumen Pelaksanaan Anggaran)
     ↓ pelaksanaan
[7] PENATAUSAHAAN (manajemen keuangan)
     ↓ capture hasil ke
[8] REALISASI BULANAN + REALISASI INDIKATOR
     ↓ dianalisis di
[9] MONEV (Monitoring & Evaluasi)
     ↓ disusun menjadi laporan
[10] LAKIP (Laporan Akuntabilitas Kinerja Instansi Pemerintah)
      ├── LPK-Dispang (Laporan Pertanggungjawaban Keuangan)
      └── LK-Dispang  (Laporan Keuangan)
```

---

## 3.5 Alur Pengisian Indikator (Wizard)

```
[Mulai Wizard]
  Step 1: Pilih jenis indikator (Misi / Tujuan / Sasaran / Program / Kegiatan)
  Step 2: Pilih entitas terkait (mis. pilih Sasaran mana)
  Step 3: Isi nama indikator, satuan, baseline
  Step 4: Isi target per tahun (target_tahun_1 s.d. target_tahun_5)
  Step 5: Tentukan penanggung jawab
  Step 6: Simpan → POST ke endpoint indikator terkait
[Selesai]
```

Guard: user tidak bisa ke step berikutnya jika step sebelumnya belum valid.
Auto-fill: kode indikator diambil otomatis dari server (`GET /api/.../next-kode/:id`).

---

## 3.6 Alur Rekomendasi AI

```
[User klik "Rekomendasi AI"]
  ↓
Frontend kirim daftar indikator (indikatorList[])
  ↓
POST /api/rekomendasi-ai  (auth: semua role)
  ↓
Backend format indikator → prompt GPT-3.5-turbo
  ↓
OpenAI API → respons analisis kebijakan
  ↓
Frontend tampilkan rekomendasi dalam format Markdown
```

---

## 3.7 Alur Notifikasi Real-Time

```
Event terjadi (mis. data baru, approval, dsb.)
  ↓
Backend emit event via Socket.IO
  ↓
Frontend (NotificationProvider) mendengarkan event
  ↓
Notifikasi muncul di UI (bell icon / toast)
  ↓
User bisa lihat detail di /notifikasi
```

---

## 3.8 Alur Clone Periode

```
[Admin pilih "Clone Periode"]
  ↓
POST /api/clone-periode
  ↓
Backend salin data dari periode sumber ke periode tujuan:
  - Visi, Misi, Tujuan, Sasaran, Strategi, ArahKebijakan
  - Program, Kegiatan, SubKegiatan
  - Indikator per level
  ↓
Data baru terikat ke periode_id baru
```

**Tujuan:** Mempermudah penyusunan RPJMD periode baru berdasarkan data periode sebelumnya.

---

## 3.9 Alur Tanda Tangan Digital

```
[User upload dokumen PDF]
  ↓
POST /api/sign-pdf
  ↓
Backend: baca file PDF → tambah placeholder tanda tangan
  ↓
Signing dengan P12 certificate (node-forge + @signpdf)
  ↓
PDF tersimpan di /uploads dengan tanda tangan digital valid
  ↓
User download PDF bertanda tangan
```

---

## 3.10 Alur BMD (Barang Milik Daerah)

```
Input data barang (nama, kode, tahun perolehan, kondisi, nilai, sumber dana)
  ↓
Terikat ke periode_id
  ↓
CRUD via /api/bmd
  ↓
Dapat difilter per periode dan jenis_dokumen
```

---

*Dokumen ini adalah bagian dari dokumentasi sistem e-PeLARA.*
*Dibuat: 23 Maret 2026 | Versi: 1.0*
