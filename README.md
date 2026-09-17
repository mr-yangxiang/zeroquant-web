# ZeroQuant Web

Vue 3 + ECharts 的 ZeroQuant 概率研究界面。

当前界面展示：

- 5/15/30/60 分钟上涨、震荡、下跌概率；
- 模型状态和数据质量；
- P10/P50/P90 风险路径；
- 真实轨迹与盘中五分钟更新；
- 未训练或未校准模型的研究模式提示。

旧版前端随机生成正弦“重预测曲线”的入口已经删除。只有后端版本化模型可以产生预测运行；当 `actionable=false` 时，界面不会生成自动交易动作。

```bash
npm ci
npm run build
npm run dev
```

默认 API 前缀为 `/zeroquant/api/v1`，由部署层反向代理到 `zeroquant-server`。

## 认证与渲染安全升级（待协调发布）

访问令牌只保存在内存，刷新凭据通过 HttpOnly Cookie 管理；刷新页面先恢复会话，退出请求撤销服务端会话。需要配套 ZeroQuant 后端认证迁移 009、正确 HTTPS origin 与 Cookie 路径。旧 localStorage JWT 会清除并要求重新登录。

聊天 Markdown 先转义 HTML。ECharts 已升级至 6.1.0，tooltip 使用 richText；运行 `npm test` 检查恶意标签转义及 Dashboard 实际图表配置的 SVG 渲染。此测试不是浏览器视觉或跨标签页 Cookie 验收。
