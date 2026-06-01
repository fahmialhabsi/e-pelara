const { RPJMD } = require('../models');

async function resolveRpjmdByContext({ tahun, periode_id }) {
  if (!tahun) return { ok: false, msg: 'tahun wajib untuk resolve RPJMD' };

  const row = await RPJMD.findOne({
    where: {
      tahun_penetapan: tahun,
    },
    order: [['id', 'DESC']],
  });

  if (!row) {
    return {
      ok: false,
      msg: `RPJMD tidak ditemukan untuk tahun ${tahun}`,
    };
  }

  return { ok: true, id: row.id, row };
}

module.exports = { resolveRpjmdByContext };
