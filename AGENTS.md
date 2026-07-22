# localstore AI 使用指南

## 项目用途

localstore 是一个供前端开发和自动化调试使用的本地键值存储 HTTP 服务。它类似浏览器 `localStorage`，但可以通过 HTTP 请求跨页面、跨进程访问。

除非用户明确要求，不要将它用于生产环境，也不要把监听地址改为公网地址。

## 运行环境

- Node.js 14.8 或更高版本
- 无第三方运行时依赖，不需要执行 `npm install`
- 默认地址：`http://127.0.0.1:7777`
- 默认数据文件：项目目录下 `.localstore/data.json`

启动服务：

```bash
npm start
```

运行测试：

```bash
npm test
```

可用环境变量：

- `HOST`：监听地址，默认 `127.0.0.1`
- `PORT`：监听端口，默认 `7777`
- `DATA_FILE`：持久化文件路径，默认 `.localstore/data.json`
- `LOG_FILE`：请求日志文件路径，默认 `.localstore/requests.json`

## HTTP 接口契约

所有接口均允许跨域访问，并支持 `OPTIONS` 预检。键必须使用 URL 编码，例如 JavaScript 的 `encodeURIComponent(key)`。

### 写入键值

`POST /set/:key`

请求体会以 UTF-8 原文保存，同时保存请求的 `Content-Type`。成功返回 HTTP 200：

```json
{"ok":true,"key":"example"}
```

### 读取键值

`GET /get/:key`

成功时返回 HTTP 200、原始请求体和写入时的 `Content-Type`。键不存在时返回 HTTP 404：

```json
{"error":"Key not found","key":"example"}
```

### 管理键值

- `GET /keys`：返回所有键组成的 JSON 数组
- `DELETE /remove/:key`：删除指定键
- `POST /clear`：删除全部键值
- `GET /`：返回可视化请求日志控制台
- `GET /logs`：返回最近 1,000 条请求日志，最新记录在前

## AI 调用示例

写入 JSON：

```bash
curl -X POST 'http://127.0.0.1:7777/set/user' \
  -H 'Content-Type: application/json' \
  --data '{"id":1,"name":"Alice"}'
```

读取并解析 JSON：

```bash
curl --fail 'http://127.0.0.1:7777/get/user'
```

浏览器 JavaScript：

```js
const key = encodeURIComponent("user settings");
await fetch(`http://127.0.0.1:7777/set/${key}`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ theme: "dark" }),
});

const value = await fetch(`http://127.0.0.1:7777/get/${key}`)
  .then((response) => {
    if (!response.ok) throw new Error(`localstore: HTTP ${response.status}`);
    return response.json();
  });
```

## 修改代码时的约束

- 保持零第三方运行时依赖，优先使用 Node.js 核心模块。
- 保持 Node.js 14.8 兼容性，不使用全局 `fetch` 或 `node:test`。
- 不得移除 CORS 响应头或 `OPTIONS` 支持。
- 存储格式发生变化时必须考虑已有 `.localstore/data.json` 的兼容性。
- 修改接口、持久化或路由后必须运行 `npm test`。
- 自动化测试必须使用临时数据目录，不能读写用户的真实 `.localstore` 数据。

## 已知边界

- 单次请求体最大 10 MB，超出返回 HTTP 413。
- 数据面向本机调试，不提供鉴权、加密、过期时间或多用户隔离。
- 值以 UTF-8 文本存储，不适合直接保存二进制文件。
- `Access-Control-Allow-Origin: *` 是刻意设计，启动服务时不要存入敏感信息。
