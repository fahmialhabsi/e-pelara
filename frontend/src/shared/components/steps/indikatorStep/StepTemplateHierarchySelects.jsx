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
  subKegiatanOptions = [],
  kegiatanOptions,
  programIndikatorOptions,
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
              onChange={(opt) =>
                setFieldValue("indikator_program_id", opt?.value ?? null)
              }
              placeholder="Pilih Indikator Program"
              isClearable
            />
          </BootstrapForm.Group>
        </>
      )}
    </>
  );
}
