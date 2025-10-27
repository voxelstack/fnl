import { List, Identifier } from "./interpreter";
import { parse } from "./parser";
import type { ParserMacros, ReaderMacros } from "./types";

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
    }
};
