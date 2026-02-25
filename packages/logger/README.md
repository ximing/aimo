# @osgfe/logger

> Node.js 服务端日志库，支持日志分级、文件切割、多输出渠道

基于 Winston 构建的企业级日志解决方案，提供开箱即用的日志管理功能。

## 特性

- 🎯 **多级别日志** - 支持 trace、debug、info、warn、error 五个级别
- 📁 **自动文件切割** - 按日期和文件大小自动切割日志
- 🎨 **终端彩色输出** - 开发环境友好的日志显示
- ⚙️ **灵活配置** - 支持配置文件和环境变量两种方式
- 🔄 **优雅关闭** - 提供 flush 方法确保日志完整写入
- 📦 **开箱即用** - 零配置即可使用，仅需提供项目名称

## 安装

```bash
npm install @osgfe/logger
# or
pnpm add @osgfe/logger
```

## 快速开始

```typescript
import { Log } from '@osgfe/logger';

// 创建日志实例（最简配置）
const logger = new Log({
  projectName: 'my-app',
});

// 记录日志
logger.info('应用启动成功');
logger.warn('资源使用率较高', { cpu: 85, memory: 90 });
logger.error('数据库连接失败', new Error('Connection timeout'));
```

## 基础用法

### 日志级别

```typescript
logger.trace('跟踪信息'); // 最详细的调试信息
logger.debug('调试信息'); // 开发调试信息
logger.info('普通信息'); // 常规运行信息
logger.warn('警告信息'); // 潜在问题警告
logger.error('错误信息'); // 错误和异常
```

### 带元数据的日志

```typescript
// 对象元数据
logger.info('用户登录', { userId: 123, ip: '192.168.1.1' });

// Error 对象（自动包含堆栈信息）
logger.error('处理失败', new Error('Invalid input'));

// 混合使用
logger.warn(
  '操作超时',
  {
    operation: 'fetchData',
    timeout: 5000,
  },
  '请检查网络连接'
);
```

## 配置选项

### LoggerOptions

| 参数          | 类型                                                | 默认值                      | 说明                                    |
| ------------- | --------------------------------------------------- | --------------------------- | --------------------------------------- |
| `projectName` | `string`                                            | _必填_                      | 项目名称，用于日志文件名                |
| `level`       | `'trace' \| 'debug' \| 'info' \| 'warn' \| 'error'` | `'info'`                    | 日志级别                                |
| `logDir`      | `string`                                            | `~/.osg/logs/{projectName}` | 日志存储目录                            |
| `console`     | `boolean`                                           | `true`                      | 是否输出到终端                          |
| `maxSize`     | `string`                                            | `'10m'`                     | 单个文件最大大小 (如 `'20m'`, `'100k'`) |
| `maxFiles`    | `string \| number`                                  | `'14d'`                     | 日志保留策略 (如 `'30d'`, `10`)         |

### 完整配置示例

```typescript
const logger = new Log({
  projectName: 'my-service',
  level: 'debug', // 设置日志级别
  logDir: '/var/log/my-app', // 自定义日志目录
  console: true, // 开启终端输出
  maxSize: '20m', // 文件最大 20MB
  maxFiles: '30d', // 保留 30 天
});
```

## 高级配置

### 环境变量

支持通过环境变量覆盖配置（优先级：代码配置 > 环境变量 > 默认值）：

```bash
# 设置日志级别
export OSG_LOGGER_LEVEL=debug

# 自定义日志目录
export OSG_LOGGER_DIR=/custom/log/path

# 关闭终端输出（生产环境推荐）
export OSG_LOGGER_CONSOLE=false
```

```typescript
// 环境变量会自动应用
const logger = new Log({
  projectName: 'my-app',
  // level 会使用环境变量 OSG_LOGGER_LEVEL 的值
});
```

### 多实例管理

为不同模块创建独立的日志实例：

```typescript
// 主应用日志
const appLogger = new Log({
  projectName: 'app-core',
  level: 'info',
});

// 后台任务日志
const taskLogger = new Log({
  projectName: 'scheduled-tasks',
  level: 'debug',
});

// API 请求日志
const apiLogger = new Log({
  projectName: 'api-server',
  level: 'info',
});

appLogger.info('应用启动');
taskLogger.debug('任务队列初始化');
apiLogger.info('API 服务就绪');
```

### 生产环境优化

```typescript
const isProd = process.env.NODE_ENV === 'production';

const logger = new Log({
  projectName: 'my-service',
  level: isProd ? 'info' : 'debug', // 生产环境降低日志级别
  console: !isProd, // 生产环境关闭终端输出
  logDir: isProd ? '/var/log/my-service' : undefined, // 开发环境使用默认目录
  maxSize: '50m', // 增大单文件大小
  maxFiles: '90d', // 延长保留时间
});
```

### 优雅关闭

在应用退出前确保所有日志写入完成：

```typescript
const logger = new Log({ projectName: 'my-app' });

// 监听退出信号
process.on('SIGTERM', async () => {
  logger.info('收到退出信号，准备关闭');

  // 等待所有日志写入完成
  await logger.flush();

  // 关闭日志记录器
  logger.close();

  process.exit(0);
});
```

### 获取底层 Winston 实例

如需使用 Winston 的高级功能：

```typescript
const logger = new Log({ projectName: 'my-app' });

// 获取 Winston Logger 实例
const winstonLogger = logger.getWinstonLogger();

// 使用 Winston API
winstonLogger.query({ limit: 10 }, (err, results) => {
  console.log(results);
});
```

## 日志输出格式

### 终端输出

```
[2026-01-21 10:30:45] info: 应用启动成功
[2026-01-21 10:30:46] error: 数据库连接失败 {"host":"localhost","port":5432}
```

### 文件输出

**文件名格式**：`{projectName}-YYYY-MM-DD.log`

**存储位置**：`~/.osg/logs/{projectName}/`

**内容格式**（JSON）：

```json
{"level":"info","message":"应用启动成功","timestamp":"2026-01-21 10:30:45"}
{"level":"error","message":"数据库连接失败","host":"localhost","port":5432,"timestamp":"2026-01-21 10:30:46"}
```

**自动切割**：

- 按日期切割：每天生成新文件
- 按大小切割：超过 `maxSize` 自动创建 `-01`, `-02` 等后缀文件

## API 文档

### Log 类

#### 构造方法

```typescript
constructor(options: LoggerOptions)
```

#### 日志方法

```typescript
trace(message: string, ...meta: LogMetadata[]): void
debug(message: string, ...meta: LogMetadata[]): void
info(message: string, ...meta: LogMetadata[]): void
warn(message: string, ...meta: LogMetadata[]): void
error(message: string, ...meta: LogMetadata[]): void
```

#### 工具方法

```typescript
// 获取当前配置
getConfig(): ResolvedConfig

// 获取底层 Winston Logger
getWinstonLogger(): winston.Logger

// 等待所有日志写入（超时 2 秒）
flush(): Promise<void>

// 关闭日志记录器，释放资源
close(): void
```

### 类型定义

```typescript
type LogMetadata =
  | Record<string, unknown> // 对象
  | Error // 错误对象
  | string // 字符串
  | number // 数字
  | boolean // 布尔值
  | null
  | undefined;
```
