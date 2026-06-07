import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardBody, Spinner } from 'react-bootstrap';

const CHAIN = [
  {
    key: 'tujuan',
    label: 'Tujuan',
    icon: '🎯',
    addPath: '/renstra/tabel/tujuan/add',
    listPath: '/renstra/tabel/tujuan',
    childLabel: 'Sasaran',
    childKey: 'sasaran',
  },
  {
    key: 'sasaran',
    label: 'Sasaran',
    icon: '📋',
    addPath: '/renstra/tabel/sasaran/add',
    listPath: '/renstra/tabel/sasaran',
    childLabel: 'Strategi',
    childKey: 'strategi',
  },
  {
    key: 'strategi',
    label: 'Strategi',
    icon: '🗺️',
    addPath: '/renstra/tabel/strategi/add',
    listPath: '/renstra/tabel/strategi',
    childLabel: 'Arah Kebijakan',
    childKey: 'arah_kebijakan',
  },
  {
    key: 'arah_kebijakan',
    label: 'Arah Kebijakan',
    icon: '📌',
    addPath: '/renstra/tabel/arah-kebijakan/add',
    listPath: '/renstra/tabel/arah-kebijakan',
    childLabel: 'Program',
    childKey: 'program',
  },
  {
    key: 'program',
    label: 'Program',
    icon: '📦',
    addPath: '/renstra/tabel/program/add',
    listPath: '/renstra/tabel/program',
    childLabel: 'Kegiatan',
    childKey: 'kegiatan',
  },
  {
    key: 'kegiatan',
    label: 'Kegiatan',
    icon: '⚙️',
    addPath: '/renstra/tabel/kegiatan/add',
    listPath: '/renstra/tabel/kegiatan',
    childLabel: 'Sub Kegiatan',
    childKey: 'sub_kegiatan',
  },
  {
    key: 'sub_kegiatan',
    label: 'Sub Kegiatan',
    icon: '🔹',
    addPath: '/renstra/tabel/subkegiatan/add',
    listPath: '/renstra/tabel/subkegiatan',
    childLabel: null,
    childKey: null,
  },
];

const getStatus = (count) => {
  if (count === null) return { label: 'Memuat...', variant: 'secondary' };
  if (count === 0) return { label: 'Belum ada', variant: 'warning' };
  return { label: `${count} data`, variant: 'success' };
};

export default function RenstraChainNavigator({ stats, loadingStats }) {
  const navigate = useNavigate();
  const [openKey, setOpenKey] = useState(null);
  const toggle = (key) => setOpenKey((prev) => (prev === key ? null : key));

  return (
    <Card className="shadow-sm border-0 mb-4">
      <CardBody>
        <h6 className="fw-bold mb-1">Navigator Chain Renstra</h6>
        <p className="text-muted small mb-3">
          Klik level untuk melihat status dan aksi cepat. Isi dari atas ke bawah secara berurutan.
        </p>
        <div style={{ position: 'relative' }}>
          {CHAIN.map((item, idx) => {
            const count = stats?.[item.key] ?? null;
            const status = getStatus(loadingStats ? null : count);
            const isOpen = openKey === item.key;
            const isLast = idx === CHAIN.length - 1;
            return (
              <div key={item.key} style={{ display: 'flex', alignItems: 'stretch', gap: 0 }}>
                <div
                  style={{
                    width: 32,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    flexShrink: 0,
                  }}
                >
                  {idx > 0 && <div style={{ width: 2, height: 12, background: '#dee2e6' }} />}
                  <div
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: '50%',
                      background: count > 0 ? '#198754' : '#dee2e6',
                      border: '2px solid #fff',
                      outline: '1.5px solid #dee2e6',
                      flexShrink: 0,
                    }}
                  />
                  {!isLast && (
                    <div style={{ width: 2, flex: 1, background: '#dee2e6', minHeight: 12 }} />
                  )}
                </div>
                <div style={{ flex: 1, paddingBottom: isLast ? 0 : 4 }}>
                  <div
                    onClick={() => toggle(item.key)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 12px',
                      marginBottom: 4,
                      border: `0.5px solid ${isOpen ? '#0d6efd' : '#dee2e6'}`,
                      borderRadius: 8,
                      cursor: 'pointer',
                      background: isOpen ? '#e7f1ff' : '#fff',
                      transition: 'all 0.15s',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: 18 }}>{item.icon}</span>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 500 }}>{item.label}</div>
                        {!loadingStats && (
                          <div style={{ fontSize: 12, color: '#6c757d' }}>
                            {count === 0 ? 'Belum ada data' : `${count} data tersedia`}
                          </div>
                        )}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {loadingStats ? (
                        <Spinner animation="border" size="sm" variant="secondary" />
                      ) : (
                        <span className={`badge bg-${status.variant}`} style={{ fontSize: 11 }}>
                          {status.label}
                        </span>
                      )}
                      <span style={{ color: '#6c757d', fontSize: 12 }}>{isOpen ? '▲' : '▼'}</span>
                    </div>
                  </div>
                  {isOpen && (
                    <div
                      style={{
                        margin: '0 0 8px 0',
                        padding: '10px 14px',
                        border: '0.5px solid #b6d4fe',
                        borderRadius: 8,
                        background: '#f0f6ff',
                      }}
                    >
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={() => navigate(item.listPath)}
                        >
                          Lihat Daftar {item.label}
                        </button>
                        <button
                          className="btn btn-outline-primary btn-sm"
                          onClick={() => navigate(item.addPath)}
                        >
                          + Tambah {item.label}
                        </button>
                        {item.childLabel && count > 0 && (
                          <button
                            className="btn btn-outline-secondary btn-sm"
                            onClick={() => setOpenKey(item.childKey)}
                          >
                            Lanjut ke {item.childLabel} →
                          </button>
                        )}
                      </div>
                      {count === 0 && (
                        <div style={{ fontSize: 12, color: '#856404', marginTop: 8 }}>
                          ⚠️ Belum ada data {item.label}. Tambahkan terlebih dahulu sebelum
                          melanjutkan ke level berikutnya.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardBody>
    </Card>
  );
}
