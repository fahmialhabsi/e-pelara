"use strict";

/**
 * Import otomatis "Matriks Pemantauan TLHP BPK" (PDF resmi Inspektorat) ke
 * modul TLHP (LHP -> Temuan -> Rekomendasi -> Tindak Lanjut), tanpa input
 * manual. Dipakai lewat tombol "Import PDF" di daftar LHP.
 *
 * Guard idempotensi (WAJIB — PDF yang sama bisa diunggah berkali-kali oleh
 * pengguna tanpa sengaja):
 * - LHP: dedup by (opd_id, entitas_pemeriksa_ref_id='BPK', jenis_pemeriksaan, tahun)
 *   — kalau sudah ada LHP aktif yg cocok, entri baru ditambahkan ke LHP itu,
 *   TIDAK membuat LHP duplikat.
 * - Temuan: dedup by (mr_planning_lhp_id, uraian_temuan dinormalisasi persis
 *   sama) — kalau sudah ada, SELURUH Temuan itu (+ rekomendasi & tindak
 *   lanjutnya) DILEWATI, tidak disentuh sama sekali.
 * - Rekomendasi: dedup by (mr_planning_temuan_id, uraian_rekomendasi
 *   dinormalisasi persis sama) — per rekomendasi individual (Temuan yg sudah
 *   ada tapi dapat rekomendasi baru dari PDF akan menambahkan rekomendasi
 *   yg belum ada saja).
 *
 * Data mendarat berstatus DRAFT (default siklus modul ini) — pengguna tetap
 * bisa mengoreksi lewat form yang sudah ada sebelum LHP/Temuan disetujui.
 */

const { RenstraOPD, MrPlanningLhp, MrPlanningTemuan, MrReferenceItem, MrReferenceGroup } = require("../../models");

const { parseTlhpMatriksPdf } = require("./mrPlanningTlhpMatriksPdfParser");
const mrPlanningLhpService = require("./mrPlanningLhpService");
const mrPlanningTemuanService = require("./mrPlanningTemuanService");
const mrPlanningTindakLanjutService = require("./mrPlanningTindakLanjutService");

class MrPlanningTlhpImportError extends Error {
  constructor(message, options = {}) {
    super(message);
    this.name = "MrPlanningTlhpImportError";
    this.status = options.status || 400;
    this.statusCode = options.status || 400;
    this.code = options.code || "MR_TLHP_IMPORT_ERROR";
    this.details = options.details || {};
  }
}

const throwImportError = (message, details = {}, code = "MR_TLHP_IMPORT_ERROR") => {
  throw new MrPlanningTlhpImportError(message, { status: 422, code, details });
};

const normalizeForCompare = (text) =>
  String(text || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

const extractYearFromGroupLabel = (groupLabel) => {
  if (!groupLabel) return null;
  const matches = [...String(groupLabel).matchAll(/\b(20\d{2})\b/g)].map((m) => Number(m[1]));
  return matches.length ? matches[matches.length - 1] : null;
};

const resolveOpdIdFromSkpd = async (skpd) => {
  if (!skpd) return null;
  const normalized = normalizeForCompare(skpd);

  const candidates = await RenstraOPD.findAll();
  const match = candidates.find((o) => normalizeForCompare(o.nama_opd) === normalized);
  return match?.id || null;
};

const resolveBpkEntitasRefId = async () => {
  const item = await MrReferenceItem.findOne({
    include: [
      {
        model: MrReferenceGroup,
        as: "group",
        required: true,
        where: { kode_group: "MR_TLHP_ENTITAS_PEMERIKSA" },
      },
    ],
    where: { kode_item: "BPK", is_active: true },
  });
  return item?.id || null;
};

const resolveJenisPemeriksaanRefId = async (jenisPemeriksaanLabel) => {
  if (!jenisPemeriksaanLabel) return null;
  const items = await MrReferenceItem.findAll({
    include: [
      {
        model: MrReferenceGroup,
        as: "group",
        required: true,
        where: { kode_group: "MR_TLHP_JENIS_PEMERIKSAAN" },
      },
    ],
    where: { is_active: true },
  });
  const normalized = normalizeForCompare(jenisPemeriksaanLabel);
  const match = items.find((i) => normalizeForCompare(i.nama_item).includes(normalized) || normalized.includes(normalizeForCompare(i.nama_item)));
  return match?.id || null;
};

const resolveStatusTindakLanjutRefId = async (kodeItem) => {
  const item = await MrReferenceItem.findOne({
    include: [
      {
        model: MrReferenceGroup,
        as: "group",
        required: true,
        where: { kode_group: "MR_TLHP_STATUS_TINDAK_LANJUT" },
      },
    ],
    where: { kode_item: kodeItem, is_active: true },
  });
  return item?.id || null;
};

/**
 * Temukan LHP AKTIF yg cocok (opd+entitas+jenis+tahun), atau buat baru
 * (draft -> langsung diaktifkan, karena Temuan cuma bisa dibuat di bawah LHP
 * aktif — lihat mrPlanningTemuanService.createTemuanFromLhp).
 */
const findOrCreateLhp = async ({ opdId, entitasPemeriksaRefId, jenisPemeriksaanRefId, jenisPemeriksaanLabel, tahun, skpd, user, warnings }) => {
  const existing = await MrPlanningLhp.findOne({
    where: {
      opd_id: opdId,
      entitas_pemeriksa_ref_id: entitasPemeriksaRefId,
      jenis_pemeriksaan: jenisPemeriksaanLabel,
      tahun,
      is_active: true,
    },
    order: [["id", "DESC"]],
  });

  if (existing) {
    if (existing.status_dokumen === "draft") {
      const activated = await mrPlanningLhpService.activateLhp({ lhpId: existing.id, user });
      return { lhp: activated, wasCreated: false };
    }
    if (existing.status_dokumen === "aktif") return { lhp: existing, wasCreated: false };
    warnings.push(
      `LHP "${existing.nomor_lhp}" (${jenisPemeriksaanLabel}, ${tahun}) berstatus "${existing.status_dokumen}" — dibuatkan LHP baru dari import ini.`,
    );
  }

  const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const created = await mrPlanningLhpService.createLhp({
    body: {
      entitas_pemeriksa_ref_id: entitasPemeriksaRefId,
      jenis_pemeriksaan_ref_id: jenisPemeriksaanRefId || undefined,
      nomor_lhp: `IMPORT-BPK-${tahun}-${stamp}`,
      judul_lhp: `Matriks Pemantauan TLHP BPK — ${skpd} (${jenisPemeriksaanLabel || "Pemeriksaan"} ${tahun})`,
      tahun_lhp: tahun,
      tahun,
      opd_id: opdId,
      ringkasan_lhp:
        "Dokumen ini dibuat otomatis dari import PDF Matriks Pemantauan TLHP BPK. Mohon lengkapi Nomor LHP, Surat Tugas, dan Surat Pengantar yang sebenarnya (lihat surat pengantar terpisah dari Inspektorat jika ada).",
    },
    user,
  });

  const activated = await mrPlanningLhpService.activateLhp({ lhpId: created.id, user });
  return { lhp: activated, wasCreated: true };
};

const buildRencanaAksiKeterangan = (rekomendasi) =>
  [
    "Diimpor otomatis dari Matriks Pemantauan TLHP BPK.",
    rekomendasi.sisa ? `Sisa tercatat pada matriks: Rp ${Number(rekomendasi.sisa).toLocaleString("id-ID")}.` : null,
  ]
    .filter(Boolean)
    .join(" ");

/**
 * @param {Buffer} buffer
 * @param {{tahun?: number}} options - tahun override manual (dipakai kalau deteksi otomatis dari label grup meleset/tidak ada)
 */
const importFromMatriksPdf = async ({ buffer, tahun: tahunOverride, user } = {}) => {
  const parsed = await parseTlhpMatriksPdf(buffer);

  const opdId = await resolveOpdIdFromSkpd(parsed.skpd);
  if (!opdId) {
    throwImportError(
      `SKPD "${parsed.skpd}" pada PDF tidak ditemukan di data OPD (RenstraOPD). Pastikan nama OPD sudah terdaftar, atau lengkapi manual.`,
      { skpd: parsed.skpd },
      "MR_TLHP_IMPORT_OPD_NOT_FOUND",
    );
  }
  const entitasPemeriksaRefId = await resolveBpkEntitasRefId();
  if (!entitasPemeriksaRefId) {
    throwImportError(
      'Reference item entitas pemeriksa "BPK" tidak ditemukan (group MR_TLHP_ENTITAS_PEMERIKSA). Periksa data referensi TLHP.',
      {},
      "MR_TLHP_IMPORT_REFERENCE_MISSING",
    );
  }

  const warnings = [];
  const summary = {
    skpd: parsed.skpd,
    lhp_created: [],
    lhp_reused: [],
    temuan_added: 0,
    temuan_skipped_duplicate: 0,
    rekomendasi_added: 0,
    rekomendasi_skipped_duplicate: 0,
    tindak_lanjut_added: 0,
    warnings,
  };

  // Kelompokkan entri per (jenis_pemeriksaan, tahun) — 1 LHP per kombinasi ini.
  const groups = new Map();
  parsed.entries.forEach((entry) => {
    const jenis = entry.jenis_pemeriksaan || "Pemeriksaan Kinerja";
    const tahun = tahunOverride || extractYearFromGroupLabel(entry.group_label) || new Date().getFullYear();
    const key = `${jenis}::${tahun}`;
    if (!groups.has(key)) groups.set(key, { jenis, tahun, entries: [] });
    groups.get(key).entries.push(entry);
  });

  for (const { jenis, tahun, entries } of groups.values()) {
    const jenisPemeriksaanRefId = await resolveJenisPemeriksaanRefId(jenis);

    const { lhp, wasCreated } = await findOrCreateLhp({
      opdId,
      entitasPemeriksaRefId,
      jenisPemeriksaanRefId,
      jenisPemeriksaanLabel: jenis,
      tahun,
      skpd: parsed.skpd,
      user,
      warnings,
    });

    if (wasCreated) {
      summary.lhp_created.push({ id: lhp.id, nomor_lhp: lhp.nomor_lhp, jenis_pemeriksaan: jenis, tahun });
    } else {
      summary.lhp_reused.push({ id: lhp.id, nomor_lhp: lhp.nomor_lhp, jenis_pemeriksaan: jenis, tahun });
    }

    const existingTemuan = await MrPlanningTemuan.findAll({
      where: { mr_planning_lhp_id: lhp.id },
    });
    const existingTemuanNormalized = new Set(existingTemuan.map((t) => normalizeForCompare(t.uraian_temuan)));

    for (const entry of entries) {
      const normalizedUraian = normalizeForCompare(entry.uraian_temuan);

      if (!normalizedUraian) {
        warnings.push(`Temuan No. ${entry.no} dilewati: uraian temuan tidak berhasil terbaca dari PDF.`);
        continue;
      }

      if (existingTemuanNormalized.has(normalizedUraian)) {
        summary.temuan_skipped_duplicate += 1;
        continue;
      }

      const temuanCountForNomor = await MrPlanningTemuan.count({ where: { mr_planning_lhp_id: lhp.id } });

      const temuan = await mrPlanningTemuanService.createTemuanFromLhp({
        lhpId: lhp.id,
        body: {
          nomor_temuan: `${entry.no}-${temuanCountForNomor + 1}`,
          judul_temuan: entry.uraian_temuan.slice(0, 250),
          uraian_temuan: entry.uraian_temuan,
          nilai_temuan_rupiah: entry.nilai_temuan || undefined,
        },
        user,
      });

      existingTemuanNormalized.add(normalizedUraian);
      summary.temuan_added += 1;

      let urutan = 0;
      for (const rekomendasi of entry.rekomendasi) {
        urutan += 1;

        if (!normalizeForCompare(rekomendasi.uraian_rekomendasi)) {
          warnings.push(
            `Temuan "${entry.uraian_temuan.slice(0, 60)}..." rekomendasi [${rekomendasi.huruf}] dilewati: uraian rekomendasi tidak terbaca.`,
          );
          continue;
        }

        const createdRekomendasi = await mrPlanningTemuanService.createRekomendasi({
          temuanId: temuan.id,
          body: {
            nomor_rekomendasi: `${entry.no}${rekomendasi.huruf}`,
            uraian_rekomendasi: rekomendasi.uraian_rekomendasi,
            nilai_rekomendasi_rupiah: rekomendasi.nilai_rekomendasi || undefined,
            urutan,
          },
          user,
        });
        summary.rekomendasi_added += 1;

        // Tindak Lanjut HANYA dibuat kalau matriks memang menunjukkan sudah ada
        // progres nyata (status_matriks="ada", ada setoran, atau ada dokumen
        // pendukung) — kalau matriks kosong semua (rekomendasi baru, belum
        // ada tindak lanjut), TIDAK dipaksa buat record kosong; dibiarkan utk
        // diisi user via form Pemantauan Tindak Lanjut yang sudah ada.
        const hasProgress =
          rekomendasi.status_matriks === "ada" ||
          Boolean(rekomendasi.setor) ||
          Boolean(rekomendasi.sisa) ||
          Boolean(rekomendasi.uraian_tindak_lanjut) ||
          Boolean(rekomendasi.rencana_aksi);

        if (!hasProgress) continue;

        const statusKode = rekomendasi.sesuai
          ? "SESUAI_SELESAI"
          : rekomendasi.status_matriks === "ada"
            ? "DALAM_PROSES"
            : "BELUM_DITINDAKLANJUTI";
        const statusRefId = await resolveStatusTindakLanjutRefId(statusKode);

        if (!statusRefId) {
          warnings.push(`Status tindak lanjut "${statusKode}" tidak ditemukan di referensi — Tindak Lanjut untuk rekomendasi [${rekomendasi.huruf}] dilewati, lengkapi manual.`);
          continue;
        }

        await mrPlanningTindakLanjutService.createTindakLanjutFromRekomendasi({
          rekomendasiId: createdRekomendasi.id,
          body: {
            periode_pemantauan_type: "adhoc",
            periode_pemantauan_label: `Import Matriks TLHP ${tahun}`,
            tanggal_pemantauan: new Date().toISOString().slice(0, 10),
            status_tindak_lanjut_ref_id: statusRefId,
            uraian_tindak_lanjut:
              rekomendasi.uraian_tindak_lanjut ||
              "Tercatat sudah ada tindak lanjut pada Matriks Pemantauan TLHP BPK (uraian rinci belum tersedia dari dokumen — mohon lengkapi).",
            nilai_setoran_rupiah: rekomendasi.setor || undefined,
            status_matriks: rekomendasi.status_matriks || undefined,
            status_spj: rekomendasi.spj_ad ? "ada" : rekomendasi.spj_n ? "belum" : undefined,
            daftar_dokumen_pendukung: rekomendasi.rencana_aksi || undefined,
            keterangan: buildRencanaAksiKeterangan(rekomendasi),
          },
          user,
        });
        summary.tindak_lanjut_added += 1;
      }
    }
  }

  if (parsed._meta) summary.parser_meta = parsed._meta;

  return summary;
};

module.exports = {
  MrPlanningTlhpImportError,
  importFromMatriksPdf,
};
