import { Controller, Get, Res } from 'routing-controllers';
import { Service } from 'typedi';
import type { Response } from 'express';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';

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
        res.send(html);
      } else {
        res.status(404).send('Not Found: index.html not found. Make sure web application is built.');
      }
    } catch (error) {
      console.error('Error serving index.html:', error);
      res.status(500).send('Internal Server Error');
    }
  }
}
