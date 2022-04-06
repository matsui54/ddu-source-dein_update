import { DiffItem, parseDiff } from "./git.ts";
import { assertEquals } from "./deps_test.ts";

Deno.test("parseDiff parse git diff result", () => {
  const dst: DiffItem = {
    changed: "1",
    insertions: "3",
    deletions: "3",
  };
  const exp = parseDiff("1 file changed, 3 insertions(+), 3 deletions(-)");
  assertEquals(dst, exp);
});

Deno.test("parseDiff with large number and multiple files change", () => {
  const dst: DiffItem = {
    changed: "5",
    insertions: "102",
    deletions: "18",
  };
  const exp = parseDiff("5 files changed, 102 insertions(+), 18 deletions(-)");
  assertEquals(dst, exp);
});

Deno.test("parseDiff with no deletions", () => {
  const exp: DiffItem = {
    changed: "1",
    insertions: "3",
    deletions: undefined,
  };
  const dst = parseDiff("1 file changed, 3 insertions(+)");
  assertEquals(dst, exp);
});

Deno.test("parseDiff with single deletions", () => {
  const exp: DiffItem = {
    changed: "1",
    deletions: "1",
    insertions: undefined,
  };
  const dst = parseDiff("1 file changed, 1 deletion(-)");
  assertEquals(dst, exp);
});

Deno.test("parseDiff with no insertions", () => {
  const exp: DiffItem = {
    changed: "1",
    deletions: "3",
    insertions: undefined,
  };
  const dst = parseDiff("1 file changed, 3 deletions(-)");
  assertEquals(dst, exp);
});
