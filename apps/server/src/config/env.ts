import path from 'node:path';
import { fileURLToPath } from 'node:url';

import dotenv from 'dotenv';

// 获取当前环境
const environment = process.env.NODE_ENV || 'development';

// 获取项目根路径
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../..');

// 加载环境变量
const loadEnvironment = () => {
  // 基础配置文件
  const baseEnvironmentPath = path.resolve(projectRoot, '.env');
  console.log('Base env path:', baseEnvironmentPath);
  // 环境特定的配置文件
  const environmentPath = path.resolve(projectRoot, `.env.${environment}`);

  console.log('Loading environment variables...');
  console.log('Base env path:', baseEnvironmentPath);
  console.log('Environment specific path:', environmentPath);

  // 先加载基础配置
  const baseResult = dotenv.config({ path: baseEnvironmentPath });
  if (baseResult.error) {
    console.log('No base .env file found');
  } else {
    console.log('Base .env file loaded');
  }

  // 再加载环境特定配置（会覆盖基础配置中的同名变量）
  const environmentResult = dotenv.config({ path: environmentPath });
  if (environmentResult.error) {
    console.log(`No ${environment} specific .env file found`);
  } else {
    console.log(`${environment} specific .env file loaded`);
  }
};

export { loadEnvironment as loadEnv };
