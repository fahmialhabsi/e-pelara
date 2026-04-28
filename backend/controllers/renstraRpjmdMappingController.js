"use strict";

const db = require("../models");

const {
  sequelize,
  ActivityLog,
  RenstraTujuan,
  RenstraSasaran,
  RenstraStrategi,
  RenstraKebijakan,
  RenstraProgram,
  RenstraKegiatan,
  RenstraSubkegiatan,
  Tujuan,
  Sasaran,
  Strategi,
  ArahKebijakan,
  Program,
  Kegiatan,
  SubKegiatan,
} = db;

function toPositiveInt(v) {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? Math.trunc(n) : null;
}

function cleanDoc(v) {
  const s = String(v ?? "").trim().toLowerCase();
  return s || null;
}

function cleanYear(v) {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? String(Math.trunc(n)) : null;
}

function pickSnapshot(fields) {
  const out = {};
  Object.entries(fields).forEach(([k, v]) => {
    if (v !== undefined) out[k] = v;
  });
  return out;
}

async function assertRpjmdMetaMatch(modelName, row, ctx) {
  const doc = cleanDoc(ctx?.jenis_dokumen);
  const tahun = cleanYear(ctx?.tahun);
  if (!doc || !tahun) return;

  const rowDoc = cleanDoc(row?.jenis_dokumen);
  const rowYear = cleanYear(row?.tahun);

  if (rowDoc && rowDoc !== doc) {
    const err = new Error(
      `${modelName} tidak sesuai jenis_dokumen: expected=${doc}, actual=${rowDoc}`,
    );
    err.status = 400;
    err.code = "RPJMD_META_MISMATCH";
    err.details = { model: modelName, field: "jenis_dokumen", expected: doc, actual: rowDoc };
    throw err;
  }
  if (rowYear && rowYear !== tahun) {
    const err = new Error(
      `${modelName} tidak sesuai tahun: expected=${tahun}, actual=${rowYear}`,
    );
    err.status = 400;
    err.code = "RPJMD_META_MISMATCH";
    err.details = { model: modelName, field: "tahun", expected: tahun, actual: rowYear };
    throw err;
  }
}

async function logActivity(req, { action, entity_type, entity_id, old_data, new_data }) {
  try {
    await ActivityLog.create({
      user_id: toPositiveInt(req.user?.id) ?? null,
      action,
      entity_type,
      entity_id: toPositiveInt(entity_id) ?? null,
      old_data,
      new_data,
      ip_address: req.ip,
      user_agent: req.headers["user-agent"] || null,
    });
  } catch (e) {
    // Audit log tidak boleh memblok update (best-effort).
    // eslint-disable-next-line no-console
    console.error("Failed to write ActivityLog:", e);
  }
}

/**
 * POST /api/renstra-rpjmd-mapping/apply
 * Body (JSON):
 * - level: tujuan|sasaran|strategi|arah|program|kegiatan|subKegiatan
 * - renstra_id: ID Renstra OPD aktif (untuk guard)
 * - renstra_record_id: ID baris Renstra yang akan diubah
 * - target_rpjmd_id: ID entitas RPJMD yang dipakai
 * - context: { jenis_dokumen, tahun, misi_id, tujuan_id, sasaran_id, program_id, kegiatan_id }
 * - change_reason_text / change_reason_file (wajib via middleware)
 */
async function applyMapping(req, res) {
  const level = String(req.body?.level ?? "").trim();
  const renstraId = toPositiveInt(req.body?.renstra_id);
  const renstraRecordId = toPositiveInt(req.body?.renstra_record_id);
  const targetRpjmdId = toPositiveInt(req.body?.target_rpjmd_id);
  const ctx = req.body?.context ?? {};

  if (!level) {
    return res.status(400).json({ success: false, code: "LEVEL_REQUIRED", message: "level wajib diisi." });
  }
  if (!renstraId) {
    return res.status(400).json({ success: false, code: "RENSTRA_ID_REQUIRED", message: "renstra_id wajib diisi." });
  }
  if (!renstraRecordId) {
    return res.status(400).json({ success: false, code: "RENSTRA_RECORD_ID_REQUIRED", message: "renstra_record_id wajib diisi." });
  }
  if (!targetRpjmdId) {
    return res.status(400).json({ success: false, code: "TARGET_RPJMD_ID_REQUIRED", message: "target_rpjmd_id wajib diisi." });
  }

  try {
    const result = await sequelize.transaction(async (t) => {
      switch (level) {
        case "tujuan": {
          const row = await RenstraTujuan.findByPk(renstraRecordId, { transaction: t });
          if (!row) {
            const err = new Error("RenstraTujuan tidak ditemukan.");
            err.status = 404;
            err.code = "RENSTRA_ROW_NOT_FOUND";
            throw err;
          }
          if (Number(row.renstra_id) !== Number(renstraId)) {
            const err = new Error("RenstraTujuan tidak termasuk renstra_id ini.");
            err.status = 400;
            err.code = "RENSTRA_SCOPE_MISMATCH";
            throw err;
          }

          const tujuan = await Tujuan.findByPk(targetRpjmdId, { transaction: t });
          if (!tujuan) {
            const err = new Error("Tujuan RPJMD tidak ditemukan.");
            err.status = 404;
            err.code = "RPJMD_TARGET_NOT_FOUND";
            throw err;
          }
          await assertRpjmdMetaMatch("Tujuan", tujuan, ctx);

          const expectedMisiId = toPositiveInt(ctx?.misi_id);
          if (expectedMisiId && Number(tujuan.misi_id) !== Number(expectedMisiId)) {
            const err = new Error("Tujuan RPJMD bukan bagian dari Misi yang dipilih.");
            err.status = 400;
            err.code = "CHAIN_MISMATCH";
            err.details = {
              level: "tujuan",
              expected_misi_id: expectedMisiId,
              actual_misi_id: toPositiveInt(tujuan.misi_id),
              target_tujuan_id: toPositiveInt(tujuan.id),
            };
            throw err;
          }

          const oldVal = row.rpjmd_tujuan_id;
          const oldNo = row.no_rpjmd;
          const oldIsi = row.isi_tujuan_rpjmd;
          const updateData = {
            rpjmd_tujuan_id: targetRpjmdId,
            ...pickSnapshot({
              no_rpjmd: tujuan.no_tujuan ?? null,
              isi_tujuan_rpjmd: tujuan.isi_tujuan ?? null,
            }),
          };
          await row.update(updateData, { transaction: t });

          return {
            entity_type: "renstra_tujuan",
            entity_id: row.id,
            old: { rpjmd_tujuan_id: oldVal, no_rpjmd: oldNo, isi_tujuan_rpjmd: oldIsi },
            new: updateData,
          };
        }

        case "sasaran": {
          const row = await RenstraSasaran.findByPk(renstraRecordId, { transaction: t });
          if (!row) {
            const err = new Error("RenstraSasaran tidak ditemukan.");
            err.status = 404;
            err.code = "RENSTRA_ROW_NOT_FOUND";
            throw err;
          }
          if (Number(row.renstra_id) !== Number(renstraId)) {
            const err = new Error("RenstraSasaran tidak termasuk renstra_id ini.");
            err.status = 400;
            err.code = "RENSTRA_SCOPE_MISMATCH";
            throw err;
          }

          const sasaran = await Sasaran.findByPk(targetRpjmdId, { transaction: t });
          if (!sasaran) {
            const err = new Error("Sasaran RPJMD tidak ditemukan.");
            err.status = 404;
            err.code = "RPJMD_TARGET_NOT_FOUND";
            throw err;
          }
          await assertRpjmdMetaMatch("Sasaran", sasaran, ctx);

          const renstraTujuan = await RenstraTujuan.findByPk(row.tujuan_id, { transaction: t });
          if (!renstraTujuan) {
            const err = new Error("Parent RenstraTujuan tidak ditemukan.");
            err.status = 400;
            err.code = "RENSTRA_PARENT_NOT_FOUND";
            throw err;
          }
          if (Number(renstraTujuan.renstra_id) !== Number(renstraId)) {
            const err = new Error("Parent RenstraTujuan tidak termasuk renstra_id ini.");
            err.status = 400;
            err.code = "RENSTRA_SCOPE_MISMATCH";
            throw err;
          }
          if (!renstraTujuan.rpjmd_tujuan_id) {
            const err = new Error("Parent RenstraTujuan belum di-map ke RPJMD (rpjmd_tujuan_id masih kosong).");
            err.status = 400;
            err.code = "PARENT_MAPPING_REQUIRED";
            err.details = {
              level: "sasaran",
              required_parent_level: "tujuan",
              required_renstra_record_id: toPositiveInt(renstraTujuan.id),
              required_field: "rpjmd_tujuan_id",
              suggested_target_rpjmd_id: toPositiveInt(sasaran.tujuan_id),
            };
            throw err;
          }
          if (Number(renstraTujuan.rpjmd_tujuan_id) !== Number(sasaran.tujuan_id)) {
            const err = new Error("Chain tidak cocok: Sasaran RPJMD bukan anak dari Tujuan RPJMD pada RenstraTujuan ini.");
            err.status = 400;
            err.code = "CHAIN_MISMATCH";
            err.details = {
              level: "sasaran",
              parent_level: "tujuan",
              renstra_parent_id: toPositiveInt(renstraTujuan.id),
              expected_parent_rpjmd_id: toPositiveInt(renstraTujuan.rpjmd_tujuan_id),
              target_parent_rpjmd_id: toPositiveInt(sasaran.tujuan_id),
              target_sasaran_id: toPositiveInt(sasaran.id),
            };
            throw err;
          }

          const expectedTujuanId = toPositiveInt(ctx?.tujuan_id);
          if (expectedTujuanId && Number(sasaran.tujuan_id) !== Number(expectedTujuanId)) {
            const err = new Error("Sasaran RPJMD bukan bagian dari Tujuan yang dipilih.");
            err.status = 400;
            err.code = "CHAIN_MISMATCH";
            err.details = {
              level: "sasaran",
              expected_tujuan_id: expectedTujuanId,
              actual_tujuan_id: toPositiveInt(sasaran.tujuan_id),
              target_sasaran_id: toPositiveInt(sasaran.id),
            };
            throw err;
          }

          const oldVal = row.rpjmd_sasaran_id;
          const oldNo = row.no_rpjmd;
          const oldIsi = row.isi_sasaran_rpjmd;
          const updateData = {
            rpjmd_sasaran_id: targetRpjmdId,
            ...pickSnapshot({
              no_rpjmd: sasaran.nomor ?? null,
              isi_sasaran_rpjmd: sasaran.isi_sasaran ?? null,
            }),
          };
          await row.update(updateData, { transaction: t });

          return {
            entity_type: "renstra_sasaran",
            entity_id: row.id,
            old: { rpjmd_sasaran_id: oldVal, no_rpjmd: oldNo, isi_sasaran_rpjmd: oldIsi },
            new: updateData,
          };
        }

        case "strategi": {
          const row = await RenstraStrategi.findByPk(renstraRecordId, { transaction: t });
          if (!row) {
            const err = new Error("RenstraStrategi tidak ditemukan.");
            err.status = 404;
            err.code = "RENSTRA_ROW_NOT_FOUND";
            throw err;
          }
          if (Number(row.renstra_id) !== Number(renstraId)) {
            const err = new Error("RenstraStrategi tidak termasuk renstra_id ini.");
            err.status = 400;
            err.code = "RENSTRA_SCOPE_MISMATCH";
            throw err;
          }

          const strategi = await Strategi.findByPk(targetRpjmdId, { transaction: t });
          if (!strategi) {
            const err = new Error("Strategi RPJMD tidak ditemukan.");
            err.status = 404;
            err.code = "RPJMD_TARGET_NOT_FOUND";
            throw err;
          }
          await assertRpjmdMetaMatch("Strategi", strategi, ctx);

          const renstraSasaran = await RenstraSasaran.findByPk(row.sasaran_id, { transaction: t });
          if (!renstraSasaran) {
            const err = new Error("Parent RenstraSasaran tidak ditemukan.");
            err.status = 400;
            err.code = "RENSTRA_PARENT_NOT_FOUND";
            throw err;
          }
          if (Number(renstraSasaran.renstra_id) !== Number(renstraId)) {
            const err = new Error("Parent RenstraSasaran tidak termasuk renstra_id ini.");
            err.status = 400;
            err.code = "RENSTRA_SCOPE_MISMATCH";
            throw err;
          }
          if (!renstraSasaran.rpjmd_sasaran_id) {
            const err = new Error("Parent RenstraSasaran belum di-map ke RPJMD (rpjmd_sasaran_id masih kosong).");
            err.status = 400;
            err.code = "PARENT_MAPPING_REQUIRED";
            err.details = {
              level: "strategi",
              required_parent_level: "sasaran",
              required_renstra_record_id: toPositiveInt(renstraSasaran.id),
              required_field: "rpjmd_sasaran_id",
              suggested_target_rpjmd_id: toPositiveInt(strategi.sasaran_id),
            };
            throw err;
          }
          if (Number(renstraSasaran.rpjmd_sasaran_id) !== Number(strategi.sasaran_id)) {
            const err = new Error("Chain tidak cocok: Strategi RPJMD bukan anak dari Sasaran RPJMD pada RenstraSasaran ini.");
            err.status = 400;
            err.code = "CHAIN_MISMATCH";
            err.details = {
              level: "strategi",
              parent_level: "sasaran",
              renstra_parent_id: toPositiveInt(renstraSasaran.id),
              expected_parent_rpjmd_id: toPositiveInt(renstraSasaran.rpjmd_sasaran_id),
              target_parent_rpjmd_id: toPositiveInt(strategi.sasaran_id),
              target_strategi_id: toPositiveInt(strategi.id),
            };
            throw err;
          }

          const expectedSasaranId = toPositiveInt(ctx?.sasaran_id);
          if (expectedSasaranId && Number(strategi.sasaran_id) !== Number(expectedSasaranId)) {
            const err = new Error("Strategi RPJMD bukan bagian dari Sasaran yang dipilih.");
            err.status = 400;
            err.code = "CHAIN_MISMATCH";
            err.details = {
              level: "strategi",
              expected_sasaran_id: expectedSasaranId,
              actual_sasaran_id: toPositiveInt(strategi.sasaran_id),
              target_strategi_id: toPositiveInt(strategi.id),
            };
            throw err;
          }

          const oldVal = row.rpjmd_strategi_id;
          const oldNo = row.no_rpjmd;
          const oldIsi = row.isi_strategi_rpjmd;
          const updateData = {
            rpjmd_strategi_id: targetRpjmdId,
            ...pickSnapshot({
              no_rpjmd: strategi.kode_strategi ?? null,
              isi_strategi_rpjmd: strategi.deskripsi ?? null,
            }),
          };
          await row.update(updateData, { transaction: t });

          return {
            entity_type: "renstra_strategi",
            entity_id: row.id,
            old: { rpjmd_strategi_id: oldVal, no_rpjmd: oldNo, isi_strategi_rpjmd: oldIsi },
            new: updateData,
          };
        }

        case "arah": {
          const row = await RenstraKebijakan.findByPk(renstraRecordId, { transaction: t });
          if (!row) {
            const err = new Error("RenstraKebijakan tidak ditemukan.");
            err.status = 404;
            err.code = "RENSTRA_ROW_NOT_FOUND";
            throw err;
          }
          if (Number(row.renstra_id) !== Number(renstraId)) {
            const err = new Error("RenstraKebijakan tidak termasuk renstra_id ini.");
            err.status = 400;
            err.code = "RENSTRA_SCOPE_MISMATCH";
            throw err;
          }

          const arah = await ArahKebijakan.findByPk(targetRpjmdId, { transaction: t });
          if (!arah) {
            const err = new Error("Arah Kebijakan RPJMD tidak ditemukan.");
            err.status = 404;
            err.code = "RPJMD_TARGET_NOT_FOUND";
            throw err;
          }
          await assertRpjmdMetaMatch("ArahKebijakan", arah, ctx);

          const renstraStrategi = await RenstraStrategi.findByPk(row.strategi_id, { transaction: t });
          if (!renstraStrategi) {
            const err = new Error("Parent RenstraStrategi tidak ditemukan.");
            err.status = 400;
            err.code = "RENSTRA_PARENT_NOT_FOUND";
            throw err;
          }
          if (Number(renstraStrategi.renstra_id) !== Number(renstraId)) {
            const err = new Error("Parent RenstraStrategi tidak termasuk renstra_id ini.");
            err.status = 400;
            err.code = "RENSTRA_SCOPE_MISMATCH";
            throw err;
          }
          if (!renstraStrategi.rpjmd_strategi_id) {
            const err = new Error("Parent RenstraStrategi belum di-map ke RPJMD (rpjmd_strategi_id masih kosong).");
            err.status = 400;
            err.code = "PARENT_MAPPING_REQUIRED";
            err.details = {
              level: "arah",
              required_parent_level: "strategi",
              required_renstra_record_id: toPositiveInt(renstraStrategi.id),
              required_field: "rpjmd_strategi_id",
              suggested_target_rpjmd_id: toPositiveInt(arah.strategi_id),
            };
            throw err;
          }
          if (Number(renstraStrategi.rpjmd_strategi_id) !== Number(arah.strategi_id)) {
            const err = new Error("Chain tidak cocok: Arah Kebijakan RPJMD bukan anak dari Strategi RPJMD pada RenstraStrategi ini.");
            err.status = 400;
            err.code = "CHAIN_MISMATCH";
            err.details = {
              level: "arah",
              parent_level: "strategi",
              renstra_parent_id: toPositiveInt(renstraStrategi.id),
              expected_parent_rpjmd_id: toPositiveInt(renstraStrategi.rpjmd_strategi_id),
              target_parent_rpjmd_id: toPositiveInt(arah.strategi_id),
              target_arah_id: toPositiveInt(arah.id),
            };
            throw err;
          }

          const expectedStrategiId = toPositiveInt(ctx?.strategi_id);
          if (expectedStrategiId && Number(arah.strategi_id) !== Number(expectedStrategiId)) {
            const err = new Error("Arah Kebijakan RPJMD bukan bagian dari Strategi yang dipilih.");
            err.status = 400;
            err.code = "CHAIN_MISMATCH";
            err.details = {
              level: "arah",
              expected_strategi_id: expectedStrategiId,
              actual_strategi_id: toPositiveInt(arah.strategi_id),
              target_arah_id: toPositiveInt(arah.id),
            };
            throw err;
          }

          const oldVal = row.rpjmd_arah_id;
          const oldNo = row.no_arah_rpjmd;
          const oldIsi = row.isi_arah_rpjmd;
          const updateData = {
            rpjmd_arah_id: targetRpjmdId,
            ...pickSnapshot({
              no_arah_rpjmd: arah.kode_arah ?? null,
              isi_arah_rpjmd: arah.deskripsi ?? null,
            }),
          };
          await row.update(updateData, { transaction: t });

          return {
            entity_type: "renstra_kebijakan",
            entity_id: row.id,
            old: { rpjmd_arah_id: oldVal, no_arah_rpjmd: oldNo, isi_arah_rpjmd: oldIsi },
            new: updateData,
          };
        }

        case "program": {
          const row = await RenstraProgram.findByPk(renstraRecordId, { transaction: t });
          if (!row) {
            const err = new Error("RenstraProgram tidak ditemukan.");
            err.status = 404;
            err.code = "RENSTRA_ROW_NOT_FOUND";
            throw err;
          }
          if (row.renstra_id != null && Number(row.renstra_id) !== Number(renstraId)) {
            const err = new Error("RenstraProgram tidak termasuk renstra_id ini.");
            err.status = 400;
            err.code = "RENSTRA_SCOPE_MISMATCH";
            throw err;
          }

          const program = await Program.findByPk(targetRpjmdId, { transaction: t });
          if (!program) {
            const err = new Error("Program RPJMD tidak ditemukan.");
            err.status = 404;
            err.code = "RPJMD_TARGET_NOT_FOUND";
            throw err;
          }
          await assertRpjmdMetaMatch("Program", program, ctx);

          const expectedSasaranId = toPositiveInt(ctx?.sasaran_id);
          if (expectedSasaranId && Number(program.sasaran_id) !== Number(expectedSasaranId)) {
            const err = new Error("Program RPJMD bukan bagian dari Sasaran yang dipilih.");
            err.status = 400;
            err.code = "CHAIN_MISMATCH";
            err.details = {
              level: "program",
              expected_sasaran_id: expectedSasaranId,
              actual_sasaran_id: toPositiveInt(program.sasaran_id),
              target_program_id: toPositiveInt(program.id),
            };
            throw err;
          }

          const oldVal = row.rpjmd_program_id;
          const updateData = { rpjmd_program_id: targetRpjmdId };
          await row.update(updateData, { transaction: t });

          return {
            entity_type: "renstra_program",
            entity_id: row.id,
            old: { rpjmd_program_id: oldVal },
            new: updateData,
          };
        }

        case "kegiatan": {
          const row = await RenstraKegiatan.findByPk(renstraRecordId, { transaction: t });
          if (!row) {
            const err = new Error("RenstraKegiatan tidak ditemukan.");
            err.status = 404;
            err.code = "RENSTRA_ROW_NOT_FOUND";
            throw err;
          }
          if (Number(row.renstra_id) !== Number(renstraId)) {
            const err = new Error("RenstraKegiatan tidak termasuk renstra_id ini.");
            err.status = 400;
            err.code = "RENSTRA_SCOPE_MISMATCH";
            throw err;
          }

          const kegiatan = await Kegiatan.findByPk(targetRpjmdId, { transaction: t });
          if (!kegiatan) {
            const err = new Error("Kegiatan RPJMD tidak ditemukan.");
            err.status = 404;
            err.code = "RPJMD_TARGET_NOT_FOUND";
            throw err;
          }
          await assertRpjmdMetaMatch("Kegiatan", kegiatan, ctx);

          const renstraProgram = await RenstraProgram.findByPk(row.program_id, { transaction: t });
          if (!renstraProgram) {
            const err = new Error("Parent RenstraProgram tidak ditemukan.");
            err.status = 400;
            err.code = "RENSTRA_PARENT_NOT_FOUND";
            throw err;
          }
          if (renstraProgram.renstra_id != null && Number(renstraProgram.renstra_id) !== Number(renstraId)) {
            const err = new Error("Parent RenstraProgram tidak termasuk renstra_id ini.");
            err.status = 400;
            err.code = "RENSTRA_SCOPE_MISMATCH";
            throw err;
          }
          if (!renstraProgram.rpjmd_program_id) {
            const err = new Error("Parent RenstraProgram belum di-map ke RPJMD (rpjmd_program_id masih kosong).");
            err.status = 400;
            err.code = "PARENT_MAPPING_REQUIRED";
            err.details = {
              level: "kegiatan",
              required_parent_level: "program",
              required_renstra_record_id: toPositiveInt(renstraProgram.id),
              required_field: "rpjmd_program_id",
              suggested_target_rpjmd_id: toPositiveInt(kegiatan.program_id),
            };
            throw err;
          }
          if (Number(renstraProgram.rpjmd_program_id) !== Number(kegiatan.program_id)) {
            const err = new Error("Chain tidak cocok: Kegiatan RPJMD bukan anak dari Program RPJMD pada RenstraProgram ini.");
            err.status = 400;
            err.code = "CHAIN_MISMATCH";
            err.details = {
              level: "kegiatan",
              parent_level: "program",
              renstra_parent_id: toPositiveInt(renstraProgram.id),
              expected_parent_rpjmd_id: toPositiveInt(renstraProgram.rpjmd_program_id),
              target_parent_rpjmd_id: toPositiveInt(kegiatan.program_id),
              target_kegiatan_id: toPositiveInt(kegiatan.id),
            };
            throw err;
          }

          const expectedProgramId = toPositiveInt(ctx?.program_id);
          if (expectedProgramId && Number(kegiatan.program_id) !== Number(expectedProgramId)) {
            const err = new Error("Kegiatan RPJMD bukan bagian dari Program yang dipilih.");
            err.status = 400;
            err.code = "CHAIN_MISMATCH";
            err.details = {
              level: "kegiatan",
              expected_program_id: expectedProgramId,
              actual_program_id: toPositiveInt(kegiatan.program_id),
              target_kegiatan_id: toPositiveInt(kegiatan.id),
            };
            throw err;
          }

          const oldVal = row.rpjmd_kegiatan_id;
          const updateData = { rpjmd_kegiatan_id: targetRpjmdId };
          await row.update(updateData, { transaction: t });

          return {
            entity_type: "renstra_kegiatan",
            entity_id: row.id,
            old: { rpjmd_kegiatan_id: oldVal },
            new: updateData,
          };
        }

        case "subKegiatan": {
          const row = await RenstraSubkegiatan.findByPk(renstraRecordId, { transaction: t });
          if (!row) {
            const err = new Error("RenstraSubKegiatan tidak ditemukan.");
            err.status = 404;
            err.code = "RENSTRA_ROW_NOT_FOUND";
            throw err;
          }

          const renstraProgram = await RenstraProgram.findByPk(row.renstra_program_id, { transaction: t });
          if (!renstraProgram) {
            const err = new Error("Parent RenstraProgram tidak ditemukan.");
            err.status = 400;
            err.code = "RENSTRA_PARENT_NOT_FOUND";
            throw err;
          }
          if (renstraProgram.renstra_id != null && Number(renstraProgram.renstra_id) !== Number(renstraId)) {
            const err = new Error("RenstraSubKegiatan tidak termasuk renstra_id ini.");
            err.status = 400;
            err.code = "RENSTRA_SCOPE_MISMATCH";
            throw err;
          }

          const sub = await SubKegiatan.findByPk(targetRpjmdId, { transaction: t });
          if (!sub) {
            const err = new Error("Sub Kegiatan RPJMD tidak ditemukan.");
            err.status = 404;
            err.code = "RPJMD_TARGET_NOT_FOUND";
            throw err;
          }
          await assertRpjmdMetaMatch("SubKegiatan", sub, ctx);

          const renstraKegiatan = await RenstraKegiatan.findByPk(row.kegiatan_id, { transaction: t });
          if (!renstraKegiatan) {
            const err = new Error("Parent RenstraKegiatan tidak ditemukan.");
            err.status = 400;
            err.code = "RENSTRA_PARENT_NOT_FOUND";
            throw err;
          }
          if (Number(renstraKegiatan.renstra_id) !== Number(renstraId)) {
            const err = new Error("Parent RenstraKegiatan tidak termasuk renstra_id ini.");
            err.status = 400;
            err.code = "RENSTRA_SCOPE_MISMATCH";
            throw err;
          }
          if (!renstraKegiatan.rpjmd_kegiatan_id) {
            const err = new Error("Parent RenstraKegiatan belum di-map ke RPJMD (rpjmd_kegiatan_id masih kosong).");
            err.status = 400;
            err.code = "PARENT_MAPPING_REQUIRED";
            err.details = {
              level: "subKegiatan",
              required_parent_level: "kegiatan",
              required_renstra_record_id: toPositiveInt(renstraKegiatan.id),
              required_field: "rpjmd_kegiatan_id",
              suggested_target_rpjmd_id: toPositiveInt(sub.kegiatan_id),
            };
            throw err;
          }
          if (Number(renstraKegiatan.rpjmd_kegiatan_id) !== Number(sub.kegiatan_id)) {
            const err = new Error("Chain tidak cocok: Sub Kegiatan RPJMD bukan anak dari Kegiatan RPJMD pada RenstraKegiatan ini.");
            err.status = 400;
            err.code = "CHAIN_MISMATCH";
            err.details = {
              level: "subKegiatan",
              parent_level: "kegiatan",
              renstra_parent_id: toPositiveInt(renstraKegiatan.id),
              expected_parent_rpjmd_id: toPositiveInt(renstraKegiatan.rpjmd_kegiatan_id),
              target_parent_rpjmd_id: toPositiveInt(sub.kegiatan_id),
              target_sub_kegiatan_id: toPositiveInt(sub.id),
            };
            throw err;
          }

          const expectedKegiatanId = toPositiveInt(ctx?.kegiatan_id);
          if (expectedKegiatanId && Number(sub.kegiatan_id) !== Number(expectedKegiatanId)) {
            const err = new Error("Sub Kegiatan RPJMD bukan bagian dari Kegiatan yang dipilih.");
            err.status = 400;
            err.code = "CHAIN_MISMATCH";
            err.details = {
              level: "subKegiatan",
              expected_kegiatan_id: expectedKegiatanId,
              actual_kegiatan_id: toPositiveInt(sub.kegiatan_id),
              target_sub_kegiatan_id: toPositiveInt(sub.id),
            };
            throw err;
          }

          const oldVal = row.sub_kegiatan_id;
          const updateData = { sub_kegiatan_id: targetRpjmdId };
          await row.update(updateData, { transaction: t });

          return {
            entity_type: "renstra_subkegiatan",
            entity_id: row.id,
            old: { sub_kegiatan_id: oldVal },
            new: updateData,
          };
        }

        default: {
          const err = new Error(`level tidak dikenali: ${level}`);
          err.status = 400;
          err.code = "LEVEL_INVALID";
          throw err;
        }
      }
    });

    await logActivity(req, {
      action: "RENSTRA_RPJMD_MAPPING_APPLIED",
      entity_type: result.entity_type,
      entity_id: result.entity_id,
      old_data: {
        level,
        renstra_id: renstraId,
        renstra_record_id: renstraRecordId,
        target_rpjmd_id: targetRpjmdId,
        context: ctx,
        change_reason_text: String(req.body?.change_reason_text ?? "").trim() || null,
        change_reason_file: String(req.body?.change_reason_file ?? "").trim() || null,
        ...result.old,
      },
      new_data: {
        level,
        renstra_id: renstraId,
        renstra_record_id: renstraRecordId,
        target_rpjmd_id: targetRpjmdId,
        ...result.new,
      },
    });

    return res.json({
      success: true,
      message: "Mapping Renstra -> RPJMD berhasil diterapkan.",
      data: result,
    });
  } catch (e) {
    const status = Number(e.status) || 500;
    const code = e.code || (status === 500 ? "SERVER_ERROR" : "ERROR");
    return res.status(status).json({
      success: false,
      code,
      message: e.message,
      details: e.details,
    });
  }
}

module.exports = {
  applyMapping,
};
