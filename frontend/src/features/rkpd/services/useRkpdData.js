import { useCallback, useEffect, useState } from "react";
import { getAllRkpd } from "./rkpdApi";

const useRkpdData = (params = {}) => {
  const [data, setData] = useState([]);
  const [meta, setMeta] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await getAllRkpd(params);
      setData(Array.isArray(result.data) ? result.data : []);
      setMeta(result.meta || {});
    } catch (err) {
      setError(err);
      setData([]);
      setMeta({});
    } finally {
      setLoading(false);
    }
  }, [params]);

  useEffect(() => {
    load();
  }, [load]);

  return {
    data,
    meta,
    loading,
    error,
    refetch: load,
  };
};

export default useRkpdData;

