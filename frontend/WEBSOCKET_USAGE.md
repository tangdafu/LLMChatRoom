# WebSocket 聊天模式使用说明

## 功能概述

前端新增了 WebSocket 长连接聊天模式，可以在 HTTP 和 WebSocket 两种模式之间切换。

## 使用步骤

### 1. 启动后端服务

确保后端服务已启动并运行在 `http://localhost:8080`

```bash
cd backend
mvn spring-boot:run
```

### 2. 启动前端服务

```bash
cd frontend
npm run dev
```

### 3. 切换到 WebSocket 模式

1. 打开浏览器访问前端页面（通常是 `http://localhost:5173`）
2. 在页面左上角，你会看到一个连接模式切换按钮
3. 点击按钮，从 "HTTP" 切换到 "WebSocket"
4. 等待连接成功（绿色指示灯表示已连接）

### 4. 开始聊天

连接成功后，像平常一样发送消息即可，消息会通过 WebSocket 长连接传输。

## 界面说明

### 连接模式切换按钮

- **HTTP 模式**（粉红色）：
  - 显示电脑图标
  - 使用传统的 HTTP SSE 流式传输
  - 稳定可靠

- **WebSocket 模式**（紫色）：
  - 显示信号图标
  - 使用 WebSocket 长连接
  - 实时双向通信
  - 绿色指示灯表示已连接
  - 红色指示灯表示未连接

- **连接中状态**：
  - 按钮会显示脉冲动画
  - 显示"连接中..."文字

## 特性对比

| 特性 | HTTP 模式 | WebSocket 模式 |
|------|----------|---------------|
| 连接类型 | 请求 - 响应 | 长连接 |
| 通信方向 | 单向（客户端→服务器） | 双向 |
| 实时性 | 高（SSE 流式） | 更高 |
| 资源消耗 | 每次请求建立连接 | 一次连接多次通信 |
| 适用场景 | 偶尔聊天 | 频繁交互 |

## 错误处理

如果 WebSocket 连接失败：

1. 会显示错误提示信息
2. 自动切换回 HTTP 模式
3. 不影响正常使用

常见错误原因：
- 后端服务未启动
- 端口被占用
- 防火墙阻止连接

## 技术实现

### 新增文件

1. **WebSocket 服务**: `src/services/websocket.js`
   - 管理 WebSocket 连接
   - 处理消息收发
   - 自动重连机制

2. **模式切换组件**: `src/components/ConnectionModeSelector.vue`
   - UI 切换按钮
   - 连接状态显示
   - 错误提示

### 修改文件

1. **Chat Store**: `src/stores/chat.js`
   - 添加 WebSocket 相关状态
   - 支持两种模式的发送逻辑
   - 连接管理方法

2. **ChatRoom 组件**: `src/components/ChatRoom.vue`
   - 集成模式切换组件
   - 生命周期管理

## 注意事项

1. **首次连接**：切换到 WebSocket 模式时，需要等待连接建立
2. **断开重连**：如果连接断开，会自动尝试重连（最多 5 次）
3. **清理资源**：关闭页面时会自动断开 WebSocket 连接
4. **模式切换**：聊天过程中可以随时切换模式，但会中断当前正在进行的对话

## 调试技巧

打开浏览器开发者工具 Console：

- 查看 STOMP 调试信息
- 查看连接状态日志
- 查看错误信息

示例日志：
```
✓ WebSocket connected successfully
→ Message sent via WebSocket
✓ Chat stream completed
```

## 故障排查

### WebSocket 无法连接

1. 检查后端是否启动在 8080 端口
2. 检查浏览器控制台是否有 CORS 错误
3. 确认防火墙允许 WebSocket 连接

### 连接后立即断开

1. 查看后端日志
2. 检查网络稳定性
3. 确认服务器配置支持 WebSocket

### 收不到消息

1. 检查订阅是否正确
2. 查看消息队列名称是否匹配
3. 验证消息格式
