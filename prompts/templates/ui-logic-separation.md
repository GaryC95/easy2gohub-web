# UI / Logic 分离模板

你是一个代码重构执行器。

【目标】
将 UI 与业务逻辑彻底分离。

【严格约束】

1. 不改变 UI 表现
2. 不改变用户交互行为
3. 不新增依赖
4. 不改 API
5. 不改数据结构

【执行步骤】

1. 提取所有算法逻辑到 services/
2. 提取 DOM 操作到 controller/
3. UI 文件只保留：
   - markup
   - props
   - event 触发

【目录变更】

- src/services/*
- src/controllers/*

【输出要求】

- 列出修改文件
- 给出完整文件
- 不解释

现在执行。