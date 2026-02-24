// Enhanced IndikatorStep.js with future extensibility (reset/sync logic to be added externally)
import React from "react";
import { Form, Table } from "react-bootstrap";
import indikatorStages from "../utils/indikatorStages";

const IndikatorStep = ({
  form,
  handleChange,
  formErrors,
  satuanRef,
  penanggungJawabOptions,
}) => {
  const handleChange = (e) => {
    if (e.target.name === "baseline") return; // abaikan jika baseline
    setForm((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  return (
    <>
      {/* Tipe Indikator */}
      <Form.Group className="mb-3">
        <Form.Label>Tipe Indikator</Form.Label>
        <Form.Control
          as="select"
          name="tipe_indikator"
          value={form.tipe_indikator}
          onChange={handleChange}
          isInvalid={!!formErrors.tipe_indikator}
        >
          <option value="">Pilih Tipe Indikator</option>
          {indikatorStages.map((stage, idx) => (
            <option key={idx} value={stage}>
              {stage}
            </option>
          ))}
        </Form.Control>
        <Form.Control.Feedback type="invalid">
          {formErrors.tipe_indikator}
        </Form.Control.Feedback>
      </Form.Group>

      {/* Form Dinamis per Tahapan */}
      {form.tipe_indikator && (
        <Table bordered className="mb-3">
          <thead>
            <tr>
              <th>Jenis</th>
              <th>Tolok Ukur Kinerja</th>
              <th>Target Kinerja</th>
            </tr>
          </thead>
          <tbody>
            {indikatorStages.map((type, idx) => {
              const prev = form.kinerjaRows[idx - 1] || {};
              const enabled =
                idx === 0 || (prev.tolok_ukur && prev.target_kinerja);

              return (
                <tr key={type}>
                  <td>{type}</td>
                  <td>
                    <Form.Control
                      type="text"
                      name={`kinerjaRows[${idx}].tolok_ukur`}
                      value={form.kinerjaRows[idx]?.tolok_ukur || ""}
                      onChange={handleChange}
                      disabled={!enabled}
                      isInvalid={!!formErrors[`kinerjaRows[${idx}].tolok_ukur`]}
                    />
                    <Form.Control.Feedback type="invalid">
                      {formErrors[`kinerjaRows[${idx}].tolok_ukur`]}
                    </Form.Control.Feedback>
                  </td>
                  <td>
                    <Form.Control
                      type="text"
                      name={`kinerjaRows[${idx}].target_kinerja`}
                      value={form.kinerjaRows[idx]?.target_kinerja || ""}
                      onChange={handleChange}
                      disabled={!enabled}
                      isInvalid={
                        !!formErrors[`kinerjaRows[${idx}].target_kinerja`]
                      }
                    />
                    <Form.Control.Feedback type="invalid">
                      {formErrors[`kinerjaRows[${idx}].target_kinerja`]}
                    </Form.Control.Feedback>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      )}

      {/* Jenis Indikator */}
      <Form.Group className="mb-3">
        <Form.Label>Jenis Indikator</Form.Label>
        <Form.Control
          as="select"
          name="jenis_indikator"
          value={form.jenis_indikator}
          onChange={handleChange}
          isInvalid={!!formErrors.jenis_indikator}
        >
          <option value="">Pilih Jenis</option>
          <option value="Kuantitatif">Kuantitatif</option>
          <option value="Kualitatif">Kualitatif</option>
        </Form.Control>
        <Form.Control.Feedback type="invalid">
          {formErrors.jenis_indikator}
        </Form.Control.Feedback>
      </Form.Group>

      {form.jenis_indikator === "Kuantitatif" && (
        <Form.Group className="mb-3">
          <Form.Label>Kriteria Kuantitatif</Form.Label>
          <Form.Control
            type="text"
            name="kriteria_kuantitatif"
            value={form.kriteria_kuantitatif}
            onChange={handleChange}
            isInvalid={!!formErrors.kriteria_kuantitatif}
          />
          <Form.Control.Feedback type="invalid">
            {formErrors.kriteria_kuantitatif}
          </Form.Control.Feedback>
        </Form.Group>
      )}

      {form.jenis_indikator === "Kualitatif" && (
        <Form.Group className="mb-3">
          <Form.Label>Kriteria Kualitatif</Form.Label>
          <Form.Control
            type="text"
            name="kriteria_kualitatif"
            value={form.kriteria_kualitatif}
            onChange={handleChange}
            isInvalid={!!formErrors.kriteria_kualitatif}
          />
          <Form.Control.Feedback type="invalid">
            {formErrors.kriteria_kualitatif}
          </Form.Control.Feedback>
        </Form.Group>
      )}

      {/* Satuan */}
      <Form.Group className="mb-3">
        <Form.Label>Satuan</Form.Label>
        <Form.Control
          ref={satuanRef}
          type="text"
          name="satuan"
          value={form.satuan}
          onChange={handleChange}
          isInvalid={!!formErrors.satuan}
        />
        <Form.Control.Feedback type="invalid">
          {formErrors.satuan}
        </Form.Control.Feedback>
      </Form.Group>

      {/* Definisi & Metode */}
      <Form.Group className="mb-3">
        <Form.Label>Definisi Operasional</Form.Label>
        <Form.Control
          as="textarea"
          rows={2}
          name="definisi_operasional"
          value={form.definisi_operasional}
          onChange={handleChange}
          isInvalid={!!formErrors.definisi_operasional}
        />
        <Form.Control.Feedback type="invalid">
          {formErrors.definisi_operasional}
        </Form.Control.Feedback>
      </Form.Group>

      <Form.Group className="mb-3">
        <Form.Label>Metode Penghitungan</Form.Label>
        <Form.Control
          as="textarea"
          rows={2}
          name="metode_penghitungan"
          value={form.metode_penghitungan}
          onChange={handleChange}
          isInvalid={!!formErrors.metode_penghitungan}
        />
        <Form.Control.Feedback type="invalid">
          {formErrors.metode_penghitungan}
        </Form.Control.Feedback>
      </Form.Group>

      {/* Baseline */}
      <Form.Group className="mb-3">
        <Form.Label>Baseline</Form.Label>
        <Form.Control
          type="text"
          name="baseline"
          value={form.baseline}
          disabled
          onChange={handleFieldChange("baseline")}
        />
        <Form.Control.Feedback type="invalid">
          {formErrors.baseline}
        </Form.Control.Feedback>
      </Form.Group>

      {/* Target per Tahun */}
      <Form.Label>Target Tiap Tahun</Form.Label>
      <div className="mb-3 d-flex gap-2 flex-wrap">
        {[1, 2, 3, 4, 5].map((i) => (
          <Form.Control
            key={i}
            style={{ width: "18%" }}
            placeholder={`Tahun ${i}`}
            name={`target_tahun_${i}`}
            value={form[`target_tahun_${i}`]}
            onChange={handleChange}
            readOnly={form.satuan.toLowerCase() === "dokumen"}
            isInvalid={!!formErrors[`target_tahun_${i}`]}
          />
        ))}
      </div>
      <Form.Control.Feedback type="invalid">
        {formErrors.target_tahun_1 ||
          formErrors.target_tahun_2 ||
          formErrors.target_tahun_3 ||
          formErrors.target_tahun_4 ||
          formErrors.target_tahun_5}
      </Form.Control.Feedback>

      {/* Sumber Data */}
      <Form.Group className="mb-3">
        <Form.Label>Sumber Data</Form.Label>
        <Form.Control
          type="text"
          name="sumber_data"
          value={form.sumber_data}
          onChange={handleChange}
          isInvalid={!!formErrors.sumber_data}
        />
        <Form.Control.Feedback type="invalid">
          {formErrors.sumber_data}
        </Form.Control.Feedback>
      </Form.Group>

      {/* Penanggung Jawab */}
      <Form.Group className="mb-3">
        <Form.Label>Pilih OPD Penanggungjawab</Form.Label>
        <Form.Control
          as="select"
          name="penanggung_jawab"
          value={form.penanggung_jawab}
          onChange={handleChange}
          isInvalid={!!formErrors.penanggung_jawab}
        >
          <option value="">Pilih Penanggung Jawab</option>
          {penanggungJawabOptions.map((option, idx) => (
            <option key={idx} value={option.id}>
              {option.name}
            </option>
          ))}
        </Form.Control>
        <Form.Control.Feedback type="invalid">
          {formErrors.penanggung_jawab}
        </Form.Control.Feedback>
      </Form.Group>
    </>
  );
};

export default IndikatorStep;
