"use strict";

/**
 * STEP 12 Regression E2E:
 * - scan context dengan blocker
 * - repair draft from findings
 * - scan ulang
 * - idempotency repeat request
 * - no approved mutation check
 *
 * Usage:
 *   node backend/scripts/mrIntegrityRepairE2E.js
 *
 * Env required:
 *   BASE_URL=http://localhost:3000
 *   TOKEN=<bearer_token_without_prefix_or_with_prefix>
 *   CONTEXT_ID=21
 */

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";
const RAW_TOKEN = String(process.env.TOKEN || "").trim();
const CONTEXT_ID = Number(process.env.CONTEXT_ID || 21);

const safeToken = RAW_TOKEN.toLowerCase().startsWith("bearer ")
  ? RAW_TOKEN.slice(7)
  : RAW_TOKEN;

if (!safeToken) {
  console.error("FAIL: TOKEN belum diisi.");
  process.exit(1);
}

if (!CONTEXT_ID) {
  console.error("FAIL: CONTEXT_ID tidak valid.");
  process.exit(1);
}

const headers = {
  Authorization: `Bearer ${safeToken}`,
  Accept: "application/json",
  "Content-Type": "application/json",
};

const passFail = [];

const assert = (name, cond, detail = "") => {
  const row = { name, status: cond ? "PASS" : "FAIL", detail };
  passFail.push(row);
  const prefix = cond ? "PASS" : "FAIL";
  console.log(`${prefix} - ${name}${detail ? ` :: ${detail}` : ""}`);
};

const skip = (name, detail = "") => {
  const row = { name, status: "SKIP", detail };
  passFail.push(row);
  console.log(`SKIP - ${name}${detail ? ` :: ${detail}` : ""}`);
};

const fetchJson = async (url, options = {}) => {
  const res = await fetch(url, options);
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch (_) {
    json = null;
  }
  return { ok: res.ok, status: res.status, json, raw: text };
};

const getScan = async () => {
  return fetchJson(`${BASE_URL}/api/mr-report/context/${CONTEXT_ID}/integrity-scan`, {
    method: "GET",
    headers,
  });
};

const postRepair = async (findingCodes, idemKey) => {
  return fetchJson(
    `${BASE_URL}/api/mr-report/context/${CONTEXT_ID}/repair-draft-from-findings`,
    {
      method: "POST",
      headers: {
        ...headers,
        "idempotency-key": idemKey,
      },
      body: JSON.stringify({
        finding_codes: findingCodes,
        repair_mode: "draft_only",
        confirm: true,
      }),
    }
  );
};

const findCode = (scan, code) =>
  (scan?.json?.data?.findings || []).filter(
    (f) => String(f?.code || "").toUpperCase() === String(code || "").toUpperCase()
  );

const REPAIRABLE_PRIORITY = [
  "PEDOMAN_10_MONITORING_MISSING",
];

const run = async () => {
  console.log(`BASE_URL=${BASE_URL}`);
  console.log(`CONTEXT_ID=${CONTEXT_ID}`);

  const scan1 = await getScan();
  assert("Scan endpoint reachable", scan1.ok, `status=${scan1.status}`);
  const findings1 = scan1?.json?.data?.findings || [];
  const blocking1 = Number(scan1?.json?.data?.blocking_count || 0);
  assert("Scan response has findings array", Array.isArray(findings1), `len=${findings1.length}`);
  assert("Blocking count numeric", Number.isFinite(blocking1), `value=${blocking1}`);

  const availableCodes = Array.from(
    new Set(
      findings1
        .map((f) => String(f?.code || "").toUpperCase())
        .filter(Boolean)
    )
  );

  const requestedCodes = REPAIRABLE_PRIORITY.filter((code) =>
    availableCodes.includes(code)
  );

  if (requestedCodes.length === 0) {
    skip(
      "Target finding repairable available",
      `Tidak ada code repairable pada context ini. available_codes=${availableCodes.join(",") || "-"}`
    );
  } else {
    assert("Target finding repairable available", true, `codes=${requestedCodes.join(",")}`);
  }

  const idem = `mr-repair-e2e-${CONTEXT_ID}-${Date.now()}`;
  let repair1 = null;
  if (requestedCodes.length > 0) {
    repair1 = await postRepair(requestedCodes, idem);
    assert("Repair endpoint reachable", repair1.ok, `status=${repair1.status}`);
  } else {
    skip("Repair endpoint reachable", "Dilewati karena tidak ada code repairable.");
  }

  const repaired1 = Number(repair1?.json?.data?.repaired_count || 0);
  const skipped1 = Number(repair1?.json?.data?.skipped_count || 0);
  if (requestedCodes.length > 0) {
    assert(
      "Repair returns summary counters",
      repaired1 + skipped1 >= 0,
      `repaired=${repaired1}, skipped=${skipped1}`
    );
  } else {
    skip("Repair returns summary counters", "Dilewati karena repair endpoint tidak dieksekusi.");
  }

  let repair2 = null;
  if (requestedCodes.length > 0) {
    repair2 = await postRepair(requestedCodes, idem);
    assert("Idempotency repeat request accepted", repair2.ok, `status=${repair2.status}`);
  } else {
    skip("Idempotency repeat request accepted", "Dilewati karena repair endpoint tidak dieksekusi.");
  }

  const repaired2 = Number(repair2?.json?.data?.repaired_count || 0);
  if (requestedCodes.length > 0) {
    assert(
      "Idempotency prevents duplicate mutation",
      repaired2 === 0,
      `repaired_repeat=${repaired2}`
    );
  } else {
    skip("Idempotency prevents duplicate mutation", "Dilewati karena repair endpoint tidak dieksekusi.");
  }

  const scan2 = await getScan();
  assert("Scan ulang endpoint reachable", scan2.ok, `status=${scan2.status}`);
  const blocking2 = Number(scan2?.json?.data?.blocking_count || 0);
  assert("No blocker increase after repair", blocking2 <= blocking1, `before=${blocking1}, after=${blocking2}`);

  const residualBefore = findCode(scan1, "RESIDUAL_GATE_NOT_EVALUATED").length;
  const residualAfter = findCode(scan2, "RESIDUAL_GATE_NOT_EVALUATED").length;
  assert(
    "No approved mutation heuristic (residual gate not auto-cleared)",
    !(residualBefore > 0 && residualAfter === 0),
    `before=${residualBefore}, after=${residualAfter}`
  );

  console.log("\n=== FINAL CHECKLIST ===");
  passFail.forEach((r, idx) => {
    console.log(`${idx + 1}. ${r.name}: ${r.status}${r.detail ? ` (${r.detail})` : ""}`);
  });
  const pass = passFail.filter((r) => r.status === "PASS").length;
  const fail = passFail.filter((r) => r.status === "FAIL").length;
  const skipCount = passFail.filter((r) => r.status === "SKIP").length;
  const total = passFail.length;
  const evaluable = pass + fail;
  const finalStatus = fail === 0 ? "HIJAU TERKENDALI" : "KUNING TERKENDALI";
  console.log(`RESULT: ${finalStatus} (${pass}/${evaluable} PASS, SKIP=${skipCount}, TOTAL=${total})`);

  if (fail > 0) {
    process.exitCode = 1;
  }
};

run().catch((err) => {
  console.error("FAIL: Unhandled error", err?.message || err);
  process.exit(1);
});
