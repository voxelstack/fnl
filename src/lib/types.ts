import type { Dictionary, Function, List, Symbol } from "./interpreter";
import type { Token } from "./parser";
import type { Reader } from "./reader";

export type Continuation = (obj: Object) => void;

export type Atom = Function | Continuation | Dictionary | Symbol | number | string | boolean | null;
export type Object = Atom | List;

export type ReaderMacro = (input: Reader<string>) => Token[];
export type ReaderMacros = Record<string, ReaderMacro>;

export type ParserMacro = (input: Reader<Token>, macros: ParserMacros) => Object;
export type ParserMacros = Record<string, ParserMacro>;
