# 0002 — 活动账本读 `ctx.sessionPersistence`，不直接读日志文件

- 日期：2026-10-22
- 状态：采纳

## 背景

时长/时间带需要每条会话的事件时间戳。最直接的做法是扫 `$DSH_HOME/sessions/**/session.v*.jsonl.zstd`。

## 实测

- 日志是**多帧 zstd**（每次追加一帧）。`node:zlib.zstdDecompressSync` 只解第一帧：
  一条 60 KB 的日志解出 167 字节（只有 session 头）。
- 格式有 v0→v4 的迁移世代，还有撕裂尾部的恢复语义——都属于官方后端。

## 决定

宿主半边只声明 `sessionPersistence`，用 `list()` 拿 `{header, revision}`、`open(id,'read')`
+ `read(0)` 拿逻辑事件流、`close()` 释放。按 `revision` 判断是否需要重折。

## 代价

- 首次扫描要开每个会话的读句柄（几百条几秒），后台分批、每 5 条落盘一次。
- 服务缺席时整页降级为「暂无数据」，但面板与路由仍在（用 `ctx.inject` 可选注入，
  不把整条条目拖成 pending）。
