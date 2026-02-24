-- MySQL dump 10.13  Distrib 8.0.30, for Win64 (x86_64)
--
-- Host: localhost    Database: db_epelara
-- ------------------------------------------------------
-- Server version	8.0.30

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
-- Table structure for table `renstra_subkegiatan`
--

DROP TABLE IF EXISTS `renstra_subkegiatan`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `renstra_subkegiatan` (
  `id` int NOT NULL AUTO_INCREMENT,
  `kegiatan_id` int NOT NULL,
  `kode_sub_kegiatan` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `nama_sub_kegiatan` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `sub_bidang_opd` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `nama_opd` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `nama_bidang_opd` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `renstra_program_id` int NOT NULL,
  `sub_kegiatan_id` int NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `renstra_subkegiatan_renstra_program_id_foreign_idx` (`renstra_program_id`),
  KEY `renstra_subkegiatan_sub_kegiatan_id_foreign_idx` (`sub_kegiatan_id`),
  CONSTRAINT `renstra_subkegiatan_renstra_program_id_foreign_idx` FOREIGN KEY (`renstra_program_id`) REFERENCES `renstra_program` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `renstra_subkegiatan_sub_kegiatan_id_foreign_idx` FOREIGN KEY (`sub_kegiatan_id`) REFERENCES `sub_kegiatan` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `renstra_subkegiatan`
--

LOCK TABLES `renstra_subkegiatan` WRITE;
/*!40000 ALTER TABLE `renstra_subkegiatan` DISABLE KEYS */;
INSERT INTO `renstra_subkegiatan` VALUES (1,1,'1.01.01.1.01.0001','Pelayanan Kesehatan Untuk Semua Masyarakat','Seksi Layanan Keshatan','Dinas Kesehatan','Bidang Kesehatan Pelayanan',1,1,'2025-09-01 01:46:43','2025-09-01 01:46:43'),(2,2,'1.01.02.1.01.0001','Pelayanan Pendidikan Disemua Jenjang','Seksi Layanan Pendidikan','Dinas Pendidikan dan Kebudayaan','Bidang Pendidikan Pelayanan',2,2,'2025-09-01 01:47:00','2025-09-01 01:47:00');
/*!40000 ALTER TABLE `renstra_subkegiatan` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2025-09-05 17:52:49
