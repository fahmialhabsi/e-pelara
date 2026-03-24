// services/renstraCalculationService.js
const Decimal = require("decimal.js");

function hitungAkhirRenstra(data, jumlahTahun = 6) {
  const targetSum = Array.from(
    { length: jumlahTahun },
    (_, i) => new Decimal(data[`target_tahun_${i + 1}`] || 0),
  ).reduce((acc, n) => acc.plus(n), new Decimal(0));

  const paguSum = Array.from(
    { length: jumlahTahun },
    (_, i) => new Decimal(data[`pagu_tahun_${i + 1}`] || 0),
  ).reduce((acc, n) => acc.plus(n), new Decimal(0));

  return {
    target_akhir_renstra: targetSum.div(jumlahTahun).toNumber(),
    pagu_akhir_renstra: paguSum.toNumber(),
  };
}

module.exports = { hitungAkhirRenstra };
