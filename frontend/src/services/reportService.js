// src/services/reportService.js
import api from "../services/api";

export const generateReport = async (data) => {
  const response = await api.post("/reports/generate", { data });
  return response.data.file;
};

export const downloadReport = async (filename) => {
  const url = `/api/reports/download/${filename}`;
  window.open(url, "_blank");
};
