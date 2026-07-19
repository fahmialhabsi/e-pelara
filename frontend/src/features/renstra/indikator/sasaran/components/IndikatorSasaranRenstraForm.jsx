import React, { useEffect, useState } from 'react';
import { Form, Button, Card, Typography, App } from 'antd';
const { Text } = Typography;
import { useNavigate } from 'react-router-dom';
import * as Yup from 'yup';
import { useRenstraFormTemplate } from '@/hooks/templatesUseRenstra/useRenstraFormTemplate';
import { generateKode } from '@/utils/kodeUtils';
import api from '@/services/api';

import SelectWithLabelValue from '@/shared/components/form/SelectWithLabelValue';
import InputField from '@/shared/components/form/InputField';
import TextAreaField from '@/shared/components/form/TextAreaField';

const IndikatorSasaranRenstraForm = ({ initialData = null, renstraAktif }) => {
  const navigate = useNavigate();
  const { message } = App.useApp();
  const [existingList, setExistingList] = useState([]);
  const [preview, setPreview] = useState('');

  useEffect(() => {
    const fetchExisting = async () => {
      try {
        const res = await api.get('/indikator-renstra', {
          params: { stage: 'sasaran', renstra_id: renstraAktif?.id },
        });
        setExistingList(res.data);
      } catch (err) {
        message.error('Gagal mengambil data indikator sasaran.');
      }
    };
    fetchExisting();
  }, [message]);

  const { form, onSubmit, isSubmitting, dropdowns } = useRenstraFormTemplate({
    initialData,
    renstraAktif,
    endpoint: '/indikator-renstra',
    queryKeys: ['indikator-sasaran-renstra'],
    redirectPath: '/renstra/indikator/sasaran',
    defaultValues: {
      sasaran_renstra_id: '',
      kode_indikator: '',
      nama_indikator: '',
      satuan: '',
      baseline: '',
      definisi_operasional: '',
      metode_penghitungan: '',
      sumber_data: '',
      penanggung_jawab: '',
      target_tahun_1: '',
      target_tahun_2: '',
      target_tahun_3: '',
      target_tahun_4: '',
      target_tahun_5: '',
    },
    schema: () =>
      Yup.object().shape({
        sasaran_renstra_id: Yup.number().required('Sasaran Renstra wajib dipilih'),
        kode_indikator: Yup.string().required('Kode indikator wajib diisi'),
        nama_indikator: Yup.string().required('Nama indikator wajib diisi'),
        satuan: Yup.string().required('Satuan wajib diisi'),
        target_tahun_1: Yup.string().required('Target (th. ke-1) wajib diisi'),
      }),
    fetchOptions: {
      'sasaran-renstra': async () => {
        const res = await api.get('/renstra-sasaran');
        return res.data;
      },
    },
    generatePayload: (formData) => ({
      sasaran_renstra_id: formData.sasaran_renstra_id,
      kode_indikator: formData.kode_indikator,
      nama_indikator: formData.nama_indikator,
      satuan: formData.satuan,
      baseline: formData.baseline,
      target_tahun_1: formData.target_tahun_1,
      target_tahun_2: formData.target_tahun_2,
      target_tahun_3: formData.target_tahun_3,
      target_tahun_4: formData.target_tahun_4,
      target_tahun_5: formData.target_tahun_5,
      stage: 'sasaran',
      jenis_indikator: 'Kuantitatif',
      tipe_indikator: 'Outcome',
      renstra_id: formData.renstra_id,
      ref_id: formData.sasaran_renstra_id,
      definisi_operasional: formData.definisi_operasional,
      metode_penghitungan: formData.metode_penghitungan,
      sumber_data: formData.sumber_data,
      penanggung_jawab: formData.penanggung_jawab,
    }),
    kodeGenerator: (watch, setValue) => {
      const sasaranId = watch('sasaran_renstra_id');
      const options = dropdowns['sasaran-renstra'];
      if (!sasaranId || !options) return;

      const selected = options.find((x) => x.id === sasaranId);
      if (selected) {
        setPreview(selected.isi_sasaran || selected.nama_sasaran);
        const prefix = `ISA${selected.nomor || selected.kode_sasaran}`;
        const kode = generateKode({
          prefix,
          dataList: existingList,
          field: 'kode_indikator',
          padding: 2,
        });
        setValue('kode_indikator', kode);
      }
    },
  });

  const [isGenerating, setIsGenerating] = useState(false);
  const handleGenerateAI = async () => {
    const sasaranId = watch('sasaran_renstra_id');
    const sasaranList = dropdowns['sasaran-renstra'] || [];
    const selected = sasaranList.find((s) => s.id === sasaranId);
    if (!selected) return message.warning('Pilih Sasaran Renstra terlebih dahulu');
    setIsGenerating(true);
    try {
      const res = await api.post('/renstra-sasaran/generate-indikator', {
        namaOpd: renstraAktif?.nama_opd || 'Dinas Pangan',
        sasaranRenstra: selected.isi_sasaran || selected.nama_sasaran,
        tahunMulai: renstraAktif?.tahun_mulai || 2025,
      });
      const ind = res.data?.indikator;
      if (ind) {
        setValue('nama_indikator', ind.nama_indikator || '');
        setValue('satuan', ind.satuan || '');
        setValue('baseline', ind.baseline || '');
        setValue('target_tahun_1', ind.target_tahun_1 || '');
        setValue('target_tahun_2', ind.target_tahun_2 || '');
        setValue('target_tahun_3', ind.target_tahun_3 || '');
        setValue('target_tahun_4', ind.target_tahun_4 || '');
        setValue('target_tahun_5', ind.target_tahun_5 || '');
        const prefix = `ISA${selected.nomor || selected.kode_sasaran}`;
        const count = existingList.filter((i) => i.kode_indikator?.startsWith(prefix)).length;
        setValue('kode_indikator', `${prefix}.${String(count + 1).padStart(2, '0')}`);
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
  const {
    handleSubmit,
    control,
    setValue,
    watch,
    formState: { errors },
  } = form;
  useEffect(() => {
    if (initialData?.ref_id) setValue('sasaran_renstra_id', initialData.ref_id);
  }, [initialData, setValue]);

  return (
    <Card
      title={initialData ? 'Edit Indikator Sasaran Renstra' : 'Tambah Indikator Sasaran Renstra'}
    >
      <div style={{ marginBottom: 16, display: 'flex', gap: 8 }}>
        <Button onClick={() => navigate('/dashboard-renstra')}>🔙 Kembali ke Dashboard</Button>
        <Button onClick={() => navigate('/renstra/indikator/sasaran')}>
          📄 Lihat Daftar Indikator Sasaran
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
          name="sasaran_renstra_id"
          label="Sasaran Renstra"
          control={control}
          errors={errors}
          required
          placeholder="Pilih Sasaran"
          options={(dropdowns['sasaran-renstra'] || []).map((item) => ({
            value: item.id,
            label: `${item.nomor || item.kode_sasaran} - ${item.isi_sasaran || item.nama_sasaran}`,
          }))}
          onChange={(val) => setValue('sasaran_renstra_id', val)}
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

export default IndikatorSasaranRenstraForm;
