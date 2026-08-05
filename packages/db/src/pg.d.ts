declare module 'pg' {
  export interface QueryResultRow {
    [column: string]: any;
  }

  export interface QueryResult<R extends QueryResultRow = any> {
    rows: R[];
    rowCount: number | null;
    command: string;
    oid: number;
    fields: any[];
  }

  export interface PoolClient {
    query<R extends QueryResultRow = any, I extends any[] = any[]>(
      queryText: string,
      values?: I
    ): Promise<QueryResult<R>>;
    release(err?: boolean | Error): void;
  }

  export class Pool {
    constructor(config?: any);
    query<R extends QueryResultRow = any, I extends any[] = any[]>(
      queryText: string,
      values?: I
    ): Promise<QueryResult<R>>;
    connect(): Promise<PoolClient>;
    end(): Promise<void>;
  }
}
