export class Symbol {
    public readonly name: string;

    constructor(name: string) {
        this.name = name.toLowerCase();
    }

    public static empty(name: string) {
        return new Symbol(name);
    }
}

export class List extends Array<Object> { }

export class Dictionary extends Map<Exclude<Object, null>, Object> { }

abstract class Function {
    public abstract get arity(): number;

    protected assertArity(values: List) {
        if (values.length !== this.arity) {
            throw new Error("Invalid arity.");
        }
    }

    public abstract apply(values: List, k: Continuation): void;
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

    public apply(values: List, k: Continuation): void {
        this.assertArity(values);
        k(this.fn(...values.map((v) => v)));
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

    public apply(values: List, k: Continuation): void {
        this.assertArity(values);

        const newEnv = new Environment(this.env);
        this.variables.forEach((variable, i) => {
            newEnv.set(variable, values[i])
        });
        
        prog(this.body, newEnv, k);
    }
}

export type Continuation = (obj: Object) => void;
export type Atom = Function | Continuation | Dictionary | Symbol | number | string | boolean | null;
export type Object = Atom | List;

export class Environment {
    private readonly data: Map<string, Object>;
    private readonly parent?: Environment;

    constructor(parent?: Environment) {
        this.data = new Map();
        this.parent = parent;
    }

    static empty(parent?: Environment) {
        return new Environment(parent);
    }

    static from(vars: Record<string, Object>, parent?: Environment) {
        const env = Environment.empty(parent);
        // TODO I really shouldn't have a type called Object.
        for (const [key, value] of Object.entries(vars)) {
            env.set(Symbol.empty(key), value);
        }
        return env;
    }

    public get root() {
        return this.parent === undefined;
    }

    public extend(keys: Symbol[], values: List) {
        keys.forEach((k, i) => this.set(k, values[i]));
    }

    public delete(key: Symbol): boolean {
        return this.data.delete(key.name) || !!this.parent?.delete(key);
    }

    public get(key: Symbol): Object | undefined {
        return this.data.get(key.name) ?? this.parent?.get(key);
    }

    public has(key: Symbol): boolean {
        return this.data.has(key.name) || !!this.parent?.has(key);
    }

    public set(key: Symbol, value: Object): Object {
        this.data.set(key.name, value);
        return value;
    }
}

export function evaluate(exp: Object, env = Environment.empty()): Object {
    let res: Object | undefined;
    evaluate_k(exp, env, (obj) => res = obj);

    if (res === undefined) {
        throw new Error("Evaluate did not return.");
    }

    return res;
}

export function evaluate_k(exp: Object, env: Environment, k: Continuation): void {
    if (symbol(exp)) {
        const value = env.get(exp);
        if (value === undefined) {
            throw new Error(`Unbound variable ${exp.name}.`);
        }
        k(value);
    } else if(list(exp)) {
        const car = exp[0];
        if (symbol(car)) {
            if (car.name === "quote") {
                k(exp[1]);
            } else if (car.name === "if") {
                if (exp.length !== 4) {
                    throw new Error("Malformed if.");
                }
                evaluate_k(exp[1], env, (cond) => {
                    if (!boolean(cond)) {
                        throw new Error("Invalid condition");
                    }
                    evaluate_k(cond === true ? exp[2] : exp[3], env, k);
                });
            } else if (car.name === "do") {
                prog(exp.slice(1), env, k);
            } else if (car.name === "lambda") {
                const variables = exp[1];
                if (!list(variables)) {
                    throw new Error("Malformed lambda.");
                }
                k(new Lambda(variables, exp.slice(2), env));
            } else if (car.name === "let") {
                if (exp.length < 2 || !list(exp[1])) {
                    throw new Error("Malformed let.");
                }
                const innerEnv = Environment.from(exp[1].reduce((binds, bind) => {
                    if (!list(bind) || bind.length !== 2 || !symbol(bind[0])) {
                        throw new Error("Malformed let.")
                    }
                    // TODO My symbols aren't actually symbols.
                    const key = bind[0].name;
                    evaluate_k(bind[1], env, (value) => { binds[key] = value });
                    return binds;
                }, {} as Record<string, Object>), env);
                prog(exp.slice(2), innerEnv, k);
            } else if (car.name === "letrec") {
                if (exp.length < 2 || !list(exp[1])) {
                    throw new Error("Malformed letrec.");
                }
                const innerEnv = Environment.empty(env);
                exp[1].forEach((bind) => {
                    if (!list(bind) || bind.length !== 2 || !symbol(bind[0])) {
                        throw new Error("Malformed letrec.")
                    }
                    const key = bind[0];
                    evaluate_k(bind[1], innerEnv, (value) => { innerEnv.set(key, value); });
                });
                prog(exp.slice(2), innerEnv, k);
            } else if (car.name === "set") {
                if (env.root) {
                    throw new Error("Cannot set globals.");
                }
                if (exp.length !== 3 || !symbol(exp[1])) {
                    throw new Error("Malformed set.");
                }
                if (!env.has(exp[1])) {
                    throw new Error(`Unbound variable ${exp[1].name}.`);
                }
                k(env.set(exp[1], evaluate(exp[2], env)));
            } else if (car.name === "def") {
                if (exp.length !== 3 || !symbol(exp[1])) {
                    throw new Error("Malformed def.");
                }
                if (env.has(exp[1])) {
                    throw new Error("Cannot redefine.");
                }
                k(env.set(exp[1], evaluate(exp[2], env)));
            } else if (car.name === "callcc") {
                if (exp.length !== 2) {
                    throw new Error("Malformed calcc.");
                }
                evaluate_k(exp[1], env, (lambda) => {
                    if (!func(lambda)) {
                        throw new Error("Malformed callcc.");
                    }
                    apply(lambda, [k], env, k);
                });
            } else if (car.name === "dict") {
                if (exp.length % 2 !== 1) {
                    throw new Error("Malformed map.");
                }
                const dict = new Dictionary();
                for (let i = 1; i < exp.length; i += 2) {
                    evaluate_k(exp[i], env, (key) => {
                        evaluate_k(exp[i + 1], env, (value) => {
                            if (key === null) {
                                throw new Error("Cannot use nil as a key.");
                            }
                            dict.set(key, value);
                        });
                    });
                }
                k(dict);
            } else {
                apply(exp[0], exp.slice(1), env, k);
            }            
        } else {
            apply(exp[0], exp.slice(1), env, k);
        }
    } else {
        k(exp);
    }    
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
function dictionary(o: Object): o is Dictionary { return o instanceof Dictionary; }
function atom(o: Object): o is Atom { return !list(o); }
function symbol(o: Object): o is Symbol { return o instanceof Symbol; }
function number(o: Object): o is number { return typeof o === "number"; }
function string(o: Object): o is string { return typeof o === "string"; }
function boolean(o: Object): o is boolean { return typeof o === "boolean"; }
function nil(o: Object): o is null { return o === null };
function func(o: Object): o is Function { return o instanceof Function; }
function primitive(o: Object): o is NativeFunction { return o instanceof NativeFunction; }
function continuation(o: Object): o is Continuation { return typeof o === "function" };

function prog(exps: List, env: Environment, k: Continuation): void {
    for (let i = 0; i < exps.length - 1; ++i) {
        let curr: Object | undefined;
        evaluate_k(exps[i], env, (val) => curr = val);

        if (curr === undefined) {
            // If a continuation was not called, we must have jumped.
            return;
        }
    }
    evaluate_k(exps[exps.length - 1] ?? null, env, k);
}

function apply(fn: Object, args: List, env: Environment, k: Continuation) {
    evaluate_k(fn, env, (fn) => {
        if (func(fn)) {
            const vals: Object[] = [];

            for (const exp of args) {
                let curr: Object | undefined;
                evaluate_k(exp, env, (val) => curr = val);

                if (curr === undefined) {
                    // If a continuation was not called, we must have jumped.
                    return;
                }
                vals.push(curr);
            }

            fn.apply(vals, k);
        } else if (continuation(fn)) {
            if (args.length !== 1) {
                throw new Error("Can only apply continuation to Object.");
            }
            evaluate_k(args[0], env, fn);
        } else {
            throw new Error("Cannot apply.");
        }
    });
}
