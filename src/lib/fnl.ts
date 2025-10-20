class Symbol {
    public readonly name: string;

    constructor(name: string) {
        this.name = name;
    }
}
type Atom = Symbol | number | string | boolean | null;
type List = Object[];
type Object = Atom | List;

export function evaluate(exp: Object) {
    if (atom(exp)) {
        if (symbol(exp)) {
            throw new Error("Unimplemented.");
        } else if (number(exp) || string(exp) || boolean(exp) || nil(exp)) {
            return exp;
        } else {
            throw new Error("Cannot evaluate.");
        }
    } else {
        throw new Error("Unimplemented.");
    }
}

export function read(input: string): Object {
    const tokens = tokenize(input);
    const obj = parse(tokens);

    if (tokens.length > 0) {
        throw new Error("Unexpected token.");
    }

    return obj;
    
    interface Token {
        type:
            | "open"
            | "close"
            | "symbol"
            | "number"
            | "string"
            | "boolean"
            | "nil"
        ;
        value: string;
        span: [number, number];
    }

    function tokenize(input: string) {
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
                token = produce("symbol", (s) => new Symbol(s.toLowerCase()));
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

        return tokens;
    }

    function parse(tokens: Token[], next?: Token) {
        let token = next ?? tokens.shift();
        if (!token) return null;

        switch (token.type) {
            case "open":
                const list: List = [];

                while ((token = tokens.shift())) {
                    if (token.type === "open") {
                        list.push(parse(tokens, token));
                    } else if (token.type === "close") {
                        return list;
                    } else {
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
}

function atom(o: Object): o is Atom { return !Array.isArray(o); }
function symbol(o: Object): o is Symbol { return o instanceof Symbol; }
function number(o: Object): o is number { return typeof o === "number"; }
function string(o: Object): o is string { return typeof o === "string"; }
function boolean(o: Object): o is boolean { return typeof o === "boolean"; }
function nil(o: Object): o is null { return o === null };
