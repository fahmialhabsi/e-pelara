import React, { useEffect, useMemo, useRef, useState } from "react";
import { Card, ProgressBar, Alert, Spinner } from "react-bootstrap";
import { useFormikContext } from "formik";
import { useDebounce } from "use-debounce";
import { mapOpdPenanggungRowToSelectOption } from "@/features/rpjmd/services/indikatorRpjmdMapper";
import useIndikatorFields from "../hooks/useIndikatorFields";
import useIndikatorBuilder from "../hooks/useIndikatorBuilder";
import { usePeriodeAktif } from "@/features/rpjmd/hooks/usePeriodeAktif";
import { TAB_LABELS } from "@/shared/components/constants/indikatorFields";
import useStepTemplateHandlers from "./indikatorStep/useStepTemplateHandlers";
import useStepTemplateData from "./indikatorStep/useStepTemplateData";
import useIndikatorStepEffects from "./indikatorStep/useIndikatorStepEffects";
import useStepTemplateAddAndAi from "./indikatorStep/useStepTemplateAddAndAi";
import StepTemplateHierarchySelects from "./indikatorStep/StepTemplateHierarchySelects";
import IndikatorFormTabsPanel from "./indikatorStep/IndikatorFormTabsPanel";
import {
  fetchUrusanKinerja20212024,
  fetchRpjmdTujuanSasaran31,
  fetchRpjmdImportIndikatorTujuan,
} from "@/features/rpjmd/services/rpjmdImportReadApi";
import IndikatorInputContextSummary from "./indikatorStep/IndikatorInputContextSummary";
import {
  listLooksPersistedFromServer,
  listLooksFinalized,
  comparePreviewWithStored,
} from "./wizardIndikatorStepUtils";
import { useRpjmdExcelPreview } from "@/contexts/RpjmdExcelPreviewContext";
import { WIZARD_STEPS_WITH_RPJMD_INDICATOR_IMPORT } from "@/shared/constants/rpjmdIndikatorWizardSteps";

const StepTemplate = ({
  stepKey,
  options = {},
  stepOptions = [],
  tabKey,
  setTabKey,
  onNext,
  onSave,
  /** false di halaman edit: sembunyikan alur "Simpan & Lanjut" tab 5 (pakai submit Formik luar). */
  showTab5WizardActions = true,
}) => {
  const kegiatanOptions = options?.kegiatan || [];
  const formRef = useRef(null);
  const [activeInnerTab, setActiveInnerTab] = useState(1);
  const penanggungJawabRef = useRef(null);
  /**
   * Snapshot list per-key — dipakai sebagai acuan isSameAsStored.
   * Untuk step Sasaran: key = "sasaran_<sasaran_id>" agar snapshot tidak bocor antar sasaran.
   * Untuk step lain: key tetap "_".
   */
  const storedListRef = useRef({});

  const { values, errors, touched, setFieldValue, validateForm } =
    useFormikContext();
  penanggungJawabRef.current = values.penanggung_jawab;

  const {
    tahun,
    dokumen,
    periode_id,
  } = usePeriodeAktif();

  /**
   * Baris dari context Excel preview (hasil parse sheet `indikatortujuans`
   * setelah pengguna klik "Pratinjau" di tab Indikator Tujuan).
   * Ini adalah **single source of truth** untuk dropdown Nama Indikator.
   * Jika context kosong, fallback ke data dari API (DB).
   */
  const { indikatortujuansRows: xlsxPreviewRows } = useRpjmdExcelPreview();

  const [urusanKinerja228, setUrusanKinerja228] = useState([]);
  const [rpjmdTujuanSasaran31, setRpjmdTujuanSasaran31] = useState([]);
  const [rpjmdImporIndikatorTujuan, setRpjmdImporIndikatorTujuan] = useState([]);
  const [rpjmdPdfImportRefsLoading, setRpjmdPdfImportRefsLoading] = useState(false);

  const wizardMisiId =
    values.misi_id != null && String(values.misi_id).trim() !== ""
      ? String(values.misi_id).trim()
      : "";

  useEffect(() => {
    if (
      !WIZARD_STEPS_WITH_RPJMD_INDICATOR_IMPORT.has(stepKey) ||
      periode_id == null ||
      String(periode_id).trim() === ""
    ) {
      setUrusanKinerja228([]);
      setRpjmdTujuanSasaran31([]);
      setRpjmdImporIndikatorTujuan([]);
      return undefined;
    }
    let cancelled = false;
    (async () => {
      setRpjmdPdfImportRefsLoading(true);
      try {
        const itParams = wizardMisiId ? { misi_id: wizardMisiId } : {};
        const [uRows, tRows, itRows] = await Promise.all([
          fetchUrusanKinerja20212024(periode_id).catch(() => []),
          fetchRpjmdTujuanSasaran31(periode_id).catch(() => []),
          fetchRpjmdImportIndikatorTujuan(periode_id, itParams).catch(() => []),
        ]);
        if (!cancelled) {
          setUrusanKinerja228(Array.isArray(uRows) ? uRows : []);
          setRpjmdTujuanSasaran31(Array.isArray(tRows) ? tRows : []);

          /**
           * Prioritas sumber `rpjmdImporIndikatorTujuan`:
           * 1. Context Excel preview (baris yang baru di-upload & dipratinjau)
           * 2. Data dari API/DB (baris yang sudah diterapkan ke basis data)
           *
           * Jika xlsxPreviewRows tersedia, gunakan HANYA itu (single source of truth).
           * Baris Excel ditandai `_xlsxSource: true` agar filter misi_id di
           * IndikatorTabContent bisa mengizinkan baris tanpa misi_id.
           */
          if (xlsxPreviewRows && xlsxPreviewRows.length > 0) {
            const markedXlsxRows = xlsxPreviewRows.map((r) => ({
              ...r,
              _xlsxSource: true,
            }));
            setRpjmdImporIndikatorTujuan(markedXlsxRows);
          } else {
            setRpjmdImporIndikatorTujuan(Array.isArray(itRows) ? itRows : []);
          }
        }
      } finally {
        if (!cancelled) setRpjmdPdfImportRefsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepKey, periode_id, wizardMisiId, xlsxPreviewRows]);

  const {
    handleTujuanChange,
    handleSasaranChange,
    handleProgramChange,
    handleKegiatanChange,
    handleStrategiChange,
    handleArahKebijakanChange,
    handleSubKegiatanChange,
    handleFieldChange,
    handleFieldChangeWithUnit,
  } = useStepTemplateHandlers(setFieldValue);

  const {
    aiRecoAvailable,
    aiRecoHint,
    tujuanOptions,
    sasaranOptions,
    programOptions,
    strategiOptions,
    arahKebijakanOptions,
    subKegiatanOptions,
    programIndikatorOptions,
    kegiatanIndikatorOptions,
    penanggungJawabOptions,
    contextData,
    loadingContext,
    fetchContext,
  } = useStepTemplateData({
    stepKey,
    tahun,
    dokumen,
    programId: values.program_id,
    kegiatanId: values.kegiatan_id,
    indikatorProgramId: values.indikator_program_id,
    kegiatanKodeIndikator: values.kegiatan_kode_indikator,
    setFieldValue,
    penanggungJawabRef,
    options,
    formPenanggungJawab: values.penanggung_jawab,
  });

  const list = Array.isArray(values[stepKey]) ? values[stepKey] : [];

  // Key snapshot per-entitas aktif — mencegah snapshot entitas A bocor ke entitas B.
  // Sasaran, Strategi, dan Arah Kebijakan masing-masing memakai ID entitas aktif sebagai key.
  const snapshotKey =
    stepKey === "sasaran"        ? `sasaran_${values.sasaran_id          || "none"}` :
    stepKey === "strategi"       ? `strategi_${values.strategi_id         || "none"}` :
    stepKey === "arah_kebijakan" ? `arahkebijakan_${values.arah_kebijakan_id || "none"}` :
    "_";

  // Tangkap snapshot saat list sudah stabil (semua item punya nama_indikator).
  // Snapshot diambil SEKALI per snapshotKey — tidak overwrite jika key sudah ada.
  useEffect(() => {
    const isListStable =
      list.length > 0 &&
      list.every((item) => item && String(item.nama_indikator || "").trim() !== "");
    if (!storedListRef.current[snapshotKey] && isListStable) {
      // setTimeout(0): tunggu satu tick agar semua field Formik selesai di-set sebelum snapshot.
      const timer = setTimeout(() => {
        // Guard ulang: pastikan belum diisi oleh render lain yang lebih cepat.
        if (!storedListRef.current[snapshotKey]) {
          storedListRef.current[snapshotKey] = list.map((item) => ({ ...item }));
          if (process.env.NODE_ENV !== "production") {
            // eslint-disable-next-line no-console
            console.log("[isSameAsStored] SNAPSHOT TAKEN", snapshotKey, storedListRef.current[snapshotKey]);
          }
        }
      }, 0);
      return () => clearTimeout(timer);
    }
    return undefined;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [list, snapshotKey]);

  // isSameAsStored = true hanya jika:
  //   1. Setiap item list sudah punya baseline DAN penanggung_jawab terisi
  //      (penanda data benar-benar final/tersimpan, bukan draft atau impor awal)
  //   2. Isi list identik dengan snapshot per-key
  // Rule bisnis: row impor awal bisa punya id numerik tapi baseline/pj masih NULL
  // → listLooksPersistedFromServer saja tidak cukup (false positive).
  // → listLooksFinalized memvalidasi dua field kunci itu.
  const storedSnap = storedListRef.current[snapshotKey];
  const isSameAsStored =
    listLooksFinalized(list) &&
    storedSnap != null &&
    storedSnap.length > 0 &&
    comparePreviewWithStored(list, storedSnap);

  const effectiveShowTab5Save =
    showTab5WizardActions && !isSameAsStored;

  /** Satu sumber OPD: dropdown API; fallback ke daftar wizard (format sama). */
  const wizardOpdFallback = useMemo(() => {
    const raw = options?.penanggungJawab;
    if (!Array.isArray(raw) || raw.length === 0) return [];
    return raw
      .map((item) => mapOpdPenanggungRowToSelectOption(item))
      .filter(Boolean);
  }, [options?.penanggungJawab]);

  const opdSelectOptions =
    penanggungJawabOptions.length > 0
      ? penanggungJawabOptions
      : wizardOpdFallback;

  const { fields } = useIndikatorFields(
    values,
    setFieldValue,
    errors,
    touched,
    opdSelectOptions,
    stepOptions,
    stepKey
  );

  const { buildIndikatorItem, resetFields } = useIndikatorBuilder({
    penanggungJawab: opdSelectOptions,
  });

  const [debouncedCapaian5] = useDebounce(values.capaian_tahun_5, 500);

  useIndikatorStepEffects({
    stepKey,
    values,
    errors,
    setFieldValue,
    dokumen,
    tahun,
    debouncedCapaian5,
    sasaranOptions,
    handleSasaranChange,
    fetchContext,
    formRef,
    kegiatanOptions,
  });

  const {
    message,
    loadingAI,
    rekomendasiAI,
    handleAdd,
    handleGunakanSaranAI,
    handleRekomendasiAI,
  } = useStepTemplateAddAndAi({
    stepKey,
    values,
    list,
    setFieldValue,
    validateForm,
    buildIndikatorItem,
    resetFields,
    tahun,
    periode_id,
  });

  return (
    <Card ref={formRef} className="p-4 shadow-sm">
      {message && <Alert variant={message.variant}>{message.text}</Alert>}

      {WIZARD_STEPS_WITH_RPJMD_INDICATOR_IMPORT.has(stepKey) && periode_id ? (
        <Alert
          variant={xlsxPreviewRows && xlsxPreviewRows.length > 0 ? "info" : "light"}
          className="small py-2 border mb-2"
        >
          {rpjmdPdfImportRefsLoading ? (
            <span className="d-inline-flex align-items-center gap-2">
              <Spinner animation="border" size="sm" />
              Memuat referensi impor PDF (tabel 3.1 &amp; 2.28)…
            </span>
          ) : xlsxPreviewRows && xlsxPreviewRows.length > 0 ? (
            <>
              <strong>✓ Data dari pratinjau Excel tersedia</strong> —{" "}
              <em>{xlsxPreviewRows.length} baris</em> dari sheet <code>indikatortujuans</code> siap
              dipakai sebagai pilihan dropdown <strong>Nama Indikator</strong>. Pilih baris di tab
              Umum; tab Detail, Deskripsi, dan Target akan terisi otomatis. Isian tetap dapat
              disunting manual. Sumber: berkas .xlsx yang baru dipratinjau di tab{" "}
              <em>Indikator Tujuan</em> (Data impor dokumen RPJMD).
            </>
          ) : rpjmdTujuanSasaran31.length > 0 ||
            urusanKinerja228.length > 0 ||
            rpjmdImporIndikatorTujuan.length > 0 ? (
            <>
              <strong>Sumber dokumen RPJMD (read-only):</strong>{" "}
              <em>Indikator tujuan</em> (impor PDF, tab yang sama di menu Data impor dokumen RPJMD) muncul di dropdown{" "}
              <strong>Nama Indikator</strong> pada langkah indikator ini, difilter menurut <strong>Misi</strong> yang
              dipilih di konteks wizard. <em>Tabel 3.1</em> dan <em>2.28</em> tetap tersedia sebagai acuan tambahan.
              Pilih baris di tab Umum; tab Detail, Deskripsi, dan Target dapat terisi otomatis dari baris impor. Isian
              tetap dapat disunting manual.
            </>
          ) : (
            <>
              Belum ada baris impor (indikator tujuan / tabel 3.1 / 2.28) untuk periode ini — isi manual atau jalankan
              impor PDF RPJMD di modul dokumen, lalu klik <strong>Pratinjau</strong> di tab{" "}
              <em>Indikator Tujuan</em>.
            </>
          )}
        </Alert>
      ) : null}

      <ProgressBar
        now={((tabKey + 1) / TAB_LABELS.length) * 100}
        className="mb-3"
      />

      <StepTemplateHierarchySelects
        stepKey={stepKey}
        values={values}
        tujuanOptions={tujuanOptions}
        sasaranOptions={sasaranOptions}
        programOptions={programOptions}
        strategiOptions={strategiOptions}
        arahKebijakanOptions={arahKebijakanOptions}
        arahKebijakanIndikatorOptions={options?.arah_kebijakan_indikator || []}
        subKegiatanOptions={subKegiatanOptions}
        kegiatanOptions={kegiatanOptions}
        programIndikatorOptions={programIndikatorOptions}
        kegiatanIndikatorOptions={kegiatanIndikatorOptions}
        contextData={contextData}
        loadingContext={loadingContext}
        handleTujuanChange={handleTujuanChange}
        handleSasaranChange={handleSasaranChange}
        handleProgramChange={handleProgramChange}
        handleKegiatanChange={handleKegiatanChange}
        handleStrategiChange={handleStrategiChange}
        handleArahKebijakanChange={handleArahKebijakanChange}
        handleSubKegiatanChange={handleSubKegiatanChange}
        setFieldValue={setFieldValue}
      />

      <IndikatorInputContextSummary
        stepKey={stepKey}
        values={values}
        options={options}
        tujuanOptions={tujuanOptions}
        sasaranOptions={sasaranOptions}
        programOptions={programOptions}
        strategiOptions={strategiOptions}
        arahKebijakanOptions={arahKebijakanOptions}
        subKegiatanOptions={subKegiatanOptions}
        kegiatanOptions={kegiatanOptions}
      />

      <IndikatorFormTabsPanel
        stepKey={stepKey}
        activeInnerTab={activeInnerTab}
        setActiveInnerTab={setActiveInnerTab}
        fields={fields}
        values={values}
        errors={errors}
        touched={touched}
        setFieldValue={setFieldValue}
        opdSelectOptions={opdSelectOptions}
        stepOptions={stepOptions}
        wizardStepKey={stepKey}
        urusanKinerja228={urusanKinerja228}
        rpjmdTujuanSasaran31={rpjmdTujuanSasaran31}
        rpjmdImporIndikatorTujuan={rpjmdImporIndikatorTujuan}
        rpjmdPdfImportRefsLoading={rpjmdPdfImportRefsLoading}
        handleFieldChange={handleFieldChange}
        handleFieldChangeWithUnit={handleFieldChangeWithUnit}
        list={list}
        aiRecoAvailable={aiRecoAvailable}
        aiRecoHint={aiRecoHint}
        loadingAI={loadingAI}
        rekomendasiAI={rekomendasiAI}
        handleRekomendasiAI={handleRekomendasiAI}
        handleGunakanSaranAI={handleGunakanSaranAI}
        handleAdd={handleAdd}
        tabKey={tabKey}
        setTabKey={setTabKey}
        onNext={onNext}
        onSave={onSave}
        previewOpdOptions={opdSelectOptions}
        showTab5WizardActions={effectiveShowTab5Save}
        isSameAsStored={isSameAsStored}
      />
    </Card>
  );
};

export default StepTemplate;
