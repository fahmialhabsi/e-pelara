// src/shared/components/hooks/useIndikatorBuilder.js
import { useMemo, useCallback } from "react";
import { nanoid } from "nanoid";
import { formatOpdPenanggungLabel } from "@/utils/opdDisplayLabel";

export default function useIndikatorBuilder({ penanggungJawab = [] }) {
  const opdOptions = useMemo(() => penanggungJawab, [penanggungJawab]);

  const getTargetTahunValues = (values) =>
    [1, 2, 3, 4, 5].reduce((acc, i) => {
      const key = `target_tahun_${i}`;
      acc[key] = values[key] ? String(values[key]) : "";
      return acc;
    }, {});

  const buildIndikatorItem = useCallback(
    (values, overrides = {}) => {
      const satuan = values.satuan || "";
      const pjNum = Number(values.penanggung_jawab);
      const selectedOPD = opdOptions.find(
        (o) => Number(o.value ?? o.id) === pjNum,
      );

      return {
        indikator_id: nanoid(),
        ...values,
        penanggung_jawab: Number.isFinite(pjNum) && !Number.isNaN(pjNum)
          ? pjNum
          : null,
        baseline: values.baseline || "",
        penanggung_jawab_label: selectedOPD
          ? formatOpdPenanggungLabel(selectedOPD)
          : "",
        rekomendasi_ai: "",
        tahun_awal: values.tahun_awal || "",
        tahun_akhir: values.tahun_akhir || "",
        target_awal: values.target_awal || "",
        target_akhir: values.target_akhir || "",
        ...getTargetTahunValues(values),
        ...overrides,
      };
    },
    [opdOptions]
  );

  const resetFields = useCallback((setFieldValue) => {
    const fields = [
      "tolok_ukur_kinerja",
      "target_kinerja",
      "definisi_operasional",
      "metode_penghitungan",
      "baseline",
      "kriteria_kuantitatif",
      "kriteria_kualitatif",
      ...[1, 2, 3, 4, 5].map((i) => `target_tahun_${i}`),
      "keterangan",
    ];
    fields.forEach((field) => setFieldValue(field, ""));
  }, []);

  const generateKeteranganFrom = useCallback(
    ({
      tolok_ukur_kinerja,
      target_kinerja,
      definisi_operasional,
      metode_penghitungan,
      baseline,
    }) => {
      let text =
        `Indikator ini mengukur ${
          tolok_ukur_kinerja?.toLowerCase() || "..."
        }, ` +
        `dengan target kinerja sebesar ${target_kinerja || "..."}. ` +
        `Definisi operasional: "${definisi_operasional || "..."}". ` +
        `Metode: ${metode_penghitungan?.toLowerCase() || "..."}, ` +
        `baseline: ${baseline || "..."}. `;

      const numericBaseline = parseFloat(baseline);
      const numericTarget = parseFloat(target_kinerja);

      if (!isNaN(numericBaseline) && !isNaN(numericTarget)) {
        const diff = numericTarget - numericBaseline;
        text +=
          diff > 0
            ? `Target meningkat sebesar ${diff}.`
            : diff < 0
            ? `Target menurun sebesar ${Math.abs(diff)}.`
            : `Target tetap.`;
      } else {
        text +=
          "Perbedaan target tidak dapat dihitung karena format non-numerik.";
      }

      return text;
    },
    []
  );

  return {
    buildIndikatorItem,
    resetFields,
    generateKeteranganFrom,
  };
}
