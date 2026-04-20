import React, { useState, useRef, useEffect, useCallback } from 'react';
import * as XLSX from 'xlsx';
import api from '@/services/api';

// ── Constants ─────────────────────────────────────────────────────────────────

const ENTITY_TYPES = [
  { value: 'tujuan',         label: 'Tujuan' },
  { value: 'sasaran',        label: 'Sasaran' },
  { value: 'strategi',       label: 'Strategi' },
  { value: 'arah_kebijakan', label: 'Arah Kebijakan' },
  { value: 'program',        label: 'Program' },
  { value: 'kegiatan',       label: 'Kegiatan' },
  { value: 'sub_kegiatan',   label: 'Sub Kegiatan' },
];

const APPROVED_FIELDS = [
  'nama_indikator', 'indikator_kinerja', 'tolok_ukur_kinerja', 'target_kinerja',
  'definisi_operasional', 'metode_penghitungan', 'kriteria_kuantitatif', 'kriteria_kualitatif',
  'target_tahun_1', 'target_tahun_2', 'target_tahun_3', 'target_tahun_4', 'target_tahun_5',
  'sumber_data',
  'capaian_tahun_1', 'capaian_tahun_2', 'capaian_tahun_3', 'capaian_tahun_4', 'capaian_tahun_5',
  'satuan',
];

const CURRENT_YEAR = String(new Date().getFullYear());
const YEAR_OPTIONS = Array.from({ length: 10 }, (_, i) => String(2020 + i));

// ── Step indicators ───────────────────────────────────────────────────────────

const STEPS = ['1. Konteks Batch', '2. Preview Data', '3. Proses & Hasil'];

// ── Main Component ────────────────────────────────────────────────────────────

export default function ImportIndikatorPage() {
  // Batch context
  const [entityType, setEntityType]       = useState('tujuan');
  const [tahun, setTahun]                 = useState(CURRENT_YEAR);
  const [sasaranId, setSasaranId]         = useState('');
  const [strategiId, setStrategiId]       = useState('');
  const [programId, setProgramId]         = useState('');
  const [kegiatanId, setKegiatanId]       = useState('');
  const [tujuanId, setTujuanId]           = useState('');
  const [misiId, setMisiId]               = useState('');

  // File & preview
  const [file, setFile]                   = useState(null);
  const [preview, setPreview]             = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  // Upload
  const [batchId, setBatchId]             = useState(null);
  const [uploadResult, setUploadResult]   = useState(null);
  const [uploadLoading, setUploadLoading] = useState(false);

  // Process
  const [processResult, setProcessResult] = useState(null);
  const [processLoading, setProcessLoading] = useState(false);

  // Step
  const [step, setStep]                   = useState(0);
  const [error, setError]                 = useState('');

  // Final DB data tabs — always fetched fresh from server, never from preview/raw cache
  const [activeTab, setActiveTab]         = useState('tujuan');
  const [finalData, setFinalData]         = useState({});
  const [finalLoading, setFinalLoading]   = useState({});

  const fileRef = useRef();

  // ── Final DB data helpers ─────────────────────────────────────────────────

  const loadFinalData = useCallback(async (tabKey) => {
    setFinalLoading(prev => ({ ...prev, [tabKey]: true }));
    try {
      const res = await api.get('/rpjmd-import/final-list', {
        params: { entity_type: tabKey, tahun, jenis_dokumen: 'RPJMD' },
      });
      setFinalData(prev => ({ ...prev, [tabKey]: res.data?.data ?? [] }));
    } catch {
      setFinalData(prev => ({ ...prev, [tabKey]: [] }));
    } finally {
      setFinalLoading(prev => ({ ...prev, [tabKey]: false }));
    }
  }, [tahun]);

  // Refetch when active tab or tahun changes
  useEffect(() => {
    loadFinalData(activeTab);
  }, [activeTab, tahun, loadFinalData]);

  // Sync active tab with entityType when user changes entity type
  useEffect(() => {
    setActiveTab(entityType);
  }, [entityType]);

  // ── Helpers ────────────────────────────────────────────────────────────────

  function clearError() { setError(''); }

  function buildFormData(includeFile = true) {
    const fd = new FormData();
    if (includeFile && file) fd.append('file', file);
    fd.append('entity_type', entityType);
    fd.append('tahun', tahun);
    if (sasaranId)   fd.append('sasaran_id',   sasaranId);
    if (strategiId)  fd.append('strategi_id',  strategiId);
    if (programId)   fd.append('program_id',   programId);
    if (kegiatanId)  fd.append('kegiatan_id',  kegiatanId);
    if (tujuanId)    fd.append('tujuan_id',    tujuanId);
    if (misiId)      fd.append('misi_id',      misiId);
    return fd;
  }

  // ── Template download ──────────────────────────────────────────────────────

  async function handleDownloadTemplate() {
    try {
      const res = await api.get('/rpjmd-import/template', { responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([res.data]));
      const a   = document.createElement('a');
      a.href    = url;
      a.download = 'template_indikator_rpjmd.xlsx';
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setError('Gagal mengunduh template');
    }
  }

  // ── File selection + client-side preview ──────────────────────────────────

  function handleFileChange(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setPreview(null);
    setUploadResult(null);
    setProcessResult(null);
    setBatchId(null);
    clearError();
  }

  async function handlePreview() {
    if (!file) { setError('Pilih file Excel terlebih dahulu'); return; }
    setPreviewLoading(true);
    clearError();
    try {
      const fd  = buildFormData(true);
      const res = await api.post('/rpjmd-import/preview', fd);
      setPreview(res.data);
      if (res.data.valid) setStep(1);
      else setError(`Header tidak sesuai template. Kolom tidak ada: ${res.data.missing_columns.join(', ')}`);
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setPreviewLoading(false);
    }
  }

  // ── Upload to raw table ────────────────────────────────────────────────────

  async function handleUpload() {
    if (!preview?.valid) { setError('Preview harus valid sebelum upload'); return; }
    setUploadLoading(true);
    clearError();
    try {
      const fd  = buildFormData(true);
      const res = await api.post('/rpjmd-import/upload', fd);
      setUploadResult(res.data);
      setBatchId(res.data.batch_id);
      setStep(2);
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setUploadLoading(false);
    }
  }

  // ── Process batch (call stored procedure) ─────────────────────────────────

  async function handleProcess() {
    if (!batchId) { setError('Tidak ada batch untuk diproses'); return; }
    setProcessLoading(true);
    clearError();
    try {
      const res = await api.post('/rpjmd-import/process', { batch_id: batchId });
      setProcessResult(res.data);
      // Refetch final DB tab for current entity type — no stale state
      await loadFinalData(entityType);
      setActiveTab(entityType);
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setProcessLoading(false);
    }
  }

  // ── Reset ──────────────────────────────────────────────────────────────────

  function handleReset() {
    setFile(null); setPreview(null); setUploadResult(null);
    setProcessResult(null); setBatchId(null);
    setStep(0); clearError();
    if (fileRef.current) fileRef.current.value = '';
  }

  // ── Render helpers ─────────────────────────────────────────────────────────

  const summaryMap = processResult?.summary?.reduce((acc, r) => {
    acc[r.status] = Number(r.count); return acc;
  }, {}) || {};

  // ── JSX ────────────────────────────────────────────────────────────────────

  return (
    <div style={{ maxWidth: 960, margin: '24px auto', padding: '0 16px', fontFamily: 'sans-serif' }}>
      <h2 style={{ marginBottom: 4 }}>Import Indikator RPJMD</h2>
      <p style={{ color: '#666', marginBottom: 20 }}>
        Pipeline: <strong>Excel</strong> → <strong>Raw Import</strong> → <strong>Processor</strong> → <strong>Database</strong>
      </p>

      {/* Step indicator */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        {STEPS.map((s, i) => (
          <div key={i} style={{
            padding: '6px 14px', borderRadius: 4,
            background: step === i ? '#1677ff' : step > i ? '#52c41a' : '#f0f0f0',
            color: step >= i ? '#fff' : '#555', fontSize: 13,
          }}>{s}</div>
        ))}
      </div>

      {error && (
        <div style={{ background: '#fff2f0', border: '1px solid #ffccc7', borderRadius: 4, padding: '8px 12px', marginBottom: 16, color: '#cf1322' }}>
          {error}
        </div>
      )}

      {/* ── STEP 0: Batch context + file selection ── */}
      <Section title="Konteks Batch & Upload File">
        <Row label="Jenis Entity">
          <select value={entityType} onChange={e => { setEntityType(e.target.value); handleReset(); }}
            style={selectStyle}>
            {ENTITY_TYPES.map(et => <option key={et.value} value={et.value}>{et.label}</option>)}
          </select>
        </Row>

        <Row label="Tahun">
          <select value={tahun} onChange={e => setTahun(e.target.value)} style={selectStyle}>
            {YEAR_OPTIONS.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </Row>

        {/* Optional FK context — not from Excel, from user selection */}
        {entityType === 'sasaran' && (
          <Row label="Sasaran ID (opsional)">
            <input style={inputStyle} type="number" placeholder="ID Sasaran"
              value={sasaranId} onChange={e => setSasaranId(e.target.value)} />
            <small style={{ color: '#888' }}>Diperlukan agar indikator dapat diproses ke DB final</small>
          </Row>
        )}
        {['strategi', 'arah_kebijakan'].includes(entityType) && (
          <Row label="Tujuan ID (opsional)">
            <input style={inputStyle} type="number" placeholder="ID Tujuan"
              value={tujuanId} onChange={e => setTujuanId(e.target.value)} />
          </Row>
        )}
        {['program', 'kegiatan', 'sub_kegiatan'].includes(entityType) && (
          <Row label="Program ID (opsional)">
            <input style={inputStyle} type="number" placeholder="ID Program"
              value={programId} onChange={e => setProgramId(e.target.value)} />
          </Row>
        )}

        <Row label="File Excel">
          <input ref={fileRef} type="file" accept=".xlsx,.xls" onChange={handleFileChange}
            style={{ display: 'block', marginBottom: 6 }} />
          {file && <small style={{ color: '#555' }}>{file.name} ({(file.size / 1024).toFixed(1)} KB)</small>}
        </Row>

        <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
          <Btn onClick={handleDownloadTemplate} variant="outline">↓ Download Template</Btn>
          <Btn onClick={handlePreview} disabled={!file || previewLoading}>
            {previewLoading ? 'Memvalidasi...' : 'Validasi & Preview'}
          </Btn>
        </div>
      </Section>

      {/* ── STEP 1: Preview ── */}
      {preview && (
        <Section title={`Preview Data (${preview.total_rows} baris total)`}>
          {preview.extra_columns.length > 0 && (
            <div style={{ color: '#fa8c16', marginBottom: 8, fontSize: 13 }}>
              ⚠ Kolom tidak dikenal diabaikan: {preview.extra_columns.join(', ')}
            </div>
          )}
          <div style={{ overflowX: 'auto', marginBottom: 12 }}>
            <table style={{ borderCollapse: 'collapse', fontSize: 12, width: '100%' }}>
              <thead>
                <tr style={{ background: '#fafafa' }}>
                  <th style={th}>#</th>
                  {APPROVED_FIELDS.map(f => <th key={f} style={th}>{f}</th>)}
                </tr>
              </thead>
              <tbody>
                {preview.preview.map((row, i) => (
                  <tr key={i} style={{ background: i % 2 ? '#fafafa' : '#fff' }}>
                    <td style={td}>{i + 1}</td>
                    {APPROVED_FIELDS.map(f => (
                      <td key={f} style={{ ...td, maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                        title={row[f]}>{row[f] || '-'}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <Btn variant="outline" onClick={handleReset}>← Ulangi</Btn>
            <Btn onClick={handleUpload} disabled={uploadLoading}>
              {uploadLoading ? 'Mengupload...' : `Upload ${preview.total_rows} Baris ke Raw Table`}
            </Btn>
          </div>
        </Section>
      )}

      {/* ── STEP 2: Process ── */}
      {uploadResult && (
        <Section title="Batch Siap Diproses">
          <InfoGrid items={[
            ['Batch ID',    uploadResult.batch_id],
            ['Entity Type', uploadResult.entity_type],
            ['Tahun',       uploadResult.tahun],
            ['Periode ID',  uploadResult.periode_id ?? '(tidak ditemukan)'],
            ['Total Baris', uploadResult.total_rows],
          ]} />
          {!processResult && (
            <div style={{ marginTop: 12 }}>
              <Btn onClick={handleProcess} disabled={processLoading} variant="success">
                {processLoading ? 'Memproses...' : '▶ Jalankan Processor (Insert ke DB Final)'}
              </Btn>
            </div>
          )}
        </Section>
      )}

      {/* ── Process Result ── */}
      {processResult && (
        <Section title="Hasil Proses">
          <div style={{ display: 'flex', gap: 16, marginBottom: 16, flexWrap: 'wrap' }}>
            {[
              { label: 'Berhasil',  key: 'processed', color: '#52c41a' },
              { label: 'Error',     key: 'error',     color: '#ff4d4f' },
              { label: 'Duplikat', key: 'warning',   color: '#fa8c16' },
              { label: 'Skipped',  key: 'skipped',   color: '#8c8c8c' },
            ].map(({ label, key, color }) => (
              <div key={key} style={{ background: '#fafafa', border: '1px solid #d9d9d9', borderRadius: 6, padding: '10px 20px', textAlign: 'center' }}>
                <div style={{ fontSize: 24, fontWeight: 700, color }}>{summaryMap[key] ?? 0}</div>
                <div style={{ fontSize: 12, color: '#555' }}>{label}</div>
              </div>
            ))}
          </div>

          {processResult.logs?.length > 0 && (
            <details>
              <summary style={{ cursor: 'pointer', marginBottom: 8, fontSize: 13 }}>Log Detail ({processResult.logs.length} entri)</summary>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ borderCollapse: 'collapse', fontSize: 12, width: '100%' }}>
                  <thead>
                    <tr style={{ background: '#fafafa' }}>
                      {['Entity', 'Target', 'Status', 'Pesan', 'Waktu'].map(h => <th key={h} style={th}>{h}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {processResult.logs.map((l, i) => (
                      <tr key={i}>
                        <td style={td}>{l.entity_type}</td>
                        <td style={td}>{l.target_table}</td>
                        <td style={{ ...td, color: l.status === 'error' ? '#cf1322' : l.status === 'processed' ? '#389e0d' : '#d46b08' }}>
                          {l.status}
                        </td>
                        <td style={td}>{l.message || '-'}</td>
                        <td style={td}>{l.created_at}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          )}

          <div style={{ marginTop: 16 }}>
            <Btn variant="outline" onClick={handleReset}>↺ Import Baru</Btn>
          </div>
        </Section>
      )}
      {/* ── SECTION: Data Final DB — always reads from final tables, never from preview/raw ── */}
      <div style={{ background: '#fff', border: '1px solid #e8e8e8', borderRadius: 6, padding: 20, marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h3 style={{ margin: 0, fontSize: 15 }}>Data Final DB (Bukan Preview)</h3>
          <Btn variant="outline" onClick={() => loadFinalData(activeTab)} disabled={finalLoading[activeTab]}>
            {finalLoading[activeTab] ? '...' : '↻ Refresh'}
          </Btn>
        </div>

        {/* Tab buttons */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 12, flexWrap: 'wrap' }}>
          {ENTITY_TYPES.map(et => (
            <button
              key={et.value}
              onClick={() => setActiveTab(et.value)}
              style={{
                padding: '5px 12px', borderRadius: 4, fontSize: 12, cursor: 'pointer',
                background: activeTab === et.value ? '#1677ff' : '#f0f0f0',
                color: activeTab === et.value ? '#fff' : '#555',
                border: activeTab === et.value ? 'none' : '1px solid #d9d9d9',
                fontWeight: activeTab === et.value ? 600 : 400,
              }}
            >
              {et.label}
            </button>
          ))}
        </div>

        {/* Tab content — always fresh from server */}
        {finalLoading[activeTab] ? (
          <div style={{ padding: 20, textAlign: 'center', color: '#888' }}>Memuat data final...</div>
        ) : !finalData[activeTab] || finalData[activeTab].length === 0 ? (
          <div style={{ padding: 20, textAlign: 'center', color: '#aaa', background: '#fafafa', borderRadius: 4, border: '1px dashed #d9d9d9' }}>
            Tidak ada data di tabel final untuk entity <strong>{activeTab}</strong> dan tahun <strong>{tahun}</strong>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <div style={{ fontSize: 12, color: '#888', marginBottom: 6 }}>
              {finalData[activeTab].length} baris ditemukan di DB final
            </div>
            <table style={{ borderCollapse: 'collapse', fontSize: 12, width: '100%' }}>
              <thead>
                <tr style={{ background: '#fafafa' }}>
                  {['#', 'Kode', 'Nama Indikator', 'Indikator Kinerja', 'Tipe', 'Tahun', 'Jenis Dokumen'].map(h =>
                    <th key={h} style={th}>{h}</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {finalData[activeTab].map((row, i) => (
                  <tr key={row.id || i} style={{ background: i % 2 ? '#fafafa' : '#fff' }}>
                    <td style={td}>{i + 1}</td>
                    <td style={td}>{row.kode_indikator || '-'}</td>
                    <td style={{ ...td, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                        title={row.nama_indikator}>{row.nama_indikator || '-'}</td>
                    <td style={{ ...td, maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                        title={row.indikator_kinerja}>{row.indikator_kinerja || '—'}</td>
                    <td style={td}>{row.tipe_indikator || '-'}</td>
                    <td style={td}>{row.tahun || '-'}</td>
                    <td style={td}>{row.jenis_dokumen || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Section({ title, children }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #e8e8e8', borderRadius: 6, padding: 20, marginBottom: 20 }}>
      <h3 style={{ marginTop: 0, marginBottom: 16, fontSize: 15 }}>{title}</h3>
      {children}
    </div>
  );
}

function Row({ label, children }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr', gap: '8px 16px', alignItems: 'start', marginBottom: 12 }}>
      <label style={{ paddingTop: 6, fontSize: 13, color: '#333' }}>{label}</label>
      <div>{children}</div>
    </div>
  );
}

function InfoGrid({ items }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 8 }}>
      {items.map(([k, v]) => (
        <div key={k} style={{ background: '#fafafa', border: '1px solid #e8e8e8', borderRadius: 4, padding: '8px 12px' }}>
          <div style={{ fontSize: 11, color: '#888', marginBottom: 2 }}>{k}</div>
          <div style={{ fontSize: 13, fontWeight: 600, wordBreak: 'break-all' }}>{v}</div>
        </div>
      ))}
    </div>
  );
}

function Btn({ children, onClick, disabled, variant = 'primary' }) {
  const bg = variant === 'primary' ? '#1677ff' : variant === 'success' ? '#52c41a' : '#fff';
  const color = variant === 'outline' ? '#1677ff' : '#fff';
  const border = variant === 'outline' ? '1px solid #1677ff' : 'none';
  return (
    <button onClick={onClick} disabled={disabled}
      style={{
        padding: '7px 18px', borderRadius: 4, cursor: disabled ? 'not-allowed' : 'pointer',
        background: disabled ? '#d9d9d9' : bg, color: disabled ? '#999' : color,
        border: disabled ? '1px solid #d9d9d9' : border, fontSize: 13,
      }}>
      {children}
    </button>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const selectStyle = { padding: '5px 8px', borderRadius: 4, border: '1px solid #d9d9d9', fontSize: 13, width: 200 };
const inputStyle  = { padding: '5px 8px', borderRadius: 4, border: '1px solid #d9d9d9', fontSize: 13, width: 200, display: 'block' };
const th = { border: '1px solid #e8e8e8', padding: '5px 8px', textAlign: 'left', whiteSpace: 'nowrap', fontWeight: 600 };
const td = { border: '1px solid #f0f0f0', padding: '4px 8px', fontSize: 12 };
