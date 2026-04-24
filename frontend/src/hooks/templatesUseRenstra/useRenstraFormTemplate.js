import { useEffect, useCallback, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { App } from "antd";
import { yupResolver } from "@hookform/resolvers/yup";
import api from "@/services/api";

/**
 * Template hook generik untuk semua form Renstra.
 *
 * Perbaikan:
 * - Tambah parameter `fetchOptions` untuk mengambil data dropdown secara paralel
 * - Mengembalikan `dropdowns` (object berisi array per key) dan `isLoading` (boolean)
 * - Support parameter `onMutationSuccess` (alias untuk `onSuccess`)
 */
export const useRenstraFormTemplate = ({
  initialData = null,
  renstraAktif = {},
  endpoint,
  schema,
  defaultValues = {},
  generatePayload,
  queryKeys = [],
  redirectPath = "/",
  onError = null,
  onSuccess = null,
  onMutationSuccess = null, // alias untuk onSuccess
  fetchOptions = {},        // { "key": () => Promise<array> }
  skipInitialDataReset = false, // true: jangan reset(initialData) — hook anak yang normalisasi field
  /** Diteruskan ke useForm; `isValid` di formState hanya andal bila mode onChange/onBlur/all. */
  mode,
  reValidateMode,
}) => {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  // ── State untuk dropdown data ──────────────────────────────────────────────
  // Inisialisasi setiap key dari fetchOptions dengan null (belum dimuat)
  const initDropdowns = () => {
    const init = {};
    Object.keys(fetchOptions).forEach((key) => {
      init[key] = null;
    });
    return init;
  };

  const [dropdowns, setDropdowns] = useState(initDropdowns);
  const [isLoadingDropdowns, setIsLoadingDropdowns] = useState(
    Object.keys(fetchOptions).length > 0
  );
  const fetchedRef = useRef(false);

  // Ambil semua dropdown secara paralel saat komponen mount
  useEffect(() => {
    const keys = Object.keys(fetchOptions);
    if (keys.length === 0) return;
    if (fetchedRef.current) return;
    fetchedRef.current = true;

    setIsLoadingDropdowns(true);

    const promises = keys.map((key) =>
      fetchOptions[key]()
        .then((data) => ({ key, data: Array.isArray(data) ? data : (data?.data ?? []) }))
        .catch((err) => {
          console.warn(`[useRenstraFormTemplate] Gagal fetch dropdown "${key}":`, err?.message);
          return { key, data: [] };
        })
    );

    Promise.all(promises).then((results) => {
      const next = {};
      results.forEach(({ key, data }) => {
        next[key] = data;
      });
      setDropdowns(next);
      setIsLoadingDropdowns(false);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // hanya sekali saat mount

  // ── Form ──────────────────────────────────────────────────────────────────
  const resolvedSchema = typeof schema === "function" ? schema() : schema;

  const finalDefaultValues = {
    ...defaultValues,
    renstra_id:
      defaultValues.renstra_id ?? renstraAktif?.id ?? initialData?.renstra_id,
  };

  const form = useForm({
    resolver: yupResolver(resolvedSchema),
    defaultValues: finalDefaultValues,
    ...(mode != null ? { mode } : {}),
    ...(reValidateMode != null ? { reValidateMode } : {}),
  });

  const { reset } = form;

  useEffect(() => {
    if (skipInitialDataReset || !initialData) return;
    reset(initialData);
  }, [initialData, reset, skipInitialDataReset]);

  // ── Mutation ──────────────────────────────────────────────────────────────
  const successCallback = onMutationSuccess ?? onSuccess;

  const mutation = useMutation({
    mutationFn: (payload) =>
      initialData
        ? api.put(`${endpoint}/${initialData.id}`, payload)
        : api.post(endpoint, payload),
    onSuccess: (res) => {
      if (res.data?.blocked) {
        message.warning(res.data.message);
        console.table(res.data.warnings);
      } else {
        message.success(
          `Data berhasil ${initialData ? "diperbarui" : "disimpan"}!`
        );
        queryClient.invalidateQueries({ queryKey: queryKeys });
        if (typeof successCallback === "function") successCallback(res.data);
        navigate(redirectPath);
      }
    },
    onError: (err) => {
      console.error(err);
      message.error(err?.response?.data?.message || "Gagal menyimpan data.");
      if (typeof onError === "function") onError(err);
    },
  });

  const onSubmit = useCallback(
    (formData) => {
      let payload = generatePayload(formData);
      if (!payload.renstra_id)
        payload.renstra_id =
          formData.renstra_id ?? renstraAktif?.id ?? initialData?.renstra_id;
      mutation.mutate(payload);
    },
    [generatePayload, mutation, renstraAktif, initialData]
  );

  return {
    form,
    onSubmit,
    isSubmitting: mutation.isPending,
    isLoading: isLoadingDropdowns,
    dropdowns,
  };
};
