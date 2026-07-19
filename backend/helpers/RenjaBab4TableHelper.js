'use strict';

const { RENJA_BAB4_TABLE, RENJA_BAB4_HEADERS } = require('./RenjaPdfThemeHelper');

function buildRenjaBab4Table(rows) {
  return {
    headers: RENJA_BAB4_HEADERS,

    widths: RENJA_BAB4_TABLE.map((c) => c.width),

    rows: rows.map((row) =>
      RENJA_BAB4_TABLE.map((c) => ({
        text: String(row[c.field] ?? ''),
        align: c.align ?? 'left',
      })),
    ),
  };
}

module.exports = {
  buildRenjaBab4Table,
};
