import React, { useEffect, useState } from 'react';
import { Form, Button, Card, Typography, App } from 'antd';
import { useNavigate } from 'react-router-dom';
import { useRenstraFormTemplate } from '@/hooks/templatesUseRenstra/useRenstraFormTemplate';
import api from '@/services/api';
import * as Yup from 'yup';

import InputField from '@/shared/components/form/InputField';
import TextAreaField from '@/shared/components/form/TextAreaField';
import SumberDataReferensiField from '@/features/renstra/indikator/components/SumberDataReferensiField';
import { buildSumberDataText } from '@/features/renstra/indikator/components/sumberDataUtils';

const { Text } = Typography;

/**
 * IKU (Indikator Kinerja Utama) & IKK (Indikator Kinerja Kunci) adalah
 * indikator level OPD yang berdiri sendiri — tidak terikat ke satu node
 * hierarki Tujuan..Sub Kegiatan seperti stage lain. Karena strukturnya
 * identik, satu Form dipakai untuk kedua stage lewat prop `stage`.
 */
export const IKU_IKK_STAGE_META = {
  iku: {
    stage: 'iku',
    prefix: 'IKU',
    title: 'Indikator Kinerja Utama (IKU)',
    listPath: '/renstra/indikator/iku',
  },
  ikk: {
    stage: 'ikk',
    prefix: 'IKK',
    title: 'Indikator Kinerja Kunci (IKK)',
    listPath: '/renstra/indikator/ikk',
  },
};

const IndikatorIkuIkkForm = ({ stage, initialData = null, renstraAktif }) => {
  const meta = IKU_IKK_STAGE_META[stage];
  const navigate = useNavigate();
  const { message } = App.useApp();
  const [existingList, setExistingList] = useState([]);
  const [existingLoaded, setExistingLoaded] = useState(false);

  useEffect(() => {
    const fetchExisting = async () => {
      try {
        const res = await api.get('/indikator-renstra', {
          params: { stage: meta.stage, renstra_id: renstraAktif?.id },
        });
        setExistingList(Array.isArray(res.data?.data) ? res.data.data : res.data || []);
      } catch (err) {
        message.error(`Gagal memuat data ${meta.title}`);
      } finally {
        setExistingLoaded(true);
      }
    };
    if (renstraAktif?.id) fetchExisting();
  }, [message, renstraAktif?.id, meta.stage, meta.title]);

  const { form, onSubmit, isSubmitting } = useRenstraFormTemplate({
    initialData,
    renstraAktif,
    endpoint: '/indikator-renstra',
    queryKeys: [`indikator-${meta.stage}-renstra`],
    redirectPath: meta.listPath,
    defaultValues: {
      kode_indikator: '',
      nama_indikator: '',
      satuan: '',
      baseline: '',
      target_tahun_1: '',
      target_tahun_2: '',
      target_tahun_3: '',
      target_tahun_4: '',
      target_tahun_5: '',
      target_tahun_6: '',
      jumlah_desimal_tampilan: '',
      definisi_operasional: '',
      metode_penghitungan: '',
      sumber_data: '',
      sumber_data_mode: 'teks',
      sumber_data_tabel: null,
      referensi: [],
      penanggung_jawab: '',
    },
    schema: () =>
      Yup.object().shape({
        kode_indikator: Yup.string().required('Kode indikator wajib diisi'),
        nama_indikator: Yup.string().required('Nama indikator wajib diisi'),
        satuan: Yup.string().required('Satuan wajib diisi'),
        target_tahun_1: Yup.string().required('Target tahun pertama wajib diisi'),
      }),
    generatePayload: (formData) => ({
      kode_indikator: formData.kode_indikator,
      nama_indikator: formData.nama_indikator,
      satuan: formData.satuan,
      baseline: formData.baseline,
      target_tahun_1: formData.target_tahun_1,
      target_tahun_2: formData.target_tahun_2,
      target_tahun_3: formData.target_tahun_3,
      target_tahun_4: formData.target_tahun_4,
      target_tahun_5: formData.target_tahun_5,
      target_tahun_6: formData.target_tahun_6,
      jumlah_desimal_tampilan:
        formData.jumlah_desimal_tampilan === '' || formData.jumlah_desimal_tampilan === null
          ? null
          : Number(formData.jumlah_desimal_tampilan),
      stage: meta.stage,
      jenis_indikator: 'Kuantitatif',
      renstra_id: formData.renstra_id,
      ref_id: formData.renstra_id,
      definisi_operasional: formData.definisi_operasional,
      metode_penghitungan: formData.metode_penghitungan,
      sumber_data: buildSumberDataText(formData),
      sumber_data_mode: formData.sumber_data_mode || 'teks',
      sumber_data_tabel: formData.sumber_data_mode === 'tabel' ? formData.sumber_data_tabel : null,
      referensi: (formData.referensi || []).filter((r) => r && r.trim()),
      penanggung_jawab: formData.penanggung_jawab,
    }),
  });

  const {
    handleSubmit,
    control,
    setValue,
    watch,
    formState: { errors },
  } = form;

  // Auto-generate kode indikator (mis. "IKU.01", "IKU.02", ...) saat mode tambah,
  // hanya setelah daftar existing selesai dimuat (agar tidak "kejar" ke IKU.01 dulu
  // sebelum data lama diketahui, yang bikin kode tabrakan/unique constraint gagal).
  useEffect(() => {
    if (initialData || !existingLoaded) return;
    const padded = String(existingList.length + 1).padStart(2, '0');
    setValue('kode_indikator', `${meta.prefix}.${padded}`);
  }, [existingLoaded, existingList, initialData, setValue, meta.prefix]);

  const tahunMulai = Number(renstraAktif?.tahun_mulai) || 2025;

  return (
    <Card title={initialData ? `Edit ${meta.title}` : `Tambah ${meta.title}`}>
      <div style={{ marginBottom: 16, display: 'flex', gap: 8 }}>
        <Button onClick={() => navigate('/dashboard-renstra')}>🔙 Kembali ke Dashboard</Button>
        <Button onClick={() => navigate(meta.listPath)}>📄 Lihat Daftar {meta.title}</Button>
      </div>

      <Form layout="vertical" onFinish={handleSubmit(onSubmit)} style={{ maxWidth: 700 }}>
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
          label={`Baseline / Kondisi Awal (${tahunMulai - 1})`}
          control={control}
          errors={errors}
        />

        <div style={{ background: '#f9f9f9', padding: '12px', borderRadius: 6, marginBottom: 16 }}>
          <Text strong style={{ display: 'block', marginBottom: 8 }}>
            Target Per Tahun ({tahunMulai}–{tahunMulai + 5})
          </Text>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <InputField
                key={n}
                name={`target_tahun_${n}`}
                label={`Target Th. ${n} (${tahunMulai + n - 1})`}
                control={control}
                errors={errors}
                required={n === 1}
              />
            ))}
          </div>
        </div>

        <InputField
          name="jumlah_desimal_tampilan"
          label="Jumlah Desimal Tampilan (opsional)"
          control={control}
          errors={errors}
          placeholder="Kosongkan untuk default 2 desimal"
        />
        <Text type="secondary" style={{ display: 'block', marginTop: -12, marginBottom: 16 }}>
          Mengatur berapa digit di belakang koma saat baseline/target/realisasi indikator ini
          ditampilkan di dokumen Renja (Tabel 2.1/2.2/5.1/5.2) — mis. isi 3 untuk "1,890" atau 1
          untuk "52,5". Tidak mengubah nilai/presisi data, hanya cara tampilnya.
        </Text>

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
        <SumberDataReferensiField watch={watch} setValue={setValue} />
        <InputField
          name="penanggung_jawab"
          label="Penanggung Jawab"
          control={control}
          errors={errors}
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

export default IndikatorIkuIkkForm;
