'use strict';

/**
 * Spesifikasi 35 v3 §37 Browser UAT — B.1.2 end-to-end lewat UI nyata
 * (Puppeteer), periode uji TAHUN FIKTIF (isolated, dihapus total di akhir),
 * TIDAK PERNAH menyentuh periode 2025 Semester I/II produksi nyata.
 *
 * Prasyarat: backend (port 3000) & frontend (port 3001) sudah berjalan.
 * Jalankan: node scripts/prosnpAutofillBrowserUAT.js
 */
const jwt = require('jsonwebtoken');
const path = require('path');
const puppeteer = require('puppeteer');
require('dotenv').config();
const db = require('./../models');
db.sequelize.options.logging = false;
const workflow = require('../services/prosnp/prosnpWorkflowService');

const TENANT_ID = 1;
const ACTOR_ADMIN = { id: 4, role: 'SUPER_ADMIN' };
const TAHUN_UJI = '2090';
const BASE_URL = 'http://localhost:3001';
const FIXTURE_IMAGE = path.join(__dirname, 'fixtures', 'prosnp-autofill', 'image-ocr.png');

let pass = 0, fail = 0;
async function step(name, fn) {
  try { await fn(); pass++; console.log(`  OK  ${name}`); }
  catch (error) { fail++; console.log(`FAIL  ${name}\n      ${error.message}`); }
}

(async () => {
  let periode, browser;
  try {
    console.log('=== Setup: buat periode uji tahun 2090 (TEST DATA — NOT OFFICIAL) ===');
    periode = await workflow.createPeriod({
      tahun: TAHUN_UJI, semester: '1', nama: 'TEST DATA — NOT OFFICIAL (Autofill Browser UAT)',
      tanggal_mulai: `${TAHUN_UJI}-01-01`, tanggal_tenggat: `${TAHUN_UJI}-06-30`, perangkat_daerah_id: 3,
    }, ACTOR_ADMIN, TENANT_ID);
    await workflow.activatePeriod(periode.id, ACTOR_ADMIN, TENANT_ID);
    console.log(`  Periode uji dibuat: id=${periode.id}`);

    const token = jwt.sign({ id: 23, username: 'uat-pelaksana', role: 'PELAKSANA', tenant_id: TENANT_ID }, process.env.JWT_SECRET, { expiresIn: '2h' });

    browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 1400 });
    const consoleErrors = [];
    page.on('console', (msg) => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
    page.on('pageerror', (err) => consoleErrors.push(err.message));

    await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded' });
    await page.evaluate((t) => {
      localStorage.setItem('token', t);
      // dokumen/tahun di sini HANYA utk memuaskan gate global App.jsx
      // (usePeriodeAktif) yang tidak terkait ProSN sama sekali — WAJIB tahun
      // nyata (2025) yang punya periode DPA aktif, BUKAN tahun fiktif 2090
      // (periode ProSN uji sendiri diakses lewat route param, bukan context ini).
      localStorage.setItem('dokumen', 'dpa');
      localStorage.setItem('tahun', '2025');
      sessionStorage.setItem('_epelara_sso', 'true');
    }, token);

    await step('Buka halaman detail periode uji, memuat B.1.1-B.1.4', async () => {
      await page.goto(`${BASE_URL}/prosnp/periode/${periode.id}`, { waitUntil: 'networkidle0', timeout: 30000 });
      const bodyText = await page.evaluate(() => document.body.innerText);
      if (!/B\.1\.1/.test(bodyText)) throw new Error('Halaman tidak memuat B.1.1 — gagal load periode.');
      await page.screenshot({ path: path.join(__dirname, 'prosnp-autofill-uat-01-overview.png'), fullPage: true });
    });

    await step('Tombol "+ Unggah & Analisis Dokumen" tampil pada keempat kartu B.1.1-B.1.4', async () => {
      const jumlahTombol = await page.evaluate(() => Array.from(document.querySelectorAll('button')).filter((b) => /Unggah & Analisis/i.test(b.textContent)).length);
      if (jumlahTombol < 4) throw new Error(`Ditemukan hanya ${jumlahTombol} tombol autofill, diharapkan >= 4.`);
    });

    await step('Klik tombol autofill B.1.2, modal terbuka pada step upload', async () => {
      const diklik = await page.evaluate(() => {
        const cards = Array.from(document.querySelectorAll('.card'));
        const cardB12 = cards.find((c) => /Koordinasi dengan Forkopimda|B\.1\.2/.test(c.querySelector('.card-header')?.textContent || ''));
        if (!cardB12) return false;
        const btn = Array.from(cardB12.querySelectorAll('button')).find((b) => /Unggah & Analisis/i.test(b.textContent));
        if (!btn) return false;
        btn.click();
        return true;
      });
      if (!diklik) throw new Error('Tombol autofill B.1.2 tidak ditemukan/tidak bisa diklik.');
      await new Promise((r) => setTimeout(r, 400));
      const modalTampil = await page.evaluate(() => !!document.querySelector('.modal.show'));
      if (!modalTampil) throw new Error('Modal tidak terbuka.');
      await page.screenshot({ path: path.join(__dirname, 'prosnp-autofill-uat-02-modal-upload.png'), fullPage: true });
    });

    await step('Upload fixture gambar, lanjut ke step analisis', async () => {
      const fileInput = await page.$('.modal.show input[type=file]');
      if (!fileInput) throw new Error('Input file tidak ditemukan di modal.');
      await fileInput.uploadFile(FIXTURE_IMAGE);
      await page.click('.modal.show button[type=submit]');
      await new Promise((r) => setTimeout(r, 1500));
      const bodyText = await page.evaluate(() => document.querySelector('.modal.show')?.innerText || '');
      if (!/Analisis & Isi Otomatis/.test(bodyText)) throw new Error(`Step analisis tidak tampil. Isi modal: ${bodyText.slice(0, 200)}`);
    });

    await step('Klik "Analisis & Isi Otomatis", preview tabel field tampil dgn nama_forum/tanggal_rapat terisi', async () => {
      await page.evaluate(() => {
        const btn = Array.from(document.querySelectorAll('.modal.show button')).find((b) => /Analisis & Isi Otomatis/.test(b.textContent));
        if (btn) btn.click();
      });
      await page.waitForFunction(() => /Gunakan \d+ Hasil/.test(document.querySelector('.modal.show')?.innerText || ''), { timeout: 60000 });
      const bodyText = await page.evaluate(() => document.querySelector('.modal.show')?.innerText || '');
      if (!/nama_forum/.test(bodyText)) throw new Error('Tabel preview tidak memuat field nama_forum.');
      await page.screenshot({ path: path.join(__dirname, 'prosnp-autofill-uat-03-preview.png'), fullPage: true });
    });

    let jumlahRapatSebelum;
    await step('Klik "Gunakan N Hasil", modal tertutup, register bertambah 1 baris', async () => {
      jumlahRapatSebelum = await db.ProsnRapatForkopimda.count({ where: { periode_id: periode.id } });
      await page.evaluate(() => {
        const btn = Array.from(document.querySelectorAll('.modal.show button')).find((b) => /Gunakan \d+ Hasil/.test(b.textContent));
        if (btn) btn.click();
      });
      await page.waitForFunction(() => !document.querySelector('.modal.show'), { timeout: 20000 });
      await new Promise((r) => setTimeout(r, 800));
      const jumlahSesudah = await db.ProsnRapatForkopimda.count({ where: { periode_id: periode.id } });
      if (jumlahSesudah !== jumlahRapatSebelum + 1) throw new Error(`Jumlah register rapat tidak bertambah tepat 1 (sebelum=${jumlahRapatSebelum}, sesudah=${jumlahSesudah}).`);
      const bodyText = await page.evaluate(() => document.body.innerText);
      if (!/RAPAT KOORDINASI/i.test(bodyText)) throw new Error('Baris register baru tidak tampil di halaman.');
      await page.screenshot({ path: path.join(__dirname, 'prosnp-autofill-uat-04-selesai.png'), fullPage: true });
    });

    await step('Tidak ada JS console error fatal', async () => {
      const fatal = consoleErrors.filter((e) => !/favicon|ResizeObserver/i.test(e));
      if (fatal.length) throw new Error(`Ditemukan ${fatal.length} console error: ${fatal.slice(0, 3).join(' | ')}`);
    });

    console.log(`\n=== HASIL BROWSER UAT AUTOFILL B.1.2: ${pass} lulus, ${fail} gagal ===`);
    console.log(`Screenshot tersimpan di: ${__dirname}`);
  } catch (fatal) {
    fail++;
    console.error('FATAL ERROR:', fatal.stack || fatal.message);
  } finally {
    if (browser) await browser.close();
    if (periode) {
      console.log('\n=== Cleanup: hapus periode uji tahun 2090 ===');
      const indikatorIds = (await db.ProsnIndikator.findAll({ where: { periode_id: periode.id }, attributes: ['id'] })).map((i) => i.id);
      const pengisianIds = (await db.ProsnPengisian.findAll({ where: { indikator_id: indikatorIds }, attributes: ['id'] })).map((p) => p.id);
      await db.ProsnBuktiIndikator.destroy({ where: { pengisian_id: pengisianIds } });
      await db.ProsnBuktiDukung.destroy({ where: { periode_id: periode.id } });
      await db.ProsnRapatForkopimda.destroy({ where: { periode_id: periode.id } });
      await db.ProsnRiwayatStatus.destroy({ where: { pengisian_id: pengisianIds } });
      await db.ProsnPengisian.destroy({ where: { id: pengisianIds } });
      await db.ProsnIndikator.destroy({ where: { periode_id: periode.id } });
      await db.ProsnPeriode.destroy({ where: { id: periode.id } });
      console.log('  Cleanup selesai.');
    }
  }
  process.exit(fail > 0 ? 1 : 0);
})();
