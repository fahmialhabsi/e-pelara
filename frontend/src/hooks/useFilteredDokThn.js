// Di src/hooks/useFilteredDokThn.js
import { useEffect, useState } from "react";
import api from "../services/api";
import { useDokumen } from "../hooks/useDokumen"; // Pastikan ini terimpor dengan benar

const useFilteredDokThn = (endpoint) => {
  const { dokumen, tahun } = useDokumen();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    console.log("useFilteredDokThn - Checking prerequisites...");

    // Validasi awal: Kita perlu dokumen dan tahun dari useDokumen
    // Jika dokumen atau tahun belum siap, kita tidak bisa melakukan filter yang relevan.
    // Jika endpoint adalah '/prioritas-gubernur', filter dokumen/tahun tidak relevan,
    // jadi kita bisa lewati validasi ini untuk endpoint tersebut.

    let params = {};
    let shouldFetch = false; // Flag untuk menentukan apakah fetch perlu dilakukan

    if (endpoint === "/strategi") {
      if (dokumen && tahun) {
        params.jenis_dokumen = dokumen.toLowerCase();
        params.tahun = tahun;
        shouldFetch = true;
      } else {
        console.log(
          "useFilteredDokThn - Prerequisites not met for /strategi:",
          { dokumen, tahun, endpoint }
        );
      }
    } else if (endpoint === "/prioritas-gubernur") {
      // Untuk endpoint prioritas gubernur, kita tidak menggunakan filter dokumen/tahun
      // Jadi, kita langsung set shouldFetch = true
      shouldFetch = true;
      console.log(
        "useFilteredDokThn - Endpoint is /prioritas-gubernur, skipping dokumen/tahun filter."
      );
    } else {
      console.log("useFilteredDokThn - Unknown endpoint:", endpoint);
    }

    // Jika tidak ada yang perlu difetch, set state dan keluar
    if (!shouldFetch) {
      if (loading) {
        // Hanya ubah state jika memang sedang loading
        setLoading(false);
        setData([]);
        setError(null);
      }
      return;
    }

    // Jika prasyarat terpenuhi dan shouldFetch adalah true, jalankan fetch
    console.log("useFilteredDokThn - Prerequisites met. Filtering with:", {
      params: params,
      endpoint: endpoint,
    });

    let isMounted = true;
    setLoading(true);
    setError(null);

    const fetchData = async () => {
      try {
        const res = await api.get(endpoint, { params }); // Kirim params yang sudah difilter sesuai endpoint

        console.log("useFilteredDokThn - API Response Data:", res.data);
        console.log(
          "useFilteredDokThn - Is API Response Array?",
          Array.isArray(res.data)
        );
        console.log(
          "useFilteredDokThn - Length of API Response Data:",
          res.data?.length
        );

        // Penting: Sesuaikan cara mengambil data dari respons API jika strukturnya berbeda
        // Jika respons API untuk `/prioritas-gubernur` mengembalikan { data: [...] }, Anda perlu mengambil res.data.data
        // Berdasarkan log sebelumnya, sepertinya responsnya langsung berupa array.
        const result = res.data;

        if (isMounted) setData(result);
      } catch (err) {
        console.error("useFilteredDokThn - Gagal ambil data:", err);
        if (isMounted) setError("Gagal memuat data.");
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchData();

    return () => {
      isMounted = false;
    };
    // Dependensi: fetch ulang jika endpoint, dokumen, atau tahun berubah
    // Hapus 'loading' dari array dependensi!
  }, [endpoint, dokumen, tahun]); // Dependensi yang benar adalah parameter yang digunakan untuk fetch

  return { data, loading, error };
};

export default useFilteredDokThn;
