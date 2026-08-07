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

        <!-- 开盘自动秒级倒计时组件 -->
        <div class="flex items-center gap-1.5 bg-slate-800/60 border border-slate-700/50 px-2.5 py-1 rounded-full text-[11px] sm:text-xs">
          <span :class="isTradingTime ? 'w-2 h-2 rounded-full bg-emerald-400 animate-ping' : 'w-2 h-2 rounded-full bg-amber-400'"></span>
          <span :class="isTradingTime ? 'text-emerald-400 font-mono font-bold' : 'text-amber-400 font-mono font-bold'">
            {{ isTradingTime ? `秒级对冲 (${countdown}s自动刷新)` : '停盘休眠中' }}
          </span>
        </div>

        <el-button type="danger" plain size="small" circle @click="handleLogout" title="退出登录" class="shrink-0">
          <el-icon><SwitchButton /></el-icon>
        </el-button>
      </div>
    </header>

    <!-- 主体 DASHBOARD BODY (移动端 Padding 与 Grid 适配) -->
    <main class="flex-1 p-3 sm:p-4 space-y-4 max-w-7xl mx-auto w-full">
      
      <!-- 核心对比区：多维折线图 ECharts + 右侧策略面板 (移动端 Stacked 响应式) -->
      <div v-if="selectedStock" class="grid grid-cols-1 lg:grid-cols-3 gap-4">
        
        <!-- 左侧 2 列：ECharts 多维折线重叠对比大图 -->
        <div class="lg:col-span-2 glass-card p-3 sm:p-4 border border-slate-800 flex flex-col">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
            <div>
              <h2 class="text-xs sm:text-sm font-extrabold text-white flex flex-wrap items-center gap-1.5">
                <span>{{ selectedStock.name }} ({{ selectedStock.code }}) 多维折线重叠对比</span>
                <span class="text-[10px] font-mono text-cyan-400 bg-cyan-950/80 border border-cyan-800/60 px-2 py-0.5 rounded-full">
                  {{ selectedDate }}
                </span>

                <!-- 开盘前 10min 09:20 终极看涨/看跌幅度 Badge -->
                <span v-if="basePrediction"
                  class="text-[10px] font-mono font-black px-2 py-0.5 rounded-full border shadow-sm flex items-center gap-1"
                  :class="basePrediction.direction === '看涨' ? 'bg-red-950/90 border-red-500/80 text-red-400' : 'bg-emerald-950/90 border-emerald-500/80 text-emerald-400'">
                  <span>09:20 终极预判:</span>
                  <span>{{ basePrediction.direction }} {{ basePrediction.targetPct >= 0 ? '+' : '' }}{{ basePrediction.targetPct }}%</span>
                </span>

                <!-- 重新模拟新版本预测 Badge (值二, 值三...) -->
                <span v-for="p in versionPredictions" :key="p.version"
                  class="text-[10px] font-mono font-black px-2 py-0.5 rounded-full border bg-purple-950/90 border-purple-500/80 text-purple-300">
                  <span>值{{ p.version }}:</span>
                  <span>{{ p.direction || '看涨' }} {{ p.targetPct >= 0 ? '+' : '' }}{{ p.targetPct || 1.2 }}%</span>
                </span>
              </h2>
              <p class="text-[10px] sm:text-[11px] text-slate-400 mt-0.5 leading-snug">① 09:20 终极基准预判线 (开盘前10min终极固定实线) ② 提前5min动态修正线 ③ 重模拟对比线 ④ 真实开盘轨迹 (红实线)</p>
            </div>
            
            <div class="flex items-center gap-2 self-end sm:self-auto">
              <el-button v-if="hasDeviated" type="warning" size="small" class="!text-[11px] !px-2" @click="handleRePredict">
                <el-icon class="mr-1"><TrendCharts /></el-icon> 重新模拟新线
              </el-button>
              <el-button type="primary" size="small" plain class="!text-[11px] !px-2" @click="loadAdvancedHistory(selectedStock.code)">
                <el-icon class="mr-1"><Refresh /></el-icon> 刷新
              </el-button>
            </div>
          </div>

          <!-- ECharts 容器 (移动端高度 220px / 桌面端 280px 响应式) -->
          <div ref="chartRef" class="w-full h-64 sm:h-72"></div>
        </div>

        <!-- 右侧 1 列：做 T 关键位与控盘风格 -->
        <div class="glass-card p-3 sm:p-4 border border-slate-800 flex flex-col justify-between space-y-3">
          <h3 class="text-xs sm:text-sm font-extrabold text-cyan-400 border-b border-slate-800 pb-2 flex items-center gap-1.5">
            <el-icon><Compass /></el-icon>
            <span>{{ selectedStock.name }} 盘中关键位</span>
          </h3>

          <div class="grid grid-cols-3 gap-1.5 sm:gap-2 font-mono text-xs">
            <div class="bg-slate-950/60 p-1.5 sm:p-2 rounded-xl border border-slate-800 text-center">
              <div class="text-[10px] text-slate-400">低吸支撑</div>
              <div class="text-emerald-400 font-bold text-xs mt-0.5">¥{{ selectedStock.predictedLow.toFixed(2) }}</div>
            </div>
            <div class="bg-slate-950/60 p-1.5 sm:p-2 rounded-xl border border-slate-800 text-center">
              <div class="text-[10px] text-slate-400">高抛阻力</div>
              <div class="text-red-400 font-bold text-xs mt-0.5">¥{{ selectedStock.predictedHigh.toFixed(2) }}</div>
            </div>
            <div class="bg-slate-950/60 p-1.5 sm:p-2 rounded-xl border border-slate-800 text-center">
              <div class="text-[10px] text-slate-400">做 T 振幅</div>
              <div class="text-amber-400 font-bold text-xs mt-0.5">
                ¥{{ (selectedStock.highPrice - selectedStock.lowPrice).toFixed(2) }}
              </div>
            </div>
          </div>

          <div v-if="currentAnalysis" class="space-y-2 text-[11px]">
            <!-- 新增：核心主控席位与历史行为观察 -->
            <div class="bg-cyan-950/40 border border-cyan-500/30 p-2.5 rounded-xl">
              <div class="text-cyan-400 font-bold mb-0.5 flex items-center gap-1">
                <el-icon><User /></el-icon>
                <span>【核心主控席位与 500 日分时习惯分析】</span>
              </div>
              <div class="text-cyan-200/90 leading-snug whitespace-pre-line">{{ formatText(currentAnalysis.hostStyle) }}</div>
            </div>

            <div class="bg-emerald-950/40 border border-emerald-500/30 p-2.5 rounded-xl">
              <div class="text-emerald-400 font-bold mb-0.5 flex items-center gap-1">
                <el-icon><Select /></el-icon>
                <span>【推荐买入/做T理由】</span>
              </div>
              <div class="text-emerald-200/90 leading-snug whitespace-pre-line">{{ formatText(currentAnalysis.doReasons) }}</div>
            </div>

            <div class="bg-red-950/40 border border-red-500/30 p-2.5 rounded-xl">
              <div class="text-red-400 font-bold mb-0.5 flex items-center gap-1">
                <el-icon><CloseBold /></el-icon>
                <span>【不推荐/禁忌操作】</span>
              </div>
              <div class="text-red-200/90 leading-snug whitespace-pre-line">{{ formatText(currentAnalysis.dontReasons) }}</div>
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
import { ElMessage } from 'element-plus'
import * as echarts from 'echarts'
import dayjs from 'dayjs'
import api from '../api'

const router = useRouter()
const stockList = ref<any[]>([])
const selectedStock = ref<any>(null)
const isDrawerOpen = ref(false)

const defaultDate = '2026-08-10'
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

const dailyReview = computed(() => {
  return advancedHistory.value.dailyReview || null
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
  const basePrediction = data.predictions.find((p: any) => p.isBase) || data.predictions[0]
  
  const timeCategories = basePrediction ? basePrediction.timePoints.map((tp: any) => tp.time) : []
  const basePrices = basePrediction ? basePrediction.timePoints.map((tp: any) => tp.price) : []

  const series: any[] = [
    {
      name: '① 09:20 终极基准预判线 (不可修改实线)',
      type: 'line',
      smooth: true,
      data: basePrices,
      itemStyle: { color: '#06b6d4' },
      lineStyle: { width: 2.5, type: 'solid' }, // 开盘前10min终极固定的基准预判线，必须为【实线 (solid)】！
    }
  ]

  // ② 提前 5 分钟动态修正线
  if (data.rollingPredictions && data.rollingPredictions.length > 0) {
    const rollingMap = new Map(data.rollingPredictions.map((r: any) => [r.targetTime, r.predictedPrice]))
    const rollingDataArr = timeCategories.map((t: string) => rollingMap.get(t) || null)
    series.push({
      name: '② 提前 5 分钟动态修正线 (黄虚线)',
      type: 'line',
      smooth: true,
      data: rollingDataArr,
      itemStyle: { color: '#f59e0b' },
      lineStyle: { width: 1.5, type: 'dashed' },
    })
  }

  // ③ 重预测版本对比线 (V2, V3...)
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

  // ④ 真实开盘轨迹
  if (data.realHistories && data.realHistories.length > 0) {
    const realPricesMap = new Map(data.realHistories.map((h: any) => [dayjs(h.timestamp).format('HH:mm'), h.realPrice]))
    const realDataArr = timeCategories.map((t: string) => realPricesMap.get(t) || null)

    series.push({
      name: '④ 真实开盘轨迹 (红实线)',
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

const isTradingTime = computed(() => {
  const now = new Date()
  const day = now.getDay()
  if (day === 0 || day === 6) return false
  const h = now.getHours()
  const m = now.getMinutes()
  const currentMins = h * 60 + m
  return (currentMins >= 9 * 60 + 15 && currentMins <= 11 * 60 + 30) || (currentMins >= 13 * 60 && currentMins <= 15 * 60)
})

// 格式化文本中的 \n 或纯换行
const formatText = (text: string | undefined) => {
  if (!text) return ''
  return text.replace(/\\n/g, '\n')
}

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
