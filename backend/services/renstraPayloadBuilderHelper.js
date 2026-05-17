const pickAllowedFields = (body, allowedFields, excludedFields = []) => {
  const picked = {};

  allowedFields.forEach((field) => {
    if (
      body?.[field] !== undefined &&
      !excludedFields.includes(field)
    ) {
      picked[field] = body[field];
    }
  });

  return picked;
};

const buildBaseRenstraPayload = ({
  body = {},
  allowedFields,
  excludedFields = ["alasan_revisi"],
  current,
  master,
  indikator,
  userId,
  levelIdField,
  kodeField,
  deskripsiField,
  masterKodeField,
  masterDeskripsiField,
  computeFinal,
  buildPaguPayload,
}) => {
        const safeBody = body || {};
        const cleanBody = pickAllowedFields(safeBody, allowedFields, excludedFields);

        const base = {
        ...cleanBody,

        renstra_id: Number(
        safeBody.renstra_id || current?.renstra_id || master.renstra_id
        ),

        [levelIdField]: Number(
        safeBody[levelIdField] || current?.[levelIdField] || master.id
        ),

        indikator_id: Number(
        safeBody.indikator_id || current?.indikator_id || indikator.id
        ),

        [kodeField]:
        body[kodeField] ??
        current?.[kodeField] ??
        master?.[masterKodeField] ??
        null,

        [deskripsiField]:
        safeBody[deskripsiField] ??
        current?.[deskripsiField] ??
        master?.[masterDeskripsiField] ??
        "",

        indikator:
        safeBody.indikator ?? current?.indikator ?? indikator.nama_indikator ?? null,

        baseline:
        safeBody.baseline ?? current?.baseline ?? indikator.baseline ?? null,

        satuan_target:
        safeBody.satuan_target ?? current?.satuan_target ?? indikator.satuan ?? null,

        lokasi:
        safeBody.lokasi ?? current?.lokasi ?? indikator.lokasi ?? null,

        opd_penanggung_jawab:
        safeBody.opd_penanggung_jawab ?? current?.opd_penanggung_jawab ?? null,

        pagu_rpjmd_acuan:
        Number(current?.pagu_rpjmd_acuan || safeBody.pagu_rpjmd_acuan || 0),

        last_revised_at: new Date(),
        last_revised_by: userId,
        };

        if (typeof buildPaguPayload === "function") {
        Object.assign(base, buildPaguPayload(safeBody, current));
        }

        if (typeof computeFinal === "function") {
        return {
        ...base,
        ...computeFinal(base),
        };
        }

        return base;
        };

        module.exports = {
        pickAllowedFields,
        buildBaseRenstraPayload,
        };