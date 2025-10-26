import { describe, test, expect } from "vitest";
import { parse, Reader, tokenize } from "../src/lib/parser";
import { globalParserMacros, globalReaderMacros } from "../src/lib/macros";
import { evaluate, Symbol } from "../src/lib/fnl";

describe("reader macros", () => {
    function t(expr: string) {
        return tokenize(new Reader(expr.split("")), globalReaderMacros);
    }

    test("'", () => {
        const tokens = t(`'`);
        expect(tokens.next().value).toMatchEmptySymbol("'");
    });
    test("'literal", () => {
        const tokens = t(`'literal`);
        expect(tokens.next().value).toMatchEmptySymbol("'");
        expect(tokens.next().value).toMatchEmptySymbol("literal");
    });
});

describe("parser macros", () => {
    function p(expr: string) {
        const tokens = tokenize(new Reader(expr.split("")), globalReaderMacros);
        return parse(tokens, globalParserMacros);
    }

    test("'literal", () => {
        const object = p(`'literal`);
        expect(object).toMatchList([Symbol.empty("quote"), Symbol.empty("literal")]);
    });
    test("'(+ 1 2)", () => {
        const object = p(`'(+ 1 2)`);
        expect(object).toMatchList([Symbol.empty("quote"), [Symbol.empty("+"), 1, 2]]);
    });

    test(`#("a" 0 "b" 1)`, () => {
        const object = p(`#("a" 0 "b" 1)`);
        expect(object).toMatchList([Symbol.empty("dict"), "a", 0, "b", 1]);
        expect(evaluate(object)).toMatchDictionary({ a: 0, b: 1 });
    });
    test(`#("a" 0 "b" #("c" 1))`, () => {
        const object = p(`#("a" 0 "b" #("c" 1))`);
        expect(object).toMatchList([Symbol.empty("dict"), "a", 0, "b", [Symbol.empty("dict"), "c", 1]]);
        expect(evaluate(object)).toMatchDictionary({ a: 0, b: { c: 1 }})
    });
});
