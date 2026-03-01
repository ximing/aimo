import { JsonController, Get, Res } from 'routing-controllers';
import { Service } from 'typedi';

import { DrizzleAdapter } from '../../sources/database/drizzle-adapter.js';
import { LanceDbService } from '../../sources/lancedb.js';

import type { Response } from 'express';

interface HealthCheckResult {
  drizzle: 'ok' | string;
  lancedb: 'ok' | string;
}

@Service()
@JsonController('/health')
export class HealthController {
  constructor(
    private drizzleAdapter: DrizzleAdapter,
    private lanceDbService: LanceDbService
  ) {}

  /**
   * Database health check endpoint
   * Checks Drizzle and LanceDB connections
   * Returns 200 if both healthy, 503 if either fails
   */
  @Get('/db')
  async checkDatabaseHealth(@Res() res: Response): Promise<HealthCheckResult> {
    const result: HealthCheckResult = {
      drizzle: 'ok',
      lancedb: 'ok',
    };

    // Check Drizzle connection
    try {
      const drizzleHealthy = await this.drizzleAdapter.healthCheck();
      if (!drizzleHealthy) {
        result.drizzle = 'failed';
      }
    } catch (error) {
      result.drizzle = error instanceof Error ? error.message : 'failed';
    }

    // Check LanceDB connection
    try {
      const lancedbHealthy = await this.lanceDbService.healthCheck();
      if (!lancedbHealthy) {
        result.lancedb = 'failed';
      }
    } catch (error) {
      result.lancedb = error instanceof Error ? error.message : 'failed';
    }

    // Return appropriate status based on results
    const allHealthy = result.drizzle === 'ok' && result.lancedb === 'ok';

    if (!allHealthy) {
      return res.status(503).json(result) as unknown as HealthCheckResult;
    }

    return result;
  }
}
