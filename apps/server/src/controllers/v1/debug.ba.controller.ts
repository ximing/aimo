import { Get, JsonController, QueryParam, UseBefore } from 'routing-controllers';
import { Service } from 'typedi';

import { ErrorCode } from '../../constants/error-codes.js';
import { baAuthInterceptor } from '../../middlewares/ba-auth.interceptor.js';
import { LanceDbService } from '../../sources/lancedb.js';
import { logger } from '../../utils/logger.js';
import { ResponseUtil as ResponseUtility } from '../../utils/response.js';

/**
 * BA Authentication Debug Controller
 *
 * Provides debug endpoints for inspecting LanceDB tables.
 * Requires BA authentication (set BA_AUTH_ENABLED=true and BA_AUTH_TOKEN in environment).
 *
 * Endpoints:
 * - GET /api/v1/debug/ba/schema?table=xxx - Get table schema
 * - GET /api/v1/debug/ba/data?table=xxx&page=1&pageSize=10 - Get paginated table data
 */
@Service()
@JsonController('/api/v1/debug/ba')
@UseBefore(baAuthInterceptor)
export class DebugBAController {
  constructor(private lanceDbService: LanceDbService) {}

  /**
   * Get table schema
   * GET /api/v1/debug/ba/schema?table=memos
   */
  @Get('/schema')
  async getTableSchema(@QueryParam('table') tableName: string) {
    if (!tableName) {
      return ResponseUtility.error(ErrorCode.PARAMS_ERROR, 'Table name is required');
    }

    try {
      const table = await this.lanceDbService.openTable(tableName);
      const schema = await table.schema();

      // Convert schema to readable format
      const fields = schema.fields.map((field) => ({
        name: field.name,
        type: field.type.toString(),
        nullable: field.nullable,
      }));

      logger.debug('Get table schema via BA', { tableName, fieldCount: fields.length });

      return ResponseUtility.success({
        tableName,
        fields,
      });
    } catch (error) {
      logger.error('Failed to get table schema via BA', {
        tableName,
        error: error instanceof Error ? error.message : String(error),
      });
      return ResponseUtility.error(ErrorCode.NOT_FOUND, `Table '${tableName}' not found or error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get paginated table data
   * GET /api/v1/debug/ba/data?table=memos&page=1&pageSize=10
   */
  @Get('/data')
  async getTableData(
    @QueryParam('table') tableName: string,
    @QueryParam('page') page: number = 1,
    @QueryParam('pageSize') pageSize: number = 10
  ) {
    if (!tableName) {
      return ResponseUtility.error(ErrorCode.PARAMS_ERROR, 'Table name is required');
    }

    // Validate pagination parameters
    if (page < 1) {
      return ResponseUtility.error(ErrorCode.PARAMS_ERROR, 'Page must be >= 1');
    }
    if (pageSize < 1 || pageSize > 1000) {
      return ResponseUtility.error(ErrorCode.PARAMS_ERROR, 'PageSize must be between 1 and 1000');
    }

    try {
      const table = await this.lanceDbService.openTable(tableName);
      const schema = await table.schema();

      // Calculate offset
      const offset = (page - 1) * pageSize;

      // Query with pagination
      const results = await table.query().limit(pageSize).offset(offset).toArray();

      // Get total count (LanceDB doesn't have count, so we need to scan)
      // For debug purposes, we'll just return the current page
      const data = results.map((row) => {
        const object: Record<string, unknown> = {};
        for (const field of schema.fields) {
          object[field.name] = (row as Record<string, unknown>)[field.name];
        }
        return object;
      });

      logger.debug('Get table data via BA', {
        tableName,
        page,
        pageSize,
        offset,
        resultCount: data.length,
      });

      return ResponseUtility.success({
        tableName,
        page,
        pageSize,
        offset,
        data,
        count: data.length,
      });
    } catch (error) {
      logger.error('Failed to get table data via BA', {
        tableName,
        page,
        pageSize,
        error: error instanceof Error ? error.message : String(error),
      });
      return ResponseUtility.error(ErrorCode.NOT_FOUND, `Table '${tableName}' not found or error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}
