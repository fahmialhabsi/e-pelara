'use strict';

/**
 * Sprint 20 — Bounded Implementation (mandate ePELARA-MP-S20-BI-FGS-20260822)
 * TARGETED self-test for the 3 newly-added authorization-boundary call
 * sites (Candidates A, C, D). Same DB-independent mocking technique as
 * backend/scripts/opdBoundaryRegressionSelfTest.js (require('../models')
 * once, override specific model methods with in-memory fakes, restore in
 * finally — never a real MySQL connection or mutation). Kept as a separate
 * file rather than appended to the existing giant harness purely because
 * that harness already exceeds this tool's 45s execution cap on its own
 * (see Section 16 note in the final report) — appending here would make it
 * permanently unrunnable in one call. Technique and assertions style
 * otherwise deliberately mirror the existing S3-03/S3-04 sections exactly.
 *
 * Run: node scripts/s20BoundedImplementationTargetedSelfTest.js  (from backend/)
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
    downloadCalled: false,
    downloadArgs: null,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
    download(path, name) { this.downloadCalled = true; this.downloadArgs = [path, name]; return this; },
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

console.log('=== S20-A: dpaController.js — boundary OPD pada getById/exportPdf/exportPdfSebelumPerubahan ===');

await test('getById: caller OPD BEDA dari target DPA -> 403, res.json TIDAK berisi data DPA', async () => {
  delete require.cache[require.resolve('../controllers/dpaController')];
  await withStubs(
    [[models.OpdPenanggungJawab, 'findOne', async ({ where }) => ({ id: 1, nama_opd: where.nama_opd })]],
    async () => {
      const dpaController = require('../controllers/dpaController');
      const originalFindByPk = models.Dpa.findByPk;
      models.Dpa.findByPk = async () => ({ id: 42, opd_id: 2 });
      try {
        const req = { params: { id: '42' }, user: { role: 'ADMINISTRATOR', opd: 'Dinas Uji Coba A' } };
        const res = fakeRes();
        await dpaController.getById(req, res);
        assert.strictEqual(res.statusCode, 403, `harus 403, didapat ${res.statusCode}, body=${JSON.stringify(res.body)}`);
        assert.strictEqual(res.body?.code, 'DPA_OPD_FORBIDDEN');
      } finally {
        models.Dpa.findByPk = originalFindByPk;
      }
    }
  );
});

await test('getById: caller OPD SAMA dengan target DPA -> boundary MENGIZINKAN, data dikembalikan', async () => {
  delete require.cache[require.resolve('../controllers/dpaController')];
  await withStubs(
    [[models.OpdPenanggungJawab, 'findOne', async ({ where }) => ({ id: 1, nama_opd: where.nama_opd })]],
    async () => {
      const dpaController = require('../controllers/dpaController');
      const originalFindByPk = models.Dpa.findByPk;
      models.Dpa.findByPk = async () => ({ id: 42, opd_id: 1 });
      try {
        const req = { params: { id: '42' }, user: { role: 'ADMINISTRATOR', opd: 'Dinas Uji Coba A' } };
        const res = fakeRes();
        await dpaController.getById(req, res);
        assert.notStrictEqual(res.statusCode, 403, `tidak boleh 403, didapat ${res.statusCode}, body=${JSON.stringify(res.body)}`);
        assert.strictEqual(res.body?.id, 42);
      } finally {
        models.Dpa.findByPk = originalFindByPk;
      }
    }
  );
});

await test('getById: SUPER_ADMIN dikecualikan dari boundary OPD', async () => {
  delete require.cache[require.resolve('../controllers/dpaController')];
  const dpaController = require('../controllers/dpaController');
  const originalFindByPk = models.Dpa.findByPk;
  models.Dpa.findByPk = async () => ({ id: 42, opd_id: 2 });
  try {
    const req = { params: { id: '42' }, user: { role: 'SUPER_ADMIN', opd: 'Dinas Manapun' } };
    const res = fakeRes();
    await dpaController.getById(req, res);
    assert.notStrictEqual(res.statusCode, 403);
    assert.strictEqual(res.body?.id, 42);
  } finally {
    models.Dpa.findByPk = originalFindByPk;
  }
});

await test('getById: DPA tidak ditemukan -> 404 (not-found semantics preserved, tidak berubah jadi 403)', async () => {
  delete require.cache[require.resolve('../controllers/dpaController')];
  const dpaController = require('../controllers/dpaController');
  const originalFindByPk = models.Dpa.findByPk;
  models.Dpa.findByPk = async () => null;
  try {
    const req = { params: { id: '999' }, user: { role: 'ADMINISTRATOR', opd: 'Dinas Uji Coba A' } };
    const res = fakeRes();
    await dpaController.getById(req, res);
    assert.strictEqual(res.statusCode, 404);
  } finally {
    models.Dpa.findByPk = originalFindByPk;
  }
});

await test('exportPdf: caller OPD BEDA dari target DPA -> 403 SEBELUM Rka.findByPk (protected data) dipanggil', async () => {
  delete require.cache[require.resolve('../controllers/dpaController')];
  await withStubs(
    [[models.OpdPenanggungJawab, 'findOne', async ({ where }) => ({ id: 1, nama_opd: where.nama_opd })]],
    async () => {
      const dpaController = require('../controllers/dpaController');
      let rkaCalled = false;
      const originalDpaFindByPk = models.Dpa.findByPk;
      const originalRkaFindByPk = models.Rka.findByPk;
      models.Dpa.findByPk = async () => ({ id: 42, opd_id: 2, rka_id: 7 });
      models.Rka.findByPk = async () => { rkaCalled = true; return { id: 7 }; };
      try {
        const req = { params: { id: '42' }, user: { role: 'ADMINISTRATOR', opd: 'Dinas Uji Coba A' } };
        const res = fakeRes();
        await dpaController.exportPdf(req, res);
        assert.strictEqual(res.statusCode, 403, `harus 403, didapat ${res.statusCode}, body=${JSON.stringify(res.body)}`);
        assert.strictEqual(res.body?.code, 'DPA_OPD_FORBIDDEN');
        assert.strictEqual(rkaCalled, false, 'Rka.findByPk (protected data) TIDAK BOLEH dipanggil ketika boundary OPD menolak');
      } finally {
        models.Dpa.findByPk = originalDpaFindByPk;
        models.Rka.findByPk = originalRkaFindByPk;
      }
    }
  );
});

await test('exportPdfSebelumPerubahan: caller OPD BEDA dari target DPA -> 403 SEBELUM Rka.findByPk dipanggil', async () => {
  delete require.cache[require.resolve('../controllers/dpaController')];
  await withStubs(
    [[models.OpdPenanggungJawab, 'findOne', async ({ where }) => ({ id: 1, nama_opd: where.nama_opd })]],
    async () => {
      const dpaController = require('../controllers/dpaController');
      let rkaCalled = false;
      const originalDpaFindByPk = models.Dpa.findByPk;
      const originalRkaFindByPk = models.Rka.findByPk;
      models.Dpa.findByPk = async () => ({ id: 42, opd_id: 2, rka_id: 7 });
      models.Rka.findByPk = async () => { rkaCalled = true; return { id: 7 }; };
      try {
        const req = { params: { id: '42' }, user: { role: 'ADMINISTRATOR', opd: 'Dinas Uji Coba A' } };
        const res = fakeRes();
        await dpaController.exportPdfSebelumPerubahan(req, res);
        assert.strictEqual(res.statusCode, 403);
        assert.strictEqual(res.body?.code, 'DPA_OPD_FORBIDDEN');
        assert.strictEqual(rkaCalled, false);
      } finally {
        models.Dpa.findByPk = originalDpaFindByPk;
        models.Rka.findByPk = originalRkaFindByPk;
      }
    }
  );
});

await test('exportPdf: SUPER_ADMIN dikecualikan, boundary tidak memblokir (lolos ke Rka.findByPk)', async () => {
  delete require.cache[require.resolve('../controllers/dpaController')];
  const dpaController = require('../controllers/dpaController');
  let rkaCalled = false;
  const originalDpaFindByPk = models.Dpa.findByPk;
  const originalRkaFindByPk = models.Rka.findByPk;
  models.Dpa.findByPk = async () => ({ id: 42, opd_id: 2, rka_id: 7 });
  models.Rka.findByPk = async () => { rkaCalled = true; throw new Error('stop-after-boundary: expected, proves boundary passed'); };
  try {
    const req = { params: { id: '42' }, user: { role: 'SUPER_ADMIN', opd: 'Dinas Manapun' } };
    const res = fakeRes();
    await dpaController.exportPdf(req, res).catch(() => {});
    assert.strictEqual(rkaCalled, true, 'Rka.findByPk harus tercapai untuk SUPER_ADMIN (boundary tidak memblokir)');
    assert.notStrictEqual(res.body?.code, 'DPA_OPD_FORBIDDEN');
  } finally {
    models.Dpa.findByPk = originalDpaFindByPk;
    models.Rka.findByPk = originalRkaFindByPk;
  }
});

console.log('\n=== S20-C: dokumenController.js — boundary kepemilikan pada download() ===');

await test('download: bukan uploader dan bukan admin -> 403, res.download TIDAK dipanggil', async () => {
  delete require.cache[require.resolve('../controllers/dokumenController')];
  const dokumenController = require('../controllers/dokumenController');
  const { DokumenPendukung } = require('../models');
  const originalFindByPk = DokumenPendukung.findByPk;
  DokumenPendukung.findByPk = async () => ({ id: 9, uploaded_by: 100, filepath: 'dokumen/misi/x.pdf', original_name: 'x.pdf' });
  try {
    const req = { params: { id: '9' }, user: { id: 200, role: 'PELAKSANA' } };
    const res = fakeRes();
    await dokumenController.download(req, res);
    assert.strictEqual(res.statusCode, 403, `harus 403, didapat ${res.statusCode}, body=${JSON.stringify(res.body)}`);
    assert.strictEqual(res.downloadCalled, false, 'res.download() TIDAK BOLEH dipanggil ketika bukan pemilik/admin');
  } finally {
    DokumenPendukung.findByPk = originalFindByPk;
  }
});

await test('download: uploader sendiri -> boundary MENGIZINKAN (tidak diblokir 403)', async () => {
  delete require.cache[require.resolve('../controllers/dokumenController')];
  const dokumenController = require('../controllers/dokumenController');
  const { DokumenPendukung } = require('../models');
  const originalFindByPk = DokumenPendukung.findByPk;
  DokumenPendukung.findByPk = async () => ({ id: 9, uploaded_by: 200, filepath: 'dokumen/misi/x.pdf', original_name: 'x.pdf' });
  try {
    const req = { params: { id: '9' }, user: { id: 200, role: 'PELAKSANA' } };
    const res = fakeRes();
    await dokumenController.download(req, res);
    assert.notStrictEqual(res.statusCode, 403, `tidak boleh 403, didapat ${res.statusCode}, body=${JSON.stringify(res.body)}`);
  } finally {
    DokumenPendukung.findByPk = originalFindByPk;
  }
});

await test('download: SUPER_ADMIN dikecualikan dari boundary kepemilikan', async () => {
  delete require.cache[require.resolve('../controllers/dokumenController')];
  const dokumenController = require('../controllers/dokumenController');
  const { DokumenPendukung } = require('../models');
  const originalFindByPk = DokumenPendukung.findByPk;
  DokumenPendukung.findByPk = async () => ({ id: 9, uploaded_by: 100, filepath: 'dokumen/misi/x.pdf', original_name: 'x.pdf' });
  try {
    const req = { params: { id: '9' }, user: { id: 999, role: 'SUPER_ADMIN' } };
    const res = fakeRes();
    await dokumenController.download(req, res);
    assert.notStrictEqual(res.statusCode, 403);
  } finally {
    DokumenPendukung.findByPk = originalFindByPk;
  }
});

await test('download: ADMINISTRATOR dikecualikan dari boundary kepemilikan', async () => {
  delete require.cache[require.resolve('../controllers/dokumenController')];
  const dokumenController = require('../controllers/dokumenController');
  const { DokumenPendukung } = require('../models');
  const originalFindByPk = DokumenPendukung.findByPk;
  DokumenPendukung.findByPk = async () => ({ id: 9, uploaded_by: 100, filepath: 'dokumen/misi/x.pdf', original_name: 'x.pdf' });
  try {
    const req = { params: { id: '9' }, user: { id: 998, role: 'ADMINISTRATOR' } };
    const res = fakeRes();
    await dokumenController.download(req, res);
    assert.notStrictEqual(res.statusCode, 403);
  } finally {
    DokumenPendukung.findByPk = originalFindByPk;
  }
});

await test('download: dokumen tidak ditemukan -> 404 (not-found semantics preserved)', async () => {
  delete require.cache[require.resolve('../controllers/dokumenController')];
  const dokumenController = require('../controllers/dokumenController');
  const { DokumenPendukung } = require('../models');
  const originalFindByPk = DokumenPendukung.findByPk;
  DokumenPendukung.findByPk = async () => null;
  try {
    const req = { params: { id: '999' }, user: { id: 200, role: 'PELAKSANA' } };
    const res = fakeRes();
    await dokumenController.download(req, res);
    assert.strictEqual(res.statusCode, 404);
  } finally {
    DokumenPendukung.findByPk = originalFindByPk;
  }
});

console.log('\n=== S20-D: approvalController.js — boundary OPD pada submit() ===');

await test('submit: caller OPD BEDA dari target (entity_type=dpa) -> 403, ApprovalLog.create TIDAK dipanggil', async () => {
  delete require.cache[require.resolve('../controllers/approvalController')];
  await withStubs(
    [[models.OpdPenanggungJawab, 'findOne', async ({ where }) => ({ id: 1, nama_opd: where.nama_opd })]],
    async () => {
      const approvalController = require('../controllers/approvalController');
      const { ApprovalLog, sequelize } = models;
      let logCreateCalled = false;
      const originalCreate = ApprovalLog.create;
      const originalQuery = sequelize.query;
      ApprovalLog.create = async () => { logCreateCalled = true; return {}; };
      sequelize.query = async () => [[{ opd_id: 2 }]];
      try {
        const req = {
          body: { entity_type: 'dpa', entity_id: 42, catatan: 'uji' },
          user: { id: 5, role: 'PELAKSANA', opd: 'Dinas Uji Coba A' },
          app: { get: () => ({}) },
        };
        const res = fakeRes();
        await approvalController.submit(req, res);
        assert.strictEqual(res.statusCode, 403, `harus 403, didapat ${res.statusCode}, body=${JSON.stringify(res.body)}`);
        assert.strictEqual(res.body?.code, 'APPROVAL_OPD_FORBIDDEN');
        assert.strictEqual(logCreateCalled, false, 'ApprovalLog.create() TIDAK BOLEH dipanggil ketika boundary OPD menolak submit');
      } finally {
        ApprovalLog.create = originalCreate;
        sequelize.query = originalQuery;
      }
    }
  );
});

await test('submit: SUPER_ADMIN dikecualikan dari boundary OPD pada submit', async () => {
  delete require.cache[require.resolve('../controllers/approvalController')];
  const approvalController = require('../controllers/approvalController');
  const { sequelize } = models;
  const originalQuery = sequelize.query;
  sequelize.query = async (sql) => {
    if (/SELECT opd_id/.test(sql)) return [[{ opd_id: 2 }]];
    return [[]];
  };
  try {
    const req = {
      body: { entity_type: 'dpa', entity_id: 42, catatan: 'uji' },
      user: { id: 5, role: 'SUPER_ADMIN', opd: 'Dinas Manapun' },
      app: { get: () => ({}) },
    };
    const res = fakeRes();
    await approvalController.submit(req, res);
    assert.notStrictEqual(res.body?.code, 'APPROVAL_OPD_FORBIDDEN', `SUPER_ADMIN tidak boleh diblokir, body=${JSON.stringify(res.body)}`);
  } finally {
    sequelize.query = originalQuery;
  }
});

await test('submit: entity_type NOT_APPLICABLE (lakip, tanpa kolom opd_id) -> boundary TIDAK memblokir, perilaku submit existing tidak berubah', async () => {
  delete require.cache[require.resolve('../controllers/approvalController')];
  const approvalController = require('../controllers/approvalController');
  const { sequelize } = models;
  const originalQuery = sequelize.query;
  sequelize.query = async () => [[]];
  try {
    const req = {
      body: { entity_type: 'lakip', entity_id: 7, catatan: 'uji' },
      user: { id: 5, role: 'PELAKSANA', opd: 'Dinas Uji Coba A' },
      app: { get: () => ({}) },
    };
    const res = fakeRes();
    await approvalController.submit(req, res);
    assert.notStrictEqual(res.body?.code, 'APPROVAL_OPD_FORBIDDEN', `entity_type lakip harus NOT_APPLICABLE, body=${JSON.stringify(res.body)}`);
  } finally {
    sequelize.query = originalQuery;
  }
});

await test('submit: caller OPD SAMA dengan target (entity_type=dpa) -> boundary MENGIZINKAN', async () => {
  delete require.cache[require.resolve('../controllers/approvalController')];
  await withStubs(
    [[models.OpdPenanggungJawab, 'findOne', async ({ where }) => ({ id: 1, nama_opd: where.nama_opd })]],
    async () => {
      const approvalController = require('../controllers/approvalController');
      const { sequelize } = models;
      const originalQuery = sequelize.query;
      sequelize.query = async (sql) => {
        if (/SELECT opd_id/.test(sql)) return [[{ opd_id: 1 }]];
        return [[]];
      };
      try {
        const req = {
          body: { entity_type: 'dpa', entity_id: 42, catatan: 'uji' },
          user: { id: 5, role: 'PELAKSANA', opd: 'Dinas Uji Coba A' },
          app: { get: () => ({}) },
        };
        const res = fakeRes();
        await approvalController.submit(req, res);
        assert.notStrictEqual(res.body?.code, 'APPROVAL_OPD_FORBIDDEN', `harus lolos boundary, body=${JSON.stringify(res.body)}`);
      } finally {
        sequelize.query = originalQuery;
      }
    }
  );
});

console.log(`\n=== S20 targeted self-test selesai: ${pass} PASS, ${fail} FAIL ===`);
process.exit(fail > 0 ? 1 : 0);

}

runAllTests();
