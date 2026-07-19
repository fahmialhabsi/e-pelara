import React, { useEffect, useState } from 'react';
import { Form, Button, Card, Typography, App } from 'antd';
import { useNavigate } from 'react-router-dom';
import * as Yup from 'yup';
import { useRenstraFormTemplate } from '@/hooks/templatesUseRenstra/useRenstraFormTemplate';
import { generateKode } from '@/utils/kodeUtils';
import api from '@/services/api';

import SelectWithLabelValue from '@/shared/components/form/SelectWithLabelValue';
import TextAreaField from '@/shared/components/form/TextAreaField';
import InputField from '@/shared/components/form/InputField';

const { Text } = Typography;

const IndikatorProgramRenstraForm = ({ initialData = null, renstraAktif }) => {
  const navigate = useNavigate();
  const { message } = App.useApp();
  const [existingList, setExistingList] = useState([]);
  const [previewProgram, setPreviewProgram] = useState('');

  useEffect(() => {
    const fetchExisting = async () => {
      try {
        const res = await api.get('/indikator-renstra', {
          params: { stage: 'program', renstra_id: renstraAktif?.id },
        });
        setExistingList(res.data);
      } catch (error) {
        message.error('Gagal memuat data indikator program.');
      }
    };
    fetchExisting();
  }, [message]);

  const { form, onSubmit, isSubmitting, dropdowns } = useRenstraFormTemplate({
    initialData,
    renstraAktif,
    endpoint: '/indikator-renstra',
    redirectPath: '/renstra/indikator/program',
    queryKeys: ['indikator-program-renstra'],
    defaultValues: {
      program_renstra_id: '',
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
        program_renstra_id: Yup.number().required('Program Renstra wajib dipilih'),
        kode_indikator: Yup.string().required('Kode indikator wajib diisi'),
        nama_indikator: Yup.string().required('Nama indikator wajib diisi'),
        satuan: Yup.string().required('Satuan wajib diisi'),
        target_tahun_1: Yup.string().required('Target (th. ke-1) wajib diisi'),
      }),
    fetchOptions: {
      'program-renstra': async () => {
        const res = await api.get('/renstra-program');
        return res.data;
      },
    },
    generatePayload: (data) => ({
      program_renstra_id: data.program_renstra_id,
      kode_indikator: data.kode_indikator,
      nama_indikator: data.nama_indikator,
      satuan: data.satuan,
      baseline: data.baseline,
      target_tahun_1: data.target_tahun_1,
      target_tahun_2: data.target_tahun_2,
      target_tahun_3: data.target_tahun_3,
      target_tahun_4: data.target_tahun_4,
      target_tahun_5: data.target_tahun_5,
      stage: 'program',
      jenis_indikator: 'Kuantitatif',
      tipe_indikator: 'Outcome',
      renstra_id: data.renstra_id,
      ref_id: data.program_renstra_id,
      definisi_operasional: data.definisi_operasional,
      metode_penghitungan: data.metode_penghitungan,
      sumber_data: data.sumber_data,
      penanggung_jawab: data.penanggung_jawab,
    }),
    kodeGenerator: (watch, setValue) => {
      const programId = watch('program_renstra_id');
      const options = dropdowns['program-renstra'];
      if (!programId || !options) return;

      const selected = options.find((x) => x.id === programId);
      if (selected) {
        setPreviewProgram(selected.nama_program);
        const prefix = `IP${selected.kode_program}`;
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
    const programId = watch('program_renstra_id');
    const programList = dropdowns['program-renstra'] || [];
    const selected = programList.find((p) => p.id === programId);
    if (!selected) return message.warning('Pilih Program Renstra terlebih dahulu');
    setIsGenerating(true);
    try {
      const res = await api.post('/renstra-program/generate-indikator', {
        namaOpd: renstraAktif?.nama_opd || 'Dinas Pangan',
        programRenstra: selected.nama_program || selected.isi_program,
        tahunMulai: renstraAktif?.tahun_mulai || 2025,
      });
      const ind = res.data?.indikator;
      if (ind) {
        setValue('nama_indikator', ind.nama_indikator || '');
        setValue('satuan', ind.satuan || '');
        setValue('baseline', ind.baseline !== undefined ? String(ind.baseline) : '0');
        setValue('target_tahun_1', ind.target_tahun_1 || '');
        setValue('target_tahun_2', ind.target_tahun_2 || '');
        setValue('target_tahun_3', ind.target_tahun_3 || '');
        setValue('target_tahun_4', ind.target_tahun_4 || '');
        setValue('target_tahun_5', ind.target_tahun_5 || '');
        const prefix = `IP${selected.kode_program}`;
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
        setValue('penanggung_jawab', ind.penanggung_jawab || renstraAktif?.bidang_opd || '');
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
    if (initialData?.ref_id) setValue('program_renstra_id', initialData.ref_id);
  }, [initialData, setValue]);

  return (
    <Card
      title={initialData ? 'Edit Indikator Program Renstra' : 'Tambah Indikator Program Renstra'}
    >
      <div style={{ marginBottom: 16, display: 'flex', gap: 8 }}>
        <Button onClick={() => navigate('/dashboard-renstra')}>🔙 Kembali ke Dashboard</Button>
        <Button onClick={() => navigate('/renstra/indikator/program')}>
          📄 Daftar Indikator Program
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
          name="program_renstra_id"
          label="Program Renstra"
          control={control}
          errors={errors}
          required
          placeholder="Pilih Program Renstra"
          options={(dropdowns['program-renstra'] || []).map((item) => ({
            value: item.id,
            label: `${item.kode_program} - ${item.nama_program}`,
          }))}
          onChange={(val) => setValue('program_renstra_id', val)}
        />

        {previewProgram && (
          <Text type="secondary" style={{ marginTop: -8, display: 'block', marginBottom: 12 }}>
            {previewProgram}
          </Text>
        )}

        <Form.Item label="Kode Indikator">
          <div style={{ background: '#f5f5f5', padding: 8, borderRadius: 4 }}>
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
        <SelectWithLabelValue
          name="penanggung_jawab"
          label="Penanggung Jawab"
          control={control}
          errors={errors}
          placeholder="Pilih Bidang Penanggung Jawab"
          options={[
            { value: 'Sekretariat Dinas Pangan', label: 'Sekretariat Dinas Pangan' },
            {
              value: 'Bidang Ketersediaan Dan Kerawanan Pangan',
              label: 'Bidang Ketersediaan Dan Kerawanan Pangan',
            },
            {
              value: 'Bidang Distribusi Dan Cadangan Pangan',
              label: 'Bidang Distribusi Dan Cadangan Pangan',
            },
            {
              value: 'Bidang Konsumsi Dan Keamanan Pangan',
              label: 'Bidang Konsumsi Dan Keamanan Pangan',
            },
            {
              value: 'Balai Pengawasan Mutu Dan Keamanan Pangan',
              label: 'Balai Pengawasan Mutu Dan Keamanan Pangan',
            },
          ]}
          onChange={(val) => setValue('penanggung_jawab', val)}
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

export default IndikatorProgramRenstraForm;
