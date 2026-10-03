// `npm audit --audit-level=high`, minus advisories listed in audit-allowlist.json.
// npm has no ignore option, and each entry must carry a reason and an expiry, so an
// exception can't outlive its review: an expired entry fails the audit again.
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";

const BLOCKING_SEVERITIES = new Set(["high", "critical"]);
const ALLOWLIST_PATH = new URL("./audit-allowlist.json", import.meta.url);
const ADVISORY_ID_PATTERN = /GHSA-[\w-]+$/;

function runAudit() {
  const { stdout, error } = spawnSync("npm", ["audit", "--json"], { encoding: "utf8" });
  if (error) throw error;
  // npm audit exits non-zero whenever it finds anything, so the exit code is not a failure signal.
  const report = JSON.parse(stdout);
  if (report.error) throw new Error(`npm audit failed: ${report.error.summary ?? report.error.code}`);
  return report;
}

/** Every blocking advisory in the report, keyed by its GHSA id. */
function collectBlockingAdvisories(report) {
  const advisories = new Map();
  for (const vulnerability of Object.values(report.vulnerabilities ?? {})) {
    for (const via of vulnerability.via) {
      // A string `via` points at another vulnerable package, whose own entry holds the advisory.
      if (typeof via === "string" || !BLOCKING_SEVERITIES.has(via.severity)) continue;
      const id = via.url?.match(ADVISORY_ID_PATTERN)?.[0] ?? `npm-${via.source}`;
      advisories.set(id, `${via.name}: ${via.title} (${via.severity}) ${via.url ?? ""}`.trim());
    }
  }
  return advisories;
}

function main() {
  const today = new Date().toISOString().slice(0, 10);
  const allowlist = JSON.parse(readFileSync(ALLOWLIST_PATH, "utf8"));
  const active = new Map(allowlist.filter((entry) => entry.expires >= today).map((entry) => [entry.id, entry]));
  const expired = allowlist.filter((entry) => entry.expires < today);

  const blocking = collectBlockingAdvisories(runAudit());
  const unallowed = [...blocking].filter(([id]) => !active.has(id));

  for (const [id] of blocking) {
    const entry = active.get(id);
    if (entry) console.log(`allowed until ${entry.expires}: ${id} (${entry.package})`);
  }
  for (const entry of expired) console.error(`expired allowlist entry: ${entry.id}, review it again`);
  for (const entry of active.values()) {
    if (!blocking.has(entry.id)) console.log(`allowlist entry no longer needed, remove it: ${entry.id}`);
  }
  for (const [id, summary] of unallowed) console.error(`blocking advisory ${id}: ${summary}`);

  if (unallowed.length > 0) process.exit(1);
  console.log("deps:audit passed: no high or critical advisories outside the allowlist");
}

main();
