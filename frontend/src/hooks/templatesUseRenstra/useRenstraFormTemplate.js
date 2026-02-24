import { useEffect, useCallback, useRef } from "react";
import { useForm, FormProvider } from "react-hook-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { App } from "antd";
import { yupResolver } from "@hookform/resolvers/yup";
import api from "@/services/api";

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
}) => {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const hasResetOnce = useRef(false);

  const resolvedSchema = typeof schema === "function" ? schema() : schema;

  const finalDefaultValues = {
    ...defaultValues,
    renstra_id:
      defaultValues.renstra_id ?? renstraAktif?.id ?? initialData?.renstra_id,
  };

  const form = useForm({
    resolver: yupResolver(resolvedSchema), // ✅ hapus context
    defaultValues: finalDefaultValues,
  });

  const { reset } = form;

  useEffect(() => {
    if (hasResetOnce.current) return;
    if (initialData) reset(initialData);
    hasResetOnce.current = true;
  }, [initialData, reset]);

  const mutation = useMutation({
    mutationFn: (payload) =>
      initialData
        ? api.put(`${endpoint}/${initialData.id}`, payload)
        : api.post(endpoint, payload),
    onSuccess: (res) => {
      if (res.data.blocked) {
        message.warning(res.data.message);
        console.table(res.data.warnings);
      } else {
        message.success(
          `Data berhasil ${initialData ? "diperbarui" : "disimpan"}!`
        );
        queryClient.invalidateQueries({ queryKey: queryKeys });
        if (typeof onSuccess === "function") onSuccess(res.data);
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

  return { form, onSubmit, isSubmitting: mutation.isPending };
};
