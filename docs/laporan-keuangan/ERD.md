# ERD Ringkas — Modul Laporan Keuangan

Tabel utama (MySQL) yang mendukung LK. Relasi banyak mengacu pada `kode_akun` / `tahun_anggaran` tanpa FK keras ke dokumen perencanaan.

## Inti akuntansi

| Tabel | Keterangan |
|-------|------------|
| `kode_akun_bas` | Chart of accounts BAS |
| `jurnal_umum`, `jurnal_detail` | Jurnal |
| `saldo_akun` | Saldo per akun per bulan |
| `bku`, `bku_pembantu`, `bku_up` | Buku kas umum & UP |

## Snapshot laporan

| Tabel | Keterangan |
|-------|------------|
| `lra_snapshot` | LRA per akun per tahun |
| `neraca_snapshot` | Neraca per akun per tahun |
| `lo_snapshot` | LO |
| `lpe_snapshot` | LPE |
| `lak_snapshot` | Laporan arus kas (agregat komponen) |

## Pendukung neraca

| Tabel |
|-------|
| `aset_tetap`, `mutasi_aset`, `penyusutan_*` (sesuai migrasi) |
| `persediaan`, `piutang`, `kewajiban_jangka_pendek` |

## CALK

| Tabel | Keterangan |
|-------|------------|
| `calk_template` | Struktur bab |
| `calk_konten` | Konten per tahun + `template_id` (FK ke template) |

## Integrasi & kinerja

| Tabel | Keterangan |
|-------|------------|
| `lk_kinerja` | Sinkron data kinerja/monev (SIGAP) untuk CALK |
| `lk_pdf_riwayat` | Riwayat generate PDF (nama file, ukuran, user, waktu) |

## Perencanaan (sumber anggaran)

| Tabel | Keterangan |
|-------|------------|
| `dpa` | Anggaran/realisasi silang untuk LRA (kolom `tahun`, `anggaran`, `realisasi`) |

Relasi detail antar entitas perencanaan (RPJMD, Renstra, RKA) tetap mengikuti skema dokumen e-PELARA; modul LK memakai **tahun anggaran** dan **kode akun** sebagai jembatan utama.
