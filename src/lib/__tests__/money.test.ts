import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { money, moneyExact, parseAmount, signedMoney, toCents, toDollars } from "../money";

describe("money parsing", () => {
  test("plain numbers", () => {
    assert.equal(parseAmount("1250"), 125_000);
    assert.equal(parseAmount("1250.50"), 125_050);
  });

  test("strips currency symbols, commas and spaces", () => {
    assert.equal(parseAmount("$1,250.50"), 125_050);
    assert.equal(parseAmount(" 1 250 "), 125_000);
  });

  test("rejects malformed input", () => {
    for (const bad of ["", "abc", "1.2.3", "12e5", "--5", "1,2.3.4", "$"]) {
      assert.equal(parseAmount(bad), null, `expected ${bad} to be rejected`);
    }
  });

  test("negative amounts parse, for withdrawals", () => {
    assert.equal(parseAmount("-90"), -9_000);
  });

  test("rounds to whole cents rather than carrying a float", () => {
    assert.equal(parseAmount("0.005"), 1);
    assert.equal(parseAmount("10.999"), 1100);
  });
});

describe("cents avoid float drift", () => {
  test("summing tenths stays exact", () => {
    const cents = [toCents(0.1), toCents(0.2)];
    assert.equal(cents.reduce((a, b) => a + b, 0), 30);
    assert.notEqual(0.1 + 0.2, 0.3); // the reason cents exist
  });

  test("a thousand small contributions stay exact", () => {
    const total = Array.from({ length: 1000 }, () => toCents(0.01)).reduce((a, b) => a + b, 0);
    assert.equal(total, 1000);
    assert.equal(toDollars(total), 10);
  });
});

describe("money formatting", () => {
  test("whole dollars drop the cents", () => {
    assert.equal(money(54_970_00), "$54,970");
  });

  test("exact formatting shows cents only when present", () => {
    assert.equal(moneyExact(100_00), "$100");
    assert.equal(moneyExact(100_50), "$100.50");
  });

  test("signed amounts always carry a sign", () => {
    assert.equal(signedMoney(200_00), "+$200");
    assert.equal(signedMoney(-90_00), "−$90");
  });
});
