/**
 * Wajib salah satu: change_reason_text (non-kosong) atau change_reason_file (non-kosong)
 * untuk mutasi (PUT/PATCH/DELETE). Body JSON.
 */
module.exports = function requireChangeReason(req, res, next) {
  const text = String(req.body?.change_reason_text ?? "").trim();
  const file = String(req.body?.change_reason_file ?? "").trim();
  if (!text && !file) {
    return res.status(400).json({
      success: false,
      code: "CHANGE_REASON_REQUIRED",
      error:
        "Alasan perubahan wajib: isi change_reason_text atau change_reason_file.",
    });
  }
  return next();
};
