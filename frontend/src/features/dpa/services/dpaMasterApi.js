/**
 * Master data untuk form DPA (Program → Kegiatan → Sub Kegiatan → Indikator)
 * Mengambil dari tabel perencanaan yang sudah ada, tanpa menunggu alur RKPD/Renja/RKA lengkap.
 */
import api from "../../../services/api";
import { extractListData } from "../../../utils/apiResponse";

export async function fetchProgramsForDpa(tahun) {
  if (!tahun) return [];
  const res = await api.get("/programs/all", {
    params: { tahun: String(tahun).trim() },
  });
  return extractListData(res.data);
}

export async function fetchKegiatanByProgram(programId) {
  if (!programId) return [];
  const res = await api.get(`/kegiatan/by-program/${programId}`);
  return extractListData(res.data);
}

export async function fetchSubKegiatanByKegiatan(kegiatanId, tahun) {
  if (!kegiatanId || !tahun) return [];
  const res = await api.get(`/sub-kegiatan/by-kegiatan/${kegiatanId}`, {
    params: { tahun: String(tahun).trim() },
  });
  return extractListData(res.data);
}

/** Coba beberapa jenis_dokumen karena data master bisa berasal dari tahap berbeda. */
export async function fetchIndikatorByKegiatan(kegiatanId, tahun) {
  if (!kegiatanId || !tahun) return [];
  const th = String(tahun).trim();
  const jenisList = ["rka", "renja", "rkpd", "rpjmd"];
  for (const jenis_dokumen of jenisList) {
    try {
      const res = await api.get("/indikator-kegiatan", {
        params: {
          jenis_dokumen,
          tahun: th,
          kegiatan_id: kegiatanId,
          limit: 200,
        },
      });
      const rows = extractListData(res.data);
      if (rows.length > 0) return rows;
    } catch {
      /* coba jenis berikutnya */
    }
  }
  return [];
}

export function formatProgramLabel(p) {
  if (!p) return "";
  const k = p.kode_program || "";
  const n = p.nama_program || "";
  return `${k} ${n}`.replace(/\s+/g, " ").trim();
}

export function formatKegiatanLabel(k) {
  if (!k) return "";
  const c = k.kode_kegiatan || "";
  const n = k.nama_kegiatan || "";
  return `${c} ${n}`.replace(/\s+/g, " ").trim();
}

export function formatSubKegiatanLabel(s) {
  if (!s) return "";
  const c = s.kode_sub_kegiatan || "";
  const n = s.nama_sub_kegiatan || "";
  return `${c} ${n}`.replace(/\s+/g, " ").trim();
}
