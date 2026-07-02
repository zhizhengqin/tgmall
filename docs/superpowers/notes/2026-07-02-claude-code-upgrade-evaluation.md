# Claude Code 升级评估报告

> 用于判断 TG Mall 项目是否需要升级 Claude Code CLI。  
> 分析日期：2026-07-02  
> 数据来源：https://github.com/anthropics/claude-code/blob/main/CHANGELOG.md 及本地 `claude --version`

---

## 1. 版本现状

| 项目 | 当前本地版本 | GitHub 最新 release | 发布时间 |
|------|--------------|---------------------|----------|
| Claude Code CLI | `2.1.197` | `v2.1.197` | 2026-06-30 |

**结论：当前已是最新版本，无需升级。**

---

## 2. 当前版本 2.1.197 主要变更

v2.1.197 是一个以**新模型上线**和**稳定性修复**为主的版本：

### 2.1 新模型

- **Claude Sonnet 5 成为默认模型**：原生支持 1M token 上下文窗口。
- 促销定价：$2/$10 per Mtok，截止到 2026-08-31。

**对 TG Mall 影响**：如果你希望使用更大上下文窗口处理 PRD/Backlog 等大文档，可以主动切到 Sonnet 5；但默认模型切换由 `/model` 控制，不需要升级 CLI。

---

## 3. 近几个版本对 TG Mall 可能有影响的变更

虽然已是最新版，但以下变更值得你了解（来自 2.1.196 及之前）：

### 3.1 安全相关

| 版本 | 变更 | 影响 |
|------|------|------|
| 2.1.196 | `claude mcp list`/`get` 不再自动启动仓库通过 `.claude/settings.json` 自批准的 `.mcp.json` 服务器；不可信工作区显示 `⏸ Pending approval` | **高**。如果你通过项目设置启用 MCP 服务器，现在需要显式批准。 |
| 2.1.193 | 新增 `sandbox.credentials` 设置，可阻止沙箱命令读取凭证文件和密钥环境变量 | **中**。可进一步增强敏感数据保护。 |
| 2.1.183 | 自动模式下更严格地阻止破坏性 git 命令（`git reset --hard`、`git clean -fd`、`git stash drop` 等）；`terraform destroy`/`pulumi destroy`/`cdk destroy` 需要明确指定 stack | **高**。减少误操作风险。 |
| 2.1.183 | 新增 `CLAUDE_CODE_DISABLE_MOUSE_CLICKS` 等配置 | **低**。 |

### 3.2 背景任务 / Agent 工作流

| 版本 | 变更 | 影响 |
|------|------|------|
| 2.1.196 | 后台任务和工作流在 Claude Code 进程被停止/重启/更新后仍能存活，Windows 上后台 shell 会交接而不是被杀死 | **中**。长任务更可靠。 |
| 2.1.196 | 后台 agent 在守护进程重启后自动从断点恢复 | **中**。 |
| 2.1.193 | 后台 shell 命令增加内存压力回收；修复 `/bg`、后台 agent 多个状态同步 bug | **中**。 |
| 2.1.191 | 修复后台 agent 停止后“复活”的问题；`/rewind` 支持从 `/clear` 之前恢复 | **中**。 |
| 2.1.186 | 后台子代理权限提示现在显示在主会话中，而不是自动拒绝 | **中**。 |

### 3.3 MCP 相关

| 版本 | 变更 | 影响 |
|------|------|------|
| 2.1.193 | MCP 能力发现（tools/list 等）对瞬态网络错误重试；MCP OAuth 对瞬态错误重试一次；headless 环境跳过浏览器弹窗 | **中**。MCP 更稳定。 |
| 2.1.191 | MCP OAuth 浏览器页视觉风格统一；MCP 404 错误显示 URL 并指向配置 | **低**。 |
| 2.1.186 | 新增 `claude mcp login <name>` / `claude mcp logout <name>`，支持 `--no-browser` 通过 SSH 完成认证 | **中**。更方便在服务器环境使用 MCP。 |

### 3.4 插件 / Skill 相关

| 版本 | 变更 | 影响 |
|------|------|------|
| 2.1.196 | 修复插件依赖版本 pin 在 marketplace 作为本地 git repo 路径时不被遵守的问题 | **中**。如果你用本地 marketplace 测试插件，现在 pin 会生效。 |
| 2.1.195 | 修复外部插件仅由项目 `.claude/settings.json` 启用时，在某些加载路径不要求显式安装同意的问题 | **中**。安全增强。 |
| 2.1.195 | 修复 `/plugin` Enable/Disable 在 `plugin.json` 名称与 marketplace 名称不一致时失效的问题 | **低**。 |
| 2.1.186 | `!` bash 命令现在会触发 Claude 自动响应输出；可通过 `respondToBashCommands: false` 关闭 | **中**。改变 `!` 行为。 |
| 2.1.186 | Skill frontmatter 支持 kebab-case/snake_case/camelCase；畸形 YAML frontmatter 不再静默失败 | **低**。 |
| 2.1.183 | 修复 hooks 中带连字符的 matcher（如 `code-reviewer`、`mcp__brave-search`）错误地子串匹配的问题 | **高**。如果你用 hook matcher，需要检查是否依赖了旧行为。 |

### 3.5 模型与配置

| 版本 | 变更 | 影响 |
|------|------|------|
| 2.1.196 | 新增组织默认模型支持；`/model` 中显示为 "Org default" 或 "Role default" | **低**。 |
| 2.1.193 | 新增 `autoMode.classifyAllShell` 设置，可将所有 Bash/PowerShell 命令路由到自动模式分类器 | **低**。 |
| 2.1.193 | 新增 `CLAUDE_CODE_DISABLE_BG_SHELL_PRESSURE_REAP=1` 禁用后台 shell 内存回收 | **低**。 |
| 2.1.187 | 组织配置的模型限制会应用到 model picker、`--model`、`/model`、`ANTHROPIC_MODEL` | **低**。 |
| 2.1.181 | 新增 `/config key=value` 语法（如 `/config thinking=false`） | **中**。更方便临时改配置。 |
| 2.1.181 | 捆绑 Bun runtime 升级到 1.4 | **低**。 |

### 3.6 其他体验改进

| 版本 | 变更 | 影响 |
|------|------|------|
| 2.1.196 | 会话默认名称更易读；文件附件 Cmd/Ctrl-click 可在 Finder/Explorer 中打开 | **低**。 |
| 2.1.196 | 速率限制警告和遥测计数修复；后台任务唤醒时不再误删对话 | **中**。 |
| 2.1.196 | PowerShell `git diff`/`git grep`、`egrep`/`fgrep`、含 `|` 的引号搜索模式在 exit 1 时不再被错误报告为失败 | **中**。Windows/PowerShell 用户受益。 |
| 2.1.191 | 流式响应 CPU 使用率降低约 37%；长会话内存增长减少 | **中**。 |
| 2.1.181 | 长段落流式显示改为逐行出现；API 连接在 thinking 中中断时自动重试 | **中**。 |

---

## 4. 用法差异

由于你已经在最新版，以下几点需要特别留意：

### 4.1 默认模型变为 Claude Sonnet 5

- 新会话默认使用 Sonnet 5（1M 上下文）。
- 如果不想用，可通过 `/model` 切回其他模型。
- 促销价到 2026-08-31，之后恢复常规定价。

### 4.2 MCP 服务器需要显式批准

- 如果项目通过 `.claude/settings.json` 或 `.claude/.mcp.json` 声明了 MCP 服务器，首次使用时会显示 `⏸ Pending approval`，需要手动批准。
- 这是安全增强，防止仓库自启动不可信 MCP 服务器。

### 4.3 `!` bash 命令行为变化

- 在 2.1.186 之后，`! <command>` 执行后 Claude 会自动读取输出并回应。
- 如果你希望只执行命令、不自动回应，可在 `.claude/settings.json` 中设置 `"respondToBashCommands": false`。

### 4.4 Hook matcher 精确匹配

- 如果你写过 hook matcher（如 `Bash` 匹配 Bash 工具，`mcp__brave-search` 匹配某个 MCP 服务器），现在要求**精确匹配**。
- 旧行为是子串匹配，可能意外匹配到更多工具。升级后如果需要匹配所有工具，使用 `mcp__brave-search__.*` 这样的模式。

### 4.5 破坏性 git 命令在自动模式下被拦截

- `git reset --hard`、`git checkout -- .`、`git clean -fd`、`git stash drop` 等命令，如果你**没有明确说要丢弃本地工作**，自动模式下会被阻止。
- 这是安全网，手动确认后仍可执行。

---

## 5. 升级评估

### 5.1 是否需要升级

**不需要。** 本地 `2.1.197` 已经等于 GitHub 最新 release `v2.1.197`。

### 5.2 如果未来有新版本，哪些信号值得关注

| 信号 | 优先级 |
|------|--------|
| MCP 安全/批准流程变更 | 高 |
| 自动模式破坏性命令拦截规则变更 | 高 |
| 后台任务/agent 恢复机制变更 | 中 |
| 插件/skill 加载机制变更 | 中 |
| 默认模型变更 | 中 |
| UI/TUI 交互变更 | 低 |

---

## 6. 结论

| 维度 | 结论 |
|------|------|
| 当前版本 | `2.1.197` |
| 最新版本 | `v2.1.197` |
| 是否已最新 | **是** |
| 是否建议升级 | **无需升级** |
| 主要收益 | 已在最新版，享受 Sonnet 5 默认模型、MCP 安全增强、后台任务稳定性等 |
| 主要注意点 | MCP 需显式批准；`!` 命令自动回应；hook matcher 改为精确匹配；破坏性 git 命令在自动模式下被拦截 |

---

## 7. 如何保持更新（供参考）

Claude Code 通常通过内置更新机制自动检查更新。你也可以手动运行：

```bash
claude /update
```

或在终端中：

```bash
claude --version
```

查看当前版本。如果未来有更新，会提示你安装。
