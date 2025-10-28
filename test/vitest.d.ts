import "vitest";

interface CustomMatchers<R = unknown> {
    toMatchList: (expected: any[]) => R;
    toMatchEmptySymbol: (expected: string) => R;
    toMatchDictionary: (expected: Record<string | number, any> | Map<any, any>) => R;
    toMatchSet: (expected: any[]) => R;
}

declare module "vitest" {
    interface Matchers<T = any> extends CustomMatchers<T> {}
}
