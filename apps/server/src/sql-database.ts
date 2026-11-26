/** Statement, transaction and admission contract for PostgreSQL tools and storage owners. */
export interface SqlDatabase {
  /** Transport grouping for explicitly independent writes; transaction semantics are unchanged. */
  readonly writeGroups: boolean;
  /** Synchronous health of the session owning the exclusive world-writer lock. */
  assertWriteAdmission(): void;
  /** Undefined adapters cannot prove whether shared committed reads are safe. */
  readonly transactionActive?: boolean;
  transaction<T>(operation: () => Promise<T>): Promise<T>;
  maintenanceTransaction?<T>(operation: () => Promise<T>): Promise<T>;
  readTransaction?<T>(operation: () => Promise<T>): Promise<T>;
  /** Native bootstrap owns each selected SQL transfer before the driver
   * allocates rows. The caller retains that custody through consumption. */
  withReadTransferAdmission?<T>(
    admit: (bytes: number, rows: number) => void,
    operation: () => Promise<T>,
  ): Promise<T>;
  withoutReadTransferAdmission?<T>(operation: () => T): T;
  afterCommit?(callback: () => void): void;
  afterRollback?(callback: () => void): void;
  exec(sql: string): Promise<void>;
  prepare(sql: string): {
    get(...params: any[]): Promise<Record<string, unknown> | undefined>;
    all(...params: any[]): Promise<Record<string, unknown>[]>;
    run(...params: any[]): Promise<unknown>;
  };
  close(): Promise<void>;
}
