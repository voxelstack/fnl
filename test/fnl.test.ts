import { describe, expect, test } from "vitest";
import { Environment, Identifier } from "../src/lib/interpreter";
import { evaluate } from "../src/main";
import { read } from "../src/lib/fnl";

describe("evaluate", () => {
    test("symbol", () => {
        const sym = Identifier.empty("var");
        expect(evaluate(sym, Environment.from({ [sym.name]: 22 }))).toStrictEqual(22);
    });
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
        { expr: `(if (|| false true) 1 2)`, obj: 1 },
        { expr: `(if (&& true false) 1 2)`, obj: 2 },
        { expr: `(if true (+ 1 2) 2)`, obj: 3 },
        { expr: `(if false 1 (+ 1 2))`, obj: 3 },
    ])("$expr", ({ expr, obj }) => {
        expect(evaluate(read(expr))).toStrictEqual(obj);
    });
    test.each([
        { expr: `(do)`, obj: null },
        { expr: `(do nil)`, obj: null },
        { expr: `(do 1 2 3)`, obj: 3 },
        { expr: `(do 1 2 3 (+ 4 5))`, obj: 9 },
        { expr: `(do 1 2 (do 3 4))`, obj: 4 },
    ])("$expr", ({ expr, obj }) => {
        expect(evaluate(read(expr))).toStrictEqual(obj);
    });

    test.each([
        { expr: `((lambda (a) (+ a 1)) 1)`, obj: 2 },
        { expr: `(((lambda (a) (lambda (b) (+ a b))) 1) 2)`, obj: 3 },
    ])("$expr", ({ expr, obj }) => {
        expect(evaluate(read(expr))).toStrictEqual(obj);
    });

    test.each([
        { expr: `(let ((a 17)) a)`, obj: 17 },
        { expr: `(let ((a 17) (b 13)) (+ a b))`, obj: 30 },
        { expr: `(let ((a 17)) (let ((a 13)) a))`, obj: 13 },
        { expr: `(let ((a 17) (b 13)) (let ((b 11)) (+ a b)))`, obj: 28 },
    ])("$expr", ({ expr, obj }) => {
        expect(evaluate(read(expr))).toStrictEqual(obj);
    });

    test.each([
        { expr: `(let ((a 1) (b a)))` },
    ])('$expr', ({ expr }) => {
        expect(() => evaluate(read(expr))).toThrowError();
    });

    test.each([
        { expr: `(assign i 0)` },
    ])('$expr', ({ expr }) => {
        expect(() => evaluate(read(expr))).toThrowError();
    });

    test.each([
        { expr: `(let ((a 0)) (assign a 1) a)`, obj: 1 },
        { expr: `(let ((a 0)) (let ((b 0)) (assign a 1) a))`, obj: 1 },
        { expr: `(let ((a 0)) (let ((b 0)) (assign a 1)) a)`, obj: 0 },
    ])('$expr', ({ expr, obj }) => {
        expect(evaluate(read(expr))).toStrictEqual(obj);
    });

    test.each([
        { expr: `(letrec ((a 1) (b a)) b)` },
    ])('$expr', ({ expr }) => {
        expect(evaluate(read(expr))).toStrictEqual(1);
    });

    test.each([
        { expr: `(do (def a 17) a)`, obj: 17 },
        { expr: `(do (def a 17) (def b 13) (+ a b))`, obj: 30 },
        { expr: `(do (def fib (lambda (n) (if (<= n 1) 1 (+ (fib (- n 2)) (fib (- n 1)))))) (fib 5))`, obj: 8 }
    ])("$expr", ({ expr, obj }) => {
        expect(evaluate(read(expr))).toStrictEqual(obj);
    });

    test.each([
        { expr: `(do (def a 17) (def a 13))` },
    ])("$expr", ({ expr }) => {
        expect(() => evaluate(read(expr))).toThrowError();
    });

    test("fact", () => {
        const expr = `
            (letrec ((fact (lambda (n)
              (if (= n 0)
                1
                (* n (fact (- n 1)))))))
              (fact 10))
        `;
        expect(evaluate(read(expr))).toStrictEqual(3628800);
    });

    test.each([
        { expr: `(callcc (lambda (k) (k 22)))`, obj: 22 },
        { expr: `(callcc (lambda (k) (+ 1 (k 22))))`, obj: 22 },
        { expr: `(callcc (lambda (k) (+ (k 13) (k 17))))`, obj: 13 },
        { expr: `(callcc (lambda (k) (let ((a 0)) (assign a 1) (k 0) a)))`, obj: 0 },
        { expr: `(let ((a 0)) (callcc (lambda (k) (let ((a 1)) (k 2)))) a)`, obj: 0 },
    ])("$expr", ({ expr, obj }) => {
        expect(evaluate(read(expr))).toStrictEqual(obj);
    });
    
    test.each([
        { expr: `(callcc (lambda (k) (k 1 2 3)))` },
        { expr: `(callcc (lambda (k l m) (k 0)))` },
        { expr: `(callcc (0))` },
        { expr: `(callcc)` },
    ])("$expr", ({ expr }) => {
        expect(() => evaluate(read(expr))).toThrowError();
    });

    test.each([
        { expr: `(dict "a" 0 "b" 1 "c" 2)`, obj: { a: 0, b: 1, c: 2 } },
        { expr: `(dict "a" 0 "b" 1 "c" (dict "d" 2 "e" 3))`, obj: { a: 0, b: 1, c: { d: 2, e: 3} } },
        { expr: `(dict "a" (dict "b" 1) "c" 2 "d" (dict "e" 3 "f" 4))`, obj: { a: { b: 1 }, c: 2, d: { e: 3, f: 4 } } },
    ])("$expr", ({ expr, obj }) => {
        expect(evaluate(read(expr))).toMatchDictionary(obj);
    });

    test.each([
        { expr: `(set 0 1 2)`, obj: [0, 1, 2] },
    ])("$expr", ({ expr, obj }) => {
        expect(evaluate(read(expr))).toMatchSet(obj);
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
        { expr: `(+ 1 1)`, obj: [Identifier.empty("+"), 1, 1] },
        { expr: `(+ 1 (* 2 3))`, obj: [Identifier.empty("+"), 1, [Identifier.empty("*"), 2, 3]] },
    ])("list from $expr", ({ expr, obj }) => {
        expect(read(expr)).toMatchList(obj);
    });
});
