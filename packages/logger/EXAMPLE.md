# @osgfe/logger 使用示例

## 基础使用

```typescript
import { Log } from '@osgfe/logger';

// 创建日志记录器实例
const logger = new Log({
  projectName: 'my-awesome-tool',
});

// 输出不同级别的日志
logger.trace('这是跟踪级别的日志');
logger.debug('这是调试级别的日志');
logger.info('应用启动成功');
logger.warn('警告：某些资源可能不可用');
logger.error('发生了一个错误');

// 带上下文信息的日志
logger.info('用户登录', { userId: 123, ip: '192.168.1.1' });
logger.error('数据库连接失败', {
  host: 'localhost',
  port: 5432,
  error: 'timeout',
});
```

## 自定义配置

```typescript
import { Log } from '@osgfe/logger';

const logger = new Log({
  projectName: 'big-data-processor',
  level: 'debug', // 日志级别：trace, debug, info, warn, error
  logDir: '/var/log/osg', // 自定义日志目录
  console: true, // 是否输出到终端
  maxSize: '100m', // 单个文件最大大小
  maxFiles: '30d', // 日志文件保留期限
});

logger.debug('处理开始');
// ... 处理逻辑
logger.info('处理完成', { processed: 10000 });

// 关闭日志记录器
logger.close();
```

## 多实例使用

```typescript
import { Log } from '@osgfe/logger';

// 为不同的模块创建不同的日志实例
const appLogger = new Log({
  projectName: 'app-core',
});

const taskLogger = new Log({
  projectName: 'scheduled-task',
});

appLogger.info('核心服务运行中');
taskLogger.info('定时任务已启动');
```

## 环境变量配置

支持以下环境变量来覆盖默认配置：

- `OSG_LOGGER_LEVEL` - 日志级别 (trace, debug, info, warn, error)
- `OSG_LOGGER_DIR` - 日志存储目录
- `OSG_LOGGER_CONSOLE` - 是否输出到终端 (true/false)

```bash
# 在 shell 中使用
export OSG_LOGGER_LEVEL=debug
export OSG_LOGGER_DIR=/custom/log/path
export OSG_LOGGER_CONSOLE=false

node app.js
```

## 日志输出

### 终端输出示例

```
[2026-01-21 10:30:45] info: 应用启动成功
[2026-01-21 10:30:46] error: 发生了一个错误 {"code":500,"message":"Internal Server Error"}
```

### 文件输出示例

日志文件存储在 `~/.osg/logs/{projectName}/` 下，格式为：

```
{projectName}-YYYY-MM-DD.log
{projectName}-YYYY-MM-DD-01.log  (文件过大时自动分割)
```

文件内容为 JSON 格式：

```json
{"level":"info","message":"应用启动成功","timestamp":"2026-01-21 10:30:45"}
{"level":"error","message":"发生了一个错误","code":500,"timestamp":"2026-01-21 10:30:46"}
```

## API 参考

### Log 类

#### 构造方法

```typescript
constructor(options: LoggerOptions)
```

#### 日志方法

- `trace(message: string, ...meta: any[]): void`
- `debug(message: string, ...meta: any[]): void`
- `info(message: string, ...meta: any[]): void`
- `warn(message: string, ...meta: any[]): void`
- `error(message: string, ...meta: any[]): void`

#### 其他方法

- `getConfig(): ResolvedConfig` - 获取当前配置
- `getWinstonLogger(): winston.Logger` - 获取底层的 Winston Logger 实例
- `flush(): Promise<void>` - 等待所有待处理的日志写入
- `close(): void` - 关闭日志记录器

## 配置选项

```typescript
interface LoggerOptions {
  // 项目名称（必填）
  projectName: string;

  // 日志级别（默认：'info'）
  level?: 'trace' | 'debug' | 'info' | 'warn' | 'error';

  // 日志存储目录（默认：~/.osg/logs/{projectName}/）
  logDir?: string;

  // 是否输出到终端（默认：true）
  console?: boolean;

  // 单个日志文件最大大小（默认：'10m'）
  maxSize?: string;

  // 日志文件保留策略（默认：'14d'）
  maxFiles?: string | number;
}
```

## 最佳实践

1. **为每个模块/服务创建专用的 Logger 实例**

   ```typescript
   const logger = new Log({ projectName: 'my-service' });
   ```

2. **使用不同的日志级别来区分严重程度**
   - `trace` - 最详细的诊断信息
   - `debug` - 调试信息
   - `info` - 普通信息
   - `warn` - 警告信息
   - `error` - 错误信息

3. **在关键代码路径中添加上下文信息**

   ```typescript
   logger.info('操作完成', {
     operationId: uuid,
     duration: elapsed,
     status: 'success',
   });
   ```

4. **在应用关闭时优雅地关闭日志**

   ```typescript
   process.on('SIGTERM', () => {
     logger.info('应用正在关闭');
     logger.flush().then(() => {
       logger.close();
       process.exit(0);
     });
   });
   ```

5. **在生产环境中关闭终端输出以提高性能**
   ```typescript
   const logger = new Log({
     projectName: 'prod-service',
     console: process.env.NODE_ENV !== 'production',
   });
   ```
