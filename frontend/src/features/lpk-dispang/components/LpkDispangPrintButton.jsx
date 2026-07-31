// Tombol cetak PDF/Word untuk Dashboard Laporan Pengelolaan Kegiatan (LPK Dispang).
// Endpoint backend: GET /api/lpk-dispang-print/pdf?renstra_id=&tahun=
//                   GET /api/lpk-dispang-print/docx?renstra_id=&tahun=
import { useState } from 'react';
import { Button, Dropdown } from 'react-bootstrap';
import api from '@/services/api';

const LpkDispangPrintButton = ({ renstraId, tahun, namaOpd, disabled }) => {
  const [generating, setGenerating] = useState(null); // 'pdf' | 'docx' | null

  const handleGenerate = async (format) => {
    if (!renstraId || !tahun) {
      alert('Renstra aktif atau tahun dokumen belum tersedia.');
      return;
    }

    setGenerating(format);
    try {
      const response = await api.get(`/lpk-dispang-print/${format}`, {
        params: { renstra_id: renstraId, tahun },
        // Gunakan "arraybuffer" agar raw bytes tidak di-wrap ulang (mencegah file korup di Word)
        responseType: 'arraybuffer',
      });

      const contentType =
        format === 'docx'
          ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
          : 'application/pdf';
      const extension = format === 'docx' ? '.docx' : '.pdf';
      const safeNama = (namaOpd || 'LPK_Dispang').replace(/\s+/g, '_');
      const filename = `LPK_Dispang_${safeNama}_${tahun}${extension}`;

      const blob = new Blob([response.data], { type: contentType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Generate LPK Dispang error:', err);
      let msg = 'Gagal men-generate dokumen. Coba lagi.';
      try {
        if (err?.response?.data instanceof ArrayBuffer) {
          const text = new TextDecoder().decode(err.response.data);
          const json = JSON.parse(text);
          msg = json?.error || json?.message || msg;
        } else {
          msg = err?.response?.data?.error || msg;
        }
      } catch {
        // biarkan pesan default
      }
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
        id="print-lpk-dispang-dropdown"
        disabled={disabled || isLoading}
      >
        {isLoading ? (
          <>
            <span
              className="spinner-border spinner-border-sm me-1"
              role="status"
              aria-hidden="true"
            />
            {generating === 'docx' ? 'Membuat DOCX...' : 'Membuat PDF...'}
          </>
        ) : (
          <>🖨️ Cetak Laporan</>
        )}
      </Dropdown.Toggle>

      <Dropdown.Menu>
        <Dropdown.Header>📋 Pilih Format</Dropdown.Header>
        <Dropdown.Item onClick={() => handleGenerate('docx')} disabled={isLoading}>
          <strong>📝 Word (.docx)</strong>
          <div className="small text-muted">Dapat diedit di Microsoft Word</div>
        </Dropdown.Item>
        <Dropdown.Item onClick={() => handleGenerate('pdf')} disabled={isLoading}>
          <strong>📕 PDF</strong>
          <div className="small text-muted">Siap cetak / distribusi</div>
        </Dropdown.Item>
      </Dropdown.Menu>
    </Dropdown>
  );
};

export default LpkDispangPrintButton;
