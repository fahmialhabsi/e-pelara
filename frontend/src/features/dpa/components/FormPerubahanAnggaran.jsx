// FormPerubahanAnggaran untuk modul DPA
import React from "react";

const FormPerubahanAnggaran = ({ data, onChange, onSubmit }) => (
  <form onSubmit={onSubmit}>
    <label>Alasan Perubahan</label>
    <textarea name="alasan" value={data.alasan} onChange={onChange} required />

    <label>Jumlah Perubahan</label>
    <input type="number" name="jumlah" value={data.jumlah} onChange={onChange} required />

    <button type="submit">Ajukan Perubahan</button>
  </form>
);

export default FormPerubahanAnggaran;
