# localstore

一个用于前端调试的、类似 `localStorage` 的本地 HTTP 存储服务。零第三方依赖，支持任意来源跨域访问，数据默认持久化在 `.localstore/data.json`。

## 启动

需要 Node.js 14.8 或更高版本：

```bash
npm start
```

服务默认监听 `http://127.0.0.1:7777`。

可通过环境变量修改配置：

```bash
HOST=0.0.0.0 PORT=8888 DATA_FILE=/tmp/localstore.json npm start
```

## 接口

### 写入

请求体会以原始文本存储，并记录请求的 `Content-Type`：

```bash
curl -X POST http://127.0.0.1:7777/set/xxxkey \
  -H 'Content-Type: application/json' \
  -d '{"name":"Codex","enabled":true}'
```

### 读取

```bash
curl http://127.0.0.1:7777/get/xxxkey
```

不存在的键返回 HTTP `404`。包含空格、斜杠等字符的键应使用 `encodeURIComponent` 编码。

### 其他操作

```bash
# 列出所有键
curl http://127.0.0.1:7777/keys

# 删除一个键
curl -X DELETE http://127.0.0.1:7777/remove/xxxkey

# 清空所有数据
curl -X POST http://127.0.0.1:7777/clear
```

## 前端示例

```js
await fetch("http://127.0.0.1:7777/set/user", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ id: 1, name: "Alice" }),
});

const user = await fetch("http://127.0.0.1:7777/get/user")
  .then((response) => response.json());
```

## 测试

```bash
npm test
```
