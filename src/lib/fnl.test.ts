import { expect, test } from "vitest";
import { evaluate } from "./fnl";

test("echoes", () => {
    expect(evaluate("echo")).toEqual("echo");
});
