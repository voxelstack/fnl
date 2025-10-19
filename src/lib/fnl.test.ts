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
});

describe("read", () => {
    test("number", () => {
        expect(evaluate(read(`22`))).toStrictEqual(22);
    });
    test("string", () => {
        expect(evaluate(read(`"fnl"`))).toStrictEqual("fnl");
    });
    test("boolean", () => {
        expect(evaluate(read(`true`))).toStrictEqual(true);
    });
});
