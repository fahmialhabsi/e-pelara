import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildUploadFormData, isUploadFormValid } from "./FoodOpsDocumentUploadModal";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SOURCE = fs.readFileSync(path.join(__dirname, "FoodOpsDocumentUploadModal.jsx"), "utf8");

describe("isUploadFormValid (existing, unchanged)", () => {
  it("tetap valid seperti sebelumnya", () => {
    expect(isUploadFormValid({ judul: "X", document_class: "REGULATION", document_type: "pergub" }, {})).toBe(true);
  });
});

describe("buildUploadFormData (CORRECTIVE MANDATE UAT-01B — F5 acknowledgment eksplisit)", () => {
  const form = { judul: "Dok Uji", document_class: "ACTIVITY_DOCUMENT", document_type: "notulen", nomor_dokumen: "N/001", tanggal_dokumen: "2025-06-30", penerbit: "Uji" };
  const file = { name: "dok.pdf" };

  it("F5a — tanpa acknowledgedCandidateId -> FormData TIDAK memuat acknowledge_likely_same/acknowledged_candidate_id sama sekali", () => {
    const fd = buildUploadFormData(form, file, null);
    expect(fd.has("acknowledge_likely_same")).toBe(false);
    expect(fd.has("acknowledged_candidate_id")).toBe(false);
    expect(fd.get("judul")).toBe("Dok Uji");
    expect(fd.has("file")).toBe(true);
  });

  it("F5b — dengan acknowledgedCandidateId -> FormData memuat acknowledge_likely_same='true' + acknowledged_candidate_id eksplisit (BUKAN generic skipDuplicateChecks)", () => {
    const fd = buildUploadFormData(form, file, 232);
    expect(fd.get("acknowledge_likely_same")).toBe("true");
    expect(fd.get("acknowledged_candidate_id")).toBe("232");
    expect(fd.has("skipDuplicateChecks")).toBe(false);
  });

  it("field form kosong tidak ikut disertakan (perilaku existing, tidak berubah)", () => {
    const fd = buildUploadFormData({ ...form, penerbit: "" }, file, null);
    expect(fd.has("penerbit")).toBe(false);
  });
});

describe("FoodOpsDocumentUploadModal — struktur sumber (CORRECTIVE MANDATE UAT-01B)", () => {
  it("F1/F3 — panel LIKELY_SAME dirender saat code=FOOD_OPS_DOCUMENT_LIKELY_SAME, menampilkan metadata kandidat lengkap", () => {
    expect(SOURCE).toMatch(/FOOD_OPS_DOCUMENT_LIKELY_SAME/);
    expect(SOURCE).toMatch(/LikelySameCandidateTable/);
    for (const field of ["Judul", "Nomor", "Class", "Jenis", "Tanggal", "Penerbit", "Versi", "Status", "Verifikasi"]) {
      expect(SOURCE).toContain(`'${field}'`);
    }
  });

  it("F2 — toast sukses HANYA dipanggil di jalur createFoodOpsDocument berhasil, TIDAK PERNAH sebelum interception diselesaikan", () => {
    const successToastCount = (SOURCE.match(/toast\.success\('Dokumen berhasil diunggah\.'\)/g) || []).length;
    expect(successToastCount).toBe(1);
    // Toast sukses harus berada SETELAH await createFoodOpsDocument, bukan sebelum pengecekan code LIKELY_SAME.
    const createIdx = SOURCE.indexOf("await createFoodOpsDocument(formData)");
    const successIdx = SOURCE.indexOf("toast.success('Dokumen berhasil diunggah.')");
    const likelySameCheckIdx = SOURCE.indexOf("FOOD_OPS_DOCUMENT_LIKELY_SAME");
    expect(createIdx).toBeGreaterThan(-1);
    expect(successIdx).toBeGreaterThan(createIdx);
    expect(likelySameCheckIdx).toBeGreaterThan(createIdx);
  });

  it("F4 — 'Gunakan Dokumen yang Sudah Ada' (handleUseExisting) TIDAK memanggil submitUpload/createFoodOpsDocument sama sekali", () => {
    const fnMatch = SOURCE.match(/const handleUseExisting = \(\) => \{[\s\S]*?\n  \};/);
    expect(fnMatch).toBeTruthy();
    expect(fnMatch[0]).not.toMatch(/submitUpload|createFoodOpsDocument/);
  });

  it("F5 — 'Tetap Buat Dokumen Baru' (handleCreateNewAnyway) mengirim acknowledgment eksplisit via submitUpload(candidate.id)", () => {
    const fnMatch = SOURCE.match(/const handleCreateNewAnyway = async \(\) => \{[\s\S]*?\n  \};/);
    expect(fnMatch).toBeTruthy();
    expect(fnMatch[0]).toMatch(/submitUpload\(likelySameCandidate\.id\)/);
  });

  it("F6 — 'Batal' (handleCancelInterception) TIDAK memanggil submitUpload/createFoodOpsDocument sama sekali", () => {
    const fnMatch = SOURCE.match(/const handleCancelInterception = \(\) => \{[\s\S]*?\n  \};/);
    expect(fnMatch).toBeTruthy();
    expect(fnMatch[0]).not.toMatch(/submitUpload|createFoodOpsDocument/);
  });

  it("F8 — tombol interception (Batal/Tetap Buat Dokumen Baru/Gunakan) semua disabled saat saving=true, mencegah double-click duplikasi", () => {
    const footerMatch = SOURCE.match(/Modal\.Footer className="flex-wrap gap-2">[\s\S]*?<\/Modal\.Footer>/);
    expect(footerMatch).toBeTruthy();
    const disabledCount = (footerMatch[0].match(/disabled=\{saving\}/g) || []).length;
    expect(disabledCount).toBe(3);
  });

  it("F9/F10 — jalur EXACT/normal upload (pesan error generik via error.response.data.message) tidak dihapus", () => {
    expect(SOURCE).toMatch(/data\?\.message \|\| 'Gagal mengunggah dokumen\.'/);
  });

  it("tidak ada bypass generik seperti skipDuplicateChecks yang benar-benar dipakai (hanya boleh muncul di komentar penjelasan)", () => {
    expect(SOURCE).not.toMatch(/formData\.append\(\s*['"]skipDuplicateChecks['"]/);
    expect(SOURCE).not.toMatch(/\bskipDuplicateChecks\s*[=:]\s*(true|1)/);
  });
});
