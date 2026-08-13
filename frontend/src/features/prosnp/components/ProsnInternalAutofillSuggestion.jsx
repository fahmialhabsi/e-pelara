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
 * Corrective "ProSN Semester-II Readiness — Sumber Data Authoritative
 * Auto-Sync" (mandat §19) — menyelesaikan tegangan arsitektural "harus selalu
 * current" vs "jangan pernah menimpa teks user" via SATU sinyal otoritatif
 * dari server: `isSumberDataAuto` (`pengisian.sumber_data_is_auto`, dihitung
 * server-side saat save — TIDAK PERNAH dipercaya dari client, lihat
 * prosnpController.updatePengisian).
 *   - `isSumberDataAuto === true` (teks tersimpan PERSIS SAMA dgn saran sistem
 *     terakhir kali disimpan, belum pernah disunting manual): AMAN disegarkan
 *     OTOMATIS setiap kali `skorDihitungAt` berubah — dipanggil lewat
 *     `onAutoRefresh`, TIDAK PERNAH menimpa teks manusia krn menurut definisi
 *     belum ada teks manusia di sini.
 *   - `isSumberDataAuto === false` (user PERNAH menyimpan teks yg berbeda dari
 *     saran sistem): TIDAK PERNAH disegarkan otomatis — kembali ke perilaku
 *     staleness-WARNING-only (mandat §30 "must NOT silently overwrite").
 * Kedua jalur pakai `previewProsnInternalAutofill` yg SAMA (read-only, selalu
 * fresh per panggilan) — tidak ada mekanisme baru, hanya percabangan
 * berdasarkan sinyal otoritatif server.
 */
export default function ProsnInternalAutofillSuggestion({ pengisianId, savedSumberData, isSumberDataAuto, skorDihitungAt, hasExistingContent, onApply, onAutoRefresh, disabled }) {
  const [loading, setLoading] = useState(false);
  const [suggestion, setSuggestion] = useState(null);
  const [stale, setStale] = useState(false);

  useEffect(() => {
    let active = true;
    if (disabled || !pengisianId || !(savedSumberData && savedSumberData.trim())) { setStale(false); return undefined; }
    previewProsnInternalAutofill(pengisianId)
      .then((result) => {
        if (!active) return;
        if (isSumberDataAuto) {
          setStale(false);
          if (result.sumber_data && result.sumber_data.trim() !== savedSumberData.trim()) onAutoRefresh?.(result.sumber_data);
        } else {
          setStale(isSumberDataStale(savedSumberData, result.sumber_data));
        }
      })
      .catch(() => { if (active) setStale(false); });
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pengisianId, skorDihitungAt, disabled, isSumberDataAuto]);

  // Corrective "ProSN Semester-II Readiness — Hambatan/Tindak Lanjut UX"
  // (mandat §27/§28, Req K "SYSTEM SUGGESTION -> USE -> EDIT -> IGNORE") —
  // `search` HANYA mengambil preview (read-only, TIDAK mengisi form) —
  // pemisahan eksplisit dari `apply` supaya user bisa melihat saran DULU
  // sebelum memutuskan Gunakan atau Abaikan (sebelumnya digabung jadi satu
  // klik langsung-terapkan).
  const search = async () => {
    setLoading(true);
    try {
      const result = await previewProsnInternalAutofill(pengisianId);
      setSuggestion(result);
      setStale(false);
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Gagal membuat saran otomatis.');
    } finally {
      setLoading(false);
    }
  };

  const apply = () => {
    if (hasExistingContent && hasExistingContent()) {
      if (!window.confirm('Field catatan internal sudah berisi. Ganti dengan saran sistem?')) return;
    }
    onApply(suggestion);
    setSuggestion(null);
  };
  const ignore = () => setSuggestion(null);

  return (
    <div className="mb-3">
      <Button size="sm" variant="outline-primary" onClick={search} disabled={disabled || loading}>
        {loading ? 'Mencari saran…' : 'Cari Saran Sistem (Catatan Internal)'}
      </Button>
      {stale && (
        <Alert variant="warning" className="mt-2 mb-0 py-2 px-3 small">
          Sumber Data tersimpan kemungkinan sudah tidak mencerminkan data terkini (data register/evidence berubah sejak terakhir diisi) — klik &ldquo;Cari Saran Sistem&rdquo; untuk menyegarkan sebelum disimpan.
        </Alert>
      )}
      {suggestion && (
        <Alert variant="light" className="border mt-2 mb-0 py-2 px-3 small">
          <div className="fst-italic text-muted mb-1">Saran internal sistem (SUGGESTION) — belum diterapkan ke form. Pilih Gunakan untuk mengisi form (tetap dapat diedit sebelum Simpan), atau Abaikan.</div>
          <div className="d-flex gap-3 flex-wrap mb-2">
            <span>Sumber Data <Badge bg={CONFIDENCE_VARIANT[suggestion.confidence?.sumber_data] || 'secondary'}>{suggestion.confidence?.sumber_data || 'NONE'}</Badge></span>
            <span>Hambatan <Badge bg={CONFIDENCE_VARIANT[suggestion.confidence?.hambatan] || 'secondary'}>{suggestion.confidence?.hambatan || 'NONE'}</Badge></span>
            <span>Tindak Lanjut <Badge bg={CONFIDENCE_VARIANT[suggestion.confidence?.tindak_lanjut] || 'secondary'}>{suggestion.confidence?.tindak_lanjut || 'NONE'}</Badge></span>
          </div>
          {!suggestion.hambatan && !suggestion.tindak_lanjut && (
            <div className="mb-2">Belum ada saran hambatan/tindak lanjut yang dapat diturunkan dari data saat ini.</div>
          )}
          <div className="d-flex gap-2">
            <Button size="sm" variant="success" onClick={apply}>Gunakan</Button>
            <Button size="sm" variant="outline-secondary" onClick={ignore}>Abaikan</Button>
          </div>
        </Alert>
      )}
    </div>
  );
}
