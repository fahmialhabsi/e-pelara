// src/features/renstra/program/components/RenstraTabelProgramForm.jsx
import React, { useEffect, useMemo, useRef } from 'react';
import { Card, Button, Alert, Input } from 'antd';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import * as Yup from 'yup';

import api from '@/services/api';
import {
  buildGovernanceUiMessage,
  getGovernanceBlockingCode,
  getPreparedRpjmdSource,
  getRenstraPrograms,
  resolveRpjmdSourceMap,
} from '@/features/renstra/services/renstraApi';
import { useRenstraFormTemplate } from '@/hooks/templatesUseRenstra/useRenstraFormTemplate';
import SelectWithLabelValue from '@/shared/components/form/SelectWithLabelValue';
import InputField from '@/shared/components/form/InputField';
import CurrencyInputField from '@/shared/components/form/CurrencyInputField';
import SpinnerFullscreen from './RenstraTableSpinnerFullscreen';

const YEARS = [1, 2, 3, 4, 5];
const ALL_YEARS = [1, 2, 3, 4, 5, 6];
const ENDPOINT = '/renstra-tabel-program';
const REDIRECT = '/renstra/tabel/program';
const GOVERNANCE_SOURCE_STAGE = 'program';
const GOVERNANCE_BLOCKING_CODES = new Set([
  'missing_target',
  'chain_mismatch',
  'resolver_conflict',
  'blocked',
]);

const getProgramRenstraId = (item) => item?.id ?? null;

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

const normalizeDecimalValue = (value) => {
  if (value === null || value === undefined || value === '') return '';

  const normalized = String(value).trim().replace(',', '.');
  const num = Number(normalized);

  return Number.isFinite(num) ? num : '';
};

const toPositiveNumber = (value) => {
  if (value === null || value === undefined || value === '') return null;

  const normalized = String(value).trim().replace(',', '.');
  const num = Number(normalized);

  return Number.isFinite(num) && num > 0 ? num : null;
};

const pickPositiveNumber = (...values) => {
  for (const value of values) {
    const num = toPositiveNumber(value);
    if (num !== null) return num;
  }

  return 0;
};

const splitPaguToFiveYears = (value) => {
  const total = toPositiveNumber(value) || 0;
  const dasar = Math.floor(total / 5);
  const sisa = total - dasar * 5;

  return [dasar, dasar, dasar, dasar, dasar + sisa];
};

const extractPreparedSourceRows = (payload) => {
  if (Array.isArray(payload?.rows)) return payload.rows;
  if (Array.isArray(payload?.data?.rows)) return payload.data.rows;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload)) return payload;
  return [];
};

const yupNumberRequired = (messageRequired, messageType = 'Harus angka') =>
  Yup.number()
    .transform((value, originalValue) => {
      if (originalValue === null || originalValue === undefined || originalValue === '') {
        return undefined;
      }

      const normalized = String(originalValue).trim().replace(',', '.');
      const num = Number(normalized);

      return Number.isFinite(num) ? num : value;
    })
    .typeError(messageType)
    .required(messageRequired);

const PROGRAM_REQUIRED_FIELDS = [
  'indikator_id',
  'baseline',
  'satuan_target',
  'lokasi',
  'target_tahun_1',
  'target_tahun_2',
  'target_tahun_3',
  'target_tahun_4',
  'target_tahun_5',
];

const RenstraTabelProgramForm = ({ initialData = null, renstraAktif }) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const renstraId = renstraAktif?.id;
  const activeArahKebijakanId = useMemo(() => {
    const raw =
      searchParams.get('arah_kebijakan_id') ||
      searchParams.get('kebijakan_id') ||
      searchParams.get('renstra_kebijakan_id');

    return toPositiveNumber(raw);
  }, [searchParams]);
  const hasActiveArahKebijakan = Boolean(activeArahKebijakanId);

  const [alasanRevisi, setAlasanRevisi] = React.useState('');
  const [submitRevisiLoading, setSubmitRevisiLoading] = React.useState(false);
  const [serverMessage, setServerMessage] = React.useState('');

  const { data: programOptions = [], isLoading: loadingProgram } = useQuery({
    queryKey: ['renstra-program', renstraId, activeArahKebijakanId],
    queryFn: async () =>
      getRenstraPrograms({
        renstra_id: renstraId,
        arah_kebijakan_id: activeArahKebijakanId,
      }),
    enabled: !!renstraId && hasActiveArahKebijakan,
  });

  const schema = () =>
    Yup.object({
      program_id: Yup.string().required('Program wajib dipilih'),
      indikator_id: Yup.string().required('Indikator wajib dipilih'),
      baseline: yupNumberRequired('Baseline wajib diisi', 'Baseline harus angka'),
      satuan_target: Yup.string().required('Satuan target wajib diisi'),
      lokasi: Yup.string().required('Lokasi wajib diisi'),
      opd_penanggung_jawab: Yup.string().required('OPD wajib diisi'),
      alasan_revisi: initialData
        ? Yup.string().required('Alasan revisi wajib diisi')
        : Yup.string().nullable(),
      target_tahun_1: yupNumberRequired('Target tahun ke-1 wajib diisi'),
      target_tahun_2: yupNumberRequired('Target tahun ke-2 wajib diisi'),
      target_tahun_3: yupNumberRequired('Target tahun ke-3 wajib diisi'),
      target_tahun_4: yupNumberRequired('Target tahun ke-4 wajib diisi'),
      target_tahun_5: yupNumberRequired('Target tahun ke-5 wajib diisi'),
      target_tahun_6: Yup.number().nullable(),
      pagu_tahun_1: Yup.number().nullable(),
      pagu_tahun_2: Yup.number().nullable(),
      pagu_tahun_3: Yup.number().nullable(),
      pagu_tahun_4: Yup.number().nullable(),
      pagu_tahun_5: Yup.number().nullable(),
      pagu_tahun_6: Yup.number().nullable(),
    });

  const defaultValues = {
    program_id: initialData?.program_id ? String(initialData.program_id) : '',
    indikator_id: initialData?.indikator_id ? String(initialData.indikator_id) : '',
    baseline: initialData?.baseline ?? '',
    satuan_target: initialData?.satuan_target ?? '',
    lokasi: initialData?.lokasi ?? '',
    opd_penanggung_jawab:
      initialData?.opd_penanggung_jawab ??
      initialData?.program?.opd_penanggung_jawab ??
      renstraAktif?.nama_opd ??
      '',
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
    alasan_revisi: '',
  };

  const generatePayload = (data) => {
    const selectedProgram = programOptions.find(
      (p) => String(getProgramRenstraId(p)) === String(data.program_id),
    );

    const selectedIndikator = indikatorOptions.find(
      (x) => String(x.id) === String(data.indikator_id),
    );

    return {
      renstra_id: Number(renstraId),
      program_id: selectedProgram ? Number(selectedProgram.id) : Number(data.program_id),
      indikator_id: Number(data.indikator_id),
      indikator: selectedIndikator?.nama_indikator || data.indikator || '',
      baseline: normalizeDecimalValue(data.baseline),
      satuan_target: data.satuan_target,
      lokasi: data.lokasi,
      opd_penanggung_jawab: data.opd_penanggung_jawab,
      nama_program: selectedProgram?.nama_program || '',
      ...YEARS.reduce(
        (acc, i) => ({
          ...acc,
          [`target_tahun_${i}`]: normalizeDecimalValue(data[`target_tahun_${i}`]) || 0,
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
    queryKeys: ['renstra-tabel-program'],
    redirectPath: REDIRECT,
  });

  const {
    control,
    handleSubmit,
    setValue,
    setError,
    watch,
    clearErrors,
    formState: { errors },
  } = form;

  const selectedProgramId = watch('program_id');
  const selectedIndikatorId = watch('indikator_id');

  const selectedProgram = programOptions.find(
    (p) => String(getProgramRenstraId(p)) === String(selectedProgramId),
  );

  const selectedProgramRefId = selectedProgram?.id ? Number(selectedProgram.id) : null;
  const selectedProgramRpjmdId = selectedProgram?.rpjmd_program_id || null;
  const selectedProgramAllowed = !selectedProgramId || Boolean(selectedProgram);

  useEffect(() => {
    if (!hasActiveArahKebijakan) {
      setError('program_id', {
        type: 'validate',
        message: 'Pilih Arah Kebijakan terlebih dahulu agar Program dapat difilter sesuai chain.',
      });
      return;
    }

    if (!selectedProgramId) {
      clearErrors('program_id');
      return;
    }

    if (!selectedProgramAllowed) {
      setValue('program_id', '', {
        shouldValidate: true,
        shouldDirty: true,
      });
      setError('program_id', {
        type: 'validate',
        message: 'Program tidak sesuai dengan Arah Kebijakan aktif.',
      });
      return;
    }

    clearErrors('program_id');
  }, [
    clearErrors,
    hasActiveArahKebijakan,
    selectedProgramAllowed,
    selectedProgramId,
    setError,
    setValue,
  ]);

  const { data: paguCache = null, isLoading: loadingPaguCache } = useQuery({
    queryKey: ['renstra-pagu-cache', renstraId, 'program', initialData?.id],
    queryFn: async () => {
      const res = await api.get('/renstra-pagu-cache', {
        params: {
          renstra_id: renstraId,
          stage: 'program',
          ref_id: initialData.id,
        },
      });

      const rows = Array.isArray(res.data)
        ? res.data
        : Array.isArray(res.data?.data)
          ? res.data.data
          : [];

      return rows[0] || null;
    },
    enabled: !!renstraId && !!initialData?.id,
  });

  const {
    data: governanceSourceMap = null,
    isLoading: loadingGovernanceSourceMap,
    error: errorGovernanceSourceMap,
  } = useQuery({
    queryKey: [
      'renstra-governance-source-map',
      renstraId,
      selectedProgramRpjmdId,
      selectedProgramRefId,
    ],
    queryFn: async () =>
      resolveRpjmdSourceMap({
        target_module: 'RENSTRA',
        renstra_id: renstraId,
        source_stage: GOVERNANCE_SOURCE_STAGE,
        source_ref_id: selectedProgramRpjmdId,
        include_parent: true,
        include_chain: true,
      }),
    enabled: !!renstraId && !!selectedProgramRpjmdId,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    retry: 1,
  });

  const {
    data: preparedGovernanceSource = null,
    isLoading: loadingPreparedGovernanceSource,
    error: errorPreparedGovernanceSource,
  } = useQuery({
    queryKey: [
      'renstra-governance-prepared-source',
      renstraId,
      selectedProgramRpjmdId,
      selectedProgramRefId,
    ],
    queryFn: async () =>
      getPreparedRpjmdSource({
        target_module: 'RENSTRA',
        renstra_id: renstraId,
        scope: 'program',
        source_stage: GOVERNANCE_SOURCE_STAGE,
        include_indicators: true,
        include_pagu: false,
        include_unmapped: true,
        include_blocked: true,
      }),
    enabled: !!renstraId && !!selectedProgramRpjmdId,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    retry: 1,
  });

  const governanceSourceMapPayload = governanceSourceMap?.data ?? null;
  const preparedGovernanceSourcePayload = preparedGovernanceSource?.data ?? null;

  const preparedGovernanceRows = useMemo(
    () => extractPreparedSourceRows(preparedGovernanceSourcePayload),
    [preparedGovernanceSourcePayload],
  );

  const preparedProgramGovernanceRow = useMemo(() => {
    if (!preparedGovernanceRows.length) return null;

    return (
      preparedGovernanceRows.find(
        (row) =>
          String(row?.source_stage ?? '').trim() === GOVERNANCE_SOURCE_STAGE &&
          String(row?.source_ref_id ?? '') === String(selectedProgramRpjmdId),
      ) ??
      preparedGovernanceRows.find(
        (row) => String(row?.target_ref_id ?? '') === String(selectedProgramRefId),
      ) ??
      null
    );
  }, [preparedGovernanceRows, selectedProgramRpjmdId, selectedProgramRefId]);

  const governanceGuard = useMemo(() => {
    const mappingStatus = String(
      governanceSourceMapPayload?.mapping_status ||
        preparedProgramGovernanceRow?.mapping_status ||
        '',
    )
      .trim()
      .toLowerCase();
    const chainStatus = String(
      governanceSourceMapPayload?.chain_status || preparedProgramGovernanceRow?.chain_status || '',
    )
      .trim()
      .toLowerCase();
    const sourceMapCode = getGovernanceBlockingCode(governanceSourceMapPayload);
    const sourceMapTargetRefId = toPositiveNumber(governanceSourceMapPayload?.target_ref_id);
    const governanceBlockingCode =
      sourceMapCode ||
      getGovernanceBlockingCode(errorGovernanceSourceMap) ||
      getGovernanceBlockingCode(errorPreparedGovernanceSource);
    const hasBlockingStatus =
      Boolean(errorGovernanceSourceMap) ||
      Boolean(errorPreparedGovernanceSource) ||
      Boolean(governanceSourceMap?.success === false) ||
      Boolean(sourceMapCode) ||
      !sourceMapTargetRefId ||
      mappingStatus !== 'mapped' ||
      chainStatus !== 'valid';
    const message =
      hasBlockingStatus &&
      (buildGovernanceUiMessage(
        governanceSourceMapPayload,
        'Mapping target Renstra untuk program ini belum tersedia atau belum valid.',
      ) ||
        buildGovernanceUiMessage(
          preparedProgramGovernanceRow,
          'Mapping target Renstra untuk program ini belum tersedia atau belum valid.',
        ) ||
        buildGovernanceUiMessage(errorGovernanceSourceMap, '') ||
        buildGovernanceUiMessage(errorPreparedGovernanceSource, ''));

    return {
      blocked: hasBlockingStatus,
      chainStatus,
      mappingStatus,
      message,
      preparedBlockReason: '',
      resolverCode: governanceBlockingCode,
      targetRefId: sourceMapTargetRefId,
    };
  }, [
    errorGovernanceSourceMap,
    errorPreparedGovernanceSource,
    governanceSourceMap,
    governanceSourceMapPayload,
    preparedProgramGovernanceRow,
  ]);

  const selectedProgramTargetRefId = governanceGuard.blocked
    ? null
    : governanceGuard.targetRefId;
  const indicatorTargetRefId = selectedProgramTargetRefId || selectedProgramRefId;

  useEffect(() => {
    if (!governanceGuard.blocked || initialData) return;

    clearErrors(PROGRAM_REQUIRED_FIELDS);
    setValue('indikator_id', '', {
      shouldValidate: true,
      shouldDirty: true,
    });
    setValue('indikator', '', {
      shouldValidate: false,
      shouldDirty: true,
    });
    setValue('baseline', '', {
      shouldValidate: true,
      shouldDirty: true,
    });
    setValue('satuan_target', '', {
      shouldValidate: true,
      shouldDirty: true,
    });
    setValue('lokasi', '', {
      shouldValidate: true,
      shouldDirty: true,
    });
    YEARS.forEach((i) => {
      setValue(`target_tahun_${i}`, '', {
        shouldValidate: true,
        shouldDirty: true,
      });
      setValue(`pagu_tahun_${i}`, 0, {
        shouldValidate: false,
        shouldDirty: false,
      });
    });
    setValue('pagu_rpjmd_acuan', 0, {
      shouldValidate: false,
      shouldDirty: false,
    });
    setValue('pagu_akhir_renstra', 0, {
      shouldValidate: false,
      shouldDirty: false,
    });
  }, [clearErrors, governanceGuard.blocked, initialData, setValue]);

  const { data: indikatorOptions = [], isLoading: loadingIndikator } = useQuery({
    queryKey: [
      'indikator-renstra-program-form',
      renstraId,
      indicatorTargetRefId,
      initialData?.id || 'create',
    ],
    queryFn: async () => {
      const res = await api.get('/indikator-renstra', {
        params: {
          renstra_id: renstraId,
          stage: 'program',
          ref_id: indicatorTargetRefId,
        },
      });

      const raw = res.data;
      return Array.isArray(raw) ? raw : (raw?.data ?? []);
    },
    enabled: !!renstraId && !!indicatorTargetRefId,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  });

  const indicatorSourceOptions = indikatorOptions;

  const prevProgramIdRef = useRef(undefined);

  useEffect(() => {
    const cur = selectedProgramId || undefined;
    const prev = prevProgramIdRef.current;

    if (prev !== undefined && prev !== cur && !initialData) {
      clearErrors(PROGRAM_REQUIRED_FIELDS);
      setValue('indikator_id', '', {
        shouldValidate: true,
        shouldDirty: true,
      });

      setValue('indikator', '', {
        shouldValidate: false,
        shouldDirty: true,
      });

      setValue('baseline', '', {
        shouldValidate: true,
        shouldDirty: true,
      });

      setValue('satuan_target', '', {
        shouldValidate: true,
        shouldDirty: true,
      });

      setValue('lokasi', '', {
        shouldValidate: true,
        shouldDirty: true,
      });

      YEARS.forEach((i) => {
        setValue(`target_tahun_${i}`, '', {
          shouldValidate: true,
          shouldDirty: true,
        });

        setValue(`pagu_tahun_${i}`, 0, {
          shouldValidate: false,
          shouldDirty: false,
        });
      });

      setValue('pagu_rpjmd_acuan', 0, {
        shouldValidate: false,
        shouldDirty: false,
      });

      setValue('pagu_akhir_renstra', 0, {
        shouldValidate: false,
        shouldDirty: false,
      });
    }

    prevProgramIdRef.current = cur;
  }, [selectedProgramId, initialData, setValue, clearErrors]);

  useEffect(() => {
    if (selectedProgram?.opd_penanggung_jawab) {
      setValue('opd_penanggung_jawab', selectedProgram.opd_penanggung_jawab);
      return;
    }

    if (initialData?.program?.opd_penanggung_jawab) {
      setValue('opd_penanggung_jawab', initialData.program.opd_penanggung_jawab);
    }
  }, [selectedProgram, initialData, setValue]);

  // 🔹 Auto set baseline, target, lokasi, pagu hanya untuk form baru
  useEffect(() => {
    const selected =
      indicatorSourceOptions.find((i) => String(i.id) === String(selectedIndikatorId)) ||
      (!selectedIndikatorId ? indicatorSourceOptions[0] : null);

    if (!selected) return;

    if (selectedIndikatorId) {
      setValue('indikator_id', String(selected.id), {
        shouldValidate: true,
        shouldDirty: true,
      });
    }

    setValue('indikator', selected.nama_indikator ?? '', {
      shouldValidate: false,
      shouldDirty: true,
    });

    setValue(
      'baseline',
      normalizeDecimalValue(
        selected.baseline ??
          selected.nilai_baseline ??
          selected.target_awal ??
          selected.kondisi_awal ??
          '',
      ),
      {
        shouldValidate: true,
        shouldDirty: true,
      },
    );

    setValue('satuan_target', selected.satuan ?? selected.satuan_target ?? '', {
      shouldValidate: true,
      shouldDirty: true,
    });

    setValue(
      'lokasi',
      [selected.lokasi, selected.lokasi_pelaksanaan, selected.sumber_data, selected.keterangan]
        .map((x) => (x !== null && x !== undefined ? String(x).trim() : ''))
        .find(Boolean) ?? '',
      {
        shouldValidate: true,
        shouldDirty: true,
      },
    );

    clearErrors(['indikator_id', 'baseline', 'satuan_target', 'lokasi']);

    YEARS.forEach((i) => {
      let val =
        selected[`target_tahun_${i}`] ??
        selected[`target_${i}`] ??
        selected[`target_tahun${i}`] ??
        selected[`tahun_${i}`];

      if (i === 6 && !val) {
        val =
          selected.target_tahun_5 ??
          selected.target_akhir ??
          selected.target_akhir_renstra ??
          selected.kondisi_akhir;
      }

      setValue(`target_tahun_${i}`, normalizeDecimalValue(val), {
        shouldValidate: true,
        shouldDirty: true,
      });
    });
    clearErrors([
      'target_tahun_1',
      'target_tahun_2',
      'target_tahun_3',
      'target_tahun_4',
      'target_tahun_5',
    ]);
    if (!initialData) {
      const paguAcuan = pickPositiveNumber(
        selected.pagu_cached,
        selected.total_pagu_rpjmd,
        selected.pagu_rpjmd_acuan,
        selected.pagu_akhir_renstra,
      );

      const paguPerTahun = splitPaguToFiveYears(paguAcuan);

      setValue('pagu_rpjmd_acuan', paguAcuan, {
        shouldValidate: false,
        shouldDirty: false,
      });

      YEARS.forEach((i) => {
        setValue(`pagu_tahun_${i}`, paguPerTahun[i - 1], {
          shouldValidate: false,
          shouldDirty: false,
        });
      });

      setValue('pagu_tahun_6', 0, {
        shouldValidate: false,
        shouldDirty: false,
      });

      setValue('pagu_akhir_renstra', paguAcuan, {
        shouldValidate: false,
        shouldDirty: false,
      });
    }
  }, [selectedIndikatorId, indicatorSourceOptions, initialData, setValue, clearErrors]);

  // 🔴 PAGU EDIT: pakai initialData, tapi jangan timpa fallback indikator kalau data lama masih 0
  useEffect(() => {
    if (!initialData) return;

    const hasExistingPagu =
      YEARS.some((i) => Number(initialData?.[`pagu_tahun_${i}`] || 0) > 0) ||
      Number(initialData?.pagu_rpjmd_acuan || 0) > 0;

    if (!hasExistingPagu) return;

    const source = initialData;

    YEARS.forEach((i) => {
      setValue(`pagu_tahun_${i}`, Number(source[`pagu_tahun_${i}`] || 0), {
        shouldValidate: false,
        shouldDirty: false,
      });
    });

    setValue('pagu_akhir_renstra', Number(source.pagu_akhir_renstra || 0), {
      shouldValidate: false,
      shouldDirty: false,
    });

  }, [initialData, paguCache, setValue]);

  const targetValues = watch(YEARS.map((i) => `target_tahun_${i}`));

  const targetAkhirRenstra = useMemo(() => {
    const nums = targetValues.map((v) => Number(v) || 0);
    const total = nums.reduce((a, b) => a + b, 0);
    return nums.length > 0 ? (total / nums.length).toFixed(2) : 0;
  }, [targetValues]);

  const paguValues = watch(YEARS.map((i) => `pagu_tahun_${i}`));

  const paguAkhirRenstra = useMemo(() => {
    return paguValues.reduce((total, value) => total + (Number(value) || 0), 0);
  }, [paguValues]);

  const paguInfoMessage = useMemo(() => {
    if (!initialData) return '';

    const hasExistingPagu =
      YEARS.some((i) => Number(initialData?.[`pagu_tahun_${i}`] || 0) > 0) ||
      Number(initialData?.pagu_rpjmd_acuan || 0) > 0;

    return hasExistingPagu
      ? 'Pagu RPJMD readonly. Pagu Renstra tahun 1–5 dapat direvisi.'
      : '';
  }, [initialData]);

  useEffect(() => {
    setValue('pagu_akhir_renstra', paguAkhirRenstra, {
      shouldValidate: false,
      shouldDirty: false,
    });

    setValue('pagu_tahun_6', 0, {
      shouldValidate: false,
      shouldDirty: false,
    });
  }, [paguAkhirRenstra, setValue]);

  useEffect(() => {
    setValue('target_akhir_renstra', targetAkhirRenstra);
  }, [targetAkhirRenstra, setValue]);

  const programSelectOptions = useMemo(() => {
    const options = programOptions.map((item) => ({
      value: String(item.id),
      label: makeLabel(item.kode_program, item.nama_program) || `Program ${item.id}`,
    }));

    return uniqueOptionsByValue(options);
  }, [programOptions]);

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
    if (!initialData || !indikatorOptions.length) return;

    const selected = indikatorOptions.find(
      (item) =>
        String(item.id) === String(initialData.indikator_id) ||
        String(item.source_indikator_id) === String(initialData.indikator_id),
    );

    setValue(
      'indikator',
      selected?.nama_indikator ||
        initialData?.indikator_detail?.nama_indikator ||
        initialData?.indikator ||
        '',
    );

    setValue(
      'satuan_target',
      initialData?.satuan_target || selected?.satuan || initialData?.indikator_detail?.satuan || '',
    );

    if (Number(initialData?.pagu_rpjmd_acuan || 0) <= 0 && selected) {
      const paguAcuan = Number(
        selected.pagu_cached || selected.total_pagu_rpjmd || selected.pagu_rpjmd_acuan || 0,
      );

      const paguDasar = Math.floor(paguAcuan / 5);
      const sisaPagu = paguAcuan - paguDasar * 5;

      setValue('pagu_rpjmd_acuan', paguAcuan, {
        shouldValidate: false,
        shouldDirty: false,
      });

      for (let i = 1; i <= 4; i++) {
        setValue(`pagu_tahun_${i}`, paguDasar, {
          shouldValidate: false,
          shouldDirty: false,
        });
      }

      setValue('pagu_tahun_5', paguDasar + sisaPagu, {
        shouldValidate: false,
        shouldDirty: false,
      });

      setValue('pagu_tahun_6', 0, {
        shouldValidate: false,
        shouldDirty: false,
      });

      setValue('pagu_akhir_renstra', paguAcuan, {
        shouldValidate: false,
        shouldDirty: false,
      });
    }
  }, [initialData, indicatorSourceOptions, indikatorOptions, setValue]);

  useEffect(() => {
    if (!initialData) return;

    setValue('program_id', initialData?.program_id ? String(initialData.program_id) : '');

    setValue('indikator_id', initialData?.indikator_id ? String(initialData.indikator_id) : '');

    setValue(
      'indikator',
      initialData?.indikator ?? initialData?.indikator_detail?.nama_indikator ?? '',
    );
    setValue('baseline', initialData?.baseline ?? '');
    setValue('satuan_target', initialData?.satuan_target ?? '');
    setValue('lokasi', initialData?.lokasi ?? '');
    setValue(
      'opd_penanggung_jawab',
      initialData?.opd_penanggung_jawab ??
        initialData?.program?.opd_penanggung_jawab ??
        renstraAktif?.nama_opd ??
        '',
    );

    YEARS.forEach((i) => {
      setValue(`target_tahun_${i}`, initialData?.[`target_tahun_${i}`] ?? '');
    });

    setValue('target_tahun_6', 0);
    setValue('pagu_tahun_6', 0);
    setValue('target_akhir_renstra', initialData?.target_akhir_renstra ?? '');

    const paguAcuan = Number(initialData?.pagu_rpjmd_acuan || 0);

    const hasPaguTahunan = YEARS.some((i) => Number(initialData?.[`pagu_tahun_${i}`] || 0) > 0);

    if (hasPaguTahunan) {
      YEARS.forEach((i) => {
        setValue(`pagu_tahun_${i}`, Number(initialData?.[`pagu_tahun_${i}`] || 0), {
          shouldValidate: false,
          shouldDirty: false,
        });
      });

      setValue('pagu_rpjmd_acuan', paguAcuan, {
        shouldValidate: false,
        shouldDirty: false,
      });

      setValue('pagu_akhir_renstra', Number(initialData?.pagu_akhir_renstra || 0), {
        shouldValidate: false,
        shouldDirty: false,
      });
    } else if (paguAcuan > 0) {
      const paguDasar = Math.floor(paguAcuan / 5);
      const sisaPagu = paguAcuan - paguDasar * 5;

      for (let i = 1; i <= 4; i++) {
        setValue(`pagu_tahun_${i}`, paguDasar, {
          shouldValidate: false,
          shouldDirty: false,
        });
      }

      setValue('pagu_tahun_5', paguDasar + sisaPagu, {
        shouldValidate: false,
        shouldDirty: false,
      });

      setValue('pagu_tahun_6', 0, {
        shouldValidate: false,
        shouldDirty: false,
      });

      setValue('pagu_rpjmd_acuan', paguAcuan, {
        shouldValidate: false,
        shouldDirty: false,
      });

      setValue('pagu_akhir_renstra', paguAcuan, {
        shouldValidate: false,
        shouldDirty: false,
      });
    }
  }, [initialData, renstraAktif, setValue]);

  const handleSubmitRevisi = async (data) => {
    if (!initialData?.id) {
      return onSubmit(data);
    }

    if (!alasanRevisi.trim()) {
      setServerMessage('Alasan revisi wajib diisi.');
      return null;
    }

    try {
      setSubmitRevisiLoading(true);
      setServerMessage('');

      const payload = {
        ...generatePayload(data),
        alasan_revisi: alasanRevisi,
      };

      const isApproved = initialData?.status_revisi === 'approved';

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

    return null;
  };

  const shouldShowSpinner =
    !renstraAktif ||
    loadingProgram ||
    loadingPaguCache ||
    loadingIndikator ||
    loadingGovernanceSourceMap ||
    loadingPreparedGovernanceSource;
  const programScopeMessage = !hasActiveArahKebijakan
    ? 'Pilih Arah Kebijakan terlebih dahulu agar Program dapat difilter sesuai chain.'
    : !loadingProgram && programOptions.length === 0
      ? 'Tidak ada Program yang terhubung dengan Arah Kebijakan aktif.'
      : '';
  const canSubmitNewProgram =
    Boolean(hasActiveArahKebijakan) && (initialData || indikatorSelectOptions.length > 0);

  return (
    <Card
      title={
        initialData
          ? initialData?.status_revisi === 'approved'
            ? 'Revisi Renstra Tabel Program'
            : 'Edit Renstra Tabel Program'
          : 'Tambah Renstra Tabel Program'
      }
    >
      {shouldShowSpinner ? (
        <SpinnerFullscreen tip="Memuat data Renstra..." />
      ) : (
        <>
          <div style={{ marginBottom: 16, display: 'flex', gap: 8 }}>
            <Button onClick={() => navigate('/dashboard-renstra')}>🔙 Kembali</Button>
          </div>

          {selectedProgramRpjmdId && governanceGuard.blocked && governanceGuard.message && (
            <Alert
              type="error"
              showIcon
              style={{ marginBottom: 16 }}
              message="Validasi Governance Hub"
              description={governanceGuard.message}
            />
          )}

          {!hasActiveArahKebijakan ? (
            <Alert
              type="warning"
              showIcon
              style={{ marginBottom: 16 }}
              message="Arah Kebijakan wajib dipilih"
              description={programScopeMessage}
            />
          ) : programOptions.length === 0 ? (
            <div
              style={{
                background: '#fffbe6',
                border: '1px solid #ffe58f',
                borderRadius: 6,
                padding: '10px 16px',
                marginBottom: 16,
                fontSize: 13,
                color: '#614700',
              }}
            >
              ⚠️ <strong>Belum ada Program Renstra untuk Arah Kebijakan aktif.</strong> Pastikan
              chain parent sudah lengkap sebelum menambah Program.
            </div>
          ) : null}

          <form onSubmit={handleSubmit(initialData ? handleSubmitRevisi : onSubmit)}>
            <SelectWithLabelValue
              name="program_id"
              label="Program"
              control={control}
              errors={errors}
              required
              options={programSelectOptions}
              disabled={!hasActiveArahKebijakan || loadingProgram}
            />

            <InputField
              name="opd_penanggung_jawab"
              label="OPD Penanggung Jawab"
              control={control}
              errors={errors}
              disabled
            />

            {selectedProgramRefId && !loadingIndikator && indikatorSelectOptions.length === 0 && (
              <Alert
                type="warning"
                showIcon
                style={{ marginBottom: 16 }}
                message="Belum ada indikator RPJMD sumber untuk Program ini"
                description={`Belum ada indikator_renstra stage program dengan ref_id = ${indicatorTargetRefId}. Jika indikator sumber RPJMD memang belum ada, lengkapi data sumber terlebih dahulu sebelum melanjutkan.`}
              />
            )}

            <SelectWithLabelValue
              name="indikator_id"
              label="Indikator"
              control={control}
              errors={errors}
              required
              disabled={
                !hasActiveArahKebijakan ||
                !selectedProgramRefId ||
                loadingIndikator ||
                indikatorSelectOptions.length === 0
              }
              options={indikatorSelectOptions}
            />

            <InputField
              name="indikator"
              label="Nama Indikator"
              control={control}
              errors={errors}
              disabled
            />

            <InputField name="baseline" label="Baseline" control={control} errors={errors} />

            <InputField
              name="satuan_target"
              label="Satuan Target"
              control={control}
              errors={errors}
            />

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

            {paguInfoMessage && (
              <Alert
                type={paguCache ? 'success' : 'warning'}
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

            <InputField
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
                  onChange={(e) => {
                    setAlasanRevisi(e.target.value);
                    setValue('alasan_revisi', e.target.value);
                  }}
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
              <Button
                type="primary"
                htmlType="submit"
                loading={initialData ? submitRevisiLoading : isSubmitting}
                disabled={!canSubmitNewProgram}
              >
                {initialData
                  ? initialData?.status_revisi === 'approved'
                    ? 'Buat Revisi'
                    : 'Simpan Draft'
                  : 'Simpan'}
              </Button>
            </div>
          </form>
        </>
      )}
    </Card>
  );
};

export default RenstraTabelProgramForm;
