import type { Dictionary, Procedure, List, Identifier } from "./interpreter";
import type { Token } from "./parser";
import type { Reader } from "./reader";

export type Continuation = (obj: Expression) => void;

export type Atom = Procedure | Continuation | Dictionary | Identifier | number | string | boolean | null;
export type Expression = Atom | List;

export type ReaderMacro = (input: Reader<string>) => Token[];
export type ReaderMacros = Record<string, ReaderMacro>;

export type ParserMacro = (input: Reader<Token>, macros: ParserMacros) => Expression;
export type ParserMacros = Record<string, ParserMacro>;
