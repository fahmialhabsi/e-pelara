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
  /** Edit Indikator Tujuan: jangan timpa tahun/target dari API periode aktif. */
  skipActivePeriodeSync = false,
}) {
  const { values, setFieldValue, isSubmitting } = useFormikContext();

  useSetPreviewFields(values, setFieldValue, !skipActivePeriodeSync);
  useAutoIsiTahunDanTarget(values, setFieldValue);

  return (
    <Form>
      {/* Konten form step */}
      <div
        style={{
          background: "#fff",
          borderRadius: 10,
          border: "1px solid #e9ecef",
          padding: "20px 24px",
          marginBottom: 16,
          boxShadow: "0 1px 6px rgba(0,0,0,.05)",
        }}
      >
        <StepTemplate
          stepKey={stepKey}
          options={stepTemplateOptions}
          stepOptions={[]}
          tabKey={4}
          setTabKey={() => {}}
          showTab5WizardActions={false}
        />
      </div>

      {/* Pesan error */}
      {error && (
        <Alert variant="danger" className="py-2 mb-3" style={{ fontSize: 13 }}>
          {error}
        </Alert>
      )}

      {/* Info perubahan */}
      <Alert
        variant="info"
        className="py-2 mb-3 d-flex align-items-center gap-2"
        style={{ fontSize: 12, borderRadius: 8 }}
      >
        <span>ℹ️</span>
        <span>
          Perubahan akan disimpan pada{" "}
          <strong>{LEVEL_LABEL[stepKey] || "indikator"}</strong> yang sedang Anda
          edit. Data di daftar dan laporan akan diperbarui setelah simpan berhasil.
        </span>
      </Alert>

      {/* Tombol aksi */}
      <div
        style={{
          display: "flex",
          gap: 10,
          alignItems: "center",
          padding: "14px 0 4px",
          borderTop: "1px solid #f0f0f0",
          marginTop: 4,
        }}
      >
        <Button
          variant="outline-secondary"
          type="button"
          onClick={() => navigate(-1)}
          style={{ minWidth: 90 }}
        >
          ← Batal
        </Button>
        <Button
          type="submit"
          variant="primary"
          disabled={isSubmitting}
          style={{ minWidth: 150, fontWeight: 700 }}
        >
          {isSubmitting ? (
            <>
              <span
                className="spinner-border spinner-border-sm me-2"
                role="status"
              />
              Menyimpan…
            </>
          ) : (
            "💾 Simpan Perubahan"
          )}
        </Button>
      </div>
    </Form>
  );
}
