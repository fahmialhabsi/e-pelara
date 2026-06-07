// src/features/renstra/sasaran/components/RenstraTabelSasaranForm.jsx
import React, { useEffect, useMemo, useRef } from 'react';
import { Card, Button, Alert, Input } from 'antd';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import * as Yup from 'yup';

import api from '@/services/api';
import { useRenstraFormTemplate } from '@/hooks/templatesUseRenstra/useRenstraFormTemplate';
import SelectWithLabelValue from '@/shared/components/form/SelectWithLabelValue';
import InputField from '@/shared/components/form/InputField';
import SpinnerFullscreen from './SpinnerSasaranFullscreen';
import CurrencyInputField from '@/shared/components/form/CurrencyInputField';
import RenstraBreadcrumb, {
  useRenstraBreadcrumb,
} from '@/features/renstra/shared/components/RenstraBreadcrumb';

const YEARS = [1, 2, 3, 4, 5];

const RenstraTabelSasaranForm = ({ initialData = null, renstraAktif }) => {
  const navigate = useNavigate();
  const [paguInfoMessage, setPaguInfoMessage] = React.useState('');
  const [alasanRevisi, setAlasanRevisi] = React.useState('');
  const [submitRevisiLoading, setSubmitRevisiLoading] = React.useState(false);
  const [serverMessage, setServerMessage] = React.useState('');
  const prevSasaranIdRef = useRef(undefined);

  const defaultValues = {
    renstra_id: initialData?.renstra_id ?? renstraAktif?.id ?? '',
    tujuan_id: initialData?.tujuan_id ? String(initialData.tujuan_id) : '',
    sasaran_id: initialData?.sasaran_id ? String(initialData.sasaran_id) : '',
    kode_sasaran: initialData?.kode_sasaran ?? '',
    nama_sasaran: initialData?.nama_sasaran ?? '',
    indikator_id: initialData?.indikator_id ? String(initialData.indikator_id) : '',

    baseline: initialData?.baseline ?? '',
    satuan_target: initialData?.satuan_target ?? '',
    lokasi: initialData?.lokasi ?? '',

    target_tahun_1: initialData?.target_tahun_1 ?? '',
    target_tahun_2: initialData?.target_tahun_2 ?? '',
    target_tahun_3: initialData?.target_tahun_3 ?? '',
    target_tahun_4: initialData?.target_tahun_4 ?? '',
    target_tahun_5: initialData?.target_tahun_5 ?? '',
    target_tahun_6: 0,

    pagu_rpjmd_acuan: initialData?.pagu_rpjmd_acuan ?? 0,
    pagu_tahun_1: initialData?.pagu_tahun_1 ?? 0,
    pagu_tahun_2: initialData?.pagu_tahun_2 ?? 0,
    pagu_tahun_3: initialData?.pagu_tahun_3 ?? 0,
    pagu_tahun_4: initialData?.pagu_tahun_4 ?? 0,
    pagu_tahun_5: initialData?.pagu_tahun_5 ?? 0,
    pagu_tahun_6: 0,
    pagu_akhir_renstra: initialData?.pagu_akhir_renstra ?? 0,

    target_akhir_renstra: initialData?.target_akhir_renstra ?? '',
    versi: initialData?.versi ?? 1,
    status_revisi: initialData?.status_revisi ?? 'draft',
  };

  const schema = () =>
    Yup.object({
      tujuan_id: Yup.string().required('Tujuan wajib dipilih'),
      sasaran_id: Yup.string().required('Sasaran wajib dipilih'),
      indikator_id: Yup.string().required('Indikator wajib dipilih'),
      baseline: Yup.number().typeError('Baseline harus angka').nullable(),
      satuan_target: Yup.string().required('Satuan target wajib diisi'),
      lokasi: Yup.string().nullable(),
      target_tahun_1: Yup.number().typeError('Harus angka').required(),
      target_tahun_2: Yup.number().typeError('Harus angka').required(),
      target_tahun_3: Yup.number().typeError('Harus angka').required(),
      target_tahun_4: Yup.number().typeError('Harus angka').required(),
      target_tahun_5: Yup.number().typeError('Harus angka').required(),
      pagu_tahun_1: Yup.number().nullable(),
      pagu_tahun_2: Yup.number().nullable(),
      pagu_tahun_3: Yup.number().nullable(),
      pagu_tahun_4: Yup.number().nullable(),
      pagu_tahun_5: Yup.number().nullable(),
    });

  const generatePayload = (data) => {
    const targetValues = YEARS.map((i) => Number(data[`target_tahun_${i}`]) || 0);
    const paguValues = YEARS.map((i) => Number(data[`pagu_tahun_${i}`]) || 0);

    return {
      renstra_id: Number(data.renstra_id || renstraAktif?.id),
      tujuan_id: Number(data.tujuan_id),
      sasaran_id: Number(data.sasaran_id),
      kode_sasaran: data.kode_sasaran,
      nama_sasaran: data.nama_sasaran,
      indikator_id: Number(data.indikator_id),

      baseline: data.baseline,
      satuan_target: data.satuan_target,
      lokasi: data.lokasi,

      target_tahun_1: data.target_tahun_1,
      target_tahun_2: data.target_tahun_2,
      target_tahun_3: data.target_tahun_3,
      target_tahun_4: data.target_tahun_4,
      target_tahun_5: data.target_tahun_5,
      target_tahun_6: 0,

      pagu_tahun_1: data.pagu_tahun_1,
      pagu_tahun_2: data.pagu_tahun_2,
      pagu_tahun_3: data.pagu_tahun_3,
      pagu_tahun_4: data.pagu_tahun_4,
      pagu_tahun_5: data.pagu_tahun_5,
      pagu_tahun_6: 0,

      target_akhir_renstra: targetValues.reduce((a, b) => a + b, 0) / targetValues.length || 0,

      pagu_akhir_renstra: paguValues.reduce((a, b) => a + b, 0),
    };
  };

  const { form, onSubmit, isSubmitting } = useRenstraFormTemplate({
    initialData,
    renstraAktif,
    endpoint: '/renstra-tabel-sasaran',
    schema,
    defaultValues,
    generatePayload,
    queryKeys: ['renstra-tabel-sasaran'],
    redirectPath: '/dashboard-renstra',
  });

  const {
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = form;

  const selectedTujuanId = watch('tujuan_id');
  const selectedSasaranId = watch('sasaran_id');
  const selectedIndikatorId = watch('indikator_id');

  const { data: tujuanOptions = [], isLoading: loadingTujuan } = useQuery({
    queryKey: ['renstra-tujuan', renstraAktif?.id],
    queryFn: async () => {
      const res = await api.get('/renstra-tujuan', {
        params: { renstra_id: renstraAktif?.id },
      });
      return Array.isArray(res.data) ? res.data : (res.data?.data ?? []);
    },
    enabled: !!renstraAktif?.id,
  });

  const { data: sasaranOptions = [], isLoading: loadingSasaran } = useQuery({
    queryKey: ['renstra-sasaran', selectedTujuanId],
    queryFn: async () => {
      const res = await api.get('/renstra-sasaran/sasaran-rpjmd', {
        params: { tujuan_id: selectedTujuanId },
      });
      return Array.isArray(res.data) ? res.data : (res.data?.data ?? []);
    },
    enabled: !!renstraAktif?.id && !!selectedTujuanId,
  });

  const sasaranSelectOptions = useMemo(() => {
    const options = sasaranOptions.map((item) => ({
      value: String(item.id),
      label: `${item.nomor ?? item.kode_sasaran ?? ''} - ${
        item.isi_sasaran || item.nama_sasaran || '-'
      }`,
    }));

    if (initialData?.sasaran_id) {
      const exists = options.some((opt) => String(opt.value) === String(initialData.sasaran_id));

      if (!exists) {
        options.unshift({
          value: String(initialData.sasaran_id),
          label: `${initialData.kode_sasaran ?? ''} - ${initialData.nama_sasaran ?? '-'}`,
        });
      }
    }

    return options;
  }, [sasaranOptions, initialData]);

  const { data: indikatorOptions = [], isLoading: loadingIndikator } = useQuery({
    queryKey: ['indikator-renstra', renstraAktif?.id, 'sasaran', selectedSasaranId],
    queryFn: async () => {
      const res = await api.get('/indikator-renstra', {
        params: {
          renstra_id: renstraAktif?.id,
          stage: 'sasaran',
          sasaran_id: selectedSasaranId,
        },
      });
      return Array.isArray(res.data) ? res.data : (res.data?.data ?? []);
    },
    enabled: !!renstraAktif?.id && !!selectedSasaranId,
  });

  const sourceIndikatorId = useMemo(() => {
    if (!initialData?.indikator_id) return null;

    const selectedOption = indikatorOptions.find(
      (item) =>
        String(item.id) === String(initialData.indikator_id) ||
        String(item.source_indikator_id) === String(initialData.indikator_id),
    );

    return (
      selectedOption?.source_indikator_id || initialData?.indikator?.source_indikator_id || null
    );
  }, [indikatorOptions, initialData]);

  const { data: sourceIndikatorDetail } = useQuery({
    queryKey: ['indikator-sasaran-source-detail-form', sourceIndikatorId],
    queryFn: async () => {
      const res = await api.get(`/indikator-sasaran/${sourceIndikatorId}`);
      return res.data?.data ?? res.data ?? null;
    },
    enabled: !!sourceIndikatorId,
  });

  const indikatorSelectOptions = useMemo(() => {
    const options = indikatorOptions.map((item) => ({
      label: item.nama_indikator || item.kode_indikator || '-',
      value: String(item.id),
    }));

    if (initialData?.indikator_id) {
      const exists = options.some((opt) => String(opt.value) === String(initialData.indikator_id));

      if (!exists) {
        options.unshift({
          value: String(initialData.indikator_id),
          label:
            initialData.indikator?.nama_indikator ||
            initialData.nama_indikator ||
            `Indikator ${initialData.indikator_id}`,
        });
      }
    }

    return options;
  }, [indikatorOptions, initialData]);

  const { data: historyRows = [], refetch: refetchHistory } = useQuery({
    queryKey: ['renstra-tabel-sasaran-history', initialData?.id],
    queryFn: async () => {
      const res = await api.get(`/renstra-tabel-sasaran/${initialData.id}/history`);
      return Array.isArray(res.data) ? res.data : (res.data?.data ?? []);
    },
    enabled: !!initialData?.id,
  });

  useEffect(() => {
    if (!initialData || !tujuanOptions.length) return;

    setValue('tujuan_id', String(initialData.tujuan_id), {
      shouldValidate: true,
      shouldDirty: false,
    });
  }, [initialData, tujuanOptions, setValue]);

  useEffect(() => {
    if (!initialData || !sasaranSelectOptions.length) return;

    const selected = sasaranSelectOptions.find(
      (opt) => String(opt.value) === String(initialData.sasaran_id),
    );

    if (!selected) return;

    setValue('sasaran_id', String(selected.value), {
      shouldValidate: true,
      shouldDirty: false,
    });
  }, [initialData, sasaranSelectOptions, setValue]);

  useEffect(() => {
    if (!initialData || !indikatorOptions.length) return;
    if (!initialData.indikator_id) return;

    const selectedOption = indikatorOptions.find(
      (item) =>
        String(item.id) === String(initialData.indikator_id) ||
        String(item.source_indikator_id) === String(initialData.indikator_id),
    );

    if (!selectedOption) return;

    setValue('indikator_id', String(selectedOption.id), {
      shouldValidate: true,
      shouldDirty: false,
    });

    const fallbackBaseline =
      selectedOption.baseline ??
      sourceIndikatorDetail?.baseline ??
      sourceIndikatorDetail?.capaian_tahun_5 ??
      initialData?.baseline ??
      '';

    if (
      fallbackBaseline !== '' &&
      (initialData?.baseline == null || String(initialData.baseline).trim() === '')
    ) {
      setValue('baseline', fallbackBaseline, {
        shouldValidate: true,
        shouldDirty: false,
      });
    }
  }, [initialData, indikatorOptions, setValue]);

  useEffect(() => {
    if (!selectedTujuanId) return;

    if (!initialData) {
      setValue('sasaran_id', '');
      setValue('indikator_id', '');
      setPaguInfoMessage('');
      prevSasaranIdRef.current = undefined;
    }
  }, [selectedTujuanId, initialData, setValue]);

  useEffect(() => {
    const cur = selectedSasaranId || undefined;
    const prev = prevSasaranIdRef.current;

    if (prev !== undefined && prev !== cur) {
      setValue('indikator_id', '');
      setPaguInfoMessage('');
    }

    prevSasaranIdRef.current = cur;
  }, [selectedSasaranId, setValue]);

  useEffect(() => {
    if (!selectedSasaranId) return;

    const selected = sasaranOptions.find((s) => String(s.id) === String(selectedSasaranId));

    if (selected) {
      setValue('kode_sasaran', selected.nomor ?? '');
      setValue('nama_sasaran', selected.isi_sasaran ?? '');
    }
  }, [selectedSasaranId, sasaranOptions, setValue]);

  useEffect(() => {
    if (!selectedIndikatorId) return;

    const selected = indikatorOptions.find((i) => String(i.id) === String(selectedIndikatorId));

    if (!selected) return;

    const baselineValue =
      selected.baseline ??
      sourceIndikatorDetail?.baseline ??
      sourceIndikatorDetail?.capaian_tahun_5 ??
      initialData?.baseline ??
      '';

    setValue('baseline', baselineValue, {
      shouldValidate: true,
      shouldDirty: true,
    });

    setValue('satuan_target', selected.satuan ?? '', {
      shouldValidate: true,
      shouldDirty: true,
    });

    const lokasi =
      initialData?.lokasi ||
      selected.lokasi?.trim?.() ||
      selected.renstra?.bidang_opd?.trim?.() ||
      selected.sumber_data?.trim?.() ||
      '';

    setValue('lokasi', lokasi, {
      shouldValidate: true,
      shouldDirty: true,
    });

    for (let i = 1; i <= 6; i++) {
      const key = `target_tahun_${i}`;
      let value = selected[key];

      if (i === 6) value = 0;

      setValue(key, value ?? '', {
        shouldValidate: true,
        shouldDirty: true,
      });
    }

    const paguAcuan = Number(
      selected.pagu_cached ||
        selected.total_pagu_rpjmd ||
        selected.pagu_rpjmd_acuan ||
        initialData?.pagu_rpjmd_acuan ||
        0,
    );

    const paguDasar = Math.floor(paguAcuan / 5);
    const sisaPagu = paguAcuan - paguDasar * 5;

    setValue('pagu_rpjmd_acuan', paguAcuan, {
      shouldValidate: true,
      shouldDirty: true,
    });

    for (let i = 1; i <= 4; i++) {
      setValue(`pagu_tahun_${i}`, paguDasar, {
        shouldValidate: true,
        shouldDirty: true,
      });
    }

    setValue('pagu_tahun_5', paguDasar + sisaPagu, {
      shouldValidate: true,
      shouldDirty: true,
    });

    setValue('pagu_tahun_6', 0, {
      shouldValidate: true,
      shouldDirty: true,
    });

    setValue('pagu_akhir_renstra', paguAcuan, {
      shouldValidate: true,
      shouldDirty: true,
    });

    setPaguInfoMessage(
      `Pagu RPJMD Rp ${paguAcuan.toLocaleString(
        'id-ID',
      )} dibagi ke tahun 1–5. Jika ada sisa, dimasukkan ke tahun ke-5.`,
    );
  }, [selectedIndikatorId, indikatorOptions, setValue, initialData, sourceIndikatorDetail]);

  const targetValues = watch([
    'target_tahun_1',
    'target_tahun_2',
    'target_tahun_3',
    'target_tahun_4',
    'target_tahun_5',
  ]);

  const paguValues = watch([
    'pagu_tahun_1',
    'pagu_tahun_2',
    'pagu_tahun_3',
    'pagu_tahun_4',
    'pagu_tahun_5',
  ]);

  const targetAkhirRenstra = useMemo(() => {
    const nums = targetValues.map((v) => Number(v) || 0);
    const total = nums.reduce((a, b) => a + b, 0);
    return nums.length ? (total / nums.length).toFixed(2) : 0;
  }, [targetValues]);

  const paguAkhirRenstra = useMemo(() => {
    return paguValues.reduce((sum, value) => sum + (Number(value) || 0), 0);
  }, [paguValues]);

  useEffect(() => {
    setValue('target_akhir_renstra', targetAkhirRenstra, {
      shouldDirty: false,
    });
  }, [targetAkhirRenstra, setValue]);

  useEffect(() => {
    setValue('pagu_akhir_renstra', paguAkhirRenstra, {
      shouldDirty: false,
    });
  }, [paguAkhirRenstra, setValue]);

  const breadcrumbChain = useRenstraBreadcrumb({
    tujuanId: initialData?.tujuan_id || null,
    currentLabel: initialData ? 'Edit Sasaran' : 'Tambah Sasaran',
  });

  console.log('initialData tujuan_id:', initialData?.tujuan_id, 'id:', initialData?.id);

  const handleSubmitRevisi = async (data) => {
    if (!initialData?.id) {
      return onSubmit(data);
    }

    if (!alasanRevisi.trim()) {
      setServerMessage('Alasan revisi wajib diisi.');
      return;
    }

    try {
      setSubmitRevisiLoading(true);
      setServerMessage('');

      const payload = {
        ...generatePayload(data),
        alasan_revisi: alasanRevisi,
      };

      await api.put(`/renstra-tabel-sasaran/${initialData.id}/revisi`, payload);

      await refetchHistory();
      setServerMessage('✅ Revisi berhasil disimpan sebagai draft.');
      navigate('/dashboard-renstra');
    } catch (err) {
      setServerMessage(
        err?.response?.data?.message || err?.response?.data?.error || 'Gagal menyimpan revisi.',
      );
    } finally {
      setSubmitRevisiLoading(false);
    }
  };

  if (
    !renstraAktif ||
    loadingTujuan ||
    loadingSasaran ||
    (!!selectedSasaranId && loadingIndikator)
  ) {
    return <SpinnerFullscreen tip="Memuat data..." />;
  }

  return (
    <Card title={initialData ? 'Edit Renstra Tabel Sasaran' : 'Tambah Renstra Tabel Sasaran'}>
      <RenstraBreadcrumb chain={breadcrumbChain} />
      <div style={{ marginBottom: 16, display: 'flex', gap: 8 }}>
        <Button onClick={() => navigate('/dashboard-renstra')}>🔙 Kembali</Button>
      </div>
      <form onSubmit={handleSubmit(initialData ? handleSubmitRevisi : onSubmit)}>
        <SelectWithLabelValue
          name="tujuan_id"
          label="Tujuan"
          control={control}
          errors={errors}
          required
          options={tujuanOptions.map((item) => ({
            label: `${item.no_tujuan ?? ''} - ${item.isi_tujuan}`,
            value: String(item.id),
          }))}
        />

        <SelectWithLabelValue
          name="sasaran_id"
          label="Sasaran"
          control={control}
          errors={errors}
          required
          options={sasaranSelectOptions}
        />

        <InputField
          name="kode_sasaran"
          label="Kode Sasaran"
          control={control}
          errors={errors}
          disabled
        />

        <InputField
          name="nama_sasaran"
          label="Nama Sasaran"
          control={control}
          errors={errors}
          disabled
        />

        <SelectWithLabelValue
          name="indikator_id"
          label="Indikator"
          control={control}
          errors={errors}
          required
          loading={loadingIndikator}
          disabled={!selectedSasaranId}
          options={indikatorSelectOptions}
        />

        <InputField name="baseline" label="Baseline" control={control} errors={errors} />

        <InputField name="satuan_target" label="Satuan Target" control={control} errors={errors} />

        <InputField name="lokasi" label="Lokasi" control={control} errors={errors} />

        <h4 style={{ marginTop: 24 }}>Target periode (th. ke-1 s/d ke-5)</h4>

        {YEARS.map((i) => (
          <InputField
            key={`target_tahun_${i}`}
            name={`target_tahun_${i}`}
            label={`Target (th. ke-${i})`}
            control={control}
            errors={errors}
          />
        ))}

        <h4 style={{ marginTop: 24 }}>Pagu RPJMD Acuan</h4>

        <CurrencyInputField
          name="pagu_rpjmd_acuan"
          label="Pagu RPJMD Acuan"
          control={control}
          errors={errors}
          disabled
        />

        <h4 style={{ marginTop: 24 }}>Pagu Renstra periode (th. ke-1 s/d ke-5)</h4>

        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
          message="Informasi Pagu"
          description={
            paguInfoMessage ||
            'Pagu RPJMD Acuan bersifat read-only. Pagu Renstra dapat direvisi dan seluruh perubahan tersimpan di history.'
          }
        />

        {YEARS.map((i) => (
          <CurrencyInputField
            key={`pagu_tahun_${i}`}
            name={`pagu_tahun_${i}`}
            label={`Pagu Renstra (th. ke-${i})`}
            control={control}
            errors={errors}
            disabled={!initialData}
          />
        ))}

        <h4 style={{ marginTop: 24 }}>Kondisi Akhir Kinerja Periode Renstra</h4>

        <InputField
          name="target_akhir_renstra"
          label="Target Akhir Renstra"
          control={control}
          errors={errors}
          disabled
        />

        <CurrencyInputField
          name="pagu_akhir_renstra"
          label="Pagu Akhir Renstra"
          control={control}
          errors={errors}
          disabled
        />

        {initialData && (
          <div style={{ marginTop: 24 }}>
            <h4>Alasan Revisi</h4>
            <Input.TextArea
              rows={4}
              value={alasanRevisi}
              onChange={(e) => setAlasanRevisi(e.target.value)}
              placeholder="Tuliskan alasan revisi target/pagu Renstra..."
            />
          </div>
        )}

        {serverMessage && (
          <Alert
            style={{ marginTop: 16 }}
            type={serverMessage.startsWith('✅') ? 'success' : 'warning'}
            showIcon
            message={serverMessage}
          />
        )}

        <Button
          type="primary"
          htmlType="submit"
          loading={initialData ? submitRevisiLoading : isSubmitting}
        >
          {initialData ? 'Simpan Revisi' : 'Simpan'}
        </Button>

        {initialData && historyRows.length > 0 && (
          <div style={{ marginTop: 32 }}>
            <h3>Riwayat Revisi</h3>

            {historyRows.map((row) => (
              <Card
                key={row.id}
                size="small"
                style={{ marginBottom: 16 }}
                title={`Versi ${row.versi_sebelum} → ${row.versi_sesudah} | ${row.status_revisi}`}
              >
                <p>
                  <strong>Alasan:</strong> {row.alasan_revisi || '-'}
                </p>

                <p>
                  <strong>Pagu Sebelum:</strong>{' '}
                  {Number(row.before_json?.pagu_akhir_renstra || 0).toLocaleString('id-ID')}
                </p>

                <p>
                  <strong>Pagu Setelah:</strong>{' '}
                  {Number(row.after_json?.pagu_akhir_renstra || 0).toLocaleString('id-ID')}
                </p>

                <p>
                  <strong>Dibuat:</strong> {row.dibuat_pada || '-'}
                </p>
                <p>
                  <strong>Diverifikasi:</strong> {row.diverifikasi_pada || '-'}
                </p>
                <p>
                  <strong>Disetujui:</strong> {row.disetujui_pada || '-'}
                </p>
              </Card>
            ))}
          </div>
        )}
      </form>
    </Card>
  );
};

export default RenstraTabelSasaranForm;
