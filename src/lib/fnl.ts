type Literal = string | number | boolean | null
type List = [string, Expression[]]
type Expression = Literal | List

export class ParseError extends Error {
    constructor(source: string, cursor: number) {
        const snippet = source.slice(Math.max(cursor - 16, 0), cursor + 16);
        const pointer = Array(Math.min(cursor, 16)).fill(" ").join("") + "^";
        super(`Unexpected token:\n${snippet}\n${pointer}`);
    }
}

export function parse(source: string) {
    let cursor = 0;

    const result = parseExpression();
    skipWhitespace();
    if (!isEof()) {
        throw new ParseError(source, cursor);
    }

    function peek() {
        return source[cursor];
    }

    function isSymbol(char: string) {
        return "+-*/!@#$%^&=|:?<>.".includes(char);
    }

    function isAlpha(char: string) {
        return (char >= "a" && char <= "z") ||
               (char >= "A" && char <= "Z") ||
               (char == "_");
    }

    function isNumeric(char: string) {
        return char >= "0" && char <= "9";
    }

    function isAlphaNumeric(char: string) {
        return isAlpha(char) || isNumeric(char);
    }

    function take() {
        return source[cursor++];
    }

    function isEof() {
        return cursor >= source.length;
    }

    function isWhitespace(char: string) {
        return (/\s/.test(char));
    }

    function isTerminator() {
        return isEof() || isWhitespace(peek()) || peek() === ")";
    }

    function enforceTerminator() {
        if (!isTerminator()) {
            throw new ParseError(source, cursor);
        }
    }

    function skipWhitespace() {
        while (isWhitespace(peek())) { take(); }
    }

    function parseExpression() {
        skipWhitespace();
        if (peek() === "(") {
            return parseList();
        } else {
            return parseLiteral();
        }
    }

    function parseList() {
        take(); // (
        skipWhitespace();

        const list: List = [
            parseFunc(),
            parseParams(),
        ];

        skipWhitespace();
        take(); // )

        return list;
    }

    function parseFunc() {
        let func = "";
        if (isSymbol(peek())) {
            while (isSymbol(peek())) {
                func += take();
            }
        } else if (isAlpha(peek())) {
            while (isAlphaNumeric(peek())) {
                func += take();
            }
        }

        return func;
    }

    function parseParams() {
        const params: Expression[] = [];

        enforceTerminator();
        skipWhitespace();

        while (!isEof() && peek() !== ")") {
            params.push(parseExpression());
            enforceTerminator();
            skipWhitespace();
        }

        if (peek() !== ")") {
            throw new ParseError(source, cursor);
        }
        skipWhitespace();

        return params;
    }

    function parseLiteral() {
        const char = peek();
        if (char === "\"") {
            return parseString();
        } else if (isNumeric(char) || char === "-") {
            return parseNumber();
        } else if (char === "n") {
            return parseNil();
        } else if (char === "t" || char === "f") {
            return parseBoolean();
        } else {
            throw new ParseError(source, cursor);
        }
    }

    function parseString() {
        take(); // "

        let str = "";
        while (!isEof() && peek() !== "\"") {
            if (peek() === "\\") {
                take();
                if (isEof()) {
                    break;
                }
            }
            str += take();
        }
        if (isEof() || peek() !== "\"") {
            throw new ParseError(source, cursor);
        }

        take(); // "

        return str;
    }

    function parseNumber() {
        let sign = 1;
        if (peek() === "-") {
            sign = -1;
            take();
        }

        let num = "";
        while (isNumeric(peek())) {
            num += take();
        }

        if (isTerminator()) {
            return parseInt(num) * sign;
        }

        if (peek() !== ".") {
            throw new ParseError(source, cursor);
        }
        num += take();

        if (!isNumeric(peek())) {
            throw new ParseError(source, cursor);
        }

        while (isNumeric(peek())) {
            num += take();
        }

        return parseFloat(num) * sign;
    }

    function matchString(str: string) {
        for (const char of str) {
            if (peek() !== char) {
                throw new ParseError(source, cursor);
            }
            take();
        }
    }

    function parseNil() {
        matchString("nil");
        return null;
    }

    function parseBoolean() {
        if (peek() === "t") {
            matchString("true");
            return true;
        }

        matchString("false");
        return false;
    }

    return result;
}

export function evaluate(expr: Expression) {
    
}
