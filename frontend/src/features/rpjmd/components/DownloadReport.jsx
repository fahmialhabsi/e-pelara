// ✅ FIXED: DownloadReport.js
import api from "../services/api";

const DownloadReport = ({ data }) => {
  const handleDownload = async () => {
    try {
      const response = await api.post("/reports/generate", { data });
      const url = `/api/reports/download/${response.data.file}`;
      window.open(url, "_blank");
    } catch (err) {
      console.error("Gagal mengunduh laporan:", err);
    }
  };

  return (
    <button className="btn btn-primary" onClick={handleDownload}>
      Unduh Laporan
    </button>
  );
};

export default DownloadReport;
