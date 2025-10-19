import { describe, expect, test } from "vitest";
import { evaluate } from "./fnl";

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
