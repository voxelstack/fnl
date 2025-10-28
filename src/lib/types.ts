import type { Dictionary, Procedure, List, Identifier, HashSet, Async } from "./interpreter";
import type { Token } from "./parser";
import type { Reader } from "./reader";

export type Continuation = (obj: Expression) => void;

export type Atom = Procedure | Async | Continuation | Identifier | number | string | boolean | null;
export type Expression = Atom | List | HashSet | Dictionary;

export type ReaderMacro = (input: Reader<string>) => Token[];
export type ReaderMacros = Record<string, ReaderMacro>;

export type ParserMacro = (input: Reader<Token>, macros: ParserMacros) => Expression;
export type ParserMacros = Record<string, ParserMacro>;
