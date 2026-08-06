'use strict';

const db = require('../../models');
const crypto = require('crypto');
const { initializeInitialIndicators } = require('./prosnpInitialIndicators');

const ADMIN_ROLES = new Set(['SUPER_ADMIN', 'ADMINISTRATOR']);
const OPERATOR_ROLES = new Set(['PELAKSANA']);
const REVIEWER_ROLES = new Set(['PENGAWAS']);
const INPUT_ROLES = new Set(['PROSN_INPUT']);
const PHASE_1_TRANSITIONS = {
  belum_diisi: new Set(['dalam_pengisian']),
  dalam_pengisian: new Set(['lengkap']),
  lengkap: new Set(['perlu_perbaikan', 'siap_diinput_prosn']),
  perlu_perbaikan: new Set(['dalam_pengisian']),
  siap_diinput_prosn: new Set(['diinput_manual']),
};

class ProsnError extends Error {
  constructor(message, status = 400, code = 'PROSNP_VALIDATION_ERROR') {
    super(message);
    this.status = status;
    this.code = code;
  }
}

function roleOf(actor) {
  return String(actor?.role || '').trim().toUpperCase().replace(/\s+/g, '_');
}
function isAdmin(actor) { return ADMIN_ROLES.has(roleOf(actor)); }
function isInputOfficer(actor) { return INPUT_ROLES.has(roleOf(actor)) || isAdmin(actor); }
function assertRole(actor, allowed, message = 'Akses ProSN ditolak.') {
  if (!allowed.has(roleOf(actor)) && !isAdmin(actor)) throw new ProsnError(message, 403, 'PROSNP_FORBIDDEN');
}
function assertPositiveInteger(value, field) {
  const result = Number(value);
  if (!Number.isInteger(result) || result < 1) throw new ProsnError(`${field} wajib berupa bilangan bulat positif.`);
  return result;
}
function assertLockVersion(value) {
  const result = Number(value);
  if (!Number.isInteger(result) || result < 0) throw new ProsnError('lock_version wajib dikirim dari data terakhir.');
  return result;
}
function assertSameTenant(row, tenantId) {
  if (!row || Number(row.tenant_id) !== Number(tenantId)) throw new ProsnError('Data ProSN tidak ditemukan.', 404, 'PROSNP_NOT_FOUND');
}
function validateForm(indikator, dataForm) {
  if (!dataForm || typeof dataForm !== 'object' || Array.isArray(dataForm)) throw new ProsnError('data_form wajib berupa objek JSON.');
  const required = indikator.konfigurasi_form?.required || [];
  for (const key of required) {
    const value = dataForm[key];
    if (value === null || value === undefined || value === '') throw new ProsnError(`data_form.${key} wajib diisi sebelum status Lengkap.`);
  }
}

async function getPengisianScoped(id, tenantId, transaction) {
  const row = await db.ProsnPengisian.findByPk(id, {
    include: [{
      model: db.ProsnIndikator,
      as: 'indikator',
      include: [
        { model: db.ProsnPeriode, as: 'periode' },
        { model: db.ProsnBuktiDukung, as: 'buktiDukung', through: { attributes: ['id', 'checklist_status', 'catatan_kekurangan', 'relevansi', 'lock_version'] } },
      ],
    }],
    transaction,
  });
  assertSameTenant(row, tenantId);
  if (!row.indikator || Number(row.indikator.tenant_id) !== Number(tenantId) || !row.indikator.periode) {
    throw new ProsnError('Relasi pengisian ProSN tidak valid.', 409, 'PROSNP_SCOPE_INVALID');
  }
  return row;
}

async function createPeriod(payload, actor, tenantId) {
  if (!isAdmin(actor)) throw new ProsnError('Hanya Administrator yang dapat membuat periode.', 403, 'PROSNP_FORBIDDEN');
  const { tahun, semester = 'tahunan', nama, tanggal_mulai, tanggal_tenggat, perangkat_daerah_id, catatan = null } = payload;
  if (!/^\d{4}$/.test(String(tahun || ''))) throw new ProsnError('tahun harus empat digit.');
  if (!['1', '2', 'tahunan'].includes(String(semester))) throw new ProsnError('semester tidak valid.');
  if (!nama || !tanggal_mulai || !tanggal_tenggat) throw new ProsnError('nama, tanggal_mulai, dan tanggal_tenggat wajib diisi.');
  if (new Date(tanggal_mulai) > new Date(tanggal_tenggat)) throw new ProsnError('tanggal_tenggat harus sesudah tanggal_mulai.');

  try {
    return await db.sequelize.transaction(async (transaction) => {
      const periode = await db.ProsnPeriode.create({ tenant_id: tenantId, perangkat_daerah_id: assertPositiveInteger(perangkat_daerah_id, 'perangkat_daerah_id'), tahun: String(tahun), semester, nama, tanggal_mulai, tanggal_tenggat, catatan, created_by: actor.id, updated_by: actor.id }, { transaction });
      await initializeInitialIndicators({ periode, actorId: actor.id, transaction });
      return periode;
    });
  } catch (error) {
    if (error?.name === 'SequelizeUniqueConstraintError') throw new ProsnError('Periode ProSN untuk OPD, tahun, dan semester tersebut sudah ada.', 409, 'PROSNP_PERIOD_DUPLICATE');
    throw error;
  }
}

async function initializePeriodIndicators(id, actor, tenantId) {
  if (!isAdmin(actor)) throw new ProsnError('Hanya Administrator yang dapat menginisialisasi indikator.', 403, 'PROSNP_FORBIDDEN');
  return db.sequelize.transaction(async (transaction) => {
    const periode = await db.ProsnPeriode.findOne({ where: { id, tenant_id: tenantId }, transaction, lock: transaction.LOCK.UPDATE });
    if (!periode) throw new ProsnError('Periode tidak ditemukan.', 404, 'PROSNP_NOT_FOUND');
    if (periode.status !== 'draft') throw new ProsnError('Indikator awal hanya dapat diinisialisasi pada periode draft.', 409, 'PROSNP_PERIOD_NOT_DRAFT');
    await initializeInitialIndicators({ periode, actorId: actor.id, transaction });
    return db.ProsnIndikator.findAll({ where: { tenant_id: tenantId, periode_id: periode.id }, order: [['urutan', 'ASC']], transaction });
  });
}

async function activatePeriod(id, actor, tenantId) {
  if (!isAdmin(actor)) throw new ProsnError('Hanya Administrator yang dapat mengaktifkan periode.', 403, 'PROSNP_FORBIDDEN');
  return db.sequelize.transaction(async (transaction) => {
    const periode = await db.ProsnPeriode.findByPk(id, { transaction, lock: transaction.LOCK.UPDATE });
    assertSameTenant(periode, tenantId);
    if (periode.status !== 'draft') throw new ProsnError('Hanya periode draft yang dapat diaktifkan.', 409, 'PROSNP_PERIOD_NOT_DRAFT');
    const indikator = await db.ProsnIndikator.findAll({ where: { tenant_id: tenantId, periode_id: periode.id, aktif: true }, transaction, lock: transaction.LOCK.UPDATE });
    if (!indikator.length) throw new ProsnError('Periode belum memiliki indikator aktif.', 409, 'PROSNP_INDICATOR_REQUIRED');
    await db.ProsnPengisian.bulkCreate(indikator.map((item) => ({ tenant_id: tenantId, indikator_id: item.id, data_form: {}, created_by: actor.id, updated_by: actor.id })), { ignoreDuplicates: true, transaction });
    await periode.update({ status: 'aktif', updated_by: actor.id }, { transaction });
    return periode;
  });
}

async function createIndikator(periodeId, payload, actor, tenantId) {
  if (!isAdmin(actor)) throw new ProsnError('Hanya Administrator yang dapat menambah indikator.', 403, 'PROSNP_FORBIDDEN');
  const periode = await db.ProsnPeriode.findByPk(periodeId);
  assertSameTenant(periode, tenantId);
  if (periode.status !== 'draft') throw new ProsnError('Indikator hanya dapat ditambahkan pada periode draft.', 409, 'PROSNP_PERIOD_NOT_DRAFT');
  const { kode, nama, tipe_form, konfigurasi_form, satuan_default = null, rumus = null, wajib_bukti = true, minimum_bukti = 1, urutan = 0, renja_pro_sn_master_id = null, renja_dukungan_prosn_tematik_id = null } = payload;
  if (!kode || !nama || !['dukungan_program', 'target_capaian_rasio', 'distribusi_status'].includes(tipe_form)) throw new ProsnError('kode, nama, dan tipe_form valid wajib diisi.');
  if (!konfigurasi_form || typeof konfigurasi_form !== 'object' || Array.isArray(konfigurasi_form)) throw new ProsnError('konfigurasi_form wajib berupa objek JSON.');
  try {
    return await db.ProsnIndikator.create({ tenant_id: tenantId, periode_id: periode.id, kode, nama, tipe_form, konfigurasi_form, satuan_default, rumus, wajib_bukti: Boolean(wajib_bukti), minimum_bukti: Number(minimum_bukti) || 0, urutan: Number(urutan) || 0, renja_pro_sn_master_id, renja_dukungan_prosn_tematik_id, created_by: actor.id, updated_by: actor.id });
  } catch (error) {
    if (error?.name === 'SequelizeUniqueConstraintError') throw new ProsnError('Kode indikator sudah digunakan pada periode ini.', 409, 'PROSNP_INDICATOR_DUPLICATE');
    throw error;
  }
}

async function updatePengisian(id, payload, actor, tenantId) {
  assertRole(actor, OPERATOR_ROLES, 'Hanya Operator atau Administrator yang dapat mengubah pengisian.');
  const expectedVersion = assertLockVersion(payload.lock_version);
  return db.sequelize.transaction(async (transaction) => {
    const row = await getPengisianScoped(id, tenantId, transaction);
    if (!['belum_diisi', 'dalam_pengisian'].includes(row.status)) throw new ProsnError('Pengisian hanya dapat diubah saat Belum Diisi atau Dalam Pengisian.', 409, 'PROSNP_EDIT_LOCKED');
    if (row.indikator.periode.status !== 'aktif') throw new ProsnError('Periode tidak aktif.', 409, 'PROSNP_PERIOD_LOCKED');
    if (row.lock_version !== expectedVersion) throw new ProsnError('Data telah diubah pengguna lain. Muat ulang data terlebih dahulu.', 409, 'PROSNP_VERSION_CONFLICT');
    if (!isAdmin(actor) && row.diisi_oleh && Number(row.diisi_oleh) !== Number(actor.id)) throw new ProsnError('Operator hanya dapat mengubah pengisian miliknya.', 403, 'PROSNP_NOT_OWNER');
    const editable = ['data_form', 'target_nilai', 'realisasi_nilai', 'rasio_nilai', 'satuan', 'sumber_data', 'periode_data', 'hambatan', 'tindak_lanjut'];
    const values = Object.fromEntries(editable.filter((key) => Object.prototype.hasOwnProperty.call(payload, key)).map((key) => [key, payload[key]]));
    if (Object.prototype.hasOwnProperty.call(values, 'data_form')) validateForm(row.indikator, values.data_form);
    const [count] = await db.ProsnPengisian.update({ ...values, status: row.status === 'belum_diisi' ? 'dalam_pengisian' : row.status, diisi_oleh: row.diisi_oleh || actor.id, diisi_at: new Date(), updated_by: actor.id, lock_version: expectedVersion + 1 }, { where: { id: row.id, tenant_id: tenantId, lock_version: expectedVersion }, transaction });
    if (count !== 1) throw new ProsnError('Data telah diubah pengguna lain. Muat ulang data terlebih dahulu.', 409, 'PROSNP_VERSION_CONFLICT');
    return getPengisianScoped(id, tenantId, transaction);
  });
}

async function transitionPengisian(id, target, payload, actor, tenantId) {
  const expectedVersion = assertLockVersion(payload.lock_version);
  return db.sequelize.transaction(async (transaction) => {
    const row = await getPengisianScoped(id, tenantId, transaction);
    if (row.indikator.periode.status !== 'aktif') throw new ProsnError('Periode tidak aktif.', 409, 'PROSNP_PERIOD_LOCKED');
    if (!PHASE_1_TRANSITIONS[row.status]?.has(target)) throw new ProsnError('Transisi status Tahap 1 tidak diizinkan.', 409, 'PROSNP_TRANSITION_INVALID');
    if (row.lock_version !== expectedVersion) throw new ProsnError('Data telah diubah pengguna lain. Muat ulang data terlebih dahulu.', 409, 'PROSNP_VERSION_CONFLICT');
    if (target === 'lengkap') {
      assertRole(actor, OPERATOR_ROLES, 'Hanya Operator atau Administrator yang dapat menandai Lengkap.');
      if (!isAdmin(actor) && Number(row.diisi_oleh) !== Number(actor.id)) throw new ProsnError('Hanya pengisi asli yang dapat menandai Lengkap.', 403, 'PROSNP_NOT_OWNER');
      validateForm(row.indikator, row.data_form);
      if (!row.sumber_data) throw new ProsnError('sumber_data wajib diisi sebelum status Lengkap.');
    } else if (target === 'perlu_perbaikan') {
      assertRole(actor, REVIEWER_ROLES, 'Hanya Pemeriksa atau Administrator yang dapat meminta perbaikan.');
      if (!payload.alasan) throw new ProsnError('alasan wajib diisi saat meminta perbaikan.');
    } else if (target === 'siap_diinput_prosn') {
      if (!isInputOfficer(actor)) throw new ProsnError('Hanya Petugas Input atau Administrator yang dapat menandai siap input.', 403, 'PROSNP_FORBIDDEN');
      const review = await db.ProsnPemeriksaan.findOne({ where: { tenant_id: tenantId, pengisian_id: row.id, hasil: 'lengkap' }, order: [['putaran', 'DESC']], transaction });
      if (!review) throw new ProsnError('Pengisian harus memiliki hasil pemeriksaan Lengkap sebelum siap diinput.', 409, 'PROSNP_REVIEW_REQUIRED');
    } else if (target === 'diinput_manual') {
      if (!isInputOfficer(actor)) throw new ProsnError('Hanya Petugas Input atau Administrator yang dapat menandai input manual.', 403, 'PROSNP_FORBIDDEN');
      if (!payload.nomor_bukti_input) throw new ProsnError('nomor_bukti_input wajib diisi saat menandai input manual.');
    } else {
      assertRole(actor, OPERATOR_ROLES, 'Hanya Operator atau Administrator yang dapat memulai atau memperbaiki pengisian.');
      if (row.status === 'perlu_perbaikan' && !isAdmin(actor) && Number(row.diisi_oleh) !== Number(actor.id)) throw new ProsnError('Hanya pengisi asli yang dapat membuka perbaikan.', 403, 'PROSNP_NOT_OWNER');
    }
    const transitionValues = { status: target, updated_by: actor.id, lock_version: expectedVersion + 1 };
    if (target === 'siap_diinput_prosn') Object.assign(transitionValues, { siap_input_oleh: actor.id, siap_input_at: new Date() });
    if (target === 'diinput_manual') Object.assign(transitionValues, { input_manual_oleh: actor.id, input_manual_at: new Date(), nomor_bukti_input: payload.nomor_bukti_input });
    const [count] = await db.ProsnPengisian.update(transitionValues, { where: { id: row.id, tenant_id: tenantId, lock_version: expectedVersion }, transaction });
    if (count !== 1) throw new ProsnError('Data telah diubah pengguna lain. Muat ulang data terlebih dahulu.', 409, 'PROSNP_VERSION_CONFLICT');
    await db.ProsnRiwayatStatus.create({ tenant_id: tenantId, pengisian_id: row.id, status_sebelum: row.status, status_sesudah: target, alasan: payload.alasan || null, metadata: { phase: 1, lock_version: expectedVersion + 1 }, diubah_oleh: actor.id, diubah_at: new Date() }, { transaction });
    return getPengisianScoped(id, tenantId, transaction);
  });
}

async function listAntrianPemeriksaan(tenantId) {
  return db.ProsnPengisian.findAll({
    where: { tenant_id: tenantId, status: 'lengkap' },
    include: [{
      model: db.ProsnIndikator,
      as: 'indikator',
      include: [{ model: db.ProsnPeriode, as: 'periode', include: [{ model: db.PerangkatDaerah, as: 'perangkatDaerah', attributes: ['id', 'nama'] }] }],
    }],
    order: [['diisi_at', 'ASC']],
  });
}

async function listPeriods(tenantId, filters = {}) {
  const where = { tenant_id: tenantId };
  if (filters.tahun) where.tahun = String(filters.tahun);
  if (filters.status) where.status = filters.status;
  return db.ProsnPeriode.findAll({ where, order: [['tahun', 'DESC'], ['semester', 'ASC']], include: [{ model: db.ProsnIndikator, as: 'indikators', attributes: ['id', 'kode', 'aktif'] }] });
}

async function createBukti(pengisianId, payload, file, actor, tenantId) {
  assertRole(actor, OPERATOR_ROLES, 'Hanya Operator atau Administrator yang dapat mengunggah bukti.');
  if (!file) throw new ProsnError('Berkas bukti wajib diunggah.', 422, 'PROSNP_FILE_REQUIRED');
  return db.sequelize.transaction(async (transaction) => {
    const pengisian = await getPengisianScoped(pengisianId, tenantId, transaction);
    if (!['belum_diisi', 'dalam_pengisian'].includes(pengisian.status)) throw new ProsnError('Bukti hanya dapat diubah saat pengisian terbuka.', 409, 'PROSNP_EDIT_LOCKED');
    if (!isAdmin(actor) && pengisian.diisi_oleh && Number(pengisian.diisi_oleh) !== Number(actor.id)) throw new ProsnError('Operator hanya dapat mengunggah bukti untuk pengisiannya.', 403, 'PROSNP_NOT_OWNER');
    const checksum = crypto.createHash('sha256').update(require('fs').readFileSync(file.path)).digest('hex');
    const bukti = await db.ProsnBuktiDukung.create({ tenant_id: tenantId, periode_id: pengisian.indikator.periode_id, kelompok_uuid: crypto.randomUUID(), versi: 1, judul: payload.judul || file.originalname, jenis_bukti: payload.jenis_bukti || null, nama_asli: file.originalname, nama_tersimpan: file.filename, file_path: file.path, mime_type: file.mimetype, ukuran_byte: file.size, checksum_sha256: checksum, diunggah_oleh: actor.id, diunggah_at: new Date() }, { transaction });
    let indikatorIds = payload.indikator_ids;
    if (typeof indikatorIds === 'string') { try { indikatorIds = JSON.parse(indikatorIds); } catch (_) { indikatorIds = indikatorIds.split(','); } }
    if (!Array.isArray(indikatorIds) || indikatorIds.length === 0) indikatorIds = [pengisian.indikator_id];
    const uniqueIds = [...new Set(indikatorIds.map((value) => Number(value)).filter(Number.isInteger))];
    const indikator = await db.ProsnIndikator.findAll({ where: { tenant_id: tenantId, periode_id: pengisian.indikator.periode_id, id: uniqueIds }, transaction });
    if (indikator.length !== uniqueIds.length) throw new ProsnError('Semua indikator bukti harus berada pada periode dan tenant yang sama.', 409, 'PROSNP_EVIDENCE_SCOPE_INVALID');
    await db.ProsnBuktiIndikator.bulkCreate(uniqueIds.map((indikator_id) => ({ tenant_id: tenantId, bukti_dukung_id: bukti.id, indikator_id, relevansi: payload.relevansi || null, ditautkan_oleh: actor.id })), { transaction });
    return bukti;
  });
}

async function reviseBukti(buktiId, payload, file, actor, tenantId) {
  assertRole(actor, OPERATOR_ROLES, 'Hanya Operator atau Administrator yang dapat merevisi bukti.');
  if (!file) throw new ProsnError('Berkas versi baru wajib diunggah.', 422, 'PROSNP_FILE_REQUIRED');
  const expectedVersion = assertLockVersion(payload.lock_version);
  return db.sequelize.transaction(async (transaction) => {
    const lama = await db.ProsnBuktiDukung.findOne({ where: { id: buktiId, tenant_id: tenantId }, transaction, lock: transaction.LOCK.UPDATE });
    if (!lama) throw new ProsnError('Bukti tidak ditemukan.', 404, 'PROSNP_NOT_FOUND');
    if (lama.lock_version !== expectedVersion) throw new ProsnError('Bukti telah diubah pengguna lain. Muat ulang data terlebih dahulu.', 409, 'PROSNP_VERSION_CONFLICT');
    const links = await db.ProsnBuktiIndikator.findAll({ where: { tenant_id: tenantId, bukti_dukung_id: lama.id }, transaction });
    const checksum = crypto.createHash('sha256').update(require('fs').readFileSync(file.path)).digest('hex');
    const baru = await db.ProsnBuktiDukung.create({ tenant_id: tenantId, periode_id: lama.periode_id, kelompok_uuid: lama.kelompok_uuid, versi: lama.versi + 1, judul: payload.judul || lama.judul, jenis_bukti: payload.jenis_bukti || lama.jenis_bukti, nama_asli: file.originalname, nama_tersimpan: file.filename, file_path: file.path, mime_type: file.mimetype, ukuran_byte: file.size, checksum_sha256: checksum, menggantikan_bukti_id: lama.id, diunggah_oleh: actor.id, diunggah_at: new Date(), catatan: payload.catatan || null }, { transaction });
    await db.ProsnBuktiIndikator.bulkCreate(links.map((link) => ({ tenant_id: tenantId, bukti_dukung_id: baru.id, indikator_id: link.indikator_id, relevansi: link.relevansi, ditautkan_oleh: actor.id })), { transaction });
    const [count] = await db.ProsnBuktiDukung.update({ status: 'digantikan', lock_version: expectedVersion + 1 }, { where: { id: lama.id, tenant_id: tenantId, lock_version: expectedVersion }, transaction });
    if (count !== 1) throw new ProsnError('Bukti telah diubah pengguna lain. Muat ulang data terlebih dahulu.', 409, 'PROSNP_VERSION_CONFLICT');
    return baru;
  });
}

async function checklistBukti(linkId, payload, actor, tenantId) {
  assertRole(actor, REVIEWER_ROLES, 'Hanya Pemeriksa atau Administrator yang dapat memeriksa bukti.');
  if (!['belum_dicek', 'sesuai', 'tidak_sesuai'].includes(payload.checklist_status)) throw new ProsnError('checklist_status tidak valid.');
  const expectedVersion = assertLockVersion(payload.lock_version);
  const link = await db.ProsnBuktiIndikator.findOne({ where: { id: linkId, tenant_id: tenantId } });
  if (!link) throw new ProsnError('Relasi bukti tidak ditemukan.', 404, 'PROSNP_NOT_FOUND');
  const [count] = await db.ProsnBuktiIndikator.update({ checklist_status: payload.checklist_status, catatan_kekurangan: payload.catatan_kekurangan || null, lock_version: expectedVersion + 1 }, { where: { id: link.id, tenant_id: tenantId, lock_version: expectedVersion } });
  if (count !== 1) throw new ProsnError('Checklist telah diubah pengguna lain. Muat ulang data terlebih dahulu.', 409, 'PROSNP_VERSION_CONFLICT');
  return db.ProsnBuktiIndikator.findByPk(link.id);
}

async function periksaPengisian(id, payload, actor, tenantId) {
  assertRole(actor, REVIEWER_ROLES, 'Hanya Pemeriksa atau Administrator yang dapat melakukan pemeriksaan.');
  const expectedVersion = assertLockVersion(payload.lock_version);
  if (!['lengkap', 'perlu_perbaikan'].includes(payload.hasil) || !['lengkap', 'tidak_lengkap', 'tidak_valid'].includes(payload.status_data) || !['lengkap', 'tidak_lengkap', 'tidak_valid'].includes(payload.status_bukti)) throw new ProsnError('Hasil pemeriksaan tidak valid.');
  if (payload.hasil === 'perlu_perbaikan' && !payload.catatan_kekurangan) throw new ProsnError('catatan_kekurangan wajib saat meminta perbaikan.');
  return db.sequelize.transaction(async (transaction) => {
    const row = await getPengisianScoped(id, tenantId, transaction);
    if (row.status !== 'lengkap') throw new ProsnError('Hanya pengisian berstatus Lengkap yang dapat diperiksa.', 409, 'PROSNP_REVIEW_INVALID_STATE');
    if (row.lock_version !== expectedVersion) throw new ProsnError('Data telah diubah pengguna lain. Muat ulang data terlebih dahulu.', 409, 'PROSNP_VERSION_CONFLICT');
    const putaran = (await db.ProsnPemeriksaan.max('putaran', { where: { tenant_id: tenantId, pengisian_id: row.id }, transaction }) || 0) + 1;
    await db.ProsnPemeriksaan.create({ tenant_id: tenantId, pengisian_id: row.id, putaran, hasil: payload.hasil, status_data: payload.status_data, status_bukti: payload.status_bukti, catatan_kekurangan: payload.catatan_kekurangan || null, diperiksa_oleh: actor.id, diperiksa_at: new Date() }, { transaction });
    const target = payload.hasil === 'perlu_perbaikan' ? 'perlu_perbaikan' : 'lengkap';
    const [count] = await db.ProsnPengisian.update({ status: target, updated_by: actor.id, lock_version: expectedVersion + 1 }, { where: { id: row.id, tenant_id: tenantId, lock_version: expectedVersion }, transaction });
    if (count !== 1) throw new ProsnError('Data telah diubah pengguna lain.', 409, 'PROSNP_VERSION_CONFLICT');
    if (target !== row.status) await db.ProsnRiwayatStatus.create({ tenant_id: tenantId, pengisian_id: row.id, status_sebelum: row.status, status_sesudah: target, alasan: payload.catatan_kekurangan || null, metadata: { phase: 2, pemeriksaan_id: putaran }, diubah_oleh: actor.id, diubah_at: new Date() }, { transaction });
    return getPengisianScoped(id, tenantId, transaction);
  });
}

async function archivePeriod(id, payload, actor, tenantId) {
  if (!isInputOfficer(actor)) throw new ProsnError('Hanya Petugas Input atau Administrator yang dapat mengarsipkan periode.', 403, 'PROSNP_FORBIDDEN');
  return db.sequelize.transaction(async (transaction) => {
    const periode = await db.ProsnPeriode.findOne({ where: { id, tenant_id: tenantId }, transaction, lock: transaction.LOCK.UPDATE });
    if (!periode) throw new ProsnError('Periode tidak ditemukan.', 404, 'PROSNP_NOT_FOUND');
    if (periode.status !== 'aktif') throw new ProsnError('Hanya periode aktif yang dapat diarsipkan.', 409, 'PROSNP_ARCHIVE_INVALID_STATE');
    const indikator = await db.ProsnIndikator.findAll({ where: { tenant_id: tenantId, periode_id: id }, include: [{ model: db.ProsnPengisian, as: 'pengisian' }], transaction });
    const summary = indikator.reduce((acc, item) => { const status = item.pengisian?.status || 'belum_diisi'; acc[status] = (acc[status] || 0) + 1; return acc; }, {});
    const snapshot_data = { schema_version: 1, archived_at: new Date().toISOString(), periode: periode.toJSON(), ringkasan_status: summary, indikator: indikator.map((item) => item.toJSON()), catatan_arsip: payload.catatan || null };
    const checksum_snapshot = crypto.createHash('sha256').update(JSON.stringify(snapshot_data)).digest('hex');
    const arsip = await db.ProsnArsip.create({ tenant_id: tenantId, periode_id: id, nomor_arsip: payload.nomor_arsip || `PROSNP-${periode.tahun}-${periode.semester}-${id}`, snapshot_data, checksum_snapshot, diarsipkan_oleh: actor.id, diarsipkan_at: new Date(), catatan: payload.catatan || null }, { transaction });
    const rows = await db.ProsnPengisian.findAll({ where: { tenant_id: tenantId }, include: [{ model: db.ProsnIndikator, as: 'indikator', where: { periode_id: id } }], transaction, lock: transaction.LOCK.UPDATE });
    for (const row of rows) {
      await row.update({ status: 'diarsipkan', lock_version: row.lock_version + 1, updated_by: actor.id }, { transaction });
      await db.ProsnRiwayatStatus.create({ tenant_id: tenantId, pengisian_id: row.id, status_sebelum: row.status, status_sesudah: 'diarsipkan', alasan: payload.catatan || 'Pengarsipan periode fleksibel.', metadata: { phase: 2, arsip_id: arsip.id }, diubah_oleh: actor.id, diubah_at: new Date() }, { transaction });
    }
    await periode.update({ status: 'diarsipkan', dikunci_at: new Date(), dikunci_oleh: actor.id, updated_by: actor.id }, { transaction });
    return { arsip, ringkasan_status: summary };
  });
}

async function reopenPeriod(id, payload, actor, tenantId) {
  if (!isAdmin(actor)) throw new ProsnError('Hanya Administrator yang dapat membuka kembali periode.', 403, 'PROSNP_FORBIDDEN');
  if (!payload.alasan) throw new ProsnError('alasan wajib diisi saat membuka kembali periode.');
  return db.sequelize.transaction(async (transaction) => {
    const periode = await db.ProsnPeriode.findOne({ where: { id, tenant_id: tenantId }, transaction, lock: transaction.LOCK.UPDATE });
    if (!periode || periode.status !== 'diarsipkan') throw new ProsnError('Hanya periode terarsip yang dapat dibuka kembali.', 409, 'PROSNP_REOPEN_INVALID_STATE');
    const arsip = await db.ProsnArsip.findOne({ where: { tenant_id: tenantId, periode_id: id }, transaction });
    const statusAsal = new Map((arsip?.snapshot_data?.indikator || []).map((item) => [Number(item.id), item.pengisian?.status || 'belum_diisi']));
    const rows = await db.ProsnPengisian.findAll({ where: { tenant_id: tenantId }, include: [{ model: db.ProsnIndikator, as: 'indikator', where: { periode_id: id } }], transaction, lock: transaction.LOCK.UPDATE });
    for (const row of rows) {
      const target = statusAsal.get(Number(row.indikator_id)) || 'belum_diisi';
      await row.update({ status: target, lock_version: row.lock_version + 1, updated_by: actor.id }, { transaction });
      await db.ProsnRiwayatStatus.create({ tenant_id: tenantId, pengisian_id: row.id, status_sebelum: 'diarsipkan', status_sesudah: target, alasan: payload.alasan, metadata: { phase: 2, reopened_from_archive_id: arsip?.id || null }, diubah_oleh: actor.id, diubah_at: new Date() }, { transaction });
    }
    await periode.update({ status: 'aktif', dikunci_at: null, dikunci_oleh: null, catatan: [periode.catatan, `Dibuka kembali: ${payload.alasan}`].filter(Boolean).join('\n'), updated_by: actor.id }, { transaction });
    return periode;
  });
}

module.exports = { ProsnError, createPeriod, createIndikator, initializePeriodIndicators, activatePeriod, updatePengisian, transitionPengisian, listPeriods, listAntrianPemeriksaan, getPengisianScoped, createBukti, reviseBukti, checklistBukti, periksaPengisian, archivePeriod, reopenPeriod, isAdmin };
