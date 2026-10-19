# 音乐学习台（study-desk）

基于 Obsidian 的个人音乐学习管理插件。以 vault 的 Markdown 笔记为知识内容载体，插件承载知识结构、闪卡复习、练习打卡与记分仪表盘。

## 功能

- **知识 Wiki**：插件内维护知识结构树，节点可关联 vault 笔记（多对多），支持增删、重命名、排序、移动。
- **闪卡复习**：基于 FSRS 间隔重复算法，翻面复习 + Again / Hard / Good / Easy 四档评分。
- **练习打卡**：关联知识点、附练习视频、自评分数，支持回填老师评分（手动转发、手动回填，不区分账号）。
- **记分仪表盘**：按知识结构聚合掌握度（= 闪卡正确率 × 权重 + 打卡均分 × 权重），KPI 卡 + 领域条形图 + 明细表。

## 目录结构

```
study-desk/
├── manifest.json          # 插件清单
├── versions.json          # 版本兼容
├── package.json
├── tsconfig.json
├── esbuild.config.mjs     # 构建脚本
├── main.ts                # 入口：注册单一主视图 / 命令 / 设置页
├── styles.css             # 视图样式
└── src/
    ├── types.ts           # 数据结构
    ├── store.ts           # data.json 读写 + 版本迁移
    ├── utils/id.ts
    ├── view/              # 主视图壳（PageComponent.ts + StudyDeskView.ts）
    ├── knowledge/         # 知识 Wiki（tree.ts + KnowledgeWikiView.ts → WikiPage）
    ├── flashcard/         # 闪卡（scheduler.ts + FlashcardView.ts → FlashcardPage）
    ├── checkin/           # 打卡（CheckinView.ts → CheckinPage）
    └── dashboard/         # 仪表盘（aggregation.ts + DashboardView.ts → DashboardPage）
```

四个功能页以 `PageComponent` 组件形式挂在单一主视图 `StudyDeskView` 下，
通过左侧导航栏切换，不再各自注册独立 Obsidian 视图。

## 构建

```bash
npm install
npm run build      # tsc 类型检查 + esbuild 打包出 main.js
npm run dev        # esbuild watch 模式（开发）
```

构建产物 `main.js` 与 `manifest.json`、`styles.css` 需放在 vault 的
`.obsidian/plugins/study-desk/` 目录下（本仓库的 `../test-vault/` 已就绪）。

## 安装

1. 打开你的 Obsidian vault。
2. 将 `main.js`、`manifest.json`、`styles.css` 复制到 `<vault>/.obsidian/plugins/study-desk/`。
3. 设置 → 第三方插件 → 启用「音乐学习台」。
4. 点击左侧边栏的「音乐学习台」图标，或通过命令面板（Ctrl/Cmd+P）搜索「打开音乐学习台」。
5. 进入后通过视图内左侧导航栏在「记分仪表盘 / 知识 Wiki / 闪卡复习 / 练习打卡」之间切换。

## 数据存储

所有结构化数据保存在 `.obsidian/plugins/study-desk/data.json`：

- `knowledgeTree`：知识点树（id / parentId / title / order / notePaths）
- `flashcards`：闪卡（含 FSRS 调度状态）
- `checkins`：打卡记录（含自评 / 老师评分）
- `settings`：掌握度权重、视频目录、每日新卡上限

## 掌握度计算

```
掌握度 = 闪卡正确率 × weightFlashcard + 打卡均分 × weightCheckin
```

- 闪卡正确率 = 答对次数 / 复习次数（跨该知识点所有卡片）
- 打卡均分 = 每条记录「(自评 + 老师分) / 2」的均值

权重可在「设置 → 音乐学习台」中调整。
