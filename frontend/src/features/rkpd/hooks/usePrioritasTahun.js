// File: frontend/src/features/rkpd/hooks/usePrioritasTahun.js
import { useState, useEffect } from 'react';
import api from '../../../services/api';
import { extractListResponse } from '../../../utils/apiResponse';

/**
 * Otomatis resolve tahun data prioritas yang tersedia di DB
 * berdasarkan periode aktif. Coba tahun_awal, tahun_awal-1, tahun_awal+1
 * hingga ada data yang kembali dari endpoint prioritas-nasional.
 */
const usePrioritasTahun = (periodeList, periodeId, jenis_dokumen = 'rkpd') => {
  const [resolvedTahun, setResolvedTahun] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!periodeId || !periodeList?.length) return;

    const periode = periodeList.find((p) => String(p.id) === String(periodeId));
    if (!periode) return;

    const tahunAwal = Number(periode.tahun_awal);
    const candidates = [tahunAwal, tahunAwal - 1, tahunAwal + 1, Number(periode.tahun_akhir)]
      .filter(Boolean)
      .map(String);

    let cancelled = false;
    setLoading(true);
    setResolvedTahun(null);

    (async () => {
      for (const tahun of candidates) {
        try {
          const res = await api.get('/prioritas-nasional', {
            params: { jenis_dokumen, tahun, limit: 1 },
          });
          const { data } = extractListResponse(res.data);
          if (Array.isArray(data) && data.length > 0) {
            if (!cancelled) setResolvedTahun(tahun);
            break;
          }
        } catch {
          // lanjut kandidat berikutnya
        }
      }
      if (!cancelled) setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [periodeId, periodeList, jenis_dokumen]);

  return { resolvedTahun, loading };
};

export default usePrioritasTahun;
