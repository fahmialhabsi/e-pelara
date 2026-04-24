import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import RpjmdBulkMasterImportPage from "../pages/RpjmdBulkMasterImportPage";

function renderPage() {
  return renderToStaticMarkup(
    React.createElement(RpjmdBulkMasterImportPage, null),
  );
}

describe("RpjmdBulkMasterImportPage UI structure", () => {
  it("merender panel Pengaturan Dasar", () => {
    const html = renderPage();
    expect(html).toContain("Pengaturan Dasar");
  });

  it("merender dropdown Program RPJMD Tujuan Import", () => {
    const html = renderPage();
    expect(html).toContain("Program RPJMD Tujuan Import");
  });

  it("merender dropdown master berjenjang", () => {
    const html = renderPage();
    expect(html).toContain("Master Program");
    expect(html).toContain("Master Kegiatan");
    expect(html).toContain("Master Sub Kegiatan");
  });

  it("merender panel mode advanced yang bisa dibuka/tutup", () => {
    const html = renderPage();
    expect(html).toContain("Pengaturan Lanjutan");
    expect(html).toContain("Mode Lanjutan: Input ID Manual");
    expect(html).toContain("<details");
  });

  it("merender panel Auto Mapping Program", () => {
    const html = renderPage();
    expect(html).toContain("Auto Mapping Program RPJMD ke Master");
    expect(html).toContain("Preview Auto Mapping Program");
    expect(html).toContain("Terapkan Auto Mapping");
  });
});
