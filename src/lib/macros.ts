import { List, Symbol } from "./fnl";
import { parse, type ParserMacros, type ReaderMacros } from "./parser";

export const globalReaderMacros: ReaderMacros = {
    "'": (input) => {
        return [{
            type: "symbol",
            value: Symbol.empty("'"),
            span: [input.cursor, input.cursor]
        }];
    }
};

export const globalParserMacros: ParserMacros = {
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
