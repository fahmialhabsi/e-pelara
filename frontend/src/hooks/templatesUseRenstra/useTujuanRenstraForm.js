// src/hooks/templatesUseRenstra/useTujuanRenstraForm.js
import * as Yup from 'yup';
import api from '@/services/api';
import { useRenstraFormTemplate } from './useRenstraFormTemplate';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useWatch } from 'react-hook-form';
import { App } from 'antd';
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';

// Validasi schema
const schema = Yup.object().shape({
  misi_id: Yup.number().nullable(),
  rpjmd_tujuan_id: Yup.number()
    .typeError('Tujuan RPJMD wajib dipilih')
    .required('Tujuan RPJMD wajib dipilih'),
  no_tujuan: Yup.string().nullable(),
  isi_tujuan: Yup.string().required('Isi Tujuan wajib diisi'),
  renstra_id: Yup.number().required('Renstra wajib dipilih'),
  no_rpjmd: Yup.string().nullable(),
  isi_tujuan_rpjmd: Yup.string().nullable(),
});

// Payload ke backend
const generatePayload = (formData) => ({
  misi_id: formData.misi_id || null,
  rpjmd_tujuan_id: formData.rpjmd_tujuan_id || null,
  no_tujuan: formData.no_tujuan,
  isi_tujuan: formData.isi_tujuan,
  renstra_id: formData.renstra_id || null,
  no_rpjmd: formData.no_rpjmd,
  isi_tujuan_rpjmd: formData.isi_tujuan_rpjmd,
});

export const useTujuanRenstraForm = (initialData, renstraAktif) => {
  const { message } = App.useApp();
  const [mutationResultData, setMutationResultData] = useState(null);
  const renstraId = initialData?.renstra_id || renstraAktif?.id;
  const opdId = renstraAktif?.opd_id ?? initialData?.renstra?.opd_id ?? initialData?.opd_id ?? null;

  const defaultValues = useMemo(
    () => ({
      misi_id: null,
      rpjmd_tujuan_id: null,
      no_tujuan: '',
      isi_tujuan: '',
      renstra_id: renstraId || null,
      no_rpjmd: '',
      isi_tujuan_rpjmd: '',
    }),
    [renstraId],
  );

  const tahun =
    renstraAktif?.tahun_mulai ?? initialData?.renstra?.tahun_mulai ?? initialData?.tahun_mulai;

  const { data: tujuanRpjmdList = [], isLoading: isTujuanLoading } = useQuery({
    queryKey: ['tujuan-rpjmd-dropdown', tahun, opdId],
    queryFn: () =>
      api
        .get('/tujuan', {
          params: {
            jenis_dokumen: 'rpjmd',
            ...(tahun != null && tahun !== '' ? { tahun } : {}),
            ...(opdId != null && opdId !== '' ? { opd_id: opdId } : {}),
            limit: 500,
          },
        })
        .then((res) => {
          const raw = res.data;
          return Array.isArray(raw) ? raw : Array.isArray(raw?.data) ? raw.data : [];
        }),
    staleTime: 5 * 60 * 1000,
    enabled: tahun != null && tahun !== '',
  });

  const { form, onSubmit, isSubmitting } = useRenstraFormTemplate({
    initialData,
    renstraAktif,
    endpoint: '/renstra-tujuan',
    schema,
    defaultValues,
    generatePayload,
    queryKeys: ['renstra-tujuan'],
    redirectPath: '/renstra/tujuan',
    fetchOptions: {},

    onMutationSuccess: (dataFromBackend) => {
      setMutationResultData(dataFromBackend);
    },
  });

  // Susun dropdowns sesuai interface yang dipakai form dan handler
  const dropdowns = { 'tujuan-rpjmd': tujuanRpjmdList };

  const { control, setValue, reset } = form;

  const selectedTujuanId = useWatch({ control, name: 'rpjmd_tujuan_id' });
  const nomorFetchedRef = useRef(null);

  // Generate nomor otomatis
  useEffect(() => {
    const options = dropdowns?.['tujuan-rpjmd'];

    if (
      !initialData &&
      selectedTujuanId &&
      options?.length > 0 &&
      renstraId &&
      nomorFetchedRef.current !== selectedTujuanId
    ) {
      const generate = async () => {
        try {
          const res = await api.get('/renstra-tujuan/generate-nomor-tujuan', {
            params: { tujuan_id: selectedTujuanId, renstra_id: renstraId },
          });
          const nomor = res.data?.nomor_otomatis;
          if (nomor) {
            setValue('no_tujuan', nomor, { shouldDirty: false });
            nomorFetchedRef.current = selectedTujuanId;
          }
        } catch (err) {
          message.error('Gagal generate nomor tujuan otomatis.');
          setValue('no_tujuan', '', { shouldDirty: false });
        }
      };
      generate();
    } else if (!initialData && !selectedTujuanId) {
      setValue('no_tujuan', '', { shouldDirty: false });
      nomorFetchedRef.current = null;
    }
  }, [selectedTujuanId, dropdowns?.['tujuan-rpjmd'], initialData, renstraId, setValue]);

  // Sinkron edit: normalisasi id select + field agar cocok dengan option (bukan tampil ID mentah)
  useEffect(() => {
    if (!initialData) {
      reset({ ...defaultValues, renstra_id: renstraId });
    } else {
      reset({
        ...initialData,
        rpjmd_tujuan_id:
          initialData.rpjmd_tujuan_id != null ? Number(initialData.rpjmd_tujuan_id) : null,
        renstra_id: initialData.renstra_id ?? renstraId ?? null,
      });
    }
  }, [initialData, renstraId, reset, defaultValues]);

  // Handler perubahan dropdown Tujuan RPJMD
  // Saat user memilih Tujuan RPJMD:
  //   - isi_tujuan_rpjmd  = teks tujuan dari RPJMD (disimpan sebagai referensi)
  //   - isi_tujuan        = di-prefill dari RPJMD (sesuai Permendagri 86/2017: Renstra harus
  //                         selaras/turunan dari RPJMD), tapi user tetap bisa mengubahnya
  const handleTujuanChange = useCallback(
    (id) => {
      const num = id === '' || id == null ? null : Number(id);
      setValue('rpjmd_tujuan_id', num);
      const selected = dropdowns?.['tujuan-rpjmd']?.find((item) => Number(item.id) === Number(id));

      if (selected) {
        setValue('misi_id', selected.misi_id);
        setValue('no_rpjmd', selected.no_tujuan);
        setValue('isi_tujuan_rpjmd', selected.isi_tujuan);
        // Auto-prefill sementara dari RPJMD, lalu generate via AI
        setValue('isi_tujuan', selected.isi_tujuan || '', { shouldDirty: true });
        // Generate tujuan Renstra via AI (async, tidak blocking)
        const namaOpd = renstraAktif?.nama_opd ?? 'OPD';
        api
          .post('/renstra-tujuan/generate-tujuan', {
            namaOpd,
            tujuanRpjmd: selected.isi_tujuan,
            noTujuanRpjmd: selected.no_tujuan,
            tupoksi: null,
          })
          .then((res) => {
            if (res.data?.tujuan) {
              setValue('isi_tujuan', res.data.tujuan, { shouldDirty: true });
            }
          })
          .catch(() => {});
      } else {
        setValue('misi_id', '');
        setValue('no_rpjmd', '');
        setValue('isi_tujuan_rpjmd', '');
        setValue('isi_tujuan', '');
      }
    },
    [dropdowns?.['tujuan-rpjmd'], setValue],
  );

  const totalLoading = isSubmitting || isTujuanLoading;

  return {
    form,
    onSubmit,
    isSubmitting: form.formState.isSubmitting,
    isLoading: totalLoading,
    dropdowns,
    handleTujuanChange,
  };
};
