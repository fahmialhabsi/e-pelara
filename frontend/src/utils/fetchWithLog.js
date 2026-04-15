import api from "../services/api";
import { extractListResponse } from "./apiResponse";

const fetchWithLog = async (endpoint, params = {}, setter, label = "") => {
  const labelInfo = label || endpoint;
  const requestParams = { ...params, _ts: Date.now() };
  const timerLabel = `Request Time: ${labelInfo}#${requestParams._ts}-${Math.random()
    .toString(36)
    .slice(2, 7)}`;

  console.group(`[fetchWithLog] ${labelInfo}`);
  console.log("Endpoint:", endpoint);
  console.log("Params:", requestParams);
  console.groupEnd();

  try {
    console.time(timerLabel);
    const res = await api.get(endpoint, { params: requestParams });
    console.timeEnd(timerLabel);

    const { data, meta } = extractListResponse(res.data);

    console.group(`[Response] ${labelInfo}`);
    console.log("Full response object:", res);
    console.log("Payload:", data);
    console.log("Meta:", meta);
    console.groupEnd();

    setter(data);
  } catch (err) {
    console.error(`[Error] Gagal ambil ${labelInfo}:`, err);
    setter([]);
  }
};

export default fetchWithLog;
