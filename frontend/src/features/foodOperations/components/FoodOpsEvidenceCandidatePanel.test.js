import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SOURCE = fs.readFileSync(path.join(__dirname, "FoodOpsEvidenceCandidatePanel.jsx"), "utf8");

describe("FoodOpsEvidenceCandidatePanel — struktur sumber (CORRECTIVE MANDATE UAT-01D)", () => {
  it("F4 — menampilkan badge non-actionable 'Sudah Ditautkan' utk kandidat already_bound", () => {
    expect(SOURCE).toMatch(/c\.already_bound\s*\?[\s\S]*?Sudah Ditautkan/);
  });

  it("F5 — tombol 'Gunakan/Tautkan' HANYA dirender saat already_bound bernilai falsy (else-branch dari kondisi already_bound)", () => {
    const ternaryStart = SOURCE.indexOf("{c.already_bound ? (");
    expect(ternaryStart).toBeGreaterThan(-1);
    const elseSplit = SOURCE.indexOf(") : (", ternaryStart);
    expect(elseSplit).toBeGreaterThan(-1);
    const ternaryEnd = SOURCE.indexOf("\n          </div>", elseSplit);
    expect(ternaryEnd).toBeGreaterThan(-1);
    const boundBranch = SOURCE.slice(ternaryStart, elseSplit);
    const notBoundBranch = SOURCE.slice(elseSplit, ternaryEnd);
    expect(boundBranch).not.toMatch(/Gunakan\/Tautkan/);
    expect(boundBranch).not.toMatch(/onClick=\{\(\) => onUse/);
    expect(notBoundBranch).toMatch(/Gunakan\/Tautkan/);
    expect(notBoundBranch).toMatch(/onClick=\{\(\) => onUse\(c\)\}/);
  });

  it("relevansi (badge Cocok Persis/Mungkin Relevan) tetap dirender terlepas dari status already_bound — dua konsep terpisah, tidak digabung", () => {
    // Badge relevansi berada DI LUAR percabangan already_bound (bukan bagian dari kondisi Gunakan/Tautkan).
    const relevanceBadgeIdx = SOURCE.indexOf("CANDIDATE_RELEVANCE_VARIANT[c.relevance]");
    const alreadyBoundBranchIdx = SOURCE.indexOf("c.already_bound ?");
    expect(relevanceBadgeIdx).toBeGreaterThan(-1);
    expect(alreadyBoundBranchIdx).toBeGreaterThan(-1);
    expect(relevanceBadgeIdx).toBeLessThan(alreadyBoundBranchIdx);
  });

  it("kandidat already_bound TIDAK difilter dari daftar (tetap transparan, mandat §4) — tidak ada .filter(already_bound) sebelum render", () => {
    expect(SOURCE).not.toMatch(/\.filter\([^)]*already_bound/);
  });

  it("tidak ada bypass generik seperti skipAlreadyBoundCheck yang benar-benar dipakai", () => {
    expect(SOURCE).not.toMatch(/skipAlreadyBoundCheck/);
  });
});
