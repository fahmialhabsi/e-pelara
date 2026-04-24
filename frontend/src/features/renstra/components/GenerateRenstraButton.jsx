// src/features/renstra/components/GenerateRenstraButton.jsx
/**
 * Tombol untuk men-generate dokumen Renstra OPD
 * Output: DOCX (Word) dan PDF
 * Endpoint backend: GET /api/renstra-opd/:id/generate-docx
 *                   GET /api/renstra-opd/:id/generate-pdf
 */
import { useState } from "react";
import { Button, Dropdown } from "react-bootstrap";
import api from "../../../services/api";

const GenerateRenstraButton = ({ renstraId, namaOpd, disabled }) => {
  const [generating, setGenerating] = useState(null); // 'docx' | 'pdf' | null

  const handleGenerate = async (format) => {
    if (!renstraId) {
      alert("Tidak ada Renstra aktif yang dapat di-generate.");
      return;
    }

    setGenerating(format);
    try {
      const endpoint = format === "docx"
        ? `/renstra-opd/${renstraId}/generate-docx`
        : `/renstra-opd/${renstraId}/generate-pdf`;

      // Gunakan "arraybuffer" agar raw bytes tidak di-wrap ulang (mencegah file korup di Word)
      const response = await api.get(endpoint, { responseType: "arraybuffer" });

      const contentType = format === "docx"
        ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        : "application/pdf";

      const extension  = format === "docx" ? ".docx" : ".pdf";
      const safeNama   = (namaOpd || "Renstra").replace(/\s+/g, "_");
      const filename   = `Renstra_${safeNama}${extension}`;

      // Buat Blob langsung dari ArrayBuffer — selalu bersih, tanpa double-wrapping
      const blob = new Blob([response.data], { type: contentType });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href     = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Generate error:", err);
      // Saat responseType=arraybuffer, error.response.data adalah ArrayBuffer —
      // decode dulu ke string agar bisa dibaca pesan errornya
      let msg = "Gagal men-generate dokumen. Coba lagi.";
      try {
        if (err?.response?.data instanceof ArrayBuffer) {
          const text = new TextDecoder().decode(err.response.data);
          const json = JSON.parse(text);
          msg = json?.error || json?.message || msg;
        } else {
          msg = err?.response?.data?.error || msg;
        }
      } catch {}
      alert(msg);
    } finally {
      setGenerating(null);
    }
  };

  const isLoading = generating !== null;

  return (
    <Dropdown as="span">
      <Dropdown.Toggle
        variant="success"
        size="sm"
        id="generate-renstra-dropdown"
        disabled={disabled || isLoading}
      >
        {isLoading ? (
          <>
            <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true" />
            {generating === "docx" ? "Membuat DOCX..." : "Membuat PDF..."}
          </>
        ) : (
          <>📄 Generate Dokumen Renstra</>
        )}
      </Dropdown.Toggle>

      <Dropdown.Menu>
        <Dropdown.Header>📋 Pilih Format</Dropdown.Header>
        <Dropdown.Item
          onClick={() => handleGenerate("docx")}
          disabled={isLoading}
        >
          <strong>📝 Word (.docx)</strong>
          <div className="small text-muted">Dapat diedit di Microsoft Word</div>
        </Dropdown.Item>
        <Dropdown.Item
          onClick={() => handleGenerate("pdf")}
          disabled={isLoading}
        >
          <strong>📕 PDF</strong>
          <div className="small text-muted">Siap cetak / distribusi</div>
        </Dropdown.Item>
        <Dropdown.Divider />
        <Dropdown.ItemText className="small text-muted px-3" style={{ maxWidth: 280 }}>
          ℹ️ BAB I–III dan BAB VIII memerlukan pengisian manual. BAB IV–VII terisi otomatis dari data yang ada.
        </Dropdown.ItemText>
      </Dropdown.Menu>
    </Dropdown>
  );
};

export default GenerateRenstraButton;
