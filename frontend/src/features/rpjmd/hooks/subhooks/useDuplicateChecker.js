// subhooks/useDuplicateChecker.js
import { useCallback } from "react";
import debounce from "lodash.debounce";
import api from "@/services/api";

export default function useDuplicateChecker(
  formData,
  existingData,
  setChecking,
  setDuplicateField
) {
  return useCallback(
    debounce(async (field, value) => {
      if (!value || !formData || !formData.kegiatan_id) return;
      setChecking(true);
      try {
        const res = await api.get("/sub-kegiatan", {
          params: {
            kegiatan_id: formData.kegiatan_id,
            [field]: value,
            limit: 1,
          },
        });
        const found = res.data?.data?.[0];
        if (found && (!existingData || found.id !== existingData.id)) {
          setDuplicateField(field);
        } else setDuplicateField(null);
      } catch (err) {
        console.error("Duplicate check failed:", err);
      } finally {
        setChecking(false);
      }
    }, 400),
    [formData?.kegiatan_id, existingData]
  );
}
