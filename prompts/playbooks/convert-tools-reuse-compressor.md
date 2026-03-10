# Playbook: Convert 复用 Compressor

【目标】
让 image-to-webp / image-converter 复用 compressor processor。

【严格约束】

1. 不新增 processor
2. 不改 compressor 内部逻辑
3. 通过 adapter 控制行为
4. 可关闭 prevent-bigger

【输出】

- 修改 registry
- 修改 engine strategy
- 完整文件

执行。