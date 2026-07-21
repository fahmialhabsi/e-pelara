import api from '../../../services/api';

export const fetchKasData = async () => {
  const response = await fetch('/api/kas');
  return response.json();
};

// Import Realisasi Anggaran dari PDF "Laporan Realisasi per Sub Kegiatan" SIPD
// (1 berkas) — meniru pola importRkaPdf di features/rka/services/rkaApi.js.
// `tahun` wajib dikirim terpisah karena PDF ini tidak mencantumkan tahun.
export const importRealisasiPdf = async (file, tahun) => {
  const form = new FormData();
  form.append('file', file);
  form.append('tahun', tahun);
  const res = await api.post('/penatausahaan/import-pdf', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
};

// Import banyak berkas PDF realisasi sekaligus — backend memproses tiap berkas
// independen (satu gagal tidak menghentikan yang lain), hasil per-berkas di `results`.
export const importRealisasiPdfBatch = async (files, tahun) => {
  const form = new FormData();
  for (const file of files) form.append('files', file);
  form.append('tahun', tahun);
  const res = await api.post('/penatausahaan/import-pdf-batch', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
};

// Edit/hapus satu baris transaksi hasil import — dipakai tombol Aksi di Buku
// Kas Umum untuk memperbaiki nilai yang keliru (mis. salah baca OCR) tanpa
// harus impor ulang seluruh berkas.
export const updatePenatausahaan = async (id, data) => {
  const res = await api.put(`/penatausahaan/${id}`, data);
  return res.data;
};

export const deletePenatausahaan = async (id) => {
  const res = await api.delete(`/penatausahaan/${id}`);
  return res.data;
};

// Tambah satu item belanja secara manual pada sub kegiatan tertentu — dipakai
// saat OCR import PDF SIPD melewatkan satu baris rincian sama sekali (bukan
// salah baca, tapi baris itu tidak terdeteksi sebagai anchor sehingga tidak
// pernah masuk ke Penatausahaan).
export const createPenatausahaan = async (data) => {
  const res = await api.post('/penatausahaan', data);
  return res.data;
};
