<template>
  <div class="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
    <!-- 顶部 NAVIGATION HEADER (移动端自适应 Height & Flex Wrap) -->
    <header class="min-h-14 py-2 border-b border-slate-800/80 bg-slate-900/90 backdrop-blur-md px-3 md:px-6 flex flex-wrap items-center justify-between sticky top-0 z-50 gap-2">
      <div class="flex items-center gap-2 md:gap-3 flex-wrap">
        <div class="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-lg shadow-cyan-500/20 shrink-0">
          <el-icon class="text-lg"><DataAnalysis /></el-icon>
        </div>
        <div class="shrink-0">
          <h1 class="text-sm font-black tracking-wide bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">ZeroQuant 智脑做 T 大盘</h1>
          <div class="text-[8px] text-slate-500 font-mono mt-0.5">界面版本 {{ uiRelease }}</div>
        </div>

        <!-- 标的抽拉折叠开关组件 (移动端定位防溢出) -->
        <div class="relative shrink-0">
          <button
            @click="isDrawerOpen = !isDrawerOpen"
            class="flex items-center gap-1.5 bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 text-xs px-2.5 py-1 rounded-xl transition-all shadow-sm"
          >
            <span class="text-slate-400 hidden sm:inline">当前标的:</span>
            <span class="text-cyan-400 font-extrabold">{{ selectedStock ? selectedStock.name : '加载中' }} <span class="hidden sm:inline">({{ selectedStock ? selectedStock.code : '' }})</span></span>
            <el-icon class="transition-transform duration-300" :class="{ 'rotate-180': isDrawerOpen }"><ArrowDown /></el-icon>
          </button>

          <!-- 抽拉式折叠面板 Drawer Dropdown (移动端精准固定 viewport 防横向滚动) -->
          <transition name="el-zoom-in-top">
            <div
              v-if="isDrawerOpen"
              class="fixed sm:absolute top-14 left-3 right-3 sm:left-0 sm:right-auto sm:w-80 bg-slate-900/95 backdrop-blur-xl border border-slate-700/80 rounded-2xl shadow-2xl p-2.5 z-50 space-y-1.5"
            >
              <div class="text-[10px] text-slate-400 font-mono px-2 mb-1 flex justify-between">
                <span>切换做 T 追踪股票 (全量6支)</span>
                <span>点击即刻切盘</span>
              </div>
              <div
                v-for="s in stockList"
                :key="s.code"
                @click="selectStock(s); isDrawerOpen = false"
                :class="[
                  'p-2.5 rounded-xl cursor-pointer transition-all flex items-center justify-between text-xs',
                  selectedStock?.code === s.code ? 'bg-cyan-950/80 border border-cyan-500/50 text-cyan-300' : 'hover:bg-slate-800/80 text-slate-200'
                ]"
              >
                <div>
                  <span class="font-bold mr-1.5">{{ s.name }}</span>
                  <span class="text-[10px] text-slate-400 font-mono">{{ s.code }}</span>
                </div>
                <div class="font-mono font-bold" :class="s.pct >= 0 ? 'text-red-400' : 'text-emerald-400'">
                  ¥{{ s.currentPrice.toFixed(2) }} ({{ s.pct >= 0 ? '+' : '' }}{{ s.pct.toFixed(2) }}%)
                </div>
              </div>
            </div>
          </transition>
        </div>
      </div>

      <div class="flex items-center gap-2 sm:gap-3 w-full sm:w-auto justify-between sm:justify-end">
        <!-- 交易日与区间日期选择器 DatePicker (仅保留 DatePicker 内部原生 Icon) -->
        <div class="flex items-center gap-1.5 bg-slate-900/90 border border-cyan-500/40 rounded-xl px-2 py-1 shadow-md shadow-cyan-500/10">
          <span class="text-[10px] font-mono text-cyan-300 font-bold hidden sm:inline">复盘日期:</span>
          <el-date-picker
            v-model="selectedDate"
            type="date"
            placeholder="选择日期"
            format="YYYY-MM-DD"
            value-format="YYYY-MM-DD"
            :clearable="false"
            size="small"
            class="custom-datepicker !w-28 sm:!w-32"
            @change="handleDateChange"
          />
        </div>

        <!-- 开盘自动秒级倒计时组件 (智能识别历史复盘 / 09:20预判 / 盘中对冲 / 停盘休眠) -->
        <div class="flex items-center gap-1.5 bg-slate-800/60 border border-slate-700/50 px-2.5 py-1 rounded-full text-[11px] sm:text-xs">
          <span :class="shouldAutoRefresh ? 'w-2 h-2 rounded-full bg-emerald-400 animate-ping' : isHistoryView ? 'w-2 h-2 rounded-full bg-cyan-400' : 'w-2 h-2 rounded-full bg-amber-400'"></span>
          <span :class="shouldAutoRefresh ? 'text-emerald-400 font-mono font-bold' : isHistoryView ? 'text-cyan-400 font-mono font-bold' : 'text-amber-400 font-mono font-bold'">
            {{ isHistoryView ? '🔵 历史复盘 (轨迹固定)' : isPreMarketTime ? `🟢 盘前竞价对冲中 (${countdown}s)` : isTradingTime ? `🟢 1min实盘对冲中 (${countdown}s)` : '🟡 停盘休眠中' }}
          </span>
        </div>

        <el-button type="danger" plain size="small" circle @click="handleLogout" title="退出登录" class="shrink-0">
          <el-icon><SwitchButton /></el-icon>
        </el-button>
      </div>
    </header>

    <!-- 主体 DASHBOARD BODY (移动端 Padding 与 Grid 适配) -->
    <main class="flex-1 p-3 sm:p-4 space-y-4 max-w-7xl mx-auto w-full">
      <!-- 维度4：涨跌停硬性锁仓熔断提示 Banner -->
      <div v-if="isLimitLocked" class="bg-red-950/90 border-2 border-red-500 text-white p-3.5 rounded-2xl shadow-xl animate-pulse flex items-center justify-between">
        <div class="flex items-center gap-2">
          <el-icon class="text-xl text-yellow-300"><WarningFilled /></el-icon>
          <span class="font-black text-sm">【极度硬性熔断警告】：{{ selectedStock.name }} 盘中触及一字涨停/跌停板（涨跌幅 {{ selectedStock.pct }}%）！封单大单占比 > 5%，全系统硬性禁止做 T 倒仓，请锁定底仓！</span>
        </div>
        <span class="bg-red-900 px-3 py-1 rounded-full text-xs font-mono font-bold">做 T 强行锁仓</span>
      </div>

      <!-- 核心对比区：多维折线图 ECharts + 右侧策略面板 (移动端 Stacked 响应式) -->
      <div v-if="selectedStock" class="grid grid-cols-1 lg:grid-cols-3 gap-4">
        
        <!-- 左侧 2 列：ECharts 多维折线重叠对比大图 + 个人实盘仓位战术对策盘 -->
        <div class="lg:col-span-2 space-y-4">
          <div class="glass-card p-3 sm:p-4 border border-slate-800 flex flex-col">
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
            <div>
              <h2 class="text-xs sm:text-sm font-extrabold text-white flex flex-wrap items-center gap-1.5">
                <span>{{ selectedStock.name }} ({{ selectedStock.code }}) 全天走势对比</span>
                <span class="text-[10px] font-mono text-cyan-400 bg-cyan-950/80 border border-cyan-800/60 px-2 py-0.5 rounded-full">
                  {{ selectedDate }}
                </span>

                <!-- 09:20 概率基线摘要 -->
                <span v-if="!isHistoryView && basePrediction"
                  class="text-[10px] font-mono font-black px-2 py-0.5 rounded-full border shadow-sm flex items-center gap-1"
                  :class="String(basePrediction.direction || '').includes('多') || String(basePrediction.direction || '').includes('涨') ? 'bg-red-950/90 border-red-500/80 text-red-400' : 'bg-emerald-950/90 border-emerald-500/80 text-emerald-400'">
                  <span>盘前判断:</span>
                  <span>{{ basePrediction.direction || '方向待确认' }} {{ formatSignedPercent(basePrediction.targetPct) }}</span>
                </span>

                <!-- 重新模拟新版本预测 Badge (值二, 值三...) -->
                <span v-if="!isHistoryView" v-for="p in versionPredictions" :key="p.version"
                  class="text-[10px] font-mono font-black px-2 py-0.5 rounded-full border bg-purple-950/90 border-purple-500/80 text-purple-300">
                  <span>第{{ p.version }}次盘中修正:</span>
                  <span>{{ p.direction || '方向待确认' }} {{ formatSignedPercent(p.targetPct) }}</span>
                </span>
              </h2>
              <p class="text-[10px] sm:text-[11px] text-slate-400 mt-0.5 leading-snug">先看蓝线判断大概方向；绿、红虚线只表示可能波动范围。真正买卖以前，还要等止跌或滞涨信号确认。</p>
            </div>
            
            <div class="flex items-center gap-2 self-end sm:self-auto">
              <!-- 科技风发光双向刷新按钮 -->
              <button
                @click="loadAdvancedHistory(selectedStock.code)"
                class="flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold rounded-xl bg-slate-900/90 border border-cyan-500/50 text-cyan-300 hover:bg-cyan-950/90 hover:border-cyan-400 hover:text-cyan-200 active:scale-95 transition-all shadow-md shadow-cyan-500/10 shrink-0"
                title="立即手动拉取最新点位"
              >
                <el-icon><Refresh /></el-icon>
                <span>刷新轨迹</span>
              </button>
            </div>
          </div>

          <div v-if="latestForecast && decisionGuide" class="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-2 text-[10px] font-mono">
            <div class="bg-slate-950/80 border border-cyan-700/60 rounded-lg p-2">
              <div class="text-slate-500">现在怎么看</div>
              <div class="text-cyan-300 font-bold">{{ decisionGuide.trend }}</div>
            </div>
            <div class="bg-slate-950/80 border border-emerald-900/60 rounded-lg p-2">
              <div class="text-slate-500">计划买入参考</div><div class="text-emerald-300 font-bold">¥{{ decisionGuide.buyLow.toFixed(2) }}～{{ decisionGuide.buyHigh.toFixed(2) }}</div>
            </div>
            <div class="bg-slate-950/80 border border-red-900/60 rounded-lg p-2">
              <div class="text-slate-500">计划卖出参考</div><div class="text-red-300 font-bold">¥{{ decisionGuide.sellLow.toFixed(2) }}～{{ decisionGuide.sellHigh.toFixed(2) }}</div>
            </div>
            <div class="bg-slate-950/80 border border-slate-700 rounded-lg p-2">
              <div class="text-slate-500">预计波动范围</div><div class="text-slate-200 font-bold">¥{{ decisionGuide.low.toFixed(2) }}～{{ decisionGuide.high.toFixed(2) }}</div>
            </div>
            <div class="bg-slate-950/80 border border-amber-900/50 rounded-lg p-2">
              <div class="text-slate-500">现在能否用于交易</div><div :class="decisionGuide.actionable ? 'text-emerald-400' : 'text-amber-300'">{{ decisionGuide.actionable ? '通过门槛，可继续核对' : '不能，只能观察' }}</div>
            </div>
          </div>
          <div v-if="latestForecast && !decisionGuide?.actionable" class="mb-2 bg-amber-950/40 border border-amber-500/40 text-amber-200 text-[11px] rounded-lg p-2">
            <span class="font-bold">{{ modelStateLabel }}：</span>{{ modelStateExplanation }} 页面仍给出低吸/高抛观察区方便理解，但在模型通过验证前只能用于观察，不能视为自动交易指令。
          </div>

          <!-- ECharts 容器 (移动端高度 220px / 桌面端 280px 响应式) -->
          <div ref="chartRef" class="w-full h-64 sm:h-72"></div>
          <div v-if="advancedHistory.rollingEvaluation?.snapshotCount" class="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[9px] text-slate-500 font-mono">
            <span>动态预测已留档 {{ advancedHistory.rollingEvaluation.snapshotCount }} 次</span>
            <span>累计保存 {{ advancedHistory.rollingEvaluation.storedPointCount }} 个预测点</span>
            <span>提前{{ advancedHistory.rollingEvaluation.evaluationLeadMinutes }}分钟可比 {{ advancedHistory.rollingEvaluation.comparablePointCount }} 点</span>
            <span v-if="advancedHistory.rollingEvaluation.meanAbsoluteDeviationPct !== null" class="text-amber-400">平均偏离 {{ Number(advancedHistory.rollingEvaluation.meanAbsoluteDeviationPct).toFixed(2) }}%</span>
          </div>
        </div>

        <!-- 🎯 个人专属实盘持仓与争分夺秒买卖战术对策盘 -->
        <div class="glass-card p-3.5 border border-cyan-500/40 bg-slate-950/90 space-y-3 shadow-lg shadow-cyan-500/10">
          <div class="flex items-center justify-between border-b border-cyan-500/30 pb-2">
            <div class="flex items-center gap-2">
              <span class="p-1 rounded-lg bg-cyan-950 text-cyan-400 border border-cyan-500/50"><el-icon><User /></el-icon></span>
              <span class="font-extrabold text-xs sm:text-sm text-cyan-300">【{{ selectedStock.name }} 个人专属实盘持仓与争分夺秒战术对策盘】</span>
            </div>
            <span class="text-[10px] font-mono text-cyan-400/80 bg-cyan-950/60 px-2 py-0.5 rounded-full border border-cyan-800/40">个人专属实时决策</span>
          </div>

          <!-- 1. 个人持仓与成本设置表单 -->
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
            <div class="bg-slate-900/90 p-2 rounded-xl border border-slate-800 flex items-center justify-between">
              <span class="text-slate-400 text-[11px]">底仓持股:</span>
              <div class="flex items-center gap-1">
                <input v-model.number="userHoldingShares" type="number" step="100" class="w-20 bg-slate-950 border border-slate-700 rounded px-1.5 py-0.5 text-right font-mono text-cyan-300 font-bold focus:outline-none focus:border-cyan-400 text-xs" placeholder="0" />
                <span class="text-slate-500 text-[10px]">股</span>
              </div>
            </div>

            <div class="bg-slate-900/90 p-2 rounded-xl border border-slate-800 flex items-center justify-between">
              <span class="text-slate-400 text-[11px]">持仓成本:</span>
              <div class="flex items-center gap-1">
                <input v-model.number="userCostPrice" type="number" step="0.01" class="w-20 bg-slate-950 border border-slate-700 rounded px-1.5 py-0.5 text-right font-mono text-amber-300 font-bold focus:outline-none focus:border-cyan-400 text-xs" placeholder="0.00" />
                <span class="text-slate-500 text-[10px]">元</span>
              </div>
            </div>

            <button @click="saveUserPosition" class="bg-cyan-950 border border-cyan-500/50 hover:bg-cyan-900 text-cyan-300 font-bold py-1.5 px-3 rounded-xl text-xs flex items-center justify-center gap-1 transition-all shadow">
              <el-icon><Check /></el-icon>
              <span>锁定/更新个人底仓</span>
            </button>
          </div>

          <!-- 2. 争分夺秒：实盘操作一键动作录入 (挂单成交后秒级输入) -->
          <div class="bg-slate-900/90 p-2.5 rounded-xl border border-slate-800 space-y-2">
            <div class="text-[11px] font-bold text-slate-300 flex items-center justify-between">
              <span>⚡ 争分夺秒一键录入 (刚刚完成的挂单成交动作)：</span>
              <span class="text-[10px] text-slate-400 font-normal">秒级录入 ➔ 瞬间触发专属战术应变卡片</span>
            </div>

            <div class="flex flex-wrap items-center gap-2">
              <div class="flex items-center gap-1 bg-slate-950 px-2 py-1 rounded-lg border border-slate-800">
                <span class="text-[10px] text-slate-400">动作:</span>
                <select v-model="tradeActionType" class="bg-transparent text-xs font-bold text-white focus:outline-none cursor-pointer">
                  <option value="BUY" class="bg-slate-900 text-red-400">🔴 我刚刚挂单买入</option>
                  <option value="SELL" class="bg-slate-900 text-emerald-400">🟢 我刚刚挂单卖出</option>
                </select>
              </div>

              <div class="flex items-center gap-1 bg-slate-950 px-2 py-1 rounded-lg border border-slate-800">
                <span class="text-[10px] text-slate-400">成交价:</span>
                <input v-model.number="tradePrice" type="number" step="0.01" class="w-16 bg-transparent text-xs font-mono font-bold text-cyan-300 focus:outline-none" :placeholder="selectedStock.currentPrice.toFixed(2)" />
                <span class="text-[10px] text-slate-500">元</span>
              </div>

              <div class="flex items-center gap-1 bg-slate-950 px-2 py-1 rounded-lg border border-slate-800">
                <span class="text-[10px] text-slate-400">数量:</span>
                <input v-model.number="tradeShares" type="number" step="100" class="w-16 bg-transparent text-xs font-mono font-bold text-cyan-300 focus:outline-none" placeholder="1000" />
                <span class="text-[10px] text-slate-500">股</span>
              </div>

              <button @click="submitTradeAction" class="bg-red-950 border border-red-500/60 hover:bg-red-900 text-red-300 font-bold px-3 py-1 rounded-lg text-xs flex items-center gap-1 transition-all shadow">
                <el-icon><Lightning /></el-icon>
                <span>记录成交并更新观察</span>
              </button>
            </div>
          </div>

          <!-- 3. 专属战术应变诊断与操作指示卡片 (仅当有实盘买卖或成本预警事件时触发) -->
          <div v-if="tacticalAdvice" class="p-3 rounded-xl border text-xs space-y-1.5" :class="tacticalAdvice.cardClass">
            <div class="font-bold flex items-center justify-between border-b pb-1.5" :class="tacticalAdvice.titleClass">
              <span class="flex items-center gap-1.5">
                <el-icon><Aim /></el-icon>
                <span>{{ tacticalAdvice.title }}</span>
              </span>
              <span class="text-[10px] font-mono opacity-80">专属应变解盘</span>
            </div>
            <div class="leading-relaxed font-sans" :class="tacticalAdvice.textClass">
              {{ tacticalAdvice.content }}
            </div>
          </div>

          <!-- 4. 当日操作历史追踪流水 (支持一键撤销删除) -->
          <div v-if="userTradesList.length > 0" class="space-y-1">
            <div class="text-[10px] font-bold text-slate-400 flex items-center justify-between">
              <span>📜 今日实盘动作流水 (可以点击右侧 ✖ 撤销误操作)：</span>
            </div>
            <div class="flex flex-wrap gap-1.5">
              <div v-for="t in userTradesList" :key="t.id || t.tradeTime" class="bg-slate-900 px-2 py-1 rounded-lg text-[10px] font-mono border border-slate-800 flex items-center gap-2 group hover:border-slate-700 transition-all">
                <span :class="t.actionType === 'BUY' ? 'text-red-400 font-bold' : 'text-emerald-400 font-bold'">{{ t.actionType === 'BUY' ? '🔴 买入' : '🟢 卖出' }}</span>
                <span class="text-slate-300">¥{{ t.tradePrice.toFixed(2) }} ({{ t.tradeShares }}股)</span>
                <span class="text-slate-500">{{ t.tradeTime }}</span>
                <button @click="deleteTradeAction(t.id)" class="text-slate-500 hover:text-red-400 font-bold px-1 rounded transition-colors" title="撤销并删除此笔操作">
                  ✕
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

        <!-- 右侧只跟随左侧两块的总高度，长名单在卡片内部滚动。 -->
        <div class="relative min-h-0 lg:self-stretch">
        <div class="glass-card p-3 sm:p-4 border border-slate-800 flex flex-col space-y-3 lg:absolute lg:inset-0 lg:overflow-hidden">
          <h3 class="text-xs sm:text-sm font-extrabold text-cyan-400 border-b border-slate-800 pb-2 flex items-center gap-1.5">
            <el-icon><Compass /></el-icon>
            <span>{{ selectedStock.name }} 今天怎么看：趋势与买卖点</span>
          </h3>

          <div v-if="decisionGuide" class="grid grid-cols-2 gap-2 font-mono text-xs">
            <div class="bg-slate-950/80 p-2 rounded-xl border border-cyan-500/40">
              <div class="text-[10px] text-slate-400">未来{{ decisionGuide.horizonMinutes }}分钟</div>
              <div class="text-cyan-300 font-bold text-sm mt-0.5">{{ decisionGuide.trend }}</div>
              <div class="text-[10px] text-slate-500 mt-1 leading-snug">{{ decisionGuide.trendDetail }}</div>
            </div>
            <div class="bg-slate-950/80 p-1.5 sm:p-2 rounded-xl border border-emerald-500/40 text-center">
              <div class="text-[10px] text-emerald-400 font-bold">回落低吸观察区</div>
              <div class="text-emerald-300 font-bold text-xs mt-1">¥{{ decisionGuide.buyLow.toFixed(2) }}～{{ decisionGuide.buyHigh.toFixed(2) }}</div>
              <div class="text-[9px] text-slate-500 mt-1">到区后需先看到止跌，不是到价必买</div>
            </div>
            <div class="bg-slate-950/80 p-1.5 sm:p-2 rounded-xl border border-red-500/40 text-center">
              <div class="text-[10px] text-red-400 font-bold">冲高卖出观察区</div>
              <div class="text-red-300 font-bold text-xs mt-1">¥{{ decisionGuide.sellLow.toFixed(2) }}～{{ decisionGuide.sellHigh.toFixed(2) }}</div>
              <div class="text-[9px] text-slate-500 mt-1">到区后需观察滞涨，不是到价必卖</div>
            </div>
            <div class="bg-slate-950/60 p-1.5 sm:p-2 rounded-xl border border-slate-800 text-center">
              <div class="text-[10px] text-slate-400">最可能价格重心</div>
              <div class="text-cyan-400 font-bold text-xs mt-1">¥{{ decisionGuide.median.toFixed(2) }}</div>
              <div class="text-[9px] text-slate-500 mt-1">计算基准 ¥{{ decisionGuide.reference.toFixed(2) }}</div>
            </div>
          </div>
          <div v-else class="rounded-xl border border-slate-800 bg-slate-950/60 p-4 text-center text-xs text-slate-500">所选日期暂无对应预测，系统不会借用其他日期结果填充。</div>

          <!-- 实盘历史极端参照位 -->
          <div class="flex items-center justify-between text-[10px] font-mono text-slate-400 px-1 bg-slate-950/40 py-1 rounded-lg border border-slate-800/60">
            <span>昨收: ¥{{ selectedStock.yesterdayPrice.toFixed(2) }}</span>
            <span>实盘最高: ¥{{ selectedStock.highPrice.toFixed(2) }}</span>
            <span>实盘最低: ¥{{ selectedStock.lowPrice.toFixed(2) }}</span>
          </div>

          <div v-if="decisionGuide" class="bg-gradient-to-r from-cyan-950/60 via-slate-900/90 to-indigo-950/60 border border-cyan-500/50 p-3 rounded-xl shadow-xl space-y-2">
            <div class="text-cyan-300 font-extrabold flex items-center justify-between border-b border-cyan-500/30 pb-1.5 text-xs">
              <div class="flex items-center gap-1.5">
                <el-icon><Compass /></el-icon>
                <span>一句话操作地图</span>
              </div>
              <span class="text-[10px] bg-cyan-500/20 text-cyan-300 px-1.5 py-0.5 rounded font-mono">{{ decisionGuide.actionable ? '已通过模型门槛' : '仅作研究观察' }}</span>
            </div>
            <div v-if="isLimitLocked" class="bg-amber-950/60 border border-amber-500/50 p-2 rounded-lg text-[11px] text-amber-200">
              已接近涨跌停，成交能力和开板风险优先于模型区间：停止日内倒仓，等待流动性恢复。
            </div>
            <div v-else class="grid grid-cols-1 gap-2 text-[11px]">
              <div class="bg-emerald-950/35 border border-emerald-500/30 p-2 rounded-lg">
                <span class="font-bold text-emerald-300">想买：</span>
                先等价格进入 <span class="font-mono font-bold">¥{{ decisionGuide.buyLow.toFixed(2) }}～{{ decisionGuide.buyHigh.toFixed(2) }}</span>，再观察不创新低、成交卖压收缩或重新站回均价线；没有止跌确认就不接。
              </div>
              <div class="bg-red-950/35 border border-red-500/30 p-2 rounded-lg">
                <span class="font-bold text-red-300">想卖：</span>
                先等价格进入 <span class="font-mono font-bold">¥{{ decisionGuide.sellLow.toFixed(2) }}～{{ decisionGuide.sellHigh.toFixed(2) }}</span>，再观察冲高不过、买盘衰减或跌回均价线；持续放量突破就重新计算，不机械卖出。
              </div>
              <div class="bg-slate-950/70 border border-slate-700 p-2 rounded-lg text-slate-300">
                <span class="font-bold text-amber-300">区间失效：</span>
                跌破 ¥{{ decisionGuide.low.toFixed(2) }} 说明下行风险扩大；突破 ¥{{ decisionGuide.high.toFixed(2) }} 说明上行超出原情景。两种情况都应等待下一次分钟重算，不按旧价位追单。
              </div>
            </div>
          </div>

          <div class="bg-slate-950/70 border border-slate-700 rounded-xl p-2.5 flex flex-col gap-2 text-[11px] min-h-0 lg:flex-1 lg:overflow-hidden">
            <div class="flex items-center justify-between gap-2">
              <div class="font-bold text-cyan-300 flex items-center gap-1"><el-icon><User /></el-icon>主力结构与历史行为</div>
              <div class="flex items-center gap-2 shrink-0">
                <button @click="refreshParticipantPanels" :disabled="ownershipLoading || entityProfileLoading" class="text-[9px] text-slate-400 hover:text-cyan-300 disabled:opacity-50 flex items-center gap-0.5" title="股东披露和历史画像不会随分钟行情刷新；需要时可手动更新">
                  <el-icon><Refresh /></el-icon><span>手动更新</span>
                </button>
                <a v-if="ownershipProfile?.sourceUrl" :href="ownershipProfile.sourceUrl" target="_blank" rel="noopener noreferrer" class="text-[9px] text-cyan-500 hover:text-cyan-300">公开来源</a>
              </div>
            </div>
            <div v-if="ownershipProfile?.reportDate" class="text-[9px] text-slate-500">
              {{ ownershipProfile.reportName || '定期报告' }} · 报告期 {{ ownershipProfile.reportDate }} · 公告日 {{ ownershipProfile.noticeDate || '--' }}
            </div>
            <div v-if="ownershipLoading || entityProfileLoading" class="text-center text-slate-500 py-3">正在读取公开披露与历史证据…</div>
            <div v-if="ownershipProfile?.summary && ownershipProfile?.topHolders?.length" class="grid grid-cols-2 gap-1.5 text-[9px]">
              <div class="bg-cyan-950/30 border border-cyan-900/50 rounded-lg p-1.5"><span class="text-slate-500">前三 / 前十大</span><span class="float-right text-cyan-300 font-mono">{{ Number(ownershipProfile.summary.topThreeRatioPct ?? 0).toFixed(2) }}% / {{ ownershipProfile.summary.disclosedTopHolderRatioPct.toFixed(2) }}%</span></div>
              <div class="bg-slate-900 border border-slate-800 rounded-lg p-1.5"><span class="text-slate-500">本期变化</span><span class="float-right text-slate-300">增 {{ ownershipProfile.summary.increasedCount }} / 减 {{ ownershipProfile.summary.decreasedCount }}</span></div>
            </div>
            <div v-if="!ownershipLoading && !entityProfileLoading" class="space-y-2 max-h-80 lg:max-h-none lg:flex-1 min-h-0 overflow-y-auto no-scrollbar pr-0.5">
              <div class="text-[10px] font-bold text-slate-300">公开持股主力（报告期）</div>
              <div v-for="holder in ownershipProfile?.topHolders?.slice(0, 10) || []" :key="`${holder.rank}-${holder.name}`" class="bg-slate-900/80 border border-slate-800 rounded-lg p-2">
                <div class="flex items-start justify-between gap-2">
                  <span class="text-slate-200 font-bold leading-snug">{{ holder.rank }}. {{ holder.name }}</span>
                  <span class="shrink-0 font-mono text-cyan-300">{{ holder.ratioPct.toFixed(2) }}%</span>
                </div>
                <div class="mt-1 flex flex-wrap gap-x-2 text-[9px] text-slate-500">
                  <span>{{ formatShares(holder.shares) }}</span><span v-if="holder.profileLabel" class="text-cyan-500">{{ holder.profileLabel }}</span><span>{{ holder.holderNature }}</span><span>{{ holder.shareType }}</span>
                  <span :class="holderDirectionClass(holder.direction)">{{ holder.direction }}<template v-if="holder.changeShares !== null"> {{ formatShares(Math.abs(holder.changeShares)) }}</template></span>
                </div>
                <div class="mt-1 text-[9px] leading-snug text-slate-400"><span class="text-cyan-500">持股身份说明：</span>{{ holder.behaviorObservation }}</div>
              </div>
              <div v-if="!ownershipProfile?.topHolders?.length" class="text-center text-slate-500 py-2">截至所选日期暂无可用股东披露。</div>

              <div class="border-t border-slate-800 pt-2 flex items-center justify-between gap-2">
                <span class="text-[10px] font-bold text-purple-300">机构 / 活跃席位历史行为画像</span>
                <span class="text-[9px] text-slate-500">{{ entityProfileSignalText }}</span>
              </div>
              <div v-for="profile in entityProfileData?.profiles || []" :key="`${profile.name}-${profile.lastEventDate}`" class="bg-purple-950/15 border border-purple-900/40 rounded-lg p-2">
                <div class="flex items-start justify-between gap-2">
                  <span class="text-slate-200 font-bold leading-snug">{{ profile.name }}</span>
                  <span class="shrink-0 text-[9px] text-purple-300">{{ profile.entityType }}</span>
                </div>
                <div class="mt-1 flex flex-wrap gap-x-2 gap-y-1 text-[9px] text-slate-500">
                  <span>公开记录 {{ profile.sampleCount }} 次</span>
                  <span>可评估 {{ profile.labeledSampleCount }} 次</span>
                  <span>可信度 {{ formatProbability(profile.confidence) }}</span>
                  <span>证据等级 {{ profile.evidenceGrade }}</span>
                  <span>{{ profile.status === 'RESEARCH_READY' ? '已达到研究门槛' : '样本不足' }}</span>
                </div>
                <div v-if="profile.traits?.length" class="mt-1.5 flex flex-wrap gap-1">
                  <span v-for="trait in profile.traits" :key="trait.code" class="px-1.5 py-0.5 rounded bg-purple-500/10 border border-purple-500/20 text-[9px] text-purple-200" :title="trait.evidence">{{ trait.label }}</span>
                </div>
                <div v-if="profile.traits?.length" class="mt-1 text-[9px] leading-snug text-purple-200/60">依据：{{ profile.traits.map((trait: any) => trait.evidence).join('；') }}</div>
                <div class="mt-1 text-[9px] leading-snug text-slate-400">{{ profile.evidenceSummary?.summary }}</div>
                <div class="mt-1 text-[9px] text-slate-600">最近公开出现 {{ profile.lastEventDate }} · {{ profile.lastSide === 'BUY' ? '买方榜' : '卖方榜' }} · 本股累计 {{ profile.stockAppearanceCount }} 次</div>
              </div>
              <div v-if="!entityProfileData?.profiles?.length" class="rounded-lg border border-dashed border-slate-700 p-2 text-[9px] leading-relaxed text-slate-500">
                暂无可验证的机构或活跃营业部席位画像。系统不会拿前十大股东名称冒充盘中交易席位，也不会在证据不足时编造操盘风格。
              </div>
            </div>
            <div v-if="ownershipProfile?.dataNature" class="text-[9px] text-slate-500 border-t border-slate-800 pt-1.5">{{ ownershipProfile.dataNature }}</div>
            <div v-for="warning in ownershipProfile?.warnings || []" :key="warning" class="text-[9px] text-amber-500/80">{{ warning }}</div>
            <div v-for="warning in entityProfileData?.warnings || []" :key="warning" class="text-[9px] text-amber-500/80">{{ warning }}</div>
            <div class="text-[9px] text-slate-600">画像只使用当时已公开的席位记录、后续表现和新闻邻近度滚动计算；样本不足时只展示事实，不贴风格标签。</div>
          </div>
        </div>
        </div>
      </div>

      <!-- 公开逐笔大额成交监控面板 -->
      <div v-if="selectedStock" class="glass-card p-3 sm:p-4 border border-slate-800 space-y-2">
        <h3 class="text-xs sm:text-sm font-extrabold text-cyan-400 border-b border-slate-800 pb-2 flex items-center justify-between">
          <span class="flex items-center gap-1.5"><el-icon><Monitor /></el-icon>{{ selectedStock.name }} 公开逐笔大额成交（≥1000手）</span>
          <span class="text-[10px] text-slate-400">成交明细代理数据 · 不含委托簿、撤单或账户席位身份</span>
        </h3>

        <div v-if="l2Orders.length > 0" class="space-y-2 text-[11px] max-h-56 overflow-y-auto no-scrollbar">
          <div v-for="(ord, i) in l2Orders" :key="i" class="p-2.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-1.5"
            :class="ord.type.includes('买入') ? 'bg-emerald-950/30 border-emerald-500/30' : 'bg-red-950/30 border-red-500/30'">
            <div class="flex flex-wrap items-center gap-2">
              <span class="font-mono text-cyan-300 font-bold bg-slate-900 px-2 py-0.5 rounded border border-slate-800">{{ ord.timeStr }}</span>
              <span class="font-bold px-2 py-0.5 rounded text-[10px]"
                :class="ord.type.includes('买入') ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'">
                {{ ord.type }}
              </span>
              <span class="font-mono font-bold text-white text-xs">¥{{ ord.price.toFixed(2) }}</span>
              <span class="font-mono text-amber-400 font-bold">({{ ord.volumeLots }}手)</span>
            </div>
            <div class="text-slate-300 text-[11px] leading-snug">{{ formatText(ord.note) }}</div>
          </div>
        </div>
        <div v-else class="text-xs text-slate-500 text-center py-6">盘中暂未发现达到阈值的公开大额成交</div>
      </div>

      <!-- 四类通用应对场景由当前预测区间动态生成，不读取旧的手写席位画像。 -->
      <div v-if="selectedStock && decisionGuide" class="glass-card p-3 sm:p-4 border border-slate-800">
        <h3 class="text-xs sm:text-sm font-extrabold text-red-400 mb-3 flex items-center gap-1.5 border-b border-slate-800 pb-2">
          <el-icon><Warning /></el-icon>
          <span>{{ selectedStock.name }} 四种常见情况与应对</span>
        </h3>

        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3 text-[11px]">
          <div class="p-2.5 sm:p-3 rounded-xl bg-red-950/20 border border-red-900/40">
            <div class="font-bold text-red-400 text-xs mb-1">🚨 1. 高卖后不跌反涨(踩空)</div>
            <div class="text-slate-300 leading-relaxed">价格持续站上 ¥{{ decisionGuide.sellHigh.toFixed(2) }} 且成交继续放大，说明原上行情景被突破。不要按旧区间追买，等待分钟模型重算后的回踩确认。</div>
          </div>

          <div class="p-2.5 sm:p-3 rounded-xl bg-cyan-950/20 border border-cyan-900/40">
            <div class="font-bold text-cyan-400 text-xs mb-1">🎯 2. 高卖后正常回调</div>
            <div class="text-slate-300 leading-relaxed">卖出后回落至 ¥{{ decisionGuide.buyLow.toFixed(2) }}～{{ decisionGuide.buyHigh.toFixed(2) }}，只有出现止跌和卖压收缩才考虑接回；差价不足覆盖费用时放弃本轮。</div>
          </div>

          <div class="p-2.5 sm:p-3 rounded-xl bg-amber-950/20 border border-amber-900/40">
            <div class="font-bold text-amber-400 text-xs mb-1">🛡️ 3. 低吸被套(买完不涨反跌)</div>
            <div class="text-slate-300 leading-relaxed">买入后跌破 ¥{{ decisionGuide.low.toFixed(2) }}，代表下行已超出原观察范围。停止继续摊薄，按个人最大亏损和可卖库存处理，等待新预测。</div>
          </div>

          <div class="p-3 rounded-xl bg-purple-950/20 border border-purple-900/40">
            <div class="font-bold text-purple-400 text-xs mb-1">⚠️ 4. 涨跌停或流动性消失</div>
            <div class="text-slate-300 leading-relaxed">触及涨跌停、报价陈旧或大额成交无法正常撮合时，任何模型点位都让位于成交能力；停止日内倒仓，避免无法接回或无法止损。</div>
          </div>
        </div>
      </div>
    </main>

    <!-- 🤖 首席量化策略分析师 · 悬浮交互对弈入口 -->
    <button
      @click="openAiChat"
      class="fixed bottom-6 right-6 z-40 flex items-center gap-2 px-4 py-2.5 rounded-full bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-extrabold text-xs shadow-2xl shadow-cyan-500/30 border border-cyan-400/50 active:scale-95 transition-all group"
      title="点击打开量化策略分析师智能对话与预测矫正窗口"
    >
      <span class="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping"></span>
      <span class="text-base">🤖</span>
      <span>首席量化分析师 · 对弈</span>
    </button>

    <!-- 🤖 首席量化策略分析师 · 对弈与预测矫正抽屉 -->
    <el-drawer
      v-model="isChatOpen"
      direction="rtl"
      size="85%"
      :with-header="false"
      class="custom-chat-drawer !bg-slate-950 !border-l !border-slate-800"
    >
      <div class="flex flex-col h-full text-slate-100 font-sans">
        <!-- 抽屉顶部 Header -->
        <div class="p-4 border-b border-slate-800 bg-slate-900/90 backdrop-blur-md flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center text-xl text-white shadow-lg shadow-cyan-500/30">
              👨‍💼
            </div>
            <div>
              <div class="flex items-center gap-2">
                <h3 class="text-sm font-extrabold text-white">ZeroQuant 首席量化策略分析师</h3>
                <span class="bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 px-2 py-0.5 rounded text-[10px] font-bold">概率研究模式</span>
              </div>
              <p class="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1.5">
                <span class="w-2 h-2 rounded-full bg-emerald-400 inline-block"></span>
                <span>量化解释器在线 · 数据归因、买卖观察区与风险情景</span>
              </p>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <el-button size="small" type="danger" plain @click="handleClearChat" title="清空对话记录">清空历史</el-button>
            <el-button size="small" circle @click="isChatOpen = false">✕</el-button>
          </div>
        </div>

        <!-- 当前标的与实时盘口状态卡片 -->
        <div v-if="selectedStock" class="bg-cyan-950/40 border-b border-cyan-900/40 px-4 py-2 flex items-center justify-between text-xs">
          <div class="flex items-center gap-2">
            <span class="text-slate-400">当前对弈标的:</span>
            <span class="font-bold text-cyan-300">{{ selectedStock.name }} ({{ selectedStock.code }})</span>
            <span class="font-mono font-bold" :class="selectedStock.pct >= 0 ? 'text-red-400' : 'text-emerald-400'">
              ¥{{ selectedStock.currentPrice.toFixed(2) }} ({{ selectedStock.pct >= 0 ? '+' : '' }}{{ selectedStock.pct.toFixed(2) }}%)
            </span>
          </div>
          <div class="text-[11px] text-slate-400 font-mono">
            <template v-if="decisionGuide">当前观察区: <span class="text-emerald-400">买 ¥{{ decisionGuide.buyLow.toFixed(2) }}～{{ decisionGuide.buyHigh.toFixed(2) }}</span> / <span class="text-red-400">卖 ¥{{ decisionGuide.sellLow.toFixed(2) }}～{{ decisionGuide.sellHigh.toFixed(2) }}</span></template>
            <template v-else>当前暂无可用预测</template>
          </div>
        </div>

        <!-- 消息列表滚动区 -->
        <div ref="chatContainerRef" class="flex-1 overflow-y-auto p-4 space-y-4">
          <div
            v-for="(msg, idx) in chatMessages"
            :key="idx"
            :class="msg.role === 'user' ? 'flex justify-end' : 'flex justify-start'"
          >
            <div
              :class="[
                'max-w-[90%] rounded-2xl p-3.5 text-xs leading-relaxed shadow-lg',
                msg.role === 'user'
                  ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-tr-none'
                  : 'bg-slate-900/95 border border-slate-700/80 text-slate-200 rounded-tl-none space-y-2'
              ]"
            >
              <div v-if="msg.role === 'assistant'" class="flex items-center justify-between border-b border-slate-800 pb-1 mb-1 text-[10px] text-slate-400 font-mono">
                <div class="flex items-center gap-1.5">
                  <span class="font-bold text-cyan-400">🤖 首席量化策略分析师</span>
                  <span v-if="msg.isTyping" class="inline-flex items-center gap-0.5 text-cyan-400 font-normal">
                    <span class="w-1 h-1 rounded-full bg-cyan-400 animate-ping"></span>
                    <span>输出中...</span>
                  </span>
                </div>
                <span>{{ msg.createdAt || '刚刚' }}</span>
              </div>
              <div class="whitespace-pre-line leading-relaxed">
                <span v-html="formatMarkdownToHtml(msg.displayContent !== undefined ? msg.displayContent : msg.content)"></span>
                <span v-if="msg.isTyping" class="inline-block w-1.5 h-3.5 bg-cyan-400 ml-0.5 animate-pulse align-middle"></span>
              </div>
            </div>
          </div>
        </div>

        <!-- 快捷问答 Chips 预设栏 -->
        <div class="p-2.5 bg-slate-900/80 border-t border-slate-800 flex flex-wrap gap-2">
          <button
            @click="handleQuickQuestion('为什么今天预测有偏离？请深度量化归因并复盘')"
            class="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-medium transition-colors"
          >
            📊 预测偏差量化归因
          </button>
          <button
            @click="handleQuickQuestion('结合我的持仓成本，解释当前概率区间、最大风险和需要观察的确认信号')"
            class="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-medium transition-colors"
          >
            🎯 结合个人成本看买卖区
          </button>
          <button
            @click="handleQuickQuestion('请根据当前公开逐笔大额成交，分析主动买卖方向和成交强弱；不要推断具体账户或席位')"
            class="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-medium transition-colors"
          >
            ⚡ 大额成交强弱分析
          </button>
          <button
            @click="handleQuickQuestion('向你反馈盘口异动：我担心午后卖压扩大，请根据最新可观察数据更新风险情景')"
            class="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-400 border border-cyan-500/30 text-[11px] font-medium transition-colors"
          >
            🔧 反馈并矫正预测
          </button>
        </div>

        <!-- 底部输入框与语音录入 & 发送 -->
        <div class="p-3 bg-slate-900 border-t border-slate-800 flex items-center gap-2">
          <!-- 🎙️ 语音识别按钮 (带呼吸动效与自动纠错) -->
          <button
            @click="toggleVoiceRecording"
            :class="[
              'p-2.5 rounded-xl border flex items-center justify-center transition-all shrink-0 active:scale-95',
              isRecordingVoice
                ? 'bg-rose-600/30 border-rose-500 text-rose-400 animate-pulse shadow-lg shadow-rose-500/20'
                : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300'
            ]"
            :title="isRecordingVoice ? '点击停止录音并自动纠错转写' : '点击开启语音录入（支持交易口语自动纠错）'"
          >
            <span class="text-base">{{ isRecordingVoice ? '🔴' : '🎙️' }}</span>
          </button>

          <textarea
            v-model="chatInput"
            @keydown.enter.prevent="handleSendChat"
            :placeholder="isRecordingVoice ? '🎙️ 正在聆听您的语音指令（如：刚我3.85又买了1000股）...' : '输入指令、咨询做T策略，或语音录入...'"
            rows="2"
            class="flex-1 bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500 resize-none"
          ></textarea>
          <button
            @click="handleSendChat"
            :disabled="isSendingChat || !chatInput.trim()"
            class="px-5 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-extrabold text-xs shadow-lg shadow-cyan-500/20 active:scale-95 disabled:opacity-50 transition-all flex items-center justify-center gap-1 shrink-0"
          >
            <span>{{ isSendingChat ? '推演中...' : '发送' }}</span>
          </button>
        </div>
      </div>
    </el-drawer>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, onUnmounted, nextTick, computed } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import * as echarts from 'echarts'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'
import api from '../api'

dayjs.extend(utc)
dayjs.extend(timezone)

const router = useRouter()
const uiRelease = '2026.09.08-易读版'
const stockList = ref<any[]>([])
const selectedStock = ref<any>(null)
const isDrawerOpen = ref(false)

const defaultDate = dayjs().tz('Asia/Shanghai').format('YYYY-MM-DD')
const selectedDate = ref(defaultDate)

const advancedHistory = ref<any>({
  realHistories: [],
  predictions: [],
  rollingPredictions: []
})
const latestForecast = ref<any>(null)
const ownershipProfile = ref<any>(null)
const ownershipLoading = ref(false)
const ownershipContextKey = ref('')
const ownershipCache = new Map<string, any>()
const entityProfileData = ref<any>(null)
const entityProfileLoading = ref(false)
const entityProfileContextKey = ref('')
const entityProfileCache = new Map<string, any>()

const chartRef = ref<HTMLElement | null>(null)
let chartInstance: echarts.ECharts | null = null
let timer: any = null

const basePrediction = computed(() => {
  if (!advancedHistory.value.predictions || advancedHistory.value.predictions.length === 0) return null
  return advancedHistory.value.predictions.find((p: any) => p.isBase) || advancedHistory.value.predictions[0]
})

const versionPredictions = computed(() => {
  if (!advancedHistory.value.predictions) return []
  return advancedHistory.value.predictions.filter((p: any) => !p.isBase)
})

const primaryForecast = computed(() => {
  if (!latestForecast.value?.horizons) return null
  return latestForecast.value.horizons.find((item: any) => item.horizonMinutes === 30)
    || latestForecast.value.horizons.find((item: any) => item.horizonMinutes === 15)
    || latestForecast.value.horizons[0]
    || null
})

const signalClock = ref(Date.now())
const liveSignalApproved = computed(() => {
  const forecast = latestForecast.value
  const expires = Date.parse(forecast?.signalExpiresAt || '')
  return forecast?.productionApproved === true && Number.isFinite(expires) && expires > signalClock.value
})
const modelStateLabel = computed(() => latestForecast.value?.modelState === 'champion' && !liveSignalApproved.value
  ? '生产资格或数据时效待核验，仅供观察' : latestForecast.value?.modelStateLabel || ({
  untrained_bootstrap: '尚未完成训练，仅供观察',
  shadow: '影子验证中',
  champion: '已通过生产门槛',
} as Record<string, string>)[latestForecast.value?.modelState] || '状态待确认')

const modelStateExplanation = computed(() => latestForecast.value?.modelState === 'champion' && !liveSignalApproved.value
  ? '生产资格或信号时效未通过当前核验，请等待新数据；历史的已通过状态不再作为本次交易依据。'
  : latestForecast.value?.modelStateExplanation
  || (latestForecast.value?.modelState === 'untrained_bootstrap'
    ? '当前只是用于验证数据管道的初始规则权重，尚未用多年历史数据训练，也不能证明预测准确率。'
    : '当前模型仍需结合实时数据质量和风控状态使用。'))

const decisionGuide = computed(() => {
  const forecast = primaryForecast.value
  const reference = Number(latestForecast.value?.referencePrice || selectedStock.value?.currentPrice)
  if (!forecast || !Number.isFinite(reference) || reference <= 0) return null
  const priceAt = (returnPct: unknown) => reference * (1 + Number(returnPct || 0) / 100)
  const weak = priceAt(forecast.q10ReturnPct)
  const middle = priceAt(forecast.q50ReturnPct)
  const strong = priceAt(forecast.q90ReturnPct)
  const low = Math.min(weak, middle, strong)
  const high = Math.max(weak, middle, strong)
  const median = Math.max(low, Math.min(high, middle))
  const pUp = Number(forecast.pUp || 0)
  const pFlat = Number(forecast.pFlat || 0)
  const pDown = Number(forecast.pDown || 0)
  const edge = pUp - pDown
  let trend = '区间震荡'
  let trendDetail = '上涨和下跌倾向接近，优先等待价格靠近区间两端再观察。'
  if (pFlat >= pUp && pFlat >= pDown && Math.abs(edge) < 0.08) {
    trend = '横盘震荡'
  } else if (edge >= 0.12) {
    trend = '偏强上行'
    trendDetail = '上涨倾向明显高于下跌，但冲高后仍需观察成交是否继续放大。'
  } else if (edge > 0) {
    trend = '震荡偏强'
    trendDetail = '上涨倾向略占优，更适合等回落确认，不适合追涨。'
  } else if (edge <= -0.12) {
    trend = '偏弱下行'
    trendDetail = '下跌倾向明显高于上涨，低位先观察止跌，不宜直接接飞刀。'
  } else if (edge < 0) {
    trend = '震荡偏弱'
    trendDetail = '下跌倾向略占优，冲高更偏向风险释放而非追买信号。'
  }
  return {
    trend,
    trendDetail,
    reference,
    median,
    low,
    high,
    buyLow: low,
    buyHigh: low + (median - low) * 0.5,
    sellLow: median + (high - median) * 0.5,
    sellHigh: high,
    actionable: liveSignalApproved.value && forecast.actionable === true,
    horizonMinutes: forecast.horizonMinutes,
  }
})

const formatProbability = (value: unknown) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? `${(parsed * 100).toFixed(1)}%` : '--'
}

const formatSignedPercent = (value: unknown) => {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return '--'
  return `${parsed >= 0 ? '+' : ''}${parsed.toFixed(2)}%`
}

const formatShares = (value: unknown) => {
  const shares = Number(value)
  if (!Number.isFinite(shares)) return '--'
  if (Math.abs(shares) >= 100000000) return `${(shares / 100000000).toFixed(2)}亿股`
  if (Math.abs(shares) >= 10000) return `${(shares / 10000).toFixed(1)}万股`
  return `${shares.toFixed(0)}股`
}

const holderDirectionClass = (direction: string) => {
  if (direction?.includes('增') || direction?.includes('新进')) return 'text-red-400'
  if (direction?.includes('减')) return 'text-emerald-400'
  return 'text-slate-400'
}

const entityProfileSignalText = computed(() => {
  const profile = entityProfileData.value
  if (!profile?.researchReadyEntityCount) return '暂无足够样本'
  const signal = Number(profile.signal || 0)
  const direction = signal >= 0.15 ? '历史证据偏多' : signal <= -0.15 ? '历史证据偏空' : '历史证据中性'
  return `${direction} · ${profile.researchReadyEntityCount}/${profile.sampleEntityCount} 个达到门槛`
})

const isLimitLocked = computed(() => {
  if (!selectedStock.value) return false
  return Math.abs(selectedStock.value.pct) >= 9.9
})

const l2Orders = computed(() => {
  return advancedHistory.value.l2Orders || []
})

const fetchStockList = async () => {
  try {
    const res: any = await api.get('/stocks')
    stockList.value = res.data || []
    if (selectedStock.value) {
      const refreshed = stockList.value.find((stock: any) => stock.code === selectedStock.value.code)
      if (refreshed) selectedStock.value = { ...selectedStock.value, ...refreshed }
    }
    if (!selectedStock.value && stockList.value.length > 0) {
      selectStock(stockList.value[0])
    }
  } catch (err) {
    //
  }
}

const selectStock = async (stock: any) => {
  selectedStock.value = stock
  const queryDate = selectedDate.value || defaultDate
  await Promise.all([
    loadAdvancedHistory(stock.code),
    loadOwnershipProfile(stock.code, queryDate),
    loadEntityProfiles(stock.code, queryDate),
  ])
}

const handleDateChange = (val: string | null) => {
  if (!val) {
    selectedDate.value = defaultDate
  }
  if (selectedStock.value) {
    loadAdvancedHistory(selectedStock.value.code)
    loadOwnershipProfile(selectedStock.value.code, selectedDate.value || defaultDate)
    loadEntityProfiles(selectedStock.value.code, selectedDate.value || defaultDate)
  }
}

const loadOwnershipProfile = async (code: string, queryDate: string, force = false) => {
  const contextKey = `${code}|${queryDate}`
  if (!force && ownershipContextKey.value === contextKey) return
  if (!force && ownershipCache.has(contextKey)) {
    ownershipContextKey.value = contextKey
    ownershipProfile.value = ownershipCache.get(contextKey)
    return
  }

  ownershipContextKey.value = contextKey
  if (!force) ownershipProfile.value = null
  ownershipLoading.value = true
  try {
    const res: any = await api.get(`/stocks/${code}/ownership-profile?asOf=${queryDate}`)
    const profile = res.data || null
    ownershipCache.set(contextKey, profile)
    if (ownershipContextKey.value === contextKey) ownershipProfile.value = profile
  } catch (_) {
    if (ownershipContextKey.value === contextKey) ownershipProfile.value = null
  } finally {
    if (ownershipContextKey.value === contextKey) ownershipLoading.value = false
  }
}

const loadEntityProfiles = async (code: string, queryDate: string, force = false) => {
  const contextKey = `${code}|${queryDate}`
  if (!force && entityProfileContextKey.value === contextKey) return
  if (!force && entityProfileCache.has(contextKey)) {
    entityProfileContextKey.value = contextKey
    entityProfileData.value = entityProfileCache.get(contextKey)
    return
  }
  entityProfileContextKey.value = contextKey
  if (!force) entityProfileData.value = null
  entityProfileLoading.value = true
  try {
    const res: any = await api.get(`/quant/stocks/${code}/entity-profiles?asOf=${queryDate}`)
    const data = res.data || null
    entityProfileCache.set(contextKey, data)
    if (entityProfileContextKey.value === contextKey) entityProfileData.value = data
  } catch (_) {
    if (entityProfileContextKey.value === contextKey) entityProfileData.value = null
  } finally {
    if (entityProfileContextKey.value === contextKey) entityProfileLoading.value = false
  }
}

const refreshParticipantPanels = async () => {
  if (!selectedStock.value) return
  const queryDate = selectedDate.value || defaultDate
  await Promise.all([
    loadOwnershipProfile(selectedStock.value.code, queryDate, true),
    loadEntityProfiles(selectedStock.value.code, queryDate, true),
  ])
}

const loadAdvancedHistory = async (code: string) => {
  try {
    const queryDate = selectedDate.value || defaultDate
    const res: any = await api.get(`/stocks/${code}/advanced-history?date=${queryDate}`)
    advancedHistory.value = res.data || { realHistories: [], predictions: [], rollingPredictions: [] }
    const [forecastResult] = await Promise.allSettled([
      api.get(`/quant/stocks/${code}/latest-forecast?asOf=${queryDate}`),
    ])
    if (forecastResult.status === 'fulfilled') {
      const forecastRes: any = forecastResult.value
      latestForecast.value = forecastRes.data?.tradeDate === queryDate ? forecastRes.data : null
    } else {
      latestForecast.value = null
    }
    // 加载个人持仓与实盘动作
    if (res.data.position) {
      userHoldingShares.value = res.data.position.holdingShares || 0
      userCostPrice.value = res.data.position.costPrice || 0
    }
    if (res.data.userTrades) {
      userTradesList.value = res.data.userTrades || []
    }

    await nextTick()
    renderChart()
  } catch (err) {
    //
  }
}

const handleResize = () => {
  if (chartInstance) {
    chartInstance.resize()
  }
}

const renderChart = () => {
  if (!chartRef.value) return
  if (!chartInstance) {
    chartInstance = echarts.init(chartRef.value, 'dark')
    window.addEventListener('resize', handleResize)
  }

  const data = advancedHistory.value
  const isHist = isHistoryView.value
  const basePrediction = data.predictions.find((p: any) => p.isBase) || data.predictions[0]
  
  // 分时 x 轴 241 分钟
  let timeCategories: string[] = []
  if (basePrediction && basePrediction.timePoints) {
    timeCategories = basePrediction.timePoints.map((tp: any) => tp.time)
  } else {
    // A 股连续竞价共 242 个分钟时点（含 09:30、11:30、13:00、15:00）。
    for (let minute = 9 * 60 + 30; minute <= 11 * 60 + 30; minute++) {
      timeCategories.push(`${Math.floor(minute / 60).toString().padStart(2, '0')}:${(minute % 60).toString().padStart(2, '0')}`)
    }
    for (let minute = 13 * 60; minute <= 15 * 60; minute++) {
      timeCategories.push(`${Math.floor(minute / 60).toString().padStart(2, '0')}:${(minute % 60).toString().padStart(2, '0')}`)
    }
  }

  const series: any[] = []

  // 展示预测折线与置信区间
  const basePrices = basePrediction ? basePrediction.timePoints.map((tp: any) => tp.price) : []
  if (basePrices.length > 0) {
    series.push({
      name: '① 当前最可能走势',
      type: 'line',
      smooth: true,
      data: basePrices,
      itemStyle: { color: '#06b6d4' },
      lineStyle: { width: 2.5, type: 'solid' },
    })
    const lower = basePrediction.timePoints.map((tp: any) => tp.lower ?? null)
    const upper = basePrediction.timePoints.map((tp: any) => tp.upper ?? null)
    if (lower.some((value: any) => value !== null)) {
      series.push({ name: '偏弱情景', type: 'line', smooth: true, data: lower, symbol: 'none', itemStyle: { color: '#10b981' }, lineStyle: { width: 1, type: 'dashed', opacity: 0.8 } })
      series.push({ name: '偏强情景', type: 'line', smooth: true, data: upper, symbol: 'none', itemStyle: { color: '#ef4444' }, lineStyle: { width: 1, type: 'dashed', opacity: 0.8 } })
    }
  }

  if (data.rollingPredictions && data.rollingPredictions.length > 0) {
    const rollingMap = new Map(data.rollingPredictions.map((r: any) => [r.targetTime, r.predictedPrice]))
    const rollingDataArr = timeCategories.map((t: string) => rollingMap.get(t) || null)
    series.push({
      name: '② 盘中动态预测（历史留档＋未来最新）',
      type: 'line',
      smooth: true,
      data: rollingDataArr,
      itemStyle: { color: '#f59e0b' },
      lineStyle: { width: 1.5, type: 'dashed' },
    })
  }

  if (data.predictions) {
    data.predictions.filter((p: any) => !p.isBase).forEach((p: any, idx: number) => {
      const vPrices = p.timePoints.map((tp: any) => tp.price)
      series.push({
        name: `③ 重模拟修正对比线 (V${p.version})`,
        type: 'line',
        smooth: true,
        data: vPrices,
        itemStyle: { color: '#a855f7' },
        lineStyle: { width: 2, type: 'dotted' },
      })
    })
  }

  // 5. 涨乐财富通同款：分时顶底 Peak/Trough 自动标记 (最高顶点与最低底点高亮 Badge)
  if (data.realHistories && data.realHistories.length > 0) {
    const realPricesMap = new Map(data.realHistories.map((h: any) => [dayjs.utc(h.timestamp).tz('Asia/Shanghai').format('HH:mm'), h.realPrice]))
    const realDataArr = timeCategories.map((t: string) => realPricesMap.get(t) || null)

    // 计算分时顶点与底点
    let maxVal = -1
    let maxIdx = -1
    let minVal = 999999
    let minIdx = -1

    realDataArr.forEach((val: number | null, idx: number) => {
      if (val !== null && val !== undefined) {
        if (val > maxVal) { maxVal = val; maxIdx = idx }
        if (val < minVal) { minVal = val; minIdx = idx }
      }
    })

    const markPointsArr: any[] = []
    if (maxIdx >= 0) {
      markPointsArr.push({
        name: '分时波段顶 (T0高抛)',
        value: `分时顶 ¥${maxVal.toFixed(2)}`,
        xAxis: maxIdx,
        yAxis: maxVal,
        itemStyle: { color: '#ef4444' }
      })
    }
    if (minIdx >= 0) {
      markPointsArr.push({
        name: '分时波段底 (T0低吸)',
        value: `分时底 ¥${minVal.toFixed(2)}`,
        xAxis: minIdx,
        yAxis: minVal,
        itemStyle: { color: '#10b981' }
      })
    }

    series.push({
      name: isHist ? '真实历史开盘轨迹 (红实线)' : '④ 真实开盘轨迹 (红实线)',
      type: 'line',
      smooth: true,
      data: realDataArr,
      itemStyle: { color: '#ef4444' },
      lineStyle: { width: 3, type: 'solid' },
      areaStyle: {
        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: 'rgba(239, 68, 68, 0.25)' },
          { offset: 1, color: 'rgba(239, 68, 68, 0)' },
        ]),
      },
      markPoint: {
        symbol: 'pin',
        symbolSize: 45,
        label: {
          fontSize: 9,
          fontWeight: 'bold',
          color: '#ffffff'
        },
        data: markPointsArr
      }
    })
  }

  const option: echarts.EChartsOption = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(15, 23, 42, 0.95)',
      borderColor: '#334155',
      textStyle: { color: '#f8fafc', fontSize: 11 },
    },
    legend: {
      top: 0,
      textStyle: { color: '#94a3b8', fontSize: 10 },
    },
    grid: {
      left: '2%',
      right: '3%',
      bottom: '3%',
      top: '20%',
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: timeCategories,
      axisLine: { lineStyle: { color: '#334155' } },
      axisLabel: {
        color: '#64748b',
        fontSize: 10,
        interval: (_index: number, value: string) => {
          return ['09:30', '10:00', '10:30', '11:00', '11:30', '13:30', '14:00', '14:30', '15:00'].includes(value)
        },
        formatter: (value: string) => {
          if (value === '11:30') return '11:30/13:00'
          return value
        }
      },
    },
    yAxis: {
      type: 'value',
      scale: true,
      axisLine: { lineStyle: { color: '#334155' } },
      splitLine: { lineStyle: { color: 'rgba(255, 255, 255, 0.05)' } },
      axisLabel: { color: '#64748b', fontSize: 10 },
    },
    series,
  }

  chartInstance.setOption(option, true)
}

const todayDateStr = computed(() => dayjs().format('YYYY-MM-DD'))

const isHistoryView = computed(() => {
  return selectedDate.value < todayDateStr.value
})

const isPreMarketTime = computed(() => {
  const now = new Date()
  const day = now.getDay()
  if (day === 0 || day === 6) return false
  const currentMins = now.getHours() * 60 + now.getMinutes()
  return currentMins >= 9 * 60 + 15 && currentMins < 9 * 60 + 30
})

const isTradingTime = computed(() => {
  const now = new Date()
  const day = now.getDay()
  if (day === 0 || day === 6) return false
  const currentMins = now.getHours() * 60 + now.getMinutes()
  return (currentMins >= 9 * 60 + 30 && currentMins <= 11 * 60 + 30) || (currentMins >= 13 * 60 && currentMins <= 15 * 60)
})

const shouldAutoRefresh = computed(() => {
  if (isHistoryView.value) return false
  return isTradingTime.value || isPreMarketTime.value
})

// 格式化文本中的 \n 或纯换行
const formatText = (text: string | undefined) => {
  if (!text) return ''
  return text.replace(/\\n/g, '\n')
}

const userHoldingShares = ref<number>(0)
const userCostPrice = ref<number>(0)
const tradeActionType = ref<string>('BUY')
const tradePrice = ref<number>(0)
const tradeShares = ref<number>(1000)
const userTradesList = ref<any[]>([])

const saveUserPosition = async () => {
  if (!selectedStock.value) return
  try {
    await ElMessageBox.confirm(
      `确定将 ${selectedStock.value.name} (${selectedStock.value.code}) 的个人底仓更新为 ${userHoldingShares.value} 股，成本设定为 ¥${userCostPrice.value.toFixed(2)} 吗？`,
      '确认更新个人底仓',
      { confirmButtonText: '确定更新', cancelButtonText: '取消', type: 'info' }
    )
    await api.post('/user/position', {
      stockCode: selectedStock.value.code,
      holdingShares: userHoldingShares.value,
      costPrice: userCostPrice.value
    })
    ElMessage.success('个人底仓与成本已锁定更新！战术对策盘已重新计算')
    loadAdvancedHistory(selectedStock.value.code)
  } catch (err: any) {
    if (err !== 'cancel') ElMessage.error('保存底仓失败')
  }
}

const submitTradeAction = async () => {
  if (!selectedStock.value) return
  const p = tradePrice.value || selectedStock.value.currentPrice
  const s = tradeShares.value || 1000
  const actionText = tradeActionType.value === 'BUY' ? '🔴 挂单买入' : '🟢 挂单卖出'
  try {
    await ElMessageBox.confirm(
      `确定录入 ${selectedStock.value.name} 的动作【${actionText} ${s} 股 @ ¥${p.toFixed(2)} 元】吗？提交后将瞬间重塑个人战术对策卡片。`,
      '二次确认实盘动作',
      { confirmButtonText: '确认录入', cancelButtonText: '取消', type: 'warning' }
    )
    await api.post('/user/trade-action', {
      stockCode: selectedStock.value.code,
      actionType: tradeActionType.value,
      tradePrice: p,
      tradeShares: s
    })
    ElMessage.success(`秒级录入成功：${tradeActionType.value === 'BUY' ? '买入' : '卖出'} ${s} 股 @ ¥${p.toFixed(2)}`)
    loadAdvancedHistory(selectedStock.value.code)
  } catch (err: any) {
    if (err !== 'cancel') ElMessage.error('录入实盘动作失败')
  }
}

const deleteTradeAction = async (tradeId: number) => {
  if (!selectedStock.value || !tradeId) return
  try {
    await ElMessageBox.confirm(
      '确定要撤销并删除该笔实盘操作记录吗？撤销后战术卡片将恢复上一次实盘状态。',
      '撤销操作确认',
      { confirmButtonText: '确定撤销', cancelButtonText: '取消', type: 'warning' }
    )
    await api.delete(`/user/trade-action/${tradeId}?stockCode=${selectedStock.value.code}`)
    ElMessage.success('成功撤销该笔实盘操作！战术对策卡片已重新计算')
    loadAdvancedHistory(selectedStock.value.code)
  } catch (err: any) {
    if (err !== 'cancel') ElMessage.error('撤销操作失败')
  }
}

// 🎯 个人专属战术应变诊断与操作指示算法
const tacticalAdvice = computed(() => {
  if (!selectedStock.value) {
    return {
      title: '等待选择股票...',
      content: '请先在顶部选择要操作的股票。',
      cardClass: 'bg-slate-900 border-slate-800 text-slate-400',
      titleClass: 'text-slate-400 border-slate-800',
      textClass: 'text-slate-400'
    }
  }

  if (!decisionGuide.value?.actionable) {
    return {
      title: '研究模式：当前不生成自动交易动作',
      content: '当前只是基础试运行模型，尚未通过多年样本训练、样本外验证和模拟成交检验。页面的低吸区、高抛区只是帮助观察价格位置，必须等待止跌或滞涨确认。',
      cardClass: 'bg-amber-950/60 border-amber-500/50 text-amber-200',
      titleClass: 'text-amber-300 border-amber-800',
      textClass: 'text-amber-100'
    }
  }

  const currP = selectedStock.value.currentPrice
  const pHigh = decisionGuide.value?.sellHigh ?? selectedStock.value.currentPrice
  const pLow = decisionGuide.value?.buyLow ?? selectedStock.value.currentPrice
  const costP = userCostPrice.value || 0
  const shares = userHoldingShares.value || 0
  const lastTrade = userTradesList.value.length > 0 ? userTradesList.value[0] : null

  // 1. 刚刚执行了【卖出 SELL】动作后的秒级应变对策
  if (lastTrade && lastTrade.actionType === 'SELL') {
    const sellP = lastTrade.tradePrice
    const diffPct = ((currP - sellP) / sellP) * 100

    if (currP > sellP && currP > pHigh) {
      // 踩空卖飞大涨：急迫买回提醒
      return {
        title: `🚨 踩空预警：刚刚在 ¥${sellP.toFixed(2)} 卖出后，股价暴涨至 ¥${currP.toFixed(2)} (+${diffPct.toFixed(2)}%)！`,
        content: `【踩空应对】：价格已经超出原上行情景，但公开数据不能确认是谁在推动。不要直接追价；等待分钟模型重算并观察回踩是否守住 ¥${pHigh.toFixed(2)}，再结合可卖库存和最大风险决定是否接回。`,
        cardClass: 'bg-red-950/80 border-red-500 text-red-200',
        titleClass: 'text-red-400 border-red-900',
        textClass: 'text-red-300'
      }
    } else if (currP < sellP) {
      // 卖对大跌：回调接回成功
      return {
        title: `🎯 卖出后出现回落：卖出价 ¥${sellP.toFixed(2)}，现价 ¥${currP.toFixed(2)}，毛差价 ${((sellP - currP)/sellP*100).toFixed(2)}%`,
        content: `【接回观察】：当前毛差价尚未扣除交易费用和滑点。等待价格接近 ¥${pLow.toFixed(2)} 且出现止跌确认，再评估是否接回 ${lastTrade.tradeShares} 股；若继续放量下跌，不要机械接回。`,
        cardClass: 'bg-emerald-950/80 border-emerald-500 text-emerald-200',
        titleClass: 'text-emerald-400 border-emerald-900',
        textClass: 'text-emerald-300'
      }
    }
  }

  // 2. 刚刚执行了【买入 BUY】动作后的秒级应变对策
  if (lastTrade && lastTrade.actionType === 'BUY') {
    const buyP = lastTrade.tradePrice
    const dropPct = ((buyP - currP) / buyP) * 100

    if (currP < buyP && dropPct >= 1.5) {
      // 买高被套：补仓或平仓止损
      return {
        title: `🛡️ 买高被套警告：刚刚在 ¥${buyP.toFixed(2)} 买入后，现价下跌至 ¥${currP.toFixed(2)} (-${dropPct.toFixed(2)}%)`,
        content: `【风险应变】：价格已明显低于买入价。先停止继续摊薄；若跌破当前偏弱边界 ¥${pLow.toFixed(2)}，按个人最大亏损和可卖库存处理。只有重新站回观察区并出现止跌证据，才重新评估。`,
        cardClass: 'bg-amber-950/80 border-amber-500 text-amber-200',
        titleClass: 'text-amber-400 border-amber-900',
        textClass: 'text-amber-300'
      }
    } else if (currP > buyP) {
      // 低吸买成功，等待高抛
      return {
        title: `🟢 买入后价格有利：买入价 ¥${buyP.toFixed(2)}，现价 ¥${currP.toFixed(2)}`,
        content: `【卖出观察】：价格若接近 ¥${pHigh.toFixed(2)}，观察是否出现冲高不过或买盘衰减，再决定是否分批卖出；持续放量突破时不要机械按旧上界卖出。`,
        cardClass: 'bg-emerald-950/80 border-emerald-500 text-emerald-200',
        titleClass: 'text-emerald-400 border-emerald-900',
        textClass: 'text-emerald-300'
      }
    }
  }

  // 3. 常规根据个人成本 costP 与预判区间的战术诊断
  if (shares > 0 && costP > 0) {
    const profitPct = ((currP - costP) / costP) * 100
    if (costP > pHigh) {
      return {
        title: `⚠️ 成本位置提醒：持仓成本 ¥${costP.toFixed(2)} 高于当前偏强边界 ¥${pHigh.toFixed(2)}`,
        content: `当前相对成本收益为 ${profitPct.toFixed(2)}%。模型没有证据证明本轮能回到成本线；低位 ¥${pLow.toFixed(2)} 和高位 ¥${pHigh.toFixed(2)} 仅作为观察边界，先核对可卖库存、费用和单日最大损失。`,
        cardClass: 'bg-purple-950/80 border-purple-500 text-purple-200',
        titleClass: 'text-purple-400 border-purple-900',
        textClass: 'text-purple-300'
      }
    }
  }

  // 4. 无特异解盘事件时返回 null，由右侧统一卡片精炼显示，避免左侧重复显示冗余常规指导
  return null
})

// ==========================================
// 🤖 首席量化策略分析师 · AI 实时对话与预测矫正逻辑
// ==========================================
const isChatOpen = ref(false)
const chatMessages = ref<any[]>([])
const chatInput = ref('')
const isSendingChat = ref(false)
const chatContainerRef = ref<HTMLElement | null>(null)
const isRecordingVoice = ref(false)
const recognitionRef = ref<any>(null)

// 中文交易口语与数字同音字自动清洗纠错
const cleanVoiceTradingText = (text: string) => {
  if (!text) return ''
  return text
    .replace(/块钱|块前|快钱/g, '元')
    .replace(/买聊|买辽|迈聊/g, '买了')
    .replace(/卖聊|卖辽|出聊|抛聊/g, '卖了')
    .replace(/建仓聊/g, '建仓了')
    .replace(/加仓聊/g, '加仓了')
    .replace(/减仓聊/g, '减仓了')
    .replace(/平仓聊/g, '平仓了')
    .replace(/止损聊/g, '止损了')
    .replace(/三块八毛五|三块八五|3块8毛5/g, '3.85')
    .replace(/三块九毛|三块九|3块9/g, '3.90')
    .replace(/三块八/g, '3.80')
    .replace(/四块零二|四块零两分/g, '4.02')
    .replace(/四块/g, '4.00')
    .replace(/七块零五|七块五分/g, '7.05')
    .replace(/七块/g, '7.00')
    .replace(/十四块八/g, '14.80')
    .replace(/十五块四/g, '15.40')
    .replace(/一千股|1千股/g, '1000股')
    .replace(/两千股|2千股|二千股/g, '2000股')
    .replace(/三千股|3千股/g, '3000股')
    .replace(/四千股|4千股/g, '4000股')
    .replace(/五千股|5千股/g, '5000股')
    .replace(/一万股|1万股/g, '10000股')
    .replace(/一手/g, '100股')
    .replace(/十手/g, '1000股')
    .replace(/二十手/g, '2000股')
    .replace(/五十手/g, '5000股')
}

// 语音识别录音与实时纠错
const toggleVoiceRecording = () => {
  const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
  if (!SpeechRecognition) {
    ElMessage.warning('当前浏览器暂未开放语音识别接口，建议使用键盘语音输入或手动输入 🎙️')
    return
  }

  if (isRecordingVoice.value) {
    if (recognitionRef.value) {
      try { recognitionRef.value.stop() } catch (_) {}
    }
    isRecordingVoice.value = false
    ElMessage.success('语音录入结束 ✨')
    return
  }

  try {
    const recognition = new SpeechRecognition()
    recognition.lang = 'zh-CN'
    recognition.continuous = false
    recognition.interimResults = true

    recognition.onstart = () => {
      isRecordingVoice.value = true
      ElMessage.info('🎙️ 正在聆听您的交易指令与提问...')
    }

    recognition.onresult = (event: any) => {
      let transcript = ''
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        transcript += event.results[i][0].transcript
      }
      if (transcript) {
        chatInput.value = cleanVoiceTradingText(transcript)
      }
    }

    recognition.onerror = (event: any) => {
      isRecordingVoice.value = false
      if (event.error !== 'no-speech') {
        ElMessage.error('语音识别异常: ' + event.error)
      }
    }

    recognition.onend = () => {
      isRecordingVoice.value = false
    }

    recognitionRef.value = recognition
    recognition.start()
  } catch (err: any) {
    isRecordingVoice.value = false
    ElMessage.error('启动麦克风失败，请确认录音权限')
  }
}

const formatMarkdownToHtml = (content: string) => {
  if (!content) return ''
  return content
    .replace(/\*\*(.*?)\*\*/g, '<strong class="text-cyan-300 font-bold">$1</strong>')
    .replace(/^### (.*$)/gim, '<h3 class="text-xs font-black text-cyan-400 border-b border-slate-800 pb-1 my-1">$1</h3>')
    .replace(/^- (.*$)/gim, '<div class="pl-2 flex items-start gap-1.5"><span class="text-cyan-400 font-bold">•</span><span>$1</span></div>')
}

const scrollChatToBottom = () => {
  nextTick(() => {
    if (chatContainerRef.value) {
      chatContainerRef.value.scrollTop = chatContainerRef.value.scrollHeight
    }
  })
}

const fetchChatMessages = async () => {
  if (!selectedStock.value) return
  try {
    const res: any = await api.get(`/chat/messages?stockCode=${selectedStock.value.code}`)
    chatMessages.value = res.data || []
    scrollChatToBottom()
  } catch (err: any) {
    console.error('Fetch chat error:', err)
  }
}

const openAiChat = () => {
  isChatOpen.value = true
  fetchChatMessages()
}

// 4. 拟真流式打字机逐字输出组件
const typewriterEffect = (targetMsg: any, fullText: string, onComplete?: () => void) => {
  let currentIndex = 0
  targetMsg.displayContent = ''
  targetMsg.isTyping = true
  
  const totalLength = fullText.length
  const step = totalLength > 600 ? 3 : (totalLength > 250 ? 2 : 1)
  const interval = totalLength > 600 ? 12 : 18

  const timer = setInterval(() => {
    currentIndex += step
    if (currentIndex >= totalLength) {
      targetMsg.displayContent = fullText
      targetMsg.isTyping = false
      clearInterval(timer)
      scrollChatToBottom()
      if (onComplete) onComplete()
    } else {
      targetMsg.displayContent = fullText.slice(0, currentIndex)
      if (chatContainerRef.value) {
        chatContainerRef.value.scrollTop = chatContainerRef.value.scrollHeight
      }
    }
  }, interval)
}

const handleQuickQuestion = async (q: string) => {
  chatInput.value = q
  await handleSendChat()
}

const handleSendChat = async () => {
  if (!selectedStock.value || !chatInput.value.trim() || isSendingChat.value) return
  const userText = chatInput.value.trim()
  chatInput.value = ''
  
  // 先把用户消息推入列表
  chatMessages.value.push({
    role: 'user',
    content: userText,
    createdAt: dayjs().tz('Asia/Shanghai').format('YYYY-MM-DD HH:mm:ss')
  })
  scrollChatToBottom()

  isSendingChat.value = true
  try {
    const res: any = await api.post('/chat/send', {
      stockCode: selectedStock.value.code,
      message: userText
    })
    
    // 创建打字机消息占位
    const assistantMsg = reactive({
      id: res.data?.id || 0,
      role: 'assistant',
      content: res.data?.content || '',
      displayContent: '',
      isTyping: true,
      createdAt: res.data?.createdAt || dayjs().tz('Asia/Shanghai').format('YYYY-MM-DD HH:mm:ss')
    })
    chatMessages.value.push(assistantMsg)
    scrollChatToBottom()
    
    // 启动拟真打字机逐字输出
    typewriterEffect(assistantMsg, res.data?.content || '', () => {
      // 输出完成后，如果包含交易操作，刷新左侧实盘仓位与战术卡片
      if (res.data?.content && (res.data.content.includes('实盘操作已同步') || res.data.content.includes('实盘买入') || res.data.content.includes('实盘高抛') || res.data.content.includes('持仓底仓已同步'))) {
        loadAdvancedHistory(selectedStock.value.code)
      }
    })
  } catch (err: any) {
    console.error('Chat error:', err)
    ElMessage.error(err.response?.data?.message || err.message || '量化分析师推演超时，请稍后重试')
  } finally {
    isSendingChat.value = false
  }
}

const handleClearChat = async () => {
  if (!selectedStock.value) return
  try {
    await ElMessageBox.confirm('确定清空当前标的与量化分析师的历史推演对话吗？', '清空确认', {
      confirmButtonText: '清空',
      cancelButtonText: '取消',
      type: 'warning'
    })
    await api.delete(`/chat/messages?stockCode=${selectedStock.value.code}`)
    chatMessages.value = []
    ElMessage.success('对话记录已清空')
    fetchChatMessages()
  } catch (err: any) {
    if (err !== 'cancel') ElMessage.error('清空失败')
  }
}

const handleLogout = () => {
  localStorage.removeItem('zeroquant_token')
  localStorage.removeItem('zeroquant_user')
  ElMessage.success('已退出登录')
  router.replace('/login')
}

const AUTO_REFRESH_SECONDS = 60
const countdown = ref(AUTO_REFRESH_SECONDS)

onMounted(() => {
  fetchStockList()
  timer = setInterval(() => {
    signalClock.value = Date.now()
    if (!shouldAutoRefresh.value) {
      countdown.value = AUTO_REFRESH_SECONDS
      return // 不开盘/看历史数据时直接跳过，零刷新消耗！
    }

    countdown.value--
    if (countdown.value <= 0) {
      countdown.value = AUTO_REFRESH_SECONDS
      fetchStockList()
      if (selectedStock.value) {
        loadAdvancedHistory(selectedStock.value.code)
      }
    }
  }, 1000)
})

onUnmounted(() => {
  if (timer) clearInterval(timer)
  if (recognitionRef.value) {
    try { recognitionRef.value.stop() } catch (_) {}
  }
  if (chartInstance) {
    window.removeEventListener('resize', handleResize)
    chartInstance.dispose()
  }
})
</script>

<style scoped>
:deep(.custom-datepicker .el-input__wrapper) {
  background-color: rgba(15, 23, 42, 0.8) !important;
  border: 1px solid rgba(255, 255, 255, 0.1) !important;
  border-radius: 12px !important;
  color: #06b6d4 !important;
}
</style>
