import { describe, expect, test } from "vitest";
import { evaluate, read } from "./fnl";

describe("evaluate", () => {
    test("number", () => {
        expect(evaluate(22)).toStrictEqual(22);
    });
    test("string", () => {
        expect(evaluate("fnl")).toStrictEqual("fnl");
    });
    test("boolean", () => {
        expect(evaluate(true)).toStrictEqual(true);
    });
    test("nil", () => {
        expect(evaluate(null)).toStrictEqual(null);
    });
});

describe("read", () => {
    test.each([
        { expr: `symbol`, name: "symbol" },
        { expr: `SYMBOL`, name: "symbol" },
        { expr: `*symbol*`, name: "*symbol*" },
        { expr: `pkg:symbol`, name: "pkg:symbol" },
        { expr: `{&^1a`, name: "{&^1a" },
        { expr: `+`, name: "+" },
        { expr: `&&`, name: "&&" }
    ])("symbol from $expr", ({ expr, name }) => {
        expect(read(expr)).toMatchObject({ name })
    });
    test.each([
        { expr: `0`, obj: 0 },
        { expr: `22`, obj: 22 },
        { expr: `-22`, obj: -22 },
        { expr: `3.14`, obj: 3.14 },
        { expr: `-3.14`, obj: -3.14 }
    ])("number", ({ expr, obj }) => {
        expect(read(expr)).toStrictEqual(obj);
    });
    test.each([
        { expr: `"fnl"`, obj: "fnl" },
        { expr: `"f n l"`, obj: "f n l"}
    ])("string from $expr", ({ expr, obj }) => {
        expect(read(expr)).toStrictEqual(obj);
    });
    test.each([
        { expr: `true`, obj: true },
        { expr: `false`, obj: false }
    ])("boolean from $expr", ({ expr, obj }) => {
        expect(read(expr)).toStrictEqual(obj);
    });
    test.each([
        { expr: ``, obj: null },
        { expr: `nil`, obj: null },
    ])("nil from $expr", ({ expr, obj }) => {
        expect(read(expr)).toStrictEqual(obj);
    });
    
    test.each([
        { expr: `()`, obj: [] },
        { expr: `(1 1)`, obj: [1, 1] },
        { expr: `(+ 1 1)`, obj: [expect.objectContaining({ name: "+" }), 1, 1] },
        { expr: `(+ 1 (* 2 3))`, obj: [expect.objectContaining({ name: "+" }), 1, [expect.objectContaining({ name: "*"}), 2, 3]] },
    ])("list from $expr", ({ expr, obj }) => {
        expect(read(expr)).toStrictEqual(obj);
    });
});
