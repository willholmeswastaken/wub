declare module "bun:sqlite" {
  export class Database {
    constructor(path: string);
    exec(sql: string): void;
    query(sql: string): {
      all(...params: unknown[]): unknown[];
      get(...params: unknown[]): unknown;
      run(...params: unknown[]): { changes: number };
    };
  }
}
