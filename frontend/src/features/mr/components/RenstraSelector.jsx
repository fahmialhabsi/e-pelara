import React, { useEffect } from 'react';
import { Alert, Col, Form, Row, Select, Typography } from 'antd';
import { useQuery } from '@tanstack/react-query';
import {
  fetchRenstraOpd,
  fetchTabelTujuan,
  fetchTabelSasaran,
  fetchTabelSasaranDetail,
  fetchStrategiByRenstra,
  fetchKebijakanByStrategi,
  fetchTabelProgram,
  fetchTabelKegiatan,
  fetchTabelSubkegiatan,
  RENSTRA_DROPDOWN_QUERY_KEYS,
} from '@/services/renstraDropdownService';

const { Title } = Typography;

const toArray = (res) => {
  const d = res?.data;
  if (Array.isArray(d)) return d;
  if (Array.isArray(d?.data)) return d.data;
  if (Array.isArray(d?.rows)) return d.rows;
  return [];
};

const formatPagu = (val) => (val ? `Rp ${Number(val).toLocaleString('id-ID')}` : 'Rp 0');

const pickText = (...values) =>
  values.map((v) => (v == null ? '' : String(v).trim())).find((v) => v.length > 0) || '';

const RenstraSelector = ({ form, disabled = false }) => {
  const renstraId = Form.useWatch('mr_renstra_id', form);
  const tujuanId = Form.useWatch('mr_tujuan_id', form);
  const sasaranId = Form.useWatch('mr_sasaran_id', form);
  const strategiId = Form.useWatch('mr_strategi_id', form);
  const programId = Form.useWatch('mr_program_id', form);
  const kegiatanId = Form.useWatch('mr_kegiatan_id', form);
  const subkegiatanId = Form.useWatch('mr_subkegiatan_id', form);
  const renstraIdNum = Number(renstraId);
  const hasValidRenstraId = Number.isFinite(renstraIdNum) && renstraIdNum > 0;

  // --- Fetch ---
  const { data: opdRes, isLoading: loadOpd } = useQuery({
    queryKey: RENSTRA_DROPDOWN_QUERY_KEYS.opdList(),
    queryFn: fetchRenstraOpd,
  });
  const { data: tujuanRes, isLoading: loadTujuan } = useQuery({
    queryKey: RENSTRA_DROPDOWN_QUERY_KEYS.tujuanList(hasValidRenstraId ? renstraIdNum : 'empty'),
    queryFn: () => fetchTabelTujuan(renstraIdNum),
    enabled: hasValidRenstraId,
  });
  const { data: sasaranRes, isLoading: loadSasaran } = useQuery({
    queryKey: RENSTRA_DROPDOWN_QUERY_KEYS.sasaranList(renstraId, tujuanId),
    queryFn: () => fetchTabelSasaran(renstraId, tujuanId),
    enabled: Boolean(renstraId && tujuanId),
  });
  const { data: sasaranDetailRes } = useQuery({
    queryKey: ['renstra-dd', 'tabel-sasaran-detail', String(sasaranId || 'empty')],
    queryFn: () => fetchTabelSasaranDetail(sasaranId),
    enabled: Boolean(sasaranId),
  });
  const { data: kebijakanRes, isLoading: loadKebijakan } = useQuery({
    queryKey: RENSTRA_DROPDOWN_QUERY_KEYS.kebijakanList(strategiId),
    queryFn: () => fetchKebijakanByStrategi(strategiId),
    enabled: Boolean(strategiId),
  });
  const { data: programRes, isLoading: loadProgram } = useQuery({
    queryKey: RENSTRA_DROPDOWN_QUERY_KEYS.programList(renstraId, sasaranId),
    queryFn: () => fetchTabelProgram(renstraId, sasaranId),
    enabled: Boolean(renstraId && sasaranId),
  });
  const { data: kegiatanRes, isLoading: loadKegiatan } = useQuery({
    queryKey: RENSTRA_DROPDOWN_QUERY_KEYS.kegiatanList(renstraId, programId),
    queryFn: () => fetchTabelKegiatan(renstraId, programId),
    enabled: Boolean(renstraId && programId),
  });
  const { data: subkegiatanRes, isLoading: loadSubkegiatan } = useQuery({
    queryKey: RENSTRA_DROPDOWN_QUERY_KEYS.subkegiatanList(renstraId, kegiatanId),
    queryFn: () => fetchTabelSubkegiatan(renstraId, kegiatanId),
    enabled: Boolean(renstraId && kegiatanId),
  });

  // --- Opsi dropdown ---
  const opdOpts = toArray(opdRes).map((i) => ({
    label: pickText(i.nama_opd, `Renstra #${i.id}`),
    value: String(i.id),
  }));
  const tujuanOpts = toArray(tujuanRes).map((i) => {
    const code = i.no_tujuan || i.nomor_tujuan || i.kode_tujuan || '';
    const name = i.isi_tujuan || i.nama_tujuan || '';

    return {
      label: `${code} ${name}`.trim(),
      value: String(i.tujuan_id ?? i.id),
      pagu: i.pagu_tujuan ?? i.total_pagu ?? i.pagu_akhir_renstra ?? 0,
    };
  });
  const sasaranOpts = toArray(sasaranRes).map((i) => ({
    label: `${pickText(i.no_sasaran, i.nomor_sasaran, i.kode_sasaran)} ${pickText(
      i.isi_sasaran,
      i.nama_sasaran,
      i.deskripsi,
      i.sasaran?.isi_sasaran,
      i.sasaran?.nama_sasaran,
    )}`.trim(),
    value: String(i.id),
    sasaran_id: i.sasaran_id ?? i.id ?? null,
    rpjmd_sasaran_id: i.rpjmd_sasaran_id ?? i.sasaran?.id ?? null,
    pagu: i.pagu_sasaran || i.total_pagu || 0,
  }));
  const selectedSasaranDetail =
    sasaranDetailRes?.data?.data ??
    sasaranDetailRes?.data ??
    sasaranDetailRes ??
    toArray(sasaranDetailRes)[0] ??
    null;
  const selectedSasaranOption = sasaranOpts.find((opt) => String(opt.value) === String(sasaranId));
  const selectedRpjmdSasaranId =
    selectedSasaranOption?.sasaran_id ??
    selectedSasaranOption?.rpjmd_sasaran_id ??
    selectedSasaranDetail?.rpjmd_sasaran_id ??
    selectedSasaranDetail?.sasaran_rpjmd_id ??
    selectedSasaranDetail?.sasaran_rpjmd?.id ??
    selectedSasaranDetail?.sasaran_id ??
    null;
  const { data: strategiRes, isLoading: loadStrategi } = useQuery({
    queryKey: RENSTRA_DROPDOWN_QUERY_KEYS.strategiList(renstraId, selectedRpjmdSasaranId || 'all'),
    queryFn: () => fetchStrategiByRenstra(renstraIdNum),
    enabled: hasValidRenstraId && Boolean(sasaranId),
  });
  const strategiOpts = toArray(strategiRes).map((i) => ({
    label: `${pickText(i.kode_strategi, i.strategi?.kode_strategi)} ${pickText(
      i.deskripsi_strategi,
      i.deskripsi,
      i.strategi?.deskripsi,
      i.strategi?.isi_strategi_rpjmd,
    )}`.trim(),
    value: String(i.strategi_id ?? i.id),
    sasaran_id: i.strategi?.sasaran_id ?? i.sasaran_id ?? null,
  }));
  const strategiOptsFinal = strategiOpts.filter((i) => {
    if (!selectedRpjmdSasaranId) return false;
    if (i.sasaran_id == null) return false;
    return String(i.sasaran_id) === String(selectedRpjmdSasaranId);
  });
  const strategiMismatch = Boolean(
    selectedRpjmdSasaranId && strategiOpts.length > 0 && strategiOptsFinal.length === 0,
  );

  const kebijakanOpts = toArray(kebijakanRes).map((i) => ({
    label: `${pickText(
      i.no_arah_rpjmd,
      i.kode_kebjkn,
      i.arah_kebijakan?.kode_arah,
      i.kode_arah,
    )} ${pickText(i.deskripsi, i.isi_arah_rpjmd, i.arah_kebijakan?.deskripsi)}`.trim(),
    value: String(i.id ?? i.kebijakan_id),
  }));
  const programOpts = toArray(programRes).map((i) => ({
    label: `${pickText(i.program?.kode_program, i.kode_program, i.nomor_program)} ${pickText(
      i.program?.nama_program,
      i.nama_program,
      i.deskripsi,
    )} — ${formatPagu(i.pagu_tahun_1 || i.pagu_akhir_renstra || i.pagu_program || i.total_pagu)}`.trim(),
    value: String(i.program_id || i.id),
    pagu: i.pagu_program || i.total_pagu || 0,
  }));
  const kegiatanOpts = toArray(kegiatanRes).map((i) => ({
    label: `${pickText(i.kegiatan?.kode_kegiatan, i.kode_kegiatan, i.nomor_kegiatan)} ${pickText(
      i.kegiatan?.nama_kegiatan,
      i.nama_kegiatan,
      i.deskripsi,
    )} — ${formatPagu(i.pagu_tahun_1 || i.pagu_akhir_renstra || i.pagu_kegiatan || i.total_pagu)}`.trim(),
    value: String(i.kegiatan_id || i.id),
    pagu: i.pagu_kegiatan || i.total_pagu || 0,
  }));
  const subkegiatanOpts = toArray(subkegiatanRes).map((i) => ({
    label:
      `${i.kode_sub_kegiatan || i.kode_subkegiatan || ''} ${i.nama_sub_kegiatan || i.nama_subkegiatan || ''} — ${formatPagu(i.pagu_tahun_1 || i.pagu_akhir_renstra || i.pagu_subkegiatan || i.pagu || i.total_pagu)}`.trim(),
    value: String(i.subkegiatan_id || i.id),
  }));

  // --- Auto-reset ---
  useEffect(() => {
    form.setFieldsValue({
      mr_tujuan_id: undefined,
      mr_sasaran_id: undefined,
      mr_strategi_id: undefined,
      mr_kebijakan_id: undefined,
      mr_program_id: undefined,
      mr_kegiatan_id: undefined,
      mr_subkegiatan_id: undefined,
    });
  }, [renstraId]);

  useEffect(() => {
    form.setFieldsValue({
      mr_sasaran_id: undefined,
      mr_strategi_id: undefined,
      mr_kebijakan_id: undefined,
      mr_program_id: undefined,
      mr_kegiatan_id: undefined,
      mr_subkegiatan_id: undefined,
    });
  }, [tujuanId]);

  useEffect(() => {
    form.setFieldsValue({
      mr_program_id: undefined,
      mr_kegiatan_id: undefined,
      mr_subkegiatan_id: undefined,
    });
  }, [sasaranId]);

  useEffect(() => {
    form.setFieldsValue({
      mr_kebijakan_id: undefined,
      mr_program_id: undefined,
      mr_kegiatan_id: undefined,
      mr_subkegiatan_id: undefined,
    });
  }, [strategiId]);

  useEffect(() => {
    form.setFieldsValue({ mr_kegiatan_id: undefined, mr_subkegiatan_id: undefined });
  }, [programId]);

  useEffect(() => {
    form.setFieldsValue({ mr_subkegiatan_id: undefined });
  }, [kegiatanId]);

  const sel = (name, label, opts, loading, dep) => (
    <Form.Item label={label} name={name}>
      <Select
        showSearch
        allowClear
        loading={loading}
        disabled={disabled || !dep}
        placeholder={dep ? `Pilih ${label}` : 'Pilih level di atas dulu'}
        optionFilterProp="label"
        optionLabelProp="label"
        options={opts}
      />
    </Form.Item>
  );

  return (
    <>
      <Title level={5} style={{ marginTop: 16 }}>
        Mapping Renstra
      </Title>
      <Alert
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
        message="Pilih secara berurutan sesuai hierarki Renstra."
      />
      <Row gutter={16}>
        <Col xs={24} md={12}>
          <Form.Item
            label="Renstra OPD"
            name="mr_renstra_id"
            rules={[{ required: true, message: 'Pilih Renstra OPD.' }]}
          >
            <Select
              showSearch
              allowClear
              loading={loadOpd}
              disabled={disabled}
              placeholder="Pilih Renstra OPD"
              optionFilterProp="label"
              optionLabelProp="label"
              options={opdOpts}
            />
          </Form.Item>
        </Col>
        <Col xs={24} md={12}>
          {sel('mr_tujuan_id', 'Tujuan', tujuanOpts, loadTujuan, renstraId)}
        </Col>
      </Row>
      <Row gutter={16}>
        <Col xs={24} md={12}>
          {sel('mr_sasaran_id', 'Sasaran', sasaranOpts, loadSasaran, tujuanId)}
        </Col>
        <Col xs={24} md={12}>
          <Form.Item label="Strategi" name="mr_strategi_id">
            <Select
              showSearch
              allowClear
              loading={loadStrategi}
              disabled={disabled || !sasaranId}
              placeholder={sasaranId ? 'Pilih Strategi' : 'Pilih level di atas dulu'}
              optionFilterProp="label"
              optionLabelProp="label"
              options={strategiOptsFinal}
              notFoundContent={
                strategiMismatch
                  ? 'Tidak ada Strategi yang cocok untuk Sasaran terpilih'
                  : 'Tidak ada data Strategi'
              }
            />
          </Form.Item>
        </Col>
      </Row>
      <Row gutter={16}>
        <Col xs={24} md={12}>
          {sel('mr_kebijakan_id', 'Arah Kebijakan', kebijakanOpts, loadKebijakan, strategiId)}
        </Col>
        <Col xs={24} md={12}>
          {sel('mr_program_id', 'Program', programOpts, loadProgram, sasaranId)}
        </Col>
      </Row>
      <Row gutter={16}>
        <Col xs={24} md={12}>
          {sel('mr_kegiatan_id', 'Kegiatan', kegiatanOpts, loadKegiatan, programId)}
        </Col>
        <Col xs={24} md={12}>
          {sel(
            'mr_subkegiatan_id',
            'Sub Kegiatan (+ Pagu)',
            subkegiatanOpts,
            loadSubkegiatan,
            kegiatanId,
          )}
        </Col>
      </Row>
    </>
  );
};

export default RenstraSelector;
