class Symbol {}
type Atom = Symbol | number | string | boolean;
type Cons = Atom[];
type Object = Atom | Cons;

export function evaluate(exp: Object) {
    if (atom(exp)) {
        if (symbol(exp)) {
            throw new Error("Unimplemented.");
        } else if (number(exp) || string(exp) || boolean(exp)) {
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
            | "number"
            | "string"
            | "boolean"
        ;
        value: string;
        span: [number, number];
    }

    function tokenize(input: string) {
        // https://www.lispworks.com/documentation/HyperSpec/Body/02_ac.htm
        const whitespace = (c: string) => (c === "\n" || c == " ");
        const latin = (c: string) => (c >= "a" && c <= "z") || (c >= "A" && c <= "Z");
        const numeric = (c: string) => (c >= "0" && c <= "9");
        const special = (c: string) => "!$\"'(),_-./:;?+<=>#%&*@[\\]{|}`^~".includes(c);

        const tokens: Token[] = [];
        
        for (let i = 0; i < input.length; ++i) {
            const next = input[i];
            if (whitespace(next)) {
                continue;
            }

            if (next === "\"") {
                takeString();
            } else if (numeric(next) || (next === "-" && numeric(input[i + 1]))) {
                takeNumber();
            } else if ((next === "t" || next === "f") && tryBoolean()) {
                takeBoolean();
            } else {
                throw new Error("Cannot read.");
            }

            function emit(type: Token["type"], len: number, parse: (value: string) => any) {
                tokens.push({
                    type,
                    value: parse(input.slice(i, i + len)),
                    span: [i, i + len]
                });
                i += len;
            }
            function takeString() {
                let len = 1;
                while (i + len < input.length && input[i + len] !== "\"") ++len;
                emit("string", len, (s) => s.slice(1));
            }
            function takeNumber() {
                let len = next === "-" ? 1 : 0;
                while (i + len < input.length && numeric(input[i + len])) ++len;
                if (input[i + len] === ".") {
                    ++len;
                    if (i + len >= input.length || !numeric(input[i + len])) {
                        throw new Error("Missing decimal part.");
                    }
                    while (i + len < input.length && numeric(input[i + len])) ++len;
                }
                emit("number", len, Number);
            }
            function tryBoolean() {
                const word = input[i] === "t" ? "rue" : "alse";
                for (let j = 0; i + j < input.length && j < word.length; ++j) {
                    if (word[j] !== input[i + j + 1]) return false;
                }
                return true;
            }
            function takeBoolean() {
                if (next === "t") {
                    emit("boolean", "true".length, () => true);
                } else {
                    emit("boolean", "false".length, () => false);
                }
            }
        }

        return tokens;
    }

    function parse(tokens: Token[]) {
        if (tokens.length > 1) {
            throw new Error("Expected atom");
        }

        switch (tokens[0].type) {
            case "number":
            case "string":
            case "boolean":
                return tokens[0].value;
        }
    }
}

function atom(o: Object): o is Atom { return !Array.isArray(o); }
function symbol(o: Object): o is Symbol { return o instanceof Symbol; }
function number(o: Object): o is number { return typeof o === "number"; }
function string(o: Object): o is string { return typeof o === "string"; }
function boolean(o: Object): o is boolean { return typeof o === "boolean"; }
