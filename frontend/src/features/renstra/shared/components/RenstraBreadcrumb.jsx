import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '@/services/api';

const truncate = (str, n = 50) => (str && str.length > n ? str.substring(0, n) + '...' : str);

export default function RenstraBreadcrumb({ chain = [] }) {
  const navigate = useNavigate();

  if (!chain || chain.length === 0) return null;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 4,
        padding: '8px 12px',
        marginBottom: 16,
        background: '#f0f6ff',
        border: '0.5px solid #b6d4fe',
        borderRadius: 8,
        fontSize: 13,
      }}
    >
      <span style={{ color: '#6c757d' }}>📍</span>
      {chain.map((item, idx) => (
        <span key={idx} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          {idx > 0 && <span style={{ color: '#adb5bd' }}>›</span>}
          {item.path ? (
            <button
              onClick={() => navigate(item.path)}
              style={{
                background: 'none',
                border: 'none',
                padding: 0,
                color: '#0d6efd',
                cursor: 'pointer',
                fontSize: 13,
              }}
            >
              {truncate(item.label)}
            </button>
          ) : (
            <span style={{ color: '#212529', fontWeight: 500 }}>{truncate(item.label)}</span>
          )}
        </span>
      ))}
    </div>
  );
}

export function useRenstraBreadcrumb({
  renstraAktif,
  kebijakanId,
  strategiId,
  sasaranId,
  tujuanId,
  currentLabel,
}) {
  const [chain, setChain] = useState([]);

  useEffect(() => {
    const build = async () => {
      const items = [];

      items.push({ label: 'Dashboard Renstra', path: '/dashboard-renstra' });

      if (tujuanId) {
        try {
          const res = await api.get(`/renstra-tabel-tujuan`, {
            params: { tujuan_id: tujuanId },
          });
          const rows = Array.isArray(res.data) ? res.data : (res.data?.data ?? []);
          const d = rows[0];
          items.push({
            label: d
              ? `${d.no_tujuan || d.kode_tujuan || 'Tujuan'} — ${d.isi_tujuan || d.nama_tujuan || ''}`
              : 'Tujuan',
            path: '/renstra/tabel/tujuan',
          });
        } catch {
          items.push({ label: 'Tujuan', path: '/renstra/tabel/tujuan' });
        }
      }

      if (sasaranId) {
        try {
          const res = await api.get(`/renstra-tabel-sasaran`, {
            params: { sasaran_id: sasaranId },
          });
          const rows = Array.isArray(res.data) ? res.data : (res.data?.data ?? []);
          const d = rows[0];
          const kode = d?.sasaran_rpjmd?.nomor || d?.kode_sasaran || 'Sasaran';
          const nama = d?.sasaran_rpjmd?.isi_sasaran || d?.nama_sasaran || '';
          items.push({ label: `${kode} — ${nama}`, path: '/renstra/tabel/sasaran' });
        } catch {
          items.push({ label: 'Sasaran', path: '/renstra/tabel/sasaran' });
        }
      }

      if (strategiId) {
        try {
          const res = await api.get(`/renstra-tabel-strategi`, {
            params: { strategi_id: strategiId },
          });
          const rows = Array.isArray(res.data) ? res.data : (res.data?.data ?? []);
          const d = rows[0];
          const kode = d?.kode_strategi || 'Strategi';
          const nama = d?.deskripsi_strategi || d?.strategi?.deskripsi || '';
          items.push({ label: `${kode} — ${nama}`, path: '/renstra/tabel/strategi' });
        } catch {
          items.push({ label: 'Strategi', path: '/renstra/tabel/strategi' });
        }
      }

      if (kebijakanId) {
        try {
          const res = await api.get(`/renstra-tabel-arah-kebijakan/${kebijakanId}`);
          const d = res.data;
          items.push({
            label: `${d.kode_kebijakan || 'Arah Kebijakan'} — ${d.deskripsi_kebijakan || ''}`,
            path: '/renstra/tabel/arah-kebijakan',
          });
        } catch {
          items.push({ label: 'Arah Kebijakan', path: '/renstra/tabel/arah-kebijakan' });
        }
      }

      if (currentLabel) {
        items.push({ label: currentLabel, path: null });
      }

      setChain(items);
    };

    build();
  }, [tujuanId, sasaranId, strategiId, kebijakanId, currentLabel]);

  return chain;
}
