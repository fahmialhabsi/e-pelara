import React, { useEffect, useState } from "react";
import { Tab, Nav, Row, Button, Alert } from "react-bootstrap";
import IndikatorTabContent from "../../IndikatorTabContent";
import PreviewList from "@/shared/components/components/PreviewList";
import {
  TAB_LABELS,
  MAX_INDIKATOR,
} from "@/shared/components/constants/indikatorFields";
import { getRpjmdIndikatorDraftDedupeKey } from "../wizardIndikatorStepUtils";

/**
 * Satu Tab.Container untuk tab 1–5 (form + preview/AI) — wajib satu root agar Bootstrap tabs valid.
 */
const SAVE_FLOW_HINT = {
  tujuan:
    'Tombol "Simpan & Lanjut" menyimpan indikator tujuan ke server. Setelah berhasil, lanjutkan ke langkah Sasaran di wizard.',
  sasaran:
    'Tombol "Simpan & Lanjut" menyimpan indikator sasaran ke server, lalu Anda naik ke langkah Program.',
  strategi:
    'Tombol "Simpan & Lanjut" menyimpan indikator strategi ke server, lalu wizard melanjut ke Arah Kebijakan.',
  arah_kebijakan:
    'Tombol "Simpan & Lanjut" menyimpan indikator arah kebijakan ke server, lalu wizard melanjut ke Program.',
  program:
    'Tombol "Simpan & Lanjut" menyimpan indikator program ke server, lalu Anda naik ke langkah Kegiatan.',
  kegiatan:
    'Tombol "Simpan & Lanjut" menyimpan indikator kegiatan ke server, lalu wizard melanjut ke langkah Sub Kegiatan.',
  sub_kegiatan:
    'Simpan indikator sub kegiatan ke server dengan tombol ✓ Kirim Semua di footer wizard.',
};

export default function IndikatorFormTabsPanel({
  stepKey,
  activeInnerTab,
  setActiveInnerTab,
  fields,
  values,
  errors,
  touched,
  setFieldValue,
  opdSelectOptions,
  stepOptions,
  wizardStepKey,
  urusanKinerja228 = [],
  rpjmdTujuanSasaran31 = [],
  rpjmdImporIndikatorTujuan = [],
  rpjmdPdfImportRefsLoading = false,
  handleFieldChange,
  handleFieldChangeWithUnit,
  list,
  aiRecoAvailable,
  aiRecoHint,
  loadingAI,
  rekomendasiAI,
  handleRekomendasiAI,
  handleGunakanSaranAI,
  handleAdd,
  tabKey,
  setTabKey,
  onNext,
  onSave,
  previewOpdOptions,
  showTab5WizardActions = true,
  /** True bila list sudah sama dengan data tersimpan di DB (semua item ber-id numerik). */
  isSameAsStored = false,
}) {
  const saveHint = SAVE_FLOW_HINT[stepKey] || "";
  const [savingInProgress, setSavingInProgress] = useState(false);

  /**
   * UX hardening:
   * Preview (tab 5) menampilkan list `values[stepKey]`. Saat pengguna mengisi baseline di tab Target,
   * nilainya ada di draft scalar `values.baseline` tetapi baris list bisa masih kosong (mis. data hasil impor/DB).
   *
   * Agar operator tidak melihat "Baseline kosong" padahal sudah diisi, saat masuk tab Preview kita isi
   * baseline pada baris yang matching (dedupe key sama) hanya jika baseline baris tsb masih kosong.
   *
   * Catatan: ini tidak menulis ke DB dan tidak overwrite baseline yang sudah terisi pada baris list.
   */
  useEffect(() => {
    if (activeInnerTab !== 5) return;
    const list = values?.[stepKey];
    if (!Array.isArray(list) || list.length === 0) return;

    const draftBaseline = values?.baseline;
    const draftPj = values?.penanggung_jawab;
    const draftKode = values?.kode_indikator;

    const hasAnyDraft =
      (draftBaseline != null && String(draftBaseline).trim() !== "") ||
      (draftPj != null && String(draftPj).trim() !== "") ||
      (draftKode != null && String(draftKode).trim() !== "");
    if (!hasAnyDraft) return;

    const draftKey = getRpjmdIndikatorDraftDedupeKey(values, values);

    // Match utama: dedupeKey (berbasis kode_indikator).
    let idx =
      draftKey
        ? list.findIndex(
            (row) => getRpjmdIndikatorDraftDedupeKey(row, values) === draftKey,
          )
        : -1;

    // Fallback Step Program: baris legacy sering kode ST... dan program_id NULL.
    // Saat operator sudah memilih program_id, kita anggap baris pertama = kandidat yang sedang di-edit.
    if (idx < 0 && stepKey === "program" && list.length === 1) {
      idx = 0;
    }

    if (idx < 0) return;

    const cur = list[idx] || {};
    const patch = {};

    if (
      (cur.baseline == null || String(cur.baseline).trim() === "") &&
      draftBaseline != null &&
      String(draftBaseline).trim() !== ""
    ) {
      patch.baseline = String(draftBaseline);
    }

    if (
      (cur.penanggung_jawab == null || String(cur.penanggung_jawab).trim() === "") &&
      draftPj != null &&
      String(draftPj).trim() !== ""
    ) {
      patch.penanggung_jawab = String(draftPj);
    }

    if (
      (cur.kode_indikator == null || String(cur.kode_indikator).trim() === "") &&
      draftKode != null &&
      String(draftKode).trim() !== ""
    ) {
      patch.kode_indikator = String(draftKode);
    }

    if (Object.keys(patch).length === 0) return;

    const next = [...list];
    next[idx] = { ...cur, ...patch };
    setFieldValue(stepKey, next);
  }, [activeInnerTab, stepKey, setFieldValue, values]);

  const handleSaveClick = async () => {
    if (savingInProgress) return;
    setSavingInProgress(true);
    try {
      if (onNext) await onNext();
      else if (onSave) await onSave();
    } finally {
      setSavingInProgress(false);
    }
  };

  return (
    <Tab.Container
      activeKey={activeInnerTab}
      onSelect={(k) => setActiveInnerTab(Number(k))}
    >
      <Nav variant="tabs" className="mb-3">
        {TAB_LABELS.map((label, idx) => (
          <Nav.Item key={idx + 1}>
            <Nav.Link eventKey={idx + 1}>{label}</Nav.Link>
          </Nav.Item>
        ))}
      </Nav>
      <Tab.Content>
        {[1, 2, 3, 4].map((key) => (
          <Tab.Pane eventKey={key} key={key}>
            <Row className="g-3">
              <IndikatorTabContent
                tabKey={key}
                fields={fields}
                values={values}
                errors={errors}
                touched={touched}
                setFieldValue={setFieldValue}
                opdOptions={opdSelectOptions}
                stepOptions={stepOptions}
                wizardStepKey={wizardStepKey}
                urusanKinerja228={urusanKinerja228}
                rpjmdTujuanSasaran31={rpjmdTujuanSasaran31}
                rpjmdImporIndikatorTujuan={rpjmdImporIndikatorTujuan}
                rpjmdPdfImportRefsLoading={rpjmdPdfImportRefsLoading}
                handleFieldChange={handleFieldChange}
                handleFieldChangeWithUnit={handleFieldChangeWithUnit}
              />
            </Row>
          </Tab.Pane>
        ))}

        <Tab.Pane eventKey={5}>
          <PreviewList data={list} opdOptions={previewOpdOptions || []} />
          {aiRecoAvailable === false && aiRecoHint ? (
            <Alert variant="secondary" className="mt-3 mb-0">
              <strong>Rekomendasi otomatis (OpenAI) tidak aktif.</strong>{" "}
              {aiRecoHint}
            </Alert>
          ) : null}
          <div className="mt-3">
            <Button
              variant="info"
              onClick={handleRekomendasiAI}
              disabled={loadingAI || aiRecoAvailable === false}
              title={
                aiRecoAvailable === false
                  ? "Gunakan isian manual — fitur AI dimatikan atau tanpa kunci API"
                  : undefined
              }
            >
              {loadingAI
                ? "Meminta saran AI..."
                : "🔮 Buat Rekomendasi Otomatis"}
            </Button>
            {rekomendasiAI && (
              <Alert variant="light" className="mt-2">
                <strong>Rekomendasi Wajib:</strong>
                <div className="mt-2">{rekomendasiAI}</div>
                <Button
                  variant="success"
                  size="sm"
                  className="mt-3"
                  onClick={handleGunakanSaranAI}
                  disabled={list.length === 0}
                >
                  Gunakan Saran Ini
                </Button>
              </Alert>
            )}
          </div>
          {showTab5WizardActions && saveHint ? (
            <Alert variant="info" className="mt-3 mb-0 small">
              {saveHint}
            </Alert>
          ) : null}
          {!showTab5WizardActions ? (
            <Alert variant="secondary" className="mt-3 mb-0 small">
              {stepKey === "sub_kegiatan" ? (
                <>
                  Untuk menyimpan ke server, gunakan tombol{" "}
                  <strong>✓ Kirim Semua</strong> di footer wizard.
                </>
              ) : (
                <>
                  Untuk menyimpan perubahan, gunakan tombol{" "}
                  <strong>Simpan Perubahan</strong> di bawah form.
                </>
              )}
            </Alert>
          ) : null}
          <div className="d-flex justify-content-between mt-4">
            {showTab5WizardActions ? (
              <Button
                variant="outline-secondary"
                onClick={() => setTabKey(Math.max(tabKey - 1, 0))}
              >
                Sebelumnya
              </Button>
            ) : (
              <span />
            )}
            <div className="text-end">
              {isSameAsStored && list.length > 0 ? (
                <Alert variant="success" className="mb-0 py-2 px-3 small text-start">
                  ✓ Data indikator ini sudah tersimpan. Tidak ada perubahan yang perlu ditambahkan.
                </Alert>
              ) : (
                <Button
                  variant="secondary"
                  onClick={handleAdd}
                  disabled={list.length >= MAX_INDIKATOR}
                >
                  Tambah Indikator
                </Button>
              )}
              {showTab5WizardActions ? (
                <>
                  <Button
                    variant="success"
                    className="ms-2"
                    onClick={handleSaveClick}
                    disabled={savingInProgress}
                  >
                    {savingInProgress ? "Menyimpan…" : "Simpan & Lanjut"}
                  </Button>
                  <div
                    className="text-muted small mt-2"
                    style={{ maxWidth: 320 }}
                  >
                    Pastikan isian tab 1–4 sudah lengkap sebelum menambah atau
                    menyimpan.
                  </div>
                </>
              ) : null}
            </div>
          </div>
        </Tab.Pane>
      </Tab.Content>
    </Tab.Container>
  );
}
