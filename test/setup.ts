import { expect } from "vitest";
import { Dictionary, List, Symbol } from "../src/lib/interpreter";
import type { Object } from "../src/lib/types";

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

function symbolMatches(received: any, expected: Symbol) {
    let pass = received instanceof Symbol;
    pass = pass && received.name === expected.name;

    return pass;
}

type ListLike = List | Object[];

function listMatches(received: any, expected: ListLike): boolean {
    if (!listLike(received) || received.length !== expected.length) {
        return false;
    }

    return expected.reduce<boolean>((pass, currExpected, i) => {
        const currReceived = received[i];
        if (currReceived instanceof List && listLike(currExpected)) {
            return pass && listMatches(currReceived, currExpected);
        } else if (currReceived instanceof Symbol && currExpected instanceof Symbol) {
            return pass && symbolMatches(currReceived, currExpected);
        } else if (currReceived instanceof Dictionary && dictionaryLike(currExpected)) {
            return pass && dictionaryMatches(currReceived, currExpected);
        } else {
            return pass && currReceived === currExpected;
        }
    }, true);
}

function formatAsList(arr: any[]) {
    return `(${arr.map((o): string => {
        if (o === null) {
            return 'nil';
        } else if (o instanceof Symbol) {
            return o.name;
        } else if (listLike(o)) {
            return formatAsList(o);
        } else if (dictionaryLike(o)) {
            return formatAsDictionary(o);
        }
        return o.toString();
    }).join(" ")})`
}

function listLike(o: any) {
    return o instanceof List || Array.isArray(o);
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

function formatAsDictionary(dict: DictionaryLike) {
    const entries = dict instanceof Map ? [...dict.entries()] : Object.entries(dict);
    return `#${formatAsList(entries.flat())}`;
}

function dictionaryLike(o: any): o is DictionaryLike {
    return o !== null && (o instanceof Dictionary || typeof o === "object")
}
