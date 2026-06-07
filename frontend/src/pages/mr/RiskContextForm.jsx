// File : frontend/src/pages/mr/RiskContextForm.jsx
import React, { useState, useEffect } from 'react';
import api from '@/services/api'; // Menggunakan instans API terpusat e-Pelara

const RiskContextForm = ({ renstraId, onIndicatorSelected }) => {
  // State untuk melacak ID referensi struktural terpilih
  const [selectedProgramRef, setSelectedProgramRef] = useState('');
  const [selectedKegiatanRef, setSelectedKegiatanRef] = useState('');

  // State penyimpanan data list dari API
  const [listProgram, setListProgram] = useState([]);
  const [listKegiatan, setListKegiatan] = useState([]);
  const [listSubKegiatan, setListSubKegiatan] = useState([]);

  // State akhir untuk ID Indikator Renstra terpilih & Jalur Dampaknya
  const [finalIndicatorId, setFinalIndicatorId] = useState('');
  const [propagationPath, setPropagationPath] = useState([]);
  const [loading, setLoading] = useState(false);

  // 1. Ambil Level Tertinggi (Program) saat komponen dimuat / berubah
  useEffect(() => {
    if (renstraId) {
      setLoading(true);
      api
        .get(`/indikator-renstra/cascading/list?renstra_id=${renstraId}&target_stage=program`)
        .then((res) => setListProgram(res.data))
        .catch((err) => console.error('Gagal memuat program:', err))
        .finally(() => setLoading(false));
    } else {
      // Jika renstraId kosong (efek reset), bersihkan semua state dropdown
      setListProgram([]);
      setListKegiatan([]);
      setListSubKegiatan([]);
      setSelectedProgramRef('');
      setSelectedKegiatanRef('');
    }
  }, [renstraId]);

  // 2. Ambil Level Kegiatan ketika Program dipilih (Dan reset anak-anaknya)
  useEffect(() => {
    if (selectedProgramRef) {
      api
        .get(
          `/indikator-renstra/cascading/list?renstra_id=${renstraId}&target_stage=kegiatan&parent_ref_id=${selectedProgramRef}`,
        )
        .then((res) => setListKegiatan(res.data))
        .catch((err) => console.error('Gagal memuat kegiatan:', err));
    } else {
      setListKegiatan([]);
    }
    // Pengosongan Berantai (Cascading Reset Pattern)
    setSelectedKegiatanRef('');
    setListSubKegiatan([]);
    setFinalIndicatorId('');
  }, [selectedProgramRef, renstraId]);

  // 3. Ambil Level Sub-Kegiatan ketika Kegiatan dipilih
  useEffect(() => {
    if (selectedKegiatanRef) {
      api
        .get(
          `/indikator-renstra/cascading/list?renstra_id=${renstraId}&target_stage=sub_kegiatan&parent_ref_id=${selectedKegiatanRef}`,
        )
        .then((res) => setListSubKegiatan(res.data))
        .catch((err) => console.error('Gagal memuat sub-kegiatan:', err));
    } else {
      setListSubKegiatan([]);
    }
    setFinalIndicatorId('');
  }, [selectedKegiatanRef, renstraId]);

  // 4. Deteksi Efek Penularan Risiko saat Indikator Final ditentukan
  useEffect(() => {
    if (finalIndicatorId) {
      api
        .get(`/indikator-renstra/${finalIndicatorId}/propagation`)
        .then((res) => {
          setPropagationPath(res.data.propagation_path || []);
          onIndicatorSelected(finalIndicatorId); // Kirim ke Form Utama MrPlanningRisk
        })
        .catch((err) => console.error('Gagal menganalisis dampak:', err));
    } else {
      setPropagationPath([]);
    }
  }, [finalIndicatorId, onIndicatorSelected]);

  return (
    <div
      className="card-body"
      style={{ background: '#f8f9fa', borderRadius: '8px', padding: '20px' }}
    >
      <h5 className="text-primary mb-3">📍 Konteks Sumber Risiko Perencanaan</h5>

      {loading && <p className="text-muted">Sedang menyinkronkan data Renstra...</p>}

      {/* DROPDOWN LEVEL 1: PROGRAM */}
      <div className="form-group mb-3">
        <label className="form-label font-weight-bold">1. Program Kerja</label>
        <select
          className="form-control form-select"
          value={selectedProgramRef}
          onChange={(e) => {
            setSelectedProgramRef(e.target.value);
            const selected = listProgram.find((p) => p.ref_id === Number(e.target.value));
            if (selected) setFinalIndicatorId(selected.id);
          }}
        >
          <option value="">-- Pilih Program --</option>
          {listProgram.map((p) => (
            <option key={p.id} value={p.ref_id}>
              [{p.kode_indikator}] {p.nama_indikator}
            </option>
          ))}
        </select>
      </div>

      {/* DROPDOWN LEVEL 2: KEGIATAN */}
      <div className="form-group mb-3">
        <label className="form-label font-weight-bold">
          2. Kegiatan (Akan aktif jika program dipilih)
        </label>
        <select
          className="form-control form-select"
          value={selectedKegiatanRef}
          onChange={(e) => {
            setSelectedKegiatanRef(e.target.value);
            const selected = listKegiatan.find((k) => k.ref_id === Number(e.target.value));
            if (selected) setFinalIndicatorId(selected.id);
          }}
          disabled={!selectedProgramRef || listKegiatan.length === 0}
        >
          <option value="">-- Pilih Kegiatan --</option>
          {listKegiatan.map((k) => (
            <option key={k.id} value={k.ref_id}>
              [{k.kode_indikator}] {k.nama_indikator}
            </option>
          ))}
        </select>
      </div>

      {/* DROPDOWN LEVEL 3: SUB-KEGIATAN */}
      <div className="form-group mb-3">
        <label className="form-label font-weight-bold">
          3. Sub-Kegiatan (Aktivitas Lapangan PPTK)
        </label>
        <select
          className="form-control form-select"
          onChange={(e) => setFinalIndicatorId(e.target.value)}
          disabled={!selectedKegiatanRef || listSubKegiatan.length === 0}
        >
          <option value="">-- Pilih Sub-Kegiatan --</option>
          {listSubKegiatan.map((sk) => (
            <option key={sk.id} value={sk.id}>
              [{sk.kode_indikator}] {sk.nama_indikator}
            </option>
          ))}
        </select>
      </div>

      {/* VISUALISASI DETEKSI PENULARAN RISIKO (RISK PROPAGATION PANEL) */}
      {propagationPath.length > 0 && (
        <div
          className="mt-4 p-3 style-propagation"
          style={{ borderLeft: '4px solid #ffc107', backgroundColor: '#fffbeb' }}
        >
          <span style={{ fontWeight: '700', color: '#856404' }}>
            ⚠️ Simulasi Rambatan Dampak Kegagalan:
          </span>
          <p className="small text-muted my-1">
            Jika risiko pada indikator target gagal dikendalikan, maka akan menggagalkan capaian
            makro di atasnya:
          </p>

          <div className="d-flex flex-column gap-1 mt-2">
            {propagationPath.map((path, idx) => (
              <div
                key={idx}
                className="small d-flex align-items-center"
                style={{ marginLeft: `${idx * 12}px` }}
              >
                {idx > 0 && <span className="text-muted mr-1">↳</span>}
                <span
                  className="badge badge-secondary mr-2"
                  style={{ fontSize: '10px', textTransform: 'uppercase' }}
                >
                  {path.stage}
                </span>
                <span
                  className={
                    idx === propagationPath.length - 1
                      ? 'font-weight-bold text-danger'
                      : 'text-dark'
                  }
                >
                  {path.nama}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};;

export default RiskContextForm;
