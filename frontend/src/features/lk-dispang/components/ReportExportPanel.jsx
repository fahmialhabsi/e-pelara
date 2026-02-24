import React from 'react';

const ReportExportPanel = ({ onExport, onPrintDraft, onPrintFinal }) => {
  return (
    <div>
      <h2>Export & Print Laporan Keuangan</h2>
      <button onClick={onExport}>Export Excel</button>
      <button onClick={onPrintDraft}>Cetak Draft</button>
      <button onClick={onPrintFinal}>Cetak Final</button>
    </div>
  );
};

export default ReportExportPanel;
