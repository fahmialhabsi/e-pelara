import React, { useEffect } from 'react';
import { Button, Card } from 'antd';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useWatch } from 'react-hook-form';
import * as Yup from 'yup';

import api from '@/services/api';
import { useRenstraFormTemplate } from '@/hooks/templatesUseRenstra/useRenstraFormTemplate';
import SelectWithLabelValue from '@/shared/components/form/SelectWithLabelValue';
import InputField from '@/shared/components/form/InputField';
import { normalizeListItems } from '@/utils/apiResponse';

const ProgramRenstraForm = ({ initialData = null, renstraAktif }) => {
  const navigate = useNavigate();

  const schema = () =>
    Yup.object({
      rpjmd_arah_id: Yup.string().required('Arah Kebijakan RPJMD wajib dipilih'),
      renstra_kebijakan_id: Yup.string().required('Kebijakan Renstra wajib dipilih'),
      program_rpjmd_id: Yup.string().required('Program RPJMD wajib dipilih'),
      kode_program: Yup.string().required('Kode Program wajib diisi'),
      nama_program: Yup.string().required('Nama Program wajib diisi'),
      renstra_id: Yup.number()
        .typeError('Renstra ID harus berupa angka')
        .required('Renstra ID tidak boleh kosong')
        .positive('Renstra ID harus lebih dari 0'),
      opd_penanggung_jawab: Yup.string().required('OPD Penanggung Jawab wajib'),
      bidang_opd_penanggung_jawab: Yup.string().required('Bidang OPD wajib'),
      // Opsional — tidak semua Program menopang prioritas berjenjang.
      prioritas_nasional_id: Yup.string().nullable(),
      prioritas_daerah_id: Yup.string().nullable(),
      prioritas_kepala_daerah_id: Yup.string().nullable(),
    });

  const defaultValues = {
    rpjmd_arah_id: initialData?.rpjmd_arah_id ? String(initialData.rpjmd_arah_id) : '',
    renstra_kebijakan_id: initialData?.renstra_kebijakan_id
      ? String(initialData.renstra_kebijakan_id)
      : '',
    program_rpjmd_id: initialData?.program_rpjmd_id
      ? String(initialData.program_rpjmd_id)
      : initialData?.rpjmd_program_id
        ? String(initialData.rpjmd_program_id)
        : '',
    kode_program: initialData?.kode_program || '',
    nama_program: initialData?.nama_program || '',
    renstra_id: typeof renstraAktif?.id === 'number' ? renstraAktif.id : undefined,
    opd_penanggung_jawab: initialData?.opd_penanggung_jawab || '',
    bidang_opd_penanggung_jawab: initialData?.bidang_opd_penanggung_jawab || '',
    prioritas_nasional_id: initialData?.prioritas_nasional_id
      ? String(initialData.prioritas_nasional_id)
      : '',
    prioritas_daerah_id: initialData?.prioritas_daerah_id
      ? String(initialData.prioritas_daerah_id)
      : '',
    prioritas_kepala_daerah_id: initialData?.prioritas_kepala_daerah_id
      ? String(initialData.prioritas_kepala_daerah_id)
      : '',
  };

  const generatePayload = (data) => ({
    rpjmd_arah_id: data.rpjmd_arah_id,
    renstra_kebijakan_id: data.renstra_kebijakan_id,
    rpjmd_program_id: data.program_rpjmd_id,
    kode_program: data.kode_program,
    nama_program: data.nama_program,
    renstra_id: data.renstra_id,
    opd_penanggung_jawab: data.opd_penanggung_jawab,
    bidang_opd_penanggung_jawab: data.bidang_opd_penanggung_jawab,
    prioritas_nasional_id: data.prioritas_nasional_id || null,
    prioritas_daerah_id: data.prioritas_daerah_id || null,
    prioritas_kepala_daerah_id: data.prioritas_kepala_daerah_id || null,
  });

  const { form, onSubmit, isSubmitting } = useRenstraFormTemplate({
    initialData,
    renstraAktif,
    endpoint: '/renstra-program',
    schema,
    defaultValues,
    generatePayload,
    queryKeys: ['renstra-program'],
    redirectPath: '/renstra/program',
  });

  const {
    control,
    setValue,
    handleSubmit,
    formState: { errors },
  } = form;

  const arahKebijakanId = useWatch({ control, name: 'rpjmd_arah_id' });
  const renstraKebijakanId = useWatch({
    control,
    name: 'renstra_kebijakan_id',
  });
  const programId = useWatch({ control, name: 'program_rpjmd_id' });
  const opdTerpilih = useWatch({ control, name: 'opd_penanggung_jawab' });
  const isProgramScoped = Boolean(arahKebijakanId && renstraKebijakanId);

  const { data: arahKebijakanOptions = [], isLoading: isLoadingArah } = useQuery({
    queryKey: ['arah-kebijakan-rpjmd', renstraAktif?.tahun_mulai],
    queryFn: async () =>
      normalizeListItems(
        (
          await api.get('/arah-kebijakan', {
            params: {
              tahun: renstraAktif?.tahun_mulai,
              jenis_dokumen: 'rpjmd',
              limit: 1000,
              renstra_id: renstraAktif?.id,
            },
          })
        ).data,
      ),
    enabled: !!renstraAktif?.tahun_mulai,
  });

  const { data: kebijakanRenstraOptions = [], isLoading: isLoadingKebijakan } = useQuery({
    queryKey: ['renstra-kebijakan-by-arah', renstraAktif?.id, arahKebijakanId],
    queryFn: async () =>
      normalizeListItems(
        (
          await api.get('/renstra-kebijakan', {
            params: {
              rpjmd_arah_id: arahKebijakanId,
              renstra_id: renstraAktif?.id,
              limit: 1000,
            },
          })
        ).data,
      ),
    enabled: !!renstraAktif?.id && !!arahKebijakanId,
  });

  const { data: programOptions = [], isLoading: isLoadingProgram } = useQuery({
    queryKey: ['program-rpjmd', renstraAktif?.tahun_mulai, arahKebijakanId, renstraKebijakanId],
    queryFn: async () =>
      normalizeListItems(
        (
          await api.get('/programs/all', {
            params: {
              tahun: renstraAktif?.tahun_mulai,
              jenis_dokumen: 'rpjmd',
              arah_kebijakan_id: arahKebijakanId,
              limit: 500,
            },
          })
        ).data,
      ),
    enabled: !!renstraAktif?.tahun_mulai && isProgramScoped,
  });

  const { data: opdOptions = [] } = useQuery({
    queryKey: ['opd-penanggung-jawab'],
    queryFn: async () => normalizeListItems((await api.get('/opd-penanggung-jawab')).data),
  });

  // Program Prioritas Nasional/Daerah/Gubernur — opsional, dipakai Renja Bab V
  // (Permendagri 14/2026) untuk menyajikan Program mana yang menopang prioritas
  // berjenjang mana. Sumbernya master RPJMD yang sama dengan yang dipakai form
  // item RKPD (jenis_dokumen='rpjmd'), supaya daftarnya konsisten lintas modul.
  const { data: prioritasNasionalOptions = [], isLoading: isLoadingPrioNas } = useQuery({
    queryKey: ['prioritas-nasional', renstraAktif?.tahun_mulai],
    queryFn: async () =>
      normalizeListItems(
        (
          await api.get('/prioritas-nasional', {
            params: { jenis_dokumen: 'rpjmd', tahun: renstraAktif?.tahun_mulai, limit: 1000 },
          })
        ).data,
      ),
    enabled: !!renstraAktif?.tahun_mulai,
  });

  const { data: prioritasDaerahOptions = [], isLoading: isLoadingPrioDaerah } = useQuery({
    queryKey: ['prioritas-daerah-program', renstraAktif?.tahun_mulai],
    queryFn: async () =>
      normalizeListItems(
        (
          await api.get('/prioritas-daerah', {
            params: { jenis_dokumen: 'rpjmd', tahun: renstraAktif?.tahun_mulai, limit: 1000 },
          })
        ).data,
      ),
    enabled: !!renstraAktif?.tahun_mulai,
  });

  const { data: prioritasGubernurOptions = [], isLoading: isLoadingPrioGub } = useQuery({
    queryKey: ['prioritas-gubernur-program', renstraAktif?.tahun_mulai],
    queryFn: async () =>
      normalizeListItems(
        (
          await api.get('/prioritas-gubernur', {
            params: { jenis_dokumen: 'rpjmd', tahun: renstraAktif?.tahun_mulai, limit: 1000 },
          })
        ).data,
      ),
    enabled: !!renstraAktif?.tahun_mulai,
  });

  // Program yang sudah terdaftar di Renstra ini — dipakai untuk memeriksa
  // konsistensi urusan dan mendeteksi program yang menopang >1 Arah Kebijakan.
  const { data: programTerdaftar = [] } = useQuery({
    queryKey: ['renstra-program-terdaftar', renstraAktif?.id],
    queryFn: async () =>
      normalizeListItems(
        (await api.get('/renstra-program', { params: { renstra_id: renstraAktif?.id } })).data,
      ),
    enabled: !!renstraAktif?.id,
  });

  useEffect(() => {
    if (!programId) return;

    const selected = programOptions.find((p) => String(p.id) === String(programId));
    if (!selected) return;

    setValue('kode_program', selected.kode_program || '');
    setValue('nama_program', selected.nama_program || '');
  }, [programId, programOptions, setValue]);

  useEffect(() => {
    if (!initialData && renstraAktif) {
      if (renstraAktif.nama_opd) {
        setValue('opd_penanggung_jawab', renstraAktif.nama_opd);
      }
      if (renstraAktif.bidang_opd) {
        setValue('bidang_opd_penanggung_jawab', renstraAktif.bidang_opd);
      }
    }
  }, [renstraAktif, initialData, setValue]);

  const bidangOptions = opdOptions
    .filter((item) => item.nama_opd === opdTerpilih)
    .map((item) => ({
      label: item.nama_bidang_opd,
      value: item.nama_bidang_opd,
    }));

  // ── Pemeriksaan konsistensi urusan Program vs Arah Kebijakan ───────────────
  // Kode program mengikuti nomenklatur Kepmendagri 050-5889/2021 dengan format
  // <urusan>.<bidang urusan>.<program>, mis. 2.09.02 → urusan "2.09" (Pangan).
  // Satu Arah Kebijakan boleh dijabarkan ke lebih dari satu Program, tetapi lompat
  // ke URUSAN berbeda hampir selalu tanda salah pilih nomenklatur — jadi diberi
  // peringatan saja (tidak memblokir simpan; keputusan tetap di penyusun Renstra).
  const urusanDari = (kode) =>
    String(kode || '')
      .split('.')
      .slice(0, 2)
      .join('.');

  const programDipilih = programOptions.find((p) => String(p.id) === String(programId));
  const kodeProgramDipilih = programDipilih?.kode_program || '';
  const urusanDipilih = urusanDari(kodeProgramDipilih);

  const urusanRenstra = Array.from(
    new Set(programTerdaftar.map((p) => urusanDari(p.kode_program)).filter(Boolean)),
  );

  const peringatanBedaUrusan =
    urusanDipilih && urusanRenstra.length > 0 && !urusanRenstra.includes(urusanDipilih)
      ? `Program ${kodeProgramDipilih} berada di urusan ${urusanDipilih}, berbeda dari urusan yang sudah dipakai Renstra ini (${urusanRenstra.join(', ')}). Pastikan nomenklatur ini memang kewenangan OPD Anda.`
      : '';

  const programKembar = kodeProgramDipilih
    ? programTerdaftar.filter(
        (p) =>
          p.kode_program === kodeProgramDipilih && String(p.id) !== String(initialData?.id ?? ''),
      )
    : [];

  if (!renstraAktif) {
    return (
      <Card>
        <p>Renstra belum dipilih. Silakan pilih Renstra terlebih dahulu.</p>
      </Card>
    );
  }

  return (
    <Card title={initialData ? 'Edit Program Renstra' : 'Tambah Program Renstra'}>
      <div style={{ marginBottom: 16, display: 'flex', gap: 8 }}>
        <Button onClick={() => navigate('/dashboard-renstra')}>🔙 Kembali</Button>
        <Button onClick={() => navigate('/renstra/program')}>📄 Daftar Program</Button>
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        <SelectWithLabelValue
          name="rpjmd_arah_id"
          label="Arah Kebijakan RPJMD"
          control={control}
          errors={errors}
          required
          loading={isLoadingArah}
          options={arahKebijakanOptions.map((item) => ({
            label: `${item.kode_arah} - ${item.deskripsi}`,
            value: String(item.id),
          }))}
          onChange={(val) => {
            setValue('rpjmd_arah_id', val);
            setValue('renstra_kebijakan_id', '');
            setValue('program_rpjmd_id', '');
            setValue('kode_program', '');
            setValue('nama_program', '');
          }}
        />

        <SelectWithLabelValue
          name="renstra_kebijakan_id"
          label="Kebijakan Renstra"
          control={control}
          errors={errors}
          required
          loading={isLoadingKebijakan}
          disabled={!arahKebijakanId}
          options={kebijakanRenstraOptions.map((item) => ({
            label: `${item.kode_kebjkn} - ${item.deskripsi}`,
            value: String(item.id),
          }))}
          onChange={(val) => {
            setValue('renstra_kebijakan_id', val);
            setValue('program_rpjmd_id', '');
            setValue('kode_program', '');
            setValue('nama_program', '');
          }}
        />

        <SelectWithLabelValue
          name="program_rpjmd_id"
          label="Program RPJMD"
          control={control}
          errors={errors}
          required
          loading={isLoadingProgram}
          disabled={!isProgramScoped}
          options={programOptions.map((item) => ({
            label: `${item.kode_program} - ${item.nama_program}`,
            value: String(item.id),
          }))}
          onChange={(val) => setValue('program_rpjmd_id', val)}
        />

        {!isProgramScoped && (
          <div
            style={{
              marginTop: 12,
              marginBottom: 12,
              padding: '10px 12px',
              borderRadius: 6,
              background: '#fffbe6',
              border: '1px solid #ffe58f',
              color: '#614700',
              fontSize: 13,
            }}
          >
            Pilih Arah Kebijakan terlebih dahulu agar Program dapat difilter sesuai chain.
          </div>
        )}

        {peringatanBedaUrusan && (
          <div
            style={{
              marginTop: 12,
              marginBottom: 12,
              padding: '10px 12px',
              borderRadius: 6,
              background: '#fff2e8',
              border: '1px solid #ffbb96',
              color: '#873800',
              fontSize: 13,
            }}
          >
            ⚠️ <strong>Peringatan konsistensi urusan.</strong> {peringatanBedaUrusan}
          </div>
        )}

        {programKembar.length > 0 && (
          <div
            style={{
              marginTop: 12,
              marginBottom: 12,
              padding: '10px 12px',
              borderRadius: 6,
              background: '#e6f4ff',
              border: '1px solid #91caff',
              color: '#003a8c',
              fontSize: 13,
            }}
          >
            ℹ️ Program <strong>{kodeProgramDipilih}</strong> sudah terdaftar {programKembar.length}{' '}
            kali di Renstra ini untuk Arah Kebijakan lain. Ini <strong>diperbolehkan</strong> — satu
            Program sah menjabarkan beberapa Arah Kebijakan. Pastikan memang disengaja.
          </div>
        )}

        <InputField
          name="kode_program"
          label="Kode Program"
          control={control}
          errors={errors}
          disabled
        />

        <InputField
          name="nama_program"
          label="Nama Program"
          control={control}
          errors={errors}
          disabled
        />

        <SelectWithLabelValue
          name="opd_penanggung_jawab"
          label="OPD Penanggung Jawab"
          control={control}
          errors={errors}
          required
          options={Array.from(new Set(opdOptions.map((opd) => opd.nama_opd))).map((opdName) => ({
            label: opdName,
            value: opdName,
          }))}
          onChange={(val) => {
            setValue('opd_penanggung_jawab', val);
            setValue('bidang_opd_penanggung_jawab', '');
          }}
        />

        <SelectWithLabelValue
          name="bidang_opd_penanggung_jawab"
          label="Bidang OPD Penanggung Jawab"
          control={control}
          errors={errors}
          required
          options={bidangOptions}
        />

        <SelectWithLabelValue
          name="prioritas_nasional_id"
          label="Program Prioritas Nasional"
          control={control}
          errors={errors}
          loading={isLoadingPrioNas}
          placeholder="(Opsional) Pilih Prioritas Nasional yang ditopang"
          options={prioritasNasionalOptions.map((item) => ({
            label: `${item.kode_prionas} - ${item.uraian_prionas}`,
            value: String(item.id),
          }))}
        />

        <SelectWithLabelValue
          name="prioritas_daerah_id"
          label="Program Prioritas Daerah"
          control={control}
          errors={errors}
          loading={isLoadingPrioDaerah}
          placeholder="(Opsional) Pilih Prioritas Daerah yang ditopang"
          options={prioritasDaerahOptions.map((item) => ({
            label: `${item.kode_prioda} - ${item.uraian_prioda}`,
            value: String(item.id),
          }))}
        />

        <SelectWithLabelValue
          name="prioritas_kepala_daerah_id"
          label="Program Prioritas Gubernur"
          control={control}
          errors={errors}
          loading={isLoadingPrioGub}
          placeholder="(Opsional) Pilih Prioritas Gubernur yang ditopang"
          options={prioritasGubernurOptions.map((item) => ({
            label: `${item.kode_priogub} - ${item.uraian_priogub}`,
            value: String(item.id),
          }))}
        />

        <div style={{ marginTop: 24 }}>
          <Button type="primary" htmlType="submit" loading={isSubmitting}>
            {initialData ? 'Update' : 'Simpan'}
          </Button>
        </div>
      </form>
    </Card>
  );
};

export default ProgramRenstraForm;
