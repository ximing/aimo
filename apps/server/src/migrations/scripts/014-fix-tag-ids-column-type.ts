/**
 * Migration v14: Fix tagIds column type for memos table
 * Ensures tagIds column is List<Utf8> instead of Null
 */

import { Type } from 'apache-arrow';

import type { Migration } from '../types.js';
import type { Connection } from '@lancedb/lancedb';

const TAG_IDS_DEFAULT_SQL = "arrow_cast(NULL, 'List(Utf8)')";

/**
 * Migration to fix tagIds column type if it was created as Null
 */
export const fixTagIdsColumnTypeMigration: Migration = {
  version: 14,
  tableName: 'memos',
  description: 'Fix tagIds column type to List<Utf8> when inferred as Null',
  up: async (connection: Connection) => {
    const memosTable = await connection.openTable('memos');
    const schema = await memosTable.schema();
    const tagIdsField = schema.fields.find((field) => field.name === 'tagIds');

    if (!tagIdsField) {
      await memosTable.addColumns([
        {
          name: 'tagIds',
          valueSql: TAG_IDS_DEFAULT_SQL,
        },
      ]);
      return;
    }

    if (tagIdsField.type.typeId === Type.List) {
      return;
    }

    if (tagIdsField.type.typeId === Type.Null) {
      await memosTable.dropColumns(['tagIds']);
      await memosTable.addColumns([
        {
          name: 'tagIds',
          valueSql: TAG_IDS_DEFAULT_SQL,
        },
      ]);
      return;
    }

    throw new Error(`Unexpected tagIds column type: ${tagIdsField.type.toString()}`);
  },
};
