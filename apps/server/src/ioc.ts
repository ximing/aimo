import { fileURLToPath } from 'url';
import glob from 'glob';
import { parse } from 'path';

import { config } from './config/config.js';

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
    console.log('isProduction', isProduction, filePaths);
    for (const fileName of filePaths) {
      try {
        const module = await import(fileName);
        console.log(module.name, module);
      } catch (error: any) {
        console.error(`Failed to import ${fileName}: ${error.message}`);
      }
    }
  }
}
