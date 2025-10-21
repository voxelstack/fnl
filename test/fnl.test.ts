import { describe, expect, test } from "vitest";
import { evaluate, read, Sym } from "../src/lib/fnl";

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

    test.each([
        { expr: `(quote sym)`, sym: "sym" },
    ])("$expr", ({ expr, sym }) => {
        expect(evaluate(read(expr))).toMatchEmptySymbol(sym);
    });
    test.each([
        { expr: `(if true 1 2)`, obj: 1 },
        { expr: `(if false 1 2)`, obj: 2 },
        // TODO Update with more readable expressions once I have other functions.
        { expr: `(if (if true true false) 1 2)`, obj: 1 },
        { expr: `(if (if true false true) 1 2)`, obj: 2 },
        { expr: `(if true (if true 1 2) 2)`, obj: 1 },
        { expr: `(if false 1 (if false 1 2))`, obj: 2 },
    ])("$expr", ({ expr, obj }) => {
        expect(evaluate(read(expr))).toStrictEqual(obj);
    });
    test.each([
        { expr: `(do)`, obj: null },
        { expr: `(do nil)`, obj: null },
        { expr: `(do 1 2 3)`, obj: 3 },
        // TODO Update with more readable expressions once I have other functions.
        { expr: `(do 1 2 3 (if false 4 5))`, obj: 5 },
        { expr: `(do 1 2 (do 3 4))`, obj: 4 },
    ])("$expr", ({ expr, obj }) => {
        expect(evaluate(read(expr))).toStrictEqual(obj);
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
    ])("number from $expr", ({ expr, obj }) => {
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
        { expr: `(+ 1 1)`, obj: [Sym.empty("+"), 1, 1] },
        { expr: `(+ 1 (* 2 3))`, obj: [Sym.empty("+"), 1, [Sym.empty("*"), 2, 3]] },
    ])("list from $expr", ({ expr, obj }) => {
        expect(read(expr)).toMatchList(obj);
    });
});
