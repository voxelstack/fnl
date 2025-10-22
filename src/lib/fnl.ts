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
        // FIXME This breaks every view.
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

    public forEach(fn: (element: Object, index: number, list: List) => void) {
        for (let i = this.cursor; i < this.length; ++i) {
            fn(this.element(i), i, this);
        }
    }

    public map<T>(fn: (element: Object, index: number, list: List) => T): T[] {
          return this.reduce((array, element, index, list) => {
            return [...array, fn(element, index, list)];
          }, [] as T[]);
    }

    public reduce<T>(fn: (prev: T, curr: Object, index: number, list: List) => T, initialValue: T): T {
        let acc = initialValue;
        this.forEach((element, index) => {
            acc = fn(acc, element, index, this);
        });
        return acc;
    }

    public toString() {
        return `(${this.data.map((o): string => o === null ? 'nil' : o.toString()).join(" ")})`
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
};

class Lambda extends Function {
    private readonly variables: Symbol[];
    private readonly body: Object;
    private readonly env: Environment;

    constructor(variables: List, body: Object, env: Environment) {
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
            newEnv.set(variable, values.element(i))
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
        keys.forEach((k, i) => this.set(k, values.element(i)));
    }
}

export function evaluate(exp: Object, env = Environment.empty()): Object {
    if (atom(exp)) {
        if (symbol(exp)) {
            return lookup(exp, env);
        } else if (number(exp) || string(exp) || boolean(exp) || nil(exp) || primitive(exp)) {
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

                    if (evaluate(exp.element(1))) {
                        return evaluate(exp.element(2), env)
                    } else {
                        return evaluate(exp.element(3), env);
                    }
                case "do":
                    return prog(exp.view(1), env);
                case "lambda":
                    const variables = exp.element(1);
                    if (!list(variables)) {
                        throw new Error("Malformed lambda.");
                    }
                    return new Lambda(variables, cddr(exp), env);
            }
        }
        return apply(evaluate(exp.element(0), env), evlis(cdr(exp), env));
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
function atom(o: Object): o is Atom { return !list(o); }
function symbol(o: Object): o is Symbol { return o instanceof Symbol; }
function number(o: Object): o is number { return typeof o === "number"; }
function string(o: Object): o is string { return typeof o === "string"; }
function boolean(o: Object): o is boolean { return typeof o === "boolean"; }
function nil(o: Object): o is null { return o === null };
function func(o: Object): o is Function { return o instanceof Function; }
function primitive(o: Object): o is NativeFunction { return o instanceof NativeFunction; }

function car(o: List) { return o.element(0); }
function cdr(o: List) { return o.view(1); }
function cddr(o: List) { return o.view(2); }
function cadr(o: List) { return o.element(1); }
function caddr(o: List) { return o.element(2); }
function cadddr(o: List) { return o.element(3); }

function lookup(symbol: Symbol, env: Environment) {
    if (!env.has(symbol)) {
        throw new Error("Unbound variable.");
    }
    return env.get(symbol)!;
}

function prog(exps: Object, env: Environment) {
    if (atom(exps)) {
        return exps;
    }

    let i = 0;
    while (i < exps.length - 1) {
        evaluate(exps.element(i++), env);
    }
    // exp.element(i) returns null if the list is empty which is why we don't check for that.
    return evaluate(exps.element(i), env);
}

// TODO Change from Object to List.
function evlis(exps: Object, env: Environment) {
    const vals = new List();
    if (!atom(exps)) {
        for (let i = 0; i < exps.length; ++i) {
            vals.push(evaluate(exps.element(i), env));
        }
    }

    return vals;
}

function apply(fn: Object, values: List): Object {
    if (func(fn)) {
        return fn.apply(values);
    }
    throw new Error("Not a function.");
}
