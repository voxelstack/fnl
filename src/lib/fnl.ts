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

function atom   (o: Object): o is Atom    { return !Array.isArray(o);      }
function symbol (o: Object): o is Symbol  { return o instanceof Symbol;    }
function number (o: Object): o is number  { return typeof o === "number";  }
function string (o: Object): o is string  { return typeof o === "string";  }
function boolean(o: Object): o is boolean { return typeof o === "boolean"; }
