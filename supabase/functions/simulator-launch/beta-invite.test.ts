import { test } from "node:test";
import assert from "node:assert/strict";
import { betaInvited } from "./beta-invite.ts";

const LIST = " alice@example.com, Bob@Example.com ,not-an-email";

test("an invited, confirmed student goes to the NEW Lauren beta", () => {
  assert.equal(betaInvited("alice@example.com", true, LIST), true);
  assert.equal(betaInvited("BOB@example.COM", true, LIST), true);
});

test("everyone else stays on the existing simulator", () => {
  assert.equal(betaInvited("carol@example.com", true, LIST), false);
  assert.equal(betaInvited("alice@example.com.evil", true, LIST), false);
  assert.equal(betaInvited("not-an-email", true, LIST), false);
});

test("an unconfirmed email is never invited", () => {
  assert.equal(betaInvited("alice@example.com", false, LIST), false);
});

test("no list, or an empty one, invites nobody (the whole beta is off)", () => {
  assert.equal(betaInvited("alice@example.com", true, undefined), false);
  assert.equal(betaInvited("alice@example.com", true, ""), false);
  assert.equal(betaInvited(null, true, LIST), false);
});
