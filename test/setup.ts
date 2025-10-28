import { expect } from "vitest";
import { Dictionary, List, Identifier, HashSet } from "../src/lib/interpreter";
import type { Expression } from "../src/lib/types";

expect.extend({
    toMatchList(received, expected) {
        const pass = listMatches(received, expected);

        let formattedActual: string | undefined;
        let formattedExpected: string | undefined;
        if (!pass) {
            formattedActual = formatAsList(received);
            formattedExpected = formatAsList(expected);
        }        

        return {
            pass,
            message: () => `expected ${formattedActual} to match ${formattedExpected}`,
            actual: formattedActual,
            expected: formattedExpected
        };
    },
    toMatchEmptySymbol: (received, expected) => ({
        pass: received.name === expected,
        message: () => `expected ${received.name} to match ${expected}`,
        actual: received.name,
        expected: expected
    }),
    toMatchSet: (received: any, expected: any[]) => {
        const pass = setMatches(received, expected);

        let formattedActual: string | undefined;
        let formattedExpected: string | undefined;
        if (!pass) {
            formattedActual = formatAsSet(received);
            formattedExpected = formatAsSet(expected);
        }

        return {
            pass,
            message: () => `expected ${formattedActual} to match ${formattedExpected}`,
            actual: formattedActual,
            expected: formattedExpected
        };
    },
    toMatchDictionary: (received, expected) => {
        const pass = dictionaryMatches(received, expected);
        
        let formattedActual: string | undefined;
        let formattedExpected: string | undefined;
        if (!pass) {
            formattedActual = formatAsDictionary(received);
            formattedExpected = formatAsDictionary(expected);;
        }
        
        return {
            pass,
            message: () => `expected ${formattedActual} to match ${formattedExpected}`,
            actual: formattedActual,
            expected: formattedExpected
        };
    }
});

function symbolMatches(received: any, expected: Identifier) {
    let pass = received instanceof Identifier;
    pass = pass && received.name === expected.name;

    return pass;
}

type ListLike = List | Expression[];

function listMatches(received: any, expected: ListLike): boolean {
    if (!listLike(received) || received.length !== expected.length) {
        return false;
    }

    return expected.reduce<boolean>((pass, currExpected, i) => {
        const currReceived = received[i];
        if (currReceived instanceof List && listLike(currExpected)) {
            return pass && listMatches(currReceived, currExpected);
        } else if (currReceived instanceof Identifier && currExpected instanceof Identifier) {
            return pass && symbolMatches(currReceived, currExpected);
        } else if (currReceived instanceof Dictionary && dictionaryLike(currExpected)) {
            return pass && dictionaryMatches(currReceived, currExpected);
        } else {
            return pass && currReceived === currExpected;
        }
    }, true);
}

function formatAsList(o: any) {
    if (listLike(o)) {
        return `(${o.map((el): string => {
            if (el === null) {
                return 'nil';
            } else if (el instanceof Identifier) {
                return el.name;
            } else if (listLike(el)) {
                return formatAsList(el);
            } else if (dictionaryLike(el)) {
                return formatAsDictionary(el);
            }
            return el.toString();
        }).join(" ")})`
    }
    return o.toString();
}

function listLike(o: any) {
    return o !== null && Array.isArray(o);
}

// Only works for atoms, but I'm fine with that.
function setMatches(received: any, expected: any[]): boolean {
    if (!(received instanceof HashSet)) {
        return false;
    }

    return expected.reduce((pass, value) => {
        return pass && received.has(value);
    }, true);
}

function formatAsSet(o: any) {
    if (listLike(o)) {
        return `%${formatAsList(o)}`;
    } else if (o instanceof Set) {
        return `%${formatAsList([...o.values()])}`;
    }
    return o.toString();
}

type DictionaryLike = Record<string | number, any> | Map<any, any>

function dictionaryMatches(received: any, expected: DictionaryLike): boolean {
    if (!(received instanceof Map)) {
        return false;
    }

    const entries = expected instanceof Map ? [...expected.entries()] : Object.entries(expected);
    return entries.reduce<boolean>((pass, [currExpectedKey, currExpectedValue]) => {
        const currReceived = received.get(currExpectedKey);
        if (currReceived instanceof List && listLike(currExpectedValue)) {
            return pass && listMatches(currReceived, currExpectedValue);
        } else if (currReceived instanceof Dictionary && dictionaryLike(currExpectedValue)) {
            return pass && dictionaryMatches(currReceived, currExpectedValue);
        } else {
            return pass && currReceived === currExpectedValue;
        }
    }, true);
}

function formatAsDictionary(o: any) {
    if (dictionaryLike(o)) {
        const entries = o instanceof Map ? [...o.entries()] : Object.entries(o);
        return `#${formatAsList(entries.flat())}`;
    }
    return o.toString();
}

function dictionaryLike(o: any): o is DictionaryLike {
    return o !== null && (o instanceof Dictionary || typeof o === "object")
}
