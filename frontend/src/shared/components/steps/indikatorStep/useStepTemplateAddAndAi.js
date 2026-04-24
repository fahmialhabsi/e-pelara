import { useState, useCallback } from "react";
import { postRekomendasiIndikatorAi } from "@/features/rpjmd/services/indikatorRpjmdApi";
import { mapRekomendasiAiErrorToMessage } from "@/features/rpjmd/services/indikatorRpjmdMapper";
import {
  INDIKATOR_FIELDS,
  TIPE_INDIKATOR_MAP,
} from "@/shared/components/constants/indikatorFields";
import { isNumeric, normalizeNumber } from "./indikatorStepNumeric";
import { extrapolateCapaianTahun5FromFour } from "@/features/rpjmd/utils/urusanKinerja228Picklists";
import {
  getRpjmdIndikatorDraftDedupeKey,
  upsertRpjmdIndikatorDraftRow,
} from "../wizardIndikatorStepUtils";

/**
 * Tambah item ke list indikator + alur rekomendasi AI (state & handler).
 */
export default function useStepTemplateAddAndAi({
  stepKey,
  values,
  list,
  setFieldValue,
  validateForm,
  buildIndikatorItem,
  resetFields,
  tahun,
  periode_id,
}) {
  const [message, setMessage] = useState(null);
  const [loadingAI, setLoadingAI] = useState(false);
  const [rekomendasiAI, setRekomendasiAI] = useState("");

  const handleAdd = useCallback(async () => {
    if (!tahun || !periode_id) {
      setMessage({
        variant: "warning",
        text: "Periode atau tahun belum tersedia.",
      });
      return;
    }

    const validationErrors = await validateForm();
    const hasBlocking = Object.entries(validationErrors).some(
      ([k, v]) => INDIKATOR_FIELDS.includes(k) && v
    );

    if (hasBlocking) {
      setMessage({ variant: "danger", text: "Periksa kembali isian Anda." });
      return;
    }

    const valuesToUse = { ...values };
    const cap5Raw = valuesToUse.capaian_tahun_5;
    if (cap5Raw == null || String(cap5Raw).trim() === "") {
      const projected = extrapolateCapaianTahun5FromFour(
        valuesToUse.capaian_tahun_1,
        valuesToUse.capaian_tahun_2,
        valuesToUse.capaian_tahun_3,
        valuesToUse.capaian_tahun_4,
      );
      if (projected) valuesToUse.capaian_tahun_5 = projected;
    }

    for (let i = 1; i <= 5; i++) {
      const valCapaian = valuesToUse[`capaian_tahun_${i}`];
      const valTarget = valuesToUse[`target_tahun_${i}`];

      if (!isNumeric(valCapaian)) {
        setMessage({
          variant: "danger",
          text: `Capaian (th. ke-${i}) harus berupa angka yang valid.`,
        });
        return;
      }

      if (!isNumeric(valTarget)) {
        setMessage({
          variant: "danger",
          text: `Target (th. ke-${i}) harus berupa angka yang valid.`,
        });
        return;
      }
    }

    const normalizedValues = { ...valuesToUse };
    for (let i = 1; i <= 5; i++) {
      normalizedValues[`capaian_tahun_${i}`] = normalizeNumber(
        valuesToUse[`capaian_tahun_${i}`]
      );
      normalizedValues[`target_tahun_${i}`] = normalizeNumber(
        valuesToUse[`target_tahun_${i}`]
      );
    }

    const newItem = buildIndikatorItem(
      {
        ...normalizedValues,
        jenis_dokumen: normalizedValues.jenis_dokumen ?? values.jenis_dokumen,
        periode_id: normalizedValues.periode_id ?? values.periode_id,
        tujuan_id: normalizedValues.tujuan_id ?? values.tujuan_id,
        misi_id: normalizedValues.misi_id ?? values.misi_id,
      },
      {
        tipe_indikator: TIPE_INDIKATOR_MAP[stepKey] ?? values.tipe_indikator,
        jenis_indikator: values.jenis_indikator,
        misi_id: values.misi_id,
        tujuan_id: values.tujuan_id,
        sasaran_id: values.sasaran_id,
        program_id: values.program_id,
        indikator_program_id: values.indikator_program_id,
      }
    );

    if (
      !Number(values.misi_id) ||
      !Number(values.tujuan_id) ||
      (stepKey === "sasaran" && !Number(values.sasaran_id))
    ) {
      setMessage({
        variant: "danger",
        text:
          "Pastikan Misi dan Tujuan telah dipilih" +
          (stepKey === "sasaran" ? " (termasuk Sasaran)" : "") +
          ".",
      });
      return;
    }

    const currentList = Array.isArray(values[stepKey])
      ? values[stepKey]
      : [];

    console.log("[DEBUG] preview rows before add:", currentList);
    console.log("[DEBUG] incoming preview row:", newItem);
    currentList.forEach((r, i) => {
      console.log(
        `[DEBUG] row[${i}] dedupe key=`,
        getRpjmdIndikatorDraftDedupeKey(r, values)
      );
    });
    const keyNew = getRpjmdIndikatorDraftDedupeKey(newItem, values);
    console.log("[DEBUG] incoming dedupe key=", keyNew);

    const existed = currentList.some(
      (row) => getRpjmdIndikatorDraftDedupeKey(row, values) === keyNew
    );
    const next = upsertRpjmdIndikatorDraftRow(currentList, newItem, values);
    console.log("[DEBUG] preview rows after upsert:", next);
    setFieldValue(stepKey, next);

    if (existed) {
      setMessage({
        variant: "success",
        text: "Kolom kosong pada pratinjau dilengkapi; data yang sudah ada tidak diubah.",
      });
      return;
    }

    resetFields(setFieldValue);
    setMessage({ variant: "success", text: "Indikator berhasil ditambahkan." });
  }, [
    tahun,
    periode_id,
    validateForm,
    setFieldValue,
    values,
    stepKey,
    buildIndikatorItem,
    resetFields,
  ]);

  const handleGunakanSaranAI = useCallback(() => {
    if (!rekomendasiAI || list.length === 0) return;
    const updated = [...list];
    updated[updated.length - 1] = {
      ...updated[updated.length - 1],
      rekomendasi_ai: rekomendasiAI,
    };
    setFieldValue(stepKey, updated);
    setMessage({ variant: "success", text: "Saran AI berhasil ditambahkan." });
    setRekomendasiAI("");
  }, [rekomendasiAI, list, setFieldValue, stepKey]);

  const handleRekomendasiAI = useCallback(async () => {
    setLoadingAI(true);
    setRekomendasiAI("");

    const indikatorList = list.length ? list : [buildIndikatorItem(values)];

    if (!values.nama_indikator?.trim() || !values.tipe_indikator?.trim()) {
      setMessage({
        variant: "warning",
        text: "Lengkapi nama & tipe indikator sebelum meminta saran AI.",
      });
      setLoadingAI(false);
      return;
    }

    try {
      const rekomendasi = await postRekomendasiIndikatorAi(indikatorList);

      if (rekomendasi && rekomendasi.trim() !== "") {
        setRekomendasiAI(rekomendasi);
      } else {
        setRekomendasiAI("Tidak ada saran yang dihasilkan.");
        setMessage({
          variant: "info",
          text: "AI tidak menghasilkan saran. Silakan lengkapi data indikator secara manual.",
        });
      }
    } catch (err) {
      console.error("❌ Gagal meminta rekomendasi:", err);
      const userText = mapRekomendasiAiErrorToMessage(err);
      setRekomendasiAI("Gagal menghubungi AI.");
      setMessage({
        variant: "danger",
        text: userText,
      });
    } finally {
      setLoadingAI(false);
    }
  }, [list, buildIndikatorItem, values]);

  return {
    message,
    setMessage,
    loadingAI,
    rekomendasiAI,
    handleAdd,
    handleGunakanSaranAI,
    handleRekomendasiAI,
  };
}
