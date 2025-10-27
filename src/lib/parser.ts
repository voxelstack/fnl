import { List, Identifier } from "./interpreter";
import { Reader } from "./reader";
import type { Atom, Expression, ParserMacros, ReaderMacro, ReaderMacros } from "./types";

export type TokenType =
    | "open"
    | "close"
    | "symbol"
    | "number"
    | "string"
    | "boolean"
    | "nil"
;

export type TokenValue =
    | Identifier
    | number
    | string
    | boolean
    | null
;

export interface Token {
    type: TokenType;
    value: TokenValue;
    span: [number, number];
}

export function tokenize(input: Reader<string>, readerMacros: ReaderMacros = {}): Reader<Token> {
    const symbols: Map<string, Identifier> = new Map();
    const macroNames = readerMacros ? Object.keys(readerMacros).sort((a, b) => b.length - a.length) : [];
    
    const tokens: Token[] = [];
    while (!input.done) {
        const start = input.cursor;
        const curr = input.next();
    
        function produce(type: Token["type"], value: TokenValue) {
            tokens.push({ type, value, span: [start, input.cursor - 1] });
        }

        if (whitespace(curr)) {
            continue;
        }

        if (curr === "(") {
            produce("open", "(");
        } else if (curr === ")") {
            produce("close", ")");
        } else if (curr === "\"") {
            const str = readWhile((c) => c !== "\"");
            input.advance(); // Skip closing quote.
            produce("string", str);
        } else if (numeric(curr) || (curr === "-" && numeric(input.peek()))) {
            let num = readWhile(numeric, curr);

            if (input.peek() === ".") {
                num += input.next();
                if (!numeric(input.peek())) {
                    throw new Error("Missing decimal part.");
                }
                num = readWhile(numeric, num);
            }
            produce("number", Number(num));
        } else if (curr === "t" && tryWord("rue", true)) {
            produce("boolean", true);
        } else if (curr === "f" && tryWord("alse", true)) {
            produce("boolean", false);
        } else if (curr === "n" && tryWord("il", true)) {
            produce("nil", null);
        } else if (valid(curr)) {
            let macroHandler: ReaderMacro | undefined;
            for (const name of macroNames) {
                if (curr === name[0] && tryWord(name.slice(1), false)) {
                    macroHandler = readerMacros[name];
                    break;
                }
            }

            if (macroHandler) {
                tokens.push(...macroHandler(input));
                continue;
            }

            const name = readWhile(valid, curr);

            let symbol = symbols.get(name);
            if (symbol === undefined) {
                symbol = Identifier.empty(name);
                symbols.set(name, symbol);
            }                
            
            produce("symbol", symbol);
        } else {
            throw new Error("Cannot read.");
        }

        function tryWord(word: string, terminated: boolean) {
            let j;
            for (j = 0; j < word.length; ++j) {
                if (word[j] !== input.peek(j)) {
                    return false;
                }
            }
            if (terminated && !terminator(input.peek(j))) {
                return false;
            }

            input.advance(j);
            return true;
        }
        function readWhile(cond: (c?: string) => boolean, str = "") {
            while (!input.done && cond(input.peek())) {
                str += input.next();
            }
            return str;
        }
    }

    return new Reader(tokens);
}

export function parse(input: Reader<Token>, parserMacros: ParserMacros = {}): Expression {
    if (input.done) {
        return null;
    }

    let token: Token | undefined = input.next();
    switch (token.type) {
        case "open":
            const list = new List();

            // When at the start of a list, the recursive call will expect the (, so peek instead of next.
            while (token = input.peek()) {
                if (token.type === "close") {
                    input.advance();
                    return list;
                } else {
                    list.push(parse(input, parserMacros));
                }
            }
            throw new Error("Unterminated list.");
        case "symbol": {
            const symbol = token.value as Identifier;
            const macro = parserMacros?.[symbol.name];
            if (macro !== undefined) {
                return macro(input, parserMacros);
            }
            return symbol;
        }
        case "number":
        case "string":
        case "boolean":
        case "nil":
            return token.value as Atom;
    }
    throw new Error("Unexpected token.");
}

// https://www.lispworks.com/documentation/HyperSpec/Body/02_ac.htm
function whitespace(c?: string) {
    return c !== undefined && (c === "\n" || c == " ");
}
function latin(c?: string) {
    return c !== undefined && ((c >= "a" && c <= "z") || (c >= "A" && c <= "Z"));
}
function numeric(c?: string) {
    return c !== undefined && c >= "0" && c <= "9";
}
function special(c?: string) {
    // Omit parenthesis and quotes, they are delimiters.
    return c !== undefined && "!$',_-./:;?+<=>#%&*@[\\]{|}`^~".includes(c);
}
function terminator(c?: string) {
    return c === undefined || whitespace(c) || c === ")";
}
function valid(c?: string) {
    return c !== undefined && (latin(c) || numeric(c) || special(c));
}
