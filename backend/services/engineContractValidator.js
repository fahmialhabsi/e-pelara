'use strict';

/**
 * Engine Contract Validator
 * Validates engineResult data integrity with 3 core invariants:
 * - INV-A1: no empty kode_rekening
 * - INV-A2: jumlah is valid number >= 0
 * - INV-A3: total === SUM(rows.jumlah)
 *
 * Complexity: O(n) single pass
 */

const validateEngineContract = (engineResult) => {
  const violations = [];

  // Guard: engineResult structure
  if (!engineResult || typeof engineResult !== 'object') {
    return {
      valid: false,
      violations: [
        {
          code: 'INVALID_ENGINE_RESULT',
          message: 'engineResult is not a valid object',
        },
      ],
      summary: {
        rows_validated: 0,
        violations_count: 1,
        valid: false,
      },
    };
  }

  const { rows = [], total = 0 } = engineResult;

  // Guard: rows must be array
  if (!Array.isArray(rows)) {
    return {
      valid: false,
      violations: [
        {
          code: 'INVALID_ROWS',
          message: 'rows must be an array',
        },
      ],
      summary: {
        rows_validated: 0,
        violations_count: 1,
        valid: false,
      },
    };
  }

  // Single pass validation: O(n)
  let computedTotal = 0;
  const emptyKodes = [];
  const invalidJumlah = [];

  rows.forEach((row, index) => {
    // INV-A1: Check for empty kode_rekening
    const kode = row.kode_rekening;
    if (!kode || kode.toString().trim() === '') {
      emptyKodes.push({
        index,
        id: row.id,
        uraian: row.uraian,
      });
    }

    // INV-A2: Check jumlah is valid number >= 0
    const jumlah = row.jumlah;
    if (typeof jumlah !== 'number' || isNaN(jumlah) || jumlah < 0) {
      invalidJumlah.push({
        index,
        id: row.id,
        jumlah,
        type: typeof jumlah,
      });
    } else {
      // Accumulate for INV-A3 check
      computedTotal += jumlah;
    }
  });

  // INV-A1 Violation
  if (emptyKodes.length > 0) {
    violations.push({
      code: 'INV-A1',
      message: 'Rows dengan kode_rekening kosong ditemukan',
      count: emptyKodes.length,
      samples: emptyKodes.slice(0, 3),
    });
  }

  // INV-A2 Violation
  if (invalidJumlah.length > 0) {
    violations.push({
      code: 'INV-A2',
      message: 'Rows dengan jumlah invalid (bukan number, NaN, atau negative)',
      count: invalidJumlah.length,
      samples: invalidJumlah.slice(0, 3),
    });
  }

  // INV-A3 Violation: total === SUM(rows.jumlah)
  if (total !== computedTotal) {
    violations.push({
      code: 'INV-A3',
      message: 'Total mismatch: engineResult.total !== SUM(rows.jumlah)',
      stored_total: total,
      computed_total: computedTotal,
      diff: total - computedTotal,
    });
  }

  return {
    valid: violations.length === 0,
    violations,
    summary: {
      rows_validated: rows.length,
      violations_count: violations.length,
      computed_total: computedTotal,
      stored_total: total,
      valid: violations.length === 0,
    },
  };
};

module.exports = {
  validateEngineContract,
};
