# localstore：给 AI 的使用说明

你可以使用 localstore 在本机持久化调试数据。它是一个类似浏览器 `localStorage` 的 HTTP 服务。

## 服务地址

默认地址：`http://127.0.0.1:7777`

使用前先检查服务：

```bash
curl --fail http://127.0.0.1:7777/logs
```

如果服务未启动，在项目目录运行：

```bash
npm start
```

## 写入数据

使用 `POST /set/:key`，请求体就是要保存的值：

```bash
curl -X POST 'http://127.0.0.1:7777/set/task-result' \
  -H 'Content-Type: application/json' \
  --data '{"status":"done","message":"处理完成"}'
```

成功响应：

```json
{"ok":true,"key":"task-result"}
```

## 读取数据

使用 `GET /get/:key`：

```bash
curl --fail 'http://127.0.0.1:7777/get/task-result'
```

读取成功会原样返回保存的数据。键不存在时返回 HTTP 404。

## 其他操作

```bash
# 查看全部键
curl --fail 'http://127.0.0.1:7777/keys'

# 删除一个键
curl -X DELETE 'http://127.0.0.1:7777/remove/task-result'

# 清空全部数据（执行前必须获得用户确认）
curl -X POST 'http://127.0.0.1:7777/clear'
```

## 键名规则

键名放在 URL 路径中。包含空格、中文、斜杠或特殊字符时必须进行 URL 编码。

JavaScript 示例：

```js
const key = encodeURIComponent("用户/设置");
const url = `http://127.0.0.1:7777/get/${key}`;
```

## AI 操作规则

1. 默认只连接 `127.0.0.1:7777`，不要擅自修改监听地址。
2. 写入结构化数据时使用合法 JSON，并设置 `Content-Type: application/json`。
3. 读取数据时检查 HTTP 状态码；404 表示键不存在，不是服务故障。
4. 更新已有键前，如果旧值可能有用，先读取并向用户说明将被覆盖。
5. 删除键前确认键名；调用 `/clear` 前必须明确获得用户授权。
6. 不要保存密码、令牌、私钥或其他敏感信息。
7. 单次写入不得超过 10 MB。

## 最简调用模板

```bash
# 写入
curl -X POST 'http://127.0.0.1:7777/set/<URL编码后的键>' --data '<值>'

# 读取
curl --fail 'http://127.0.0.1:7777/get/<URL编码后的键>'
```
