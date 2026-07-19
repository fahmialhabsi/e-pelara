const {
  DpaPergeseran,
  DpaPergeseranItem,
  DpaPerubahan,
  DpaPerubahanItem,
  Dpa,
  RkaRincianBelanja,
  Tapd,
} = require('../models');
const puppeteer = require('puppeteer');

const ANGKA_ROMAWI = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];
const formatRp = (val) => `Rp${Number(val || 0).toLocaleString('id-ID')},00`;

module.exports = {
  // =============================================
  // PERGESERAN ANGGARAN
  // =============================================

  // GET /api/dpa/:dpa_id/dpa-tujuan — daftar DPA lain dalam OPD yang sama (untuk pergeseran antar sub kegiatan)
  async getDpaTujuan(req, res) {
    try {
      const dpaSumber = await Dpa.findByPk(req.params.dpa_id);
      if (!dpaSumber)
        return res.status(404).json({ success: false, message: 'DPA tidak ditemukan' });

      const list = await Dpa.findAll({
        where: { opd_id: dpaSumber.opd_id, tahun: dpaSumber.tahun, is_active_version: true },
        attributes: [
          'id',
          'sub_kegiatan',
          'kode_sub_kegiatan',
          'kegiatan',
          'kode_kegiatan',
          'program',
          'rka_id',
        ],
        order: [['sub_kegiatan', 'ASC']],
      });
      res.json({ success: true, data: list });
    } catch (e) {
      res.status(500).json({ success: false, message: e.message });
    }
  },

  // GET /api/dpa/master-rekening?q=keyword — cari kode rekening leaf dari master Permendagri 90
  async searchMasterRekening(req, res) {
    try {
      const { MasterKodeRekeningBelanja } = require('../models');
      const { q } = req.query;
      const { Op } = require('sequelize');
      const where = { is_leaf: 1 };
      if (q) {
        where[Op.or] = [
          { kode_rekening: { [Op.like]: `%${q}%` } },
          { uraian: { [Op.like]: `%${q}%` } },
        ];
      }
      const data = await MasterKodeRekeningBelanja.findAll({
        where,
        limit: 100,
        order: [['kode_rekening', 'ASC']],
      });
      res.json({ success: true, data });
    } catch (e) {
      res.status(500).json({ success: false, message: e.message });
    }
  },

  // GET /api/dpa/:dpa_id/rincian-rekening — daftar kode rekening untuk dropdown pergeseran
  async getRincianRekening(req, res) {
    try {
      const dpa = await Dpa.findByPk(req.params.dpa_id);
      if (!dpa) return res.status(404).json({ success: false, message: 'DPA tidak ditemukan' });

      const rincian = await RkaRincianBelanja.findAll({
        where: { rka_id: dpa.rka_id },
        order: [['urutan', 'ASC']],
      });

      // Agregasi total jumlah per kode rekening (bisa ada multiple baris per kode)
      const agregat = {};
      rincian.forEach((r) => {
        const k = r.kode_rekening;
        if (!agregat[k]) {
          agregat[k] = {
            kode_rekening: k,
            nama_rekening: r.nama_rekening,
            uraian: r.nama_rekening || r.uraian,
            jumlah: 0,
            kode_sub_kegiatan: dpa.kode_sub_kegiatan,
          };
        }
        agregat[k].jumlah += Number(r.jumlah || 0);
      });
      const data = Object.values(agregat);

      res.json({ success: true, data });
    } catch (e) {
      res.status(500).json({ success: false, message: e.message });
    }
  },

  // GET /api/dpa/:dpa_id/pergeseran — daftar semua pergeseran
  async listPergeseran(req, res) {
    try {
      const data = await DpaPergeseran.findAll({
        where: { dpa_id: Number(req.params.dpa_id) },
        include: [{ model: DpaPergeseranItem, as: 'items' }],
        order: [['nomor_pergeseran', 'ASC']],
      });
      res.json({ success: true, data });
    } catch (e) {
      res.status(500).json({ success: false, message: e.message });
    }
  },

  // POST /api/dpa/:dpa_id/pergeseran — buat pergeseran baru
  async createPergeseran(req, res) {
    try {
      const dpa_id = Number(req.params.dpa_id);
      const { tanggal, alasan, items } = req.body;

      if (!tanggal || !alasan || !Array.isArray(items) || items.length === 0) {
        return res
          .status(400)
          .json({ success: false, message: 'tanggal, alasan, dan items wajib diisi' });
      }

      // Hitung nomor pergeseran otomatis
      const count = await DpaPergeseran.count({ where: { dpa_id } });
      const nomor_pergeseran = count + 1;

      if (nomor_pergeseran > 10) {
        return res
          .status(400)
          .json({ success: false, message: 'Maksimal 10 kali pergeseran per DPA' });
      }

      // Validasi: total KURANG harus = total TAMBAH
      const totalKurang = items
        .filter((i) => i.jenis === 'KURANG')
        .reduce((s, i) => s + Number(i.jumlah_pergeseran || 0), 0);
      const totalTambah = items
        .filter((i) => i.jenis === 'TAMBAH')
        .reduce((s, i) => s + Number(i.jumlah_pergeseran || 0), 0);
      if (Math.abs(totalKurang - totalTambah) > 1) {
        return res.status(400).json({
          success: false,
          message: `Total KURANG (${formatRp(totalKurang)}) harus sama dengan total TAMBAH (${formatRp(totalTambah)})`,
        });
      }
      // Validasi regulasi: pergeseran hanya boleh antar objek/rincian/sub-rincian
      // DALAM jenis belanja yang sama (2 segmen pertama kode rekening, mis. "5.1")
      const jenisBelanjaSet = new Set(
        items
          .map((i) =>
            String(i.kode_rekening || '')
              .split('.')
              .slice(0, 2)
              .join('.'),
          )
          .filter(Boolean),
      );
      if (jenisBelanjaSet.size > 1) {
        return res.status(400).json({
          success: false,
          message: `Pergeseran hanya diperbolehkan dalam jenis belanja yang sama (ditemukan: ${Array.from(jenisBelanjaSet).join(', ')}). Lintas jenis belanja memerlukan mekanisme Perubahan Anggaran, bukan Pergeseran.`,
        });
      }

      const pergeseran = await DpaPergeseran.create({
        dpa_id,
        nomor_pergeseran,
        tanggal,
        alasan,
        status: 'DRAFT',
        created_by: req.user?.id || null,
      });

      const rows = items.map((i) => ({
        pergeseran_id: pergeseran.id,
        jenis: i.jenis,
        kode_rekening: i.kode_rekening,
        nama_rekening: i.nama_rekening || '',
        uraian: i.uraian || '',
        volume_semula: Number(i.volume_semula || 0),
        satuan_semula: i.satuan_semula || '',
        harga_satuan_semula: Number(i.harga_satuan_semula || 0),
        jumlah_semula: Number(i.jumlah_semula || 0),
        jumlah_pergeseran: Number(i.jumlah_pergeseran || 0),
        volume_menjadi: Number(i.volume_menjadi || 0),
        satuan_menjadi: i.satuan_menjadi || '',
        harga_satuan_menjadi: Number(i.harga_satuan_menjadi || 0),
        jumlah_menjadi: Number(i.jumlah_menjadi || 0),
        kode_sub_kegiatan_asal: i.kode_sub_kegiatan_asal || null,
        kode_sub_kegiatan_tujuan: i.kode_sub_kegiatan_tujuan || null,
        dpa_tujuan_id: i.dpa_tujuan_id || null,
      }));
      await DpaPergeseranItem.bulkCreate(rows);

      res.json({
        success: true,
        message: `Pergeseran ${ANGKA_ROMAWI[nomor_pergeseran - 1]} berhasil dibuat`,
        data: {
          id: pergeseran.id,
          nomor_pergeseran,
          label: `Pergeseran ${ANGKA_ROMAWI[nomor_pergeseran - 1]}`,
        },
      });
    } catch (e) {
      res.status(500).json({ success: false, message: e.message });
    }
  },

  // PUT /api/dpa/pergeseran/:id/setujui — setujui pergeseran (rka_rincian_belanja TIDAK disentuh,
  // tetap snapshot asli untuk "DPA Sebelum Perubahan"; nilai "Setelah" dihitung dinamis oleh
  // getRincianSetelahPerubahan() dari snapshot + dpa_pergeseran_item berstatus DISETUJUI)
  async setujuiPergeseran(req, res) {
    try {
      const pergeseran = await DpaPergeseran.findByPk(req.params.id, {
        include: [{ model: DpaPergeseranItem, as: 'items' }],
      });
      if (!pergeseran)
        return res.status(404).json({ success: false, message: 'Pergeseran tidak ditemukan' });
      if (pergeseran.status !== 'DRAFT')
        return res.status(400).json({
          success: false,
          message: 'Hanya pergeseran berstatus DRAFT yang bisa disetujui',
        });

      await pergeseran.update({
        status: 'DISETUJUI',
        approved_by: req.user?.id || null,
        approved_at: new Date(),
      });

      // Sinkronkan total pagu (dpa.anggaran/pagu_total) DPA sumber + semua DPA tujuan
      // agar dashboard menampilkan angka "Setelah" terkini, tanpa mengubah snapshot asli
      const { syncDpaTotalSetelahPerubahan } = require('../services/dpaPerubahanExportService');
      const dpaIdsTerdampak = new Set([pergeseran.dpa_id]);
      pergeseran.items.forEach((item) => {
        if (item.dpa_tujuan_id) dpaIdsTerdampak.add(item.dpa_tujuan_id);
      });
      for (const id of dpaIdsTerdampak) {
        await syncDpaTotalSetelahPerubahan(id);
      }

      res.json({
        success: true,
        message: 'Pergeseran disetujui',
      });
    } catch (e) {
      res.status(500).json({ success: false, message: e.message });
    }
  },

  // DELETE /api/dpa/pergeseran/:id — hapus jika masih DRAFT
  async deletePergeseran(req, res) {
    try {
      const pergeseran = await DpaPergeseran.findByPk(req.params.id);
      if (!pergeseran)
        return res.status(404).json({ success: false, message: 'Pergeseran tidak ditemukan' });
      if (pergeseran.status !== 'DRAFT')
        return res
          .status(400)
          .json({ success: false, message: 'Hanya pergeseran DRAFT yang bisa dihapus' });

      await DpaPergeseranItem.destroy({ where: { pergeseran_id: pergeseran.id } });
      await pergeseran.destroy();
      res.json({ success: true, message: 'Pergeseran berhasil dihapus' });
    } catch (e) {
      res.status(500).json({ success: false, message: e.message });
    }
  },

  // GET /api/dpa/pergeseran/:id/export-pdf — cetak DPPA
  async exportPdfPergeseran(req, res) {
    let browser;
    try {
      const pergeseran = await DpaPergeseran.findByPk(req.params.id, {
        include: [{ model: DpaPergeseranItem, as: 'items' }],
      });
      if (!pergeseran)
        return res.status(404).json({ success: false, message: 'Pergeseran tidak ditemukan' });

      const dpa = await Dpa.findByPk(pergeseran.dpa_id);
      const tapdList = await Tapd.findAll({
        where: { tahun: Number(dpa.tahun) },
        order: [['urutan', 'ASC']],
      });

      const nomorLabel =
        ANGKA_ROMAWI[pergeseran.nomor_pergeseran - 1] || pergeseran.nomor_pergeseran;
      const opdName = dpa.opd_penanggung_jawab || 'DINAS PANGAN PROVINSI MALUKU UTARA';
      const tanggalCetak = new Date(pergeseran.tanggal).toLocaleDateString('id-ID', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      });

      const itemsKurang = pergeseran.items.filter((i) => i.jenis === 'KURANG');
      const itemsTambah = pergeseran.items.filter((i) => i.jenis === 'TAMBAH');
      const totalPergeseran = itemsKurang.reduce((s, i) => s + Number(i.jumlah_pergeseran || 0), 0);

      const renderItemRows = (items) =>
        items
          .map(
            (i) => `
        <tr>
          <td style="border:1px solid #000;padding:4px">${i.kode_rekening}</td>
          <td style="border:1px solid #000;padding:4px">${i.nama_rekening || ''}<br><small style="color:#555">${i.uraian || ''}</small></td>
          <td style="border:1px solid #000;padding:4px;text-align:right">${formatRp(i.jumlah_semula)}</td>
          <td style="border:1px solid #000;padding:4px;text-align:right">${formatRp(i.jumlah_pergeseran)}</td>
          <td style="border:1px solid #000;padding:4px;text-align:right">${formatRp(i.jumlah_menjadi)}</td>
          <td style="border:1px solid #000;padding:4px;text-align:center">${i.kode_sub_kegiatan_asal || '-'}</td>
          <td style="border:1px solid #000;padding:4px;text-align:center">${i.kode_sub_kegiatan_tujuan || '-'}</td>
        </tr>`,
          )
          .join('');

      const tapdRows = tapdList
        .map(
          (t, i) => `
        <tr>
          <td style="border:1px solid #000;padding:3px;text-align:center">${i + 1}</td>
          <td style="border:1px solid #000;padding:3px">${t.nama || ''}</td>
          <td style="border:1px solid #000;padding:3px">${t.nip || ''}</td>
          <td style="border:1px solid #000;padding:3px">${t.jabatan || ''}</td>
          <td style="border:1px solid #000;padding:3px"></td>
        </tr>`,
        )
        .join('');

      const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
        <style>
          body{font-family:Arial,sans-serif;font-size:10px;margin:20px;color:#000}
          table{width:100%;border-collapse:collapse;font-size:10px}
          th{background:#BDD7EE;border:1px solid #000;padding:4px;text-align:center;font-weight:bold}
          .h1{text-align:center;font-size:13px;font-weight:bold;margin:8px 0}
          .h2{text-align:center;font-size:11px;font-weight:bold;margin:4px 0}
          .meta td{border:none;padding:2px 4px}
          .right{text-align:right}.center{text-align:center}.bold{font-weight:bold}
          .green{background:#e2efda}.red{background:#fce4d6}
        </style>
      </head><body>
        <div style="text-align:right;font-size:9px">Formulir DPPA-BELANJA SKPD</div>
        <div class="h1">DOKUMEN PELAKSANAAN PERUBAHAN ANGGARAN<br>SATUAN KERJA PERANGKAT DAERAH</div>
        <div class="h2">PERGESERAN ANGGARAN ${nomorLabel}<br>PEMERINTAH PROVINSI MALUKU UTARA — TAHUN ANGGARAN ${dpa.tahun}</div>

        <table class="meta" style="margin:10px 0">
          <tr><td style="width:22%;font-weight:bold">Nomor DPPA</td><td>: DPPA/A.1/${dpa.kode_program || '2.09.01'}.0.00.0.00.01.0000/00${pergeseran.nomor_pergeseran}/${dpa.tahun}</td></tr>
          <tr><td style="font-weight:bold">SKPD</td><td>: ${opdName}</td></tr>
          <tr><td style="font-weight:bold">Program</td><td>: ${dpa.kode_program || ''} ${dpa.program}</td></tr>
          <tr><td style="font-weight:bold">Kegiatan</td><td>: ${dpa.kode_kegiatan || ''} ${dpa.kegiatan}</td></tr>
          <tr><td style="font-weight:bold">Sub Kegiatan</td><td>: ${dpa.kode_sub_kegiatan || ''} ${dpa.sub_kegiatan}</td></tr>
          <tr><td style="font-weight:bold">Tanggal Pergeseran</td><td>: ${tanggalCetak}</td></tr>
          <tr><td style="font-weight:bold">Alasan Pergeseran</td><td>: ${pergeseran.alasan}</td></tr>
          <tr><td style="font-weight:bold">Total Pergeseran</td><td>: ${formatRp(totalPergeseran)}</td></tr>
        </table>

        <div class="bold" style="margin:10px 0 4px;color:#c00000">Anggaran yang Dikurangi (KURANG)</div>
        <table style="margin-bottom:10px">
          <thead>
            <tr>
              <th style="width:15%">Kode Rekening</th>
              <th style="width:25%">Uraian</th>
              <th style="width:15%">Jumlah Semula (Rp)</th>
              <th style="width:15%">Pergeseran (Rp)</th>
              <th style="width:15%">Jumlah Menjadi (Rp)</th>
              <th style="width:8%">Sub Keg Asal</th>
              <th style="width:7%">Sub Keg Tujuan</th>
            </tr>
          </thead>
          <tbody>
            ${renderItemRows(itemsKurang)}
            <tr class="bold red">
              <td colspan="2" style="border:1px solid #000;padding:4px;text-align:center">JUMLAH KURANG</td>
              <td style="border:1px solid #000;padding:4px;text-align:right">${formatRp(itemsKurang.reduce((s, i) => s + Number(i.jumlah_semula || 0), 0))}</td>
              <td style="border:1px solid #000;padding:4px;text-align:right">${formatRp(totalPergeseran)}</td>
              <td style="border:1px solid #000;padding:4px;text-align:right">${formatRp(itemsKurang.reduce((s, i) => s + Number(i.jumlah_menjadi || 0), 0))}</td>
              <td colspan="2" style="border:1px solid #000;padding:4px"></td>
            </tr>
          </tbody>
        </table>

        <div class="bold" style="margin:10px 0 4px;color:#196F3D">Anggaran yang Ditambahkan (TAMBAH)</div>
        <table style="margin-bottom:15px">
          <thead>
            <tr>
              <th style="width:15%">Kode Rekening</th>
              <th style="width:25%">Uraian</th>
              <th style="width:15%">Jumlah Semula (Rp)</th>
              <th style="width:15%">Pergeseran (Rp)</th>
              <th style="width:15%">Jumlah Menjadi (Rp)</th>
              <th style="width:8%">Sub Keg Asal</th>
              <th style="width:7%">Sub Keg Tujuan</th>
            </tr>
          </thead>
          <tbody>
            ${renderItemRows(itemsTambah)}
            <tr class="bold green">
              <td colspan="2" style="border:1px solid #000;padding:4px;text-align:center">JUMLAH TAMBAH</td>
              <td style="border:1px solid #000;padding:4px;text-align:right">${formatRp(itemsTambah.reduce((s, i) => s + Number(i.jumlah_semula || 0), 0))}</td>
              <td style="border:1px solid #000;padding:4px;text-align:right">${formatRp(totalPergeseran)}</td>
              <td style="border:1px solid #000;padding:4px;text-align:right">${formatRp(itemsTambah.reduce((s, i) => s + Number(i.jumlah_menjadi || 0), 0))}</td>
              <td colspan="2" style="border:1px solid #000;padding:4px"></td>
            </tr>
          </tbody>
        </table>

        <div style="display:table;width:100%;margin-top:15px">
          <div style="display:table-cell;width:55%;vertical-align:top">
            <div class="bold" style="margin-bottom:4px">Tim Anggaran Pemerintahan Daerah</div>
            <table style="page-break-inside:avoid">
              <thead>
                <tr>
                  <th style="width:5%">No</th><th style="width:32%">Nama</th>
                  <th style="width:25%">NIP</th><th style="width:23%">Jabatan</th>
                  <th style="width:15%">Tanda Tangan</th>
                </tr>
              </thead>
              <tbody>${tapdRows}</tbody>
            </table>
          </div>
          <div style="display:table-cell;width:45%;text-align:center;vertical-align:top;padding-left:12px">
            <div>Sofifi, ${tanggalCetak}</div>
            <div class="bold">Disetujui oleh, Sekretaris Daerah</div>
            <div style="margin-top:50px">( _______________________ )</div>
            <div style="margin-top:20px">Disahkan oleh, PPKD</div>
            <div style="margin-top:50px">( _______________________ )</div>
            <div style="margin-top:20px">Kepala ${opdName}</div>
            <div style="margin-top:50px">Dheny Tjan, SH., M.Si<br>NIP. 197507302001121001</div>
          </div>
        </div>
      </body></html>`;

      browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });
      const pdfBuffer = await page.pdf({
        format: 'A4',
        landscape: true,
        printBackground: true,
        margin: { top: '15px', bottom: '15px', left: '15px', right: '15px' },
      });
      await browser.close();

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename=DPPA_Pergeseran_${nomorLabel}_${dpa.tahun}.pdf`,
      );
      res.send(pdfBuffer);
    } catch (e) {
      if (browser) await browser.close();
      res.status(500).json({ success: false, message: e.message });
    }
  },

  // =============================================
  // PERUBAHAN ANGGARAN
  // =============================================

  async exportPdfPerubahan(req, res) {
    let browser;
    try {
      const { DpaPerubahan, Tapd } = require('../models');
      const puppeteer = require('puppeteer');
      const dpa_id = Number(req.params.dpa_id);

      const perubahan = await DpaPerubahan.findOne({ where: { dpa_id } });
      if (!perubahan)
        return res
          .status(404)
          .json({ success: false, message: 'Perubahan anggaran tidak ditemukan' });

      const dpa = await Dpa.findByPk(dpa_id);
      const tapdList = await Tapd.findAll({
        where: { tahun: Number(dpa.tahun) },
        order: [['urutan', 'ASC']],
      });
      const opdName = dpa.opd_penanggung_jawab || 'DINAS PANGAN PROVINSI MALUKU UTARA';
      const tanggalCetak = new Date(perubahan.tanggal).toLocaleDateString('id-ID', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      });
      const selisih = Number(perubahan.pagu_menjadi) - Number(perubahan.pagu_semula);

      const tapdRows = tapdList
        .map(
          (t, i) => `<tr>
        <td style="border:1px solid #000;padding:4px;text-align:center">${i + 1}</td>
        <td style="border:1px solid #000;padding:4px">${t.nama || ''}</td>
        <td style="border:1px solid #000;padding:4px">${t.nip || ''}</td>
        <td style="border:1px solid #000;padding:4px">${t.jabatan || ''}</td>
        <td style="border:1px solid #000;padding:4px"></td>
      </tr>`,
        )
        .join('');

      const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
        <style>
          body{font-family:Arial,sans-serif;font-size:11px;margin:20px;color:#000}
          table{width:100%;border-collapse:collapse;font-size:11px}
          th{background:#BDD7EE;border:1px solid #000;padding:5px;text-align:center;font-weight:bold}
          .h1{text-align:center;font-size:13px;font-weight:bold;margin:8px 0}
          .meta td{border:none;padding:2px 4px}
          .right{text-align:right}.center{text-align:center}.bold{font-weight:bold}
          .green{background:#e2efda}.yellow{background:#fff2cc}
        </style>
      </head><body>
        <div style="text-align:right;font-size:9px">Formulir DPA-P SKPD</div>
        <div class="h1">DOKUMEN PELAKSANAAN ANGGARAN PERUBAHAN<br>SATUAN KERJA PERANGKAT DAERAH (DPA-P SKPD)<br>
        PEMERINTAH PROVINSI MALUKU UTARA — TAHUN ANGGARAN ${dpa.tahun}</div>

        <table class="meta" style="margin:10px 0">
          <tr><td style="width:22%;font-weight:bold">Nomor DPA-P</td><td>: DPA-P/A.1/${dpa.kode_program || '2.09.01'}.0.00.0.00.01.0000/001/${dpa.tahun}</td></tr>
          <tr><td style="font-weight:bold">SKPD</td><td>: ${opdName}</td></tr>
          <tr><td style="font-weight:bold">Program</td><td>: ${dpa.kode_program || ''} ${dpa.program}</td></tr>
          <tr><td style="font-weight:bold">Kegiatan</td><td>: ${dpa.kode_kegiatan || ''} ${dpa.kegiatan}</td></tr>
          <tr><td style="font-weight:bold">Sub Kegiatan</td><td>: ${dpa.kode_sub_kegiatan || ''} ${dpa.sub_kegiatan}</td></tr>
          <tr><td style="font-weight:bold">Nomor Perda</td><td>: ${perubahan.nomor_perda || '-'}</td></tr>
          <tr><td style="font-weight:bold">Tanggal Perubahan</td><td>: ${tanggalCetak}</td></tr>
          <tr><td style="font-weight:bold">Alasan Perubahan</td><td>: ${perubahan.alasan}</td></tr>
          <tr><td style="font-weight:bold">Status</td><td>: <strong>${perubahan.status}</strong></td></tr>
        </table>

        <div class="bold" style="margin:12px 0 6px">Perbandingan Pagu Anggaran</div>
        <table style="margin-bottom:16px">
          <thead>
            <tr>
              <th style="width:40%">Uraian</th>
              <th style="width:30%">Jumlah (Rp)</th>
              <th style="width:30%">Keterangan</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style="border:1px solid #000;padding:5px">Pagu Anggaran Semula</td>
              <td style="border:1px solid #000;padding:5px;text-align:right">Rp${Number(perubahan.pagu_semula).toLocaleString('id-ID')},00</td>
              <td style="border:1px solid #000;padding:5px">Pagu DPA awal tahun anggaran</td>
            </tr>
            <tr class="yellow">
              <td style="border:1px solid #000;padding:5px;font-weight:bold">Pagu Anggaran Menjadi</td>
              <td style="border:1px solid #000;padding:5px;text-align:right;font-weight:bold">Rp${Number(perubahan.pagu_menjadi).toLocaleString('id-ID')},00</td>
              <td style="border:1px solid #000;padding:5px">Setelah perubahan APBD</td>
            </tr>
            <tr class="${selisih >= 0 ? 'green' : ''}">
              <td style="border:1px solid #000;padding:5px;font-weight:bold">Selisih</td>
              <td style="border:1px solid #000;padding:5px;text-align:right;font-weight:bold;color:${selisih >= 0 ? '#196F3D' : '#c00000'}">
                ${selisih >= 0 ? '+' : ''}Rp${selisih.toLocaleString('id-ID')},00
              </td>
              <td style="border:1px solid #000;padding:5px">${selisih > 0 ? 'Penambahan Anggaran' : selisih < 0 ? 'Pengurangan Anggaran' : 'Tidak ada perubahan'}</td>
            </tr>
          </tbody>
        </table>

        <div style="display:table;width:100%;margin-top:20px">
          <div style="display:table-cell;width:55%;vertical-align:top">
            <div class="bold" style="margin-bottom:4px">Tim Anggaran Pemerintahan Daerah</div>
            <table style="page-break-inside:avoid">
              <thead><tr>
                <th style="width:5%">No</th><th style="width:32%">Nama</th>
                <th style="width:25%">NIP</th><th style="width:23%">Jabatan</th>
                <th style="width:15%">Tanda Tangan</th>
              </tr></thead>
              <tbody>${tapdRows}</tbody>
            </table>
          </div>
          <div style="display:table-cell;width:45%;text-align:center;vertical-align:top;padding-left:12px">
            <div>Sofifi, ${tanggalCetak}</div>
            <div class="bold">Disetujui oleh,<br>Sekretaris Daerah</div>
            <div style="margin-top:50px">( _______________________ )</div>
            <div style="margin-top:20px">Disahkan oleh, PPKD</div>
            <div style="margin-top:50px">( _______________________ )</div>
            <div style="margin-top:20px">Kepala ${opdName}</div>
            <div style="margin-top:50px">Dheny Tjan, SH., M.Si<br>NIP. 197507302001121001</div>
          </div>
        </div>
      </body></html>`;

      browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });
      const pdfBuffer = await page.pdf({
        format: 'A4',
        landscape: true,
        printBackground: true,
        margin: { top: '15px', bottom: '15px', left: '15px', right: '15px' },
      });
      await browser.close();

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename=DPA_Perubahan_${dpa_id}_${dpa.tahun}.pdf`,
      );
      res.send(pdfBuffer);
    } catch (e) {
      if (browser) await browser.close();
      res.status(500).json({ success: false, message: e.message });
    }
  },

  // GET /api/dpa/:dpa_id/perubahan
  async getPerubahan(req, res) {
    try {
      const data = await DpaPerubahan.findOne({
        where: { dpa_id: Number(req.params.dpa_id) },
        include: [{ model: DpaPerubahanItem, as: 'items' }],
      });
      res.json({ success: true, data });
    } catch (e) {
      res.status(500).json({ success: false, message: e.message });
    }
  },

  // POST /api/dpa/:dpa_id/perubahan — buat atau update perubahan (+ rincian item per kode rekening)
  async savePerubahan(req, res) {
    try {
      const dpa_id = Number(req.params.dpa_id);
      const { tanggal, nomor_perda, alasan, pagu_menjadi, items } = req.body;

      if (!tanggal || !alasan || !pagu_menjadi) {
        return res
          .status(400)
          .json({ success: false, message: 'tanggal, alasan, dan pagu_menjadi wajib diisi' });
      }

      const dpa = await Dpa.findByPk(dpa_id);
      if (!dpa) return res.status(404).json({ success: false, message: 'DPA tidak ditemukan' });

      const paguSemula = Number(dpa.anggaran);
      const paguMenjadiNum = Number(pagu_menjadi);
      const selisihTotal = paguMenjadiNum - paguSemula;

      // Validasi: kalau ada perubahan pagu (selisih ≠ 0), rincian item WAJIB diisi
      // dan totalnya harus sama dengan selisih total pagu
      if (Math.abs(selisihTotal) > 1) {
        if (!Array.isArray(items) || items.length === 0) {
          return res.status(400).json({
            success: false,
            message:
              'Pagu berubah — rincian kode rekening (items) wajib diisi untuk menjelaskan ke mana selisih anggaran ditujukan',
          });
        }
        const totalDeltaItems = items.reduce(
          (s, i) => s + (Number(i.jumlah_sesudah || 0) - Number(i.jumlah_sebelum || 0)),
          0,
        );
        if (Math.abs(totalDeltaItems - selisihTotal) > 1) {
          return res.status(400).json({
            success: false,
            message: `Total selisih rincian item (${formatRp(totalDeltaItems)}) harus sama dengan selisih pagu total (${formatRp(selisihTotal)})`,
          });
        }
      }

      const existing = await DpaPerubahan.findOne({ where: { dpa_id } });
      if (existing && existing.status === 'DISETUJUI') {
        return res.status(400).json({
          success: false,
          message: 'Perubahan anggaran sudah disetujui, tidak bisa diubah',
        });
      }

      let perubahan;
      if (existing) {
        await existing.update({
          tanggal,
          nomor_perda,
          alasan,
          pagu_menjadi: paguMenjadiNum,
          pagu_semula: paguSemula,
          status: 'DRAFT',
        });
        perubahan = existing;
        await DpaPerubahanItem.destroy({ where: { perubahan_id: perubahan.id } });
      } else {
        perubahan = await DpaPerubahan.create({
          dpa_id,
          tanggal,
          nomor_perda,
          alasan,
          pagu_semula: paguSemula,
          pagu_menjadi: paguMenjadiNum,
          status: 'DRAFT',
        });
      }

      if (Array.isArray(items) && items.length > 0) {
        const rows = items.map((i) => ({
          perubahan_id: perubahan.id,
          kode_rekening: i.kode_rekening,
          nama_rekening: i.nama_rekening || '',
          uraian: i.uraian || '',
          volume_sebelum: Number(i.volume_sebelum || 0),
          satuan_sebelum: i.satuan_sebelum || '',
          harga_satuan_sebelum: Number(i.harga_satuan_sebelum || 0),
          jumlah_sebelum: Number(i.jumlah_sebelum || 0),
          volume_sesudah: Number(i.volume_sesudah || 0),
          satuan_sesudah: i.satuan_sesudah || '',
          harga_satuan_sesudah: Number(i.harga_satuan_sesudah || 0),
          jumlah_sesudah: Number(i.jumlah_sesudah || 0),
        }));
        await DpaPerubahanItem.bulkCreate(rows);
      }

      res.json({
        success: true,
        message: existing
          ? 'Perubahan anggaran berhasil diperbarui'
          : 'Perubahan anggaran berhasil dibuat',
        data: perubahan,
      });
    } catch (e) {
      res.status(500).json({ success: false, message: e.message });
    }
  },

  // PUT /api/dpa/perubahan/:id/setujui — setujui dan update pagu DPA
  async setujuiPerubahan(req, res) {
    try {
      const perubahan = await DpaPerubahan.findByPk(req.params.id);
      if (!perubahan)
        return res.status(404).json({ success: false, message: 'Perubahan tidak ditemukan' });
      if (perubahan.status === 'DISETUJUI')
        return res.status(400).json({ success: false, message: 'Sudah disetujui sebelumnya' });

      await perubahan.update({ status: 'DISETUJUI' });

      // Sinkronkan total pagu berdasarkan hasil gabungan pergeseran + perubahan (bukan asal pagu_menjadi saja)
      const { syncDpaTotalSetelahPerubahan } = require('../services/dpaPerubahanExportService');
      await syncDpaTotalSetelahPerubahan(perubahan.dpa_id);

      res.json({
        success: true,
        message: 'Perubahan anggaran disetujui, pagu DPA telah diperbarui',
      });
    } catch (e) {
      res.status(500).json({ success: false, message: e.message });
    }
  },

  async exportPdfSetelahPerubahanOpd(req, res) {
    let browser;
    try {
      const { opd_id } = req.params;
      const { tahun } = req.query;
      if (!tahun)
        return res.status(400).json({ success: false, message: 'Parameter tahun wajib diisi' });

      const { Dpa, Rka, Tapd, DpaRealisasiBulanan } = require('../models');
      const { getRincianLengkapUntukCetak } = require('../services/dpaPerubahanExportService');
      const puppeteer = require('puppeteer');

      const dpaList = await Dpa.findAll({
        where: { opd_id: Number(opd_id), tahun: Number(tahun) },
        order: [['id', 'ASC']],
      });
      if (!dpaList.length) {
        return res
          .status(404)
          .json({ success: false, message: 'Tidak ada DPA untuk OPD dan tahun ini' });
      }

      const opdName = dpaList[0].opd_penanggung_jawab || 'DINAS PANGAN PROVINSI MALUKU UTARA';
      const tapdList = await Tapd.findAll({
        where: { tahun: Number(tahun) },
        order: [['urutan', 'ASC']],
      });
      const formatRp = (val) => {
        const num = Number(val || 0);
        const abs = Math.abs(num);
        const str = `Rp${abs.toLocaleString('id-ID')},00`;
        return num < 0 ? `( ${str} )` : str;
      };
      const formatPersen = (sebelum, selisih) => {
        if (!sebelum) return selisih === 0 ? '0.00' : '100.00';
        const pct = (selisih / sebelum) * 100;
        return pct < 0 ? `( ${Math.abs(pct).toFixed(2)} )` : pct.toFixed(2);
      };
      const tanggalCetak = new Date().toLocaleDateString('id-ID', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      });
      const noDppa = `DPPA/A.2/${dpaList[0].kode_program || '2.09.01'}.0.00.0.00.01.0000/001/${tahun}`;
      const labelKlasifikasi = {
        5.1: 'Belanja Operasi',
        5.2: 'Belanja Modal',
        5.3: 'Belanja Tidak Terduga',
        5.4: 'Belanja Transfer',
      };

      // ==== 1. Kumpulkan rincian per-DPA (per sub kegiatan) ====
      const dataPerDpa = [];
      for (const dpa of dpaList) {
        const rincian = await getRincianLengkapUntukCetak(dpa.id);
        const totalSebelum = rincian.reduce((s, r) => s + r.jumlah_sebelum, 0);
        const totalSetelah = rincian.reduce((s, r) => s + r.jumlah_setelah, 0);
        const rka = dpa.rka_id ? await Rka.findByPk(dpa.rka_id) : null;
        const realisasiBulanan = await DpaRealisasiBulanan.findAll({
          where: { dpa_id: dpa.id },
          order: [['bulan', 'ASC']],
        });
        const realisasiMap = {};
        realisasiBulanan.forEach((r) => {
          realisasiMap[r.bulan] = Number(r.jumlah || 0);
        });
        dataPerDpa.push({ dpa, rincian, totalSebelum, totalSetelah, rka, realisasiMap });
      }

      // ==== 2. Rekap OPD per klasifikasi (5.1/5.2/5.3/5.4) untuk formulir Ringkasan ====
      const rekapKlasifikasi = {}; // { '5.1': {sebelum, setelah}, ... }
      dataPerDpa.forEach(({ rincian }) => {
        rincian.forEach((r) => {
          const prefix = r.kode_rekening.split('.').slice(0, 2).join('.');
          if (!rekapKlasifikasi[prefix]) rekapKlasifikasi[prefix] = { sebelum: 0, setelah: 0 };
          rekapKlasifikasi[prefix].sebelum += r.jumlah_sebelum;
          rekapKlasifikasi[prefix].setelah += r.jumlah_setelah;
        });
      });
      const totalOpdSebelum = dataPerDpa.reduce((s, d) => s + d.totalSebelum, 0);
      const totalOpdSetelah = dataPerDpa.reduce((s, d) => s + d.totalSetelah, 0);

      // ==== 3. HTML: Formulir DPPA-SKPD Ringkasan ====
      let ringkasanRows = '';
      ['5.1', '5.2', '5.3', '5.4'].forEach((prefix) => {
        const rk = rekapKlasifikasi[prefix] || { sebelum: 0, setelah: 0 };
        const selisih = rk.setelah - rk.sebelum;
        ringkasanRows += `<tr><td>${prefix}</td><td>${labelKlasifikasi[prefix]}</td><td class="right">${formatRp(rk.sebelum)}</td><td class="right">${formatRp(rk.setelah)}</td><td class="right">${formatRp(selisih)}</td><td class="center">${formatPersen(rk.sebelum, selisih)}</td></tr>`;
      });
      const selisihOpd = totalOpdSetelah - totalOpdSebelum;

      // ==== 4. HTML: Formulir DPPA-BELANJA SKPD (hierarkis per sub kegiatan) ====
      let belanjaRows = '';
      dataPerDpa.forEach(({ dpa, totalSebelum, totalSetelah }) => {
        const selisih = totalSetelah - totalSebelum;
        belanjaRows += `<tr>
          <td colspan="2">${dpa.kode_sub_kegiatan || ''}</td>
          <td colspan="4">${dpa.sub_kegiatan}</td>
          <td class="right">${formatRp(totalSebelum)}</td>
          <td class="right">${formatRp(totalSetelah)}</td>
          <td class="right">${formatRp(selisih)}</td>
          <td class="center">${formatPersen(totalSebelum, selisih)}</td>
        </tr>`;
      });

      // ==== 5. HTML: Formulir DPPA RINCIAN BELANJA SKPD (1 blok per sub kegiatan) ====
      const labelStatis = {
        5: 'BELANJA DAERAH',
        5.1: 'BELANJA OPERASI',
        5.2: 'BELANJA MODAL',
        5.3: 'BELANJA TIDAK TERDUGA',
        5.4: 'BELANJA TRANSFER',
        '5.1.02': 'Belanja Barang dan Jasa',
        '5.1.02.01': 'Belanja Barang',
        '5.1.02.01.01': 'Belanja Barang Pakai Habis',
      };
      const namaBulan = [
        'Jan',
        'Feb',
        'Mar',
        'Apr',
        'Mei',
        'Jun',
        'Jul',
        'Agu',
        'Sep',
        'Okt',
        'Nov',
        'Des',
      ];
      let rincianBlocks = '';
      dataPerDpa.forEach(({ dpa, rincian, totalSebelum, totalSetelah, rka, realisasiMap }) => {
        const renderedPrefixes = new Set();
        let rows = '';
        rincian.forEach((item) => {
          const segs = item.kode_rekening.split('.');
          for (let i = 1; i <= segs.length; i++) {
            const prefix = segs.slice(0, i).join('.');
            const isLeaf = i === segs.length;
            // Baris grup (non-leaf) di-dedupe per kode; baris leaf (uraian) TIDAK di-dedupe
            // karena satu kode_rekening bisa menaungi beberapa uraian berbeda (mis. Kertas Quarto & Folio sama-sama 0024)
            if (!isLeaf) {
              if (renderedPrefixes.has(prefix)) continue;
              renderedPrefixes.add(prefix);
            }
            const isTop = i <= 2;
            const label = isLeaf ? item.nama_rekening : labelStatis[prefix] || prefix;
            const subSebelum = rincian
              .filter((r) => r.kode_rekening.startsWith(prefix))
              .reduce((s, r) => s + r.jumlah_sebelum, 0);
            const subSetelah = rincian
              .filter((r) => r.kode_rekening.startsWith(prefix))
              .reduce((s, r) => s + r.jumlah_setelah, 0);
            const subSelisih = subSetelah - subSebelum;
            const persen = formatPersen(subSebelum, subSelisih);
            const fw = isLeaf || isTop ? 'bold' : 'normal';
            if (isLeaf) {
              const kodeHeaderKey = `header-${prefix}`;
              if (!renderedPrefixes.has(kodeHeaderKey)) {
                renderedPrefixes.add(kodeHeaderKey);
                rows += `<tr style="background:#f2f2f2"><td colspan="2" style="border:1px solid #000;padding:3px;font-weight:bold">${prefix} — ${item.nama_rekening}</td><td colspan="4" style="border:1px solid #000;padding:3px;text-align:right;font-weight:bold">${formatRp(subSebelum)}</td><td colspan="4" style="border:1px solid #000;padding:3px;text-align:right;font-weight:bold">${formatRp(subSetelah)}</td><td style="border:1px solid #000;padding:3px;text-align:right;font-weight:bold">${formatRp(subSelisih)}</td><td style="border:1px solid #000;padding:3px;text-align:center;font-weight:bold">${persen}</td></tr>`;
              }
              const itemSelisih = item.jumlah_setelah - item.jumlah_sebelum;
              const itemPersen = formatPersen(item.jumlah_sebelum, itemSelisih);
              rows += `<tr><td style="border:1px solid #000;padding:3px"></td><td style="border:1px solid #000;padding:3px;padding-left:${i * 10 + 3}px">${item.uraian || item.nama_rekening}</td><td style="border:1px solid #000;padding:3px;text-align:right">${Number(item.volume_sebelum || 0).toLocaleString('id-ID')}</td><td style="border:1px solid #000;padding:3px;text-align:center">${item.satuan_sebelum || '-'}</td><td style="border:1px solid #000;padding:3px;text-align:right">${Number(item.harga_satuan_sebelum || 0).toLocaleString('id-ID')}</td><td style="border:1px solid #000;padding:3px;text-align:right">${formatRp(item.jumlah_sebelum)}</td><td style="border:1px solid #000;padding:3px;text-align:right">${Number(item.volume_setelah || 0).toLocaleString('id-ID')}</td><td style="border:1px solid #000;padding:3px;text-align:center">${item.satuan_setelah || '-'}</td><td style="border:1px solid #000;padding:3px;text-align:right">${Number(item.harga_satuan_setelah || 0).toLocaleString('id-ID')}</td><td style="border:1px solid #000;padding:3px;text-align:right">${formatRp(item.jumlah_setelah)}</td><td style="border:1px solid #000;padding:3px;text-align:right">${formatRp(itemSelisih)}</td><td style="border:1px solid #000;padding:3px;text-align:center">${itemPersen}</td></tr>`;
            } else {
              rows += `<tr style="background:${isTop ? '#f2f2f2' : '#fff'}"><td style="border:1px solid #000;padding:3px;font-weight:${fw}">${prefix}</td><td style="border:1px solid #000;padding:3px;padding-left:${(i - 1) * 10 + 3}px;font-weight:${fw}">${label}</td><td colspan="4" style="border:1px solid #000;padding:3px;text-align:right;font-weight:${fw}">${formatRp(subSebelum)}</td><td colspan="4" style="border:1px solid #000;padding:3px;text-align:right;font-weight:${fw}">${formatRp(subSetelah)}</td><td style="border:1px solid #000;padding:3px;text-align:right;font-weight:${fw}">${formatRp(subSelisih)}</td><td style="border:1px solid #000;padding:3px;text-align:center;font-weight:${fw}">${persen}</td></tr>`;
            }
          }
        });
        const selisihTotal = totalSetelah - totalSebelum;

        // Tabel Indikator & Tolok Ukur Kinerja — Sebelum=Setelah karena sistem belum tracking perubahan indikator terpisah dari perubahan anggaran
        const indikatorRows = rka
          ? `
            <tr><td class="bold">Capaian Program</td><td>${rka.capaian_program || '-'}</td><td class="center">${rka.target_capaian || '-'} ${rka.satuan_capaian || ''}</td><td class="center">${rka.target_capaian || '-'} ${rka.satuan_capaian || ''}</td></tr>
            <tr><td class="bold">Masukan</td><td>${rka.masukan || 'Dana yang dibutuhkan'}</td><td class="right">${formatRp(totalSebelum)}</td><td class="right">${formatRp(totalSetelah)}</td></tr>
            <tr><td class="bold">Keluaran</td><td>${rka.keluaran || dpa.indikator || '-'}</td><td class="center">${rka.target_keluaran || dpa.target || '-'} ${rka.satuan_keluaran || ''}</td><td class="center">${rka.target_keluaran || dpa.target || '-'} ${rka.satuan_keluaran || ''}</td></tr>
            <tr><td class="bold">Hasil</td><td>${rka.hasil || '-'}</td><td class="center">${rka.target_hasil || '-'} ${rka.satuan_hasil || ''}</td><td class="center">${rka.target_hasil || '-'} ${rka.satuan_hasil || ''}</td></tr>`
          : `<tr><td colspan="4" class="center">Data indikator kinerja tidak tersedia</td></tr>`;

        const kasRow = namaBulan
          .map(
            (_, i) =>
              `<td class="right">${realisasiMap[i + 1] ? formatRp(realisasiMap[i + 1]) : '-'}</td>`,
          )
          .join('');
        const kasHeader = namaBulan.map((b) => `<th>${b}</th>`).join('');

        const tapdRowsRincian = tapdList
          .map(
            (t, i) =>
              `<tr><td class="center">${i + 1}</td><td>${t.nama || ''}</td><td>${t.nip || ''}</td><td>${t.jabatan || ''}</td><td></td></tr>`,
          )
          .join('');

        rincianBlocks += `<div class="page">
          <div style="text-align:right;font-size:9px">Formulir DPPA RINCIAN BELANJA SKPD</div>
          <div class="h1">DOKUMEN PELAKSANAAN PERUBAHAN ANGGARAN SATUAN KERJA PERANGKAT DAERAH</div>
          <table class="meta" style="margin:6px 0">
            <tr><td style="width:22%;font-weight:bold">Nomor DPPA</td><td>: ${noDppa}</td></tr>
            <tr><td style="font-weight:bold">Program</td><td>: ${dpa.kode_program || ''} ${dpa.program}</td></tr>
            <tr><td style="font-weight:bold">Kegiatan</td><td>: ${dpa.kode_kegiatan || ''} ${dpa.kegiatan}</td></tr>
            <tr><td style="font-weight:bold">Sub Kegiatan</td><td>: ${dpa.kode_sub_kegiatan || ''} ${dpa.sub_kegiatan}</td></tr>
            <tr><td style="font-weight:bold">Alokasi Sebelum</td><td>: ${formatRp(totalSebelum)}</td></tr>
            <tr><td style="font-weight:bold">Alokasi Setelah</td><td>: ${formatRp(totalSetelah)}</td></tr>
          </table>
          <div class="bold" style="margin:8px 0 4px">Indikator dan Tolok Ukur Kinerja Kegiatan</div>
          <table style="margin-bottom:10px"><thead><tr><th style="width:12%">Indikator</th><th style="width:48%">Tolok Ukur Kinerja</th><th style="width:20%">Target (Sebelum)</th><th style="width:20%">Target (Setelah)</th></tr></thead><tbody>${indikatorRows}</tbody></table>
          <table><thead>
            <tr>
              <th rowspan="2" style="width:10%">Kode Rekening</th>
              <th rowspan="2" style="width:16%">Uraian</th>
              <th colspan="4">Sebelum</th>
              <th colspan="4">Setelah</th>
              <th rowspan="2" style="width:9%">Bertambah/(Berkurang) Rp</th>
              <th rowspan="2" style="width:5%">%</th>
            </tr>
            <tr>
              <th style="width:6%">Volume</th><th style="width:6%">Satuan</th><th style="width:8%">Harga Satuan</th><th style="width:8%">Jumlah</th>
              <th style="width:6%">Volume</th><th style="width:6%">Satuan</th><th style="width:8%">Harga Satuan</th><th style="width:8%">Jumlah</th>
            </tr>
          </thead>
          <tbody>${rows}<tr class="bold green"><td colspan="2" class="center">JUMLAH ANGGARAN SUB KEGIATAN</td><td class="right">${formatRp(totalSebelum)}</td><td class="right">${formatRp(totalSetelah)}</td><td class="right">${formatRp(selisihTotal)}</td></tr></tbody></table>
          <div class="bold" style="margin:10px 0 4px">Rencana Anggaran Kas per Bulan (Rp) — Setelah Perubahan</div>
          <table style="margin-bottom:10px"><thead><tr>${kasHeader}<th>Jumlah</th></tr></thead><tbody><tr>${kasRow}<td class="right bold">${formatRp(totalSetelah)}</td></tr></tbody></table>
          <div style="margin-top:10px"><div class="bold" style="margin-bottom:4px">Tim Anggaran Pemerintahan Daerah</div><table><thead><tr><th>No</th><th>Nama</th><th>NIP</th><th>Jabatan</th><th>TTD</th></tr></thead><tbody>${tapdRowsRincian}</tbody></table></div>
        </div>`;
      });

      const tapdRows = tapdList
        .map(
          (t, i) =>
            `<tr><td class="center">${i + 1}</td><td>${t.nama || ''}</td><td>${t.nip || ''}</td><td>${t.jabatan || ''}</td><td></td></tr>`,
        )
        .join('');

      const css = `body{font-family:Arial,sans-serif;font-size:10px;margin:15px;color:#000}.page{page-break-after:always}.page:last-child{page-break-after:avoid}table{width:100%;border-collapse:collapse;font-size:9px}th{background:#BDD7EE;border:1px solid #000;padding:4px;text-align:center;font-weight:bold}td{border:1px solid #000;padding:3px}.right{text-align:right}.center{text-align:center}.bold{font-weight:bold}.h1{text-align:center;font-size:12px;font-weight:bold;margin:6px 0}.meta td{border:none;padding:1px 4px}.green{background:#e2efda}`;

      const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${css}</style></head><body>
      <div class="page">
        <div class="h1">DOKUMEN PELAKSANAAN PERUBAHAN ANGGARAN<br>SATUAN KERJA PERANGKAT DAERAH<br>(DPPA-SKPD) TAHUN ANGGARAN ${tahun}</div>
        <table class="meta" style="margin:10px 0"><tr><td style="width:22%;font-weight:bold">ORGANISASI</td><td>: ${opdName}</td></tr></table>
        <div style="margin-top:30px;display:table;width:100%"><div style="display:table-cell;width:50%"><div class="bold">Disetujui oleh, Sekretaris Daerah</div><div style="margin-top:60px">( _______________________ )</div></div><div style="display:table-cell;width:50%;text-align:right"><div>Sofifi, ${tanggalCetak}</div><div class="bold">Disahkan oleh, PPKD</div><div style="margin-top:60px">( _______________________ )</div></div></div>
      </div>
      <div class="page">
        <div style="text-align:right;font-size:9px">Formulir DPPA-SKPD</div>
        <div class="h1">RINGKASAN DPPA-SKPD — TAHUN ANGGARAN ${tahun}</div>
        <table class="meta" style="margin:6px 0"><tr><td style="width:20%;font-weight:bold">Nomor DPPA</td><td>: ${noDppa}</td></tr><tr><td style="font-weight:bold">SKPD</td><td>: ${opdName}</td></tr></table>
        <table><thead><tr><th>Kode</th><th>Uraian</th><th>Sebelum</th><th>Setelah</th><th>Bertambah/(Berkurang) Rp</th><th>%</th></tr></thead><tbody>
          ${ringkasanRows}
          <tr class="bold green"><td colspan="2" class="center">JUMLAH BELANJA</td><td class="right">${formatRp(totalOpdSebelum)}</td><td class="right">${formatRp(totalOpdSetelah)}</td><td class="right">${formatRp(selisihOpd)}</td><td class="center">${formatPersen(totalOpdSebelum, selisihOpd)}</td></tr>
        </tbody></table>
      </div>
      <div class="page">
        <div style="text-align:right;font-size:9px">Formulir DPPA-BELANJA SKPD</div>
        <div class="h1">RINCIAN ANGGARAN PERGESERAN BELANJA SKPD — TAHUN ANGGARAN ${tahun}</div>
        <table><thead><tr><th colspan="2">Kode</th><th colspan="4">Uraian Sub Kegiatan</th><th>Sebelum</th><th>Setelah</th><th>Bertambah/(Berkurang) Rp</th><th>%</th></tr></thead><tbody>
          ${belanjaRows}
          <tr class="bold green"><td colspan="6" class="center">JUMLAH TOTAL BELANJA OPD</td><td class="right">${formatRp(totalOpdSebelum)}</td><td class="right">${formatRp(totalOpdSetelah)}</td><td class="right">${formatRp(selisihOpd)}</td><td class="center">${formatPersen(totalOpdSebelum, selisihOpd)}</td></tr>
        </tbody></table>
        <div style="margin-top:15px"><div class="bold" style="margin-bottom:4px">Tim Anggaran Pemerintahan Daerah</div><table><thead><tr><th>No</th><th>Nama</th><th>NIP</th><th>Jabatan</th><th>TTD</th></tr></thead><tbody>${tapdRows}</tbody></table></div>
      </div>
      ${rincianBlocks}
      </body></html>`;

      browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });
      const pdfBuffer = await page.pdf({
        format: 'A4',
        landscape: true,
        printBackground: true,
        margin: { top: '15px', bottom: '15px', left: '15px', right: '15px' },
      });
      await browser.close();

      const namaFile = `DPPA_SKPD_OPD${opd_id}_${tahun}.pdf`;
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=${namaFile}`);
      res.send(pdfBuffer);
    } catch (error) {
      if (browser) await browser.close();
      res.status(500).json({ success: false, message: error.message });
    }
  },
};
