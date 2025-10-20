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
    test("symbol", () => {
        expect(read(`symbol`)).toMatchObject({ name: "symbol" })
    });
    test("number", () => {
        expect(read(`22`)).toStrictEqual(22);
    });
    test("string", () => {
        expect(read(`"fnl"`)).toStrictEqual("fnl");
    });
    test("boolean", () => {
        expect(read(`true`)).toStrictEqual(true);
    });
    test("nil", () => {
        expect(read(`nil`)).toStrictEqual(null);
    });
});
