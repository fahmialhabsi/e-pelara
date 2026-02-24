// FormDPA untuk modul DPA
import React from "react";

const FormDPA = ({ data, onChange, onSubmit }) => {
  return (
    <form onSubmit={onSubmit}>
      <label>Program</label>
      <input type="text" name="program" value={data.program} onChange={onChange} required />

      <label>Kegiatan</label>
      <input type="text" name="kegiatan" value={data.kegiatan} onChange={onChange} required />

      <label>Sub Kegiatan</label>
      <input type="text" name="sub_kegiatan" value={data.sub_kegiatan} onChange={onChange} required />

      <label>Pagu</label>
      <input type="number" name="pagu" value={data.pagu} onChange={onChange} required />

      <button type="submit">Simpan</button>
    </form>
  );
};

export default FormDPA;
