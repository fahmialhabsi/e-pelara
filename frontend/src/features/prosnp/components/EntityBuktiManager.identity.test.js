import { describe, expect, it } from "vitest";
import { hasValidBuktiEntityIdentity } from "./EntityBuktiManager";

describe("hasValidBuktiEntityIdentity (UI Evidence Counter Refresh — Identifier Guard §5)", () => {
  it("valid utk entityType spesifik dengan entityId numerik (B.1.1 SURAT_PENUGASAN)", () => {
    expect(hasValidBuktiEntityIdentity(1, "SURAT_PENUGASAN", 96)).toBe(true);
  });

  it("valid utk entityType PENGISIAN meski entityId sama dgn pengisianId (binding generik)", () => {
    expect(hasValidBuktiEntityIdentity(1, "PENGISIAN", 1)).toBe(true);
  });

  it("tidak valid bila entityId null utk entityType spesifik (mis. target/transaksi belum ada)", () => {
    expect(hasValidBuktiEntityIdentity(1, "CADANGAN_TARGET", null)).toBe(false);
  });

  it("tidak valid bila entityId undefined utk entityType spesifik", () => {
    expect(hasValidBuktiEntityIdentity(1, "STOK_TRANSAKSI", undefined)).toBe(false);
  });

  it("tidak valid bila entityType kosong", () => {
    expect(hasValidBuktiEntityIdentity(1, "", 96)).toBe(false);
  });

  it("tidak valid bila pengisianId kosong", () => {
    expect(hasValidBuktiEntityIdentity(null, "SURAT_PENUGASAN", 96)).toBe(false);
  });

  it("entityId=0 dianggap identitas valid (falsy tapi bukan null/undefined)", () => {
    expect(hasValidBuktiEntityIdentity(1, "INOVASI", 0)).toBe(true);
  });
});
