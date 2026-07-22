// Halaman terpadu: filter cascading Tujuan->Sasaran->Program->Kegiatan->Sub Kegiatan,
// tiap level tampilkan target + input realisasi supaya tidak salah isi.
import React, { useCallback, useEffect, useState } from 'react';
import { Card, Form, Row, Col, Spinner, Alert, Button } from 'react-bootstrap';
import api from '@/services/api';
import { useDokumen } from '../../../hooks/useDokumen';
import {
  getHierarchy,
  upsertRealisasiIndikator,
  getDpaOptions,
  getAllPengkeg,
  createPengkeg,
  updatePengkeg,
  deletePengkeg,
} from '../services/lpkDispangApi';
import LpkDispangForm from './LpkDispangForm';
import LpkDispangTable from './LpkDispangTable';

const IndikatorCard = ({ title, items, tahun, onSaved }) => {
  // Tidak sinkron dari props lewat effect — parent wajib kasih key unik per node
  // (lihat pemakaian di bawah) supaya remount & rows terisi ulang saat node berganti.
  const [rows, setRows] = useState(() => items);
  const [saving, setSaving] = useState({});

  if (!rows.length) return null;

  const handleChange = (id, value) => {
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, nilai_realisasi: value } : r)));
  };

  const handleSave = async (row) => {
    setSaving((s) => ({ ...s, [row.id]: true }));
    try {
      await upsertRealisasiIndikator({
        indikator_renstra_id: row.id,
        tahun,
        nilai_realisasi: row.nilai_realisasi === '' ? null : Number(row.nilai_realisasi),
      });
      onSaved?.();
    } finally {
      setSaving((s) => ({ ...s, [row.id]: false }));
    }
  };

  return (
    <Card className="mb-3">
      <Card.Header className="bg-light fw-semibold small">{title}</Card.Header>
      <Card.Body className="p-3">
        {rows.map((row) => (
          <Row key={row.id} className="align-items-center g-2 mb-2 pb-2 border-bottom">
            <Col md={5}>
              <div className="small">{row.nama_indikator}</div>
              <div className="text-muted" style={{ fontSize: 11 }}>
                Satuan: {row.satuan || '-'}
              </div>
            </Col>
            <Col md={2}>
              <div className="small text-muted">Target</div>
              <div className="fw-semibold">{row.target ?? '-'}</div>
            </Col>
            <Col md={3}>
              <Form.Control
                size="sm"
                type="number"
                placeholder="Realisasi"
                value={row.nilai_realisasi ?? ''}
                onChange={(e) => handleChange(row.id, e.target.value)}
              />
            </Col>
            <Col md={2}>
              <Button
                size="sm"
                variant="primary"
                className="w-100"
                disabled={saving[row.id]}
                onClick={() => handleSave(row)}
              >
                {saving[row.id] ? '...' : 'Simpan'}
              </Button>
            </Col>
          </Row>
        ))}
      </Card.Body>
    </Card>
  );
};

const RealisasiKinerjaTerpadu = () => {
  const { tahun } = useDokumen();
  const [renstraId, setRenstraId] = useState(null);
  const [periodeId, setPeriodeId] = useState(null);
  const [tree, setTree] = useState([]);
  const [loading, setLoading] = useState(true);

  const [tujuanId, setTujuanId] = useState('');
  const [sasaranId, setSasaranId] = useState('');
  const [programId, setProgramId] = useState('');
  const [kegiatanId, setKegiatanId] = useState('');
  const [dpaId, setDpaId] = useState('');
  const [dpaOptions, setDpaOptions] = useState([]);
  const [existingPengkeg, setExistingPengkeg] = useState(null);
  const [historyRows, setHistoryRows] = useState([]);

  useEffect(() => {
    api
      .get('/renstra-opd/aktif')
      .then((res) => setRenstraId(res.data?.data?.id || null))
      .catch(() => setRenstraId(null));
  }, []);

  useEffect(() => {
    if (!tahun) return;
    api
      .get('/periode-rpjmd')
      .then((res) => {
        const list = res.data?.data || [];
        const match = list.find(
          (p) => Number(tahun) >= Number(p.tahun_awal) && Number(tahun) <= Number(p.tahun_akhir),
        );
        setPeriodeId(match?.id || list[0]?.id || null);
      })
      .catch(() => setPeriodeId(null));
  }, [tahun]);

  const reloadTree = useCallback(() => {
    if (!renstraId || !tahun) return;
    getHierarchy({ renstra_id: renstraId, tahun })
      .then(setTree)
      .catch(() => setTree([]))
      .finally(() => setLoading(false));
  }, [renstraId, tahun]);

  const reloadHistory = useCallback(() => {
    if (!tahun) return;
    getAllPengkeg({ tahun })
      .then(setHistoryRows)
      .catch(() => setHistoryRows([]));
  }, [tahun]);

  useEffect(() => {
    reloadHistory();
  }, [reloadHistory]);

  useEffect(() => {
    reloadTree();
  }, [reloadTree]);

  const tujuan = tree.find((t) => String(t.id) === String(tujuanId));
  const sasaranOptions = tujuan?.sasaran || [];
  const sasaran = sasaranOptions.find((s) => String(s.id) === String(sasaranId));
  const programOptions = sasaran?.program || [];
  const program = programOptions.find((p) => String(p.id) === String(programId));
  const kegiatanOptions = program?.kegiatan || [];
  const kegiatan = kegiatanOptions.find((k) => String(k.id) === String(kegiatanId));

  useEffect(() => {
    if (!kegiatan?.kode_kegiatan || !tahun) return undefined;
    let cancelled = false;
    getDpaOptions(tahun, kegiatan.kode_kegiatan)
      .then((opts) => {
        if (!cancelled) setDpaOptions(opts);
      })
      .catch(() => {
        if (!cancelled) setDpaOptions([]);
      });
    return () => {
      cancelled = true;
    };
  }, [kegiatan?.kode_kegiatan, tahun]);

  useEffect(() => {
    if (!dpaId || !tahun) return undefined;
    let cancelled = false;
    getAllPengkeg({ tahun, dpa_id: dpaId })
      .then((rows) => {
        if (!cancelled) setExistingPengkeg(rows?.[0] || null);
      })
      .catch(() => {
        if (!cancelled) setExistingPengkeg(null);
      });
    return () => {
      cancelled = true;
    };
  }, [dpaId, tahun]);

  const handleTujuanChange = (e) => {
    setTujuanId(e.target.value);
    setSasaranId('');
    setProgramId('');
    setKegiatanId('');
    setDpaId('');
  };
  const handleSasaranChange = (e) => {
    setSasaranId(e.target.value);
    setProgramId('');
    setKegiatanId('');
    setDpaId('');
  };
  const handleProgramChange = (e) => {
    setProgramId(e.target.value);
    setKegiatanId('');
    setDpaId('');
  };
  const handleKegiatanChange = (e) => {
    setKegiatanId(e.target.value);
    setDpaId('');
  };

  const selectedDpaOption = dpaOptions.find((d) => String(d.id) === String(dpaId));

  const handlePengkegSubmit = async (payload) => {
    if (existingPengkeg) {
      await updatePengkeg(existingPengkeg.id, payload);
    } else {
      await createPengkeg(payload);
    }
    // Reset filter cascading kembali ke awal (kembali ke tampilan Dashboard).
    setTujuanId('');
    setSasaranId('');
    setProgramId('');
    setKegiatanId('');
    setDpaId('');
    setExistingPengkeg(null);
    reloadHistory();
  };

  // Klik "Edit" di tabel Riwayat -> arahkan ulang filter cascading ke posisi yang
  // benar (cari lewat kode_kegiatan di tree), supaya form Sub Kegiatan terbuka lagi.
  const handleEditFromHistory = (row) => {
    const kodeKegiatan = row.dpa?.kode_kegiatan;
    if (!kodeKegiatan) return;
    for (const t of tree) {
      for (const s of t.sasaran) {
        for (const p of s.program) {
          const k = p.kegiatan.find((kk) => kk.kode_kegiatan === kodeKegiatan);
          if (k) {
            setTujuanId(String(t.id));
            setSasaranId(String(s.id));
            setProgramId(String(p.id));
            setKegiatanId(String(k.id));
            setDpaId(String(row.dpa_id));
            return;
          }
        }
      }
    }
  };

  const handleDeleteFromHistory = async (id) => {
    if (!window.confirm('Hapus data ini?')) return;
    await deletePengkeg(id);
    reloadHistory();
  };

  return (
    <div>
      <p className="text-muted small mb-3">
        Pilih Tujuan → Sasaran → Program → Kegiatan → Sub Kegiatan untuk mengisi realisasi capaian
        per level. Target ditampilkan supaya nilai yang diisi tidak salah.
      </p>

      <Row className="g-2 mb-3">
        <Col md>
          <Form.Label className="small fw-semibold">Tujuan</Form.Label>
          <Form.Select size="sm" value={tujuanId} onChange={handleTujuanChange}>
            <option value="">-- Pilih Tujuan --</option>
            {tree.map((t) => (
              <option key={t.id} value={t.id}>
                {t.no_tujuan} — {t.isi_tujuan}
              </option>
            ))}
          </Form.Select>
        </Col>
        <Col md>
          <Form.Label className="small fw-semibold">Sasaran</Form.Label>
          <Form.Select
            size="sm"
            value={sasaranId}
            onChange={handleSasaranChange}
            disabled={!tujuanId}
          >
            <option value="">-- Pilih Sasaran --</option>
            {sasaranOptions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nomor} — {s.isi_sasaran}
              </option>
            ))}
          </Form.Select>
        </Col>
        <Col md>
          <Form.Label className="small fw-semibold">Program</Form.Label>
          <Form.Select
            size="sm"
            value={programId}
            onChange={handleProgramChange}
            disabled={!sasaranId}
          >
            <option value="">-- Pilih Program --</option>
            {programOptions.map((p) => (
              <option key={p.id} value={p.id}>
                {p.kode_program} — {p.nama_program}
              </option>
            ))}
          </Form.Select>
        </Col>
        <Col md>
          <Form.Label className="small fw-semibold">Kegiatan</Form.Label>
          <Form.Select
            size="sm"
            value={kegiatanId}
            onChange={handleKegiatanChange}
            disabled={!programId}
          >
            <option value="">-- Pilih Kegiatan --</option>
            {kegiatanOptions.map((k) => (
              <option key={k.id} value={k.id}>
                {k.kode_kegiatan} — {k.nama_kegiatan}
              </option>
            ))}
          </Form.Select>
        </Col>
        <Col md>
          <Form.Label className="small fw-semibold">Sub Kegiatan</Form.Label>
          <Form.Select
            size="sm"
            value={dpaId}
            onChange={(e) => setDpaId(e.target.value)}
            disabled={!kegiatanId}
          >
            <option value="">-- Pilih Sub Kegiatan --</option>
            {dpaOptions.map((d) => (
              <option key={d.id} value={d.id}>
                {d.label}
              </option>
            ))}
          </Form.Select>
        </Col>
      </Row>

      {loading && <Spinner size="sm" animation="border" />}

      {!loading && !tree.length && (
        <Alert variant="warning" className="py-2 small">
          Belum ada data Tujuan untuk Renstra OPD aktif tahun {tahun || '-'}.
        </Alert>
      )}

      {tujuan && (
        <IndikatorCard
          key={`tujuan-${tujuan.id}`}
          title={`Tujuan: ${tujuan.isi_tujuan}`}
          items={tujuan.indikator}
          tahun={tahun}
          onSaved={reloadTree}
        />
      )}
      {sasaran && (
        <IndikatorCard
          key={`sasaran-${sasaran.id}`}
          title={`Sasaran: ${sasaran.isi_sasaran}`}
          items={sasaran.indikator}
          tahun={tahun}
          onSaved={reloadTree}
        />
      )}
      {program && (
        <IndikatorCard
          key={`program-${program.id}`}
          title={`Program: ${program.nama_program}`}
          items={program.indikator}
          tahun={tahun}
          onSaved={reloadTree}
        />
      )}
      {kegiatan && (
        <IndikatorCard
          key={`kegiatan-${kegiatan.id}`}
          title={`Kegiatan: ${kegiatan.nama_kegiatan}`}
          items={kegiatan.indikator}
          tahun={tahun}
          onSaved={reloadTree}
        />
      )}

      {dpaId && !periodeId && <Spinner size="sm" animation="border" className="mb-3" />}

      {dpaId && periodeId && (
        <Card className="mb-3">
          <Card.Header className="bg-light fw-semibold small">
            Sub Kegiatan: {selectedDpaOption?.label}
          </Card.Header>
          <Card.Body>
            <LpkDispangForm
              key={existingPengkeg ? existingPengkeg.id : `new-${dpaId}`}
              initialData={existingPengkeg}
              tahun={tahun}
              periodeId={periodeId}
              lockedDpa={selectedDpaOption}
              onSubmit={handlePengkegSubmit}
            />
          </Card.Body>
        </Card>
      )}

      <hr className="my-4" />
      <h6 className="fw-semibold mb-2">Riwayat Realisasi Sub Kegiatan — Tahun {tahun || '-'}</h6>
      <LpkDispangTable
        data={historyRows}
        onEdit={handleEditFromHistory}
        onDelete={handleDeleteFromHistory}
      />
    </div>
  );
};

export default RealisasiKinerjaTerpadu;
