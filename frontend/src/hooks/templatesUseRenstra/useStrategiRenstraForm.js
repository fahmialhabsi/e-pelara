import { useEffect, useState, useMemo, useCallback } from 'react';
import * as Yup from 'yup';
import api from '@/services/api';
import { useRenstraFormTemplate } from '@/hooks/templatesUseRenstra/useRenstraFormTemplate';
import { useWatch } from 'react-hook-form';
import { useQuery } from '@tanstack/react-query';

export const useStrategiRenstraForm = (initialData, renstraAktif) => {
  const schema = Yup.object().shape({
    sasaran_id: Yup.number().required('Sasaran Renstra wajib dipilih'),
    strategi_rpjmd_id: Yup.number().required('Strategi RPJMD wajib dipilih'),
    no_strategi: Yup.string().nullable(),
    deskripsi: Yup.string().required('Deskripsi Strategi wajib diisi'),
    renstra_id: Yup.number().required('Renstra wajib dipilih'),
    kebijakan_id: Yup.number().nullable(),
    program_id: Yup.number().nullable(),
    kegiatan_id: Yup.number().nullable(),
    subkegiatan_id: Yup.number().nullable(),
  });

  const defaultValues = {
    sasaran_id: '',
    strategi_rpjmd_id: '',
    no_strategi: '',
    deskripsi: '',
    renstra_id: '',
    kebijakan_id: null,
    program_id: null,
    kegiatan_id: null,
    subkegiatan_id: null,
    no_rpjmd: '',
    isi_strategi_rpjmd: '',
  };

  const generatePayload = useCallback(
    (formData) => ({
      sasaran_id: formData.sasaran_id,
      deskripsi: formData.deskripsi,
      renstra_id: formData.renstra_id,
      rpjmd_strategi_id: formData.strategi_rpjmd_id,
      kode_strategi: formData.no_strategi,
      no_rpjmd: formData.no_rpjmd,
      isi_strategi_rpjmd: formData.isi_strategi_rpjmd,
    }),
    [],
  );

  const [mutationResultData, setMutationResultData] = useState(null);

  const fetchOptions = useMemo(
    () => ({
      'sasaran-renstra': () =>
        api.get('/renstra-sasaran').then((res) => {
          const rows = res.data?.data ?? res.data ?? [];
          const list = Array.isArray(rows) ? rows : [];
          const rid = renstraAktif?.id ?? initialData?.renstra_id;
          return rid ? list.filter((s) => Number(s.renstra_id) === Number(rid)) : list;
        }),
    }),
    [renstraAktif?.id, renstraAktif?.tahun_mulai, initialData?.renstra_id],
  );

  const {
    form,
    onSubmit,
    isSubmitting,
    isLoading: isDropdownsLoading,
    dropdowns,
  } = useRenstraFormTemplate({
    initialData,
    renstraAktif,
    endpoint: '/renstra-strategi',
    schema,
    defaultValues,
    generatePayload,
    queryKeys: ['renstra-strategi'],
    redirectPath: '/renstra/strategi',
    fetchOptions,
    onMutationSuccess: setMutationResultData,
  });

  const { setValue, reset, control } = form;

  useEffect(() => {
    if (!initialData?.id || initialData.sasaran_id == null) return;
    setValue('sasaran_id', Number(initialData.sasaran_id), {
      shouldDirty: false,
      shouldValidate: false,
    });
  }, [initialData?.id, initialData?.sasaran_id, setValue]);

  // renstra_id dari aktif hanya untuk tambah — edit pakai nilai record
  useEffect(() => {
    if (initialData?.id) return;
    if (renstraAktif?.id) {
      setValue('renstra_id', renstraAktif.id, {
        shouldDirty: false,
        shouldValidate: false,
      });
    }
    if (renstraAktif?.rpjmd_id) {
      setValue('rpjmd_id', renstraAktif.rpjmd_id, {
        shouldDirty: false,
        shouldValidate: false,
      });
    }
  }, [renstraAktif, setValue, initialData?.id]);

  const watchedStrategiRpjmdId = useWatch({
    control,
    name: 'strategi_rpjmd_id',
  });

  const watchedSasaranRenstraId = useWatch({
    control,
    name: 'sasaran_id',
  });

  const selectedSasaranRenstra = useMemo(() => {
    const sid = Number(watchedSasaranRenstraId);
    if (!Number.isFinite(sid) || sid <= 0) return null;
    const rows = dropdowns?.['sasaran-renstra'] || [];
    return rows.find((s) => Number(s?.id) === sid) ?? null;
  }, [dropdowns?.['sasaran-renstra'], watchedSasaranRenstraId]);

  const rpjmdTahun = useMemo(() => {
    const y = renstraAktif?.tahun_mulai ?? initialData?.renstra?.tahun_mulai ?? null;
    const n = Number(y);
    return Number.isFinite(n) && n > 0 ? n : null;
  }, [renstraAktif?.tahun_mulai, initialData?.renstra?.tahun_mulai]);

  const selectedRpjmdSasaranId = useMemo(() => {
    const n = Number(selectedSasaranRenstra?.rpjmd_sasaran_id);
    return Number.isFinite(n) && n > 0 ? n : null;
  }, [selectedSasaranRenstra?.rpjmd_sasaran_id]);

  const expectedKodePrefix = useMemo(() => {
    const nomor = String(selectedSasaranRenstra?.nomor || '').trim();
    if (!nomor) return '';
    return nomor.replace(/^ST/i, 'SST');
  }, [selectedSasaranRenstra?.nomor]);

  const shouldLoadStrategiRpjmd =
    !!rpjmdTahun && (!!selectedRpjmdSasaranId || !!expectedKodePrefix);

  const { data: strategiRpjmdRowsRaw = [], isLoading: loadingStrategiRpjmd } = useQuery({
    queryKey: ['rpjmd-strategi', rpjmdTahun, selectedRpjmdSasaranId ?? 'all'],
    enabled: shouldLoadStrategiRpjmd,
    queryFn: async () => {
      const params = {
        jenis_dokumen: 'rpjmd',
        tahun: rpjmdTahun,
        limit: 1000,
      };
      if (selectedRpjmdSasaranId) params.sasaran_id = selectedRpjmdSasaranId;

      const res = await api.get('/strategi', { params });
      const raw = res.data;
      return Array.isArray(raw) ? raw : Array.isArray(raw?.data) ? raw.data : [];
    },
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  const strategiRpjmdOptions = useMemo(() => {
    const list = Array.isArray(strategiRpjmdRowsRaw) ? strategiRpjmdRowsRaw : [];
    const pref = expectedKodePrefix;
    if (!pref) return list;

    const filtered = list.filter((s) => String(s?.kode_strategi || '').startsWith(`${pref}.`));
    // Jika query sudah dibatasi sasaran_id (aman), jangan sampai dropdown kosong total hanya karena kode tidak selaras.
    if (selectedRpjmdSasaranId) return filtered.length ? filtered : list;
    // Jika belum ada rpjmd_sasaran_id, tampilkan hanya yang sesuai prefix agar user tidak salah pilih.
    return filtered;
  }, [strategiRpjmdRowsRaw, expectedKodePrefix, selectedRpjmdSasaranId]);

  // Saat sasaran berubah, kosongkan pilihan Strategi RPJMD agar user tidak salah pilih dari sasaran sebelumnya.
  useEffect(() => {
    if (initialData?.id) return;
    setValue('strategi_rpjmd_id', '', { shouldDirty: false, shouldValidate: false });
    setValue('no_strategi', '', { shouldDirty: false, shouldValidate: false });
    setValue('no_rpjmd', '', { shouldDirty: false, shouldValidate: false });
    setValue('isi_strategi_rpjmd', '', { shouldDirty: false, shouldValidate: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchedSasaranRenstraId]);

  // Generate kode Strategi Renstra unik (mis. SST2-01.03.1.1) hanya saat tambah,
  // berdasarkan kode unik Sasaran Renstra + urutan strategi di bawahnya.
  useEffect(() => {
    if (initialData?.id) return;
    if (!selectedSasaranRenstra?.nomor || !selectedSasaranRenstra?.id) return;

    const prefix = String(selectedSasaranRenstra.nomor).replace(/^STR/i, 'SST');

    api
      .get('/renstra-strategi', { params: { sasaran_id: selectedSasaranRenstra.id } })
      .then((res) => {
        const list = Array.isArray(res.data?.data) ? res.data.data : [];
        setValue('no_strategi', `${prefix}.${list.length + 1}`, {
          shouldDirty: false,
          shouldValidate: false,
        });
      })
      .catch(() => {});
  }, [selectedSasaranRenstra, setValue, initialData?.id]);

  useEffect(() => {
    const selectedStrategi = strategiRpjmdOptions?.find(
      (item) => Number(item.id) === Number(watchedStrategiRpjmdId),
    );

    const currentNoRpjmd = form.getValues('no_rpjmd');
    const currentIsiStrategiRpjmd = form.getValues('isi_strategi_rpjmd');

    if (selectedStrategi) {
      if (
        currentNoRpjmd !== selectedStrategi.kode_strategi ||
        currentIsiStrategiRpjmd !== selectedStrategi.deskripsi
      ) {
        setValue('no_rpjmd', selectedStrategi.kode_strategi, {
          shouldDirty: false,
          shouldValidate: false,
        });

        setValue('isi_strategi_rpjmd', selectedStrategi.deskripsi, {
          shouldDirty: false,
          shouldValidate: false,
        });

        if (!initialData?.id) {
          setValue('deskripsi', selectedStrategi.deskripsi || '', {
            shouldDirty: false,
            shouldValidate: false,
          });
        }
      }
    } else if (!initialData?.id) {
      if (currentNoRpjmd || currentIsiStrategiRpjmd) {
        setValue('no_rpjmd', '', { shouldDirty: false, shouldValidate: false });
        setValue('isi_strategi_rpjmd', '', {
          shouldDirty: false,
          shouldValidate: false,
        });
      }
    }
  }, [watchedStrategiRpjmdId, strategiRpjmdOptions, setValue, form, initialData?.id]);

  useEffect(() => {
    if (!initialData?.id || !strategiRpjmdOptions?.length) return;

    const sid = initialData.rpjmd_strategi_id ?? initialData.strategi_rpjmd_id;
    const selectedStrategi = strategiRpjmdOptions?.find((item) => Number(item.id) === Number(sid));

    const kode = initialData.kode_strategi ?? initialData.no_strategi ?? '';

    if (selectedStrategi) {
      setValue('strategi_rpjmd_id', Number(selectedStrategi.id), {
        shouldDirty: false,
        shouldValidate: false,
      });
      setValue('no_strategi', kode, { shouldDirty: false, shouldValidate: false });
      setValue('no_rpjmd', selectedStrategi.kode_strategi, {
        shouldDirty: false,
        shouldValidate: false,
      });
      setValue('isi_strategi_rpjmd', selectedStrategi.deskripsi, {
        shouldDirty: false,
        shouldValidate: false,
      });
    } else {
      const noR = initialData.no_rpjmd ?? kode;
      const isi = initialData.isi_strategi_rpjmd ?? '';
      if (sid != null) {
        setValue('strategi_rpjmd_id', Number(sid), {
          shouldDirty: false,
          shouldValidate: false,
        });
      }
      setValue('no_strategi', kode, { shouldDirty: false, shouldValidate: false });
      setValue('no_rpjmd', noR, { shouldDirty: false, shouldValidate: false });
      setValue('isi_strategi_rpjmd', isi, {
        shouldDirty: false,
        shouldValidate: false,
      });
    }
  }, [initialData, strategiRpjmdOptions, setValue]);

  // AI generate deskripsi strategi saat strategi RPJMD dipilih
  useEffect(() => {
    if (!watchedStrategiRpjmdId) return;
    const selected = strategiRpjmdOptions.find(
      (s) => String(s.id) === String(watchedStrategiRpjmdId),
    );
    if (!selected?.deskripsi) return;
    const namaOpd = renstraAktif?.nama_opd ?? 'OPD';
    const sasaranRenstra = selectedSasaranRenstra?.isi_sasaran ?? '';
    import('@/services/api').then(({ default: api }) => {
      api
        .post('/renstra-strategi/generate-strategi', {
          namaOpd,
          strategiRpjmd: selected.deskripsi,
          sasaranRenstra,
        })
        .then((res) => {
          if (res.data?.strategi) setValue('deskripsi', res.data.strategi, { shouldDirty: true });
        })
        .catch(() => {});
    });
  }, [
    watchedStrategiRpjmdId,
    strategiRpjmdOptions,
    renstraAktif,
    selectedSasaranRenstra,
    setValue,
  ]);

  // Gunakan isDropdownsLoading dari template (bukan .length) agar tidak
  // loading selamanya jika API mengembalikan array kosong [].
  const totalLoading =
    isSubmitting ||
    isDropdownsLoading ||
    dropdowns?.['sasaran-renstra'] === null ||
    (shouldLoadStrategiRpjmd && loadingStrategiRpjmd);

  return {
    form,
    onSubmit,
    isSubmitting: form.formState.isSubmitting,
    isLoading: totalLoading,
    dropdowns: {
      ...dropdowns,
      'strategi-rpjmd': strategiRpjmdOptions,
      strategiKodePrefix: expectedKodePrefix,
    },
    mutationResultData,
  };
};
