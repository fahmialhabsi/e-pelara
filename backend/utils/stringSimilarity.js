"use strict";

const { normalizeName } = require("./nameNormalizer");

function makeBigrams(text) {
  const t = normalizeName(text);
  if (!t) return [];
  if (t.length === 1) return [t];
  const out = [];
  for (let i = 0; i < t.length - 1; i += 1) {
    out.push(t.slice(i, i + 2));
  }
  return out;
}

function diceSimilarity(a, b) {
  const A = makeBigrams(a);
  const B = makeBigrams(b);
  if (!A.length && !B.length) return 1;
  if (!A.length || !B.length) return 0;
  const counter = new Map();
  for (const x of A) counter.set(x, (counter.get(x) || 0) + 1);
  let overlap = 0;
  for (const y of B) {
    const c = counter.get(y) || 0;
    if (c > 0) {
      overlap += 1;
      counter.set(y, c - 1);
    }
  }
  return (2 * overlap) / (A.length + B.length);
}

function tokenJaccardSimilarity(a, b) {
  const A = new Set(normalizeName(a).split(" ").filter(Boolean));
  const B = new Set(normalizeName(b).split(" ").filter(Boolean));
  if (!A.size && !B.size) return 1;
  if (!A.size || !B.size) return 0;
  let inter = 0;
  for (const x of A) if (B.has(x)) inter += 1;
  const union = A.size + B.size - inter;
  return union > 0 ? inter / union : 0;
}

function blendedNameSimilarity(a, b) {
  const d = diceSimilarity(a, b);
  const j = tokenJaccardSimilarity(a, b);
  return Number(((d * 0.65) + (j * 0.35)).toFixed(4));
}

module.exports = {
  makeBigrams,
  diceSimilarity,
  tokenJaccardSimilarity,
  blendedNameSimilarity,
};

