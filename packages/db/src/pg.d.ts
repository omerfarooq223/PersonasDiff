declare module 'pg' {
  export interface QueryResultRow {
    [column: string]: unknown;
  }

  export interface QueryResult<R = Record<string, unknown>> {
    rows: R[];
    rowCount: number | null;
    command: string;
    oid: number;
    fields: unknown[];
  }

  export interface PoolClient {
    query<R = Record<string, unknown>, I extends unknown[] = unknown[]>(
      queryText: string,
      values?: I,
    ): Promise<QueryResult<R>>;
    release(err?: boolean | Error): void;
  }

  export class Pool {
    constructor(config?: unknown);
    query<R = Record<string, unknown>, I extends unknown[] = unknown[]>(
      queryText: string,
      values?: I,
    ): Promise<QueryResult<R>>;
    connect(): Promise<PoolClient>;
    end(): Promise<void>;
  }
}
