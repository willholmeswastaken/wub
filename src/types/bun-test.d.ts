declare module "bun:test" {
  export function test(name: string, fn: () => unknown): void;
  export function expect(value: unknown): {
    toBe(expected: unknown): void;
    toEqual(expected: unknown): void;
    toHaveLength(expected: number): void;
    toMatch(expected: RegExp | string): void;
    toContain(expected: unknown): void;
    toBeNull(): void;
    resolves: {
      toEqual(expected: unknown): Promise<void>;
      toBe(expected: unknown): Promise<void>;
      toBeNull(): Promise<void>;
    };
  };
}
