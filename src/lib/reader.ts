export class Reader<T> {
    private readonly collection: T[];
    private nextIndex: number;

    constructor(collection: T[]) {
        this.collection = collection;
        this.nextIndex = 0;
    }

    public get cursor() {
        return this.nextIndex;
    }

    public get done(): boolean {
        return this.nextIndex >= this.collection.length;
    }

    next(): T {
        if (this.done) {
            throw new Error("Called next on a finished reader.");
        }
        return this.collection[this.nextIndex++];
    }

    peek(lookahead = 0): T | undefined {
        return this.collection[this.nextIndex + lookahead];
    }

    advance(n = 1) {
        this.nextIndex += n;
    }
}
