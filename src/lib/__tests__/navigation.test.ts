import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { returnPath } from "../navigation";

describe("returning after a detour to create a goal", () => {
  test("carries the new goal back to the page that asked for it", () => {
    assert.equal(returnPath("/challenges/new", "g1"), "/challenges/new?goal=g1");
  });

  test("keeps any query the caller already had", () => {
    assert.equal(
      returnPath("/challenges/new?type=52-week", "g1"),
      "/challenges/new?type=52-week&goal=g1",
    );
  });

  test("replaces a goal already named rather than adding a second", () => {
    assert.equal(returnPath("/challenges/new?goal=old", "g1"), "/challenges/new?goal=g1");
  });

  test("no destination means the ordinary one", () => {
    assert.equal(returnPath(undefined, "g1"), null);
    assert.equal(returnPath(null, "g1"), null);
    assert.equal(returnPath("", "g1"), null);
  });

  test("never follows a redirect off this app", () => {
    for (const hostile of [
      "https://example.com/steal",
      "http://example.com",
      "//example.com",
      "//example.com/challenges/new",
      "javascript:alert(1)",
      "challenges/new",
      "\\\\example.com",
      "/\\example.com",
    ]) {
      assert.equal(returnPath(hostile, "g1"), null, `${hostile} was followed`);
    }
  });

  test("a backslash never sneaks past the leading-slash check", () => {
    // Browsers normalise "\" to "/", so "/\evil.com" leaves the app just as
    // "//evil.com" does.
    assert.equal(returnPath("/\\evil.com", "g1"), null);
    assert.equal(returnPath("/challenges\\..\\evil", "g1"), null);
  });

  test("an id with awkward characters is encoded, not injected", () => {
    const result = returnPath("/challenges/new", "a&b=c");
    assert.equal(result, "/challenges/new?goal=a%26b%3Dc");
    assert.equal(new URLSearchParams(result!.split("?")[1]).get("goal"), "a&b=c");
  });
});
