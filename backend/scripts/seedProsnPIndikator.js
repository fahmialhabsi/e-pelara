'use strict';

const db = require('../models');
const { initializeInitialIndicators } = require('../services/prosnp/prosnpInitialIndicators');

const periodeId = Number(process.argv.find((arg) => arg.startsWith('--periode-id='))?.split('=')[1]);
if (!Number.isInteger(periodeId) || periodeId < 1) {
  console.error('Gunakan: node scripts/seedProsnPIndikator.js --periode-id=<id>');
  process.exit(1);
}

(async () => {
  try {
    const periode = await db.ProsnPeriode.findByPk(periodeId);
    if (!periode) throw new Error('Periode ProSN tidak ditemukan.');
    if (periode.status !== 'draft') throw new Error('Seed hanya boleh dijalankan pada periode draft.');
    let jumlah = 0;
    await db.sequelize.transaction(async (transaction) => {
      jumlah = await initializeInitialIndicators({ periode, transaction });
    });
    console.log(`Seed ProSN selesai: ${jumlah} indikator untuk periode ${periodeId}.`);
  } catch (error) {
    console.error('[seedProsnPIndikator]', error.message);
    process.exitCode = 1;
  } finally { await db.sequelize.close(); }
})();
