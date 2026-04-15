import React from "react";
import { Form, useFormikContext } from "formik";
import { Button, Alert } from "react-bootstrap";

const LEVEL_LABEL = {
  tujuan: "indikator tujuan",
  sasaran: "indikator sasaran",
  program: "indikator program",
  kegiatan: "indikator kegiatan",
};
import StepTemplate from "@/shared/components/steps/StepTemplate";
import useSetPreviewFields from "@/hooks/useSetPreviewFields";
import useAutoIsiTahunDanTarget from "@/shared/components/hooks/useAutoIsiTahunDanTarget";

/**
 * Isian form edit indikator (tujuan/sasaran/program) di dalam Formik.
 * Hooks dipanggil di level komponen — bukan di render prop Formik (Rules of Hooks).
 */
export default function IndikatorSimpleEditFormBody({
  stepKey,
  stepTemplateOptions = { penanggungJawab: [] },
  error,
  navigate,
}) {
  const { values, setFieldValue, isSubmitting } = useFormikContext();

  useSetPreviewFields(values, setFieldValue);
  useAutoIsiTahunDanTarget(values, setFieldValue);

  return (
    <Form>
      <StepTemplate
        stepKey={stepKey}
        options={stepTemplateOptions}
        stepOptions={[]}
        tabKey={4}
        setTabKey={() => {}}
        showTab5WizardActions={false}
      />

      {error ? <Alert variant="danger">{error}</Alert> : null}
      <Alert variant="info" className="small py-2 mb-3">
        Perubahan akan disimpan pada{" "}
        <strong>{LEVEL_LABEL[stepKey] || "indikator"}</strong> yang sedang Anda
        edit. Data di daftar dan laporan akan mengikuti penyimpanan ini.
      </Alert>
      <div className="mt-3 d-flex gap-2 align-items-center flex-wrap">
        <Button variant="secondary" type="button" onClick={() => navigate(-1)}>
          Batal
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Menyimpan…" : "Simpan Perubahan"}
        </Button>
      </div>
    </Form>
  );
}
