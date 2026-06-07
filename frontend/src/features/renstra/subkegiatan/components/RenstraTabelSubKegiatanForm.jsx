// src/features/renstra/subkegiatan/components/RenstraTabelSubKegiatanForm.jsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Card, Button, Alert, message, Input } from 'antd';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useWatch, Controller } from 'react-hook-form';
import * as Yup from 'yup';

import api from '@/services/api';
import { useRenstraFormTemplate } from '@/hooks/templatesUseRenstra/useRenstraFormTemplate';
import SelectWithLabelValue from '@/shared/components/form/SelectWithLabelValue';
import InputField from '@/shared/components/form/InputField';
import CurrencyInputField from '@/shared/components/form/CurrencyInputField';
import SpinnerFullscreen from './RenstraTableSubKegiatanSpinnerFullscreen';
import RenstraBreadcrumb, {
  useRenstraBreadcrumb,
} from '@/features/renstra/shared/components/RenstraBreadcrumb';

const YEARS = [1, 2, 3, 4, 5];
const ALL_YEARS = [1, 2, 3, 4, 5, 6];
const ENDPOINT = '/renstra-tabel-subkegiatan';
const REDIRECT = '/dashboard-renstra';

const sanitizeSubKegiatanPayload = (payload = {}) => {
  const cleaned = { ...payload };

  // bukan bagian request body
  delete cleaned.id;
  delete cleaned.existingDataId;
  delete cleaned.renstra_opd_id;

  // metadata workflow/backend
  delete cleaned.versi;
  delete cleaned.status_revisi;
  delete cleaned.last_revised_at;
  delete cleaned.last_revised_by;
  delete cleaned.createdAt;
  delete cleaned.updatedAt;
  delete cleaned.created_at;
  delete cleaned.updated_at;

  // nested include dari GET detail/list
  delete cleaned.program;
  delete cleaned.kegiatan;
  delete cleaned.sub_kegiatan;
  delete cleaned.subkegiatan;
  delete cleaned.indikator_detail;
  delete cleaned.renstra;
  delete cleaned.histories;
  delete cleaned.children;

  // readonly / hasil hitung backend
  delete cleaned.pagu_rpjmd_acuan;
  delete cleaned.pagu_akhir_renstra;
  delete cleaned.target_akhir_renstra;

  // tahun ke-6 selalu dipaksa backend
  delete cleaned.target_tahun_6;
  delete cleaned.pagu_tahun_6;

  return cleaned;
};

const firstDefined = (...values) =>
  values.find((value) => value !== undefined && value !== null && value !== '') ?? null;

const toPositiveInt = (value) => {
  if (value === undefined || value === null || value === '') return null;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

const matchesCanonicalSubKegiatanRow = (row, selection = {}) => {
  const renstraId = toPositiveInt(selection.renstraId);
  const programId = toPositiveInt(selection.programId);
  const kegiatanId = toPositiveInt(selection.kegiatanId);
  const subKegiatanId = toPositiveInt(selection.subKegiatanId);
  const indikatorId = toPositiveInt(selection.indikatorId);

  if (!renstraId || !programId || !kegiatanId || !subKegiatanId || !indikatorId) {
    return false;
  }

  return (
    toPositiveInt(row?.renstra_id) === renstraId &&
    toPositiveInt(row?.program_id) === programId &&
    toPositiveInt(row?.kegiatan_id) === kegiatanId &&
    toPositiveInt(firstDefined(row?.sub_kegiatan_id, row?.subkegiatan_id)) === subKegiatanId &&
    toPositiveInt(row?.indikator_id) === indikatorId
  );
};

const RenstraTabelSubKegiatanForm = ({ initialData = null, renstraAktif }) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const renstraId = renstraAktif?.id;

  const isApproved = initialData?.status_revisi === 'approved';
  const isRevisiMode = isApproved && searchParams.get('mode') === 'revisi';
  const isAuditMode = isApproved && !isRevisiMode;

  const activeArahKebijakanId =
    toPositiveInt(searchParams.get('arah_kebijakan_id') || searchParams.get('kebijakan_id')) ||
    initialData?.kebijakan_id ||
    null;

  const activeStrategiId =
    toPositiveInt(searchParams.get('strategi_id')) || initialData?.strategi_id || null;

  const breadcrumbChain = useRenstraBreadcrumb({
    kebijakanId: activeArahKebijakanId,
    currentLabel: initialData ? 'Edit Sub Kegiatan' : 'Tambah Sub Kegiatan',
  });

  const [existingDataInfo, setExistingDataInfo] = useState(null);
  const [serverMessage, setServerMessage] = useState('');
  const [submitRevisiLoading, setSubmitRevisiLoading] = useState(false);

  const schema = () => {
    const num = (def = 0) =>
      Yup.number()
        .transform((_, orig) => {
          if (orig === '' || orig === null || orig === undefined) return def;
          const n = Number(orig);
          return Number.isFinite(n) ? n : def;
        })
        .default(def);

    return Yup.object({
      program_id: Yup.number().typeError('Program wajib dipilih').required('Program wajib dipilih'),

      kegiatan_id: Yup.number()
        .typeError('Kegiatan wajib dipilih')
        .required('Kegiatan wajib dipilih'),
      sub_kegiatan_id: Yup.number()
        .typeError('Sub kegiatan wajib dipilih')
        .required('Sub kegiatan wajib dipilih'),
      subkegiatan_id: Yup.mixed().nullable(),
      indikator_id: Yup.number()
        .typeError('Indikator wajib dipilih')
        .required('Indikator wajib dipilih'),
      indikator_manual: Yup.string().default(''),
      baseline: num(0),
      satuan_target: Yup.string().default(''),
      lokasi: Yup.string().default(''),
      kode_subkegiatan: Yup.string().default(''),
      nama_subkegiatan: Yup.string().default(''),
      target_tahun_1: num(0),
      target_tahun_2: num(0),
      target_tahun_3: num(0),
      target_tahun_4: num(0),
      target_tahun_5: num(0),
      target_tahun_6: num(0),
      pagu_tahun_1: num(0),
      pagu_tahun_2: num(0),
      pagu_tahun_3: num(0),
      pagu_tahun_4: num(0),
      pagu_tahun_5: num(0),
      pagu_tahun_6: num(0),
      target_akhir_renstra: num(0),
      pagu_akhir_renstra: num(0),
      alasan_revisi: initialData
        ? Yup.string().required('Alasan revisi wajib diisi')
        : Yup.string().nullable(),
    });
  };

  const defaultValues = {
    program_id: initialData?.program_id ?? null,
    kegiatan_id: initialData?.kegiatan_id ?? null,
    sub_kegiatan_id: initialData?.sub_kegiatan_id ?? null,
    subkegiatan_id: initialData?.subkegiatan_id ?? null,
    renstra_opd_id: initialData?.renstra_opd_id ?? renstraAktif?.id ?? '',
    indikator_id: initialData?.indikator_id ?? null,
    indikator_manual: initialData?.indikator_manual ?? '',
    kode_subkegiatan: initialData?.kode_subkegiatan ?? '',
    nama_subkegiatan: initialData?.nama_subkegiatan ?? '',
    sub_bidang_penanggung_jawab: initialData?.sub_bidang_penanggung_jawab ?? '',
    satuan_target: initialData?.satuan_target ?? '',
    lokasi: initialData?.lokasi ?? '',
    baseline: initialData?.baseline ?? 0,
    target_tahun_1: initialData?.target_tahun_1 ?? 0,
    target_tahun_2: initialData?.target_tahun_2 ?? 0,
    target_tahun_3: initialData?.target_tahun_3 ?? 0,
    target_tahun_4: initialData?.target_tahun_4 ?? 0,
    target_tahun_5: initialData?.target_tahun_5 ?? 0,
    target_tahun_6: initialData?.target_tahun_6 ?? 0,
    pagu_tahun_1: initialData?.pagu_tahun_1 ?? 0,
    pagu_tahun_2: initialData?.pagu_tahun_2 ?? 0,
    pagu_tahun_3: initialData?.pagu_tahun_3 ?? 0,
    pagu_tahun_4: initialData?.pagu_tahun_4 ?? 0,
    pagu_tahun_5: initialData?.pagu_tahun_5 ?? 0,
    pagu_tahun_6: initialData?.pagu_tahun_6 ?? 0,
    target_akhir_renstra: initialData?.target_akhir_renstra ?? 0,
    pagu_akhir_renstra: initialData?.pagu_akhir_renstra ?? 0,
    pagu_rpjmd_acuan: initialData?.pagu_rpjmd_acuan ?? 0,
    alasan_revisi: '',
  };

  const generatePayload = (data) => {
    const toNumber = (v, def = 0) => {
      if (v === '' || v === null || v === undefined) return def;
      const n = Number(v);
      return Number.isNaN(n) ? def : n;
    };

    const selectedIndikator = indikatorOptions.find(
      (x) => String(x.id) === String(data.indikator_id),
    );

    return sanitizeSubKegiatanPayload({
      renstra_id: Number(renstraId || data.renstra_id || initialData?.renstra_id),
      program_id: Number(data.program_id || 0),
      kegiatan_id: Number(data.kegiatan_id || 0),
      kebijakan_id: activeArahKebijakanId, // ← tambah
      strategi_id: activeStrategiId, // ← tambah
      sub_kegiatan_id: Number(data.sub_kegiatan_id || 0),
      subkegiatan_id: Number(data.subkegiatan_id || 0),
      indikator_id: Number(data.indikator_id || 0),
      indikator_manual: selectedIndikator?.nama_indikator || data.indikator_manual || '',
      kode_subkegiatan: data.kode_subkegiatan || '',
      nama_subkegiatan: data.nama_subkegiatan || '',
      sub_bidang_penanggung_jawab: data.sub_bidang_penanggung_jawab || '',
      satuan_target: data.satuan_target || '',
      lokasi: data.lokasi || '',
      baseline: toNumber(data.baseline),

      target_tahun_1: toNumber(data.target_tahun_1),
      target_tahun_2: toNumber(data.target_tahun_2),
      target_tahun_3: toNumber(data.target_tahun_3),
      target_tahun_4: toNumber(data.target_tahun_4),
      target_tahun_5: toNumber(data.target_tahun_5),

      pagu_tahun_1: normalizeCurrencyNumber(data.pagu_tahun_1),
      pagu_tahun_2: normalizeCurrencyNumber(data.pagu_tahun_2),
      pagu_tahun_3: normalizeCurrencyNumber(data.pagu_tahun_3),
      pagu_tahun_4: normalizeCurrencyNumber(data.pagu_tahun_4),
      pagu_tahun_5: normalizeCurrencyNumber(data.pagu_tahun_5),

      alasan_revisi: data.alasan_revisi || '',
    });
  };

  const normalizeCurrencyNumber = (value, def = 0) => {
    if (value === '' || value === null || value === undefined) return def;

    if (typeof value === 'number') {
      return Number.isFinite(value) ? Math.round(value) : def;
    }

    let raw = String(value).trim();

    // Format backend/desimal: 180000000.00
    if (/^\d+\.\d{1,2}$/.test(raw)) {
      return Math.round(Number(raw));
    }

    // Format Indonesia: Rp 180.000.000
    raw = raw.replace(/[^\d,-]/g, '');
    raw = raw.replace(/\./g, '');
    raw = raw.replace(',', '.');

    const n = Number(raw);
    return Number.isFinite(n) ? Math.round(n) : def;
  };

  const {
    form,
    onSubmit: templateSubmit,
    isSubmitting,
  } = useRenstraFormTemplate({
    initialData,
    renstraAktif,
    endpoint: ENDPOINT,
    schema,
    defaultValues,
    generatePayload,
    queryKeys: ['renstra-tabel-subkegiatan'],
    redirectPath: REDIRECT,
    mode: 'onChange',
  });

  const { control, handleSubmit, setValue, getValues, formState } = form;

  const selectedProgramId = useWatch({
    control,
    name: 'program_id',
  });

  const selectedKegiatanId = useWatch({
    control,
    name: 'kegiatan_id',
  });

  const selectedSubKegiatanId = useWatch({
    control,
    name: 'sub_kegiatan_id',
  });

  const selectedIndikatorId = useWatch({
    control,
    name: 'indikator_id',
  });

  const setValueIfChanged = useCallback(
    (name, nextValue, options = {}) => {
      const currentValue = getValues(name);

      if (String(currentValue ?? '') !== String(nextValue ?? '')) {
        setValue(name, nextValue, {
          shouldDirty: false,
          shouldValidate: false,
          ...options,
        });
      }
    },
    [getValues, setValue],
  );

  const tahunRpjmd = useMemo(() => {
    const y = Number(renstraAktif?.tahun_mulai);
    return Number.isFinite(y) && y > 0 ? y : new Date().getFullYear();
  }, [renstraAktif?.tahun_mulai]);

  const { data: programList = [], isLoading: loadingProgram } = useQuery({
    queryKey: ['renstra-program', renstraAktif?.id],
    queryFn: async () => {
      const res = await api.get('/renstra-program', {
        params: { renstra_id: renstraAktif?.id },
      });
      return Array.isArray(res.data) ? res.data : (res.data?.data ?? []);
    },
    enabled: !!renstraAktif?.id,
  });

  const { data: kegiatanList = [], isLoading: loadingKegiatan } = useQuery({
    queryKey: ['renstra-kegiatan-cascade', renstraAktif?.id, selectedProgramId],
    queryFn: async () => {
      const params = { renstra_id: renstraAktif?.id };
      if (selectedProgramId) params.program_id = selectedProgramId;

      const res = await api.get('/renstra-kegiatan', { params });
      return Array.isArray(res.data) ? res.data : (res.data?.data ?? []);
    },
    enabled: !!renstraAktif?.id && !!selectedProgramId,
  });

  const { data: subkegiatanList = [], isLoading: loadingSub } = useQuery({
    queryKey: ['renstra-subkegiatan', renstraId, selectedKegiatanId],
    queryFn: async () => {
      const res = await api.get('/renstra-subkegiatan', {
        params: {
          renstra_id: renstraId,
          kegiatan_id: selectedKegiatanId,
        },
      });

      return Array.isArray(res.data) ? res.data : (res.data?.data ?? []);
    },
    enabled: !!renstraId && !!selectedKegiatanId,
  });

  const selectedSubkegiatanRefId = selectedSubKegiatanId || null;

  const { data: indikatorOptions = [], isLoading: loadingIndikator } = useQuery({
    queryKey: ['indikator-renstra', renstraId, 'sub_kegiatan', selectedSubkegiatanRefId],
    queryFn: async () => {
      const res = await api.get('/indikator-renstra', {
        params: {
          renstra_id: renstraId,
          stage: 'sub_kegiatan',
          ref_id: selectedSubkegiatanRefId,
        },
      });

      return Array.isArray(res.data) ? res.data : (res.data?.data ?? []);
    },
    enabled: !!renstraId && !!selectedSubkegiatanRefId,
  });

  const prevSubkegiatanIdRef = useRef(undefined);

  // Legacy state sync: keep this effect until the form reducer refactor is scheduled.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => {
    const cur = selectedSubKegiatanId || undefined;
    const prev = prevSubkegiatanIdRef.current;

    if (prev !== undefined && prev !== cur) {
      setValueIfChanged('indikator_id', '', { shouldValidate: true });
      setValueIfChanged('indikator_manual', '');
      setValueIfChanged('baseline', 0);
      setValueIfChanged('satuan_target', '');
      setValueIfChanged('lokasi', '');
      YEARS.forEach((i) => {
        setValueIfChanged(`target_tahun_${i}`, 0);
        setValueIfChanged(`pagu_tahun_${i}`, 0);
      });
      setValueIfChanged('pagu_akhir_renstra', 0);
      setExistingDataInfo(null);
    }

    prevSubkegiatanIdRef.current = cur;
  }, [selectedSubKegiatanId]);

  useEffect(() => {
    if (!selectedIndikatorId) return;

    const selected = indikatorOptions.find((i) => String(i.id) === String(selectedIndikatorId));

    if (!selected) return;

    if (initialData && String(selectedIndikatorId) === String(initialData.indikator_id)) {
      return;
    }

    const parseNum = (v) => {
      if (v === null || v === undefined || v === '') return 0;
      const n = parseFloat(String(v).replace(',', '.'));
      return Number.isFinite(n) ? n : 0;
    };

    setValueIfChanged('indikator_manual', selected.nama_indikator ?? '');
    setValueIfChanged('baseline', parseNum(selected.baseline ?? selected.target_awal));
    setValueIfChanged('satuan_target', selected.satuan ?? selected.satuan_target ?? '');
    setValueIfChanged(
      'lokasi',
      [selected.lokasi, selected.sumber_data, selected.keterangan]
        .map((x) => (x !== null && x !== undefined ? String(x).trim() : ''))
        .find(Boolean) ?? '',
    );

    YEARS.forEach((i) => {
      const val =
        selected[`target_tahun_${i}`] ?? selected[`target_${i}`] ?? selected[`target_tahun${i}`];

      setValueIfChanged(`target_tahun_${i}`, parseNum(val));
    });

    const paguAcuan = Number(
      selected.pagu_cached ||
        selected.total_pagu_rpjmd ||
        selected.pagu_rpjmd_acuan ||
        selected.pagu_akhir_renstra ||
        0,
    );

    const paguDasar = Math.floor(paguAcuan / 5);
    const sisaPagu = paguAcuan - paguDasar * 5;

    setValueIfChanged('pagu_rpjmd_acuan', paguAcuan);

    for (let i = 1; i <= 4; i += 1) {
      setValueIfChanged(`pagu_tahun_${i}`, paguDasar);
    }

    setValueIfChanged('pagu_tahun_5', paguDasar + sisaPagu);
    setValueIfChanged('target_tahun_6', 0);
    setValueIfChanged('pagu_tahun_6', 0);
    setValueIfChanged('pagu_akhir_renstra', paguAcuan);
  }, [selectedIndikatorId, indikatorOptions?.length, initialData?.id]);

  useEffect(() => {
    if (!selectedSubkegiatanRefId || !renstraId || loadingIndikator || selectedIndikatorId) {
      return;
    }

    if (indikatorOptions.length !== 1) {
      return;
    }

    const onlyIndicator = indikatorOptions[0];
    if (!onlyIndicator?.id) return;

    setValueIfChanged('indikator_id', Number(onlyIndicator.id), { shouldValidate: true });
  }, [
    indikatorOptions,
    loadingIndikator,
    renstraId,
    selectedIndikatorId,
    selectedSubkegiatanRefId,
    setValueIfChanged,
  ]);

  useEffect(() => {
    setValueIfChanged('target_tahun_6', 0);
    setValueIfChanged('pagu_tahun_6', 0);
  }, []);

  useEffect(() => {
    if (initialData || !selectedSubkegiatanRefId || !renstraId) {
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const res = await api.get(ENDPOINT, {
          params: {
            renstra_id: renstraId,
            sub_kegiatan_id: selectedSubkegiatanRefId,
            indikator_id: selectedIndikatorId || undefined,
          },
        });

        const rows = Array.isArray(res.data) ? res.data : (res.data?.data ?? []);

        if (cancelled) return;

        if (rows.length === 1 && !selectedIndikatorId) {
          setValueIfChanged('indikator_id', Number(rows[0].id), { shouldValidate: true });
        } else if (!selectedIndikatorId) {
          setValueIfChanged('indikator_id', '', { shouldValidate: true });
          setValueIfChanged('indikator_manual', '');
          setValueIfChanged('baseline', 0);
          setValueIfChanged('satuan_target', '');
          setValueIfChanged('lokasi', '');

          YEARS.forEach((i) => {
            setValueIfChanged(`target_tahun_${i}`, 0);
            setValueIfChanged(`pagu_tahun_${i}`, 0);
          });
        }

        setExistingDataInfo(null);
      } catch (error) {
        setExistingDataInfo(null);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    initialData?.id,
    selectedSubkegiatanRefId,
    selectedProgramId,
    selectedKegiatanId,
    selectedIndikatorId,
    renstraId,
  ]);

  useEffect(() => {
    let cancelled = false;
    let timerId = null;

    const scheduleExistingDataInfo = (nextValue) => {
      timerId = window.setTimeout(() => {
        if (!cancelled) {
          setExistingDataInfo(nextValue);
        }
      }, 0);
    };

    if (
      initialData ||
      !selectedSubkegiatanRefId ||
      !selectedProgramId ||
      !selectedKegiatanId ||
      !selectedIndikatorId ||
      !renstraId
    ) {
      scheduleExistingDataInfo(null);
      return () => {
        cancelled = true;
        if (timerId !== null) {
          window.clearTimeout(timerId);
        }
      };
    }

    (async () => {
      try {
        const res = await api.get(ENDPOINT, {
          params: {
            renstra_id: renstraId,
            program_id: selectedProgramId,
            kegiatan_id: selectedKegiatanId,
            sub_kegiatan_id: selectedSubkegiatanRefId,
            indikator_id: selectedIndikatorId,
          },
        });

        const rows = Array.isArray(res.data) ? res.data : (res.data?.data ?? []);

        if (cancelled) return;

        const canonicalRows = rows.filter((row) =>
          matchesCanonicalSubKegiatanRow(row, {
            renstraId,
            programId: selectedProgramId,
            kegiatanId: selectedKegiatanId,
            subKegiatanId: selectedSubkegiatanRefId,
            indikatorId: selectedIndikatorId,
          }),
        );

        scheduleExistingDataInfo(canonicalRows[0] ?? null);
      } catch (error) {
        void error;
        scheduleExistingDataInfo(null);
      }
    })();

    return () => {
      cancelled = true;
      if (timerId !== null) {
        window.clearTimeout(timerId);
      }
    };
  }, [
    initialData?.id,
    selectedSubkegiatanRefId,
    selectedProgramId,
    selectedKegiatanId,
    selectedIndikatorId,
    renstraId,
  ]);

  useEffect(() => {
    if (!selectedSubKegiatanId || !subkegiatanList.length) return;

    const selected = subkegiatanList.find(
      (item) => Number(item.id) === Number(selectedSubKegiatanId),
    );

    if (!selected) return;

    setValueIfChanged('subkegiatan_id', selected.sub_kegiatan_id ?? null);
    setValueIfChanged('kode_subkegiatan', selected.kode_sub_kegiatan || '');
    setValueIfChanged('nama_subkegiatan', selected.nama_sub_kegiatan || '');
    setValueIfChanged('sub_bidang_penanggung_jawab', selected.sub_bidang_opd || '');
  }, [selectedSubKegiatanId, subkegiatanList?.length]);

  const clearDerivedSubFields = useCallback(() => {
    setValueIfChanged('subkegiatan_id', '');
    setValueIfChanged('kode_subkegiatan', '');
    setValueIfChanged('nama_subkegiatan', '');
    setValueIfChanged('sub_bidang_penanggung_jawab', '');
    setValueIfChanged('indikator_id', '', { shouldValidate: true });
    setValueIfChanged('indikator_manual', '');
    setValueIfChanged('baseline', 0);
    setValueIfChanged('satuan_target', '');
    setValueIfChanged('lokasi', '');

    YEARS.forEach((i) => {
      setValueIfChanged(`target_tahun_${i}`, 0);
      setValueIfChanged(`pagu_tahun_${i}`, 0);
    });

    setValueIfChanged('pagu_akhir_renstra', 0);
  }, [setValueIfChanged]);

  // Legacy form sync: keep this effect until the sub-kegiatan refactor is scheduled.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => {
    if (!initialData) {
      setValueIfChanged('kegiatan_id', '');
      clearDerivedSubFields();
    }
  }, [selectedProgramId, initialData?.id]);

  // Legacy form sync: keep this effect until the sub-kegiatan refactor is scheduled.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => {
    if (!initialData) {
      clearDerivedSubFields();
    }
  }, [selectedKegiatanId, initialData?.id]);

  // Legacy data sync: keep this effect until the sub-kegiatan refactor is scheduled.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => {
    if (initialData || !selectedSubKegiatanId || !tahunRpjmd) return;

    let cancelled = false;

    (async () => {
      try {
        const [subRes, indRes] = await Promise.all([
          api.get(`/sub-kegiatan/${selectedSubKegiatanId}`),
          api.get('/indikator-renstra', {
            params: {
              renstra_id: renstraId,
              stage: 'sub_kegiatan',
              ref_id: selectedSubKegiatanId,
            },
          }),
        ]);

        if (cancelled) return;

        const sub = subRes.data?.data ?? subRes.data;
        const indPayload = indRes.data?.data ?? indRes.data;
        const indRows = Array.isArray(indPayload) ? indPayload : [];

        if (sub) {
          setValueIfChanged('kode_subkegiatan', sub.kode_sub_kegiatan || '');
          setValueIfChanged('nama_subkegiatan', sub.nama_sub_kegiatan || '');
          setValueIfChanged('sub_bidang_penanggung_jawab', sub.sub_bidang_opd || '');
        }

        if (indRows.length === 1 && !selectedIndikatorId) {
          setValueIfChanged('indikator_id', Number(indRows[0].id), { shouldValidate: true });
        } else if (!selectedIndikatorId) {
          setValueIfChanged('indikator_id', '', { shouldValidate: true });
          setValueIfChanged('indikator_manual', '');
          setValueIfChanged('baseline', 0);
          setValueIfChanged('satuan_target', '');
          setValueIfChanged('lokasi', sub?.nama_opd || '');

          YEARS.forEach((i) => {
            setValueIfChanged(`target_tahun_${i}`, 0);
          });
        }

        const fromSub = Number(sub?.pagu_anggaran ?? sub?.total_pagu_anggaran ?? 0) || 0;

        if (fromSub > 0) {
          const totalPagu = Math.round(fromSub);
          const base = Math.floor(totalPagu / 5);
          const rem = totalPagu - base * 5;

          YEARS.forEach((i) => {
            setValueIfChanged(`pagu_tahun_${i}`, base + (i <= rem ? 1 : 0));
          });
        }
      } catch (error) {
        void error;
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [initialData?.id, selectedSubKegiatanId, tahunRpjmd]);

  useEffect(() => {
    if (!initialData) return;

    const parseNum = (v) => {
      if (v === null || v === undefined || v === '') return 0;
      return Number(v);
    };

    // IDENTITAS
    if (initialData.program_id) {
      setValueIfChanged('program_id', Number(initialData.program_id));
    }

    if (initialData.kegiatan_id) {
      setValueIfChanged('kegiatan_id', Number(initialData.kegiatan_id));
    }

    if (initialData.sub_kegiatan_id) {
      setValueIfChanged('sub_kegiatan_id', Number(initialData.sub_kegiatan_id));
    }

    if (initialData.subkegiatan_id) {
      setValueIfChanged('subkegiatan_id', Number(initialData.subkegiatan_id));
    }

    if (initialData.indikator_id) {
      setValueIfChanged('indikator_id', Number(initialData.indikator_id));
    }

    // DATA UTAMA
    setValueIfChanged('indikator_manual', initialData.indikator_manual ?? '');
    setValueIfChanged('baseline', parseNum(initialData.baseline));
    setValueIfChanged('satuan_target', initialData.satuan_target ?? '');
    setValueIfChanged('lokasi', initialData.lokasi ?? '');

    // TARGET
    YEARS.forEach((i) => {
      setValueIfChanged(`target_tahun_${i}`, parseNum(initialData[`target_tahun_${i}`]));
    });

    // 🔥 PAGU (INI YANG KURANG)
    YEARS.forEach((i) => {
      setValueIfChanged(`pagu_tahun_${i}`, parseNum(initialData[`pagu_tahun_${i}`]));
    });

    // META
    setValueIfChanged('pagu_rpjmd_acuan', parseNum(initialData.pagu_rpjmd_acuan));
    setValueIfChanged('pagu_akhir_renstra', parseNum(initialData.pagu_akhir_renstra));
    setValueIfChanged('target_akhir_renstra', parseNum(initialData.target_akhir_renstra));

    // LOCK YEAR 6
    setValueIfChanged('target_tahun_6', 0);
    setValueIfChanged('pagu_tahun_6', 0);
  }, [initialData?.id]);

  const targetValues =
    useWatch({
      control,
      name: YEARS.map((i) => `target_tahun_${i}`),
    }) || [];

  const paguValues =
    useWatch({
      control,
      name: YEARS.map((i) => `pagu_tahun_${i}`),
    }) || [];

  const targetAkhirRenstra = useMemo(() => {
    const nums = targetValues.map((v) => Number(v) || 0);
    const total = nums.reduce((a, b) => a + b, 0);
    return nums.length > 0 ? (total / nums.length).toFixed(2) : 0;
  }, [targetValues]);

  const paguAkhirRenstra = useMemo(() => {
    const nums = paguValues.map((v) => normalizeCurrencyNumber(v));
    return nums.reduce((a, b) => a + b, 0);
  }, [paguValues]);

  const paguInfoMessage = useMemo(() => {
    if (existingDataInfo) {
      return 'Data sudah ada. Gunakan Edit jika ingin mengubah.';
    }

    if (!selectedSubkegiatanRefId || loadingIndikator) {
      return '';
    }

    const hasPagu = (paguValues || []).some((value) => Number(value || 0) > 0);

    return hasPagu
      ? 'Pagu sudah terisi.'
      : 'Silakan isi pagu subkegiatan sebagai sumber utama agregasi.';
  }, [existingDataInfo, selectedSubkegiatanRefId, loadingIndikator, paguValues]);

  useEffect(() => {
    setValueIfChanged('target_akhir_renstra', targetAkhirRenstra);
    setValueIfChanged('pagu_akhir_renstra', paguAkhirRenstra);
  }, [targetAkhirRenstra, paguAkhirRenstra]);

  const handleSubmitFinal = async (data) => {
    const payload = generatePayload({
      ...data,
      target_tahun_6: 0,
      pagu_tahun_6: 0,
    });

    if (!initialData) {
      return templateSubmit({
        ...data,
        target_tahun_6: 0,
        pagu_tahun_6: 0,
      });
    }

    if (!String(data.alasan_revisi || '').trim()) {
      setServerMessage('Alasan revisi wajib diisi.');
      return;
    }

    try {
      setSubmitRevisiLoading(true);
      setServerMessage('');

      if (isAuditMode) {
        setServerMessage('Data approved dalam mode audit. Klik Buat Revisi untuk mengubah.');
        return;
      }

      if (isRevisiMode) {
        await api.post(`${ENDPOINT}/${initialData.id}/revisi`, payload);
      } else {
        await api.put(`${ENDPOINT}/${initialData.id}`, payload);
      }

      message.success('Revisi berhasil disimpan sebagai draft.');
      navigate(REDIRECT);
    } catch (err) {
      setServerMessage(
        err?.response?.data?.message || err?.response?.data?.error || 'Gagal menyimpan revisi.',
      );
    } finally {
      setSubmitRevisiLoading(false);
    }
  };

  const programOptions = (() => {
    const rows = Array.isArray(programList) ? [...programList] : [];

    if (
      initialData?.program_id &&
      !rows.some((item) => String(item.id) === String(initialData.program_id))
    ) {
      rows.unshift({
        id: initialData.program_id,
        kode_program: initialData.program?.kode_program || '',
        nama_program:
          initialData.program?.nama_program ||
          initialData.nama_program ||
          `Program ${initialData.program_id}`,
      });
    }

    return rows.map((item) => ({
      label: `${item.kode_program || ''} - ${
        item.nama_program || item.program?.nama_program || '-'
      }`,
      value: Number(item.id),
    }));
  })();

  const kegiatanOptions = (() => {
    const rows = Array.isArray(kegiatanList) ? [...kegiatanList] : [];

    if (
      initialData?.kegiatan_id &&
      !rows.some((item) => String(item.id) === String(initialData.kegiatan_id))
    ) {
      rows.unshift({
        id: initialData.kegiatan_id,
        kode_kegiatan: initialData.kegiatan?.kode_kegiatan || initialData.kode_kegiatan || '',
        nama_kegiatan:
          initialData.kegiatan?.nama_kegiatan ||
          initialData.nama_kegiatan ||
          `Kegiatan ${initialData.kegiatan_id}`,
      });
    }

    return rows.map((item) => ({
      label: `${item.kode_kegiatan || ''} - ${
        item.nama_kegiatan || item.kegiatan?.nama_kegiatan || '-'
      }`,
      value: Number(item.id),
    }));
  })();

  const indikatorSelectOptions = (() => {
    const rows = Array.isArray(indikatorOptions) ? [...indikatorOptions] : [];

    if (
      initialData?.indikator_id &&
      !rows.some((item) => String(item.id) === String(initialData.indikator_id))
    ) {
      rows.unshift({
        id: initialData.indikator_id,
        nama_indikator:
          initialData.indikator_detail?.nama_indikator ||
          initialData.indikator_manual ||
          initialData.indikator ||
          `Indikator ${initialData.indikator_id}`,
        kode_indikator: initialData.indikator_detail?.kode_indikator || '',
      });
    }

    return rows.map((item) => ({
      label: item.nama_indikator || item.kode_indikator || '-',
      value: Number(item.id),
    }));
  })();

  const isLoading = !renstraAktif || loadingProgram;

  return (
    <Card
      title={
        initialData
          ? isAuditMode
            ? 'Audit Renstra Tabel Sub Kegiatan'
            : isRevisiMode
              ? 'Revisi Renstra Tabel Sub Kegiatan'
              : 'Edit Renstra Tabel Sub Kegiatan'
          : 'Tambah Renstra Tabel Sub Kegiatan'
      }
    >
      {isLoading ? (
        <SpinnerFullscreen tip="Memuat data Renstra..." />
      ) : (
        <>
          <RenstraBreadcrumb chain={breadcrumbChain} />
          <div style={{ marginBottom: 16, display: 'flex', gap: 8 }}>
            <Button onClick={() => navigate('/dashboard-renstra')}>🔙 Kembali</Button>
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

          <form onSubmit={handleSubmit(handleSubmitFinal)}>
            <SelectWithLabelValue
              name="program_id"
              valueAsNumber
              label="Program"
              control={control}
              errors={formState.errors}
              required
              disabled={isAuditMode}
              options={programOptions}
            />

            <SelectWithLabelValue
              name="kegiatan_id"
              valueAsNumber
              label="Kegiatan"
              control={control}
              errors={formState.errors}
              required
              disabled={isAuditMode || !selectedProgramId || loadingKegiatan}
              options={kegiatanOptions}
            />

            <SelectWithLabelValue
              name="sub_kegiatan_id"
              label="Sub Kegiatan"
              control={control}
              errors={formState.errors}
              required
              disabled={isAuditMode || !selectedKegiatanId || loadingSub}
              options={subkegiatanList.map((item) => ({
                label: `${item.kode_sub_kegiatan || ''} - ${item.nama_sub_kegiatan}`,
                value: Number(item.id),
              }))}
            />
            <input type="hidden" {...form.register('subkegiatan_id')} />

            {selectedSubKegiatanId && !loadingIndikator && indikatorOptions.length === 0 && (
              <Alert
                type="warning"
                showIcon
                style={{ marginBottom: 12 }}
                message="Indikator belum tersedia"
                description="Tidak ada indikator Renstra dengan stage sub_kegiatan yang cocok dengan ref_id subkegiatan terpilih."
              />
            )}

            <SelectWithLabelValue
              name="indikator_id"
              valueAsNumber
              label="Indikator"
              control={control}
              errors={formState.errors}
              required
              disabled={isAuditMode || !selectedSubkegiatanRefId || loadingIndikator}
              options={indikatorSelectOptions}
            />

            {selectedSubkegiatanRefId &&
              !loadingIndikator &&
              indikatorOptions.length > 1 &&
              !selectedIndikatorId && (
                <Alert
                  type="info"
                  showIcon
                  style={{ marginBottom: 12 }}
                  message="Pilih indikator terlebih dahulu."
                  description="Field detail indikator baru dianggap lengkap setelah salah satu indikator dipilih."
                />
              )}

            <InputField
              name="indikator_manual"
              label="Nama Indikator"
              control={control}
              errors={formState.errors}
              disabled={isAuditMode}
            />

            <InputField
              name="baseline"
              label="Baseline"
              control={control}
              errors={formState.errors}
              disabled={isAuditMode}
              type="number"
            />

            <InputField
              name="satuan_target"
              label="Satuan Target"
              control={control}
              errors={formState.errors}
              disabled={isAuditMode}
            />

            <InputField
              name="lokasi"
              label="Lokasi"
              control={control}
              errors={formState.errors}
              disabled={isAuditMode}
            />

            <InputField
              name="kode_subkegiatan"
              label="Kode Sub Kegiatan"
              control={control}
              errors={formState.errors}
              disabled={isAuditMode}
            />

            <InputField
              name="nama_subkegiatan"
              label="Nama Subkegiatan"
              control={control}
              errors={formState.errors}
              disabled={isAuditMode}
            />

            <InputField
              name="sub_bidang_penanggung_jawab"
              label="Sub Bidang Penanggung Jawab"
              control={control}
              errors={formState.errors}
              disabled={isAuditMode}
            />

            <h4 style={{ marginTop: 24 }}>Target periode (th. ke-1 s/d ke-5)</h4>

            {YEARS.map((i) => (
              <InputField
                key={`target_tahun_${i}`}
                name={`target_tahun_${i}`}
                label={`Target (th. ke-${i})`}
                control={control}
                errors={formState.errors}
                disabled={isAuditMode}
                type="number"
              />
            ))}

            <h4 style={{ marginTop: 24 }}>Pagu RPJMD Acuan</h4>

            <CurrencyInputField
              name="pagu_rpjmd_acuan"
              label="Pagu RPJMD Acuan"
              control={control}
              errors={formState.errors}
              disabled
            />

            <h4 style={{ marginTop: 24 }}>Pagu Renstra periode (th. ke-1 s/d ke-5)</h4>

            <Alert
              type="info"
              showIcon
              style={{ marginBottom: 16 }}
              message="Pagu Subkegiatan adalah sumber utama"
              description="Nilai pagu pada level ini akan menjadi dasar agregasi otomatis ke Kegiatan, Program, Kebijakan, Strategi, Sasaran, dan Tujuan."
            />

            {paguInfoMessage && (
              <Alert
                type={paguInfoMessage.includes('Gagal') ? 'warning' : 'success'}
                showIcon
                style={{ marginBottom: 16 }}
                message="Informasi Pagu"
                description={paguInfoMessage}
              />
            )}

            {YEARS.map((i) => (
              <CurrencyInputField
                key={`pagu_tahun_${i}`}
                name={`pagu_tahun_${i}`}
                label={`Pagu (th. ke-${i})`}
                control={control}
                errors={formState.errors}
                disabled={!initialData || isAuditMode}
              />
            ))}

            <h4 style={{ marginTop: 24 }}>Kondisi Akhir Kinerja Periode Renstra</h4>

            <InputField
              name="target_akhir_renstra"
              label="Target Akhir Renstra"
              control={control}
              errors={formState.errors}
              disabled
            />

            <CurrencyInputField
              name="pagu_akhir_renstra"
              label="Pagu Akhir Renstra"
              control={control}
              errors={formState.errors}
              disabled
            />

            {initialData && !isAuditMode && (
              <div style={{ marginTop: 24 }}>
                <h4>Alasan Revisi</h4>

                <Controller
                  name="alasan_revisi"
                  control={control}
                  render={({ field }) => (
                    <Input.TextArea
                      {...field}
                      rows={4}
                      placeholder="Tuliskan alasan revisi target/pagu sub kegiatan Renstra..."
                    />
                  )}
                />

                {formState.errors?.alasan_revisi && (
                  <div style={{ color: 'red', fontSize: 12, marginTop: 4 }}>
                    {formState.errors.alasan_revisi.message}
                  </div>
                )}
              </div>
            )}

            {serverMessage && (
              <Alert
                type={serverMessage.startsWith('✅') ? 'success' : 'error'}
                showIcon
                style={{ marginTop: 16 }}
                message={serverMessage}
              />
            )}

            <div style={{ marginTop: 24 }}>
              {isAuditMode ? (
                <Button
                  type="primary"
                  onClick={() =>
                    navigate(`/renstra/tabel/subkegiatan/edit/${initialData.id}?mode=revisi`)
                  }
                >
                  Buat Revisi
                </Button>
              ) : initialData ? (
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={isSubmitting || submitRevisiLoading}
                  disabled={
                    isLoading ||
                    !formState.isValid ||
                    isSubmitting ||
                    submitRevisiLoading ||
                    Boolean(existingDataInfo)
                  }
                >
                  {isRevisiMode ? 'Buat Revisi' : 'Simpan Draft'}
                </Button>
              ) : (
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={isSubmitting}
                  disabled={
                    isLoading || !formState.isValid || isSubmitting || Boolean(existingDataInfo)
                  }
                >
                  Simpan
                </Button>
              )}
            </div>
          </form>
        </>
      )}
    </Card>
  );
};

export default RenstraTabelSubKegiatanForm;
