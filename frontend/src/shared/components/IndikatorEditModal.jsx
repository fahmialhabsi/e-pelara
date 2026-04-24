/**
 * IndikatorEditModal.jsx
 * Modal edit indikator RPJMD — semua tipe (tujuan, sasaran, strategi, dll.)
 *
 * FIX BUG: form edit sebelumnya menggunakan wizard (IndikatorRPJMDForm) yang
 * mengabaikan prop existingData dan selalu baca dari localStorage.
 * Komponen ini langsung mengisi Formik dari existingData yang dikirim IndikatorList.
 */

import React, { useState, useEffect } from "react";
import {
  Modal,
  Button,
  Form,
  Row,
  Col,
  Alert,
  Spinner,
  Badge,
} from "react-bootstrap";
import { Formik } from "formik";
import Select from "react-select";
import toast, { Toaster } from "react-hot-toast";
import api from "@/services/api";
import { extractSingleData, normalizeListItems } from "@/utils/apiResponse";
import { fetchOpdPenanggungJawabDropdown } from "@/features/rpjmd/services/indikatorRpjmdApi";

/* ─────────────────── endpoint map ─────────────────── */
const ENDPOINT_MAP = {
  tujuan:                 "indikator-tujuans",
  sasaran:                "indikator-sasaran",
  strategi:               "indikator-strategi",
  arah_kebijakan:         "indikator-arah-kebijakan",
  program:                "indikator-program",
  kegiatan:               "indikator-kegiatan",
  sub_kegiatan_indikator: "indikator-sub-kegiatan",
};

const TYPE_LABEL = {
  tujuan:                 "Tujuan",
  sasaran:                "Sasaran",
  strategi:               "Strategi",
  arah_kebijakan:         "Arah Kebijakan",
  program:                "Program",
  kegiatan:               "Kegiatan",
  sub_kegiatan_indikator: "Sub Kegiatan",
};

/** Kirim PUT ke endpoint yang sesuai type */
async function updateIndikatorGeneric(type, id, values) {
  const endpoint = ENDPOINT_MAP[type] || type;
  return api.put(`/${endpoint}/${id}`, values);
}

/**
 * Nilai tipe_indikator yang valid per jenis (sesuai DB ENUM masing-masing model).
 * - tujuan   : ENUM("Impact")
 * - sasaran  : ENUM("Outcome")
 * - program  : ENUM("Output")
 * - kegiatan : ENUM("Proses")
 * - strategi / arah_kebijakan / sub_kegiatan_indikator: bebas pilih
 */
const TIPE_FIXED = {
  tujuan:    "Impact",
  sasaran:   "Outcome",
  program:   "Output",
  kegiatan:  "Proses",
};
const TIPE_OPTIONS = ["Outcome", "Output", "Impact", "Process", "Input", "Proses"];

function slotYear(row, snake, camel) {
  if (row == null || typeof row !== "object") return "";
  const v = row[snake] ?? row[camel];
  if (v === undefined || v === null) return "";
  return String(v);
}

/* ─────────────────── build initialValues dari baris data ─────────────────── */
function buildInitialValues(row, selectedType) {
  const s = (v) => (v == null ? "" : String(v));
  /* Jika type punya nilai tetap, selalu paksa — jangan kirim nilai salah ke ENUM DB */
  const tipeFixed = TIPE_FIXED[selectedType];
  const pjId =
    row.penanggung_jawab ??
    row.opdPenanggungJawab?.id ??
    row.opd_penanggung_jawab?.id;
  return {
    kode_indikator:       s(row.kode_indikator),
    nama_indikator:       s(row.nama_indikator),
    satuan:               s(row.satuan),
    tipe_indikator:       tipeFixed || s(row.tipe_indikator),
    jenis_indikator:      s(row.jenis_indikator),
    jenis:                s(row.jenis),
    tolok_ukur_kinerja:   s(row.tolok_ukur_kinerja),
    target_kinerja:       s(row.target_kinerja),
    baseline:             s(row.baseline),
    target_tahun_1:       slotYear(row, "target_tahun_1", "targetTahun1"),
    target_tahun_2:       slotYear(row, "target_tahun_2", "targetTahun2"),
    target_tahun_3:       slotYear(row, "target_tahun_3", "targetTahun3"),
    target_tahun_4:       slotYear(row, "target_tahun_4", "targetTahun4"),
    target_tahun_5:       slotYear(row, "target_tahun_5", "targetTahun5"),
    capaian_tahun_1:      slotYear(row, "capaian_tahun_1", "capaianTahun1"),
    capaian_tahun_2:      slotYear(row, "capaian_tahun_2", "capaianTahun2"),
    capaian_tahun_3:      slotYear(row, "capaian_tahun_3", "capaianTahun3"),
    capaian_tahun_4:      slotYear(row, "capaian_tahun_4", "capaianTahun4"),
    capaian_tahun_5:      slotYear(row, "capaian_tahun_5", "capaianTahun5"),
    definisi_operasional: s(row.definisi_operasional),
    metode_penghitungan:  s(row.metode_penghitungan),
    kriteria_kuantitatif: s(row.kriteria_kuantitatif),
    kriteria_kualitatif:  s(row.kriteria_kualitatif),
    sumber_data:          s(row.sumber_data),
    penanggung_jawab:     pjId == null || pjId === "" ? "" : String(pjId),
    keterangan:           s(row.keterangan),
  };
}

/* ─────────────────── sub: Section Header ─────────────────── */
function SectionHeader({ icon, title }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "7px 12px",
        background: "linear-gradient(90deg,#e8eaf6 0%,#f5f5f5 100%)",
        borderLeft: "4px solid #3949ab",
        borderRadius: "0 6px 6px 0",
        marginBottom: 12,
        marginTop: 8,
      }}
    >
      <span style={{ fontSize: 14 }}>{icon}</span>
      <span style={{ fontWeight: 700, color: "#1a237e", fontSize: 12, letterSpacing: 0.2 }}>
        {title}
      </span>
    </div>
  );
}

/* ─────────────────── sub: TextInputField ─────────────────── */
function TF({ label, name, values, handleChange, as, rows, placeholder }) {
  return (
    <Form.Group className="mb-3">
      <Form.Label style={{ fontSize: 12, fontWeight: 600, color: "#495057", marginBottom: 3 }}>
        {label}
      </Form.Label>
      <Form.Control
        as={as || "input"}
        rows={rows}
        size="sm"
        name={name}
        value={values[name] ?? ""}
        onChange={handleChange}
        placeholder={placeholder || `Isi ${label.toLowerCase()}`}
        style={{ fontSize: 13 }}
      />
    </Form.Group>
  );
}

/* ─────────────────── sub: SelectField ─────────────────── */
function SF({ label, name, values, handleChange, children }) {
  return (
    <Form.Group className="mb-3">
      <Form.Label style={{ fontSize: 12, fontWeight: 600, color: "#495057", marginBottom: 3 }}>
        {label}
      </Form.Label>
      <Form.Select
        size="sm"
        name={name}
        value={values[name] ?? ""}
        onChange={handleChange}
        style={{ fontSize: 13 }}
      >
        {children}
      </Form.Select>
    </Form.Group>
  );
}

/* ─────────────────── sub: NumericGrid (5 kolom tahun) ─────────────────── */
function NumericGrid({ label, fieldPrefix, values, handleChange }) {
  return (
    <Form.Group className="mb-3">
      <Form.Label style={{ fontSize: 12, fontWeight: 600, color: "#495057", marginBottom: 5 }}>
        {label}
      </Form.Label>
      <Row className="g-2">
        {[1, 2, 3, 4, 5].map((n) => (
          <Col xs={6} sm={4} md={2} key={n}>
            <Form.Control
              size="sm"
              type="text"
              inputMode="decimal"
              name={`${fieldPrefix}${n}`}
              value={values[`${fieldPrefix}${n}`] ?? ""}
              onChange={handleChange}
              placeholder={`Th.${n}`}
              style={{ fontSize: 12, textAlign: "center" }}
            />
            <div style={{ fontSize: 10, color: "#6c757d", textAlign: "center", marginTop: 2 }}>
              Th. ke-{n}
            </div>
          </Col>
        ))}
      </Row>
    </Form.Group>
  );
}

/* ─────────────────── MAIN COMPONENT ─────────────────── */
export default function IndikatorEditModal({
  show,
  onHide,
  existingData,
  selectedType,
  onSuccess,
}) {
  const [submitError, setSubmitError] = useState("");
  const [detailData, setDetailData] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [opdOptions, setOpdOptions] = useState([]);

  useEffect(() => {
    if (!show) {
      setOpdOptions([]);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetchOpdPenanggungJawabDropdown({ include_bidang: true });
        if (!cancelled) setOpdOptions(normalizeListItems(res.data));
      } catch {
        if (!cancelled) setOpdOptions([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [show]);

  /* Fetch full detail setiap kali modal dibuka — memastikan semua field (satuan, dll.) terisi */
  useEffect(() => {
    if (!show || !existingData?.id) {
      setDetailData(null);
      return;
    }
    setDetailLoading(true);
    const endpoint = ENDPOINT_MAP[selectedType] || selectedType;
    api
      .get(`/${endpoint}/${existingData.id}`)
      .then((res) => {
        const d = extractSingleData(res.data) ?? res.data?.data ?? res.data;
        setDetailData(d);
      })
      .catch((err) => console.error("Gagal fetch detail indikator:", err))
      .finally(() => setDetailLoading(false));
  }, [show, existingData?.id, selectedType]);

  if (!existingData) return null;

  /* Gunakan data detail (lebih lengkap) jika sudah tersedia, fallback ke existingData */
  const sourceData = detailData || existingData;
  const initialValues = buildInitialValues(sourceData, selectedType);
  const typeLabel = TYPE_LABEL[selectedType] || selectedType;
  const periodeAwal =
    sourceData?.tahun_awal ??
    sourceData?.periodeRpjmd?.tahun_awal ??
    sourceData?.periode_rpjmd?.tahun_awal ??
    2025;
  const periodeAkhir =
    sourceData?.tahun_akhir ??
    sourceData?.periodeRpjmd?.tahun_akhir ??
    sourceData?.periode_rpjmd?.tahun_akhir ??
    2029;
  const opdNamaResolved =
    sourceData?.opdPenanggungJawab?.nama_opd ??
    sourceData?.opd_penanggung_jawab?.nama_opd ??
    "";
  const jenisDokumenHdr = String(
    existingData.jenis_dokumen ?? sourceData?.jenis_dokumen ?? "",
  )
    .trim()
    .toUpperCase();
  const headerPeriodeRpjmd =
    jenisDokumenHdr === "RPJMD" || jenisDokumenHdr === "";

  return (
    <>
    {/* Toaster harus di-render agar toast.success/error muncul */}
    <Toaster position="top-right" toastOptions={{ duration: 3500 }} />
    <Modal
      show={show}
      onHide={onHide}
      size="xl"
      centered
      scrollable
      backdrop="static"
      style={{ zIndex: 1120 }}
    >
      <Formik
        initialValues={initialValues}
        enableReinitialize
        onSubmit={async (values, { setSubmitting }) => {
          setSubmitError("");
          try {
            await updateIndikatorGeneric(selectedType, existingData.id, values);
            toast.success(`Indikator ${typeLabel} berhasil diperbarui.`);
            onSuccess?.();
          } catch (err) {
            console.error(err);
            const msg =
              err?.response?.data?.message ||
              err?.response?.data?.error ||
              "Gagal menyimpan perubahan. Periksa koneksi dan coba lagi.";
            setSubmitError(msg);
            toast.error(msg);
          } finally {
            setSubmitting(false);
          }
        }}
      >
        {({ values, handleChange, setFieldValue, isSubmitting, handleSubmit }) => (
          <>
            {/* ─── Header ─── */}
            <Modal.Header
              closeButton
              style={{
                background: "linear-gradient(135deg,#1a237e 0%,#283593 100%)",
                color: "#fff",
                padding: "14px 22px",
                borderBottom: "none",
              }}
            >
              <div>
                <Modal.Title
                  style={{ fontSize: 16, fontWeight: 800, letterSpacing: 0.3, color: "#fff" }}
                >
                  ✏️ Edit Indikator {typeLabel}
                </Modal.Title>
                <div style={{ fontSize: 11, opacity: 0.78, marginTop: 2, color: "#c5cae9" }}>
                  ID: {existingData.id}
                  {existingData.kode_indikator && ` · Kode: ${existingData.kode_indikator}`}
                  {existingData.jenis_dokumen && ` · Dokumen: ${existingData.jenis_dokumen}`}
                  {headerPeriodeRpjmd
                    ? ` · Periode RPJMD: ${periodeAwal} – ${periodeAkhir}`
                    : existingData.tahun != null && existingData.tahun !== ""
                      ? ` · Tahun: ${existingData.tahun}`
                      : ""}
                </div>
              </div>
            </Modal.Header>

            {/* ─── Body ─── */}
            <Modal.Body style={{ padding: "20px 26px 8px", background: "#fafbff" }}>
              {/* Spinner saat mengambil detail dari server */}
              {detailLoading && (
                <div className="text-center py-3">
                  <Spinner animation="border" size="sm" className="me-2" />
                  <span style={{ fontSize: 13, color: "#6c757d" }}>Memuat data…</span>
                </div>
              )}
              <Form id="indikator-edit-form" onSubmit={handleSubmit}>

                {submitError && (
                  <Alert variant="danger" className="mb-3 py-2" style={{ fontSize: 13 }}>
                    {submitError}
                  </Alert>
                )}

                {/* Konteks read-only */}
                <div
                  style={{
                    padding: "9px 14px",
                    background: "#fff3cd",
                    borderRadius: 7,
                    border: "1px solid #ffc10780",
                    marginBottom: 16,
                    fontSize: 12,
                    color: "#856404",
                    display: "flex",
                    flexWrap: "wrap",
                    gap: "6px 10px",
                    alignItems: "center",
                  }}
                >
                  <strong>ℹ️ Konteks data:</strong>
                  {existingData.misi_id != null && (
                    <span>Misi <Badge bg="secondary">{existingData.misi_id}</Badge></span>
                  )}
                  {existingData.tujuan_id != null && (
                    <span>Tujuan <Badge bg="info">{existingData.tujuan_id}</Badge></span>
                  )}
                  {existingData.sasaran_id != null && (
                    <span>Sasaran <Badge bg="primary">{existingData.sasaran_id}</Badge></span>
                  )}
                  {existingData.program_id != null && (
                    <span>Program <Badge bg="success">{existingData.program_id}</Badge></span>
                  )}
                  {existingData.kegiatan_id != null && (
                    <span>Kegiatan <Badge bg="warning" text="dark">{existingData.kegiatan_id}</Badge></span>
                  )}
                </div>

                {/* ── Sesi 1: Identitas ── */}
                <SectionHeader icon="🏷️" title="Identitas Indikator" />
                <Row>
                  <Col md={3}>
                    <TF label="Kode Indikator" name="kode_indikator"
                      values={values} handleChange={handleChange} placeholder="Contoh: 1.1" />
                  </Col>
                  <Col md={6}>
                    <TF label="Nama Indikator *" name="nama_indikator"
                      values={values} handleChange={handleChange} placeholder="Isi nama indikator" />
                  </Col>
                  <Col md={3}>
                    <TF label="Satuan" name="satuan"
                      values={values} handleChange={handleChange} placeholder="%, orang, dsb." />
                  </Col>
                </Row>

                {/* ── Sesi 2: Klasifikasi ── */}
                <SectionHeader icon="🗂️" title="Klasifikasi" />
                <Row>
                  <Col md={4}>
                    {/* tipe_indikator: nilai tetap per jenis (sesuai DB ENUM masing-masing) */}
                    {TIPE_FIXED[selectedType] ? (
                      <Form.Group className="mb-3">
                        <Form.Label style={{ fontSize: 12, fontWeight: 600, color: "#495057", marginBottom: 3 }}>
                          Tipe Indikator
                        </Form.Label>
                        <Form.Control
                          size="sm"
                          value={TIPE_FIXED[selectedType]}
                          readOnly
                          disabled
                          className="bg-light"
                          style={{ fontSize: 13 }}
                        />
                        <Form.Text style={{ fontSize: 11 }}>Tetap — sesuai model {typeLabel}</Form.Text>
                      </Form.Group>
                    ) : (
                      <SF label="Tipe Indikator" name="tipe_indikator"
                        values={values} handleChange={handleChange}>
                        <option value="">-- Pilih Tipe --</option>
                        {TIPE_OPTIONS.map((o) => (
                          <option key={o} value={o}>{o}</option>
                        ))}
                      </SF>
                    )}
                  </Col>
                  <Col md={4}>
                    <SF label="Jenis Indikator" name="jenis_indikator"
                      values={values} handleChange={handleChange}>
                      <option value="">-- Pilih Jenis --</option>
                      <option value="Kuantitatif">Kuantitatif</option>
                      <option value="Kualitatif">Kualitatif</option>
                    </SF>
                  </Col>
                  <Col md={4}>
                    <TF label="Jenis (Uraian)" name="jenis"
                      values={values} handleChange={handleChange} placeholder="Isi jenis uraian" />
                  </Col>
                </Row>

                {/* ── Sesi 3: Target & Kinerja ── */}
                <SectionHeader icon="🎯" title="Target & Kinerja" />
                <Row>
                  <Col md={5}>
                    <TF label="Tolok Ukur Kinerja" name="tolok_ukur_kinerja"
                      values={values} handleChange={handleChange} placeholder="Uraian tolok ukur" />
                  </Col>
                  <Col md={4}>
                    <TF label="Target Kinerja" name="target_kinerja"
                      values={values} handleChange={handleChange} placeholder="Contoh: 80%" />
                  </Col>
                  <Col md={3}>
                    <TF label="Baseline (Nilai Awal)" name="baseline"
                      values={values} handleChange={handleChange} placeholder="Nilai baseline" />
                  </Col>
                </Row>

                <NumericGrid
                  label="Target per Tahun (Th. ke-I s/d V)"
                  fieldPrefix="target_tahun_"
                  values={values}
                  handleChange={handleChange}
                />

                {/* ── Sesi 4: Capaian ── */}
                <SectionHeader icon="📊" title="Capaian per Tahun" />
                <NumericGrid
                  label="Capaian per Tahun (Th. ke-I s/d V)"
                  fieldPrefix="capaian_tahun_"
                  values={values}
                  handleChange={handleChange}
                />

                {/* ── Sesi 5: Definisi & Metode ── */}
                <SectionHeader icon="📋" title="Definisi Operasional & Metode" />
                <Row>
                  <Col md={6}>
                    <TF label="Definisi Operasional" name="definisi_operasional"
                      values={values} handleChange={handleChange}
                      as="textarea" rows={3} placeholder="Deskripsikan definisi operasional" />
                  </Col>
                  <Col md={6}>
                    <TF label="Metode Penghitungan" name="metode_penghitungan"
                      values={values} handleChange={handleChange}
                      as="textarea" rows={3} placeholder="Jelaskan metode penghitungan" />
                  </Col>
                </Row>
                <Row>
                  <Col md={6}>
                    <TF label="Kriteria Kuantitatif" name="kriteria_kuantitatif"
                      values={values} handleChange={handleChange}
                      as="textarea" rows={2} placeholder="Isi kriteria kuantitatif" />
                  </Col>
                  <Col md={6}>
                    <TF label="Kriteria Kualitatif" name="kriteria_kualitatif"
                      values={values} handleChange={handleChange}
                      as="textarea" rows={2} placeholder="Isi kriteria kualitatif" />
                  </Col>
                </Row>

                {/* ── Sesi 6: Referensi ── */}
                <SectionHeader icon="📌" title="Referensi & Penanggung Jawab" />
                <Row>
                  <Col md={4}>
                    <TF label="Sumber Data" name="sumber_data"
                      values={values} handleChange={handleChange} placeholder="Sebutkan sumber data" />
                  </Col>
                  <Col md={4}>
                    <Form.Group className="mb-3">
                      <Form.Label style={{ fontSize: 12, fontWeight: 600, color: "#495057", marginBottom: 3 }}>
                        Penanggung Jawab
                      </Form.Label>
                      {(() => {
                        const pj = String(values.penanggung_jawab ?? "").trim();
                        const base = (opdOptions || []).map((o) => ({
                          value: String(o.id),
                          label: String(o.nama_opd ?? "").trim() || "—",
                        }));
                        const hit = pj ? base.find((o) => o.value === pj) : null;
                        const labelOr = hit?.label ?? (opdNamaResolved ? String(opdNamaResolved).trim() : "");
                        const opts =
                          pj && !hit && labelOr
                            ? [...base, { value: pj, label: labelOr }]
                            : base;
                        const val = pj ? opts.find((o) => o.value === pj) ?? null : null;
                        return (
                          <Select
                            inputId="indikator-edit-penanggung-jawab"
                            classNamePrefix="rs"
                            placeholder="Pilih OPD"
                            isClearable
                            options={opts}
                            value={val}
                            getOptionLabel={(o) => o.label}
                            getOptionValue={(o) => o.value}
                            onChange={(opt) =>
                              setFieldValue("penanggung_jawab", opt?.value != null ? String(opt.value) : "")
                            }
                            styles={{
                              control: (b) => ({ ...b, minHeight: 31, fontSize: 13 }),
                              menu: (b) => ({ ...b, zIndex: 1300 }),
                            }}
                          />
                        );
                      })()}
                    </Form.Group>
                  </Col>
                  <Col md={4}>
                    <TF label="Keterangan" name="keterangan"
                      values={values} handleChange={handleChange} placeholder="Keterangan tambahan" />
                  </Col>
                </Row>

              </Form>
            </Modal.Body>

            {/* ─── Footer ─── */}
            <Modal.Footer
              style={{
                background: "#f8f9fa",
                borderTop: "1px solid #e0e0e0",
                padding: "12px 22px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span style={{ fontSize: 12, color: "#6c757d" }}>
                Perubahan langsung diterapkan pada <strong>Indikator {typeLabel}</strong> yang dipilih.
              </span>
              <div className="d-flex gap-2">
                <Button
                  variant="outline-secondary"
                  size="sm"
                  onClick={onHide}
                  disabled={isSubmitting}
                  style={{ minWidth: 80 }}
                >
                  Tutup
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  type="submit"
                  form="indikator-edit-form"
                  disabled={isSubmitting}
                  style={{ minWidth: 140, fontWeight: 700 }}
                >
                  {isSubmitting ? (
                    <>
                      <Spinner animation="border" size="sm" className="me-1" />
                      Menyimpan…
                    </>
                  ) : (
                    "💾 Simpan Perubahan"
                  )}
                </Button>
              </div>
            </Modal.Footer>
          </>
        )}
      </Formik>
    </Modal>
    </>
  );
}
