export class Symbol {
    public readonly name: string;

    constructor(name: string) {
        this.name = name.toLowerCase();
    }

    public static empty(name: string) {
        return new Symbol(name);
    }

    public toString() {
        return this.name;
    }
}

export class List extends Array<Object> {
    public toString() {
        return `(${this.map((o): string => o === null ? 'nil' : o.toString()).join(" ")})`
    }
}

abstract class Function {
    public abstract get arity(): number;

    protected assertArity(values: List) {
        if (values.length !== this.arity) {
            throw new Error("Invalid arity.");
        }
    }

    public abstract apply(values: List): Object;
}

export class NativeFunction extends Function {
    private readonly fn: (...args: any[]) => any;

    constructor(fn: (...args: any[]) => any) {
        super();

        this.fn = fn;
    }

    public get arity() {
        return this.fn.length;
    }

    public apply(values: List): Object {
        this.assertArity(values);
        return this.fn(...values.map((v) => v));
    }
}

class Lambda extends Function {
    private readonly variables: Symbol[];
    private readonly body: List;
    private readonly env: Environment;

    constructor(variables: List, body: List, env: Environment) {
        super();

        this.variables = variables.map((el) => {
            if (!symbol(el)) {
                throw new Error("Variables on function definition must be list of symbols.");            
            }
            return el;
        });
        this.body = body;
        this.env = env;
    }

    public get arity(): number {
        return this.variables.length;
    }

    public apply(values: List): Object {
        this.assertArity(values);

        const newEnv = new Environment(this.env);
        this.variables.forEach((variable, i) => {
            newEnv.set(variable, values[i])
        });
        
        return prog(this.body, newEnv);
    }
}

export type Atom = Function | Symbol | number | string | boolean | null; 
export type Object = Atom | List;

export class Environment {
    private readonly data: Map<string, Object>;
    private readonly parent?: Environment;

    constructor(parent?: Environment) {
        this.data = new Map();
        this.parent = parent;
    }

    static empty() {
        return new Environment();
    }

    static from(vars: Record<string, Object>) {
        const env = Environment.empty();
        // TODO I really shouldn't have a type called Object.
        for (const [key, value] of Object.entries(vars)) {
            env.set(Symbol.empty(key), value);
        }
        return env;
    }

    delete(key: Symbol): boolean {
        return this.data.delete(key.name) || !!this.parent?.delete(key);
    }

    get(key: Symbol): Object | undefined {
        return this.data.get(key.name) ?? this.parent?.get(key);
    }

    has(key: Symbol): boolean {
        return this.data.has(key.name) || !!this.parent?.has(key);
    }

    set(key: Symbol, value: Object): this {
        this.data.set(key.name, value);
        return this;
    }

    extend(keys: Symbol[], values: List) {
        keys.forEach((k, i) => this.set(k, values[i]));
    }
}

export function evaluate(exp: Object, env = Environment.empty()): Object {
    if (symbol(exp)) {
            return lookup(exp, env);
    } else if(list(exp)) {
        const fn = exp[0];
        if (symbol(fn)) {
            switch (fn.name) {
                case "quote":
                    return exp[1];
                case "if":
                    if (exp.length !== 4) {
                        throw new Error("Malformed if.");
                    }
                    return evaluate(evaluate(exp[1]) ? exp[2] : exp[3], env)
                case "do":
                    return prog(exp.slice(1), env);
                case "lambda":
                    const variables = exp[1];
                    if (!list(variables)) {
                        throw new Error("Malformed lambda.");
                    }
                    return new Lambda(variables, exp.slice(2), env);
            }
        }
        return apply(evaluate(exp[0], env), evlis(exp.slice(1), env));
    }
    return exp;
}

export function read(input: string): Object {
    const symbols: Map<string, Symbol> = new Map();

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

function list(o: Object): o is List { return o instanceof List; }
function atom(o: Object): o is Atom { return !list(o); }
function symbol(o: Object): o is Symbol { return o instanceof Symbol; }
function number(o: Object): o is number { return typeof o === "number"; }
function string(o: Object): o is string { return typeof o === "string"; }
function boolean(o: Object): o is boolean { return typeof o === "boolean"; }
function nil(o: Object): o is null { return o === null };
function func(o: Object): o is Function { return o instanceof Function; }
function primitive(o: Object): o is NativeFunction { return o instanceof NativeFunction; }

function lookup(symbol: Symbol, env: Environment) {
    if (!env.has(symbol)) {
        throw new Error("Unbound variable.");
    }
    return env.get(symbol)!;
}

function prog(exps: List, env: Environment) {
    for (let i = 0; i < exps.length - 1; ++i) {
        evaluate(exps[i], env);
    }
    return evaluate(exps[exps.length - 1] ?? null, env);
}

function evlis(exps: List, env: Environment) {
    return exps.map((exp) => evaluate(exp, env))
}

function apply(fn: Object, values: List): Object {
    if (func(fn)) {
        return fn.apply(values);
    }
    throw new Error("Not a function.");
}
