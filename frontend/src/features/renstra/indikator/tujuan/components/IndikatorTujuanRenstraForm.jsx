import React, { useEffect, useState } from 'react';
import { Form, Button, Card, Typography, App } from 'antd';
import { useNavigate } from 'react-router-dom';
import { useRenstraFormTemplate } from '@/hooks/templatesUseRenstra/useRenstraFormTemplate';
import api from '@/services/api';
import * as Yup from 'yup';

// Reusable Components
import SelectWithLabelValue from '@/shared/components/form/SelectWithLabelValue';
import InputField from '@/shared/components/form/InputField';
import TextAreaField from '@/shared/components/form/TextAreaField';

const { Text } = Typography;

const IndikatorTujuanRenstraForm = ({ initialData = null, renstraAktif }) => {
  const navigate = useNavigate();
  const { message } = App.useApp();

  const [existingList, setExistingList] = useState([]);
  const [preview, setPreview] = useState('');

  const [isGenerating, setIsGenerating] = useState(false);
  useEffect(() => {
    const fetchExisting = async () => {
      try {
        const res = await api.get('/indikator-renstra', {
          params: { stage: 'tujuan', renstra_id: renstraAktif?.id },
        });
        setExistingList(Array.isArray(res.data?.data) ? res.data.data : []);
      } catch (err) {
        message.error('Gagal memuat data indikator tujuan');
      }
    };
    if (renstraAktif?.id) fetchExisting();
  }, [message, renstraAktif?.id]);

  const handleGenerateAI = async () => {
    const tujuanId = watch('tujuan_renstra_id');
    const tujuanList = dropdowns['tujuan-renstra'] || [];
    console.log(
      '[GenerateAI] tujuanId:',
      tujuanId,
      'tujuanList:',
      tujuanList?.length,
      tujuanList?.[0],
    );
    const selected = tujuanList.find((t) => Number(t.id) === Number(tujuanId));
    if (!selected) return message.warning('Pilih Tujuan Renstra terlebih dahulu');
    setIsGenerating(true);
    try {
      const res = await api.post('/renstra-tujuan/generate-indikator', {
        namaOpd: renstraAktif?.nama_opd || 'Dinas Pangan',
        tujuanRenstra: selected.isi_tujuan || selected.nama_tujuan,
        tahunMulai: renstraAktif?.tahun_mulai || 2025,
      });
      const ind = res.data?.indikator;
      if (ind) {
        setValue('nama_indikator', ind.nama_indikator || '');
        setValue('satuan', ind.satuan || '');
        setValue('target_tahun_1', ind.target_tahun_1 || '');
        setValue('target_tahun_2', ind.target_tahun_2 || '');
        setValue('target_tahun_3', ind.target_tahun_3 || '');
        setValue('target_tahun_4', ind.target_tahun_4 || '');
        setValue('target_tahun_5', ind.target_tahun_5 || '');
        setValue('baseline', ind.baseline || '');
        // Auto-generate kode indikator
        const tujuanList = dropdowns['tujuan-renstra'] || [];
        const sel = tujuanList.find((t) => t.id === tujuanId);
        if (sel) {
          const base = `ITU${sel.no_tujuan || sel.kode_tujuan}`;
          const count = existingList.filter((i) => i.kode_indikator?.startsWith(base)).length;
          const padded = String(count + 1).padStart(2, '0');
          setValue('kode_indikator', `${base}.${padded}`);
        }
        if (ind.definisi_operasional) setValue('definisi_operasional', ind.definisi_operasional);
        if (ind.metode_penghitungan) setValue('metode_penghitungan', ind.metode_penghitungan);
        else
          setValue(
            'metode_penghitungan',
            `Dihitung berdasarkan: ${ind.definisi_operasional || ind.nama_indikator}`,
          );
        if (ind.sumber_data) setValue('sumber_data', ind.sumber_data);
        setValue('penanggung_jawab', renstraAktif?.bidang_opd || ind.penanggung_jawab || '');
        message.success('Indikator berhasil di-generate oleh AI');
      }
    } catch (err) {
      message.error('Gagal generate AI: ' + (err.response?.data?.message || err.message));
    } finally {
      setIsGenerating(false);
    }
  };

  const { form, onSubmit, isSubmitting, dropdowns } = useRenstraFormTemplate({
    initialData,
    renstraAktif,
    endpoint: '/indikator-renstra',
    queryKeys: ['indikator-tujuan-renstra'],
    redirectPath: '/renstra/indikator/tujuan',
    defaultValues: {
      tujuan_renstra_id: initialData?.ref_id || '',
      kode_indikator: '',
      nama_indikator: '',
      satuan: '',
      target_tahun_1: '',
      target_tahun_2: '',
      target_tahun_3: '',
      target_tahun_4: '',
      target_tahun_5: '',
      baseline: '',
      definisi_operasional: '',
      metode_penghitungan: '',
      sumber_data: '',
      penanggung_jawab: '',
    },
    schema: () =>
      Yup.object().shape({
        tujuan_renstra_id: Yup.number().required('Tujuan Renstra wajib dipilih'),
        kode_indikator: Yup.string().required('Kode indikator wajib diisi'),
        nama_indikator: Yup.string().required('Nama indikator wajib diisi'),
        satuan: Yup.string().required('Satuan wajib diisi'),
        target_tahun_1: Yup.string().required('Target (th. ke-1) wajib diisi'),
      }),
    fetchOptions: {
      'tujuan-renstra': async () => {
        const res = await api.get('/renstra-tujuan');
        return res.data;
      },
    },
    generatePayload: (formData) => ({
      tujuan_renstra_id: formData.tujuan_renstra_id,
      kode_indikator: formData.kode_indikator,
      nama_indikator: formData.nama_indikator,
      satuan: formData.satuan,
      baseline: formData.baseline,
      target_tahun_1: formData.target_tahun_1,
      target_tahun_2: formData.target_tahun_2,
      target_tahun_3: formData.target_tahun_3,
      target_tahun_4: formData.target_tahun_4,
      target_tahun_5: formData.target_tahun_5,
      stage: 'tujuan',
      jenis_indikator: 'Kuantitatif',
      renstra_id: formData.renstra_id,
      ref_id: formData.tujuan_renstra_id,
      definisi_operasional: formData.definisi_operasional,
      metode_penghitungan: formData.metode_penghitungan,
      sumber_data: formData.sumber_data,
      penanggung_jawab: formData.penanggung_jawab,
    }),
    kodeGenerator: (watch, setValue) => {
      const selectedId = watch('tujuan_renstra_id');
      const list = dropdowns['tujuan-renstra'];
      if (!selectedId || !list) return;

      const selected = list.find((item) => Number(item.id) === Number(selectedId));
      if (selected) {
        setPreview(selected.isi_tujuan || selected.nama_tujuan);
        const base = `ITU${selected.no_tujuan || selected.kode_tujuan}`;
        const count = existingList.filter((i) => i.kode_indikator?.startsWith(base)).length;
        const padded = String(count + 1).padStart(2, '0');
        setValue('kode_indikator', `${base}.${padded}`);
      }
    },
  });

  const {
    handleSubmit,
    control,
    setValue,
    watch,
    formState: { errors },
  } = form;
  useEffect(() => {
    if (initialData?.ref_id) {
      setValue('tujuan_renstra_id', initialData.ref_id);
    }
  }, [initialData, setValue]);

  return (
    <Card title={initialData ? 'Edit Indikator Tujuan Renstra' : 'Tambah Indikator Tujuan Renstra'}>
      <div style={{ marginBottom: 16, display: 'flex', gap: 8 }}>
        <Button onClick={() => navigate('/dashboard-renstra')}>🔙 Kembali ke Dashboard</Button>
        <Button onClick={() => navigate('/renstra/indikator/tujuan')}>
          📄 Lihat Daftar Indikator Tujuan
        </Button>
      </div>

      <Form layout="vertical" onFinish={handleSubmit(onSubmit)} style={{ maxWidth: 700 }}>
        <div style={{ marginBottom: 12 }}>
          <Button
            onClick={handleGenerateAI}
            loading={isGenerating}
            style={{ background: '#722ed1', color: '#fff', border: 'none' }}
          >
            ✨ Generate AI
          </Button>
        </div>
        <SelectWithLabelValue
          name="tujuan_renstra_id"
          label="Tujuan Renstra"
          control={control}
          errors={errors}
          required
          placeholder="Pilih Tujuan"
          options={(dropdowns['tujuan-renstra'] || []).map((item) => ({
            value: item.id,
            label: `${item.no_tujuan || item.kode_tujuan} - ${item.isi_tujuan || item.nama_tujuan}`,
          }))}
          onChange={(val) => setValue('tujuan_renstra_id', val)}
        />

        {preview && (
          <Text type="secondary" style={{ marginTop: -8, display: 'block', marginBottom: 12 }}>
            {preview}
          </Text>
        )}

        <Form.Item label="Kode Indikator">
          <div
            style={{
              padding: '8px 12px',
              background: '#f5f5f5',
              borderRadius: 4,
            }}
          >
            {watch('kode_indikator') || '-'}
          </div>
        </Form.Item>

        <TextAreaField
          name="nama_indikator"
          label="Nama Indikator"
          control={control}
          errors={errors}
          required
          rows={3}
        />

        <InputField name="satuan" label="Satuan" control={control} errors={errors} required />

        <InputField
          name="baseline"
          label="Baseline (kondisi awal)"
          control={control}
          errors={errors}
        />
        <div style={{ background: '#f9f9f9', padding: '12px', borderRadius: 6, marginBottom: 16 }}>
          <Text strong style={{ display: 'block', marginBottom: 8 }}>
            Target Per Tahun (Periode {renstraAktif?.tahun_mulai}–
            {Number(renstraAktif?.tahun_mulai) + 4})
          </Text>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <InputField
              name="target_tahun_1"
              label={`Target Th. 1 (${renstraAktif?.tahun_mulai})`}
              control={control}
              errors={errors}
              required
            />
            <InputField
              name="target_tahun_2"
              label={`Target Th. 2 (${Number(renstraAktif?.tahun_mulai) + 1})`}
              control={control}
              errors={errors}
            />
            <InputField
              name="target_tahun_3"
              label={`Target Th. 3 (${Number(renstraAktif?.tahun_mulai) + 2})`}
              control={control}
              errors={errors}
            />
            <InputField
              name="target_tahun_4"
              label={`Target Th. 4 (${Number(renstraAktif?.tahun_mulai) + 3})`}
              control={control}
              errors={errors}
            />
            <InputField
              name="target_tahun_5"
              label={`Target Th. 5 (${Number(renstraAktif?.tahun_mulai) + 4})`}
              control={control}
              errors={errors}
            />
          </div>
        </div>
        <TextAreaField
          name="definisi_operasional"
          label="Definisi Operasional"
          control={control}
          errors={errors}
          rows={3}
        />
        <TextAreaField
          name="metode_penghitungan"
          label="Metode Penghitungan"
          control={control}
          errors={errors}
          rows={3}
        />
        <InputField name="sumber_data" label="Sumber Data" control={control} errors={errors} />
        <InputField
          name="penanggung_jawab"
          label="Penanggung Jawab"
          control={control}
          errors={errors}
          disabled
        />
        <Form.Item>
          <Button type="primary" htmlType="submit" loading={isSubmitting}>
            {initialData ? 'Update' : 'Simpan'}
          </Button>
        </Form.Item>
      </Form>
    </Card>
  );
};

export default IndikatorTujuanRenstraForm;
