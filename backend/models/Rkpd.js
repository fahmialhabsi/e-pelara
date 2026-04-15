"use strict";

/**
 * Legacy compatibility wrapper.
 *
 * Model canonical RKPD ada di `rkpdModel.js`. File ini tetap dipertahankan
 * hanya untuk kompatibilitas import lama (`models/Rkpd`) dan tidak boleh
 * membuat definisi model kedua.
 */
module.exports = (sequelize) => {
  if (sequelize.models.Rkpd) {
    return sequelize.models.Rkpd;
  }
  return null;
};
