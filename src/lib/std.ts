import { List, Identifier, Environment, NativeFunction, Dictionary, type Key, HashSet } from "./interpreter";
import { parse } from "./parser";
import type { Expression, ParserMacros, ReaderMacros } from "./types";

export const stdReaderMacros: ReaderMacros = {
    "'": (input) => {
        return [{
            type: "symbol",
            value: Identifier.empty("'"),
            span: [input.cursor, input.cursor]
        }];
    }
};

export const stdParserMacros: ParserMacros = {
    "'": (input, macros) => {
        const body = parse(input, macros);
        return new List(Identifier.empty("quote"), body);
    },
    "#": (input, macros) => {
        const body = parse(input, macros);
        if (!(body instanceof List)) {
            throw new Error("# macro expects a list.");
        }
        return new List(Identifier.empty("dict"), ...body);
    },
    "%": (input, macros) => {
        const body = parse(input, macros);
        if (!(body instanceof List)) {
            throw new Error("% macro expects a list.");
        }
        return new List(Identifier.empty("set"), ...body);
    }
};

// This, and then a bit more.
// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Expressions_and_operators
export const stdEnvironment = Environment.from({
    "+": new NativeFunction((a, b) => a + b),
    "-": new NativeFunction((a, b) => a - b),
    "*": new NativeFunction((a, b) => a * b),
    "/": new NativeFunction((a, b) => a / b),

    "%": new NativeFunction((a, b) => a % b),

    ">": new NativeFunction((a, b) => a > b),
    "<": new NativeFunction((a, b) => a < b),
    ">=": new NativeFunction((a, b) => a >= b),
    "<=": new NativeFunction((a, b) => a <= b),

    "=": new NativeFunction((a, b) => a === b),
    "!=": new NativeFunction((a, b) => a !== b),

    "&&": new NativeFunction((a, b) => a && b),
    "||": new NativeFunction((a, b) => a || b),
    "??": new NativeFunction((a, b) => a === null ? b : a),
    
    "&": new NativeFunction((a, b) => a & b),
    "|": new NativeFunction((a, b) => a | b),
    "^": new NativeFunction((a, b) => a ^ b),

    "<<": new NativeFunction((a, b) => a << b),
    ">>": new NativeFunction((a, b) => a >> b),
    ">>>": new NativeFunction((a, b) => a >>> b),

    "!": new NativeFunction((a) => !a),
    "~": new NativeFunction((a) => ~a),

    "assoc": new NativeFunction((dict: Dictionary, key: Key, value: Expression) => dict.set(key, value)),
    "dissoc": new NativeFunction((dict: Dictionary, key: Key) => dict.delete(key)),
    "get": new NativeFunction((dict: Dictionary, key: Key) => dict.get(key) ?? null),
    "keys": new NativeFunction((dict: Dictionary) => new List(...dict.keys())),

    "conj": new NativeFunction((set: HashSet, value: Expression) => set.add(value)),
    "disj": new NativeFunction((set: HashSet, value: Expression) => set.delete(value)),

    "has": new NativeFunction((collection: Dictionary | HashSet, key: Key) => collection.has(key)),
    "vals": new NativeFunction((collection: Dictionary | HashSet) => new List(...collection.values())),
});
