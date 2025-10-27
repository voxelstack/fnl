import { List, Symbol } from "./interpreter";
import { parse } from "./parser";
import type { ParserMacros, ReaderMacros } from "./types";

export const stdReaderMacros: ReaderMacros = {
    "'": (input) => {
        return [{
            type: "symbol",
            value: Symbol.empty("'"),
            span: [input.cursor, input.cursor]
        }];
    }
};

export const stdParserMacros: ParserMacros = {
    "'": (input, macros) => {
        const body = parse(input, macros);
        return new List(Symbol.empty("quote"), body);
    },
    "#": (input, macros) => {
        const body = parse(input, macros);
        if (!(body instanceof List)) {
            throw new Error("# macro expects a list.");
        }
        return new List(Symbol.empty("dict"), ...body);
    }
};
