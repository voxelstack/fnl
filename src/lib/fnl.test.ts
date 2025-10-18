import { describe, expect, test } from "vitest";
import { evaluate, parse } from "./fnl";

describe("parse", () => {
    test("string", () => {
        const expr = `"string"`;
        expect(parse(expr)).toStrictEqual("string");
    });

    test("escaped string", () => {
        const expr = `"\\"string\\""`;
        expect(parse(expr)).toStrictEqual("\"string\"");
    });

    test("nil", () => {
        const expr = `nil`;
        expect(parse(expr)).toStrictEqual(null);
    });

    test("true", () => {
        const expr = `true`;
        expect(parse(expr)).toStrictEqual(true);
    });

    test("false", () => {
        const expr = `false`;
        expect(parse(expr)).toStrictEqual(false);
    });

    test("integer", () => {
        const expr = `42`;
        expect(parse(expr)).toStrictEqual(42);
    });

    test("negative integer", () => {
        const expr = `-42`;
        expect(parse(expr)).toStrictEqual(-42);
    });

    test("float", () => {
        const expr = `3.14`;
        expect(parse(expr)).toStrictEqual(3.14);
    });

    test("negative float", () => {
        const expr = `-3.14`;
        expect(parse(expr)).toStrictEqual(-3.14);
    });

    test("float with missing decimal part", () => {
        const expr = `3.`;
        expect(() => parse(expr)).toThrowError();
    });

    test("float with missing integer part", () => {
        const expr = `.14`;
        expect(() => parse(expr)).toThrowError();
    });

    test("list with no parameters", () => {
        const expr = `(?)`;
        expect(parse(expr)).toStrictEqual(["?", []]);
    });

    test("list with parameters", () => {
        const expr = `(+ 1 1)`;
        expect(parse(expr)).toStrictEqual(["+", [1, 1]]);
    });
    
    test("nested list", () => {
        const expr = `(+ 1 (* 2 3))`;
        expect(parse(expr)).toStrictEqual(["+", [1, ["*", [2, 3]]]]);
    });

    test("multiple literals", () => {
        const expr = `1 1`;
        expect(() => parse(expr)).toThrowError();
    });

    test("multiple lists", () => {
        const expr = `(+ 1 1) (|| true false)`;
        expect(() => parse(expr)).toThrowError();
    });

    test("literal and list", () => {
        const expr = `1 (|| true false)`;
        expect(() => parse(expr)).toThrowError();
    });
});

describe("evaluate", () => {
    test("string", () => {
        const expr = `"string"`;
        expect(evaluate(parse(expr))).toStrictEqual("string");
    });

    test("escaped string", () => {
        const expr = `"\\"string\\""`;
        expect(evaluate(parse(expr))).toStrictEqual("\"string\"");
    });

    test("nil", () => {
        const expr = `nil`;
        expect(evaluate(parse(expr))).toStrictEqual(null);
    });

    test("true", () => {
        const expr = `true`;
        expect(evaluate(parse(expr))).toStrictEqual(true);
    });

    test("false", () => {
        const expr = `false`;
        expect(evaluate(parse(expr))).toStrictEqual(false);
    });

    test("integer", () => {
        const expr = `42`;
        expect(evaluate(parse(expr))).toStrictEqual(42);
    });

    test("negative integer", () => {
        const expr = `-42`;
        expect(evaluate(parse(expr))).toStrictEqual(-42);
    });

    test("float", () => {
        const expr = `3.14`;
        expect(evaluate(parse(expr))).toStrictEqual(3.14);
    });

    test("negative float", () => {
        const expr = `-3.14`;
        expect(evaluate(parse(expr))).toStrictEqual(-3.14);
    });

    test("bare evaluation", () => {
        const fn = {
            "+": (...args: number[]) => args[0] + args[1],
            "*": (...args: number[]) => args[0] * args[1],
        };
        const expr = `(+ (* 1 2) (* 2 3))`;
        expect(evaluate(parse(expr), {}, fn)).toStrictEqual(8);
    });
});
