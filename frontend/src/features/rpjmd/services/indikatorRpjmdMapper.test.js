import { describe, it, expect } from "vitest";
import {
  mapOpdPenanggungRowToSelectOption,
  normalizePenanggungJawabFormValue,
  normalizeIndikatorListResponse,
  mapIndikatorTujuanDetailToEditForm,
} from "./indikatorRpjmdMapper";

describe("indikatorRpjmdMapper", () => {
  describe("mapOpdPenanggungRowToSelectOption", () => {
    it("memetakan id numerik ke value string", () => {
      const o = mapOpdPenanggungRowToSelectOption({
        id: 42,
        nama_opd: "Dinas A",
        nama_bidang_opd: "Bidang 1",
      });
      expect(o.value).toBe("42");
      expect(o.label).toContain("Dinas A");
    });

    it("mengembalikan null jika item tidak valid", () => {
      expect(mapOpdPenanggungRowToSelectOption(null)).toBeNull();
      expect(mapOpdPenanggungRowToSelectOption({})).toBeNull();
    });
  });

  describe("normalizePenanggungJawabFormValue", () => {
    it("menormalisasi angka ke string", () => {
      expect(normalizePenanggungJawabFormValue(7)).toBe("7");
    });

    it("mengembalikan string kosong untuk null/undefined/kosong", () => {
      expect(normalizePenanggungJawabFormValue(null)).toBe("");
      expect(normalizePenanggungJawabFormValue(undefined)).toBe("");
      expect(normalizePenanggungJawabFormValue("")).toBe("");
    });
  });

  describe("normalizeIndikatorListResponse", () => {
    it("mengekstrak data + meta dari payload paginated", () => {
      const { data, meta } = normalizeIndikatorListResponse({
        data: [{ id: 1, kode_indikator: "A" }],
        meta: { totalPages: 2 },
      });
      expect(data).toHaveLength(1);
      expect(String(data[0].id)).toBe("1");
      expect(meta.totalPages).toBe(2);
    });
  });

  describe("mapIndikatorTujuanDetailToEditForm", () => {
    it("memetakan penanggung_jawab ke string", () => {
      const f = mapIndikatorTujuanDetailToEditForm({
        id: "99",
        kode_indikator: "K",
        nama_indikator: "N",
        penanggung_jawab: 12,
        tahun: 2025,
        jenis_dokumen: "RPJMD",
        misi_id: 1,
        tujuan_id: 2,
      });
      expect(f.penanggung_jawab).toBe("12");
    });
  });
});
