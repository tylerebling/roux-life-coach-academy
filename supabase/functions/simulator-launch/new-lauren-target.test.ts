import { test } from "node:test";
import assert from "node:assert/strict";
import { newLaurenHealthy, newLaurenTarget } from "./new-lauren-target.ts";

const env = (vars: Record<string, string>) => (name: string) => vars[name];
const FULL = { NEW_LAUREN_BETA_ORIGIN: "https://new-lauren.example.app/", NEW_LAUREN_BETA_PRIVATE_KEY: "-----BEGIN PRIVATE KEY-----x" };

test("every student goes to NEW Lauren when it is configured - no list, no email check", () => {
  assert.deepEqual(newLaurenTarget(env(FULL)), {
    origin: "https://new-lauren.example.app", kid: "roux-beta-2026-11", keySecret: "NEW_LAUREN_BETA_PRIVATE_KEY",
  });
});

test("not configured means unavailable, never the legacy simulator", () => {
  assert.equal(newLaurenTarget(env({})), null);
  assert.equal(newLaurenTarget(env({ ...FULL, NEW_LAUREN_BETA_PRIVATE_KEY: " " })), null);
  assert.equal(newLaurenTarget(env({ ...FULL, NEW_LAUREN_BETA_ORIGIN: "http://insecure.example.app" })), null);
  assert.equal(newLaurenTarget(env({ ...FULL, NEW_LAUREN_BETA_ORIGIN: "https://x.app/path" })), null);
});

test("health: only a 200 counts; errors and timeouts are unavailable", async () => {
  assert.equal(await newLaurenHealthy("https://a", async () => ({ ok: true, status: 200 })), true);
  assert.equal(await newLaurenHealthy("https://a", async () => ({ ok: false, status: 502 })), false);
  assert.equal(await newLaurenHealthy("https://a", async () => { throw new Error("down"); }), false);
  const hang = (_u: string, init: { signal: AbortSignal }) =>
    new Promise<{ ok: boolean; status: number }>((_r, reject) => init.signal.addEventListener("abort", () => reject(new Error("aborted"))));
  assert.equal(await newLaurenHealthy("https://a", hang, 20), false);
});

test("the function no longer contains any route to the legacy simulator or an invitation list", async () => {
  const { readFileSync } = await import("node:fs");
  const src = readFileSync(new URL("./index.ts", import.meta.url), "utf8");
  for (const gone of ["clientgatehq", "LCIQ_SIM_ORIGIN", "LCIQ_SIM_LAUNCH_PRIVATE_KEY", "LCIQ_SIM_LAUNCH_KID", "NEW_LAUREN_BETA_EMAILS", "betaInvited"]) {
    assert.equal(src.includes(gone), false, `index.ts still mentions ${gone}`);
  }
});
