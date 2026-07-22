# localstore

一个用于前端调试的、类似 `localStorage` 的本地 HTTP 存储服务。零第三方依赖，支持任意来源跨域访问，数据默认持久化在 `.localstore/data.json`。

## 启动

需要 Node.js 14.8 或更高版本：

```bash
npm start
```

服务默认监听 `http://127.0.0.1:7777`。

在浏览器打开该地址可以查看实时请求日志和历史记录。日志默认持久化在 `.localstore/requests.json`，最多保留最近 1,000 条。

可通过环境变量修改配置：

```bash
HOST=0.0.0.0 PORT=8888 DATA_FILE=/tmp/localstore.json LOG_FILE=/tmp/localstore-requests.json npm start
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

# 获取请求日志（JSON）
curl http://127.0.0.1:7777/logs
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

## macOS 登录后自动启动

项目提供 `launchd/com.guofeng.localstore.plist`。该文件包含当前机器的绝对项目路径和 Node 路径；移动项目或更换 Node 后需要同步修改。安装后，服务会在用户登录时自动启动，并在异常退出后重启：

```bash
cp launchd/com.guofeng.localstore.plist ~/Library/LaunchAgents/
launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/com.guofeng.localstore.plist
```

卸载服务：

```bash
launchctl bootout gui/$(id -u)/com.guofeng.localstore
rm ~/Library/LaunchAgents/com.guofeng.localstore.plist
```

卸载不会删除 `.localstore/data.json` 和 `.localstore/requests.json`。

查看启动和运行错误：

```bash
tail -f ~/Library/Logs/localstore.error.log
```

进程日志位于 `~/Library/Logs/localstore.log` 和 `~/Library/Logs/localstore.error.log`。不再需要历史诊断信息时可以清空这两个文件。
