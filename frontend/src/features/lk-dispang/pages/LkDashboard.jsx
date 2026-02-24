import React, { useState, useEffect } from "react";
import CalkEditor from "../components/CalkEditor";
import ReportExportPanel from "../components/ReportExportPanel";
import { fetchJurnal, fetchAset, fetchAnggaran } from "../services/lkApi";

const LkDashboard = () => {
  const [jurnalData, setJurnalData] = useState([]);
  const [asetData, setAsetData] = useState([]);
  const [anggaranData, setAnggaranData] = useState([]);
  const [calk, setCalk] = useState("");

  useEffect(() => {
    fetchJurnal().then(setJurnalData);
    fetchAset().then(setAsetData);
    fetchAnggaran().then(setAnggaranData);
  }, []);

  const handleSaveCalk = (text) => {
    setCalk(text);
  };

  const exportToExcel = () => alert("Export ke Excel berhasil!");
  const printDraft = () => alert("Mencetak Draft dengan watermark...");
  const printFinal = () => alert("Mencetak FINAL dengan tanda tangan resmi...");

  return (
    <div>
      <h1>Dashboard Laporan Keuangan DISPANG</h1>
      <CalkEditor onSave={handleSaveCalk} />
      <ReportExportPanel
        onExport={exportToExcel}
        onPrintDraft={printDraft}
        onPrintFinal={printFinal}
      />
      <pre>
        {JSON.stringify({ jurnalData, asetData, anggaranData }, null, 2)}
      </pre>
    </div>
  );
};

export default LkDashboard;
