<template>
  <div class="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
    <!-- 顶部 NAVIGATION HEADER (移动端自适应 Height & Flex Wrap) -->
    <header class="min-h-14 py-2 border-b border-slate-800/80 bg-slate-900/90 backdrop-blur-md px-3 md:px-6 flex flex-wrap items-center justify-between sticky top-0 z-50 gap-2">
      <div class="flex items-center gap-2 md:gap-3 flex-wrap">
        <div class="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-lg shadow-cyan-500/20 shrink-0">
          <el-icon class="text-lg"><DataAnalysis /></el-icon>
        </div>
        <h1 class="text-sm font-black tracking-wide bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent shrink-0">ZeroQuant 智脑做 T 大盘</h1>

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
                <span>{{ selectedStock.name }} ({{ selectedStock.code }}) 多维折线重叠对比</span>
                <span class="text-[10px] font-mono text-cyan-400 bg-cyan-950/80 border border-cyan-800/60 px-2 py-0.5 rounded-full">
                  {{ selectedDate }}
                </span>

                <!-- 开盘前 10min 09:20 终极看涨/看跌幅度 Badge (仅在非历史日期显示) -->
                <span v-if="!isHistoryView && basePrediction"
                  class="text-[10px] font-mono font-black px-2 py-0.5 rounded-full border shadow-sm flex items-center gap-1"
                  :class="basePrediction.direction === '看涨' ? 'bg-red-950/90 border-red-500/80 text-red-400' : 'bg-emerald-950/90 border-emerald-500/80 text-emerald-400'">
                  <span>09:20 终极预判:</span>
                  <span>{{ basePrediction.direction }} {{ basePrediction.targetPct >= 0 ? '+' : '' }}{{ basePrediction.targetPct }}%</span>
                </span>

                <!-- 重新模拟新版本预测 Badge (值二, 值三...) -->
                <span v-if="!isHistoryView" v-for="p in versionPredictions" :key="p.version"
                  class="text-[10px] font-mono font-black px-2 py-0.5 rounded-full border bg-purple-950/90 border-purple-500/80 text-purple-300">
                  <span>值{{ p.version }}:</span>
                  <span>{{ p.direction || '看涨' }} {{ p.targetPct >= 0 ? '+' : '' }}{{ p.targetPct || 1.2 }}%</span>
                </span>
              </h2>
              <p class="text-[10px] sm:text-[11px] text-slate-400 mt-0.5 leading-snug">① 09:20 终极基准预判线 (固定实线) ② 盘中动态重塑全天趋势线 (黄虚线 - 实时重塑全天走向) ③ 重模拟对比线 ④ 真实开盘轨迹 (红实线)</p>
            </div>
            
            <div class="flex items-center gap-2 self-end sm:self-auto">
              <el-button v-if="hasDeviated" type="warning" size="small" class="!text-[11px] !px-2" @click="handleRePredict">
                <el-icon class="mr-1"><TrendCharts /></el-icon> 重新模拟新线
              </el-button>
              
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

          <!-- ECharts 容器 (移动端高度 220px / 桌面端 280px 响应式) -->
          <div ref="chartRef" class="w-full h-64 sm:h-72"></div>
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
                  <option value="BUY" class="bg-slate-900 text-red-400">🔴 我刚刚挂单买入 (BUY)</option>
                  <option value="SELL" class="bg-slate-900 text-emerald-400">🟢 我刚刚挂单卖出 (SELL)</option>
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
                <span>秒级提交并精算战术</span>
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

        <!-- 右侧 1 列：做 T 关键位与控盘风格 -->
        <div class="glass-card p-3 sm:p-4 border border-slate-800 flex flex-col justify-between space-y-3">
          <h3 class="text-xs sm:text-sm font-extrabold text-cyan-400 border-b border-slate-800 pb-2 flex items-center gap-1.5">
            <el-icon><Compass /></el-icon>
            <span>{{ selectedStock.name }} 盘中关键位</span>
          </h3>

          <!-- 做 T 预测关键位 (与 ECharts 预测折线极值 100% 精确对齐) -->
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-1.5 sm:gap-2 font-mono text-xs">
            <div class="bg-slate-950/80 p-1.5 sm:p-2 rounded-xl border border-emerald-500/40 text-center">
              <div class="text-[10px] text-emerald-400 font-bold">预测低吸支撑</div>
              <div class="text-emerald-400 font-bold text-xs mt-0.5">¥{{ selectedStock.predictedLow.toFixed(2) }}</div>
            </div>
            <div class="bg-slate-950/80 p-1.5 sm:p-2 rounded-xl border border-red-500/40 text-center">
              <div class="text-[10px] text-red-400 font-bold">预测高抛阻力</div>
              <div class="text-red-400 font-bold text-xs mt-0.5">¥{{ selectedStock.predictedHigh.toFixed(2) }}</div>
            </div>
            <div class="bg-slate-950/60 p-1.5 sm:p-2 rounded-xl border border-slate-800 text-center">
              <div class="text-[10px] text-slate-400">基准收盘价</div>
              <div class="text-cyan-400 font-bold text-xs mt-0.5">¥{{ selectedStock.currentPrice.toFixed(2) }}</div>
            </div>
            <div class="bg-slate-950/60 p-1.5 sm:p-2 rounded-xl border border-slate-800 text-center">
              <div class="text-[10px] text-slate-400">做 T 空间振幅</div>
              <div class="text-amber-400 font-bold text-xs mt-0.5">¥{{ (selectedStock.predictedHigh - selectedStock.predictedLow).toFixed(2) }}</div>
            </div>
          </div>

          <!-- 实盘历史极端参照位 -->
          <div class="flex items-center justify-between text-[10px] font-mono text-slate-400 px-1 bg-slate-950/40 py-1 rounded-lg border border-slate-800/60">
            <span>昨收: ¥{{ selectedStock.yesterdayPrice.toFixed(2) }}</span>
            <span>实盘最高: ¥{{ selectedStock.highPrice.toFixed(2) }}</span>
            <span>实盘最低: ¥{{ selectedStock.lowPrice.toFixed(2) }}</span>
          </div>

          <!-- 盘中动态重塑全天趋势与做 T 战术动作一体化卡片 (高对比度、零冗余，一秒全局读懂) -->
          <div v-if="selectedStock" class="bg-gradient-to-r from-cyan-950/60 via-slate-900/90 to-indigo-950/60 border border-cyan-500/50 p-3 rounded-xl shadow-xl space-y-2">
            <div class="text-cyan-300 font-extrabold flex items-center justify-between border-b border-cyan-500/30 pb-1.5 text-xs">
              <div class="flex items-center gap-1.5">
                <el-icon><Compass /></el-icon>
                <span>【🎯 实盘做 T 决策与后续动作指引】</span>
              </div>
              <span class="text-[10px] bg-cyan-500/20 text-cyan-300 px-1.5 py-0.5 rounded font-mono">1min 实时重塑</span>
            </div>

            <!-- 1. 实时分盘与封板/破位状态判断条 -->
            <div class="text-[11px]">
              <template v-if="selectedStock.currentPrice > 0 && selectedStock.yesterdayPrice > 0 && (selectedStock.currentPrice / selectedStock.yesterdayPrice >= 1.098 || selectedStock.currentPrice / selectedStock.yesterdayPrice <= 0.902)">
                <div class="bg-amber-950/60 border border-amber-500/50 p-2 rounded-lg text-amber-200">
                  <span class="font-bold text-amber-300">🔒【封板做不了 T】：</span>
                  当前封住 <span class="font-bold text-amber-400">{{ selectedStock.currentPrice / selectedStock.yesterdayPrice >= 1.098 ? '涨停板' : '跌停板' }} (¥{{ selectedStock.currentPrice.toFixed(2) }})</span>，筹码锁定无套利空间。
                  <span class="font-bold text-amber-300">明确动作：停止做 T，锁仓等待明日 09:20 竞价开盘。</span>
                </div>
              </template>
              <template v-else-if="(selectedStock.predictedHigh - selectedStock.predictedLow) / selectedStock.yesterdayPrice < 0.01">
                <div class="bg-slate-900/80 border border-slate-700/80 p-2 rounded-lg text-slate-300">
                  <span class="font-bold text-slate-200">⏸️【微幅震荡做不了 T】：</span>
                  预测振幅仅 ¥{{ (selectedStock.predictedHigh - selectedStock.predictedLow).toFixed(2) }} (&lt;1.0%)。
                  <span class="font-bold text-cyan-300">明确动作：扣除税费无盈利空间，建议观望等待大箱体。</span>
                </div>
              </template>
              <template v-else-if="selectedStock.currentPrice > selectedStock.predictedHigh">
                <div class="bg-amber-950/60 border border-amber-500/50 p-2 rounded-lg text-amber-200">
                  <span class="font-bold text-amber-300">🚨【趋势突破上移 / 踩空预警】：</span>
                  现价 ¥{{ selectedStock.currentPrice.toFixed(2) }} 突破阻力位 ¥{{ selectedStock.predictedHigh.toFixed(2) }}！
                  <span class="font-bold text-amber-200">若已卖出，建议在突破确认位 ¥{{ selectedStock.predictedHigh.toFixed(2) }} 附近买回，切勿盲目做空！</span>
                </div>
              </template>
              <template v-else-if="selectedStock.currentPrice < selectedStock.predictedLow">
                <div class="bg-red-950/60 border border-red-500/50 p-2 rounded-lg text-red-200">
                  <span class="font-bold text-red-400">🔴【趋势下探寻底 / 慎加仓】：</span>
                  现价 ¥{{ selectedStock.currentPrice.toFixed(2) }} 跌破预判支撑 ¥{{ selectedStock.predictedLow.toFixed(2) }}！
                  <span class="font-bold text-red-300">注意 1.5% 止损纪律；待托盘企稳后再买回。</span>
                </div>
              </template>
              <template v-else>
                <div class="bg-emerald-950/40 border border-emerald-500/40 p-2 rounded-lg text-emerald-200 flex items-center justify-between">
                  <span>🟢 <span class="font-bold text-emerald-300">常态箱体震荡</span> [¥{{ selectedStock.predictedLow.toFixed(2) }} ~ ¥{{ selectedStock.predictedHigh.toFixed(2) }}]</span>
                  <span class="font-mono text-[10px] text-emerald-400 font-bold">按预判做 T</span>
                </div>
              </template>
            </div>

            <!-- 2. 精准高对比做 T 动作与操作指示框 (零冗余废话，一秒读懂价位) -->
            <div v-if="!((selectedStock.currentPrice / selectedStock.yesterdayPrice >= 1.098 || selectedStock.currentPrice / selectedStock.yesterdayPrice <= 0.902) || (selectedStock.predictedHigh - selectedStock.predictedLow) / selectedStock.yesterdayPrice < 0.01)" class="grid grid-cols-1 gap-1.5 text-[11px] font-mono">
              <div class="bg-red-950/40 border border-red-500/30 p-2 rounded-lg flex items-center justify-between">
                <div>
                  <span class="font-bold text-red-400">🔴 高抛动作:</span>
                  在 <span class="font-bold text-red-300 text-xs">¥{{ selectedStock.predictedHigh.toFixed(2) }}</span> 卖出
                  <span class="text-slate-400 text-[10px]"> ➔ 回调至 </span>
                  <span class="font-bold text-emerald-400 text-xs">¥{{ selectedStock.predictedLow.toFixed(2) }}</span> 接回
                </div>
                <span class="text-amber-400 font-bold text-[10px]">差价 ¥{{ (selectedStock.predictedHigh - selectedStock.predictedLow).toFixed(2) }}</span>
              </div>

              <div class="bg-emerald-950/40 border border-emerald-500/30 p-2 rounded-lg flex items-center justify-between">
                <div>
                  <span class="font-bold text-emerald-400">🟢 低吸动作:</span>
                  在 <span class="font-bold text-emerald-300 text-xs">¥{{ selectedStock.predictedLow.toFixed(2) }}</span> 买入
                  <span class="text-slate-400 text-[10px]"> ➔ 冲高至 </span>
                  <span class="font-bold text-red-400 text-xs">¥{{ selectedStock.predictedHigh.toFixed(2) }}</span> 平仓
                </div>
                <span class="text-cyan-400 font-bold text-[10px]">平仓解盘</span>
              </div>

              <div class="bg-slate-950/80 border border-red-900/40 p-1.5 rounded-lg flex items-center justify-between text-[10px]">
                <span class="text-red-400 font-bold">🚨 强止损线:</span>
                <span class="text-slate-300">跌破 <span class="font-bold text-red-300 font-mono">¥{{ (selectedStock.predictedLow * 0.985).toFixed(2) }}</span> (破位 1.5%)，14:30 前坚决平 T 仓止损</span>
              </div>
            </div>
          </div>

          <div v-if="currentAnalysis" class="space-y-2 text-[11px]">
            <!-- 核心主控席位与历史行为观察 -->
            <div class="bg-cyan-950/40 border border-cyan-500/30 p-2.5 rounded-xl">
              <div class="text-cyan-400 font-bold mb-0.5 flex items-center gap-1">
                <el-icon><User /></el-icon>
                <span>【核心主控席位与 500 日分时习惯分析】</span>
              </div>
              <div class="text-cyan-200/90 leading-snug whitespace-pre-line">{{ formatText(currentAnalysis.hostStyle) }}</div>
            </div>

            <div class="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800/80">
              <div class="text-slate-400 font-bold mb-0.5">【全天波动预测依据与时间切片】</div>
              <div class="text-slate-200 leading-snug whitespace-pre-line">{{ formatText(currentAnalysis.chipAnalysis) }}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- 每日龙虎榜 / 大宗交易与机构持仓复盘面板 -->
      <div v-if="dailyReview" class="glass-card p-3 sm:p-4 border border-slate-800 space-y-2">
        <h3 class="text-xs sm:text-sm font-extrabold text-cyan-400 border-b border-slate-800 pb-2 flex items-center gap-1.5">
          <el-icon><Tickets /></el-icon>
          <span>{{ selectedStock.name }} 每日龙虎榜大宗交易与机构持仓复盘</span>
        </h3>

        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3 text-[11px]">
          <div class="p-2.5 sm:p-3 rounded-xl bg-slate-900/80 border border-slate-800/80">
            <div class="font-bold text-amber-400 text-xs mb-1">🏛️ 1. 席位与大宗买卖明细</div>
            <div class="text-slate-300 leading-relaxed">{{ dailyReview.blockTrades }}</div>
          </div>

          <div class="p-2.5 sm:p-3 rounded-xl bg-slate-900/80 border border-slate-800/80">
            <div class="font-bold text-cyan-400 text-xs mb-1">📊 2. 机构与外资持股比例</div>
            <div class="text-slate-300 leading-relaxed">{{ dailyReview.holdingRatio }}</div>
          </div>

          <div class="p-2.5 sm:p-3 rounded-xl bg-slate-900/80 border border-slate-800/80">
            <div class="font-bold text-purple-400 text-xs mb-1">⚡ 3. 主控风格与行为特征</div>
            <div class="text-slate-300 leading-relaxed">{{ dailyReview.institutionStyle }}</div>
          </div>

          <div class="p-2.5 sm:p-3 rounded-xl bg-slate-900/80 border border-slate-800/80">
            <div class="font-bold text-emerald-400 text-xs mb-1">💡 4. 推荐明日操作与仓位</div>
            <div class="text-slate-300 leading-relaxed">{{ dailyReview.tomorrowAdvice }}</div>
          </div>
        </div>

        <!-- 每日预测偏差剖析与算法自我修正总结 -->
        <div v-if="dailyReview.deviationReason" class="mt-3 p-3 rounded-xl bg-slate-950/80 border border-cyan-500/30 text-[11px] space-y-2">
          <div class="font-bold text-cyan-400 text-xs border-b border-slate-800/80 pb-1 flex items-center gap-1.5">
            <el-icon><Notebook /></el-icon>
            <span>每日预测偏差剖析与算法自我总结复盘 (自动注入后续精算)</span>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-3 gap-2.5">
            <div class="p-2 rounded-lg bg-red-950/20 border border-red-900/30">
              <div class="font-bold text-red-400 text-[11px] mb-0.5">🔍 为什么出现预测偏差？</div>
              <div class="text-slate-300 leading-relaxed">{{ dailyReview.deviationReason }}</div>
            </div>

            <div class="p-2 rounded-lg bg-amber-950/20 border border-amber-900/30">
              <div class="font-bold text-amber-400 text-[11px] mb-0.5">🧠 总结出的博弈道理</div>
              <div class="text-slate-300 leading-relaxed">{{ dailyReview.keyLesson }}</div>
            </div>

            <div class="p-2 rounded-lg bg-emerald-950/20 border border-emerald-900/30">
              <div class="font-bold text-emerald-400 text-[11px] mb-0.5">⚙️ 后续算法改进与预判演进</div>
              <div class="text-slate-300 leading-relaxed">{{ dailyReview.futureAction }}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Level-2 逐笔大单 (≥1000手) 监控面板 (全屏宽) -->
      <div v-if="selectedStock" class="glass-card p-3 sm:p-4 border border-slate-800 space-y-2">
        <h3 class="text-xs sm:text-sm font-extrabold text-cyan-400 border-b border-slate-800 pb-2 flex items-center justify-between">
          <span class="flex items-center gap-1.5"><el-icon><Monitor /></el-icon>{{ selectedStock.name }} Level-2 逐笔大单 (≥1000手) 实时追踪</span>
          <span class="text-[10px] font-mono text-slate-400">精确记录：席位名称 / 精确秒级时间 / 委托成交价格 / 拆单手数与股数</span>
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
        <div v-else class="text-xs text-slate-500 text-center py-6">盘中暂未触发 Level-2 异动大单</div>
      </div>

      <!-- 下方：全量做 T 四大动态分支与踩空/被套应对预案面板 (移动端响应式 Grid) -->
      <div v-if="selectedStock && currentAnalysis" class="glass-card p-3 sm:p-4 border border-slate-800">
        <h3 class="text-xs sm:text-sm font-extrabold text-red-400 mb-3 flex items-center gap-1.5 border-b border-slate-800 pb-2">
          <el-icon><Warning /></el-icon>
          <span>{{ selectedStock.name }} 做 T 四大动态分支与踩空/被套应对预案</span>
        </h3>

        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3 text-[11px]">
          <!-- 分支一：高卖后不跌反涨 -->
          <div class="p-2.5 sm:p-3 rounded-xl bg-red-950/20 border border-red-900/40">
            <div class="font-bold text-red-400 text-xs mb-1">🚨 1. 高卖后不跌反涨(踩空)</div>
            <div class="text-slate-300 leading-relaxed whitespace-pre-line">{{ formatText(currentAnalysis.scenario1) }}</div>
          </div>

          <!-- 分支二：高卖后正常回调 -->
          <div class="p-2.5 sm:p-3 rounded-xl bg-cyan-950/20 border border-cyan-900/40">
            <div class="font-bold text-cyan-400 text-xs mb-1">🎯 2. 高卖后正常回调</div>
            <div class="text-slate-300 leading-relaxed whitespace-pre-line">{{ formatText(currentAnalysis.scenario2) }}</div>
          </div>

          <!-- 分支三：低吸被套 -->
          <div class="p-2.5 sm:p-3 rounded-xl bg-amber-950/20 border border-amber-900/40">
            <div class="font-bold text-amber-400 text-xs mb-1">🛡️ 3. 低吸被套(买完不涨反跌)</div>
            <div class="text-slate-300 leading-relaxed whitespace-pre-line">{{ formatText(currentAnalysis.scenario3) }}</div>
          </div>

          <!-- 分支四：大跌破位 -->
          <div class="p-3 rounded-xl bg-purple-950/20 border border-purple-900/40">
            <div class="font-bold text-purple-400 text-xs mb-1">⚠️ 4. 深跌破位止损</div>
            <div class="text-slate-300 leading-relaxed whitespace-pre-line">{{ formatText(currentAnalysis.scenario4) }}</div>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick, computed } from 'vue'
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

const chartRef = ref<HTMLElement | null>(null)
let chartInstance: echarts.ECharts | null = null
let timer: any = null

const hasDeviated = ref(false)

const currentAnalysis = computed(() => {
  if (!selectedStock.value || !selectedStock.value.analyses || selectedStock.value.analyses.length === 0) return null
  return selectedStock.value.analyses[0]
})

const basePrediction = computed(() => {
  if (!advancedHistory.value.predictions || advancedHistory.value.predictions.length === 0) return null
  return advancedHistory.value.predictions.find((p: any) => p.isBase) || advancedHistory.value.predictions[0]
})

const versionPredictions = computed(() => {
  if (!advancedHistory.value.predictions) return []
  return advancedHistory.value.predictions.filter((p: any) => !p.isBase)
})

const isLimitLocked = computed(() => {
  if (!selectedStock.value) return false
  return Math.abs(selectedStock.value.pct) >= 9.9
})

const l2Orders = computed(() => {
  return advancedHistory.value.l2Orders || []
})

const backtest30d = computed(() => {
  if (!advancedHistory.value.backtestStats) return null
  return advancedHistory.value.backtestStats.find((b: any) => b.period === '30d') || null
})

const fetchStockList = async () => {
  try {
    const res: any = await api.get('/stocks')
    stockList.value = res.data
    if (!selectedStock.value && stockList.value.length > 0) {
      selectStock(stockList.value[0])
    }
  } catch (err) {
    //
  }
}

const selectStock = async (stock: any) => {
  selectedStock.value = stock
  await loadAdvancedHistory(stock.code)
}

const handleDateChange = (val: string | null) => {
  if (!val) {
    selectedDate.value = defaultDate
  }
  if (selectedStock.value) {
    loadAdvancedHistory(selectedStock.value.code)
  }
}

const loadAdvancedHistory = async (code: string) => {
  try {
    const queryDate = selectedDate.value || defaultDate
    const res: any = await api.get(`/stocks/${code}/advanced-history?date=${queryDate}`)
    advancedHistory.value = res.data || { realHistories: [], predictions: [], rollingPredictions: [] }
    
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

const handleRePredict = async () => {
  if (!selectedStock.value) return
  try {
    const newPoints = []
    const base = selectedStock.value.currentPrice
    for (let i = 0; i < 241; i++) {
      const timeStr = i < 121 
        ? `${Math.floor(9 + i/60).toString().padStart(2,'0')}:${(i%60).toString().padStart(2,'0')}` 
        : `${Math.floor(13 + (i-121)/60).toString().padStart(2,'0')}:${((i-121)%60).toString().padStart(2,'0')}`
      const wave = Math.sin(i / 10.0) * (base * 0.02)
      newPoints.push({ time: timeStr, price: Number((base + wave).toFixed(2)) })
    }

    await api.post('/stocks/re-predict', {
      stockCode: selectedStock.value.code,
      date: selectedDate.value,
      newTimePoints: newPoints
    })
    ElMessage.success('成功重新模拟生成全新版本预测对比线！')
    await loadAdvancedHistory(selectedStock.value.code)
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
    // 基础 241 分钟
    for (let i = 0; i < 241; i++) {
      const timeStr = i < 121 
        ? `${Math.floor(9 + i/60).toString().padStart(2,'0')}:${(i%60).toString().padStart(2,'0')}` 
        : `${Math.floor(13 + (i-121)/60).toString().padStart(2,'0')}:${((i-121)%60).toString().padStart(2,'0')}`
      timeCategories.push(timeStr)
    }
  }

  const series: any[] = []

  // 仅在非历史过去日期（例如当前/下个交易日）时展示预测折线
  if (!isHist) {
    const basePrices = basePrediction ? basePrediction.timePoints.map((tp: any) => tp.price) : []
    if (basePrices.length > 0) {
      series.push({
        name: '① 09:20 终极基准预判线 (不可修改实线)',
        type: 'line',
        smooth: true,
        data: basePrices,
        itemStyle: { color: '#06b6d4' },
        lineStyle: { width: 2.5, type: 'solid' },
      })
    }

    if (data.rollingPredictions && data.rollingPredictions.length > 0) {
      const rollingMap = new Map(data.rollingPredictions.map((r: any) => [r.targetTime, r.predictedPrice]))
      const rollingDataArr = timeCategories.map((t: string) => rollingMap.get(t) || null)
      series.push({
        name: '② 盘中动态重塑全天趋势线 (黄虚线 - 实时重塑全天走向)',
        type: 'line',
        smooth: true,
        data: rollingDataArr,
        itemStyle: { color: '#f59e0b' },
        lineStyle: { width: 1.5, type: 'dashed' },
      })
    }

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
      axisLabel: { color: '#64748b', fontSize: 9 },
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

  const currP = selectedStock.value.currentPrice
  const pHigh = selectedStock.value.predictedHigh
  const pLow = selectedStock.value.predictedLow
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
        content: `【极速补救指导】：目前主力触发突破上攻！您已出现卖飞状态。建议在突破确认回调位 (¥${pHigh.toFixed(2)}) 附近，将刚刚卖出的 ${lastTrade.tradeShares} 股逢低快速买回恢复底仓，切勿死扛错过后续主升浪！`,
        cardClass: 'bg-red-950/80 border-red-500 text-red-200',
        titleClass: 'text-red-400 border-red-900',
        textClass: 'text-red-300'
      }
    } else if (currP < sellP) {
      // 卖对大跌：回调接回成功
      return {
        title: `🎯 卖对解盘：刚刚在 ¥${sellP.toFixed(2)} 高抛极佳！现价已回调至 ¥${currP.toFixed(2)} (差价 ${((sellP - currP)/sellP*100).toFixed(2)}%)`,
        content: `【接回指导】：您的高抛获利丰厚！请耐心等待股价进一步回踩至预判低吸位 (¥${pLow.toFixed(2)}) 附近，将 ${lastTrade.tradeShares} 股接回，轻松锁定日内做 T 净收益！`,
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
        content: `【战术应变】：您挂单偏高。建议：① 若有剩余资金且现价接近强托盘位 (¥${pLow.toFixed(2)})，可在 ¥${pLow.toFixed(2)} 处分批补仓摊薄成本；② 若跌破强止损线 (¥${(pLow * 0.985).toFixed(2)})，请在 14:30 前坚决平仓止损，切勿重仓扛单！`,
        cardClass: 'bg-amber-950/80 border-amber-500 text-amber-200',
        titleClass: 'text-amber-400 border-amber-900',
        textClass: 'text-amber-300'
      }
    } else if (currP > buyP) {
      // 低吸买成功，等待高抛
      return {
        title: `🟢 低吸成功：在 ¥${buyP.toFixed(2)} 买入后，现价上涨至 ¥${currP.toFixed(2)}！`,
        content: `【高抛指导】：您的买点非常精准！请持有仓位，等待股价冲高至预判高抛阻力位 (¥${pHigh.toFixed(2)}) 挂单卖出锁盈。`,
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
        title: `⚠️ 个人成本警告：您的持仓成本 (¥${costP.toFixed(2)}) 高于今日预判最高阻力 (¥${pHigh.toFixed(2)})`,
        content: `【高位解套指导】：目前整体处于浮亏 ${profitPct.toFixed(2)}% 状态。今日预测难以上冲至您的成本线。建议今日做 T 重点放在 ¥${pLow.toFixed(2)} 低吸、¥${pHigh.toFixed(2)} 高抛，利用小差价降低成本，勿盲目期待今日直接解套。`,
        cardClass: 'bg-purple-950/80 border-purple-500 text-purple-200',
        titleClass: 'text-purple-400 border-purple-900',
        textClass: 'text-purple-300'
      }
    }
  }

  // 4. 无特异解盘事件时返回 null，由右侧统一卡片精炼显示，避免左侧重复显示冗余常规指导
  return null
})

const handleLogout = () => {
  localStorage.removeItem('zeroquant_token')
  localStorage.removeItem('zeroquant_user')
  ElMessage.success('已退出登录')
  router.replace('/login')
}

const countdown = ref(10)

onMounted(() => {
  fetchStockList()
  timer = setInterval(() => {
    if (!shouldAutoRefresh.value) {
      countdown.value = 10
      return // 不开盘/看历史数据时直接跳过，零刷新消耗！
    }

    countdown.value--
    if (countdown.value <= 0) {
      countdown.value = 10
      fetchStockList()
      if (selectedStock.value) {
        loadAdvancedHistory(selectedStock.value.code)
      }
    }
  }, 1000)
})

onUnmounted(() => {
  if (timer) clearInterval(timer)
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
