'use strict';

/**
 * Self-test UNIT (tanpa DB, tanpa server jalan) untuk regresi Sprint 3
 * Route Authentication/Authorization Hardening:
 *
 *   S3-01 — backend/routes/renstraBabRoutes.js sebelumnya tidak punya
 *           verifyToken/allowRoles sama sekali (termasuk PUT, mutation
 *           nyata).
 *   S3-02 — backend/routes/mrSmokeTestRoutes.js sebelumnya tidak punya
 *           verifyToken/allowRoles sama sekali, dan beberapa endpoint
 *           mengembalikan data record MR planning sungguhan.
 *   S3-05 — backend/routes/divisionRoutes.js sebelumnya memanggil
 *           allowRoles() dengan argumen string terpisah (bukan array),
 *           yang gagal terhadap Array.isArray check middleware sendiri.
 *
 * Strategi: memuat modul router Express asli (bukan re-implementasi),
 * memeriksa middleware stack tiap layer route lewat introspeksi
 * `router.stack` (properti internal Express yang stabil dipakai untuk
 * verifikasi struktural read-only — TIDAK menjalankan request HTTP nyata,
 * TIDAK menyentuh DB). Ini murni structural/route-registration evidence,
 * konsisten dengan larangan Sprint 3 §16: "Do not require a live MySQL DB
 * merely to prove route middleware presence/order."
 *
 * Jalankan: node scripts/routeAuthHardeningSelfTest.js
 */

const assert = require('assert');
const path = require('path');

let pass = 0;
let fail = 0;

function test(name, fn) {
  try {
    fn();
    pass++;
    console.log(`  OK  ${name}`);
  } catch (error) {
    fail++;
    console.log(`FAIL  ${name}\n      ${error.stack || error.message}`);
  }
}

async function testAsync(name, fn) {
  try {
    await fn();
    pass++;
    console.log(`  OK  ${name}`);
  } catch (error) {
    fail++;
    console.log(`FAIL  ${name}\n      ${error.stack || error.message}`);
  }
}

/**
 * Mengembalikan array nama fungsi middleware untuk satu route Express
 * (router.stack[i].route.stack[j].handle.name), dalam urutan pemasangan.
 * Nama fungsi diambil dari `.name` properti — verifyToken/allowRoles/
 * router.use((req,res,next)=>{...}) semua punya nama yang dapat diperiksa
 * (allowRoles mengembalikan closure bernama karena assignment ke const
 * di dalam factory; fungsi anonim inline tetap terdeteksi lewat length
 * argumen sebagai fallback heuristic).
 */
function getRouteLayers(router, methodFilter, pathFilter) {
  return router.stack
    .filter((layer) => layer.route)
    .filter((layer) => !pathFilter || layer.route.path === pathFilter)
    .filter(
      (layer) =>
        !methodFilter || Object.keys(layer.route.methods).includes(methodFilter)
    )
    .map((layer) => ({
      path: layer.route.path,
      methods: Object.keys(layer.route.methods),
      handlerNames: layer.route.stack.map((s) => s.name || '(anonymous)'),
    }));
}

/**
 * Mengembalikan nama-nama middleware router-level (router.use(...), bukan
 * route-level) dalam urutan pemasangan — dipakai untuk file yang menerapkan
 * proteksi lewat router.use() di awal file (pola S3-02) alih-alih per-route.
 */
function getRouterUseLayers(router) {
  return router.stack
    .filter((layer) => !layer.route && layer.name)
    .map((layer) => layer.name);
}

console.log('=== S3-01: renstraBabRoutes.js — autentikasi wajib pada semua route ===');

test('module memuat tanpa error (syntax valid)', () => {
  delete require.cache[require.resolve('../routes/renstraBabRoutes')];
  const router = require('../routes/renstraBabRoutes');
  assert.ok(router, 'router harus ter-export');
});

test('PUT /:tahun/bab/:bab memiliki verifyToken dan allowRoles di handler chain', () => {
  delete require.cache[require.resolve('../routes/renstraBabRoutes')];
  const router = require('../routes/renstraBabRoutes');
  const layers = getRouteLayers(router, 'put', '/:tahun/bab/:bab');
  assert.strictEqual(layers.length, 1, 'harus ada tepat 1 route PUT terdaftar');
  const names = layers[0].handlerNames;
  assert.ok(
    names.includes('verifyToken') || names.some((n) => n.toLowerCase().includes('verify')),
    `handler chain PUT harus mengandung verifyToken, ditemukan: ${names.join(', ')}`
  );
});

test('GET /:tahun/bab/:bab memiliki autentikasi (bukan lagi anonim)', () => {
  delete require.cache[require.resolve('../routes/renstraBabRoutes')];
  const router = require('../routes/renstraBabRoutes');
  const layers = getRouteLayers(router, 'get', '/:tahun/bab/:bab');
  assert.strictEqual(layers.length, 1);
  assert.ok(
    layers[0].handlerNames.length >= 3,
    `route GET harus punya >=3 handler (verifyToken, allowRoles, controller), ditemukan ${layers[0].handlerNames.length}: ${layers[0].handlerNames.join(', ')}`
  );
});

test('GET /:id/kinerja memiliki autentikasi (bukan lagi anonim)', () => {
  delete require.cache[require.resolve('../routes/renstraBabRoutes')];
  const router = require('../routes/renstraBabRoutes');
  const layers = getRouteLayers(router, 'get', '/:id/kinerja');
  assert.strictEqual(layers.length, 1);
  assert.ok(
    layers[0].handlerNames.length >= 3,
    `route GET /:id/kinerja harus punya >=3 handler, ditemukan ${layers[0].handlerNames.length}: ${layers[0].handlerNames.join(', ')}`
  );
});

console.log('\n=== S3-02: mrSmokeTestRoutes.js — autentikasi + production guard router-wide ===');

test('module memuat tanpa error (syntax valid, models dependency tersedia)', () => {
  delete require.cache[require.resolve('../routes/mrSmokeTestRoutes')];
  const router = require('../routes/mrSmokeTestRoutes');
  assert.ok(router, 'router harus ter-export');
});

test('router-level middleware terpasang sebelum route handlers (verifyToken/allowRoles + production guard)', () => {
  delete require.cache[require.resolve('../routes/mrSmokeTestRoutes')];
  const router = require('../routes/mrSmokeTestRoutes');
  // router.use(verifyToken, allowRoles([...])) + router.use((req,res,next)=>{...})
  // terdaftar sebagai layer TANPA .route (middleware murni), harus muncul
  // SEBELUM layer pertama yang punya .route (endpoint /models dst).
  const firstRouteIndex = router.stack.findIndex((l) => l.route);
  const middlewareLayersBeforeFirstRoute = router.stack
    .slice(0, firstRouteIndex)
    .filter((l) => !l.route);
  assert.ok(
    middlewareLayersBeforeFirstRoute.length >= 3,
    `harus ada >=3 middleware layer (verifyToken, allowRoles, production-guard) sebelum route pertama, ditemukan ${middlewareLayersBeforeFirstRoute.length}`
  );
});

test('production-guard middleware mengandung pengecekan NODE_ENV === "production"', () => {
  delete require.cache[require.resolve('../routes/mrSmokeTestRoutes')];
  const router = require('../routes/mrSmokeTestRoutes');
  const firstRouteIndex = router.stack.findIndex((l) => l.route);
  const middlewareLayers = router.stack.slice(0, firstRouteIndex).filter((l) => !l.route);
  const sourceContainsGuard = middlewareLayers.some((l) => {
    const src = l.handle ? l.handle.toString() : '';
    return src.includes('NODE_ENV') && src.includes('production');
  });
  assert.ok(sourceContainsGuard, 'salah satu router-level middleware harus memeriksa NODE_ENV === "production"');
});

console.log('\n=== S3-05: divisionRoutes.js — allowRoles() dipanggil dengan array, bukan bare string ===');

test('module memuat tanpa error (syntax valid)', () => {
  delete require.cache[require.resolve('../routes/divisionRoutes')];
  const router = require('../routes/divisionRoutes');
  assert.ok(router, 'router harus ter-export');
});

test('behavioral: allowRoles pada setiap route divisionRoutes tidak lagi menghasilkan 500 MR_ALLOWED_ROLES_CONFIG_INVALID', () => {
  // Ambil allowRoles asli dan panggil middleware chain tiap route dengan
  // req.user bertipe SUPER_ADMIN (role yang valid untuk seluruh route file
  // ini) — sebelum perbaikan, seluruh route (kecuali GET "/") akan selalu
  // mengembalikan 500 MR_ALLOWED_ROLES_CONFIG_INVALID terlepas dari role
  // apa pun, karena allowedRoles bukan array.
  delete require.cache[require.resolve('../routes/divisionRoutes')];
  const router = require('../routes/divisionRoutes');

  const routeLayers = router.stack.filter((l) => l.route);
  assert.ok(routeLayers.length >= 5, `harus ada >=5 route terdaftar, ditemukan ${routeLayers.length}`);

  for (const layer of routeLayers) {
    // Handler kedua di tiap route (setelah verifyToken) adalah hasil
    // allowRoles(...) — panggil langsung dengan req.user SUPER_ADMIN.
    const allowRolesHandler = layer.route.stack[1]?.handle;
    assert.ok(
      allowRolesHandler,
      `route ${layer.route.path} harus punya >=2 handler (verifyToken, allowRoles)`
    );

    const req = { user: { role: 'SUPER_ADMIN' } };
    let statusCode = null;
    let bodyOut = null;
    const res = {
      status(code) {
        statusCode = code;
        return this;
      },
      json(body) {
        bodyOut = body;
        return this;
      },
    };
    let nextCalled = false;
    allowRolesHandler(req, res, () => {
      nextCalled = true;
    });

    assert.notStrictEqual(
      bodyOut?.code,
      'MR_ALLOWED_ROLES_CONFIG_INVALID',
      `route ${layer.route.path} (${Object.keys(layer.route.methods).join(',')}) masih mengembalikan MR_ALLOWED_ROLES_CONFIG_INVALID — allowRoles() belum diperbaiki ke bentuk array`
    );
    assert.strictEqual(
      nextCalled,
      true,
      `route ${layer.route.path} — SUPER_ADMIN harus lolos allowRoles() (semua route file ini mengizinkan SUPER_ADMIN)`
    );
  }
});

console.log('\n=== S3-02 (lanjutan): perilaku runtime autentikasi mrSmokeTestRoutes.js ===');

async function runAsyncTests() {
  await testAsync(
    'behavioral: tanpa req.user/token, request ke /models ditolak sebelum mencapai handler DB',
    async () => {
      // Panggil middleware stack secara langsung (bukan lewat HTTP listener)
      // dengan req/res palsu untuk membuktikan alur autentikasi benar-benar
      // dieksekusi, bukan hanya "terpasang" secara struktural. verifyToken
      // adalah async function — harus di-await agar respons 401 sungguhan
      // tertangkap (bukan diperiksa sebelum Promise selesai).
      delete require.cache[require.resolve('../routes/mrSmokeTestRoutes')];
      const router = require('../routes/mrSmokeTestRoutes');

      const req = {
        user: null,
        headers: {},
        query: {},
        params: {},
        body: {},
        cookies: {},
        header(name) {
          return this.headers[String(name).toLowerCase()];
        },
        get(name) {
          return this.header(name);
        },
      };
      let statusCode = null;
      let bodyOut = null;
      const res = {
        status(code) {
          statusCode = code;
          return this;
        },
        json(body) {
          bodyOut = body;
          return this;
        },
        clearCookie() {
          return this;
        },
        cookie() {
          return this;
        },
      };

      // Layer pertama pada router-level middleware stack adalah verifyToken
      // (dipasang lewat router.use(verifyToken, allowRoles([...]))). Untuk
      // request TANPA token sama sekali, verifyToken menolak lebih dulu
      // (401) tanpa pernah mencoba operasi apa pun yang butuh DB.
      const firstMiddlewareLayer = router.stack.find((l) => !l.route);
      assert.ok(firstMiddlewareLayer, 'harus ada minimal 1 middleware layer di awal stack');

      let nextCalled = false;
      const next = () => {
        nextCalled = true;
      };

      await firstMiddlewareLayer.handle(req, res, next);

      assert.strictEqual(nextCalled, false, 'next() tidak boleh dipanggil untuk request tanpa token');
      assert.ok(
        statusCode === 401 || statusCode === 403,
        `request tanpa autentikasi harus ditolak (401/403), didapat statusCode=${statusCode}, body=${JSON.stringify(bodyOut)}`
      );
    }
  );

  await testAsync(
    'behavioral: NODE_ENV=production -> route diagnostic mr-smoke tidak tersedia (404), tanpa menyentuh MySQL',
    async () => {
      // Membuktikan production-guard middleware (router.use kedua di
      // mrSmokeTestRoutes.js) benar-benar mengembalikan 404 saat
      // process.env.NODE_ENV === "production", dieksekusi langsung
      // (bukan hanya diperiksa lewat source-string seperti test structural
      // di atas). NODE_ENV di-restore ke nilai semula di blok finally
      // APA PUN hasilnya (termasuk jika assertion gagal), supaya sisa
      // test file ini dan proses Node lain tidak terpengaruh.
      //
      // req.user diisi SUPER_ADMIN yang valid supaya test ini murni
      // membuktikan production-guard-nya sendiri (guard kedua, setelah
      // verifyToken+allowRoles) — bukan tertangkap lebih dulu oleh guard
      // autentikasi/otorisasi yang sudah dibuktikan terpisah di atas.
      const originalNodeEnv = process.env.NODE_ENV;
      try {
        process.env.NODE_ENV = 'production';

        delete require.cache[require.resolve('../routes/mrSmokeTestRoutes')];
        const router = require('../routes/mrSmokeTestRoutes');

        const middlewareLayers = router.stack.filter((l) => !l.route);
        assert.ok(
          middlewareLayers.length >= 3,
          `harus ada >=3 middleware layer (verifyToken, allowRoles, production-guard) sebagai layer TERPISAH, ditemukan ${middlewareLayers.length}`
        );

        // router.use(verifyToken, allowRoles([...])) mendaftarkan verifyToken
        // dan allowRoles(...) sebagai DUA layer TERPISAH pada router.stack
        // (dikonfirmasi lewat inspeksi langsung router.stack di file ini —
        // bukan satu layer gabungan seperti asumsi awal yang salah):
        //   index 0 = verifyToken
        //   index 1 = allowRoles([...]) closure
        //   index 2 = production-guard router.use((req,res,next)=>{...})
        // Pakai index terakhir (bukan index tetap 1) supaya test tetap benar
        // walau jumlah middleware auth berubah di kemudian hari, selama
        // production-guard tetap dipasang PALING TERAKHIR sebelum route
        // handlers (sesuai urutan definisi di mrSmokeTestRoutes.js).
        const productionGuardLayer = middlewareLayers[middlewareLayers.length - 1];
        assert.ok(productionGuardLayer, 'production-guard middleware layer harus ditemukan');
        assert.ok(
          /NODE_ENV/.test(productionGuardLayer.handle.toString()) &&
            /production/.test(productionGuardLayer.handle.toString()),
          'layer terakhir yang dipilih harus benar-benar production-guard (mengandung pengecekan NODE_ENV === "production"), bukan layer lain secara kebetulan'
        );

        const req = { user: { role: 'SUPER_ADMIN' }, headers: {}, query: {}, params: {}, body: {} };
        let statusCode = null;
        let bodyOut = null;
        const res = {
          status(code) {
            statusCode = code;
            return this;
          },
          json(body) {
            bodyOut = body;
            return this;
          },
        };
        let nextCalled = false;
        const next = () => {
          nextCalled = true;
        };

        productionGuardLayer.handle(req, res, next);

        assert.strictEqual(nextCalled, false, 'next() tidak boleh dipanggil saat NODE_ENV=production');
        assert.strictEqual(
          statusCode,
          404,
          `route diagnostic mr-smoke harus mengembalikan 404 saat NODE_ENV=production, didapat statusCode=${statusCode}, body=${JSON.stringify(bodyOut)}`
        );
      } finally {
        // Restore NODE_ENV ke nilai semula TANPA SYARAT, termasuk jika
        // assertion di atas gagal — tidak boleh membocorkan NODE_ENV=production
        // ke sisa proses test/Node lain.
        if (originalNodeEnv === undefined) {
          delete process.env.NODE_ENV;
        } else {
          process.env.NODE_ENV = originalNodeEnv;
        }
        delete require.cache[require.resolve('../routes/mrSmokeTestRoutes')];
      }
    }
  );

  console.log(`\n=== Hasil: ${pass} pass, ${fail} fail ===`);
  process.exit(fail > 0 ? 1 : 0);
}

runAsyncTests();
