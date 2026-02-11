import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// 获取当前环境
const env = process.env.NODE_ENV || 'development';

// 获取项目根路径
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../..');

// 加载环境变量
const loadEnv = () => {
  // 基础配置文件
  const baseEnvPath = path.resolve(projectRoot, '.env');
  console.log('Base env path:', baseEnvPath);
  // 环境特定的配置文件
  const envPath = path.resolve(projectRoot, `.env.${env}`);

  console.log('Loading environment variables...');
  console.log('Base env path:', baseEnvPath);
  console.log('Environment specific path:', envPath);

  // 先加载基础配置
  const baseResult = dotenv.config({ path: baseEnvPath });
  if (baseResult.error) {
    console.log('No base .env file found');
  } else {
    console.log('Base .env file loaded');
  }

  // 再加载环境特定配置（会覆盖基础配置中的同名变量）
  const envResult = dotenv.config({ path: envPath });
  if (envResult.error) {
    console.log(`No ${env} specific .env file found`);
  } else {
    console.log(`${env} specific .env file loaded`);
  }
};

export { loadEnv };
