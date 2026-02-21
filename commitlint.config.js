module.exports = {
  extends: ["@commitlint/config-conventional"],
  rules: {
    // 类型定义
    "type-enum": [
      2,
      "always",
      [
        "feat", // 新功能
        "fix", // Bug 修复
        "docs", // 文档更新
        "style", // 代码格式（不影响功能）
        "refactor", // 重构（既不是新功能也不是修复）
        "perf", // 性能优化
        "test", // 测试相关
        "build", // 构建系统或依赖变更
        "ci", // CI 配置变更
        "chore", // 其他不修改源代码或测试文件的变更
        "revert", // 回滚之前的提交
      ],
    ],
    // type 的大小写
    "type-case": [2, "always", "lower-case"],
    // type 不能为空
    "type-empty": [2, "never"],
    // subject 不能为空
    "subject-empty": [2, "never"],
    // subject 末尾不能是句号
    "subject-full-stop": [2, "never", "."],
    // subject 最大长度
    "subject-max-length": [2, "always", 100],
    // body 最大行宽
    "body-max-line-length": [2, "always", 100],
    // header 最大长度
    "header-max-length": [2, "always", 500],
  },
};
