declare module "bun:test" {
  export function test(name: string, fn: () => unknown): void;
  export function expect(value: unknown): {
    toBe(expected: unknown): void;
  };
}
