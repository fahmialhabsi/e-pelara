/**
 * Pastikan dokumen turunan memiliki baseline RPJMD yang valid (ID harus ada di tabel rpjmd).
 * @param {import("sequelize").ModelCtor} RPJMD
 * @param {number|null|undefined} rpjmdFromBody dari splitPlanningBody
 * @param {number|null|undefined} fallbackRowRpjmdId nilai yang sudah tersimpan (update)
 */
async function assertEffectiveRpjmdId(RPJMD, rpjmdFromBody, fallbackRowRpjmdId) {
  const eff =
    rpjmdFromBody != null && Number.isFinite(Number(rpjmdFromBody))
      ? Number(rpjmdFromBody)
      : fallbackRowRpjmdId != null && Number.isFinite(Number(fallbackRowRpjmdId))
        ? Number(fallbackRowRpjmdId)
        : null;
  if (!Number.isFinite(eff)) {
    return {
      ok: false,
      msg: "rpjmd_id (baseline RPJMD) wajib diisi agar rantai dokumen dapat diaudit.",
    };
  }
  const row = await RPJMD.findByPk(eff);
  if (!row) return { ok: false, msg: "rpjmd_id tidak valid (RPJMD tidak ditemukan)." };
  return { ok: true, id: eff };
}

module.exports = { assertEffectiveRpjmdId };
