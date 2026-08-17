# AIMO 首发文案

**定位（对外只用这个，不要写成「AI 笔记」）：**

> AI First 卡片笔记。随手记下想法，检索、关联和复习交给 AI。

不要提任何竞品名。不要说「开源」，说「源码公开」。

先把 README / 落地页提交并推到 `master`，再发 1c7 PR。

---

## 1. 中国独立开发者项目列表（主板面）

仓库：https://github.com/1c7/chinese-independent-developer  
版面：主板面（不要放程序员版）  
方式：PR 改 `README.md`，同时在 [Issue #160](https://github.com/1c7/chinese-independent-developer/issues/160) 留一条备份

### README 条目

插到当天日期分组下。若当天还没有分组，先加：

```markdown
### 2026 年 8 月 17 号添加

#### ximing - [Github](https://github.com/ximing)
* :white_check_mark: [AIMO](https://aimo.plus/?utm_source=cnindie&utm_medium=github)：AI First 卡片笔记，随手记下想法，语义搜索、关联和复习由系统完成，Docker 一键自托管，支持 Web / macOS / Windows / Android - [源码](https://github.com/ximing/aimo)
```

日期按实际提交当天改。

### PR 标题

```
Add AIMO: AI First 卡片笔记
```

### PR 正文

```markdown
申请加入主板面。

AIMO 是可自托管的 AI First 卡片笔记（网站 + 桌面端 + Android），不是开发者工具。

- 官网：https://aimo.plus
- 源码：https://github.com/ximing/aimo
- 部署：Docker Compose 三行启动，也有 macOS / Windows / Linux / Android 客户端
- 状态：已上线

#### ximing - [Github](https://github.com/ximing)
* :white_check_mark: [AIMO](https://aimo.plus/?utm_source=cnindie&utm_medium=github)：AI First 卡片笔记，随手记下想法，语义搜索、关联和复习由系统完成，Docker 一键自托管，支持 Web / macOS / Windows / Android - [源码](https://github.com/ximing/aimo)
```

### Issue #160 评论（PR 发出后贴）

```markdown
已发 PR，申请加入主板面。

#### ximing - [Github](https://github.com/ximing)
* :white_check_mark: [AIMO](https://aimo.plus/?utm_source=cnindie&utm_medium=github)：AI First 卡片笔记，随手记下想法，语义搜索、关联和复习由系统完成，Docker 一键自托管，支持 Web / macOS / Windows / Android - [源码](https://github.com/ximing/aimo)
```

---

## 2. V2EX「分享创造」

板块：https://www.v2ex.com/go/create  
时机：1c7 PR 发出后 1–2 天，或 README 推上去当天晚上。不要和 1c7 同一小时连发。

### 标题

```
做了个 AI First 的卡片笔记 AIMO：先记下来，检索和关联交给 AI，可自托管
```

### 正文

````markdown
大家好，分享一个自己在用的项目 **AIMO**。

定位很明确：AI First 的卡片笔记。一张卡片一个想法，先记下来；检索、关联和复习是一等能力，不是后来挂上去的按钮。

做它是因为同时满足这几件事的产品不多：

1. 记录要轻，打开就能写下，而不是先建一个文档
2. 半年后能按意思找回，而不是只匹配关键词
3. 卡片之间能自己长出关联
4. 数据在自己机器上
5. 以后能给 Agent 当私有记忆用

Web、桌面端（macOS / Windows / Linux）、Android 都有。源码公开，协议是 BSL 1.1——个人使用和自托管免费，拿去卖成竞品 SaaS 需要授权，四年后转 MIT。

**官网** https://aimo.plus
**源码** https://github.com/ximing/aimo

Docker 启动：

```bash
mkdir aimo && cd aimo
curl -O https://raw.githubusercontent.com/ximing/aimo/master/docker-compose.yml
curl -o .env https://raw.githubusercontent.com/ximing/aimo/master/.env.docker.example
# 填 JWT_SECRET 和 OPENAI_API_KEY
docker compose up -d
```

访问 http://localhost:3000 注册第一个账号即可。语义搜索需要 Embedding Key；没有 Key 也能先当卡片流来用。

想听两点具体反馈：

1. 「先记下来」是否够轻，有没有多余步骤
2. 语义搜索在你自己的卡片上准不准

感谢。
````

发帖后如果有人纠「这不是开源」，用这一句回：

```
说得对，BSL 不是 OSI 开源。源码公开，个人和自托管免费；限制的是拿它去卖成竞品 SaaS。四年后按 BSL 转 MIT。README 里也写了。
```

---

## 3. 下一周备用（先不用发）

### HelloGitHub 自荐一句话

```
AIMO：AI First 卡片笔记。随手记下想法，语义搜索、关联和复习由系统完成，Docker 一键自托管，也有桌面端和 Android。
```

### 科技爱好者周刊 / 独立开发变现周刊 Issue

```
推荐一个自己做的项目：AIMO，AI First 卡片笔记。
官网：https://aimo.plus
源码：https://github.com/ximing/aimo
一句话：随手记下想法，检索、关联和复习交给 AI，数据留在自己的机器上。
```

### XiaomingX/1000-chinese-independent-developer-plus Issue

```
自荐 AIMO：AI First 卡片笔记，随手记下想法，语义搜索、关联和复习由系统完成，Docker 一键自托管，支持 Web / 桌面端 / Android。
官网 https://aimo.plus
源码 https://github.com/ximing/aimo
```
