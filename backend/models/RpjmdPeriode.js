"use strict";

/**
 * Legacy compatibility wrapper.
 *
 * Canonical model periode RPJMD adalah `PeriodeRpjmd` (lihat `periodeModel.js`)
 * yang dipakai lintas modul. File ini sengaja tidak mendefinisikan model baru
 * agar tidak ada registry ganda (`RpjmdPeriode` vs `PeriodeRpjmd`).
 */
module.exports = (sequelize) => {
  if (sequelize.models.PeriodeRpjmd) {
    return sequelize.models.PeriodeRpjmd;
  }
  return null;
};
