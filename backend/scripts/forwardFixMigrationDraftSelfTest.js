"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");

const draftPath = path.join(__dirname, "..", "migrations", "drafts", "20260830120000-rpjmd-indicator-unique-forward-fix.draft.js");
const source = fs.readFileSync(draftPath, "utf8");
const draft = require(draftPath);

assert.deepStrictEqual(draft.TARGETS, [
  "indikatorstrategis",
  "indikatorarahkebijakans",
  "indikatorsubkegiatans",
]);
assert.deepStrictEqual(draft.REQUIRED_COLUMNS, ["id", "kode_indikator"]);
assert.strictEqual(typeof draft.up, "function");
assert.strictEqual(typeof draft.down, "function");
assert.strictEqual(typeof draft.assertDisposableOnly, "function");
assert.ok(source.includes("EPELARA_FORWARD_FIX_MODE=DISPOSABLE_ONLY"));
assert.ok(source.includes('database !== "epelara_audit_v5"'));
assert.ok(source.includes('host !== "127.0.0.1"'));
assert.ok(source.includes('approved !== "true"'));
assert.ok(source.includes("describeTable"));
assert.ok(source.includes("showAllTables"));
assert.ok(source.includes("showIndex"));
assert.ok(source.includes("HAVING COUNT(*) > 1"));
assert.ok(!source.includes("DELETE "));
assert.ok(!source.includes("dropTable"));
assert.ok(!source.includes("destroy("));
console.log("Forward-fix draft self-test passed: disposable guard, schema/key checks, idempotent index path, and no destructive dedupe operations.");
