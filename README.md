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
