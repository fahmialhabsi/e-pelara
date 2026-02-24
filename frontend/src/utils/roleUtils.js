// === src/utils/roleUtils.js ===
export const normalizeRole = (role) => {
  if (role == null) return "";
  return String(role).toUpperCase().replace(/\s+/g, "_"); // tetap jaga replace spasi jika perlu
};
