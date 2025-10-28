import { Environment, evaluate_k } from "./interpreter";
import { parse, tokenize } from "./parser";
import { Reader } from "./reader";
import { stdEnvironment, stdParserMacros, stdReaderMacros } from "./std";
import type { Expression, ParserMacros, ReaderMacros } from "./types";

export async function evaluate(exp: Expression, env = Environment.empty()) {
    env.extend(stdEnvironment);
    return new Promise((resolve) => {
        evaluate_k(exp, env, resolve);
    });
}

export function read(input: string, readerMacros?: ReaderMacros, parserMacros?: ParserMacros): Expression {
    const characterReader = new Reader(input.split(""));
    const tokenReader = tokenize(characterReader, { ...stdReaderMacros, ...readerMacros});
    const obj = parse(tokenReader, { ...stdParserMacros, ...parserMacros });

    if (!tokenReader.done) {
        throw new Error("Unexpected token.");
    }

    return obj;
}
