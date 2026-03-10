# Playbook: ImageSettings 拆分

【目标】
将 ImageSettings.astro 拆分为：

- ResizeControls.astro
- QualityControls.astro
- OutputFormatControls.astro

【严格约束】

1. 不改变 data-bind
2. 不改变 UI 行为
3. 不改变事件
4. 不改 engine 交互方式

【输出】

- 新组件文件
- 修改后的 ImageSettings
- 不解释

执行。