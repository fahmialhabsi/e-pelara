import { useEffect, useState } from "react";
import api from "@/services/api";

export const useRkpdData = () => {
  const [data, setData] = useState([]);

  useEffect(() => {
    api
      .get("/rkpd")
      .then((res) => setData(res.data))
      .catch((err) => console.error("Gagal load RKPD:", err));
  }, []);

  return data;
};

export default useRkpdData;
