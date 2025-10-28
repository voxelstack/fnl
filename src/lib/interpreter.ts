import type { Continuation, Expression } from "./types";

export function evaluate_k(exp: Expression, env: Environment, k: Continuation) {
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
                }, {} as Record<string, Expression>), env);
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
            } else if (car.name === "assign") {
                if (env.root) {
                    throw new Error("Cannot assign globals.");
                }
                if (exp.length !== 3 || !symbol(exp[1])) {
                    throw new Error("Malformed assign.");
                }
                if (!env.has(exp[1])) {
                    throw new Error(`Unbound variable ${exp[1].name}.`);
                }
                const key = exp[1];
                evaluate_k(exp[2], env, (value) => {
                    env.set(key, value);
                    k(value);
                });
            } else if (car.name === "def") {
                if (exp.length !== 3 || !symbol(exp[1])) {
                    throw new Error("Malformed def.");
                }
                if (env.has(exp[1])) {
                    throw new Error("Cannot redefine.");
                }
                const key = exp[1];
                evaluate_k(exp[2], env, (value) => {
                    env.set(key, value);
                    k(value);
                });
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
            } else if (car.name === "set") {
                const set = new HashSet();
                for (let i = 1; i < exp.length; ++i) {
                    evaluate_k(exp[i], env, (key) => {
                        set.add(key);
                    });
                }
                k(set);
            } else if (car.name === "async") {
                k(new Async((resolve) => {
                    prog(exp.slice(1), env, resolve);
                }));
            } else if (car.name === "await") {
                if (exp.length !== 2) {
                    throw new Error("Malformed await.");
                }
                // TODO Not 100% sure about this, but it's good enough for now.
                evaluate_k(exp[1], env, (a) => {
                    if (!promise(a)) {
                        throw new Error("Only async blocks can be awaited.");
                    }
                    a.then(k);
                });
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

export class Environment {
    private readonly data: Map<string, Expression>;
    private parent?: Environment;

    constructor(parent?: Environment) {
        this.data = new Map();
        this.parent = parent;
    }

    static empty(parent?: Environment) {
        return new Environment(parent);
    }

    static from(vars: Record<string, Expression>, parent?: Environment) {
        const env = Environment.empty(parent);
        for (const [key, value] of Object.entries(vars)) {
            env.set(Identifier.empty(key), value);
        }
        return env;
    }

    public get root() {
        return this.parent === undefined;
    }

    public extend(parent: Environment) {
        let child: Environment = this;
        while (child.parent !== undefined) {
            child = child.parent;
        }
        child.parent = parent;
    }

    public delete(key: Identifier): boolean {
        return this.data.delete(key.name) || !!this.parent?.delete(key);
    }

    public get(key: Identifier): Expression | undefined {
        return this.data.get(key.name) ?? this.parent?.get(key);
    }

    public has(key: Identifier): boolean {
        return this.data.has(key.name) || !!this.parent?.has(key);
    }

    public set(key: Identifier, value: Expression): Expression {
        this.data.set(key.name, value);
        return value;
    }
}

export abstract class Procedure {
    public abstract get arity(): number;

    protected assertArity(values: List) {
        if (values.length !== this.arity) {
            throw new Error("Invalid arity.");
        }
    }

    public abstract apply(values: List, k: Continuation): void;
}

export class NativeFunction extends Procedure {
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

export class Lambda extends Procedure {
    private readonly variables: Identifier[];
    private readonly body: List;
    private readonly env: Environment;

    constructor(variables: List, body: List, env: Environment) {
        super();

        this.variables = variables.map((el) => {
            if (!(el instanceof Identifier)) {
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

export class Identifier {
    public readonly name: string;

    constructor(name: string) {
        this.name = name.toLowerCase();
    }

    public static empty(name: string) {
        return new Identifier(name);
    }
}

export class List extends Array<Expression> {

}

export class HashSet extends Set<Expression> {

}

export type Key = Exclude<Expression, null>;
export class Dictionary extends Map<Key, Expression> {

}

export class Async extends Promise<Expression> {

}

export function prog(exps: List, env: Environment, k: Continuation): void {
    if (exps.length === 0) {
        k(null);
    } else if (exps.length === 1) {
        evaluate_k(exps[0], env, k);
    } else {
        evaluate_k(exps[0], env, () => {
            prog(exps.slice(1), env, k);
        });
    }
}

function evlis(exps: List, env: Environment, k: (vals: List) => void) {
    if (exps.length === 0) {
        k([]);
    } else {
        evaluate_k(exps[0], env, (val) => {
            evlis(exps.slice(1), env, (vals) => k([val, ...vals]));
        });
    }
}

function apply(fn: Expression, args: List, env: Environment, k: Continuation) {
    evaluate_k(fn, env, (fn) => {
        if (func(fn)) {
            evlis(args, env, (vals) => {
                fn.apply(vals, k);
            });
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

function list(o: Expression): o is List { return o instanceof List; }
function symbol(o: Expression): o is Identifier { return o instanceof Identifier; }
function boolean(o: Expression): o is boolean { return typeof o === "boolean"; }
function func(o: Expression): o is Procedure { return o instanceof Procedure; }
function continuation(o: Expression): o is Continuation { return typeof o === "function" };
function promise(o: Expression): o is Async { return o instanceof Async; }
