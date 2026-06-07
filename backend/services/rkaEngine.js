'use strict';

const db = require('../models');
const budgetCascadeValidator = require('./budgetCascadeValidator');
const { validateEngineContract } = require('./engineContractValidator');

const { RkaRincianBelanja } = db;

const normalizeKode = (kode) => String(kode || '').trim();

const getParentKode = (kode) => {
  const normalized = normalizeKode(kode);
  const segments = normalized.split('.').filter(Boolean);
  if (segments.length <= 1) return null;
  return segments.slice(0, -1).join('.');
};

const getKodeLevel = (kode) => normalizeKode(kode).split('.').filter(Boolean).length;

const fetchRincianRows = async (rka_id) => {
  if (!rka_id) return [];
  return RkaRincianBelanja.findAll({
    where: { rka_id },
    order: [['urutan', 'ASC']],
  });
};

const buildBreakdown = (rows) => {
  const items = (rows || []).map((row) => {
    const raw = row.dataValues || row;
    const kode = normalizeKode(raw.kode_rekening);
    return {
      ...raw,
      kode_rekening: kode,
      jumlah: Number(raw.jumlah || 0),
      level: getKodeLevel(kode),
      parent_kode: getParentKode(kode),
    };
  });

  const totalsByCode = {};
  const totalsByLevel = {};
  items.forEach((item) => {
    if (!item.kode_rekening) return;
    totalsByCode[item.kode_rekening] = (totalsByCode[item.kode_rekening] || 0) + item.jumlah;
    const segments = item.kode_rekening.split('.').filter(Boolean);
    for (let idx = 1; idx <= segments.length; idx += 1) {
      const prefix = segments.slice(0, idx).join('.');
      totalsByLevel[prefix] = (totalsByLevel[prefix] || 0) + item.jumlah;
    }
  });

  return {
    rows: items,
    totalsByCode,
    totalsByLevel,
    total: items.reduce((sum, item) => sum + item.jumlah, 0),
  };
};

const recalculate = async (rka_id) => {
  const rows = await fetchRincianRows(rka_id);
  return buildBreakdown(rows);
};

const recalculateWithValidation = async (rka_id, options = {}) => {
  // Step 1: Budget cascade validation
  await budgetCascadeValidator.validateFullChain({ rka_id });
  await budgetCascadeValidator.validateRekeningConsistency({ rka_id });

  // Step 2: Core calculation
  const engineResult = await recalculate(rka_id);

  // Step 3: Contract enforcement
  const { strictMode = true } = options;
  const contractCheck = validateEngineContract(engineResult);

  // Step 4: Handle violations
  if (!contractCheck.valid) {
    if (strictMode) {
      // Strict mode: throw error and reject
      const error = new Error('Engine contract violation detected');
      error.code = 'ENGINE_CONTRACT_VIOLATION';
      error.violations = contractCheck.violations;
      error.summary = contractCheck.summary;
      error.status = 400;
      throw error;
    } else {
      // Safe mode: log warning only
      console.warn('[RkaEngine] Contract violations (safe mode):', {
        rka_id,
        violations: contractCheck.violations,
        summary: contractCheck.summary,
      });
    }
  }

  // Step 5: Attach metadata and return
  engineResult._metadata = {
    contract_valid: contractCheck.valid,
    contract_violations: contractCheck.violations,
    contract_summary: contractCheck.summary,
    validated_at: new Date().toISOString(),
    strict_mode: strictMode,
  };

  return engineResult;
};

module.exports = {
  recalculate,
  recalculateWithValidation,
};
