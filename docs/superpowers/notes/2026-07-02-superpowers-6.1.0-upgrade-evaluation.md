# Superpowers 6.1.0 升级评估报告

> 用于判断 TG Mall 项目是否需要将 Superpowers 从当前使用的 **6.0.3** 升级到 **6.1.0**。  
> 分析日期：2026-07-02  
> 数据来源：https://github.com/obra/superpowers/releases（RELEASE-NOTES.md）及本地缓存目录 `/Users/qinzz/.claude/plugins/cache/claude-plugins-official/superpowers/`

---

## 1. 版本现状

| 项目 | 当前版本 | 最新版本 | 发布时间 |
|------|----------|----------|----------|
| Superpowers | `6.0.3` | `6.1.0` | 2026-06-30 |

- 本地已缓存两个版本：`superpowers/6.0.3`（当前活跃）和 `superpowers/6.1.0`（已下载未切换）。
- 当前会话加载的技能路径仍为 `.../superpowers/6.0.3/skills/...`。

---

## 2. v6.1.0 主要变更

### 2.1 降低单会话 Token 消耗（核心改动）

由于 `using-superpowers` 启动引导在每个会话都会被注入，其体积会直接影响上下文成本。v6.1.0 对其做了压缩：

- **移除了 graphviz 流程图**：原来用 DOT 图描述 skill 调用流程，改为纯文字描述。
- **合并了“指令优先级”章节**：不再作为独立章节，而是并入“用户指令优先”段落。
- **删除了各平台的“如何加载 Skills”详细说明**：例如 Codex、Copilot、Gemini 的加载方式不再赘述。
- **精简了 Platform Adaptation 平台映射文件**：删除了 `claude-code-tools.md` 和 `copilot-tools.md`。

**影响**：每次会话启动时占用的上下文 token 变少，对长会话更友好。

### 2.2 Codex 平台支持改进

- **新增 Codex 市场清单**：`.agents/plugins/marketplace.json`，Codex 可直接从 marketplace 安装。
- **移除了 Codex 的 SessionStart hook**：因为 Codex 现在能自己触发 skills，hook 反而让体验变差。

**影响**：仅影响 Codex 用户；Claude Code 用户无感知。

### 2.3 终止对 Gemini CLI 的支持（⚠️ 破坏性变更）

- Google 已于 **2026-06-18** 停止维护 Gemini CLI。
- v6.1.0 删除了所有 Gemini CLI 相关文档、工具映射和 manifest 引用。

**影响**：如果团队或工作流依赖 Gemini CLI，升级后无法使用；Claude Code/Codex/Copilot 用户不受影响。

---

## 3. 当前常用技能的实际差异

| 技能 | 是否变化 | 变化说明 |
|------|----------|----------|
| `using-superpowers`（启动引导） | ✅ 变化 | 内容压缩约 50%（121 行 → 62 行），表述更精简，核心规则不变 |
| `subagent-driven-development` | ❌ 无变化 | 任务拆分、子代理、审查流程与 6.0.3 一致 |
| `writing-plans` | ❌ 无变化 | 计划模板、任务粒度要求未变 |
| `executing-plans` | ✅ 微调 | 仅更新了支持的 CLI 列表，去掉 Gemini CLI 提及 |
| `brainstorming/visual-companion` | ✅ 微调 | 删除了 Gemini CLI 的启动命令示例 |
| `requesting-code-review` | ❌ 无变化 | 代码审查流程未变 |
| `finishing-a-development-branch` | ❌ 无变化 | 分支收尾流程未变 |
| `test-driven-development` | ❌ 无变化 | TDD 纪律未变 |
| `systematic-debugging` | ❌ 无变化 | 调试流程未变 |
| `using-git-worktrees` | ❌ 无变化 | worktree 使用未变 |

**结论**：我们日常在 Claude Code 上使用的核心技能（SDD、writing-plans、TDD、review、finishing-branch）均**没有功能变化**。

---

## 4. 用法差异

### 4.1 对 Claude Code 用户

- **没有行为变化**：仍需使用 `Skill` 工具调用 skills，仍需“先调用 skill 再行动”。
- **会话启动更轻量**：因为 `using-superpowers` 被压缩，长会话可用的上下文更多。
- **不再提供 `references/claude-code-tools.md`**：但该文件原本只是工具映射参考，现代 Claude Code 工具调用机制已不需要它。

### 4.2 对项目工作流的影响

- `.superpowers/sdd/` 临时文件路径、progress ledger、review package 脚本均未变化。
- 计划文件保存路径 `docs/superpowers/plans/` 仍是项目偏好，无需调整。
- 升级后不需要修改任何项目文档或 CLAUDE.md。

---

## 5. 升级评估

### 5.1 升级收益

| 收益 | 评估 |
|------|------|
| 降低上下文开销 | 中。每次会话启动少占一部分 token，长文档编辑任务更从容。 |
| 跟进上游最新版 | 中。避免落后过多，未来升级成本更低。 |
| 新功能 | 低。v6.1.0 没有新增对 Claude Code 有用的功能。 |

### 5.2 升级风险

| 风险 | 评估 |
|------|------|
| 破坏性变更 | 低。唯一破坏是移除 Gemini CLI 支持，我们不使用 Gemini CLI。 |
| 行为不一致 | 极低。核心技能未变，`using-superpowers` 只是精简表述。 |
| 需要改项目配置 | 无。不需要改 CLAUDE.md 或项目结构。 |

### 5.3 建议

**建议升级，但不是紧急升级。**

理由：
1. v6.1.0 对我们当前在 Claude Code 上的工作流**完全兼容**。
2. 唯一实际收益是**每次会话少占一些上下文 token**，这对处理 PRD/Backlog 等大文档有帮助。
3. 没有必须立即升级的安全或功能缺口。
4. 可以在下一个开发任务开始前顺手升级，避免在关键任务中途切换环境。

---

## 6. 如何升级（供参考）

在 Claude Code 中，Superpowers 通常通过插件市场或本地缓存管理。升级方式取决于当前安装方式：

- **如果是通过 Claude Code 插件市场安装**：在设置/插件市场中检查更新并点击升级。
- **如果是本地 git clone**：进入插件目录执行 `git fetch && git checkout v6.1.0`，然后重启 Claude Code。
- **升级后验证**：启动新会话，确认技能路径变为 `.../superpowers/6.1.0/skills/...`，并确认 `/skill` 调用正常。

本地缓存目录：`/Users/qinzz/.claude/plugins/cache/claude-plugins-official/superpowers/6.1.0/` 已存在，说明新版本文件已就绪，只需切换即可。

---

## 7. 结论

| 维度 | 结论 |
|------|------|
| 是否必须升级 | 否 |
| 是否推荐升级 | 是，非紧急 |
| 最佳升级时机 | 下次开发任务开始前，或在一次重要文档编辑完成后 |
| 升级后需改项目文件 | 不需要 |
| 主要收益 | 降低会话启动 token 占用、跟上上游版本 |
| 主要风险 | 无（针对 Claude Code + 不依赖 Gemini CLI 的团队） |
