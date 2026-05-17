"use strict";

/**
 * Seeder Final MR Risk Matrix
 *
 * PHASE 4 — STEP 10B-3
 *
 * Tujuan:
 * - Membuat matrix risiko 5x5 berbasis LIKELIHOOD x IMPACT.
 * - Menjadi sumber resmi backend untuk:
 *   - score
 *   - level_risiko
 *   - warna_risiko
 *   - appetite_threshold
 *   - is_above_appetite
 *
 * Guard:
 * - Tidak hardcode ID reference item.
 * - Lookup likelihood_ref_id dari LIKELIHOOD.kode_item.
 * - Lookup impact_ref_id dari IMPACT.kode_item.
 * - Lookup level_risiko_ref_id dari RISK_LEVEL.kode_item.
 * - Idempotent.
 * - Tidak duplicate matrix_code + likelihood_ref_id + impact_ref_id.
 * - Tidak menghitung score di frontend.
 */

const TABLE_NAME = "mr_risk_matrix";
const GROUP_TABLE = "mr_reference_groups";
const ITEM_TABLE = "mr_reference_items";

const NOW_LITERAL = "CURRENT_TIMESTAMP";
const MATRIX_CODE = "MR_5X5_DEFAULT";
const APPETITE_THRESHOLD = 9;

/**
 * Level policy:
 * 1 - 4   = LOW
 * 5 - 9   = MEDIUM
 * 10 - 16 = HIGH
 * 17 - 25 = EXTREME
 */
const getLevelByScore = (score) => {
  if (score <= 4) {
    return {
      kode_item: "LOW",
      level_risiko: "Rendah",
      warna_risiko: "#22c55e",
    };
  }

  if (score <= 9) {
    return {
      kode_item: "MEDIUM",
      level_risiko: "Sedang",
      warna_risiko: "#eab308",
    };
  }

  if (score <= 16) {
    return {
      kode_item: "HIGH",
      level_risiko: "Tinggi",
      warna_risiko: "#f97316",
    };
  }

  return {
    kode_item: "EXTREME",
    level_risiko: "Ekstrem",
    warna_risiko: "#ef4444",
  };
};

const serializeJson = (value) => JSON.stringify(value || {});

const buildMetadata = ({ likelihood, impact, score, level }) => ({
  module: "MR",
  source: "seed-mr-risk-matrix",
  matrix_code: MATRIX_CODE,
  likelihood_code: likelihood.kode_item,
  impact_code: impact.kode_item,
  score,
  level_code: level.kode_item,
  locked_code: true,
});

const getReferenceItems = async ({ queryInterface, Sequelize, transaction }) => {
  const rows = await queryInterface.sequelize.query(
    `
      SELECT
        g.kode_group,
        i.id,
        i.kode_item,
        i.nama_item,
        i.nilai_numeric,
        i.nilai_text,
        i.warna,
        i.is_active
      FROM ${ITEM_TABLE} i
      JOIN ${GROUP_TABLE} g
        ON g.id = i.group_id
      WHERE g.kode_group IN ('LIKELIHOOD', 'IMPACT', 'RISK_LEVEL')
        AND g.is_active = 1
        AND i.is_active = 1
      ORDER BY g.kode_group ASC, i.urutan ASC
    `,
    {
      type: Sequelize.QueryTypes.SELECT,
      transaction,
    }
  );

  const map = new Map();

  for (const row of rows) {
    map.set(`${row.kode_group}:${row.kode_item}`, row);
  }

  return map;
};

const getRequiredItem = (itemMap, kodeGroup, kodeItem) => {
  const item = itemMap.get(`${kodeGroup}:${kodeItem}`);

  if (!item) {
    throw new Error(
      `Reference item ${kodeGroup}.${kodeItem} tidak ditemukan atau tidak aktif. Jalankan seed-mr-reference-items lebih dulu.`
    );
  }

  return item;
};

const buildMatrixRows = (itemMap) => {
  const likelihoodCodes = ["L1", "L2", "L3", "L4", "L5"];
  const impactCodes = ["I1", "I2", "I3", "I4", "I5"];

  const rows = [];

  for (const likelihoodCode of likelihoodCodes) {
    const likelihood = getRequiredItem(itemMap, "LIKELIHOOD", likelihoodCode);
    const likelihoodValue = Number(likelihood.nilai_numeric);

    for (const impactCode of impactCodes) {
      const impact = getRequiredItem(itemMap, "IMPACT", impactCode);
      const impactValue = Number(impact.nilai_numeric);

      const score = likelihoodValue * impactValue;
      const level = getLevelByScore(score);
      const levelItem = getRequiredItem(itemMap, "RISK_LEVEL", level.kode_item);

      rows.push({
        matrix_code: MATRIX_CODE,

        likelihood_ref_id: likelihood.id,
        impact_ref_id: impact.id,

        likelihood_value: likelihoodValue,
        likelihood_label: likelihood.nama_item,

        impact_value: impactValue,
        impact_label: impact.nama_item,

        score,

        level_risiko_ref_id: levelItem.id,
        level_risiko: level.level_risiko,
        warna_risiko: level.warna_risiko,

        appetite_threshold: APPETITE_THRESHOLD,
        is_above_appetite: score > APPETITE_THRESHOLD,

        is_active: true,
        effective_start_date: null,
        effective_end_date: null,
        tahun_berlaku: null,

        metadata_json: buildMetadata({
          likelihood,
          impact,
          score,
          level,
        }),
      });
    }
  }

  return rows;
};

module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      const itemMap = await getReferenceItems({
        queryInterface,
        Sequelize,
        transaction,
      });

      const matrixRows = buildMatrixRows(itemMap);

      for (const row of matrixRows) {
        const [existing] = await queryInterface.sequelize.query(
          `
            SELECT id
            FROM ${TABLE_NAME}
            WHERE matrix_code = :matrix_code
              AND likelihood_ref_id = :likelihood_ref_id
              AND impact_ref_id = :impact_ref_id
            LIMIT 1
          `,
          {
            replacements: {
              matrix_code: row.matrix_code,
              likelihood_ref_id: row.likelihood_ref_id,
              impact_ref_id: row.impact_ref_id,
            },
            type: Sequelize.QueryTypes.SELECT,
            transaction,
          }
        );

        const replacements = {
          matrix_code: row.matrix_code,

          likelihood_ref_id: row.likelihood_ref_id,
          impact_ref_id: row.impact_ref_id,

          likelihood_value: row.likelihood_value,
          likelihood_label: row.likelihood_label,

          impact_value: row.impact_value,
          impact_label: row.impact_label,

          score: row.score,

          level_risiko_ref_id: row.level_risiko_ref_id,
          level_risiko: row.level_risiko,
          warna_risiko: row.warna_risiko,

          appetite_threshold: row.appetite_threshold,
          is_above_appetite: row.is_above_appetite ? 1 : 0,

          is_active: row.is_active ? 1 : 0,
          effective_start_date: row.effective_start_date,
          effective_end_date: row.effective_end_date,
          tahun_berlaku: row.tahun_berlaku,

          metadata_json: serializeJson(row.metadata_json),

          created_by: null,
          updated_by: null,
        };

        if (existing) {
          await queryInterface.sequelize.query(
            `
              UPDATE ${TABLE_NAME}
              SET
                likelihood_value = :likelihood_value,
                likelihood_label = :likelihood_label,
                impact_value = :impact_value,
                impact_label = :impact_label,
                score = :score,
                level_risiko_ref_id = :level_risiko_ref_id,
                level_risiko = :level_risiko,
                warna_risiko = :warna_risiko,
                appetite_threshold = :appetite_threshold,
                is_above_appetite = :is_above_appetite,
                is_active = :is_active,
                effective_start_date = :effective_start_date,
                effective_end_date = :effective_end_date,
                tahun_berlaku = :tahun_berlaku,
                metadata_json = CAST(:metadata_json AS JSON),
                updated_by = :updated_by,
                updated_at = ${NOW_LITERAL}
              WHERE matrix_code = :matrix_code
                AND likelihood_ref_id = :likelihood_ref_id
                AND impact_ref_id = :impact_ref_id
            `,
            {
              replacements,
              transaction,
            }
          );
        } else {
          await queryInterface.sequelize.query(
            `
              INSERT INTO ${TABLE_NAME} (
                matrix_code,
                likelihood_ref_id,
                impact_ref_id,
                likelihood_value,
                likelihood_label,
                impact_value,
                impact_label,
                score,
                level_risiko_ref_id,
                level_risiko,
                warna_risiko,
                appetite_threshold,
                is_above_appetite,
                is_active,
                effective_start_date,
                effective_end_date,
                tahun_berlaku,
                metadata_json,
                created_by,
                updated_by,
                created_at,
                updated_at
              )
              VALUES (
                :matrix_code,
                :likelihood_ref_id,
                :impact_ref_id,
                :likelihood_value,
                :likelihood_label,
                :impact_value,
                :impact_label,
                :score,
                :level_risiko_ref_id,
                :level_risiko,
                :warna_risiko,
                :appetite_threshold,
                :is_above_appetite,
                :is_active,
                :effective_start_date,
                :effective_end_date,
                :tahun_berlaku,
                CAST(:metadata_json AS JSON),
                :created_by,
                :updated_by,
                ${NOW_LITERAL},
                ${NOW_LITERAL}
              )
            `,
            {
              replacements,
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
      /**
       * Down tidak delete fisik karena risk bisa bergantung pada matrix_id.
       * Cukup nonaktifkan matrix default dari seeder ini.
       */
      await queryInterface.sequelize.query(
        `
          UPDATE ${TABLE_NAME}
          SET
            is_active = 0,
            updated_at = ${NOW_LITERAL}
          WHERE matrix_code = :matrix_code
        `,
        {
          replacements: {
            matrix_code: MATRIX_CODE,
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