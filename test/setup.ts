import { expect } from "vitest";
import { List, type Object, Sym } from "../src/lib/fnl";

expect.extend({
    toMatchList(received, expected) {
        const pass = listMatches(received, expected);
        const formatted = pass ? undefined : formatAsList(expected);

        return {
            pass,
            message: () => `expected ${received} to match ${formatted}`,
            actual: received.toString(),
            expected: formatted
        };
    },
    toMatchEmptySymbol: (received, expected) => ({
        pass: received.name === expected,
        message: () => `expected ${received.name} to match ${expected}`,
        actual: received.name,
        expected: expected
    })
});

function symbolMatches(received: any, expected: Sym) {
    let pass = received instanceof Sym;
    pass = pass && received.name === expected.name;

    return pass;
}

function listMatches(received: any, expected: Object[]): boolean {
    if (!(received instanceof List) || received.length !== expected.length) {
        return false;
    }

    return expected.reduce<boolean>((pass, currExpected, i) => {
        const currReceived = received.element(i);
        if (currReceived instanceof List && Array.isArray(currExpected)) {
            return pass && listMatches(currReceived, currExpected);
        } else if (currReceived instanceof Sym && currExpected instanceof Sym) {
            return pass && symbolMatches(currReceived, currExpected);
        } else {
            return pass && currReceived === currExpected;
        }
    }, true);
}

function formatAsList(arr: any[]) {
    return `(${arr.map((o): string => {
        if (o === null) {
            return 'nil';
        } else if (Array.isArray(o)) {
            return formatAsList(o);
        }
        return o.toString();
    }).join(" ")})`
}
