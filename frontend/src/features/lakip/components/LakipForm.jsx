// LakipForm.jsx
import React from "react";

const LakipForm = ({ data, onChange, onSubmit }) => (
  <form onSubmit={onSubmit}>
    <label>Tahun</label>
    <input type="number" name="tahun" value={data.tahun} onChange={onChange} required />

    <label>Tujuan</label>
    <input type="text" name="tujuan" value={data.tujuan} onChange={onChange} required />

    <label>Sasaran</label>
    <input type="text" name="sasaran" value={data.sasaran} onChange={onChange} required />

    <label>Indikator</label>
    <input type="text" name="indikator" value={data.indikator} onChange={onChange} required />

    <label>Realisasi</label>
    <input type="text" name="realisasi" value={data.realisasi} onChange={onChange} required />

    <button type="submit">Simpan</button>
  </form>
);

export default LakipForm;
