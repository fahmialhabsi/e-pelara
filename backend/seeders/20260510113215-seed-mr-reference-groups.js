"use strict";

/**
 * Seeder Final MR Reference Groups
 *
 * PHASE 4 — STEP 10B-1
 *
 * Tujuan:
 * - Membuat master group referensi MR.
 * - Menjadi fondasi untuk seed-mr-reference-items.
 *
 * Guard:
 * - Idempotent.
 * - Tidak hardcode ID.
 * - Lookup berdasarkan kode_group.
 * - Tidak membuat duplicate kode_group.
 * - Jika kode_group sudah ada, update field aman.
 * - Tidak membuat reference_items.
 * - Tidak membuat risk_matrix.
 * - Tidak membuat data transaksi MR.
 */

const TABLE_NAME = "mr_reference_groups";

const NOW_LITERAL = "CURRENT_TIMESTAMP";

const REFERENCE_GROUPS = [
  {
    kode_group: "LIKELIHOOD",
    nama_group: "Kemungkinan Risiko",
    deskripsi: "Skala kemungkinan terjadinya risiko dalam manajemen risiko.",
    domain: "risk",
    is_system: true,
    is_active: true,
    urutan: 10,
    metadata_json: {
      module: "MR",
      source: "seed-mr-reference-groups",
      usage: "risk_likelihood",
      locked_code: true,
    },
  },
  {
    kode_group: "IMPACT",
    nama_group: "Dampak Risiko",
    deskripsi: "Skala dampak risiko terhadap pencapaian sasaran dan indikator.",
    domain: "risk",
    is_system: true,
    is_active: true,
    urutan: 20,
    metadata_json: {
      module: "MR",
      source: "seed-mr-reference-groups",
      usage: "risk_impact",
      locked_code: true,
    },
  },
  {
    kode_group: "RISK_LEVEL",
    nama_group: "Level Risiko",
    deskripsi: "Klasifikasi level risiko berdasarkan skor matriks risiko.",
    domain: "risk",
    is_system: true,
    is_active: true,
    urutan: 30,
    metadata_json: {
      module: "MR",
      source: "seed-mr-reference-groups",
      usage: "risk_level",
      locked_code: true,
    },
  },
  {
    kode_group: "RISK_CATEGORY",
    nama_group: "Kategori Risiko",
    deskripsi: "Kategori risiko seperti strategis, operasional, keuangan, kepatuhan, dan kinerja.",
    domain: "risk",
    is_system: true,
    is_active: true,
    urutan: 40,
    metadata_json: {
      module: "MR",
      source: "seed-mr-reference-groups",
      usage: "risk_category",
      locked_code: true,
    },
  },
  {
    kode_group: "RISK_SOURCE",
    nama_group: "Sumber Risiko",
    deskripsi: "Sumber risiko seperti internal, eksternal, perencanaan, penganggaran, dan pelaksanaan.",
    domain: "risk",
    is_system: true,
    is_active: true,
    urutan: 50,
    metadata_json: {
      module: "MR",
      source: "seed-mr-reference-groups",
      usage: "risk_source",
      locked_code: true,
    },
  },
  {
    kode_group: "RISK_APPETITE",
    nama_group: "Selera Risiko",
    deskripsi: "Batas toleransi atau selera risiko organisasi.",
    domain: "risk",
    is_system: true,
    is_active: true,
    urutan: 60,
    metadata_json: {
      module: "MR",
      source: "seed-mr-reference-groups",
      usage: "risk_appetite",
      locked_code: true,
    },
  },
  {
    kode_group: "IMPACT_AREA",
    nama_group: "Area Dampak Risiko",
    deskripsi:
      "Area terdampak yang digunakan untuk mengelompokkan dampak risiko terhadap kinerja, keuangan, kepatuhan, operasional, reputasi, aset, SDM, data, SPIP, dan akuntabilitas.",
    domain: "risk",
    is_system: true,
    is_active: true,
    urutan: 65,
    metadata_json: {
      module: "MR",
      source: "seed-mr-reference-groups",
      usage: "impact_area",
      locked_code: true,
    },
  },
  {
    kode_group: "RISK_STATUS",
    nama_group: "Status Risiko",
    deskripsi: "Status risiko seperti aktif, tidak aktif, ditutup, atau dipantau.",
    domain: "risk",
    is_system: true,
    is_active: true,
    urutan: 70,
    metadata_json: {
      module: "MR",
      source: "seed-mr-reference-groups",
      usage: "risk_status",
      locked_code: true,
    },
  },
  {
    kode_group: "MITIGATION_RESPONSE",
    nama_group: "Respons Risiko / Mitigasi",
    deskripsi: "Pilihan respons risiko seperti menerima, mengurangi, menghindari, atau mentransfer risiko.",
    domain: "mitigation",
    is_system: true,
    is_active: true,
    urutan: 80,
    metadata_json: {
      module: "MR",
      source: "seed-mr-reference-groups",
      usage: "mitigation_response",
      locked_code: true,
    },
  },
  {
    kode_group: "CONTROL_EFFECTIVENESS",
    nama_group: "Efektivitas Pengendalian",
    deskripsi: "Referensi penilaian efektivitas pengendalian dalam monitoring MR.",
    domain: "monitoring",
    is_system: true,
    is_active: true,
    urutan: 90,
    metadata_json: {
      module: "MR",
      source: "seed-mr-reference-groups",
      usage: "control_effectiveness",
      locked_code: true,
    },
  },
  {
    kode_group: "WARNING_SEVERITY",
    nama_group: "Tingkat Peringatan Risiko",
    deskripsi: "Tingkat keparahan warning/peringatan risiko.",
    domain: "monitoring",
    is_system: true,
    is_active: true,
    urutan: 100,
    metadata_json: {
      module: "MR",
      source: "seed-mr-reference-groups",
      usage: "warning_severity",
      locked_code: true,
    },
  },
  {
    kode_group: "DEVIATION_SEVERITY",
    nama_group: "Tingkat Deviasi Risiko",
    deskripsi: "Tingkat keparahan deviasi target, pagu, realisasi, atau risiko.",
    domain: "monitoring",
    is_system: true,
    is_active: true,
    urutan: 110,
    metadata_json: {
      module: "MR",
      source: "seed-mr-reference-groups",
      usage: "deviation_severity",
      locked_code: true,
    },
  },
  {
    kode_group: "PERIODE_TYPE",
    nama_group: "Tipe Periode MR",
    deskripsi: "Referensi periode MR seperti bulanan, triwulan, semester, tahunan, dan adhoc.",
    domain: "context",
    is_system: true,
    is_active: true,
    urutan: 120,
    metadata_json: {
      module: "MR",
      source: "seed-mr-reference-groups",
      usage: "periode_type",
      locked_code: true,
    },
  },
  {
    kode_group: "CONTEXT_TYPE",
    nama_group: "Jenis Konteks MR",
    deskripsi: "Referensi jenis konteks penetapan MR berdasarkan sumber perencanaan.",
    domain: "context",
    is_system: true,
    is_active: true,
    urutan: 130,
    metadata_json: {
      module: "MR",
      source: "seed-mr-reference-groups",
      usage: "context_type",
      locked_code: true,
    },
  },
  {
    kode_group: "ROOT_CAUSE_CATEGORY",
    nama_group: "Kategori Akar Penyebab",
    deskripsi: "Referensi kategori akar penyebab risiko.",
    domain: "analysis",
    is_system: true,
    is_active: true,
    urutan: 140,
    metadata_json: {
      module: "MR",
      source: "seed-mr-reference-groups",
      usage: "root_cause_category",
      locked_code: true,
    },
  },
  {
    kode_group: "SPIP_ELEMENT",
    nama_group: "Unsur SPIP",
    deskripsi: "Referensi unsur SPIP untuk keterhubungan mitigasi MR ke e-SIGAP/SPIP.",
    domain: "spip_linkage",
    is_system: true,
    is_active: true,
    urutan: 150,
    metadata_json: {
      module: "MR",
      source: "seed-mr-reference-groups",
      usage: "spip_element",
      locked_code: true,
      cross_system: "e_sigap",
    },
  },
  {
    kode_group: "SPIP_SUB_ELEMENT",
    nama_group: "Sub Unsur SPIP",
    deskripsi: "Referensi sub unsur SPIP untuk pengendalian dan RTP.",
    domain: "spip_linkage",
    is_system: true,
    is_active: true,
    urutan: 160,
    metadata_json: {
      module: "MR",
      source: "seed-mr-reference-groups",
      usage: "spip_sub_element",
      locked_code: true,
      cross_system: "e_sigap",
    },
  },
  {
    kode_group: "RTP_OUTPUT",
    nama_group: "Output RTP",
    deskripsi: "Referensi output rencana tindak pengendalian.",
    domain: "spip_linkage",
    is_system: true,
    is_active: true,
    urutan: 170,
    metadata_json: {
      module: "MR",
      source: "seed-mr-reference-groups",
      usage: "rtp_output",
      locked_code: true,
      cross_system: "e_sigap",
    },
  },
];

const normalizeBoolean = (value) => (value ? 1 : 0);

const serializeJson = (value) => JSON.stringify(value || {});

module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      for (const group of REFERENCE_GROUPS) {
        const [existing] = await queryInterface.sequelize.query(
          `
            SELECT id
            FROM ${TABLE_NAME}
            WHERE kode_group = :kode_group
            LIMIT 1
          `,
          {
            replacements: {
              kode_group: group.kode_group,
            },
            type: Sequelize.QueryTypes.SELECT,
            transaction,
          }
        );

        if (existing) {
          await queryInterface.sequelize.query(
            `
              UPDATE ${TABLE_NAME}
              SET
                nama_group = :nama_group,
                deskripsi = :deskripsi,
                domain = :domain,
                is_system = :is_system,
                is_active = :is_active,
                urutan = :urutan,
                metadata_json = CAST(:metadata_json AS JSON),
                updated_by = :updated_by,
                updated_at = ${NOW_LITERAL}
              WHERE kode_group = :kode_group
            `,
            {
              replacements: {
                kode_group: group.kode_group,
                nama_group: group.nama_group,
                deskripsi: group.deskripsi,
                domain: group.domain,
                is_system: normalizeBoolean(group.is_system),
                is_active: normalizeBoolean(group.is_active),
                urutan: group.urutan,
                metadata_json: serializeJson(group.metadata_json),
                updated_by: null,
              },
              transaction,
            }
          );
        } else {
          await queryInterface.sequelize.query(
            `
              INSERT INTO ${TABLE_NAME} (
                kode_group,
                nama_group,
                deskripsi,
                domain,
                is_system,
                is_active,
                urutan,
                metadata_json,
                created_by,
                updated_by,
                created_at,
                updated_at
              )
              VALUES (
                :kode_group,
                :nama_group,
                :deskripsi,
                :domain,
                :is_system,
                :is_active,
                :urutan,
                CAST(:metadata_json AS JSON),
                :created_by,
                :updated_by,
                ${NOW_LITERAL},
                ${NOW_LITERAL}
              )
            `,
            {
              replacements: {
                kode_group: group.kode_group,
                nama_group: group.nama_group,
                deskripsi: group.deskripsi,
                domain: group.domain,
                is_system: normalizeBoolean(group.is_system),
                is_active: normalizeBoolean(group.is_active),
                urutan: group.urutan,
                metadata_json: serializeJson(group.metadata_json),
                created_by: null,
                updated_by: null,
              },
              transaction,
            }
          );
        }
      }

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      const kodeGroups = REFERENCE_GROUPS.map((group) => group.kode_group);

      /**
       * Down hanya menonaktifkan system group dari seeder ini.
       * Tidak delete fisik karena mr_reference_items bisa bergantung pada group_id.
       */
      await queryInterface.sequelize.query(
        `
          UPDATE ${TABLE_NAME}
          SET
            is_active = 0,
            updated_at = ${NOW_LITERAL}
          WHERE kode_group IN (:kodeGroups)
            AND is_system = 1
        `,
        {
          replacements: {
            kodeGroups,
          },
          transaction,
        }
      );

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },
};