// utils/recommendationUtils.js
const generateRecommendation = (capaian, target) => {
  if (capaian >= target) {
    return "Tercapai";
  } else if (capaian >= target * 0.75) {
    return "Dekat Tercapai";
  } else {
    return "Perlu Perbaikan";
  }
};

module.exports = { generateRecommendation };
