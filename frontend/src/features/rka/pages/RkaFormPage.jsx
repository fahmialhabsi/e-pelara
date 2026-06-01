/**
 * Form tambah / ubah RKA (MVP audit + alasan perubahan).
 * Rute: /rka/form/new | /rka/form/:id
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button, Spin, Alert, Input, Select, Typography } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { toast } from 'react-toastify';
import {
  getRkaById,
  createRka,
  updateRka,
  getRkaAudit,
  getOpdDropdown,
  getRenjaByOpd,
} from '../services/rkaApi';
import { usePeriodeAktif } from '../../rpjmd/hooks/usePeriodeAktif';
import { useAuth } from '../../../hooks/useAuth';
import api from '../../../services/api';
import { canRestorePlanningDocumentVersion } from '../../../utils/roleUtils';
import PlanningAuditSection from '../../planning-audit/components/PlanningAuditSection';
import MasterRekeningCascading from '../../../shared/components/MasterRekeningCascading';
import MasterBelanjaCascading from '../../../shared/components/MasterBelanjaCascading';

const { TextArea } = Input;
const { Text } = Typography;

function buildPayload(form) {
  const p = {
    tahun: String(form.tahun || '').trim(),
    periode_id: Number(form.periode_id),
    program: String(form.program || '').trim(),
    kegiatan: String(form.kegiatan || '').trim(),
    sub_kegiatan: String(form.sub_kegiatan || '').trim(),
    indikator: form.indikator != null ? String(form.indikator) : '',
    target: form.target != null ? String(form.target) : '',
    rincian_belanja: form.rincian_belanja || null,
    jenis_dokumen: form.jenis_dokumen || 'RKA',
  };
  if (form.anggaran === '' || form.anggaran == null || Number.isNaN(Number(form.anggaran))) {
    p.anggaran = null;
  } else {
    p.anggaran = Number(form.anggaran);
  }
  if (form.rincian_belanja) p.rincian_belanja = form.rincian_belanja;
  if (form.opd_id !== '' && form.opd_id != null && !Number.isNaN(Number(form.opd_id))) {
    p.opd_id = Number(form.opd_id);
  }
  if (form.renja_id !== '' && form.renja_id != null && !Number.isNaN(Number(form.renja_id))) {
    p.renja_id = Number(form.renja_id);
  }
  if (form.rpjmd_id !== '' && form.rpjmd_id != null && !Number.isNaN(Number(form.rpjmd_id))) {
    p.rpjmd_id = Number(form.rpjmd_id);
  }
  return p;
}

const RkaFormPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isNew = id === 'new' || !id;
  const { tahun, periode_id, periodeList, loading: periodeLoading } = usePeriodeAktif();

  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [form, setForm] = useState({
    tahun: '',
    periode_id: '',
    opd_id: '',
    renja_id: '',
    rpjmd_id: '',
    program: '',
    kegiatan: '',
    sub_kegiatan: '',
    indikator: '',
    target: '',
    anggaran: '',
    rincian_belanja: null,
    jenis_dokumen: 'RKA',
  });
  const [baseline, setBaseline] = useState(null);
  const [changeReasonText, setChangeReasonText] = useState('');
  const [changeReasonFile, setChangeReasonFile] = useState('');
  const [auditRows, setAuditRows] = useState([]);
  const [opdOptions, setOpdOptions] = useState([]);
  const [renjaOptions, setRenjaOptions] = useState([]);
  const [loadingRenja, setLoadingRenja] = useState(false);
  const [rpjmdOptions, setRpjmdOptions] = useState([]);

  const [opdId, setOpdId] = useState('');

  useEffect(() => {
    if (form.opd_id !== opdId) {
      setOpdId(form.opd_id || '');
    }
  }, [form.opd_id]);

  useEffect(() => {
    api
      .get('/periode-rpjmd')
      .then((res) => setRpjmdOptions(res.data?.data || []))
      .catch(console.error);
  }, []);

  const periodeOptions = useMemo(
    () =>
      (periodeList || []).map((p) => ({
        id: p.id,
        nama: p.nama || `${p.tahun_awal}–${p.tahun_akhir}`,
      })),
    [periodeList],
  );

  const loadAudit = useCallback(async (rid) => {
    try {
      const rows = await getRkaAudit(rid);
      setAuditRows(Array.isArray(rows) ? rows : []);
    } catch (e) {
      console.error(e);
    }
  }, []);

  const loadExisting = useCallback(async () => {
    if (isNew) return;
    setLoading(true);
    setLoadError(null);
    try {
      const row = await getRkaById(id);
      if (!row || typeof row !== 'object') {
        throw new Error('Data RKA tidak valid');
      }
      const next = {
        tahun: String(row.tahun ?? ''),
        periode_id: row.periode_id != null ? String(row.periode_id) : '',
        opd_id: row.opd_id != null ? String(row.opd_id) : '',
        program: row.program ?? '',
        kegiatan: row.kegiatan ?? '',
        sub_kegiatan: row.sub_kegiatan ?? '',
        indikator: row.indikator ?? '',
        target: row.target ?? '',
        anggaran: row.anggaran != null ? row.anggaran : '',
        rincian_belanja: row.rincian_belanja || [],
        jenis_dokumen: row.jenis_dokumen ?? 'RKA',
        renja_id: row.renja_id != null ? String(row.renja_id) : '',
        rpjmd_id: row.rpjmd_id != null ? String(row.rpjmd_id) : '',
      };
      setForm(next);
      setOpdId(next.opd_id || '');
      setBaseline(buildPayload(next));
      setChangeReasonText('');
      setChangeReasonFile('');
      await loadAudit(id);
    } catch (e) {
      console.error(e);
      setLoadError(e.message || 'Gagal memuat RKA');
      toast.error('Gagal memuat data RKA');
    } finally {
      setLoading(false);
    }
  }, [id, isNew, loadAudit]);

  useEffect(() => {
    if (isNew) {
      setForm((f) => ({
        ...f,
        tahun: tahun ? String(tahun) : String(new Date().getFullYear()),
        periode_id: periode_id != null ? String(periode_id) : '',
      }));

      setOpdId('');

      setBaseline(null);
      setAuditRows([]);
      setLoading(false);
      setLoadError(null);
      return;
    }
    loadExisting();
  }, [isNew, tahun, periode_id, loadExisting]);

  useEffect(() => {
    const loadOpd = async () => {
      try {
        const rows = await getOpdDropdown();
        setOpdOptions(rows);
      } catch (err) {
        console.error('Gagal load OPD', err);
      }
    };

    loadOpd();
  }, []);

  useEffect(() => {
    if (!opdId) {
      setRenjaOptions([]);
      return;
    }

    const loadRenja = async () => {
      try {
        setLoadingRenja(true);

        const rows = await getRenjaByOpd(opdId);

        setRenjaOptions(rows);
      } catch (err) {
        console.error(err);
        toast.error('Gagal memuat Renja');
      } finally {
        setLoadingRenja(false);
      }
    };

    loadRenja();
  }, [opdId]);

  const setField = (key, val) => {
    setForm((prev) => ({ ...prev, [key]: val }));
  };

  const handleMasterBelanja = useCallback((selected) => {
    if (!selected?.sub_rincian) return;

    setForm((prev) => ({
      ...prev,
      rincian_belanja: [
        {
          kode_rekening: selected.sub_rincian.kode_rekening,
          uraian: selected.sub_rincian.uraian,
          volume: 1,
          satuan: 'unit',
          harga_satuan: 0,
          jumlah: 0,
          sumber_dana: '',
          lokasi: '',
        },
      ],
    }));
  }, []);

  const handleMasterRekening = useCallback(
    ({ program, kegiatan, subKegiatan }) => {
      // Tambahkan sementara di handleMasterRekening setelah baris subKegiatan
      console.log('renjaOptions:', renjaOptions);
      console.log('subKegiatan:', subKegiatan?.nama_sub_kegiatan);
      console.log(
        'matched:',
        renjaOptions.find((r) => r.sub_kegiatan === subKegiatan?.nama_sub_kegiatan),
      );
      setForm((prev) => {
        const updated = {
          ...prev,
          program: program?.nama_program ?? prev.program,
          kegiatan: kegiatan?.nama_kegiatan ?? prev.kegiatan,
          sub_kegiatan: subKegiatan?.nama_sub_kegiatan ?? prev.sub_kegiatan,
        };

        return updated;
      });

      // Auto-fill dari Renja jika sub kegiatan dipilih
      if (subKegiatan?.nama_sub_kegiatan) {
        const matched = renjaOptions.find((r) => r.sub_kegiatan === subKegiatan.nama_sub_kegiatan);
        if (matched) {
          setForm((prev) => ({
            ...prev,
            indikator: matched.indikator || prev.indikator,
            target: matched.target != null ? String(matched.target) : prev.target,
            anggaran: matched.anggaran != null ? String(matched.anggaran) : prev.anggaran,
          }));
        }
        if (matched) console.log('matched full:', JSON.stringify(matched));
      }
    },
    [renjaOptions],
  );

  const handleRenjaChange = (renjaId) => {
    setField('renja_id', renjaId);

    const renja = renjaOptions.find((r) => String(r.id) === String(renjaId));

    if (!renja) return;

    setForm((prev) => ({
      ...prev,
      renja_id: String(renja.id),

      program: renja.program || '',
      kegiatan: renja.kegiatan || '',
      sub_kegiatan: renja.sub_kegiatan || '',

      indikator: renja.indikator || '',
      target: renja.target || '',

      anggaran: renja.anggaran != null ? String(renja.anggaran) : '',
    }));
  };

  const handleSubmit = async () => {
    const payload = buildPayload(form);
    if (!payload.periode_id || Number.isNaN(payload.periode_id)) {
      toast.error('Pilih Periode RPJMD terlebih dahulu.');
      return;
    }
    const rt = changeReasonText.trim();
    const rf = changeReasonFile.trim();
    if (!rt && !rf) {
      toast.error(
        isNew
          ? 'Isi alasan pencatatan (teks) atau referensi berkas (wajib untuk audit CREATE).'
          : 'Isi alasan perubahan (teks) atau referensi berkas dasar perubahan.',
      );
      return;
    }

    setSaving(true);
    try {
      if (isNew) {
        const created = await createRka({
          ...payload,
          change_reason_text: rt || undefined,
          change_reason_file: rf || undefined,
        });
        toast.success('RKA berhasil dibuat');
        if (created?.id) navigate(`/rka/form/${created.id}`, { replace: true });
        else navigate('/dashboard-rka', { replace: true });
      } else {
        await updateRka(id, {
          ...payload,
          change_reason_text: changeReasonText.trim() || undefined,
          change_reason_file: changeReasonFile.trim() || undefined,
        });
        toast.success('RKA berhasil diperbarui');
        await loadExisting();
      }
    } catch (e) {
      const body = e.response?.data;
      const msg = body?.error || body?.message || e.message || 'Gagal menyimpan RKA';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  if (periodeLoading && isNew) {
    return (
      <div style={{ padding: 48, textAlign: 'center' }}>
        <Spin size="large" />
        <p>Memuat periode...</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ padding: 48, textAlign: 'center' }}>
        <Spin size="large" />
        <p>Memuat data RKA...</p>
      </div>
    );
  }

  if (loadError && !isNew) {
    return (
      <div style={{ padding: 24, maxWidth: 560 }}>
        <Alert type="error" message={loadError} showIcon />
        <Button
          type="primary"
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate('/dashboard-rka')}
          style={{ marginTop: 16 }}
        >
          Kembali ke daftar RKA
        </Button>
      </div>
    );
  }

  return (
    <div style={{ padding: '16px 24px', maxWidth: 900 }}>
      <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
        <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => navigate('/dashboard-rka')}>
          Kembali
        </Button>
        <h1 style={{ margin: 0, fontSize: 20 }}>{isNew ? 'Tambah RKA' : `Edit RKA #${id}`}</h1>
      </div>

      {periodeOptions.length === 0 && (
        <Alert
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
          message="Daftar periode RPJMD kosong."
        />
      )}

      <div
        style={{
          background: '#fff',
          border: '1px solid #f0f0f0',
          borderRadius: 8,
          padding: 20,
          marginBottom: 16,
        }}
      >
        <div style={{ display: 'grid', gap: 12, maxWidth: 640 }}>
          <label>
            <Text type="secondary">Tahun</Text>
            <Input value={form.tahun} onChange={(e) => setField('tahun', e.target.value)} />
          </label>
          <label>
            <Text type="secondary">Periode RPJMD</Text>
            <Select
              style={{ width: '100%' }}
              placeholder="Pilih periode"
              value={form.periode_id || undefined}
              onChange={(v) => setField('periode_id', v)}
              options={periodeOptions.map((p) => ({ value: String(p.id), label: p.nama }))}
            />
          </label>
          <label>
            <Text type="secondary">OPD Penanggung Jawab</Text>

            <Select
              showSearch
              allowClear
              optionFilterProp="label"
              style={{ width: '100%' }}
              placeholder="Ketik nama OPD..."
              value={opdId || undefined}
              onChange={(v) => {
                setOpdId(v || '');
                setField('opd_id', v || '');
                setField('renja_id', '');
              }}
              filterOption={(input, option) =>
                String(option?.label || '')
                  .toLowerCase()
                  .includes(input.toLowerCase())
              }
              options={opdOptions.map((o) => ({
                value: String(o.id),
                label: o.nama_opd || o.nama,
              }))}
            />
          </label>

          <div>
            <Text type="secondary">Program / Kegiatan / Sub Kegiatan (Master Kepmendagri)</Text>

            <MasterRekeningCascading onChange={handleMasterRekening} />
          </div>

          <div
            style={{
              background: '#fafafa',
              border: '1px solid #f0f0f0',
              padding: 12,
              borderRadius: 6,
            }}
          >
            <div>
              <strong>Program :</strong> {form.program || '-'}
            </div>

            <div>
              <strong>Kegiatan :</strong> {form.kegiatan || '-'}
            </div>

            <div>
              <strong>Sub Kegiatan :</strong> {form.sub_kegiatan || '-'}
            </div>
          </div>
          <label>
            <Text type="secondary">Indikator</Text>
            <Input value={form.indikator} onChange={(e) => setField('indikator', e.target.value)} />
          </label>
          <label>
            <Text type="secondary">Target</Text>
            <Input value={form.target} onChange={(e) => setField('target', e.target.value)} />
          </label>
          <label>
            <Text type="secondary">Anggaran (pagu)</Text>
            <Input value={form.anggaran} onChange={(e) => setField('anggaran', e.target.value)} />
          </label>
          <div>
            <Text type="secondary">Rincian Kode Rekening Belanja (Permendagri 90)</Text>
            <MasterBelanjaCascading
              key="master-belanja-rka"
              value={form.rincian_belanja}
              onChange={handleMasterBelanja}
            />
          </div>
          <label>
            <Text type="secondary">Jenis dokumen</Text>
            <Input
              value={form.jenis_dokumen}
              onChange={(e) => setField('jenis_dokumen', e.target.value)}
            />
          </label>
          <label>
            <Text type="secondary">Dokumen Renja</Text>

            <Select
              style={{ width: '100%' }}
              placeholder="Pilih Renja"
              loading={loadingRenja}
              value={form.renja_id || undefined}
              onChange={handleRenjaChange}
              disabled={!form.opd_id}
              options={renjaOptions.map((r) => ({
                value: String(r.id),
                label: `${r.tahun} - ${r.judul || r.program}`,
              }))}
            />
          </label>
          <label>
            <Text type="secondary">Periode RPJMD (Baseline)</Text>
            <Select
              style={{ width: '100%' }}
              placeholder="Pilih Periode RPJMD"
              value={form.rpjmd_id || undefined}
              onChange={(v) => setField('rpjmd_id', v)}
              options={rpjmdOptions.map((p) => ({
                value: String(p.id),
                label: `${p.nama || ''} (${p.tahun_awal}–${p.tahun_akhir})`,
              }))}
            />
          </label>
        </div>

        <div style={{ marginTop: 20, borderTop: '1px solid #f0f0f0', paddingTop: 16 }}>
          <Text strong>
            {isNew ? 'Alasan pencatatan (wajib salah satu)' : 'Alasan perubahan (wajib salah satu)'}
          </Text>
          <TextArea
            style={{ marginTop: 8 }}
            rows={3}
            value={changeReasonText}
            onChange={(e) => setChangeReasonText(e.target.value)}
            placeholder={isNew ? 'Ringkas alasan pembuatan RKA' : 'Ringkas alasan perubahan'}
          />
          <Input
            style={{ marginTop: 8 }}
            value={changeReasonFile}
            onChange={(e) => setChangeReasonFile(e.target.value)}
            placeholder="Referensi berkas (path/URL/nama berkas)"
          />
        </div>

        <Button type="primary" onClick={handleSubmit} loading={saving} style={{ marginTop: 20 }}>
          Simpan
        </Button>
      </div>

      {!isNew && (
        <div style={{ marginTop: 20 }}>
          <PlanningAuditSection
            documentType="rka"
            documentId={Number(id)}
            auditRows={auditRows}
            auditLoading={false}
            allowRestore={canRestorePlanningDocumentVersion(user?.role)}
            onVersionRestored={() => loadExisting()}
          />
        </div>
      )}
    </div>
  );
};

export default RkaFormPage;
