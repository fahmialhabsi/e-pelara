// subhooks/useCheckDuplicateKegiatan.js
import { useCallback, useState } from "react";
import debounce from "lodash.debounce";
import api from "@/services/api";

export default function useCheckDuplicateKegiatan(
  periode_id,
  isEdit,
  existingData,
  tahun,
  jenis_dokumen
) {
  const [duplicateField, setDuplicateField] = useState(null);
  const [checking, setChecking] = useState(false);

  const checkDuplicate = useCallback(
    debounce(async (field, value) => {
      if (!value?.trim() || !periode_id) return;
      setChecking(true);
      try {
        const res = await api.get("/kegiatan", {
          params: {
            periode_id,
            tahun,
            jenis_dokumen,
            [field]: value.trim(),
            limit: 1,
          },
        });

        const existing = res.data?.data?.[0];
        console.log("[API CheckDuplicate]", { field, value, existing });

        const inputNormalized = value.trim().toLowerCase();
        const existingValue = existing?.[field]?.trim().toLowerCase();

        console.log("[Compare]", { inputNormalized, existingValue });

        if (
          existing &&
          existingValue === inputNormalized &&
          (!isEdit || existing.id !== existingData?.id)
        ) {
          setDuplicateField(field);
        } else {
          setDuplicateField(null);
        }
      } catch (err) {
        console.error("Gagal cek duplikat:", err);
      } finally {
        setChecking(false);
      }
    }, 500),
    [periode_id, isEdit, existingData, tahun, jenis_dokumen]
  );

  return { duplicateField, checking, checkDuplicate };
}
