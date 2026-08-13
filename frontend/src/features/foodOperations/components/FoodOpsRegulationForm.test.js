import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { deriveRegulationAutofill, extractRegisteredDocumentIds, isRegulationFormValid, resetSourceDerivedFields } from "./FoodOpsRegulationForm";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SOURCE = fs.readFileSync(path.join(__dirname, "FoodOpsRegulationForm.jsx"), "utf8");

describe("deriveRegulationAutofill (Corrective ProSN Semester-II Readiness — Regulation Recall-First Autofill §9)", () => {
  const doc = { judul: "Peraturan Gubernur Uji", nomor_dokumen: "PERGUB/001/2025", tanggal_dokumen: "2025-01-01", penerbit: "Biro Hukum" };

  it("R1 — form kosong -> semua field aman diisi dari dokumen", () => {
    const patch = deriveRegulationAutofill(doc, {});
    expect(patch).toEqual({ judul_resmi: "Peraturan Gubernur Uji", nomor: "PERGUB/001/2025", tanggal_penetapan: "2025-01-01", instansi_penerbit: "Biro Hukum", tahun: "2025" });
  });

  it("R5 (FINAL CLOSURE MANDATE Req #33) — tahun diturunkan dari tahun tanggal_dokumen, bukan sumber baru", () => {
    const patch = deriveRegulationAutofill(doc, {});
    expect(patch.tahun).toBe("2025");
  });

  it("R6 (Req #33) — tahun yang sudah diisi user TIDAK PERNAH ditimpa", () => {
    const patch = deriveRegulationAutofill(doc, { tahun: "1999" });
    expect(patch.tahun).toBeUndefined();
  });

  it("R7 (Req #33) — dokumen tanpa tanggal_dokumen -> tahun tidak diisi (bukan ditebak)", () => {
    const patch = deriveRegulationAutofill({ ...doc, tanggal_dokumen: null }, {});
    expect(patch.tahun).toBeUndefined();
  });

  it("R2 — field yang SUDAH diisi user TIDAK PERNAH ditimpa", () => {
    const patch = deriveRegulationAutofill(doc, { judul_resmi: "Judul custom user", nomor: "", tanggal_penetapan: "", instansi_penerbit: "" });
    expect(patch.judul_resmi).toBeUndefined();
    expect(patch.nomor).toBe("PERGUB/001/2025");
  });

  it("R3 — dokumen null -> patch kosong (tidak melempar)", () => {
    expect(deriveRegulationAutofill(null, {})).toEqual({});
  });

  it("R4 — field tanpa sumber aman (tanggal_berlaku/status_berlaku/legal_hierarchy/scope/catatan) TIDAK PERNAH ditebak — ditelusuri penuh, tidak ada padanan di FoodOpsDocument/klasifikasi_meta (mandat UAT-02 §8/§9)", () => {
    const patch = deriveRegulationAutofill(doc, {});
    expect(patch.tanggal_berlaku).toBeUndefined();
    expect(patch.status_berlaku).toBeUndefined();
    expect(patch.legal_hierarchy).toBeUndefined();
    expect(patch.scope).toBeUndefined();
    expect(patch.catatan).toBeUndefined();
  });

  it("R4b — dokumen tanpa document_type (mis. fixture generik) -> jenis_produk_hukum tidak diisi (tidak ada dasar pemetaan)", () => {
    const patch = deriveRegulationAutofill(doc, {});
    expect(patch.jenis_produk_hukum).toBeUndefined();
  });
});

describe("deriveRegulationAutofill — pemetaan Jenis Produk Hukum (CORRECTIVE MANDATE UAT-02, kasus Owner UAT-02 A/B)", () => {
  const baseDoc = { judul: "Uji", nomor_dokumen: "X/1/2025", tanggal_dokumen: "2025-01-01", penerbit: "Uji" };

  it("UAT-02 A — peraturan_gubernur -> pergub (kasus Owner: Peraturan Gubernur Maluku Utara Nomor 10.1 Tahun 2025)", () => {
    expect(deriveRegulationAutofill({ ...baseDoc, document_type: "peraturan_gubernur" }, {}).jenis_produk_hukum).toBe("pergub");
  });

  it("UAT-02 B — keputusan_gubernur -> kepgub (kasus Owner: Keputusan Gubernur Maluku Utara Nomor 365/KPTS/MU/2025)", () => {
    expect(deriveRegulationAutofill({ ...baseDoc, document_type: "keputusan_gubernur" }, {}).jenis_produk_hukum).toBe("kepgub");
  });

  it("pemetaan deterministik lain yang dibuktikan istilahnya persis padanan (UU/PP/Perpres/Permendagri/Perda/SK)", () => {
    expect(deriveRegulationAutofill({ ...baseDoc, document_type: "undang_undang" }, {}).jenis_produk_hukum).toBe("uu");
    expect(deriveRegulationAutofill({ ...baseDoc, document_type: "peraturan_pemerintah" }, {}).jenis_produk_hukum).toBe("pp");
    expect(deriveRegulationAutofill({ ...baseDoc, document_type: "peraturan_presiden" }, {}).jenis_produk_hukum).toBe("perpres");
    expect(deriveRegulationAutofill({ ...baseDoc, document_type: "permendagri" }, {}).jenis_produk_hukum).toBe("permendagri");
    expect(deriveRegulationAutofill({ ...baseDoc, document_type: "peraturan_daerah" }, {}).jenis_produk_hukum).toBe("perda");
    expect(deriveRegulationAutofill({ ...baseDoc, document_type: "surat_keputusan" }, {}).jenis_produk_hukum).toBe("sk");
  });

  it("document_type ambigu/bukan produk hukum (mis. undangan/notulen/laporan/other) TIDAK dipetakan — dibiarkan kosong, bukan ditebak", () => {
    for (const type of ["undangan", "notulen", "laporan", "berita_acara", "dokumentasi", "other", "surat_tugas", "surat_jalan", "materi", "kartu_stok"]) {
      expect(deriveRegulationAutofill({ ...baseDoc, document_type: type }, {}).jenis_produk_hukum).toBeUndefined();
    }
  });

  it("jenis_produk_hukum yang SUDAH diisi user TIDAK PERNAH ditimpa oleh pemetaan", () => {
    const patch = deriveRegulationAutofill({ ...baseDoc, document_type: "peraturan_gubernur" }, { jenis_produk_hukum: "kepgub" });
    expect(patch.jenis_produk_hukum).toBeUndefined();
  });

  it("dokumen null -> tidak melempar, patch kosong (termasuk jenis_produk_hukum)", () => {
    expect(deriveRegulationAutofill(null, {}).jenis_produk_hukum).toBeUndefined();
  });
});

describe("isRegulationFormValid (existing, unchanged)", () => {
  it("tetap valid seperti sebelumnya", () => {
    expect(isRegulationFormValid({ jenis_produk_hukum: "pergub", document_id: "1" }, false)).toBe(true);
  });
});

describe("FoodOpsRegulationForm — struktur sumber (CORRECTIVE MANDATE UAT-02 §6, sudah-terdaftar)", () => {
  it("F5 — opsi dokumen yang sudah terdaftar berlabel 'Sudah Terdaftar'", () => {
    expect(SOURCE).toMatch(/Sudah Terdaftar/);
  });

  it("F6 — opsi dokumen yang sudah terdaftar diberi atribut disabled (tidak bisa dipilih -> tidak bisa membuat duplikat)", () => {
    expect(SOURCE).toMatch(/disabled=\{registeredDocumentIds\.has\(Number\(d\.id\)\)\}/);
  });

  it("F7 — dokumen yang BELUM terdaftar tetap dapat dipilih (disabled HANYA bergantung pada keanggotaan Set, bukan flag global)", () => {
    // disabled={registeredDocumentIds.has(Number(d.id))} bernilai false utk id yang tidak ada di Set -> tetap selectable.
    expect(SOURCE).not.toMatch(/<option[^>]*disabled(?!=\{registeredDocumentIds)/);
  });

  it("§17 — selector dikunci (disabled) sampai status pendaftaran selesai dimuat, mencegah race dimana dokumen sudah-terdaftar sempat terlihat selectable", () => {
    expect(SOURCE).toMatch(/disabled=\{!registeredStateReady\}/);
    expect(SOURCE).toMatch(/\.finally\(\(\) => setRegisteredStateReady\(true\)\)/);
  });

  it("deteksi sudah-terdaftar reuse endpoint list Regulasi yang SUDAH ADA (getFoodOpsRegulations), tidak ada endpoint/field backend baru", () => {
    expect(SOURCE).toMatch(/getFoodOpsRegulations\(\)/);
  });

  it("deteksi sudah-terdaftar HANYA berjalan pada mode Tambah (!editing) — tidak mempengaruhi form Ubah sama sekali", () => {
    const guardMatch = SOURCE.match(/if \(!editing\) \{\s*getFoodOpsRegulations/);
    expect(guardMatch).toBeTruthy();
  });

  it("F10 — mode Ubah TIDAK menjalankan deriveRegulationAutofill/pemetaan apa pun — form diisi langsung dari `editing`, nilai tersimpan (Tanggal Berlaku/Catatan/Status Berlaku) tidak mungkin tertimpa", () => {
    const effectMatch = SOURCE.match(/useEffect\(\(\) => \{[\s\S]*?\n {2}\}, \[show, editing\]\);/);
    expect(effectMatch).toBeTruthy();
    expect(effectMatch[0]).toMatch(/editing \? \{ \.\.\.emptyForm\(\), \.\.\.editing, document_id: editing\.document_id \} : emptyForm\(\)/);
    // deriveRegulationAutofill hanya dipanggil di dalam onChange document_id, BUKAN di useEffect (yg berlaku juga saat editing).
    expect(effectMatch[0]).not.toMatch(/deriveRegulationAutofill/);
  });
});

describe("resetSourceDerivedFields (FINAL CLOSURE MANDATE §13/§14 — cegah stale state saat ganti sumber Regulasi)", () => {
  const FIELDS = ["judul_resmi", "nomor", "tanggal_penetapan", "instansi_penerbit", "tahun", "jenis_produk_hukum"];

  it("R18 — field yang masih SAMA dgn baseline dikosongkan saat dokumen sumber diganti (A -> B)", () => {
    const form = { judul_resmi: "Pergub A", nomor: "10.1", tanggal_penetapan: "2025-03-17", instansi_penerbit: "Biro Hukum", tahun: "2025", jenis_produk_hukum: "pergub", catatan: "milik user" };
    const baseline = { judul_resmi: "Pergub A", nomor: "10.1", tanggal_penetapan: "2025-03-17", instansi_penerbit: "Biro Hukum", tahun: "2025", jenis_produk_hukum: "pergub" };
    const result = resetSourceDerivedFields(form, baseline, FIELDS);
    expect(result.form.judul_resmi).toBe("");
    expect(result.form.nomor).toBe("");
    expect(result.form.jenis_produk_hukum).toBe("");
    expect(result.form.catatan).toBe("milik user"); // field manual di luar daftar tidak tersentuh
  });

  it("field yang SUDAH di-override user (mis. Judul Resmi diedit manual) TIDAK dikosongkan saat sumber diganti", () => {
    const form = { judul_resmi: "Judul kustom milik user", nomor: "10.1", tahun: "2025" };
    const baseline = { judul_resmi: "Pergub A (baseline lama)", nomor: "10.1", tahun: "2025" };
    const result = resetSourceDerivedFields(form, baseline, FIELDS);
    expect(result.form.judul_resmi).toBe("Judul kustom milik user");
    expect(result.form.nomor).toBe("");
  });
});

describe("extractRegisteredDocumentIds (FINAL CLOSURE MANDATE §16/§18 — bentuk payload API regulations yang REALISTIS)", () => {
  it("R12/R13 — payload realistis GET /food-operations/regulations (document_id kolom langsung, bukan nested)", () => {
    const regulations = [
      { id: 10, tenant_id: 1, document_id: 222, jenis_produk_hukum: "peraturan_gubernur", nomor: "10.1 Tahun 2025" },
      { id: 11, tenant_id: 1, document_id: 223, jenis_produk_hukum: "keputusan_gubernur", nomor: "365/KPTS/MU/2025" },
    ];
    const result = extractRegisteredDocumentIds(regulations);
    expect(result.has(222)).toBe(true);
    expect(result.has(223)).toBe(true);
    expect(result.has(999)).toBe(false);
  });

  it("§18 — document_id type consistency: string document_id dari respons dinormalisasi ke Number, tetap cocok dgn Number(d.id) di selector", () => {
    const regulations = [{ id: 10, document_id: "222" }];
    const result = extractRegisteredDocumentIds(regulations);
    expect(result.has(222)).toBe(true);
    expect(result.has("222")).toBe(false); // Set berisi Number, bukan string — pemanggil HARUS Number(d.id) juga (dibuktikan test F6 di atas)
  });

  it("payload kosong/undefined/null -> Set kosong, tidak melempar", () => {
    expect(extractRegisteredDocumentIds([]).size).toBe(0);
    expect(extractRegisteredDocumentIds(undefined).size).toBe(0);
    expect(extractRegisteredDocumentIds(null).size).toBe(0);
  });

  it("baris tanpa document_id (respons tidak lengkap) difilter aman, tidak melempar", () => {
    const regulations = [{ id: 10, document_id: null }, { id: 11 }];
    expect(() => extractRegisteredDocumentIds(regulations)).not.toThrow();
    expect(extractRegisteredDocumentIds(regulations).size).toBe(0);
  });
});
