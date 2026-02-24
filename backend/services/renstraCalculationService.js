// services/renstraCalculationService.js
const Decimal = require("decimal.js");

function hitungAkhirRenstra(data) {
  const targetSum = Array.from(
    { length: 6 },
    (_, i) => new Decimal(data[`target_tahun_${i + 1}`] || 0)
  ).reduce((acc, n) => acc.plus(n), new Decimal(0));

  const paguSum = Array.from(
    { length: 6 },
    (_, i) => new Decimal(data[`pagu_tahun_${i + 1}`] || 0)
  ).reduce((acc, n) => acc.plus(n), new Decimal(0));

  return {
    target_akhir_renstra: targetSum.div(6).toNumber(),
    pagu_akhir_renstra: paguSum.toNumber(),
  };
}

module.exports = { hitungAkhirRenstra };
