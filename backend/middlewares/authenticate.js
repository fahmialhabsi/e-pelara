// middleware/authenticate.js
// DEPRECATED: Middleware ini sebelumnya hardcode role SUPER ADMIN tanpa verifikasi JWT.
// Sekarang diarahkan ke verifyToken.js yang benar dan aman.
// Jangan gunakan langsung — gunakan verifyToken dari middlewares/verifyToken.js.
module.exports = require("./verifyToken");
