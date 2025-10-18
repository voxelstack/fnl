import { describe, expect, test } from "vitest";
import { evaluate, parse, validate, type EvaluatedType } from "./fnl";

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
            "+": (...args: number[]) =>  args[0] + args[1],
            "*": (...args: number[]) => args[0] * args[1],
        };
        const expr = `(+ (* 1 2) (* 2 3))`;
        expect(evaluate(parse(expr), {}, fn)).toStrictEqual(8);
    });
});

describe("validate", () => {
    test("valid args", () => {
        const args = [1, "string", false, [0, 1], { a: 1 }];
        const validators: EvaluatedType[] = ["number", "string", "boolean", "array", "map"];
        expect(() => validate("fn", args, validators)).not.toThrowError();
    });

    test("valid no args", () => {
        const args: never[] = [];
        const validators: EvaluatedType[] = [];
        expect(() => validate("fn", args, validators)).not.toThrowError();
    });

    test("invalid args", () => {
        const args = [{ a: 1 }, "string", false];
        const validators: EvaluatedType[] = ["number", "string", "boolean"];
        expect(() => validate("fn", args, validators)).toThrowError();
    });

    test("invalid no args", () => {
        const args: never[] = [];
        const validators: EvaluatedType[] = ["boolean", "array"];
        expect(() => validate("fn", args, validators)).toThrowError();
    });

    test("less args", () => {
        const args = [1, "string"];
        const validators: EvaluatedType[] = ["number", "string", "boolean"];
        expect(() => validate("fn", args, validators)).toThrowError();
    });

    test("more args", () => {
        const args = [1, "string", false, null, []];
        const validators: EvaluatedType[] = ["number", "string", "boolean"];
        expect(() => validate("fn", args, validators)).toThrowError();
    });

    test("variadic", () => {
        const args = [1, "string", false, 1, 2, 3, 4];
        const validators: EvaluatedType[] = ["number", "string", "boolean", "number"];
        expect(() => validate("fn", args, validators, true)).not.toThrowError();
    });

    test("variadic invalid tail", () => {
        const args = [1, "string", false, 1, [2], false, 4];
        const validators: EvaluatedType[] = ["number", "string", "boolean", "number"];
        expect(() => validate("fn", args, validators, true)).toThrowError();
    });

    test("valid evaluation", () => {
        const fn = {
            "+": (...args: number[]) => {
                validate("+", args, ["number", "number"]);
                return args[0] + args[1]
            },
        };
        const expr = `(+ (+ 1 2) (+ 2 3))`;
        expect(() => evaluate(parse(expr), {}, fn)).not.toThrowError();
    });

    test("invalid evaluation", () => {
        const fn = {
            "+": (...args: number[]) => {
                validate("+", args, ["number", "number"]);
                return args[0] + args[1]
            },
        };
        const expr = `(+ "string" nil)`;
        expect(() => evaluate(parse(expr), {}, fn)).toThrowError();
    });
});
