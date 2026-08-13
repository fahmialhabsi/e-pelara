import api from '../../../services/api';

export async function getProsnPeriode(params = {}) {
  const response = await api.get('/prosnp/periode', { params });
  return response.data?.data || [];
}

export async function getProsnKonteks() {
  const response = await api.get('/prosnp/konteks');
  return response.data?.data;
}

export async function createProsnPeriode(payload) {
  const response = await api.post('/prosnp/periode', payload);
  return response.data?.data;
}

export async function updateProsnPeriode(id, payload) {
  const response = await api.patch(`/prosnp/periode/${id}`, payload);
  return response.data?.data;
}

export async function activateProsnPeriode(id) {
  const response = await api.post(`/prosnp/periode/${id}/aktifkan`);
  return response.data?.data;
}

export async function initializeProsnIndikator(id) {
  const response = await api.post(`/prosnp/periode/${id}/inisialisasi-indikator`);
  return response.data?.data;
}

export async function exportProsnExcel(id) {
  return api.get(`/prosnp/periode/${id}/ekspor/excel`, { responseType: 'blob' });
}

export async function exportProsnB13TemplateNasional(id) {
  return api.get(`/prosnp/periode/${id}/ekspor/b13-template-nasional`, { responseType: 'blob' });
}

export async function getProsnPeriodeDetail(id) {
  const response = await api.get(`/prosnp/periode/${id}`);
  return response.data?.data;
}

export async function getProsnPengisian(id) {
  const response = await api.get(`/prosnp/pengisian/${id}`);
  return response.data?.data;
}

export async function updateProsnPengisian(id, payload) {
  const response = await api.put(`/prosnp/pengisian/${id}`, payload);
  return response.data?.data;
}

export async function transitionProsnPengisian(id, payload) {
  const response = await api.post(`/prosnp/pengisian/${id}/transisi`, payload);
  return response.data?.data;
}

export async function getProsnDukunganSistem(periodeId) {
  const response = await api.get(`/prosnp/periode/${periodeId}/dukungan-sistem`);
  return response.data?.data || [];
}

export async function createProsnBukti(pengisianId, formData) {
  const response = await api.post(`/prosnp/pengisian/${pengisianId}/bukti`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data?.data;
}

export async function reviseProsnBukti(buktiId, formData) {
  const response = await api.post(`/prosnp/bukti/${buktiId}/versi`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data?.data;
}

export async function downloadProsnBukti(buktiId) {
  return api.get(`/prosnp/bukti/${buktiId}/download`, { responseType: 'blob' });
}

export async function checklistProsnBukti(linkId, payload) {
  const response = await api.patch(`/prosnp/bukti-relasi/${linkId}/checklist`, payload);
  return response.data?.data;
}

export async function periksaProsnPengisian(pengisianId, payload) {
  const response = await api.post(`/prosnp/pengisian/${pengisianId}/pemeriksaan`, payload);
  return response.data?.data;
}

export async function getProsnAntrianPemeriksaan() {
  const response = await api.get('/prosnp/pemeriksaan/antrian');
  return response.data?.data || [];
}

export async function getProsnKategoriReferensi(kelompok) {
  const response = await api.get('/prosnp/kategori-referensi', { params: kelompok ? { kelompok } : {} });
  return response.data?.data || [];
}

// ── Data referensi B.1.1-B.1.4 ──
export async function getProsnMasterIndikator() {
  const response = await api.get('/prosnp/master-indikator');
  return response.data?.data || [];
}
export async function getProsnNomenklaturMapping(params = {}) {
  const response = await api.get('/prosnp/nomenklatur-mapping', { params });
  return response.data?.data || [];
}
export async function getProsnKomoditas() {
  const response = await api.get('/prosnp/komoditas');
  return response.data?.data || [];
}

// ── B.1.1 Register Surat Penugasan ──
export async function getProsnSuratPenugasan(pengisianId) {
  const response = await api.get(`/prosnp/pengisian/${pengisianId}/surat-penugasan`);
  return response.data?.data || [];
}
export async function createProsnSuratPenugasan(pengisianId, payload) {
  const response = await api.post(`/prosnp/pengisian/${pengisianId}/surat-penugasan`, payload);
  return response.data?.data;
}
export async function updateProsnSuratPenugasan(id, payload) {
  const response = await api.put(`/prosnp/surat-penugasan/${id}`, payload);
  return response.data?.data;
}
export async function deleteProsnSuratPenugasan(id) {
  const response = await api.delete(`/prosnp/surat-penugasan/${id}`);
  return response.data?.data;
}

// ── B.1.2 Register Rapat Forkopimda ──
export async function getProsnRapatForkopimda(pengisianId) {
  const response = await api.get(`/prosnp/pengisian/${pengisianId}/rapat-forkopimda`);
  return response.data?.data || [];
}
export async function createProsnRapatForkopimda(pengisianId, payload) {
  const response = await api.post(`/prosnp/pengisian/${pengisianId}/rapat-forkopimda`, payload);
  return response.data?.data;
}
export async function updateProsnRapatForkopimda(id, payload) {
  const response = await api.put(`/prosnp/rapat-forkopimda/${id}`, payload);
  return response.data?.data;
}
export async function deleteProsnRapatForkopimda(id) {
  const response = await api.delete(`/prosnp/rapat-forkopimda/${id}`);
  return response.data?.data;
}

// ── B.1.3 Target KDH & Transaksi Stok ──
export async function getProsnCadanganTarget(tahun) {
  const response = await api.get('/prosnp/cadangan-target', { params: tahun ? { tahun } : {} });
  return response.data?.data || [];
}
export async function createProsnCadanganTarget(payload) {
  const response = await api.post('/prosnp/cadangan-target', payload);
  return response.data?.data;
}
export async function updateProsnCadanganTarget(id, payload) {
  const response = await api.put(`/prosnp/cadangan-target/${id}`, payload);
  return response.data?.data;
}
export async function refreshProsnCadanganTargetSnapshot(id) {
  const response = await api.post(`/prosnp/cadangan-target/${id}/refresh-snapshot`);
  return response.data?.data;
}

// ── Source-Driven DPA Mapping (§10) — dropdown berjenjang tahun->OPD->Program->Kegiatan->SubKegiatan ──
export async function getProsnDpaSourceTahun() {
  const response = await api.get('/prosnp/dpa-source/tahun');
  return response.data?.data || [];
}
export async function getProsnDpaSourceOpd(tahun) {
  const response = await api.get('/prosnp/dpa-source/opd', { params: { tahun } });
  return response.data?.data || [];
}
export async function getProsnDpaSourceProgram(tahun, opdId) {
  const response = await api.get('/prosnp/dpa-source/program', { params: { tahun, opd_id: opdId } });
  return response.data?.data || [];
}
export async function getProsnDpaSourceKegiatan(tahun, opdId, kodeProgram) {
  const response = await api.get('/prosnp/dpa-source/kegiatan', { params: { tahun, opd_id: opdId, kode_program: kodeProgram } });
  return response.data?.data || [];
}
export async function getProsnDpaSourceSubKegiatan(tahun, opdId, kodeKegiatan) {
  const response = await api.get('/prosnp/dpa-source/sub-kegiatan', { params: { tahun, opd_id: opdId, kode_kegiatan: kodeKegiatan } });
  return response.data?.data || [];
}
export async function getProsnStokTransaksi(pengisianId) {
  const response = await api.get(`/prosnp/pengisian/${pengisianId}/stok-transaksi`);
  return response.data?.data || [];
}
export async function createProsnStokTransaksi(pengisianId, payload) {
  const response = await api.post(`/prosnp/pengisian/${pengisianId}/stok-transaksi`, payload);
  return response.data?.data;
}
export async function updateProsnStokTransaksi(id, payload) {
  const response = await api.put(`/prosnp/stok-transaksi/${id}`, payload);
  return response.data?.data;
}
export async function deleteProsnStokTransaksi(id) {
  const response = await api.delete(`/prosnp/stok-transaksi/${id}`);
  return response.data?.data;
}

// ── B.1.4 Register Inovasi ──
export async function getProsnInovasi(pengisianId) {
  const response = await api.get(`/prosnp/pengisian/${pengisianId}/inovasi`);
  return response.data?.data || [];
}
export async function createProsnInovasi(pengisianId, payload) {
  const response = await api.post(`/prosnp/pengisian/${pengisianId}/inovasi`, payload);
  return response.data?.data;
}
export async function updateProsnInovasi(id, payload) {
  const response = await api.put(`/prosnp/inovasi/${id}`, payload);
  return response.data?.data;
}
export async function deleteProsnInovasi(id) {
  const response = await api.delete(`/prosnp/inovasi/${id}`);
  return response.data?.data;
}

// ── Rule Engine ──
export async function hitungUlangProsnSkor(pengisianId) {
  const response = await api.post(`/prosnp/pengisian/${pengisianId}/hitung-ulang`);
  return response.data?.data;
}

// ── Internal Field Autofill (Sumber Data/Hambatan/Tindak Lanjut) — saran, tidak menulis DB ──
export async function previewProsnInternalAutofill(pengisianId) {
  const response = await api.post(`/prosnp/pengisian/${pengisianId}/internal-autofill-preview`);
  return response.data?.data;
}

// Corrective "ProSN Semester-II Readiness — Completion Readiness Itemized Blockers" (mandat §31) — READ-ONLY.
export async function checkProsnCompletionReadiness(pengisianId) {
  const response = await api.get(`/prosnp/pengisian/${pengisianId}/kesiapan-lengkap`);
  return response.data?.data;
}

// ── Aksi periode ──
export async function siapkanEksporProsnPeriode(id) {
  const response = await api.post(`/prosnp/periode/${id}/siap-ekspor`);
  return response.data?.data;
}

// ── MBG 2.1 Satgas (Indicator Foundation spek 34) ──
export async function getProsnSatgasMbg(pengisianId) {
  const response = await api.get(`/prosnp/pengisian/${pengisianId}/satgas-mbg`);
  return response.data?.data || null;
}
export async function createProsnSatgasMbg(pengisianId, payload) {
  const response = await api.post(`/prosnp/pengisian/${pengisianId}/satgas-mbg`, payload);
  return response.data?.data;
}
export async function updateProsnSatgasMbg(id, payload) {
  const response = await api.put(`/prosnp/satgas-mbg/${id}`, payload);
  return response.data?.data;
}

// ── MBG 2.2 Sarpras Komponen ──
export async function getProsnSarprasKomponenMbg(pengisianId) {
  const response = await api.get(`/prosnp/pengisian/${pengisianId}/sarpras-komponen-mbg`);
  return response.data?.data || [];
}
export async function bootstrapProsnSarprasKomponenMbg(pengisianId) {
  const response = await api.post(`/prosnp/pengisian/${pengisianId}/sarpras-komponen-mbg/bootstrap`);
  return response.data?.data || [];
}
export async function updateProsnSarprasKomponenMbg(id, payload) {
  const response = await api.put(`/prosnp/sarpras-komponen-mbg/${id}`, payload);
  return response.data?.data;
}

// ── MBG 2.3 Laporan Satgas Berkala ──
export async function getProsnLaporanSatgasMbg(pengisianId) {
  const response = await api.get(`/prosnp/pengisian/${pengisianId}/laporan-satgas-mbg`);
  return response.data?.data || [];
}
export async function createProsnLaporanSatgasMbg(pengisianId, payload) {
  const response = await api.post(`/prosnp/pengisian/${pengisianId}/laporan-satgas-mbg`, payload);
  return response.data?.data;
}
export async function updateProsnLaporanSatgasMbg(id, payload) {
  const response = await api.put(`/prosnp/laporan-satgas-mbg/${id}`, payload);
  return response.data?.data;
}

// ── Ownership per-indikator (D4, ADMIN-only) ──
export async function setProsnKepemilikanIndikator(indikatorId, payload) {
  const response = await api.post(`/prosnp/indikator/${indikatorId}/kepemilikan`, payload);
  return response.data?.data;
}
export async function getProsnKontributorIndikator(indikatorId) {
  const response = await api.get(`/prosnp/indikator/${indikatorId}/kontributor`);
  return response.data?.data || [];
}
export async function tambahProsnKontributorIndikator(indikatorId, payload) {
  const response = await api.post(`/prosnp/indikator/${indikatorId}/kontributor`, payload);
  return response.data?.data;
}
export async function hapusProsnKontributorIndikator(id) {
  const response = await api.delete(`/prosnp/indikator-kontributor/${id}`);
  return response.data?.data;
}

// ── Master Indikator — edit kriteria_skor (ADMIN-only) ──
export async function updateProsnKriteriaSkorMasterIndikator(id, kriteriaSkor) {
  const response = await api.put(`/prosnp/master-indikator/${id}/kriteria-skor`, { kriteria_skor: kriteriaSkor });
  return response.data?.data;
}

// ── Daftar OPD (dropdown Atur Kepemilikan) ──
export async function getProsnPerangkatDaerah() {
  const response = await api.get('/prosnp/perangkat-daerah');
  return response.data?.data || [];
}

// ── Autofill — Document Intelligence + Recall (spek 35 v3 §12/§27/§28) ──
export async function analisisBuktiProsn(buktiId, payload = {}) {
  const response = await api.post(`/prosnp/bukti/${buktiId}/analisis`, payload);
  return response.data?.data;
}
export async function terapkanAutofillProsn(pengisianId, payload) {
  const response = await api.post(`/prosnp/pengisian/${pengisianId}/autofill-apply`, payload);
  return response.data?.data;
}
export async function rebindBuktiProsn(buktiId, payload) {
  const response = await api.post(`/prosnp/bukti/${buktiId}/rebind`, payload);
  return response.data?.data;
}

// ── Master Indikator — pemetaan Indikator Renstra (ADMIN-only, spek 35 v3 §27) ──
export async function setProsnIndikatorRenstraMapping(id, indikatorRenstraId) {
  const response = await api.put(`/prosnp/master-indikator/${id}/mapping-renstra`, { indikator_renstra_id: indikatorRenstraId });
  return response.data?.data;
}
