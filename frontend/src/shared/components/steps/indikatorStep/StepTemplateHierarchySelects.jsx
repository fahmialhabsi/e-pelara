import React from "react";
import { Form as BootstrapForm } from "react-bootstrap";
import Select from "react-select";

/**
 * Select hierarki (tujuan / sasaran / program / kegiatan + indikator program).
 */
export default function StepTemplateHierarchySelects({
  stepKey,
  values,
  tujuanOptions,
  sasaranOptions,
  programOptions,
  strategiOptions = [],
  arahKebijakanOptions = [],
  arahKebijakanIndikatorOptions = [],
  subKegiatanOptions = [],
  kegiatanOptions,
  programIndikatorOptions,
  kegiatanIndikatorOptions = [],
  contextData,
  loadingContext,
  handleTujuanChange,
  handleSasaranChange,
  handleProgramChange,
  handleKegiatanChange,
  handleStrategiChange,
  handleArahKebijakanChange,
  handleSubKegiatanChange,
  setFieldValue,
}) {
  return (
    <>
      {stepKey === "tujuan" && (
        <BootstrapForm.Group className="mb-3">
          <BootstrapForm.Label>Pilih Tujuan</BootstrapForm.Label>
          <Select
            options={tujuanOptions}
            value={
              tujuanOptions.find(
                (opt) =>
                  String(opt.value) ===
                  String(values.tujuan_id ?? values.no_tujuan ?? "")
              ) || null
            }
            onChange={handleTujuanChange}
            placeholder="Pilih Tujuan"
            isClearable
          />
          {values.label_tujuan && (
            <div className="mt-2 text-muted">
              <small>{values.label_tujuan}</small>
            </div>
          )}
          {contextData && (
            <div className="mt-2 text-muted">
              <small>
                <strong>Context:</strong>{" "}
                {contextData?.text ?? "Tidak ada context."}
              </small>
            </div>
          )}
          {loadingContext && (
            <div className="text-muted">
              <small>Memuat context...</small>
            </div>
          )}
        </BootstrapForm.Group>
      )}

      {stepKey === "sasaran" && (
        <BootstrapForm.Group className="mb-3">
          <BootstrapForm.Label>Pilih Sasaran</BootstrapForm.Label>
          <Select
            options={sasaranOptions}
            value={
              sasaranOptions.find(
                (opt) => Number(opt.value) === Number(values.sasaran_id)
              ) || null
            }
            onChange={handleSasaranChange}
            placeholder="Pilih Sasaran"
            isClearable
          />
        </BootstrapForm.Group>
      )}

      {stepKey === "program" && (
        <>
          {arahKebijakanIndikatorOptions.length > 0 && (
            <BootstrapForm.Group className="mb-3">
              <BootstrapForm.Label>Pilih Indikator Arah Kebijakan</BootstrapForm.Label>
              <Select
                options={arahKebijakanIndikatorOptions}
                value={
                  arahKebijakanIndikatorOptions.find(
                    (opt) =>
                      String(opt.value) ===
                      String(values.program_ref_ar_kode_indikator ?? values.arah_kebijakan_kode_indikator ?? "")
                  ) || null
                }
                onChange={(opt) => {
                  const v = opt?.value ?? "";
                  setFieldValue("program_ref_ar_kode_indikator", v);
                  setFieldValue("arah_kebijakan_kode_indikator", v);
                  const pj =
                    opt?.penanggung_jawab != null &&
                    String(opt.penanggung_jawab).trim() !== ""
                      ? String(opt.penanggung_jawab)
                      : values?.arah_kebijakan_penanggung_jawab != null &&
                          String(values.arah_kebijakan_penanggung_jawab).trim() !== ""
                        ? String(values.arah_kebijakan_penanggung_jawab)
                        : "";
                  if (pj) {
                    // Auto isi OPD PJ program mengikuti indikator arah kebijakan yang dipilih.
                    setFieldValue("penanggung_jawab", pj);
                  }
                  // Kode indikator program akan di-fetch ulang (next-kode) ketika basis berubah.
                  setFieldValue("kode_indikator", "");
                }}
                placeholder="Pilih Indikator Arah Kebijakan (kode AR...)"
                isClearable
              />
              <div className="mt-1 text-muted small">
                Kode indikator Program akan dibentuk dari kode indikator Arah Kebijakan yang dipilih.
              </div>
            </BootstrapForm.Group>
          )}

          <BootstrapForm.Group className="mb-3">
            <BootstrapForm.Label>Pilih Program</BootstrapForm.Label>
            <Select
              options={programOptions}
              value={
                programOptions.find(
                  (opt) => String(opt.value) === String(values.program_id ?? "")
                ) || null
              }
              onChange={handleProgramChange}
              placeholder="Pilih Program"
              isClearable
            />
          </BootstrapForm.Group>
        </>
      )}

      {stepKey === "strategi" && (
        <BootstrapForm.Group className="mb-3">
          <BootstrapForm.Label>Pilih Strategi</BootstrapForm.Label>
          <Select
            options={strategiOptions}
            value={
              strategiOptions.find(
                (opt) => String(opt.value) === String(values.strategi_id ?? "")
              ) || null
            }
            onChange={handleStrategiChange}
            placeholder="Pilih Strategi"
            isClearable
          />
        </BootstrapForm.Group>
      )}

      {stepKey === "arah_kebijakan" && (
        <BootstrapForm.Group className="mb-3">
          <BootstrapForm.Label>Pilih Arah Kebijakan</BootstrapForm.Label>
          <Select
            options={arahKebijakanOptions}
            value={
              arahKebijakanOptions.find(
                (opt) =>
                  String(opt.value) === String(values.arah_kebijakan_id ?? "")
              ) || null
            }
            onChange={handleArahKebijakanChange}
            placeholder="Pilih Arah Kebijakan"
            isClearable
          />
        </BootstrapForm.Group>
      )}

      {stepKey === "sub_kegiatan" && (
        <>
          <BootstrapForm.Group className="mb-3">
            <BootstrapForm.Label>Pilih Indikator Program (Acuan)</BootstrapForm.Label>
            <Select
              options={programIndikatorOptions}
              value={
                programIndikatorOptions.find(
                  (opt) =>
                    String(opt.value) === String(values.indikator_program_id ?? "")
                ) || null
              }
              onChange={(opt) => {
                setFieldValue("indikator_program_id", opt?.value ?? null);
                setFieldValue("indikator_kegiatan_id", "");
                // Kode indikator sub kegiatan dibentuk dari kode indikator kegiatan (IPK-...).
                setFieldValue("kegiatan_kode_indikator", "");
                setFieldValue("kode_indikator", "");
                const pj = opt?.penanggung_jawab;
                if (
                  (values?.penanggung_jawab == null ||
                    String(values.penanggung_jawab).trim() === "") &&
                  pj != null &&
                  String(pj).trim() !== ""
                ) {
                  setFieldValue("penanggung_jawab", String(pj));
                }
              }}
              placeholder="Pilih indikator program sebagai acuan"
              isClearable
            />
            <div className="mt-1 text-muted small">
              Gunakan untuk memastikan indikator Sub Kegiatan terhubung konsisten ke indikator Program.
            </div>
          </BootstrapForm.Group>

          <BootstrapForm.Group className="mb-3">
            <BootstrapForm.Label>Pilih Indikator Kegiatan (Acuan)</BootstrapForm.Label>
            <Select
              options={kegiatanIndikatorOptions}
              value={
                kegiatanIndikatorOptions.find(
                  (opt) =>
                    String(opt.value) === String(values.indikator_kegiatan_id ?? "")
                ) || null
              }
              onChange={(opt) => {
                setFieldValue("indikator_kegiatan_id", opt?.value ?? "");
                const kode = opt?.kode_indikator ?? "";
                const kodeStr = kode != null ? String(kode).trim() : "";
                // Basis IPSK wajib memakai kode indikator kegiatan pola "IPK-...".
                // Data impor lama kadang masih memakai "IK-..."; dalam kasus itu, gunakan snapshot
                // dari Step Kegiatan (values.kegiatan_kode_indikator) agar kode IPSK tetap benar.
                const fallback =
                  values?.kegiatan_kode_indikator != null
                    ? String(values.kegiatan_kode_indikator).trim()
                    : "";
                const effectiveBase = kodeStr.toUpperCase().startsWith("IPK-")
                  ? kodeStr
                  : fallback;
                if (effectiveBase) {
                  setFieldValue("kegiatan_kode_indikator", effectiveBase);
                } else {
                  setFieldValue("kegiatan_kode_indikator", "");
                }
                // Trigger re-fetch next-kode IPSK-... ketika basis (kode kegiatan indikator) berubah.
                setFieldValue("kode_indikator", "");
                const pj = opt?.penanggung_jawab;
                if (
                  (values?.penanggung_jawab == null ||
                    String(values.penanggung_jawab).trim() === "") &&
                  pj != null &&
                  String(pj).trim() !== ""
                ) {
                  setFieldValue("penanggung_jawab", String(pj));
                }
              }}
              placeholder={
                !values.indikator_program_id
                  ? "Pilih indikator program terlebih dahulu"
                  : "Pilih indikator kegiatan sebagai basis kode IPSK-..."
              }
              isDisabled={!values.indikator_program_id}
              isClearable
            />
            <div className="mt-1 text-muted small">
              Kode indikator Sub Kegiatan akan dibentuk dari kode indikator Kegiatan yang dipilih.
            </div>
          </BootstrapForm.Group>

          <BootstrapForm.Group className="mb-3">
            <BootstrapForm.Label>Pilih Sub Kegiatan</BootstrapForm.Label>
            <Select
              options={subKegiatanOptions}
              value={
                subKegiatanOptions.find(
                  (opt) =>
                    String(opt.value) === String(values.sub_kegiatan_id ?? "")
                ) || null
              }
              onChange={handleSubKegiatanChange}
              placeholder="Pilih Sub Kegiatan"
              isClearable
            />
          </BootstrapForm.Group>
        </>
      )}

      {stepKey === "kegiatan" && (
        <>
          <BootstrapForm.Group className="mb-3">
            <BootstrapForm.Label>Pilih Kegiatan</BootstrapForm.Label>
            <Select
              options={kegiatanOptions}
              value={
                kegiatanOptions.find(
                  (opt) => String(opt.value) === String(values.kegiatan_id)
                ) || null
              }
              onChange={handleKegiatanChange}
              placeholder="Pilih Kegiatan"
              isClearable
            />
          </BootstrapForm.Group>

          <BootstrapForm.Group className="mb-3">
            <BootstrapForm.Label>Pilih Indikator Program</BootstrapForm.Label>
            <Select
              options={programIndikatorOptions}
              value={
                programIndikatorOptions.find(
                  (opt) =>
                    String(opt.value) === String(values.indikator_program_id)
                ) || null
              }
              onChange={(opt) => {
                setFieldValue("indikator_program_id", opt?.value ?? null);
                const pj = opt?.penanggung_jawab;
                if (
                  (values?.penanggung_jawab == null ||
                    String(values.penanggung_jawab).trim() === "") &&
                  pj != null &&
                  String(pj).trim() !== ""
                ) {
                  setFieldValue("penanggung_jawab", String(pj));
                }
              }}
              placeholder="Pilih Indikator Program"
              isClearable
            />
          </BootstrapForm.Group>
        </>
      )}
    </>
  );
}
