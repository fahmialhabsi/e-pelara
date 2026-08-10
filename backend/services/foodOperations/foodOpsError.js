'use strict';

/**
 * Evidence & Operasi Pangan — Phase 0. Error class domain, meniru persis
 * bentuk `ProsnError` (backend/services/prosnp/prosnpWorkflowService.js)
 * agar konsisten dgn konvensi controller-tipis+fail() repository ini.
 */
class FoodOpsError extends Error {
  constructor(message, status = 400, code = 'FOOD_OPS_VALIDATION_ERROR', details = null) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

module.exports = { FoodOpsError };
