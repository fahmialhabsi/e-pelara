import React, { useEffect, useState } from 'react';
import { Form, Button, Card, Typography, App, InputNumber } from 'antd';
import { Controller } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import * as Yup from 'yup';
import { useRenstraFormTemplate } from '@/hooks/templatesUseRenstra/useRenstraFormTemplate';
import { generateKode } from '@/utils/kodeUtils';
import api from '@/services/api';
import SelectWithLabelValue from '@/shared/components/form/SelectWithLabelValue';
import TextAreaField from '@/shared/components/form/TextAreaField';
import InputField from '@/shared/components/form/InputField';
const { Text } = Typography;

const IndikatorSubKegiatanRenstraForm = ({ initialData = null, renstraAktif }) => {
  const navigate = useNavigate();
  const { message } = App.useApp();
  const renstraId = renstraAktif?.id;
  const [existingList, setExistingList] = useState([]);
  const [preview, setPreview] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    const fetchExisting = async () => {
      try {
        const res = await api.get('/indikator-renstra', {
          params: { stage: 'sub_kegiatan', renstra_id: renstraId },
        });
        setExistingList(Array.isArray(res.data?.data) ? res.data.data : []);
      } catch (err) {
        console.error('Gagal memuat indikator sub kegiatan:', err);
      }
    };
    if (renstraId) fetchExisting();
  }, [renstraId]);

  const { form, onSubmit, isSubmitting, dropdowns } = useRenstraFormTemplate({
    initialData,
    renstraAktif,
    endpoint: '/indikator-renstra',
    queryKeys: ['indikator-subkegiatan-renstra'],
    redirectPath: '/renstra/indikator/subkegiatan',
    defaultValues: {
      sub_kegiatan_renstra_id: '',
      kode_indikator: '',
      nama_indikator: '',
      satuan: '',
      baseline: '',
      definisi_operasional: '',
      metode_penghitungan: '',
      sumber_data: '',
      penanggung_jawab: '',
      pagu_tahun_1: '',
      pagu_tahun_2: '',
      pagu_tahun_3: '',
      pagu_tahun_4: '',
      pagu_tahun_5: '',
      target_tahun_1: '',
      target_tahun_2: '',
      target_tahun_3: '',
      target_tahun_4: '',
      target_tahun_5: '',
    },
    schema: () =>
      Yup.object().shape({
        sub_kegiatan_renstra_id: Yup.number().required('Sub Kegiatan Renstra wajib dipilih'),
        kode_indikator: Yup.string().required('Kode indikator wajib diisi'),
        nama_indikator: Yup.string().required('Nama indikator wajib diisi'),
        satuan: Yup.string().required('Satuan wajib diisi'),
        target_tahun_1: Yup.string().required('Target (th. ke-1) wajib diisi'),
      }),
    fetchOptions: {
      'subkegiatan-renstra': async () => {
        const res = await api.get('/renstra-subkegiatan', {
          params: { renstra_id: renstraId },
        });
        return Array.isArray(res.data?.data)
          ? res.data.data
          : Array.isArray(res.data)
            ? res.data
            : [];
      },
    },
    generatePayload: (data) => ({
      sub_kegiatan_renstra_id: data.sub_kegiatan_renstra_id,
      kode_indikator: data.kode_indikator,
      nama_indikator: data.nama_indikator,
      satuan: data.satuan,
      baseline: data.baseline,
      target_tahun_1: data.target_tahun_1,
      target_tahun_2: data.target_tahun_2,
      target_tahun_3: data.target_tahun_3,
      target_tahun_4: data.target_tahun_4,
      target_tahun_5: data.target_tahun_5,
      stage: 'sub_kegiatan',
      jenis_indikator: 'Kuantitatif',
      tipe_indikator: 'Output',
      renstra_id: data.renstra_id,
      ref_id: data.sub_kegiatan_renstra_id,
      definisi_operasional: data.definisi_operasional,
      metode_penghitungan: data.metode_penghitungan,
      sumber_data: data.sumber_data,
      penanggung_jawab: data.penanggung_jawab,
      pagu_tahun_1: data.pagu_tahun_1 ? Number(data.pagu_tahun_1) : null,
      pagu_tahun_2: data.pagu_tahun_2 ? Number(data.pagu_tahun_2) : null,
      pagu_tahun_3: data.pagu_tahun_3 ? Number(data.pagu_tahun_3) : null,
      pagu_tahun_4: data.pagu_tahun_4 ? Number(data.pagu_tahun_4) : null,
      pagu_tahun_5: data.pagu_tahun_5 ? Number(data.pagu_tahun_5) : null,
    }),
    kodeGenerator: (watch, setValue) => {
      const subKegiatanId = watch('sub_kegiatan_renstra_id');
      const options = dropdowns['subkegiatan-renstra'];
      if (!subKegiatanId || !options) return;
      const selected = options.find((x) => x.id === subKegiatanId);
      if (selected) {
        setPreview(selected.nama_sub_kegiatan || selected.kode_sub_kegiatan);
        const prefix = `ISK${selected.kode_sub_kegiatan}`;
        const kode = generateKode({
          prefix,
          dataList: existingList,
          field: 'kode_indikator',
          padding: 2,
        });
        setValue('kode_indikator', kode);
        // Auto-fill nama_indikator & satuan dari master_indikator (via master_sub_kegiatan)
        const master = selected.subKegiatan?.masterSubKegiatan;
        const masterInd = master?.masterIndikators?.[0];
        if (masterInd?.indikator) setValue('nama_indikator', masterInd.indikator);
        else if (master?.indikator) setValue('nama_indikator', master.indikator);
        if (masterInd?.satuan) setValue('satuan', masterInd.satuan);
        else if (master?.satuan) setValue('satuan', master.satuan);
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
    if (initialData?.ref_id) setValue('sub_kegiatan_renstra_id', initialData.ref_id);
  }, [initialData, setValue]);
  const selectedSubKegiatanId = watch('sub_kegiatan_renstra_id');
  useEffect(() => {
    if (!selectedSubKegiatanId) return;
    const options = dropdowns['subkegiatan-renstra'] || [];
    const selected = options.find((x) => x.id === Number(selectedSubKegiatanId));
    if (selected) {
      setPreview(selected.nama_sub_kegiatan || '');
      const prefix = `ISK${selected.kode_sub_kegiatan}`;
      const count = existingList.filter((i) => i.kode_indikator?.startsWith(prefix)).length;
      setValue('kode_indikator', `${prefix}.${String(count + 1).padStart(2, '0')}`);
      const master2 = selected.subKegiatan?.masterSubKegiatan;
      const masterInd2 = master2?.masterIndikators?.[0];
      if (masterInd2?.indikator) setValue('nama_indikator', masterInd2.indikator);
      else if (master2?.indikator) setValue('nama_indikator', master2.indikator);
      if (masterInd2?.satuan) setValue('satuan', masterInd2.satuan);
      else if (master2?.satuan) setValue('satuan', master2.satuan);
    }
  }, [selectedSubKegiatanId, dropdowns, existingList, setValue]);

  const handleGenerateAI = async () => {
    const subKegiatanId = watch('sub_kegiatan_renstra_id');
    const subKegiatanList = dropdowns['subkegiatan-renstra'] || [];
    const selected = subKegiatanList.find((s) => s.id === subKegiatanId);
    if (!selected) return message.warning('Pilih Sub Kegiatan Renstra terlebih dahulu');

    const namaIndikator = watch('nama_indikator');
    if (!namaIndikator) {
      return message.warning('Nama Indikator wajib terisi terlebih dahulu sebelum Generate AI');
    }

    setIsGenerating(true);
    try {
      const res = await api.post('/renstra-subkegiatan/generate-definisi-metode', {
        namaOpd: renstraAktif?.nama_opd || 'Dinas Pangan',
        subKegiatanRenstra: selected.nama_sub_kegiatan || selected.kode_sub_kegiatan,
        namaIndikator,
        satuan: watch('satuan'),
        baseline: watch('baseline'),
        targetTahun1: watch('target_tahun_1'),
        targetTahun2: watch('target_tahun_2'),
        targetTahun3: watch('target_tahun_3'),
        targetTahun4: watch('target_tahun_4'),
        targetTahun5: watch('target_tahun_5'),
      });
      const hasil = res.data?.hasil;
      if (hasil) {
        if (hasil.definisi_operasional)
          setValue('definisi_operasional', hasil.definisi_operasional);
        if (hasil.metode_penghitungan) setValue('metode_penghitungan', hasil.metode_penghitungan);
        message.success(
          'Definisi Operasional dan Metode Penghitungan berhasil di-generate oleh AI',
        );
      }
    } catch (err) {
      message.error('Gagal generate AI: ' + (err.response?.data?.message || err.message));
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Card
      title={
        initialData
          ? 'Edit Indikator Sub Kegiatan Renstra'
          : 'Tambah Indikator Sub Kegiatan Renstra'
      }
    >
      <div style={{ marginBottom: 16, display: 'flex', gap: 8 }}>
        <Button onClick={() => navigate('/dashboard-renstra')}>🔙 Kembali ke Dashboard</Button>
        <Button onClick={() => navigate('/renstra/indikator/subkegiatan')}>
          📄 Daftar Indikator Sub Kegiatan
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
          name="sub_kegiatan_renstra_id"
          label="Sub Kegiatan Renstra"
          control={control}
          errors={errors}
          required
          placeholder="Pilih Sub Kegiatan Renstra"
          options={(dropdowns['subkegiatan-renstra'] || []).map((item) => ({
            value: item.id,
            label: `${item.kode_sub_kegiatan || ''} - ${item.nama_sub_kegiatan}`,
          }))}
          onChange={(val) => setValue('sub_kegiatan_renstra_id', val)}
        />
        {preview && (
          <Text type="secondary" style={{ marginTop: -8, display: 'block', marginBottom: 12 }}>
            {preview}
          </Text>
        )}
        <Form.Item label="Kode Indikator">
          <div style={{ padding: '8px 12px', background: '#f5f5f5', borderRadius: 4 }}>
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
        <div style={{ background: '#f0f7ff', padding: '12px', borderRadius: 6, marginBottom: 16 }}>
          <Text strong style={{ display: 'block', marginBottom: 8 }}>
            Pagu Indikatif Per Tahun (Rp)
          </Text>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {[1, 2, 3, 4, 5].map((i) => (
              <Controller
                key={i}
                name={`pagu_tahun_${i}`}
                control={control}
                render={({ field }) => (
                  <Form.Item label={`Pagu Th. ${i} (${Number(renstraAktif?.tahun_mulai) + i - 1})`}>
                    <InputNumber
                      style={{ width: '100%' }}
                      value={field.value}
                      onChange={field.onChange}
                      formatter={(val) => `Rp ${val}`.replace(/\B(?=(\d{3})+(?!\d))/g, '.')}
                      parser={(val) => val.replace(/Rp\s?|[.]/g, '')}
                      min={0}
                    />
                  </Form.Item>
                )}
              />
            ))}
          </div>
          <div style={{ marginTop: 8, fontWeight: 'bold' }}>
            Total Pagu Indikatif: Rp{' '}
            {[
              watch('pagu_tahun_1'),
              watch('pagu_tahun_2'),
              watch('pagu_tahun_3'),
              watch('pagu_tahun_4'),
              watch('pagu_tahun_5'),
            ]
              .reduce((sum, val) => sum + (Number(val) || 0), 0)
              .toLocaleString('id-ID')}
          </div>
        </div>
        <Form.Item>
          <Button type="primary" htmlType="submit" loading={isSubmitting}>
            {initialData ? 'Update' : 'Simpan'}
          </Button>
        </Form.Item>
      </Form>
    </Card>
  );
};

export default IndikatorSubKegiatanRenstraForm;
