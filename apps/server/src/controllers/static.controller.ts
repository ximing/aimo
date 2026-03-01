import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { Controller, Get, Res } from 'routing-controllers';
import { Service } from 'typedi';

import { logger } from '../utils/logger.js';

import type { Response } from 'express';

const __filename = fileURLToPath(import.meta.url);
const __dirname = join(__filename, '..');

@Service()
@Controller()
export class StaticController {
  private indexPath: string;

  constructor() {
    // Path to index.html from the web build
    this.indexPath = join(__dirname, '../../public/index.html');
  }

  /**
   * Serve index.html for non-API routes (SPA routing)
   * This should be registered AFTER all API routes
   */
  @Get('*')
  serveIndex(@Res() res: Response) {
    try {
      if (existsSync(this.indexPath)) {
        const html = readFileSync(this.indexPath, 'utf-8');
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        return res.send(html);
      }

      return res
        .status(404)
        .send('Not Found: index.html not found. Make sure web application is built.');
    } catch (error) {
      logger.error('Error serving index.html:', error);
      return res.status(500).send('Internal Server Error');
    }
  }
}
