/**
 * Pisahkan meta audit dari payload bisnis (tidak ikut Joi schema utama).
 */
function splitPlanningBody(body) {
  const b = body && typeof body === "object" ? body : {};
  const {
    change_reason_text,
    change_reason_file,
    rpjmd_id,
    ...rest
  } = b;
  return {
    payload: rest,
    change_reason_text:
      change_reason_text != null ? String(change_reason_text).trim() : "",
    change_reason_file:
      change_reason_file != null ? String(change_reason_file).trim() : "",
    rpjmd_id:
      rpjmd_id != null && rpjmd_id !== ""
        ? Number(rpjmd_id)
        : null,
  };
}

module.exports = { splitPlanningBody };
