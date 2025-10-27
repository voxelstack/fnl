import { Environment, evaluate_k } from "./interpreter";
import { parse, tokenize } from "./parser";
import { Reader } from "./reader";
import type { Object, ParserMacros, ReaderMacros } from "./types";

export function evaluate(exp: Object, env = Environment.empty()): Object {
    let res: Object | undefined;
    evaluate_k(exp, env, (obj) => res = obj);

    if (res === undefined) {
        throw new Error("Evaluate did not return.");
    }

    return res;
}

export function read(input: string, readerMacros?: ReaderMacros, parserMacros?: ParserMacros): Object {
    const characterReader = new Reader(input.split(""));
    const tokenReader = tokenize(characterReader, readerMacros);
    const obj = parse(tokenReader, parserMacros);

    if (!tokenReader.done) {
        throw new Error("Unexpected token.");
    }

    return obj;
}
