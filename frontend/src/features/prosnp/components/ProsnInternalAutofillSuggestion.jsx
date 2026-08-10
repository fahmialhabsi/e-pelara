import React, { useState } from 'react';
import { Alert, Badge, Button } from 'react-bootstrap';
import { toast } from 'react-toastify';
import { previewProsnInternalAutofill } from '../services/prosnpApi';

const CONFIDENCE_VARIANT = { HIGH: 'success', MEDIUM: 'warning', LOW: 'secondary', NONE: 'secondary' };

/**
 * Saran internal (Sumber Data/Hambatan/Tindak Lanjut) untuk B.1.1-B.1.4 —
 * murni preview via API, TIDAK PERNAH menyimpan ke DB sendiri (mandat
 * "Internal Field Autofill B.1.1-B.1.4" §3). Hasil hanya mengisi state form
 * lokal parent lewat `onApply`; penyimpanan tetap lewat tombol Simpan yang
 * sudah ada.
 */
export default function ProsnInternalAutofillSuggestion({ pengisianId, hasExistingContent, onApply, disabled }) {
  const [loading, setLoading] = useState(false);
  const [suggestion, setSuggestion] = useState(null);

  const generate = async () => {
    setLoading(true);
    try {
      const result = await previewProsnInternalAutofill(pengisianId);
      if (hasExistingContent && hasExistingContent()) {
        if (!window.confirm('Field catatan internal sudah berisi. Ganti dengan saran sistem?')) return;
      }
      onApply(result);
      setSuggestion(result);
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Gagal membuat saran otomatis.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mb-3">
      <Button size="sm" variant="outline-primary" onClick={generate} disabled={disabled || loading}>
        {loading ? 'Membuat saran…' : 'Isi Otomatis Catatan Internal'}
      </Button>
      {suggestion && (
        <Alert variant="light" className="border mt-2 mb-0 py-2 px-3 small">
          <div className="fst-italic text-muted mb-1">Saran internal sistem — dapat diperbaiki sebelum disimpan.</div>
          <div className="d-flex gap-3 flex-wrap">
            <span>Sumber Data <Badge bg={CONFIDENCE_VARIANT[suggestion.confidence?.sumber_data] || 'secondary'}>{suggestion.confidence?.sumber_data || 'NONE'}</Badge></span>
            <span>Hambatan <Badge bg={CONFIDENCE_VARIANT[suggestion.confidence?.hambatan] || 'secondary'}>{suggestion.confidence?.hambatan || 'NONE'}</Badge></span>
            <span>Tindak Lanjut <Badge bg={CONFIDENCE_VARIANT[suggestion.confidence?.tindak_lanjut] || 'secondary'}>{suggestion.confidence?.tindak_lanjut || 'NONE'}</Badge></span>
          </div>
          {!suggestion.hambatan && !suggestion.tindak_lanjut && (
            <div className="mt-1">Belum ada saran hambatan/tindak lanjut yang dapat diturunkan dari data saat ini.</div>
          )}
        </Alert>
      )}
    </div>
  );
}
