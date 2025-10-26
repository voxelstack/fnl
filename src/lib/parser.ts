import { List, Symbol, type Atom, type Object } from "./fnl";

export type TokenType =
    | "open"
    | "close"
    | "symbol"
    | "number"
    | "string"
    | "boolean"
    | "nil"
;

export interface Token {
    type: TokenType;
    value: string;
    span: [number, number];
}

class TokenReader implements Iterator<Token> {
    private readonly tokens: Token[];
    private nextIndex: number;

    constructor(tokens: Token[]) {
        this.tokens = tokens;
        this.nextIndex = 0;
    }

    done(): boolean {
        return this.nextIndex >= this.tokens.length;
    }

    next(): IteratorResult<Token> {
        if (this.done()) {
            // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Iteration_protocols#value
            return { done: true } as IteratorResult<Token>;
        }
        return { value: this.tokens[this.nextIndex++], done: false };
    }

    peek(lookahead = 0): Token | undefined {
        return this.tokens[this.nextIndex + lookahead];
    }

    skip() {
        ++this.nextIndex;
    }
}

export function tokenize(input: string): TokenReader {
    const symbols: Map<string, Symbol> = new Map();
    const tokens: Token[] = [];
    
    let i = 0;
    const eof = (lookAhead = 0) => i + lookAhead >= input.length;
    const peek = (lookAhead = 0) => input[i + lookAhead];
    while (!eof()) {
        const next = peek();
        if (whitespace(next)) {
            ++i;
            continue;
        }

        let len: number;
        let token: Token;
        if (next === "(") {
            len = 1;
            token = produce("open");
        } else if (next === ")") {
            len = 1;
            token = produce("close");
        } else if (next === "\"") {
            len = readWhile((c) => c !== "\"", 1) + 1;
            token = produce("string", (s) => s.slice(1, -1));
        } else if (numeric(next) || (next === "-" && !eof(1) && numeric(peek(1)))) {
            len = readWhile(numeric, next === "-" ? 2 : 0);
            if (peek(len) === ".") {
                ++len;
                if (eof(len) || !numeric(peek(len))) {
                    throw new Error("Missing decimal part.");
                }
                len = readWhile(numeric, len);
            }
            token = produce("number", Number);
        } else if (tryWord("true")) {
            len = "true".length;
            token = produce("boolean", () => true);
        } else if (tryWord("false")) {
            len = "false".length;
            token = produce("boolean", () => false);
        } else if (tryWord("nil")) {
            len = "nil".length;
            token = produce("nil", () => null);
        } else if (valid(next)) {
            len = readWhile(valid);
            token = produce("symbol", (name) => {
                if (symbols.has(name)) {
                    return symbols.get(name);
                }

                const symbol = Symbol.empty(name);
                symbols.set(name, symbol);
                return symbol;
            });
        } else {
            throw new Error("Cannot read.");
        }
        i += len;
        tokens.push(token);

        // https://www.lispworks.com/documentation/HyperSpec/Body/02_ac.htm
        function whitespace(c: string) {
            return (c === "\n" || c == " ");
        }
        function latin(c: string) {
            return (c >= "a" && c <= "z") || (c >= "A" && c <= "Z");
        }
        function numeric(c: string) {
            return (c >= "0" && c <= "9");
        }
        function special(c: string) {
            // Omit parenthesis and quotes, they are delimiters.
            return "!$',_-./:;?+<=>#%&*@[\\]{|}`^~".includes(c);
        }
        function terminator(c: string) {
            return whitespace(c) || c === ")";
        }
        function valid(c: string) {
            return latin(c) || numeric(c) || special(c);
        }
        function tryWord(word: string) {
            let j;
            for (j = 0; !eof(j) && j < word.length; ++j) {
                if (word[j] !== peek(j)) return false;
            }

            return eof(j) || terminator(peek(j));
        }
        function readWhile(cond: (c: string) => boolean, len = 0) {
            while (!eof(len) && cond(peek(len))) ++len;
            return len;
        }
        function produce(type: Token["type"], parse: (value: string) => any = s => s) {
            return {
                type,
                value: parse(input.slice(i, i + len)),
                span: [i, i + len]
            } as Token;
        }
    }

    return new TokenReader(tokens);
}

export function parse(input: TokenReader): Object {
    let { value: token, done } = input.next();

    if (done) {
        return null;
    }

    switch (token.type) {
        case "open":
            const list = new List();

            // When at the start of a list, the recursive call will expect the (, so peek instead of next.
            while (token = input.peek()) {
                if (token.type === "open") {
                    list.push(parse(input));
                } else if (token.type === "close") {
                    input.skip();
                    return list;
                } else {
                    input.skip();
                    list.push(token.value);
                }
            }
            throw new Error("Unterminated list.");
        case "symbol":
        case "number":
        case "string":
        case "boolean":
        case "nil":
            return token.value as Atom;
    }
    throw new Error("Unexpected token.");
}
