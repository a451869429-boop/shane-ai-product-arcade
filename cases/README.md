# Case 模块契约

每个 `cases/<case-id>/` 是该 Case 的代码写入入口：

- `case.js`：只读数据定义；后续可导出 `createRuntime()`，供 shell 调用。
- `styles.css`：只允许以本 Case 根节点 / 命名空间选择器追加或迁移样式。
- 素材保留在 `code/assets/` 对应 Case 目录，避免移动已验证的 URL。

`code/shell/case-registry.js` 是唯一注册点，负责把 Case 定义变成壳层展示视图。它不得把 Case 行为、状态或真实数据写回 `case.js`。现有 renderer / 局部状态尚在迁移，迁移顺序见 `docs-center/tech-plans/parallel-case-delivery-migration_20260713.md`。
