/** Util murni — validasi/normalisasi angka untuk tambah indikator (StepTemplate). */

export function isNumeric(val) {
  if (val == null || val === "") return true;
  return !isNaN(Number(val.toString().replace(",", ".")));
}

export function normalizeNumber(val) {
  const num = parseFloat(val.toString().replace(",", "."));
  return isNaN(num) ? val : num.toFixed(2);
}
