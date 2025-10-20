class Symbol {
    public readonly name: string;

    constructor(name: string) {
        this.name = name;
    }
}
type Atom = Symbol | number | string | boolean | null;
type List = Atom[];
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
    return parse(tokenize(input));
    
    interface Token {
        type:
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
        
        for (let i = 0; i < input.length; ++i) {
            const next = input[i];
            if (whitespace(next)) {
                continue;
            }

            let len: number;
            let token: Token;
            if (next === "\"") {
                len = readWhile((c) => c !== "\"", 1);
                token = produce("string", len, (s) => s.slice(1));
            } else if (numeric(next) || (next === "-" && numeric(input[i + 1]))) {
                len = readWhile(numeric, next === "-" ? 1 : 0);
                if (input[i + len] === ".") {
                    ++len;
                    if (i + len >= input.length || !numeric(input[i + len])) {
                        throw new Error("Missing decimal part.");
                    }
                    len = readWhile(numeric, len);
                }
                token = produce("number", len, Number);
            } else if (tryWord("true")) {
                len = "true".length;
                token = produce("boolean", len, () => true);
            } else if (tryWord("false")) {
                len = "false".length;
                token = produce("boolean", len, () => false);
            } else if (tryWord("nil")) {
                len = "nil".length;
                token = produce("nil", len, () => null);
            } else if (valid(next)) {
                len = readWhile(valid);
                token = produce("symbol", len, (s) => new Symbol(s));
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
                // Omit parenthesis, they are delimiters.
                return "!$\"',_-./:;?+<=>#%&*@[\\]{|}`^~".includes(c);
            }
            function valid(c: string) {
                return latin(c) || numeric(c) || special(c);
            }
            function tryWord(word: string) {
                for (let j = 0; i + j < input.length && j < word.length; ++j) {
                    if (word[j] !== input[i + j]) return false;
                }
                return true;
            }
            function readWhile(cond: (c: string) => boolean, len = 0) {
                while (i + len < input.length && cond(input[i + len])) ++len;
                return len;
            }
            function produce(type: Token["type"], len: number, parse: (value: string) => any) {
                return {
                    type,
                    value: parse(input.slice(i, i + len)),
                    span: [i, i + len]
                } as Token;
            }
        }

        return tokens;
    }

    function parse(tokens: Token[]) {
        if (tokens.length > 1) {
            throw new Error("Expected atom");
        }

        switch (tokens[0].type) {
            case "symbol":
            case "number":
            case "string":
            case "boolean":
            case "nil":
                return tokens[0].value;
        }
    }
}

function atom(o: Object): o is Atom { return !Array.isArray(o); }
function symbol(o: Object): o is Symbol { return o instanceof Symbol; }
function number(o: Object): o is number { return typeof o === "number"; }
function string(o: Object): o is string { return typeof o === "string"; }
function boolean(o: Object): o is boolean { return typeof o === "boolean"; }
function nil(o: Object): o is null { return o === null };
