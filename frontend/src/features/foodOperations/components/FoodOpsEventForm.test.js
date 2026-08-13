import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { deriveEventAutofill, isEventFormValid } from "./FoodOpsEventForm";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SOURCE = fs.readFileSync(path.join(__dirname, "FoodOpsEventForm.jsx"), "utf8");

describe("deriveEventAutofill (Corrective ProSN Semester-II Readiness — Kegiatan Recall-First Autofill §10)", () => {
  const doc = { judul: "Surat Permintaan Uji", tanggal_dokumen: "2025-04-01", penerbit: "Dinas Pangan" };

  it("K1 — form kosong -> nama_kegiatan/tanggal_mulai/penanggung_jawab/tahun diisi dari dokumen", () => {
    const patch = deriveEventAutofill(doc, {});
    expect(patch).toEqual({ nama_kegiatan: "Surat Permintaan Uji", tanggal_mulai: "2025-04-01", penanggung_jawab: "Dinas Pangan", tahun: "2025" });
  });

  it("K5 (FINAL CLOSURE MANDATE Req #33) — tahun diturunkan dari tahun tanggal_dokumen, bukan sumber baru", () => {
    const patch = deriveEventAutofill(doc, {});
    expect(patch.tahun).toBe("2025");
  });

  it("K6 (Req #33) — tahun yang SUDAH diisi user secara eksplisit TIDAK PERNAH ditimpa", () => {
    const patch = deriveEventAutofill(doc, { tahun: "2026" });
    expect(patch.tahun).toBeUndefined();
  });

  it("K2 — field yang sudah diisi user tidak ditimpa", () => {
    const patch = deriveEventAutofill(doc, { nama_kegiatan: "Nama custom" });
    expect(patch.nama_kegiatan).toBeUndefined();
    expect(patch.tanggal_mulai).toBe("2025-04-01");
  });

  it("K3 — field tanpa padanan aman (lokasi/pimpinan/hasil/tindak_lanjut) TIDAK PERNAH difabrikasi", () => {
    const patch = deriveEventAutofill(doc, {});
    expect(patch.lokasi).toBeUndefined();
    expect(patch.pimpinan).toBeUndefined();
    expect(patch.hasil).toBeUndefined();
    expect(patch.tindak_lanjut).toBeUndefined();
  });

  it("K4 — dokumen null -> patch kosong", () => {
    expect(deriveEventAutofill(null, {})).toEqual({});
  });
});

describe("isEventFormValid (existing, unchanged)", () => {
  it("tetap valid seperti sebelumnya", () => {
    expect(isEventFormValid({ event_type: "RAPAT", tahun: "2025", tanggal_mulai: "2025-01-01", nama_kegiatan: "X" })).toBe(true);
  });
});

describe("FoodOpsEventForm — struktur sumber (CORRECTIVE MANDATE UAT-03)", () => {
  it("DEFECT A — emptyForm TIDAK PERNAH pre-seed tahun dgn new Date().getFullYear() lagi (akar penyebab Tahun 2026 vs Tanggal Mulai 2025-06-30 milik Owner)", () => {
    const emptyFormMatch = SOURCE.match(/function emptyForm\(\) \{[\s\S]*?\n\}/);
    expect(emptyFormMatch).toBeTruthy();
    expect(emptyFormMatch[0]).toMatch(/tahun: ''/);
    expect(emptyFormMatch[0]).not.toMatch(/getFullYear/);

    const useEffectMatch = SOURCE.match(/useEffect\(\(\) => \{\s*if \(show\) \{[\s\S]*?\n {4}\}\s*\n {2}\}, \[show, editing\]\);/);
    expect(useEffectMatch).toBeTruthy();
    expect(useEffectMatch[0]).not.toMatch(/getFullYear/);
    expect(useEffectMatch[0]).toMatch(/emptyForm\(\)/);
  });

  it("F1/F2 — Tahun tetap punya provenance badge (autofillBaseline.tahun), sekarang benar-benar bisa terisi krn tidak lagi diblokir default", () => {
    expect(SOURCE).toMatch(/FieldProvenanceBadge baseline=\{autofillBaseline\.tahun\}/);
  });

  it("F3/F4/F5 — autofill Nama Kegiatan/Tanggal Mulai/Penanggung Jawab yang sudah ada TIDAK diubah strukturnya", () => {
    expect(SOURCE).toMatch(/FieldProvenanceBadge baseline=\{autofillBaseline\.nama_kegiatan\}/);
    expect(SOURCE).toMatch(/FieldProvenanceBadge baseline=\{autofillBaseline\.tanggal_mulai\}/);
    expect(SOURCE).toMatch(/FieldProvenanceBadge baseline=\{autofillBaseline\.penanggung_jawab\}/);
  });

  it("DEFECT B — F7/F8 opsi dokumen yang sudah terdaftar (per-lineage) berlabel 'Sudah Terdaftar' dan disabled", () => {
    expect(SOURCE).toMatch(/Sudah Terdaftar/);
    expect(SOURCE).toMatch(/disabled=\{registeredLineages\.has\(d\.kelompok_uuid\)\}/);
  });

  it("F9 — dokumen yang BELUM terdaftar tetap selectable (disabled murni bergantung keanggotaan Set lineage)", () => {
    expect(SOURCE).not.toMatch(/<option[^>]*disabled(?!=\{registeredLineages)/);
  });

  it("identitas sumber adalah LINEAGE (kelompok_uuid), BUKAN document_id spesifik — konsisten dgn UAT-01C (versi baru dari lineage yang sama tetap dikenali)", () => {
    expect(SOURCE).toMatch(/l\.document\?\.kelompok_uuid/);
    expect(SOURCE).not.toMatch(/registeredDocumentIds/); // beda pola sengaja dari UAT-02 Regulasi (per document_id) krn semantik lineage berlaku di sini
  });

  it("deteksi sudah-terdaftar difilter relation_type KEGIATAN_SOURCE — TIDAK menganggap tautan evidence biasa (mis. dibuat manual lewat FoodOpsDocumentLinkManager) sbg sudah terdaftar", () => {
    expect(SOURCE).toMatch(/l\.relation_type === 'KEGIATAN_SOURCE'/);
  });

  it("F10 — Kegiatan manual (source_document_id kosong) mengirim payload TANPA field source_document_id sama sekali — jalur backend manual tidak terpengaruh", () => {
    const submitMatch = SOURCE.match(/await createFoodOpsEvent\(sourceDocumentId \? \{ \.\.\.form, source_document_id: sourceDocumentId \} : form\);/);
    expect(submitMatch).toBeTruthy();
  });

  it("deteksi sudah-terdaftar reuse endpoint document-links yang SUDAH ADA, tidak ada endpoint backend baru", () => {
    expect(SOURCE).toMatch(/getFoodOpsDocumentLinks\(\{ entity_type: 'EVENT' \}\)/);
  });

  it("F13 — mode Ubah (editing) TIDAK menjalankan deteksi sudah-terdaftar/fetch dokumen sumber sama sekali", () => {
    const guardMatch = SOURCE.match(/if \(!editing\) \{\s*getFoodOpsDocuments/);
    expect(guardMatch).toBeTruthy();
  });
});
