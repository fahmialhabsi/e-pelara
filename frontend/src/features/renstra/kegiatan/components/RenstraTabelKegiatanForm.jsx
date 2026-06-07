import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Card, Button, Alert, Input } from 'antd';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { FormProvider, useWatch } from 'react-hook-form';
import Decimal from 'decimal.js';

import InputField from '@/shared/components/form/InputField';
import SelectWithLabelValue from '@/shared/components/form/SelectWithLabelValue';
import CurrencyInputField from '@/shared/components/form/CurrencyInputField';
import { useRenstraFormTemplate } from '@/hooks/templatesUseRenstra/useRenstraFormTemplate';
import * as Yup from 'yup';
import generatePayloadRenstraTabelKegiatan from '@/shared/components/utils/generatePayloadRenstraTabelKegiatan';
import api from '@/services/api';
import RenstraBreadcrumb, {
  useRenstraBreadcrumb,
} from '@/features/renstra/shared/components/RenstraBreadcrumb';

const YEARS = [1, 2, 3, 4, 5];
const ALL_YEARS = [1, 2, 3, 4, 5, 6];
const ENDPOINT = '/renstra-tabel-kegiatan';
const REDIRECT = '/renstra/tabel/kegiatan';

const sanitizeKegiatanPayload = (payload = {}) => {
  const cleaned = { ...payload };

  // bukan bagian request body
  delete cleaned.id;
  delete cleaned.tabel_program_id;

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
  delete cleaned.indikator_detail;
  delete cleaned.kegiatan;
  delete cleaned.subkegiatans;
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

const buildKegiatanPayload = (data) =>
  sanitizeKegiatanPayload(generatePayloadRenstraTabelKegiatan(data));

const toCanonicalIdNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

const matchesCanonicalKegiatanRow = (row, scope) => {
  if (!row || !scope) return false;

  return (
    toCanonicalIdNumber(row.renstra_id) === scope.renstra_id &&
    toCanonicalIdNumber(row.program_id) === scope.program_id &&
    toCanonicalIdNumber(row.kegiatan_id) === scope.kegiatan_id &&
    toCanonicalIdNumber(row.indikator_id) === scope.indikator_id
  );
};

const RenstraTabelKegiatanForm = ({ initialData = null, renstraAktif }) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const renstraId = renstraAktif?.id;

  const isApproved = initialData?.status_revisi === 'approved';
  const isRevisiMode = isApproved && searchParams.get('mode') === 'revisi';
  const isAuditMode = isApproved && !isRevisiMode;
  const [serverWarnings, setServerWarnings] = useState({});
  const [blocked, setBlocked] = useState(false);
  const [alasanRevisi, setAlasanRevisi] = useState('');
  const [submitRevisiLoading, setSubmitRevisiLoading] = useState(false);
  const [serverMessage, setServerMessage] = useState('');

  const activeArahKebijakanId =
    searchParams.get('arah_kebijakan_id') ||
    searchParams.get('kebijakan_id') ||
    initialData?.kebijakan_id ||
    null;

  const breadcrumbChain = useRenstraBreadcrumb({
    kebijakanId: activeArahKebijakanId,
    currentLabel: initialData ? 'Edit Kegiatan' : 'Tambah Kegiatan',
  });

  const defaultValues = useMemo(() => {
    const values = {
      id: initialData?.id,
      /** PK renstra_tabel_program â€” untuk dropdown & available-pagu */
      tabel_program_id: null,
      /** FK ke renstra_program.id â€” untuk filter kegiatan & payload API */
      program_id: initialData?.program_id ?? null,
      kegiatan_id: initialData?.kegiatan_id ?? null,
      indikator_id: initialData?.indikator_id ?? null,
      indikator:
        initialData?.indikator_detail?.nama_indikator ||
        initialData?.indikator?.nama_indikator ||
        initialData?.indikator ||
        '',
      baseline: initialData?.baseline ?? '',
      satuan_target: initialData?.satuan_target ?? '',
      lokasi: initialData?.lokasi ?? '',
      bidang_penanggung_jawab: initialData?.bidang_penanggung_jawab ?? '',
      kode_kegiatan: initialData?.kode_kegiatan ?? '',
      nama_kegiatan: initialData?.nama_kegiatan ?? '',
      target_akhir_renstra: initialData?.target_akhir_renstra ?? '',
      pagu_rpjmd_acuan: Number(initialData?.pagu_rpjmd_acuan || 0),
      pagu_akhir_renstra: Number(initialData?.pagu_akhir_renstra || 0),
      alasan_revisi: '',
      kebijakan_id: activeArahKebijakanId,
    };

    ALL_YEARS.forEach((i) => {
      values[`target_tahun_${i}`] = i === 6 ? 0 : (initialData?.[`target_tahun_${i}`] ?? '');
      values[`pagu_tahun_${i}`] = i === 6 ? 0 : Number(initialData?.[`pagu_tahun_${i}`] || 0);
    });
    return values;
  }, [initialData]);

  const schema = () =>
    Yup.object({
      tabel_program_id: Yup.mixed().nullable(),
      program_id: Yup.number().typeError('Program wajib dipilih').required('Program wajib dipilih'),
      kegiatan_id: Yup.number()
        .typeError('Kegiatan wajib dipilih')
        .required('Kegiatan wajib dipilih'),
      indikator_id: Yup.number()
        .typeError('Indikator wajib dipilih')
        .required('Indikator wajib dipilih'),
      baseline: Yup.number().typeError('Baseline harus angka').nullable(),
      satuan_target: Yup.string().required('Satuan target wajib diisi'),
      lokasi: Yup.string().required('Lokasi wajib diisi'),
      target_tahun_1: Yup.number().typeError('Harus angka').required(),
      target_tahun_2: Yup.number().typeError('Harus angka').required(),
      target_tahun_3: Yup.number().typeError('Harus angka').required(),
      target_tahun_4: Yup.number().typeError('Harus angka').required(),
      target_tahun_5: Yup.number().typeError('Harus angka').required(),
      target_tahun_6: Yup.number().typeError('Harus angka').required(),
      alasan_revisi: initialData
        ? Yup.string().required('Alasan revisi wajib diisi')
        : Yup.string().nullable(),
    });

  const { form, onSubmit, isSubmitting } = useRenstraFormTemplate({
    initialData,
    renstraAktif,
    endpoint: '/renstra-tabel-kegiatan',
    schema,
    defaultValues,
    queryKeys: ['renstra-tabel-kegiatan'],
    redirectPath: '/renstra/tabel/kegiatan',
    generatePayload: buildKegiatanPayload,
    onError: (err) => {
      setServerWarnings(err?.response?.data?.warnings || {});
      setBlocked(err?.response?.data?.blocked || false);
    },
    onSuccess: (res) => {
      setServerWarnings(res?.warnings || {});
      setBlocked(res?.blocked || false);
    },
  });

  const {
    control,
    setValue,
    getValues,
    formState: { errors },
  } = form;

  const formTitle = initialData
    ? isRevisiMode
      ? 'Revisi Renstra Tabel Kegiatan'
      : isAuditMode
        ? 'Detail Renstra Tabel Kegiatan'
        : 'Edit Renstra Tabel Kegiatan'
    : 'Tambah Renstra Tabel Kegiatan';

  const selectedTabelProgramId = useWatch({
    control,
    name: 'tabel_program_id',
  });

  const selectedRenstraProgramId = useWatch({
    control,
    name: 'program_id',
  });

  const selectedKegiatanId = useWatch({
    control,
    name: 'kegiatan_id',
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

  useEffect(() => {
    if (!initialData) return;

    setValueIfChanged(
      'indikator',
      initialData?.indikator_detail?.nama_indikator ||
        initialData?.indikator?.nama_indikator ||
        initialData?.indikator ||
        '',
    );
  }, [initialData?.id, initialData?.indikator_id, setValueIfChanged]);

  const existingDataEnabled =
    !initialData &&
    !!selectedRenstraProgramId &&
    !!selectedKegiatanId &&
    !!selectedIndikatorId &&
    !!renstraId;

  const { data: existingDataRows = [] } = useQuery({
    queryKey: [
      'renstra-tabel-kegiatan-existing',
      renstraId,
      selectedRenstraProgramId,
      selectedKegiatanId,
      selectedIndikatorId,
    ],
    queryFn: async () => {
      const res = await api.get('/renstra-tabel-kegiatan', {
        params: {
          program_id: selectedRenstraProgramId,
          kegiatan_id: selectedKegiatanId,
          indikator_id: selectedIndikatorId,
          renstra_id: renstraId,
        },
      });

      const rows = Array.isArray(res.data) ? res.data : (res.data?.data ?? []);
      return rows;
    },
    enabled: existingDataEnabled,
    retry: 0,
  });

  const existingDataList = useMemo(
    () => (Array.isArray(existingDataRows) ? existingDataRows : []),
    [existingDataRows],
  );

  const existingDataScope = useMemo(
    () => ({
      renstra_id: toCanonicalIdNumber(renstraId),
      program_id: toCanonicalIdNumber(selectedRenstraProgramId),
      kegiatan_id: toCanonicalIdNumber(selectedKegiatanId),
      indikator_id: toCanonicalIdNumber(selectedIndikatorId),
    }),
    [renstraId, selectedRenstraProgramId, selectedKegiatanId, selectedIndikatorId],
  );

  const mainExistingDataRows = useMemo(
    () => existingDataList.filter((row) => matchesCanonicalKegiatanRow(row, existingDataScope)),
    [existingDataList, existingDataScope],
  );

  const existingDataInfo = mainExistingDataRows[0] ?? null;
  const existingMainRecordRejected = existingDataInfo?.status_revisi === 'ditolak';

  const prevTabelProgramId = useRef(undefined);
  const prevProgramIdDirect = useRef(undefined);

  // Fetch options â€” filter by renstra_id agar hanya data OPD ini yang muncul
  const { data: programData } = useQuery({
    queryKey: ['program-options', renstraId],
    queryFn: () =>
      api
        .get('/renstra-tabel-program', { params: { renstra_id: renstraId } })
        .then((res) => (Array.isArray(res.data) ? res.data : (res.data?.data ?? []))),
    enabled: !!renstraId,
  });

  const hasTabelProgramList = useMemo(() => (programData || []).length > 0, [programData]);

  useEffect(() => {
    if (!hasTabelProgramList) {
      setValueIfChanged('tabel_program_id', null);
    }
  }, [hasTabelProgramList]);

  /** Fallback: master Program Renstra (scope OPD sama) bila belum ada baris Tabel Program */
  const { data: renstraProgramData } = useQuery({
    queryKey: ['renstra-program-options', renstraId],
    queryFn: () =>
      api
        .get('/renstra-program', { params: { renstra_id: renstraId } })
        .then((res) => (Array.isArray(res.data) ? res.data : (res.data?.data ?? []))),
    enabled: !!renstraId,
  });
  const { data: kegiatanData } = useQuery({
    queryKey: ['kegiatan-options', renstraId],
    queryFn: () =>
      api
        .get('/renstra-kegiatan', { params: { renstra_id: renstraId } })
        .then((res) => (Array.isArray(res.data) ? res.data : (res.data?.data ?? []))),
    enabled: !!renstraId,
  });
  const selectedKegiatanRefId = selectedKegiatanId || null;

  const { data: indikatorData = [], isLoading: loadingIndikator } = useQuery({
    queryKey: ['indikator-renstra', renstraId, 'kegiatan', selectedKegiatanRefId],
    queryFn: async () => {
      const res = await api.get('/indikator-renstra', {
        params: {
          renstra_id: renstraId,
          stage: 'kegiatan',
          ref_id: selectedKegiatanRefId,
        },
      });

      const raw = Array.isArray(res.data) ? res.data : (res.data?.data ?? []);

      return raw;
    },
    enabled: !!renstraId && !!selectedKegiatanId,
  });

  const paguInfoMessage = useMemo(() => {
    if (existingDataInfo) {
      return existingMainRecordRejected
        ? 'Data ini sudah ditolak. Gunakan Edit/Revisi jika ingin mengubah.'
        : 'Data sudah ada. Gunakan Edit jika ingin mengubah.';
    }

    if (!selectedKegiatanRefId || loadingIndikator) {
      return '';
    }

    return 'Silakan isi pagu subkegiatan sebagai sumber utama agregasi.';
  }, [existingDataInfo, existingMainRecordRejected, selectedKegiatanRefId, loadingIndikator]);

  const indikatorOptions = Array.isArray(indikatorData) ? [...indikatorData] : [];

  if (
    initialData?.indikator_id &&
    !indikatorOptions.some((i) => Number(i.id) === Number(initialData.indikator_id))
  ) {
    indikatorOptions.unshift({
      id: initialData.indikator_id,
      nama_indikator:
        initialData?.indikator_detail?.nama_indikator ||
        initialData?.indikator?.nama_indikator ||
        `Indikator ${initialData.indikator_id}`,
    });
  }

  // Edit: sinkronkan dropdown Program (baris tabel) dari FK program_id yang tersimpan
  useEffect(() => {
    if (!initialData?.id || !programData?.length || initialData?.program_id === null) {
      return;
    }
    const match = programData.find((p) => Number(p.program_id) === Number(initialData.program_id));
    if (match) {
      setValueIfChanged('tabel_program_id', Number(match.id));
    }
  }, [initialData?.id, initialData?.program_id, programData?.length, setValueIfChanged]);

  // Sinkron FK program + isi otomatis dari baris renstra_tabel_program (data RPJMD yang sudah dijadwalkan di tabel)
  useEffect(() => {
    if (selectedTabelProgramId === null || selectedTabelProgramId === '') {
      if (hasTabelProgramList) {
        setValueIfChanged('program_id', null);
      }
      return;
    }
    if (!programData?.length) return;
    const row = programData.find((p) => Number(p.id) === Number(selectedTabelProgramId));
    if (!row) return;

    setValueIfChanged('program_id', Number(row.program_id));

    if (initialData?.id) {
      prevTabelProgramId.current = selectedTabelProgramId;
      return;
    }

    if (
      prevTabelProgramId.current !== undefined &&
      prevTabelProgramId.current !== selectedTabelProgramId
    ) {
      setValueIfChanged('kegiatan_id', null);
      setValueIfChanged('indikator_id', null);
    }
    prevTabelProgramId.current = selectedTabelProgramId;

    if (row.lokasi !== null && row.lokasi !== undefined && String(row.lokasi).trim() !== '') {
      setValueIfChanged('lokasi', row.lokasi);
    }
    if (row.baseline !== null && row.baseline !== undefined && row.baseline !== '') {
      setValueIfChanged('baseline', row.baseline);
    }
    if (row.satuan_target) setValueIfChanged('satuan_target', row.satuan_target);

    for (let i = 1; i <= 6; i++) {
      const t = row[`target_tahun_${i}`];
      if (t !== null && t !== undefined && t !== '') setValueIfChanged(`target_tahun_${i}`, t);
    }
  }, [selectedTabelProgramId, programData?.length, initialData?.id, hasTabelProgramList]);

  // Mode tanpa Tabel Program: ganti program â†’ reset kegiatan & indikator (tambah)
  useEffect(() => {
    if (hasTabelProgramList) return;
    if (selectedRenstraProgramId === null || selectedRenstraProgramId === '') {
      return;
    }
    if (initialData?.id) {
      prevProgramIdDirect.current = selectedRenstraProgramId;
      return;
    }
    if (
      prevProgramIdDirect.current !== undefined &&
      prevProgramIdDirect.current !== selectedRenstraProgramId
    ) {
      setValueIfChanged('kegiatan_id', null);
      setValueIfChanged('indikator_id', null);
    }
    prevProgramIdDirect.current = selectedRenstraProgramId;
  }, [hasTabelProgramList, selectedRenstraProgramId, initialData?.id]);

  // Auto-set bidang/kode/nama dari renstra_kegiatan (selaras RPJMD lewat relasi kegiatan)
  useEffect(() => {
    const sel = kegiatanData?.find((k) => Number(k.id) === Number(selectedKegiatanId));
    if (!sel) return;
    setValueIfChanged('bidang_penanggung_jawab', sel.bidang_opd || '');
    setValueIfChanged('kode_kegiatan', sel.kode_kegiatan || '');
    setValueIfChanged('nama_kegiatan', sel.nama_kegiatan || '');
  }, [selectedKegiatanId, kegiatanData?.length]);

  // Auto-set baseline & target dari indikator Renstra (menimpa nilai dari Program bila ada)
  useEffect(() => {
    const sel = indikatorData?.find((i) => Number(i.id) === Number(selectedIndikatorId));
    if (!sel) return;
    setValueIfChanged('indikator', sel.nama_indikator || sel.kode_indikator || '');
    if (sel.satuan) setValueIfChanged('satuan_target', sel.satuan);
    YEARS.forEach((i) => {
      const val = sel[`target_tahun_${i}`];
      if (val !== undefined && val !== null) setValueIfChanged(`target_tahun_${i}`, val);
    });

    setValueIfChanged('target_tahun_6', 0, {
      shouldDirty: false,
      shouldValidate: false,
    });

    if (!initialData?.id) {
      const paguAcuan = Number(
        sel.pagu_cached ||
          sel.total_pagu_rpjmd ||
          sel.pagu_rpjmd_acuan ||
          sel.pagu_akhir_renstra ||
          0,
      );

      const paguDasar = Math.floor(paguAcuan / 5);
      const sisaPagu = paguAcuan - paguDasar * 5;

      setValueIfChanged('pagu_rpjmd_acuan', paguAcuan);

      for (let i = 1; i <= 4; i++) {
        setValueIfChanged(`pagu_tahun_${i}`, paguDasar);
      }

      setValueIfChanged('pagu_tahun_5', paguDasar + sisaPagu);
      setValueIfChanged('pagu_tahun_6', 0);
      setValueIfChanged('pagu_akhir_renstra', paguAcuan);
    }
  }, [selectedIndikatorId, indikatorData?.length, initialData?.id]);

  // Hitung target & pagu akhir
  const targetValues = useWatch({
    control,
    name: YEARS.map((i) => `target_tahun_${i}`),
  });

  const targetAkhirRenstra = useMemo(() => {
    const nums = (targetValues || []).map((v) => new Decimal(v || 0));
    const total = nums.reduce((sum, value) => sum.plus(value), new Decimal(0));

    if (nums.length === 0) return 0;

    return total.div(nums.length).toDecimalPlaces(2, Decimal.ROUND_UP).toNumber();
  }, [targetValues]);

  useEffect(() => {
    setValueIfChanged('target_akhir_renstra', targetAkhirRenstra, {
      shouldDirty: false,
      shouldValidate: false,
    });
  }, [targetAkhirRenstra]);

  const paguValues = useWatch({
    control,
    name: YEARS.map((i) => `pagu_tahun_${i}`),
  });

  const paguAkhirRenstra = useMemo(() => {
    return (paguValues || []).reduce((total, value) => total + Number(value || 0), 0);
  }, [paguValues]);

  useEffect(() => {
    setValueIfChanged('pagu_akhir_renstra', paguAkhirRenstra, {
      shouldDirty: false,
      shouldValidate: false,
    });

    setValueIfChanged('target_tahun_6', 0, {
      shouldDirty: false,
      shouldValidate: false,
    });

    setValueIfChanged('pagu_tahun_6', 0, {
      shouldDirty: false,
      shouldValidate: false,
    });
  }, [paguAkhirRenstra]);

  const handleSubmitRevisi = async (data) => {
    if (isAuditMode) {
      setServerMessage('Data approved dalam mode audit. Klik Buat Revisi untuk mengubah.');
      return;
    }

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

      const payload = buildKegiatanPayload({
        ...data,
        renstra_id: renstraId,
        alasan_revisi: alasanRevisi,
        kebijakan_id: activeArahKebijakanId,
      });

      if (initialData?.status_revisi === 'approved') {
        await api.post(`${ENDPOINT}/${initialData.id}/revisi`, payload);
      } else {
        await api.put(`${ENDPOINT}/${initialData.id}`, payload);
      }

      setServerMessage('âœ… Revisi berhasil disimpan sebagai draft.');
      setTimeout(() => {
        navigate('/renstra/tabel/kegiatan');
      }, 600);
    } catch (err) {
      setServerMessage(
        err?.response?.data?.message || err?.response?.data?.error || 'Gagal menyimpan revisi.',
      );
    } finally {
      setSubmitRevisiLoading(false);
    }
  };

  const shouldShowSpinner = !renstraAktif;

  return (
    <Card title={formTitle}>
      {shouldShowSpinner ? (
        <div>Memuat data Renstra...</div>
      ) : (
        <>
          <RenstraBreadcrumb chain={breadcrumbChain} />
          <div style={{ marginBottom: 16, display: 'flex', gap: 8 }}>
            <Button onClick={() => navigate('/dashboard-renstra')}>ðŸ”™ Kembali</Button>
          </div>

          <FormProvider {...form}>
            <form onSubmit={form.handleSubmit(initialData ? handleSubmitRevisi : onSubmit)}>
              <input
                type="hidden"
                {...form.register('kebijakan_id')}
                value={activeArahKebijakanId ?? ''}
              />
              {isAuditMode && (
                <Alert
                  type="success"
                  showIcon
                  style={{ marginBottom: 16 }}
                  message="Data sudah approved"
                  description="Mode audit aktif. Data tidak dapat diubah langsung. Klik Buat Revisi untuk membuat perubahan baru."
                />
              )}
              {hasTabelProgramList ? (
                <SelectWithLabelValue
                  name="tabel_program_id"
                  label="Program"
                  control={control}
                  errors={errors}
                  disabled={isAuditMode}
                  required
                  valueAsNumber
                  options={(programData || []).map((p) => ({
                    label: `${p.kode_program || p.program?.kode_program || '-'} - ${
                      p.nama_program || p.program?.nama_program || '-'
                    }`,
                    value: Number(p.id),
                  }))}
                />
              ) : (
                <>
                  <Alert
                    type="info"
                    showIcon
                    style={{ marginBottom: 12 }}
                    message="Belum ada baris di menu Input Tabel â†’ Program untuk Renstra OPD ini. Pilih program dari master Program Renstra; pagu periode tidak dibatasi oleh Tabel Program."
                  />
                  <SelectWithLabelValue
                    name="program_id"
                    label="Program"
                    control={control}
                    errors={errors}
                    required
                    valueAsNumber
                    disabled={isAuditMode}
                    options={(renstraProgramData || []).map((p) => ({
                      label: `${p.kode_program} - ${p.nama_program}`,
                      value: Number(p.id),
                    }))}
                  />
                </>
              )}

              <SelectWithLabelValue
                name="kegiatan_id"
                label="Kegiatan"
                control={control}
                errors={errors}
                required
                valueAsNumber
                disabled={isAuditMode}
                options={(kegiatanData || [])
                  .filter(
                    (k) =>
                      selectedRenstraProgramId !== null &&
                      Number(k.program_id) === Number(selectedRenstraProgramId),
                  )
                  .map((k) => ({
                    label: `${k.kode_kegiatan} - ${k.nama_kegiatan}`,
                    value: Number(k.id),
                  }))}
              />

              {selectedKegiatanId && !loadingIndikator && indikatorData.length === 0 && (
                <Alert
                  type="warning"
                  showIcon
                  style={{ marginBottom: 12 }}
                  message="Indikator belum tersedia"
                  description="Tidak ada indikator Renstra dengan stage kegiatan yang cocok dengan ref_id kegiatan terpilih."
                />
              )}

              <SelectWithLabelValue
                name="indikator_id"
                label="Indikator"
                control={control}
                errors={errors}
                required
                valueAsNumber
                disabled={isAuditMode || !selectedKegiatanRefId || loadingIndikator}
                options={(indikatorOptions || []).map((i) => ({
                  label: i.nama_indikator,
                  value: Number(i.id),
                }))}
              />

              <InputField
                name="indikator"
                label="Nama Indikator"
                control={control}
                errors={errors}
                disabled={isAuditMode}
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
                disabled={isAuditMode}
              />
              <InputField
                name="lokasi"
                label="Lokasi"
                control={control}
                errors={errors}
                disabled={isAuditMode}
              />
              <InputField
                name="kode_kegiatan"
                label="Kode Kegiatan"
                control={control}
                errors={errors}
                disabled={isAuditMode}
              />
              <InputField
                name="nama_kegiatan"
                label="Nama Kegiatan"
                control={control}
                errors={errors}
                disabled={isAuditMode}
              />
              <InputField
                name="bidang_penanggung_jawab"
                label="Bidang Penanggung Jawab"
                control={control}
                errors={errors}
                disabled={isAuditMode}
              />

              <h4 style={{ marginTop: 24 }}>Target periode (th. ke-1 s/d ke-5)</h4>

              {YEARS.map((i) => (
                <InputField
                  key={`target_tahun_${i}`}
                  name={`target_tahun_${i}`}
                  label={`Target (th. ke-${i})`}
                  control={control}
                  errors={errors}
                  disabled={isAuditMode}
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
                  type="success"
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
                  disabled={isAuditMode || !initialData}
                />
              ))}

              <h4 style={{ marginTop: 24 }}>Kondisi Akhir Kinerja Periode Renstra</h4>

              {blocked && (
                <Alert
                  style={{ marginTop: 12 }}
                  message="âš ï¸ Sisa pagu ada yang kurang. Lengkapi dulu sebelum menambah program/kegiatan baru."
                  type="warning"
                />
              )}

              {Object.keys(serverWarnings).length > 0 && (
                <Card size="small" type="inner" title="Peringatan Server" style={{ marginTop: 12 }}>
                  {Object.entries(serverWarnings).map(([k, v]) => (
                    <div
                      key={k}
                      style={{
                        color: v.includes('kurang')
                          ? 'blue'
                          : v.includes('lebih')
                            ? 'red'
                            : 'green',
                      }}
                    >
                      {v}
                    </div>
                  ))}
                </Card>
              )}

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

              {initialData && !isAuditMode && (
                <div style={{ marginTop: 24 }}>
                  <h4>Alasan Revisi</h4>
                  <Input.TextArea
                    rows={4}
                    value={alasanRevisi}
                    onChange={(e) => {
                      setAlasanRevisi(e.target.value);
                      setValueIfChanged('alasan_revisi', e.target.value);
                    }}
                    placeholder="Tuliskan alasan revisi target/pagu kegiatan Renstra..."
                  />
                </div>
              )}

              {serverMessage && (
                <Alert
                  style={{ marginTop: 16 }}
                  type={serverMessage.startsWith('âœ…') ? 'success' : 'warning'}
                  showIcon
                  message={serverMessage}
                />
              )}

              <div style={{ marginTop: 24 }}>
                {!existingDataInfo || initialData ? (
                  isAuditMode ? (
                    <Button
                      type="primary"
                      onClick={() =>
                        navigate(`/renstra/tabel/kegiatan/edit/${initialData.id}?mode=revisi`)
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
                      {initialData ? (isRevisiMode ? 'Buat Revisi' : 'Simpan Draft') : 'Simpan'}
                    </Button>
                  )
                ) : (
                  <Alert
                    type="warning"
                    showIcon
                    message={existingMainRecordRejected ? 'Data sudah ditolak' : 'Data sudah ada'}
                    description={
                      existingMainRecordRejected
                        ? 'Gunakan Edit/Revisi jika ingin mengubah.'
                        : 'Gunakan Edit jika ingin mengubah.'
                    }
                  />
                )}
              </div>
            </form>
          </FormProvider>
        </>
      )}
    </Card>
  );
};

export default RenstraTabelKegiatanForm;
