// src/shared/components/indikatorLimit.js
export const MAX_INDIKATOR_PER_TIPE = {
  Impact: 3,
  Outcome: 5,
  Output: 10,
  Proses: 7,
};

export const isTipeIndikatorLimitReached = (list, tipe) => {
  const max = MAX_INDIKATOR_PER_TIPE[tipe] || Infinity;
  const count = (list || []).filter((i) => i.tipe_indikator === tipe).length;
  return count >= max;
};

export const remainingQuota = (list, tipe) => {
  const max = MAX_INDIKATOR_PER_TIPE[tipe] || Infinity;
  const count = (list || []).filter((i) => i.tipe_indikator === tipe).length;
  return Math.max(0, max - count);
};
