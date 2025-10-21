import "vitest";

interface CustomMatchers<R = unknown> {
    toMatchList: (expected: any[]) => R;
    toMatchEmptySymbol: (expected: string) => R;
}

declare module "vitest" {
    interface Matchers<T = any> extends CustomMatchers<T> {}
}
