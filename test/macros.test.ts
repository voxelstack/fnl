import { describe, test, expect } from "vitest";
import { parse, tokenize } from "../src/lib/parser";
import { stdParserMacros, stdReaderMacros } from "../src/lib/std";
import { evaluate } from "../src/lib/fnl";
import { Reader } from "../src/lib/reader";
import { Identifier } from "../src/lib/interpreter";

describe("reader macros", () => {
    function t(expr: string) {
        return tokenize(new Reader(expr.split("")), stdReaderMacros);
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
        const tokens = tokenize(new Reader(expr.split("")), stdReaderMacros);
        return parse(tokens, stdParserMacros);
    }

    test("'literal", () => {
        const object = p(`'literal`);
        expect(object).toMatchList([Identifier.empty("quote"), Identifier.empty("literal")]);
    });
    test("'(+ 1 2)", () => {
        const object = p(`'(+ 1 2)`);
        expect(object).toMatchList([Identifier.empty("quote"), [Identifier.empty("+"), 1, 2]]);
    });

    test(`#("a" 0 "b" 1)`, () => {
        const object = p(`#("a" 0 "b" 1)`);
        expect(object).toMatchList([Identifier.empty("dict"), "a", 0, "b", 1]);
        expect(evaluate(object)).toMatchDictionary({ a: 0, b: 1 });
    });
    test(`#("a" 0 "b" #("c" 1))`, () => {
        const object = p(`#("a" 0 "b" #("c" 1))`);
        expect(object).toMatchList([Identifier.empty("dict"), "a", 0, "b", [Identifier.empty("dict"), "c", 1]]);
        expect(evaluate(object)).toMatchDictionary({ a: 0, b: { c: 1 }})
    });
});
