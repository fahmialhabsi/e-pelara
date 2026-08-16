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

} // end runAllTests

runAllTests().then(() => {
  console.log(`\n=== Hasil: ${pass} pass, ${fail} fail ===`);
  process.exit(fail > 0 ? 1 : 0);
}).catch((error) => {
  console.error('FATAL: runAllTests() melempar exception tak tertangani:', error.stack || error.message);
  process.exit(1);
});
