import React, { useEffect, useState } from 'react';
import { Alert, Badge, Button } from 'react-bootstrap';
import { toast } from 'react-toastify';
import { previewProsnInternalAutofill } from '../services/prosnpApi';

const CONFIDENCE_VARIANT = { HIGH: 'success', MEDIUM: 'warning', LOW: 'secondary', NONE: 'secondary' };

/**
 * Corrective "ProSN Semester-II Readiness — Sumber Data Staleness" (mandat
 * §19/§45) — bandingkan teks Sumber Data TERSIMPAN dgn saran SEGAR (dihitung
 * ulang dari fakta terkini, murni baca, `previewProsnInternalAutofill` sudah
 * selalu fresh per panggilan) MURNI FUNGSI, testable tanpa render. Deteksi
 * SENGAJA tidak pernah menyamakan string kosong dgn "stale" — hanya
 * membandingkan bila KEDUANYA punya isi (kalau tersimpan kosong, itu bukan
 * staleness, itu belum pernah diisi sama sekali).
 */
export function isSumberDataStale(savedSumberData, freshSumberData) {
  const saved = (savedSumberData || '').trim();
  const fresh = (freshSumberData || '').trim();
  if (!saved || !fresh) return false;
  return saved !== fresh;
}

/**
 * Saran internal (Sumber Data/Hambatan/Tindak Lanjut) untuk B.1.1-B.1.4 —
 * murni preview via API, TIDAK PERNAH menyimpan ke DB sendiri (mandat
 * "Internal Field Autofill B.1.1-B.1.4" §3). Hasil hanya mengisi state form
 * lokal parent lewat `onApply`; penyimpanan tetap lewat tombol Simpan yang
 * sudah ada.
 *
 * Corrective "ProSN Semester-II Readiness — Sumber Data Staleness" (mandat
 * §19/§45 "Sumber Data must refresh... eliminate stale-data behavior"):
 * TIDAK PERNAH menimpa teks tersimpan secara diam-diam (mandat §30 "must NOT
 * silently overwrite") — sebagai gantinya, deteksi staleness berjalan
 * OTOMATIS di latar belakang (murni baca, tidak mengisi form) setiap kali
 * `skorDihitungAt` berubah (proxy fakta material berubah, mis. setelah
 * auto-recalc §20) dan menampilkan PERINGATAN eksplisit bila teks tersimpan
 * sudah tidak cocok dgn fakta terkini — user tetap yang memutuskan
 * menyegarkan lewat tombol yang sudah ada.
 */
export default function ProsnInternalAutofillSuggestion({ pengisianId, savedSumberData, skorDihitungAt, hasExistingContent, onApply, disabled }) {
  const [loading, setLoading] = useState(false);
  const [suggestion, setSuggestion] = useState(null);
  const [stale, setStale] = useState(false);

  useEffect(() => {
    let active = true;
    if (disabled || !pengisianId || !(savedSumberData && savedSumberData.trim())) { setStale(false); return undefined; }
    previewProsnInternalAutofill(pengisianId)
      .then((result) => { if (active) setStale(isSumberDataStale(savedSumberData, result.sumber_data)); })
      .catch(() => { if (active) setStale(false); });
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pengisianId, skorDihitungAt, disabled]);

  const generate = async () => {
    setLoading(true);
    try {
      const result = await previewProsnInternalAutofill(pengisianId);
      if (hasExistingContent && hasExistingContent()) {
        if (!window.confirm('Field catatan internal sudah berisi. Ganti dengan saran sistem?')) return;
      }
      onApply(result);
      setSuggestion(result);
      setStale(false);
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
      {stale && (
        <Alert variant="warning" className="mt-2 mb-0 py-2 px-3 small">
          Sumber Data tersimpan kemungkinan sudah tidak mencerminkan data terkini (data register/evidence berubah sejak terakhir diisi) — klik &ldquo;Isi Otomatis Catatan Internal&rdquo; untuk menyegarkan sebelum disimpan.
        </Alert>
      )}
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
