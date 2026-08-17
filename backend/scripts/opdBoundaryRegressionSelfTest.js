'use strict';

/**
 * Self-test UNIT (tanpa koneksi MySQL nyata, tanpa mutasi DB apa pun) untuk
 * regresi Sprint 3 OPD/Resource Boundary Hardening:
 *
 *   S3-03 — approve/reject/revise (controllers/approvalController.js)
 *           sebelumnya beroperasi murni lewat {entity_type, entity_id}
 *           tanpa constraint tenant/OPD apa pun.
 *   S3-04 — update/delete Renja (controllers/renjaController.js) dan
 *           update/destroy DPA (controllers/dpaController.js) sebelumnya
 *           findByPk(id) tanpa constraint opd_id.
 *   S3-06 — guardApproved (middlewares/guardApproved.js) sebelumnya
 *           fail-open saat error internal saat evaluasi guard.
 *
 * Strategi DB-independent: `require('../models')` SEKALI di awal file
 * (singleton module Node), lalu method yang dipanggil controller
 * (OpdPenanggungJawab.findOne, sequelize.query/db.query, Model.findByPk)
 * di-override sementara dengan fake function yang mengembalikan data
 * SINTETIS in-memory — TIDAK PERNAH membuka koneksi MySQL sungguhan.
 * Override dikembalikan ke aslinya (atau dibiarkan sebagai stub konsisten
 * antar-test dalam file yang sama) di akhir tiap test lewat try/finally.
 * Ini murni unit test perilaku fungsi, konsisten dengan larangan Sprint 3
 * §19 "Do not run security integration tests that mutate this database" —
 * tidak ada mutasi/koneksi DB nyata di file ini sama sekali.
 *
 * Jalankan: node scripts/opdBoundaryRegressionSelfTest.js
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
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
  return res;
}

const models = require('../models');

/**
 * Mengganti sementara sebuah method pada objek (mis. models.OpdPenanggungJawab.findOne)
 * dengan fake, menjalankan fn(), lalu selalu mengembalikan method asli —
 * bahkan jika fn() melempar.
 */
async function withStub(obj, methodName, fakeImpl, fn) {
  const original = obj[methodName];
  obj[methodName] = fakeImpl;
  try {
    return await fn();
  } finally {
    obj[methodName] = original;
  }
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

async function runAllTests() {

console.log('=== S3-03: approvalController.js — boundary OPD pada approve/reject/revise ===');

await test('entity_type dengan kolom opd_id (dpa) — caller OPD BEDA dari target -> DITOLAK, mutation TIDAK jalan', async () => {
  delete require.cache[require.resolve('../controllers/approvalController')];

  await withStubs(
    [
      [models.OpdPenanggungJawab, 'findOne', async ({ where }) => ({ id: 1, nama_opd: where.nama_opd })],
      [models.sequelize, 'query', async (sql) => {
        if (/SELECT opd_id FROM `dpa`/.test(sql)) return [[{ opd_id: 2 }]]; // target milik OPD id=2
        throw new Error(`Unexpected query in test: ${sql}`);
      }],
    ],
    async () => {
      const approvalController = require('../controllers/approvalController');
      let approvalLogCreateCalled = false;
      const originalCreate = models.ApprovalLog.create;
      models.ApprovalLog.create = async (...args) => {
        approvalLogCreateCalled = true;
        return originalCreate.apply(models.ApprovalLog, args);
      };
      try {
        const req = {
          body: { entity_type: 'dpa', entity_id: 42, catatan: 'test' },
          user: { role: 'ADMINISTRATOR', opd: 'Dinas Uji Coba A' }, // resolves to opd_id=1 via stub
        };
        const res = fakeRes();
        await approvalController.approve(req, res);

        assert.strictEqual(res.statusCode, 403, `harus 403, didapat ${res.statusCode}, body=${JSON.stringify(res.body)}`);
        assert.strictEqual(res.body?.code, 'APPROVAL_OPD_FORBIDDEN');
        assert.strictEqual(
          approvalLogCreateCalled,
          false,
          'ApprovalLog.create TIDAK BOLEH dipanggil ketika boundary OPD menolak — mutation harus benar-benar tidak jalan, bukan hanya respons ditolak setelah efek samping terjadi'
        );
      } finally {
        models.ApprovalLog.create = originalCreate;
      }
    }
  );
});

await test('entity_type dengan kolom opd_id (dpa) — caller OPD SAMA dengan target -> proses lanjut (tidak diblokir boundary)', async () => {
  delete require.cache[require.resolve('../controllers/approvalController')];

  await withStubs(
    [
      [models.OpdPenanggungJawab, 'findOne', async ({ where }) => ({ id: 1, nama_opd: where.nama_opd })],
      [models.sequelize, 'query', async (sql) => {
        if (/SELECT opd_id FROM `dpa`/.test(sql)) return [[{ opd_id: 1 }]]; // target JUGA milik OPD id=1
        throw new Error(`Unexpected query in test: ${sql}`);
      }],
    ],
    async () => {
      const approvalController = require('../controllers/approvalController');
      const req = {
        body: { entity_type: 'dpa', entity_id: 42, catatan: 'test' },
        user: { role: 'ADMINISTRATOR', opd: 'Dinas Uji Coba A' },
      };
      const res = fakeRes();
      await approvalController.approve(req, res);

      // Boundary lolos -> lanjut ke ApprovalLog.findOne (getCurrentStatus)
      // yang akan gagal karena tidak ada DB nyata, tapi INI MEMBUKTIKAN
      // boundary check bukan yang memblokir (403 APPROVAL_OPD_FORBIDDEN
      // tidak boleh muncul). Kegagalan lanjutan (500, karena getCurrentStatus
      // butuh DB) adalah perilaku expected & terpisah dari boundary itu sendiri.
      assert.notStrictEqual(
        res.body?.code,
        'APPROVAL_OPD_FORBIDDEN',
        'boundary TIDAK BOLEH menolak ketika caller dan target berada di OPD yang sama'
      );
    }
  );
});

await test('SUPER_ADMIN dikecualikan dari boundary OPD (otoritas tenant-wide, server-derived)', async () => {
  delete require.cache[require.resolve('../controllers/approvalController')];

  let opdLookupCalled = false;
  await withStubs(
    [
      [models.OpdPenanggungJawab, 'findOne', async () => {
        opdLookupCalled = true;
        return null;
      }],
      [models.sequelize, 'query', async (sql) => {
        if (/SELECT opd_id FROM `dpa`/.test(sql)) return [[{ opd_id: 2 }]];
        throw new Error(`Unexpected query in test: ${sql}`);
      }],
    ],
    async () => {
      const approvalController = require('../controllers/approvalController');
      const req = {
        body: { entity_type: 'dpa', entity_id: 42, catatan: 'test' },
        user: { role: 'SUPER_ADMIN', opd: 'Dinas Manapun' },
      };
      const res = fakeRes();
      await approvalController.approve(req, res);

      assert.notStrictEqual(res.body?.code, 'APPROVAL_OPD_FORBIDDEN', 'SUPER_ADMIN tidak boleh diblokir boundary OPD');
    }
  );
});

await test('entity_type TANPA kolom opd_id (rpjmd) -> NOT_APPLICABLE, boundary tidak melakukan query opd_id sama sekali', async () => {
  delete require.cache[require.resolve('../controllers/approvalController')];

  let opdIdQueryAttempted = false;
  await withStubs(
    [
      [models.sequelize, 'query', async (sql) => {
        if (/opd_id/.test(sql)) opdIdQueryAttempted = true;
        throw new Error('getCurrentStatus tidak tersedia di unit test ini — cukup untuk membuktikan boundary tidak query opd_id');
      }],
    ],
    async () => {
      const approvalController = require('../controllers/approvalController');
      const req = {
        body: { entity_type: 'rpjmd', entity_id: 1, catatan: 'test' },
        user: { role: 'ADMINISTRATOR', opd: 'Dinas Uji Coba A' },
      };
      const res = fakeRes();
      await approvalController.approve(req, res);

      assert.strictEqual(
        opdIdQueryAttempted,
        false,
        'rpjmd tidak punya kolom opd_id — boundary tidak boleh mencoba query opd_id untuk entity_type ini'
      );
    }
  );
});

console.log('\n=== S3-04: renjaController.js — boundary OPD pada update/delete Renja ===');

await test('caller OPD BEDA dari target Renja -> DITOLAK 403, row.update TIDAK dipanggil', async () => {
  delete require.cache[require.resolve('../controllers/renjaController')];

  await withStubs(
    [[models.OpdPenanggungJawab, 'findOne', async ({ where }) => ({ id: 1, nama_opd: where.nama_opd })]],
    async () => {
      const renjaController = require('../controllers/renjaController');

      let updateCalled = false;
      const fakeRow = {
        id: 42,
        opd_id: 2, // target milik OPD id=2
        version: 1,
        update: async () => {
          updateCalled = true;
        },
      };
      const originalFindByPk = models.Renja.findByPk;
      models.Renja.findByPk = async () => fakeRow;

      try {
        const req = {
          params: { id: '42' },
          body: {},
          user: { role: 'ADMINISTRATOR', opd: 'Dinas Uji Coba A' }, // resolves opd_id=1
        };
        const res = fakeRes();
        await renjaController.updateRenja(req, res);

        assert.strictEqual(res.statusCode, 403, `harus 403, didapat ${res.statusCode}, body=${JSON.stringify(res.body)}`);
        assert.strictEqual(res.body?.code, 'RENJA_OPD_FORBIDDEN');
        assert.strictEqual(updateCalled, false, 'row.update() TIDAK BOLEH dipanggil ketika boundary OPD menolak');
      } finally {
        models.Renja.findByPk = originalFindByPk;
      }
    }
  );
});

await test('caller OPD BEDA dari target Renja -> delete DITOLAK 403, row.destroy TIDAK dipanggil (via deleteRenja export)', async () => {
  delete require.cache[require.resolve('../controllers/renjaController')];

  await withStubs(
    [[models.OpdPenanggungJawab, 'findOne', async ({ where }) => ({ id: 1, nama_opd: where.nama_opd })]],
    async () => {
      const renjaController = require('../controllers/renjaController');

      let destroyCalled = false;
      const fakeRow = {
        id: 42,
        opd_id: 2,
        version: 1,
        destroy: async () => {
          destroyCalled = true;
        },
      };
      const originalFindByPk = models.Renja.findByPk;
      models.Renja.findByPk = async () => fakeRow;

      try {
        const req = {
          params: { id: '42' },
          body: {},
          user: { role: 'ADMINISTRATOR', opd: 'Dinas Uji Coba A' },
        };
        const res = fakeRes();
        await renjaController.deleteRenja(req, res);

        assert.strictEqual(res.statusCode, 403);
        assert.strictEqual(res.body?.code, 'RENJA_OPD_FORBIDDEN');
        assert.strictEqual(destroyCalled, false, 'row.destroy() TIDAK BOLEH dipanggil ketika boundary OPD menolak');
      } finally {
        models.Renja.findByPk = originalFindByPk;
      }
    }
  );
});

await test('caller OPD SAMA dengan target Renja -> tidak diblokir boundary (lolos ke logika update lanjutan)', async () => {
  delete require.cache[require.resolve('../controllers/renjaController')];

  await withStubs(
    [[models.OpdPenanggungJawab, 'findOne', async ({ where }) => ({ id: 1, nama_opd: where.nama_opd })]],
    async () => {
      const renjaController = require('../controllers/renjaController');

      const fakeRow = { id: 42, opd_id: 1, version: 1 }; // OPD SAMA
      const originalFindByPk = models.Renja.findByPk;
      models.Renja.findByPk = async () => fakeRow;

      try {
        const req = {
          params: { id: '42' },
          body: {},
          user: { role: 'ADMINISTRATOR', opd: 'Dinas Uji Coba A' },
        };
        const res = fakeRes();
        await renjaController.updateRenja(req, res);

        assert.notStrictEqual(
          res.body?.code,
          'RENJA_OPD_FORBIDDEN',
          'boundary TIDAK BOLEH menolak ketika caller dan target berada di OPD yang sama'
        );
      } finally {
        models.Renja.findByPk = originalFindByPk;
      }
    }
  );
});

console.log('\n=== S3-04: dpaController.js — boundary OPD pada update/destroy DPA ===');

await test('caller OPD BEDA dari target DPA -> update DITOLAK 403, Dpa.update TIDAK dipanggil', async () => {
  delete require.cache[require.resolve('../controllers/dpaController')];

  await withStubs(
    [[models.OpdPenanggungJawab, 'findOne', async ({ where }) => ({ id: 1, nama_opd: where.nama_opd })]],
    async () => {
      const dpaController = require('../controllers/dpaController');

      let updateCalled = false;
      const originalFindByPk = models.Dpa.findByPk;
      const originalUpdate = models.Dpa.update;
      models.Dpa.findByPk = async () => ({ id: 42, opd_id: 2, version: 1 });
      models.Dpa.update = async () => {
        updateCalled = true;
      };

      try {
        const req = {
          params: { id: '42' },
          // Body harus punya minimal 1 field valid agar lolos dpaUpdateSchema.validate()
          // (Joi schema mensyaratkan >=1 key) SEBELUM boundary check dievaluasi —
          // body kosong akan gagal di validasi Joi (400) lebih dulu, bukan
          // membuktikan apa pun tentang boundary OPD itu sendiri.
          body: { program: 'Program Uji Coba' },
          user: { role: 'ADMINISTRATOR', opd: 'Dinas Uji Coba A' },
        };
        const res = fakeRes();
        await dpaController.update(req, res);

        assert.strictEqual(res.statusCode, 403, `harus 403, didapat ${res.statusCode}, body=${JSON.stringify(res.body)}`);
        assert.strictEqual(res.body?.code, 'DPA_OPD_FORBIDDEN');
        assert.strictEqual(updateCalled, false, 'Dpa.update() TIDAK BOLEH dipanggil ketika boundary OPD menolak');
      } finally {
        models.Dpa.findByPk = originalFindByPk;
        models.Dpa.update = originalUpdate;
      }
    }
  );
});

await test('caller OPD BEDA dari target DPA -> destroy DITOLAK 403, Dpa.destroy TIDAK dipanggil', async () => {
  delete require.cache[require.resolve('../controllers/dpaController')];

  await withStubs(
    [[models.OpdPenanggungJawab, 'findOne', async ({ where }) => ({ id: 1, nama_opd: where.nama_opd })]],
    async () => {
      const dpaController = require('../controllers/dpaController');

      let destroyCalled = false;
      const originalFindByPk = models.Dpa.findByPk;
      const originalDestroy = models.Dpa.destroy;
      models.Dpa.findByPk = async () => ({ id: 42, opd_id: 2, version: 1 });
      models.Dpa.destroy = async () => {
        destroyCalled = true;
      };

      try {
        const req = {
          params: { id: '42' },
          body: {},
          user: { role: 'ADMINISTRATOR', opd: 'Dinas Uji Coba A' },
        };
        const res = fakeRes();
        await dpaController.destroy(req, res);

        assert.strictEqual(res.statusCode, 403);
        assert.strictEqual(res.body?.code, 'DPA_OPD_FORBIDDEN');
        assert.strictEqual(destroyCalled, false, 'Dpa.destroy() TIDAK BOLEH dipanggil ketika boundary OPD menolak');
      } finally {
        models.Dpa.findByPk = originalFindByPk;
        models.Dpa.destroy = originalDestroy;
      }
    }
  );
});

await test('SUPER_ADMIN dikecualikan dari boundary OPD DPA (otoritas tenant-wide, server-derived)', async () => {
  delete require.cache[require.resolve('../controllers/dpaController')];

  const dpaController = require('../controllers/dpaController');
  const originalFindByPk = models.Dpa.findByPk;
  models.Dpa.findByPk = async () => ({ id: 42, opd_id: 2, version: 1 });

  try {
    const req = {
      params: { id: '42' },
      // Body valid (bukan kosong) supaya lolos Joi validate() lebih dulu —
      // sehingga assertion di bawah benar-benar membuktikan boundary check
      // (bukan kebetulan lolos karena res.body tidak punya field .code sama sekali).
      body: { program: 'Program Uji Coba' },
      user: { role: 'SUPER_ADMIN', opd: 'Dinas Manapun' },
    };
    const res = fakeRes();
    await dpaController.update(req, res);

    assert.notStrictEqual(res.statusCode, 403, `SUPER_ADMIN tidak boleh diblokir boundary OPD DPA, didapat ${res.statusCode}, body=${JSON.stringify(res.body)}`);
    assert.notStrictEqual(res.body?.code, 'DPA_OPD_FORBIDDEN', 'SUPER_ADMIN tidak boleh diblokir boundary OPD DPA');
  } finally {
    models.Dpa.findByPk = originalFindByPk;
  }
});

await test('caller OPD SAMA dengan target DPA (non-SUPER_ADMIN) -> boundary MENGIZINKAN, tidak diblokir 403 (positive authorization, bukan lewat SUPER_ADMIN bypass)', async () => {
  delete require.cache[require.resolve('../controllers/dpaController')];

  await withStubs(
    [[models.OpdPenanggungJawab, 'findOne', async ({ where }) => ({ id: 1, nama_opd: where.nama_opd })]],
    async () => {
      const dpaController = require('../controllers/dpaController');

      // Caller ADMINISTRATOR (BUKAN SUPER_ADMIN) di OPD id=1, target DPA JUGA opd_id=1.
      // Ini membuktikan jalur otorisasi POSITIF yang sebenarnya (resolveCallerOpdId
      // -> match -> lolos), bukan jalur exemption SUPER_ADMIN yang sudah diuji terpisah.
      const originalFindByPk = models.Dpa.findByPk;
      models.Dpa.findByPk = async () => ({ id: 42, opd_id: 1, version: 1 });

      try {
        const req = {
          params: { id: '42' },
          body: { program: 'Program Uji Coba' },
          user: { role: 'ADMINISTRATOR', opd: 'Dinas Uji Coba A' }, // resolves opd_id=1 via stub
        };
        const res = fakeRes();
        await dpaController.update(req, res);

        assert.notStrictEqual(
          res.statusCode,
          403,
          `boundary TIDAK BOLEH menolak ketika caller (non-SUPER_ADMIN) dan target DPA berada di OPD yang sama, didapat ${res.statusCode}, body=${JSON.stringify(res.body)}`
        );
        assert.notStrictEqual(
          res.body?.code,
          'DPA_OPD_FORBIDDEN',
          'boundary TIDAK BOLEH menolak same-OPD non-SUPER_ADMIN caller'
        );
      } finally {
        models.Dpa.findByPk = originalFindByPk;
      }
    }
  );
});

console.log('\n=== S3-06: guardApproved.js — fail-closed pada error internal ===');

await test('error internal saat evaluasi guard -> mutation chain TIDAK lanjut (next() tidak dipanggil), respons 503', async () => {
  delete require.cache[require.resolve('../middlewares/guardApproved')];

  await withStubs(
    [
      [models.sequelize, 'query', async () => {
        throw new Error('Simulated transient DB error saat evaluasi guard');
      }],
    ],
    async () => {
      const guardApproved = require('../middlewares/guardApproved');
      const guard = guardApproved('dpa');

      const req = { params: { id: '42' }, user: { role: 'ADMINISTRATOR' }, headers: {} };
      const res = fakeRes();
      let nextCalled = false;
      const next = () => {
        nextCalled = true;
      };

      await guard(req, res, next);

      assert.strictEqual(
        nextCalled,
        false,
        'next() TIDAK BOLEH dipanggil ketika guard sendiri gagal mengevaluasi status approval (harus fail-closed, bukan fail-open)'
      );
      assert.strictEqual(res.statusCode, 503, `harus 503, didapat ${res.statusCode}, body=${JSON.stringify(res.body)}`);
      assert.strictEqual(res.body?.code, 'APPROVAL_GUARD_UNAVAILABLE');
    }
  );
});

await test('admin dengan X-Approval-Override tetap bisa bypass walau guard akan error (bypass terjadi SEBELUM query, perilaku existing tidak berubah)', async () => {
  delete require.cache[require.resolve('../middlewares/guardApproved')];

  await withStubs(
    [
      [models.sequelize, 'query', async () => {
        throw new Error('Guard TIDAK BOLEH sampai memanggil query sama sekali untuk kasus override');
      }],
    ],
    async () => {
      const guardApproved = require('../middlewares/guardApproved');
      const guard = guardApproved('dpa');

      const req = {
        params: { id: '42' },
        user: { role: 'SUPER_ADMIN' },
        headers: { 'x-approval-override': 'true' },
      };
      const res = fakeRes();
      let nextCalled = false;
      const next = () => {
        nextCalled = true;
      };

      await guard(req, res, next);

      assert.strictEqual(nextCalled, true, 'admin override header harus tetap lolos tanpa pernah mencoba query');
    }
  );
});

await test('operasi normal (bukan error) pada dokumen APPROVED tetap ditolak 403 seperti sebelumnya (perilaku non-error tidak berubah)', async () => {
  delete require.cache[require.resolve('../middlewares/guardApproved')];

  await withStubs(
    [
      [models.sequelize, 'query', async (sql) => {
        if (/SELECT approval_status FROM `dpa`/.test(sql)) return [[{ approval_status: 'APPROVED' }]];
        throw new Error(`Unexpected query: ${sql}`);
      }],
    ],
    async () => {
      const guardApproved = require('../middlewares/guardApproved');
      const guard = guardApproved('dpa');

      const req = { params: { id: '42' }, user: { role: 'PELAKSANA' }, headers: {} };
      const res = fakeRes();
      let nextCalled = false;
      const next = () => {
        nextCalled = true;
      };

      await guard(req, res, next);

      assert.strictEqual(nextCalled, false);
      assert.strictEqual(res.statusCode, 403);
      assert.strictEqual(res.body?.code, 'DOCUMENT_APPROVED');
    }
  );
});


console.log('\n=== S4-01/S4-DISC-001: renstra_tabelTujuanController.update — boundary OPD ===');

await test('update RenstraTabelTujuan — caller OPD BEDA dari target -> DITOLAK 403, RenstraTabelTujuan.update TIDAK dipanggil', async () => {
  delete require.cache[require.resolve('../controllers/renstra_tabelTujuanController')];

  const fakeT = { LOCK: { UPDATE: 'UPDATE' }, commit: async () => {}, rollback: async () => {} };
  let updateCalled = false;
  const originalTransaction = models.sequelize.transaction;
  const originalFindByPk = models.RenstraTabelTujuan.findByPk;
  const originalUpdate = models.RenstraTabelTujuan.update;
  models.sequelize.transaction = async () => fakeT;
  models.RenstraTabelTujuan.findByPk = async (id, options) => {
    if (options && options.include) {
      return { id: 99, opd_id: 2, opd: { id: 2, nama_opd: 'Dinas Uji Coba B' } };
    }
    return { id: 99, opd_id: 2 };
  };
  models.RenstraTabelTujuan.update = async () => {
    updateCalled = true;
  };

  try {
    const controller = require('../controllers/renstra_tabelTujuanController');
    const req = {
      params: { id: '99' },
      body: {},
      user: { role: 'ADMINISTRATOR', opd: 'Dinas Uji Coba A' },
    };
    const res = fakeRes();
    await controller.update(req, res);

    assert.strictEqual(res.statusCode, 403, `harus 403, didapat ${res.statusCode}, body=${JSON.stringify(res.body)}`);
    assert.strictEqual(res.body?.code, 'RENSTRA_TABEL_TUJUAN_OPD_FORBIDDEN');
    assert.strictEqual(updateCalled, false, 'RenstraTabelTujuan.update() TIDAK BOLEH dipanggil ketika boundary OPD menolak');
  } finally {
    models.sequelize.transaction = originalTransaction;
    models.RenstraTabelTujuan.findByPk = originalFindByPk;
    models.RenstraTabelTujuan.update = originalUpdate;
  }
});

await test('update RenstraTabelTujuan — caller OPD SAMA dengan target (non-SUPER_ADMIN) -> boundary MENGIZINKAN, tidak diblokir 403', async () => {
  delete require.cache[require.resolve('../controllers/renstra_tabelTujuanController')];

  const fakeT = { LOCK: { UPDATE: 'UPDATE' }, commit: async () => {}, rollback: async () => {} };
  const originalTransaction = models.sequelize.transaction;
  const originalFindByPk = models.RenstraTabelTujuan.findByPk;
  models.sequelize.transaction = async () => fakeT;
  models.RenstraTabelTujuan.findByPk = async (id, options) => {
    if (options && options.include) {
      return { id: 99, opd_id: 1, opd: { id: 1, nama_opd: 'Dinas Uji Coba A' } };
    }
    return { id: 99, opd_id: 1 };
  };

  try {
    const controller = require('../controllers/renstra_tabelTujuanController');
    const req = {
      params: { id: '99' },
      body: {},
      user: { role: 'ADMINISTRATOR', opd: 'Dinas Uji Coba A' },
    };
    const res = fakeRes();
    await controller.update(req, res);

    assert.notStrictEqual(res.statusCode, 403, `boundary TIDAK BOLEH menolak ketika caller dan target berada di OPD yang sama, didapat ${res.statusCode}, body=${JSON.stringify(res.body)}`);
    assert.notStrictEqual(res.body?.code, 'RENSTRA_TABEL_TUJUAN_OPD_FORBIDDEN');
  } finally {
    models.sequelize.transaction = originalTransaction;
    models.RenstraTabelTujuan.findByPk = originalFindByPk;
  }
});

await test('update RenstraTabelTujuan — SUPER_ADMIN dikecualikan dari boundary OPD (otoritas tenant-wide, AD-S4-02)', async () => {
  delete require.cache[require.resolve('../controllers/renstra_tabelTujuanController')];

  const fakeT = { LOCK: { UPDATE: 'UPDATE' }, commit: async () => {}, rollback: async () => {} };
  const originalTransaction = models.sequelize.transaction;
  const originalFindByPk = models.RenstraTabelTujuan.findByPk;
  models.sequelize.transaction = async () => fakeT;
  models.RenstraTabelTujuan.findByPk = async (id, options) => {
    if (options && options.include) {
      return { id: 99, opd_id: 2, opd: { id: 2, nama_opd: 'Dinas Uji Coba B' } };
    }
    return { id: 99, opd_id: 2 };
  };

  try {
    const controller = require('../controllers/renstra_tabelTujuanController');
    const req = {
      params: { id: '99' },
      body: {},
      user: { role: 'SUPER_ADMIN', opd: 'Dinas Manapun' },
    };
    const res = fakeRes();
    await controller.update(req, res);

    assert.notStrictEqual(res.statusCode, 403, `SUPER_ADMIN tidak boleh diblokir boundary OPD, didapat ${res.statusCode}, body=${JSON.stringify(res.body)}`);
    assert.notStrictEqual(res.body?.code, 'RENSTRA_TABEL_TUJUAN_OPD_FORBIDDEN');
  } finally {
    models.sequelize.transaction = originalTransaction;
    models.RenstraTabelTujuan.findByPk = originalFindByPk;
  }
});

await test('update RenstraTabelTujuan — resolusi kepemilikan gagal (error internal) -> FAIL CLOSED 503, RenstraTabelTujuan.update TIDAK dipanggil', async () => {
  delete require.cache[require.resolve('../controllers/renstra_tabelTujuanController')];

  const fakeT = { LOCK: { UPDATE: 'UPDATE' }, commit: async () => {}, rollback: async () => {} };
  let updateCalled = false;
  const originalTransaction = models.sequelize.transaction;
  const originalFindByPk = models.RenstraTabelTujuan.findByPk;
  const originalUpdate = models.RenstraTabelTujuan.update;
  models.sequelize.transaction = async () => fakeT;
  models.RenstraTabelTujuan.findByPk = async (id, options) => {
    if (options && options.include) {
      throw new Error('simulated DB error saat resolusi kepemilikan OPD');
    }
    return { id: 99, opd_id: 2 };
  };
  models.RenstraTabelTujuan.update = async () => {
    updateCalled = true;
  };

  try {
    const controller = require('../controllers/renstra_tabelTujuanController');
    const req = {
      params: { id: '99' },
      body: {},
      user: { role: 'ADMINISTRATOR', opd: 'Dinas Uji Coba A' },
    };
    const res = fakeRes();
    await controller.update(req, res);

    assert.strictEqual(res.statusCode, 503, `harus fail-closed 503, didapat ${res.statusCode}, body=${JSON.stringify(res.body)}`);
    assert.strictEqual(res.body?.code, 'RENSTRA_TABEL_TUJUAN_OPD_BOUNDARY_UNAVAILABLE');
    assert.strictEqual(updateCalled, false, 'RenstraTabelTujuan.update() TIDAK BOLEH dipanggil ketika resolusi kepemilikan gagal (fail-closed)');
  } finally {
    models.sequelize.transaction = originalTransaction;
    models.RenstraTabelTujuan.findByPk = originalFindByPk;
    models.RenstraTabelTujuan.update = originalUpdate;
  }
});

console.log('\n=== S4-01/S4-DISC-002: renstra_tabelTujuanController.revisi — boundary OPD ===');

await test('revisi RenstraTabelTujuan — caller OPD BEDA dari target -> DITOLAK 403, row.update TIDAK dipanggil', async () => {
  delete require.cache[require.resolve('../controllers/renstra_tabelTujuanController')];

  const fakeT = { LOCK: { UPDATE: 'UPDATE' }, commit: async () => {}, rollback: async () => {} };
  let rowUpdateCalled = false;
  const originalTransaction = models.sequelize.transaction;
  const originalFindByPk = models.RenstraTabelTujuan.findByPk;
  models.sequelize.transaction = async () => fakeT;
  models.RenstraTabelTujuan.findByPk = async (id, options) => {
    if (options && options.include) {
      return { id: 99, opd_id: 2, opd: { id: 2, nama_opd: 'Dinas Uji Coba B' } };
    }
    return {
      id: 99,
      opd_id: 2,
      versi: 1,
      toJSON() {
        return { id: 99, opd_id: 2, versi: 1 };
      },
      async update() {
        rowUpdateCalled = true;
      },
    };
  };

  try {
    const controller = require('../controllers/renstra_tabelTujuanController');
    const req = {
      params: { id: '99' },
      body: { alasan_revisi: 'Uji coba revisi' },
      user: { role: 'ADMINISTRATOR', opd: 'Dinas Uji Coba A' },
    };
    const res = fakeRes();
    await controller.revisi(req, res);

    assert.strictEqual(res.statusCode, 403, `harus 403, didapat ${res.statusCode}, body=${JSON.stringify(res.body)}`);
    assert.strictEqual(res.body?.code, 'RENSTRA_TABEL_TUJUAN_OPD_FORBIDDEN');
    assert.strictEqual(rowUpdateCalled, false, 'row.update() TIDAK BOLEH dipanggil ketika boundary OPD menolak');
  } finally {
    models.sequelize.transaction = originalTransaction;
    models.RenstraTabelTujuan.findByPk = originalFindByPk;
  }
});

await test('revisi RenstraTabelTujuan — SUPER_ADMIN dikecualikan dari boundary OPD (otoritas tenant-wide, AD-S4-02)', async () => {
  delete require.cache[require.resolve('../controllers/renstra_tabelTujuanController')];

  const fakeT = { LOCK: { UPDATE: 'UPDATE' }, commit: async () => {}, rollback: async () => {} };
  const originalTransaction = models.sequelize.transaction;
  const originalFindByPk = models.RenstraTabelTujuan.findByPk;
  models.sequelize.transaction = async () => fakeT;
  models.RenstraTabelTujuan.findByPk = async (id, options) => {
    if (options && options.include) {
      return { id: 99, opd_id: 2, opd: { id: 2, nama_opd: 'Dinas Uji Coba B' } };
    }
    return {
      id: 99,
      opd_id: 2,
      versi: 1,
      toJSON() {
        return { id: 99, opd_id: 2, versi: 1 };
      },
      async update() {},
    };
  };

  try {
    const controller = require('../controllers/renstra_tabelTujuanController');
    const req = {
      params: { id: '99' },
      body: { alasan_revisi: 'Uji coba revisi' },
      user: { role: 'SUPER_ADMIN', opd: 'Dinas Manapun' },
    };
    const res = fakeRes();
    await controller.revisi(req, res);

    assert.notStrictEqual(res.statusCode, 403, `SUPER_ADMIN tidak boleh diblokir boundary OPD, didapat ${res.statusCode}, body=${JSON.stringify(res.body)}`);
    assert.notStrictEqual(res.body?.code, 'RENSTRA_TABEL_TUJUAN_OPD_FORBIDDEN');
  } finally {
    models.sequelize.transaction = originalTransaction;
    models.RenstraTabelTujuan.findByPk = originalFindByPk;
  }
});

console.log('\n=== S4-01/S4-DISC-004: renstra_tabelTujuanController — boundary OPD pada 3 jalur mutasi history ===');

await test('verifikasiHistory — caller OPD BEDA dari target parent -> DITOLAK 403, UPDATE history TIDAK dijalankan', async () => {
  delete require.cache[require.resolve('../controllers/renstra_tabelTujuanController')];

  const fakeT = { LOCK: { UPDATE: 'UPDATE' }, commit: async () => {}, rollback: async () => {} };
  let updateQueryRan = false;
  const originalTransaction = models.sequelize.transaction;
  const originalQuery = models.sequelize.query;
  const originalFindByPk = models.RenstraTabelTujuan.findByPk;
  models.sequelize.transaction = async () => fakeT;
  models.sequelize.query = async (sql) => {
    if (/SELECT renstra_tabel_tujuan_id FROM renstra_tabel_tujuan_history/.test(sql)) {
      return [[{ renstra_tabel_tujuan_id: 99 }]];
    }
    if (/UPDATE renstra_tabel_tujuan_history/.test(sql)) {
      updateQueryRan = true;
      return [];
    }
    throw new Error(`Unexpected query in test: ${sql}`);
  };
  models.RenstraTabelTujuan.findByPk = async (id, options) => {
    if (options && options.include) {
      return { id: 99, opd_id: 2, opd: { id: 2, nama_opd: 'Dinas Uji Coba B' } };
    }
    return { id: 99, opd_id: 2 };
  };

  try {
    const controller = require('../controllers/renstra_tabelTujuanController');
    const req = {
      params: { history_id: '7' },
      body: {},
      user: { role: 'ADMINISTRATOR', opd: 'Dinas Uji Coba A' },
    };
    const res = fakeRes();
    await controller.verifikasiHistory(req, res);

    assert.strictEqual(res.statusCode, 403, `harus 403, didapat ${res.statusCode}, body=${JSON.stringify(res.body)}`);
    assert.strictEqual(res.body?.code, 'RENSTRA_TABEL_TUJUAN_OPD_FORBIDDEN');
    assert.strictEqual(updateQueryRan, false, 'UPDATE renstra_tabel_tujuan_history TIDAK BOLEH dijalankan ketika boundary OPD menolak');
  } finally {
    models.sequelize.transaction = originalTransaction;
    models.sequelize.query = originalQuery;
    models.RenstraTabelTujuan.findByPk = originalFindByPk;
  }
});

await test('verifikasiHistory — caller OPD SAMA dengan target parent (non-SUPER_ADMIN) -> boundary MENGIZINKAN, tidak diblokir 403', async () => {
  delete require.cache[require.resolve('../controllers/renstra_tabelTujuanController')];

  const fakeT = { LOCK: { UPDATE: 'UPDATE' }, commit: async () => {}, rollback: async () => {} };
  const originalTransaction = models.sequelize.transaction;
  const originalQuery = models.sequelize.query;
  const originalFindByPk = models.RenstraTabelTujuan.findByPk;
  models.sequelize.transaction = async () => fakeT;
  models.sequelize.query = async (sql) => {
    if (/SELECT renstra_tabel_tujuan_id FROM renstra_tabel_tujuan_history/.test(sql)) {
      return [[{ renstra_tabel_tujuan_id: 99 }]];
    }
    if (/UPDATE renstra_tabel_tujuan_history/.test(sql)) {
      return [];
    }
    throw new Error(`Unexpected query in test: ${sql}`);
  };
  models.RenstraTabelTujuan.findByPk = async (id, options) => {
    if (options && options.include) {
      return { id: 99, opd_id: 1, opd: { id: 1, nama_opd: 'Dinas Uji Coba A' } };
    }
    return { id: 99, opd_id: 1 };
  };

  try {
    const controller = require('../controllers/renstra_tabelTujuanController');
    const req = {
      params: { history_id: '7' },
      body: {},
      user: { role: 'ADMINISTRATOR', opd: 'Dinas Uji Coba A' },
    };
    const res = fakeRes();
    await controller.verifikasiHistory(req, res);

    assert.notStrictEqual(res.statusCode, 403, `boundary TIDAK BOLEH menolak ketika caller dan target parent berada di OPD yang sama, didapat ${res.statusCode}, body=${JSON.stringify(res.body)}`);
    assert.notStrictEqual(res.body?.code, 'RENSTRA_TABEL_TUJUAN_OPD_FORBIDDEN');
  } finally {
    models.sequelize.transaction = originalTransaction;
    models.sequelize.query = originalQuery;
    models.RenstraTabelTujuan.findByPk = originalFindByPk;
  }
});

await test('approveHistory — caller OPD BEDA dari target parent -> DITOLAK 403, UPDATE history & RenstraTabelTujuan.update TIDAK dijalankan', async () => {
  delete require.cache[require.resolve('../controllers/renstra_tabelTujuanController')];

  const fakeT = { LOCK: { UPDATE: 'UPDATE' }, commit: async () => {}, rollback: async () => {} };
  let updateQueryRan = false;
  let parentUpdateCalled = false;
  const originalTransaction = models.sequelize.transaction;
  const originalQuery = models.sequelize.query;
  const originalFindByPk = models.RenstraTabelTujuan.findByPk;
  const originalUpdate = models.RenstraTabelTujuan.update;
  models.sequelize.transaction = async () => fakeT;
  models.sequelize.query = async (sql) => {
    if (/SELECT \*\s*\n\s*FROM renstra_tabel_tujuan_history/.test(sql)) {
      return [[{ id: 7, renstra_tabel_tujuan_id: 99, status_revisi: 'verifikasi' }]];
    }
    if (/UPDATE renstra_tabel_tujuan_history/.test(sql)) {
      updateQueryRan = true;
      return [];
    }
    throw new Error(`Unexpected query in test: ${sql}`);
  };
  models.RenstraTabelTujuan.findByPk = async (id, options) => {
    if (options && options.include) {
      return { id: 99, opd_id: 2, opd: { id: 2, nama_opd: 'Dinas Uji Coba B' } };
    }
    return { id: 99, opd_id: 2 };
  };
  models.RenstraTabelTujuan.update = async () => {
    parentUpdateCalled = true;
  };

  try {
    const controller = require('../controllers/renstra_tabelTujuanController');
    const req = {
      params: { history_id: '7' },
      body: {},
      user: { role: 'ADMINISTRATOR', opd: 'Dinas Uji Coba A' },
    };
    const res = fakeRes();
    await controller.approveHistory(req, res);

    assert.strictEqual(res.statusCode, 403, `harus 403, didapat ${res.statusCode}, body=${JSON.stringify(res.body)}`);
    assert.strictEqual(res.body?.code, 'RENSTRA_TABEL_TUJUAN_OPD_FORBIDDEN');
    assert.strictEqual(updateQueryRan, false, 'UPDATE renstra_tabel_tujuan_history TIDAK BOLEH dijalankan ketika boundary OPD menolak');
    assert.strictEqual(parentUpdateCalled, false, 'RenstraTabelTujuan.update() (sinkronisasi status_revisi parent) TIDAK BOLEH dipanggil ketika boundary OPD menolak');
  } finally {
    models.sequelize.transaction = originalTransaction;
    models.sequelize.query = originalQuery;
    models.RenstraTabelTujuan.findByPk = originalFindByPk;
    models.RenstraTabelTujuan.update = originalUpdate;
  }
});

await test('tolakHistory — caller OPD BEDA dari target parent -> DITOLAK 403, UPDATE history TIDAK dijalankan', async () => {
  delete require.cache[require.resolve('../controllers/renstra_tabelTujuanController')];

  const fakeT = { LOCK: { UPDATE: 'UPDATE' }, commit: async () => {}, rollback: async () => {} };
  let updateQueryRan = false;
  const originalTransaction = models.sequelize.transaction;
  const originalQuery = models.sequelize.query;
  const originalFindByPk = models.RenstraTabelTujuan.findByPk;
  models.sequelize.transaction = async () => fakeT;
  models.sequelize.query = async (sql) => {
    if (/SELECT renstra_tabel_tujuan_id FROM renstra_tabel_tujuan_history/.test(sql)) {
      return [[{ renstra_tabel_tujuan_id: 99 }]];
    }
    if (/UPDATE renstra_tabel_tujuan_history/.test(sql)) {
      updateQueryRan = true;
      return [];
    }
    throw new Error(`Unexpected query in test: ${sql}`);
  };
  models.RenstraTabelTujuan.findByPk = async (id, options) => {
    if (options && options.include) {
      return { id: 99, opd_id: 2, opd: { id: 2, nama_opd: 'Dinas Uji Coba B' } };
    }
    return { id: 99, opd_id: 2 };
  };

  try {
    const controller = require('../controllers/renstra_tabelTujuanController');
    const req = {
      params: { history_id: '7' },
      body: {},
      user: { role: 'ADMINISTRATOR', opd: 'Dinas Uji Coba A' },
    };
    const res = fakeRes();
    await controller.tolakHistory(req, res);

    assert.strictEqual(res.statusCode, 403, `harus 403, didapat ${res.statusCode}, body=${JSON.stringify(res.body)}`);
    assert.strictEqual(res.body?.code, 'RENSTRA_TABEL_TUJUAN_OPD_FORBIDDEN');
    assert.strictEqual(updateQueryRan, false, 'UPDATE renstra_tabel_tujuan_history TIDAK BOLEH dijalankan ketika boundary OPD menolak');
  } finally {
    models.sequelize.transaction = originalTransaction;
    models.sequelize.query = originalQuery;
    models.RenstraTabelTujuan.findByPk = originalFindByPk;
  }
});

console.log('\n=== S4-02: dpaPergeseranController.js — boundary OPD pada Pergeseran/Perubahan ===');

await test('createPergeseran — caller OPD BEDA dari Dpa sumber -> DITOLAK 403, DpaPergeseran.create TIDAK dipanggil', async () => {
  delete require.cache[require.resolve('../controllers/dpaPergeseranController')];

  await withStubs(
    [[models.OpdPenanggungJawab, 'findOne', async ({ where }) => ({ id: 1, nama_opd: where.nama_opd })]],
    async () => {
      const controller = require('../controllers/dpaPergeseranController');

      let createCalled = false;
      const originalDpaFindByPk = models.Dpa.findByPk;
      const originalCreate = models.DpaPergeseran.create;
      models.Dpa.findByPk = async () => ({ id: 5, opd_id: 2 });
      models.DpaPergeseran.create = async () => {
        createCalled = true;
        return { id: 1 };
      };

      try {
        const req = {
          params: { dpa_id: '5' },
          body: {
            tanggal: '2026-01-01',
            alasan: 'Uji coba pergeseran',
            items: [{ jenis: 'KURANG', jumlah_pergeseran: 100, kode_rekening: '5.1.01' }],
          },
          user: { role: 'ADMINISTRATOR', opd: 'Dinas Uji Coba A' },
        };
        const res = fakeRes();
        await controller.createPergeseran(req, res);

        assert.strictEqual(res.statusCode, 403, `harus 403, didapat ${res.statusCode}, body=${JSON.stringify(res.body)}`);
        assert.strictEqual(res.body?.code, 'DPA_PERGESERAN_OPD_FORBIDDEN');
        assert.strictEqual(createCalled, false, 'DpaPergeseran.create() TIDAK BOLEH dipanggil ketika boundary OPD menolak');
      } finally {
        models.Dpa.findByPk = originalDpaFindByPk;
        models.DpaPergeseran.create = originalCreate;
      }
    }
  );
});

await test('createPergeseran — caller OPD SAMA dengan Dpa sumber (non-SUPER_ADMIN) -> boundary MENGIZINKAN, tidak diblokir 403', async () => {
  delete require.cache[require.resolve('../controllers/dpaPergeseranController')];

  await withStubs(
    [[models.OpdPenanggungJawab, 'findOne', async ({ where }) => ({ id: 1, nama_opd: where.nama_opd })]],
    async () => {
      const controller = require('../controllers/dpaPergeseranController');

      const originalDpaFindByPk = models.Dpa.findByPk;
      const originalCount = models.DpaPergeseran.count;
      const originalCreate = models.DpaPergeseran.create;
      const originalBulkCreate = models.DpaPergeseranItem.bulkCreate;
      models.Dpa.findByPk = async () => ({ id: 5, opd_id: 1 });
      models.DpaPergeseran.count = async () => 0;
      models.DpaPergeseran.create = async () => ({ id: 1 });
      models.DpaPergeseranItem.bulkCreate = async () => [];

      try {
        const req = {
          params: { dpa_id: '5' },
          body: {
            tanggal: '2026-01-01',
            alasan: 'Uji coba pergeseran',
            items: [{ jenis: 'KURANG', jumlah_pergeseran: 100, kode_rekening: '5.1.01' }],
          },
          user: { role: 'ADMINISTRATOR', opd: 'Dinas Uji Coba A' },
        };
        const res = fakeRes();
        await controller.createPergeseran(req, res);

        assert.notStrictEqual(res.statusCode, 403, `boundary TIDAK BOLEH menolak ketika caller dan Dpa sumber berada di OPD yang sama, didapat ${res.statusCode}, body=${JSON.stringify(res.body)}`);
        assert.notStrictEqual(res.body?.code, 'DPA_PERGESERAN_OPD_FORBIDDEN');
      } finally {
        models.Dpa.findByPk = originalDpaFindByPk;
        models.DpaPergeseran.count = originalCount;
        models.DpaPergeseran.create = originalCreate;
        models.DpaPergeseranItem.bulkCreate = originalBulkCreate;
      }
    }
  );
});

await test('setujuiPergeseran — caller OPD BEDA -> DITOLAK 403, pergeseran.update TIDAK dipanggil, sinkronisasi pagu TIDAK jalan', async () => {
  delete require.cache[require.resolve('../controllers/dpaPergeseranController')];

  await withStubs(
    [[models.OpdPenanggungJawab, 'findOne', async ({ where }) => ({ id: 1, nama_opd: where.nama_opd })]],
    async () => {
      const controller = require('../controllers/dpaPergeseranController');

      let pergeseranUpdateCalled = false;
      const originalDpaFindByPk = models.Dpa.findByPk;
      const originalPergeseranFindByPk = models.DpaPergeseran.findByPk;
      models.Dpa.findByPk = async () => ({ id: 5, opd_id: 2 });
      models.DpaPergeseran.findByPk = async () => ({
        id: 10,
        dpa_id: 5,
        status: 'DRAFT',
        items: [],
        async update() {
          pergeseranUpdateCalled = true;
        },
      });

      try {
        const req = {
          params: { id: '10' },
          body: {},
          user: { role: 'ADMINISTRATOR', opd: 'Dinas Uji Coba A' },
        };
        const res = fakeRes();
        await controller.setujuiPergeseran(req, res);

        assert.strictEqual(res.statusCode, 403, `harus 403, didapat ${res.statusCode}, body=${JSON.stringify(res.body)}`);
        assert.strictEqual(res.body?.code, 'DPA_PERGESERAN_OPD_FORBIDDEN');
        assert.strictEqual(pergeseranUpdateCalled, false, 'pergeseran.update() TIDAK BOLEH dipanggil ketika boundary OPD menolak (approval & sinkronisasi pagu tidak boleh jalan)');
      } finally {
        models.Dpa.findByPk = originalDpaFindByPk;
        models.DpaPergeseran.findByPk = originalPergeseranFindByPk;
      }
    }
  );
});

await test('setujuiPergeseran — SUPER_ADMIN dikecualikan dari boundary OPD (otoritas tenant-wide, AD-S4-02)', async () => {
  delete require.cache[require.resolve('../controllers/dpaPergeseranController')];

  const controller = require('../controllers/dpaPergeseranController');
  const originalDpaFindByPk = models.Dpa.findByPk;
  const originalPergeseranFindByPk = models.DpaPergeseran.findByPk;
  models.Dpa.findByPk = async () => ({ id: 5, opd_id: 2 });
  models.DpaPergeseran.findByPk = async () => ({
    id: 10,
    dpa_id: 5,
    status: 'DRAFT',
    items: [],
    async update() {},
  });

  try {
    const req = {
      params: { id: '10' },
      body: {},
      user: { role: 'SUPER_ADMIN', opd: 'Dinas Manapun' },
    };
    const res = fakeRes();
    await controller.setujuiPergeseran(req, res);

    assert.notStrictEqual(res.statusCode, 403, `SUPER_ADMIN tidak boleh diblokir boundary OPD, didapat ${res.statusCode}, body=${JSON.stringify(res.body)}`);
    assert.notStrictEqual(res.body?.code, 'DPA_PERGESERAN_OPD_FORBIDDEN');
  } finally {
    models.Dpa.findByPk = originalDpaFindByPk;
    models.DpaPergeseran.findByPk = originalPergeseranFindByPk;
  }
});

await test('deletePergeseran — caller OPD BEDA -> DITOLAK 403, item destroy DAN parent destroy TIDAK dipanggil', async () => {
  delete require.cache[require.resolve('../controllers/dpaPergeseranController')];

  await withStubs(
    [[models.OpdPenanggungJawab, 'findOne', async ({ where }) => ({ id: 1, nama_opd: where.nama_opd })]],
    async () => {
      const controller = require('../controllers/dpaPergeseranController');

      let parentDestroyCalled = false;
      let itemDestroyCalled = false;
      const originalDpaFindByPk = models.Dpa.findByPk;
      const originalPergeseranFindByPk = models.DpaPergeseran.findByPk;
      const originalItemDestroy = models.DpaPergeseranItem.destroy;
      models.Dpa.findByPk = async () => ({ id: 5, opd_id: 2 });
      models.DpaPergeseran.findByPk = async () => ({
        id: 10,
        dpa_id: 5,
        status: 'DRAFT',
        async destroy() {
          parentDestroyCalled = true;
        },
      });
      models.DpaPergeseranItem.destroy = async () => {
        itemDestroyCalled = true;
      };

      try {
        const req = {
          params: { id: '10' },
          body: {},
          user: { role: 'ADMINISTRATOR', opd: 'Dinas Uji Coba A' },
        };
        const res = fakeRes();
        await controller.deletePergeseran(req, res);

        assert.strictEqual(res.statusCode, 403, `harus 403, didapat ${res.statusCode}, body=${JSON.stringify(res.body)}`);
        assert.strictEqual(res.body?.code, 'DPA_PERGESERAN_OPD_FORBIDDEN');
        assert.strictEqual(itemDestroyCalled, false, 'DpaPergeseranItem.destroy() TIDAK BOLEH dipanggil ketika boundary OPD menolak');
        assert.strictEqual(parentDestroyCalled, false, 'pergeseran.destroy() (parent) TIDAK BOLEH dipanggil ketika boundary OPD menolak');
      } finally {
        models.Dpa.findByPk = originalDpaFindByPk;
        models.DpaPergeseran.findByPk = originalPergeseranFindByPk;
        models.DpaPergeseranItem.destroy = originalItemDestroy;
      }
    }
  );
});

await test('savePerubahan — caller OPD BEDA dari Dpa (row yang sudah di-load) -> DITOLAK 403, DpaPerubahan.create/findOne TIDAK dipanggil', async () => {
  delete require.cache[require.resolve('../controllers/dpaPergeseranController')];

  await withStubs(
    [[models.OpdPenanggungJawab, 'findOne', async ({ where }) => ({ id: 1, nama_opd: where.nama_opd })]],
    async () => {
      const controller = require('../controllers/dpaPergeseranController');

      let perubahanFindOneCalled = false;
      let perubahanCreateCalled = false;
      const originalDpaFindByPk = models.Dpa.findByPk;
      const originalFindOne = models.DpaPerubahan.findOne;
      const originalCreate = models.DpaPerubahan.create;
      models.Dpa.findByPk = async () => ({ id: 5, opd_id: 2, anggaran: 1000 });
      models.DpaPerubahan.findOne = async () => {
        perubahanFindOneCalled = true;
        return null;
      };
      models.DpaPerubahan.create = async () => {
        perubahanCreateCalled = true;
        return { id: 1 };
      };

      try {
        const req = {
          params: { dpa_id: '5' },
          body: { tanggal: '2026-01-01', alasan: 'Uji coba perubahan', pagu_menjadi: 1000 },
          user: { role: 'ADMINISTRATOR', opd: 'Dinas Uji Coba A' },
        };
        const res = fakeRes();
        await controller.savePerubahan(req, res);

        assert.strictEqual(res.statusCode, 403, `harus 403, didapat ${res.statusCode}, body=${JSON.stringify(res.body)}`);
        assert.strictEqual(res.body?.code, 'DPA_PERGESERAN_OPD_FORBIDDEN');
        assert.strictEqual(perubahanFindOneCalled, false, 'DpaPerubahan.findOne() TIDAK BOLEH dipanggil ketika boundary OPD menolak');
        assert.strictEqual(perubahanCreateCalled, false, 'DpaPerubahan.create() TIDAK BOLEH dipanggil ketika boundary OPD menolak');
      } finally {
        models.Dpa.findByPk = originalDpaFindByPk;
        models.DpaPerubahan.findOne = originalFindOne;
        models.DpaPerubahan.create = originalCreate;
      }
    }
  );
});

await test('setujuiPerubahan — caller OPD BEDA (via DpaPerubahan.dpa_id -> Dpa.opd_id) -> DITOLAK 403, perubahan.update TIDAK dipanggil', async () => {
  delete require.cache[require.resolve('../controllers/dpaPergeseranController')];

  await withStubs(
    [[models.OpdPenanggungJawab, 'findOne', async ({ where }) => ({ id: 1, nama_opd: where.nama_opd })]],
    async () => {
      const controller = require('../controllers/dpaPergeseranController');

      let perubahanUpdateCalled = false;
      const originalDpaFindByPk = models.Dpa.findByPk;
      const originalPerubahanFindByPk = models.DpaPerubahan.findByPk;
      models.Dpa.findByPk = async () => ({ id: 5, opd_id: 2 });
      models.DpaPerubahan.findByPk = async () => ({
        id: 20,
        dpa_id: 5,
        status: 'DRAFT',
        async update() {
          perubahanUpdateCalled = true;
        },
      });

      try {
        const req = {
          params: { id: '20' },
          body: {},
          user: { role: 'ADMINISTRATOR', opd: 'Dinas Uji Coba A' },
        };
        const res = fakeRes();
        await controller.setujuiPerubahan(req, res);

        assert.strictEqual(res.statusCode, 403, `harus 403, didapat ${res.statusCode}, body=${JSON.stringify(res.body)}`);
        assert.strictEqual(res.body?.code, 'DPA_PERGESERAN_OPD_FORBIDDEN');
        assert.strictEqual(perubahanUpdateCalled, false, 'perubahan.update() TIDAK BOLEH dipanggil ketika boundary OPD menolak');
      } finally {
        models.Dpa.findByPk = originalDpaFindByPk;
        models.DpaPerubahan.findByPk = originalPerubahanFindByPk;
      }
    }
  );
});

await test('boundary OPD Pergeseran/Perubahan — resolusi kepemilikan gagal (error internal pada OpdPenanggungJawab.findOne) -> FAIL CLOSED 503, tidak ada mutation yang jalan', async () => {
  delete require.cache[require.resolve('../controllers/dpaPergeseranController')];

  await withStubs(
    [[models.OpdPenanggungJawab, 'findOne', async () => {
      throw new Error('simulated DB error saat resolusi kepemilikan OPD');
    }]],
    async () => {
      const controller = require('../controllers/dpaPergeseranController');

      let pergeseranUpdateCalled = false;
      const originalDpaFindByPk = models.Dpa.findByPk;
      const originalPergeseranFindByPk = models.DpaPergeseran.findByPk;
      models.Dpa.findByPk = async () => ({ id: 5, opd_id: 2 });
      models.DpaPergeseran.findByPk = async () => ({
        id: 10,
        dpa_id: 5,
        status: 'DRAFT',
        items: [],
        async update() {
          pergeseranUpdateCalled = true;
        },
      });

      try {
        const req = {
          params: { id: '10' },
          body: {},
          user: { role: 'ADMINISTRATOR', opd: 'Dinas Uji Coba A' },
        };
        const res = fakeRes();
        await controller.setujuiPergeseran(req, res);

        assert.strictEqual(res.statusCode, 503, `harus fail-closed 503, didapat ${res.statusCode}, body=${JSON.stringify(res.body)}`);
        assert.strictEqual(res.body?.code, 'DPA_PERGESERAN_OPD_BOUNDARY_UNAVAILABLE');
        assert.strictEqual(pergeseranUpdateCalled, false, 'pergeseran.update() TIDAK BOLEH dipanggil ketika resolusi kepemilikan gagal (fail-closed)');
      } finally {
        models.Dpa.findByPk = originalDpaFindByPk;
        models.DpaPergeseran.findByPk = originalPergeseranFindByPk;
      }
    }
  );
});


console.log('\n=== S5-01/S5-02: rkaController.js — boundary OPD pada update/destroy/pemicuRevisi ===');

await test('rkaController.update — caller OPD BEDA dari target -> DITOLAK 403, Rka.update TIDAK dipanggil', async () => {
  delete require.cache[require.resolve('../controllers/rkaController')];

  await withStubs(
    [[models.OpdPenanggungJawab, 'findOne', async ({ where }) => ({ id: 1, nama_opd: where.nama_opd })]],
    async () => {
      const controller = require('../controllers/rkaController');

      let updateCalled = false;
      const originalFindByPk = models.Rka.findByPk;
      const originalUpdate = models.Rka.update;
      models.Rka.findByPk = async () => ({ id: 42, opd_id: 2, version: 1 });
      models.Rka.update = async () => {
        updateCalled = true;
      };

      try {
        const req = {
          params: { id: '42' },
          body: { payload: {} },
          user: { role: 'ADMINISTRATOR', opd: 'Dinas Uji Coba A' },
        };
        const res = fakeRes();
        await controller.update(req, res);

        assert.strictEqual(res.statusCode, 403, `harus 403, didapat ${res.statusCode}, body=${JSON.stringify(res.body)}`);
        assert.strictEqual(res.body?.code, 'RKA_OPD_FORBIDDEN');
        assert.strictEqual(updateCalled, false, 'Rka.update() TIDAK BOLEH dipanggil ketika boundary OPD menolak');
      } finally {
        models.Rka.findByPk = originalFindByPk;
        models.Rka.update = originalUpdate;
      }
    }
  );
});

await test('rkaController.update — caller OPD SAMA dengan target (non-SUPER_ADMIN) -> boundary MENGIZINKAN, tidak diblokir 403', async () => {
  delete require.cache[require.resolve('../controllers/rkaController')];

  await withStubs(
    [[models.OpdPenanggungJawab, 'findOne', async ({ where }) => ({ id: 1, nama_opd: where.nama_opd })]],
    async () => {
      const controller = require('../controllers/rkaController');

      const originalFindByPk = models.Rka.findByPk;
      models.Rka.findByPk = async () => ({ id: 42, opd_id: 1, version: 1 });

      try {
        const req = {
          params: { id: '42' },
          body: { payload: {} },
          user: { role: 'ADMINISTRATOR', opd: 'Dinas Uji Coba A' },
        };
        const res = fakeRes();
        await controller.update(req, res);

        assert.notStrictEqual(res.statusCode, 403, `boundary TIDAK BOLEH menolak ketika caller dan target berada di OPD yang sama, didapat ${res.statusCode}, body=${JSON.stringify(res.body)}`);
        assert.notStrictEqual(res.body?.code, 'RKA_OPD_FORBIDDEN');
      } finally {
        models.Rka.findByPk = originalFindByPk;
      }
    }
  );
});

await test('rkaController.update — SUPER_ADMIN dikecualikan dari boundary OPD (otoritas tenant-wide)', async () => {
  delete require.cache[require.resolve('../controllers/rkaController')];

  const controller = require('../controllers/rkaController');
  const originalFindByPk = models.Rka.findByPk;
  models.Rka.findByPk = async () => ({ id: 42, opd_id: 2, version: 1 });

  try {
    const req = {
      params: { id: '42' },
      body: { payload: {} },
      user: { role: 'SUPER_ADMIN', opd: 'Dinas Manapun' },
    };
    const res = fakeRes();
    await controller.update(req, res);

    assert.notStrictEqual(res.statusCode, 403, `SUPER_ADMIN tidak boleh diblokir boundary OPD, didapat ${res.statusCode}, body=${JSON.stringify(res.body)}`);
    assert.notStrictEqual(res.body?.code, 'RKA_OPD_FORBIDDEN');
  } finally {
    models.Rka.findByPk = originalFindByPk;
  }
});

await test('rkaController.destroy — caller OPD BEDA -> DITOLAK 403, Rka.destroy TIDAK dipanggil', async () => {
  delete require.cache[require.resolve('../controllers/rkaController')];

  await withStubs(
    [[models.OpdPenanggungJawab, 'findOne', async ({ where }) => ({ id: 1, nama_opd: where.nama_opd })]],
    async () => {
      const controller = require('../controllers/rkaController');

      let destroyCalled = false;
      const originalFindByPk = models.Rka.findByPk;
      const originalDestroy = models.Rka.destroy;
      models.Rka.findByPk = async () => ({ id: 42, opd_id: 2, version: 1 });
      models.Rka.destroy = async () => {
        destroyCalled = true;
      };

      try {
        const req = {
          params: { id: '42' },
          body: {},
          user: { role: 'ADMINISTRATOR', opd: 'Dinas Uji Coba A' },
        };
        const res = fakeRes();
        await controller.destroy(req, res);

        assert.strictEqual(res.statusCode, 403, `harus 403, didapat ${res.statusCode}, body=${JSON.stringify(res.body)}`);
        assert.strictEqual(res.body?.code, 'RKA_OPD_FORBIDDEN');
        assert.strictEqual(destroyCalled, false, 'Rka.destroy() TIDAK BOLEH dipanggil ketika boundary OPD menolak');
      } finally {
        models.Rka.findByPk = originalFindByPk;
        models.Rka.destroy = originalDestroy;
      }
    }
  );
});

await test('rkaController.pemicuRevisi — caller OPD BEDA -> DITOLAK 403, cloneRkaToNextTahapan TIDAK dipanggil', async () => {
  delete require.cache[require.resolve('../controllers/rkaController')];

  await withStubs(
    [[models.OpdPenanggungJawab, 'findOne', async ({ where }) => ({ id: 1, nama_opd: where.nama_opd })]],
    async () => {
      const controller = require('../controllers/rkaController');
      const rkaRevisiService = require('../services/rkaRevisiService');

      let cloneCalled = false;
      const originalFindByPk = models.Rka.findByPk;
      const originalClone = rkaRevisiService.cloneRkaToNextTahapan;
      models.Rka.findByPk = async () => ({ id: 42, opd_id: 2, version: 1 });
      rkaRevisiService.cloneRkaToNextTahapan = async () => {
        cloneCalled = true;
        return { data: { new_rka_id: 99 } };
      };

      try {
        const req = {
          params: { id: '42' },
          body: { tahapan_tujuan: 'PERGESERAN_1' },
          user: { role: 'ADMINISTRATOR', opd: 'Dinas Uji Coba A' },
        };
        const res = fakeRes();
        await controller.pemicuRevisi(req, res);

        assert.strictEqual(res.statusCode, 403, `harus 403, didapat ${res.statusCode}, body=${JSON.stringify(res.body)}`);
        assert.strictEqual(res.body?.code, 'RKA_OPD_FORBIDDEN');
        assert.strictEqual(cloneCalled, false, 'cloneRkaToNextTahapan() TIDAK BOLEH dipanggil ketika boundary OPD menolak');
      } finally {
        models.Rka.findByPk = originalFindByPk;
        rkaRevisiService.cloneRkaToNextTahapan = originalClone;
      }
    }
  );
});

await test('boundary OPD RKA — resolusi kepemilikan gagal (error internal) -> FAIL CLOSED 503, Rka.update TIDAK dipanggil', async () => {
  delete require.cache[require.resolve('../controllers/rkaController')];

  await withStubs(
    [[models.OpdPenanggungJawab, 'findOne', async () => {
      throw new Error('simulated DB error saat resolusi kepemilikan OPD');
    }]],
    async () => {
      const controller = require('../controllers/rkaController');

      let updateCalled = false;
      const originalFindByPk = models.Rka.findByPk;
      const originalUpdate = models.Rka.update;
      models.Rka.findByPk = async () => ({ id: 42, opd_id: 2, version: 1 });
      models.Rka.update = async () => {
        updateCalled = true;
      };

      try {
        const req = {
          params: { id: '42' },
          body: { payload: {} },
          user: { role: 'ADMINISTRATOR', opd: 'Dinas Uji Coba A' },
        };
        const res = fakeRes();
        await controller.update(req, res);

        assert.strictEqual(res.statusCode, 503, `harus fail-closed 503, didapat ${res.statusCode}, body=${JSON.stringify(res.body)}`);
        assert.strictEqual(res.body?.code, 'RKA_OPD_BOUNDARY_UNAVAILABLE');
        assert.strictEqual(updateCalled, false, 'Rka.update() TIDAK BOLEH dipanggil ketika resolusi kepemilikan gagal (fail-closed)');
      } finally {
        models.Rka.findByPk = originalFindByPk;
        models.Rka.update = originalUpdate;
      }
    }
  );
});

console.log('\n=== S5-03/S5-04: rkpdController.js — boundary OPD pada update/remove/workflow-transition ===');

await test('rkpdController.update — caller OPD BEDA -> DITOLAK 403, row.update TIDAK dipanggil', async () => {
  delete require.cache[require.resolve('../controllers/rkpdController')];

  await withStubs(
    [[models.OpdPenanggungJawab, 'findOne', async ({ where }) => ({ id: 1, nama_opd: where.nama_opd })]],
    async () => {
      const controller = require('../controllers/rkpdController');

      let rowUpdateCalled = false;
      const originalFindByPk = models.Rkpd.findByPk;
      models.Rkpd.findByPk = async () => ({
        id: 42,
        opd_id: 2,
        version: 1,
        async update() {
          rowUpdateCalled = true;
        },
      });

      try {
        const req = {
          params: { id: '42' },
          body: {},
          user: { role: 'ADMINISTRATOR', opd: 'Dinas Uji Coba A' },
        };
        const res = fakeRes();
        await controller.update(req, res);

        assert.strictEqual(res.statusCode, 403, `harus 403, didapat ${res.statusCode}, body=${JSON.stringify(res.body)}`);
        assert.strictEqual(res.body?.code, 'RKPD_OPD_FORBIDDEN');
        assert.strictEqual(rowUpdateCalled, false, 'row.update() TIDAK BOLEH dipanggil ketika boundary OPD menolak');
      } finally {
        models.Rkpd.findByPk = originalFindByPk;
      }
    }
  );
});

await test('rkpdController.update — caller OPD SAMA dengan target (non-SUPER_ADMIN) -> boundary MENGIZINKAN, tidak diblokir 403', async () => {
  delete require.cache[require.resolve('../controllers/rkpdController')];

  await withStubs(
    [[models.OpdPenanggungJawab, 'findOne', async ({ where }) => ({ id: 1, nama_opd: where.nama_opd })]],
    async () => {
      const controller = require('../controllers/rkpdController');

      const originalFindByPk = models.Rkpd.findByPk;
      models.Rkpd.findByPk = async () => ({
        id: 42,
        opd_id: 1,
        version: 1,
        async update() {},
      });

      try {
        const req = {
          params: { id: '42' },
          body: {},
          user: { role: 'ADMINISTRATOR', opd: 'Dinas Uji Coba A' },
        };
        const res = fakeRes();
        await controller.update(req, res);

        assert.notStrictEqual(res.statusCode, 403, `boundary TIDAK BOLEH menolak ketika caller dan target berada di OPD yang sama, didapat ${res.statusCode}, body=${JSON.stringify(res.body)}`);
        assert.notStrictEqual(res.body?.code, 'RKPD_OPD_FORBIDDEN');
      } finally {
        models.Rkpd.findByPk = originalFindByPk;
      }
    }
  );
});

await test('rkpdController.remove — caller OPD BEDA -> DITOLAK 403', async () => {
  delete require.cache[require.resolve('../controllers/rkpdController')];

  await withStubs(
    [[models.OpdPenanggungJawab, 'findOne', async ({ where }) => ({ id: 1, nama_opd: where.nama_opd })]],
    async () => {
      const controller = require('../controllers/rkpdController');

      const originalFindByPk = models.Rkpd.findByPk;
      models.Rkpd.findByPk = async () => ({ id: 42, opd_id: 2, version: 1 });

      try {
        const req = {
          params: { id: '42' },
          body: {},
          user: { role: 'ADMINISTRATOR', opd: 'Dinas Uji Coba A' },
        };
        const res = fakeRes();
        await controller.remove(req, res);

        assert.strictEqual(res.statusCode, 403, `harus 403, didapat ${res.statusCode}, body=${JSON.stringify(res.body)}`);
        assert.strictEqual(res.body?.code, 'RKPD_OPD_FORBIDDEN');
      } finally {
        models.Rkpd.findByPk = originalFindByPk;
      }
    }
  );
});

await test('rkpdController.updateStatus — caller OPD BEDA -> DITOLAK 403 (jalur processStatusTransition via updateStatus)', async () => {
  delete require.cache[require.resolve('../controllers/rkpdController')];

  await withStubs(
    [[models.OpdPenanggungJawab, 'findOne', async ({ where }) => ({ id: 1, nama_opd: where.nama_opd })]],
    async () => {
      const controller = require('../controllers/rkpdController');

      const originalFindByPk = models.Rkpd.findByPk;
      models.Rkpd.findByPk = async () => ({ id: 42, opd_id: 2, status: 'DRAFT', version: 1 });

      try {
        const req = {
          params: { id: '42' },
          body: { action: 'submit', change_reason_text: 'uji coba' },
          user: { role: 'ADMINISTRATOR', opd: 'Dinas Uji Coba A' },
        };
        const res = fakeRes();
        await controller.updateStatus(req, res);

        assert.strictEqual(res.statusCode, 403, `harus 403, didapat ${res.statusCode}, body=${JSON.stringify(res.body)}`);
        assert.strictEqual(res.body?.code, 'RKPD_OPD_FORBIDDEN');
      } finally {
        models.Rkpd.findByPk = originalFindByPk;
      }
    }
  );
});

await test('rkpdController.runStatusAction — caller OPD BEDA -> DITOLAK 403 (membuktikan common enforcement point processStatusTransition juga menutup jalur shortcut action)', async () => {
  delete require.cache[require.resolve('../controllers/rkpdController')];

  await withStubs(
    [[models.OpdPenanggungJawab, 'findOne', async ({ where }) => ({ id: 1, nama_opd: where.nama_opd })]],
    async () => {
      const controller = require('../controllers/rkpdController');

      const originalFindByPk = models.Rkpd.findByPk;
      models.Rkpd.findByPk = async () => ({ id: 42, opd_id: 2, status: 'DRAFT', version: 1 });

      try {
        const req = {
          params: { id: '42', action: 'submit' },
          body: { change_reason_text: 'uji coba' },
          user: { role: 'ADMINISTRATOR', opd: 'Dinas Uji Coba A' },
        };
        const res = fakeRes();
        await controller.runStatusAction(req, res);

        assert.strictEqual(res.statusCode, 403, `harus 403, didapat ${res.statusCode}, body=${JSON.stringify(res.body)}`);
        assert.strictEqual(res.body?.code, 'RKPD_OPD_FORBIDDEN');
      } finally {
        models.Rkpd.findByPk = originalFindByPk;
      }
    }
  );
});

await test('rkpdController — SUPER_ADMIN dikecualikan dari boundary OPD workflow transition (otoritas tenant-wide)', async () => {
  delete require.cache[require.resolve('../controllers/rkpdController')];

  const controller = require('../controllers/rkpdController');
  const originalFindByPk = models.Rkpd.findByPk;
  models.Rkpd.findByPk = async () => ({ id: 42, opd_id: 2, status: 'DRAFT', version: 1 });

  try {
    const req = {
      params: { id: '42' },
      body: { action: 'submit', change_reason_text: 'uji coba' },
      user: { role: 'SUPER_ADMIN', opd: 'Dinas Manapun' },
    };
    const res = fakeRes();
    await controller.updateStatus(req, res);

    assert.notStrictEqual(res.statusCode, 403, `SUPER_ADMIN tidak boleh diblokir boundary OPD, didapat ${res.statusCode}, body=${JSON.stringify(res.body)}`);
    assert.notStrictEqual(res.body?.code, 'RKPD_OPD_FORBIDDEN');
  } finally {
    models.Rkpd.findByPk = originalFindByPk;
  }
});

await test('boundary OPD RKPD — resolusi kepemilikan gagal (error internal) -> FAIL CLOSED 503', async () => {
  delete require.cache[require.resolve('../controllers/rkpdController')];

  await withStubs(
    [[models.OpdPenanggungJawab, 'findOne', async () => {
      throw new Error('simulated DB error saat resolusi kepemilikan OPD');
    }]],
    async () => {
      const controller = require('../controllers/rkpdController');

      const originalFindByPk = models.Rkpd.findByPk;
      models.Rkpd.findByPk = async () => ({ id: 42, opd_id: 2, status: 'DRAFT', version: 1 });

      try {
        const req = {
          params: { id: '42' },
          body: { action: 'submit', change_reason_text: 'uji coba' },
          user: { role: 'ADMINISTRATOR', opd: 'Dinas Uji Coba A' },
        };
        const res = fakeRes();
        await controller.updateStatus(req, res);

        assert.strictEqual(res.statusCode, 503, `harus fail-closed 503, didapat ${res.statusCode}, body=${JSON.stringify(res.body)}`);
        assert.strictEqual(res.body?.code, 'RKPD_OPD_BOUNDARY_UNAVAILABLE');
      } finally {
        models.Rkpd.findByPk = originalFindByPk;
      }
    }
  );
});

console.log('\n=== S5-05: realisasiIndikatorRenstraController.js — boundary OPD pada upsert ===');

await test('upsert — caller OPD BEDA dari target indikator -> DITOLAK 403, RealisasiIndikatorRenstra.findOrCreate TIDAK dipanggil', async () => {
  delete require.cache[require.resolve('../controllers/realisasiIndikatorRenstraController')];

  const controller = require('../controllers/realisasiIndikatorRenstraController');

  let findOrCreateCalled = false;
  const originalIndikatorFindByPk = models.IndikatorRenstra.findByPk;
  const originalFindOrCreate = models.RealisasiIndikatorRenstra.findOrCreate;
  models.IndikatorRenstra.findByPk = async () => ({
    id: 7,
    renstra_id: 2,
    renstra: { id: 2, nama_opd: 'Dinas Uji Coba B' },
  });
  models.RealisasiIndikatorRenstra.findOrCreate = async () => {
    findOrCreateCalled = true;
    return [{ id: 1, async update() {} }];
  };

  try {
    const req = {
      body: { indikator_renstra_id: 7, tahun: '2026', nilai_realisasi: 88.5 },
      user: { role: 'ADMINISTRATOR', opd: 'Dinas Uji Coba A' },
    };
    const res = fakeRes();
    await controller.upsert(req, res);

    assert.strictEqual(res.statusCode, 403, `harus 403, didapat ${res.statusCode}, body=${JSON.stringify(res.body)}`);
    assert.strictEqual(res.body?.code, 'REALISASI_INDIKATOR_RENSTRA_OPD_FORBIDDEN');
    assert.strictEqual(findOrCreateCalled, false, 'RealisasiIndikatorRenstra.findOrCreate() TIDAK BOLEH dipanggil ketika boundary OPD menolak');
  } finally {
    models.IndikatorRenstra.findByPk = originalIndikatorFindByPk;
    models.RealisasiIndikatorRenstra.findOrCreate = originalFindOrCreate;
  }
});

await test('upsert — caller OPD SAMA dengan target indikator (non-SUPER_ADMIN) -> boundary MENGIZINKAN, tidak diblokir 403', async () => {
  delete require.cache[require.resolve('../controllers/realisasiIndikatorRenstraController')];

  const controller = require('../controllers/realisasiIndikatorRenstraController');

  const originalIndikatorFindByPk = models.IndikatorRenstra.findByPk;
  const originalFindOrCreate = models.RealisasiIndikatorRenstra.findOrCreate;
  models.IndikatorRenstra.findByPk = async () => ({
    id: 7,
    renstra_id: 1,
    renstra: { id: 1, nama_opd: 'Dinas Uji Coba A' },
  });
  models.RealisasiIndikatorRenstra.findOrCreate = async () => [
    { id: 1, async update() {} },
  ];

  try {
    const req = {
      body: { indikator_renstra_id: 7, tahun: '2026', nilai_realisasi: 88.5 },
      user: { role: 'ADMINISTRATOR', opd: 'Dinas Uji Coba A' },
    };
    const res = fakeRes();
    await controller.upsert(req, res);

    assert.notStrictEqual(res.statusCode, 403, `boundary TIDAK BOLEH menolak ketika caller dan target indikator berada di OPD yang sama, didapat ${res.statusCode}, body=${JSON.stringify(res.body)}`);
    assert.notStrictEqual(res.body?.code, 'REALISASI_INDIKATOR_RENSTRA_OPD_FORBIDDEN');
  } finally {
    models.IndikatorRenstra.findByPk = originalIndikatorFindByPk;
    models.RealisasiIndikatorRenstra.findOrCreate = originalFindOrCreate;
  }
});

await test('upsert — SUPER_ADMIN dikecualikan dari boundary OPD (otoritas tenant-wide)', async () => {
  delete require.cache[require.resolve('../controllers/realisasiIndikatorRenstraController')];

  const controller = require('../controllers/realisasiIndikatorRenstraController');

  const originalIndikatorFindByPk = models.IndikatorRenstra.findByPk;
  const originalFindOrCreate = models.RealisasiIndikatorRenstra.findOrCreate;
  models.IndikatorRenstra.findByPk = async () => ({
    id: 7,
    renstra_id: 2,
    renstra: { id: 2, nama_opd: 'Dinas Uji Coba B' },
  });
  models.RealisasiIndikatorRenstra.findOrCreate = async () => [
    { id: 1, async update() {} },
  ];

  try {
    const req = {
      body: { indikator_renstra_id: 7, tahun: '2026', nilai_realisasi: 88.5 },
      user: { role: 'SUPER_ADMIN', opd: 'Dinas Manapun' },
    };
    const res = fakeRes();
    await controller.upsert(req, res);

    assert.notStrictEqual(res.statusCode, 403, `SUPER_ADMIN tidak boleh diblokir boundary OPD, didapat ${res.statusCode}, body=${JSON.stringify(res.body)}`);
    assert.notStrictEqual(res.body?.code, 'REALISASI_INDIKATOR_RENSTRA_OPD_FORBIDDEN');
  } finally {
    models.IndikatorRenstra.findByPk = originalIndikatorFindByPk;
    models.RealisasiIndikatorRenstra.findOrCreate = originalFindOrCreate;
  }
});

await test('upsert — resolusi kepemilikan gagal (error internal) -> FAIL CLOSED 503, RealisasiIndikatorRenstra.findOrCreate TIDAK dipanggil', async () => {
  delete require.cache[require.resolve('../controllers/realisasiIndikatorRenstraController')];

  const controller = require('../controllers/realisasiIndikatorRenstraController');

  let findOrCreateCalled = false;
  const originalIndikatorFindByPk = models.IndikatorRenstra.findByPk;
  const originalFindOrCreate = models.RealisasiIndikatorRenstra.findOrCreate;
  models.IndikatorRenstra.findByPk = async () => {
    throw new Error('simulated DB error saat resolusi kepemilikan OPD');
  };
  models.RealisasiIndikatorRenstra.findOrCreate = async () => {
    findOrCreateCalled = true;
    return [{ id: 1, async update() {} }];
  };

  try {
    const req = {
      body: { indikator_renstra_id: 7, tahun: '2026', nilai_realisasi: 88.5 },
      user: { role: 'ADMINISTRATOR', opd: 'Dinas Uji Coba A' },
    };
    const res = fakeRes();
    await controller.upsert(req, res);

    assert.strictEqual(res.statusCode, 503, `harus fail-closed 503, didapat ${res.statusCode}, body=${JSON.stringify(res.body)}`);
    assert.strictEqual(res.body?.code, 'REALISASI_INDIKATOR_RENSTRA_OPD_BOUNDARY_UNAVAILABLE');
    assert.strictEqual(findOrCreateCalled, false, 'RealisasiIndikatorRenstra.findOrCreate() TIDAK BOLEH dipanggil ketika resolusi kepemilikan gagal (fail-closed)');
  } finally {
    models.IndikatorRenstra.findByPk = originalIndikatorFindByPk;
    models.RealisasiIndikatorRenstra.findOrCreate = originalFindOrCreate;
  }
});



console.log('\n=== S6-01: renstra_opdController.js — boundary OPD pada update/setAktif/recall ===');

await test('renstra_opdController.update — caller OPD BEDA dari target -> DITOLAK 403, RenstraOPD.update TIDAK dipanggil', async () => {
  delete require.cache[require.resolve('../controllers/renstra_opdController')];

  await withStubs(
    [[models.OpdPenanggungJawab, 'findOne', async ({ where }) => ({ id: 1, nama_opd: where.nama_opd })]],
    async () => {
      const controller = require('../controllers/renstra_opdController');

      let updateCalled = false;
      const originalFindByPk = models.RenstraOPD.findByPk;
      const originalUpdate = models.RenstraOPD.update;
      models.RenstraOPD.findByPk = async () => ({ id: 7, opd_id: 2, is_aktif: false });
      models.RenstraOPD.update = async () => {
        updateCalled = true;
        return [1];
      };

      try {
        const req = {
          params: { id: '7' },
          body: { opd_id: 2 },
          user: { role: 'ADMINISTRATOR', opd: 'Dinas Uji Coba A' },
        };
        const res = fakeRes();
        await controller.update(req, res);

        assert.strictEqual(res.statusCode, 403, `harus 403, didapat ${res.statusCode}, body=${JSON.stringify(res.body)}`);
        assert.strictEqual(res.body?.code, 'RENSTRA_OPD_FORBIDDEN');
        assert.strictEqual(updateCalled, false, 'RenstraOPD.update() TIDAK BOLEH dipanggil ketika boundary OPD menolak');
      } finally {
        models.RenstraOPD.findByPk = originalFindByPk;
        models.RenstraOPD.update = originalUpdate;
      }
    }
  );
});

await test('renstra_opdController.update — caller OPD SAMA dengan target (non-SUPER_ADMIN) -> boundary MENGIZINKAN, tidak diblokir 403', async () => {
  delete require.cache[require.resolve('../controllers/renstra_opdController')];

  await withStubs(
    [[models.OpdPenanggungJawab, 'findOne', async ({ where }) => ({ id: 1, nama_opd: where.nama_opd })],
     [models.OpdPenanggungJawab, 'findByPk', async () => ({ id: 1, nama_opd: 'Dinas Uji Coba A' })]],
    async () => {
      const controller = require('../controllers/renstra_opdController');

      const originalFindByPk = models.RenstraOPD.findByPk;
      const originalUpdate = models.RenstraOPD.update;
      models.RenstraOPD.findByPk = async () => ({ id: 7, opd_id: 1, is_aktif: false });
      models.RenstraOPD.update = async () => [1];

      try {
        const req = {
          params: { id: '7' },
          body: { opd_id: 1 },
          user: { role: 'ADMINISTRATOR', opd: 'Dinas Uji Coba A' },
        };
        const res = fakeRes();
        await controller.update(req, res);

        assert.notStrictEqual(res.statusCode, 403, `boundary TIDAK BOLEH menolak ketika caller dan target berada di OPD yang sama, didapat ${res.statusCode}, body=${JSON.stringify(res.body)}`);
        assert.notStrictEqual(res.body?.code, 'RENSTRA_OPD_FORBIDDEN');
        assert.notStrictEqual(res.body?.code, 'RENSTRA_OPD_REASSIGN_FORBIDDEN');
      } finally {
        models.RenstraOPD.findByPk = originalFindByPk;
        models.RenstraOPD.update = originalUpdate;
      }
    }
  );
});

await test('renstra_opdController.update — SUPER_ADMIN dikecualikan dari boundary OPD (otoritas tenant-wide)', async () => {
  delete require.cache[require.resolve('../controllers/renstra_opdController')];

  const controller = require('../controllers/renstra_opdController');
  const originalFindByPk = models.RenstraOPD.findByPk;
  const originalUpdate = models.RenstraOPD.update;
  const originalOpdFindByPk = models.OpdPenanggungJawab.findByPk;
  models.RenstraOPD.findByPk = async () => ({ id: 7, opd_id: 2, is_aktif: false });
  models.RenstraOPD.update = async () => [1];
  models.OpdPenanggungJawab.findByPk = async () => ({ id: 9, nama_opd: 'Dinas Manapun' });

  try {
    const req = {
      params: { id: '7' },
      body: { opd_id: 9 },
      user: { role: 'SUPER_ADMIN', opd: 'Dinas Manapun' },
    };
    const res = fakeRes();
    await controller.update(req, res);

    assert.notStrictEqual(res.statusCode, 403, `SUPER_ADMIN tidak boleh diblokir boundary OPD, didapat ${res.statusCode}, body=${JSON.stringify(res.body)}`);
    assert.notStrictEqual(res.body?.code, 'RENSTRA_OPD_FORBIDDEN');
    assert.notStrictEqual(res.body?.code, 'RENSTRA_OPD_REASSIGN_FORBIDDEN');
  } finally {
    models.RenstraOPD.findByPk = originalFindByPk;
    models.RenstraOPD.update = originalUpdate;
    models.OpdPenanggungJawab.findByPk = originalOpdFindByPk;
  }
});

await test('renstra_opdController.update — OPD-scoped ADMINISTRATOR pada record miliknya SENDIRI mencoba reassign opd_id ke OPD lain -> DITOLAK 403, RenstraOPD.update TIDAK dipanggil (ownership reassignment bypass guard)', async () => {
  delete require.cache[require.resolve('../controllers/renstra_opdController')];

  await withStubs(
    [[models.OpdPenanggungJawab, 'findOne', async ({ where }) => ({ id: 1, nama_opd: where.nama_opd })]],
    async () => {
      const controller = require('../controllers/renstra_opdController');

      let updateCalled = false;
      const originalFindByPk = models.RenstraOPD.findByPk;
      const originalUpdate = models.RenstraOPD.update;
      // Target record MILIK caller sendiri (opd_id: 1) -> boundary check LOLOS,
      // tapi req.body mencoba memindahkan ke opd_id: 99 (OPD lain).
      models.RenstraOPD.findByPk = async () => ({ id: 7, opd_id: 1, is_aktif: false });
      models.RenstraOPD.update = async () => {
        updateCalled = true;
        return [1];
      };

      try {
        const req = {
          params: { id: '7' },
          body: { opd_id: 99 },
          user: { role: 'ADMINISTRATOR', opd: 'Dinas Uji Coba A' },
        };
        const res = fakeRes();
        await controller.update(req, res);

        assert.strictEqual(res.statusCode, 403, `harus 403, didapat ${res.statusCode}, body=${JSON.stringify(res.body)}`);
        assert.strictEqual(res.body?.code, 'RENSTRA_OPD_REASSIGN_FORBIDDEN');
        assert.strictEqual(updateCalled, false, 'RenstraOPD.update() TIDAK BOLEH dipanggil ketika reassignment ditolak — ownership reassignment tidak boleh menjadi bypass otorisasi');
      } finally {
        models.RenstraOPD.findByPk = originalFindByPk;
        models.RenstraOPD.update = originalUpdate;
      }
    }
  );
});

await test('renstra_opdController.update — resolusi kepemilikan gagal (error internal) -> FAIL CLOSED 503, RenstraOPD.update TIDAK dipanggil', async () => {
  delete require.cache[require.resolve('../controllers/renstra_opdController')];

  await withStubs(
    [[models.OpdPenanggungJawab, 'findOne', async () => { throw new Error('Simulated transient DB error'); }]],
    async () => {
      const controller = require('../controllers/renstra_opdController');

      let updateCalled = false;
      const originalFindByPk = models.RenstraOPD.findByPk;
      const originalUpdate = models.RenstraOPD.update;
      models.RenstraOPD.findByPk = async () => ({ id: 7, opd_id: 2, is_aktif: false });
      models.RenstraOPD.update = async () => {
        updateCalled = true;
      };

      try {
        const req = {
          params: { id: '7' },
          body: { opd_id: 2 },
          user: { role: 'ADMINISTRATOR', opd: 'Dinas Uji Coba A' },
        };
        const res = fakeRes();
        await controller.update(req, res);

        assert.strictEqual(res.statusCode, 503, `harus fail-closed 503, didapat ${res.statusCode}, body=${JSON.stringify(res.body)}`);
        assert.strictEqual(res.body?.code, 'RENSTRA_OPD_BOUNDARY_UNAVAILABLE');
        assert.strictEqual(updateCalled, false, 'RenstraOPD.update() TIDAK BOLEH dipanggil ketika resolusi kepemilikan gagal (fail-closed)');
      } finally {
        models.RenstraOPD.findByPk = originalFindByPk;
        models.RenstraOPD.update = originalUpdate;
      }
    }
  );
});

await test('renstra_opdController.setAktif — caller OPD BEDA dari target -> DITOLAK 403, tidak ada mutasi is_aktif yang jalan', async () => {
  delete require.cache[require.resolve('../controllers/renstra_opdController')];

  await withStubs(
    [[models.OpdPenanggungJawab, 'findOne', async ({ where }) => ({ id: 1, nama_opd: where.nama_opd })]],
    async () => {
      const controller = require('../controllers/renstra_opdController');

      let updateCalled = false;
      const originalFindByPk = models.RenstraOPD.findByPk;
      const originalUpdate = models.RenstraOPD.update;
      models.RenstraOPD.findByPk = async () => ({ id: 7, opd_id: 2, is_aktif: false });
      models.RenstraOPD.update = async () => {
        updateCalled = true;
      };

      try {
        const req = {
          params: { id: '7' },
          body: {},
          user: { role: 'ADMINISTRATOR', opd: 'Dinas Uji Coba A' },
        };
        const res = fakeRes();
        await controller.setAktif(req, res);

        assert.strictEqual(res.statusCode, 403, `harus 403, didapat ${res.statusCode}, body=${JSON.stringify(res.body)}`);
        assert.strictEqual(res.body?.code, 'RENSTRA_OPD_FORBIDDEN');
        assert.strictEqual(updateCalled, false, 'RenstraOPD.update() (deaktivasi maupun aktivasi) TIDAK BOLEH dipanggil ketika target milik OPD lain');
      } finally {
        models.RenstraOPD.findByPk = originalFindByPk;
        models.RenstraOPD.update = originalUpdate;
      }
    }
  );
});

await test('renstra_opdController.setAktif — caller OPD SAMA dengan target (non-SUPER_ADMIN) -> boundary MENGIZINKAN aktivasi berjalan', async () => {
  delete require.cache[require.resolve('../controllers/renstra_opdController')];

  await withStubs(
    [[models.OpdPenanggungJawab, 'findOne', async ({ where }) => ({ id: 1, nama_opd: where.nama_opd })]],
    async () => {
      const controller = require('../controllers/renstra_opdController');

      let activateCalled = false;
      const originalFindByPk = models.RenstraOPD.findByPk;
      const originalUpdate = models.RenstraOPD.update;
      models.RenstraOPD.findByPk = async () => ({ id: 7, opd_id: 1, is_aktif: false });
      models.RenstraOPD.update = async (payload) => {
        if (payload.is_aktif === true) activateCalled = true;
        return [1];
      };

      try {
        const req = {
          params: { id: '7' },
          body: {},
          user: { role: 'ADMINISTRATOR', opd: 'Dinas Uji Coba A' },
        };
        const res = fakeRes();
        await controller.setAktif(req, res);

        assert.notStrictEqual(res.statusCode, 403, `boundary TIDAK BOLEH menolak ketika caller dan target berada di OPD yang sama, didapat ${res.statusCode}, body=${JSON.stringify(res.body)}`);
        assert.strictEqual(activateCalled, true, 'aktivasi (is_aktif:true) HARUS tetap berjalan untuk same-OPD ADMINISTRATOR yang berwenang');
      } finally {
        models.RenstraOPD.findByPk = originalFindByPk;
        models.RenstraOPD.update = originalUpdate;
      }
    }
  );
});

await test('renstra_opdController.setAktif — OPD-scoped ADMINISTRATOR: deaktivasi massal HARUS di-scope ke opd_id milik caller (bukan tenant-wide {where:{}})', async () => {
  delete require.cache[require.resolve('../controllers/renstra_opdController')];

  await withStubs(
    [[models.OpdPenanggungJawab, 'findOne', async ({ where }) => ({ id: 1, nama_opd: where.nama_opd })]],
    async () => {
      const controller = require('../controllers/renstra_opdController');

      let deactivateWhereCaptured = null;
      const originalFindByPk = models.RenstraOPD.findByPk;
      const originalUpdate = models.RenstraOPD.update;
      models.RenstraOPD.findByPk = async () => ({ id: 7, opd_id: 1, is_aktif: false });
      models.RenstraOPD.update = async (payload, options) => {
        if (payload.is_aktif === false) deactivateWhereCaptured = options.where;
        return [1];
      };

      try {
        const req = {
          params: { id: '7' },
          body: {},
          user: { role: 'ADMINISTRATOR', opd: 'Dinas Uji Coba A' },
        };
        const res = fakeRes();
        await controller.setAktif(req, res);

        assert.notStrictEqual(deactivateWhereCaptured, null, 'query deaktivasi harus tertangkap');
        assert.deepStrictEqual(
          deactivateWhereCaptured,
          { opd_id: 1 },
          `deaktivasi massal HARUS di-scope ke opd_id milik caller (opd_id:1), bukan tenant-wide {where:{}} — didapat ${JSON.stringify(deactivateWhereCaptured)}. Ini mencegah ADMINISTRATOR OPD lain terdampak saat OPD-scoped admin mengaktifkan Renstra miliknya sendiri.`
        );
      } finally {
        models.RenstraOPD.findByPk = originalFindByPk;
        models.RenstraOPD.update = originalUpdate;
      }
    }
  );
});

await test('renstra_opdController.setAktif — SUPER_ADMIN dikecualikan dari boundary OPD, deaktivasi tetap tenant-wide {where:{}} (perilaku existing dipertahankan)', async () => {
  delete require.cache[require.resolve('../controllers/renstra_opdController')];

  const controller = require('../controllers/renstra_opdController');

  let deactivateWhereCaptured = 'NOT_CALLED';
  const originalFindByPk = models.RenstraOPD.findByPk;
  const originalUpdate = models.RenstraOPD.update;
  models.RenstraOPD.findByPk = async () => ({ id: 7, opd_id: 2, is_aktif: false });
  models.RenstraOPD.update = async (payload, options) => {
    if (payload.is_aktif === false) deactivateWhereCaptured = options.where;
    return [1];
  };

  try {
    const req = {
      params: { id: '7' },
      body: {},
      user: { role: 'SUPER_ADMIN', opd: 'Dinas Manapun' },
    };
    const res = fakeRes();
    await controller.setAktif(req, res);

    assert.notStrictEqual(res.statusCode, 403, `SUPER_ADMIN tidak boleh diblokir boundary OPD, didapat ${res.statusCode}, body=${JSON.stringify(res.body)}`);
    assert.deepStrictEqual(
      deactivateWhereCaptured,
      {},
      `SUPER_ADMIN HARUS mempertahankan perilaku deaktivasi tenant-wide existing ({where:{}}), didapat ${JSON.stringify(deactivateWhereCaptured)}`
    );
  } finally {
    models.RenstraOPD.findByPk = originalFindByPk;
    models.RenstraOPD.update = originalUpdate;
  }
});

await test('renstra_opdController.setAktif — resolusi kepemilikan gagal (error internal) -> FAIL CLOSED 503, tidak ada mutasi is_aktif yang jalan', async () => {
  delete require.cache[require.resolve('../controllers/renstra_opdController')];

  await withStubs(
    [[models.OpdPenanggungJawab, 'findOne', async () => { throw new Error('Simulated transient DB error'); }]],
    async () => {
      const controller = require('../controllers/renstra_opdController');

      let updateCalled = false;
      const originalFindByPk = models.RenstraOPD.findByPk;
      const originalUpdate = models.RenstraOPD.update;
      models.RenstraOPD.findByPk = async () => ({ id: 7, opd_id: 2, is_aktif: false });
      models.RenstraOPD.update = async () => {
        updateCalled = true;
      };

      try {
        const req = {
          params: { id: '7' },
          body: {},
          user: { role: 'ADMINISTRATOR', opd: 'Dinas Uji Coba A' },
        };
        const res = fakeRes();
        await controller.setAktif(req, res);

        assert.strictEqual(res.statusCode, 503, `harus fail-closed 503, didapat ${res.statusCode}, body=${JSON.stringify(res.body)}`);
        assert.strictEqual(res.body?.code, 'RENSTRA_OPD_BOUNDARY_UNAVAILABLE');
        assert.strictEqual(updateCalled, false, 'RenstraOPD.update() TIDAK BOLEH dipanggil ketika resolusi kepemilikan gagal (fail-closed)');
      } finally {
        models.RenstraOPD.findByPk = originalFindByPk;
        models.RenstraOPD.update = originalUpdate;
      }
    }
  );
});

await test('renstra_opdController.recall — caller OPD BEDA dari target -> DITOLAK 403, recallRenstraOpd TIDAK dipanggil', async () => {
  delete require.cache[require.resolve('../controllers/renstra_opdController')];
  delete require.cache[require.resolve('../services/renstraOpdRecallService')];

  await withStubs(
    [[models.OpdPenanggungJawab, 'findOne', async ({ where }) => ({ id: 1, nama_opd: where.nama_opd })]],
    async () => {
      const recallService = require('../services/renstraOpdRecallService');
      const originalRecall = recallService.recallRenstraOpd;
      let recallCalled = false;
      recallService.recallRenstraOpd = async () => {
        recallCalled = true;
        return {};
      };

      const controller = require('../controllers/renstra_opdController');

      const originalFindByPk = models.RenstraOPD.findByPk;
      models.RenstraOPD.findByPk = async () => ({ id: 7, opd_id: 2, is_aktif: false });

      try {
        const req = {
          params: { id: '7' },
          body: {},
          user: { role: 'ADMINISTRATOR', opd: 'Dinas Uji Coba A' },
        };
        const res = fakeRes();
        await controller.recall(req, res);

        assert.strictEqual(res.statusCode, 403, `harus 403, didapat ${res.statusCode}, body=${JSON.stringify(res.body)}`);
        assert.strictEqual(res.body?.code, 'RENSTRA_OPD_FORBIDDEN');
        assert.strictEqual(recallCalled, false, 'recallRenstraOpd() TIDAK BOLEH dipanggil ketika boundary OPD menolak');
      } finally {
        models.RenstraOPD.findByPk = originalFindByPk;
        recallService.recallRenstraOpd = originalRecall;
      }
    }
  );
});

await test('renstra_opdController.recall — caller OPD SAMA dengan target (non-SUPER_ADMIN) -> boundary MENGIZINKAN, recallRenstraOpd dipanggil', async () => {
  delete require.cache[require.resolve('../controllers/renstra_opdController')];
  delete require.cache[require.resolve('../services/renstraOpdRecallService')];

  await withStubs(
    [[models.OpdPenanggungJawab, 'findOne', async ({ where }) => ({ id: 1, nama_opd: where.nama_opd })]],
    async () => {
      const recallService = require('../services/renstraOpdRecallService');
      const originalRecall = recallService.recallRenstraOpd;
      let recallCalled = false;
      recallService.recallRenstraOpd = async () => {
        recallCalled = true;
        return { ok: true };
      };

      const controller = require('../controllers/renstra_opdController');

      const originalFindByPk = models.RenstraOPD.findByPk;
      models.RenstraOPD.findByPk = async () => ({ id: 7, opd_id: 1, is_aktif: false });

      try {
        const req = {
          params: { id: '7' },
          body: {},
          user: { role: 'ADMINISTRATOR', opd: 'Dinas Uji Coba A' },
        };
        const res = fakeRes();
        await controller.recall(req, res);

        assert.notStrictEqual(res.statusCode, 403, `boundary TIDAK BOLEH menolak ketika caller dan target berada di OPD yang sama, didapat ${res.statusCode}, body=${JSON.stringify(res.body)}`);
        assert.strictEqual(recallCalled, true, 'recallRenstraOpd() HARUS tetap dipanggil untuk same-OPD ADMINISTRATOR yang berwenang');
      } finally {
        models.RenstraOPD.findByPk = originalFindByPk;
        recallService.recallRenstraOpd = originalRecall;
      }
    }
  );
});

await test('renstra_opdController.recall — SUPER_ADMIN dikecualikan dari boundary OPD (otoritas tenant-wide)', async () => {
  delete require.cache[require.resolve('../controllers/renstra_opdController')];
  delete require.cache[require.resolve('../services/renstraOpdRecallService')];

  const recallService = require('../services/renstraOpdRecallService');
  const originalRecall = recallService.recallRenstraOpd;
  let recallCalled = false;
  recallService.recallRenstraOpd = async () => {
    recallCalled = true;
    return { ok: true };
  };

  const controller = require('../controllers/renstra_opdController');
  const originalFindByPk = models.RenstraOPD.findByPk;
  models.RenstraOPD.findByPk = async () => ({ id: 7, opd_id: 2, is_aktif: false });

  try {
    const req = {
      params: { id: '7' },
      body: {},
      user: { role: 'SUPER_ADMIN', opd: 'Dinas Manapun' },
    };
    const res = fakeRes();
    await controller.recall(req, res);

    assert.notStrictEqual(res.statusCode, 403, `SUPER_ADMIN tidak boleh diblokir boundary OPD, didapat ${res.statusCode}, body=${JSON.stringify(res.body)}`);
    assert.strictEqual(recallCalled, true, 'recallRenstraOpd() HARUS tetap dipanggil untuk SUPER_ADMIN (tenant-wide)');
  } finally {
    models.RenstraOPD.findByPk = originalFindByPk;
    recallService.recallRenstraOpd = originalRecall;
  }
});

await test('renstra_opdController.recall — resolusi kepemilikan gagal (error internal) -> FAIL CLOSED 503, recallRenstraOpd TIDAK dipanggil', async () => {
  delete require.cache[require.resolve('../controllers/renstra_opdController')];
  delete require.cache[require.resolve('../services/renstraOpdRecallService')];

  await withStubs(
    [[models.OpdPenanggungJawab, 'findOne', async () => { throw new Error('Simulated transient DB error'); }]],
    async () => {
      const recallService = require('../services/renstraOpdRecallService');
      const originalRecall = recallService.recallRenstraOpd;
      let recallCalled = false;
      recallService.recallRenstraOpd = async () => {
        recallCalled = true;
        return {};
      };

      const controller = require('../controllers/renstra_opdController');
      const originalFindByPk = models.RenstraOPD.findByPk;
      models.RenstraOPD.findByPk = async () => ({ id: 7, opd_id: 2, is_aktif: false });

      try {
        const req = {
          params: { id: '7' },
          body: {},
          user: { role: 'ADMINISTRATOR', opd: 'Dinas Uji Coba A' },
        };
        const res = fakeRes();
        await controller.recall(req, res);

        assert.strictEqual(res.statusCode, 503, `harus fail-closed 503, didapat ${res.statusCode}, body=${JSON.stringify(res.body)}`);
        assert.strictEqual(res.body?.code, 'RENSTRA_OPD_BOUNDARY_UNAVAILABLE');
        assert.strictEqual(recallCalled, false, 'recallRenstraOpd() TIDAK BOLEH dipanggil ketika resolusi kepemilikan gagal (fail-closed)');
      } finally {
        models.RenstraOPD.findByPk = originalFindByPk;
        recallService.recallRenstraOpd = originalRecall;
      }
    }
  );
});

console.log('\n=== S6-02: renstra_subkegiatanController.js — boundary OPD pada update ===');

await test('renstra_subkegiatanController.update — caller OPD BEDA dari target -> DITOLAK 403, existing.update TIDAK dipanggil', async () => {
  delete require.cache[require.resolve('../controllers/renstra_subkegiatanController')];

  const controller = require('../controllers/renstra_subkegiatanController');

  let updateCalled = false;
  const originalFindByPk = models.RenstraSubkegiatan.findByPk;
  models.RenstraSubkegiatan.findByPk = async () => ({
    id: 12,
    nama_opd: 'Dinas Uji Coba B',
    renstra_program_id: 1,
    kegiatan_id: 1,
    sub_kegiatan_id: 1,
    update: async () => {
      updateCalled = true;
    },
  });

  try {
    const req = {
      params: { id: '12' },
      body: {},
      user: { role: 'ADMINISTRATOR', opd: 'Dinas Uji Coba A' },
    };
    const res = fakeRes();
    await controller.update(req, res);

    assert.strictEqual(res.statusCode, 403, `harus 403, didapat ${res.statusCode}, body=${JSON.stringify(res.body)}`);
    assert.strictEqual(res.body?.code, 'RENSTRA_SUBKEGIATAN_OPD_FORBIDDEN');
    assert.strictEqual(updateCalled, false, 'existing.update() TIDAK BOLEH dipanggil ketika boundary OPD menolak');
  } finally {
    models.RenstraSubkegiatan.findByPk = originalFindByPk;
  }
});

await test('renstra_subkegiatanController.update — caller OPD SAMA dengan target (non-SUPER_ADMIN) -> boundary MENGIZINKAN, existing.update dipanggil', async () => {
  delete require.cache[require.resolve('../controllers/renstra_subkegiatanController')];

  await withStubs(
    [
      [models.RenstraProgram, 'findByPk', async () => ({ id: 1 })],
      [models.RenstraKegiatan, 'findByPk', async () => ({ id: 1, program_id: 1, rpjmd_kegiatan_id: 1 })],
      [models.SubKegiatan, 'findByPk', async () => ({ id: 1, kegiatan_id: 1, kode_sub_kegiatan: 'X', nama_sub_kegiatan: 'Y' })],
    ],
    async () => {
      const controller = require('../controllers/renstra_subkegiatanController');

      let updateCalled = false;
      const originalFindByPk = models.RenstraSubkegiatan.findByPk;
      const originalFindOne = models.RenstraSubkegiatan.findOne;
      models.RenstraSubkegiatan.findByPk = async () => ({
        id: 12,
        nama_opd: 'Dinas Uji Coba A',
        renstra_program_id: 1,
        kegiatan_id: 1,
        sub_kegiatan_id: 1,
        update: async () => {
          updateCalled = true;
        },
      });
      models.RenstraSubkegiatan.findOne = async () => null;

      try {
        const req = {
          params: { id: '12' },
          body: { renstra_program_id: 1, kegiatan_id: 1, sub_kegiatan_id: 1 },
          user: { role: 'ADMINISTRATOR', opd: 'Dinas Uji Coba A' },
        };
        const res = fakeRes();
        await controller.update(req, res);

        assert.notStrictEqual(res.statusCode, 403, `boundary TIDAK BOLEH menolak ketika caller dan target berada di OPD yang sama, didapat ${res.statusCode}, body=${JSON.stringify(res.body)}`);
        assert.strictEqual(updateCalled, true, 'existing.update() HARUS tetap dipanggil untuk same-OPD ADMINISTRATOR yang berwenang');
      } finally {
        models.RenstraSubkegiatan.findByPk = originalFindByPk;
        models.RenstraSubkegiatan.findOne = originalFindOne;
      }
    }
  );
});

await test('renstra_subkegiatanController.update — OPD-scoped ADMINISTRATOR pada record miliknya SENDIRI mencoba reassign nama_opd ke OPD lain -> DITOLAK 403, existing.update TIDAK dipanggil (ownership reassignment bypass guard)', async () => {
  delete require.cache[require.resolve('../controllers/renstra_subkegiatanController')];

  const controller = require('../controllers/renstra_subkegiatanController');

  let updateCalled = false;
  const originalFindByPk = models.RenstraSubkegiatan.findByPk;
  models.RenstraSubkegiatan.findByPk = async () => ({
    id: 12,
    nama_opd: 'Dinas Uji Coba A',
    renstra_program_id: 1,
    kegiatan_id: 1,
    sub_kegiatan_id: 1,
    update: async () => {
      updateCalled = true;
    },
  });

  try {
    const req = {
      params: { id: '12' },
      body: { nama_opd: 'Dinas Uji Coba LAIN' },
      user: { role: 'ADMINISTRATOR', opd: 'Dinas Uji Coba A' },
    };
    const res = fakeRes();
    await controller.update(req, res);

    assert.strictEqual(res.statusCode, 403, `harus 403, didapat ${res.statusCode}, body=${JSON.stringify(res.body)}`);
    assert.strictEqual(res.body?.code, 'RENSTRA_SUBKEGIATAN_REASSIGN_FORBIDDEN');
    assert.strictEqual(updateCalled, false, 'existing.update() TIDAK BOLEH dipanggil ketika reassignment ditolak — ownership reassignment tidak boleh menjadi bypass otorisasi');
  } finally {
    models.RenstraSubkegiatan.findByPk = originalFindByPk;
  }
});

await test('renstra_subkegiatanController.update — SUPER_ADMIN dikecualikan dari boundary OPD (otoritas tenant-wide), termasuk reassignment nama_opd', async () => {
  delete require.cache[require.resolve('../controllers/renstra_subkegiatanController')];

  await withStubs(
    [
      [models.RenstraProgram, 'findByPk', async () => ({ id: 1 })],
      [models.RenstraKegiatan, 'findByPk', async () => ({ id: 1, program_id: 1, rpjmd_kegiatan_id: 1 })],
      [models.SubKegiatan, 'findByPk', async () => ({ id: 1, kegiatan_id: 1, kode_sub_kegiatan: 'X', nama_sub_kegiatan: 'Y' })],
    ],
    async () => {
      const controller = require('../controllers/renstra_subkegiatanController');

      let updateCalled = false;
      const originalFindByPk = models.RenstraSubkegiatan.findByPk;
      const originalFindOne = models.RenstraSubkegiatan.findOne;
      models.RenstraSubkegiatan.findByPk = async () => ({
        id: 12,
        nama_opd: 'Dinas Uji Coba B',
        renstra_program_id: 1,
        kegiatan_id: 1,
        sub_kegiatan_id: 1,
        update: async () => {
          updateCalled = true;
        },
      });
      models.RenstraSubkegiatan.findOne = async () => null;

      try {
        const req = {
          params: { id: '12' },
          body: { renstra_program_id: 1, kegiatan_id: 1, sub_kegiatan_id: 1, nama_opd: 'Dinas Lain' },
          user: { role: 'SUPER_ADMIN', opd: 'Dinas Manapun' },
        };
        const res = fakeRes();
        await controller.update(req, res);

        assert.notStrictEqual(res.statusCode, 403, `SUPER_ADMIN tidak boleh diblokir boundary OPD, didapat ${res.statusCode}, body=${JSON.stringify(res.body)}`);
        assert.strictEqual(updateCalled, true, 'existing.update() HARUS tetap dipanggil untuk SUPER_ADMIN (termasuk reassignment nama_opd)');
      } finally {
        models.RenstraSubkegiatan.findByPk = originalFindByPk;
        models.RenstraSubkegiatan.findOne = originalFindOne;
      }
    }
  );
});

console.log('\n=== S6 — renstra_opdController.delete & renstra_subkegiatanController.delete: NO_CHANGE_REQUIRED (SUPER_ADMIN-only route, bukan OPD-isolation defect) ===');

await test('renstra_opdController.delete tidak dimodifikasi Sprint 6 — route DELETE /:id tetap SUPER_ADMIN-only (tenant-wide by design, bukan celah isolasi OPD)', async () => {
  delete require.cache[require.resolve('../controllers/renstra_opdController')];
  const controller = require('../controllers/renstra_opdController');
  assert.strictEqual(typeof controller.delete, 'function', 'exports.delete harus tetap ada dan tidak diubah Sprint 6');
});

await test('renstra_subkegiatanController.delete tidak dimodifikasi Sprint 6 — route DELETE /:id tetap SUPER_ADMIN-only (tenant-wide by design, bukan celah isolasi OPD)', async () => {
  delete require.cache[require.resolve('../controllers/renstra_subkegiatanController')];
  const controller = require('../controllers/renstra_subkegiatanController');
  assert.strictEqual(typeof controller.delete, 'function', 'exports.delete harus tetap ada dan tidak diubah Sprint 6');
});


console.log('\n=== S7-R001/002: mrRiskService.updateRisk — boundary OPD (Risk-bounded, S7R helper reuse) ===');

await test('mrRiskService.updateRisk — caller OPD BEDA dari target -> DITOLAK 403, record.update TIDAK dipanggil', async () => {
  delete require.cache[require.resolve('../services/mr/mrRiskService')];
  delete require.cache[require.resolve('../services/mr/mrPlanningRiskService')];

  await withStubs(
    [[models.OpdPenanggungJawab, 'findOne', async ({ where }) => ({ id: 1, nama_opd: where.nama_opd })]],
    async () => {
      const mrRiskService = require('../services/mr/mrRiskService');

      const fakeT = { LOCK: { UPDATE: 'UPDATE' }, commit: async () => {}, rollback: async () => {} };
      const originalTransaction = models.sequelize.transaction;
      const originalFindByPk = models.MrPlanningRisk.findByPk;
      models.sequelize.transaction = async () => fakeT;

      let updateCalled = false;
      models.MrPlanningRisk.findByPk = async () => ({
        id: 5,
        opd_id: 2, // target milik OPD id=2
        status_revisi: 'draft',
        versi: 1,
        update: async () => {
          updateCalled = true;
        },
      });

      try {
        await mrRiskService.updateRisk({
          sequelize: models.sequelize,
          RiskModel: models.MrPlanningRisk,
          RiskHistoryModel: models.MrPlanningRiskHistory,
          models,
          id: 5,
          body: { nama_risiko: 'Updated' },
          userId: 5,
          request: { user: { role: 'ADMINISTRATOR', opd: 'Dinas Uji Coba A' } }, // resolves opd_id=1
        });
        assert.fail('updateRisk seharusnya melempar error boundary OPD, bukan sukses');
      } catch (error) {
        assert.strictEqual(error.status, 403, `harus 403, didapat ${error.status}, message=${error.message}`);
        assert.strictEqual(error.code, 'MR_PLANNING_RISK_OPD_FORBIDDEN');
        assert.strictEqual(updateCalled, false, 'record.update() TIDAK BOLEH dipanggil ketika boundary OPD menolak');
      } finally {
        models.sequelize.transaction = originalTransaction;
        models.MrPlanningRisk.findByPk = originalFindByPk;
      }
    }
  );
});

await test('mrRiskService.updateRisk — caller OPD SAMA dengan target -> boundary MENGIZINKAN (error lanjutan, jika ada, BUKAN kode boundary)', async () => {
  delete require.cache[require.resolve('../services/mr/mrRiskService')];
  delete require.cache[require.resolve('../services/mr/mrPlanningRiskService')];

  await withStubs(
    [[models.OpdPenanggungJawab, 'findOne', async ({ where }) => ({ id: 1, nama_opd: where.nama_opd })]],
    async () => {
      const mrRiskService = require('../services/mr/mrRiskService');

      const fakeT = { LOCK: { UPDATE: 'UPDATE' }, commit: async () => {}, rollback: async () => {} };
      const originalTransaction = models.sequelize.transaction;
      const originalFindByPk = models.MrPlanningRisk.findByPk;
      models.sequelize.transaction = async () => fakeT;
      models.MrPlanningRisk.findByPk = async () => ({
        id: 5,
        opd_id: 1, // target JUGA milik OPD id=1
        status_revisi: 'draft',
        versi: 1,
        update: async () => {},
      });

      try {
        await mrRiskService.updateRisk({
          sequelize: models.sequelize,
          RiskModel: models.MrPlanningRisk,
          RiskHistoryModel: models.MrPlanningRiskHistory,
          models,
          id: 5,
          body: { nama_risiko: 'Updated' },
          userId: 5,
          request: { user: { role: 'ADMINISTRATOR', opd: 'Dinas Uji Coba A' } },
        });
      } catch (error) {
        assert.notStrictEqual(
          error.code,
          'MR_PLANNING_RISK_OPD_FORBIDDEN',
          'boundary TIDAK BOLEH menolak ketika caller dan target berada di OPD yang sama'
        );
      } finally {
        models.sequelize.transaction = originalTransaction;
        models.MrPlanningRisk.findByPk = originalFindByPk;
      }
    }
  );
});

await test('mrRiskService.updateRisk — reassignment via body.opd_id ke OPD lain -> DITOLAK 403, record.update TIDAK dipanggil (ownership reassignment bypass guard)', async () => {
  delete require.cache[require.resolve('../services/mr/mrRiskService')];
  delete require.cache[require.resolve('../services/mr/mrPlanningRiskService')];

  await withStubs(
    [[models.OpdPenanggungJawab, 'findOne', async ({ where }) => ({ id: 1, nama_opd: where.nama_opd })]],
    async () => {
      const mrRiskService = require('../services/mr/mrRiskService');

      const fakeT = { LOCK: { UPDATE: 'UPDATE' }, commit: async () => {}, rollback: async () => {} };
      const originalTransaction = models.sequelize.transaction;
      const originalFindByPk = models.MrPlanningRisk.findByPk;
      models.sequelize.transaction = async () => fakeT;

      let updateCalled = false;
      models.MrPlanningRisk.findByPk = async () => ({
        id: 5,
        opd_id: 1, // record milik caller sendiri
        status_revisi: 'draft',
        versi: 1,
        update: async () => {
          updateCalled = true;
        },
      });

      try {
        await mrRiskService.updateRisk({
          sequelize: models.sequelize,
          RiskModel: models.MrPlanningRisk,
          RiskHistoryModel: models.MrPlanningRiskHistory,
          models,
          id: 5,
          body: { opd_id: 99 }, // mencoba memindahkan Risk ke OPD lain
          userId: 5,
          request: { user: { role: 'ADMINISTRATOR', opd: 'Dinas Uji Coba A' } },
        });
        assert.fail('updateRisk seharusnya melempar error reassignment, bukan sukses');
      } catch (error) {
        assert.strictEqual(error.status, 403, `harus 403, didapat ${error.status}, message=${error.message}`);
        assert.strictEqual(error.code, 'MR_PLANNING_RISK_OPD_REASSIGN_FORBIDDEN');
        assert.strictEqual(updateCalled, false, 'record.update() TIDAK BOLEH dipanggil ketika reassignment ditolak');
      } finally {
        models.sequelize.transaction = originalTransaction;
        models.MrPlanningRisk.findByPk = originalFindByPk;
      }
    }
  );
});

await test('mrRiskService.updateRisk — SUPER_ADMIN dikecualikan dari boundary OPD (otoritas tenant-wide)', async () => {
  delete require.cache[require.resolve('../services/mr/mrRiskService')];
  delete require.cache[require.resolve('../services/mr/mrPlanningRiskService')];

  let opdLookupCalled = false;
  await withStubs(
    [[models.OpdPenanggungJawab, 'findOne', async () => {
      opdLookupCalled = true;
      return null;
    }]],
    async () => {
      const mrRiskService = require('../services/mr/mrRiskService');

      const fakeT = { LOCK: { UPDATE: 'UPDATE' }, commit: async () => {}, rollback: async () => {} };
      const originalTransaction = models.sequelize.transaction;
      const originalFindByPk = models.MrPlanningRisk.findByPk;
      models.sequelize.transaction = async () => fakeT;
      models.MrPlanningRisk.findByPk = async () => ({
        id: 5,
        opd_id: 2,
        status_revisi: 'draft',
        versi: 1,
        update: async () => {},
      });

      try {
        await mrRiskService.updateRisk({
          sequelize: models.sequelize,
          RiskModel: models.MrPlanningRisk,
          RiskHistoryModel: models.MrPlanningRiskHistory,
          models,
          id: 5,
          body: { opd_id: 3 }, // SUPER_ADMIN boleh reassign
          userId: 5,
          request: { user: { role: 'SUPER_ADMIN', opd: 'Dinas Manapun' } },
        });
      } catch (error) {
        assert.notStrictEqual(error.code, 'MR_PLANNING_RISK_OPD_FORBIDDEN', 'SUPER_ADMIN tidak boleh diblokir boundary OPD');
        assert.notStrictEqual(error.code, 'MR_PLANNING_RISK_OPD_REASSIGN_FORBIDDEN', 'SUPER_ADMIN tidak boleh diblokir guard reassignment');
      } finally {
        models.sequelize.transaction = originalTransaction;
        models.MrPlanningRisk.findByPk = originalFindByPk;
      }
      assert.strictEqual(opdLookupCalled, false, 'SUPER_ADMIN tidak boleh memicu lookup OpdPenanggungJawab sama sekali');
    }
  );
});

await test('mrRiskService.updateRisk — resolusi kepemilikan OPD gagal (error internal) -> FAIL CLOSED 503, record.update TIDAK dipanggil', async () => {
  delete require.cache[require.resolve('../services/mr/mrRiskService')];
  delete require.cache[require.resolve('../services/mr/mrPlanningRiskService')];

  await withStubs(
    [[models.OpdPenanggungJawab, 'findOne', async () => {
      throw new Error('simulated DB error saat resolusi kepemilikan OPD');
    }]],
    async () => {
      const mrRiskService = require('../services/mr/mrRiskService');

      const fakeT = { LOCK: { UPDATE: 'UPDATE' }, commit: async () => {}, rollback: async () => {} };
      const originalTransaction = models.sequelize.transaction;
      const originalFindByPk = models.MrPlanningRisk.findByPk;
      models.sequelize.transaction = async () => fakeT;

      let updateCalled = false;
      models.MrPlanningRisk.findByPk = async () => ({
        id: 5,
        opd_id: 2,
        status_revisi: 'draft',
        versi: 1,
        update: async () => {
          updateCalled = true;
        },
      });

      try {
        await mrRiskService.updateRisk({
          sequelize: models.sequelize,
          RiskModel: models.MrPlanningRisk,
          RiskHistoryModel: models.MrPlanningRiskHistory,
          models,
          id: 5,
          body: {},
          userId: 5,
          request: { user: { role: 'ADMINISTRATOR', opd: 'Dinas Uji Coba A' } },
        });
        assert.fail('updateRisk seharusnya melempar error fail-closed, bukan sukses');
      } catch (error) {
        assert.strictEqual(error.status, 503, `harus fail-closed 503, didapat ${error.status}, message=${error.message}`);
        assert.strictEqual(error.code, 'MR_PLANNING_RISK_OPD_BOUNDARY_UNAVAILABLE');
        assert.strictEqual(updateCalled, false, 'record.update() TIDAK BOLEH dipanggil ketika resolusi kepemilikan gagal (fail-closed)');
      } finally {
        models.sequelize.transaction = originalTransaction;
        models.MrPlanningRisk.findByPk = originalFindByPk;
      }
    }
  );
});

console.log('\n=== S7-R002: mrRiskService.createRevisi — boundary OPD ===');

await test('mrRiskService.createRevisi — caller OPD BEDA dari target -> DITOLAK 403, record.update TIDAK dipanggil', async () => {
  delete require.cache[require.resolve('../services/mr/mrRiskService')];
  delete require.cache[require.resolve('../services/mr/mrPlanningRiskService')];

  await withStubs(
    [[models.OpdPenanggungJawab, 'findOne', async ({ where }) => ({ id: 1, nama_opd: where.nama_opd })]],
    async () => {
      const mrRiskService = require('../services/mr/mrRiskService');

      const fakeT = { LOCK: { UPDATE: 'UPDATE' }, commit: async () => {}, rollback: async () => {} };
      const originalTransaction = models.sequelize.transaction;
      const originalFindByPk = models.MrPlanningRisk.findByPk;
      models.sequelize.transaction = async () => fakeT;

      let updateCalled = false;
      models.MrPlanningRisk.findByPk = async () => ({
        id: 5,
        opd_id: 2,
        status_revisi: 'approved',
        versi: 1,
        update: async () => {
          updateCalled = true;
        },
      });

      try {
        await mrRiskService.createRevisi({
          sequelize: models.sequelize,
          RiskModel: models.MrPlanningRisk,
          RiskHistoryModel: models.MrPlanningRiskHistory,
          models,
          id: 5,
          body: {},
          userId: 5,
          request: { user: { role: 'ADMINISTRATOR', opd: 'Dinas Uji Coba A' } },
        });
        assert.fail('createRevisi seharusnya melempar error boundary OPD, bukan sukses');
      } catch (error) {
        assert.strictEqual(error.status, 403, `harus 403, didapat ${error.status}, message=${error.message}`);
        assert.strictEqual(error.code, 'MR_PLANNING_RISK_OPD_FORBIDDEN');
        assert.strictEqual(updateCalled, false, 'record.update() TIDAK BOLEH dipanggil ketika boundary OPD menolak');
      } finally {
        models.sequelize.transaction = originalTransaction;
        models.MrPlanningRisk.findByPk = originalFindByPk;
      }
    }
  );
});

await test('mrRiskService.createRevisi — caller OPD SAMA dengan target -> boundary MENGIZINKAN (error lanjutan, jika ada, BUKAN kode boundary)', async () => {
  delete require.cache[require.resolve('../services/mr/mrRiskService')];
  delete require.cache[require.resolve('../services/mr/mrPlanningRiskService')];

  await withStubs(
    [[models.OpdPenanggungJawab, 'findOne', async ({ where }) => ({ id: 1, nama_opd: where.nama_opd })]],
    async () => {
      const mrRiskService = require('../services/mr/mrRiskService');

      const fakeT = { LOCK: { UPDATE: 'UPDATE' }, commit: async () => {}, rollback: async () => {} };
      const originalTransaction = models.sequelize.transaction;
      const originalFindByPk = models.MrPlanningRisk.findByPk;
      models.sequelize.transaction = async () => fakeT;
      models.MrPlanningRisk.findByPk = async () => ({
        id: 5,
        opd_id: 1,
        status_revisi: 'approved',
        versi: 1,
        update: async () => {},
      });

      try {
        await mrRiskService.createRevisi({
          sequelize: models.sequelize,
          RiskModel: models.MrPlanningRisk,
          RiskHistoryModel: models.MrPlanningRiskHistory,
          models,
          id: 5,
          body: {},
          userId: 5,
          request: { user: { role: 'ADMINISTRATOR', opd: 'Dinas Uji Coba A' } },
        });
      } catch (error) {
        assert.notStrictEqual(
          error.code,
          'MR_PLANNING_RISK_OPD_FORBIDDEN',
          'boundary TIDAK BOLEH menolak ketika caller dan target berada di OPD yang sama'
        );
      } finally {
        models.sequelize.transaction = originalTransaction;
        models.MrPlanningRisk.findByPk = originalFindByPk;
      }
    }
  );
});

await test('mrRiskService.createRevisi — reassignment via body.opd_id ke OPD lain -> DITOLAK 403, record.update TIDAK dipanggil', async () => {
  delete require.cache[require.resolve('../services/mr/mrRiskService')];
  delete require.cache[require.resolve('../services/mr/mrPlanningRiskService')];

  await withStubs(
    [[models.OpdPenanggungJawab, 'findOne', async ({ where }) => ({ id: 1, nama_opd: where.nama_opd })]],
    async () => {
      const mrRiskService = require('../services/mr/mrRiskService');

      const fakeT = { LOCK: { UPDATE: 'UPDATE' }, commit: async () => {}, rollback: async () => {} };
      const originalTransaction = models.sequelize.transaction;
      const originalFindByPk = models.MrPlanningRisk.findByPk;
      models.sequelize.transaction = async () => fakeT;

      let updateCalled = false;
      models.MrPlanningRisk.findByPk = async () => ({
        id: 5,
        opd_id: 1,
        status_revisi: 'approved',
        versi: 1,
        update: async () => {
          updateCalled = true;
        },
      });

      try {
        await mrRiskService.createRevisi({
          sequelize: models.sequelize,
          RiskModel: models.MrPlanningRisk,
          RiskHistoryModel: models.MrPlanningRiskHistory,
          models,
          id: 5,
          body: { opd_id: 99 },
          userId: 5,
          request: { user: { role: 'ADMINISTRATOR', opd: 'Dinas Uji Coba A' } },
        });
        assert.fail('createRevisi seharusnya melempar error reassignment, bukan sukses');
      } catch (error) {
        assert.strictEqual(error.status, 403, `harus 403, didapat ${error.status}, message=${error.message}`);
        assert.strictEqual(error.code, 'MR_PLANNING_RISK_OPD_REASSIGN_FORBIDDEN');
        assert.strictEqual(updateCalled, false, 'record.update() TIDAK BOLEH dipanggil ketika reassignment ditolak');
      } finally {
        models.sequelize.transaction = originalTransaction;
        models.MrPlanningRisk.findByPk = originalFindByPk;
      }
    }
  );
});

await test('mrRiskService.createRevisi — SUPER_ADMIN dikecualikan dari boundary OPD (otoritas tenant-wide)', async () => {
  delete require.cache[require.resolve('../services/mr/mrRiskService')];
  delete require.cache[require.resolve('../services/mr/mrPlanningRiskService')];

  let opdLookupCalled = false;
  await withStubs(
    [[models.OpdPenanggungJawab, 'findOne', async () => {
      opdLookupCalled = true;
      return null;
    }]],
    async () => {
      const mrRiskService = require('../services/mr/mrRiskService');

      const fakeT = { LOCK: { UPDATE: 'UPDATE' }, commit: async () => {}, rollback: async () => {} };
      const originalTransaction = models.sequelize.transaction;
      const originalFindByPk = models.MrPlanningRisk.findByPk;
      models.sequelize.transaction = async () => fakeT;
      models.MrPlanningRisk.findByPk = async () => ({
        id: 5,
        opd_id: 2,
        status_revisi: 'approved',
        versi: 1,
        update: async () => {},
      });

      try {
        await mrRiskService.createRevisi({
          sequelize: models.sequelize,
          RiskModel: models.MrPlanningRisk,
          RiskHistoryModel: models.MrPlanningRiskHistory,
          models,
          id: 5,
          body: {},
          userId: 5,
          request: { user: { role: 'SUPER_ADMIN', opd: 'Dinas Manapun' } },
        });
      } catch (error) {
        assert.notStrictEqual(error.code, 'MR_PLANNING_RISK_OPD_FORBIDDEN', 'SUPER_ADMIN tidak boleh diblokir boundary OPD');
      } finally {
        models.sequelize.transaction = originalTransaction;
        models.MrPlanningRisk.findByPk = originalFindByPk;
      }
      assert.strictEqual(opdLookupCalled, false, 'SUPER_ADMIN tidak boleh memicu lookup OpdPenanggungJawab sama sekali');
    }
  );
});

console.log('\n=== S7-R005: mrRiskService.createRisk — boundary OPD (payload.opd_id bukan bukti otorisasi) ===');

await test('mrRiskService.createRisk — payload.opd_id milik OPD LAIN -> DITOLAK 403, RiskModel.create TIDAK dipanggil', async () => {
  delete require.cache[require.resolve('../services/mr/mrRiskService')];
  delete require.cache[require.resolve('../services/mr/mrPlanningRiskService')];

  await withStubs(
    [[models.OpdPenanggungJawab, 'findOne', async ({ where }) => ({ id: 1, nama_opd: where.nama_opd })]],
    async () => {
      const mrRiskService = require('../services/mr/mrRiskService');

      const fakeT = { commit: async () => {}, rollback: async () => {} };
      const originalTransaction = models.sequelize.transaction;
      const originalCreate = models.MrPlanningRisk.create;
      models.sequelize.transaction = async () => fakeT;

      let createCalled = false;
      models.MrPlanningRisk.create = async () => {
        createCalled = true;
        return {};
      };

      try {
        await mrRiskService.createRisk({
          sequelize: models.sequelize,
          RiskModel: models.MrPlanningRisk,
          RiskHistoryModel: models.MrPlanningRiskHistory,
          models,
          body: {
            renstra_id: 1,
            indikator_id: 1,
            stage: 'tujuan',
            ref_id: 1,
            nama_risiko: 'Uji coba risiko',
            opd_id: 2, // OPD lain, bukan OPD caller
          },
          userId: 5,
          request: { user: { role: 'ADMINISTRATOR', opd: 'Dinas Uji Coba A' } }, // resolves opd_id=1
        });
        assert.fail('createRisk seharusnya melempar error boundary OPD, bukan sukses');
      } catch (error) {
        assert.strictEqual(error.status, 403, `harus 403, didapat ${error.status}, message=${error.message}`);
        assert.strictEqual(error.code, 'MR_PLANNING_RISK_OPD_FORBIDDEN');
        assert.strictEqual(createCalled, false, 'RiskModel.create() TIDAK BOLEH dipanggil ketika boundary OPD menolak');
      } finally {
        models.sequelize.transaction = originalTransaction;
        models.MrPlanningRisk.create = originalCreate;
      }
    }
  );
});

await test('mrRiskService.createRisk — payload.opd_id milik OPD SENDIRI -> boundary MENGIZINKAN (error lanjutan, jika ada, BUKAN kode boundary)', async () => {
  delete require.cache[require.resolve('../services/mr/mrRiskService')];
  delete require.cache[require.resolve('../services/mr/mrPlanningRiskService')];

  await withStubs(
    [[models.OpdPenanggungJawab, 'findOne', async ({ where }) => ({ id: 1, nama_opd: where.nama_opd })]],
    async () => {
      const mrRiskService = require('../services/mr/mrRiskService');

      const fakeT = { commit: async () => {}, rollback: async () => {} };
      const originalTransaction = models.sequelize.transaction;
      models.sequelize.transaction = async () => fakeT;

      try {
        await mrRiskService.createRisk({
          sequelize: models.sequelize,
          RiskModel: models.MrPlanningRisk,
          RiskHistoryModel: models.MrPlanningRiskHistory,
          models,
          body: {
            renstra_id: 1,
            indikator_id: 1,
            stage: 'tujuan',
            ref_id: 1,
            nama_risiko: 'Uji coba risiko',
            opd_id: 1, // OPD SENDIRI
          },
          userId: 5,
          request: { user: { role: 'ADMINISTRATOR', opd: 'Dinas Uji Coba A' } },
        });
      } catch (error) {
        assert.notStrictEqual(
          error.code,
          'MR_PLANNING_RISK_OPD_FORBIDDEN',
          'boundary TIDAK BOLEH menolak ketika payload.opd_id adalah OPD caller sendiri'
        );
      } finally {
        models.sequelize.transaction = originalTransaction;
      }
    }
  );
});

await test('mrRiskService.createRisk — SUPER_ADMIN dikecualikan dari boundary OPD (otoritas tenant-wide)', async () => {
  delete require.cache[require.resolve('../services/mr/mrRiskService')];
  delete require.cache[require.resolve('../services/mr/mrPlanningRiskService')];

  let opdLookupCalled = false;
  await withStubs(
    [[models.OpdPenanggungJawab, 'findOne', async () => {
      opdLookupCalled = true;
      return null;
    }]],
    async () => {
      const mrRiskService = require('../services/mr/mrRiskService');

      const fakeT = { commit: async () => {}, rollback: async () => {} };
      const originalTransaction = models.sequelize.transaction;
      models.sequelize.transaction = async () => fakeT;

      try {
        await mrRiskService.createRisk({
          sequelize: models.sequelize,
          RiskModel: models.MrPlanningRisk,
          RiskHistoryModel: models.MrPlanningRiskHistory,
          models,
          body: {
            renstra_id: 1,
            indikator_id: 1,
            stage: 'tujuan',
            ref_id: 1,
            nama_risiko: 'Uji coba risiko',
            opd_id: 2, // OPD manapun, SUPER_ADMIN tidak dibatasi
          },
          userId: 5,
          request: { user: { role: 'SUPER_ADMIN', opd: 'Dinas Manapun' } },
        });
      } catch (error) {
        assert.notStrictEqual(error.code, 'MR_PLANNING_RISK_OPD_FORBIDDEN', 'SUPER_ADMIN tidak boleh diblokir boundary OPD');
      } finally {
        models.sequelize.transaction = originalTransaction;
      }
      assert.strictEqual(opdLookupCalled, false, 'SUPER_ADMIN tidak boleh memicu lookup OpdPenanggungJawab sama sekali');
    }
  );
});

console.log('\n=== S7-R003: mrApprovalService.verifikasiHistory — boundary OPD (Risk-bounded, dipakai HANYA oleh mr_planningRiskController) ===');

await test('mrApprovalService.verifikasiHistory — caller OPD BEDA dari active Risk pemilik history -> DITOLAK 403, activeRecord.update TIDAK dipanggil', async () => {
  delete require.cache[require.resolve('../services/mr/mrApprovalService')];
  delete require.cache[require.resolve('../services/mr/mrPlanningRiskService')];

  await withStubs(
    [[models.OpdPenanggungJawab, 'findOne', async ({ where }) => ({ id: 1, nama_opd: where.nama_opd })]],
    async () => {
      const mrApprovalService = require('../services/mr/mrApprovalService');

      const fakeT = { commit: async () => {}, rollback: async () => {} };
      let activeUpdateCalled = false;
      const HistoryModel = {
        findByPk: async () => ({ id: 7, mr_planning_risk_id: 5, status_revisi: 'draft' }),
      };
      const ActiveModel = {
        findByPk: async () => ({
          id: 5,
          opd_id: 2, // target milik OPD id=2
          update: async () => {
            activeUpdateCalled = true;
          },
        }),
      };

      try {
        await mrApprovalService.verifikasiHistory({
          sequelize: { transaction: async () => fakeT },
          ActiveModel,
          HistoryModel,
          historyId: 7,
          userId: 5,
          request: { user: { role: 'ADMINISTRATOR', opd: 'Dinas Uji Coba A' } }, // resolves opd_id=1
        });
        assert.fail('verifikasiHistory seharusnya melempar error boundary OPD, bukan sukses');
      } catch (error) {
        assert.strictEqual(error.status, 403, `harus 403, didapat ${error.status}, message=${error.message}`);
        assert.strictEqual(error.code, 'MR_PLANNING_RISK_OPD_FORBIDDEN');
        assert.strictEqual(activeUpdateCalled, false, 'activeRecord.update() TIDAK BOLEH dipanggil ketika boundary OPD menolak');
      }
    }
  );
});

await test('mrApprovalService.verifikasiHistory — caller OPD SAMA dengan active Risk pemilik history -> boundary MENGIZINKAN, verifikasi berhasil', async () => {
  delete require.cache[require.resolve('../services/mr/mrApprovalService')];
  delete require.cache[require.resolve('../services/mr/mrPlanningRiskService')];

  await withStubs(
    [[models.OpdPenanggungJawab, 'findOne', async ({ where }) => ({ id: 1, nama_opd: where.nama_opd })]],
    async () => {
      const mrApprovalService = require('../services/mr/mrApprovalService');

      const fakeT = { commit: async () => {}, rollback: async () => {} };
      let activeUpdateCalled = false;
      let historyUpdateCalled = false;
      const HistoryModel = {
        findByPk: async () => ({
          id: 7,
          mr_planning_risk_id: 5,
          status_revisi: 'draft',
          update: async () => {
            historyUpdateCalled = true;
          },
        }),
      };
      const ActiveModel = {
        findByPk: async () => ({
          id: 5,
          opd_id: 1, // target JUGA milik OPD id=1
          update: async () => {
            activeUpdateCalled = true;
          },
        }),
      };
      const AuditModel = null;

      const result = await mrApprovalService.verifikasiHistory({
        sequelize: { transaction: async () => fakeT },
        ActiveModel,
        HistoryModel,
        AuditModel,
        historyId: 7,
        userId: 5,
        request: { user: { role: 'ADMINISTRATOR', opd: 'Dinas Uji Coba A' } },
      });

      assert.ok(result, 'verifikasiHistory harus berhasil ketika caller dan target berada di OPD yang sama');
      assert.strictEqual(activeUpdateCalled, true, 'activeRecord.update() HARUS dipanggil ketika boundary OPD mengizinkan');
      assert.strictEqual(historyUpdateCalled, true, 'history.update() HARUS dipanggil ketika boundary OPD mengizinkan');
    }
  );
});

await test('mrApprovalService.verifikasiHistory — SUPER_ADMIN dikecualikan dari boundary OPD (otoritas tenant-wide)', async () => {
  delete require.cache[require.resolve('../services/mr/mrApprovalService')];
  delete require.cache[require.resolve('../services/mr/mrPlanningRiskService')];

  let opdLookupCalled = false;
  await withStubs(
    [[models.OpdPenanggungJawab, 'findOne', async () => {
      opdLookupCalled = true;
      return null;
    }]],
    async () => {
      const mrApprovalService = require('../services/mr/mrApprovalService');

      const fakeT = { commit: async () => {}, rollback: async () => {} };
      let activeUpdateCalled = false;
      const HistoryModel = {
        findByPk: async () => ({
          id: 7,
          mr_planning_risk_id: 5,
          status_revisi: 'draft',
          update: async () => {},
        }),
      };
      const ActiveModel = {
        findByPk: async () => ({
          id: 5,
          opd_id: 2,
          update: async () => {
            activeUpdateCalled = true;
          },
        }),
      };

      const result = await mrApprovalService.verifikasiHistory({
        sequelize: { transaction: async () => fakeT },
        ActiveModel,
        HistoryModel,
        historyId: 7,
        userId: 5,
        request: { user: { role: 'SUPER_ADMIN', opd: 'Dinas Manapun' } },
      });

      assert.ok(result, 'verifikasiHistory harus berhasil untuk SUPER_ADMIN');
      assert.strictEqual(activeUpdateCalled, true, 'activeRecord.update() HARUS dipanggil untuk SUPER_ADMIN');
      assert.strictEqual(opdLookupCalled, false, 'SUPER_ADMIN tidak boleh memicu lookup OpdPenanggungJawab sama sekali');
    }
  );
});

await test('mrApprovalService.verifikasiHistory — resolusi kepemilikan OPD gagal (error internal) -> FAIL CLOSED 503, activeRecord.update TIDAK dipanggil', async () => {
  delete require.cache[require.resolve('../services/mr/mrApprovalService')];
  delete require.cache[require.resolve('../services/mr/mrPlanningRiskService')];

  await withStubs(
    [[models.OpdPenanggungJawab, 'findOne', async () => {
      throw new Error('simulated DB error saat resolusi kepemilikan OPD');
    }]],
    async () => {
      const mrApprovalService = require('../services/mr/mrApprovalService');

      const fakeT = { commit: async () => {}, rollback: async () => {} };
      let activeUpdateCalled = false;
      const HistoryModel = {
        findByPk: async () => ({ id: 7, mr_planning_risk_id: 5, status_revisi: 'draft' }),
      };
      const ActiveModel = {
        findByPk: async () => ({
          id: 5,
          opd_id: 2,
          update: async () => {
            activeUpdateCalled = true;
          },
        }),
      };

      try {
        await mrApprovalService.verifikasiHistory({
          sequelize: { transaction: async () => fakeT },
          ActiveModel,
          HistoryModel,
          historyId: 7,
          userId: 5,
          request: { user: { role: 'ADMINISTRATOR', opd: 'Dinas Uji Coba A' } },
        });
        assert.fail('verifikasiHistory seharusnya melempar error fail-closed, bukan sukses');
      } catch (error) {
        assert.strictEqual(error.status, 503, `harus fail-closed 503, didapat ${error.status}, message=${error.message}`);
        assert.strictEqual(error.code, 'MR_PLANNING_RISK_OPD_BOUNDARY_UNAVAILABLE');
        assert.strictEqual(activeUpdateCalled, false, 'activeRecord.update() TIDAK BOLEH dipanggil ketika resolusi kepemilikan gagal (fail-closed)');
      }
    }
  );
});

console.log('\n=== S7-R004: mrPlanningRiskService.updateDraftRisk — boundary OPD ===');

await test('mrPlanningRiskService.updateDraftRisk — caller OPD BEDA dari target -> DITOLAK 403, risk.update TIDAK dipanggil', async () => {
  delete require.cache[require.resolve('../services/mr/mrPlanningRiskService')];

  await withStubs(
    [[models.OpdPenanggungJawab, 'findOne', async ({ where }) => ({ id: 1, nama_opd: where.nama_opd })]],
    async () => {
      const svc = require('../services/mr/mrPlanningRiskService');

      const originalTransaction = models.sequelize.transaction;
      const originalFindByPk = models.MrPlanningRisk.findByPk;
      models.sequelize.transaction = async (cb) => cb({ fake: true });

      let updateCalled = false;
      models.MrPlanningRisk.findByPk = async () => ({
        id: 5,
        opd_id: 2,
        status_revisi: 'draft',
        update: async () => {
          updateCalled = true;
        },
      });

      try {
        await svc.updateDraftRisk({
          riskId: 5,
          body: {},
          user: { role: 'ADMINISTRATOR', opd: 'Dinas Uji Coba A' },
        });
        assert.fail('updateDraftRisk seharusnya melempar error boundary OPD, bukan sukses');
      } catch (error) {
        assert.strictEqual(error.statusCode, 403, `harus 403, didapat ${error.statusCode}, message=${error.message}`);
        assert.strictEqual(error.details?.code, 'MR_PLANNING_RISK_OPD_FORBIDDEN');
        assert.strictEqual(updateCalled, false, 'risk.update() TIDAK BOLEH dipanggil ketika boundary OPD menolak');
      } finally {
        models.sequelize.transaction = originalTransaction;
        models.MrPlanningRisk.findByPk = originalFindByPk;
      }
    }
  );
});

await test('mrPlanningRiskService.updateDraftRisk — caller OPD SAMA dengan target -> boundary MENGIZINKAN, draft berhasil diperbarui', async () => {
  delete require.cache[require.resolve('../services/mr/mrPlanningRiskService')];

  await withStubs(
    [[models.OpdPenanggungJawab, 'findOne', async ({ where }) => ({ id: 1, nama_opd: where.nama_opd })]],
    async () => {
      const svc = require('../services/mr/mrPlanningRiskService');

      const originalTransaction = models.sequelize.transaction;
      const originalFindByPk = models.MrPlanningRisk.findByPk;
      const originalHistoryCreate = models.MrPlanningRiskHistory.create;
      models.sequelize.transaction = async (cb) => cb({ fake: true });
      models.MrPlanningRiskHistory.create = async () => ({ id: 99 });

      let updateCalled = false;
      models.MrPlanningRisk.findByPk = async () => ({
        id: 5,
        opd_id: 1,
        status_revisi: 'draft',
        context_id: null,
        update: async () => {
          updateCalled = true;
        },
      });

      try {
        const result = await svc.updateDraftRisk({
          riskId: 5,
          body: {},
          user: { role: 'ADMINISTRATOR', opd: 'Dinas Uji Coba A' },
        });
        assert.ok(result?.success, 'updateDraftRisk harus berhasil ketika caller dan target berada di OPD yang sama');
        assert.strictEqual(updateCalled, true, 'risk.update() HARUS dipanggil ketika boundary OPD mengizinkan');
      } finally {
        models.sequelize.transaction = originalTransaction;
        models.MrPlanningRisk.findByPk = originalFindByPk;
        models.MrPlanningRiskHistory.create = originalHistoryCreate;
      }
    }
  );
});

await test('mrPlanningRiskService.updateDraftRisk — SUPER_ADMIN dikecualikan dari boundary OPD (otoritas tenant-wide)', async () => {
  delete require.cache[require.resolve('../services/mr/mrPlanningRiskService')];

  let opdLookupCalled = false;
  await withStubs(
    [[models.OpdPenanggungJawab, 'findOne', async () => {
      opdLookupCalled = true;
      return null;
    }]],
    async () => {
      const svc = require('../services/mr/mrPlanningRiskService');

      const originalTransaction = models.sequelize.transaction;
      const originalFindByPk = models.MrPlanningRisk.findByPk;
      const originalHistoryCreate = models.MrPlanningRiskHistory.create;
      models.sequelize.transaction = async (cb) => cb({ fake: true });
      models.MrPlanningRiskHistory.create = async () => ({ id: 99 });

      let updateCalled = false;
      models.MrPlanningRisk.findByPk = async () => ({
        id: 5,
        opd_id: 2,
        status_revisi: 'draft',
        context_id: null,
        update: async () => {
          updateCalled = true;
        },
      });

      try {
        const result = await svc.updateDraftRisk({
          riskId: 5,
          body: {},
          user: { role: 'SUPER_ADMIN', opd: 'Dinas Manapun' },
        });
        assert.ok(result?.success, 'updateDraftRisk harus berhasil untuk SUPER_ADMIN');
        assert.strictEqual(updateCalled, true, 'risk.update() HARUS dipanggil untuk SUPER_ADMIN');
        assert.strictEqual(opdLookupCalled, false, 'SUPER_ADMIN tidak boleh memicu lookup OpdPenanggungJawab sama sekali');
      } finally {
        models.sequelize.transaction = originalTransaction;
        models.MrPlanningRisk.findByPk = originalFindByPk;
        models.MrPlanningRiskHistory.create = originalHistoryCreate;
      }
    }
  );
});

await test('mrPlanningRiskService.updateDraftRisk — resolusi kepemilikan OPD gagal (error internal) -> FAIL CLOSED, risk.update TIDAK dipanggil', async () => {
  delete require.cache[require.resolve('../services/mr/mrPlanningRiskService')];

  await withStubs(
    [[models.OpdPenanggungJawab, 'findOne', async () => {
      throw new Error('simulated DB error saat resolusi kepemilikan OPD');
    }]],
    async () => {
      const svc = require('../services/mr/mrPlanningRiskService');

      const originalTransaction = models.sequelize.transaction;
      const originalFindByPk = models.MrPlanningRisk.findByPk;
      models.sequelize.transaction = async (cb) => cb({ fake: true });

      let updateCalled = false;
      models.MrPlanningRisk.findByPk = async () => ({
        id: 5,
        opd_id: 2,
        status_revisi: 'draft',
        update: async () => {
          updateCalled = true;
        },
      });

      try {
        await svc.updateDraftRisk({
          riskId: 5,
          body: {},
          user: { role: 'ADMINISTRATOR', opd: 'Dinas Uji Coba A' },
        });
        assert.fail('updateDraftRisk seharusnya melempar error fail-closed, bukan sukses');
      } catch (error) {
        assert.strictEqual(error.statusCode, 503, `harus fail-closed 503, didapat ${error.statusCode}, message=${error.message}`);
        assert.strictEqual(error.details?.code, 'MR_PLANNING_RISK_OPD_BOUNDARY_UNAVAILABLE');
        assert.strictEqual(updateCalled, false, 'risk.update() TIDAK BOLEH dipanggil ketika resolusi kepemilikan gagal (fail-closed)');
      } finally {
        models.sequelize.transaction = originalTransaction;
        models.MrPlanningRisk.findByPk = originalFindByPk;
      }
    }
  );
});

console.log('\n=== S7-R: mrPlanningRiskService.submitRiskForVerification — boundary OPD ===');

await test('mrPlanningRiskService.submitRiskForVerification — caller OPD BEDA dari target -> DITOLAK, risk.update TIDAK dipanggil', async () => {
  delete require.cache[require.resolve('../services/mr/mrPlanningRiskService')];

  await withStubs(
    [[models.OpdPenanggungJawab, 'findOne', async ({ where }) => ({ id: 1, nama_opd: where.nama_opd })]],
    async () => {
      const svc = require('../services/mr/mrPlanningRiskService');

      const originalTransaction = models.sequelize.transaction;
      const originalFindByPk = models.MrPlanningRisk.findByPk;
      models.sequelize.transaction = async (cb) => cb({ fake: true });

      let updateCalled = false;
      models.MrPlanningRisk.findByPk = async () => ({
        id: 5,
        opd_id: 2,
        status_revisi: 'draft',
        update: async () => {
          updateCalled = true;
        },
      });

      try {
        await svc.submitRiskForVerification({
          riskId: 5,
          user: { role: 'ADMINISTRATOR', opd: 'Dinas Uji Coba A' },
        });
        assert.fail('submitRiskForVerification seharusnya melempar error boundary OPD, bukan sukses');
      } catch (error) {
        assert.strictEqual(error.statusCode, 403, `harus 403, didapat ${error.statusCode}, message=${error.message}`);
        assert.strictEqual(error.details?.code, 'MR_PLANNING_RISK_OPD_FORBIDDEN');
        assert.strictEqual(updateCalled, false, 'risk.update() TIDAK BOLEH dipanggil ketika boundary OPD menolak');
      } finally {
        models.sequelize.transaction = originalTransaction;
        models.MrPlanningRisk.findByPk = originalFindByPk;
      }
    }
  );
});

await test('mrPlanningRiskService.submitRiskForVerification — caller OPD SAMA dengan target -> boundary MENGIZINKAN, risk berhasil diajukan verifikasi', async () => {
  delete require.cache[require.resolve('../services/mr/mrPlanningRiskService')];

  await withStubs(
    [[models.OpdPenanggungJawab, 'findOne', async ({ where }) => ({ id: 1, nama_opd: where.nama_opd })]],
    async () => {
      const svc = require('../services/mr/mrPlanningRiskService');

      const originalTransaction = models.sequelize.transaction;
      const originalFindByPk = models.MrPlanningRisk.findByPk;
      const originalHistoryCreate = models.MrPlanningRiskHistory.create;
      models.sequelize.transaction = async (cb) => cb({ fake: true });
      models.MrPlanningRiskHistory.create = async () => ({ id: 99 });

      let updateCalled = false;
      models.MrPlanningRisk.findByPk = async () => ({
        id: 5,
        opd_id: 1,
        status_revisi: 'draft',
        update: async () => {
          updateCalled = true;
        },
      });

      try {
        const result = await svc.submitRiskForVerification({
          riskId: 5,
          user: { role: 'ADMINISTRATOR', opd: 'Dinas Uji Coba A' },
        });
        assert.ok(result?.success, 'submitRiskForVerification harus berhasil ketika caller dan target berada di OPD yang sama');
        assert.strictEqual(updateCalled, true, 'risk.update() HARUS dipanggil ketika boundary OPD mengizinkan');
      } finally {
        models.sequelize.transaction = originalTransaction;
        models.MrPlanningRisk.findByPk = originalFindByPk;
        models.MrPlanningRiskHistory.create = originalHistoryCreate;
      }
    }
  );
});

await test('mrPlanningRiskService.submitRiskForVerification — SUPER_ADMIN dikecualikan dari boundary OPD (otoritas tenant-wide)', async () => {
  delete require.cache[require.resolve('../services/mr/mrPlanningRiskService')];

  let opdLookupCalled = false;
  await withStubs(
    [[models.OpdPenanggungJawab, 'findOne', async () => {
      opdLookupCalled = true;
      return null;
    }]],
    async () => {
      const svc = require('../services/mr/mrPlanningRiskService');

      const originalTransaction = models.sequelize.transaction;
      const originalFindByPk = models.MrPlanningRisk.findByPk;
      const originalHistoryCreate = models.MrPlanningRiskHistory.create;
      models.sequelize.transaction = async (cb) => cb({ fake: true });
      models.MrPlanningRiskHistory.create = async () => ({ id: 99 });

      let updateCalled = false;
      models.MrPlanningRisk.findByPk = async () => ({
        id: 5,
        opd_id: 2,
        status_revisi: 'draft',
        update: async () => {
          updateCalled = true;
        },
      });

      try {
        const result = await svc.submitRiskForVerification({
          riskId: 5,
          user: { role: 'SUPER_ADMIN', opd: 'Dinas Manapun' },
        });
        assert.ok(result?.success, 'submitRiskForVerification harus berhasil untuk SUPER_ADMIN');
        assert.strictEqual(updateCalled, true, 'risk.update() HARUS dipanggil untuk SUPER_ADMIN');
        assert.strictEqual(opdLookupCalled, false, 'SUPER_ADMIN tidak boleh memicu lookup OpdPenanggungJawab sama sekali');
      } finally {
        models.sequelize.transaction = originalTransaction;
        models.MrPlanningRisk.findByPk = originalFindByPk;
        models.MrPlanningRiskHistory.create = originalHistoryCreate;
      }
    }
  );
});

console.log('\n=== S7-R: mrPlanningRiskService.verifyRisk — boundary OPD ===');

await test('mrPlanningRiskService.verifyRisk — caller OPD BEDA dari target -> DITOLAK, risk.update TIDAK dipanggil', async () => {
  delete require.cache[require.resolve('../services/mr/mrPlanningRiskService')];

  await withStubs(
    [[models.OpdPenanggungJawab, 'findOne', async ({ where }) => ({ id: 1, nama_opd: where.nama_opd })]],
    async () => {
      const svc = require('../services/mr/mrPlanningRiskService');

      const originalTransaction = models.sequelize.transaction;
      const originalFindByPk = models.MrPlanningRisk.findByPk;
      models.sequelize.transaction = async (cb) => cb({ fake: true });

      let updateCalled = false;
      models.MrPlanningRisk.findByPk = async () => ({
        id: 5,
        opd_id: 2,
        status_revisi: 'verifikasi',
        update: async () => {
          updateCalled = true;
        },
      });

      try {
        await svc.verifyRisk({
          riskId: 5,
          user: { role: 'ADMINISTRATOR', opd: 'Dinas Uji Coba A' },
        });
        assert.fail('verifyRisk seharusnya melempar error boundary OPD, bukan sukses');
      } catch (error) {
        assert.strictEqual(error.statusCode, 403, `harus 403, didapat ${error.statusCode}, message=${error.message}`);
        assert.strictEqual(error.details?.code, 'MR_PLANNING_RISK_OPD_FORBIDDEN');
        assert.strictEqual(updateCalled, false, 'risk.update() TIDAK BOLEH dipanggil ketika boundary OPD menolak');
      } finally {
        models.sequelize.transaction = originalTransaction;
        models.MrPlanningRisk.findByPk = originalFindByPk;
      }
    }
  );
});

await test('mrPlanningRiskService.verifyRisk — caller OPD SAMA dengan target -> boundary MENGIZINKAN, risk berhasil diverifikasi', async () => {
  delete require.cache[require.resolve('../services/mr/mrPlanningRiskService')];

  await withStubs(
    [[models.OpdPenanggungJawab, 'findOne', async ({ where }) => ({ id: 1, nama_opd: where.nama_opd })]],
    async () => {
      const svc = require('../services/mr/mrPlanningRiskService');

      const originalTransaction = models.sequelize.transaction;
      const originalFindByPk = models.MrPlanningRisk.findByPk;
      const originalHistoryCreate = models.MrPlanningRiskHistory.create;
      models.sequelize.transaction = async (cb) => cb({ fake: true });
      models.MrPlanningRiskHistory.create = async () => ({ id: 99 });

      let updateCalled = false;
      models.MrPlanningRisk.findByPk = async () => ({
        id: 5,
        opd_id: 1,
        status_revisi: 'verifikasi',
        update: async () => {
          updateCalled = true;
        },
      });

      try {
        const result = await svc.verifyRisk({
          riskId: 5,
          user: { role: 'ADMINISTRATOR', opd: 'Dinas Uji Coba A' },
        });
        assert.ok(result?.success, 'verifyRisk harus berhasil ketika caller dan target berada di OPD yang sama');
        assert.strictEqual(updateCalled, true, 'risk.update() HARUS dipanggil ketika boundary OPD mengizinkan');
      } finally {
        models.sequelize.transaction = originalTransaction;
        models.MrPlanningRisk.findByPk = originalFindByPk;
        models.MrPlanningRiskHistory.create = originalHistoryCreate;
      }
    }
  );
});

await test('mrPlanningRiskService.verifyRisk — SUPER_ADMIN dikecualikan dari boundary OPD (otoritas tenant-wide)', async () => {
  delete require.cache[require.resolve('../services/mr/mrPlanningRiskService')];

  let opdLookupCalled = false;
  await withStubs(
    [[models.OpdPenanggungJawab, 'findOne', async () => {
      opdLookupCalled = true;
      return null;
    }]],
    async () => {
      const svc = require('../services/mr/mrPlanningRiskService');

      const originalTransaction = models.sequelize.transaction;
      const originalFindByPk = models.MrPlanningRisk.findByPk;
      const originalHistoryCreate = models.MrPlanningRiskHistory.create;
      models.sequelize.transaction = async (cb) => cb({ fake: true });
      models.MrPlanningRiskHistory.create = async () => ({ id: 99 });

      let updateCalled = false;
      models.MrPlanningRisk.findByPk = async () => ({
        id: 5,
        opd_id: 2,
        status_revisi: 'verifikasi',
        update: async () => {
          updateCalled = true;
        },
      });

      try {
        const result = await svc.verifyRisk({
          riskId: 5,
          user: { role: 'SUPER_ADMIN', opd: 'Dinas Manapun' },
        });
        assert.ok(result?.success, 'verifyRisk harus berhasil untuk SUPER_ADMIN');
        assert.strictEqual(updateCalled, true, 'risk.update() HARUS dipanggil untuk SUPER_ADMIN');
        assert.strictEqual(opdLookupCalled, false, 'SUPER_ADMIN tidak boleh memicu lookup OpdPenanggungJawab sama sekali');
      } finally {
        models.sequelize.transaction = originalTransaction;
        models.MrPlanningRisk.findByPk = originalFindByPk;
        models.MrPlanningRiskHistory.create = originalHistoryCreate;
      }
    }
  );
});

console.log('\n=== S7-R: mrPlanningRiskService.createRevisionFromApprovedRisk — boundary OPD ===');

await test('mrPlanningRiskService.createRevisionFromApprovedRisk — caller OPD BEDA dari target -> DITOLAK, risk.update TIDAK dipanggil', async () => {
  delete require.cache[require.resolve('../services/mr/mrPlanningRiskService')];

  await withStubs(
    [[models.OpdPenanggungJawab, 'findOne', async ({ where }) => ({ id: 1, nama_opd: where.nama_opd })]],
    async () => {
      const svc = require('../services/mr/mrPlanningRiskService');

      const originalTransaction = models.sequelize.transaction;
      const originalFindByPk = models.MrPlanningRisk.findByPk;
      models.sequelize.transaction = async (cb) => cb({ fake: true });

      let updateCalled = false;
      models.MrPlanningRisk.findByPk = async () => ({
        id: 5,
        opd_id: 2,
        status_revisi: 'approved',
        versi: 1,
        update: async () => {
          updateCalled = true;
        },
      });

      try {
        await svc.createRevisionFromApprovedRisk({
          riskId: 5,
          body: {},
          user: { role: 'ADMINISTRATOR', opd: 'Dinas Uji Coba A' },
        });
        assert.fail('createRevisionFromApprovedRisk seharusnya melempar error boundary OPD, bukan sukses');
      } catch (error) {
        assert.strictEqual(error.statusCode, 403, `harus 403, didapat ${error.statusCode}, message=${error.message}`);
        assert.strictEqual(error.details?.code, 'MR_PLANNING_RISK_OPD_FORBIDDEN');
        assert.strictEqual(updateCalled, false, 'risk.update() TIDAK BOLEH dipanggil ketika boundary OPD menolak');
      } finally {
        models.sequelize.transaction = originalTransaction;
        models.MrPlanningRisk.findByPk = originalFindByPk;
      }
    }
  );
});

await test('mrPlanningRiskService.createRevisionFromApprovedRisk — caller OPD SAMA dengan target -> boundary MENGIZINKAN, revisi draft berhasil dibuat', async () => {
  delete require.cache[require.resolve('../services/mr/mrPlanningRiskService')];

  await withStubs(
    [[models.OpdPenanggungJawab, 'findOne', async ({ where }) => ({ id: 1, nama_opd: where.nama_opd })]],
    async () => {
      const svc = require('../services/mr/mrPlanningRiskService');

      const originalTransaction = models.sequelize.transaction;
      const originalFindByPk = models.MrPlanningRisk.findByPk;
      const originalHistoryCreate = models.MrPlanningRiskHistory.create;
      models.sequelize.transaction = async (cb) => cb({ fake: true });
      models.MrPlanningRiskHistory.create = async () => ({ id: 99 });

      let updateCalled = false;
      models.MrPlanningRisk.findByPk = async () => ({
        id: 5,
        opd_id: 1,
        status_revisi: 'approved',
        versi: 1,
        update: async () => {
          updateCalled = true;
        },
      });

      try {
        const result = await svc.createRevisionFromApprovedRisk({
          riskId: 5,
          body: {},
          user: { role: 'ADMINISTRATOR', opd: 'Dinas Uji Coba A' },
        });
        assert.ok(result?.success, 'createRevisionFromApprovedRisk harus berhasil ketika caller dan target berada di OPD yang sama');
        assert.strictEqual(updateCalled, true, 'risk.update() HARUS dipanggil ketika boundary OPD mengizinkan');
      } finally {
        models.sequelize.transaction = originalTransaction;
        models.MrPlanningRisk.findByPk = originalFindByPk;
        models.MrPlanningRiskHistory.create = originalHistoryCreate;
      }
    }
  );
});

await test('mrPlanningRiskService.createRevisionFromApprovedRisk — SUPER_ADMIN dikecualikan dari boundary OPD (otoritas tenant-wide)', async () => {
  delete require.cache[require.resolve('../services/mr/mrPlanningRiskService')];

  let opdLookupCalled = false;
  await withStubs(
    [[models.OpdPenanggungJawab, 'findOne', async () => {
      opdLookupCalled = true;
      return null;
    }]],
    async () => {
      const svc = require('../services/mr/mrPlanningRiskService');

      const originalTransaction = models.sequelize.transaction;
      const originalFindByPk = models.MrPlanningRisk.findByPk;
      const originalHistoryCreate = models.MrPlanningRiskHistory.create;
      models.sequelize.transaction = async (cb) => cb({ fake: true });
      models.MrPlanningRiskHistory.create = async () => ({ id: 99 });

      let updateCalled = false;
      models.MrPlanningRisk.findByPk = async () => ({
        id: 5,
        opd_id: 2,
        status_revisi: 'approved',
        versi: 1,
        update: async () => {
          updateCalled = true;
        },
      });

      try {
        const result = await svc.createRevisionFromApprovedRisk({
          riskId: 5,
          body: {},
          user: { role: 'SUPER_ADMIN', opd: 'Dinas Manapun' },
        });
        assert.ok(result?.success, 'createRevisionFromApprovedRisk harus berhasil untuk SUPER_ADMIN');
        assert.strictEqual(updateCalled, true, 'risk.update() HARUS dipanggil untuk SUPER_ADMIN');
        assert.strictEqual(opdLookupCalled, false, 'SUPER_ADMIN tidak boleh memicu lookup OpdPenanggungJawab sama sekali');
      } finally {
        models.sequelize.transaction = originalTransaction;
        models.MrPlanningRisk.findByPk = originalFindByPk;
        models.MrPlanningRiskHistory.create = originalHistoryCreate;
      }
    }
  );
});

console.log('\n=== S7-R006: mrPlanningRiskService.createRiskFromContext — boundary OPD (target = context yang dipilih) ===');

await test('mrPlanningRiskService.createRiskFromContext — context milik OPD LAIN -> DITOLAK, MrPlanningRisk.create TIDAK dipanggil', async () => {
  delete require.cache[require.resolve('../services/mr/mrPlanningRiskService')];

  await withStubs(
    [[models.OpdPenanggungJawab, 'findOne', async ({ where }) => ({ id: 1, nama_opd: where.nama_opd })]],
    async () => {
      const svc = require('../services/mr/mrPlanningRiskService');

      const originalTransaction = models.sequelize.transaction;
      const originalContextFindOne = models.MrPlanningContext.findOne;
      const originalCreate = models.MrPlanningRisk.create;
      models.sequelize.transaction = async (cb) => cb({ fake: true });
      models.MrPlanningContext.findOne = async () => ({ id: 3, opd_id: 2, is_active: true });

      let createCalled = false;
      models.MrPlanningRisk.create = async () => {
        createCalled = true;
        return {};
      };

      try {
        await svc.createRiskFromContext({
          contextId: 3,
          body: {},
          user: { role: 'ADMINISTRATOR', opd: 'Dinas Uji Coba A' },
        });
        assert.fail('createRiskFromContext seharusnya melempar error boundary OPD, bukan sukses');
      } catch (error) {
        assert.strictEqual(error.statusCode, 403, `harus 403, didapat ${error.statusCode}, message=${error.message}`);
        assert.strictEqual(error.details?.code, 'MR_PLANNING_RISK_OPD_FORBIDDEN');
        assert.strictEqual(createCalled, false, 'MrPlanningRisk.create() TIDAK BOLEH dipanggil ketika boundary OPD menolak');
      } finally {
        models.sequelize.transaction = originalTransaction;
        models.MrPlanningContext.findOne = originalContextFindOne;
        models.MrPlanningRisk.create = originalCreate;
      }
    }
  );
});

await test('mrPlanningRiskService.createRiskFromContext — context milik OPD SENDIRI -> boundary MENGIZINKAN (error lanjutan, jika ada, BUKAN kode boundary)', async () => {
  delete require.cache[require.resolve('../services/mr/mrPlanningRiskService')];

  await withStubs(
    [[models.OpdPenanggungJawab, 'findOne', async ({ where }) => ({ id: 1, nama_opd: where.nama_opd })]],
    async () => {
      const svc = require('../services/mr/mrPlanningRiskService');

      const originalTransaction = models.sequelize.transaction;
      const originalContextFindOne = models.MrPlanningContext.findOne;
      models.sequelize.transaction = async (cb) => cb({ fake: true });
      models.MrPlanningContext.findOne = async () => ({ id: 3, opd_id: 1, is_active: true });

      try {
        await svc.createRiskFromContext({
          contextId: 3,
          body: {},
          user: { role: 'ADMINISTRATOR', opd: 'Dinas Uji Coba A' },
        });
      } catch (error) {
        assert.notStrictEqual(
          error.details?.code,
          'MR_PLANNING_RISK_OPD_FORBIDDEN',
          'boundary TIDAK BOLEH menolak ketika context dan caller berada di OPD yang sama'
        );
      } finally {
        models.sequelize.transaction = originalTransaction;
        models.MrPlanningContext.findOne = originalContextFindOne;
      }
    }
  );
});

await test('mrPlanningRiskService.createRiskFromContext — SUPER_ADMIN dikecualikan dari boundary OPD (otoritas tenant-wide)', async () => {
  delete require.cache[require.resolve('../services/mr/mrPlanningRiskService')];

  let opdLookupCalled = false;
  await withStubs(
    [[models.OpdPenanggungJawab, 'findOne', async () => {
      opdLookupCalled = true;
      return null;
    }]],
    async () => {
      const svc = require('../services/mr/mrPlanningRiskService');

      const originalTransaction = models.sequelize.transaction;
      const originalContextFindOne = models.MrPlanningContext.findOne;
      models.sequelize.transaction = async (cb) => cb({ fake: true });
      models.MrPlanningContext.findOne = async () => ({ id: 3, opd_id: 2, is_active: true });

      try {
        await svc.createRiskFromContext({
          contextId: 3,
          body: {},
          user: { role: 'SUPER_ADMIN', opd: 'Dinas Manapun' },
        });
      } catch (error) {
        assert.notStrictEqual(error.details?.code, 'MR_PLANNING_RISK_OPD_FORBIDDEN', 'SUPER_ADMIN tidak boleh diblokir boundary OPD');
      } finally {
        models.sequelize.transaction = originalTransaction;
        models.MrPlanningContext.findOne = originalContextFindOne;
      }
      assert.strictEqual(opdLookupCalled, false, 'SUPER_ADMIN tidak boleh memicu lookup OpdPenanggungJawab sama sekali');
    }
  );
});

console.log('\n=== S7-R: mrPlanningRiskService.createProposalIntake — boundary OPD (jalur delegasi Renstra & jalur context baru) ===');

await test('createProposalIntake — jalur Renstra (delegasi createRiskFromContext), context milik OPD SAMA -> boundary MENGIZINKAN (error lanjutan, jika ada, BUKAN kode boundary)', async () => {
  delete require.cache[require.resolve('../services/mr/mrPlanningRiskService')];

  await withStubs(
    [
      [models.OpdPenanggungJawab, 'findOne', async ({ where }) => ({ id: 1, nama_opd: where.nama_opd })],
      [models.sequelize, 'query', async () => [[{ id: 1, group_id: 1, kode_item: 'RENSTRA', nama_item: 'Renstra', nilai_text: 'renstra', urutan: 1 }]]],
    ],
    async () => {
      const svc = require('../services/mr/mrPlanningRiskService');

      const originalTransaction = models.sequelize.transaction;
      const originalContextFindOne = models.MrPlanningContext.findOne;
      models.sequelize.transaction = async (cb) => cb({ fake: true });
      models.MrPlanningContext.findOne = async () => ({ id: 3, opd_id: 1, is_active: true });

      try {
        await svc.createProposalIntake({
          body: { proposal_source_type: 'RENSTRA', context_id: 3 },
          user: { role: 'ADMINISTRATOR', opd: 'Dinas Uji Coba A' },
        });
      } catch (error) {
        assert.notStrictEqual(
          error.details?.code,
          'MR_PLANNING_RISK_OPD_FORBIDDEN',
          'boundary TIDAK BOLEH menolak ketika context dan caller berada di OPD yang sama (jalur delegasi Renstra)'
        );
      } finally {
        models.sequelize.transaction = originalTransaction;
        models.MrPlanningContext.findOne = originalContextFindOne;
      }
    }
  );
});

await test('createProposalIntake — jalur context baru (non-Renstra), payload.opd_id milik OPD SAMA -> boundary MENGIZINKAN (error lanjutan, jika ada, BUKAN kode boundary)', async () => {
  delete require.cache[require.resolve('../services/mr/mrPlanningRiskService')];

  await withStubs(
    [
      [models.OpdPenanggungJawab, 'findOne', async ({ where }) => ({ id: 1, nama_opd: where.nama_opd })],
      [models.sequelize, 'query', async () => [[{ id: 2, group_id: 1, kode_item: 'MANUAL_ADHOC', nama_item: 'Manual', nilai_text: 'manual_adhoc', urutan: 1 }]]],
    ],
    async () => {
      const svc = require('../services/mr/mrPlanningRiskService');

      const originalTransaction = models.sequelize.transaction;
      models.sequelize.transaction = async (cb) => cb({ fake: true });

      try {
        await svc.createProposalIntake({
          body: {
            proposal_source_type: 'MANUAL_ADHOC',
            tahun: 2026,
            periode_type: 'tahunan',
            opd_id: 1, // OPD SENDIRI
            objek_risiko: 'Objek Uji Coba',
            nama_risiko: 'Risiko Uji Coba',
            kemungkinan_ref_id: 1,
            dampak_ref_id: 1,
          },
          user: { role: 'ADMINISTRATOR', opd: 'Dinas Uji Coba A' },
        });
      } catch (error) {
        assert.notStrictEqual(
          error.details?.code,
          'MR_PLANNING_RISK_OPD_FORBIDDEN',
          'boundary TIDAK BOLEH menolak ketika payload.opd_id adalah OPD caller sendiri (jalur context baru)'
        );
      } finally {
        models.sequelize.transaction = originalTransaction;
      }
    }
  );
});

await test('createProposalIntake — jalur context baru (non-Renstra), payload.opd_id milik OPD LAIN -> DITOLAK, NOL context/risk dibuat', async () => {
  delete require.cache[require.resolve('../services/mr/mrPlanningRiskService')];

  await withStubs(
    [
      [models.OpdPenanggungJawab, 'findOne', async ({ where }) => ({ id: 1, nama_opd: where.nama_opd })],
      [models.sequelize, 'query', async () => [[{ id: 2, group_id: 1, kode_item: 'MANUAL_ADHOC', nama_item: 'Manual', nilai_text: 'manual_adhoc', urutan: 1 }]]],
    ],
    async () => {
      const svc = require('../services/mr/mrPlanningRiskService');

      const originalTransaction = models.sequelize.transaction;
      const originalContextCreate = models.MrPlanningContext.create;
      const originalRiskCreate = models.MrPlanningRisk.create;
      models.sequelize.transaction = async (cb) => cb({ fake: true });

      let contextCreateCalled = false;
      let riskCreateCalled = false;
      models.MrPlanningContext.create = async () => {
        contextCreateCalled = true;
        return {};
      };
      models.MrPlanningRisk.create = async () => {
        riskCreateCalled = true;
        return {};
      };

      try {
        await svc.createProposalIntake({
          body: {
            proposal_source_type: 'MANUAL_ADHOC',
            tahun: 2026,
            periode_type: 'tahunan',
            opd_id: 2, // OPD LAIN
            objek_risiko: 'Objek Uji Coba',
            nama_risiko: 'Risiko Uji Coba',
            kemungkinan_ref_id: 1,
            dampak_ref_id: 1,
          },
          user: { role: 'ADMINISTRATOR', opd: 'Dinas Uji Coba A' },
        });
        assert.fail('createProposalIntake seharusnya melempar error boundary OPD, bukan sukses');
      } catch (error) {
        assert.strictEqual(error.statusCode, 403, `harus 403, didapat ${error.statusCode}, message=${error.message}`);
        assert.strictEqual(error.details?.code, 'MR_PLANNING_RISK_OPD_FORBIDDEN');
        assert.strictEqual(contextCreateCalled, false, 'MrPlanningContext.create() TIDAK BOLEH dipanggil ketika boundary OPD menolak');
        assert.strictEqual(riskCreateCalled, false, 'MrPlanningRisk.create() TIDAK BOLEH dipanggil ketika boundary OPD menolak');
      } finally {
        models.sequelize.transaction = originalTransaction;
        models.MrPlanningContext.create = originalContextCreate;
        models.MrPlanningRisk.create = originalRiskCreate;
      }
    }
  );
});

await test('createProposalIntake — SUPER_ADMIN dikecualikan dari boundary OPD (otoritas tenant-wide, jalur context baru)', async () => {
  delete require.cache[require.resolve('../services/mr/mrPlanningRiskService')];

  let opdLookupCalled = false;
  await withStubs(
    [
      [models.OpdPenanggungJawab, 'findOne', async () => {
        opdLookupCalled = true;
        return null;
      }],
      [models.sequelize, 'query', async () => [[{ id: 2, group_id: 1, kode_item: 'MANUAL_ADHOC', nama_item: 'Manual', nilai_text: 'manual_adhoc', urutan: 1 }]]],
    ],
    async () => {
      const svc = require('../services/mr/mrPlanningRiskService');

      const originalTransaction = models.sequelize.transaction;
      models.sequelize.transaction = async (cb) => cb({ fake: true });

      try {
        await svc.createProposalIntake({
          body: {
            proposal_source_type: 'MANUAL_ADHOC',
            tahun: 2026,
            periode_type: 'tahunan',
            opd_id: 2, // OPD manapun, SUPER_ADMIN tidak dibatasi
            objek_risiko: 'Objek Uji Coba',
            nama_risiko: 'Risiko Uji Coba',
            kemungkinan_ref_id: 1,
            dampak_ref_id: 1,
          },
          user: { role: 'SUPER_ADMIN', opd: 'Dinas Manapun' },
        });
      } catch (error) {
        assert.notStrictEqual(error.details?.code, 'MR_PLANNING_RISK_OPD_FORBIDDEN', 'SUPER_ADMIN tidak boleh diblokir boundary OPD');
      } finally {
        models.sequelize.transaction = originalTransaction;
      }
      assert.strictEqual(opdLookupCalled, false, 'SUPER_ADMIN tidak boleh memicu lookup OpdPenanggungJawab sama sekali');
    }
  );
});

console.log('\n=== S7-R: mrPlanningRiskService.repairPlaceholderRiskSources — boundary OPD (kebijakan CEA: validasi SEMUA target dulu, baru mutasi) ===');

await test('repairPlaceholderRiskSources — SEMUA target (risks + context item) milik OPD SAMA -> boundary MENGIZINKAN, SEMUA target dimutasi', async () => {
  delete require.cache[require.resolve('../services/mr/mrPlanningRiskService')];

  await withStubs(
    [[models.OpdPenanggungJawab, 'findOne', async ({ where }) => ({ id: 1, nama_opd: where.nama_opd })]],
    async () => {
      const svc = require('../services/mr/mrPlanningRiskService');

      const originalTransaction = models.sequelize.transaction;
      const originalRiskFindByPk = models.MrPlanningRisk.findByPk;
      const originalContextItemFindByPk = models.MrPlanningContextItem.findByPk;
      models.sequelize.transaction = async (cb) => cb({ fake: true });

      let riskAUpdateCalled = false;
      let riskBUpdateCalled = false;
      let contextItemUpdateCalled = false;
      const risks = {
        10: { id: 10, opd_id: 1, metadata_json: {}, update: async () => { riskAUpdateCalled = true; } },
        11: { id: 11, opd_id: 1, metadata_json: {}, update: async () => { riskBUpdateCalled = true; } },
      };
      models.MrPlanningRisk.findByPk = async (id) => risks[id] || null;
      models.MrPlanningContextItem.findByPk = async () => ({
        id: 5,
        opd_id: 1,
        metadata_json: {},
        update: async () => {
          contextItemUpdateCalled = true;
        },
      });

      try {
        const result = await svc.repairPlaceholderRiskSources({
          riskIds: [10, 11],
          contextItemId: 5,
          payload: { objek_risiko: 'Perbaikan Uji Coba' },
          user: { role: 'ADMINISTRATOR', opd: 'Dinas Uji Coba A' },
        });

        assert.ok(result?.success, 'repairPlaceholderRiskSources harus berhasil ketika SEMUA target berada di OPD yang sama dengan caller');
        assert.strictEqual(riskAUpdateCalled, true, 'risk 10.update() HARUS dipanggil ketika seluruh target berwenang');
        assert.strictEqual(riskBUpdateCalled, true, 'risk 11.update() HARUS dipanggil ketika seluruh target berwenang');
        assert.strictEqual(contextItemUpdateCalled, true, 'contextItem.update() HARUS dipanggil ketika seluruh target berwenang');
      } finally {
        models.sequelize.transaction = originalTransaction;
        models.MrPlanningRisk.findByPk = originalRiskFindByPk;
        models.MrPlanningContextItem.findByPk = originalContextItemFindByPk;
      }
    }
  );
});

await test('repairPlaceholderRiskSources — SATU Risk di riskIds[] milik OPD LAIN -> DITOLAK, risk.update TIDAK dipanggil', async () => {
  delete require.cache[require.resolve('../services/mr/mrPlanningRiskService')];

  await withStubs(
    [[models.OpdPenanggungJawab, 'findOne', async ({ where }) => ({ id: 1, nama_opd: where.nama_opd })]],
    async () => {
      const svc = require('../services/mr/mrPlanningRiskService');

      const originalTransaction = models.sequelize.transaction;
      const originalRiskFindByPk = models.MrPlanningRisk.findByPk;
      models.sequelize.transaction = async (cb) => cb({ fake: true });

      let updateCalled = false;
      models.MrPlanningRisk.findByPk = async () => ({
        id: 20,
        opd_id: 2, // OPD lain
        metadata_json: {},
        update: async () => {
          updateCalled = true;
        },
      });

      try {
        await svc.repairPlaceholderRiskSources({
          riskIds: [20],
          payload: {},
          user: { role: 'ADMINISTRATOR', opd: 'Dinas Uji Coba A' },
        });
        assert.fail('repairPlaceholderRiskSources seharusnya melempar error boundary OPD, bukan sukses');
      } catch (error) {
        assert.strictEqual(error.statusCode, 403, `harus 403, didapat ${error.statusCode}, message=${error.message}`);
        assert.strictEqual(error.details?.code, 'MR_PLANNING_RISK_OPD_FORBIDDEN');
        assert.strictEqual(updateCalled, false, 'risk.update() TIDAK BOLEH dipanggil ketika boundary OPD menolak');
      } finally {
        models.sequelize.transaction = originalTransaction;
        models.MrPlanningRisk.findByPk = originalRiskFindByPk;
      }
    }
  );
});

await test('repairPlaceholderRiskSources — contextItemId milik OPD LAIN -> DITOLAK, contextItem.update TIDAK dipanggil', async () => {
  delete require.cache[require.resolve('../services/mr/mrPlanningRiskService')];

  await withStubs(
    [[models.OpdPenanggungJawab, 'findOne', async ({ where }) => ({ id: 1, nama_opd: where.nama_opd })]],
    async () => {
      const svc = require('../services/mr/mrPlanningRiskService');

      const originalTransaction = models.sequelize.transaction;
      const originalContextItemFindByPk = models.MrPlanningContextItem.findByPk;
      models.sequelize.transaction = async (cb) => cb({ fake: true });

      let contextItemUpdateCalled = false;
      models.MrPlanningContextItem.findByPk = async () => ({
        id: 5,
        opd_id: 2, // OPD lain
        metadata_json: {},
        update: async () => {
          contextItemUpdateCalled = true;
        },
      });

      try {
        await svc.repairPlaceholderRiskSources({
          contextItemId: 5,
          payload: {},
          user: { role: 'ADMINISTRATOR', opd: 'Dinas Uji Coba A' },
        });
        assert.fail('repairPlaceholderRiskSources seharusnya melempar error boundary OPD, bukan sukses');
      } catch (error) {
        assert.strictEqual(error.statusCode, 403, `harus 403, didapat ${error.statusCode}, message=${error.message}`);
        assert.strictEqual(error.details?.code, 'MR_PLANNING_RISK_OPD_FORBIDDEN');
        assert.strictEqual(contextItemUpdateCalled, false, 'contextItem.update() TIDAK BOLEH dipanggil ketika boundary OPD menolak');
      } finally {
        models.sequelize.transaction = originalTransaction;
        models.MrPlanningContextItem.findByPk = originalContextItemFindByPk;
      }
    }
  );
});

await test('repairPlaceholderRiskSources — riskIds[] CAMPURAN (1 same-OPD + 1 cross-OPD) -> SELURUH REQUEST DITOLAK, NOL mutasi pada target MANA PUN (bukti kebijakan atomik CEA)', async () => {
  delete require.cache[require.resolve('../services/mr/mrPlanningRiskService')];

  await withStubs(
    [[models.OpdPenanggungJawab, 'findOne', async ({ where }) => ({ id: 1, nama_opd: where.nama_opd })]],
    async () => {
      const svc = require('../services/mr/mrPlanningRiskService');

      const originalTransaction = models.sequelize.transaction;
      const originalRiskFindByPk = models.MrPlanningRisk.findByPk;
      models.sequelize.transaction = async (cb) => cb({ fake: true });

      let sameOpdRiskUpdateCalled = false;
      let crossOpdRiskUpdateCalled = false;
      const risks = {
        // Risk pertama (same-OPD) dimuat & divalidasi LEBIH DULU dalam array —
        // membuktikan bahwa lolos validasi individual TIDAK cukup untuk memicu
        // mutasi sebelum SELURUH target selesai divalidasi.
        30: {
          id: 30,
          opd_id: 1, // OPD SAMA dengan caller
          metadata_json: {},
          update: async () => {
            sameOpdRiskUpdateCalled = true;
          },
        },
        31: {
          id: 31,
          opd_id: 2, // OPD LAIN — memicu penolakan seluruh request
          metadata_json: {},
          update: async () => {
            crossOpdRiskUpdateCalled = true;
          },
        },
      };
      models.MrPlanningRisk.findByPk = async (id) => risks[id] || null;

      try {
        await svc.repairPlaceholderRiskSources({
          riskIds: [30, 31],
          payload: { objek_risiko: 'Perbaikan Uji Coba' },
          user: { role: 'ADMINISTRATOR', opd: 'Dinas Uji Coba A' },
        });
        assert.fail('repairPlaceholderRiskSources seharusnya melempar error boundary OPD untuk SELURUH request, bukan sukses');
      } catch (error) {
        assert.strictEqual(error.statusCode, 403, `harus 403, didapat ${error.statusCode}, message=${error.message}`);
        assert.strictEqual(error.details?.code, 'MR_PLANNING_RISK_OPD_FORBIDDEN');
        assert.strictEqual(
          sameOpdRiskUpdateCalled,
          false,
          'risk 30 (same-OPD, valid secara individual) TIDAK BOLEH ikut termutasi — kebijakan CEA melarang mutasi sebagian sebelum SEMUA target divalidasi'
        );
        assert.strictEqual(crossOpdRiskUpdateCalled, false, 'risk 31 (cross-OPD) TIDAK BOLEH dimutasi ketika boundary OPD menolak');
      } finally {
        models.sequelize.transaction = originalTransaction;
        models.MrPlanningRisk.findByPk = originalRiskFindByPk;
      }
    }
  );
});

await test('repairPlaceholderRiskSources — SUPER_ADMIN dikecualikan dari boundary OPD (otoritas tenant-wide)', async () => {
  delete require.cache[require.resolve('../services/mr/mrPlanningRiskService')];

  let opdLookupCalled = false;
  await withStubs(
    [[models.OpdPenanggungJawab, 'findOne', async () => {
      opdLookupCalled = true;
      return null;
    }]],
    async () => {
      const svc = require('../services/mr/mrPlanningRiskService');

      const originalTransaction = models.sequelize.transaction;
      const originalRiskFindByPk = models.MrPlanningRisk.findByPk;
      models.sequelize.transaction = async (cb) => cb({ fake: true });

      let updateCalled = false;
      models.MrPlanningRisk.findByPk = async () => ({
        id: 40,
        opd_id: 2,
        metadata_json: {},
        update: async () => {
          updateCalled = true;
        },
      });

      try {
        const result = await svc.repairPlaceholderRiskSources({
          riskIds: [40],
          payload: {},
          user: { role: 'SUPER_ADMIN', opd: 'Dinas Manapun' },
        });
        assert.ok(result?.success, 'repairPlaceholderRiskSources harus berhasil untuk SUPER_ADMIN');
        assert.strictEqual(updateCalled, true, 'risk.update() HARUS dipanggil untuk SUPER_ADMIN');
        assert.strictEqual(opdLookupCalled, false, 'SUPER_ADMIN tidak boleh memicu lookup OpdPenanggungJawab sama sekali');
      } finally {
        models.sequelize.transaction = originalTransaction;
        models.MrPlanningRisk.findByPk = originalRiskFindByPk;
      }
    }
  );
});

console.log('\n=== S7-R009: mrPlanningRiskRecallService.recallRiskDariTemuan — boundary OPD ===');

await test('recallRiskDariTemuan — caller OPD BEDA dari target Risk -> DITOLAK, risk.update TIDAK dipanggil (boundary sebelum jalur mutasi manapun)', async () => {
  delete require.cache[require.resolve('../services/mr/mrPlanningRiskRecallService')];
  delete require.cache[require.resolve('../services/mr/mrPlanningRiskService')];

  await withStubs(
    [[models.OpdPenanggungJawab, 'findOne', async ({ where }) => ({ id: 1, nama_opd: where.nama_opd })]],
    async () => {
      const recallService = require('../services/mr/mrPlanningRiskRecallService');

      const originalRiskFindByPk = models.MrPlanningRisk.findByPk;
      const originalTemuanFindOne = models.MrPlanningTemuan.findOne;

      let riskUpdateCalled = false;
      let temuanFindOneCalled = false;
      models.MrPlanningRisk.findByPk = async () => ({
        id: 9,
        opd_id: 2, // target milik OPD lain
        status_revisi: 'draft',
        update: async () => {
          riskUpdateCalled = true;
        },
      });
      models.MrPlanningTemuan.findOne = async () => {
        temuanFindOneCalled = true;
        return null;
      };

      try {
        await recallService.recallRiskDariTemuan(9, {
          user: { role: 'ADMINISTRATOR', opd: 'Dinas Uji Coba A' },
        });
        assert.fail('recallRiskDariTemuan seharusnya melempar error boundary OPD, bukan sukses');
      } catch (error) {
        assert.strictEqual(error.statusCode, 403, `harus 403, didapat ${error.statusCode}, message=${error.message}`);
        assert.strictEqual(riskUpdateCalled, false, 'risk.update() TIDAK BOLEH dipanggil ketika boundary OPD menolak');
        assert.strictEqual(
          temuanFindOneCalled,
          false,
          'MrPlanningTemuan.findOne() TIDAK BOLEH dipanggil — boundary dievaluasi SEBELUM jalur mutasi manapun bercabang'
        );
      } finally {
        models.MrPlanningRisk.findByPk = originalRiskFindByPk;
        models.MrPlanningTemuan.findOne = originalTemuanFindOne;
      }
    }
  );
});

await test('recallRiskDariTemuan — caller OPD SAMA dengan target Risk -> boundary MENGIZINKAN, recall berhasil dievaluasi', async () => {
  delete require.cache[require.resolve('../services/mr/mrPlanningRiskRecallService')];
  delete require.cache[require.resolve('../services/mr/mrPlanningRiskService')];

  await withStubs(
    [[models.OpdPenanggungJawab, 'findOne', async ({ where }) => ({ id: 1, nama_opd: where.nama_opd })]],
    async () => {
      const recallService = require('../services/mr/mrPlanningRiskRecallService');

      const originalRiskFindByPk = models.MrPlanningRisk.findByPk;
      const originalTemuanFindOne = models.MrPlanningTemuan.findOne;

      let riskUpdateCalled = false;
      models.MrPlanningRisk.findByPk = async () => ({
        id: 9,
        opd_id: 1, // target JUGA milik OPD caller
        status_revisi: 'draft',
        nama_risiko: 'sama',
        uraian_risiko: 'sama',
        penyebab_risiko: 'sama',
        dampak_risiko: 'sama',
        update: async () => {
          riskUpdateCalled = true;
        },
      });
      models.MrPlanningTemuan.findOne = async () => ({
        id: 55,
        kode_temuan: 'T1',
        judul_temuan: 'sama',
        uraian_temuan: 'sama',
        sebab: 'sama',
        akibat: 'sama',
      });

      try {
        const laporan = await recallService.recallRiskDariTemuan(9, {
          user: { role: 'ADMINISTRATOR', opd: 'Dinas Uji Coba A' },
        });
        assert.ok(laporan, 'recallRiskDariTemuan harus berhasil ketika caller dan target berada di OPD yang sama');
        assert.strictEqual(riskUpdateCalled, true, 'risk.update() HARUS dipanggil ketika boundary OPD mengizinkan');
      } finally {
        models.MrPlanningRisk.findByPk = originalRiskFindByPk;
        models.MrPlanningTemuan.findOne = originalTemuanFindOne;
      }
    }
  );
});

await test('recallRiskDariTemuan — SUPER_ADMIN dikecualikan dari boundary OPD (otoritas tenant-wide)', async () => {
  delete require.cache[require.resolve('../services/mr/mrPlanningRiskRecallService')];
  delete require.cache[require.resolve('../services/mr/mrPlanningRiskService')];

  let opdLookupCalled = false;
  await withStubs(
    [[models.OpdPenanggungJawab, 'findOne', async () => {
      opdLookupCalled = true;
      return null;
    }]],
    async () => {
      const recallService = require('../services/mr/mrPlanningRiskRecallService');

      const originalRiskFindByPk = models.MrPlanningRisk.findByPk;
      const originalTemuanFindOne = models.MrPlanningTemuan.findOne;

      let riskUpdateCalled = false;
      models.MrPlanningRisk.findByPk = async () => ({
        id: 9,
        opd_id: 2,
        status_revisi: 'draft',
        nama_risiko: 'sama',
        uraian_risiko: 'sama',
        penyebab_risiko: 'sama',
        dampak_risiko: 'sama',
        update: async () => {
          riskUpdateCalled = true;
        },
      });
      models.MrPlanningTemuan.findOne = async () => ({
        id: 55,
        kode_temuan: 'T1',
        judul_temuan: 'sama',
        uraian_temuan: 'sama',
        sebab: 'sama',
        akibat: 'sama',
      });

      try {
        const laporan = await recallService.recallRiskDariTemuan(9, {
          user: { role: 'SUPER_ADMIN', opd: 'Dinas Manapun' },
        });
        assert.ok(laporan, 'recallRiskDariTemuan harus berhasil untuk SUPER_ADMIN');
        assert.strictEqual(riskUpdateCalled, true, 'risk.update() HARUS dipanggil untuk SUPER_ADMIN');
        assert.strictEqual(opdLookupCalled, false, 'SUPER_ADMIN tidak boleh memicu lookup OpdPenanggungJawab sama sekali');
      } finally {
        models.MrPlanningRisk.findByPk = originalRiskFindByPk;
        models.MrPlanningTemuan.findOne = originalTemuanFindOne;
      }
    }
  );
});

} // end runAllTests

runAllTests().then(() => {
  console.log(`\n=== Hasil: ${pass} pass, ${fail} fail ===`);
  process.exit(fail > 0 ? 1 : 0);
}).catch((error) => {
  console.error('FATAL: runAllTests() melempar exception tak tertangani:', error.stack || error.message);
  process.exit(1);
});
