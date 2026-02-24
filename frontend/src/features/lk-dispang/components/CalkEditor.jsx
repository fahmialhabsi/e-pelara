import React, { useState } from 'react';

const CalkEditor = ({ onSave }) => {
  const [calkText, setCalkText] = useState("");

  const handleSave = () => {
    onSave(calkText);
    alert("Catatan CaLK telah disimpan.");
  };

  return (
    <div>
      <h2>Editor Catatan atas Laporan Keuangan (CaLK)</h2>
      <textarea
        rows="15"
        cols="100"
        value={calkText}
        onChange={(e) => setCalkText(e.target.value)}
        placeholder="Isi Catatan Bab I s.d VII sesuai template..."
      />
      <br />
      <button onClick={handleSave}>Simpan</button>
    </div>
  );
};

export default CalkEditor;
