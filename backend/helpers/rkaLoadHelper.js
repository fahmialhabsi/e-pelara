'use strict';

const { Rka, RkaRincianBelanja, PeriodeRpjmd } = require('../models');

async function loadRka(id) {
  return Rka.findByPk(id, {
    include: [
      {
        model: RkaRincianBelanja,
        as: 'rincianBelanja',
      },
      {
        model: PeriodeRpjmd,
        as: 'periode',
      },
    ],
    order: [
      [
        {
          model: RkaRincianBelanja,
          as: 'rincianBelanja',
        },
        'urutan',
        'ASC',
      ],
    ],
  });
}

module.exports = {
  loadRka,
};
