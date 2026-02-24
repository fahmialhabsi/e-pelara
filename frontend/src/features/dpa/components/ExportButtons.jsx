import React from "react";

const ExportButtons = ({ onExportPDF, onExportExcel, onImport, onPrint }) => (
  <div className="flex gap-2 my-4">
    <button onClick={onImport} className="px-4 py-2 bg-gray-200 rounded">Import Excel</button>
    <button onClick={onExportExcel} className="px-4 py-2 bg-green-500 text-white rounded">Export Excel</button>
    <button onClick={onExportPDF} className="px-4 py-2 bg-red-500 text-white rounded">Export PDF</button>
    <button onClick={onPrint} className="px-4 py-2 bg-blue-500 text-white rounded">Print</button>
  </div>
);

export default ExportButtons;
