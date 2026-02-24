import api from "../services/api";

const fetchWithLog = async (endpoint, params = {}, setter, label = "") => {
  const labelInfo = label || endpoint;
  const requestParams = { ...params, _ts: Date.now() }; // cegah cache 304

  console.group(`🔍 [fetchWithLog] ${labelInfo}`);
  console.log("🛠 Endpoint:", endpoint);
  console.log("📨 Params:", requestParams);
  console.groupEnd();

  try {
    console.time(`⏱ Request Time: ${labelInfo}`);
    const res = await api.get(endpoint, { params: requestParams });
    console.timeEnd(`⏱ Request Time: ${labelInfo}`);

    console.group(`📦 [Response] ${labelInfo}`);
    console.log("Full response object:", res);
    console.log("Tipe data:", typeof res.data);
    console.log("Apakah array?", Array.isArray(res.data));
    console.log("Payload:", res.data?.data ?? res.data);
    console.groupEnd();

    const payload = res.data?.data ?? res.data;
    setter(Array.isArray(payload) ? payload : []);
  } catch (err) {
    console.error(`❌ [Error] Gagal ambil ${labelInfo}:`, err);
    setter([]);
  }
};

export default fetchWithLog;
