import { parse } from 'node:path';
import { fileURLToPath } from 'node:url';

import glob from 'glob';

import { config } from './config/config.js';
import { logger } from './utils/logger.js';

const __dirname = parse(fileURLToPath(import.meta.url)).dir;
const isProduction = config.env !== 'development';

function findFileNamesFromGlob(globString: string) {
  return glob.sync(globString);
}

export async function initIOC() {
  for (const globString of [
    `${__dirname}/cron/**/*.${isProduction ? 'js' : 'ts'}`,
    `${__dirname}/modules/**/*.${isProduction ? 'js' : 'ts'}`,
    `${__dirname}/sources/**/*.${isProduction ? 'js' : 'ts'}`,
    `${__dirname}/controllers/**/*.${isProduction ? 'js' : 'ts'}`,
    `${__dirname}/services/**/*.${isProduction ? 'js' : 'ts'}`,
  ]) {
    const filePaths = findFileNamesFromGlob(globString);
    logger.info('IOC: Loading files', { isProduction, count: filePaths.length });
    for (const fileName of filePaths) {
      try {
        const module = await import(fileName);
        logger.debug(module.name, { module });
      } catch (error: any) {
        logger.error(`Failed to import ${fileName}: ${error.message}`);
      }
    }
  }
}
