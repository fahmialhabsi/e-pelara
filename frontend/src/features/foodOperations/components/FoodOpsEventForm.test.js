import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { deriveEventAutofill, extractRegisteredLineages, isEventFormValid, resetSourceDerivedFields } from "./FoodOpsEventForm";

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
    expect(SOURCE).toMatch(/l\?\.document\?\.kelompok_uuid/);
    expect(SOURCE).not.toMatch(/registeredDocumentIds/); // beda pola sengaja dari UAT-02 Regulasi (per document_id) krn semantik lineage berlaku di sini
  });

  it("deteksi sudah-terdaftar difilter relation_type KEGIATAN_SOURCE — TIDAK menganggap tautan evidence biasa (mis. dibuat manual lewat FoodOpsDocumentLinkManager) sbg sudah terdaftar", () => {
    expect(SOURCE).toMatch(/l\?\.relation_type === 'KEGIATAN_SOURCE'/);
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

  it("§17 — selector dikunci (disabled) sampai status pendaftaran selesai dimuat, mencegah race dimana dokumen sudah-terdaftar sempat terlihat selectable", () => {
    expect(SOURCE).toMatch(/disabled=\{!registeredStateReady\}/);
    expect(SOURCE).toMatch(/\.finally\(\(\) => setRegisteredStateReady\(true\)\)/);
  });
});

describe("resetSourceDerivedFields (FINAL CLOSURE MANDATE §13/§14 — cegah stale state saat ganti sumber)", () => {
  const FIELDS = ["nama_kegiatan", "tanggal_mulai", "penanggung_jawab", "tahun"];

  it("K19 — field yang masih SAMA dgn baseline (belum di-override) dikosongkan saat sumber diganti", () => {
    const form = { nama_kegiatan: "Notulen A", tanggal_mulai: "2025-06-30", penanggung_jawab: "Dinas A", tahun: "2025", lokasi: "" };
    const baseline = { nama_kegiatan: "Notulen A", tanggal_mulai: "2025-06-30", penanggung_jawab: "Dinas A", tahun: "2025" };
    const result = resetSourceDerivedFields(form, baseline, FIELDS);
    expect(result.form.nama_kegiatan).toBe("");
    expect(result.form.tanggal_mulai).toBe("");
    expect(result.form.penanggung_jawab).toBe("");
    expect(result.form.tahun).toBe("");
    expect(result.baseline.nama_kegiatan).toBeUndefined();
  });

  it("K19b — field yang SUDAH di-override user (berbeda dari baseline) TIDAK dikosongkan saat sumber diganti", () => {
    const form = { nama_kegiatan: "Nama custom milik user", tanggal_mulai: "2025-06-30", penanggung_jawab: "Dinas A", tahun: "2025" };
    const baseline = { nama_kegiatan: "Notulen A (baseline lama)", tanggal_mulai: "2025-06-30", penanggung_jawab: "Dinas A", tahun: "2025" };
    const result = resetSourceDerivedFields(form, baseline, FIELDS);
    expect(result.form.nama_kegiatan).toBe("Nama custom milik user");
    expect(result.form.tanggal_mulai).toBe("");
  });

  it("field di luar daftar (mis. lokasi) tidak tersentuh sama sekali", () => {
    const form = { nama_kegiatan: "A", lokasi: "Kantor Gubernur" };
    const baseline = { nama_kegiatan: "A" };
    const result = resetSourceDerivedFields(form, baseline, ["nama_kegiatan"]);
    expect(result.form.lokasi).toBe("Kantor Gubernur");
  });

  it("K20 — dipakai bersama deriveEventAutofill(null, ...) utk mode manual -> field ter-reset TETAP kosong (bukan menempel dari sumber lama)", () => {
    const form = { nama_kegiatan: "Notulen Lama", tanggal_mulai: "2025-06-30", penanggung_jawab: "Dinas Lama", tahun: "2025" };
    const baseline = { nama_kegiatan: "Notulen Lama", tanggal_mulai: "2025-06-30", penanggung_jawab: "Dinas Lama", tahun: "2025" };
    const cleared = resetSourceDerivedFields(form, baseline, FIELDS);
    const patch = deriveEventAutofill(null, cleared.form);
    expect(patch).toEqual({});
    expect(cleared.form.nama_kegiatan).toBe("");
  });
});

describe("extractRegisteredLineages (FINAL CLOSURE MANDATE §16/§19 — bentuk payload API document-links yang REALISTIS)", () => {
  it("K9/K10 — payload realistis GET /food-operations/document-links?entity_type=EVENT (document NESTED, sesuai listLinks include)", () => {
    const links = [
      { id: 1, tenant_id: 1, document_id: 535, entity_type: "EVENT", entity_id: 900, relation_type: "KEGIATAN_SOURCE", document: { id: 535, kelompok_uuid: "4b3f2851-3d2e-4630-b085-c25203548940", versi: 2 } },
      { id: 2, tenant_id: 1, document_id: 601, entity_type: "EVENT", entity_id: 901, relation_type: "EVIDENCE", document: { id: 601, kelompok_uuid: "aaaa-bbbb", versi: 1 } },
    ];
    const result = extractRegisteredLineages(links);
    expect(result.has("4b3f2851-3d2e-4630-b085-c25203548940")).toBe(true);
    expect(result.has("aaaa-bbbb")).toBe(false);
  });

  it("tautan evidence biasa (relation_type lain, mis. dibuat manual via FoodOpsDocumentLinkManager '+ Tautkan') TIDAK dihitung sbg sudah terdaftar", () => {
    const links = [{ id: 3, document_id: 700, entity_type: "EVENT", entity_id: 902, relation_type: "EVIDENCE", document: { kelompok_uuid: "cccc-dddd" } }];
    expect(extractRegisteredLineages(links).size).toBe(0);
  });

  it("payload kosong/undefined/null -> Set kosong, tidak melempar", () => {
    expect(extractRegisteredLineages([]).size).toBe(0);
    expect(extractRegisteredLineages(undefined).size).toBe(0);
    expect(extractRegisteredLineages(null).size).toBe(0);
  });

  it("K23 — baris tanpa document ter-nest (mis. respons tidak lengkap) tidak melempar, difilter aman", () => {
    const links = [{ id: 4, document_id: 800, entity_type: "EVENT", relation_type: "KEGIATAN_SOURCE" }];
    expect(() => extractRegisteredLineages(links)).not.toThrow();
    expect(extractRegisteredLineages(links).size).toBe(0);
  });
});
