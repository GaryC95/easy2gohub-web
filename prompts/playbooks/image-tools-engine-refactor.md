# Playbook: Image Engine 重构剧本

你是 image-engine 专用重构执行器。

【目标】
拆分 image-engine.js 为：

- services/
- strategies/
- preview/
- process/
- utils/

【严格约束】

1. 不改变 compressor 行为
2. 不改变 resizer 行为
3. Resizer 必须 keep format
4. Convert 复用 compressor
5. 不改 slug 注册方式
6. initImageTool API 不变

【执行步骤】

1. 提取 preview 相关逻辑
2. 提取 smartProcessOne
3. 提取 stats 更新逻辑
4. 提取 utils
5. 主文件仅保留 orchestration

【输出】

- 新目录结构
- 完整文件
- 标注 REFACTOR
- 不解释

执行。