import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { labelSaldoRealisasi } from "./CadanganPanganBerasSection";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SOURCE = fs.readFileSync(path.join(__dirname, "CadanganPanganBerasSection.jsx"), "utf8");

describe("labelSaldoRealisasi (Corrective B.1.3 Saldo vs Realisasi §10-12)", () => {
  it("F1/F2 — Semester I (progress_checkpoint_semester_1 / null): label 'Saat Ini'", () => {
    expect(labelSaldoRealisasi("progress_checkpoint_semester_1")).toEqual({ saldo: "Saldo Saat Ini", realisasi: "Realisasi Saat Ini" });
    expect(labelSaldoRealisasi(null)).toEqual({ saldo: "Saldo Saat Ini", realisasi: "Realisasi Saat Ini" });
  });

  it("F3/F4 — Semester II/tahunan (annual_regulatory_final): label 'Sampai (Dengan) Saat Ini'", () => {
    expect(labelSaldoRealisasi("annual_regulatory_final")).toEqual({ saldo: "Saldo Sampai Saat Ini", realisasi: "Realisasi Sampai Dengan Saat Ini" });
  });
});

describe("CadanganPanganBerasSection — presentation source assertions (Corrective B.1.3 Saldo vs Realisasi + Regulatory Target Provenance)", () => {
  it("F5 — teks ambigu 'Saldo/Realisasi Semester' TIDAK ADA lagi di komponen", () => {
    expect(SOURCE).not.toContain("Saldo/Realisasi Semester");
  });

  it("F6 — label operasional dan dasar regulatif tampil sbg blok TERPISAH", () => {
    expect(SOURCE).toContain("Dasar Penetapan Regulatif");
    expect(SOURCE).toContain("Sumber Angka Operasional");
  });

  it("F7 — dasar regulatif yang belum ada ditampilkan jujur (bukan disamarkan/diam-diam dianggap ada)", () => {
    expect(SOURCE).toContain("Belum tersedia/terverifikasi");
  });

  it("F8 — badge RKA Operasional (Fallback) TIDAK diberi label seolah Keputusan KDH", () => {
    const rkaBadgeLine = SOURCE.split("\n").find((line) => line.includes("Sumber: RKA Operasional (Fallback)"));
    expect(rkaBadgeLine).toBeTruthy();
    expect(rkaBadgeLine).not.toContain("Keputusan KDH");
  });

  it("F9 — label 'Progres Indikatif' Semester I tetap dipertahankan (tidak dihapus corrective ini)", () => {
    expect(SOURCE).toContain("Progres Indikatif s.d. Semester I");
  });

  it("F10 — label 'Skor Regulasi Tahunan' Semester II tetap dipertahankan (tidak dihapus corrective ini)", () => {
    expect(SOURCE).toContain("Skor Regulasi Tahunan B.1.3");
  });

  it("saldo dan realisasi dirender sbg dua kolom terpisah memakai realisasi_penyaluran_ton dari backend (bukan dihitung ulang di FE)", () => {
    expect(SOURCE).toContain("detail.realisasi_penyaluran_ton");
    expect(SOURCE).toContain("detail.saldo_akhir");
  });
});
