// src/hooks/useApiWithDokThnContext.js
import { useAuth } from "../hooks/useAuth";
import api from "../services/api";
import { useState } from "react";

/**
 * Hook API fleksibel yang otomatis menyisipkan tahun & jenis dokumen
 * untuk semua metode HTTP: get, post, put, patch, delete.
 */
const useApiWithDokThnContext = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const request = async (method, endpoint, data = {}) => {
    setLoading(true);
    setError(null);

    try {
      const jenis_dokumen = data.jenis_dokumen ?? user?.jenis_dokumen;
      const tahun = data.tahun ?? user?.tahun;

      if (!jenis_dokumen || !tahun) {
        throw new Error("Jenis dokumen dan tahun wajib diisi.");
      }

      let response;

      switch (method.toLowerCase()) {
        case "get":
          response = await api.get(endpoint, {
            params: {
              ...data,
              jenis_dokumen,
              tahun,
            },
          });
          break;

        case "post":
          response = await api.post(endpoint, {
            ...data,
            jenis_dokumen,
            tahun,
          });
          break;

        case "put":
          response = await api.put(endpoint, {
            ...data,
            jenis_dokumen,
            tahun,
          });
          break;

        case "patch":
          response = await api.patch(endpoint, {
            ...data,
            jenis_dokumen,
            tahun,
          });
          break;

        case "delete":
          response = await api.delete(endpoint, {
            data: {
              ...data,
              jenis_dokumen,
              tahun,
            },
          });
          break;

        default:
          throw new Error(`Metode HTTP tidak dikenali: ${method}`);
      }

      return response.data;
    } catch (err) {
      console.error(`[API ERROR - ${method.toUpperCase()}]`, err);
      setError("Gagal mengirim data.");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    request,
    loading,
    error,
  };
};

export default useApiWithDokThnContext;
