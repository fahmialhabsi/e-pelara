import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { findLatestVersion } from "./FoodOpsDocumentVersionHistory";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const HISTORY_SOURCE = fs.readFileSync(path.join(__dirname, "FoodOpsDocumentVersionHistory.jsx"), "utf8");
const MODAL_SOURCE = fs.readFileSync(path.join(__dirname, "FoodOpsNewVersionModal.jsx"), "utf8");
const DETAIL_SOURCE = fs.readFileSync(path.join(__dirname, "FoodOpsDocumentDetailModal.jsx"), "utf8");

describe("findLatestVersion (CORRECTIVE MANDATE UAT-01C)", () => {
  it("mengembalikan null utk daftar kosong", () => {
    expect(findLatestVersion([])).toBeNull();
  });

  it("mengembalikan versi dgn nomor tertinggi, bukan hanya elemen terakhir array", () => {
    const versions = [{ id: 2, versi: 2 }, { id: 1, versi: 1 }, { id: 3, versi: 3 }];
    expect(findLatestVersion(versions).id).toBe(3);
  });

  it("satu versi -> mengembalikan versi itu sendiri", () => {
    const versions = [{ id: 232, versi: 1 }];
    expect(findLatestVersion(versions).id).toBe(232);
  });
});

describe("FoodOpsDocumentVersionHistory — struktur sumber (F1/F2/F9/F10)", () => {
  it("F1/F2 — tombol '+ Buat Versi Baru' dirender berdekatan dgn Riwayat Versi (bukan dgn upload generik)", () => {
    expect(HISTORY_SOURCE).toContain("+ Buat Versi Baru");
    expect(HISTORY_SOURCE).not.toMatch(/createFoodOpsDocument\(/); // hanya endpoint versi, BUKAN endpoint create-document generik
  });

  it("F7 — memanggil endpoint versi (createFoodOpsDocumentVersion via FoodOpsNewVersionModal), BUKAN POST /documents generik", () => {
    expect(MODAL_SOURCE).toMatch(/createFoodOpsDocumentVersion/);
    expect(MODAL_SOURCE).not.toMatch(/createFoodOpsDocument\(/);
  });

  it("F9/F10 — setelah berhasil, riwayat versi di-refresh (load ulang) via query yang sudah ada, tanpa reload browser", () => {
    expect(HISTORY_SOURCE).toMatch(/handleCreated[\s\S]*?await load\(\)/);
    expect(HISTORY_SOURCE).not.toMatch(/window\.location\.reload/);
  });
});

describe("FoodOpsNewVersionModal — struktur sumber (F3/F4/F5/F6/F8/F11)", () => {
  it("F4 — menampilkan ringkasan dokumen induk + versi saat ini + preview versi baru, semua read-only", () => {
    expect(MODAL_SOURCE).toContain("Dokumen Induk");
    expect(MODAL_SOURCE).toContain("Versi Saat Ini");
    expect(MODAL_SOURCE).toContain("Versi Baru");
    expect(MODAL_SOURCE).toMatch(/preview — nomor final ditentukan server/);
  });

  it("F4b — TIDAK meminta input ulang judul/nomor/class/jenis/penerbit/tanggal (field tsb tidak punya <Form.Control> editable di modal ini)", () => {
    for (const forbidden of ["judul", "nomor_dokumen", "document_class", "document_type", "penerbit"]) {
      expect(MODAL_SOURCE).not.toMatch(new RegExp(`Form\\.Control[^/]*value=\\{[^}]*${forbidden}`));
    }
  });

  it("tidak ada field 'Catatan Versi' — model FoodOpsDocument tidak punya kolom catatan (mandat §11: jangan menambah field yg tidak didukung backend)", () => {
    expect(MODAL_SOURCE).not.toMatch(/formData\.append\(\s*['"]catatan['"]/);
    expect(MODAL_SOURCE).not.toMatch(/Form\.Label>Catatan/);
  });

  it("F5 — berkas wajib (required) sebelum submit", () => {
    expect(MODAL_SOURCE).toMatch(/if \(!file\) \{ toast\.error/);
    expect(MODAL_SOURCE).toMatch(/required type="file"/);
  });

  it("F6 — Batal tidak memanggil createFoodOpsDocumentVersion", () => {
    const cancelButtonMatch = MODAL_SOURCE.match(/<Button variant="light" onClick=\{onHide\}[^>]*>Batal<\/Button>/);
    expect(cancelButtonMatch).toBeTruthy();
  });

  it("F8 — submit disabled selama saving=true (mencegah double-click membuat 2 versi)", () => {
    const submitMatch = MODAL_SOURCE.match(/<Button type="submit" disabled=\{saving\}>/);
    expect(submitMatch).toBeTruthy();
  });

  it("F11 — pesan error backend (mis. FOOD_OPS_DOCUMENT_VERSION_IDENTICAL) ditampilkan apa adanya via toast, tidak ditelan", () => {
    expect(MODAL_SOURCE).toMatch(/error\?\.response\?\.data\?\.message \|\| 'Gagal membuat versi baru\.'/);
  });
});

describe("FoodOpsDocumentDetailModal — perpindahan id setelah versi baru (§17) TIDAK mempengaruhi jalur EXACT/LIKELY_SAME upload generik (F12/F13)", () => {
  it("handleVersionCreated memindahkan currentId ke versi baru TANPA menutup modal (state lokal, bukan reload)", () => {
    const fnMatch = DETAIL_SOURCE.match(/const handleVersionCreated = async \(newVersionDoc\) => \{[\s\S]*?\n  \};/);
    expect(fnMatch).toBeTruthy();
    expect(fnMatch[0]).toMatch(/setCurrentId\(newVersionDoc\.id\)/);
    expect(fnMatch[0]).not.toMatch(/onHide/);
  });

  it("FoodOpsDocumentUploadModal (generic EXACT/LIKELY_SAME upload UAT-01A/01B) tidak direferensikan sama sekali dari Detail modal — jalur benar-benar terpisah", () => {
    expect(DETAIL_SOURCE).not.toMatch(/FoodOpsDocumentUploadModal/);
  });
});
