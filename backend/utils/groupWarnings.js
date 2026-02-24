// utils/groupWarnings.js
/**
 * Group array of warning messages berdasarkan Tahun
 * @param {Object|Array} warningsObj - Bisa object {pagu_tahun_1: "..."} atau array of string
 * @returns {Object} grouped warnings { "1": ["msg1","msg2"], ... }
 */
function groupWarnings(warningsObj = {}) {
  const messages = Array.isArray(warningsObj)
    ? warningsObj
    : Object.values(warningsObj);

  const grouped = {};
  messages.forEach((msg) => {
    const match = msg.match(/Tahun\s*(\d+)/i);
    const year = match ? match[1] : "Lainnya";
    if (!grouped[year]) grouped[year] = [];
    grouped[year].push(msg);
  });

  return grouped;
}

module.exports = groupWarnings;
