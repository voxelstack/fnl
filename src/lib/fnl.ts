export class Sym {
    public readonly name: string;

    constructor(name: string) {
        this.name = name.toLowerCase();
    }

    public static empty(name: string) {
        return new Sym(name);
    }

    public toString() {
        return this.name;
    }
}
export class List {
    private readonly data: Object[];
    private readonly cursor: number;

    constructor(data: Object[] = [], cursor = 0) {
        this.data = data;
        this.cursor = cursor;
    }

    public static from(data: Iterable<Object>) {
        return new List(Array.from(data));
    }

    public get length() {
        return Math.max(this.data.length - this.cursor, 0);
    }

    public push(o: Object) {
        this.data.push(o);
    }

    public pop() {
        return this.data.splice(this.cursor, 1);
    }

    public element(index: number) {
        return this.data[this.cursor + index] ?? null;
    }

    public view(index: number) {
        if (this.data.length > index) {
            return new List(this.data, index);
        }
        return null;
    }

    public toString() {
        return `(${this.data.map((o): string => o === null ? 'nil' : o.toString()).join(" ")})`
    }
}
export type Atom = Sym | number | string | boolean | null;
export type Object = Atom | List;

export function evaluate(exp: Object): Object {
    if (atom(exp)) {
        if (symbol(exp)) {
            throw new Error("Unimplemented.");
        } else if (number(exp) || string(exp) || boolean(exp) || nil(exp)) {
            return exp;
        } else {
            throw new Error("Invalid expression.");
        }
    } else {
        const fn = exp.element(0);
        if (symbol(fn)) {
            switch (fn.name) {
                case "quote":
                    return exp.element(1);
                case "if":
                    if (exp.length !== 4) {
                        throw new Error("Malformed if.");
                    }
                    // Explicit `=== true`, no coercion to boolean.
                    return evaluate(exp.element(1)) === true ? evaluate(exp.element(2)) : evaluate(exp.element(3));
                case "do":
                    let i = 1;
                    while (i < exp.length - 1) {
                        evaluate(exp.element(i++));
                    }
                    // exp.element(i) returns null if the list is empty which is why we don't check for that.
                    return evaluate(exp.element(i));
            }
        } else {
            throw new Error("Unimplemented.")
        }
    }
    throw new Error("Invalid expression.");
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
                token = produce("symbol", Sym.empty);
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
                const list = new List();

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

function atom(o: Object): o is Atom { return !(o instanceof List); }
function symbol(o: Object): o is Sym { return o instanceof Sym; }
function number(o: Object): o is number { return typeof o === "number"; }
function string(o: Object): o is string { return typeof o === "string"; }
function boolean(o: Object): o is boolean { return typeof o === "boolean"; }
function nil(o: Object): o is null { return o === null };

function car(o: List) { return o.element(0); }
function cdr(o: List) { return o.view(1); }
function cadr(o: List) { return o.element(1); }
function caddr(o: List) { return o.element(2); }
function cadddr(o: List) { return o.element(3); }
