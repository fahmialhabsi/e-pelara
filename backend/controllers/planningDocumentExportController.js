"use strict";

const db = require("../models");
const exportSvc = require("../services/planningDocumentExportService");
const officialEngine = require("../services/planningOfficialDocumentEngine");
const officialValidation = require("../services/planningOfficialDocumentValidation");
const versionSvc = require("../services/planningDocumentVersionService");

/**
 * POST /api/rkpd/dokumen/:id/generate-docx
 * Preview perencanaan (bukan dokumen RKPD resmi struktur bab).
 * Query: include_diff=1 → kolom lama/baru jika ada log rkpd_item
 */
async function rkpdDokumenGenerateDocx(req, res) {
  try {
    const includeDiff = req.query.include_diff === "1" || req.body?.include_diff === true;
    const buf = await exportSvc.buildRkpdDokumenDocx(db, req.params.id, {
      includeDiff,
    });
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="rkpd-preview-${req.params.id}.docx"`,
    );
    return res.send(Buffer.from(buf));
  } catch (e) {
    console.error(e);
    return res.status(500).json({ success: false, message: e.message });
  }
}

async function rkpdDokumenGeneratePdf(req, res) {
  try {
    const buf = await exportSvc.buildRkpdDokumenPdf(db, req.params.id);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="rkpd-preview-${req.params.id}.pdf"`,
    );
    return res.send(buf);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ success: false, message: e.message });
  }
}

/** Preview: ringkasan baris internal (html-to-docx), bukan dokumen Renja OPD resmi. */
async function renjaDokumenGenerateDocx(req, res) {
  try {
    const buf = await exportSvc.buildRenjaDokumenDocx(db, req.params.id);
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="renja-preview-${req.params.id}.docx"`,
    );
    return res.send(Buffer.from(buf));
  } catch (e) {
    console.error(e);
    return res.status(500).json({ success: false, message: e.message });
  }
}

async function renjaDokumenGenerateOfficialDocx(req, res) {
  try {
    const id = Number(req.params.id);
    const v = await officialValidation.validateRenjaOfficial(db, id);
    if (!v.ok) {
      return res.status(400).json({
        success: false,
        errors: v.errors,
        warnings: v.warnings,
      });
    }
    const userId = req.user?.id ?? null;
    const nextN = await versionSvc.getNextRenjaVersionNumber(db, id);
    const buf = await officialEngine.buildRenjaOpdOfficialDocx(db, id, {
      documentVersion: nextN,
    });
    await versionSvc.commitRenjaVersionAfterExport(db, id, userId, nextN);
    res.setHeader("X-Document-Version", String(nextN));
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="renja-opd-resmi-${id}-v${nextN}.docx"`,
    );
    return res.send(Buffer.from(buf));
  } catch (e) {
    console.error(e);
    return res.status(500).json({ success: false, message: e.message });
  }
}

async function renjaDokumenGenerateOfficialPdf(req, res) {
  try {
    const id = Number(req.params.id);
    const v = await officialValidation.validateRenjaOfficial(db, id);
    if (!v.ok) {
      return res.status(400).json({
        success: false,
        errors: v.errors,
        warnings: v.warnings,
      });
    }
    const userId = req.user?.id ?? null;
    const nextN = await versionSvc.getNextRenjaVersionNumber(db, id);
    const buf = await officialEngine.buildRenjaOpdOfficialPdf(db, id, {
      documentVersion: nextN,
    });
    await versionSvc.commitRenjaVersionAfterExport(db, id, userId, nextN);
    res.setHeader("X-Document-Version", String(nextN));
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="renja-opd-resmi-${id}-v${nextN}.pdf"`,
    );
    return res.send(buf);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ success: false, message: e.message });
  }
}

async function renjaDokumenGeneratePdf(req, res) {
  try {
    const buf = await exportSvc.buildRenjaDokumenPdf(db, req.params.id);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="renja-preview-${req.params.id}.pdf"`,
    );
    return res.send(buf);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ success: false, message: e.message });
  }
}

async function rkpdDokumenGenerateOfficialDocx(req, res) {
  try {
    const id = Number(req.params.id);
    const v = await officialValidation.validateRkpdOfficial(db, id);
    if (!v.ok) {
      return res.status(400).json({
        success: false,
        errors: v.errors,
        warnings: v.warnings,
      });
    }
    const userId = req.user?.id ?? null;
    const nextN = await versionSvc.getNextRkpdVersionNumber(db, id);
    const buf = await officialEngine.buildRkpdOfficialDocx(db, id, {
      documentVersion: nextN,
    });
    await versionSvc.commitRkpdVersionAfterExport(db, id, userId, nextN);
    res.setHeader("X-Document-Version", String(nextN));
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="rkpd-resmi-${id}-v${nextN}.docx"`,
    );
    return res.send(Buffer.from(buf));
  } catch (e) {
    console.error(e);
    return res.status(500).json({ success: false, message: e.message });
  }
}

async function rkpdDokumenGenerateOfficialPdf(req, res) {
  try {
    const id = Number(req.params.id);
    const v = await officialValidation.validateRkpdOfficial(db, id);
    if (!v.ok) {
      return res.status(400).json({
        success: false,
        errors: v.errors,
        warnings: v.warnings,
      });
    }
    const userId = req.user?.id ?? null;
    const nextN = await versionSvc.getNextRkpdVersionNumber(db, id);
    const buf = await officialEngine.buildRkpdOfficialPdf(db, id, {
      documentVersion: nextN,
    });
    await versionSvc.commitRkpdVersionAfterExport(db, id, userId, nextN);
    res.setHeader("X-Document-Version", String(nextN));
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="rkpd-resmi-${id}-v${nextN}.pdf"`,
    );
    return res.send(buf);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ success: false, message: e.message });
  }
}

/** GET — cek prasyarat ekspor resmi tanpa membuat file / versi baru. */
async function renjaDokumenValidateOfficial(req, res) {
  try {
    const id = Number(req.params.id);
    const v = await officialValidation.validateRenjaOfficial(db, id);
    return res.json({
      success: true,
      data: { ok: v.ok, errors: v.errors, warnings: v.warnings },
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ success: false, message: e.message });
  }
}

async function rkpdDokumenValidateOfficial(req, res) {
  try {
    const id = Number(req.params.id);
    const v = await officialValidation.validateRkpdOfficial(db, id);
    return res.json({
      success: true,
      data: { ok: v.ok, errors: v.errors, warnings: v.warnings },
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ success: false, message: e.message });
  }
}

module.exports = {
  rkpdDokumenGenerateDocx,
  rkpdDokumenGeneratePdf,
  rkpdDokumenGenerateOfficialDocx,
  rkpdDokumenGenerateOfficialPdf,
  rkpdDokumenValidateOfficial,
  renjaDokumenGenerateDocx,
  renjaDokumenGeneratePdf,
  renjaDokumenGenerateOfficialDocx,
  renjaDokumenGenerateOfficialPdf,
  renjaDokumenValidateOfficial,
};
