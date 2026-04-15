import React, { useMemo, useRef, useState } from "react";
import { Card, ProgressBar, Alert } from "react-bootstrap";
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
import IndikatorInputContextSummary from "./indikatorStep/IndikatorInputContextSummary";
import { listLooksPersistedFromServer } from "./wizardIndikatorStepUtils";

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

  const { values, errors, touched, setFieldValue, validateForm } =
    useFormikContext();
  penanggungJawabRef.current = values.penanggung_jawab;

  const {
    tahun,
    dokumen,
    periode_id,
  } = usePeriodeAktif();

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
    penanggungJawabOptions,
    contextData,
    loadingContext,
    fetchContext,
  } = useStepTemplateData({
    stepKey,
    tahun,
    dokumen,
    programId: values.program_id,
    setFieldValue,
    penanggungJawabRef,
    options,
  });

  const list = Array.isArray(values[stepKey]) ? values[stepKey] : [];
  const effectiveShowTab5Save =
    showTab5WizardActions && !listLooksPersistedFromServer(list);

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
    penanggungJawab: penanggungJawabOptions,
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
        subKegiatanOptions={subKegiatanOptions}
        kegiatanOptions={kegiatanOptions}
        programIndikatorOptions={programIndikatorOptions}
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
      />
    </Card>
  );
};

export default StepTemplate;
