/**
 * Mock LanceDB Service
 *
 * Provides a mock implementation of LanceDbService for testing
 * Only implements the methods actually used by MemoService
 */

import { generateTestId } from '../test-setup.js';

export class MockLanceDbService {
  private tables: Map<string, any[]> = new Map();

  async init(): Promise<void> {
    // Initialize empty tables
    this.tables.set('memos', []);
    this.tables.set('users', []);
    this.tables.set('attachments', []);
    this.tables.set('memo_relations', []);
  }

  async openTable(tableName: string): Promise<MockTable> {
    if (!this.tables.has(tableName)) {
      this.tables.set(tableName, []);
    }
    return new MockTable(this.tables.get(tableName)!);
  }

  async isInitialized(): Promise<boolean> {
    return true;
  }

  async healthCheck(): Promise<boolean> {
    return true;
  }

  async close(): Promise<void> {
    // No-op for tests
  }

  /**
   * Pre-populate table with data
   */
  setTableData(tableName: string, data: any[]): void {
    this.tables.set(tableName, data);
  }

  /**
   * Get table data
   */
  getTableData(tableName: string): any[] {
    return this.tables.get(tableName) || [];
  }
}

/**
 * Mock LanceDB Table
 * Implements the minimal interface used by MemoService
 */
class MockTable {
  constructor(private data: any[]) {}

  async query(): Promise<MockQuery> {
    return new MockQuery(this.data);
  }

  async add(data: any[]): Promise<any> {
    this.data.push(...data);
    return { added: data.length };
  }

  async delete(filters: any): Promise<any> {
    // Simple implementation - would need more sophisticated filtering in real tests
    const initialLength = this.data.length;
    this.data = this.data.filter((item) => !this.matchesFilter(item, filters));
    return { deleted: initialLength - this.data.length };
  }

  async update(filters: any, data: any): Promise<any> {
    // Simple implementation
    let updated = 0;
    for (const item of this.data) {
      if (this.matchesFilter(item, filters)) {
        Object.assign(item, data);
        updated++;
      }
    }
    return { updated };
  }

  async countRows(): Promise<number> {
    return this.data.length;
  }

  private matchesFilter(item: any, filters: any): boolean {
    if (!filters) return true;
    for (const key of Object.keys(filters)) {
      if (item[key] !== filters[key]) {
        return false;
      }
    }
    return true;
  }
}

/**
 * Mock Query Builder
 */
class MockQuery {
  constructor(private data: any[]) {}

  where(filters: any): this {
    if (filters) {
      this.data = this.data.filter((item) => this.matchesFilter(item, filters));
    }
    return this;
  }

  select(columns?: string[]): this {
    if (columns) {
      this.data = this.data.map((item) => {
        const selected: any = {};
        for (const col of columns) {
          if (item[col] !== undefined) {
            selected[col] = item[col];
          }
        }
        return selected;
      });
    }
    return this;
  }

  limit(n: number): this {
    this.data = this.data.slice(0, n);
    return this;
  }

  offset(n: number): this {
    this.data = this.data.slice(n);
    return this;
  }

  sortBy(column: string, order: 'asc' | 'desc' = 'asc'): this {
    this.data.sort((a, b) => {
      if (a[column] < b[column]) return order === 'asc' ? -1 : 1;
      if (a[column] > b[column]) return order === 'asc' ? 1 : -1;
      return 0;
    });
    return this;
  }

  async toArray(): Promise<any[]> {
    return Promise.resolve([...this.data]);
  }

  private matchesFilter(item: any, filters: any): boolean {
    if (!filters) return true;
    for (const key of Object.keys(filters)) {
      if (item[key] !== filters[key]) {
        return false;
      }
    }
    return true;
  }
}

/**
 * Create mock LanceDB data for testing
 */
export function createMockMemoVectorData(count: number = 5): Array<{ id: string; uid: string; content: string; vector: number[] }> {
  return Array.from({ length: count }, (_, i) => ({
    id: generateTestId(`memo_${i}`),
    uid: 'test_user',
    content: `Test memo content ${i}`,
    vector: Array(1536).fill(0).map(() => Math.random()),
  }));
}
