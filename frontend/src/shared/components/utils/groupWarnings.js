// src/shared/components/utils/groupWarnings.js
export const groupWarnings = (warningsInput = {}) => {
  const flattenMessages = (input) => {
    if (!input) return [];
    if (Array.isArray(input)) return input.flatMap(flattenMessages);
    if (typeof input === "object")
      return Object.values(input).flatMap(flattenMessages);
    if (typeof input === "string") return [input];
    return [];
  };

  const messages = flattenMessages(warningsInput);
  const grouped = {};
  messages.forEach((msg) => {
    const match = String(msg).match(/Tahun\s*(\d+)/i);
    const year = match ? match[1] : "Lainnya";
    if (!grouped[year]) grouped[year] = [];
    grouped[year].push(String(msg));
  });

  return grouped;
};
