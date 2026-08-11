'use strict';

/**
 * Evidence & Operasi Pangan — Phase 1 (mandat §25/§26 — "Evidence Candidate
 * Service"). Pencocokan deterministik MURNI — tidak ada AI, tidak ada fuzzy
 * filename matching (mandat §24/§65). Sistem hanya MENGUSULKAN kandidat;
 * tidak pernah auto-link (mandat §64) dan tidak pernah auto-verify (mandat
 * §63) — `status_verifikasi`/`requires_review` dari dokumen asli selalu
 * dipertahankan apa adanya di setiap kandidat yang dikembalikan.
 */
const db = require('../../models');
const { FoodOpsError } = require('./foodOpsError');

const RELEVANCE = { EXACT: 'EXACT', STRONG: 'STRONG', POSSIBLE: 'POSSIBLE' };

/**
 * Corrective "B.1.3 Registry-First Evidence Discovery" — kamus PADANAN ISTILAH
 * kategori evidence ProSN B.1.3 (Cadangan Pangan Beras) -> document_type
 * FoodOps yang SUDAH ADA di kosakata (`foodOpsConstants.DOCUMENT_TYPE_LABEL`).
 * SENGAJA sempit/jujur (mandat §6 "not permission to bind unrelated
 * documents") — kategori tanpa padanan jelas (mis. dokumen_koreksi) SENGAJA
 * dibiarkan kosong, bukan dipaksakan ke 'other' (yg akan membuat sinyal jenis
 * dokumen jadi tidak berarti krn hampir semua dokumen ber-type 'other').
 */
const KATEGORI_PROSN_TO_FOOD_OPS_TYPES = {
  dokumen_penetapan: ['surat_keputusan', 'keputusan_gubernur', 'peraturan_gubernur'],
  dokumen_penyaluran: ['surat_jalan', 'bukti_serah_terima'],
  dokumen_pengadaan: ['bukti_serah_terima'],
  bukti_penerimaan: ['bukti_serah_terima'],
  berita_acara: ['berita_acara'],
  dokumen_koreksi: [],
};

/**
 * Padanan jenis_transaksi ProSN B.1.3 -> event_type FoodOps (kosakata modul,
 * lihat `foodOpsConstants.EVENT_TYPE_LABEL`) — HANYA dipetakan bila memang ada
 * korespondensi bisnis nyata (mandat §8 "legitimate signals", bukan dikarang).
 * jenis_transaksi lain SENGAJA tidak dipetakan — resolusi konteks bisnis
 * berbasis Event tidak berlaku utknya, jatuh kembali ke sinyal type/tahun.
 */
const JENIS_TRANSAKSI_TO_EVENT_TYPE = {
  penyaluran: 'PENYALURAN',
};

/**
 * Kategori evidence yang SUBSTANTIF berlaku sebelum/pada tanggal transaksi yg
 * dijustifikasinya (mis. PKS/dasar ketersediaan berlaku SEBELUM saldo_awal
 * dicatat) — sinyal POSSOBLE tambahan, TERPISAH dari kecocokan document_type
 * (mandat §6.A "saldo_awal -> Dokumen Penetapan... even without Event link").
 */
const KATEGORI_BERLAKU_SEBELUM_TANGGAL = new Set(['dokumen_penetapan']);
const KELAS_DOKUMEN_PENETAPAN = new Set(['ACTIVITY_DOCUMENT', 'REGULATION']);

function yearOf(dateValue) {
  if (!dateValue) return null;
  const parsed = new Date(dateValue);
  return Number.isNaN(parsed.getTime()) ? null : String(parsed.getFullYear());
}

/**
 * Corrective "B.1.3 Semantic-Safe Candidate Ranking" — model relevansi MURNI
 * (tanpa akses DB, testable langsung), memisahkan TIGA dimensi independen
 * (mandat §1/§2):
 *  - identityMatch: checksum ATAU sudah tertaut eksplisit ke entity/record ini
 *    — status IDENTITAS, bukan rekomendasi, SELALU EXACT (tidak berubah).
 *  - semanticMatch: document_type tersimpan cocok dgn kategori/type yang
 *    diminta. document_type='other' (data legacy) TIDAK PERNAH dihitung
 *    sbg cocok — genuinely unknown, bukan dianggap salah ATAU benar diam-diam.
 *  - businessContextMatch: dokumen tertaut ke FoodOps Event yang tanggalnya
 *    persis sama dgn transaksi (konteks bisnis sama).
 * Invarian wajib (mandat §4): businessContextMatch=true DENGAN
 * semanticMatch=false/unknown TIDAK PERNAH menghasilkan EXACT — hanya STRONG.
 * Konteks bisnis semata (termasuk kategori dgn mapping kosong spt
 * dokumen_koreksi, dimana semanticMatch SELALU false) tidak pernah cukup utk
 * EXACT sendirian (mandat §3).
 */
function deriveRelevance({ identityMatch, semanticMatch, businessContextMatch, yearMatches, predatesMatch }) {
  if (identityMatch) return RELEVANCE.EXACT;
  if (businessContextMatch && semanticMatch) return RELEVANCE.EXACT;
  if (businessContextMatch) return RELEVANCE.STRONG;
  if (semanticMatch && yearMatches) return RELEVANCE.STRONG;
  if (semanticMatch || yearMatches || predatesMatch) return RELEVANCE.POSSIBLE;
  return null;
}

/**
 * Resolusi konteks bisnis (mandat §7/§8) — cari SATU FoodOpsEvent yang secara
 * deterministik mewakili kejadian bisnis yang sama dgn transaksi ini: tenant
 * sama + event_type padanan jenis_transaksi + tanggal_mulai PERSIS SAMA dgn
 * tanggal transaksi. TIDAK ADA ID yang di-hardcode — murni kecocokan atribut.
 * event_type padanan mencegah tabrakan dgn Event tahunan/rekap generik yang
 * kebetulan bertanggal sama (mis. Event rekap 1 Jan vs transaksi saldo_awal
 * 1 Jan — rekap ber-event_type KEGIATAN_LAIN, tidak pernah cocok dgn
 * padanan 'penyaluran'->'PENYALURAN', mandat §17 CASE 5).
 */
async function resolveBusinessContextEvent(tenantId, jenisTransaksi, tanggalTransaksi, transaction) {
  const eventType = JENIS_TRANSAKSI_TO_EVENT_TYPE[jenisTransaksi];
  if (!eventType || !tanggalTransaksi) return null;
  return db.FoodOpsEvent.findOne({
    where: { tenant_id: tenantId, event_type: eventType, tanggal_mulai: tanggalTransaksi, status: 'aktif' },
    transaction,
  });
}

/**
 * Cari kandidat dokumen FoodOps yang relevan utk sebuah target (indikator/
 * entitas ProSN, atau tautan Event/Regulasi generik). Semua filter tenant-
 * scoped (mandat §55 hard gate). Mengembalikan reasons yang bisa dibaca
 * manusia — bukan skor probabilitas fiktif (mandat §26 "no fake probability").
 *
 * Parameter tambahan (mandat corrective "Registry-First Evidence Discovery",
 * OPSIONAL, ADITIF — tidak mengubah perilaku existing bila tidak dikirim):
 *  - kategori_prosn: kategori mentah ProSN (mis. 'dokumen_penetapan') ->
 *    dipetakan SERVER-SIDE ke beberapa document_type via
 *    KATEGORI_PROSN_TO_FOOD_OPS_TYPES (server tetap otoritatif, mandat §19).
 *  - jenis_transaksi + entity_business_date: dipakai utk resolusi konteks
 *    bisnis (Event) dan sinyal "berlaku sebelum tanggal" (mandat §7/§8).
 */
async function findCandidates(tenantId, criteria = {}) {
  if (!tenantId) throw new FoodOpsError('tenant_id wajib ada.', 400, 'FOOD_OPS_INVALID_DOCUMENT');
  const {
    document_type: documentType, document_class: documentClass, tahun, entity_type: entityType, entity_id: entityId,
    checksum_sha256: checksum, exclude_document_id: excludeDocumentId,
    kategori_prosn: kategoriProsn, jenis_transaksi: jenisTransaksi, entity_business_date: entityBusinessDate,
  } = criteria;

  const where = { tenant_id: tenantId, status: ['aktif', 'perlu_perbaikan'] };
  // documentType eksplisit TETAP jadi filter DB keras (perilaku existing, tidak
  // berubah) — tapi kategoriProsn TIDAK dijadikan filter DB (banyak dokumen
  // nyata ber-type 'other' terlepas dari isinya, mandat temuan audit §G) —
  // dievaluasi sbg sinyal in-memory di bawah, supaya dokumen ber-type 'other'
  // tetap ikut terambil dari query dan bisa dicocokkan via sinyal lain.
  if (documentType) where.document_type = documentType;
  if (documentClass) where.document_class = documentClass;
  if (excludeDocumentId) where.id = { [db.Sequelize.Op.ne]: excludeDocumentId };

  const candidates = await db.FoodOpsDocument.findAll({ where, order: [['created_at', 'DESC']], limit: 50 });

  let alreadyLinkedIds = new Set();
  if (entityType && entityId) {
    // Sinyal "sudah tertaut" datang dari DUA mekanisme link yang berbeda dan
    // TERPISAH (bukan duplikasi arsitektur — masing-masing sumber kebenaran
    // domainnya sendiri, mandat "REUSE BEFORE INVENT" §18): (1) tautan generik
    // FoodOpsDocumentLink (Event/Regulation/Document/GenericReference), dan
    // (2) binding internal ProSN (ProsnBuktiIndikator+ProsnBuktiDukung.
    // food_ops_document_id) utk entity ProSN (mis. STOK_TRANSAKSI). Query (2)
    // aman dipanggil tanpa syarat — kosong bila entityType bukan entity ProSN.
    const links = await db.FoodOpsDocumentLink.findAll({ where: { tenant_id: tenantId, entity_type: entityType, entity_id: entityId } });
    alreadyLinkedIds = new Set(links.map((l) => l.document_id));
    const prosnLinks = await db.ProsnBuktiIndikator.findAll({
      where: { tenant_id: tenantId, entity_type: entityType, entity_id: entityId },
      include: [{ model: db.ProsnBuktiDukung, as: 'buktiDukung', attributes: ['food_ops_document_id'], where: { food_ops_document_id: { [db.Sequelize.Op.ne]: null } }, required: true }],
    });
    prosnLinks.forEach((l) => alreadyLinkedIds.add(l.buktiDukung.food_ops_document_id));
  }

  // Resolusi konteks bisnis (Event) — mandat §7/§8, hanya bila jenis_transaksi
  // punya padanan event_type DAN tanggal transaksi tersedia.
  let contextEvent = null;
  let contextLinkedIds = new Set();
  if (jenisTransaksi && entityBusinessDate) {
    contextEvent = await resolveBusinessContextEvent(tenantId, jenisTransaksi, entityBusinessDate);
    if (contextEvent) {
      const contextLinks = await db.FoodOpsDocumentLink.findAll({ where: { tenant_id: tenantId, entity_type: 'EVENT', entity_id: contextEvent.id } });
      contextLinkedIds = new Set(contextLinks.map((l) => l.document_id));
    }
  }

  const kategoriTypes = kategoriProsn ? (KATEGORI_PROSN_TO_FOOD_OPS_TYPES[kategoriProsn] || []) : [];
  const bolehBerlakuSebelum = kategoriProsn && KATEGORI_BERLAKU_SEBELUM_TANGGAL.has(kategoriProsn) && entityBusinessDate;

  const results = candidates
    .map((doc) => {
      const reasons = [];
      let contextEventInfo = null;

      const isAlreadyBound = alreadyLinkedIds.has(doc.id);
      const checksumMatch = Boolean(checksum && doc.checksum_sha256 === checksum);
      const identityMatch = isAlreadyBound || checksumMatch;

      const docYear = yearOf(doc.tanggal_dokumen);
      const yearMatches = Boolean(tahun && docYear && String(tahun) === docYear);
      const typeMatchesExplicit = Boolean(documentType && doc.document_type === documentType);
      // document_type='other' TIDAK PERNAH dihitung sbg cocok secara semantik —
      // banyak dokumen legacy nyata ber-type 'other' terlepas dari isinya
      // (mandat §5 "do not silently infer/write a canonical type"); kategoriTypes
      // kosong (mis. dokumen_koreksi) membuat .includes() SELALU false, sesuai
      // maksud (mandat §3 "empty mapping must not grant context-only EXACT").
      const semanticMatch = typeMatchesExplicit || kategoriTypes.includes(doc.document_type);
      const businessContextMatch = Boolean(contextEvent && contextLinkedIds.has(doc.id));
      const predatesMatch = Boolean(bolehBerlakuSebelum && KELAS_DOKUMEN_PENETAPAN.has(doc.document_class) && doc.tanggal_dokumen && doc.tanggal_dokumen <= entityBusinessDate);

      const relevance = deriveRelevance({ identityMatch, semanticMatch, businessContextMatch, yearMatches, predatesMatch });
      if (!relevance) return null;

      if (businessContextMatch) contextEventInfo = { event_id: contextEvent.id, nama_kegiatan: contextEvent.nama_kegiatan, tanggal_mulai: contextEvent.tanggal_mulai };

      // Reasons dibangun mengikuti sinyal MANA yang benar-benar berkontribusi ke
      // relevance akhir (mandat §10 "reasons jelas membedakan identity dari
      // rekomendasi semantik+konteks") — bukan lagi first-match-wins tunggal.
      if (checksumMatch) reasons.push('Checksum berkas identik — kemungkinan besar dokumen yang sama persis.');
      if (isAlreadyBound) reasons.push('Sudah tertaut ke entitas ini sebelumnya.');
      if (businessContextMatch && semanticMatch) {
        reasons.push(`Tertaut ke kegiatan "${contextEvent.nama_kegiatan}" (${contextEvent.tanggal_mulai}) DAN jenis dokumen (${doc.document_type}) cocok dgn kategori yang diminta — konteks bisnis maupun semantik sama-sama cocok.`);
      } else if (businessContextMatch) {
        reasons.push(`Tertaut ke kegiatan "${contextEvent.nama_kegiatan}" yang tanggalnya persis sama dgn transaksi ini (${contextEvent.tanggal_mulai}) — konteks bisnis cocok, TAPI jenis dokumen tersimpan (${doc.document_type}) belum dapat dipastikan sesuai kategori yang diminta — periksa secara manual.`);
      } else if (semanticMatch && yearMatches) {
        reasons.push(`Jenis dokumen (${doc.document_type}) dan tahun (${docYear}) cocok dengan yang diharapkan.`);
      } else if (semanticMatch) {
        reasons.push(`Jenis dokumen (${doc.document_type}) cocok, tahun belum tentu sama.`);
      } else if (yearMatches) {
        reasons.push(`Tahun dokumen (${docYear}) cocok, jenis dokumen belum tentu sesuai.`);
      } else if (predatesMatch) {
        reasons.push(`Dokumen kelas ${doc.document_class} berlaku sejak ${doc.tanggal_dokumen}, sebelum/pada tanggal transaksi (${entityBusinessDate}) — periksa relevansinya secara manual.`);
      }

      if (doc.status_verifikasi === 'valid') reasons.push('Sudah berstatus Valid.');
      else reasons.push(`Status verifikasi saat ini: ${doc.status_verifikasi} — belum tentu dapat langsung dipakai.`);
      if (doc.authority_level) reasons.push(`Authority level: ${doc.authority_level}.`);

      return {
        document_id: doc.id,
        judul: doc.judul,
        document_type: doc.document_type,
        document_class: doc.document_class,
        tanggal_dokumen: doc.tanggal_dokumen,
        relevance,
        reasons,
        authority_level: doc.authority_level,
        verification_status: doc.status_verifikasi,
        requires_review: doc.status_verifikasi !== 'valid',
        versi: doc.versi,
        kelompok_uuid: doc.kelompok_uuid,
        already_bound: isAlreadyBound,
        context_event: contextEventInfo,
      };
    })
    .filter(Boolean);

  const RANK = { EXACT: 3, STRONG: 2, POSSIBLE: 1 };
  results.sort((a, b) => RANK[b.relevance] - RANK[a.relevance]);
  return results;
}

module.exports = { findCandidates, RELEVANCE, KATEGORI_PROSN_TO_FOOD_OPS_TYPES, JENIS_TRANSAKSI_TO_EVENT_TYPE };
