'use strict';

const axios = require('axios');

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_MODEL = process.env.GROQ_MODEL || 'llama-3.1-8b-instant';
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const OLLAMA_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3.1:8b';

async function callGroq(systemPrompt, userPrompt) {
  const res = await axios.post(
    GROQ_URL,
    {
      model: GROQ_MODEL,
      max_tokens: 1200,
      temperature: 0.2,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    },
    {
      headers: { Authorization: `Bearer ${GROQ_API_KEY}`, 'Content-Type': 'application/json' },
      timeout: 15000,
    },
  );
  return res.data?.choices?.[0]?.message?.content?.trim() ?? '';
}

async function callOllama(systemPrompt, userPrompt) {
  const res = await axios.post(
    `${OLLAMA_URL}/api/chat`,
    {
      model: OLLAMA_MODEL,
      stream: false,
      options: { temperature: 0.1, num_predict: 200 },
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    },
    { timeout: 120000 },
  );
  return res.data?.message?.content?.trim() ?? '';
}

async function callLLM(systemPrompt, userPrompt) {
  console.log('[callLLM] provider:', GROQ_API_KEY ? 'GROQ' : 'OLLAMA');
  if (GROQ_API_KEY) {
    try {
      return await callGroq(systemPrompt, userPrompt);
    } catch (e) {
      console.warn('[renstraAI] Groq gagal, fallback Ollama:', e.message);
    }
  }
  return callOllama(systemPrompt, userPrompt);
}

// Generate tujuan Renstra OPD berdasarkan tujuan RPJMD
async function generateTujuanRenstra({ namaOpd, tujuanRpjmd, noTujuanRpjmd, tupoksi }) {
  const system = `Kamu adalah ahli perencanaan pemerintah daerah Indonesia.
Tugasmu: pilih SATU template tujuan Renstra yang paling sesuai dengan OPD dan tujuan RPJMD.
WAJIB pilih salah satu dari template berikut, ganti [X] dengan 1-2 kata substansi inti OPD:
1. Meningkatnya [X] Masyarakat Maluku Utara
2. Terwujudnya [X] Provinsi Maluku Utara
3. Tercapainya [X] di Maluku Utara
Aturan:
- [X] maksimal 2 kata, contoh: "Ketahanan Pangan", "Kualitas SDM", "Infrastruktur Wilayah"
- DILARANG menambah kata apapun di luar template
- Kembalikan HANYA hasil template yang sudah diisi, tanpa penjelasan`;

  const user = `OPD: ${namaOpd}
Tujuan RPJMD (${noTujuanRpjmd}): ${tujuanRpjmd}
Tupoksi OPD: ${tupoksi || 'sesuai nomenklatur OPD'}
Wilayah: Provinsi Maluku Utara

Tulis 1 kalimat tujuan Renstra ${namaOpd} yang merupakan kontribusi spesifik OPD terhadap tujuan RPJMD tersebut.`;
  const raw = await callLLM(system, user);
  // Ambil kalimat pertama saja, bersihkan
  return raw
    .split(/[.\n]/)[0]
    .replace(/['"]/g, '')
    .replace(/^\d+\.\s*/, '')
    .replace(/\s+(Berkelanjutan|Berbasis|Berkualitas|yang|dan|untuk|melalui)\b.*/i, '')
    .trim();
}

// Generate sasaran Renstra OPD berdasarkan sasaran RPJMD
async function generateSasaranRenstra({ namaOpd, sasaranRpjmd, tujuanRenstra }) {
  const system = `Kamu adalah ahli perencanaan pemerintah daerah Indonesia.
Tugasmu: pilih SATU template sasaran Renstra yang sesuai tupoksi OPD, bukan tupoksi OPD lain.
WAJIB pilih salah satu template berikut, ganti [X] dengan 2-3 kata substansi inti:
1. Meningkatnya [X] Masyarakat Maluku Utara
2. Terwujudnya [X] di Provinsi Maluku Utara
3. Tercapainya [X] Maluku Utara
Aturan ketat:
- [X] maksimal 3 kata
- DILARANG mencantumkan angka, persentase, atau target kuantitatif
- DILARANG kata "produksi" — itu tupoksi Dinas Pertanian
- Fokus pada: ketersediaan, distribusi, cadangan, konsumsi, keamanan, penganekaragaman pangan
- Kembalikan HANYA hasil template, tanpa penjelasan`;

  const user = `OPD: ${namaOpd}
Tupoksi OPD: ketersediaan pangan, distribusi pangan, cadangan pangan, konsumsi pangan, keamanan pangan, penganekaragaman pangan
Tujuan Renstra: ${tujuanRenstra}
Sasaran RPJMD acuan: ${sasaranRpjmd}
Wilayah: Provinsi Maluku Utara
Tulis 1 sasaran Renstra yang sesuai tupoksi ${namaOpd}.`;

  const raw = await callLLM(system, user);
  const bersih = raw
    .split(/[.\n]/)[0]
    .replace(/['"]/g, '')
    .replace(/^\d+\.\s*/, '')
    .trim();
  // Pastikan ada lokasi di akhir
  if (!bersih.includes('Maluku') && !bersih.includes('Provinsi')) {
    return bersih + ' di Provinsi Maluku Utara';
  }
  return bersih;
}

async function generateIndikatorTujuanRenstra({ namaOpd, tujuanRenstra, tahunMulai }) {
  const tahunAkhir = Number(tahunMulai) + 4;
  const system = `Kamu adalah ahli perencanaan pemerintah daerah Indonesia.
Tugasmu: generate indikator kinerja tujuan Renstra OPD untuk periode 5 tahun.
Kembalikan HANYA JSON valid tanpa penjelasan, tanpa markdown, format:
{
  "nama_indikator": "...",
  "satuan": "...",
  "jenis_indikator": "Kuantitatif",
  "tipe_indikator": "Impact",
  "baseline": 0,
  "target_tahun_1": 0,
  "target_tahun_2": 0,
  "target_tahun_3": 0,
  "target_tahun_4": 0,
  "target_tahun_5": 0,
  "sumber_data": "...",
  "definisi_operasional": "..."
}`;
  const user = `OPD: ${namaOpd}
Tujuan Renstra: ${tujuanRenstra}
Periode: ${tahunMulai}–${tahunAkhir}
Wilayah: Provinsi Maluku Utara
Tupoksi: ketersediaan pangan, distribusi pangan, cadangan pangan, konsumsi pangan, keamanan pangan
Generate 1 indikator Impact yang terukur dan realistis untuk tujuan tersebut.
Target harus progresif naik tiap tahun. Baseline adalah kondisi awal sebelum periode.`;
  const raw = await callLLM(system, user);
  console.log('[generateIndikatorTujuan] raw:', raw?.substring(0, 300));
  const clean = raw.replace(/```json|```/g, '').trim();
  const match = clean.match(/\{[\s\S]*\}/);
  if (!match) {
    // Fallback default jika AI gagal return JSON
    return {
      nama_indikator: 'Persentase Ketahanan Pangan Daerah',
      satuan: '%',
      jenis_indikator: 'Kuantitatif',
      tipe_indikator: 'Impact',
      baseline: 60,
      target_tahun_1: 65,
      target_tahun_2: 70,
      target_tahun_3: 75,
      target_tahun_4: 80,
      target_tahun_5: 85,
      sumber_data: 'BPS Provinsi Maluku Utara',
      definisi_operasional: 'Persentase ketercapaian ketahanan pangan daerah',
    };
  }
  return JSON.parse(match[0]);
}
async function generateIndikatorSasaranRenstra({ namaOpd, sasaranRenstra, tahunMulai }) {
  const tahunAkhir = Number(tahunMulai) + 4;
  const system = `Kamu adalah ahli perencanaan pemerintah daerah Indonesia.
Tugasmu: generate indikator kinerja sasaran Renstra OPD untuk periode 5 tahun.
Kembalikan HANYA JSON valid tanpa penjelasan, tanpa markdown, format:
{"nama_indikator":"...","satuan":"...","jenis_indikator":"Kuantitatif","tipe_indikator":"Impact","baseline":0,"target_tahun_1":0,"target_tahun_2":0,"target_tahun_3":0,"target_tahun_4":0,"target_tahun_5":0,"sumber_data":"...","definisi_operasional":"...","metode_penghitungan":"...","penanggung_jawab":"Kepala Dinas Pangan"}`;
  const user = `OPD: ${namaOpd}
Sasaran Renstra: ${sasaranRenstra}
Periode: ${tahunMulai}–${tahunAkhir}
Wilayah: Provinsi Maluku Utara
Generate 1 indikator Outcome yang terukur dan realistis. Target progresif naik tiap tahun.`;
  const raw = await callLLM(system, user);
  console.log('[generateIndikatorSasaran] raw:', raw?.substring(0, 300));
  const clean = raw.replace(/```json|```/g, '').trim();
  const match = clean.match(/\{[\s\S]*\}/);
  if (!match) {
    return {
      nama_indikator: 'Persentase Ketersediaan Pangan yang Beragam',
      satuan: '%',
      jenis_indikator: 'Kuantitatif',
      tipe_indikator: 'Outcome',
      baseline: 55,
      target_tahun_1: 60,
      target_tahun_2: 65,
      target_tahun_3: 70,
      target_tahun_4: 75,
      target_tahun_5: 80,
      sumber_data: 'BPS Provinsi Maluku Utara',
      definisi_operasional: 'Persentase ketersediaan pangan yang beragam di Provinsi Maluku Utara',
    };
  }
  return JSON.parse(match[0]);
}
async function generateIndikatorProgramRenstra({ namaOpd, programRenstra, tahunMulai }) {
  const tahunAkhir = Number(tahunMulai) + 4;
  const system = `Kamu adalah ahli perencanaan pemerintah daerah Indonesia.
Tugasmu: generate indikator kinerja PROGRAM Renstra OPD untuk periode 5 tahun.
Indikator program harus:
- Spesifik ke nama program (bukan generik seperti tujuan/sasaran)
- Tipe Outcome — mengukur hasil langsung program tersebut
- Berbeda dari indikator tujuan dan sasaran di atasnya
- Menggunakan satuan yang terukur (%, ton, unit, dokumen, dsb)
Kembalikan HANYA JSON valid tanpa penjelasan, tanpa markdown, format:
{"nama_indikator":"...","satuan":"...","jenis_indikator":"Kuantitatif","tipe_indikator":"Outcome","baseline":0,"target_tahun_1":0,"target_tahun_2":0,"target_tahun_3":0,"target_tahun_4":0,"target_tahun_5":0,"sumber_data":"...","definisi_operasional":"..."}`;
  const user = `OPD: ${namaOpd}
TUSI OPD: ketersediaan pangan, kerawanan pangan, distribusi pangan, cadangan pangan, konsumsi pangan, penganekaragaman pangan, keamanan pangan, pengawasan mutu pangan
Program Renstra: ${programRenstra}
Periode: ${tahunMulai}–${tahunAkhir}
Wilayah: Provinsi Maluku Utara

Contoh indikator program yang BAIK dan SPESIFIK:
- Program Cadangan Pangan → "Persentase Terpenuhinya Cadangan Pangan Pemerintah Daerah" (%)
- Program Distribusi Pangan → "Persentase Stabilitas Harga Pangan Pokok di Pasar" (%)
- Program Keamanan Pangan → "Persentase Sampel Pangan yang Memenuhi Standar Keamanan" (%)
- Program Pengelolaan Sumber Daya Ekonomi Pangan → "Persentase Ketersediaan Infrastruktur Logistik dan Cadangan Pangan Daerah" (%)
- Program Peningkatan Diversifikasi Pangan → "Skor Pola Pangan Harapan (PPH)" (skor)
- Program Kerawanan Pangan → "Persentase Desa Rawan Pangan yang Tertangani" (%)

DILARANG KERAS: kata "petani", "pertanian", "produksi pertanian", "penyuluhan" — itu TUSI Dinas Pertanian bukan Dinas Pangan.
WAJIB: indikator harus mengukur hasil LANGSUNG program, bukan output pertanian.
Generate 1 indikator Outcome SPESIFIK sesuai nama program "${programRenstra}". Target progresif naik tiap tahun.`;
  const raw = await callLLM(system, user);
  console.log(
    '[generateIndikatorProgram] raw length:',
    raw?.length,
    '| preview:',
    raw?.substring(0, 100),
  );
  const clean = raw.replace(/```json|```/g, '').trim();
  const match = clean.match(/\{[\s\S]*\}/);
  if (!match) {
    console.log('[generateIndikatorProgram] JSON tidak ditemukan, pakai fallback');
    return {
      nama_indikator: 'Persentase Program Ketahanan Pangan Terlaksana',
      satuan: '%',
      jenis_indikator: 'Kuantitatif',
      tipe_indikator: 'Outcome',
      baseline: 60,
      target_tahun_1: 65,
      target_tahun_2: 70,
      target_tahun_3: 75,
      target_tahun_4: 80,
      target_tahun_5: 85,
      sumber_data: 'Laporan Kinerja Dinas Pangan',
      definisi_operasional: 'Persentase program ketahanan pangan yang terlaksana sesuai target',
    };
  }
  return JSON.parse(match[0]);
}
async function generateIndikatorKegiatanRenstra({ namaOpd, kegiatanRenstra, tahunMulai }) {
  const tahunAkhir = Number(tahunMulai) + 4;
  const system = `Kamu adalah ahli perencanaan pemerintah daerah Indonesia.
Tugasmu: generate indikator kinerja KEGIATAN Renstra OPD untuk periode 5 tahun.
Indikator kegiatan harus bertipe Output — mengukur hasil langsung kegiatan tersebut.
DILARANG KERAS: kata petani, pertanian, produksi pertanian — itu TUSI Dinas Pertanian.
FOKUS: ketersediaan, distribusi, cadangan, konsumsi, keamanan, penganekaragaman pangan.
Kembalikan HANYA JSON valid tanpa penjelasan, tanpa markdown, format:
{"nama_indikator":"...","satuan":"...","jenis_indikator":"Kuantitatif","tipe_indikator":"Output","baseline":0,"target_tahun_1":0,"target_tahun_2":0,"target_tahun_3":0,"target_tahun_4":0,"target_tahun_5":0,"sumber_data":"...","definisi_operasional":"..."}`;
  const user = `OPD: ${namaOpd}
TUSI OPD: ketersediaan pangan, distribusi pangan, cadangan pangan, konsumsi pangan, keamanan pangan
Kegiatan Renstra: ${kegiatanRenstra}
Periode: ${tahunMulai}–${tahunAkhir}
Wilayah: Provinsi Maluku Utara
Generate 1 indikator Output SPESIFIK sesuai nama kegiatan. Target progresif naik tiap tahun.`;
  const raw = await callLLM(system, user);
  const clean = raw.replace(/```json|```/g, '').trim();
  const match = clean.match(/\{[\s\S]*\}/);
  if (!match) {
    return {
      nama_indikator: 'Jumlah Infrastruktur Pangan yang Terbangun',
      satuan: 'unit',
      jenis_indikator: 'Kuantitatif',
      tipe_indikator: 'Output',
      baseline: 0,
      target_tahun_1: 2,
      target_tahun_2: 3,
      target_tahun_3: 4,
      target_tahun_4: 5,
      target_tahun_5: 6,
      sumber_data: 'Laporan Kinerja Dinas Pangan',
      definisi_operasional: 'Jumlah infrastruktur pangan yang terbangun dan berfungsi',
    };
  }
  return JSON.parse(match[0]);
}
async function generateIndikatorSubKegiatanRenstra({ namaOpd, subKegiatanRenstra, tahunMulai }) {
  const tahunAkhir = Number(tahunMulai) + 4;
  const system = `Kamu adalah ahli perencanaan pemerintah daerah Indonesia.
Tugasmu: generate indikator kinerja SUB KEGIATAN Renstra OPD untuk periode 5 tahun.
Indikator sub kegiatan harus bertipe Output — mengukur hasil langsung dan spesifik dari sub kegiatan.
DILARANG KERAS: kata petani, pertanian, produksi pertanian — itu TUSI Dinas Pertanian.
FOKUS: ketersediaan, distribusi, cadangan, konsumsi, keamanan, penganekaragaman pangan.
Kembalikan HANYA JSON valid tanpa penjelasan, tanpa markdown, format:
{"nama_indikator":"...","satuan":"...","jenis_indikator":"Kuantitatif","tipe_indikator":"Output","baseline":0,"target_tahun_1":0,"target_tahun_2":0,"target_tahun_3":0,"target_tahun_4":0,"target_tahun_5":0,"sumber_data":"...","definisi_operasional":"..."}`;
  const user = `OPD: ${namaOpd}
TUSI OPD: ketersediaan pangan, distribusi pangan, cadangan pangan, konsumsi pangan, keamanan pangan
Sub Kegiatan Renstra: ${subKegiatanRenstra}
Periode: ${tahunMulai}–${tahunAkhir}
Wilayah: Provinsi Maluku Utara
Generate 1 indikator Output SPESIFIK sesuai nama sub kegiatan. Target progresif naik tiap tahun.`;
  const raw = await callLLM(system, user);
  const clean = raw.replace(/```json|```/g, '').trim();
  const match = clean.match(/\{[\s\S]*\}/);
  if (!match) {
    return {
      nama_indikator: 'Jumlah Dokumen Laporan Sub Kegiatan Pangan',
      satuan: 'dokumen',
      jenis_indikator: 'Kuantitatif',
      tipe_indikator: 'Output',
      baseline: 0,
      target_tahun_1: 1,
      target_tahun_2: 1,
      target_tahun_3: 2,
      target_tahun_4: 2,
      target_tahun_5: 3,
      sumber_data: 'Laporan Kinerja Dinas Pangan',
      definisi_operasional: 'Jumlah dokumen laporan sub kegiatan pangan yang tersusun',
    };
  }
  return JSON.parse(match[0]);
}

async function generateDefinisiMetodeSubKegiatan({
  namaOpd,
  subKegiatanRenstra,
  namaIndikator,
  satuan,
  baseline,
  targetTahun1,
  targetTahun2,
  targetTahun3,
  targetTahun4,
  targetTahun5,
}) {
  const system = `Kamu adalah ahli perencanaan pemerintah daerah Indonesia.
Tugasmu: buat Definisi Operasional dan Metode Penghitungan untuk sebuah indikator kinerja SUB KEGIATAN Renstra OPD, berdasarkan indikator yang SUDAH DITENTUKAN (jangan mengubah nama indikator/satuan/target).
Kembalikan HANYA JSON valid tanpa penjelasan, tanpa markdown, format:
{"definisi_operasional":"...","metode_penghitungan":"..."}`;
  const user = `OPD: ${namaOpd}
Sub Kegiatan Renstra: ${subKegiatanRenstra}
Nama Indikator: ${namaIndikator}
Satuan: ${satuan}
Baseline: ${baseline}
Target Th.1-5: ${targetTahun1}, ${targetTahun2}, ${targetTahun3}, ${targetTahun4}, ${targetTahun5}
Buat definisi operasional (penjelasan makna indikator ini) dan metode penghitungan (cara indikator ini dihitung/diukur) yang konsisten dengan data di atas.`;
  const raw = await callLLM(system, user);
  const clean = raw.replace(/```json|```/g, '').trim();
  const match = clean.match(/\{[\s\S]*\}/);
  if (!match) {
    return {
      definisi_operasional: `Definisi operasional untuk indikator ${namaIndikator}`,
      metode_penghitungan: `Dihitung berdasarkan: ${namaIndikator}`,
    };
  }
  return JSON.parse(match[0]);
}

async function generateStrategiRenstra({ namaOpd, strategiRpjmd, sasaranRenstra }) {
  const system = `Kamu adalah ahli perencanaan pemerintah daerah Indonesia.
Tugasmu: pilih SATU template strategi Renstra yang sesuai tupoksi OPD.
WAJIB pilih salah satu template berikut, ganti [X] dengan 2-3 kata substansi inti:
1. Penguatan [X] Daerah
2. Peningkatan [X] Masyarakat Maluku Utara
3. Pengembangan [X] Provinsi Maluku Utara
Aturan ketat:
- [X] maksimal 3 kata
- DILARANG mencantumkan angka atau persentase
- Fokus pada: ketersediaan, distribusi, cadangan, konsumsi, keamanan, penganekaragaman pangan
- Kembalikan HANYA hasil template, tanpa penjelasan`;

  const user = `OPD: ${namaOpd}
Sasaran Renstra: ${sasaranRenstra}
Strategi RPJMD acuan: ${strategiRpjmd}
Tulis 1 strategi Renstra yang singkat dan padat.`;

  const raw = await callLLM(system, user);
  const bersih = raw
    .split(/[.\n]/)[0]
    .replace(/['"]/g, '')
    .replace(/^\d+\.\s*/, '')
    .trim();
  return bersih.replace(/\b\w/g, (c) => c.toUpperCase());
}

async function generateArahKebijakanRenstra({ namaOpd, sasaranRenstra, strategi }) {
  const system = `Kamu adalah ahli perencanaan pemerintah daerah Indonesia.
Tugasmu: pilih SATU template arah kebijakan Renstra yang sesuai tupoksi OPD.
WAJIB pilih salah satu template berikut, ganti [X] dengan 2-3 kata substansi inti:
1. Peningkatan [X] Daerah
2. Percepatan [X] Masyarakat Maluku Utara
3. Penguatan [X] Provinsi Maluku Utara
Aturan ketat:
- [X] maksimal 3 kata
- DILARANG mencantumkan angka atau persentase
- Fokus pada: ketersediaan, distribusi, cadangan, konsumsi, keamanan, penganekaragaman pangan
- Kembalikan HANYA hasil template, tanpa penjelasan`;

  const user = `OPD: ${namaOpd}
Sasaran Renstra: ${sasaranRenstra}
Strategi: ${strategi}
Tulis 1 arah kebijakan yang singkat dan padat.`;

  const raw = await callLLM(system, user);
  const bersih = raw
    .split(/[.\n]/)[0]
    .replace(/['"]/g, '')
    .replace(/^\d+\.\s*/, '')
    .trim();
  return bersih.replace(/\b\w/g, (c) => c.toUpperCase());
}

module.exports = {
  generateTujuanRenstra,
  generateSasaranRenstra,
  generateStrategiRenstra,
  generateArahKebijakanRenstra,
  generateIndikatorTujuanRenstra,
  generateIndikatorSasaranRenstra,
  generateIndikatorProgramRenstra,
  generateIndikatorKegiatanRenstra,
  generateIndikatorSubKegiatanRenstra,
  generateDefinisiMetodeSubKegiatan,
};
