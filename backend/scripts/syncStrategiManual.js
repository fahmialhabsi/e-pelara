require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { sequelize } = require('../models');
const { syncStrategi } = require('../services/renstraPaguCachedIncrementalSyncService');

(async () => {
  const t = await sequelize.transaction();
  try {
    const result = await syncStrategi({ renstra_id: 2, strategi_id: 11, transaction: t });
    await t.commit();
    console.log('Sync selesai:', result);
  } catch (err) {
    await t.rollback();
    console.error('Sync gagal:', err.message);
  } finally {
    await sequelize.close();
  }
})();
