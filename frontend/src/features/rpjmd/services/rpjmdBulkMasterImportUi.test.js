import { describe, expect, it } from "vitest";
import {
  parseIdList,
  deriveMasterFilters,
  buildBulkMasterImportPayload,
  isCommitReady,
  isSerializablePlainJson,
} from "./rpjmdBulkMasterImportUi";

describe("rpjmdBulkMasterImportUi", () => {
  it("parseIdList membersihkan input ID campuran", () => {
    expect(parseIdList("1, 2; 2 abc 5 0 -1")).toEqual([1, 2, 5]);
  });

  it("menonaktifkan input ID manual saat dropdown dipakai", () => {
    const { manualDisabled } = deriveMasterFilters({
      selectedMasterProgramId: "10",
      selectedMasterKegiatanId: "22",
      selectedMasterSubKegiatanId: "33",
      manualProgramIdsText: "1,2",
      manualKegiatanIdsText: "3,4",
      manualSubKegiatanIdsText: "5,6",
    });

    expect(manualDisabled).toEqual({
      master_program_ids: true,
      master_kegiatan_ids: true,
      master_sub_kegiatan_ids: true,
    });
  });

  it("payload preview tetap kompatibel dengan kontrak backend lama", () => {
    const payload = buildBulkMasterImportPayload({
      datasetKey: "kepmendagri_provinsi_900_2024",
      periodeId: "7",
      tahun: "2026",
      jenisDokumen: "rpjmd",
      selectedMasterProgramId: "10",
      selectedMasterKegiatanId: "",
      selectedMasterSubKegiatanId: "",
      manualProgramIdsText: "1,2",
      manualKegiatanIdsText: "3",
      manualSubKegiatanIdsText: "4",
      createMissingKegiatan: true,
      skipDuplicates: true,
      strictParentMapping: true,
      enforceAnchorContext: true,
      defaultNamaOpd: "-",
      defaultNamaBidang: "-",
      defaultSubBidang: "-",
      anchorProgramId: "88",
      opdPenanggungJawabId: "99",
    });

    expect(payload).toEqual({
      dataset_key: "kepmendagri_provinsi_900_2024",
      periode_id: 7,
      tahun: 2026,
      jenis_dokumen: "rpjmd",
      filters: {
        master_program_ids: [10],
        master_kegiatan_ids: [3],
        master_sub_kegiatan_ids: [4],
      },
      options: {
        create_missing_kegiatans: true,
        skip_duplicates: true,
        strict_parent_mapping: true,
        enforce_anchor_context: true,
      },
      default_nama_opd: "-",
      default_nama_bidang_opd: "-",
      default_sub_bidang_opd: "-",
      anchor_program_id: 88,
      opd_penanggung_jawab_id: 99,
    });
  });

  it("aturan tombol commit mengikuti hasil preview", () => {
    expect(
      isCommitReady({
        previewData: { summary: { commit_blocked: false } },
        lastPreviewPayload: { periode_id: 1 },
        previewLoading: false,
      }),
    ).toBe(true);

    expect(
      isCommitReady({
        previewData: { summary: { commit_blocked: true } },
        lastPreviewPayload: { periode_id: 1 },
        previewLoading: false,
      }),
    ).toBe(false);
  });

  it("guard payload menolak object kompleks/non-JSON", () => {
    expect(isSerializablePlainJson({ a: 1, b: [2, 3], c: { d: true } })).toBe(
      true,
    );
    expect(
      isSerializablePlainJson({
        a: 1,
        bad: {
          preventDefault() {},
        },
      }),
    ).toBe(false);
    expect(isSerializablePlainJson({ fn: () => {} })).toBe(false);
  });
});
