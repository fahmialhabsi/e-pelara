// utils/responseHelper.js

exports.successResponse = (
  res,
  status = 200,
  message = "Berhasil",
  data = null
) => {
  return res.status(status).json({ message, data });
};

exports.errorResponse = (
  res,
  status = 500,
  message = "Terjadi kesalahan",
  error = null
) => {
  return res.status(status).json({ message, error });
};
