import React, { useEffect, useMemo, useRef } from 'react';
import { useWatch } from 'react-hook-form';
import { Card, Button, Alert, Input } from 'antd';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import * as Yup from 'yup';

import api from '@/services/api';
import { useRenstraFormTemplate } from '@/hooks/templatesUseRenstra/useRenstraFormTemplate';
import SelectWithLabelValue from '@/shared/components/form/SelectWithLabelValue';
import InputField from '@/shared/components/form/InputField';
import CurrencyInputField from '@/shared/components/form/CurrencyInputField';

const YEARS = [1, 2, 3, 4, 5];
const ENDPOINT = '/renstra-tabel-strategi';
const REDIRECT = '/renstra/tabel/strategi';

const toPositiveNumber = (value) => {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : 0;
};

const pickPositiveNumber = (...values) => {
  for (const value of values) {
    const number = toPositiveNumber(value);
    if (number > 0) return number;
  }
  return 0;
};

const splitPaguToFiveYears = (total) => {
  const paguAcuan = toPositiveNumber(total);
  const paguDasar = Math.floor(paguAcuan / 5);
  const sisaPagu = paguAcuan - paguDasar * 5;

  return {
    pagu_tahun_1: paguDasar,
    pagu_tahun_2: paguDasar,
    pagu_tahun_3: paguDasar,
    pagu_tahun_4: paguDasar,
    pagu_tahun_5: paguDasar + sisaPagu,
    pagu_tahun_6: 0,
    pagu_akhir_renstra: paguAcuan,
  };
};

export default function RenstraTabelStrategiForm({ initialData = null, renstraAktif }) {
  const navigate = useNavigate();
  const renstraId = renstraAktif?.id;
  const [paguInfoMessage, setPaguInfoMessage] = React.useState('');
  const [existingDataInfo, setExistingDataInfo] = React.useState(null);
  const [alasanRevisi, setAlasanRevisi] = React.useState('');
  const [submitRevisiLoading, setSubmitRevisiLoading] = React.useState(false);
  const [serverMessage, setServerMessage] = React.useState('');

  const { data: strategiOptions = [], isLoading: loadingStrategi } = useQuery({
    queryKey: ['renstra-strategi-table-options', renstraId],
    queryFn: async () => {
      const res = await api.get('/renstra-strategi', {
        params: {
          renstra_id: renstraId,
        },
      });

      return Array.isArray(res.data?.data)
        ? res.data.data
        : Array.isArray(res.data)
          ? res.data
          : [];
    },
    enabled: !!renstraId,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const schema = () =>
    Yup.object({
      strategi_id: Yup.string().required('Strategi wajib dipilih'),
      indikator_id: Yup.string().required('Indikator wajib dipilih'),
      satuan_target: Yup.string().required('Satuan target wajib diisi'),
      lokasi: Yup.string().required('Lokasi wajib diisi'),
      ...YEARS.reduce(
        (acc, i) => ({
          ...acc,
          [`target_tahun_${i}`]: Yup.number().typeError('Harus angka').required(),
          [`pagu_tahun_${i}`]: Yup.number().typeError('Harus angka').required(),
        }),
        {},
      ),
    });

  const defaultValues = {
    renstra_id: initialData?.renstra_id ?? renstraId ?? '',

    strategi_id: initialData?.strategi_id ? String(initialData.strategi_id) : '',

    kode_strategi: initialData?.kode_strategi ?? '',
    deskripsi_strategi: initialData?.deskripsi_strategi ?? '',
    indikator: initialData?.indikator ?? '',

    indikator_id: initialData?.indikator_id ? String(initialData.indikator_id) : '',

    baseline: initialData?.baseline ?? '',
    satuan_target: initialData?.satuan_target ?? '',
    lokasi: initialData?.lokasi ?? renstraAktif?.bidang_opd ?? '',
    opd_penanggung_jawab: initialData?.opd_penanggung_jawab ?? renstraAktif?.nama_opd ?? '',

    target_tahun_1: initialData?.target_tahun_1 ?? '',
    target_tahun_2: initialData?.target_tahun_2 ?? '',
    target_tahun_3: initialData?.target_tahun_3 ?? '',
    target_tahun_4: initialData?.target_tahun_4 ?? '',
    target_tahun_5: initialData?.target_tahun_5 ?? '',
    target_tahun_6: 0,

    pagu_rpjmd_acuan: toPositiveNumber(initialData?.pagu_rpjmd_acuan),
    pagu_tahun_1: toPositiveNumber(initialData?.pagu_tahun_1),
    pagu_tahun_2: toPositiveNumber(initialData?.pagu_tahun_2),
    pagu_tahun_3: toPositiveNumber(initialData?.pagu_tahun_3),
    pagu_tahun_4: toPositiveNumber(initialData?.pagu_tahun_4),
    pagu_tahun_5: toPositiveNumber(initialData?.pagu_tahun_5),
    pagu_tahun_6: 0,
    pagu_akhir_renstra: toPositiveNumber(initialData?.pagu_akhir_renstra),

    target_akhir_renstra: initialData?.target_akhir_renstra ?? '',
    versi: initialData?.versi ?? 1,
    status_revisi: initialData?.status_revisi ?? 'draft',
  };

  const generatePayload = (data) => {
    const targetValues = YEARS.map((i) => Number(data[`target_tahun_${i}`]) || 0);

    const selectedIndikator = indikatorOptions.find(
      (x) =>
        String(x.id) === String(data.indikator_id) ||
        String(x.source_indikator_id) === String(data.indikator_id),
    );

    return {
      renstra_id: Number(data.renstra_id || renstraId),
      strategi_id: Number(
        strategiOptions.find((s) => String(s.id) === String(data.strategi_id))?.id,
      ),

      kode_strategi: data.kode_strategi,
      deskripsi_strategi: data.deskripsi_strategi,

      indikator_id: Number(data.indikator_id),
      indikator: selectedIndikator?.nama_indikator || data.indikator || '',

      baseline: data.baseline,
      satuan_target: data.satuan_target,
      lokasi: data.lokasi,
      opd_penanggung_jawab: data.opd_penanggung_jawab,

      target_tahun_1: data.target_tahun_1,
      target_tahun_2: data.target_tahun_2,
      target_tahun_3: data.target_tahun_3,
      target_tahun_4: data.target_tahun_4,
      target_tahun_5: data.target_tahun_5,
      target_tahun_6: 0,

      pagu_rpjmd_acuan: Number(data.pagu_rpjmd_acuan || 0),
      pagu_tahun_1: data.pagu_tahun_1,
      pagu_tahun_2: data.pagu_tahun_2,
      pagu_tahun_3: data.pagu_tahun_3,
      pagu_tahun_4: data.pagu_tahun_4,
      pagu_tahun_5: data.pagu_tahun_5,
      pagu_tahun_6: 0,

      target_akhir_renstra: targetValues.reduce((a, b) => a + b, 0) / targetValues.length || 0,

      pagu_akhir_renstra: Number(data.pagu_akhir_renstra || 0),
    };
  };

  const { form, onSubmit, isSubmitting } = useRenstraFormTemplate({
    initialData,
    renstraAktif,
    endpoint: ENDPOINT,
    schema,
    defaultValues,
    generatePayload,
    queryKeys: ['renstra-tabel-strategi'],
    redirectPath: REDIRECT,
  });

  const {
    control,
    handleSubmit,
    setValue,
    watch,
    getValues,
    formState: { errors },
  } = form;

  const selectedStrategiId = watch('strategi_id');

  const indikatorRefId = selectedStrategiId || initialData?.id || null;

  const { data: indikatorOptions = [], isLoading: loadingIndikator } = useQuery({
    queryKey: ['indikator-renstra', renstraId, 'strategi', indikatorRefId],
    queryFn: async () => {
      const res = await api.get('/indikator-renstra', {
        params: {
          renstra_id: renstraId,
          stage: 'strategi',
          ref_id: indikatorRefId,
        },
      });

      const raw = res.data;
      return Array.isArray(raw) ? raw : (raw?.data ?? []);
    },
    enabled: !!renstraId && !!indikatorRefId,
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
    queryKey: ['indikator-sasaran-source-detail-strategi', sourceIndikatorId],
    queryFn: async () => {
      const res = await api.get(`/indikator-sasaran/${sourceIndikatorId}`);
      return res.data?.data ?? res.data ?? null;
    },
    enabled: !!sourceIndikatorId,
  });

  const { data: initialIndikatorDetail } = useQuery({
    queryKey: ['indikator-renstra-detail-strategi', initialData?.indikator_id],
    queryFn: async () => {
      const res = await api.get(`/indikator-renstra/${initialData?.indikator_id}`);
      return res.data?.data ?? res.data ?? null;
    },
    enabled: !!initialData?.indikator_id,
  });

  const { data: paguCacheRows = [] } = useQuery({
    queryKey: ['renstra-pagu-cache', renstraId, 'strategi', initialData?.id],
    queryFn: async () => {
      const res = await api.get('/renstra-pagu-cache', {
        params: {
          renstra_id: renstraId,
          stage: 'strategi',
          ref_id: initialData?.id,
        },
      });
      return Array.isArray(res.data) ? res.data : (res.data?.data ?? []);
    },
    enabled: !!renstraId && !!initialData?.id,
  });

  const paguCache = paguCacheRows?.[0] ?? null;

  const selectedIndikatorId = watch('indikator_id');

  const selectedIndikator = useMemo(
    () =>
      indikatorOptions.find(
        (x) =>
          String(x.id) === String(selectedIndikatorId) ||
          String(x.source_indikator_id) === String(selectedIndikatorId),
      ),
    [indikatorOptions, selectedIndikatorId],
  );

  useEffect(() => {
    if (!selectedIndikatorId) return;
    let cancelled = false;

    queueMicrotask(() => {
      if (cancelled) return;

      const paguAcuan = pickPositiveNumber(
        // 1. Sumber cache tabel strategi jika sudah tersedia.
        paguCache?.pagu_akhir_renstra,
        paguCache?.pagu_rpjmd_acuan,

        // 2. Sumber utama dari indikator-renstra hierarchy.
        selectedIndikator?.pagu_cached,
        selectedIndikator?.total_pagu_rpjmd,
        selectedIndikator?.pagu_rpjmd_acuan,

        // 3. Detail indikator-renstra edit.
        initialIndikatorDetail?.pagu_cached,
        initialIndikatorDetail?.total_pagu_rpjmd,
        initialIndikatorDetail?.pagu_rpjmd_acuan,

        // 4. Fallback sumber indikator RPJMD jika tersedia.
        sourceIndikatorDetail?.pagu_cached,
        sourceIndikatorDetail?.total_pagu_rpjmd,
        sourceIndikatorDetail?.pagu_rpjmd_acuan,

        // 5. Initial data hanya boleh dipakai kalau nilainya positif.
        initialData?.pagu_rpjmd_acuan,
        initialData?.pagu_akhir_renstra,
      );

      if (!paguAcuan) {
        setPaguInfoMessage(
          'Pagu belum ditemukan dari cache atau indikator sumber. Nilai tidak diisi otomatis agar tidak menimpa data valid.',
        );
        return;
      }

      const split = splitPaguToFiveYears(paguAcuan);

      setValue('pagu_rpjmd_acuan', paguAcuan, {
        shouldDirty: false,
        shouldValidate: false,
      });

      YEARS.forEach((i) => {
        const cacheValue = toPositiveNumber(paguCache?.[`pagu_tahun_${i}`]);
        const initialValue = toPositiveNumber(initialData?.[`pagu_tahun_${i}`]);

        const finalValue = cacheValue || initialValue || split[`pagu_tahun_${i}`];

        setValue(`pagu_tahun_${i}`, finalValue, {
          shouldDirty: false,
          shouldValidate: false,
        });
      });

      setValue('pagu_tahun_6', 0, {
        shouldDirty: false,
        shouldValidate: false,
      });

      setValue('pagu_akhir_renstra', paguAcuan, {
        shouldDirty: false,
        shouldValidate: false,
      });

      setPaguInfoMessage(
        `Pagu RPJMD Rp ${paguAcuan.toLocaleString(
          'id-ID',
        )} dibaca dari cache/indikator sumber dan ditampilkan sebagai pagu read-only.`,
      );
    });

    return () => {
      cancelled = true;
    };
  }, [
    selectedIndikatorId,
    selectedIndikator,
    paguCache,
    initialIndikatorDetail,
    sourceIndikatorDetail,
    initialData?.id,
    initialData?.pagu_rpjmd_acuan,
    initialData?.pagu_akhir_renstra,
    initialData?.pagu_tahun_1,
    initialData?.pagu_tahun_2,
    initialData?.pagu_tahun_3,
    initialData?.pagu_tahun_4,
    initialData?.pagu_tahun_5,
    setValue,
  ]);

  const strategiSelectOptions = useMemo(() => {
    const options = strategiOptions
      .filter((s) => s.renstra_id && s.rpjmd_strategi_id)
      .map((s) => ({
        value: String(s.id),
        label: `${s.kode_strategi ?? ''} - ${
          s.deskripsi || s.isi_strategi || s.isi_strategi_rpjmd || '-'
        }`.trim(),
      }));

    if (initialData?.strategi_id) {
      const exists = options.some((opt) => String(opt.value) === String(initialData.strategi_id));

      if (!exists) {
        options.unshift({
          value: String(initialData.strategi_id),
          label: `${initialData.kode_strategi ?? ''} - ${
            initialData.deskripsi_strategi ?? '-'
          }`.trim(),
        });
      }
    }

    return options;
  }, [strategiOptions.length, initialData?.id, initialData?.strategi_id]);

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
            initialData?.indikator_detail?.nama_indikator ||
            initialData?.indikator ||
            `Indikator ${initialData.indikator_id}`,
        });
      }
    }

    return options;
  }, [indikatorOptions.length, initialData?.id, initialData?.indikator_id]);

  const prevStrategiIdRef = useRef(undefined);

  useEffect(() => {
    const cur = selectedStrategiId || undefined;
    const prev = prevStrategiIdRef.current;

    if (!initialData && prev !== undefined && prev !== cur) {
      setValue('indikator_id', '');
      setExistingDataInfo(null);
      setPaguInfoMessage('');
    }

    prevStrategiIdRef.current = cur;
  }, [selectedStrategiId, initialData?.id, setValue]);

  useEffect(() => {
    if (!initialData || !strategiSelectOptions.length) return;

    const selected = strategiSelectOptions.find(
      (opt) => String(opt.value) === String(initialData.strategi_id),
    );

    if (!selected) return;

    setValue('strategi_id', String(selected.value), {
      shouldValidate: true,
      shouldDirty: false,
    });
  }, [initialData?.id, initialData?.strategi_id, strategiSelectOptions.length, setValue]);

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

    if (
      (
        selectedOption.baseline === null ||
        selectedOption.baseline === undefined ||
        String(selectedOption.baseline).trim() === ''
      ) &&
      (sourceIndikatorDetail?.baseline !== null ||
        sourceIndikatorDetail?.baseline !== undefined ||
        sourceIndikatorDetail?.capaian_tahun_5 !== null ||
        sourceIndikatorDetail?.capaian_tahun_5 !== undefined)
    ) {
      setValue(
        'baseline',
        sourceIndikatorDetail.baseline ?? sourceIndikatorDetail.capaian_tahun_5 ?? '',
        {
          shouldValidate: true,
          shouldDirty: false,
        },
      );
    }
  }, [initialData?.id, initialData?.indikator_id, indikatorOptions.length, setValue]);

  useEffect(() => {
    if (!selectedStrategiId || !strategiOptions.length) return;

    const selected = strategiOptions.find((s) => String(s.id) === String(selectedStrategiId));

    if (!selected) return;

    setValue('kode_strategi', selected.kode_strategi ?? '');
    setValue(
      'deskripsi_strategi',
      selected.deskripsi || selected.isi_strategi || selected.isi_strategi_rpjmd || '',
    );
  }, [selectedStrategiId, strategiOptions.length, setValue]);

  useEffect(() => {
    if (!selectedIndikatorId) return;

    const selected = indikatorOptions.find((i) => String(i.id) === String(selectedIndikatorId));

    if (!selected) return;

    setValue(
      'baseline',
      selected.baseline ??
        sourceIndikatorDetail?.baseline ??
        sourceIndikatorDetail?.capaian_tahun_5 ??
        selected.nilai_awal ??
        selected.target_awal ??
        selected.kondisi_awal ??
        selected.baseline_awal ??
        '',
    );

    setValue('satuan_target', selected.satuan ?? '');

    setValue(
      'lokasi',
      [selected.lokasi, selected.sumber_data, selected.renstra?.bidang_opd, initialData?.lokasi]
        .map((x) => (x !== null && x !== undefined ? String(x).trim() : ''))
        .find(Boolean) ?? '',
    );

    YEARS.forEach((i) => {
      let val = selected[`target_tahun_${i}`];
      if (i === 6 && !val) val = selected.target_tahun_5;

      setValue(`target_tahun_${i}`, val ?? '');
    });
  }, [selectedIndikatorId, indikatorOptions.length, setValue, sourceIndikatorDetail]);

  const targetValues =
    useWatch({
      control,
      name: YEARS.map((i) => `target_tahun_${i}`),
    }) || [];

  const targetValuesKey = targetValues.join('|');

  const targetAkhir = useMemo(() => {
    const nums = targetValues.map((v) => Number(v) || 0);
    const total = nums.reduce((a, b) => a + b, 0);
    return nums.length ? (total / nums.length).toFixed(2) : 0;
  }, [targetValuesKey]);

  useEffect(() => {
    const current = String(getValues('target_akhir_renstra') ?? '');
    const next = String(targetAkhir ?? '');

    if (current === next) return;

    setValue('target_akhir_renstra', targetAkhir, {
      shouldDirty: false,
      shouldValidate: false,
    });
  }, [targetAkhir, getValues, setValue]);

  useEffect(() => {
    const currentTarget6 = Number(getValues('target_tahun_6') || 0);
    const currentPagu6 = Number(getValues('pagu_tahun_6') || 0);

    if (currentTarget6 !== 0) {
      setValue('target_tahun_6', 0, {
        shouldDirty: false,
        shouldValidate: false,
      });
    }

    if (currentPagu6 !== 0) {
      setValue('pagu_tahun_6', 0, {
        shouldDirty: false,
        shouldValidate: false,
      });
    }
  }, [getValues, setValue]);

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

      const statusRevisi = String(initialData?.status_revisi || '').toLowerCase();

      if (statusRevisi === 'approved') {
        await api.post(`/renstra-tabel-strategi/${initialData.id}/revisi`, payload);
        setServerMessage('✅ Revisi berhasil dibuat dari data approved sebagai draft.');
        return;
      }

      await api.put(`/renstra-tabel-strategi/${initialData.id}`, payload);
      setServerMessage('✅ Draft revisi berhasil diperbarui.');
    } catch (err) {
      setServerMessage(
        err?.response?.data?.message || err?.response?.data?.error || 'Gagal menyimpan revisi.',
      );
    } finally {
      setSubmitRevisiLoading(false);
    }
  };

  const isLoading = !renstraAktif || loadingStrategi || (!!selectedStrategiId && loadingIndikator);

  return (
    <Card title={initialData ? 'Edit Tabel Strategi' : 'Tambah Tabel Strategi'}>
      <div style={{ marginBottom: 16, display: 'flex', gap: 8 }}>
        <Button onClick={() => navigate('/dashboard-renstra')}>🔙 Kembali</Button>
        <Button onClick={() => navigate(REDIRECT)}>📄 Daftar Strategi</Button>
      </div>

      {isLoading ? (
        <div>Memuat data...</div>
      ) : (
        <form onSubmit={handleSubmit(initialData ? handleSubmitRevisi : onSubmit)}>
          <SelectWithLabelValue
            name="strategi_id"
            label="Strategi"
            control={control}
            errors={errors}
            required
            options={strategiSelectOptions}
          />
          <InputField
            name="kode_strategi"
            label="Kode Strategi"
            control={control}
            errors={errors}
            disabled
          />
          <InputField
            name="deskripsi_strategi"
            label="Deskripsi Strategi"
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
            disabled={!selectedStrategiId}
            options={indikatorSelectOptions}
          />
          <InputField name="baseline" label="Baseline" control={control} errors={errors} />
          <InputField
            name="satuan_target"
            label="Satuan Target"
            control={control}
            errors={errors}
            required
          />
          <InputField name="lokasi" label="Lokasi" control={control} errors={errors} required />
          <InputField
            name="opd_penanggung_jawab"
            label="OPD Penanggung Jawab"
            control={control}
            errors={errors}
            disabled
          />

          <h4 style={{ marginTop: 24 }}>Target periode (th. ke-1 s/d ke-5)</h4>
          {YEARS.map((i) => (
            <InputField
              key={`t${i}`}
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

          {paguInfoMessage && (
            <Alert
              type={paguInfoMessage.includes('Belum') ? 'warning' : 'success'}
              showIcon
              style={{ marginBottom: 16 }}
              message="Informasi Pagu"
              description={paguInfoMessage}
            />
          )}

          {YEARS.map((i) => (
            <CurrencyInputField
              key={`p${i}`}
              name={`pagu_tahun_${i}`}
              label={`Pagu (th. ke-${i})`}
              control={control}
              errors={errors}
              disabled={!initialData}
            />
          ))}

          <h4 style={{ marginTop: 24 }}>Kondisi Akhir Renstra</h4>
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

          {!existingDataInfo || initialData ? (
            <Button
              type="primary"
              htmlType="submit"
              loading={initialData ? submitRevisiLoading : isSubmitting}
            >
              {initialData ? 'Simpan Revisi' : 'Simpan'}
            </Button>
          ) : (
            <Alert
              type="warning"
              showIcon
              message="Data sudah ada"
              description="Gunakan Edit jika ingin mengubah."
            />
          )}
        </form>
      )}
    </Card>
  );
}
