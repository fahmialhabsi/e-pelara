-- phpMyAdmin SQL Dump
-- version 5.2.2
-- https://www.phpmyadmin.net/
--
-- Host: localhost:3306
-- Waktu pembuatan: 21 Sep 2025 pada 12.50
-- Versi server: 8.0.30
-- Versi PHP: 8.1.10

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `db_epelara`
--

-- --------------------------------------------------------

--
-- Struktur dari tabel `activitylogs`
--

CREATE TABLE `activitylogs` (
  `id` int UNSIGNED NOT NULL,
  `userId` int UNSIGNED NOT NULL,
  `role` enum('ADMINISTRATOR','PENGAWAS','PELAKSANA') COLLATE utf8mb4_unicode_ci NOT NULL,
  `taskName` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `timestamp` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `sourceData` text COLLATE utf8mb4_unicode_ci,
  `correctionNote` text COLLATE utf8mb4_unicode_ci,
  `deadline` datetime NOT NULL,
  `createdAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Struktur dari tabel `arah_kebijakan`
--

CREATE TABLE `arah_kebijakan` (
  `id` int NOT NULL,
  `strategi_id` int NOT NULL,
  `kode_arah` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `deskripsi` varchar(500) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `jenis_dokumen` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'rpjmd',
  `tahun` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '2025',
  `periode_id` int DEFAULT NULL,
  `jenisDokumen` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'RPJMD'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data untuk tabel `arah_kebijakan`
--

INSERT INTO `arah_kebijakan` (`id`, `strategi_id`, `kode_arah`, `deskripsi`, `created_at`, `updated_at`, `jenis_dokumen`, `tahun`, `periode_id`, `jenisDokumen`) VALUES
(1, 1, 'ASST1-01-01.1.1', 'Perbaikan gizi kesehatan untuk Ibu Hamil', '2025-08-12 23:30:55', '2025-08-12 23:30:55', 'rpjmd', '2025', 2, 'RPJMD'),
(2, 1, 'ASST1-01-01.1.2', 'Perbaikan gizi kesehatan untuk Ibu Menyusui', '2025-08-13 00:53:14', '2025-08-13 00:53:14', 'rpjmd', '2025', 2, 'RPJMD'),
(3, 2, 'ASST1-01-02.1.1', 'Pengelolaan pendidikan yang berkualitas tinggi di jenjang SMA', '2025-08-13 00:54:12', '2025-08-13 00:54:12', 'rpjmd', '2025', 2, 'RPJMD'),
(4, 2, 'ASST1-01-02.1.2', 'Pengelolaan pendidikan yang berkualitas tinggi di jenjang SMK', '2025-08-13 00:54:26', '2025-08-13 00:54:26', 'rpjmd', '2025', 2, 'RPJMD');

-- --------------------------------------------------------

--
-- Struktur dari tabel `bmd`
--

CREATE TABLE `bmd` (
  `id` int NOT NULL,
  `nama_barang` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `kode_barang` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `tahun_perolehan` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `kondisi` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `nilai_perolehan` double DEFAULT NULL,
  `sumber_dana` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `keterangan` text COLLATE utf8mb4_unicode_ci,
  `jenis_dokumen` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `periode_id` int NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Struktur dari tabel `cascading`
--

CREATE TABLE `cascading` (
  `id` int NOT NULL,
  `misi_id` int NOT NULL,
  `prior_nas_id` bigint UNSIGNED NOT NULL,
  `prior_daerah_id` bigint UNSIGNED NOT NULL,
  `prior_kepda_id` bigint UNSIGNED NOT NULL,
  `tujuan_id` int NOT NULL,
  `sasaran_id` int NOT NULL,
  `program_id` int UNSIGNED DEFAULT NULL,
  `kegiatan_id` int NOT NULL,
  `createdAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `strategi_id` int DEFAULT NULL,
  `arah_kebijakan_id` int DEFAULT NULL,
  `jenis_dokumen` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `tahun` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '2025',
  `periode_id` int DEFAULT NULL,
  `jenisDokumen` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'RPJMD'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Struktur dari tabel `cascading_arah_kebijakan`
--

CREATE TABLE `cascading_arah_kebijakan` (
  `cascading_id` int NOT NULL,
  `arah_kebijakan_id` int NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Struktur dari tabel `cascading_strategi`
--

CREATE TABLE `cascading_strategi` (
  `cascading_id` int NOT NULL,
  `strategi_id` int NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Struktur dari tabel `divisions`
--

CREATE TABLE `divisions` (
  `id` int NOT NULL,
  `name` varchar(255) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `rpjmd_id` int DEFAULT NULL,
  `jenis_dokumen` varchar(255) DEFAULT NULL,
  `tahun` varchar(255) NOT NULL DEFAULT '2025',
  `jenisDokumen` varchar(255) NOT NULL DEFAULT 'RPJMD'
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

--
-- Dumping data untuk tabel `divisions`
--

INSERT INTO `divisions` (`id`, `name`, `description`, `created_at`, `updated_at`, `rpjmd_id`, `jenis_dokumen`, `tahun`, `jenisDokumen`) VALUES
(1, 'SEKRETARIAT', NULL, '2025-04-24 16:22:46', '2025-04-24 16:22:46', NULL, 'RPJMD', '2025', 'RPJMD'),
(2, 'BIDANG DISTRIBUSI', NULL, '2025-04-24 16:22:46', '2025-04-24 16:22:46', NULL, 'RPJMD', '2025', 'RPJMD'),
(3, 'BIDANG KONSUMSI', NULL, '2025-04-24 16:22:46', '2025-04-24 16:22:46', NULL, 'RPJMD', '2025', 'RPJMD'),
(4, 'BIDANG KERAWANAN', NULL, '2025-04-24 16:22:46', '2025-04-24 16:22:46', NULL, 'RPJMD', '2025', 'RPJMD'),
(5, 'BALAI PENGAWAS', NULL, '2025-04-24 16:22:46', '2025-04-24 16:22:46', NULL, 'RPJMD', '2025', 'RPJMD'),
(41, 'SEKRETARIAT', NULL, '2025-05-02 06:58:29', '2025-05-02 06:58:29', NULL, 'RPJMD', '2025', 'RPJMD'),
(42, 'BIDANG DISTRIBUSI', NULL, '2025-05-02 06:58:29', '2025-05-02 06:58:29', NULL, 'RPJMD', '2025', 'RPJMD'),
(43, 'BIDANG KONSUMSI', NULL, '2025-05-02 06:58:29', '2025-05-02 06:58:29', NULL, 'RPJMD', '2025', 'RPJMD'),
(44, 'BIDANG KERAWANAN', NULL, '2025-05-02 06:58:29', '2025-05-02 06:58:29', NULL, 'RPJMD', '2025', 'RPJMD'),
(45, 'BALAI PENGAWAS', NULL, '2025-05-02 06:58:29', '2025-05-02 06:58:29', NULL, 'RPJMD', '2025', 'RPJMD'),
(46, 'SEKRETARIAT', NULL, '2025-05-02 07:01:39', '2025-05-02 07:01:39', NULL, 'RPJMD', '2025', 'RPJMD'),
(47, 'BIDANG DISTRIBUSI', NULL, '2025-05-02 07:01:39', '2025-05-02 07:01:39', NULL, 'RPJMD', '2025', 'RPJMD'),
(48, 'BIDANG KONSUMSI', NULL, '2025-05-02 07:01:39', '2025-05-02 07:01:39', NULL, 'RPJMD', '2025', 'RPJMD'),
(49, 'BIDANG KERAWANAN', NULL, '2025-05-02 07:01:39', '2025-05-02 07:01:39', NULL, 'RPJMD', '2025', 'RPJMD'),
(50, 'BALAI PENGAWAS', NULL, '2025-05-02 07:01:39', '2025-05-02 07:01:39', NULL, 'RPJMD', '2025', 'RPJMD'),
(51, 'SEKRETARIAT', NULL, '2025-05-02 07:04:32', '2025-05-02 07:04:32', NULL, 'RPJMD', '2025', 'RPJMD'),
(52, 'BIDANG DISTRIBUSI', NULL, '2025-05-02 07:04:32', '2025-05-02 07:04:32', NULL, 'RPJMD', '2025', 'RPJMD'),
(53, 'BIDANG KONSUMSI', NULL, '2025-05-02 07:04:32', '2025-05-02 07:04:32', NULL, 'RPJMD', '2025', 'RPJMD'),
(54, 'BIDANG KERAWANAN', NULL, '2025-05-02 07:04:32', '2025-05-02 07:04:32', NULL, 'RPJMD', '2025', 'RPJMD'),
(55, 'BALAI PENGAWAS', NULL, '2025-05-02 07:04:32', '2025-05-02 07:04:32', NULL, 'RPJMD', '2025', 'RPJMD'),
(56, 'SEKRETARIAT', NULL, '2025-05-02 07:32:35', '2025-05-02 07:32:35', NULL, 'RPJMD', '2025', 'RPJMD'),
(57, 'BIDANG DISTRIBUSI', NULL, '2025-05-02 07:32:35', '2025-05-02 07:32:35', NULL, 'RPJMD', '2025', 'RPJMD'),
(58, 'BIDANG KONSUMSI', NULL, '2025-05-02 07:32:35', '2025-05-02 07:32:35', NULL, 'RPJMD', '2025', 'RPJMD'),
(59, 'BIDANG KERAWANAN', NULL, '2025-05-02 07:32:35', '2025-05-02 07:32:35', NULL, 'RPJMD', '2025', 'RPJMD'),
(60, 'BALAI PENGAWAS', NULL, '2025-05-02 07:32:35', '2025-05-02 07:32:35', NULL, 'RPJMD', '2025', 'RPJMD'),
(61, 'SEKRETARIAT', NULL, '2025-05-02 07:43:35', '2025-05-02 07:43:35', NULL, 'RPJMD', '2025', 'RPJMD'),
(62, 'BIDANG DISTRIBUSI', NULL, '2025-05-02 07:43:35', '2025-05-02 07:43:35', NULL, 'RPJMD', '2025', 'RPJMD'),
(63, 'BIDANG KONSUMSI', NULL, '2025-05-02 07:43:35', '2025-05-02 07:43:35', NULL, 'RPJMD', '2025', 'RPJMD'),
(64, 'BIDANG KERAWANAN', NULL, '2025-05-02 07:43:35', '2025-05-02 07:43:35', NULL, 'RPJMD', '2025', 'RPJMD'),
(65, 'BALAI PENGAWAS', NULL, '2025-05-02 07:43:35', '2025-05-02 07:43:35', NULL, 'RPJMD', '2025', 'RPJMD'),
(66, 'SEKRETARIAT', NULL, '2025-05-02 07:44:26', '2025-05-02 07:44:26', NULL, 'RPJMD', '2025', 'RPJMD'),
(67, 'BIDANG DISTRIBUSI', NULL, '2025-05-02 07:44:26', '2025-05-02 07:44:26', NULL, 'RPJMD', '2025', 'RPJMD'),
(68, 'BIDANG KONSUMSI', NULL, '2025-05-02 07:44:26', '2025-05-02 07:44:26', NULL, 'RPJMD', '2025', 'RPJMD'),
(69, 'BIDANG KERAWANAN', NULL, '2025-05-02 07:44:26', '2025-05-02 07:44:26', NULL, 'RPJMD', '2025', 'RPJMD'),
(70, 'BALAI PENGAWAS', NULL, '2025-05-02 07:44:26', '2025-05-02 07:44:26', NULL, 'RPJMD', '2025', 'RPJMD'),
(71, 'SEKRETARIAT', NULL, '2025-05-21 08:49:34', '2025-05-21 08:49:34', NULL, 'RPJMD', '2025', 'RPJMD'),
(72, 'BIDANG DISTRIBUSI', NULL, '2025-05-21 08:49:34', '2025-05-21 08:49:34', NULL, 'RPJMD', '2025', 'RPJMD'),
(73, 'BIDANG KONSUMSI', NULL, '2025-05-21 08:49:34', '2025-05-21 08:49:34', NULL, 'RPJMD', '2025', 'RPJMD'),
(74, 'BIDANG KERAWANAN', NULL, '2025-05-21 08:49:34', '2025-05-21 08:49:34', NULL, 'RPJMD', '2025', 'RPJMD'),
(75, 'BALAI PENGAWAS', NULL, '2025-05-21 08:49:34', '2025-05-21 08:49:34', NULL, 'RPJMD', '2025', 'RPJMD'),
(76, 'SEKRETARIAT', NULL, '2025-05-21 08:57:03', '2025-05-21 08:57:03', NULL, 'RPJMD', '2025', 'RPJMD'),
(77, 'BIDANG DISTRIBUSI', NULL, '2025-05-21 08:57:03', '2025-05-21 08:57:03', NULL, 'RPJMD', '2025', 'RPJMD'),
(78, 'BIDANG KONSUMSI', NULL, '2025-05-21 08:57:03', '2025-05-21 08:57:03', NULL, 'RPJMD', '2025', 'RPJMD'),
(79, 'BIDANG KERAWANAN', NULL, '2025-05-21 08:57:03', '2025-05-21 08:57:03', NULL, 'RPJMD', '2025', 'RPJMD'),
(80, 'BALAI PENGAWAS', NULL, '2025-05-21 08:57:03', '2025-05-21 08:57:03', NULL, 'RPJMD', '2025', 'RPJMD'),
(81, 'SEKRETARIAT', NULL, '2025-06-06 09:55:31', '2025-06-06 09:55:31', NULL, 'RPJMD', '2025', 'RPJMD'),
(82, 'BIDANG DISTRIBUSI', NULL, '2025-06-06 09:55:31', '2025-06-06 09:55:31', NULL, 'RPJMD', '2025', 'RPJMD'),
(83, 'BIDANG KONSUMSI', NULL, '2025-06-06 09:55:31', '2025-06-06 09:55:31', NULL, 'RPJMD', '2025', 'RPJMD'),
(84, 'BIDANG KERAWANAN', NULL, '2025-06-06 09:55:31', '2025-06-06 09:55:31', NULL, 'RPJMD', '2025', 'RPJMD'),
(85, 'BALAI PENGAWAS', NULL, '2025-06-06 09:55:31', '2025-06-06 09:55:31', NULL, 'RPJMD', '2025', 'RPJMD'),
(86, 'SEKRETARIAT', NULL, '2025-06-30 12:17:59', '2025-06-30 12:17:59', NULL, 'RPJMD', '2025', 'RPJMD'),
(87, 'BIDANG DISTRIBUSI', NULL, '2025-06-30 12:17:59', '2025-06-30 12:17:59', NULL, 'RPJMD', '2025', 'RPJMD'),
(88, 'BIDANG KONSUMSI', NULL, '2025-06-30 12:17:59', '2025-06-30 12:17:59', NULL, 'RPJMD', '2025', 'RPJMD'),
(89, 'BIDANG KERAWANAN', NULL, '2025-06-30 12:17:59', '2025-06-30 12:17:59', NULL, 'RPJMD', '2025', 'RPJMD'),
(90, 'BALAI PENGAWAS', NULL, '2025-06-30 12:17:59', '2025-06-30 12:17:59', NULL, 'RPJMD', '2025', 'RPJMD');

-- --------------------------------------------------------

--
-- Struktur dari tabel `dpa`
--

CREATE TABLE `dpa` (
  `id` int NOT NULL,
  `tahun` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `periode_id` int NOT NULL,
  `program` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `kegiatan` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `sub_kegiatan` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `indikator` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `target` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `anggaran` double DEFAULT NULL,
  `jenis_dokumen` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `rka_id` int DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Struktur dari tabel `evaluasi`
--

CREATE TABLE `evaluasi` (
  `id` int NOT NULL,
  `indikator_id` int NOT NULL,
  `realisasi_id` int DEFAULT NULL,
  `tanggal_evaluasi` date DEFAULT NULL,
  `target` float DEFAULT NULL,
  `realisasi` float DEFAULT NULL,
  `status` varchar(50) DEFAULT NULL,
  `catatan` text,
  `rekomendasi` text,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `jenis_dokumen` varchar(255) DEFAULT NULL,
  `tahun` varchar(255) NOT NULL DEFAULT '2025',
  `jenisDokumen` varchar(255) NOT NULL DEFAULT 'RPJMD'
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

-- --------------------------------------------------------

--
-- Struktur dari tabel `evaluasi_rpjmd`
--

CREATE TABLE `evaluasi_rpjmd` (
  `id` int NOT NULL,
  `indikator_id` int NOT NULL,
  `tahun` int NOT NULL,
  `capaian` float NOT NULL,
  `status` varchar(255) NOT NULL,
  `rekomendasi` text,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `jenisDokumen` varchar(255) NOT NULL DEFAULT 'RPJMD'
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

-- --------------------------------------------------------

--
-- Struktur dari tabel `export_laporan`
--

CREATE TABLE `export_laporan` (
  `id` int NOT NULL,
  `jenis_laporan` varchar(255) NOT NULL,
  `tahun` int NOT NULL,
  `file_path` varchar(255) NOT NULL,
  `format` varchar(255) NOT NULL,
  `generated_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

-- --------------------------------------------------------

--
-- Struktur dari tabel `indikator`
--

CREATE TABLE `indikator` (
  `id` int NOT NULL,
  `sasaran_id` int DEFAULT NULL,
  `nama_indikator` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `satuan` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `rpjmd_id` int DEFAULT NULL,
  `tujuan_id` int DEFAULT NULL,
  `misi_id` int NOT NULL,
  `kode_indikator` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `definisi_operasional` mediumtext COLLATE utf8mb4_unicode_ci,
  `metode_penghitungan` mediumtext COLLATE utf8mb4_unicode_ci,
  `baseline` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `sumber_data` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `penanggung_jawab` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `keterangan` mediumtext COLLATE utf8mb4_unicode_ci,
  `target_tahun_1` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `target_tahun_2` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `target_tahun_3` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `target_tahun_4` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `target_tahun_5` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `jenis_indikator` enum('kuantitatif','kualitatif') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `tipe_indikator` enum('Impact','Outcome','Output','Proses') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `kriteria_kuantitatif` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `kriteria_kualitatif` mediumtext COLLATE utf8mb4_unicode_ci,
  `program_id` int UNSIGNED DEFAULT NULL,
  `kegiatan_id` int DEFAULT NULL,
  `stage` enum('misi','tujuan','sasaran','program','kegiatan') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'misi',
  `jenis_dokumen` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'RPJMD',
  `tahun` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '2025',
  `level_dokumen` enum('RPJMD','RENSTRA','RKPD','RENJA','RKA','LAKIP') COLLATE utf8mb4_unicode_ci DEFAULT 'RPJMD',
  `jenis_iku` enum('IKU','IKP','IKSK') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `capaian_tahun_1` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `capaian_tahun_2` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `capaian_tahun_3` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `capaian_tahun_4` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `capaian_tahun_5` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `periode_id` int DEFAULT NULL,
  `jenisDokumen` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'RPJMD'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Struktur dari tabel `indikatorkegiatans`
--

CREATE TABLE `indikatorkegiatans` (
  `id` int UNSIGNED NOT NULL,
  `kode_indikator` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `nama_indikator` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `tipe_indikator` enum('Proses') COLLATE utf8mb4_unicode_ci NOT NULL,
  `jenis` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `tolok_ukur_kinerja` text COLLATE utf8mb4_unicode_ci,
  `target_kinerja` text COLLATE utf8mb4_unicode_ci,
  `jenis_indikator` enum('Kuantitatif','Kualitatif') COLLATE utf8mb4_unicode_ci NOT NULL,
  `kriteria_kuantitatif` text COLLATE utf8mb4_unicode_ci,
  `kriteria_kualitatif` text COLLATE utf8mb4_unicode_ci,
  `satuan` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `definisi_operasional` text COLLATE utf8mb4_unicode_ci,
  `metode_penghitungan` text COLLATE utf8mb4_unicode_ci,
  `baseline` text COLLATE utf8mb4_unicode_ci,
  `target_tahun_1` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `target_tahun_2` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `target_tahun_3` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `target_tahun_4` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `target_tahun_5` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `sumber_data` text COLLATE utf8mb4_unicode_ci,
  `penanggung_jawab` int DEFAULT NULL,
  `keterangan` text COLLATE utf8mb4_unicode_ci,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `program_id` int UNSIGNED DEFAULT NULL,
  `jenis_dokumen` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'RPJMD',
  `tahun` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '2025',
  `rekomendasi_ai` text COLLATE utf8mb4_unicode_ci,
  `indikator_program_id` int UNSIGNED DEFAULT NULL,
  `capaian_tahun_1` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `capaian_tahun_2` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `capaian_tahun_3` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `capaian_tahun_4` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `capaian_tahun_5` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `misi_id` int UNSIGNED DEFAULT NULL,
  `tujuan_id` int UNSIGNED DEFAULT NULL,
  `sasaran_id` int UNSIGNED DEFAULT NULL,
  `rkpd_id` int DEFAULT NULL,
  `periode_id` int DEFAULT NULL,
  `prioritas_nasional_id` bigint UNSIGNED DEFAULT NULL,
  `prioritas_daerah_id` bigint UNSIGNED DEFAULT NULL,
  `prioritas_gubernur_id` bigint UNSIGNED DEFAULT NULL,
  `jenisDokumen` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'RPJMD'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data untuk tabel `indikatorkegiatans`
--

INSERT INTO `indikatorkegiatans` (`id`, `kode_indikator`, `nama_indikator`, `tipe_indikator`, `jenis`, `tolok_ukur_kinerja`, `target_kinerja`, `jenis_indikator`, `kriteria_kuantitatif`, `kriteria_kualitatif`, `satuan`, `definisi_operasional`, `metode_penghitungan`, `baseline`, `target_tahun_1`, `target_tahun_2`, `target_tahun_3`, `target_tahun_4`, `target_tahun_5`, `sumber_data`, `penanggung_jawab`, `keterangan`, `created_at`, `updated_at`, `program_id`, `jenis_dokumen`, `tahun`, `rekomendasi_ai`, `indikator_program_id`, `capaian_tahun_1`, `capaian_tahun_2`, `capaian_tahun_3`, `capaian_tahun_4`, `capaian_tahun_5`, `misi_id`, `tujuan_id`, `sasaran_id`, `rkpd_id`, `periode_id`, `prioritas_nasional_id`, `prioritas_daerah_id`, `prioritas_gubernur_id`, `jenisDokumen`) VALUES
(1, '1.02.03.2.01-01', 'Persentase ketersediaan sarana, prasarana, dan alat kesehatan pada fasilitas kesehatan rujukan provinsi', 'Proses', 'Meningkatnya akses dan mutu layanan kesehatan rujukan', 'Persentase fasilitas kesehatan rujukan provinsi yang dilengkapi sarana prasarana sesuai standar', '100% fasilitas rujukan provinsi memiliki sarpras dan alat kesehatan sesuai standar pada akhir periode', 'Kuantitatif', 'Persentase (%)', NULL, 'Persen (%)', 'Rasio antara jumlah fasilitas kesehatan rujukan yang memiliki sarana, prasarana dan alat kesehatan sesuai standar dengan jumlah total fasilitas rujukan provinsi', '( \nTotal Fasyankes rujukan provinsi\nFasyankes standar\n​\n )×100%', '95.00', '75.00', '85.00', '90.00', '95.00', '100.00', 'Dinas Kesehatan Provinsi, Kemenkes, RS Online', 180, 'Indikator ini mengukur persentase fasilitas kesehatan rujukan provinsi yang dilengkapi sarana prasarana sesuai standar, dengan target kinerja sebesar 100% fasilitas rujukan provinsi memiliki sarpras dan alat kesehatan sesuai standar pada akhir periode. Definisi operasional: \"Rasio antara jumlah fasilitas kesehatan rujukan yang memiliki sarana, prasarana dan alat kesehatan sesuai standar dengan jumlah total fasilitas rujukan provinsi\". Metode: ( \ntotal fasyankes rujukan provinsi\nfasyankes standar\n​\n )×100%, baseline: 95. Target meningkat sebesar 5.', '2025-08-08 04:44:50', '2025-08-08 04:44:50', NULL, 'RPJMD', '2025', 'Berdasarkan indikator yang telah disebutkan, terlihat bahwa target kinerja untuk persentase ketersediaan sarana, prasarana, dan alat kesehatan pada fasilitas kesehatan rujukan provinsi memiliki tren yang naik dari 75.00 hingga 100.00. Meskipun baseline sudah cukup tinggi yaitu sebesar 95, namun masih terdapat ruang untuk peningkatan menuju target akhir.\n\nRekomendasi kebijakan yang dapat diambil adalah meningkatkan monitoring dan evaluasi terhadap fasilitas kesehatan rujukan provinsi untuk memastikan bahwa sarana, prasarana, dan alat kesehatan sesuai standar. Selain itu, perlu adanya kerjasama antara pihak terkait untuk memastikan bahwa fasilitas tersebut terus ditingkatkan dan dipertahankan.\n\nPertimbangan terhadap penanggung jawab juga perlu diperhatikan, dimana perlu adanya koordinasi yang baik antara pihak terkait seperti Dinas Kesehatan, rumah sakit, dan pihak swasta dalam memastikan bahwa target kinerja dapat tercapai. Penanggung jawab juga perlu melakukan monitoring secara berkala dan melakukan tindakan perbaikan jika ditemukan ketidaksesuaian dengan standar yang telah ditetapkan.\n\nDengan demikian, dengan implementasi kebijakan yang tepat dan perhatian yang lebih terhadap indikator tersebut, diharapkan persentase ketersediaan sarana, prasarana, dan alat kesehatan pada fasilitas kesehatan rujukan provinsi dapat terus meningkat menuju target akhir yang telah ditetapkan.', 1, '70.00', '80.00', '85.00', '90.00', '95.00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'RPJMD');

-- --------------------------------------------------------

--
-- Struktur dari tabel `indikatormisis`
--

CREATE TABLE `indikatormisis` (
  `id` int NOT NULL,
  `no_misi` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `isi_misi` text COLLATE utf8mb4_unicode_ci,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  `jenis_dokumen` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `tahun` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '2025',
  `jenisDokumen` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'RPJMD'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Struktur dari tabel `indikatorprograms`
--

CREATE TABLE `indikatorprograms` (
  `id` int UNSIGNED NOT NULL,
  `kode_indikator` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `nama_indikator` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `tipe_indikator` enum('Output') COLLATE utf8mb4_unicode_ci NOT NULL,
  `jenis` text COLLATE utf8mb4_unicode_ci,
  `tolok_ukur_kinerja` text COLLATE utf8mb4_unicode_ci,
  `target_kinerja` text COLLATE utf8mb4_unicode_ci,
  `jenis_indikator` enum('Kuantitatif','Kualitatif') COLLATE utf8mb4_unicode_ci NOT NULL,
  `kriteria_kuantitatif` text COLLATE utf8mb4_unicode_ci,
  `kriteria_kualitatif` text COLLATE utf8mb4_unicode_ci,
  `satuan` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `definisi_operasional` text COLLATE utf8mb4_unicode_ci,
  `metode_penghitungan` text COLLATE utf8mb4_unicode_ci,
  `baseline` text COLLATE utf8mb4_unicode_ci,
  `target_tahun_1` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `target_tahun_2` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `target_tahun_3` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `target_tahun_4` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `target_tahun_5` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `sumber_data` text COLLATE utf8mb4_unicode_ci,
  `penanggung_jawab` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `keterangan` text COLLATE utf8mb4_unicode_ci,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `sasaran_id` int DEFAULT NULL,
  `jenis_dokumen` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'RPJMD',
  `tahun` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '2025',
  `rekomendasi_ai` text COLLATE utf8mb4_unicode_ci,
  `capaian_tahun_1` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `capaian_tahun_2` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `capaian_tahun_3` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `capaian_tahun_4` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `capaian_tahun_5` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `program_id` int UNSIGNED DEFAULT NULL,
  `rkpd_id` int DEFAULT NULL,
  `periode_id` int DEFAULT NULL,
  `jenisDokumen` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'RPJMD'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data untuk tabel `indikatorprograms`
--

INSERT INTO `indikatorprograms` (`id`, `kode_indikator`, `nama_indikator`, `tipe_indikator`, `jenis`, `tolok_ukur_kinerja`, `target_kinerja`, `jenis_indikator`, `kriteria_kuantitatif`, `kriteria_kualitatif`, `satuan`, `definisi_operasional`, `metode_penghitungan`, `baseline`, `target_tahun_1`, `target_tahun_2`, `target_tahun_3`, `target_tahun_4`, `target_tahun_5`, `sumber_data`, `penanggung_jawab`, `keterangan`, `created_at`, `updated_at`, `sasaran_id`, `jenis_dokumen`, `tahun`, `rekomendasi_ai`, `capaian_tahun_1`, `capaian_tahun_2`, `capaian_tahun_3`, `capaian_tahun_4`, `capaian_tahun_5`, `program_id`, `rkpd_id`, `periode_id`, `jenisDokumen`) VALUES
(1, 'IP-1.02.02.-01', 'Angka Kematian Ibu', 'Output', 'Meningkatnya kualitas kesehatan perorangan dan masyarakat', 'Jumlah kematian ibu per 100.000 kelahiran hidup', 'Penurunan AKI menuju target ≤ 183/100.000 KH pada akhir periode', 'Kuantitatif', 'Nilai numerik dengan satuan per 100.000 KH', '', 'Per 100.000 KH', 'Jumlah kematian ibu selama kehamilan, persalinan, dan dalam masa 42 hari setelah berakhirnya kehamilan per 100.000 kelahiran hidup', 'AKI=( \nJumlah kelahiran hidup\nJumlah kematian ibu\n​\n )×100.000', '183.00', '220.00', '210.00', '200.00', '190.00', '183.00', 'Dinas Kesehatan Provinsi, SIRS, BPS, Kemenkes (RS Online)', '120', 'Indikator ini mengukur jumlah kematian ibu per 100.000 kelahiran hidup, dengan target kinerja sebesar Penurunan AKI menuju target ≤ 183/100.000 KH pada akhir periode. Definisi operasional: \"Jumlah kematian ibu selama kehamilan, persalinan, dan dalam masa 42 hari setelah berakhirnya kehamilan per 100.000 kelahiran hidup\". Metode: aki=( \njumlah kelahiran hidup\njumlah kematian ibu\n​\n )×100.000, baseline: 213. Perbedaan target tidak dapat dihitung karena format non-numerik.', '2025-08-08 04:33:24', '2025-08-08 04:33:24', 1, 'RPJMD', '2025', 'Berdasarkan data indikator Angka Kematian Ibu, terdapat tren penurunan target dari 220.00 pada tahun pertama hingga 183.00 pada tahun terakhir periode RPJMD. Hal ini menunjukkan adanya upaya yang telah dilakukan untuk mengurangi angka kematian ibu. Meskipun demikian, baseline sebesar 213 menunjukkan bahwa masih terdapat ruang untuk perbaikan lebih lanjut.\n\nSebagai rekomendasi kebijakan, diperlukan langkah-langkah yang lebih proaktif dalam meningkatkan akses terhadap layanan kesehatan ibu dan kehamilan. Penguatan sistem kesehatan, peningkatan kualitas layanan, serta edukasi masyarakat tentang pentingnya perawatan kesehatan ibu dapat menjadi strategi yang efektif. Selain itu, monitoring dan evaluasi secara berkala perlu dilakukan untuk memastikan implementasi kebijakan yang tepat.\n\nDalam hal ini, penanggung jawab perlu terlibat secara aktif dalam perumusan dan implementasi kebijakan yang berkaitan dengan penurunan Angka Kematian Ibu. Kolaborasi antar instansi terkait juga penting untuk memastikan keberlanjutan program-program kesehatan ibu. Dengan demikian, diharapkan dapat tercapai target akhir yang telah ditetapkan dalam RPJMD.', '225.00', '210.00', '211.00', '212.00', '213.00', NULL, NULL, NULL, 'RPJMD'),
(2, 'IP-1.02.03.-01', 'Angka Kematian Bayi', 'Output', 'Meningkatnya kualitas kesehatan perorangan dan masyarakat', 'Jumlah kematian ibu per 100.000 kelahiran hidup', 'Penurunan AKI menuju target ≤ 183/100.000 KH pada akhir periode', 'Kuantitatif', 'Nilai numerik dengan satuan per 100.000 KH', '', 'Per 100.000 KH', 'Jumlah kematian ibu selama kehamilan, persalinan, dan dalam masa 42 hari setelah berakhirnya kehamilan per 100.000 kelahiran hidup', 'AKI=( \nJumlah kelahiran hidup\nJumlah kematian ibu\n​\n )×100.000', '183.00', '220.00', '210.00', '200.00', '190.00', '183.00', 'Dinas Kesehatan Provinsi, SIRS, BPS, Kemenkes (RS Online)', '120', 'Indikator ini mengukur jumlah kematian ibu per 100.000 kelahiran hidup, dengan target kinerja sebesar Penurunan AKI menuju target ≤ 183/100.000 KH pada akhir periode. Definisi operasional: \"Jumlah kematian ibu selama kehamilan, persalinan, dan dalam masa 42 hari setelah berakhirnya kehamilan per 100.000 kelahiran hidup\". Metode: aki=( \njumlah kelahiran hidup\njumlah kematian ibu\n​\n )×100.000, baseline: 205. Perbedaan target tidak dapat dihitung karena format non-numerik.', '2025-08-08 04:42:35', '2025-08-08 04:42:35', 1, 'RPJMD', '2025', 'Dalam analisis indikator Angka Kematian Bayi, terdapat tren yang menunjukkan penurunan target dari 220.00 menjadi 183.00 pada akhir periode. Hal ini menandakan upaya yang perlu terus dilakukan untuk menurunkan angka kematian bayi. Baseline sebesar 205 menjadi relevan untuk memantau perubahan yang terjadi selama periode perencanaan.\n\nRekomendasi kebijakan yang dapat diambil adalah meningkatkan akses dan kualitas layanan kesehatan ibu dan anak, melakukan edukasi kepada masyarakat tentang pentingnya perawatan kesehatan selama kehamilan, serta melakukan monitoring dan evaluasi secara berkala terhadap program-program kesehatan ibu dan anak.\n\nDalam hal ini, penanggung jawab yang bertanggung jawab terhadap indikator ini perlu terlibat aktif dalam mengkoordinasikan program-program yang telah direncanakan serta melakukan pemantauan secara berkala terhadap capaian target yang telah ditetapkan. Dengan demikian, diharapkan dapat tercapai penurunan angka kematian bayi sesuai dengan target yang telah ditetapkan.', '225.00', '210.00', '209.00', '208.00', '205.00', NULL, NULL, NULL, 'RPJMD');

-- --------------------------------------------------------

--
-- Struktur dari tabel `indikatorsasarans`
--

CREATE TABLE `indikatorsasarans` (
  `id` int UNSIGNED NOT NULL,
  `indikator_id` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `sasaran_id` int UNSIGNED NOT NULL,
  `kode_indikator` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `nama_indikator` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `tipe_indikator` enum('Outcome') COLLATE utf8mb4_unicode_ci NOT NULL,
  `jenis` text COLLATE utf8mb4_unicode_ci,
  `tolok_ukur_kinerja` text COLLATE utf8mb4_unicode_ci,
  `target_kinerja` text COLLATE utf8mb4_unicode_ci,
  `jenis_indikator` enum('Kuantitatif','Kualitatif') COLLATE utf8mb4_unicode_ci NOT NULL,
  `kriteria_kuantitatif` text COLLATE utf8mb4_unicode_ci,
  `kriteria_kualitatif` text COLLATE utf8mb4_unicode_ci,
  `satuan` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `definisi_operasional` text COLLATE utf8mb4_unicode_ci,
  `metode_penghitungan` text COLLATE utf8mb4_unicode_ci,
  `baseline` text COLLATE utf8mb4_unicode_ci,
  `target_tahun_1` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `target_tahun_2` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `target_tahun_3` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `target_tahun_4` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `target_tahun_5` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `sumber_data` text COLLATE utf8mb4_unicode_ci,
  `penanggung_jawab` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `keterangan` text COLLATE utf8mb4_unicode_ci,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `tujuan_id` int DEFAULT NULL,
  `jenis_dokumen` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'RPJMD',
  `tahun` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '2025',
  `rekomendasi_ai` text COLLATE utf8mb4_unicode_ci,
  `capaian_tahun_1` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `capaian_tahun_2` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `capaian_tahun_3` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `capaian_tahun_4` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `capaian_tahun_5` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `rkpd_id` int DEFAULT NULL,
  `periode_id` int DEFAULT NULL,
  `jenisDokumen` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'RPJMD'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data untuk tabel `indikatorsasarans`
--

INSERT INTO `indikatorsasarans` (`id`, `indikator_id`, `sasaran_id`, `kode_indikator`, `nama_indikator`, `tipe_indikator`, `jenis`, `tolok_ukur_kinerja`, `target_kinerja`, `jenis_indikator`, `kriteria_kuantitatif`, `kriteria_kualitatif`, `satuan`, `definisi_operasional`, `metode_penghitungan`, `baseline`, `target_tahun_1`, `target_tahun_2`, `target_tahun_3`, `target_tahun_4`, `target_tahun_5`, `sumber_data`, `penanggung_jawab`, `keterangan`, `created_at`, `updated_at`, `tujuan_id`, `jenis_dokumen`, `tahun`, `rekomendasi_ai`, `capaian_tahun_1`, `capaian_tahun_2`, `capaian_tahun_3`, `capaian_tahun_4`, `capaian_tahun_5`, `rkpd_id`, `periode_id`, `jenisDokumen`) VALUES
(1, 'w7foGkUwKwWK_hfJDuTiD', 1, 'ST1-01-01-01', 'Usia Harapan Hidup', 'Outcome', 'Meningkatnya derajat kesehatan dan kualitas hidup penduduk', 'Rata-rata usia yang diharapkan dapat dicapai oleh seseorang sejak lahir', 'Usia harapan hidup ≥ 73,8 tahun pada akhir periode RPJMD', 'Kuantitatif', 'Dihitung dalam satuan tahun  Nilai meningkat menunjukkan keberhasilan intervensi kesehatan', '', 'Tahun', 'Usia harapan hidup adalah rata-rata perkiraan jumlah tahun hidup yang tersisa yang diharapkan dapat dijalani seseorang sejak lahir, dengan asumsi pola mortalitas tetap', 'Perhitungan berdasarkan tabel kehidupan (life table) dari data mortalitas penduduk yang dihimpun melalui Sensus/Susenas/SDKI oleh BPS', '70.92', '71.40', '71.79', '72.52', '73.16', '73.80', 'BPS, Dinas Kesehatan Provinsi, Kementerian Kesehatan (SDKI, Sensus)', '120', '', '2025-08-08 04:30:48', '2025-08-08 04:30:48', 1, 'RPJMD', '2025', 'Indikator usia harapan hidup menunjukkan tren kenaikan yang positif dari baseline sebesar 70,92 menuju target-target yang lebih tinggi. Hal ini menunjukkan adanya peningkatan kualitas hidup masyarakat dan kesehatan secara umum. Baseline yang relevan menunjukkan kondisi awal yang dapat dijadikan acuan untuk mengukur pencapaian target-target yang lebih tinggi.\n\nUntuk mempertahankan tren positif ini, diperlukan kebijakan yang memperkuat sistem kesehatan, meningkatkan aksesibilitas layanan kesehatan, dan meningkatkan kesadaran masyarakat akan pentingnya pola hidup sehat. Penanggung jawab diharapkan dapat bekerja sama dengan pihak terkait untuk mengimplementasikan kebijakan-kebijakan yang mendukung peningkatan usia harapan hidup ini, serta melakukan monitoring dan evaluasi secara berkala untuk memastikan pencapaian target-target yang telah ditetapkan.\n\nPertimbangan terhadap penanggung jawab adalah pentingnya koordinasi dan sinergi antara berbagai pihak terkait, serta keterlibatan aktif dalam proses perencanaan, pelaksanaan, dan evaluasi kebijakan. Dengan demikian, diharapkan usia harapan hidup dapat terus meningkat sesuai dengan target yang telah ditetapkan dalam RPJMD.', '70.15', '70.89', '70.90', '70.91', '70.92', NULL, 2, 'RPJMD'),
(2, 'yvpidupgImuBIAeUxdFE8', 1, 'ST1-01-01-02', 'Angka Kematian Bayi', 'Outcome', 'Meningkatnya derajat kesehatan dan kualitas hidup penduduk', 'Rata-rata usia yang diharapkan dapat dicapai oleh seseorang sejak lahir', 'Usia harapan hidup ≥ 73,8 tahun pada akhir periode RPJMD', 'Kuantitatif', 'Dihitung dalam satuan tahun  Nilai meningkat menunjukkan keberhasilan intervensi kesehatan', '', 'Tahun', 'Usia harapan hidup adalah rata-rata perkiraan jumlah tahun hidup yang tersisa yang diharapkan dapat dijalani seseorang sejak lahir, dengan asumsi pola mortalitas tetap', 'Perhitungan berdasarkan tabel kehidupan (life table) dari data mortalitas penduduk yang dihimpun melalui Sensus/Susenas/SDKI oleh BPS', '70.92', '71.40', '71.79', '72.52', '73.16', '73.80', 'BPS, Dinas Kesehatan Provinsi, Kementerian Kesehatan (SDKI, Sensus)', '120', '', '2025-08-08 04:40:12', '2025-08-08 04:40:12', 1, 'RPJMD', '2025', 'Dalam melihat indikator Angka Kematian Bayi yang memiliki target yang meningkat dari 71.40 hingga 73.80, terlihat bahwa terdapat tren kenaikan yang perlu diperhatikan dengan serius. Meskipun baseline saat ini adalah 70.92, namun dengan adanya peningkatan target yang signifikan, perlu adanya langkah-langkah yang tepat untuk mencapainya.\n\nSebagai rekomendasi kebijakan, pemerintah perlu meningkatkan akses dan kualitas pelayanan kesehatan ibu dan bayi, serta melakukan edukasi kepada masyarakat mengenai pentingnya perawatan kesehatan selama kehamilan dan pasca persalinan. Program-program kesehatan masyarakat yang terfokus pada penurunan angka kematian bayi juga perlu ditingkatkan, seperti program imunisasi dan pemantauan kesehatan bayi secara berkala.\n\nDalam hal ini, penanggung jawab dari indikator ini perlu memastikan koordinasi yang baik antara berbagai lembaga terkait, seperti Dinas Kesehatan, Puskesmas, dan rumah sakit, serta melakukan monitoring dan evaluasi secara berkala terhadap implementasi kebijakan yang telah diambil. Dengan adanya kerjasama yang baik dan pemantauan yang rutin, diharapkan angka kematian bayi dapat terus menurun sesuai dengan target yang telah ditetapkan.', '70.15', '70.89', '70.90', '70.91', '70.92', NULL, 2, 'RPJMD'),
(3, 'w7foGkUwKwWK_hfJDuTiD', 1, 'ST1-01-01-01', 'Usia Harapan Hidup', 'Outcome', 'Meningkatnya derajat kesehatan dan kualitas hidup penduduk', 'Rata-rata usia yang diharapkan dapat dicapai oleh seseorang sejak lahir', 'Usia harapan hidup ≥ 73,8 tahun pada akhir periode RPJMD', 'Kuantitatif', 'Dihitung dalam satuan tahun  Nilai meningkat menunjukkan keberhasilan intervensi kesehatan', '', 'Tahun', 'Usia harapan hidup adalah rata-rata perkiraan jumlah tahun hidup yang tersisa yang diharapkan dapat dijalani seseorang sejak lahir, dengan asumsi pola mortalitas tetap', 'Perhitungan berdasarkan tabel kehidupan (life table) dari data mortalitas penduduk yang dihimpun melalui Sensus/Susenas/SDKI oleh BPS', '70.92', '71.40', '71.79', '72.52', '73.16', '73.80', 'BPS, Dinas Kesehatan Provinsi, Kementerian Kesehatan (SDKI, Sensus)', '120', '', '2025-08-08 14:46:52', '2025-08-08 14:46:52', 1, 'rkpd', '2025', 'Indikator usia harapan hidup menunjukkan tren kenaikan yang positif dari baseline sebesar 70,92 menuju target-target yang lebih tinggi. Hal ini menunjukkan adanya peningkatan kualitas hidup masyarakat dan kesehatan secara umum. Baseline yang relevan menunjukkan kondisi awal yang dapat dijadikan acuan untuk mengukur pencapaian target-target yang lebih tinggi.\n\nUntuk mempertahankan tren positif ini, diperlukan kebijakan yang memperkuat sistem kesehatan, meningkatkan aksesibilitas layanan kesehatan, dan meningkatkan kesadaran masyarakat akan pentingnya pola hidup sehat. Penanggung jawab diharapkan dapat bekerja sama dengan pihak terkait untuk mengimplementasikan kebijakan-kebijakan yang mendukung peningkatan usia harapan hidup ini, serta melakukan monitoring dan evaluasi secara berkala untuk memastikan pencapaian target-target yang telah ditetapkan.\n\nPertimbangan terhadap penanggung jawab adalah pentingnya koordinasi dan sinergi antara berbagai pihak terkait, serta keterlibatan aktif dalam proses perencanaan, pelaksanaan, dan evaluasi kebijakan. Dengan demikian, diharapkan usia harapan hidup dapat terus meningkat sesuai dengan target yang telah ditetapkan dalam RPJMD.', '70.15', '70.89', '70.90', '70.91', '70.92', NULL, 2, 'RPJMD'),
(4, 'yvpidupgImuBIAeUxdFE8', 1, 'ST1-01-01-02', 'Angka Kematian Bayi', 'Outcome', 'Meningkatnya derajat kesehatan dan kualitas hidup penduduk', 'Rata-rata usia yang diharapkan dapat dicapai oleh seseorang sejak lahir', 'Usia harapan hidup ≥ 73,8 tahun pada akhir periode RPJMD', 'Kuantitatif', 'Dihitung dalam satuan tahun  Nilai meningkat menunjukkan keberhasilan intervensi kesehatan', '', 'Tahun', 'Usia harapan hidup adalah rata-rata perkiraan jumlah tahun hidup yang tersisa yang diharapkan dapat dijalani seseorang sejak lahir, dengan asumsi pola mortalitas tetap', 'Perhitungan berdasarkan tabel kehidupan (life table) dari data mortalitas penduduk yang dihimpun melalui Sensus/Susenas/SDKI oleh BPS', '70.92', '71.40', '71.79', '72.52', '73.16', '73.80', 'BPS, Dinas Kesehatan Provinsi, Kementerian Kesehatan (SDKI, Sensus)', '120', '', '2025-08-08 14:46:52', '2025-08-08 14:46:52', 1, 'rkpd', '2025', 'Dalam melihat indikator Angka Kematian Bayi yang memiliki target yang meningkat dari 71.40 hingga 73.80, terlihat bahwa terdapat tren kenaikan yang perlu diperhatikan dengan serius. Meskipun baseline saat ini adalah 70.92, namun dengan adanya peningkatan target yang signifikan, perlu adanya langkah-langkah yang tepat untuk mencapainya.\n\nSebagai rekomendasi kebijakan, pemerintah perlu meningkatkan akses dan kualitas pelayanan kesehatan ibu dan bayi, serta melakukan edukasi kepada masyarakat mengenai pentingnya perawatan kesehatan selama kehamilan dan pasca persalinan. Program-program kesehatan masyarakat yang terfokus pada penurunan angka kematian bayi juga perlu ditingkatkan, seperti program imunisasi dan pemantauan kesehatan bayi secara berkala.\n\nDalam hal ini, penanggung jawab dari indikator ini perlu memastikan koordinasi yang baik antara berbagai lembaga terkait, seperti Dinas Kesehatan, Puskesmas, dan rumah sakit, serta melakukan monitoring dan evaluasi secara berkala terhadap implementasi kebijakan yang telah diambil. Dengan adanya kerjasama yang baik dan pemantauan yang rutin, diharapkan angka kematian bayi dapat terus menurun sesuai dengan target yang telah ditetapkan.', '70.15', '70.89', '70.90', '70.91', '70.92', NULL, 2, 'RPJMD'),
(8, 'w7foGkUwKwWK_hfJDuTiD', 1, 'ST1-01-01-01', 'Usia Harapan Hidup', 'Outcome', 'Meningkatnya derajat kesehatan dan kualitas hidup penduduk', 'Rata-rata usia yang diharapkan dapat dicapai oleh seseorang sejak lahir', 'Usia harapan hidup ≥ 73,8 tahun pada akhir periode RPJMD', 'Kuantitatif', 'Dihitung dalam satuan tahun  Nilai meningkat menunjukkan keberhasilan intervensi kesehatan', '', 'Tahun', 'Usia harapan hidup adalah rata-rata perkiraan jumlah tahun hidup yang tersisa yang diharapkan dapat dijalani seseorang sejak lahir, dengan asumsi pola mortalitas tetap', 'Perhitungan berdasarkan tabel kehidupan (life table) dari data mortalitas penduduk yang dihimpun melalui Sensus/Susenas/SDKI oleh BPS', '70.92', '71.40', '71.79', '72.52', '73.16', '73.80', 'BPS, Dinas Kesehatan Provinsi, Kementerian Kesehatan (SDKI, Sensus)', '120', '', '2025-08-15 00:53:21', '2025-08-15 00:53:21', 1, 'renstra', '2025', 'Indikator usia harapan hidup menunjukkan tren kenaikan yang positif dari baseline sebesar 70,92 menuju target-target yang lebih tinggi. Hal ini menunjukkan adanya peningkatan kualitas hidup masyarakat dan kesehatan secara umum. Baseline yang relevan menunjukkan kondisi awal yang dapat dijadikan acuan untuk mengukur pencapaian target-target yang lebih tinggi.\n\nUntuk mempertahankan tren positif ini, diperlukan kebijakan yang memperkuat sistem kesehatan, meningkatkan aksesibilitas layanan kesehatan, dan meningkatkan kesadaran masyarakat akan pentingnya pola hidup sehat. Penanggung jawab diharapkan dapat bekerja sama dengan pihak terkait untuk mengimplementasikan kebijakan-kebijakan yang mendukung peningkatan usia harapan hidup ini, serta melakukan monitoring dan evaluasi secara berkala untuk memastikan pencapaian target-target yang telah ditetapkan.\n\nPertimbangan terhadap penanggung jawab adalah pentingnya koordinasi dan sinergi antara berbagai pihak terkait, serta keterlibatan aktif dalam proses perencanaan, pelaksanaan, dan evaluasi kebijakan. Dengan demikian, diharapkan usia harapan hidup dapat terus meningkat sesuai dengan target yang telah ditetapkan dalam RPJMD.', '70.15', '70.89', '70.90', '70.91', '70.92', NULL, 2, 'RPJMD'),
(9, 'yvpidupgImuBIAeUxdFE8', 1, 'ST1-01-01-02', 'Angka Kematian Bayi', 'Outcome', 'Meningkatnya derajat kesehatan dan kualitas hidup penduduk', 'Rata-rata usia yang diharapkan dapat dicapai oleh seseorang sejak lahir', 'Usia harapan hidup ≥ 73,8 tahun pada akhir periode RPJMD', 'Kuantitatif', 'Dihitung dalam satuan tahun  Nilai meningkat menunjukkan keberhasilan intervensi kesehatan', '', 'Tahun', 'Usia harapan hidup adalah rata-rata perkiraan jumlah tahun hidup yang tersisa yang diharapkan dapat dijalani seseorang sejak lahir, dengan asumsi pola mortalitas tetap', 'Perhitungan berdasarkan tabel kehidupan (life table) dari data mortalitas penduduk yang dihimpun melalui Sensus/Susenas/SDKI oleh BPS', '70.92', '71.40', '71.79', '72.52', '73.16', '73.80', 'BPS, Dinas Kesehatan Provinsi, Kementerian Kesehatan (SDKI, Sensus)', '120', '', '2025-08-15 00:53:21', '2025-08-15 00:53:21', 1, 'renstra', '2025', 'Dalam melihat indikator Angka Kematian Bayi yang memiliki target yang meningkat dari 71.40 hingga 73.80, terlihat bahwa terdapat tren kenaikan yang perlu diperhatikan dengan serius. Meskipun baseline saat ini adalah 70.92, namun dengan adanya peningkatan target yang signifikan, perlu adanya langkah-langkah yang tepat untuk mencapainya.\n\nSebagai rekomendasi kebijakan, pemerintah perlu meningkatkan akses dan kualitas pelayanan kesehatan ibu dan bayi, serta melakukan edukasi kepada masyarakat mengenai pentingnya perawatan kesehatan selama kehamilan dan pasca persalinan. Program-program kesehatan masyarakat yang terfokus pada penurunan angka kematian bayi juga perlu ditingkatkan, seperti program imunisasi dan pemantauan kesehatan bayi secara berkala.\n\nDalam hal ini, penanggung jawab dari indikator ini perlu memastikan koordinasi yang baik antara berbagai lembaga terkait, seperti Dinas Kesehatan, Puskesmas, dan rumah sakit, serta melakukan monitoring dan evaluasi secara berkala terhadap implementasi kebijakan yang telah diambil. Dengan adanya kerjasama yang baik dan pemantauan yang rutin, diharapkan angka kematian bayi dapat terus menurun sesuai dengan target yang telah ditetapkan.', '70.15', '70.89', '70.90', '70.91', '70.92', NULL, 2, 'RPJMD');

-- --------------------------------------------------------

--
-- Struktur dari tabel `indikatortujuans`
--

CREATE TABLE `indikatortujuans` (
  `id` int NOT NULL,
  `kode_indikator` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `nama_indikator` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `tipe_indikator` enum('Impact') COLLATE utf8mb4_unicode_ci NOT NULL,
  `jenis_indikator` enum('Kuantitatif','Kualitatif') COLLATE utf8mb4_unicode_ci NOT NULL,
  `jenis` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `tolok_ukur_kinerja` text COLLATE utf8mb4_unicode_ci,
  `target_kinerja` text COLLATE utf8mb4_unicode_ci,
  `kriteria_kuantitatif` text COLLATE utf8mb4_unicode_ci,
  `kriteria_kualitatif` text COLLATE utf8mb4_unicode_ci,
  `definisi_operasional` text COLLATE utf8mb4_unicode_ci,
  `metode_penghitungan` text COLLATE utf8mb4_unicode_ci,
  `baseline` text COLLATE utf8mb4_unicode_ci,
  `target_tahun_1` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `target_tahun_2` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `target_tahun_3` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `target_tahun_4` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `target_tahun_5` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `sumber_data` text COLLATE utf8mb4_unicode_ci,
  `penanggung_jawab` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `keterangan` text COLLATE utf8mb4_unicode_ci,
  `rekomendasi_ai` text COLLATE utf8mb4_unicode_ci,
  `misi_id` int DEFAULT NULL,
  `tujuan_id` int DEFAULT NULL,
  `jenis_dokumen` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'RPJMD',
  `tahun` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '2025',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `capaian_tahun_1` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `capaian_tahun_2` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `capaian_tahun_3` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `capaian_tahun_4` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `capaian_tahun_5` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `rkpd_id` int DEFAULT NULL,
  `periode_id` int DEFAULT NULL,
  `satuan` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `jenisDokumen` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'RPJMD'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data untuk tabel `indikatortujuans`
--

INSERT INTO `indikatortujuans` (`id`, `kode_indikator`, `nama_indikator`, `tipe_indikator`, `jenis_indikator`, `jenis`, `tolok_ukur_kinerja`, `target_kinerja`, `kriteria_kuantitatif`, `kriteria_kualitatif`, `definisi_operasional`, `metode_penghitungan`, `baseline`, `target_tahun_1`, `target_tahun_2`, `target_tahun_3`, `target_tahun_4`, `target_tahun_5`, `sumber_data`, `penanggung_jawab`, `keterangan`, `rekomendasi_ai`, `misi_id`, `tujuan_id`, `jenis_dokumen`, `tahun`, `created_at`, `updated_at`, `capaian_tahun_1`, `capaian_tahun_2`, `capaian_tahun_3`, `capaian_tahun_4`, `capaian_tahun_5`, `rkpd_id`, `periode_id`, `satuan`, `jenisDokumen`) VALUES
(1, 'T1-01-01', 'Indeks Modal Manusia', 'Impact', 'Kuantitatif', 'Tingkat pembangunan kualitas sumber daya manusia yang mendukung pertumbuhan ekonomi jangka panjang', 'Nilai Indeks Modal Manusia (0–1 skala World Bank)', 'Peningkatan nilai Indeks Modal Manusia hingga mencapai ≥0,500 pada akhir periode RPJMD', 'Rentang nilai HCI antara 0 (terendah) sampai 1 (tertinggi)  Kenaikan tiap tahun menunjukkan peningkatan kualitas SDM', '', 'Indeks Modal Manusia (HCI) mengukur kontribusi kesehatan dan pendidikan terhadap produktivitas ekonomi masa depan dari anak-anak yang lahir hari ini.', 'Pengukuran HCI dilakukan dengan metode komposit berdasarkan empat komponen utama: (1) angka harapan lama sekolah, (2) hasil belajar (learning-adjusted years of schooling), (3) kelangsungan hidup anak, dan (4) status gizi anak (stunting).', '0.48', '0.48', '0.49', '0.49', '0.50', '0.50', 'World Bank, Bappenas, BPS, Kementerian Kesehatan, Kementerian Pendidikan dan Kebudayaan', '230', 'Indikator ini mengukur nilai indeks modal manusia (0–1 skala world bank), dengan target kinerja sebesar Peningkatan nilai Indeks Modal Manusia hingga mencapai ≥0,500 pada akhir periode RPJMD. Definisi operasional: \"Indeks Modal Manusia (HCI) mengukur kontribusi kesehatan dan pendidikan terhadap produktivitas ekonomi masa depan dari anak-anak yang lahir hari ini.\". Metode: pengukuran hci dilakukan dengan metode komposit berdasarkan empat komponen utama: (1) angka harapan lama sekolah, (2) hasil belajar (learning-adjusted years of schooling), (3) kelangsungan hidup anak, dan (4) status gizi anak (stunting)., baseline: 0,481. Perbedaan target tidak dapat dihitung karena format non-numerik.', 'Berdasarkan indikator Indeks Modal Manusia dengan baseline 0,481 dan target kinerja peningkatan nilai hingga mencapai ≥0,500 pada akhir periode RPJMD, terlihat bahwa tren target indikator ini naik dari tahun ke tahun. Meskipun target yang ditetapkan memiliki selisih yang sangat kecil, namun peningkatan nilai indeks modal manusia merupakan hal yang penting untuk meningkatkan produktivitas ekonomi di masa depan.\n\nRelevansi baseline yang ada menunjukkan bahwa masih terdapat ruang untuk peningkatan yang signifikan. Oleh karena itu, rekomendasi kebijakan yang dapat diambil adalah dengan meningkatkan akses dan kualitas pendidikan serta kesehatan masyarakat. Hal ini dapat dilakukan melalui program-program yang mendukung peningkatan angka harapan lama sekolah, hasil belajar, kelangsungan hidup anak, dan status gizi anak.\n\nPertimbangan terhadap penanggung jawab juga perlu diperhatikan dalam implementasi kebijakan yang diambil. Penanggung jawab yang memiliki tanggung jawab terhadap Indeks Modal Manusia perlu memastikan adanya koordinasi yang baik antar berbagai pihak terkait, melibatkan stakeholder secara aktif, serta melakukan pemantauan dan evaluasi secara berkala terhadap capaian target yang telah ditetapkan.\n\nDengan demikian, dengan upaya yang terkoordinasi dan berkelanjutan, diharapkan dapat tercapai peningkatan nilai Indeks Modal Manusia yang berdampak positif pada produktivitas ekonomi dan kesejahteraan masyarakat secara keseluruhan.', 1, 1, 'RPJMD', '2025', '2025-08-08 04:26:23', '2025-08-08 04:26:23', '0.47', '0.48', '0.48', '0.48', '0.48', NULL, 2, NULL, 'RPJMD'),
(2, 'T1-01-01', 'Indeks Modal Manusia', 'Impact', 'Kuantitatif', 'Tingkat pembangunan kualitas sumber daya manusia yang mendukung pertumbuhan ekonomi jangka panjang', 'Nilai Indeks Modal Manusia (0–1 skala World Bank)', 'Peningkatan nilai Indeks Modal Manusia hingga mencapai ≥0,500 pada akhir periode RPJMD', 'Rentang nilai HCI antara 0 (terendah) sampai 1 (tertinggi)  Kenaikan tiap tahun menunjukkan peningkatan kualitas SDM', '', 'Indeks Modal Manusia (HCI) mengukur kontribusi kesehatan dan pendidikan terhadap produktivitas ekonomi masa depan dari anak-anak yang lahir hari ini.', 'Pengukuran HCI dilakukan dengan metode komposit berdasarkan empat komponen utama: (1) angka harapan lama sekolah, (2) hasil belajar (learning-adjusted years of schooling), (3) kelangsungan hidup anak, dan (4) status gizi anak (stunting).', '0.48', '0.48', '0.49', '0.49', '0.50', '0.50', 'World Bank, Bappenas, BPS, Kementerian Kesehatan, Kementerian Pendidikan dan Kebudayaan', '230', 'Indikator ini mengukur nilai indeks modal manusia (0–1 skala world bank), dengan target kinerja sebesar Peningkatan nilai Indeks Modal Manusia hingga mencapai ≥0,500 pada akhir periode RPJMD. Definisi operasional: \"Indeks Modal Manusia (HCI) mengukur kontribusi kesehatan dan pendidikan terhadap produktivitas ekonomi masa depan dari anak-anak yang lahir hari ini.\". Metode: pengukuran hci dilakukan dengan metode komposit berdasarkan empat komponen utama: (1) angka harapan lama sekolah, (2) hasil belajar (learning-adjusted years of schooling), (3) kelangsungan hidup anak, dan (4) status gizi anak (stunting)., baseline: 0,481. Perbedaan target tidak dapat dihitung karena format non-numerik.', 'Berdasarkan indikator Indeks Modal Manusia dengan baseline 0,481 dan target kinerja peningkatan nilai hingga mencapai ≥0,500 pada akhir periode RPJMD, terlihat bahwa tren target indikator ini naik dari tahun ke tahun. Meskipun target yang ditetapkan memiliki selisih yang sangat kecil, namun peningkatan nilai indeks modal manusia merupakan hal yang penting untuk meningkatkan produktivitas ekonomi di masa depan.\n\nRelevansi baseline yang ada menunjukkan bahwa masih terdapat ruang untuk peningkatan yang signifikan. Oleh karena itu, rekomendasi kebijakan yang dapat diambil adalah dengan meningkatkan akses dan kualitas pendidikan serta kesehatan masyarakat. Hal ini dapat dilakukan melalui program-program yang mendukung peningkatan angka harapan lama sekolah, hasil belajar, kelangsungan hidup anak, dan status gizi anak.\n\nPertimbangan terhadap penanggung jawab juga perlu diperhatikan dalam implementasi kebijakan yang diambil. Penanggung jawab yang memiliki tanggung jawab terhadap Indeks Modal Manusia perlu memastikan adanya koordinasi yang baik antar berbagai pihak terkait, melibatkan stakeholder secara aktif, serta melakukan pemantauan dan evaluasi secara berkala terhadap capaian target yang telah ditetapkan.\n\nDengan demikian, dengan upaya yang terkoordinasi dan berkelanjutan, diharapkan dapat tercapai peningkatan nilai Indeks Modal Manusia yang berdampak positif pada produktivitas ekonomi dan kesejahteraan masyarakat secara keseluruhan.', 1, 1, 'rkpd', '2025', '2025-08-08 14:46:52', '2025-08-08 14:46:52', '0.47', '0.48', '0.48', '0.48', '0.48', NULL, 2, NULL, 'RPJMD'),
(5, 'T1-01-01', 'Indeks Modal Manusia', 'Impact', 'Kuantitatif', 'Tingkat pembangunan kualitas sumber daya manusia yang mendukung pertumbuhan ekonomi jangka panjang', 'Nilai Indeks Modal Manusia (0–1 skala World Bank)', 'Peningkatan nilai Indeks Modal Manusia hingga mencapai ≥0,500 pada akhir periode RPJMD', 'Rentang nilai HCI antara 0 (terendah) sampai 1 (tertinggi)  Kenaikan tiap tahun menunjukkan peningkatan kualitas SDM', '', 'Indeks Modal Manusia (HCI) mengukur kontribusi kesehatan dan pendidikan terhadap produktivitas ekonomi masa depan dari anak-anak yang lahir hari ini.', 'Pengukuran HCI dilakukan dengan metode komposit berdasarkan empat komponen utama: (1) angka harapan lama sekolah, (2) hasil belajar (learning-adjusted years of schooling), (3) kelangsungan hidup anak, dan (4) status gizi anak (stunting).', '0.48', '0.48', '0.49', '0.49', '0.50', '0.50', 'World Bank, Bappenas, BPS, Kementerian Kesehatan, Kementerian Pendidikan dan Kebudayaan', '230', 'Indikator ini mengukur nilai indeks modal manusia (0–1 skala world bank), dengan target kinerja sebesar Peningkatan nilai Indeks Modal Manusia hingga mencapai ≥0,500 pada akhir periode RPJMD. Definisi operasional: \"Indeks Modal Manusia (HCI) mengukur kontribusi kesehatan dan pendidikan terhadap produktivitas ekonomi masa depan dari anak-anak yang lahir hari ini.\". Metode: pengukuran hci dilakukan dengan metode komposit berdasarkan empat komponen utama: (1) angka harapan lama sekolah, (2) hasil belajar (learning-adjusted years of schooling), (3) kelangsungan hidup anak, dan (4) status gizi anak (stunting)., baseline: 0,481. Perbedaan target tidak dapat dihitung karena format non-numerik.', 'Berdasarkan indikator Indeks Modal Manusia dengan baseline 0,481 dan target kinerja peningkatan nilai hingga mencapai ≥0,500 pada akhir periode RPJMD, terlihat bahwa tren target indikator ini naik dari tahun ke tahun. Meskipun target yang ditetapkan memiliki selisih yang sangat kecil, namun peningkatan nilai indeks modal manusia merupakan hal yang penting untuk meningkatkan produktivitas ekonomi di masa depan.\n\nRelevansi baseline yang ada menunjukkan bahwa masih terdapat ruang untuk peningkatan yang signifikan. Oleh karena itu, rekomendasi kebijakan yang dapat diambil adalah dengan meningkatkan akses dan kualitas pendidikan serta kesehatan masyarakat. Hal ini dapat dilakukan melalui program-program yang mendukung peningkatan angka harapan lama sekolah, hasil belajar, kelangsungan hidup anak, dan status gizi anak.\n\nPertimbangan terhadap penanggung jawab juga perlu diperhatikan dalam implementasi kebijakan yang diambil. Penanggung jawab yang memiliki tanggung jawab terhadap Indeks Modal Manusia perlu memastikan adanya koordinasi yang baik antar berbagai pihak terkait, melibatkan stakeholder secara aktif, serta melakukan pemantauan dan evaluasi secara berkala terhadap capaian target yang telah ditetapkan.\n\nDengan demikian, dengan upaya yang terkoordinasi dan berkelanjutan, diharapkan dapat tercapai peningkatan nilai Indeks Modal Manusia yang berdampak positif pada produktivitas ekonomi dan kesejahteraan masyarakat secara keseluruhan.', 1, 1, 'renstra', '2025', '2025-08-15 00:53:21', '2025-08-15 00:53:21', '0.47', '0.48', '0.48', '0.48', '0.48', NULL, 2, NULL, 'RPJMD');

-- --------------------------------------------------------

--
-- Struktur dari tabel `indikator_detail`
--

CREATE TABLE `indikator_detail` (
  `id` int NOT NULL,
  `indikator_id` int NOT NULL,
  `jenis` enum('Impact','Outcome','Output','Process') COLLATE utf8mb4_unicode_ci NOT NULL,
  `tolok_ukur` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `target_kinerja` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `jenis_dokumen` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `tahun` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '2025',
  `jenisDokumen` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'RPJMD'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Struktur dari tabel `indikator_renstra`
--

CREATE TABLE `indikator_renstra` (
  `id` int NOT NULL,
  `ref_id` int NOT NULL,
  `stage` enum('tujuan','sasaran','strategi','kebijakan','program','kegiatan','sub_kegiatan') COLLATE utf8mb4_unicode_ci NOT NULL,
  `kode_indikator` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `nama_indikator` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `satuan` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `definisi_operasional` text COLLATE utf8mb4_unicode_ci,
  `metode_penghitungan` text COLLATE utf8mb4_unicode_ci,
  `baseline` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `target_tahun_1` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `target_tahun_2` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `target_tahun_3` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `target_tahun_4` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `target_tahun_5` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `jenis_indikator` enum('Kuantitatif','Kualitatif') COLLATE utf8mb4_unicode_ci NOT NULL,
  `tipe_indikator` enum('Impact','Outcome','Output','Proses') COLLATE utf8mb4_unicode_ci NOT NULL,
  `kriteria_kuantitatif` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `kriteria_kualitatif` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `sumber_data` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `penanggung_jawab` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `keterangan` text COLLATE utf8mb4_unicode_ci,
  `tahun` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `jenis_dokumen` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  `renstra_id` int DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data untuk tabel `indikator_renstra`
--

INSERT INTO `indikator_renstra` (`id`, `ref_id`, `stage`, `kode_indikator`, `nama_indikator`, `satuan`, `definisi_operasional`, `metode_penghitungan`, `baseline`, `target_tahun_1`, `target_tahun_2`, `target_tahun_3`, `target_tahun_4`, `target_tahun_5`, `jenis_indikator`, `tipe_indikator`, `kriteria_kuantitatif`, `kriteria_kualitatif`, `sumber_data`, `penanggung_jawab`, `keterangan`, `tahun`, `jenis_dokumen`, `created_at`, `updated_at`, `renstra_id`) VALUES
(1, 1, 'tujuan', 'T1-01-01', 'Indeks Modal Manusia', 'Poin', 'Indeks Modal Manusia (HCI) mengukur kontribusi kesehatan dan pendidikan terhadap produktivitas ekonomi masa depan dari anak-anak yang lahir hari ini.', 'Pengukuran HCI dilakukan dengan metode komposit berdasarkan empat komponen utama: (1) angka harapan lama sekolah, (2) hasil belajar (learning-adjusted years of schooling), (3) kelangsungan hidup anak, dan (4) status gizi anak (stunting).', '0.48', '0.48', '0.49', '0.49', '0.50', '0.50', 'Kuantitatif', 'Impact', 'Rentang nilai HCI antara 0 (terendah) sampai 1 (tertinggi)  Kenaikan tiap tahun menunjukkan peningkatan kualitas SDM', '', 'World Bank, Bappenas, BPS, Kementerian Kesehatan, Kementerian Pendidikan dan Kebudayaan', '230', 'Indikator ini mengukur nilai indeks modal manusia (0–1 skala world bank), dengan target kinerja sebesar Peningkatan nilai Indeks Modal Manusia hingga mencapai ≥0,500 pada akhir periode RPJMD. Definisi operasional: \"Indeks Modal Manusia (HCI) mengukur kontribusi kesehatan dan pendidikan terhadap produktivitas ekonomi masa depan dari anak-anak yang lahir hari ini.\". Metode: pengukuran hci dilakukan dengan metode komposit berdasarkan empat komponen utama: (1) angka harapan lama sekolah, (2) hasil belajar (learning-adjusted years of schooling), (3) kelangsungan hidup anak, dan (4) status gizi anak (stunting)., baseline: 0,481. Perbedaan target tidak dapat dihitung karena format non-numerik.', '2025', 'renstra', '2025-08-24 16:33:51', '2025-08-24 16:33:51', 1),
(5, 1, 'sasaran', 'ST1-01-01-01', 'Usia Harapan Hidup', 'Tahun', 'Usia harapan hidup adalah rata-rata perkiraan jumlah tahun hidup yang tersisa yang diharapkan dapat dijalani seseorang sejak lahir, dengan asumsi pola mortalitas tetap', 'Perhitungan berdasarkan tabel kehidupan (life table) dari data mortalitas penduduk yang dihimpun melalui Sensus/Susenas/SDKI oleh BPS', '70.92', '71.40', '71.79', '72.52', '73.16', '73.80', 'Kuantitatif', 'Outcome', 'Dihitung dalam satuan tahun  Nilai meningkat menunjukkan keberhasilan intervensi kesehatan', '', 'BPS, Dinas Kesehatan Provinsi, Kementerian Kesehatan (SDKI, Sensus)', '120', '', '2025', 'renstra', '2025-08-24 16:52:38', '2025-08-24 16:52:38', 1),
(6, 2, 'sasaran', 'ST1-01-01-02', 'Angka Kematian Bayi', 'Tahun', 'Usia harapan hidup adalah rata-rata perkiraan jumlah tahun hidup yang tersisa yang diharapkan dapat dijalani seseorang sejak lahir, dengan asumsi pola mortalitas tetap', 'Perhitungan berdasarkan tabel kehidupan (life table) dari data mortalitas penduduk yang dihimpun melalui Sensus/Susenas/SDKI oleh BPS', '70.92', '71.40', '71.79', '72.52', '73.16', '73.80', 'Kuantitatif', 'Outcome', 'Dihitung dalam satuan tahun  Nilai meningkat menunjukkan keberhasilan intervensi kesehatan', '', 'BPS, Dinas Kesehatan Provinsi, Kementerian Kesehatan (SDKI, Sensus)', '120', '', '2025', 'renstra', '2025-08-24 16:52:38', '2025-08-24 16:52:38', 1),
(7, 1, 'program', 'IP-1.02.02.-01', 'Angka Kematian Ibu', 'Per 100.000 KH', 'Jumlah kematian ibu selama kehamilan, persalinan, dan dalam masa 42 hari setelah berakhirnya kehamilan per 100.000 kelahiran hidup', 'AKI=( \nJumlah kelahiran hidup\nJumlah kematian ibu\n​\n )×100.000', '183.00', '220.00', '210.00', '200.00', '190.00', '183.00', 'Kuantitatif', 'Output', 'Nilai numerik dengan satuan per 100.000 KH', '', 'Dinas Kesehatan Provinsi, SIRS, BPS, Kemenkes (RS Online)', '120', 'Indikator ini mengukur jumlah kematian ibu per 100.000 kelahiran hidup, dengan target kinerja sebesar Penurunan AKI menuju target ≤ 183/100.000 KH pada akhir periode. Definisi operasional: \"Jumlah kematian ibu selama kehamilan, persalinan, dan dalam masa 42 hari setelah berakhirnya kehamilan per 100.000 kelahiran hidup\". Metode: aki=( \njumlah kelahiran hidup\njumlah kematian ibu\n​\n )×100.000, baseline: 213. Perbedaan target tidak dapat dihitung karena format non-numerik.', '2025', 'renstra', '2025-08-24 16:52:52', '2025-08-24 16:52:52', 1),
(8, 2, 'program', 'IP-1.02.03.-01', 'Angka Kematian Bayi', 'Per 100.000 KH', 'Jumlah kematian ibu selama kehamilan, persalinan, dan dalam masa 42 hari setelah berakhirnya kehamilan per 100.000 kelahiran hidup', 'AKI=( \nJumlah kelahiran hidup\nJumlah kematian ibu\n​\n )×100.000', '183.00', '220.00', '210.00', '200.00', '190.00', '183.00', 'Kuantitatif', 'Output', 'Nilai numerik dengan satuan per 100.000 KH', '', 'Dinas Kesehatan Provinsi, SIRS, BPS, Kemenkes (RS Online)', '120', 'Indikator ini mengukur jumlah kematian ibu per 100.000 kelahiran hidup, dengan target kinerja sebesar Penurunan AKI menuju target ≤ 183/100.000 KH pada akhir periode. Definisi operasional: \"Jumlah kematian ibu selama kehamilan, persalinan, dan dalam masa 42 hari setelah berakhirnya kehamilan per 100.000 kelahiran hidup\". Metode: aki=( \njumlah kelahiran hidup\njumlah kematian ibu\n​\n )×100.000, baseline: 205. Perbedaan target tidak dapat dihitung karena format non-numerik.', '2025', 'renstra', '2025-08-24 16:52:52', '2025-08-24 16:52:52', 1),
(9, 1, 'kegiatan', '1.02.03.2.01-01', 'Persentase ketersediaan sarana prasarana, dan alat kesehatan pada fasilitas kesehatan rujukan provinsi', 'Persen (%)', 'Rasio antara jumlah fasilitas kesehatan rujukan yang memiliki sarana, prasarana dan alat kesehatan sesuai standar dengan jumlah total fasilitas rujukan provinsi', '( \nTotal Fasyankes rujukan provinsi\nFasyankes standar\n​\n )×100%', '95.00', '75.00', '85.00', '90.00', '95.00', '100.00', 'Kuantitatif', 'Proses', 'Persentase (%)', NULL, 'Dinas Kesehatan Provinsi, Kemenkes, RS Online', '180', 'Indikator ini mengukur persentase fasilitas kesehatan rujukan provinsi yang dilengkapi sarana prasarana sesuai standar, dengan target kinerja sebesar 100% fasilitas rujukan provinsi memiliki sarpras dan alat kesehatan sesuai standar pada akhir periode. Definisi operasional: \"Rasio antara jumlah fasilitas kesehatan rujukan yang memiliki sarana, prasarana dan alat kesehatan sesuai standar dengan jumlah total fasilitas rujukan provinsi\". Metode: ( \ntotal fasyankes rujukan provinsi\nfasyankes standar\n​\n )×100%, baseline: 95. Target meningkat sebesar 5.', '2025', 'renstra', '2025-08-24 16:52:56', '2025-08-24 17:12:32', 1);

-- --------------------------------------------------------

--
-- Struktur dari tabel `kebijakan_opd`
--

CREATE TABLE `kebijakan_opd` (
  `id` int NOT NULL,
  `strategi_id` int NOT NULL,
  `rpjmd_arah_id` int DEFAULT NULL,
  `kode_arah` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `deskripsi` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `prioritas` enum('Tinggi','Sedang','Rendah') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `no_rpjmd` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `isi_arah_rpjmd` text COLLATE utf8mb4_unicode_ci,
  `jenisDokumen` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'RPJMD',
  `tahun` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '2025'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Struktur dari tabel `kegiatan`
--

CREATE TABLE `kegiatan` (
  `id` int NOT NULL,
  `program_id` int UNSIGNED DEFAULT NULL,
  `nama_kegiatan` varchar(255) NOT NULL,
  `kode_kegiatan` varchar(50) NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `jenis_dokumen` varchar(255) NOT NULL DEFAULT 'RPJMD',
  `tahun` varchar(255) NOT NULL DEFAULT '2025',
  `periode_id` int DEFAULT NULL,
  `opd_penanggung_jawab` int DEFAULT NULL,
  `bidang_opd_penanggung_jawab` varchar(255) DEFAULT NULL,
  `pagu_anggaran` bigint UNSIGNED DEFAULT '0',
  `total_pagu_anggaran` bigint DEFAULT '0',
  `jenisDokumen` varchar(255) NOT NULL DEFAULT 'RPJMD'
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

--
-- Dumping data untuk tabel `kegiatan`
--

INSERT INTO `kegiatan` (`id`, `program_id`, `nama_kegiatan`, `kode_kegiatan`, `created_at`, `updated_at`, `jenis_dokumen`, `tahun`, `periode_id`, `opd_penanggung_jawab`, `bidang_opd_penanggung_jawab`, `pagu_anggaran`, `total_pagu_anggaran`, `jenisDokumen`) VALUES
(1, 9, 'Pengelolaan Layanan Kesehatan Untuk Semua', '1.01.01.1.01', '2025-08-13 12:31:19', '2025-08-13 12:36:28', 'RPJMD', '2025', 2, 118, 'Bidang Kesehatan Pelayanan', 0, 2500000, 'RPJMD'),
(2, 10, 'Peningkatan Pendidikan Yang Berkualitas Semua Jenjang', '1.01.02.1.01', '2025-08-13 12:32:32', '2025-08-13 12:37:47', 'RPJMD', '2025', 2, 113, 'Bidang Pendidikan Pelayanan', 0, 25000000, 'RPJMD');

-- --------------------------------------------------------

--
-- Struktur dari tabel `kegiatan_opd`
--

CREATE TABLE `kegiatan_opd` (
  `id` int NOT NULL,
  `program_id` int NOT NULL,
  `kode_kegiatan` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `nama_kegiatan` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `bidang_opd` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Struktur dari tabel `kegiatan_skpd`
--

CREATE TABLE `kegiatan_skpd` (
  `id` int NOT NULL,
  `program_skpd_id` int UNSIGNED DEFAULT NULL,
  `nama_kegiatan` varchar(255) NOT NULL,
  `deskripsi` text,
  `lokasi` varchar(255) DEFAULT NULL,
  `waktu_mulai` date DEFAULT NULL,
  `waktu_selesai` date DEFAULT NULL,
  `status` varchar(50) DEFAULT NULL,
  `bidang` varchar(255) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

-- --------------------------------------------------------

--
-- Struktur dari tabel `lakip`
--

CREATE TABLE `lakip` (
  `id` int NOT NULL,
  `tahun` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `periode_id` int NOT NULL,
  `program` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `kegiatan` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `indikator_kinerja` text COLLATE utf8mb4_unicode_ci,
  `target` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `realisasi` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `evaluasi` text COLLATE utf8mb4_unicode_ci,
  `rekomendasi` text COLLATE utf8mb4_unicode_ci,
  `jenis_dokumen` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `renstra_id` int DEFAULT NULL,
  `rkpd_id` int DEFAULT NULL,
  `renja_id` int DEFAULT NULL,
  `lk_dispang_id` int DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Struktur dari tabel `lk_dispang`
--

CREATE TABLE `lk_dispang` (
  `id` int NOT NULL,
  `tahun` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `periode_id` int NOT NULL,
  `program` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `kegiatan` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `sub_kegiatan` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `akun_belanja` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `jenis_belanja` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `anggaran` double DEFAULT NULL,
  `realisasi` double DEFAULT NULL,
  `sisa` double DEFAULT NULL,
  `persen_realisasi` double DEFAULT NULL,
  `sumber_dana` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `jenis_dokumen` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `dpa_id` int DEFAULT NULL,
  `penatausahaan_id` int DEFAULT NULL,
  `bmd_id` int DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Struktur dari tabel `lpk_dispang`
--

CREATE TABLE `lpk_dispang` (
  `id` int NOT NULL,
  `tahun` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `periode_id` int NOT NULL,
  `kegiatan` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `pelaksana` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `capaian` text COLLATE utf8mb4_unicode_ci,
  `kendala` text COLLATE utf8mb4_unicode_ci,
  `rekomendasi` text COLLATE utf8mb4_unicode_ci,
  `jenis_dokumen` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `monev_id` int DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Struktur dari tabel `misi`
--

CREATE TABLE `misi` (
  `id` int NOT NULL,
  `visi_id` int NOT NULL,
  `isi_misi` text NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `rpjmd_id` int DEFAULT NULL,
  `no_misi` int NOT NULL,
  `deskripsi` text,
  `jenis_dokumen` varchar(255) DEFAULT NULL,
  `tahun` varchar(255) DEFAULT NULL,
  `periode_id` int DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

--
-- Dumping data untuk tabel `misi`
--

INSERT INTO `misi` (`id`, `visi_id`, `isi_misi`, `created_at`, `updated_at`, `rpjmd_id`, `no_misi`, `deskripsi`, `jenis_dokumen`, `tahun`, `periode_id`) VALUES
(1, 1, 'Mewujudkan Transformasi Sosial Melalui Peningkatan Sumber Daya Manusia yang Berkualitas, Unggul, dan Berdaya Saing', '2025-08-02 18:27:35', '2025-08-02 18:27:35', 2, 1, 'Fokus pada pengembangan pendidikan, keterampilan, dan kualitas hidup masyarakat agar mampu bersaing di tingkat lokal, nasional, dan global.', 'rpjmd', '2025', 1),
(2, 1, 'Mewujudkan Kemandirian Ekonomi yang Berkelanjutan dengan Meningkatkan Produktivitas dan Nilai Tambah melalui Pengembangan dan Hilirisasi Sektor Unggulan dan Ekonomi Kreatif', '2025-08-02 18:31:18', '2025-08-02 18:31:18', 2, 2, 'Mendorong pertumbuhan ekonomi dengan memaksimalkan potensi lokal, mendorong inovasi, dan mengembangkan industri kreatif untuk menciptakan nilai tambah dan lapangan kerja.', 'rpjmd', '2025', 1),
(3, 1, 'Mewujudkan Transformasi Tata Kelola Pemerintahan yang Inklusif dan Adaptif Berorientasi pada Kebutuhan Masyarakat', '2025-08-02 18:32:01', '2025-08-02 18:32:01', 2, 3, 'Meningkatkan kualitas pelayanan publik dengan sistem pemerintahan yang terbuka, partisipatif, dan responsif terhadap perubahan serta kebutuhan masyarakat.', 'rpjmd', '2025', 1),
(4, 1, 'Mewujudkan Prinsip Demokrasi, Stabilitas Keamanan, dan Stabilitas Ekonomi', '2025-08-02 18:33:06', '2025-08-02 18:33:06', 2, 4, 'Menjaga iklim politik yang sehat dan aman, mendukung kehidupan demokrasi, serta menciptakan kondisi ekonomi yang stabil dan kondusif bagi pembangunan.', 'rpjmd', '2025', 1),
(5, 1, 'Mewujudkan Ketahanan Sosial Budaya dan Ekologi Berbasis Kearifan Lokal dalam Tatanan Masyarakat yang Aman, Nyaman dalam Harmoni Sosial untuk Pembangunan yang Berkelanjutan', '2025-08-02 18:33:46', '2025-08-02 18:33:46', 2, 5, 'Melestarikan nilai-nilai budaya dan lingkungan hidup dengan memanfaatkan kearifan lokal sebagai dasar pembangunan yang ramah lingkungan dan inklusif.', 'rpjmd', '2025', 1),
(6, 1, 'Mewujudkan Pengembangan Wilayah Berbasis Kepulauan melalui Penguatan Infrastruktur dan Sarana Prasarana yang Berkualitas dan Berkeadilan', '2025-08-02 18:34:11', '2025-08-02 18:34:11', 2, 6, 'Mendorong pemerataan pembangunan antarwilayah, terutama wilayah kepulauan, dengan peningkatan aksesibilitas dan infrastruktur yang mendukung konektivitas dan pertumbuhan ekonomi.', 'rpjmd', '2025', 1);

-- --------------------------------------------------------

--
-- Struktur dari tabel `monev`
--

CREATE TABLE `monev` (
  `id` int NOT NULL,
  `tahun` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `periode_id` int NOT NULL,
  `kegiatan` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `lokasi` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `capaian_kinerja` text COLLATE utf8mb4_unicode_ci,
  `kendala` text COLLATE utf8mb4_unicode_ci,
  `tindak_lanjut` text COLLATE utf8mb4_unicode_ci,
  `jenis_dokumen` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `pengkeg_id` int DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Struktur dari tabel `monitoring_indikator`
--

CREATE TABLE `monitoring_indikator` (
  `id_monitoring` int NOT NULL,
  `indikator_id` int NOT NULL,
  `periode` smallint DEFAULT NULL,
  `capaian` float NOT NULL,
  `keterangan` text,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

-- --------------------------------------------------------

--
-- Struktur dari tabel `monitoring_indikator_rpjmd`
--

CREATE TABLE `monitoring_indikator_rpjmd` (
  `id` int NOT NULL,
  `indikator_id` int NOT NULL,
  `tahun` int NOT NULL,
  `target` float NOT NULL,
  `realisasi` float DEFAULT NULL,
  `satuan` varchar(255) DEFAULT NULL,
  `keterangan` text,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

-- --------------------------------------------------------

--
-- Struktur dari tabel `new_evaluasi_rpjmd`
--

CREATE TABLE `new_evaluasi_rpjmd` (
  `id_evaluasi` bigint UNSIGNED NOT NULL,
  `id_monitoring` int DEFAULT NULL,
  `periode` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `tanggal` date DEFAULT NULL,
  `ringkasan` text COLLATE utf8mb4_unicode_ci,
  `rekomendasi` text COLLATE utf8mb4_unicode_ci
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Struktur dari tabel `new_laporan_rpjmd`
--

CREATE TABLE `new_laporan_rpjmd` (
  `id_laporan` bigint UNSIGNED NOT NULL,
  `id_evaluasi` int DEFAULT NULL,
  `jenis_laporan` enum('tahunan','triwulan','kegiatan') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `judul` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `isi_laporan` text COLLATE utf8mb4_unicode_ci,
  `file_attachment` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `tanggal_dibuat` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Struktur dari tabel `new_monitoring_rpjmd`
--

CREATE TABLE `new_monitoring_rpjmd` (
  `id_monitoring` bigint UNSIGNED NOT NULL,
  `id_indikator` int DEFAULT NULL,
  `periode` smallint DEFAULT NULL,
  `nilai_target` decimal(10,0) DEFAULT NULL,
  `nilai_realisasi` decimal(10,0) DEFAULT NULL,
  `teks_realisasi` text COLLATE utf8mb4_unicode_ci,
  `persen_capaian` decimal(10,0) GENERATED ALWAYS AS ((case when (`nilai_target` > 0) then ((`nilai_realisasi` / `nilai_target`) * 100) else NULL end)) STORED,
  `status_kualitatif` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `catatan` text COLLATE utf8mb4_unicode_ci
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Struktur dari tabel `notifications`
--

CREATE TABLE `notifications` (
  `id` int UNSIGNED NOT NULL,
  `userId` int UNSIGNED NOT NULL,
  `type` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `message` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `read` tinyint(1) NOT NULL DEFAULT '0',
  `timestamp` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `createdAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Struktur dari tabel `opd_penanggung_jawab`
--

CREATE TABLE `opd_penanggung_jawab` (
  `id` int NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `nama_opd` varchar(255) DEFAULT NULL,
  `nama_bidang_opd` varchar(255) DEFAULT NULL,
  `nama` varchar(255) NOT NULL,
  `nip` varchar(50) NOT NULL,
  `jabatan` varchar(255) NOT NULL,
  `tahun` int DEFAULT NULL,
  `jenis_dokumen` varchar(255) DEFAULT NULL,
  `kegiatan_id` int DEFAULT NULL,
  `sub_kegiatan_id` int DEFAULT NULL,
  `tujuan_id` int DEFAULT NULL,
  `sasaran_id` int DEFAULT NULL,
  `program_id` int DEFAULT NULL,
  `misi_id` int DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

--
-- Dumping data untuk tabel `opd_penanggung_jawab`
--

INSERT INTO `opd_penanggung_jawab` (`id`, `created_at`, `updated_at`, `nama_opd`, `nama_bidang_opd`, `nama`, `nip`, `jabatan`, `tahun`, `jenis_dokumen`, `kegiatan_id`, `sub_kegiatan_id`, `tujuan_id`, `sasaran_id`, `program_id`, `misi_id`) VALUES
(107, '2025-06-08 10:50:14', '2025-07-25 12:46:08', 'Dinas Pangan', 'Sekretariat Dinas Pangan', 'Fahmi Alhabsi, SH,.M.Si', '19821010 200212 1 005', 'SEKRETARIS DINAS PANGAN', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(109, '2025-06-08 11:50:48', '2025-06-08 11:50:48', 'Dinas Pangan', 'Bidang Distribusi Dan Cadangan Pangan', 'M. Isra Silia', '19821010 200212 1 005', 'Kepala Bidang Distribusi Dan Cadangan Pangan', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(110, '2025-06-27 04:42:03', '2025-06-27 04:42:03', 'Dinas Pangan', 'Balai Pengawasan Mutu Pangan', 'M. Rahmat', '198210102002121005', 'Kepala Balai', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(111, '2025-06-28 09:59:34', '2025-07-25 12:45:41', 'Dinas Pangan', 'Bidang Ketersediaan & Kerawanan Pangan', 'Ibu Waty', '198210102002121005', 'Kepala Bidang', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(112, '2025-06-28 10:00:21', '2025-07-25 12:45:53', 'Dinas Pangan', 'Bidang Konsumsi Dan Keamanan Pangan', 'Ibu Lily', '198210102002121005', 'Kepala Bidang', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(113, '2025-07-01 02:27:45', '2025-07-01 02:27:45', 'Dinas Pendidikan dan Kebudayaan', 'Sekretariat', 'Rina Wulandari', '1975561009469', 'Sekretaris', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(114, '2025-07-01 02:27:45', '2025-07-01 02:27:45', 'Dinas Pendidikan dan Kebudayaan', 'Bidang Pendidikan Perencanaan', 'Andi Pratiwi', '1980565329539', 'Kepala Bidang', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(115, '2025-07-01 02:27:45', '2025-07-01 02:27:45', 'Dinas Pendidikan dan Kebudayaan', 'Bidang Pendidikan Pelayanan', 'Andi Wijaya', '1980268731898', 'Kepala Bidang', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(116, '2025-07-01 02:27:45', '2025-07-01 02:27:45', 'Dinas Pendidikan dan Kebudayaan', 'Bidang Pendidikan Pengembangan', 'Agus Wulandari', '198098180113', 'Kepala Bidang', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(117, '2025-07-01 02:27:45', '2025-07-01 02:27:45', 'Dinas Pendidikan dan Kebudayaan', 'Bidang Pendidikan Pengawasan', 'Dewi Halim', '1980373139809', 'Kepala Bidang', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(118, '2025-07-01 02:27:45', '2025-07-01 02:27:45', 'Dinas Kesehatan', 'Sekretariat', 'Agus Anjani', '1975278730390', 'Sekretaris', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(119, '2025-07-01 02:27:45', '2025-07-01 02:27:45', 'Dinas Kesehatan', 'Bidang Kesehatan Perencanaan', 'Hendra Halim', '1980992581946', 'Kepala Bidang', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(120, '2025-07-01 02:27:45', '2025-07-01 02:27:45', 'Dinas Kesehatan', 'Bidang Kesehatan Pelayanan', 'Dewi Pratiwi', '1980736033620', 'Kepala Bidang', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(121, '2025-07-01 02:27:45', '2025-07-01 02:27:45', 'Dinas Kesehatan', 'Bidang Kesehatan Pengembangan', 'Andi Nuraini', '1980109423469', 'Kepala Bidang', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(122, '2025-07-01 02:27:45', '2025-07-01 02:27:45', 'Dinas Kesehatan', 'Bidang Kesehatan Pengawasan', 'Hendra Fadillah', '1980681424710', 'Kepala Bidang', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(123, '2025-07-01 02:27:45', '2025-07-01 02:27:45', 'Dinas Pekerjaan Umum dan Penataan Ruang', 'Sekretariat', 'Lina Anjani', '1975664231268', 'Sekretaris', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(124, '2025-07-01 02:27:45', '2025-07-01 02:27:45', 'Dinas Pekerjaan Umum dan Penataan Ruang', 'Bidang Pekerjaan Perencanaan', 'Lina Saputra', '1980646781377', 'Kepala Bidang', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(125, '2025-07-01 02:27:45', '2025-07-01 02:27:45', 'Dinas Pekerjaan Umum dan Penataan Ruang', 'Bidang Pekerjaan Pelayanan', 'Fitri Wulandari', '1980858498600', 'Kepala Bidang', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(126, '2025-07-01 02:27:45', '2025-07-01 02:27:45', 'Dinas Pekerjaan Umum dan Penataan Ruang', 'Bidang Pekerjaan Pengembangan', 'Hendra Saputra', '1980817932418', 'Kepala Bidang', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(127, '2025-07-01 02:27:45', '2025-07-01 02:27:45', 'Dinas Pekerjaan Umum dan Penataan Ruang', 'Bidang Pekerjaan Pengawasan', 'Rina Saputra', '198049748318', 'Kepala Bidang', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(128, '2025-07-01 02:27:45', '2025-07-01 02:27:45', 'Dinas Sosial', 'Sekretariat', 'Dewi Nuraini', '1975582424218', 'Sekretaris', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(129, '2025-07-01 02:27:45', '2025-07-01 02:27:45', 'Dinas Sosial', 'Bidang Sosial Perencanaan', 'Bayu Anjani', '1980117170120', 'Kepala Bidang', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(130, '2025-07-01 02:27:45', '2025-07-01 02:27:45', 'Dinas Sosial', 'Bidang Sosial Pelayanan', 'Rina Wijaya', '1980822416101', 'Kepala Bidang', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(131, '2025-07-01 02:27:45', '2025-07-01 02:27:45', 'Dinas Sosial', 'Bidang Sosial Pengembangan', 'Bayu Kurniawan', '1980636681001', 'Kepala Bidang', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(132, '2025-07-01 02:27:45', '2025-07-01 02:27:45', 'Dinas Sosial', 'Bidang Sosial Pengawasan', 'Budi Fadillah', '1980557835124', 'Kepala Bidang', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(133, '2025-07-01 02:27:45', '2025-07-01 02:27:45', 'Dinas Perumahan dan Kawasan Pemukiman', 'Sekretariat', 'Bayu Wijaya', '1975108372032', 'Sekretaris', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(134, '2025-07-01 02:27:45', '2025-07-01 02:27:45', 'Dinas Perumahan dan Kawasan Pemukiman', 'Bidang Perumahan Perencanaan', 'Siti Wijaya', '198083153938', 'Kepala Bidang', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(135, '2025-07-01 02:27:45', '2025-07-01 02:27:45', 'Dinas Perumahan dan Kawasan Pemukiman', 'Bidang Perumahan Pelayanan', 'Siti Halim', '1980286584653', 'Kepala Bidang', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(136, '2025-07-01 02:27:45', '2025-07-01 02:27:45', 'Dinas Perumahan dan Kawasan Pemukiman', 'Bidang Perumahan Pengembangan', 'Siti Wulandari', '1980796600391', 'Kepala Bidang', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(137, '2025-07-01 02:27:45', '2025-07-01 02:27:45', 'Dinas Perumahan dan Kawasan Pemukiman', 'Bidang Perumahan Pengawasan', 'Lina Kurniawan', '1980895380666', 'Kepala Bidang', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(138, '2025-07-01 02:27:45', '2025-07-01 02:27:45', 'Dinas Perhubungan', 'Sekretariat', 'Hendra Wulandari', '1975517126944', 'Sekretaris', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(139, '2025-07-01 02:27:45', '2025-07-01 02:27:45', 'Dinas Perhubungan', 'Bidang Perhubungan Perencanaan', 'Dewi Halim', '1980765198126', 'Kepala Bidang', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(140, '2025-07-01 02:27:45', '2025-07-01 02:27:45', 'Dinas Perhubungan', 'Bidang Perhubungan Pelayanan', 'Rina Wulandari', '1980781094769', 'Kepala Bidang', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(141, '2025-07-01 02:27:45', '2025-07-01 02:27:45', 'Dinas Perhubungan', 'Bidang Perhubungan Pengembangan', 'Hendra Fadillah', '198028693118', 'Kepala Bidang', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(142, '2025-07-01 02:27:45', '2025-07-01 02:27:45', 'Dinas Perhubungan', 'Bidang Perhubungan Pengawasan', 'Fitri Wulandari', '198049789544', 'Kepala Bidang', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(143, '2025-07-01 02:27:45', '2025-07-01 02:27:45', 'Dinas Pariwisata', 'Sekretariat', 'Andi Halim', '1975485446322', 'Sekretaris', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(144, '2025-07-01 02:27:45', '2025-07-01 02:27:45', 'Dinas Pariwisata', 'Bidang Pariwisata Perencanaan', 'Agus Saputra', '1980979438962', 'Kepala Bidang', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(145, '2025-07-01 02:27:45', '2025-07-01 02:27:45', 'Dinas Pariwisata', 'Bidang Pariwisata Pelayanan', 'Rina Anjani', '1980946928511', 'Kepala Bidang', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(146, '2025-07-01 02:27:45', '2025-07-01 02:27:45', 'Dinas Pariwisata', 'Bidang Pariwisata Pengembangan', 'Andi Santoso', '1980455971851', 'Kepala Bidang', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(147, '2025-07-01 02:27:45', '2025-07-01 02:27:45', 'Dinas Pariwisata', 'Bidang Pariwisata Pengawasan', 'Lina Saputra', '1980664239452', 'Kepala Bidang', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(148, '2025-07-01 02:27:45', '2025-07-01 02:27:45', 'Dinas Kepemudaan dan Olahraga', 'Sekretariat', 'Budi Kurniawan', '1975362042084', 'Sekretaris', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(149, '2025-07-01 02:27:45', '2025-07-01 02:27:45', 'Dinas Kepemudaan dan Olahraga', 'Bidang Kepemudaan Perencanaan', 'Bayu Pratiwi', '1980762494020', 'Kepala Bidang', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(150, '2025-07-01 02:27:45', '2025-07-01 02:27:45', 'Dinas Kepemudaan dan Olahraga', 'Bidang Kepemudaan Pelayanan', 'Hendra Nuraini', '1980169637223', 'Kepala Bidang', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(151, '2025-07-01 02:27:45', '2025-07-01 02:27:45', 'Dinas Kepemudaan dan Olahraga', 'Bidang Kepemudaan Pengembangan', 'Andi Wijaya', '1980368296685', 'Kepala Bidang', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(152, '2025-07-01 02:27:45', '2025-07-01 02:27:45', 'Dinas Kepemudaan dan Olahraga', 'Bidang Kepemudaan Pengawasan', 'Hendra Anjani', '1980472213745', 'Kepala Bidang', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(153, '2025-07-01 02:27:45', '2025-07-01 02:27:45', 'Dinas Tenaga Kerja dan Transmigrasi', 'Sekretariat', 'Hendra Nuraini', '1975175879241', 'Sekretaris', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(154, '2025-07-01 02:27:45', '2025-07-01 02:27:45', 'Dinas Tenaga Kerja dan Transmigrasi', 'Bidang Tenaga Perencanaan', 'Fitri Wijaya', '1980860417472', 'Kepala Bidang', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(155, '2025-07-01 02:27:45', '2025-07-01 02:27:45', 'Dinas Tenaga Kerja dan Transmigrasi', 'Bidang Tenaga Pelayanan', 'Siti Halim', '1980478285311', 'Kepala Bidang', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(156, '2025-07-01 02:27:45', '2025-07-01 02:27:45', 'Dinas Tenaga Kerja dan Transmigrasi', 'Bidang Tenaga Pengembangan', 'Budi Fadillah', '1980473501657', 'Kepala Bidang', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(157, '2025-07-01 02:27:45', '2025-07-01 02:27:45', 'Dinas Tenaga Kerja dan Transmigrasi', 'Bidang Tenaga Pengawasan', 'Rina Wulandari', '1980586225828', 'Kepala Bidang', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(158, '2025-07-01 02:27:45', '2025-07-01 02:27:45', 'Dinas Pemberdayaan Masyarakat dan Desa', 'Sekretariat', 'Agus Wijaya', '1975829372942', 'Sekretaris', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(159, '2025-07-01 02:27:45', '2025-07-01 02:27:45', 'Dinas Pemberdayaan Masyarakat dan Desa', 'Bidang Pemberdayaan Perencanaan', 'Budi Wulandari', '1980820138300', 'Kepala Bidang', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(160, '2025-07-01 02:27:45', '2025-07-01 02:27:45', 'Dinas Pemberdayaan Masyarakat dan Desa', 'Bidang Pemberdayaan Pelayanan', 'Agus Saputra', '1980101507351', 'Kepala Bidang', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(161, '2025-07-01 02:27:45', '2025-07-01 02:27:45', 'Dinas Pemberdayaan Masyarakat dan Desa', 'Bidang Pemberdayaan Pengembangan', 'Rina Santoso', '1980773981880', 'Kepala Bidang', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(162, '2025-07-01 02:27:45', '2025-07-01 02:27:45', 'Dinas Pemberdayaan Masyarakat dan Desa', 'Bidang Pemberdayaan Pengawasan', 'Agus Santoso', '1980427585053', 'Kepala Bidang', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(163, '2025-07-01 02:27:45', '2025-07-01 02:27:45', 'Dinas Koperasi Usaha Kecil dan Menengah', 'Sekretariat', 'Dewi Nuraini', '1975524676594', 'Sekretaris', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(164, '2025-07-01 02:27:45', '2025-07-01 02:27:45', 'Dinas Koperasi Usaha Kecil dan Menengah', 'Bidang Koperasi Perencanaan', 'Agus Santoso', '1980476361086', 'Kepala Bidang', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(165, '2025-07-01 02:27:45', '2025-07-01 02:27:45', 'Dinas Koperasi Usaha Kecil dan Menengah', 'Bidang Koperasi Pelayanan', 'Fitri Fadillah', '1980485116529', 'Kepala Bidang', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(166, '2025-07-01 02:27:45', '2025-07-01 02:27:45', 'Dinas Koperasi Usaha Kecil dan Menengah', 'Bidang Koperasi Pengembangan', 'Andi Halim', '1980952282834', 'Kepala Bidang', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(167, '2025-07-01 02:27:45', '2025-07-01 02:27:45', 'Dinas Koperasi Usaha Kecil dan Menengah', 'Bidang Koperasi Pengawasan', 'Siti Pratiwi', '1980987836367', 'Kepala Bidang', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(168, '2025-07-01 02:27:45', '2025-07-01 02:27:45', 'Dinas Penanaman Modal dan Pelayanan Terpadu Satu Pintu', 'Sekretariat', 'Siti Halim', '1975873197299', 'Sekretaris', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(169, '2025-07-01 02:27:45', '2025-07-01 02:27:45', 'Dinas Penanaman Modal dan Pelayanan Terpadu Satu Pintu', 'Bidang Penanaman Perencanaan', 'Siti Halim', '1980670935113', 'Kepala Bidang', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(170, '2025-07-01 02:27:45', '2025-07-01 02:27:45', 'Dinas Penanaman Modal dan Pelayanan Terpadu Satu Pintu', 'Bidang Penanaman Pelayanan', 'Siti Kurniawan', '1980766434965', 'Kepala Bidang', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(171, '2025-07-01 02:27:45', '2025-07-01 02:27:45', 'Dinas Penanaman Modal dan Pelayanan Terpadu Satu Pintu', 'Bidang Penanaman Pengembangan', 'Siti Wulandari', '1980356883405', 'Kepala Bidang', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(172, '2025-07-01 02:27:45', '2025-07-01 02:27:45', 'Dinas Penanaman Modal dan Pelayanan Terpadu Satu Pintu', 'Bidang Penanaman Pengawasan', 'Andi Wulandari', '1980387264656', 'Kepala Bidang', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(173, '2025-07-01 02:27:45', '2025-07-01 02:27:45', 'Dinas Pemberdayaan Perempuan dan Perlindungan Anak', 'Sekretariat', 'Dewi Fadillah', '1975702652584', 'Sekretaris', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(174, '2025-07-01 02:27:45', '2025-07-01 02:27:45', 'Dinas Pemberdayaan Perempuan dan Perlindungan Anak', 'Bidang Pemberdayaan Perencanaan', 'Agus Anjani', '198018572768', 'Kepala Bidang', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(175, '2025-07-01 02:27:45', '2025-07-01 02:27:45', 'Dinas Pemberdayaan Perempuan dan Perlindungan Anak', 'Bidang Pemberdayaan Pelayanan', 'Siti Wijaya', '1980824817887', 'Kepala Bidang', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(176, '2025-07-01 02:27:45', '2025-07-01 02:27:45', 'Dinas Pemberdayaan Perempuan dan Perlindungan Anak', 'Bidang Pemberdayaan Pengembangan', 'Andi Kurniawan', '198099669133', 'Kepala Bidang', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(177, '2025-07-01 02:27:45', '2025-07-01 02:27:45', 'Dinas Pemberdayaan Perempuan dan Perlindungan Anak', 'Bidang Pemberdayaan Pengawasan', 'Lina Wulandari', '1980580838726', 'Kepala Bidang', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(178, '2025-07-01 02:27:45', '2025-07-01 02:27:45', 'Dinas Kearsipan dan Perpustakaan', 'Sekretariat', 'Budi Wulandari', '1975552749025', 'Sekretaris', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(179, '2025-07-01 02:27:45', '2025-07-01 02:27:45', 'Dinas Kearsipan dan Perpustakaan', 'Bidang Kearsipan Perencanaan', 'Siti Wulandari', '1980675889400', 'Kepala Bidang', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(180, '2025-07-01 02:27:45', '2025-07-01 02:27:45', 'Dinas Kearsipan dan Perpustakaan', 'Bidang Kearsipan Pelayanan', 'Bayu Nuraini', '1980315323126', 'Kepala Bidang', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(181, '2025-07-01 02:27:45', '2025-07-01 02:27:45', 'Dinas Kearsipan dan Perpustakaan', 'Bidang Kearsipan Pengembangan', 'Bayu Wulandari', '1980586477570', 'Kepala Bidang', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(182, '2025-07-01 02:27:45', '2025-07-01 02:27:45', 'Dinas Kearsipan dan Perpustakaan', 'Bidang Kearsipan Pengawasan', 'Agus Anjani', '1980741522919', 'Kepala Bidang', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(183, '2025-07-01 02:27:45', '2025-07-01 02:27:45', 'Dinas Lingkungan Hidup', 'Sekretariat', 'Dewi Wulandari', '1975548888562', 'Sekretaris', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(184, '2025-07-01 02:27:45', '2025-07-01 02:27:45', 'Dinas Lingkungan Hidup', 'Bidang Lingkungan Perencanaan', 'Lina Santoso', '1980553206959', 'Kepala Bidang', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(185, '2025-07-01 02:27:45', '2025-07-01 02:27:45', 'Dinas Lingkungan Hidup', 'Bidang Lingkungan Pelayanan', 'Siti Kurniawan', '1980642702990', 'Kepala Bidang', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(186, '2025-07-01 02:27:45', '2025-07-01 02:27:45', 'Dinas Lingkungan Hidup', 'Bidang Lingkungan Pengembangan', 'Agus Nuraini', '1980118369196', 'Kepala Bidang', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(187, '2025-07-01 02:27:45', '2025-07-01 02:27:45', 'Dinas Lingkungan Hidup', 'Bidang Lingkungan Pengawasan', 'Dewi Saputra', '1980346185456', 'Kepala Bidang', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(188, '2025-07-01 02:27:45', '2025-07-01 02:27:45', 'Dinas Pertanian', 'Sekretariat', 'Andi Wulandari', '1975561335045', 'Sekretaris', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(189, '2025-07-01 02:27:45', '2025-07-01 02:27:45', 'Dinas Pertanian', 'Bidang Pertanian Perencanaan', 'Fitri Fadillah', '1980987896791', 'Kepala Bidang', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(190, '2025-07-01 02:27:45', '2025-07-01 02:27:45', 'Dinas Pertanian', 'Bidang Pertanian Pelayanan', 'Hendra Halim', '198056797884', 'Kepala Bidang', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(191, '2025-07-01 02:27:45', '2025-07-01 02:27:45', 'Dinas Pertanian', 'Bidang Pertanian Pengembangan', 'Budi Fadillah', '1980755781783', 'Kepala Bidang', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(192, '2025-07-01 02:27:45', '2025-07-01 02:27:45', 'Dinas Pertanian', 'Bidang Pertanian Pengawasan', 'Budi Halim', '1980492391206', 'Kepala Bidang', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(193, '2025-07-01 02:27:45', '2025-07-01 02:27:45', 'Dinas Perindustrian dan Perdagangan', 'Sekretariat', 'Budi Fadillah', '1975882267730', 'Sekretaris', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(194, '2025-07-01 02:27:45', '2025-07-01 02:27:45', 'Dinas Perindustrian dan Perdagangan', 'Bidang Perindustrian Perencanaan', 'Dewi Anjani', '1980759948167', 'Kepala Bidang', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(195, '2025-07-01 02:27:45', '2025-07-01 02:27:45', 'Dinas Perindustrian dan Perdagangan', 'Bidang Perindustrian Pelayanan', 'Rina Saputra', '1980404651794', 'Kepala Bidang', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(196, '2025-07-01 02:27:45', '2025-07-01 02:27:45', 'Dinas Perindustrian dan Perdagangan', 'Bidang Perindustrian Pengembangan', 'Siti Saputra', '1980442100760', 'Kepala Bidang', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(197, '2025-07-01 02:27:45', '2025-07-01 02:27:45', 'Dinas Perindustrian dan Perdagangan', 'Bidang Perindustrian Pengawasan', 'Budi Anjani', '1980885853772', 'Kepala Bidang', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(198, '2025-07-01 02:27:45', '2025-07-01 02:27:45', 'Dinas Kehutanan', 'Sekretariat', 'Dewi Wulandari', '1975485118902', 'Sekretaris', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(199, '2025-07-01 02:27:45', '2025-07-01 02:27:45', 'Dinas Kehutanan', 'Bidang Kehutanan Perencanaan', 'Fitri Santoso', '1980633980177', 'Kepala Bidang', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(200, '2025-07-01 02:27:45', '2025-07-01 02:27:45', 'Dinas Kehutanan', 'Bidang Kehutanan Pelayanan', 'Agus Pratiwi', '1980533068141', 'Kepala Bidang', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(201, '2025-07-01 02:27:45', '2025-07-01 02:27:45', 'Dinas Kehutanan', 'Bidang Kehutanan Pengembangan', 'Lina Santoso', '1980470099072', 'Kepala Bidang', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(202, '2025-07-01 02:27:45', '2025-07-01 02:27:45', 'Dinas Kehutanan', 'Bidang Kehutanan Pengawasan', 'Siti Anjani', '1980561045765', 'Kepala Bidang', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(203, '2025-07-01 02:27:45', '2025-07-01 02:27:45', 'Dinas Energi dan Sumber Daya Mineral', 'Sekretariat', 'Dewi Santoso', '1975624575690', 'Sekretaris', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(204, '2025-07-01 02:27:45', '2025-07-01 02:27:45', 'Dinas Energi dan Sumber Daya Mineral', 'Bidang Energi Perencanaan', 'Rina Kurniawan', '1980368804240', 'Kepala Bidang', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(205, '2025-07-01 02:27:45', '2025-07-01 02:27:45', 'Dinas Energi dan Sumber Daya Mineral', 'Bidang Energi Pelayanan', 'Andi Halim', '1980294743870', 'Kepala Bidang', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(206, '2025-07-01 02:27:45', '2025-07-01 02:27:45', 'Dinas Energi dan Sumber Daya Mineral', 'Bidang Energi Pengembangan', 'Rina Nuraini', '1980134823164', 'Kepala Bidang', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(207, '2025-07-01 02:27:45', '2025-07-01 02:27:45', 'Dinas Energi dan Sumber Daya Mineral', 'Bidang Energi Pengawasan', 'Siti Santoso', '198016928789', 'Kepala Bidang', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(208, '2025-07-01 02:27:45', '2025-07-01 02:27:45', 'Dinas Kelautan dan Perikanan', 'Sekretariat', 'Hendra Fadillah', '1975439813038', 'Sekretaris', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(209, '2025-07-01 02:27:45', '2025-07-01 02:27:45', 'Dinas Kelautan dan Perikanan', 'Bidang Kelautan Perencanaan', 'Hendra Wijaya', '1980794934491', 'Kepala Bidang', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(210, '2025-07-01 02:27:45', '2025-07-01 02:27:45', 'Dinas Kelautan dan Perikanan', 'Bidang Kelautan Pelayanan', 'Lina Anjani', '1980959335758', 'Kepala Bidang', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(211, '2025-07-01 02:27:45', '2025-07-01 02:27:45', 'Dinas Kelautan dan Perikanan', 'Bidang Kelautan Pengembangan', 'Agus Pratiwi', '1980913057797', 'Kepala Bidang', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(212, '2025-07-01 02:27:45', '2025-07-01 02:27:45', 'Dinas Kelautan dan Perikanan', 'Bidang Kelautan Pengawasan', 'Bayu Anjani', '1980444057496', 'Kepala Bidang', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(213, '2025-07-01 02:27:45', '2025-07-01 02:27:45', 'Dinas Administrasi Kependudukan dan Pencatatan Sipil', 'Sekretariat', 'Hendra Nuraini', '1975100622552', 'Sekretaris', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(214, '2025-07-01 02:27:45', '2025-07-01 02:27:45', 'Dinas Administrasi Kependudukan dan Pencatatan Sipil', 'Bidang Administrasi Perencanaan', 'Hendra Wijaya', '1980837245576', 'Kepala Bidang', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(215, '2025-07-01 02:27:45', '2025-07-01 02:27:45', 'Dinas Administrasi Kependudukan dan Pencatatan Sipil', 'Bidang Administrasi Pelayanan', 'Andi Fadillah', '1980404346771', 'Kepala Bidang', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(216, '2025-07-01 02:27:45', '2025-07-01 02:27:45', 'Dinas Administrasi Kependudukan dan Pencatatan Sipil', 'Bidang Administrasi Pengembangan', 'Budi Halim', '1980109910589', 'Kepala Bidang', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(217, '2025-07-01 02:27:45', '2025-07-01 02:27:45', 'Dinas Administrasi Kependudukan dan Pencatatan Sipil', 'Bidang Administrasi Pengawasan', 'Hendra Anjani', '1980876512835', 'Kepala Bidang', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(218, '2025-07-01 02:27:45', '2025-07-01 02:27:45', 'Inspektorat', 'Sekretariat', 'Hendra Wulandari', '1975229626864', 'Sekretaris', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(219, '2025-07-01 02:27:45', '2025-07-01 02:27:45', 'Inspektorat', 'Bidang Inspektorat Perencanaan', 'Rina Nuraini', '1980100668854', 'Kepala Bidang', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(220, '2025-07-01 02:27:45', '2025-07-01 02:27:45', 'Inspektorat', 'Bidang Inspektorat Pelayanan', 'Bayu Nuraini', '1980454579975', 'Kepala Bidang', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(221, '2025-07-01 02:27:45', '2025-07-01 02:27:45', 'Inspektorat', 'Bidang Inspektorat Pengembangan', 'Bayu Halim', '1980285398153', 'Kepala Bidang', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(222, '2025-07-01 02:27:45', '2025-07-01 02:27:45', 'Inspektorat', 'Bidang Inspektorat Pengawasan', 'Bayu Halim', '1980634833792', 'Kepala Bidang', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(223, '2025-07-01 02:27:45', '2025-07-01 02:27:45', 'Satuan Polisi Pamong Praja', 'Sekretariat', 'Bayu Anjani', '1975789273008', 'Sekretaris', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(224, '2025-07-01 02:27:45', '2025-07-01 02:27:45', 'Satuan Polisi Pamong Praja', 'Bidang Satuan Perencanaan', 'Agus Santoso', '1980480429698', 'Kepala Bidang', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(225, '2025-07-01 02:27:45', '2025-07-01 02:27:45', 'Satuan Polisi Pamong Praja', 'Bidang Satuan Pelayanan', 'Agus Nuraini', '1980660323320', 'Kepala Bidang', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(226, '2025-07-01 02:27:45', '2025-07-01 02:27:45', 'Satuan Polisi Pamong Praja', 'Bidang Satuan Pengembangan', 'Lina Anjani', '1980487463412', 'Kepala Bidang', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(227, '2025-07-01 02:27:45', '2025-07-01 02:27:45', 'Satuan Polisi Pamong Praja', 'Bidang Satuan Pengawasan', 'Agus Nuraini', '1980148071390', 'Kepala Bidang', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(228, '2025-07-01 02:27:45', '2025-07-01 02:27:45', 'Badan Perencanaan dan Pembangunan Daerah', 'Sekretariat', 'Budi Saputra', '1975617043817', 'Sekretaris', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(229, '2025-07-01 02:27:45', '2025-07-01 02:27:45', 'Badan Perencanaan dan Pembangunan Daerah', 'Bidang Perencanaan Perencanaan', 'Rina Pratiwi', '1980126444494', 'Kepala Bidang', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(230, '2025-07-01 02:27:45', '2025-07-01 02:27:45', 'Badan Perencanaan dan Pembangunan Daerah', 'Bidang Perencanaan Pelayanan', 'Bayu Fadillah', '198089939365', 'Kepala Bidang', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(231, '2025-07-01 02:27:45', '2025-07-01 02:27:45', 'Badan Perencanaan dan Pembangunan Daerah', 'Bidang Perencanaan Pengembangan', 'Fitri Saputra', '1980387098735', 'Kepala Bidang', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(232, '2025-07-01 02:27:45', '2025-07-01 02:27:45', 'Badan Perencanaan dan Pembangunan Daerah', 'Bidang Perencanaan Pengawasan', 'Lina Kurniawan', '1980325028758', 'Kepala Bidang', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(233, '2025-07-01 02:27:45', '2025-07-01 02:27:45', 'Badan Pengelolaan Keuangan dan Aset Daerah', 'Sekretariat', 'Lina Wulandari', '197547584721', 'Sekretaris', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(234, '2025-07-01 02:27:45', '2025-07-01 02:27:45', 'Badan Pengelolaan Keuangan dan Aset Daerah', 'Bidang Pengelolaan Perencanaan', 'Dewi Pratiwi', '1980821685769', 'Kepala Bidang', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(235, '2025-07-01 02:27:45', '2025-07-01 02:27:45', 'Badan Pengelolaan Keuangan dan Aset Daerah', 'Bidang Pengelolaan Pelayanan', 'Hendra Pratiwi', '198061292170', 'Kepala Bidang', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(236, '2025-07-01 02:27:45', '2025-07-01 02:27:45', 'Badan Pengelolaan Keuangan dan Aset Daerah', 'Bidang Pengelolaan Pengembangan', 'Dewi Anjani', '1980875039503', 'Kepala Bidang', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(237, '2025-07-01 02:27:45', '2025-07-01 02:27:45', 'Badan Pengelolaan Keuangan dan Aset Daerah', 'Bidang Pengelolaan Pengawasan', 'Agus Santoso', '1980676503504', 'Kepala Bidang', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(238, '2025-07-01 02:27:45', '2025-07-01 02:27:45', 'Badan Pendapatan Daerah', 'Sekretariat', 'Fitri Wijaya', '1975485251092', 'Sekretaris', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(239, '2025-07-01 02:27:45', '2025-07-01 02:27:45', 'Badan Pendapatan Daerah', 'Bidang Pendapatan Perencanaan', 'Siti Kurniawan', '1980576554806', 'Kepala Bidang', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(240, '2025-07-01 02:27:45', '2025-07-01 02:27:45', 'Badan Pendapatan Daerah', 'Bidang Pendapatan Pelayanan', 'Andi Wijaya', '198011248085', 'Kepala Bidang', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(241, '2025-07-01 02:27:45', '2025-07-01 02:27:45', 'Badan Pendapatan Daerah', 'Bidang Pendapatan Pengembangan', 'Andi Wulandari', '1980461627280', 'Kepala Bidang', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(242, '2025-07-01 02:27:45', '2025-07-01 02:27:45', 'Badan Pendapatan Daerah', 'Bidang Pendapatan Pengawasan', 'Budi Wijaya', '1980770761525', 'Kepala Bidang', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(243, '2025-07-01 02:27:45', '2025-07-06 01:23:01', 'Badan Kepegawaian Daerah', 'Sekretariat', 'Syam Sofyan', '1975785502627', 'Sekretaris', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(244, '2025-07-01 02:27:45', '2025-07-01 02:33:05', 'Badan Kepegawaian Daerah', 'Bidang Pengadaan Pegawai', 'Alex Tovano Rada, S.IP, M.Si', '1980526344418', 'Kepala Bidang', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(245, '2025-07-01 02:27:45', '2025-07-06 01:22:05', 'Badan Kepegawaian Daerah', 'Bidang Mutasi Dan Promosi', 'Rian Kurniawan', '1980884733814', 'Kepala Bidang', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(246, '2025-07-01 02:27:45', '2025-07-06 01:22:36', 'Badan Kepegawaian Daerah', 'Bidang Disiplin', 'Husen Albaar', '1980272606180', 'Kepala Bidang', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(247, '2025-07-01 02:27:45', '2025-07-06 01:25:06', 'Badan Kepegawaian Daerah', 'Badan Kepegawaian Daerah', 'Syam Sofyan', '1980695691919', 'Plt Kepala Badan Kepegawaian', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(248, '2025-07-01 02:27:45', '2025-07-01 02:27:45', 'Badan Pengembangan Sumber Daya Manusia', 'Sekretariat', 'Lina Santoso', '1975198259944', 'Sekretaris', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(249, '2025-07-01 02:27:45', '2025-07-01 02:27:45', 'Badan Pengembangan Sumber Daya Manusia', 'Bidang Pengembangan Perencanaan', 'Budi Saputra', '1980956255050', 'Kepala Bidang', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(250, '2025-07-01 02:27:45', '2025-07-01 02:27:45', 'Badan Pengembangan Sumber Daya Manusia', 'Bidang Pengembangan Pelayanan', 'Bayu Kurniawan', '1980825662526', 'Kepala Bidang', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(251, '2025-07-01 02:27:45', '2025-07-01 02:27:45', 'Badan Pengembangan Sumber Daya Manusia', 'Bidang Pengembangan Pengembangan', 'Hendra Saputra', '1980860775040', 'Kepala Bidang', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(252, '2025-07-01 02:27:45', '2025-07-01 02:27:45', 'Badan Pengembangan Sumber Daya Manusia', 'Bidang Pengembangan Pengawasan', 'Lina Santoso', '1980650197628', 'Kepala Bidang', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(253, '2025-07-01 02:27:45', '2025-07-01 02:27:45', 'Badan Penelitian dan Pengembangan Daerah', 'Sekretariat', 'Hendra Pratiwi', '1975885922323', 'Sekretaris', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(254, '2025-07-01 02:27:45', '2025-07-01 02:27:45', 'Badan Penelitian dan Pengembangan Daerah', 'Bidang Penelitian Perencanaan', 'Rina Nuraini', '1980758728801', 'Kepala Bidang', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(255, '2025-07-01 02:27:45', '2025-07-01 02:27:45', 'Badan Penelitian dan Pengembangan Daerah', 'Bidang Penelitian Pelayanan', 'Bayu Nuraini', '1980911917282', 'Kepala Bidang', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(256, '2025-07-01 02:27:45', '2025-07-01 02:27:45', 'Badan Penelitian dan Pengembangan Daerah', 'Bidang Penelitian Pengembangan', 'Dewi Halim', '1980896475315', 'Kepala Bidang', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(257, '2025-07-01 02:27:45', '2025-07-01 02:27:45', 'Badan Penelitian dan Pengembangan Daerah', 'Bidang Penelitian Pengawasan', 'Rina Wijaya', '1980411341632', 'Kepala Bidang', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(258, '2025-07-01 02:27:45', '2025-07-01 02:27:45', 'Badan Penanggulangan Bencana Daerah', 'Sekretariat', 'Rina Pratiwi', '1975335740343', 'Sekretaris', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(259, '2025-07-01 02:27:45', '2025-07-01 02:27:45', 'Badan Penanggulangan Bencana Daerah', 'Bidang Penanggulangan Perencanaan', 'Budi Anjani', '1980227297864', 'Kepala Bidang', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(260, '2025-07-01 02:27:45', '2025-07-01 02:27:45', 'Badan Penanggulangan Bencana Daerah', 'Bidang Penanggulangan Pelayanan', 'Dewi Kurniawan', '1980450400363', 'Kepala Bidang', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(261, '2025-07-01 02:27:45', '2025-07-01 02:27:45', 'Badan Penanggulangan Bencana Daerah', 'Bidang Penanggulangan Pengembangan', 'Rina Wijaya', '1980112979640', 'Kepala Bidang', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(262, '2025-07-01 02:27:45', '2025-07-01 02:27:45', 'Badan Penanggulangan Bencana Daerah', 'Bidang Penanggulangan Pengawasan', 'Siti Halim', '1980189569428', 'Kepala Bidang', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(263, '2025-07-01 02:27:45', '2025-07-01 02:27:45', 'Badan Kesatuan Bangsa dan Politik', 'Sekretariat', 'Agus Pratiwi', '1975493324086', 'Sekretaris', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(264, '2025-07-01 02:27:45', '2025-07-01 02:27:45', 'Badan Kesatuan Bangsa dan Politik', 'Bidang Kesatuan Perencanaan', 'Dewi Anjani', '1980942161612', 'Kepala Bidang', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(265, '2025-07-01 02:27:45', '2025-07-01 02:27:45', 'Badan Kesatuan Bangsa dan Politik', 'Bidang Kesatuan Pelayanan', 'Fitri Kurniawan', '1980173592918', 'Kepala Bidang', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(266, '2025-07-01 02:27:45', '2025-07-01 02:27:45', 'Badan Kesatuan Bangsa dan Politik', 'Bidang Kesatuan Pengembangan', 'Lina Wulandari', '1980391707047', 'Kepala Bidang', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(267, '2025-07-01 02:27:45', '2025-07-01 02:27:45', 'Badan Kesatuan Bangsa dan Politik', 'Bidang Kesatuan Pengawasan', 'Fitri Santoso', '1980359230976', 'Kepala Bidang', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(268, '2025-07-01 02:27:45', '2025-07-01 02:27:45', 'Badan Penghubung', 'Sekretariat', 'Lina Wijaya', '1975979884212', 'Sekretaris', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(269, '2025-07-01 02:27:45', '2025-07-01 02:27:45', 'Badan Penghubung', 'Bidang Penghubung Perencanaan', 'Dewi Kurniawan', '1980543784577', 'Kepala Bidang', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(270, '2025-07-01 02:27:45', '2025-07-01 02:27:45', 'Badan Penghubung', 'Bidang Penghubung Pelayanan', 'Lina Fadillah', '1980636955799', 'Kepala Bidang', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(271, '2025-07-01 02:27:45', '2025-07-01 02:27:45', 'Badan Penghubung', 'Bidang Penghubung Pengembangan', 'Lina Saputra', '1980401259385', 'Kepala Bidang', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(272, '2025-07-01 02:27:45', '2025-07-01 02:27:45', 'Badan Penghubung', 'Bidang Penghubung Pengawasan', 'Dewi Wulandari', '1980412536504', 'Kepala Bidang', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(273, '2025-07-01 02:27:45', '2025-07-01 02:27:45', 'Badan Pengelolaan Perbatasan', 'Sekretariat', 'Andi Santoso', '1975178898962', 'Sekretaris', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(274, '2025-07-01 02:27:45', '2025-07-01 02:27:45', 'Badan Pengelolaan Perbatasan', 'Bidang Pengelolaan Perencanaan', 'Andi Kurniawan', '1980294238734', 'Kepala Bidang', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(275, '2025-07-01 02:27:45', '2025-07-01 02:27:45', 'Badan Pengelolaan Perbatasan', 'Bidang Pengelolaan Pelayanan', 'Dewi Wulandari', '1980659515242', 'Kepala Bidang', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(276, '2025-07-01 02:27:45', '2025-07-01 02:27:45', 'Badan Pengelolaan Perbatasan', 'Bidang Pengelolaan Pengembangan', 'Siti Saputra', '1980159876313', 'Kepala Bidang', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(277, '2025-07-01 02:27:45', '2025-07-01 02:27:45', 'Badan Pengelolaan Perbatasan', 'Bidang Pengelolaan Pengawasan', 'Rina Anjani', '1980473913757', 'Kepala Bidang', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(278, '2025-07-01 02:27:45', '2025-07-01 02:27:45', 'Biro Pemerintahan dan Otonomi Daerah Sekretariat Daerah', 'Sekretariat', 'Hendra Wulandari', '197552673403', 'Sekretaris', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(279, '2025-07-01 02:27:45', '2025-07-01 02:27:45', 'Biro Pemerintahan dan Otonomi Daerah Sekretariat Daerah', 'Bidang Pemerintahan Perencanaan', 'Andi Kurniawan', '198069392839', 'Kepala Bidang', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(280, '2025-07-01 02:27:45', '2025-07-01 02:27:45', 'Biro Pemerintahan dan Otonomi Daerah Sekretariat Daerah', 'Bidang Pemerintahan Pelayanan', 'Hendra Santoso', '1980708532866', 'Kepala Bidang', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(281, '2025-07-01 02:27:45', '2025-07-01 02:27:45', 'Biro Pemerintahan dan Otonomi Daerah Sekretariat Daerah', 'Bidang Pemerintahan Pengembangan', 'Fitri Nuraini', '1980141086875', 'Kepala Bidang', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(282, '2025-07-01 02:27:45', '2025-07-01 02:27:45', 'Biro Pemerintahan dan Otonomi Daerah Sekretariat Daerah', 'Bidang Pemerintahan Pengawasan', 'Lina Anjani', '1980361092716', 'Kepala Bidang', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(283, '2025-07-01 02:27:45', '2025-07-01 02:27:45', 'Biro Kesejahteraan Rakyat Sekretariat Daerah', 'Sekretariat', 'Rina Nuraini', '1975893204803', 'Sekretaris', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(284, '2025-07-01 02:27:45', '2025-07-01 02:27:45', 'Biro Kesejahteraan Rakyat Sekretariat Daerah', 'Bidang Kesejahteraan Perencanaan', 'Agus Wulandari', '1980964359006', 'Kepala Bidang', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(285, '2025-07-01 02:27:45', '2025-07-01 02:27:45', 'Biro Kesejahteraan Rakyat Sekretariat Daerah', 'Bidang Kesejahteraan Pelayanan', 'Rina Wijaya', '1980824475650', 'Kepala Bidang', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(286, '2025-07-01 02:27:45', '2025-07-01 02:27:45', 'Biro Kesejahteraan Rakyat Sekretariat Daerah', 'Bidang Kesejahteraan Pengembangan', 'Lina Saputra', '1980475842092', 'Kepala Bidang', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(287, '2025-07-01 02:27:45', '2025-07-01 02:27:45', 'Biro Kesejahteraan Rakyat Sekretariat Daerah', 'Bidang Kesejahteraan Pengawasan', 'Rina Anjani', '1980480314938', 'Kepala Bidang', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(288, '2025-07-01 02:27:45', '2025-07-01 02:27:45', 'Biro Hukum Sekretariat Daerah', 'Sekretariat', 'Lina Halim', '1975888848046', 'Sekretaris', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(289, '2025-07-01 02:27:45', '2025-07-01 02:27:45', 'Biro Hukum Sekretariat Daerah', 'Bidang Hukum Perencanaan', 'Dewi Halim', '1980804827108', 'Kepala Bidang', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(290, '2025-07-01 02:27:45', '2025-07-01 02:27:45', 'Biro Hukum Sekretariat Daerah', 'Bidang Hukum Pelayanan', 'Andi Wijaya', '1980923203628', 'Kepala Bidang', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(291, '2025-07-01 02:27:45', '2025-07-01 02:27:45', 'Biro Hukum Sekretariat Daerah', 'Bidang Hukum Pengembangan', 'Bayu Nuraini', '1980868123131', 'Kepala Bidang', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(292, '2025-07-01 02:27:45', '2025-07-01 02:27:45', 'Biro Hukum Sekretariat Daerah', 'Bidang Hukum Pengawasan', 'Rina Fadillah', '1980656414563', 'Kepala Bidang', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(293, '2025-07-01 02:27:45', '2025-07-01 02:27:45', 'Biro Perekonomian Sekretariat Daerah', 'Sekretariat', 'Budi Fadillah', '1975985198518', 'Sekretaris', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(294, '2025-07-01 02:27:45', '2025-07-01 02:27:45', 'Biro Perekonomian Sekretariat Daerah', 'Bidang Perekonomian Perencanaan', 'Dewi Fadillah', '1980795085250', 'Kepala Bidang', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(295, '2025-07-01 02:27:45', '2025-07-01 02:27:45', 'Biro Perekonomian Sekretariat Daerah', 'Bidang Perekonomian Pelayanan', 'Andi Pratiwi', '1980428725736', 'Kepala Bidang', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(296, '2025-07-01 02:27:45', '2025-07-01 02:27:45', 'Biro Perekonomian Sekretariat Daerah', 'Bidang Perekonomian Pengembangan', 'Agus Kurniawan', '1980272116198', 'Kepala Bidang', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(297, '2025-07-01 02:27:45', '2025-07-01 02:27:45', 'Biro Perekonomian Sekretariat Daerah', 'Bidang Perekonomian Pengawasan', 'Rina Halim', '1980996674571', 'Kepala Bidang', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(298, '2025-07-01 02:27:45', '2025-07-01 02:27:45', 'Biro Pengadaan Barang dan Jasa Sekretariat Daerah', 'Sekretariat', 'Fitri Halim', '1975195529258', 'Sekretaris', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(299, '2025-07-01 02:27:45', '2025-07-01 02:27:45', 'Biro Pengadaan Barang dan Jasa Sekretariat Daerah', 'Bidang Pengadaan Perencanaan', 'Bayu Santoso', '1980494056680', 'Kepala Bidang', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(300, '2025-07-01 02:27:45', '2025-07-01 02:27:45', 'Biro Pengadaan Barang dan Jasa Sekretariat Daerah', 'Bidang Pengadaan Pelayanan', 'Andi Wulandari', '1980577431400', 'Kepala Bidang', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(301, '2025-07-01 02:27:45', '2025-07-01 02:27:45', 'Biro Pengadaan Barang dan Jasa Sekretariat Daerah', 'Bidang Pengadaan Pengembangan', 'Bayu Pratiwi', '1980108739813', 'Kepala Bidang', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(302, '2025-07-01 02:27:45', '2025-07-01 02:27:45', 'Biro Pengadaan Barang dan Jasa Sekretariat Daerah', 'Bidang Pengadaan Pengawasan', 'Siti Anjani', '1980998335091', 'Kepala Bidang', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(303, '2025-07-01 02:27:45', '2025-07-01 02:27:45', 'Biro Organisasi Sekretariat Daerah', 'Sekretariat', 'Budi Saputra', '1975721944451', 'Sekretaris', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(304, '2025-07-01 02:27:45', '2025-07-01 02:27:45', 'Biro Organisasi Sekretariat Daerah', 'Bidang Organisasi Perencanaan', 'Andi Wijaya', '1980101972917', 'Kepala Bidang', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(305, '2025-07-01 02:27:45', '2025-07-01 02:27:45', 'Biro Organisasi Sekretariat Daerah', 'Bidang Organisasi Pelayanan', 'Rina Pratiwi', '1980448620685', 'Kepala Bidang', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(306, '2025-07-01 02:27:45', '2025-07-01 02:27:45', 'Biro Organisasi Sekretariat Daerah', 'Bidang Organisasi Pengembangan', 'Andi Wijaya', '1980950739643', 'Kepala Bidang', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(307, '2025-07-01 02:27:45', '2025-07-01 02:27:45', 'Biro Organisasi Sekretariat Daerah', 'Bidang Organisasi Pengawasan', 'Siti Nuraini', '1980417436871', 'Kepala Bidang', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(308, '2025-07-01 02:27:45', '2025-07-01 02:27:45', 'Biro Administrasi Pimpinan Sekretariat Daerah', 'Sekretariat', 'Budi Fadillah', '1975720405342', 'Sekretaris', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(309, '2025-07-01 02:27:45', '2025-07-01 02:27:45', 'Biro Administrasi Pimpinan Sekretariat Daerah', 'Bidang Administrasi Perencanaan', 'Lina Wulandari', '1980278190472', 'Kepala Bidang', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(310, '2025-07-01 02:27:45', '2025-07-01 02:27:45', 'Biro Administrasi Pimpinan Sekretariat Daerah', 'Bidang Administrasi Pelayanan', 'Fitri Saputra', '1980437508771', 'Kepala Bidang', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(311, '2025-07-01 02:27:45', '2025-07-01 02:27:45', 'Biro Administrasi Pimpinan Sekretariat Daerah', 'Bidang Administrasi Pengembangan', 'Budi Anjani', '1980264676192', 'Kepala Bidang', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(312, '2025-07-01 02:27:45', '2025-07-01 02:27:45', 'Biro Administrasi Pimpinan Sekretariat Daerah', 'Bidang Administrasi Pengawasan', 'Andi Anjani', '1980769401676', 'Kepala Bidang', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(313, '2025-07-01 02:27:45', '2025-07-01 02:27:45', 'Biro Administrasi Pembangunan Sekretariat Daerah', 'Sekretariat', 'Dewi Santoso', '1975217586055', 'Sekretaris', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(314, '2025-07-01 02:27:45', '2025-07-01 02:27:45', 'Biro Administrasi Pembangunan Sekretariat Daerah', 'Bidang Administrasi Perencanaan', 'Dewi Anjani', '1980655035512', 'Kepala Bidang', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(315, '2025-07-01 02:27:45', '2025-07-01 02:27:45', 'Biro Administrasi Pembangunan Sekretariat Daerah', 'Bidang Administrasi Pelayanan', 'Dewi Nuraini', '1980210068439', 'Kepala Bidang', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(316, '2025-07-01 02:27:45', '2025-07-01 02:27:45', 'Biro Administrasi Pembangunan Sekretariat Daerah', 'Bidang Administrasi Pengembangan', 'Hendra Anjani', '1980595945221', 'Kepala Bidang', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(317, '2025-07-01 02:27:45', '2025-07-01 02:27:45', 'Biro Administrasi Pembangunan Sekretariat Daerah', 'Bidang Administrasi Pengawasan', 'Fitri Nuraini', '19805451479', 'Kepala Bidang', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(318, '2025-07-01 02:27:45', '2025-07-01 02:27:45', 'Biro Umum Sekretariat Daerah', 'Sekretariat', 'Fitri Pratiwi', '1975438913330', 'Sekretaris', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(319, '2025-07-01 02:27:45', '2025-07-01 02:27:45', 'Biro Umum Sekretariat Daerah', 'Bidang Umum Perencanaan', 'Siti Wulandari', '1980567919746', 'Kepala Bidang', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(320, '2025-07-01 02:27:45', '2025-07-01 02:27:45', 'Biro Umum Sekretariat Daerah', 'Bidang Umum Pelayanan', 'Andi Santoso', '198068155347', 'Kepala Bidang', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(321, '2025-07-01 02:27:45', '2025-07-01 02:27:45', 'Biro Umum Sekretariat Daerah', 'Bidang Umum Pengembangan', 'Lina Halim', '1980537587019', 'Kepala Bidang', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(322, '2025-07-01 02:27:45', '2025-07-01 02:27:45', 'Biro Umum Sekretariat Daerah', 'Bidang Umum Pengawasan', 'Hendra Nuraini', '1980476144716', 'Kepala Bidang', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(323, '2025-07-01 02:27:45', '2025-07-01 02:27:45', 'RSUD dr. Chasan Boesoirie', 'Sekretariat', 'Budi Anjani', '1975121714353', 'Sekretaris', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(324, '2025-07-01 02:27:45', '2025-07-01 02:27:45', 'RSUD dr. Chasan Boesoirie', 'Bidang dr. Perencanaan', 'Rina Wijaya', '1980916363056', 'Kepala Bidang', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(325, '2025-07-01 02:27:45', '2025-07-01 02:27:45', 'RSUD dr. Chasan Boesoirie', 'Bidang dr. Pelayanan', 'Budi Anjani', '1980141830292', 'Kepala Bidang', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(326, '2025-07-01 02:27:45', '2025-07-01 02:27:45', 'RSUD dr. Chasan Boesoirie', 'Bidang dr. Pengembangan', 'Budi Nuraini', '1980675669834', 'Kepala Bidang', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(327, '2025-07-01 02:27:45', '2025-07-01 02:27:45', 'RSUD dr. Chasan Boesoirie', 'Bidang dr. Pengawasan', 'Siti Anjani', '198080366889', 'Kepala Bidang', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(328, '2025-07-01 02:27:45', '2025-07-01 02:27:45', 'RSU Sofifi', 'Sekretariat', 'Budi Saputra', '1975941174250', 'Sekretaris', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(329, '2025-07-01 02:27:45', '2025-07-01 02:27:45', 'RSU Sofifi', 'Bidang Sofifi Perencanaan', 'Bayu Nuraini', '1980974551737', 'Kepala Bidang', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(330, '2025-07-01 02:27:45', '2025-07-01 02:27:45', 'RSU Sofifi', 'Bidang Sofifi Pelayanan', 'Bayu Saputra', '1980691390560', 'Kepala Bidang', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(331, '2025-07-01 02:27:45', '2025-07-01 02:27:45', 'RSU Sofifi', 'Bidang Sofifi Pengembangan', 'Rina Pratiwi', '1980968730533', 'Kepala Bidang', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(332, '2025-07-01 02:27:45', '2025-07-01 02:27:45', 'RSU Sofifi', 'Bidang Sofifi Pengawasan', 'Andi Pratiwi', '1980208375978', 'Kepala Bidang', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(333, '2025-07-01 02:27:45', '2025-07-01 02:27:45', 'Rumah Sakit Jiwa', 'Sekretariat', 'Fitri Kurniawan', '1975266971704', 'Sekretaris', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(334, '2025-07-01 02:27:45', '2025-07-01 02:27:45', 'Rumah Sakit Jiwa', 'Bidang Jiwa Perencanaan', 'Andi Saputra', '1980148263360', 'Kepala Bidang', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(335, '2025-07-01 02:27:45', '2025-07-01 02:27:45', 'Rumah Sakit Jiwa', 'Bidang Jiwa Pelayanan', 'Bayu Santoso', '1980459933026', 'Kepala Bidang', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(336, '2025-07-01 02:27:45', '2025-07-01 02:27:45', 'Rumah Sakit Jiwa', 'Bidang Jiwa Pengembangan', 'Bayu Anjani', '1980257945448', 'Kepala Bidang', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(337, '2025-07-01 02:27:45', '2025-07-01 02:27:45', 'Rumah Sakit Jiwa', 'Bidang Jiwa Pengawasan', 'Budi Anjani', '198026189744', 'Kepala Bidang', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(338, '2025-07-01 02:27:45', '2025-07-01 02:27:45', 'Sekretariat DPRD Provinsi Maluku Utara', 'Sekretariat', 'Agus Wulandari', '1975201540992', 'Sekretaris', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(339, '2025-07-01 02:27:45', '2025-07-01 02:27:45', 'Sekretariat DPRD Provinsi Maluku Utara', 'Bidang DPRD Perencanaan', 'Agus Saputra', '1980140033635', 'Kepala Bidang', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(340, '2025-07-01 02:27:45', '2025-07-01 02:27:45', 'Sekretariat DPRD Provinsi Maluku Utara', 'Bidang DPRD Pelayanan', 'Rina Fadillah', '1980954102876', 'Kepala Bidang', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO `opd_penanggung_jawab` (`id`, `created_at`, `updated_at`, `nama_opd`, `nama_bidang_opd`, `nama`, `nip`, `jabatan`, `tahun`, `jenis_dokumen`, `kegiatan_id`, `sub_kegiatan_id`, `tujuan_id`, `sasaran_id`, `program_id`, `misi_id`) VALUES
(341, '2025-07-01 02:27:45', '2025-07-01 02:27:45', 'Sekretariat DPRD Provinsi Maluku Utara', 'Bidang DPRD Pengembangan', 'Bayu Fadillah', '1980319960278', 'Kepala Bidang', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(342, '2025-07-01 02:27:45', '2025-07-01 02:27:45', 'Sekretariat DPRD Provinsi Maluku Utara', 'Bidang DPRD Pengawasan', 'Agus Nuraini', '1980713614630', 'Kepala Bidang', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(343, '2025-07-01 02:27:45', '2025-07-01 02:27:45', 'Dinas Komunikasi, Informatika dan Persandian', 'Sekretariat', 'Hendra Wulandari', '1975674903168', 'Sekretaris', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(344, '2025-07-01 02:27:45', '2025-07-01 02:27:45', 'Dinas Komunikasi, Informatika dan Persandian', 'Bidang Komunikasi, Perencanaan', 'Fitri Anjani', '1980237720500', 'Kepala Bidang', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(345, '2025-07-01 02:27:45', '2025-07-01 02:27:45', 'Dinas Komunikasi, Informatika dan Persandian', 'Bidang Komunikasi, Pelayanan', 'Fitri Fadillah', '1980480624839', 'Kepala Bidang', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(346, '2025-07-01 02:27:45', '2025-07-01 02:27:45', 'Dinas Komunikasi, Informatika dan Persandian', 'Bidang Komunikasi, Pengembangan', 'Siti Wijaya', '1980991284809', 'Kepala Bidang', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(347, '2025-07-01 02:27:45', '2025-07-01 02:27:45', 'Dinas Komunikasi, Informatika dan Persandian', 'Bidang Komunikasi, Pengawasan', 'Andi Kurniawan', '1980283826548', 'Kepala Bidang', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(348, '2025-07-06 01:26:12', '2025-07-06 01:26:12', 'Dinas Pangan', 'Dinas Pangan', 'Dheny Tjan', '198210102002121005', 'Kepala Dinas', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);

-- --------------------------------------------------------

--
-- Struktur dari tabel `penatausahaan`
--

CREATE TABLE `penatausahaan` (
  `id` int NOT NULL,
  `tahun` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `periode_id` int NOT NULL,
  `tanggal_transaksi` datetime NOT NULL,
  `uraian` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `jumlah` double NOT NULL,
  `jenis_transaksi` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `bukti` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `sumber_dana` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `jenis_dokumen` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `dpa_id` int DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Struktur dari tabel `pengkeg`
--

CREATE TABLE `pengkeg` (
  `id` int NOT NULL,
  `tahun` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `periode_id` int NOT NULL,
  `nama_kegiatan` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `realisasi_fisik` double DEFAULT NULL,
  `realisasi_keuangan` double DEFAULT NULL,
  `keterangan` text COLLATE utf8mb4_unicode_ci,
  `jenis_dokumen` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `dpa_id` int DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Struktur dari tabel `peran_hak_kewenangan`
--

CREATE TABLE `peran_hak_kewenangan` (
  `id` int NOT NULL,
  `role_id` int NOT NULL,
  `hak_kewenangan` varchar(255) NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

-- --------------------------------------------------------

--
-- Struktur dari tabel `periode_rpjmds`
--

CREATE TABLE `periode_rpjmds` (
  `id` int NOT NULL,
  `nama` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `tahun_awal` int NOT NULL,
  `tahun_akhir` int NOT NULL,
  `createdAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data untuk tabel `periode_rpjmds`
--

INSERT INTO `periode_rpjmds` (`id`, `nama`, `tahun_awal`, `tahun_akhir`, `createdAt`, `updatedAt`) VALUES
(1, 'RPJMD 2020-2024', 2020, 2024, '2025-06-06 10:00:40', '2025-06-06 10:00:40'),
(2, 'RPJMD 2025-2029', 2025, 2029, '2025-06-06 10:00:40', '2025-06-06 10:00:40');

-- --------------------------------------------------------

--
-- Struktur dari tabel `prioritas_daerah`
--

CREATE TABLE `prioritas_daerah` (
  `id` bigint UNSIGNED NOT NULL,
  `kode_prioda` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `uraian_prioda` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `opd_tujuan` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `nama_prioda` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Nama lengkap prioritas daerah',
  `tahun` int DEFAULT NULL,
  `jenis_dokumen` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `periode_id` int NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data untuk tabel `prioritas_daerah`
--

INSERT INTO `prioritas_daerah` (`id`, `kode_prioda`, `uraian_prioda`, `opd_tujuan`, `nama_prioda`, `tahun`, `jenis_dokumen`, `periode_id`) VALUES
(1, 'PPD-01', 'Memperkuat pembangunan sumber daya manusia (SDM) dan penanggulangan kemiskinan', 'Dinas Pendidikan dan Kebudayaan', 'Penguatan SDM dan Penanggulangan Kemiskinan', 2025, 'rpjmd', 2),
(2, 'PPD-02', 'Memperkuat kualitas transformasi struktural dan pertumbuhan ekonomi yang inklusif dan berdaya saing', 'Dinas Kesehatan,RSUD dr. Chasan Boesoirie,RSU Sofifi', 'Transformasi Ekonomi Inklusif dan Berdaya Saing', 2025, 'rpjmd', 2),
(3, 'PPD-03', 'Mengembangkan wilayah dan menjamin pemerataan, infrastruktur dasar', 'Dinas Perhubungan', 'Pengembangan Wilayah dan Pemerataan Infrastruktur', 2025, 'rpjmd', 2),
(4, 'PPD-04', 'Mengakselerasi Reformasi Birokrasi Dan Inovasi Daerah', 'Badan Kepegawaian Daerah', 'Akselerasi Reformasi Birokrasi dan Inovasi Daerah', 2025, 'rpjmd', 2),
(5, 'PPD-05', 'Membangun lingkungan hidup dan ketahanan bencana', 'Dinas Pangan,Dinas Pertanian,Dinas Kelautan dan Perikanan,Badan Penanggulangan Bencana Daerah', 'Lingkungan Hidup dan Ketahanan Bencana', 2025, 'rpjmd', 2),
(6, 'PPD-06', 'Memajukan Kebudayaan Daerah & Memperkuat Harmoni Sosial', 'Dinas Pendidikan dan Kebudayaan,Dinas Kepemudaan dan Olahraga', 'Kemajuan Kebudayaan dan Harmoni Sosial', 2025, 'rpjmd', 2);

-- --------------------------------------------------------

--
-- Struktur dari tabel `prioritas_kepala_daerah`
--

CREATE TABLE `prioritas_kepala_daerah` (
  `id` bigint UNSIGNED NOT NULL,
  `kode_priogub` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `uraian_priogub` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `opd_tujuan` text COLLATE utf8mb4_unicode_ci,
  `nama_priogub` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Nama Prioritas Gubernur',
  `standar_layanan_opd` text COLLATE utf8mb4_unicode_ci,
  `sasaran_id` int DEFAULT NULL,
  `tahun` int DEFAULT NULL,
  `jenis_dokumen` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `periode_id` int NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data untuk tabel `prioritas_kepala_daerah`
--

INSERT INTO `prioritas_kepala_daerah` (`id`, `kode_priogub`, `uraian_priogub`, `opd_tujuan`, `nama_priogub`, `standar_layanan_opd`, `sasaran_id`, `tahun`, `jenis_dokumen`, `periode_id`) VALUES
(1, 'PPG-01', 'Membangun rumah sakit dengan standar internasional, dilengkapi fasilitas modern dan SDM profesional untuk meningkatkan layanan kesehatan masyarakat.', 'Dinas Kesehatan,RSUD dr. Chasan Boesoirie,RSU Sofifi,Dinas Pekerjaan Umum dan Penataan Ruang', 'Pembangunan Rumah Sakit Berkualitas & Bertaraf Internasional', '- Dinas Kesehatan: Menyusun kebijakan pelayanan kesehatan dan pengelolaan SDM medis. - Dinas PUPR: Merancang dan membangun infrastruktur rumah sakit. - Bappeda: Merencanakan dan mengoordinasikan pembangunan rumah sakit. - Biro Kesra Setda: Mengkoordinasikan kebijakan kesejahteraan rakyat. - RSU Sofifi & RSUD dr. Chasan Boesoirie: Pelaksana teknis pembangunan dan pengelolaan rumah sakit yang sesuai standar.', NULL, 2025, 'rpjmd', 2),
(2, 'PPG-02', 'Menyediakan pelayanan kesehatan gratis bagi masyarakat yang tidak mampu untuk meningkatkan kualitas hidup dan kesehatan.', 'Dinas Kesehatan,Dinas Sosial,RSUD dr. Chasan Boesoirie,RSU Sofifi', 'Penyediaan Pelayanan Kesehatan Gratis', '- Dinas Kesehatan: Menyusun kebijakan dan program pelayanan kesehatan gratis. - Dinas Sosial: Menyalurkan bantuan sosial terkait kesehatan. - RSU Sofifi & RSUD dr. Chasan Boesoirie: Pelaksanaan pelayanan medis secara gratis dan menyenangkan.', NULL, 2025, 'rpjmd', 2),
(3, 'PPG-03', 'Memberikan makanan bergizi untuk kelompok sasaran agar mendukung tumbuh kembang anak dan ibu.', 'Dinas Kesehatan,Dinas Pendidikan dan Kebudayaan,Dinas Pekerjaan Umum dan Penataan Ruang,Dinas Pangan', 'Pemberian Makanan Bergizi Untuk Siswa, Santri, Ibu Hamil, Ibu Menyusui, dan Balita', '- Dinas Kesehatan: Mengatur program pemberian makanan bergizi. - Dinas Pendidikan dan Kebudayaan: Menyusun kebijakan terkait distribusi makanan bergizi untuk siswa. - Dinas Pangan: Menyediakan bahan pangan yang bergizi.', NULL, 2025, 'rpjmd', 2),
(4, 'PPG-04', 'Meningkatkan kualitas sarana dan prasarana pendidikan untuk mendukung pembelajaran yang optimal.', 'Dinas Pendidikan dan Kebudayaan,Dinas Pekerjaan Umum dan Penataan Ruang', 'Revitalisasi Sarana Dan Prasarana Sekolah / Madrasah Yang Berkualitas', '- Dinas Pendidikan dan Kebudayaan: Merencanakan dan melaksanakan revitalisasi sarana pendidikan. - Dinas PUPR: Menyediakan infrastruktur pendukung sekolah.', NULL, 2025, 'rpjmd', 2),
(5, 'PPG-05', 'Menyediakan pendidikan SMA/SMK gratis dan beasiswa untuk mahasiswa, khususnya bagi keluarga kurang mampu.', 'Dinas Pendidikan dan Kebudayaan', 'Pendidikan SMA/SMK Gratis Inovatif dan Bantuan Beasiswa Untuk Akses Perguruan Tinggi', '- Dinas Pendidikan dan Kebudayaan: Menyusun kebijakan pendidikan gratis dan beasiswa.', NULL, 2025, 'rpjmd', 2),
(6, 'PPG-06', 'Meningkatkan kualitas hidup perempuan melalui program-program yang mendukung pemberdayaan ekonomi, sosial, dan politik.', 'Dinas Pemberdayaan Perempuan dan Perlindungan Anak,Dinas Sosial', 'Pemberdayaan Perempuan', '- Dinas Pemberdayaan Perempuan dan Perlindungan Anak: Merancang program pemberdayaan perempuan. - Dinas Sosial: Menyalurkan bantuan sosial untuk perempuan.', NULL, 2025, 'rpjmd', 2),
(7, 'PPG-07', 'Memberikan pelatihan, kesempatan kerja, dan program pemberdayaan bagi pemuda untuk berkontribusi pada pembangunan daerah.', 'Dinas Kepemudaan dan Olahraga,Dinas Sosial', 'Pemberdayaan Pemuda', '- Dinas Kepemudaan dan Olahraga: Merancang program pemberdayaan pemuda. - Dinas Sosial: Menyediakan pelatihan dan pengembangan kapasitas pemuda.', NULL, 2025, 'rpjmd', 2),
(8, 'PPG-08', 'Pembangunan fasilitas olahraga untuk meningkatkan prestasi dan partisipasi masyarakat dalam olahraga.', 'Dinas Kepemudaan dan Olahraga,Dinas Pekerjaan Umum dan Penataan Ruang', 'Pembangunan Sarana Dan Prasarana Olahraga', '- Dinas Kepemudaan dan Olahraga: Menyusun kebijakan dan merencanakan pembangunan sarana olahraga. - Dinas PUPR: Membangun infrastruktur fasilitas olahraga.', NULL, 2025, 'rpjmd', 2),
(9, 'PPG-09', 'Menyediakan alat tangkap nelayan untuk meningkatkan hasil tangkapan dan kesejahteraan nelayan.', 'Dinas Kelautan dan Perikanan,Dinas Sosial', 'Bantuan/Pengadaan Alat Tangkap Nelayan', '- Dinas Kelautan dan Perikanan: Merancang program bantuan alat tangkap nelayan. - Dinas Sosial: Menyalurkan bantuan alat tangkap untuk nelayan.', NULL, 2025, 'rpjmd', 2),
(10, 'PPG-10', 'Memperkuat ekosistem pertanian dan distribusi makanan bergizi agar tercapai ketahanan pangan yang berkualitas.', 'Dinas Pertanian,Dinas Pangan,Dinas Kesehatan', 'Penguatan Ekosistem Pendukung Pemberian Makanan Bergizi', '- Dinas Pertanian: Menyediakan bahan pangan bergizi. - Dinas Pangan: Mengelola distribusi dan akses pangan bergizi. - Dinas Kesehatan: Mengawasi konsumsi makanan bergizi di masyarakat.', NULL, 2025, 'rpjmd', 2),
(11, 'PPG-11', 'Mengembangkan Usaha Mikro Kecil dan Menengah berbasis budaya lokal untuk meningkatkan ekonomi daerah.', 'Dinas Koperasi Usaha Kecil dan Menengah,Dinas Pariwisata', 'Pengembangan UMKM Berbasis Budaya', '- Dinas Koperasi Usaha Kecil dan Menengah: Menyusun program pengembangan UMKM. - Dinas Pariwisata: Memfasilitasi pengembangan UMKM berbasis budaya.', NULL, 2025, 'rpjmd', 2),
(12, 'PPG-12', 'Mempercepat pembangunan destinasi wisata unggulan untuk mendukung sektor pariwisata.', 'Dinas Pariwisata,Badan Perencanaan dan Pembangunan Daerah', 'Percepatan Pembangunan Destinasi Pariwisata', '- Dinas Pariwisata: Merancang dan melaksanakan pembangunan destinasi wisata. - Badan Perencanaan dan Pembangunan Daerah: Merencanakan pembangunan kawasan wisata.', NULL, 2025, 'rpjmd', 2),
(13, 'PPG-13', 'Melaksanakan reformasi birokrasi untuk meningkatkan efisiensi dan transparansi pemerintah.', 'Badan Kepegawaian Daerah,Biro Organisasi Setda', 'Mewujudkan Transformasi Birokrasi', '- Badan Kepegawaian Daerah: Merancang kebijakan dan reformasi birokrasi. - Biro Organisasi Setda: Melaksanakan perubahan organisasi.', NULL, 2025, 'rpjmd', 2),
(14, 'PPG-14', 'Menyalurkan bantuan sosial bagi rumah ibadah, imam, pendeta, ASN, dan buruh untuk meningkatkan kesejahteraan sosial.', 'Dinas Sosial,Badan Kesatuan Bangsa dan Politik', 'Penyaluran Bantuan Sosial Bagi Rumah Ibadah, Imam, Pendeta, ASN, dan Buruh', '- Dinas Sosial: Menyusun dan melaksanakan penyaluran bantuan sosial. - Badan Kesatuan Bangsa dan Politik: Mengkoordinasikan penyaluran bantuan sosial.', NULL, 2025, 'rpjmd', 2),
(15, 'PPG-15', 'Memastikan ketersediaan pangan dan pengendalian harga bahan pokok di Maluku Utara.', 'Dinas Pangan,Dinas Pertanian', 'Mewujudkan Ketahanan Pangan Untuk Maluku Utara Dan Pengendalian Harga Barito Dan Sembako', '- Dinas Pangan: Mengelola ketahanan pangan dan distribusi sembako. - Dinas Pertanian: Menyediakan bahan pangan lokal.', NULL, 2025, 'rpjmd', 2),
(16, 'PPG-16', 'Membangun kawasan Sofifi sebagai pusat pemerintahan dan pembangunan metropolitan.', 'Badan Perencanaan dan Pembangunan Daerah,Dinas Pekerjaan Umum dan Penataan Ruang', 'Perencanaan Dan Pembangunan Kawasan Sofifi Halmahera Metropolitan', '- Badan Perencanaan dan Pembangunan Daerah: Merencanakan pembangunan kawasan Sofifi. - Dinas PUPR: Membangun infrastruktur di kawasan Sofifi.', NULL, 2025, 'rpjmd', 2),
(17, 'PPG-17', 'Menyediakan akses air bersih dan sanitasi yang berkelanjutan bagi masyarakat.', 'Dinas Pekerjaan Umum dan Penataan Ruang,Dinas Lingkungan Hidup', 'Penyediaan Sarana Air Bersih Dan Sanitasi Berkelanjutan', '- Dinas Pekerjaan Umum dan Penataan Ruang: Merencanakan dan membangun sarana air bersih. - Dinas Lingkungan Hidup: Mengelola kualitas sanitasi.', NULL, 2025, 'rpjmd', 2),
(18, 'PPG-18', 'Membangun rumah layak huni dan fasilitas dapur sehat untuk masyarakat.', 'Dinas Perumahan dan Kawasan Permukiman', 'Pembangunan Rumah Layak Huni / Dapur Sehat', '- Dinas Perumahan dan Kawasan Permukiman: Membangun rumah layak huni.', NULL, 2025, 'rpjmd', 2),
(19, 'PPG-19', 'Pembangunan jaringan listrik dan telekomunikasi untuk mendukung kebutuhan dasar masyarakat.', 'Dinas Energi dan Sumber Daya Mineral,Dinas Komunikasi, Informatika dan Persandian', 'Pembangunan Listrik Dan Jaringan Telekomunikasi', '- Dinas Energi dan Sumber Daya Mineral: Merencanakan dan membangun jaringan listrik. - Dinas Komunikasi, Informatika dan Persandian: Membangun jaringan telekomunikasi.', NULL, 2025, 'rpjmd', 2),
(20, 'PPG-20', 'Membangun jalur transportasi yang efisien untuk memperlancar konektivitas antar daerah.', 'Dinas Perhubungan,Dinas Pekerjaan Umum dan Penataan Ruang', 'Pembangunan Jalur Transportasi Yang Efisien Dari Sofifi-Kulo-Maba', '- Dinas Perhubungan: Merencanakan dan membangun jalur transportasi. - Dinas PUPR: Membangun infrastruktur transportasi.', NULL, 2025, 'rpjmd', 2),
(21, 'PPG-21', 'Membangun dan memperbaiki jalan serta jembatan untuk mendukung aksesibilitas dan distribusi barang.', 'Dinas Pekerjaan Umum dan Penataan Ruang', 'Pembangunan Jalan Dan Jembatan', '- Dinas Pekerjaan Umum dan Penataan Ruang: Merencanakan dan membangun jalan dan jembatan.', NULL, 2025, 'rpjmd', 2),
(22, 'PPG-22', 'Membangun akses jalan tani untuk mempermudah distribusi hasil pertanian.', 'Dinas Pertanian,Dinas Pekerjaan Umum dan Penataan Ruang', 'Pembangunan Akses Jalan Tani', '- Dinas Pertanian: Menyusun program pembangunan jalan tani. - Dinas PUPR: Membangun jalan tani.', NULL, 2025, 'rpjmd', 2);

-- --------------------------------------------------------

--
-- Struktur dari tabel `prioritas_nasional`
--

CREATE TABLE `prioritas_nasional` (
  `id` bigint UNSIGNED NOT NULL,
  `kode_prionas` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `uraian_prionas` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `sumber` text COLLATE utf8mb4_unicode_ci,
  `nama_prionas` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Nama lengkap prioritas nasional',
  `tahun` int DEFAULT NULL,
  `jenis_dokumen` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `periode_id` int NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data untuk tabel `prioritas_nasional`
--

INSERT INTO `prioritas_nasional` (`id`, `kode_prionas`, `uraian_prionas`, `sumber`, `nama_prionas`, `tahun`, `jenis_dokumen`, `periode_id`) VALUES
(1, 'PPN-01', 'Meningkatkan akses, kualitas, dan relevansi pendidikan untuk mencetak sumber daya manusia yang unggul dan berdaya saing, mulai dari pendidikan dasar hingga tinggi serta pendidikan vokasi dan karakter.', 'RPJMN 2025–2029', 'Bidang Pendidikan', 2025, 'rpjmd', 2),
(2, 'PPN-02', 'Memperkuat sistem kesehatan nasional melalui peningkatan layanan kesehatan yang merata, terjangkau, dan berkualitas, termasuk penanganan stunting, penyakit menular, dan sistem ketahanan kesehatan.', 'RPJMN 2025–2029', 'Bidang Kesehatan', 2025, 'rpjmd', 2),
(3, 'PPN-03', 'Membangun dan memperluas infrastruktur dasar dan strategis untuk mendukung konektivitas, logistik, pelayanan publik, serta mendorong pertumbuhan ekonomi yang merata dan berkelanjutan.', 'RPJMN 2025–2029', 'Bidang Infrastruktur', 2025, 'rpjmd', 2),
(4, 'PPN-04', 'Mewujudkan kedaulatan dan ketahanan pangan dengan mendorong produksi, distribusi, dan konsumsi pangan secara berkelanjutan, serta memperkuat sistem logistik dan cadangan pangan nasional.', 'RPJMN 2025–2029', 'Bidang Pangan', 2025, 'rpjmd', 2),
(5, 'PPN-05', 'Pengolahan sumber daya alam untuk menciptakan produk bernilai tambah dan menciptakan lapangan kerja.', 'RPJMN 2025–2029', 'Bidang Hilirisasi', 2025, 'rpjmd', 2),
(6, 'PPN-06', 'Penguatan sektor pertahanan untuk menjaga kedaulatan negara dan melindungi kepentingan nasional.', 'RPJMN 2025–2029', 'Bidang Pertahanan', 2025, 'rpjmd', 2),
(7, 'PPN-07', 'Pengembangan teknologi untuk mendukung inovasi, ekonomi digital, dan daya saing nasional.', 'RPJMN 2025–2029', 'Bidang Teknologi', 2025, 'rpjmd', 2),
(8, 'PPN-08', 'Meningkatkan efisiensi dan transparansi birokrasi serta mempercepat pelayanan publik.', 'RPJMN 2025–2029', 'Bidang Reformasi Birokrasi', 2025, 'rpjmd', 2),
(9, 'PPN-09', 'Pengelolaan sumber daya alam secara berkelanjutan dan perlindungan lingkungan hidup.', 'RPJMN 2025–2029', 'Bidang Sumber Daya Alam dan Lingkungan Hidup', 2025, 'rpjmd', 2),
(10, 'PPN-10', 'Penguatan sistem keuangan negara dan kebijakan pajak yang lebih adil dan progresif.', 'RPJMN 2025–2029', 'Bidang Keuangan dan Pajak', 2025, 'rpjmd', 2),
(11, 'PPN-11', 'Meningkatkan kualitas hidup dan ekonomi di daerah-daerah tertinggal.', 'RPJMN 2025–2029', 'Bidang Pembangunan Daerah Tertinggal', 2025, 'rpjmd', 2),
(12, 'PPN-12', 'Penyediaan perumahan yang terjangkau dan pemenuhan kebutuhan dasar permukiman.', 'RPJMN 2025–2029', 'Bidang Perumahan dan Permukiman', 2025, 'rpjmd', 2),
(13, 'PPN-13', 'Program pendukung bagi UKM untuk mengembangkan kapasitas produksi dan pemasaran.', 'RPJMN 2025–2029', 'Bidang Pengembangan Usaha Kecil dan Menengah (UKM)', 2025, 'rpjmd', 2),
(14, 'PPN-14', 'Pengembangan sektor industri kreatif serta digitalisasi ekonomi untuk mendorong pertumbuhan ekonomi.', 'RPJMN 2025–2029', 'Bidang Industri Kreatif dan Ekonomi Digital', 2025, 'rpjmd', 2),
(15, 'PPN-15', 'Pengembangan sektor pariwisata dengan pendekatan ramah lingkungan dan berkelanjutan.', 'RPJMN 2025–2029', 'Bidang Pariwisata dan Ekonomi Berkelanjutan', 2025, 'rpjmd', 2),
(16, 'PPN-16', 'Diversifikasi sumber energi untuk menciptakan ketahanan energi yang lebih baik.', 'RPJMN 2025–2029', 'Bidang Keamanan Energi', 2025, 'rpjmd', 2),
(17, 'PPN-17', 'Peningkatan kapasitas SDM untuk menyongsong era kemajuan teknologi dan globalisasi.', 'RPJMN 2025–2029', 'Bidang Pembangunan Sumber Daya Manusia (SDM)', 2025, 'rpjmd', 2),
(18, 'PPN-18', 'Memperkuat kebudayaan nasional dan identitas bangsa dalam menghadapi tantangan global.', 'RPJMN 2025–2029', 'Bidang Kebudayaan dan Identitas Nasional', 2025, 'rpjmd', 2),
(19, 'PPN-19', 'Mempercepat pembangunan infrastruktur TIK untuk mendukung kemajuan ekonomi digital.', 'RPJMN 2025–2029', 'Bidang Pembangunan Infrastruktur Teknologi Informasi dan Komunikasi', 2025, 'rpjmd', 2),
(20, 'PPN-20', 'Pengelolaan sumber daya alam secara bijaksana, memastikan kelestarian & manfaat jangka panjang.', 'RPJMN 2025–2029', 'Bidang Pengelolaan Sumber Daya Alam yang Berkelanjutan', 2025, 'rpjmd', 2);

-- --------------------------------------------------------

--
-- Struktur dari tabel `program`
--

CREATE TABLE `program` (
  `id` int UNSIGNED NOT NULL,
  `sasaran_id` int NOT NULL,
  `nama_program` varchar(255) NOT NULL,
  `kode_program` varchar(50) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `rpjmd_id` int DEFAULT NULL,
  `prioritas` enum('Tinggi','Sedang','Rendah') DEFAULT 'Sedang',
  `opd_penanggung_jawab` varchar(255) DEFAULT NULL,
  `bidang_opd_penanggung_jawab` varchar(255) DEFAULT NULL,
  `periode_id` int DEFAULT NULL,
  `jenis_dokumen` varchar(255) DEFAULT NULL,
  `tahun` int DEFAULT NULL,
  `pagu_anggaran` bigint UNSIGNED DEFAULT '0',
  `total_pagu_anggaran` bigint DEFAULT '0',
  `locked_pagu` tinyint(1) DEFAULT '0'
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

--
-- Dumping data untuk tabel `program`
--

INSERT INTO `program` (`id`, `sasaran_id`, `nama_program`, `kode_program`, `created_at`, `updated_at`, `rpjmd_id`, `prioritas`, `opd_penanggung_jawab`, `bidang_opd_penanggung_jawab`, `periode_id`, `jenis_dokumen`, `tahun`, `pagu_anggaran`, `total_pagu_anggaran`, `locked_pagu`) VALUES
(9, 1, 'PROGRAM DINAS KESEHATAN', '1.01.01.', '2025-08-13 12:24:41', '2025-08-13 12:36:28', 2, 'Rendah', '118', 'Bidang Kesehatan Pelayanan', 2, 'rpjmd', 2025, 0, 2500000, 0),
(10, 2, 'PROGRAM DINAS PENDIDIKAN', '1.01.02.', '2025-08-13 12:29:02', '2025-08-13 12:37:47', 2, 'Sedang', '113', 'Bidang Pendidikan Pelayanan', 2, 'rpjmd', 2025, 0, 25000000, 0);

-- --------------------------------------------------------

--
-- Struktur dari tabel `program_arah_kebijakan`
--

CREATE TABLE `program_arah_kebijakan` (
  `program_id` int UNSIGNED NOT NULL,
  `arah_kebijakan_id` int NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `strategi_id` int DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data untuk tabel `program_arah_kebijakan`
--

INSERT INTO `program_arah_kebijakan` (`program_id`, `arah_kebijakan_id`, `created_at`, `updated_at`, `strategi_id`) VALUES
(9, 1, '2025-08-13 12:24:42', '2025-08-13 12:24:42', 1),
(9, 2, '2025-08-13 12:24:42', '2025-08-13 12:24:42', 1),
(10, 3, '2025-08-13 12:29:02', '2025-08-13 12:29:02', 2),
(10, 4, '2025-08-13 12:29:02', '2025-08-13 12:29:02', 2);

-- --------------------------------------------------------

--
-- Struktur dari tabel `program_opd`
--

CREATE TABLE `program_opd` (
  `id` int NOT NULL,
  `kebijakan_id` int NOT NULL,
  `program_id` int NOT NULL,
  `kode_program` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `nama_program` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `indikator_program` text COLLATE utf8mb4_unicode_ci,
  `opd_penanggung_jawab` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `bidang_opd_penanggung_jawab` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Struktur dari tabel `program_skpd`
--

CREATE TABLE `program_skpd` (
  `id` bigint UNSIGNED NOT NULL,
  `program_prioritas_id` int NOT NULL,
  `division_id` int NOT NULL,
  `kode_program` varchar(255) NOT NULL,
  `nama_program` varchar(255) NOT NULL,
  `tahun` int NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `program_id` int UNSIGNED DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

-- --------------------------------------------------------

--
-- Struktur dari tabel `program_strategi`
--

CREATE TABLE `program_strategi` (
  `program_id` int UNSIGNED NOT NULL,
  `strategi_id` int NOT NULL,
  `createdAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data untuk tabel `program_strategi`
--

INSERT INTO `program_strategi` (`program_id`, `strategi_id`, `createdAt`, `updatedAt`) VALUES
(9, 1, '2025-08-13 12:24:42', '2025-08-13 12:24:42'),
(10, 2, '2025-08-13 12:29:02', '2025-08-13 12:29:02');

-- --------------------------------------------------------

--
-- Struktur dari tabel `realisasisubkegiatans`
--

CREATE TABLE `realisasisubkegiatans` (
  `id` int NOT NULL,
  `sub_kegiatan_id` int DEFAULT NULL,
  `tahun` int DEFAULT NULL,
  `triwulan` int DEFAULT NULL,
  `target_fisik` float DEFAULT NULL,
  `realisasi_fisik` float DEFAULT NULL,
  `target_anggaran` float DEFAULT NULL,
  `realisasi_anggaran` float DEFAULT NULL,
  `kendala` text,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

-- --------------------------------------------------------

--
-- Struktur dari tabel `realisasi_indikator`
--

CREATE TABLE `realisasi_indikator` (
  `id_realisasi` int NOT NULL,
  `indikator_id` int NOT NULL,
  `periode` smallint DEFAULT NULL,
  `nilai_realisasi` decimal(10,0) NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `id` int NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

-- --------------------------------------------------------

--
-- Struktur dari tabel `realisasi_sub_kegiatan`
--

CREATE TABLE `realisasi_sub_kegiatan` (
  `id` int NOT NULL,
  `sub_kegiatan_id` int NOT NULL,
  `tahun` int NOT NULL,
  `triwulan` int NOT NULL,
  `target_fisik` float DEFAULT NULL,
  `realisasi_fisik` float DEFAULT NULL,
  `target_anggaran` float DEFAULT NULL,
  `realisasi_anggaran` float DEFAULT NULL,
  `kendala` text,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

-- --------------------------------------------------------

--
-- Struktur dari tabel `realisasi_sub_kegiatan_rpjmd`
--

CREATE TABLE `realisasi_sub_kegiatan_rpjmd` (
  `id` int NOT NULL,
  `sub_kegiatan_id` int NOT NULL,
  `tahun` int NOT NULL,
  `capaian_output` float NOT NULL,
  `keterangan` text,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

-- --------------------------------------------------------

--
-- Struktur dari tabel `rekomendasi_otomatis`
--

CREATE TABLE `rekomendasi_otomatis` (
  `id` int NOT NULL,
  `evaluasi_id` int NOT NULL,
  `hasil_analisis` text NOT NULL,
  `rekomendasi` text NOT NULL,
  `dibuat_oleh` varchar(255) DEFAULT NULL,
  `dibuat_tanggal` datetime DEFAULT CURRENT_TIMESTAMP,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

-- --------------------------------------------------------

--
-- Struktur dari tabel `renja`
--

CREATE TABLE `renja` (
  `id` int NOT NULL,
  `tahun` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `periode_id` int NOT NULL,
  `program` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `kegiatan` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `sub_kegiatan` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `indikator` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `target` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `anggaran` double DEFAULT NULL,
  `jenis_dokumen` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `rkpd_id` int DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Struktur dari tabel `renstra_bab`
--

CREATE TABLE `renstra_bab` (
  `id` int NOT NULL,
  `tahun` int NOT NULL,
  `bab` varchar(8) COLLATE utf8mb4_unicode_ci NOT NULL,
  `judul_bab` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `subbab` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `isi` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin,
  `updated_by` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
) ;

--
-- Dumping data untuk tabel `renstra_bab`
--

INSERT INTO `renstra_bab` (`id`, `tahun`, `bab`, `judul_bab`, `subbab`, `isi`, `updated_by`, `updated_at`, `created_at`) VALUES
(1, 2025, 'I', 'Pendahuluan', NULL, '[{\"nomor\":\"1\",\"judul\":\"1.1.\\tLatar Belakang\",\"isi\":\"Undang-undang Nomor 25 Tahun 2004 tentang Sistem Perencanaan Pembangunan Nasional dan Undang-Undang Nomor 32 Tahun 2004 tentang Pemerintahan Daerah serta perangkat perundangan merupakan upaya pemerintah dalam merencanakan pembangunan secara lebih efektif dan efisien. Perubahan tersebut menyangkut kewajiban perangkat daerah dalam menyiapkan rencana kerja sebagai acuan penyelenggaraan pembangunan oleh perangkat daerah sesuai tugas dan fungsinya. Selain itu Undang-Undang Nomor 25 Tahun 2004 Pasal 1 ayat 7 menetapkan ketentuan umum mengenai Renstra SKPD sebagai dokumen perencanaan SKPD untuk periode 5(lima) tahun. Sesuai dengan UU No.32 Tahun 2004 Pasal 151 Ayat1 bahwa “Satuan Kerja Perangkat Daerah menyusun rencana Strategis yang selanjutnya disebut Renstra SKPD sesuai dengan tugas dan fungsinya, berpedoman pada RPJM daerah dan bersifat indikatif”.\\nRencana strategis merupakan suatu proses yang berorientasi pada hasil yang ingin dicapai selama kurun waktu satu sampai dengan lima tahun dengan memperhitungkan potensi, peluang, tantangan dan hambatan yang timbul. Rencana strategis Dinas Pangan Maluku Utara Tahun 2025–2026 merupakan bagian  integral dari kebijakan dan program pemerintah Provinsi Maluku Utara dan merupakan landasan dan pedoman bagi seluruh aparat dalam pelaksanaan tugas penyelenggaraan pemerintahan dan pembangunan selama masa transisi kurun waktu 2 (dua) tahun tersebut.\\nProses penyusunan dan penetapan Renstra SKPD dilaksanakan dengan mengacu pada mekanisme perencanaan pembangunan daerah sebagaimana dijabarkan dalam PP Nomor 8 tahun 2008 tentang Tahapan, Tatacara Penyusunan, Pengendalian dan Evaluasi Pelaksanaan Rencana Pembangunan Daerah serta diatur kemudian dalam Peraturan Menteri Dalam Negeri Nomor 54 Tahun 2010 tentang Pelaksanaan PP Nomor 8 Tahun 2008 tentang Tahapan, Tatacara Penyusunan, Pengendalian dan Evaluasi Pelaksanaan Rencana Pembangunan Daerah.\\nRenstra Dinas Pangan merupakan dokumen perencanaan jangka menengah SKPD yang dalam penyusunannya berpedoman pada RPD Provinsi Maluku Utara Tahun 2025–2026. Rencana strategi (Renstra) ini akan dijabarkan dalam Rencana Kerja (Renja) Dinas Pangan sebagai dokumen perencanaan tahunan Dinas Pangan Provinsi Maluku Utara yang memuat prioritas program dan kegiatan.\\nDinas Pangan merupakan unsur pelaksana Pemerintah Provinsi Maluku Utara yang mempunyai tugas membantu Gubernur dalam melaksanakan tugas desentralisasi,  dekonsentrasi dan tugas pembantuan dibidang ketahanan pangan. Menindaklanjuti peraturan perundangan sesuai dengan kebutuhan terhadap penyiapan arah dan langkah yang diwujudkan dalam tahapan pembangunan 5 (lima) tahun, maka Dinas Pangan berkewajiban menyiapkan Renstra Dinas Pangan Tahun 2025-2026 yang merupakan acuan dalam penyelenggaraan pemerintahan dan pembangunan yang menjadi tugas dan fungsinya dalam jangka waktu 2 (dua) tahun yang didalamnya memuat tujuan, sasaran, strategi, kebijakan, program dan kegiatan dengan berpedoman pada RPD Provinsi Maluku Utara Tahun 2025–2026 dan bersifat indikatif.\",\"tipe\":\"textarea\",\"tables\":[]},{\"nomor\":\"2\",\"judul\":\"1.2.\\tLandasan Hukum\",\"isi\":\"Dasar Hukum penyusunan Renstra Dinas Pangan Provinsi Maluku Utara tahun 2025-2026 sebagai berikut:\\n1.\\tUndang-Undang Nomor 46 tahun 1999 tentang Pembentukan Provinsi Maluku Utara, Kabupaten Buru dan Kabupaten Maluku Tenggara Barat (Lembaran Negara Republik Indonesia Tahun 1999 Nomor 174, Tambahan Lembaran Negara Republik Indonesia Nomor 3895);\\n2.\\tUndang-Undang Nomor 28 Tahun 1999 tentang Penyelenggaraan Negara Yang Bersih dan Bebas Korupsi, Kolusi dan Nepotisme (KKN) (Lembaran Negara Republik Indonesia Tahun 1999 Nomor 75, Tambahan Lembaran Negara Republik Indonesia Nomor 3851);\\n3.\\tUndang-Undang Nomor 17 Tahun 2003 tentang Keuangan Negara (Lembaran Negara Republik Indonesia Tahun 2008 Nomor 47, Tambahan Lembaran Negara Republik Indonesia Nomor 4287);\\n4.\\tUndang-Undang Nomor 1 Tahun 2004 Tentang Perbendaharaan Negara (Lembaran Negara Republik Indonesia Tahun 2004 Nomor 5, Tambahan Lembaran Negara Republik Indonesia Nomor 4366);\\n5.\\tUndang-Undang Nomor 15 Tahun 2004 Tentang Pemeriksaan Pengelolaan dan Pertanggungjawaban Keuangan Negara (Lembaran Negara Republik Indonesia Tahun 2004 Nomor 66, Tambahan Lembaran Negara Republik Indonesia Nomor 4400);\\n6.\\tUndang-Undang Nomor 25 Tahun 2004 tentang Sistem Perencanaan Pembangunan Nasional (Lembaran Negara Republik Indonesia Tahun 2004 Nomor 104, Tambahan Lembaran Negara Republik Indonesia Nomor 4421);\\n7.\\tUndang-Undang Nomor 32 Tahun 2004 tentang Pemerintahan Daerah (Lembaran Negara Republik Indonesia Tahun 2004 Nomor 125, Tambahan Lembaran Negara Republik Indonesia Nomor 4437), sebagaimana telah diubah beberapa kali, terakhir dengan Undang-Undang Nomor 12 Tahun 2008 tentang Perubahan Kedua atas Undang-Undang Nomor 32 Tahun 2004 tentang Pemerintahan Daerah (Lembaran Negara Republik Indonesia Tahun 2008 Nomor 59, Tambahan Lembaran Negara Republik Indonesia Nomor 4844);\\n8.\\tUndang-Undang Nomor 33 Tahun 2004 tentang Perimbangan Keuangan antara Pemerintah Pusat dan Pemerintah Daerah (Lembaran Negara Republik Indonesia Tahun 2004 Nomor 126, Tambahan Lembaran Negara Republik Indonesia Nomor 4438); \\n9.\\tUndang-Undang Nomor 17 Tahun 2007 tentang Rencana Pembangunan Jangka Panjang (RPJP) Nasional Tahun 2005–2025 (Lembaran Negara Republik Indonesia Tahun 2007 Nomor 33, Tambahan Lembaran Negara Republik Indonesia Nomor 4700); \\n10.\\tUndang-Undang Nomor 26 Tahun 2007 tentang Penataan Ruang (Lembaran Negara Republik Indonesia Tahun 2007 Nomor 68, Tambahan Lembaran Negara Republik Indonesia Nomor 4725); \\n11.\\tUndang-Undang Nomor 14 Tahun 2008 tentang Keterbukaan Informasi Publik (Lembaran Negara Republik Indonesia Tahun 2008 Nomor 61, Tambahan Lembaran Negara Republik Indonesia Nomor 4846); \\n12.\\tUndang-Undang Nomor 25 Tahun 2009 tentang Pelayanan Publik (Lembaran Negara Republik Indonesia Tahun 2009 Nomor 112, Tambahan Lembaran Negara Republik Indonesia Nomor 5038); \\n13.\\tUndang-Undang Nomor 32 Tahun 2009 tentang Perlindungan dan Pengelolaan Lingkungan Hidup (Lembaran Negara Republik Indonesia Tahun 2009 Nomor 140, Tambahan Lembaran Negara Republik Indonesia Nomor 5059); \\n14.\\tUndang-Undang Nomor 12 Tahun 2011 tentang Pembentukan Peraturan per Undang-Undangan (Lembaran Negara Republik Indonesia Tahun 2011 Nomor 82, Tambahan Lembaran Negara Republik Indonesia Nomor 5234); \\n15.\\tUndang–undang Republik Indonesia Nomor 18 Tahun 2012 tentang Pangan  Publik (Lembaran Negara Republik Indonesia Tahun 2013 Nomor 227);\\n16.\\tUndang-Undang Nomor 1 Tahun 2014 tentang Perubahan Atas Undang Undang Nomor 27 Tahun 2007 tentang Pengelolaan Wilayah Pesisir dan Pulau-Pulau Kecil (Lembaran Negara Republik Indonesia Tahun 2014 Nomor 2, Tambahan Lembaran Negara Republik Indonesia Nomor 5490);\\n17.\\tUndang-Undang No 6 Tahun 2014 tentang Desa (Lembaran Negara Republik Indonesia Tahun 2014 Nomor 7, Tambahan Lembaran Negara Republik Indonesia Nomor 5495); \\n18.\\tUndang-Undang No 23 Tahun 2014 tentang Pemerintahan Daerah (Lembaran Negara Nomor 244, Tambahan Lembaran Negara Nomor 5587);\\n19.\\tPeraturan Pemerintah Nomor 38 Tahun 2007 tentang Pembagian Urusan Pemerintahan antara Pemerintah, Pemerintah Daerah Provinsi dan Pemerintah Daerah Kabupaten/Kota (Lembaran Negara Republik Indonesia Tahun 2007 Nomor 82, Tambahan Lembaran Negara Republik Indonesia Nomor 4737);\\n20.\\tPeraturan Pemerintah Nomor 8 Tahun 2008 tentang Tahapan, Tatacara, Penyusunan, Pengendalian dan Evaluasi Pelaksanaan Rencana Pembangunan Daerah (Lembaran Negara Republik Indonesia Tahun 2008 Nomor 21, Tambahan Lembaran Negara Republik Indonesia Nomor 4817); \\n21.\\tPeraturan Pemerintah Nomor 15 Tahun 2010 tentang Penyelenggaraan Penataan Ruang (Lembaran Negara Republik Indonesia Tahun 2010 Nomor 21, Tambahan Lembaran Negara Republik Indonesia Nomor 5103);\\n22.\\tPeraturan Pemerintah Republik Indonesia Nomor 1 Tahun 2011 Tentang Penetapan Dan Alih Fungsi Lahan Pertanian Pangan Berkelanjutan;\\n23.\\tPeraturan Pemerintah Nomor 43 Tahun 2014 tentang Desa (Lembaran Negara Republik Indonesia Tahun 2014 Nomor 123 dan Tambahan Lembaran Negara Republik Indonesia Nomor 5539);\\n24.\\tPeraturan Pemerintah Nomor 12 Tahun 2019 tentang Pengelolaan Keuangan Daerah (Lembaran Negara Republik Indonesia Tahun 2019 Nomor 42);\\n25.\\tPeraturan Pemerintah Nomor 72 tahun 2019 tentang Perubahan Atas Peraturan Pemerintah Nomor 18 Tahun 2016 tentang Perangkat Daerah (Lembaran Negara Republik Indonesia Tahun 2019 Nomor 187); \\n26.\\tPeraturan Menteri Dalam Negeri Nomor 13 Tahun 2006 tentang Pedoman Pengelolaan Keuangan Daerah sebagaimana telah diubah beberapa kali, terakhir dengan Peraturan Menteri Dalam Negeri Nomor 21 Tahun 2011 tentang Perubahan Kedua Atas Peraturan Menteri Dalam Negeri Nomor 13 Tahun 2006 tentang Pedoman Pengelolaan Keuangan Daerah;\\n27.\\tPeraturan Menteri Dalam Negeri Nomor 30 Tahun 2008 tentang Cadangan Pangan Pemerintah Desa; \\n28.\\tPeraturan Menteri Dalam Negeri Nomor 86 Tahun 2017 tentang Tata Cara Perencanaan, Pengendalian, dan Evaluasi Pembangunan Daerah, Tata Cara Evaluasi Rancangan Peraturan Daerah tentang Rencana Pembangunan Jangka Panjang Daerah dan Rencana Pembangunan Jangka Menengah Daerah, serta Tata Cara Perubahan Rencana Pembangunan Jangka Panjang Daerah, Rencana Pembangunan Jangka Menengah Daerah, dan Rencana Kerja Pemerintah Daerah (Berita Negara Republik Indonesia Nomor 1312, 2017);\\n29.\\tPeraturan Menteri Dalam Negeri Nomor 90 Tahun 2019 tentang Klasifikasi, Kodefikasi dan Nomenklatur Perencanaan Pembangunan da  Keuangan Daerah (Berita Negara Republik Indonesia Tahun 2019 Nomor 1447);\\n30.\\tPeraturan Daerah Provinsi Maluku Utara Nomor     Tahun 2025 tentang Rencana Pembangunan Jangka Panjang Daerah Provinsi Maluku Utara Tahun 2025-2045; \\n31.\\tPeraturan Daerah Provinsi Maluku Utara Nomor 5 Tahun 2012 tentang Sistem Perencanaan Pembangunan Daerah Provinsi Maluku Utara (Lembaran Daerah Provinsi Maluku Utara Tahun 2012 Nomor 5, Tambahan Lembaran Daerah Nomor 5); \\n32.\\tPeraturan Daerah Provinsi Maluku Utara Nomor 2 Tahun 2013 tentang Rencana Tata Ruang Wilayah Provinsi Maluku Utara Tahun 2013–2033 (Lembaran Daerah Provinsi Maluku Utara Tahun 2013 Nomor 2); \\n33.\\tPeraturan Daerah Provinsi Maluku Utara Nomor 5 Tahun 2016 Tentang Pembentukan dan Susunan Perangkat Daerah Provinsi Maluku Utara;\\n34.\\tPeraturan Daerah Provinsi Maluku Utara Nomor 7 Tahun 2020 Tentang Rencana Pembangunan Jangka Menengah Daerah Provinsi Maluku Utara 2020-2024 (Lembaran Daerah Provinsi Maluku Utara Tahun 2020 Nomor 7 Tambahan Lembaran Daerah Provinsi Maluku Utara Nomor 7);\\n35.\\tPeraturan Gubernur Maluku Utara Nomor 54 tahun 2016 tentang Kedudukan, Susunan Organisasi, Tugas dan Fungsi Dinas Pangan Provinsi Maluku Utara;\",\"tipe\":\"textarea\",\"tables\":[]},{\"nomor\":\"3\",\"judul\":\"1.3.\\tMaksud dan Tujuan\",\"isi\":\"1.\\tMaksud\\n\\nRenstra Dinas Pangan Provinsi Maluku Utara Tahun 2025–2026 disusun dengan maksud:\\na.\\tMemberikan arah pembangunan ketahanan pangan untuk kurun waktu 2 (dua) tahun sesuai dengan tugas dan fungsi Dinas Pangan sebagai  penjabaran atas Rencana Pembangunan Daerah Provinsi Maluku Utara tahun 2025–2026.\\nb.\\tMemberikan pedoman dalam menyusun Rencana Kerja (Renja) Tahunan Dinas Pangan selama kurun waktu 5 (lima) tahun.\\n2.\\tTujuan\\n\\nRenstra Dinas Pangan Provinsi Maluku Utara Tahun 2025–2026 disusun dengan tujuan :\\n\\na.\\tMewujudkan Visi dan Misi Daerah Periode 2025–2026 melalui kebijakan dan program ketahanan pangan dilaksanakan secara sinergis, terpadu dan berkesinambungan dengan memanfaatkan sumberdaya secara efisien dan efektif;\\nb.\\tMewujudkan sinkronisasi dan sinergitas pembangunan antara Renstra Dinas Pangan Provinsi Maluku Utara dengan visi, misi, tujuan, kebijakan, program RPD Tahun 2025–2026 sesuai dengan tugas pokok dan fungsi;\\nc.\\tMewujudkan partisipasi seluruh pemangku kepentingan sesuai dengan proporsi dan kapasitas yang dimiliki dalam pembangunan ketahanan pangan;\\nd.\\tMenjadi tolokukur kinerja pembangunan ketahanan pangan sebagai dasar dalam pengendalian dan evaluasi penyelenggaraan pemerintahan dan pembangunan selama 2 (dua) tahun;\\ne.\\tMenjadi alat untuk menjamin keterkaitan perencanaan, penganggaran, pelaksanaan dan pengawasan kegiatan Dinas Pangan.\",\"tipe\":\"textarea\",\"tables\":[]},{\"nomor\":\"4\",\"judul\":\"1.4.\\tSistematika Penulisan\",\"isi\":\"Secara sistematika Rencana Strategi Dinas Pangan  Propinsi Maluku Utara Tahun 2025–2026 dapat diuraikan sebagai berikut: \\nBAB I : Pendahuluan\\n1.1.\\tLatar belakang\\n1.2.\\tLandasan hukum\\n1.3.\\tMaksud dan tujuan\\n1.4.\\tSistematika Penulisan\\n\\nBAB II : Gambaran Pelayanan Dinas Pangan\\n2.1. Tugas, fungsi dan struktur organisasi Dinas Pangan\\n2.2. Sumber Daya Dinas Pangan\\n2.3. Kinerja Pelayanan Dinas Pangan\\n2.4. Tantangan dan Peluang Pengembangan Pelayanan Dinas Pangan\\n\\nBAB III : Permasalahan dan Isu-Isu Strategis \\n3.1.  Identifikasi Permasalahan Berdasarkan Tupoksi\\n3.2.  Telaahan Visi Misi dan Program Kepala Daerah\\n3.3.  Telaahan Renstra K/L\\n3.4.  Telaahan Rencana Tata Ruang Wilayah dan Kajian Kajian Lingkungan Hidup Starategis\\n3.5.  Penentuan Isu-Isu Strategis\\n\\nBAB IV : Tujuan dan Sasaran\\n4.1.  Tujuan dan Sasaran Jangka Menengah Dinas Pangan\\n\\nBAB V : Strategi dan Kebijakan\\n\\nBAB VI : Rencana Program dan kegiatan, serta pendanaan indikatif\\n6.1.  Rencana Program dan Kegiatan\\n6.2.  Indikator Kinerja Kelompok Sasaran\\n6.3.  Pendanaan Indikatif\\n\\nBAB VII : Kinerja Penyelenggaraan Bidang Urusan\\n7.1.  indikator Kinerja Dinas Pangan\\n7.2.  Tujuan dan Sasaran Dinas Pangan\\n\\nBAB VIII : Penutup\",\"tipe\":\"textarea\",\"tables\":[]}]', 'admin', '2025-06-04 13:38:58', '2025-06-04 13:38:58');

-- --------------------------------------------------------

--
-- Struktur dari tabel `renstra_kebijakan`
--

CREATE TABLE `renstra_kebijakan` (
  `id` int NOT NULL,
  `strategi_id` int NOT NULL,
  `rpjmd_arah_id` int DEFAULT NULL,
  `kode_kebjkn` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `deskripsi` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `prioritas` enum('Tinggi','Sedang','Rendah') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `no_arah_rpjmd` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `isi_arah_rpjmd` text COLLATE utf8mb4_unicode_ci,
  `jenisDokumen` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'RPJMD',
  `tahun` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '2025',
  `renstra_id` int DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data untuk tabel `renstra_kebijakan`
--

INSERT INTO `renstra_kebijakan` (`id`, `strategi_id`, `rpjmd_arah_id`, `kode_kebjkn`, `deskripsi`, `prioritas`, `no_arah_rpjmd`, `isi_arah_rpjmd`, `jenisDokumen`, `tahun`, `renstra_id`) VALUES
(1, 1, 1, 'AKR-01-01.1.1.01', 'Pengelolaan Kegiatan Perbaikan gizi kesehatan untuk Ibu Hamil', 'Tinggi', 'ASST1-01-01.1.1', 'Perbaikan gizi kesehatan untuk Ibu Hamil', '', '2025', 1),
(2, 1, 2, 'AKR-01-01.1.2.01', 'Pengelolaan Kegiatan Perbaikan Gizi Kesehatan untuk Ibu Menyusui', 'Sedang', 'ASST1-01-01.1.2', 'Perbaikan gizi kesehatan untuk Ibu Menyusui', '', '2025', 1),
(3, 1, 1, 'AKR-01-01.1.1.02', 'Perbaikan gizi kesehatan utuk Ibu Hamil', 'Tinggi', 'ASST1-01-01.1.1', 'Perbaikan gizi kesehatan untuk Ibu Hamil', '', '2025', 1),
(4, 2, 2, 'AKR-01-01.1.2.02', 'Perbaikan gizi kesehatan untuk Ibu Menyusui', 'Tinggi', 'ASST1-01-01.1.2', 'Perbaikan gizi kesehatan untuk Ibu Menyusui', '', '2025', 1),
(5, 3, 3, 'AKR-01-02.1.1.01', 'Mengelola pendidikan yang berkualitas tinggi di jenjang SMA', 'Tinggi', 'ASST1-01-02.1.1', 'Pengelolaan pendidikan yang berkualitas tinggi di jenjang SMA', '', '2025', 1),
(6, 3, 4, 'AKR-01-02.1.2.01', 'Mengelola pendidikan yang berkualitas tinggi di jenjang SMK', 'Tinggi', 'ASST1-01-02.1.2', 'Pengelolaan pendidikan yang berkualitas tinggi di jenjang SMK', '', '2025', 1);

-- --------------------------------------------------------

--
-- Struktur dari tabel `renstra_kegiatan`
--

CREATE TABLE `renstra_kegiatan` (
  `id` int NOT NULL,
  `program_id` int NOT NULL,
  `kode_kegiatan` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `nama_kegiatan` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `bidang_opd` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `renstra_id` int DEFAULT NULL,
  `rpjmd_kegiatan_id` int DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data untuk tabel `renstra_kegiatan`
--

INSERT INTO `renstra_kegiatan` (`id`, `program_id`, `kode_kegiatan`, `nama_kegiatan`, `bidang_opd`, `renstra_id`, `rpjmd_kegiatan_id`) VALUES
(1, 1, '1.01.01.1.01', 'Pengelolaan Layanan Kesehatan Untuk Semua', 'Sekretariat - Dinas Kesehatan', 1, NULL),
(2, 2, '1.01.02.1.01', 'Peningkatan Pendidikan Yang Berkualitas Semua Jenjang', 'Bidang Pendidikan Pelayanan - Dinas Pendidikan dan Kebudayaan', 1, NULL);

-- --------------------------------------------------------

--
-- Struktur dari tabel `renstra_opd`
--

CREATE TABLE `renstra_opd` (
  `id` int NOT NULL,
  `opd_id` int NOT NULL,
  `rpjmd_id` int NOT NULL,
  `bidang_opd` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `sub_bidang_opd` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `tahun_mulai` int NOT NULL,
  `tahun_akhir` int NOT NULL,
  `keterangan` text COLLATE utf8mb4_unicode_ci,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `is_aktif` tinyint(1) NOT NULL DEFAULT '0',
  `nama_opd` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data untuk tabel `renstra_opd`
--

INSERT INTO `renstra_opd` (`id`, `opd_id`, `rpjmd_id`, `bidang_opd`, `sub_bidang_opd`, `tahun_mulai`, `tahun_akhir`, `keterangan`, `created_at`, `updated_at`, `is_aktif`, `nama_opd`) VALUES
(1, 118, 2, 'Sekretariat', 'Sub Bagian Perencanaan', 2025, 2029, 'Dinas Kesehatan', '2025-08-15 12:40:38', '2025-08-15 12:40:38', 1, 'Dinas Kesehatan');

-- --------------------------------------------------------

--
-- Struktur dari tabel `renstra_program`
--

CREATE TABLE `renstra_program` (
  `id` int NOT NULL,
  `kode_program` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `nama_program` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `opd_penanggung_jawab` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `bidang_opd_penanggung_jawab` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `renstra_id` int DEFAULT NULL,
  `rpjmd_program_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data untuk tabel `renstra_program`
--

INSERT INTO `renstra_program` (`id`, `kode_program`, `nama_program`, `opd_penanggung_jawab`, `bidang_opd_penanggung_jawab`, `renstra_id`, `rpjmd_program_id`) VALUES
(1, '1.01.01.', 'PROGRAM DINAS KESEHATAN', 'Dinas Kesehatan', 'Sekretariat', 1, '9'),
(2, '1.01.02.', 'PROGRAM DINAS PENDIDIKAN', 'Dinas Pendidikan dan Kebudayaan', 'Bidang Pendidikan Pelayanan', 1, '10');

-- --------------------------------------------------------

--
-- Struktur dari tabel `renstra_sasaran`
--

CREATE TABLE `renstra_sasaran` (
  `id` int NOT NULL,
  `tujuan_id` int NOT NULL,
  `rpjmd_sasaran_id` int NOT NULL,
  `nomor` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `isi_sasaran` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `no_rpjmd` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `isi_sasaran_rpjmd` text COLLATE utf8mb4_unicode_ci,
  `renstra_id` int DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data untuk tabel `renstra_sasaran`
--

INSERT INTO `renstra_sasaran` (`id`, `tujuan_id`, `rpjmd_sasaran_id`, `nomor`, `isi_sasaran`, `no_rpjmd`, `isi_sasaran_rpjmd`, `renstra_id`) VALUES
(1, 1, 1, 'ST1-01-01', 'Mewujudkan kesehatan untuk semua masyarakat', 'ST1-01-01', 'Mewujudkan kesehatan untuk semua', 1),
(2, 1, 2, 'ST1-01-02', 'Mewujudkan pendidikan yang berkualitas untuk semua jenjang pendidikan menengah', 'ST1-01-02', 'Mewujudkan pendidikan yang berkualitas', 1),
(3, 1, 1, 'ST1-01-01', 'Mewujudkan kesehatan untuk semua', 'ST1-01-01', 'Mewujudkan kesehatan untuk semua', 1),
(4, 1, 2, 'ST1-01-02', 'Mewujudkan pendidikan yang berkualitas', 'ST1-01-02', 'Mewujudkan pendidikan yang berkualitas', 1);

-- --------------------------------------------------------

--
-- Struktur dari tabel `renstra_strategi`
--

CREATE TABLE `renstra_strategi` (
  `id` int NOT NULL,
  `sasaran_id` int NOT NULL,
  `rpjmd_strategi_id` int DEFAULT NULL,
  `kode_strategi` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `deskripsi` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `no_rpjmd` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `isi_strategi_rpjmd` text COLLATE utf8mb4_unicode_ci,
  `renstra_id` int DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data untuk tabel `renstra_strategi`
--

INSERT INTO `renstra_strategi` (`id`, `sasaran_id`, `rpjmd_strategi_id`, `kode_strategi`, `deskripsi`, `no_rpjmd`, `isi_strategi_rpjmd`, `renstra_id`) VALUES
(1, 1, 1, 'SST1-01-01.1', 'Pengelolaan kesehatan untuk semua masyarakat', 'SST1-01-01.1', 'Meningkatnya kesehatan untuk semua', 1),
(2, 1, 1, 'SST1-01-01.1', 'Meningkatnya kesehatan untuk semua', 'SST1-01-01.1', 'Meningkatnya kesehatan untuk semua', 1),
(3, 2, 2, 'SST1-01-02.1', 'Meningkatnya pendidikan yang berkualits tinggi di semua jenjang', 'SST1-01-02.1', 'Meningkatnya pendidikan yang berkualitas tinggi di semua jenjang', 1);

-- --------------------------------------------------------

--
-- Struktur dari tabel `renstra_subkegiatan`
--

CREATE TABLE `renstra_subkegiatan` (
  `id` int NOT NULL,
  `kegiatan_id` int NOT NULL,
  `kode_sub_kegiatan` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `nama_sub_kegiatan` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `sub_bidang_opd` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `nama_opd` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `nama_bidang_opd` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `renstra_program_id` int NOT NULL,
  `sub_kegiatan_id` int NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data untuk tabel `renstra_subkegiatan`
--

INSERT INTO `renstra_subkegiatan` (`id`, `kegiatan_id`, `kode_sub_kegiatan`, `nama_sub_kegiatan`, `sub_bidang_opd`, `nama_opd`, `nama_bidang_opd`, `renstra_program_id`, `sub_kegiatan_id`, `created_at`, `updated_at`) VALUES
(1, 1, '1.01.01.1.01.0001', 'Pelayanan Kesehatan Untuk Semua Masyarakat', 'Seksi Layanan Keshatan', 'Dinas Kesehatan', 'Bidang Kesehatan Pelayanan', 1, 1, '2025-09-01 01:46:43', '2025-09-01 01:46:43'),
(2, 2, '1.01.02.1.01.0001', 'Pelayanan Pendidikan Disemua Jenjang', 'Seksi Layanan Pendidikan', 'Dinas Pendidikan dan Kebudayaan', 'Bidang Pendidikan Pelayanan', 2, 2, '2025-09-01 01:47:00', '2025-09-01 01:47:00');

-- --------------------------------------------------------

--
-- Struktur dari tabel `renstra_tabel_kegiatan`
--

CREATE TABLE `renstra_tabel_kegiatan` (
  `id` int NOT NULL,
  `program_id` int DEFAULT NULL,
  `kegiatan_id` int DEFAULT NULL,
  `indikator_id` int DEFAULT NULL,
  `baseline` float DEFAULT NULL,
  `satuan_target` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `target_tahun_1` float DEFAULT NULL,
  `target_tahun_2` float DEFAULT NULL,
  `target_tahun_3` float DEFAULT NULL,
  `target_tahun_4` float DEFAULT NULL,
  `target_tahun_5` float DEFAULT NULL,
  `target_tahun_6` float DEFAULT NULL,
  `pagu_tahun_1` decimal(20,2) DEFAULT NULL,
  `pagu_tahun_2` decimal(20,2) DEFAULT NULL,
  `pagu_tahun_3` decimal(20,2) DEFAULT NULL,
  `pagu_tahun_4` decimal(20,2) DEFAULT NULL,
  `pagu_tahun_5` decimal(20,2) DEFAULT NULL,
  `pagu_tahun_6` decimal(20,2) DEFAULT NULL,
  `lokasi` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `kode_kegiatan` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `nama_kegiatan` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `bidang_penanggung_jawab` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `target_akhir_renstra` decimal(10,0) DEFAULT NULL,
  `pagu_akhir_renstra` decimal(20,2) DEFAULT NULL,
  `createdAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data untuk tabel `renstra_tabel_kegiatan`
--

INSERT INTO `renstra_tabel_kegiatan` (`id`, `program_id`, `kegiatan_id`, `indikator_id`, `baseline`, `satuan_target`, `target_tahun_1`, `target_tahun_2`, `target_tahun_3`, `target_tahun_4`, `target_tahun_5`, `target_tahun_6`, `pagu_tahun_1`, `pagu_tahun_2`, `pagu_tahun_3`, `pagu_tahun_4`, `pagu_tahun_5`, `pagu_tahun_6`, `lokasi`, `kode_kegiatan`, `nama_kegiatan`, `bidang_penanggung_jawab`, `target_akhir_renstra`, `pagu_akhir_renstra`, `createdAt`, `updatedAt`) VALUES
(1, 1, 1, 9, 95, 'Persen (%)', 0, 0, 0, 0, 0, 0, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 'Kecamatan Wasile', '1.01.01.1.01', 'Pengelolaan Layanan Kesehatan Untuk Semua', 'Sekretariat - Dinas Kesehatan', 0, 0.00, '2025-09-13 10:28:54', '2025-09-13 10:28:54');

-- --------------------------------------------------------

--
-- Struktur dari tabel `renstra_tabel_program`
--

CREATE TABLE `renstra_tabel_program` (
  `id` int NOT NULL,
  `program_id` int DEFAULT NULL,
  `indikator_id` int DEFAULT NULL,
  `baseline` float DEFAULT NULL,
  `satuan_target` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `target_tahun_1` float DEFAULT NULL,
  `target_tahun_2` float DEFAULT NULL,
  `target_tahun_3` float DEFAULT NULL,
  `target_tahun_4` float DEFAULT NULL,
  `target_tahun_5` float DEFAULT NULL,
  `target_tahun_6` float DEFAULT NULL,
  `pagu_tahun_1` decimal(20,2) DEFAULT NULL,
  `pagu_tahun_2` decimal(20,2) DEFAULT NULL,
  `pagu_tahun_3` decimal(20,2) DEFAULT NULL,
  `pagu_tahun_4` decimal(20,2) DEFAULT NULL,
  `pagu_tahun_5` decimal(20,2) DEFAULT NULL,
  `pagu_tahun_6` decimal(20,2) DEFAULT NULL,
  `lokasi` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `kode_program` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `nama_program` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `opd_penanggung_jawab` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `target_akhir_renstra` decimal(10,0) DEFAULT NULL,
  `pagu_akhir_renstra` decimal(20,2) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data untuk tabel `renstra_tabel_program`
--

INSERT INTO `renstra_tabel_program` (`id`, `program_id`, `indikator_id`, `baseline`, `satuan_target`, `target_tahun_1`, `target_tahun_2`, `target_tahun_3`, `target_tahun_4`, `target_tahun_5`, `target_tahun_6`, `pagu_tahun_1`, `pagu_tahun_2`, `pagu_tahun_3`, `pagu_tahun_4`, `pagu_tahun_5`, `pagu_tahun_6`, `lokasi`, `kode_program`, `nama_program`, `opd_penanggung_jawab`, `target_akhir_renstra`, `pagu_akhir_renstra`) VALUES
(1, 1, 5, 70.92, 'Tahun', 71.4, 71.79, 72.52, 73.16, 73.8, 74, 3000000000.00, 4000000000.00, 5000000000.00, 6000000000.00, 7000000000.00, 8000000000.00, 'Kabupaten Halmahera Timur', '1.01.01.', 'PROGRAM DINAS KESEHATAN', 'Dinas Kesehatan', 73, 33000000000.00);

-- --------------------------------------------------------

--
-- Struktur dari tabel `renstra_tabel_sasaran`
--

CREATE TABLE `renstra_tabel_sasaran` (
  `id` int NOT NULL,
  `tujuan_id` int DEFAULT NULL,
  `sasaran_id` int DEFAULT NULL,
  `indikator_id` int DEFAULT NULL,
  `baseline` float DEFAULT NULL,
  `satuan_target` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `target_tahun_1` float DEFAULT NULL,
  `target_tahun_2` float DEFAULT NULL,
  `target_tahun_3` float DEFAULT NULL,
  `target_tahun_4` float DEFAULT NULL,
  `target_tahun_5` float DEFAULT NULL,
  `target_tahun_6` float DEFAULT NULL,
  `pagu_tahun_1` decimal(20,2) DEFAULT NULL,
  `pagu_tahun_2` decimal(20,2) DEFAULT NULL,
  `pagu_tahun_3` decimal(20,2) DEFAULT NULL,
  `pagu_tahun_4` decimal(20,2) DEFAULT NULL,
  `pagu_tahun_5` decimal(20,2) DEFAULT NULL,
  `pagu_tahun_6` decimal(20,2) DEFAULT NULL,
  `lokasi` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `kode_sasaran` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `nama_sasaran` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `target_akhir_renstra` decimal(10,0) DEFAULT NULL,
  `pagu_akhir_renstra` decimal(20,2) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data untuk tabel `renstra_tabel_sasaran`
--

INSERT INTO `renstra_tabel_sasaran` (`id`, `tujuan_id`, `sasaran_id`, `indikator_id`, `baseline`, `satuan_target`, `target_tahun_1`, `target_tahun_2`, `target_tahun_3`, `target_tahun_4`, `target_tahun_5`, `target_tahun_6`, `pagu_tahun_1`, `pagu_tahun_2`, `pagu_tahun_3`, `pagu_tahun_4`, `pagu_tahun_5`, `pagu_tahun_6`, `lokasi`, `kode_sasaran`, `nama_sasaran`, `target_akhir_renstra`, `pagu_akhir_renstra`, `created_at`, `updated_at`) VALUES
(1, 1, 1, 1, 0.48, 'Poin', 0.48, 0.49, 0.49, 0.5, 0.5, 0.6, 150000000.00, 200000000.00, 250000000.00, 300000000.00, 450000000.00, 500000000.00, 'Kabupaten Halmahera Tengah', 'ST1-01-01', 'Mewujudkan kesehatan untuk semua', 1, 1850000000.00, '2025-09-07 03:44:00', '2025-09-07 03:44:00'),
(2, 1, 1, 9, 95, 'Persen (%)', 75, 85, 90, 95, 100, 100, 150000000.00, 200000000.00, 250000000.00, 300000000.00, 450000000.00, 500000000.00, 'Kabupaten Halmahera Tengah', 'ST1-01-01', 'Mewujudkan kesehatan untuk semua', 91, 1850000000.00, '2025-09-07 05:29:57', '2025-09-07 05:29:57');

-- --------------------------------------------------------

--
-- Struktur dari tabel `renstra_tabel_subkegiatan`
--

CREATE TABLE `renstra_tabel_subkegiatan` (
  `id` int NOT NULL,
  `program_id` int NOT NULL,
  `kegiatan_id` int NOT NULL,
  `subkegiatan_id` int NOT NULL,
  `indikator_manual` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `baseline` float DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `satuan_target` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `kode_subkegiatan` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `nama_subkegiatan` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `sub_bidang_penanggung_jawab` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `lokasi` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `target_akhir_renstra` decimal(10,0) DEFAULT NULL,
  `pagu_akhir_renstra` decimal(20,2) DEFAULT NULL,
  `target_tahun_1` float DEFAULT NULL,
  `pagu_tahun_1` decimal(20,2) DEFAULT NULL,
  `target_tahun_2` float DEFAULT NULL,
  `pagu_tahun_2` decimal(20,2) DEFAULT NULL,
  `target_tahun_3` float DEFAULT NULL,
  `pagu_tahun_3` decimal(20,2) DEFAULT NULL,
  `target_tahun_4` float DEFAULT NULL,
  `pagu_tahun_4` decimal(20,2) DEFAULT NULL,
  `target_tahun_5` float DEFAULT NULL,
  `pagu_tahun_5` decimal(20,2) DEFAULT NULL,
  `target_tahun_6` float DEFAULT NULL,
  `pagu_tahun_6` decimal(20,2) DEFAULT NULL,
  `renstra_opd_id` int DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Struktur dari tabel `renstra_tabel_tujuan`
--

CREATE TABLE `renstra_tabel_tujuan` (
  `id` int NOT NULL,
  `tujuan_id` int DEFAULT NULL,
  `opd_id` int DEFAULT NULL,
  `indikator_id` int DEFAULT NULL,
  `baseline` float DEFAULT NULL,
  `satuan_target` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `target_tahun_1` float DEFAULT NULL,
  `target_tahun_2` float DEFAULT NULL,
  `target_tahun_3` float DEFAULT NULL,
  `target_tahun_4` float DEFAULT NULL,
  `target_tahun_5` float DEFAULT NULL,
  `target_tahun_6` float DEFAULT NULL,
  `pagu_tahun_1` decimal(20,2) DEFAULT NULL,
  `pagu_tahun_2` decimal(20,2) DEFAULT NULL,
  `pagu_tahun_3` decimal(20,2) DEFAULT NULL,
  `pagu_tahun_4` decimal(20,2) DEFAULT NULL,
  `pagu_tahun_5` decimal(20,2) DEFAULT NULL,
  `pagu_tahun_6` decimal(20,2) DEFAULT NULL,
  `lokasi` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `kode_tujuan` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `nama_tujuan` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `target_akhir_renstra` decimal(10,0) DEFAULT NULL,
  `pagu_akhir_renstra` decimal(20,2) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data untuk tabel `renstra_tabel_tujuan`
--

INSERT INTO `renstra_tabel_tujuan` (`id`, `tujuan_id`, `opd_id`, `indikator_id`, `baseline`, `satuan_target`, `target_tahun_1`, `target_tahun_2`, `target_tahun_3`, `target_tahun_4`, `target_tahun_5`, `target_tahun_6`, `pagu_tahun_1`, `pagu_tahun_2`, `pagu_tahun_3`, `pagu_tahun_4`, `pagu_tahun_5`, `pagu_tahun_6`, `lokasi`, `kode_tujuan`, `nama_tujuan`, `target_akhir_renstra`, `pagu_akhir_renstra`, `created_at`, `updated_at`) VALUES
(3, 1, 1, 9, 95, 'Persen (%)', 75, 85, 90, 95, 100, 100, 150000000.00, 200000000.00, 250000000.00, 300000000.00, 4117000000.00, 500000000.00, 'Kabupaten Halmahera Tengah', 'T1-01.01', 'Mewujudkan SDM Yang Berkualitas, Unggung Dan Berdaya Saing', 91, 5517000000.00, '2025-09-07 01:59:10', '2025-09-07 01:59:10'),
(4, 1, 1, 1, 0.48, 'Poin', 0.48, 0.49, 0.49, 0.5, 0.5, 0.6, 150000000.00, 200000000.00, 250000000.00, 300000000.00, 450000000.00, 500000000.00, 'Kabupaten Halmahera Tengah', 'T1-01.01', 'Mewujudkan SDM Yang Berkualitas, Unggung Dan Berdaya Saing', 1, 1850000000.00, '2025-09-07 05:28:33', '2025-09-07 05:28:33');

-- --------------------------------------------------------

--
-- Struktur dari tabel `renstra_target`
--

CREATE TABLE `renstra_target` (
  `id` int NOT NULL,
  `indikator_id` int NOT NULL,
  `tahun` int NOT NULL,
  `target_value` decimal(18,2) DEFAULT NULL,
  `satuan` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `pagu_anggaran` bigint DEFAULT NULL,
  `lokasi` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Struktur dari tabel `renstra_target_detail`
--

CREATE TABLE `renstra_target_detail` (
  `id` int NOT NULL,
  `renstra_target_id` int NOT NULL,
  `level` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `tahun` int NOT NULL,
  `target_value` decimal(18,2) NOT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Struktur dari tabel `renstra_tujuan`
--

CREATE TABLE `renstra_tujuan` (
  `id` int NOT NULL,
  `renstra_id` int NOT NULL,
  `rpjmd_tujuan_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `misi_id` int DEFAULT NULL,
  `no_tujuan` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `isi_tujuan` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `no_rpjmd` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `isi_tujuan_rpjmd` text COLLATE utf8mb4_unicode_ci
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data untuk tabel `renstra_tujuan`
--

INSERT INTO `renstra_tujuan` (`id`, `renstra_id`, `rpjmd_tujuan_id`, `misi_id`, `no_tujuan`, `isi_tujuan`, `no_rpjmd`, `isi_tujuan_rpjmd`) VALUES
(1, 1, '5', 1, 'T1-01.01', 'Mewujudkan SDM Yang Berkualitas, Unggung Dan Berdaya Saing', 'T1-01', 'Terwujudnya SDM Berkualitas, Unggul, dan Berdaya Saing');

-- --------------------------------------------------------

--
-- Struktur dari tabel `report`
--

CREATE TABLE `report` (
  `id` int NOT NULL,
  `periode` varchar(255) NOT NULL,
  `jenis` varchar(255) NOT NULL,
  `file_path` varchar(255) NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

-- --------------------------------------------------------

--
-- Struktur dari tabel `rka`
--

CREATE TABLE `rka` (
  `id` int NOT NULL,
  `tahun` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `periode_id` int NOT NULL,
  `program` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `kegiatan` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `sub_kegiatan` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `indikator` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `target` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `anggaran` double DEFAULT NULL,
  `jenis_dokumen` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `renja_id` int DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Struktur dari tabel `rkpd`
--

CREATE TABLE `rkpd` (
  `id` int NOT NULL,
  `tahun` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `target` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `anggaran` double DEFAULT NULL,
  `jenis_dokumen` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `periode_id` int NOT NULL,
  `renstra_program_id` int DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `indikator_kegiatan_id` int UNSIGNED DEFAULT NULL,
  `indikator_program_id` int UNSIGNED DEFAULT NULL,
  `indikator_sasaran_id` int UNSIGNED DEFAULT NULL,
  `tujuan_id` int DEFAULT NULL,
  `sasaran_id` int DEFAULT NULL,
  `strategi_id` int DEFAULT NULL,
  `arah_id` int DEFAULT NULL,
  `indikator_tujuan_id` int DEFAULT NULL,
  `program_id` int UNSIGNED DEFAULT NULL,
  `kegiatan_id` int DEFAULT NULL,
  `sub_kegiatan_id` int DEFAULT NULL,
  `opd_id` int DEFAULT NULL,
  `prioritas_nasional_id` bigint UNSIGNED DEFAULT NULL,
  `prioritas_daerah_id` bigint UNSIGNED DEFAULT NULL,
  `prioritas_gubernur_id` bigint UNSIGNED DEFAULT NULL,
  `visi_id` int DEFAULT NULL,
  `misi_id` int DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Struktur dari tabel `roles`
--

CREATE TABLE `roles` (
  `id` int NOT NULL,
  `name` varchar(50) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

--
-- Dumping data untuk tabel `roles`
--

INSERT INTO `roles` (`id`, `name`, `description`, `created_at`, `updated_at`) VALUES
(1, 'SUPER ADMIN', NULL, '2025-04-24 16:22:46', '2025-04-24 16:22:46'),
(2, 'ADMINISTRATOR', NULL, '2025-04-24 16:22:46', '2025-04-24 16:22:46'),
(3, 'PENGAWAS', NULL, '2025-04-24 16:22:46', '2025-04-24 16:22:46'),
(4, 'PELAKSANA', NULL, '2025-04-24 16:22:46', '2025-04-24 16:22:46');

-- --------------------------------------------------------

--
-- Struktur dari tabel `rpjmd`
--

CREATE TABLE `rpjmd` (
  `id` int NOT NULL,
  `nama_rpjmd` varchar(255) NOT NULL,
  `kepala_daerah` varchar(255) NOT NULL,
  `wakil_kepala_daerah` varchar(255) NOT NULL,
  `createdAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `periode_awal` int NOT NULL,
  `periode_akhir` int NOT NULL,
  `tahun_penetapan` int NOT NULL,
  `akronim` varchar(255) DEFAULT NULL,
  `foto_kepala_daerah` varchar(255) DEFAULT NULL,
  `foto_wakil_kepala_daerah` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

--
-- Dumping data untuk tabel `rpjmd`
--

INSERT INTO `rpjmd` (`id`, `nama_rpjmd`, `kepala_daerah`, `wakil_kepala_daerah`, `createdAt`, `updatedAt`, `periode_awal`, `periode_akhir`, `tahun_penetapan`, `akronim`, `foto_kepala_daerah`, `foto_wakil_kepala_daerah`) VALUES
(2, '\"Maluku Utara Maju dan Berkelanjutan\"', 'ALILA KHANZA F. AL-HABSHY', 'ALKHAFSY F. AL-HABSHY', '2025-04-24 21:16:25', '2025-04-24 21:16:25', 2025, 2029, 2026, '\"MALUKU UTARA BANGKIT\"', 'foto_kepala_daerah-1745377187290-724169898.jpeg', 'foto_wakil_kepala_daerah-1745377524726-212219726.jpeg');

-- --------------------------------------------------------

--
-- Struktur dari tabel `sasaran`
--

CREATE TABLE `sasaran` (
  `id` int NOT NULL,
  `tujuan_id` int NOT NULL,
  `isi_sasaran` text COLLATE utf8mb4_unicode_ci,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `rpjmd_id` int DEFAULT NULL,
  `nomor` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `periode_id` int DEFAULT NULL,
  `jenis_dokumen` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'rpjmd',
  `tahun` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '2025'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data untuk tabel `sasaran`
--

INSERT INTO `sasaran` (`id`, `tujuan_id`, `isi_sasaran`, `created_at`, `updated_at`, `rpjmd_id`, `nomor`, `periode_id`, `jenis_dokumen`, `tahun`) VALUES
(1, 1, 'Mewujudkan kesehatan untuk semua', '2025-08-12 13:45:18', '2025-08-12 13:45:18', 2, 'ST1-01-01', 2, 'rpjmd', '2025'),
(2, 1, 'Mewujudkan pendidikan yang berkualitas', '2025-08-12 13:45:41', '2025-08-12 13:45:41', 2, 'ST1-01-02', 2, 'rpjmd', '2025'),
(3, 2, 'Mewujudkan pendidikan yang berkualitas', '2025-08-13 12:38:28', '2025-08-13 12:38:28', 2, 'ST1-01-02', 2, 'rkpd', '2025'),
(7, 5, 'Mewujudkan pendidikan yang berkualitas', '2025-08-15 00:53:21', '2025-08-15 00:53:21', 2, 'ST1-01-02', 2, 'renstra', '2025');

-- --------------------------------------------------------

--
-- Struktur dari tabel `sasaran_opd`
--

CREATE TABLE `sasaran_opd` (
  `id` int NOT NULL,
  `tujuan_id` int NOT NULL,
  `rpjmd_sasaran_id` int NOT NULL,
  `nomor` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `isi_sasaran` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `no_rpjmd` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `isi_sasaran_rpjmd` text COLLATE utf8mb4_unicode_ci
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Struktur dari tabel `sequelizemeta`
--

CREATE TABLE `sequelizemeta` (
  `name` varchar(255) COLLATE utf8mb3_unicode_ci NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_unicode_ci;

--
-- Dumping data untuk tabel `sequelizemeta`
--

INSERT INTO `sequelizemeta` (`name`) VALUES
('20250420094330-create-roles.js'),
('20250420101520-create-divisions.js'),
('20250420102223-create-users.js'),
('202504201210-create-visi.js'),
('202504201215-create-misi.js'),
('202504201222-create-sasaran.js'),
('202504201225-create-indikator.js'),
('202504201230-create-program.js'),
('202504201240-create-kegiatan.js'),
('202504201250-create-sub-kegiatan.js'),
('202504201300-create-opd-penanggung-jawab.js'),
('202504201300-create-users.js'),
('202504201305-create-divisions.js'),
('202504201500-create-peran-hak-kewenangan.js'),
('20250421-add-rpjmd-id-to-visi-misi.js'),
('20250421-create-rpjmd.js'),
('20250421-update-divisions-ids.js'),
('20250421181216-add-rpjmd-id-to-multiple-tables.js'),
('20250421182340-create-evaluasi.js'),
('20250421183021-create-realisasi-sub-kegiatan-rpjmd.js'),
('20250421183439-create-monitoring-indikator-rpjmd.js'),
('20250421183909-create-evaluasi-rpjmd.js'),
('20250421191957-create-realisasi-sub-kegiatan.js'),
('20250421192448-create-realisasi-sub-kegiatan.js'),
('20250421192759-create-monitoring-indikator.js'),
('20250421192824-create-evaluasi.js'),
('20250421192849-create-export-laporan.js'),
('20250421192917-create-rekomendasi-otomatis.js'),
('20250422093328-add-nomor-to-tujuan.js'),
('20250422161540-remove-nomor-from-tujuan.js'),
('20250423023305-add-fields-to-rpjmd.js'),
('20250423043941-add-fields-to-indikator.js'),
('20250423073417-create-sub-kegiatan.js'),
('20250423074139-add-fields-to-sub-kegiatan.js'),
('20250423074140-add-anggaran-kegiatan-to-sub-kegiatan.js'),
('20250424071755-create-realisasi-indikator.js'),
('20250424071804-create-evaluasi.js'),
('20250424071810-create-reports.js'),
('20250424150551-add-nomor-to-sasaran.js'),
('20250426024921-add-monitoring-fields-to-sub_kegiatan.js'),
('20250426090842-add-target-years-to-indikators.js'),
('20250426091201-remove-target-from-indikators.js'),
('20250426093826-migrate-target-tiap-tahun-to-target-tahun.js'),
('20250427-create-evaluasi.js'),
('20250427051716-update-opd-penanggung-jawab-fields.js'),
('20250427105504-add_fields_to_opd_penanggung_jawab.js'),
('20250427211057-add-no_tujuan-to-tujuan.js'),
('20250429031111-add-opd-fields-to-program.js'),
('20250501151757-sync-prioritas-nasional.js'),
('20250501152047-create-prioritas-nasional.js'),
('20250501152106-create-prioritas-daerah.js'),
('20250501152127-create-prioritas-kepala-daerah.js'),
('20250502014907-add-nama-prionas-to-prioritas-nasional.js'),
('20250502014922-add-nama-prionas-to-prioritas-daerah.js'),
('20250502014937-add-nama-prionas-to-prioritas-gubernur.js'),
('20250502021650-add-opd-tujuan-to-prioritas-kepala-daerah.js'),
('20250502021955-add-nama-priogub-to-prioritas-kepala-daerah.js'),
('20250502073659-create-opd-penanggung-jawab.js'),
('20250503061641-add-standar-layanan-opd-to-prioritas.js'),
('20250504052106-remove-realisasi-fields.js'),
('20250506040640-create-indikator-tujuan.js'),
('20250507005811-alter-indikator-add-step-fks.js.js'),
('20250507005918-create-indikator-detail.js'),
('20250507090649-create-indikator-tujuan.js'),
('20250507090804-create-indikator-sasaran.js'),
('20250507091219-create-indikator-program.js'),
('20250507091632-create-indikator-kegiatan.js'),
('20250507092811-create-indikator-misi.js'),
('20250507112940-alter-indikator-tujuans.js'),
('20250507114900-alter-indikator-sasarans.js'),
('20250507115945-alter-indikator-programs.js'),
('20250507120309-alter-indikator-kegiatans.js'),
('20250511033055-add-satuan-to-indikatortujuans.js'),
('20250512020357-add-indikator-and-sasaran-id-to-indikatorsasarans.js'),
('20250513010930-alter-standar-layanan-opd-to-text.js'),
('20250513102340-add-tujuan-id-to-indikatorsasarans.js'),
('20250513102352-add-sasaran-id-to-indikatorprograms.js'),
('20250513102922-add-program-id-to-indikatorkegiatans.js'),
('20250513151713-add-prioritas-columns-to-indikator-kegiatan.js'),
('20250514114335-create-activitylog.js'),
('20250514114731-create-notification.js'),
('20250515-add-id-to-realisasi-indikator.js'),
('20250515120130-create-cascading.js'),
('20250516-create-strategi.js'),
('20250517-create-arah-kebijakan.js'),
('20250517174630-update-prioritas-enum.js'),
('20250519124122-create-program-strategi.js'),
('20250519174631-create-program-arah-kebijakan.js'),
('20250520092842-add-strategi-and-arah_kebijakan-to-cascading.js'),
('20250521082632-add-misi-id-to-indikatortujuans.js'),
('20250525015058-create-renstra-opd.js'),
('20250525015111-create-tujuan-opd.js'),
('20250525015119-create-sasaran-opd.js'),
('20250525015128-create-strategi-opd.js'),
('20250525015135-create-kebijakan-opd.js'),
('20250525015144-create-program-opd.js'),
('20250525015152-create-kegiatan-opd.js'),
('20250525015200-create-subkegiatan-opd.js'),
('20250526004415-add-jenisDokumen-dan-tahun-ke-strategi.js'),
('20250526051610-add-jenisDokumen-dan-tahun-ke-arah-kebijakan.js'),
('20250526071301-add-jenisDokumen-dan-tahun-ke-cascading.js'),
('20250526071528-add-jenisDokumen-dan-tahun-ke-divisions.js'),
('20250526071658-add-jenisDokumen-dan-tahun-ke-evaluasi.js'),
('20250526071947-add-jenisDokumen-dan-tahun-ke-evaluasi-rpjmd.js'),
('20250526072237-add-jenisDokumen-dan-tahun-ke-indikator.js'),
('20250526072341-add-jenisDokumen-dan-tahun-ke-indikatorkegiatans.js'),
('20250526072435-add-jenisDokumen-dan-tahun-ke-indikatormisis.js'),
('20250526072537-add-jenisDokumen-dan-tahun-ke-indikatorprograms.js'),
('20250526072626-add-jenisDokumen-dan-tahun-ke-indikatorsasarans.js'),
('20250526072719-add-jenisDokumen-dan-tahun-ke-indikatortujuans.js'),
('20250526072817-add-jenisDokumen-dan-tahun-ke-indikator_detail.js'),
('20250526072930-add-jenisDokumen-dan-tahun-ke-kebijakan_opd.js'),
('20250526073016-add-jenisDokumen-dan-tahun-ke-kegiatan.js'),
('20250905083639-create-renstra-subkegiatan-final.js'),
('20250905094908-create-renstra-tabel-subkegiatan.js'),
('20250905094909-create-renstra-tabel-subkegiatan.js'),
('20250905094910-create-renstra-tabel-tujuan.js'),
('20250905094911-create-renstra-tabel-sasaran.js'),
('20250906061725-add-timestamps-to-renstra-tabel-sasaran.js'),
('20250906061726_remove_createdAt_updatedAt_renstra_tabel_sasaran.js'),
('20250906061727-add-timestamps-to-renstra-tabel-tujuan.js'),
('20250906061728_remove_createdAt_updatedAt_renstra_tabel_tujuan.js'),
('20250906061729-add-opd-id-to-renstra-tabel-tujuan.js'),
('20250906061730-name remove-opd-penanggung-jawab-from-renstra-tabel-tujuan.js'),
('20250906061731-name remove-opd-penanggung-jawab-from-renstra-tabel-sasaran.js');

-- --------------------------------------------------------

--
-- Struktur dari tabel `strategi`
--

CREATE TABLE `strategi` (
  `id` int NOT NULL,
  `sasaran_id` int NOT NULL,
  `kode_strategi` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `deskripsi` varchar(500) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `jenis_dokumen` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `tahun` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '2025',
  `periode_id` int DEFAULT NULL,
  `jenisDokumen` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'RPJMD'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data untuk tabel `strategi`
--

INSERT INTO `strategi` (`id`, `sasaran_id`, `kode_strategi`, `deskripsi`, `created_at`, `updated_at`, `jenis_dokumen`, `tahun`, `periode_id`, `jenisDokumen`) VALUES
(1, 1, 'SST1-01-01.1', 'Meningkatnya kesehatan untuk semua', '2025-08-12 23:23:00', '2025-08-12 23:23:00', 'rpjmd', '2025', 2, 'RPJMD'),
(2, 2, 'SST1-01-02.1', 'Meningkatnya pendidikan yang berkualitas tinggi di semua jenjang', '2025-08-12 23:24:56', '2025-08-12 23:24:56', 'rpjmd', '2025', 2, 'RPJMD'),
(3, 3, 'SST1-01-01.1', 'Meningkatnya kesehatan untuk semua', '2025-08-13 12:38:28', '2025-08-13 12:38:28', 'rkpd', '2025', 2, 'RPJMD'),
(4, 7, 'SST1-01-01.1', 'Meningkatnya kesehatan untuk semua', '2025-08-15 00:53:21', '2025-08-15 00:53:21', 'renstra', '2025', 2, 'RPJMD');

-- --------------------------------------------------------

--
-- Struktur dari tabel `strategi_opd`
--

CREATE TABLE `strategi_opd` (
  `id` int NOT NULL,
  `sasaran_id` int NOT NULL,
  `rpjmd_strategi_id` int DEFAULT NULL,
  `kode_strategi` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `deskripsi` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `no_rpjmd` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `isi_strategi_rpjmd` text COLLATE utf8mb4_unicode_ci
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Struktur dari tabel `subkegiatan_opd`
--

CREATE TABLE `subkegiatan_opd` (
  `id` int NOT NULL,
  `kegiatan_id` int NOT NULL,
  `kode_sub_kegiatan` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `nama_sub_kegiatan` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `sub_bidang_opd` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `anggaran_sub_kegiatan` decimal(10,0) DEFAULT NULL,
  `anggaran_kegiatan` decimal(10,0) DEFAULT NULL,
  `pagu_anggaran` decimal(10,0) DEFAULT NULL,
  `waktu_pelaksanaan` datetime DEFAULT NULL,
  `nama_opd` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `nama_bidang_opd` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `sumber_daya_pendukung` text COLLATE utf8mb4_unicode_ci,
  `rencana_lokasi_desa` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `rencana_lokasi_kecamatan` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `rencana_lokasi_kabupaten` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `deskripsi` text COLLATE utf8mb4_unicode_ci,
  `kerangka_pelaksanaan` text COLLATE utf8mb4_unicode_ci,
  `output` text COLLATE utf8mb4_unicode_ci,
  `pihak_terlibat` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `rpjmd_id` int DEFAULT NULL,
  `target_awal` decimal(20,2) DEFAULT NULL,
  `target_akhir` decimal(20,2) DEFAULT NULL,
  `satuan` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status_monitoring` enum('on-track','delay','complete') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'on-track',
  `tanggal_laporan` datetime DEFAULT NULL,
  `catatan` text COLLATE utf8mb4_unicode_ci,
  `kode_indikator` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `nama_indikator` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `tipe_indikator` enum('Proses') COLLATE utf8mb4_unicode_ci NOT NULL,
  `jenis` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `tolok_ukur_kinerja` text COLLATE utf8mb4_unicode_ci,
  `target_kinerja` text COLLATE utf8mb4_unicode_ci,
  `jenis_indikator` enum('Kuantitatif','Kualitatif') COLLATE utf8mb4_unicode_ci NOT NULL,
  `kriteria_kuantitatif` text COLLATE utf8mb4_unicode_ci,
  `kriteria_kualitatif` text COLLATE utf8mb4_unicode_ci,
  `satuan_indikator` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `definisi_operasional` text COLLATE utf8mb4_unicode_ci,
  `metode_penghitungan` text COLLATE utf8mb4_unicode_ci,
  `baseline` text COLLATE utf8mb4_unicode_ci,
  `target_tahun_1` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `target_tahun_2` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `target_tahun_3` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `target_tahun_4` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `target_tahun_5` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `sumber_data` text COLLATE utf8mb4_unicode_ci,
  `penanggung_jawab` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `keterangan` text COLLATE utf8mb4_unicode_ci
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Struktur dari tabel `sub_kegiatan`
--

CREATE TABLE `sub_kegiatan` (
  `id` int NOT NULL,
  `kegiatan_id` int NOT NULL,
  `nama_sub_kegiatan` varchar(255) NOT NULL,
  `kode_sub_kegiatan` varchar(50) NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `nama_opd` varchar(255) NOT NULL,
  `nama_bidang_opd` varchar(255) NOT NULL,
  `sub_bidang_opd` varchar(255) NOT NULL,
  `periode_id` int NOT NULL,
  `jenis_dokumen` varchar(255) DEFAULT NULL,
  `tahun` int DEFAULT NULL,
  `pagu_anggaran` bigint UNSIGNED DEFAULT '0',
  `total_pagu_anggaran` bigint DEFAULT '0',
  `anggaran_kegiatan` decimal(10,0) NOT NULL DEFAULT '0',
  `target_awal` decimal(20,2) DEFAULT NULL,
  `target_akhir` decimal(20,2) DEFAULT NULL,
  `satuan` varchar(100) DEFAULT NULL,
  `status_monitoring` enum('on-track','delay','complete') NOT NULL DEFAULT 'on-track',
  `tanggal_laporan` datetime DEFAULT NULL,
  `catatan` text
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

--
-- Dumping data untuk tabel `sub_kegiatan`
--

INSERT INTO `sub_kegiatan` (`id`, `kegiatan_id`, `nama_sub_kegiatan`, `kode_sub_kegiatan`, `created_at`, `updated_at`, `nama_opd`, `nama_bidang_opd`, `sub_bidang_opd`, `periode_id`, `jenis_dokumen`, `tahun`, `pagu_anggaran`, `total_pagu_anggaran`, `anggaran_kegiatan`, `target_awal`, `target_akhir`, `satuan`, `status_monitoring`, `tanggal_laporan`, `catatan`) VALUES
(1, 1, 'Pelayanan Kesehatan Untuk Semua Masyarakat', '1.01.01.1.01.0001', '2025-08-13 12:36:28', '2025-08-13 12:36:28', 'Dinas Kesehatan', 'Bidang Kesehatan Pelayanan', 'Seksi Layanan Keshatan', 2, 'rpjmd', 2025, 2500000, 0, 0, NULL, NULL, NULL, 'on-track', NULL, NULL),
(2, 2, 'Pelayanan Pendidikan Disemua Jenjang', '1.01.02.1.01.0001', '2025-08-13 12:37:47', '2025-08-13 12:37:47', 'Dinas Pendidikan dan Kebudayaan', 'Bidang Pendidikan Pelayanan', 'Seksi Layanan Pendidikan', 2, 'rpjmd', 2025, 25000000, 0, 0, NULL, NULL, NULL, 'on-track', NULL, NULL);

-- --------------------------------------------------------

--
-- Struktur dari tabel `target_indikator`
--

CREATE TABLE `target_indikator` (
  `id_target` bigint UNSIGNED NOT NULL,
  `id_indikator` int DEFAULT NULL,
  `periode` smallint NOT NULL,
  `nilai_target` decimal(10,0) DEFAULT NULL,
  `teks_target` text COLLATE utf8mb4_unicode_ci
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Struktur dari tabel `tujuan`
--

CREATE TABLE `tujuan` (
  `id` int NOT NULL,
  `misi_id` int NOT NULL,
  `isi_tujuan` text NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `rpjmd_id` int DEFAULT NULL,
  `no_tujuan` char(36) NOT NULL,
  `periode_id` int DEFAULT NULL,
  `jenis_dokumen` varchar(255) NOT NULL DEFAULT 'rpjmd',
  `tahun` varchar(255) NOT NULL DEFAULT '2025',
  `indikator` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

--
-- Dumping data untuk tabel `tujuan`
--

INSERT INTO `tujuan` (`id`, `misi_id`, `isi_tujuan`, `created_at`, `updated_at`, `rpjmd_id`, `no_tujuan`, `periode_id`, `jenis_dokumen`, `tahun`, `indikator`) VALUES
(1, 1, 'Terwujudnya SDM Berkualitas, Unggul, dan Berdaya Saing', '2025-08-02 18:34:50', '2025-08-02 18:34:50', 2, 'T1-01', 2, 'rpjmd', '2025', NULL),
(2, 1, 'Terwujudnya SDM Berkualitas, Unggul, dan Berdaya Saing', '2025-08-08 14:37:32', '2025-08-08 14:37:32', 2, 'T1-01', 2, 'rkpd', '2025', NULL),
(5, 1, 'Terwujudnya SDM Berkualitas, Unggul, dan Berdaya Saing', '2025-08-15 00:53:21', '2025-08-15 00:53:21', 2, 'T1-01', 2, 'renstra', '2025', NULL);

-- --------------------------------------------------------

--
-- Struktur dari tabel `tujuan_opd`
--

CREATE TABLE `tujuan_opd` (
  `id` int NOT NULL,
  `renstra_id` int NOT NULL,
  `rpjmd_tujuan_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `misi_id` int DEFAULT NULL,
  `no_tujuan` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `isi_tujuan` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `no_rpjmd` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `isi_tujuan_rpjmd` text COLLATE utf8mb4_unicode_ci
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Struktur dari tabel `users`
--

CREATE TABLE `users` (
  `id` int NOT NULL,
  `username` varchar(255) NOT NULL,
  `email` varchar(255) NOT NULL,
  `password` varchar(255) NOT NULL,
  `role_id` int NOT NULL,
  `divisions_id` int DEFAULT NULL,
  `createdAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `opd` varchar(255) NOT NULL,
  `periode_id` int DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

--
-- Dumping data untuk tabel `users`
--

INSERT INTO `users` (`id`, `username`, `email`, `password`, `role_id`, `divisions_id`, `createdAt`, `updatedAt`, `opd`, `periode_id`) VALUES
(4, 'Sekretaris Dinas Pangan', 'fahmialhabsis7@gmail.com', '$2b$10$sx.HNk6xILlLVjbVxBfVzebmj8aYOG9dRmDN4FOKrjJFZ6bPCBqZu', 1, 1, '2025-04-27 13:10:10', '2025-04-27 13:10:10', 'Dinas Pangan', 1),
(5, 'Kepala Bidang Distribusi', 'hafis@gmail.com', '$2b$10$GbnAUDS8YgEock/4ywaTVO5YupvIxdg2OeZYHLtAnyD0ZmeYRTKP2', 2, 2, '2025-04-27 13:12:20', '2025-04-27 13:12:20', 'Dinas Pangan', NULL),
(6, 'Kepala Sub Bagian Kepegawaian', 'ayas@gmail.com', '$2b$10$iaJ2wn4Q/Xv4oXLL9iu9aOMvVBjOoXzWWEsNgsB8noM5bmbrlWGlK', 3, 1, '2025-04-27 13:14:19', '2025-04-27 13:14:19', 'Dinas Pangan', NULL),
(7, 'Kepala Bidang Konsumsi', 'faz@gmail.com', '$2b$10$zpuJzaTE4yRBte4.w2kbEeGRNZg6zKSG1a7wqx4N3SbKjbqiwy5um', 2, 3, '2025-04-29 12:55:25', '2025-04-29 12:55:25', 'Dinas Pangan', NULL),
(8, 'Sekretaris', 'sekpangan@gmail.com', '$2b$10$cEVFIvdT0nAYQMgzqo47S.h5qa0HDzXUQevpl74usRvI9WzZTyyxC', 2, 1, '2025-06-15 18:08:55', '2025-06-15 18:08:55', 'Dinas Pangan', NULL),
(9, 'Kepala Bappeda Malut', 'bappeda@gmail.com', '$2b$10$sgB0uiVjdzL3qmYAxJdFRO4c/D8O61oqmUs9vwVCuTnW2zUlEtnz.', 2, 86, '2025-07-19 16:50:34', '2025-07-19 16:50:34', 'Bappeda Malut', 2),
(10, 'Sekretaris Bappeda Malut', 'SekBappeda@gmail.com', '$2b$10$IIJL/rI0xIWEN3KskdpyIudPyoSUPPKh0si8maxOXSIlqHzfeMqdm', 2, 46, '2025-07-19 17:01:02', '2025-07-19 17:01:02', 'Bappeda Malut', 2);

-- --------------------------------------------------------

--
-- Struktur dari tabel `visi`
--

CREATE TABLE `visi` (
  `id` int NOT NULL,
  `isi_visi` text NOT NULL,
  `tahun_awal` int NOT NULL,
  `tahun_akhir` int NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `rpjmd_id` int DEFAULT NULL,
  `jenis_dokumen` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

--
-- Dumping data untuk tabel `visi`
--

INSERT INTO `visi` (`id`, `isi_visi`, `tahun_awal`, `tahun_akhir`, `created_at`, `updated_at`, `rpjmd_id`, `jenis_dokumen`) VALUES
(1, '“MENJAGA KEBERAGAMAN DAN PEMERATAAN PEMBANGUNAN BERSAMA MALUKU UTARA BANGKIT, MAJU, SEJAHTERA BERKEADILAN DAN BERKELANJUTAN”', 2025, 2029, '2025-08-02 18:26:59', '2025-08-02 18:26:59', NULL, NULL);

--
-- Indexes for dumped tables
--

--
-- Indeks untuk tabel `activitylogs`
--
ALTER TABLE `activitylogs`
  ADD PRIMARY KEY (`id`);

--
-- Indeks untuk tabel `arah_kebijakan`
--
ALTER TABLE `arah_kebijakan`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_kode_arah_constraint` (`kode_arah`),
  ADD UNIQUE KEY `unique_arah_kebijakan_combination_v2` (`kode_arah`,`strategi_id`,`deskripsi`(100),`jenis_dokumen`(100),`tahun`,`periode_id`),
  ADD KEY `strategi_id` (`strategi_id`),
  ADD KEY `arah_kebijakan_periode_id_foreign_idx` (`periode_id`),
  ADD KEY `idx_arah_jenis_dokumen` (`jenis_dokumen`),
  ADD KEY `idx_arah_tahun` (`tahun`),
  ADD KEY `idx_arah_periode_id` (`periode_id`),
  ADD KEY `idx_arah_strategi_id` (`strategi_id`);

--
-- Indeks untuk tabel `bmd`
--
ALTER TABLE `bmd`
  ADD PRIMARY KEY (`id`),
  ADD KEY `periode_id` (`periode_id`);

--
-- Indeks untuk tabel `cascading`
--
ALTER TABLE `cascading`
  ADD PRIMARY KEY (`id`),
  ADD KEY `misi_id` (`misi_id`),
  ADD KEY `prior_nas_id` (`prior_nas_id`),
  ADD KEY `prior_daerah_id` (`prior_daerah_id`),
  ADD KEY `prior_kepda_id` (`prior_kepda_id`),
  ADD KEY `tujuan_id` (`tujuan_id`),
  ADD KEY `sasaran_id` (`sasaran_id`),
  ADD KEY `program_id` (`program_id`),
  ADD KEY `kegiatan_id` (`kegiatan_id`),
  ADD KEY `cascading_strategi_id_foreign_idx` (`strategi_id`),
  ADD KEY `cascading_arah_kebijakan_id_foreign_idx` (`arah_kebijakan_id`),
  ADD KEY `cascading_periode_id_foreign_idx` (`periode_id`);

--
-- Indeks untuk tabel `cascading_arah_kebijakan`
--
ALTER TABLE `cascading_arah_kebijakan`
  ADD KEY `cascading_id` (`cascading_id`),
  ADD KEY `arah_kebijakan_id` (`arah_kebijakan_id`);

--
-- Indeks untuk tabel `cascading_strategi`
--
ALTER TABLE `cascading_strategi`
  ADD KEY `cascading_id` (`cascading_id`),
  ADD KEY `strategi_id` (`strategi_id`);

--
-- Indeks untuk tabel `divisions`
--
ALTER TABLE `divisions`
  ADD PRIMARY KEY (`id`),
  ADD KEY `divisions_rpjmd_id_foreign_idx` (`rpjmd_id`);

--
-- Indeks untuk tabel `dpa`
--
ALTER TABLE `dpa`
  ADD PRIMARY KEY (`id`),
  ADD KEY `periode_id` (`periode_id`),
  ADD KEY `rka_id` (`rka_id`);

--
-- Indeks untuk tabel `evaluasi`
--
ALTER TABLE `evaluasi`
  ADD PRIMARY KEY (`id`),
  ADD KEY `indikator_id` (`indikator_id`);

--
-- Indeks untuk tabel `evaluasi_rpjmd`
--
ALTER TABLE `evaluasi_rpjmd`
  ADD PRIMARY KEY (`id`),
  ADD KEY `indikator_id` (`indikator_id`);

--
-- Indeks untuk tabel `export_laporan`
--
ALTER TABLE `export_laporan`
  ADD PRIMARY KEY (`id`);

--
-- Indeks untuk tabel `indikator`
--
ALTER TABLE `indikator`
  ADD PRIMARY KEY (`id`),
  ADD KEY `sasaran_id` (`sasaran_id`),
  ADD KEY `indikator_rpjmd_id_foreign_idx` (`rpjmd_id`),
  ADD KEY `indikator_tujuan_id_foreign_idx` (`tujuan_id`),
  ADD KEY `indikator_misi_id_foreign_idx` (`misi_id`),
  ADD KEY `indikator_program_id_foreign_idx` (`program_id`),
  ADD KEY `indikator_kegiatan_id_foreign_idx` (`kegiatan_id`);

--
-- Indeks untuk tabel `indikatorkegiatans`
--
ALTER TABLE `indikatorkegiatans`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_indikatorkegiatans_combination` (`kode_indikator`,`jenis_dokumen`,`tahun`),
  ADD KEY `indikatorkegiatans_program_id_foreign_idx` (`program_id`),
  ADD KEY `indikatorkegiatans_rkpd_id_foreign_idx` (`rkpd_id`),
  ADD KEY `fk_indikatorkegiatans_penanggung_jawab` (`penanggung_jawab`),
  ADD KEY `indikatorkegiatans_prioritas_nasional_id_foreign_idx` (`prioritas_nasional_id`),
  ADD KEY `indikatorkegiatans_prioritas_daerah_id_foreign_idx` (`prioritas_daerah_id`),
  ADD KEY `indikatorkegiatans_prioritas_gubernur_id_foreign_idx` (`prioritas_gubernur_id`);

--
-- Indeks untuk tabel `indikatormisis`
--
ALTER TABLE `indikatormisis`
  ADD PRIMARY KEY (`id`);

--
-- Indeks untuk tabel `indikatorprograms`
--
ALTER TABLE `indikatorprograms`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_indikatorprograms_combination` (`program_id`,`kode_indikator`,`jenis_dokumen`(100),`tahun`);

--
-- Indeks untuk tabel `indikatorsasarans`
--
ALTER TABLE `indikatorsasarans`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_indikatorsasarans_combination` (`indikator_id`,`kode_indikator`,`jenis_dokumen`,`tahun`);

--
-- Indeks untuk tabel `indikatortujuans`
--
ALTER TABLE `indikatortujuans`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_indikatortujuans_combination` (`kode_indikator`,`tujuan_id`,`jenis_dokumen`(100),`tahun`),
  ADD KEY `indikatortujuans_misi_id_foreign_idx` (`misi_id`),
  ADD KEY `indikatortujuans_tujuan_id_foreign_idx` (`tujuan_id`);

--
-- Indeks untuk tabel `indikator_detail`
--
ALTER TABLE `indikator_detail`
  ADD PRIMARY KEY (`id`),
  ADD KEY `indikator_id` (`indikator_id`);

--
-- Indeks untuk tabel `indikator_renstra`
--
ALTER TABLE `indikator_renstra`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_indikator_renstra_renstra_id` (`renstra_id`);

--
-- Indeks untuk tabel `kebijakan_opd`
--
ALTER TABLE `kebijakan_opd`
  ADD PRIMARY KEY (`id`);

--
-- Indeks untuk tabel `kegiatan`
--
ALTER TABLE `kegiatan`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_kode_kegiatan_per_periode` (`periode_id`,`kode_kegiatan`),
  ADD UNIQUE KEY `unique_nama_kegiatan_per_periode` (`periode_id`,`nama_kegiatan`),
  ADD UNIQUE KEY `unique_kegiatan_kode_combination` (`periode_id`,`jenis_dokumen`,`kode_kegiatan`),
  ADD UNIQUE KEY `unique_kegiatan_nama_combination` (`periode_id`,`jenis_dokumen`,`nama_kegiatan`),
  ADD KEY `program_id` (`program_id`),
  ADD KEY `kegiatan_periode_id_foreign_idx` (`periode_id`),
  ADD KEY `fk_opd_penanggung_jawab` (`opd_penanggung_jawab`);

--
-- Indeks untuk tabel `kegiatan_opd`
--
ALTER TABLE `kegiatan_opd`
  ADD PRIMARY KEY (`id`);

--
-- Indeks untuk tabel `kegiatan_skpd`
--
ALTER TABLE `kegiatan_skpd`
  ADD PRIMARY KEY (`id`),
  ADD KEY `program_skpd_id` (`program_skpd_id`);

--
-- Indeks untuk tabel `lakip`
--
ALTER TABLE `lakip`
  ADD PRIMARY KEY (`id`),
  ADD KEY `periode_id` (`periode_id`),
  ADD KEY `renstra_id` (`renstra_id`),
  ADD KEY `rkpd_id` (`rkpd_id`),
  ADD KEY `renja_id` (`renja_id`),
  ADD KEY `lk_dispang_id` (`lk_dispang_id`);

--
-- Indeks untuk tabel `lk_dispang`
--
ALTER TABLE `lk_dispang`
  ADD PRIMARY KEY (`id`),
  ADD KEY `periode_id` (`periode_id`),
  ADD KEY `dpa_id` (`dpa_id`),
  ADD KEY `penatausahaan_id` (`penatausahaan_id`),
  ADD KEY `bmd_id` (`bmd_id`);

--
-- Indeks untuk tabel `lpk_dispang`
--
ALTER TABLE `lpk_dispang`
  ADD PRIMARY KEY (`id`),
  ADD KEY `periode_id` (`periode_id`),
  ADD KEY `monev_id` (`monev_id`);

--
-- Indeks untuk tabel `misi`
--
ALTER TABLE `misi`
  ADD PRIMARY KEY (`id`),
  ADD KEY `visi_id` (`visi_id`),
  ADD KEY `misi_rpjmd_id_foreign_idx` (`rpjmd_id`);

--
-- Indeks untuk tabel `monev`
--
ALTER TABLE `monev`
  ADD PRIMARY KEY (`id`),
  ADD KEY `periode_id` (`periode_id`),
  ADD KEY `pengkeg_id` (`pengkeg_id`);

--
-- Indeks untuk tabel `monitoring_indikator`
--
ALTER TABLE `monitoring_indikator`
  ADD PRIMARY KEY (`id_monitoring`),
  ADD KEY `indikator_id` (`indikator_id`);

--
-- Indeks untuk tabel `monitoring_indikator_rpjmd`
--
ALTER TABLE `monitoring_indikator_rpjmd`
  ADD PRIMARY KEY (`id`),
  ADD KEY `indikator_id` (`indikator_id`);

--
-- Indeks untuk tabel `new_evaluasi_rpjmd`
--
ALTER TABLE `new_evaluasi_rpjmd`
  ADD PRIMARY KEY (`id_evaluasi`);

--
-- Indeks untuk tabel `new_laporan_rpjmd`
--
ALTER TABLE `new_laporan_rpjmd`
  ADD PRIMARY KEY (`id_laporan`);

--
-- Indeks untuk tabel `new_monitoring_rpjmd`
--
ALTER TABLE `new_monitoring_rpjmd`
  ADD PRIMARY KEY (`id_monitoring`);

--
-- Indeks untuk tabel `notifications`
--
ALTER TABLE `notifications`
  ADD PRIMARY KEY (`id`);

--
-- Indeks untuk tabel `opd_penanggung_jawab`
--
ALTER TABLE `opd_penanggung_jawab`
  ADD PRIMARY KEY (`id`);

--
-- Indeks untuk tabel `penatausahaan`
--
ALTER TABLE `penatausahaan`
  ADD PRIMARY KEY (`id`),
  ADD KEY `periode_id` (`periode_id`),
  ADD KEY `dpa_id` (`dpa_id`);

--
-- Indeks untuk tabel `pengkeg`
--
ALTER TABLE `pengkeg`
  ADD PRIMARY KEY (`id`),
  ADD KEY `periode_id` (`periode_id`),
  ADD KEY `dpa_id` (`dpa_id`);

--
-- Indeks untuk tabel `peran_hak_kewenangan`
--
ALTER TABLE `peran_hak_kewenangan`
  ADD PRIMARY KEY (`id`),
  ADD KEY `role_id` (`role_id`);

--
-- Indeks untuk tabel `periode_rpjmds`
--
ALTER TABLE `periode_rpjmds`
  ADD PRIMARY KEY (`id`);

--
-- Indeks untuk tabel `prioritas_daerah`
--
ALTER TABLE `prioritas_daerah`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_prioda_tahun` (`tahun`),
  ADD KEY `idx_prioda_jenis_dokumen` (`jenis_dokumen`);

--
-- Indeks untuk tabel `prioritas_kepala_daerah`
--
ALTER TABLE `prioritas_kepala_daerah`
  ADD PRIMARY KEY (`id`),
  ADD KEY `prioritas_kepala_daerah_sasaran_id_foreign_idx` (`sasaran_id`);

--
-- Indeks untuk tabel `prioritas_nasional`
--
ALTER TABLE `prioritas_nasional`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_prionas_tahun` (`tahun`),
  ADD KEY `idx_prionas_jenis_dokumen` (`jenis_dokumen`);

--
-- Indeks untuk tabel `program`
--
ALTER TABLE `program`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_kode_program_per_periode_constraint` (`periode_id`,`kode_program`),
  ADD UNIQUE KEY `unique_nama_program_per_periode_constraint` (`periode_id`,`nama_program`),
  ADD UNIQUE KEY `unique_program_kode_combination` (`periode_id`,`jenis_dokumen`,`kode_program`),
  ADD UNIQUE KEY `unique_program_nama_combination` (`periode_id`,`jenis_dokumen`,`nama_program`),
  ADD KEY `sasaran_id` (`sasaran_id`),
  ADD KEY `program_rpjmd_id_foreign_idx` (`rpjmd_id`),
  ADD KEY `program_periode_id_foreign_idx` (`periode_id`);

--
-- Indeks untuk tabel `program_arah_kebijakan`
--
ALTER TABLE `program_arah_kebijakan`
  ADD PRIMARY KEY (`program_id`,`arah_kebijakan_id`),
  ADD KEY `arah_kebijakan_id` (`arah_kebijakan_id`),
  ADD KEY `program_arah_kebijakan_strategi_id_foreign_idx` (`strategi_id`);

--
-- Indeks untuk tabel `program_opd`
--
ALTER TABLE `program_opd`
  ADD PRIMARY KEY (`id`);

--
-- Indeks untuk tabel `program_skpd`
--
ALTER TABLE `program_skpd`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_program` (`program_id`);

--
-- Indeks untuk tabel `program_strategi`
--
ALTER TABLE `program_strategi`
  ADD PRIMARY KEY (`program_id`,`strategi_id`),
  ADD KEY `strategi_id` (`strategi_id`);

--
-- Indeks untuk tabel `realisasisubkegiatans`
--
ALTER TABLE `realisasisubkegiatans`
  ADD PRIMARY KEY (`id`);

--
-- Indeks untuk tabel `realisasi_indikator`
--
ALTER TABLE `realisasi_indikator`
  ADD PRIMARY KEY (`id_realisasi`),
  ADD KEY `indikator_id` (`indikator_id`);

--
-- Indeks untuk tabel `realisasi_sub_kegiatan`
--
ALTER TABLE `realisasi_sub_kegiatan`
  ADD PRIMARY KEY (`id`),
  ADD KEY `sub_kegiatan_id` (`sub_kegiatan_id`);

--
-- Indeks untuk tabel `realisasi_sub_kegiatan_rpjmd`
--
ALTER TABLE `realisasi_sub_kegiatan_rpjmd`
  ADD PRIMARY KEY (`id`),
  ADD KEY `sub_kegiatan_id` (`sub_kegiatan_id`);

--
-- Indeks untuk tabel `rekomendasi_otomatis`
--
ALTER TABLE `rekomendasi_otomatis`
  ADD PRIMARY KEY (`id`),
  ADD KEY `evaluasi_id` (`evaluasi_id`);

--
-- Indeks untuk tabel `renja`
--
ALTER TABLE `renja`
  ADD PRIMARY KEY (`id`),
  ADD KEY `periode_id` (`periode_id`),
  ADD KEY `rkpd_id` (`rkpd_id`);

--
-- Indeks untuk tabel `renstra_bab`
--
ALTER TABLE `renstra_bab`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uniq_tahun_bab` (`tahun`,`bab`);

--
-- Indeks untuk tabel `renstra_kebijakan`
--
ALTER TABLE `renstra_kebijakan`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_renstra_kebijakan_renstra_id` (`renstra_id`);

--
-- Indeks untuk tabel `renstra_kegiatan`
--
ALTER TABLE `renstra_kegiatan`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_renstra_kegiatan_renstra_id` (`renstra_id`);

--
-- Indeks untuk tabel `renstra_opd`
--
ALTER TABLE `renstra_opd`
  ADD PRIMARY KEY (`id`);

--
-- Indeks untuk tabel `renstra_program`
--
ALTER TABLE `renstra_program`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_renstra_program_renstra_id` (`renstra_id`);

--
-- Indeks untuk tabel `renstra_sasaran`
--
ALTER TABLE `renstra_sasaran`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_renstra_sasaran_renstra_id` (`renstra_id`);

--
-- Indeks untuk tabel `renstra_strategi`
--
ALTER TABLE `renstra_strategi`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_renstra_strategi_renstra_id` (`renstra_id`);

--
-- Indeks untuk tabel `renstra_subkegiatan`
--
ALTER TABLE `renstra_subkegiatan`
  ADD PRIMARY KEY (`id`),
  ADD KEY `renstra_subkegiatan_renstra_program_id_foreign_idx` (`renstra_program_id`),
  ADD KEY `renstra_subkegiatan_sub_kegiatan_id_foreign_idx` (`sub_kegiatan_id`);

--
-- Indeks untuk tabel `renstra_tabel_kegiatan`
--
ALTER TABLE `renstra_tabel_kegiatan`
  ADD PRIMARY KEY (`id`),
  ADD KEY `program_id` (`program_id`),
  ADD KEY `kegiatan_id` (`kegiatan_id`),
  ADD KEY `indikator_id` (`indikator_id`);

--
-- Indeks untuk tabel `renstra_tabel_program`
--
ALTER TABLE `renstra_tabel_program`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_program_indikator` (`program_id`,`indikator_id`),
  ADD KEY `indikator_id` (`indikator_id`);

--
-- Indeks untuk tabel `renstra_tabel_sasaran`
--
ALTER TABLE `renstra_tabel_sasaran`
  ADD PRIMARY KEY (`id`);

--
-- Indeks untuk tabel `renstra_tabel_subkegiatan`
--
ALTER TABLE `renstra_tabel_subkegiatan`
  ADD PRIMARY KEY (`id`);

--
-- Indeks untuk tabel `renstra_tabel_tujuan`
--
ALTER TABLE `renstra_tabel_tujuan`
  ADD PRIMARY KEY (`id`),
  ADD KEY `renstra_tabel_tujuan_opd_id_foreign_idx` (`opd_id`);

--
-- Indeks untuk tabel `renstra_target`
--
ALTER TABLE `renstra_target`
  ADD PRIMARY KEY (`id`),
  ADD KEY `indikator_id` (`indikator_id`);

--
-- Indeks untuk tabel `renstra_target_detail`
--
ALTER TABLE `renstra_target_detail`
  ADD PRIMARY KEY (`id`),
  ADD KEY `renstra_target_id` (`renstra_target_id`);

--
-- Indeks untuk tabel `renstra_tujuan`
--
ALTER TABLE `renstra_tujuan`
  ADD PRIMARY KEY (`id`);

--
-- Indeks untuk tabel `report`
--
ALTER TABLE `report`
  ADD PRIMARY KEY (`id`);

--
-- Indeks untuk tabel `rka`
--
ALTER TABLE `rka`
  ADD PRIMARY KEY (`id`),
  ADD KEY `periode_id` (`periode_id`),
  ADD KEY `renja_id` (`renja_id`);

--
-- Indeks untuk tabel `rkpd`
--
ALTER TABLE `rkpd`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_rkpd_periode_id` (`periode_id`),
  ADD KEY `fk_rkpd_renstra_program_id` (`renstra_program_id`),
  ADD KEY `rkpd_indikator_kegiatan_id_foreign_idx` (`indikator_kegiatan_id`),
  ADD KEY `rkpd_indikator_program_id_foreign_idx` (`indikator_program_id`),
  ADD KEY `rkpd_indikator_sasaran_id_foreign_idx` (`indikator_sasaran_id`),
  ADD KEY `rkpd_tujuan_id_foreign_idx` (`tujuan_id`),
  ADD KEY `rkpd_sasaran_id_foreign_idx` (`sasaran_id`),
  ADD KEY `rkpd_strategi_id_foreign_idx` (`strategi_id`),
  ADD KEY `rkpd_arah_kebijakan_id_foreign_idx` (`arah_id`),
  ADD KEY `rkpd_indikator_tujuan_id_foreign_idx` (`indikator_tujuan_id`),
  ADD KEY `rkpd_program_id_foreign_idx` (`program_id`),
  ADD KEY `rkpd_kegiatan_id_foreign_idx` (`kegiatan_id`),
  ADD KEY `rkpd_sub_kegiatan_id_foreign_idx` (`sub_kegiatan_id`),
  ADD KEY `rkpd_opd_penanggung_jawab_id_foreign_idx` (`opd_id`),
  ADD KEY `rkpd_prioritas_nasional_id_foreign_idx` (`prioritas_nasional_id`),
  ADD KEY `rkpd_prioritas_daerah_id_foreign_idx` (`prioritas_daerah_id`),
  ADD KEY `rkpd_prioritas_kepala_daerah_id_foreign_idx` (`prioritas_gubernur_id`);

--
-- Indeks untuk tabel `roles`
--
ALTER TABLE `roles`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `name` (`name`);

--
-- Indeks untuk tabel `rpjmd`
--
ALTER TABLE `rpjmd`
  ADD PRIMARY KEY (`id`);

--
-- Indeks untuk tabel `sasaran`
--
ALTER TABLE `sasaran`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_sasaran_clone` (`tujuan_id`,`nomor`,`jenis_dokumen`,`tahun`),
  ADD UNIQUE KEY `unique_sasaran_combination` (`nomor`,`tujuan_id`,`jenis_dokumen`(100),`tahun`,`periode_id`),
  ADD KEY `tujuan_id` (`tujuan_id`),
  ADD KEY `sasaran_rpjmd_id_foreign_idx` (`rpjmd_id`),
  ADD KEY `sasaran_periode_id_foreign_idx` (`periode_id`),
  ADD KEY `sasaran_jenis_dokumen` (`jenis_dokumen`),
  ADD KEY `sasaran_tahun` (`tahun`),
  ADD KEY `sasaran_periode_id` (`periode_id`),
  ADD KEY `idx_sasaran_jenis_dokumen` (`jenis_dokumen`),
  ADD KEY `idx_sasaran_tahun` (`tahun`),
  ADD KEY `idx_sasaran_periode_id` (`periode_id`);

--
-- Indeks untuk tabel `sasaran_opd`
--
ALTER TABLE `sasaran_opd`
  ADD PRIMARY KEY (`id`);

--
-- Indeks untuk tabel `sequelizemeta`
--
ALTER TABLE `sequelizemeta`
  ADD PRIMARY KEY (`name`),
  ADD UNIQUE KEY `name` (`name`);

--
-- Indeks untuk tabel `strategi`
--
ALTER TABLE `strategi`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_strategi_per_sasaran` (`sasaran_id`,`deskripsi`(100),`jenis_dokumen`(100),`tahun`,`periode_id`),
  ADD UNIQUE KEY `unique_strategi_kode_per_periode` (`kode_strategi`,`sasaran_id`,`jenis_dokumen`(100),`tahun`,`periode_id`),
  ADD KEY `sasaran_id` (`sasaran_id`),
  ADD KEY `strategi_periode_id_foreign_idx` (`periode_id`),
  ADD KEY `idx_strategi_sasaran_id` (`sasaran_id`),
  ADD KEY `idx_strategi_jenis_dokumen` (`jenis_dokumen`),
  ADD KEY `idx_strategi_tahun` (`tahun`),
  ADD KEY `idx_strategi_periode_id` (`periode_id`);

--
-- Indeks untuk tabel `strategi_opd`
--
ALTER TABLE `strategi_opd`
  ADD PRIMARY KEY (`id`);

--
-- Indeks untuk tabel `subkegiatan_opd`
--
ALTER TABLE `subkegiatan_opd`
  ADD PRIMARY KEY (`id`);

--
-- Indeks untuk tabel `sub_kegiatan`
--
ALTER TABLE `sub_kegiatan`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_kode_sub_kegiatan_per_periode` (`periode_id`,`kode_sub_kegiatan`),
  ADD UNIQUE KEY `unique_sub_kegiatan_per_periode` (`kode_sub_kegiatan`,`periode_id`,`tahun`,`jenis_dokumen`(100)),
  ADD KEY `kegiatan_id` (`kegiatan_id`),
  ADD KEY `sub_kegiatan_periode_id_foreign_idx` (`periode_id`),
  ADD KEY `idx_sub_kegiatan_periode_id` (`periode_id`),
  ADD KEY `idx_sub_kegiatan_tahun` (`tahun`),
  ADD KEY `idx_sub_kegiatan_jenis_dokumen` (`jenis_dokumen`),
  ADD KEY `idx_sub_kegiatan_kegiatan_id` (`kegiatan_id`);

--
-- Indeks untuk tabel `target_indikator`
--
ALTER TABLE `target_indikator`
  ADD PRIMARY KEY (`id_target`);

--
-- Indeks untuk tabel `tujuan`
--
ALTER TABLE `tujuan`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_no_tujuan_dokumen_tahun_periode` (`no_tujuan`,`jenis_dokumen`,`tahun`,`periode_id`),
  ADD UNIQUE KEY `unique_tujuan_combination` (`misi_id`,`no_tujuan`,`jenis_dokumen`,`tahun`,`periode_id`),
  ADD KEY `misi_id` (`misi_id`),
  ADD KEY `tujuan_rpjmd_id_foreign_idx` (`rpjmd_id`),
  ADD KEY `tujuan_periode_id_foreign_idx` (`periode_id`);

--
-- Indeks untuk tabel `tujuan_opd`
--
ALTER TABLE `tujuan_opd`
  ADD PRIMARY KEY (`id`);

--
-- Indeks untuk tabel `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `username` (`username`),
  ADD UNIQUE KEY `email` (`email`),
  ADD KEY `divisions_id` (`divisions_id`),
  ADD KEY `fk_role_id` (`role_id`),
  ADD KEY `periode_id` (`periode_id`);

--
-- Indeks untuk tabel `visi`
--
ALTER TABLE `visi`
  ADD PRIMARY KEY (`id`),
  ADD KEY `visi_rpjmd_id_foreign_idx` (`rpjmd_id`);

--
-- AUTO_INCREMENT untuk tabel yang dibuang
--

--
-- AUTO_INCREMENT untuk tabel `activitylogs`
--
ALTER TABLE `activitylogs`
  MODIFY `id` int UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT untuk tabel `arah_kebijakan`
--
ALTER TABLE `arah_kebijakan`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=86;

--
-- AUTO_INCREMENT untuk tabel `bmd`
--
ALTER TABLE `bmd`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT untuk tabel `cascading`
--
ALTER TABLE `cascading`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT untuk tabel `divisions`
--
ALTER TABLE `divisions`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=91;

--
-- AUTO_INCREMENT untuk tabel `dpa`
--
ALTER TABLE `dpa`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT untuk tabel `evaluasi`
--
ALTER TABLE `evaluasi`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT untuk tabel `evaluasi_rpjmd`
--
ALTER TABLE `evaluasi_rpjmd`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT untuk tabel `export_laporan`
--
ALTER TABLE `export_laporan`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT untuk tabel `indikator`
--
ALTER TABLE `indikator`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT untuk tabel `indikatorkegiatans`
--
ALTER TABLE `indikatorkegiatans`
  MODIFY `id` int UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT untuk tabel `indikatormisis`
--
ALTER TABLE `indikatormisis`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT untuk tabel `indikatorprograms`
--
ALTER TABLE `indikatorprograms`
  MODIFY `id` int UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT untuk tabel `indikatorsasarans`
--
ALTER TABLE `indikatorsasarans`
  MODIFY `id` int UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=10;

--
-- AUTO_INCREMENT untuk tabel `indikatortujuans`
--
ALTER TABLE `indikatortujuans`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT untuk tabel `indikator_detail`
--
ALTER TABLE `indikator_detail`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT untuk tabel `indikator_renstra`
--
ALTER TABLE `indikator_renstra`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=10;

--
-- AUTO_INCREMENT untuk tabel `kebijakan_opd`
--
ALTER TABLE `kebijakan_opd`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT untuk tabel `kegiatan`
--
ALTER TABLE `kegiatan`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT untuk tabel `kegiatan_opd`
--
ALTER TABLE `kegiatan_opd`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT untuk tabel `kegiatan_skpd`
--
ALTER TABLE `kegiatan_skpd`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT untuk tabel `lakip`
--
ALTER TABLE `lakip`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT untuk tabel `lk_dispang`
--
ALTER TABLE `lk_dispang`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT untuk tabel `lpk_dispang`
--
ALTER TABLE `lpk_dispang`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT untuk tabel `misi`
--
ALTER TABLE `misi`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT untuk tabel `monev`
--
ALTER TABLE `monev`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT untuk tabel `monitoring_indikator`
--
ALTER TABLE `monitoring_indikator`
  MODIFY `id_monitoring` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT untuk tabel `monitoring_indikator_rpjmd`
--
ALTER TABLE `monitoring_indikator_rpjmd`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT untuk tabel `new_evaluasi_rpjmd`
--
ALTER TABLE `new_evaluasi_rpjmd`
  MODIFY `id_evaluasi` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT untuk tabel `new_laporan_rpjmd`
--
ALTER TABLE `new_laporan_rpjmd`
  MODIFY `id_laporan` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT untuk tabel `new_monitoring_rpjmd`
--
ALTER TABLE `new_monitoring_rpjmd`
  MODIFY `id_monitoring` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT untuk tabel `notifications`
--
ALTER TABLE `notifications`
  MODIFY `id` int UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT untuk tabel `opd_penanggung_jawab`
--
ALTER TABLE `opd_penanggung_jawab`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=349;

--
-- AUTO_INCREMENT untuk tabel `penatausahaan`
--
ALTER TABLE `penatausahaan`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT untuk tabel `pengkeg`
--
ALTER TABLE `pengkeg`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT untuk tabel `peran_hak_kewenangan`
--
ALTER TABLE `peran_hak_kewenangan`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT untuk tabel `periode_rpjmds`
--
ALTER TABLE `periode_rpjmds`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT untuk tabel `prioritas_daerah`
--
ALTER TABLE `prioritas_daerah`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT untuk tabel `prioritas_kepala_daerah`
--
ALTER TABLE `prioritas_kepala_daerah`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=23;

--
-- AUTO_INCREMENT untuk tabel `prioritas_nasional`
--
ALTER TABLE `prioritas_nasional`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=21;

--
-- AUTO_INCREMENT untuk tabel `program`
--
ALTER TABLE `program`
  MODIFY `id` int UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=11;

--
-- AUTO_INCREMENT untuk tabel `program_opd`
--
ALTER TABLE `program_opd`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT untuk tabel `program_skpd`
--
ALTER TABLE `program_skpd`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT untuk tabel `realisasisubkegiatans`
--
ALTER TABLE `realisasisubkegiatans`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT untuk tabel `realisasi_indikator`
--
ALTER TABLE `realisasi_indikator`
  MODIFY `id_realisasi` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT untuk tabel `realisasi_sub_kegiatan`
--
ALTER TABLE `realisasi_sub_kegiatan`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT untuk tabel `realisasi_sub_kegiatan_rpjmd`
--
ALTER TABLE `realisasi_sub_kegiatan_rpjmd`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT untuk tabel `rekomendasi_otomatis`
--
ALTER TABLE `rekomendasi_otomatis`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT untuk tabel `renja`
--
ALTER TABLE `renja`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT untuk tabel `renstra_bab`
--
ALTER TABLE `renstra_bab`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT untuk tabel `renstra_kebijakan`
--
ALTER TABLE `renstra_kebijakan`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT untuk tabel `renstra_kegiatan`
--
ALTER TABLE `renstra_kegiatan`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT untuk tabel `renstra_opd`
--
ALTER TABLE `renstra_opd`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT untuk tabel `renstra_program`
--
ALTER TABLE `renstra_program`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT untuk tabel `renstra_sasaran`
--
ALTER TABLE `renstra_sasaran`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT untuk tabel `renstra_strategi`
--
ALTER TABLE `renstra_strategi`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT untuk tabel `renstra_subkegiatan`
--
ALTER TABLE `renstra_subkegiatan`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT untuk tabel `renstra_tabel_kegiatan`
--
ALTER TABLE `renstra_tabel_kegiatan`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT untuk tabel `renstra_tabel_program`
--
ALTER TABLE `renstra_tabel_program`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT untuk tabel `renstra_tabel_sasaran`
--
ALTER TABLE `renstra_tabel_sasaran`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT untuk tabel `renstra_tabel_subkegiatan`
--
ALTER TABLE `renstra_tabel_subkegiatan`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT untuk tabel `renstra_tabel_tujuan`
--
ALTER TABLE `renstra_tabel_tujuan`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT untuk tabel `renstra_target`
--
ALTER TABLE `renstra_target`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT untuk tabel `renstra_target_detail`
--
ALTER TABLE `renstra_target_detail`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT untuk tabel `renstra_tujuan`
--
ALTER TABLE `renstra_tujuan`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT untuk tabel `report`
--
ALTER TABLE `report`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT untuk tabel `rka`
--
ALTER TABLE `rka`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT untuk tabel `rkpd`
--
ALTER TABLE `rkpd`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT untuk tabel `roles`
--
ALTER TABLE `roles`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=32;

--
-- AUTO_INCREMENT untuk tabel `rpjmd`
--
ALTER TABLE `rpjmd`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT untuk tabel `sasaran`
--
ALTER TABLE `sasaran`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=17;

--
-- AUTO_INCREMENT untuk tabel `sasaran_opd`
--
ALTER TABLE `sasaran_opd`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT untuk tabel `strategi`
--
ALTER TABLE `strategi`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT untuk tabel `strategi_opd`
--
ALTER TABLE `strategi_opd`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT untuk tabel `subkegiatan_opd`
--
ALTER TABLE `subkegiatan_opd`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT untuk tabel `sub_kegiatan`
--
ALTER TABLE `sub_kegiatan`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT untuk tabel `target_indikator`
--
ALTER TABLE `target_indikator`
  MODIFY `id_target` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT untuk tabel `tujuan`
--
ALTER TABLE `tujuan`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT untuk tabel `tujuan_opd`
--
ALTER TABLE `tujuan_opd`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT untuk tabel `users`
--
ALTER TABLE `users`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=11;

--
-- AUTO_INCREMENT untuk tabel `visi`
--
ALTER TABLE `visi`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- Ketidakleluasaan untuk tabel pelimpahan (Dumped Tables)
--

--
-- Ketidakleluasaan untuk tabel `arah_kebijakan`
--
ALTER TABLE `arah_kebijakan`
  ADD CONSTRAINT `arah_kebijakan_ibfk_1` FOREIGN KEY (`strategi_id`) REFERENCES `strategi` (`id`) ON UPDATE CASCADE,
  ADD CONSTRAINT `arah_kebijakan_periode_id_foreign_idx` FOREIGN KEY (`periode_id`) REFERENCES `periode_rpjmds` (`id`);

--
-- Ketidakleluasaan untuk tabel `bmd`
--
ALTER TABLE `bmd`
  ADD CONSTRAINT `bmd_ibfk_1` FOREIGN KEY (`periode_id`) REFERENCES `periode_rpjmds` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Ketidakleluasaan untuk tabel `cascading`
--
ALTER TABLE `cascading`
  ADD CONSTRAINT `cascading_arah_kebijakan_id_foreign_idx` FOREIGN KEY (`arah_kebijakan_id`) REFERENCES `arah_kebijakan` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `cascading_ibfk_1` FOREIGN KEY (`misi_id`) REFERENCES `misi` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `cascading_ibfk_2` FOREIGN KEY (`prior_nas_id`) REFERENCES `prioritas_nasional` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `cascading_ibfk_3` FOREIGN KEY (`prior_daerah_id`) REFERENCES `prioritas_daerah` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `cascading_ibfk_4` FOREIGN KEY (`prior_kepda_id`) REFERENCES `prioritas_kepala_daerah` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `cascading_ibfk_5` FOREIGN KEY (`tujuan_id`) REFERENCES `tujuan` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `cascading_ibfk_6` FOREIGN KEY (`sasaran_id`) REFERENCES `sasaran` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `cascading_ibfk_8` FOREIGN KEY (`kegiatan_id`) REFERENCES `kegiatan` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `cascading_periode_id_foreign_idx` FOREIGN KEY (`periode_id`) REFERENCES `periode_rpjmds` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `cascading_strategi_id_foreign_idx` FOREIGN KEY (`strategi_id`) REFERENCES `strategi` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Ketidakleluasaan untuk tabel `cascading_arah_kebijakan`
--
ALTER TABLE `cascading_arah_kebijakan`
  ADD CONSTRAINT `cascading_arah_kebijakan_ibfk_1` FOREIGN KEY (`cascading_id`) REFERENCES `cascading` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `cascading_arah_kebijakan_ibfk_2` FOREIGN KEY (`arah_kebijakan_id`) REFERENCES `arah_kebijakan` (`id`) ON DELETE CASCADE;

--
-- Ketidakleluasaan untuk tabel `cascading_strategi`
--
ALTER TABLE `cascading_strategi`
  ADD CONSTRAINT `cascading_strategi_ibfk_1` FOREIGN KEY (`cascading_id`) REFERENCES `cascading` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `cascading_strategi_ibfk_2` FOREIGN KEY (`strategi_id`) REFERENCES `strategi` (`id`) ON DELETE CASCADE;

--
-- Ketidakleluasaan untuk tabel `divisions`
--
ALTER TABLE `divisions`
  ADD CONSTRAINT `divisions_rpjmd_id_foreign_idx` FOREIGN KEY (`rpjmd_id`) REFERENCES `rpjmd` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Ketidakleluasaan untuk tabel `dpa`
--
ALTER TABLE `dpa`
  ADD CONSTRAINT `dpa_ibfk_1` FOREIGN KEY (`periode_id`) REFERENCES `periode_rpjmds` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `dpa_ibfk_2` FOREIGN KEY (`rka_id`) REFERENCES `rka` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Ketidakleluasaan untuk tabel `evaluasi`
--
ALTER TABLE `evaluasi`
  ADD CONSTRAINT `evaluasi_ibfk_1` FOREIGN KEY (`indikator_id`) REFERENCES `indikator` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Ketidakleluasaan untuk tabel `evaluasi_rpjmd`
--
ALTER TABLE `evaluasi_rpjmd`
  ADD CONSTRAINT `evaluasi_rpjmd_ibfk_1` FOREIGN KEY (`indikator_id`) REFERENCES `indikator` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Ketidakleluasaan untuk tabel `indikator`
--
ALTER TABLE `indikator`
  ADD CONSTRAINT `indikator_ibfk_1` FOREIGN KEY (`sasaran_id`) REFERENCES `sasaran` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `indikator_kegiatan_id_foreign_idx` FOREIGN KEY (`kegiatan_id`) REFERENCES `kegiatan` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `indikator_misi_id_foreign_idx` FOREIGN KEY (`misi_id`) REFERENCES `misi` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `indikator_program_id_foreign_idx` FOREIGN KEY (`program_id`) REFERENCES `program` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `indikator_rpjmd_id_foreign_idx` FOREIGN KEY (`rpjmd_id`) REFERENCES `rpjmd` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `indikator_tujuan_id_foreign_idx` FOREIGN KEY (`tujuan_id`) REFERENCES `tujuan` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Ketidakleluasaan untuk tabel `indikatorkegiatans`
--
ALTER TABLE `indikatorkegiatans`
  ADD CONSTRAINT `fk_indikatorkegiatans_penanggung_jawab` FOREIGN KEY (`penanggung_jawab`) REFERENCES `opd_penanggung_jawab` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_indikatorkegiatans_program_id_to_program` FOREIGN KEY (`program_id`) REFERENCES `program` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `indikatorkegiatans_prioritas_daerah_id_foreign_idx` FOREIGN KEY (`prioritas_daerah_id`) REFERENCES `prioritas_daerah` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `indikatorkegiatans_prioritas_gubernur_id_foreign_idx` FOREIGN KEY (`prioritas_gubernur_id`) REFERENCES `prioritas_kepala_daerah` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `indikatorkegiatans_prioritas_nasional_id_foreign_idx` FOREIGN KEY (`prioritas_nasional_id`) REFERENCES `prioritas_nasional` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `indikatorkegiatans_rkpd_id_foreign_idx` FOREIGN KEY (`rkpd_id`) REFERENCES `rkpd` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Ketidakleluasaan untuk tabel `indikatorprograms`
--
ALTER TABLE `indikatorprograms`
  ADD CONSTRAINT `indikatorprograms_program_id_foreign_idx` FOREIGN KEY (`program_id`) REFERENCES `program` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Ketidakleluasaan untuk tabel `indikatortujuans`
--
ALTER TABLE `indikatortujuans`
  ADD CONSTRAINT `indikatortujuans_misi_id_foreign_idx` FOREIGN KEY (`misi_id`) REFERENCES `misi` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `indikatortujuans_tujuan_id_foreign_idx` FOREIGN KEY (`tujuan_id`) REFERENCES `tujuan` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Ketidakleluasaan untuk tabel `indikator_detail`
--
ALTER TABLE `indikator_detail`
  ADD CONSTRAINT `indikator_detail_ibfk_1` FOREIGN KEY (`indikator_id`) REFERENCES `indikator` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Ketidakleluasaan untuk tabel `indikator_renstra`
--
ALTER TABLE `indikator_renstra`
  ADD CONSTRAINT `fk_indikator_renstra_renstra_id` FOREIGN KEY (`renstra_id`) REFERENCES `renstra_opd` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Ketidakleluasaan untuk tabel `kegiatan`
--
ALTER TABLE `kegiatan`
  ADD CONSTRAINT `fk_kegiatan_periode` FOREIGN KEY (`periode_id`) REFERENCES `periode_rpjmds` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_opd_penanggung_jawab` FOREIGN KEY (`opd_penanggung_jawab`) REFERENCES `opd_penanggung_jawab` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `kegiatan_periode_id_foreign_idx` FOREIGN KEY (`periode_id`) REFERENCES `periode_rpjmds` (`id`);

--
-- Ketidakleluasaan untuk tabel `kegiatan_skpd`
--
ALTER TABLE `kegiatan_skpd`
  ADD CONSTRAINT `fk_kegiatan_skpd_program_skpd_id` FOREIGN KEY (`program_skpd_id`) REFERENCES `program_skpd` (`program_id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Ketidakleluasaan untuk tabel `lakip`
--
ALTER TABLE `lakip`
  ADD CONSTRAINT `lakip_ibfk_1` FOREIGN KEY (`periode_id`) REFERENCES `periode_rpjmds` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `lakip_ibfk_2` FOREIGN KEY (`renstra_id`) REFERENCES `renstra_program` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `lakip_ibfk_3` FOREIGN KEY (`rkpd_id`) REFERENCES `rkpd` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `lakip_ibfk_4` FOREIGN KEY (`renja_id`) REFERENCES `renja` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `lakip_ibfk_5` FOREIGN KEY (`lk_dispang_id`) REFERENCES `lk_dispang` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Ketidakleluasaan untuk tabel `lk_dispang`
--
ALTER TABLE `lk_dispang`
  ADD CONSTRAINT `lk_dispang_ibfk_1` FOREIGN KEY (`periode_id`) REFERENCES `periode_rpjmds` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `lk_dispang_ibfk_2` FOREIGN KEY (`dpa_id`) REFERENCES `dpa` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `lk_dispang_ibfk_3` FOREIGN KEY (`penatausahaan_id`) REFERENCES `penatausahaan` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `lk_dispang_ibfk_4` FOREIGN KEY (`bmd_id`) REFERENCES `bmd` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Ketidakleluasaan untuk tabel `lpk_dispang`
--
ALTER TABLE `lpk_dispang`
  ADD CONSTRAINT `lpk_dispang_ibfk_1` FOREIGN KEY (`periode_id`) REFERENCES `periode_rpjmds` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `lpk_dispang_ibfk_2` FOREIGN KEY (`monev_id`) REFERENCES `monev` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Ketidakleluasaan untuk tabel `misi`
--
ALTER TABLE `misi`
  ADD CONSTRAINT `misi_ibfk_1` FOREIGN KEY (`visi_id`) REFERENCES `visi` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `misi_rpjmd_id_foreign_idx` FOREIGN KEY (`rpjmd_id`) REFERENCES `rpjmd` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Ketidakleluasaan untuk tabel `monev`
--
ALTER TABLE `monev`
  ADD CONSTRAINT `monev_ibfk_1` FOREIGN KEY (`periode_id`) REFERENCES `periode_rpjmds` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `monev_ibfk_2` FOREIGN KEY (`pengkeg_id`) REFERENCES `pengkeg` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Ketidakleluasaan untuk tabel `monitoring_indikator`
--
ALTER TABLE `monitoring_indikator`
  ADD CONSTRAINT `monitoring_indikator_ibfk_1` FOREIGN KEY (`indikator_id`) REFERENCES `indikator` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Ketidakleluasaan untuk tabel `monitoring_indikator_rpjmd`
--
ALTER TABLE `monitoring_indikator_rpjmd`
  ADD CONSTRAINT `monitoring_indikator_rpjmd_ibfk_1` FOREIGN KEY (`indikator_id`) REFERENCES `indikator` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Ketidakleluasaan untuk tabel `penatausahaan`
--
ALTER TABLE `penatausahaan`
  ADD CONSTRAINT `penatausahaan_ibfk_1` FOREIGN KEY (`periode_id`) REFERENCES `periode_rpjmds` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `penatausahaan_ibfk_2` FOREIGN KEY (`dpa_id`) REFERENCES `dpa` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Ketidakleluasaan untuk tabel `pengkeg`
--
ALTER TABLE `pengkeg`
  ADD CONSTRAINT `pengkeg_ibfk_1` FOREIGN KEY (`periode_id`) REFERENCES `periode_rpjmds` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `pengkeg_ibfk_2` FOREIGN KEY (`dpa_id`) REFERENCES `dpa` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Ketidakleluasaan untuk tabel `peran_hak_kewenangan`
--
ALTER TABLE `peran_hak_kewenangan`
  ADD CONSTRAINT `peran_hak_kewenangan_ibfk_1` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Ketidakleluasaan untuk tabel `prioritas_kepala_daerah`
--
ALTER TABLE `prioritas_kepala_daerah`
  ADD CONSTRAINT `prioritas_kepala_daerah_sasaran_id_foreign_idx` FOREIGN KEY (`sasaran_id`) REFERENCES `sasaran` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Ketidakleluasaan untuk tabel `program`
--
ALTER TABLE `program`
  ADD CONSTRAINT `program_ibfk_1` FOREIGN KEY (`sasaran_id`) REFERENCES `sasaran` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `program_periode_id_foreign_idx` FOREIGN KEY (`periode_id`) REFERENCES `periode_rpjmds` (`id`),
  ADD CONSTRAINT `program_rpjmd_id_foreign_idx` FOREIGN KEY (`rpjmd_id`) REFERENCES `rpjmd` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Ketidakleluasaan untuk tabel `program_arah_kebijakan`
--
ALTER TABLE `program_arah_kebijakan`
  ADD CONSTRAINT `program_arah_kebijakan_ibfk_2` FOREIGN KEY (`arah_kebijakan_id`) REFERENCES `arah_kebijakan` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `program_arah_kebijakan_strategi_id_foreign_idx` FOREIGN KEY (`strategi_id`) REFERENCES `strategi` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Ketidakleluasaan untuk tabel `program_strategi`
--
ALTER TABLE `program_strategi`
  ADD CONSTRAINT `program_strategi_ibfk_2` FOREIGN KEY (`strategi_id`) REFERENCES `strategi` (`id`) ON DELETE CASCADE;

--
-- Ketidakleluasaan untuk tabel `realisasi_indikator`
--
ALTER TABLE `realisasi_indikator`
  ADD CONSTRAINT `realisasi_indikator_ibfk_1` FOREIGN KEY (`indikator_id`) REFERENCES `indikator` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Ketidakleluasaan untuk tabel `realisasi_sub_kegiatan`
--
ALTER TABLE `realisasi_sub_kegiatan`
  ADD CONSTRAINT `realisasi_sub_kegiatan_ibfk_1` FOREIGN KEY (`sub_kegiatan_id`) REFERENCES `sub_kegiatan` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Ketidakleluasaan untuk tabel `realisasi_sub_kegiatan_rpjmd`
--
ALTER TABLE `realisasi_sub_kegiatan_rpjmd`
  ADD CONSTRAINT `realisasi_sub_kegiatan_rpjmd_ibfk_1` FOREIGN KEY (`sub_kegiatan_id`) REFERENCES `sub_kegiatan` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Ketidakleluasaan untuk tabel `rekomendasi_otomatis`
--
ALTER TABLE `rekomendasi_otomatis`
  ADD CONSTRAINT `rekomendasi_otomatis_ibfk_1` FOREIGN KEY (`evaluasi_id`) REFERENCES `evaluasi` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Ketidakleluasaan untuk tabel `renja`
--
ALTER TABLE `renja`
  ADD CONSTRAINT `renja_ibfk_1` FOREIGN KEY (`periode_id`) REFERENCES `periode_rpjmds` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `renja_ibfk_2` FOREIGN KEY (`rkpd_id`) REFERENCES `rkpd` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Ketidakleluasaan untuk tabel `renstra_kebijakan`
--
ALTER TABLE `renstra_kebijakan`
  ADD CONSTRAINT `fk_renstra_kebijakan_renstra_id` FOREIGN KEY (`renstra_id`) REFERENCES `renstra_opd` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Ketidakleluasaan untuk tabel `renstra_kegiatan`
--
ALTER TABLE `renstra_kegiatan`
  ADD CONSTRAINT `fk_renstra_kegiatan_renstra_id` FOREIGN KEY (`renstra_id`) REFERENCES `renstra_opd` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Ketidakleluasaan untuk tabel `renstra_program`
--
ALTER TABLE `renstra_program`
  ADD CONSTRAINT `fk_renstra_program_renstra_id` FOREIGN KEY (`renstra_id`) REFERENCES `renstra_opd` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Ketidakleluasaan untuk tabel `renstra_sasaran`
--
ALTER TABLE `renstra_sasaran`
  ADD CONSTRAINT `fk_renstra_sasaran_renstra_id` FOREIGN KEY (`renstra_id`) REFERENCES `renstra_opd` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Ketidakleluasaan untuk tabel `renstra_strategi`
--
ALTER TABLE `renstra_strategi`
  ADD CONSTRAINT `fk_renstra_strategi_renstra_id` FOREIGN KEY (`renstra_id`) REFERENCES `renstra_opd` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Ketidakleluasaan untuk tabel `renstra_subkegiatan`
--
ALTER TABLE `renstra_subkegiatan`
  ADD CONSTRAINT `renstra_subkegiatan_renstra_program_id_foreign_idx` FOREIGN KEY (`renstra_program_id`) REFERENCES `renstra_program` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `renstra_subkegiatan_sub_kegiatan_id_foreign_idx` FOREIGN KEY (`sub_kegiatan_id`) REFERENCES `sub_kegiatan` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Ketidakleluasaan untuk tabel `renstra_tabel_kegiatan`
--
ALTER TABLE `renstra_tabel_kegiatan`
  ADD CONSTRAINT `renstra_tabel_kegiatan_ibfk_1` FOREIGN KEY (`program_id`) REFERENCES `renstra_program` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `renstra_tabel_kegiatan_ibfk_2` FOREIGN KEY (`kegiatan_id`) REFERENCES `renstra_kegiatan` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `renstra_tabel_kegiatan_ibfk_3` FOREIGN KEY (`indikator_id`) REFERENCES `indikator_renstra` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Ketidakleluasaan untuk tabel `renstra_tabel_program`
--
ALTER TABLE `renstra_tabel_program`
  ADD CONSTRAINT `renstra_tabel_program_ibfk_1` FOREIGN KEY (`program_id`) REFERENCES `renstra_program` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `renstra_tabel_program_ibfk_2` FOREIGN KEY (`indikator_id`) REFERENCES `indikator_renstra` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Ketidakleluasaan untuk tabel `renstra_tabel_tujuan`
--
ALTER TABLE `renstra_tabel_tujuan`
  ADD CONSTRAINT `renstra_tabel_tujuan_opd_id_foreign_idx` FOREIGN KEY (`opd_id`) REFERENCES `renstra_opd` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Ketidakleluasaan untuk tabel `renstra_target`
--
ALTER TABLE `renstra_target`
  ADD CONSTRAINT `renstra_target_ibfk_1` FOREIGN KEY (`indikator_id`) REFERENCES `indikator_renstra` (`id`) ON DELETE CASCADE;

--
-- Ketidakleluasaan untuk tabel `renstra_target_detail`
--
ALTER TABLE `renstra_target_detail`
  ADD CONSTRAINT `renstra_target_detail_ibfk_1` FOREIGN KEY (`renstra_target_id`) REFERENCES `renstra_target` (`id`) ON DELETE CASCADE;

--
-- Ketidakleluasaan untuk tabel `rka`
--
ALTER TABLE `rka`
  ADD CONSTRAINT `rka_ibfk_1` FOREIGN KEY (`periode_id`) REFERENCES `periode_rpjmds` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `rka_ibfk_2` FOREIGN KEY (`renja_id`) REFERENCES `renja` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Ketidakleluasaan untuk tabel `rkpd`
--
ALTER TABLE `rkpd`
  ADD CONSTRAINT `fk_rkpd_periode_id` FOREIGN KEY (`periode_id`) REFERENCES `periode_rpjmds` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_rkpd_renstra_program_id` FOREIGN KEY (`renstra_program_id`) REFERENCES `renstra_program` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `rkpd_arah_kebijakan_id_foreign_idx` FOREIGN KEY (`arah_id`) REFERENCES `arah_kebijakan` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `rkpd_indikator_kegiatan_id_foreign_idx` FOREIGN KEY (`indikator_kegiatan_id`) REFERENCES `indikatorkegiatans` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `rkpd_indikator_program_id_foreign_idx` FOREIGN KEY (`indikator_program_id`) REFERENCES `indikatorprograms` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `rkpd_indikator_sasaran_id_foreign_idx` FOREIGN KEY (`indikator_sasaran_id`) REFERENCES `indikatorsasarans` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `rkpd_indikator_tujuan_id_foreign_idx` FOREIGN KEY (`indikator_tujuan_id`) REFERENCES `indikatortujuans` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `rkpd_kegiatan_id_foreign_idx` FOREIGN KEY (`kegiatan_id`) REFERENCES `kegiatan` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `rkpd_opd_penanggung_jawab_id_foreign_idx` FOREIGN KEY (`opd_id`) REFERENCES `opd_penanggung_jawab` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `rkpd_prioritas_daerah_id_foreign_idx` FOREIGN KEY (`prioritas_daerah_id`) REFERENCES `prioritas_daerah` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `rkpd_prioritas_kepala_daerah_id_foreign_idx` FOREIGN KEY (`prioritas_gubernur_id`) REFERENCES `prioritas_kepala_daerah` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `rkpd_prioritas_nasional_id_foreign_idx` FOREIGN KEY (`prioritas_nasional_id`) REFERENCES `prioritas_nasional` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `rkpd_program_id_foreign_idx` FOREIGN KEY (`program_id`) REFERENCES `program` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `rkpd_sasaran_id_foreign_idx` FOREIGN KEY (`sasaran_id`) REFERENCES `sasaran` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `rkpd_strategi_id_foreign_idx` FOREIGN KEY (`strategi_id`) REFERENCES `strategi` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `rkpd_sub_kegiatan_id_foreign_idx` FOREIGN KEY (`sub_kegiatan_id`) REFERENCES `sub_kegiatan` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `rkpd_tujuan_id_foreign_idx` FOREIGN KEY (`tujuan_id`) REFERENCES `tujuan` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Ketidakleluasaan untuk tabel `sasaran`
--
ALTER TABLE `sasaran`
  ADD CONSTRAINT `fk_sasaran_to_rpjmd` FOREIGN KEY (`rpjmd_id`) REFERENCES `rpjmd` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `sasaran_ibfk_1` FOREIGN KEY (`tujuan_id`) REFERENCES `tujuan` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `sasaran_periode_id_foreign_idx` FOREIGN KEY (`periode_id`) REFERENCES `periode_rpjmds` (`id`);

--
-- Ketidakleluasaan untuk tabel `strategi`
--
ALTER TABLE `strategi`
  ADD CONSTRAINT `strategi_ibfk_1` FOREIGN KEY (`sasaran_id`) REFERENCES `sasaran` (`id`) ON UPDATE CASCADE,
  ADD CONSTRAINT `strategi_periode_id_foreign_idx` FOREIGN KEY (`periode_id`) REFERENCES `periode_rpjmds` (`id`);

--
-- Ketidakleluasaan untuk tabel `sub_kegiatan`
--
ALTER TABLE `sub_kegiatan`
  ADD CONSTRAINT `sub_kegiatan_ibfk_1` FOREIGN KEY (`kegiatan_id`) REFERENCES `kegiatan` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `sub_kegiatan_periode_id_foreign_idx` FOREIGN KEY (`periode_id`) REFERENCES `periode_rpjmds` (`id`);

--
-- Ketidakleluasaan untuk tabel `tujuan`
--
ALTER TABLE `tujuan`
  ADD CONSTRAINT `tujuan_ibfk_1` FOREIGN KEY (`misi_id`) REFERENCES `misi` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `tujuan_periode_id_foreign_idx` FOREIGN KEY (`periode_id`) REFERENCES `periode_rpjmds` (`id`),
  ADD CONSTRAINT `tujuan_rpjmd_id_foreign_idx` FOREIGN KEY (`rpjmd_id`) REFERENCES `rpjmd` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Ketidakleluasaan untuk tabel `users`
--
ALTER TABLE `users`
  ADD CONSTRAINT `fk_role_id` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`),
  ADD CONSTRAINT `users_ibfk_2` FOREIGN KEY (`divisions_id`) REFERENCES `divisions` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `users_ibfk_3` FOREIGN KEY (`periode_id`) REFERENCES `periode_rpjmds` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `users_periode_id_foreign_idx` FOREIGN KEY (`periode_id`) REFERENCES `periode_rpjmds` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Ketidakleluasaan untuk tabel `visi`
--
ALTER TABLE `visi`
  ADD CONSTRAINT `visi_rpjmd_id_foreign_idx` FOREIGN KEY (`rpjmd_id`) REFERENCES `rpjmd` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
