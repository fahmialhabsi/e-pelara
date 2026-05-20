"use strict";

const assert = require("assert");
const path = require("path");
const { spawn } = require("child_process");
const jwt = require("jsonwebtoken");

const db = require("../models");
const routes = require("../routes/rpjmdGovernanceSyncRoutes");
const sourceTreeService = require("../services/rpjmd/rpjmdSourceTreeBuilderService");
const targetTreeService = require("../services/rpjmd/rpjmdTargetTreeBuilderService");
const sourceMapService = require("../services/rpjmd/rpjmdSourceMapService");
const preflightService = require("../services/rpjmd/rpjmdSyncPreflightService");
const diffService = require("../services/rpjmd/rpjmdSyncDiffService");
const previewService = require("../services/rpjmd/rpjmdSyncPreviewService");
const executeService = require("../services/rpjmd/rpjmdSyncExecuteService");
const resolverService = require("../services/rpjmd/rpjmdSourceMapResolverService");
const preparedSourceService = require("../services/rpjmd/rpjmdPreparedSourceService");
const jobMonitoringService = require("../services/rpjmd/rpjmdGovernanceJobMonitoringService");

const REQUIRED_TABLES = [
  "rpjmd_source_maps",
  "rpjmd_sync_jobs",
  "rpjmd_sync_job_items",
  "rpjmd_sync_audit_logs",
];

const ROUTE_SPECS = [
  ["post", "/preview"],
  ["post", "/execute"],
  ["get", "/source-map"],
  ["get", "/prepared-source"],
  ["get", "/jobs"],
  ["get", "/jobs/:jobId"],
  ["get", "/jobs/:jobId/items"],
  ["get", "/jobs/:jobId/audit-logs"],
];

const REQUIRED_SERVICE_EXPORTS = [
  ["sourceTree", sourceTreeService, "buildRpjmdSourceTree"],
  ["targetTree", targetTreeService, "buildRenstraTargetTree"],
  ["sourceMap", sourceMapService, "refreshSourceMapFromTrees"],
  ["preflight", preflightService, "runRpjmdGovernancePreflight"],
  ["diff", diffService, "buildRpjmdGovernanceDiff"],
  ["preview", previewService, "runRpjmdGovernancePreview"],
  ["execute", executeService, "runRpjmdGovernanceExecute"],
  ["resolver", resolverService, "resolveDropdownSourceMap"],
  ["prepared", preparedSourceService, "getPreparedSourceList"],
  ["monitoring", jobMonitoringService, "listGovernanceJobs"],
];

function parseJsonSafe(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function inspectRoutes(router) {
  return (router.stack || [])
    .filter((layer) => layer.route)
    .map((layer) => ({
      path: layer.route.path,
      methods: Object.keys(layer.route.methods || {}),
    }));
}

function assertRoutePresence(router) {
  const routeList = inspectRoutes(router);

  ROUTE_SPECS.forEach(([method, routePath]) => {
    const found = routeList.some((item) => item.path === routePath && item.methods.includes(method));
    assert(found, `Route tidak ditemukan: ${method.toUpperCase()} ${routePath}`);
  });
}

async function assertTablesExist() {
  const tables = await db.sequelize.getQueryInterface().showAllTables();
  const tableNames = new Set(
    Array.isArray(tables)
      ? tables.map((table) => {
          if (typeof table === "string") {
            return table;
          }

          if (table && typeof table === "object" && table.tableName) {
            return table.tableName;
          }

          return String(table);
        })
      : []
  );

  const missing = REQUIRED_TABLES.filter((table) => !tableNames.has(table));

  if (missing.length > 0) {
    return {
      ready: false,
      missing,
    };
  }

  return {
    ready: true,
    missing: [],
  };
}

function assertServiceExports() {
  REQUIRED_SERVICE_EXPORTS.forEach(([label, moduleRef, exportName]) => {
    assert(
      moduleRef && typeof moduleRef[exportName] === "function",
      `Export service tidak ada: ${label}.${exportName}`
    );
  });
}

async function spawnServer(baseDir, port) {
  const serverPath = path.join(baseDir, "server.js");
  const proc = spawn(process.execPath, [serverPath], {
    cwd: baseDir,
    env: {
      ...process.env,
      PORT: String(port),
      NODE_ENV: "development",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });

  let logs = "";
  const ready = new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Timeout menunggu server ready. logs=${logs}`));
    }, 40000);

    const onData = (chunk) => {
      const text = String(chunk || "");
      logs += text;
      if (text.includes("Server is running on port")) {
        clearTimeout(timer);
        resolve();
      }
    };

    const onError = (error) => {
      clearTimeout(timer);
      reject(error);
    };

    const onExit = (code) => {
      clearTimeout(timer);
      reject(new Error(`Server keluar sebelum ready. code=${code} logs=${logs}`));
    };

    proc.stdout.on("data", onData);
    proc.stderr.on("data", onData);
    proc.on("error", onError);
    proc.on("exit", onExit);
  });

  await ready;
  await wait(500);

  return proc;
}

async function callApi(baseUrl, token, method, route, body) {
  const res = await fetch(`${baseUrl}${route}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  return {
    status: res.status,
    body: parseJsonSafe(text),
    text,
  };
}

async function runEndpointSmoke(baseUrl, token, sample) {
  const previewPayload = {
    rpjmd_id: sample.rpjmd_id,
    renstra_id: sample.renstra_id,
    target_module: "RENSTRA",
    scope: "all",
    include_indicators: true,
    include_pagu: false,
    reason: "Integration test preview Governance Hub.",
  };

  const preview = await callApi(baseUrl, token, "POST", "/rpjmd-governance-sync/preview", previewPayload);
  assert(preview.body && typeof preview.body.success === "boolean", "Preview response tidak valid.");

  const executePayload = {
    ...previewPayload,
    confirm: true,
    preview_job_id: preview.body?.data?.job?.id || null,
    reason: "Integration test execute Governance Hub.",
  };

  const execute = await callApi(baseUrl, token, "POST", "/rpjmd-governance-sync/execute", executePayload);
  assert(execute.body && typeof execute.body.success === "boolean", "Execute response tidak valid.");

  const resolver = await callApi(
    baseUrl,
    token,
    "GET",
    `/rpjmd-governance-sync/source-map?target_module=RENSTRA&renstra_id=${sample.renstra_id}&source_stage=${sample.source_stage}&source_ref_id=${sample.source_ref_id}`,
  );
  assert(resolver.body && typeof resolver.body.success === "boolean", "Resolver response tidak valid.");

  const prepared = await callApi(
    baseUrl,
    token,
    "GET",
    `/rpjmd-governance-sync/prepared-source?target_module=RENSTRA&renstra_id=${sample.renstra_id}&scope=program&include_indicators=true`,
  );
  assert(prepared.body && typeof prepared.body.success === "boolean", "Prepared source response tidak valid.");

  const jobs = await callApi(
    baseUrl,
    token,
    "GET",
    `/rpjmd-governance-sync/jobs?target_module=RENSTRA&renstra_id=${sample.renstra_id}`,
  );
  assert(jobs.body && typeof jobs.body.success === "boolean", "Jobs response tidak valid.");

  const jobId = jobs.body?.data?.rows?.[0]?.id || preview.body?.data?.job?.id || null;
  if (!jobId) {
    return {
      preview,
      execute,
      resolver,
      prepared,
      jobs,
      detail: null,
      items: null,
      auditLogs: null,
    };
  }

  const detail = await callApi(baseUrl, token, "GET", `/rpjmd-governance-sync/jobs/${jobId}`);
  const items = await callApi(baseUrl, token, "GET", `/rpjmd-governance-sync/jobs/${jobId}/items`);
  const auditLogs = await callApi(baseUrl, token, "GET", `/rpjmd-governance-sync/jobs/${jobId}/audit-logs`);

  return {
    preview,
    execute,
    resolver,
    prepared,
    jobs,
    detail,
    items,
    auditLogs,
  };
}

async function runServiceSmoke(sample) {
  if (db.Renstra && typeof db.Renstra.findByPk === "function") {
    const originalFindByPk = db.Renstra.findByPk.bind(db.Renstra);
    db.Renstra.findByPk = async (id, options) => {
      const existing = await originalFindByPk(id, options);
      if (existing) {
        return existing;
      }
      return { id, renstra_id: id };
    };
  }

  async function captureStep(stepName, fn) {
    try {
      const result = await fn();
      return {
        step: stepName,
        ok: true,
        result,
      };
    } catch (error) {
      return {
        step: stepName,
        ok: false,
        error: {
          message: error instanceof Error && error.message ? error.message : String(error),
          stack: error instanceof Error && error.stack ? error.stack : null,
        },
      };
    }
  }

  const preflight = await captureStep("preflight", () =>
    preflightService.runRpjmdGovernancePreflight({
      rpjmd_id: sample.rpjmd_id,
      renstra_id: sample.renstra_id,
      target_module: "RENSTRA",
      scope: "all",
      include_indicators: true,
      include_pagu: false,
      mode: "preview",
    })
  );

  const diff = await captureStep("diff", () =>
    diffService.buildRpjmdGovernanceDiff({
      rpjmd_id: sample.rpjmd_id,
      renstra_id: sample.renstra_id,
      target_module: "RENSTRA",
      scope: "all",
      include_indicators: true,
      include_pagu: false,
      mode: "preview",
    })
  );

  const resolver = await captureStep("resolver", () =>
    resolverService.resolveDropdownSourceMap({
      target_module: "RENSTRA",
      rpjmd_id: sample.rpjmd_id,
      renstra_id: sample.renstra_id,
      source_stage: sample.source_stage,
      source_ref_id: sample.source_ref_id,
      include_parent: true,
      include_chain: true,
    })
  );

  const prepared = await captureStep("prepared", () =>
    preparedSourceService.getPreparedSourceList({
      target_module: "RENSTRA",
      rpjmd_id: sample.rpjmd_id,
      renstra_id: sample.renstra_id,
      scope: "program",
      include_indicators: true,
      include_pagu: false,
    })
  );

  const jobs = await captureStep("jobs", () =>
    jobMonitoringService.listGovernanceJobs({
      target_module: "RENSTRA",
      renstra_id: sample.renstra_id,
      rpjmd_id: sample.rpjmd_id,
    })
  );

  const preview = await captureStep("preview", () =>
    previewService.runRpjmdGovernancePreview({
      rpjmd_id: sample.rpjmd_id,
      renstra_id: sample.renstra_id,
      target_module: "RENSTRA",
      scope: "all",
      include_indicators: true,
      include_pagu: false,
      actor_user_id: 999999,
      actor_role: "ADMINISTRATOR",
      reason: "Integration test preview Governance Hub.",
      reqMeta: {
        ip: "127.0.0.1",
        userAgent: "g15-smoke",
      },
    })
  );

  const execute = await captureStep("execute", () =>
    executeService.runRpjmdGovernanceExecute({
      rpjmd_id: sample.rpjmd_id,
      renstra_id: sample.renstra_id,
      target_module: "RENSTRA",
      scope: "all",
      include_indicators: true,
      include_pagu: false,
      confirm: true,
      reason: "Integration test execute Governance Hub.",
      preview_job_id: preview.ok ? preview.result?.data?.job?.id || null : null,
      actor_user_id: 999999,
      actor_role: "SUPER_ADMIN",
      reqMeta: {
        ip: "127.0.0.1",
        userAgent: "g15-smoke",
      },
    })
  );

  return {
    transport: "service",
    preflight,
    diff,
    resolver,
    prepared,
    jobs,
    preview,
    execute,
  };
}

async function findSampleScope() {
  if (!db.RpjmdSourceMap) {
    return null;
  }

  const row = await db.RpjmdSourceMap.findOne({
    where: {
      target_module: "RENSTRA",
    },
    order: [["id", "ASC"]],
    raw: true,
  });

  if (!row) {
    return null;
  }

  return {
    rpjmd_id: row.rpjmd_id,
    renstra_id: row.renstra_id,
    source_stage: row.source_stage,
    source_ref_id: row.source_ref_id,
    target_ref_id: row.target_ref_id,
  };
}

async function run() {
  await db.sequelize.authenticate();
  assertServiceExports();
  assertRoutePresence(routes);

  const tableCheck = await assertTablesExist();
  if (!tableCheck.ready) {
    process.stdout.write(
      `${JSON.stringify(
        {
          success: false,
          blocked: true,
          code: "GOVERNANCE_TABLES_MISSING",
          message: "Schema Governance Hub belum lengkap di database lokal.",
          missing_tables: tableCheck.missing,
        },
        null,
        2
      )}\n`
    );
    return;
  }

  const sample = await findSampleScope();
  if (!sample) {
    process.stdout.write(
      `${JSON.stringify(
        {
          success: false,
          blocked: true,
          code: "GOVERNANCE_SAMPLE_SCOPE_NOT_FOUND",
          message: "Tidak ada source map sample yang bisa dipakai untuk smoke test.",
        },
        null,
        2
      )}\n`
    );
    return;
  }

  if (!process.env.JWT_SECRET) {
    const results = await runServiceSmoke(sample);
    process.stdout.write(
      `${JSON.stringify(
        {
          success: true,
          transport: results.transport,
          sample,
          preflight: results.preflight,
          diff: results.diff,
          resolver: results.resolver,
          prepared: results.prepared,
          jobs: results.jobs,
          preview: results.preview,
          execute: results.execute,
        },
        null,
        2
      )}\n`
    );
    return;
  }

  const token = jwt.sign(
    {
      id: 999999,
      username: "g15-smoke",
      role: "ADMINISTRATOR",
      role_id: 1,
    },
    process.env.JWT_SECRET,
    { expiresIn: "2h" }
  );

  const port = 3360 + Math.floor(Math.random() * 100);
  const baseDir = path.resolve(__dirname, "..");
  const baseUrl = `http://127.0.0.1:${port}/api`;
  const server = await spawnServer(baseDir, port);

  try {
    const results = await runEndpointSmoke(baseUrl, token, sample);
    process.stdout.write(
      `${JSON.stringify(
        {
          success: true,
          transport: "endpoint",
          sample,
          preview: results.preview.body,
          execute: results.execute.body,
          resolver: results.resolver.body,
          prepared: results.prepared.body,
          jobs: results.jobs.body,
          detail: results.detail ? results.detail.body : null,
          items: results.items ? results.items.body : null,
          audit_logs: results.auditLogs ? results.auditLogs.body : null,
        },
        null,
        2
      )}\n`
    );
  } finally {
    server.kill();
  }
}

run().catch((error) => {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 1;
});
