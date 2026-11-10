// M13 Telugu + Hindi -- dictionary rules. Run: npm run test:features
import { test } from "node:test";
import assert from "node:assert/strict";
import { DICTIONARY_KEYS, translate, isLang } from "@/lib/i18n";

test("Telugu and Hindi cover every English key, and nothing extra", () => {
  for (const l of ["te", "hi"] as const) {
    assert.deepEqual([...DICTIONARY_KEYS[l]].sort(), [...DICTIONARY_KEYS.en].sort(), `${l} keys differ from English`);
  }
});
test("translations are really in the target script", () => {
  assert.match(translate("te", "board.h2"), /[ఀ-౿]/);
  assert.match(translate("hi", "board.h2"), /[ऀ-ॿ]/);
});
test("AI / UAE stay as written", () => {
  assert.match(translate("te", "nav.aiIntel"), /AI/);
  assert.match(translate("hi", "board.p3"), /UAE/);
});
test("unknown language falls back safely", () => {
  assert.equal(isLang("fr"), false);
  assert.equal(translate("en", "hero.button"), "Check Real Price");
});
