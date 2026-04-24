import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/hooks/useDokumen", () => ({
  useDokumen: () => ({ tahun: 2026 }),
}));

vi.mock("@/features/rpjmd/hooks/usePeriodeAktif", () => ({
  usePeriodeAktif: () => ({ periode_id: 2 }),
}));

import RpjmdRkpdSyncPage, {
  parseOpdPenanggungJawabIds,
  resolveEffectiveOpdPenanggungJawabId,
  syncCategoryMeta,
} from "../../rkpd/pages/RpjmdRkpdSyncPage";

function renderPage() {
  return renderToStaticMarkup(React.createElement(RpjmdRkpdSyncPage, null));
}

describe("RpjmdRkpdSyncPage hardening UI", () => {
  it("menampilkan panel Langkah yang Disarankan", () => {
    const html = renderPage();
    expect(html).toContain("Langkah yang Disarankan");
    expect(html).toContain("Jalankan Auto Mapping Program.");
  });

  it("menampilkan panel aksi cepat auto mapping", () => {
    const html = renderPage();
    expect(html).toContain("Aksi Cepat Auto Mapping Master");
    expect(html).toContain("Konfirmasi eksekusi program.");
    expect(html).toContain("Konfirmasi eksekusi kegiatan.");
    expect(html).toContain("Konfirmasi eksekusi sub kegiatan.");
  });

  it("menampilkan label opsi sync yang operator-friendly", () => {
    const html = renderPage();
    expect(html).toContain("Gunakan hanya struktur yang sesuai");
    expect(html).toContain("Buat parent tujuan jika belum ada");
  });

  it("resolver kategori memberi next action yang jelas", () => {
    const sourceUnmapped = syncCategoryMeta("source_unmapped");
    expect(sourceUnmapped.label).toBe("Data sumber belum terhubung ke master");
    expect(sourceUnmapped.action).toContain("Auto Mapping");

    const parentMissing = syncCategoryMeta("target_parent_missing");
    expect(parentMissing.label).toBe("Parent tujuan belum tersedia");
    expect(parentMissing.action).toContain("Buat parent tujuan jika belum ada");
  });

  it("adapter OPD memetakan id dropdown (grouped) ke id transaksi program.opd_penanggung_jawab", () => {
    // Kasus nyata: UI memilih "Dinas Pangan (id 107)", tetapi data transaksi menyimpan OPD=348.
    const opd_list = [
      {
        id: 107,
        nama_opd: "Dinas Pangan",
        opd_penanggung_jawab_ids: "107,348",
      },
    ];
    const programs_for_context = [
      { id: 1, opd_penanggung_jawab: 348 },
      { id: 2, opd_penanggung_jawab: 348 },
      { id: 3, opd_penanggung_jawab: 118 },
    ];

    expect(parseOpdPenanggungJawabIds(opd_list[0])).toEqual([107, 348]);

    const resolved = resolveEffectiveOpdPenanggungJawabId({
      selected_dropdown_id: 107,
      opd_list,
      programs_for_context,
    });
    expect(resolved.raw_dropdown_id).toBe(107);
    expect(resolved.candidate_ids).toEqual([107, 348]);
    expect(resolved.effective_id).toBe(348);

    const idSet = new Set((resolved.candidate_ids || []).map((x) => Number(x)));
    const filtered = programs_for_context.filter((p) =>
      idSet.has(Number(p.opd_penanggung_jawab)),
    );
    // Guard utama: daftar program untuk OPD terpilih tidak boleh kosong akibat mismatch id.
    expect(filtered.length).toBeGreaterThan(0);
  });
});
