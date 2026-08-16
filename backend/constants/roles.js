"use strict";

/**
 * Sumber kebenaran tunggal untuk nama role aplikasi e-PeLARA.
 *
 * Konteks (Sprint 1 — Unifikasi Role Admin, Opsi A):
 * Role aktual yang ada di tabel `roles` (lihat seeder
 * `backend/seeders/20250426091841-seed-roles.js`, yang menggantikan seeder
 * lama `20230421-add-roles.js` berisi ADMIN/SUPERVISOR/STAFF) adalah:
 *   SUPER ADMIN, ADMINISTRATOR, PENGAWAS, PELAKSANA
 * ("SUPER ADMIN" dengan spasi dinormalisasi oleh `allowRoles`
 * menjadi `SUPER_ADMIN` saat runtime — lihat `normalizeRole()`).
 *
 * Sebelum modul ini dibuat, 11 pemanggilan `allowRoles([...])` di 8 file
 * route memakai nama role legacy yang TIDAK PERNAH ada di tabel `roles`
 * (`ADMIN`, `OPERATOR`, dan varian lowercase `admin`/`operator`/`superadmin`).
 * Karena role tersebut tidak pernah bisa dimiliki user sungguhan, endpoint
 * itu secara efektif hanya bisa diakses SUPER_ADMIN — inkonsistensi diam-diam
 * dibanding endpoint sejenis (create/update) pada file yang sama yang
 * memakai SUPER_ADMIN + ADMINISTRATOR. Modul ini TIDAK menambah role atau
 * permission baru — hanya menyeragamkan penulisan ke role yang sudah ada.
 *
 * Guard Sprint 1: tidak membangun permission granular / role_permissions
 * table pada modul ini. Itu pekerjaan terpisah untuk sprint berikutnya.
 */

const SUPER_ADMIN = "SUPER_ADMIN";
const ADMINISTRATOR = "ADMINISTRATOR";
const PENGAWAS = "PENGAWAS";
const PELAKSANA = "PELAKSANA";

/** Hanya Super Admin — untuk aksi paling sensitif (mis. delete). */
const SUPER_ADMIN_ONLY = [SUPER_ADMIN];

/** Aksi administratif tingkat tinggi: create/update/generate data master. */
const ADMIN_ROLES = [SUPER_ADMIN, ADMINISTRATOR];

/** Aksi review/approval workflow. */
const REVIEW_ROLES = [SUPER_ADMIN, ADMINISTRATOR, PENGAWAS];

/** Aksi tulis operasional yang boleh dilakukan pelaksana. */
const WRITE_ROLES = [SUPER_ADMIN, ADMINISTRATOR, PELAKSANA];

/** Baca — seluruh role aplikasi yang sudah terautentikasi. */
const ALL_ROLES = [SUPER_ADMIN, ADMINISTRATOR, PENGAWAS, PELAKSANA];

module.exports = {
  SUPER_ADMIN,
  ADMINISTRATOR,
  PENGAWAS,
  PELAKSANA,
  SUPER_ADMIN_ONLY,
  ADMIN_ROLES,
  REVIEW_ROLES,
  WRITE_ROLES,
  ALL_ROLES,
};
