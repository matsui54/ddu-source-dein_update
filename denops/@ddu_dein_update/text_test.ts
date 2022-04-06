import { decode } from "./text.ts";
import { assertEquals } from "./deps_test.ts";

Deno.test("decode()", () => {
  const exp = "Hello world!";
  const input = new Uint8Array([
    72,
    101,
    108,
    108,
    111,
    32,
    119,
    111,
    114,
    108,
    100,
    33,
  ]);
  assertEquals(decode(input), exp);
});

Deno.test("decode() empty", () => {
  const exp = "";
  const input = new Uint8Array([]);
  assertEquals(decode(input), exp);
});
