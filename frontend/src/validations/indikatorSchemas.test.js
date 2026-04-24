import { describe, it, expect } from "vitest";
import { indikatorEditCoreSchema } from "./indikatorSchemas";

describe("indikatorEditCoreSchema", () => {
  it("menolak field inti kosong", async () => {
    await expect(
      indikatorEditCoreSchema.validate({})
    ).rejects.toBeDefined();
  });

  it("lolos jika lima field inti terisi", async () => {
    const v = await indikatorEditCoreSchema.validate({
      tolok_ukur_kinerja: "a",
      target_kinerja: "b",
      definisi_operasional: "c",
      metode_penghitungan: "d",
      baseline: "e",
    });
    expect(v.baseline).toBe("e");
  });
});
