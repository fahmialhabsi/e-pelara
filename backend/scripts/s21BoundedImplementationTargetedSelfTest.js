'use strict';

/**
 * Sprint 21 — Bounded Implementation (mandate ePELARA-MP-S21-IMPL-FGS-20260822)
 * TARGETED self-test for Candidate A (renjaPokirDprdController.js /
 * renjaInovasiBidangUrusanController.js findAll+rekap default-scoping fix)
 * and Candidate B (lkAsetTetapController.js create/update Joi validation).
 * Same DB-independent mocking technique as
 * backend/scripts/opdBoundaryRegressionSelfTest.js and
 * backend/scripts/s20BoundedImplementationTargetedSelfTest.js
 * (require('../models') once, override specific model methods with
 * in-memory fakes, restore in finally — never a real MySQL connection or
 * mutation). Kept as a separate file for the same reason as the Sprint 20
 * targeted file: the existing giant harness already exceeds this tool's
 * 45s execution cap on its own.
 *
 * Run: node scripts/s21BoundedImplementationTargetedSelfTest.js  (from backend/)
 */

const assert = require('assert');

let pass = 0;
let fail = 0;

async function test(name, fn) {
  try {
    await fn();
    pass++;
    console.log(`  OK  ${name}`);
  } catch (error) {
    fail++;
    console.log(`FAIL  ${name}\n      ${error.stack || error.message}`);
  }
}

function fakeRes() {
  const res = {
    statusCode: 200,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  };
  return res;
}

async function withStubs(stubs, fn) {
  const originals = stubs.map(([obj, name]) => [obj, name, obj[name]]);
  for (const [obj, name, , impl] of stubs.map(([o, n, i]) => [o, n, undefined, i])) {
    obj[name] = impl;
  }
  try {
    return await fn();
  } finally {
    for (const [obj, name, original] of originals) {
      obj[name] = original;
    }
  }
}

const models = require('../models');

async function runAllTests() {

console.log('=== S21-A: renjaPokirDprdController.js (C3) — findAll/rekap default-scoping ===');

await test('C3 findAll: pdId eksplisit SAMA dengan OPD caller -> 200, boundary mengizinkan', async () => {
  delete require.cache[require.resolve('../controllers/renjaPokirDprdController')];
  await withStubs(
    [
      [models.OpdPenanggungJawab, 'findOne', async ({ where }) => ({ id: 1, nama_opd: where.nama_opd })],
      [models.PerangkatDaerahOpdMapping, 'findOne', async () => ({ opd_penanggung_jawab_id: 1 })],
    ],
    async () => {
      const controller = require('../controllers/renjaPokirDprdController');
      let capturedWhere = null;
      const original = models.RenjaPokirDprd.findAll;
      models.RenjaPokirDprd.findAll = async ({ where }) => { capturedWhere = where; return []; };
      try {
        const req = { query: { perangkat_daerah_id: '10' }, user: { role: 'PELAKSANA', opd: 'Dinas Uji A' } };
        const res = fakeRes();
        await controller.findAll(req, res);
        assert.strictEqual(res.statusCode, 200, `harus 200, body=${JSON.stringify(res.body)}`);
        assert.strictEqual(capturedWhere.perangkat_daerah_id, 10);
      } finally {
        models.RenjaPokirDprd.findAll = original;
      }
    }
  );
});

await test('C3 findAll: pdId eksplisit BEDA dari OPD caller -> 403, RenjaPokirDprd.findAll TIDAK dipanggil', async () => {
  delete require.cache[require.resolve('../controllers/renjaPokirDprdController')];
  await withStubs(
    [
      [models.OpdPenanggungJawab, 'findOne', async ({ where }) => ({ id: 1, nama_opd: where.nama_opd })],
      [models.PerangkatDaerahOpdMapping, 'findOne', async () => ({ opd_penanggung_jawab_id: 2 })],
    ],
    async () => {
      const controller = require('../controllers/renjaPokirDprdController');
      let called = false;
      const original = models.RenjaPokirDprd.findAll;
      models.RenjaPokirDprd.findAll = async () => { called = true; return []; };
      try {
        const req = { query: { perangkat_daerah_id: '10' }, user: { role: 'PELAKSANA', opd: 'Dinas Uji A' } };
        const res = fakeRes();
        await controller.findAll(req, res);
        assert.strictEqual(res.statusCode, 403, `harus 403, body=${JSON.stringify(res.body)}`);
        assert.strictEqual(res.body?.code, 'RENJA_DATA_PENDUKUNG_OPD_FORBIDDEN');
        assert.strictEqual(called, false, 'findAll data tidak boleh dipanggil ketika boundary menolak');
      } finally {
        models.RenjaPokirDprd.findAll = original;
      }
    }
  );
});

await test('C3 findAll: pdId DIHILANGKAN, caller non-SUPER_ADMIN -> 200, default ke PD milik caller sendiri (Op.in)', async () => {
  delete require.cache[require.resolve('../controllers/renjaPokirDprdController')];
  await withStubs(
    [
      [models.OpdPenanggungJawab, 'findOne', async () => ({ id: 1 })],
      [models.PerangkatDaerahOpdMapping, 'findAll', async () => ([{ perangkat_daerah_id: 10 }, { perangkat_daerah_id: 11 }])],
    ],
    async () => {
      const controller = require('../controllers/renjaPokirDprdController');
      let capturedWhere = null;
      const original = models.RenjaPokirDprd.findAll;
      models.RenjaPokirDprd.findAll = async ({ where }) => { capturedWhere = where; return []; };
      try {
        const req = { query: {}, user: { role: 'PELAKSANA', opd: 'Dinas Uji A' } };
        const res = fakeRes();
        await controller.findAll(req, res);
        assert.strictEqual(res.statusCode, 200, `harus 200, body=${JSON.stringify(res.body)}`);
        const { Op } = models.Sequelize;
        assert.ok(capturedWhere.perangkat_daerah_id, 'where harus punya klausa perangkat_daerah_id yang dipaksakan');
        assert.deepStrictEqual(capturedWhere.perangkat_daerah_id[Op.in], [10, 11]);
      } finally {
        models.RenjaPokirDprd.findAll = original;
      }
    }
  );
});

await test('C3 findAll: pdId DIHILANGKAN, caller SUPER_ADMIN -> 200, TIDAK dipaksa scope (semua OPD)', async () => {
  delete require.cache[require.resolve('../controllers/renjaPokirDprdController')];
  const controller = require('../controllers/renjaPokirDprdController');
  let capturedWhere = null;
  const original = models.RenjaPokirDprd.findAll;
  models.RenjaPokirDprd.findAll = async ({ where }) => { capturedWhere = where; return []; };
  try {
    const req = { query: {}, user: { role: 'SUPER_ADMIN', opd: 'Dinas Manapun' } };
    const res = fakeRes();
    await controller.findAll(req, res);
    assert.strictEqual(res.statusCode, 200, `harus 200, body=${JSON.stringify(res.body)}`);
    assert.strictEqual(capturedWhere.perangkat_daerah_id, undefined, 'SUPER_ADMIN tidak boleh dipaksa scope PD apapun');
  } finally {
    models.RenjaPokirDprd.findAll = original;
  }
});

await test('C3 rekap: pdId eksplisit SAMA dengan OPD caller -> 200, memanggil rekapPokir asli', async () => {
  delete require.cache[require.resolve('../controllers/renjaPokirDprdController')];
  await withStubs(
    [
      [models.OpdPenanggungJawab, 'findOne', async ({ where }) => ({ id: 1, nama_opd: where.nama_opd })],
      [models.PerangkatDaerahOpdMapping, 'findOne', async () => ({ opd_penanggung_jawab_id: 1 })],
    ],
    async () => {
      const controller = require('../controllers/renjaPokirDprdController');
      let capturedWhere = null;
      const original = models.RenjaPokirDprd.findAll;
      models.RenjaPokirDprd.findAll = async ({ where }) => { capturedWhere = where; return []; };
      try {
        const req = { query: { perangkat_daerah_id: '10', tahun: '2026' }, user: { role: 'PELAKSANA', opd: 'Dinas Uji A' } };
        const res = fakeRes();
        await controller.rekap(req, res);
        assert.strictEqual(res.statusCode, 200, `harus 200, body=${JSON.stringify(res.body)}`);
        assert.strictEqual(capturedWhere.perangkat_daerah_id, 10);
      } finally {
        models.RenjaPokirDprd.findAll = original;
      }
    }
  );
});

await test('C3 rekap: pdId eksplisit BEDA dari OPD caller -> 403, rekapPokir TIDAK dipanggil', async () => {
  delete require.cache[require.resolve('../controllers/renjaPokirDprdController')];
  await withStubs(
    [
      [models.OpdPenanggungJawab, 'findOne', async ({ where }) => ({ id: 1, nama_opd: where.nama_opd })],
      [models.PerangkatDaerahOpdMapping, 'findOne', async () => ({ opd_penanggung_jawab_id: 2 })],
    ],
    async () => {
      const controller = require('../controllers/renjaPokirDprdController');
      let called = false;
      const original = models.RenjaPokirDprd.findAll;
      models.RenjaPokirDprd.findAll = async () => { called = true; return []; };
      try {
        const req = { query: { perangkat_daerah_id: '10' }, user: { role: 'PELAKSANA', opd: 'Dinas Uji A' } };
        const res = fakeRes();
        await controller.rekap(req, res);
        assert.strictEqual(res.statusCode, 403, `harus 403, body=${JSON.stringify(res.body)}`);
        assert.strictEqual(called, false);
      } finally {
        models.RenjaPokirDprd.findAll = original;
      }
    }
  );
});

await test('C3 rekap: pdId DIHILANGKAN, caller non-SUPER_ADMIN -> 200, agregat di-scope ke PD milik caller (Op.in)', async () => {
  delete require.cache[require.resolve('../controllers/renjaPokirDprdController')];
  await withStubs(
    [
      [models.OpdPenanggungJawab, 'findOne', async () => ({ id: 1 })],
      [models.PerangkatDaerahOpdMapping, 'findAll', async () => ([{ perangkat_daerah_id: 10 }, { perangkat_daerah_id: 11 }])],
    ],
    async () => {
      const controller = require('../controllers/renjaPokirDprdController');
      let capturedWhere = null;
      const original = models.RenjaPokirDprd.findAll;
      models.RenjaPokirDprd.findAll = async ({ where }) => {
        capturedWhere = where;
        return [
          { nilai_usulan_anggaran: 1000, program_kegiatan_terkait: 'x', dapil: 'A', nama_anggota_dprd: 'Budi' },
        ];
      };
      try {
        const req = { query: { tahun: '2026' }, user: { role: 'PELAKSANA', opd: 'Dinas Uji A' } };
        const res = fakeRes();
        await controller.rekap(req, res);
        assert.strictEqual(res.statusCode, 200, `harus 200, body=${JSON.stringify(res.body)}`);
        const { Op } = models.Sequelize;
        assert.deepStrictEqual(capturedWhere.perangkat_daerah_id[Op.in], [10, 11]);
        assert.strictEqual(res.body?.data?.jumlah_usulan, 1);
        assert.strictEqual(res.body?.data?.total_nilai_usulan, 1000);
      } finally {
        models.RenjaPokirDprd.findAll = original;
      }
    }
  );
});

await test('C3 rekap: pdId DIHILANGKAN, caller SUPER_ADMIN -> 200, tidak dipaksa scope', async () => {
  delete require.cache[require.resolve('../controllers/renjaPokirDprdController')];
  const controller = require('../controllers/renjaPokirDprdController');
  let capturedWhere = null;
  const original = models.RenjaPokirDprd.findAll;
  models.RenjaPokirDprd.findAll = async ({ where }) => { capturedWhere = where; return []; };
  try {
    const req = { query: {}, user: { role: 'SUPER_ADMIN', opd: 'Dinas Manapun' } };
    const res = fakeRes();
    await controller.rekap(req, res);
    assert.strictEqual(res.statusCode, 200, `harus 200, body=${JSON.stringify(res.body)}`);
    assert.strictEqual(capturedWhere.perangkat_daerah_id, undefined);
  } finally {
    models.RenjaPokirDprd.findAll = original;
  }
});

console.log('=== S21-A: renjaInovasiBidangUrusanController.js (C4) — findAll/rekap default-scoping ===');

await test('C4 findAll: pdId eksplisit SAMA dengan OPD caller -> 200', async () => {
  delete require.cache[require.resolve('../controllers/renjaInovasiBidangUrusanController')];
  await withStubs(
    [
      [models.OpdPenanggungJawab, 'findOne', async ({ where }) => ({ id: 1, nama_opd: where.nama_opd })],
      [models.PerangkatDaerahOpdMapping, 'findOne', async () => ({ opd_penanggung_jawab_id: 1 })],
    ],
    async () => {
      const controller = require('../controllers/renjaInovasiBidangUrusanController');
      let capturedWhere = null;
      const original = models.RenjaInovasiBidangUrusan.findAll;
      models.RenjaInovasiBidangUrusan.findAll = async ({ where }) => { capturedWhere = where; return []; };
      try {
        const req = { query: { perangkat_daerah_id: '10' }, user: { role: 'PELAKSANA', opd: 'Dinas Uji A' } };
        const res = fakeRes();
        await controller.findAll(req, res);
        assert.strictEqual(res.statusCode, 200, `harus 200, body=${JSON.stringify(res.body)}`);
        assert.strictEqual(capturedWhere.perangkat_daerah_id, 10);
      } finally {
        models.RenjaInovasiBidangUrusan.findAll = original;
      }
    }
  );
});

await test('C4 findAll: pdId eksplisit BEDA dari OPD caller -> 403, findAll TIDAK dipanggil', async () => {
  delete require.cache[require.resolve('../controllers/renjaInovasiBidangUrusanController')];
  await withStubs(
    [
      [models.OpdPenanggungJawab, 'findOne', async ({ where }) => ({ id: 1, nama_opd: where.nama_opd })],
      [models.PerangkatDaerahOpdMapping, 'findOne', async () => ({ opd_penanggung_jawab_id: 2 })],
    ],
    async () => {
      const controller = require('../controllers/renjaInovasiBidangUrusanController');
      let called = false;
      const original = models.RenjaInovasiBidangUrusan.findAll;
      models.RenjaInovasiBidangUrusan.findAll = async () => { called = true; return []; };
      try {
        const req = { query: { perangkat_daerah_id: '10' }, user: { role: 'PELAKSANA', opd: 'Dinas Uji A' } };
        const res = fakeRes();
        await controller.findAll(req, res);
        assert.strictEqual(res.statusCode, 403, `harus 403, body=${JSON.stringify(res.body)}`);
        assert.strictEqual(called, false);
      } finally {
        models.RenjaInovasiBidangUrusan.findAll = original;
      }
    }
  );
});

await test('C4 findAll: pdId DIHILANGKAN, caller non-SUPER_ADMIN -> 200, default ke PD milik caller (Op.in)', async () => {
  delete require.cache[require.resolve('../controllers/renjaInovasiBidangUrusanController')];
  await withStubs(
    [
      [models.OpdPenanggungJawab, 'findOne', async () => ({ id: 1 })],
      [models.PerangkatDaerahOpdMapping, 'findAll', async () => ([{ perangkat_daerah_id: 20 }])],
    ],
    async () => {
      const controller = require('../controllers/renjaInovasiBidangUrusanController');
      let capturedWhere = null;
      const original = models.RenjaInovasiBidangUrusan.findAll;
      models.RenjaInovasiBidangUrusan.findAll = async ({ where }) => { capturedWhere = where; return []; };
      try {
        const req = { query: {}, user: { role: 'PELAKSANA', opd: 'Dinas Uji A' } };
        const res = fakeRes();
        await controller.findAll(req, res);
        assert.strictEqual(res.statusCode, 200, `harus 200, body=${JSON.stringify(res.body)}`);
        const { Op } = models.Sequelize;
        assert.deepStrictEqual(capturedWhere.perangkat_daerah_id[Op.in], [20]);
      } finally {
        models.RenjaInovasiBidangUrusan.findAll = original;
      }
    }
  );
});

await test('C4 findAll: pdId DIHILANGKAN, caller SUPER_ADMIN -> 200, tidak dipaksa scope', async () => {
  delete require.cache[require.resolve('../controllers/renjaInovasiBidangUrusanController')];
  const controller = require('../controllers/renjaInovasiBidangUrusanController');
  let capturedWhere = null;
  const original = models.RenjaInovasiBidangUrusan.findAll;
  models.RenjaInovasiBidangUrusan.findAll = async ({ where }) => { capturedWhere = where; return []; };
  try {
    const req = { query: {}, user: { role: 'SUPER_ADMIN', opd: 'Dinas Manapun' } };
    const res = fakeRes();
    await controller.findAll(req, res);
    assert.strictEqual(res.statusCode, 200, `harus 200, body=${JSON.stringify(res.body)}`);
    assert.strictEqual(capturedWhere.perangkat_daerah_id, undefined);
  } finally {
    models.RenjaInovasiBidangUrusan.findAll = original;
  }
});

await test('C4 rekap: pdId eksplisit SAMA dengan OPD caller -> 200, memanggil rekapInovasi asli', async () => {
  delete require.cache[require.resolve('../controllers/renjaInovasiBidangUrusanController')];
  await withStubs(
    [
      [models.OpdPenanggungJawab, 'findOne', async ({ where }) => ({ id: 1, nama_opd: where.nama_opd })],
      [models.PerangkatDaerahOpdMapping, 'findOne', async () => ({ opd_penanggung_jawab_id: 1 })],
    ],
    async () => {
      const controller = require('../controllers/renjaInovasiBidangUrusanController');
      let capturedWhere = null;
      const original = models.RenjaInovasiBidangUrusan.findAll;
      models.RenjaInovasiBidangUrusan.findAll = async ({ where }) => { capturedWhere = where; return []; };
      try {
        const req = { query: { perangkat_daerah_id: '10', tahun: '2026' }, user: { role: 'PELAKSANA', opd: 'Dinas Uji A' } };
        const res = fakeRes();
        await controller.rekap(req, res);
        assert.strictEqual(res.statusCode, 200, `harus 200, body=${JSON.stringify(res.body)}`);
        assert.strictEqual(capturedWhere.perangkat_daerah_id, 10);
      } finally {
        models.RenjaInovasiBidangUrusan.findAll = original;
      }
    }
  );
});

await test('C4 rekap: pdId eksplisit BEDA dari OPD caller -> 403, rekapInovasi TIDAK dipanggil', async () => {
  delete require.cache[require.resolve('../controllers/renjaInovasiBidangUrusanController')];
  await withStubs(
    [
      [models.OpdPenanggungJawab, 'findOne', async ({ where }) => ({ id: 1, nama_opd: where.nama_opd })],
      [models.PerangkatDaerahOpdMapping, 'findOne', async () => ({ opd_penanggung_jawab_id: 2 })],
    ],
    async () => {
      const controller = require('../controllers/renjaInovasiBidangUrusanController');
      let called = false;
      const original = models.RenjaInovasiBidangUrusan.findAll;
      models.RenjaInovasiBidangUrusan.findAll = async () => { called = true; return []; };
      try {
        const req = { query: { perangkat_daerah_id: '10' }, user: { role: 'PELAKSANA', opd: 'Dinas Uji A' } };
        const res = fakeRes();
        await controller.rekap(req, res);
        assert.strictEqual(res.statusCode, 403, `harus 403, body=${JSON.stringify(res.body)}`);
        assert.strictEqual(called, false);
      } finally {
        models.RenjaInovasiBidangUrusan.findAll = original;
      }
    }
  );
});

await test('C4 rekap: pdId DIHILANGKAN, caller non-SUPER_ADMIN -> 200, agregat di-scope ke PD caller (Op.in)', async () => {
  delete require.cache[require.resolve('../controllers/renjaInovasiBidangUrusanController')];
  await withStubs(
    [
      [models.OpdPenanggungJawab, 'findOne', async () => ({ id: 1 })],
      [models.PerangkatDaerahOpdMapping, 'findAll', async () => ([{ perangkat_daerah_id: 20 }])],
    ],
    async () => {
      const controller = require('../controllers/renjaInovasiBidangUrusanController');
      let capturedWhere = null;
      const original = models.RenjaInovasiBidangUrusan.findAll;
      models.RenjaInovasiBidangUrusan.findAll = async ({ where }) => {
        capturedWhere = where;
        return [{ bentuk_inovasi: 'DIGITAL', tahun_mulai: '2026' }];
      };
      try {
        const req = { query: { tahun: '2026' }, user: { role: 'PELAKSANA', opd: 'Dinas Uji A' } };
        const res = fakeRes();
        await controller.rekap(req, res);
        assert.strictEqual(res.statusCode, 200, `harus 200, body=${JSON.stringify(res.body)}`);
        const { Op } = models.Sequelize;
        assert.deepStrictEqual(capturedWhere.perangkat_daerah_id[Op.in], [20]);
        assert.strictEqual(res.body?.data?.jumlah_inovasi, 1);
      } finally {
        models.RenjaInovasiBidangUrusan.findAll = original;
      }
    }
  );
});

await test('C4 rekap: pdId DIHILANGKAN, caller SUPER_ADMIN -> 200, tidak dipaksa scope', async () => {
  delete require.cache[require.resolve('../controllers/renjaInovasiBidangUrusanController')];
  const controller = require('../controllers/renjaInovasiBidangUrusanController');
  let capturedWhere = null;
  const original = models.RenjaInovasiBidangUrusan.findAll;
  models.RenjaInovasiBidangUrusan.findAll = async ({ where }) => { capturedWhere = where; return []; };
  try {
    const req = { query: {}, user: { role: 'SUPER_ADMIN', opd: 'Dinas Manapun' } };
    const res = fakeRes();
    await controller.rekap(req, res);
    assert.strictEqual(res.statusCode, 200, `harus 200, body=${JSON.stringify(res.body)}`);
    assert.strictEqual(capturedWhere.perangkat_daerah_id, undefined);
  } finally {
    models.RenjaInovasiBidangUrusan.findAll = original;
  }
});

console.log('=== S21-B: lkAsetTetapController.js — validasi Joi create/update ===');

await test('AsetTetap create: payload valid -> 201, AsetTetap.create dipanggil', async () => {
  delete require.cache[require.resolve('../controllers/lkAsetTetapController')];
  const controller = require('../controllers/lkAsetTetapController');
  let createArgs = null;
  const original = models.AsetTetap.create;
  models.AsetTetap.create = async (payload) => { createArgs = payload; return { id: 1, ...payload }; };
  try {
    const req = { body: { nama_barang: 'Meja Kerja', kategori: 'PERALATAN_MESIN', harga_perolehan: 1000000 } };
    const res = fakeRes();
    await controller.create(req, res);
    assert.strictEqual(res.statusCode, 201, `harus 201, body=${JSON.stringify(res.body)}`);
    assert.strictEqual(createArgs.nama_barang, 'Meja Kerja');
  } finally {
    models.AsetTetap.create = original;
  }
});

await test('AsetTetap create: kategori tidak valid/hilang -> 400, AsetTetap.create TIDAK dipanggil', async () => {
  delete require.cache[require.resolve('../controllers/lkAsetTetapController')];
  const controller = require('../controllers/lkAsetTetapController');
  let called = false;
  const original = models.AsetTetap.create;
  models.AsetTetap.create = async () => { called = true; return {}; };
  try {
    const req = { body: { nama_barang: 'Meja Kerja' } };
    const res = fakeRes();
    await controller.create(req, res);
    assert.strictEqual(res.statusCode, 400, `harus 400, body=${JSON.stringify(res.body)}`);
    assert.strictEqual(called, false);
  } finally {
    models.AsetTetap.create = original;
  }
});

await test('AsetTetap create: field tidak dikenal (unknown field) -> 400, AsetTetap.create TIDAK dipanggil', async () => {
  delete require.cache[require.resolve('../controllers/lkAsetTetapController')];
  const controller = require('../controllers/lkAsetTetapController');
  let called = false;
  const original = models.AsetTetap.create;
  models.AsetTetap.create = async () => { called = true; return {}; };
  try {
    const req = { body: { nama_barang: 'Meja Kerja', kategori: 'PERALATAN_MESIN', field_aneh: 'x' } };
    const res = fakeRes();
    await controller.create(req, res);
    assert.strictEqual(res.statusCode, 400, `harus 400, body=${JSON.stringify(res.body)}`);
    assert.strictEqual(called, false);
  } finally {
    models.AsetTetap.create = original;
  }
});

await test('AsetTetap create: percobaan set akumulasi_penyusutan (field server-controlled) -> 400, ditolak', async () => {
  delete require.cache[require.resolve('../controllers/lkAsetTetapController')];
  const controller = require('../controllers/lkAsetTetapController');
  let called = false;
  const original = models.AsetTetap.create;
  models.AsetTetap.create = async () => { called = true; return {}; };
  try {
    const req = { body: { nama_barang: 'Meja Kerja', kategori: 'PERALATAN_MESIN', akumulasi_penyusutan: 999999 } };
    const res = fakeRes();
    await controller.create(req, res);
    assert.strictEqual(res.statusCode, 400, `harus 400, body=${JSON.stringify(res.body)}`);
    assert.strictEqual(called, false, 'akumulasi_penyusutan tidak boleh diteruskan ke AsetTetap.create');
  } finally {
    models.AsetTetap.create = original;
  }
});

await test('AsetTetap update: payload valid -> 200, row.update dipanggil dengan payload tervalidasi', async () => {
  delete require.cache[require.resolve('../controllers/lkAsetTetapController')];
  const controller = require('../controllers/lkAsetTetapController');
  let updateArgs = null;
  const fakeRow = { id: 1, update: async (payload) => { updateArgs = payload; return fakeRow; } };
  const originalFindByPk = models.AsetTetap.findByPk;
  models.AsetTetap.findByPk = async () => fakeRow;
  try {
    const req = { params: { id: '1' }, body: { nama_barang: 'Kursi Kerja' } };
    const res = fakeRes();
    await controller.update(req, res);
    assert.strictEqual(res.statusCode, 200, `harus 200, body=${JSON.stringify(res.body)}`);
    assert.strictEqual(updateArgs.nama_barang, 'Kursi Kerja');
  } finally {
    models.AsetTetap.findByPk = originalFindByPk;
  }
});

await test('AsetTetap update: kategori tidak valid -> 400, findByPk/row.update TIDAK dipanggil', async () => {
  delete require.cache[require.resolve('../controllers/lkAsetTetapController')];
  const controller = require('../controllers/lkAsetTetapController');
  let findByPkCalled = false;
  const originalFindByPk = models.AsetTetap.findByPk;
  models.AsetTetap.findByPk = async () => { findByPkCalled = true; return null; };
  try {
    const req = { params: { id: '1' }, body: { kategori: 'KATEGORI_TIDAK_ADA' } };
    const res = fakeRes();
    await controller.update(req, res);
    assert.strictEqual(res.statusCode, 400, `harus 400, body=${JSON.stringify(res.body)}`);
    assert.strictEqual(findByPkCalled, false);
  } finally {
    models.AsetTetap.findByPk = originalFindByPk;
  }
});

await test('AsetTetap update: field tidak dikenal -> 400', async () => {
  delete require.cache[require.resolve('../controllers/lkAsetTetapController')];
  const controller = require('../controllers/lkAsetTetapController');
  let findByPkCalled = false;
  const originalFindByPk = models.AsetTetap.findByPk;
  models.AsetTetap.findByPk = async () => { findByPkCalled = true; return null; };
  try {
    const req = { params: { id: '1' }, body: { field_aneh: 'x' } };
    const res = fakeRes();
    await controller.update(req, res);
    assert.strictEqual(res.statusCode, 400, `harus 400, body=${JSON.stringify(res.body)}`);
    assert.strictEqual(findByPkCalled, false);
  } finally {
    models.AsetTetap.findByPk = originalFindByPk;
  }
});

await test('AsetTetap update: percobaan set akumulasi_penyusutan -> 400, ditolak', async () => {
  delete require.cache[require.resolve('../controllers/lkAsetTetapController')];
  const controller = require('../controllers/lkAsetTetapController');
  let findByPkCalled = false;
  const originalFindByPk = models.AsetTetap.findByPk;
  models.AsetTetap.findByPk = async () => { findByPkCalled = true; return null; };
  try {
    const req = { params: { id: '1' }, body: { akumulasi_penyusutan: 12345 } };
    const res = fakeRes();
    await controller.update(req, res);
    assert.strictEqual(res.statusCode, 400, `harus 400, body=${JSON.stringify(res.body)}`);
    assert.strictEqual(findByPkCalled, false, 'akumulasi_penyusutan tidak boleh diteruskan ke row.update');
  } finally {
    models.AsetTetap.findByPk = originalFindByPk;
  }
});

console.log(`\n=== S21 targeted self-test selesai: ${pass} PASS, ${fail} FAIL ===`);
process.exit(fail > 0 ? 1 : 0);

}

runAllTests();
