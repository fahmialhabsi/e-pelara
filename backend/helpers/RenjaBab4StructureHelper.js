'use strict';

const { RENJA_BAB4 } = require('./RenjaDocumentThemeHelper');
const { renjaTableData } = require('./RenjaPdfDataHelper');

async function buildRenjaBab4(meta, items, db) {
  const tahunMaju = Number(meta.tahun) + 1;

  const rows = await renjaTableData(items, {
    db,
    renstraOpdId: meta.renstraOpdId,
    tahunAwalRenstra: meta.tahunAwalRenstra,
    tahunMaju,
  });

  return {
    title: RENJA_BAB4.TITLE,

    policy: {
      heading: RENJA_BAB4.SUBTITLE_POLICY,
      body: RENJA_BAB4.POLICY_TEXT(meta),
    },

    table: {
      heading: RENJA_BAB4.SUBTITLE_TABLE,
      caption: RENJA_BAB4.TABLE_TITLE(meta),
      note: RENJA_BAB4.TABLE_NOTE(meta),
      rows,
    },
  };
}

function bab4PdfRows(rows) {
  return rows.map((r) => [
    r.no,
    r.program,
    r.kegiatan,
    r.subKegiatan,
    r.indikator,
    r.target,
    r.satuan,
    r.pagu,
  ]);
}

module.exports = {
  buildRenjaBab4,
  bab4PdfRows,
};
