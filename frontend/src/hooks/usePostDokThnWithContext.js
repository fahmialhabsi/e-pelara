// src/hooks/usePostDokThnWithContext.js
import { useAuth } from "../hooks/useAuth";
import api from "../services/api";
import { useState } from "react";

const usePostDokThnWithContext = () => {
  const { user } = useAuth();
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState(null);

  const postData = async (endpoint, payload) => {
    setPosting(true);
    setError(null);

    try {
      const finalPayload = {
        ...payload,
        jenis_dokumen: payload.jenis_dokumen ?? user?.jenis_dokumen,
        tahun: payload.tahun ?? user?.tahun,
      };

      if (!finalPayload.jenis_dokumen || !finalPayload.tahun) {
        throw new Error("Jenis dokumen dan tahun wajib diisi.");
      }

      const response = await api.post(endpoint, finalPayload);
      return response.data;
    } catch (err) {
      console.error("[POST ERROR]", err);
      setError("Gagal mengirim data.");
      throw err;
    } finally {
      setPosting(false);
    }
  };

  return {
    postData,
    posting,
    error,
  };
};

export default usePostDokThnWithContext;
