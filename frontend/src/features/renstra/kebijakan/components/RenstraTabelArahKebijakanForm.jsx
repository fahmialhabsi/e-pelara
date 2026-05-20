import React, { useEffect, useMemo, useRef } from 'react';
import { Card, Button, Input, Alert } from 'antd';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import * as Yup from 'yup';

import api from '@/services/api';
import { useRenstraFormTemplate } from '@/hooks/templatesUseRenstra/useRenstraFormTemplate';
import SelectWithLabelValue from '@/shared/components/form/SelectWithLabelValue';
import InputField from '@/shared/components/form/InputField';
import CurrencyInputField from '@/shared/components/form/CurrencyInputField';

const YEARS = [1, 2, 3, 4, 5];
const ALL_YEARS = [1, 2, 3, 4, 5, 6];
const ENDPOINT = '/renstra-tabel-arah-kebijakan';
const REDIRECT = '/renstra/tabel/arah-kebijakan';

const getStrategiRenstraId = (item) => item?.id ?? null;
const getKebijakanRenstraId = (item) => item?.id ?? null;

const getKebijakanStrategiId = (item) =>
  item?.strategi_id ??
  item?.strategi?.id ??
  item?.renstra_strategi_id ??
  item?.parent_strategi_id ??
  null;

const getFirstFilledValue = (...values) => {
  for (const value of values) {
    if (value === null || value === undefined) continue;
    if (typeof value === 'string' && value.trim() === '') continue;
    return value;
  }

  return '';
};

const uniqueOptionsByValue = (options) => {
  const map = new Map();

  options.forEach((item) => {
    if (!item?.value) return;
    if (!map.has(String(item.value))) {
      map.set(String(item.value), item);
    }
  });

  return Array.from(map.values());
};

const makeLabel = (...parts) =>
  parts
    .map((item) => (item !== null && item !== undefined ? String(item).trim() : ''))
    .filter(Boolean)
    .join(' - ');

function distributePagu(total, jumlahTahun = 5) {
  const safeTotal = Number(total || 0);

  const result = ALL_YEARS.reduce((acc, i) => {
    acc[`pagu_tahun_${i}`] = 0;
    return acc;
  }, {});

  if (!safeTotal || safeTotal <= 0) return result;

  const base = Math.floor(safeTotal / jumlahTahun);
  const sisa = safeTotal - base * jumlahTahun;

  YEARS.forEach((i) => {
    result[`pagu_tahun_${i}`] = i === jumlahTahun ? base + sisa : base;
  });

  result.pagu_tahun_6 = 0;

  return result;
}

export default function RenstraTabelArahKebijakanForm({ initialData = null, renstraAktif }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const renstraId = renstraAktif?.id;

  const isApproved = initialData?.status_revisi === 'approved';
  const isRevisiMode = isApproved && searchParams.get('mode') === 'revisi';
  const isAuditMode = isApproved && !isRevisiMode;

  const formTitle = initialData
    ? isRevisiMode
      ? 'Revisi Renstra Tabel Arah Kebijakan'
      : isAuditMode
        ? 'Audit Renstra Tabel Arah Kebijakan'
        : 'Edit Renstra Tabel Arah Kebijakan'
    : 'Tambah Renstra Tabel Arah Kebijakan';
  const [alasanRevisi, setAlasanRevisi] = React.useState('');
  const [submitRevisiLoading, setSubmitRevisiLoading] = React.useState(false);
  const [serverMessage, setServerMessage] = React.useState('');

  const { data: strategiOptions = [], isLoading: loadingStrategi } = useQuery({
    queryKey: ['renstra-strategi-arah-kebijakan-opts', renstraId],
    queryFn: async () => {
      const res = await api.get('/renstra-strategi', { params: { renstra_id: renstraId } });
      return Array.isArray(res.data?.data)
        ? res.data.data
        : Array.isArray(res.data)
          ? res.data
          : [];
    },
    enabled: !!renstraId,
  });

  const { data: kebijakanOptions = [], isLoading: loadingKebijakan } = useQuery({
    queryKey: ['renstra-kebijakan-opts', renstraId],
    queryFn: async () => {
      const res = await api.get('/renstra-kebijakan', { params: { renstra_id: renstraId } });
      return Array.isArray(res.data?.data)
        ? res.data.data
        : Array.isArray(res.data)
          ? res.data
          : [];
    },
    enabled: !!renstraId,
  });

  const schema = () =>
    Yup.object({
      strategi_id: Yup.string().required('Strategi wajib dipilih'),
      kebijakan_id: Yup.string().required('Arah Kebijakan wajib dipilih'),
      indikator_id: Yup.string().required('Indikator wajib dipilih'),
      satuan_target: Yup.string().required('Satuan target wajib diisi'),
      lokasi: Yup.string().required('Lokasi wajib diisi'),

      alasan_revisi: initialData
        ? Yup.string().required('Alasan revisi wajib diisi')
        : Yup.string().nullable(),

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
    renstra_id: renstraId ?? '',
    strategi_id: initialData?.kebijakan?.strategi_id
      ? String(initialData.kebijakan.strategi_id)
      : initialData?.strategi_id
        ? String(initialData.strategi_id)
        : '',

    kebijakan_id: initialData?.kebijakan_id ? String(initialData.kebijakan_id) : '',
    kode_strategi: initialData?.kode_strategi ?? '',
    deskripsi_strategi: initialData?.deskripsi_strategi ?? '',
    kode_kebijakan: initialData?.kode_kebijakan ?? '',
    deskripsi_kebijakan: initialData?.deskripsi_kebijakan ?? '',
    indikator: initialData?.indikator ?? '',
    baseline: initialData?.baseline ?? '',
    satuan_target: initialData?.satuan_target ?? '',
    lokasi: initialData?.lokasi ?? renstraAktif?.bidang_opd ?? '',
    opd_penanggung_jawab: initialData?.opd_penanggung_jawab ?? renstraAktif?.nama_opd ?? '',
    ...ALL_YEARS.reduce(
      (acc, i) => ({
        ...acc,
        [`target_tahun_${i}`]: i === 6 ? 0 : (initialData?.[`target_tahun_${i}`] ?? ''),
        [`pagu_tahun_${i}`]: i === 6 ? 0 : Number(initialData?.[`pagu_tahun_${i}`] || 0),
      }),
      {},
    ),

    target_akhir_renstra: initialData?.target_akhir_renstra ?? '',
    pagu_rpjmd_acuan: Number(initialData?.pagu_rpjmd_acuan || 0),
    pagu_akhir_renstra: Number(initialData?.pagu_akhir_renstra || 0),
    indikator_id: initialData?.indikator_id ? String(initialData.indikator_id) : '',
  };

  const generatePayload = (data) => {
    const selectedIndikator = indikatorOptions.find(
      (x) => String(x.id) === String(data.indikator_id),
    );

    const selectedKebijakanNumber = selectedKebijakan
      ? Number(selectedKebijakan.id)
      : Number(data.kebijakan_id);

    if (
      selectedIndikator &&
      Number(selectedIndikator._resolved_ref_id || 0) !== selectedKebijakanNumber
    ) {
      throw new Error(
        'Indikator belum valid untuk disimpan. Indikator harus berasal dari indikator_renstra stage kebijakan dengan ref_id sama dengan kebijakan_id.',
      );
    }

    return {
      renstra_id: Number(renstraId),
      kebijakan_id: selectedKebijakanNumber,

      kode_kebijakan: data.kode_kebijakan,
      deskripsi_kebijakan: data.deskripsi_kebijakan,

      indikator_id: Number(data.indikator_id),
      indikator: selectedIndikator?.nama_indikator || data.indikator || '',

      baseline: data.baseline,
      satuan_target: data.satuan_target,
      lokasi: data.lokasi,
      opd_penanggung_jawab: data.opd_penanggung_jawab,

      ...YEARS.reduce(
        (acc, i) => ({
          ...acc,
          [`target_tahun_${i}`]: Number(data[`target_tahun_${i}`]) || 0,
          [`pagu_tahun_${i}`]: Number(data[`pagu_tahun_${i}`]) || 0,
        }),
        {},
      ),

      ...(initialData ? { alasan_revisi: data.alasan_revisi } : {}),
    };
  };

  const { form, onSubmit, isSubmitting } = useRenstraFormTemplate({
    initialData,
    renstraAktif,
    endpoint: ENDPOINT,
    schema,
    defaultValues,
    generatePayload,
    queryKeys: ['renstra-tabel-arah-kebijakan'],
    redirectPath: REDIRECT,
  });

  const {
    control,
    handleSubmit,
    setValue,
    watch,
    clearErrors,
    formState: { errors },
  } = form;
  const selectedStrategiId = watch('strategi_id');
  const selectedKebijakanId = watch('kebijakan_id');

  const editStrategiId = initialData?.kebijakan?.strategi_id || initialData?.strategi_id;

  const selectedKebijakan = kebijakanOptions.find(
    (x) => String(getKebijakanRenstraId(x)) === String(selectedKebijakanId),
  );

  const indikatorRefId = selectedKebijakanId || initialData?.id || null;

  const { data: paguCache = null, isLoading: loadingPaguCache } = useQuery({
    queryKey: ['renstra-pagu-cache', 'kebijakan', initialData?.id],
    queryFn: async () => {
      const res = await api.get('/renstra-pagu-cache', {
        params: {
          stage: 'kebijakan',
          ref_id: initialData.id,
        },
      });

      const rows = Array.isArray(res.data) ? res.data : [];
      return rows[0] || null;
    },
    enabled: !!initialData?.id,
  });

  const { data: indikatorOptions = [], isLoading: loadingIndikator } = useQuery({
    queryKey: ['indikator-renstra', renstraId, 'kebijakan', indikatorRefId],
    queryFn: async () => {
      const res = await api.get('/indikator-renstra', {
        params: {
          renstra_id: renstraId,
          stage: 'kebijakan',
          ref_id: indikatorRefId,
        },
      });

      const raw = res.data;
      return Array.isArray(raw) ? raw : (raw?.data ?? []);
    },
    enabled: !!renstraId && !!indikatorRefId,
  });

  useEffect(() => {
    if (!selectedKebijakanId) return;
    if (loadingIndikator) return;
    if (initialData) return;
    if (indikatorOptions.length > 0) return;

    setValue('indikator_id', '', {
      shouldValidate: true,
      shouldDirty: true,
    });

    setValue('indikator', '', {
      shouldValidate: false,
      shouldDirty: false,
    });

    setValue('baseline', '', {
      shouldValidate: false,
      shouldDirty: false,
    });

    setValue('satuan_target', '', {
      shouldValidate: true,
      shouldDirty: false,
    });

    setValue('lokasi', renstraAktif?.bidang_opd || '', {
      shouldValidate: true,
      shouldDirty: false,
    });

    YEARS.forEach((i) => {
      setValue(`target_tahun_${i}`, '', {
        shouldValidate: false,
        shouldDirty: false,
      });
    });

    setValue('target_tahun_6', 0, {
      shouldValidate: false,
      shouldDirty: false,
    });

    setValue('target_akhir_renstra', '', {
      shouldValidate: false,
      shouldDirty: false,
    });
  }, [
    selectedKebijakanId,
    loadingIndikator,
    indikatorOptions.length,
    initialData,
    renstraAktif?.bidang_opd,
    setValue,
  ]);

  useEffect(() => {
    if (!selectedStrategiId) return;

    const strategiFromEdit =
      strategiOptions.find((item) => String(item.id) === String(editStrategiId)) ||
      initialData?.kebijakan?.strategi ||
      initialData?.strategi ||
      null;

    const selectedStrategi = strategiOptions.find(
      (x) => String(getStrategiRenstraId(x)) === String(selectedStrategiId),
    );

    const isEditStrategi = initialData && String(selectedStrategiId) === String(editStrategiId);

    const source = isEditStrategi ? strategiFromEdit || selectedStrategi : selectedStrategi;

    if (!source) return;

    setValue(
      'kode_strategi',
      source.kode_strategi || source.kode || initialData?.kode_strategi || '',
    );

    setValue(
      'deskripsi_strategi',
      source.deskripsi ||
        source.isi_strategi ||
        source.isi_strategi_rpjmd ||
        initialData?.deskripsi_strategi ||
        '',
    );
  }, [selectedStrategiId, strategiOptions, initialData, editStrategiId, setValue]);

  useEffect(() => {
    if (!selectedKebijakanId) return;

    clearErrors(['kebijakan_id']);

    const selectedKebijakan = kebijakanOptions.find(
      (x) => String(getKebijakanRenstraId(x)) === String(selectedKebijakanId),
    );

    if (selectedKebijakan) {
      setValue('kebijakan_id', String(selectedKebijakanId), {
        shouldValidate: true,
        shouldDirty: true,
      });

      setValue(
        'kode_kebijakan',
        selectedKebijakan.kode_kebjkn ||
          selectedKebijakan.kode_kebijakan ||
          selectedKebijakan.kode ||
          '',
        {
          shouldValidate: false,
          shouldDirty: false,
        },
      );

      setValue(
        'deskripsi_kebijakan',
        selectedKebijakan.deskripsi || selectedKebijakan.isi_kebijakan || '',
        {
          shouldValidate: false,
          shouldDirty: false,
        },
      );
    }
  }, [selectedKebijakanId, kebijakanOptions, setValue, clearErrors, initialData, renstraId]);

  const selectedIndikatorId = watch('indikator_id');
  const prevKebijakanIdRef = useRef(undefined);

  const prevStrategiIdRef = useRef(undefined);

  useEffect(() => {
    const currentStrategiId = selectedStrategiId || undefined;
    const previousStrategiId = prevStrategiIdRef.current;

    if (
      !initialData &&
      previousStrategiId !== undefined &&
      previousStrategiId !== currentStrategiId
    ) {
      setValue('kebijakan_id', '', {
        shouldValidate: true,
        shouldDirty: true,
      });

      setValue('indikator_id', '', {
        shouldValidate: true,
        shouldDirty: true,
      });

      setValue('kode_kebijakan', '', {
        shouldValidate: false,
        shouldDirty: false,
      });

      setValue('deskripsi_kebijakan', '', {
        shouldValidate: false,
        shouldDirty: false,
      });

    }

    prevStrategiIdRef.current = currentStrategiId;
  }, [selectedStrategiId, initialData, setValue]);

  const strategiSelectOptions = useMemo(() => {
    const strategiFromEdit =
      strategiOptions.find((item) => String(item.id) === String(editStrategiId)) ||
      initialData?.kebijakan?.strategi ||
      initialData?.strategi ||
      null;

    const editLabel = makeLabel(
      strategiFromEdit?.kode_strategi || strategiFromEdit?.kode || initialData?.kode_strategi,
      strategiFromEdit?.deskripsi ||
        strategiFromEdit?.isi_strategi ||
        initialData?.deskripsi_strategi,
    );

    const options = [];

    if (editStrategiId) {
      options.push({
        value: String(editStrategiId),
        label: editLabel || `Strategi ${editStrategiId}`,
      });
    }

    strategiOptions.forEach((item) => {
      const value = String(item.id);

      if (editStrategiId && value === String(editStrategiId)) {
        return;
      }

      options.push({
        value,
        label:
          makeLabel(
            item.kode_strategi || item.kode,
            item.deskripsi || item.isi_strategi || item.isi_strategi_rpjmd,
          ) || `Strategi ${item.id}`,
      });
    });

    return uniqueOptionsByValue(options);
  }, [strategiOptions, initialData, editStrategiId]);

  const kebijakanSelectOptions = useMemo(() => {
    const filteredKebijakan = kebijakanOptions.filter((item) => {
      if (!selectedStrategiId) return false;

      const itemStrategiId = getKebijakanStrategiId(item);

      return String(itemStrategiId) === String(selectedStrategiId);
    });

    const options = filteredKebijakan.map((item) => ({
      value: String(item.id),
      label: makeLabel(
        item.kode_kebjkn || item.kode_kebijakan,
        item.deskripsi || item.isi_kebijakan || '-',
      ),
    }));

    if (initialData?.kebijakan_id) {
      const isSameStrategi =
        !selectedStrategiId ||
        String(selectedStrategiId) ===
          String(
            initialData?.kebijakan?.strategi_id ||
              initialData?.strategi_id ||
              initialData?.kebijakan?.strategi?.id ||
              '',
          );

      const exists = options.some(
        (item) => String(item.value) === String(initialData.kebijakan_id),
      );

      if (isSameStrategi && !exists) {
        options.unshift({
          value: String(initialData.kebijakan_id),
          label: makeLabel(
            initialData?.kode_kebijakan || initialData?.kebijakan?.kode_kebjkn,
            initialData?.deskripsi_kebijakan ||
              initialData?.kebijakan?.deskripsi ||
              `Arah Kebijakan ${initialData.kebijakan_id}`,
          ),
        });
      }
    }

    return uniqueOptionsByValue(options);
  }, [kebijakanOptions, selectedStrategiId, initialData]);

  const indikatorSelectOptions = useMemo(() => {
    const options = indikatorOptions.map((item) => ({
      value: String(item.id),
      label: item.nama_indikator || item.kode_indikator || `Indikator ${item.id}`,
    }));

    if (initialData?.indikator_id) {
      const exists = options.some(
        (item) => String(item.value) === String(initialData.indikator_id),
      );

      if (!exists) {
        options.unshift({
          value: String(initialData.indikator_id),
          label:
            initialData?.indikator ||
            initialData?.indikator_detail?.nama_indikator ||
            `Indikator ${initialData.indikator_id}`,
        });
      }
    }

    return uniqueOptionsByValue(options);
  }, [indikatorOptions, initialData]);

  useEffect(() => {
    if (!initialData) return;

    setValue(
      'strategi_id',
      initialData?.kebijakan?.strategi_id
        ? String(initialData.kebijakan.strategi_id)
        : initialData?.strategi_id
          ? String(initialData.strategi_id)
          : '',
    );

    setValue('kebijakan_id', initialData?.kebijakan_id ? String(initialData.kebijakan_id) : '');

    setValue('indikator_id', initialData?.indikator_id ? String(initialData.indikator_id) : '');

    setValue('baseline', initialData?.baseline ?? '');
    setValue('indikator', initialData?.indikator ?? '');
    setValue('satuan_target', initialData?.satuan_target ?? '');
    setValue('lokasi', initialData?.lokasi ?? '');
    setValue('opd_penanggung_jawab', initialData?.opd_penanggung_jawab ?? '');

    [1, 2, 3, 4, 5].forEach((i) => {
      setValue(`target_tahun_${i}`, initialData?.[`target_tahun_${i}`] ?? '');
      setValue(`pagu_tahun_${i}`, Number(initialData?.[`pagu_tahun_${i}`] || 0));
    });

    setValue('target_tahun_6', 0);
    setValue('pagu_tahun_6', 0);
    setValue('target_akhir_renstra', initialData?.target_akhir_renstra ?? '');
    setValue('pagu_rpjmd_acuan', Number(initialData?.pagu_rpjmd_acuan || 0));
    setValue('pagu_akhir_renstra', Number(initialData?.pagu_akhir_renstra || 0));
  }, [initialData, setValue]);

  useEffect(() => {
    const cur = selectedKebijakanId || undefined;
    const prev = prevKebijakanIdRef.current;

    if (prev !== undefined && prev !== cur && !initialData) {
      setValue('indikator_id', '', {
        shouldValidate: true,
        shouldDirty: true,
      });

      setValue('indikator', '', {
        shouldValidate: false,
        shouldDirty: false,
      });

      setValue('baseline', '', {
        shouldValidate: false,
        shouldDirty: false,
      });

      setValue('satuan_target', '', {
        shouldValidate: true,
        shouldDirty: false,
      });

      setValue('lokasi', renstraAktif?.bidang_opd || '', {
        shouldValidate: true,
        shouldDirty: false,
      });

      YEARS.forEach((i) => {
        setValue(`target_tahun_${i}`, '', {
          shouldValidate: false,
          shouldDirty: false,
        });
      });

      setValue('target_tahun_6', 0, {
        shouldValidate: false,
        shouldDirty: false,
      });

      setValue('target_akhir_renstra', '', {
        shouldValidate: false,
        shouldDirty: false,
      });

    }

    prevKebijakanIdRef.current = cur;
  }, [selectedKebijakanId, initialData, renstraAktif?.bidang_opd, setValue]);

  useEffect(() => {
    if (!selectedIndikatorId) return;

    if (initialData && String(selectedIndikatorId) === String(initialData.indikator_id)) {
      return;
    }

    const selected = indikatorOptions.find((i) => String(i.id) === String(selectedIndikatorId));

    if (!selected) return;

    clearErrors(['indikator_id', 'satuan_target', 'lokasi']);

    setValue('indikator_id', String(selectedIndikatorId), {
      shouldValidate: true,
      shouldDirty: true,
    });

    setValue('indikator', selected.nama_indikator ?? '', {
      shouldValidate: false,
      shouldDirty: false,
    });

    setValue(
      'baseline',
      getFirstFilledValue(
        selected.baseline,
        selected.nilai_awal,
        selected.target_awal,
        selected.kondisi_awal,
        selected.baseline_awal,
        selected.nilai_baseline,
        selected.capaian_tahun_1,
        selected.capaian_awal,
        selected.target_tahun_1,
      ),
      {
        shouldValidate: false,
        shouldDirty: false,
      },
    );

    setValue('satuan_target', selected.satuan ?? '', {
      shouldValidate: true,
      shouldDirty: true,
    });

    setValue(
      'lokasi',
      getFirstFilledValue(
        selected.lokasi,
        selected.sumber_data,
        selected.keterangan,
        renstraAktif?.bidang_opd,
      ),
      {
        shouldValidate: true,
        shouldDirty: true,
      },
    );

    YEARS.forEach((i) => {
      setValue(`target_tahun_${i}`, selected[`target_tahun_${i}`] ?? '');
    });

    setValue('target_tahun_6', 0);

    if (!initialData) {
      const paguAcuan = Number(
        selected.pagu_cached ||
          selected.total_pagu_rpjmd ||
          selected.pagu_rpjmd_acuan ||
          selected.pagu_akhir_renstra ||
          0,
      );

      const paguDasar = Math.floor(paguAcuan / 5);
      const sisaPagu = paguAcuan - paguDasar * 5;

      setValue('pagu_rpjmd_acuan', paguAcuan);

      for (let i = 1; i <= 4; i++) {
        setValue(`pagu_tahun_${i}`, paguDasar);
      }

      setValue('pagu_tahun_5', paguDasar + sisaPagu);
      setValue('pagu_tahun_6', 0);
      setValue('pagu_akhir_renstra', paguAcuan);
    }
  }, [
    selectedIndikatorId,
    indikatorOptions,
    initialData,
    renstraAktif?.bidang_opd,
    setValue,
    clearErrors,
  ]);

  const targetValues = watch(YEARS.map((i) => `target_tahun_${i}`));

  const targetAkhir = useMemo(() => {
    const nums = targetValues.map((v) => Number(v) || 0);
    return nums.length ? (nums.reduce((a, b) => a + b, 0) / nums.length).toFixed(2) : 0;
  }, [targetValues]);

  const paguValues = watch(YEARS.map((i) => `pagu_tahun_${i}`));

  const paguAkhir = useMemo(() => {
    return paguValues.reduce((total, value) => total + (Number(value) || 0), 0);
  }, [paguValues]);

  useEffect(() => {
    setValue('pagu_akhir_renstra', paguAkhir, {
      shouldValidate: false,
      shouldDirty: false,
    });

    setValue('pagu_tahun_6', 0, {
      shouldValidate: false,
      shouldDirty: false,
    });
  }, [paguAkhir, setValue]);

  useEffect(() => setValue('target_akhir_renstra', targetAkhir), [targetAkhir, setValue]);

  // 🔴 CREATE: pagu otomatis dari cache/acuan.
  // 🔴 EDIT: pagu Renstra tahun 1–5 boleh diedit, pagu_rpjmd_acuan tetap readonly.
  useEffect(() => {
    if (initialData) {
      YEARS.forEach((i) => {
        setValue(`pagu_tahun_${i}`, Number(initialData[`pagu_tahun_${i}`] || 0), {
          shouldValidate: false,
          shouldDirty: false,
        });
      });

      setValue('pagu_tahun_6', 0, {
        shouldValidate: false,
        shouldDirty: false,
      });

      setValue('pagu_rpjmd_acuan', Number(initialData.pagu_rpjmd_acuan || 0), {
        shouldValidate: false,
        shouldDirty: false,
      });

      setValue(
        'pagu_akhir_renstra',
        YEARS.reduce((total, i) => total + Number(initialData[`pagu_tahun_${i}`] || 0), 0),
        {
          shouldValidate: false,
          shouldDirty: false,
        },
      );

      return;
    }

    const totalAcuan =
      Number(paguCache?.pagu_akhir_renstra || 0) ||
      Number(paguCache?.pagu_rpjmd_acuan || 0) ||
      Number(paguCache?.pagu_cached || 0);

    const distributed = distributePagu(totalAcuan, 5);

    ALL_YEARS.forEach((i) => {
      setValue(`pagu_tahun_${i}`, Number(distributed[`pagu_tahun_${i}`] || 0), {
        shouldValidate: false,
        shouldDirty: false,
      });
    });

    setValue('pagu_rpjmd_acuan', totalAcuan, {
      shouldValidate: false,
      shouldDirty: false,
    });

    setValue('pagu_akhir_renstra', totalAcuan, {
      shouldValidate: false,
      shouldDirty: false,
    });

  }, [initialData, paguCache, setValue]);

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

      if (isAuditMode) {
        setServerMessage('Data approved dalam mode audit. Klik Buat Revisi untuk mengubah.');
        return;
      }

      if (isApproved) {
        await api.post(`${ENDPOINT}/${initialData.id}/revisi`, payload);
      } else {
        await api.put(`${ENDPOINT}/${initialData.id}`, payload);
      }

      setServerMessage('✅ Revisi berhasil disimpan sebagai draft.');
    } catch (err) {
      setServerMessage(
        err?.response?.data?.message || err?.response?.data?.error || 'Gagal menyimpan revisi.',
      );
    } finally {
      setSubmitRevisiLoading(false);
    }
  };

  const isLoading = !renstraAktif || loadingStrategi || loadingKebijakan || loadingPaguCache;

  return (
    <Card title={formTitle}>
      <div style={{ marginBottom: 16, display: 'flex', gap: 8 }}>
        <Button onClick={() => navigate('/dashboard-renstra')}>🔙 Kembali</Button>
        <Button onClick={() => navigate(REDIRECT)}>📄 Daftar Arah Kebijakan</Button>
      </div>

      {isAuditMode && (
        <Alert
          type="success"
          showIcon
          style={{ marginBottom: 16 }}
          message="Data sudah approved"
          description="Mode audit aktif. Data tidak dapat diubah langsung. Klik Buat Revisi untuk membuat perubahan baru."
        />
      )}

      {isLoading ? (
        <div>Memuat data...</div>
      ) : (
        <form onSubmit={handleSubmit(initialData ? handleSubmitRevisi : onSubmit)}>
          <SelectWithLabelValue
            name="strategi_id"
            disabled={isAuditMode}
            label="Strategi Induk"
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
            name="kebijakan_id"
            label="Arah Kebijakan"
            control={control}
            errors={errors}
            required
            disabled={isAuditMode || !selectedStrategiId}
            options={kebijakanSelectOptions}
          />
          {selectedStrategiId && kebijakanSelectOptions.length === 0 && (
            <Alert
              type="warning"
              showIcon
              style={{ marginBottom: 16 }}
              message="Arah Kebijakan belum tersedia"
              description="Tidak ada arah kebijakan yang terhubung dengan strategi induk yang dipilih."
            />
          )}
          <InputField
            name="kode_kebijakan"
            label="Kode Arah Kebijakan"
            control={control}
            errors={errors}
            disabled
          />
          <InputField
            name="deskripsi_kebijakan"
            label="Deskripsi Arah Kebijakan"
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
            disabled={isAuditMode || !selectedKebijakanId || loadingIndikator}
            options={indikatorSelectOptions}
          />

          {selectedKebijakanId && !loadingIndikator && indikatorSelectOptions.length === 0 && (
            <Alert
              type="warning"
              showIcon
              style={{ marginBottom: 16 }}
              message="Indikator belum tersedia untuk simpan"
              description={`Tidak ada indikator_renstra stage kebijakan dengan ref_id = ${selectedKebijakanId}. Pastikan target Renstra kebijakan sudah disiapkan dan resolver source-map valid.`}
            />
          )}

          <InputField
            name="indikator"
            label="Nama Indikator"
            control={control}
            errors={errors}
            disabled
          />
          <InputField
            name="baseline"
            label="Baseline"
            control={control}
            errors={errors}
            disabled={isAuditMode}
          />

          <InputField
            name="satuan_target"
            label="Satuan Target"
            control={control}
            errors={errors}
            required
            disabled={isAuditMode}
          />

          <InputField
            name="lokasi"
            label="Lokasi"
            control={control}
            errors={errors}
            required
            disabled={isAuditMode}
          />

          <InputField
            name="opd_penanggung_jawab"
            label="OPD Penanggung Jawab"
            control={control}
            errors={errors}
            disabled={isAuditMode}
          />

          <h4 style={{ marginTop: 24 }}>Target periode (th. ke-1 s/d ke-5)</h4>
          {YEARS.map((i) => (
            <InputField
              key={`t${i}`}
              name={`target_tahun_${i}`}
              label={`Target (th. ke-${i})`}
              control={control}
              errors={errors}
              disabled={isAuditMode}
            />
          ))}

          <h2 style={{ marginTop: 24 }}>Pagu RPJMD Acuan</h2>

          <CurrencyInputField
            name="pagu_rpjmd_acuan"
            label="Pagu RPJMD Acuan"
            control={control}
            errors={errors}
            disabled
          />

          <h2 style={{ marginTop: 24 }}>Pagu Renstra periode (th. ke-1 s/d ke-5)</h2>

          {YEARS.map((i) => (
            <CurrencyInputField
              key={`p${i}`}
              name={`pagu_tahun_${i}`}
              label={`Pagu (th. ke-${i})`}
              control={control}
              errors={errors}
              disabled={isAuditMode || !initialData}
            />
          ))}

          <h2 style={{ marginTop: 24 }}>Kondisi Akhir Renstra</h2>
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

          <div style={{ marginTop: 24 }}>
            {isAuditMode ? (
              <Button
                type="dashed"
                style={{ borderColor: '#fa8c16', color: '#fa8c16' }}
                onClick={() =>
                  navigate(`/renstra/tabel/arah-kebijakan/edit/${initialData.id}?mode=revisi`)
                }
              >
                Buat Revisi
              </Button>
            ) : (
              <Button
                type="primary"
                htmlType="submit"
                loading={initialData ? submitRevisiLoading : isSubmitting}
              >
                {initialData ? (isApproved ? 'Buat Revisi' : 'Simpan Draft') : 'Simpan'}
              </Button>
            )}
          </div>
        </form>
      )}
    </Card>
  );
}
