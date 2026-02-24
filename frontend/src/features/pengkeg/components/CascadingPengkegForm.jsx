import React, { useState, useEffect } from "react";
import { fetchPrograms, fetchKegiatan, fetchSubkegiatan } from "../services/api";

const CascadingForm = ({ opdId, onChange }) => {
  const [programs, setPrograms] = useState([]);
  const [kegiatans, setKegiatans] = useState([]);
  const [subkegiatans, setSubkegiatans] = useState([]);

  const [selectedProgram, setSelectedProgram] = useState("");
  const [selectedKegiatan, setSelectedKegiatan] = useState("");
  const [selectedSubkegiatan, setSelectedSubkegiatan] = useState("");

  useEffect(() => {
    if (opdId) fetchPrograms(opdId).then(setPrograms);
  }, [opdId]);

  useEffect(() => {
    if (selectedProgram) fetchKegiatan(selectedProgram).then(setKegiatans);
  }, [selectedProgram]);

  useEffect(() => {
    if (selectedKegiatan) fetchSubkegiatan(selectedKegiatan).then(setSubkegiatans);
  }, [selectedKegiatan]);

  useEffect(() => {
    onChange({ program_id: selectedProgram, kegiatan_id: selectedKegiatan, subkegiatan_id: selectedSubkegiatan });
  }, [selectedProgram, selectedKegiatan, selectedSubkegiatan]);

  return (
    <div className="space-y-2">
      <select onChange={(e) => setSelectedProgram(e.target.value)} className="w-full border p-2">
        <option value="">Pilih Program</option>
        {programs.map(p => <option key={p.id} value={p.id}>{p.nama_program}</option>)}
      </select>
      <select onChange={(e) => setSelectedKegiatan(e.target.value)} className="w-full border p-2">
        <option value="">Pilih Kegiatan</option>
        {kegiatans.map(k => <option key={k.id} value={k.id}>{k.nama_kegiatan}</option>)}
      </select>
      <select onChange={(e) => setSelectedSubkegiatan(e.target.value)} className="w-full border p-2">
        <option value="">Pilih Subkegiatan</option>
        {subkegiatans.map(sk => <option key={sk.id} value={sk.id}>{sk.nama_subkegiatan}</option>)}
      </select>
    </div>
  );
};

export default CascadingForm;
