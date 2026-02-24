// middleware/authenticate.js
module.exports = function authenticate(req, res, next) {
  // TODO: Ganti dengan verifikasi JWT sebenarnya
  req.user = { id: 1, role: "SUPER ADMIN" };
  next();
};
