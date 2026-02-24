-- MySQL dump 10.13  Distrib 8.0.43, for Linux (x86_64)
--
-- Host: localhost    Database: db_epelara
-- ------------------------------------------------------
-- Server version	8.0.43

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `SequelizeMeta`
--

DROP TABLE IF EXISTS `SequelizeMeta`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `SequelizeMeta` (
  `name` varchar(255) COLLATE utf8mb3_unicode_ci NOT NULL,
  PRIMARY KEY (`name`),
  UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `SequelizeMeta`
--

LOCK TABLES `SequelizeMeta` WRITE;
/*!40000 ALTER TABLE `SequelizeMeta` DISABLE KEYS */;
INSERT INTO `SequelizeMeta` VALUES ('20250420094330-create-roles.js'),('20250420101520-create-divisions.js'),('20250420102223-create-users.js'),('202504201300-create-users.js'),('20250421-update-divisions-ids.js'),('20250525015058-create-renstra-opd.js'),('20250602022944-create-periode_rpjmd.js'),('20250905094908-create-renstra-tabel-subkegiatan.js'),('20250905094909-create-renstra-tabel-subkegiatan.js'),('20250905094910-create-renstra-tabel-tujuan.js'),('20250905094911-create-renstra-tabel-sasaran.js'),('20250906061725-add-timestamps-to-renstra-tabel-sasaran.js'),('20250906061726_remove_createdAt_updatedAt_renstra_tabel_sasaran.js'),('20250906061727-add-timestamps-to-renstra-tabel-tujuan.js'),('20250906061728_remove_createdAt_updatedAt_renstra_tabel_tujuan.js'),('20250906061729-add-opd-id-to-renstra-tabel-tujuan.js'),('20250906061730-name remove-opd-penanggung-jawab-from-renstra-tabel-tujuan.js'),('20250906061731-name remove-opd-penanggung-jawab-from-renstra-tabel-sasaran.js');
/*!40000 ALTER TABLE `SequelizeMeta` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `divisions`
--

DROP TABLE IF EXISTS `divisions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `divisions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `divisions`
--

LOCK TABLES `divisions` WRITE;
/*!40000 ALTER TABLE `divisions` DISABLE KEYS */;
/*!40000 ALTER TABLE `divisions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `periode_rpjmds`
--

DROP TABLE IF EXISTS `periode_rpjmds`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `periode_rpjmds` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nama` varchar(255) NOT NULL,
  `tahun_awal` int NOT NULL,
  `tahun_akhir` int NOT NULL,
  `createdAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `periode_rpjmds`
--

LOCK TABLES `periode_rpjmds` WRITE;
/*!40000 ALTER TABLE `periode_rpjmds` DISABLE KEYS */;
/*!40000 ALTER TABLE `periode_rpjmds` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `renstra_opd`
--

DROP TABLE IF EXISTS `renstra_opd`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `renstra_opd` (
  `id` int NOT NULL AUTO_INCREMENT,
  `opd_id` int NOT NULL,
  `rpjmd_id` int NOT NULL,
  `bidang_opd` varchar(255) NOT NULL,
  `sub_bidang_opd` varchar(255) NOT NULL,
  `tahun_mulai` int NOT NULL,
  `tahun_akhir` int NOT NULL,
  `keterangan` text,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `renstra_opd`
--

LOCK TABLES `renstra_opd` WRITE;
/*!40000 ALTER TABLE `renstra_opd` DISABLE KEYS */;
/*!40000 ALTER TABLE `renstra_opd` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `renstra_tabel_sasaran`
--

DROP TABLE IF EXISTS `renstra_tabel_sasaran`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `renstra_tabel_sasaran` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tujuan_id` int DEFAULT NULL,
  `sasaran_id` int DEFAULT NULL,
  `indikator_id` int DEFAULT NULL,
  `baseline` float DEFAULT NULL,
  `satuan_target` varchar(100) DEFAULT NULL,
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
  `lokasi` varchar(255) DEFAULT NULL,
  `kode_sasaran` varchar(50) DEFAULT NULL,
  `nama_sasaran` varchar(255) DEFAULT NULL,
  `target_akhir_renstra` decimal(10,0) DEFAULT NULL,
  `pagu_akhir_renstra` decimal(20,2) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `renstra_tabel_sasaran`
--

LOCK TABLES `renstra_tabel_sasaran` WRITE;
/*!40000 ALTER TABLE `renstra_tabel_sasaran` DISABLE KEYS */;
/*!40000 ALTER TABLE `renstra_tabel_sasaran` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `renstra_tabel_subkegiatan`
--

DROP TABLE IF EXISTS `renstra_tabel_subkegiatan`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `renstra_tabel_subkegiatan` (
  `id` int NOT NULL AUTO_INCREMENT,
  `program_id` int NOT NULL,
  `kegiatan_id` int NOT NULL,
  `subkegiatan_id` int NOT NULL,
  `indikator_manual` varchar(255) DEFAULT NULL,
  `baseline` float DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `satuan_target` varchar(255) DEFAULT NULL,
  `kode_subkegiatan` varchar(255) DEFAULT NULL,
  `nama_subkegiatan` varchar(255) DEFAULT NULL,
  `sub_bidang_penanggung_jawab` varchar(255) DEFAULT NULL,
  `lokasi` varchar(255) DEFAULT NULL,
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
  `renstra_opd_id` int DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `renstra_tabel_subkegiatan`
--

LOCK TABLES `renstra_tabel_subkegiatan` WRITE;
/*!40000 ALTER TABLE `renstra_tabel_subkegiatan` DISABLE KEYS */;
/*!40000 ALTER TABLE `renstra_tabel_subkegiatan` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `renstra_tabel_tujuan`
--

DROP TABLE IF EXISTS `renstra_tabel_tujuan`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `renstra_tabel_tujuan` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tujuan_id` int DEFAULT NULL,
  `opd_id` int DEFAULT NULL,
  `indikator_id` int DEFAULT NULL,
  `baseline` float DEFAULT NULL,
  `satuan_target` varchar(100) DEFAULT NULL,
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
  `lokasi` varchar(255) DEFAULT NULL,
  `kode_tujuan` varchar(50) DEFAULT NULL,
  `nama_tujuan` varchar(255) DEFAULT NULL,
  `target_akhir_renstra` decimal(10,0) DEFAULT NULL,
  `pagu_akhir_renstra` decimal(20,2) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `renstra_tabel_tujuan_opd_id_foreign_idx` (`opd_id`),
  CONSTRAINT `renstra_tabel_tujuan_opd_id_foreign_idx` FOREIGN KEY (`opd_id`) REFERENCES `renstra_opd` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `renstra_tabel_tujuan`
--

LOCK TABLES `renstra_tabel_tujuan` WRITE;
/*!40000 ALTER TABLE `renstra_tabel_tujuan` DISABLE KEYS */;
/*!40000 ALTER TABLE `renstra_tabel_tujuan` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `roles`
--

DROP TABLE IF EXISTS `roles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `roles` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(50) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `roles`
--

LOCK TABLES `roles` WRITE;
/*!40000 ALTER TABLE `roles` DISABLE KEYS */;
/*!40000 ALTER TABLE `roles` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `username` varchar(255) NOT NULL,
  `email` varchar(255) NOT NULL,
  `password` varchar(255) NOT NULL,
  `role_id` int DEFAULT NULL,
  `divisions_id` int DEFAULT NULL,
  `opd` varchar(255) DEFAULT NULL,
  `periode_id` int DEFAULT NULL,
  `createdAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `username` (`username`),
  UNIQUE KEY `email` (`email`),
  KEY `role_id` (`role_id`),
  KEY `divisions_id` (`divisions_id`),
  CONSTRAINT `users_ibfk_1` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `users_ibfk_2` FOREIGN KEY (`divisions_id`) REFERENCES `divisions` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2025-09-21 13:03:49
