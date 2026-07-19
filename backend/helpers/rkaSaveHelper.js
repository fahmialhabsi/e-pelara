'use strict';

const { Rka, RkaRincianBelanja } = require('../models');

async function saveRka(payload, rincian) {
  const created = await Rka.create(payload);

  if (Array.isArray(rincian) && rincian.length) {
    await RkaRincianBelanja.bulkCreate(
      rincian.map((row) => ({
        ...row,
        rka_id: created.id,
      })),
    );
  }

  return created;
}

module.exports = {
  saveRka,
};
