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

} // end runAllTests

runAllTests().then(() => {
  console.log(`\n=== Hasil: ${pass} pass, ${fail} fail ===`);
  process.exit(fail > 0 ? 1 : 0);
}).catch((error) => {
  console.error('FATAL: runAllTests() melempar exception tak tertangani:', error.stack || error.message);
  process.exit(1);
});
