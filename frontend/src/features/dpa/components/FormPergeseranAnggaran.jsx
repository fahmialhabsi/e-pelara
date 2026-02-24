// FormPergeseranAnggaran untuk modul DPA
import React from "react";

const FormPergeseranAnggaran = ({ data, onChange, onSubmit }) => (
  <form onSubmit={onSubmit}>
    <label>Alasan Pergeseran</label>
    <textarea name="alasan" value={data.alasan} onChange={onChange} required />

    <label>Jumlah Pergeseran</label>
    <input type="number" name="jumlah" value={data.jumlah} onChange={onChange} required />

    <button type="submit">Ajukan Pergeseran</button>
  </form>
);

export default FormPergeseranAnggaran;
