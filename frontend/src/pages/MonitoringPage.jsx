// src/pages/MonitoringPage.js
import React, { useState } from "react";
import RealisasiForm from "../../features/monev/components/RealisasiForm";
import EvaluasiTrigger from "../../features/monev/components/EvaluasiTrigger";
import { generateReport, downloadReport } from "../../services/reportService";

const MonitoringPage = () => {
  const [reportData, setReportData] = useState(null);

  const handleGenerateReport = async () => {
    try {
      const filename = await generateReport({
        /* bisa ditambahkan filter */
      });
      setReportData(filename);
    } catch (error) {
      console.error(error);
      alert("Gagal generate laporan.");
    }
  };

  const handleDownload = () => {
    if (reportData) {
      downloadReport(reportData);
    } else {
      alert("Belum ada laporan untuk diunduh.");
    }
  };

  return (
    <div className="container mt-4">
      <h2>Monitoring & Evaluasi</h2>
      <RealisasiForm />
      <div className="my-3">
        <EvaluasiTrigger />
      </div>
      <div className="my-3">
        <button className="btn btn-info me-2" onClick={handleGenerateReport}>
          Generate Laporan
        </button>
        <button className="btn btn-primary" onClick={handleDownload}>
          Unduh Laporan
        </button>
      </div>
    </div>
  );
};

export default MonitoringPage;
