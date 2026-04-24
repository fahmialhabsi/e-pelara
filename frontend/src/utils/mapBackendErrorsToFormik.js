/**
 * Memetakan body error backend `{ errors: { field: string[] } }` ke bentuk Formik `errors`.
 * Formik mengharapkan nilai per field berupa string (pesan utama) atau bisa string[] tergantung versi;
 * di sini kita satukan array menjadi satu string agar kompatibel dengan ErrorMessage default.
 *
 * @param {unknown} responseData — biasanya `err.response.data`
 * @returns {Record<string, string>}
 */
export function mapBackendErrorsToFormik(responseData) {
  if (!responseData || typeof responseData !== "object") return {};

  const raw = responseData.errors;
  if (!raw || typeof raw !== "object") return {};

  /** @type {Record<string, string>} */
  const out = {};
  for (const [key, val] of Object.entries(raw)) {
    if (Array.isArray(val)) {
      const parts = val.filter(Boolean);
      out[key] = parts.length ? parts.join(" ") : "";
    } else if (typeof val === "string") {
      out[key] = val;
    }
  }
  return out;
}

/**
 * Pesan ringkas untuk toast / banner (fallback jika tidak ada errors per field).
 * @param {unknown} responseData
 * @param {string} [fallback]
 */
export function pickBackendErrorMessage(responseData, fallback = "Terjadi kesalahan.") {
  if (!responseData || typeof responseData !== "object") return fallback;
  const m = responseData.message;
  if (typeof m === "string" && m.trim()) return m;
  const errs = responseData.errors;
  if (errs && typeof errs === "object") {
    const first = Object.values(errs).find(Boolean);
    if (Array.isArray(first) && first[0]) return String(first[0]);
    if (typeof first === "string") return first;
  }
  return fallback;
}
