<template>
  <div class="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
    <!-- 顶部 NAVIGATION HEADER -->
    <header class="h-14 border-b border-slate-800/80 bg-slate-900/80 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-50">
      <div class="flex items-center gap-3">
        <div class="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-lg shadow-cyan-500/20">
          <el-icon class="text-lg"><DataAnalysis /></el-icon>
        </div>
        <div>
          <h1 class="text-sm font-black tracking-wide bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">ZeroQuant 智脑做 T 大盘</h1>
        </div>

        <!-- 标的抽拉折叠开关组件 (Collapsed Drawer / Selector) -->
        <div class="ml-6 relative">
          <button
            @click="isDrawerOpen = !isDrawerOpen"
            class="flex items-center gap-2 bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 text-xs px-3 py-1.5 rounded-xl transition-all shadow-sm"
          >
            <span class="text-slate-400">当前标的:</span>
            <span class="text-cyan-400 font-extrabold">{{ selectedStock ? selectedStock.name : '加载中' }} ({{ selectedStock ? selectedStock.code : '' }})</span>
            <el-icon class="transition-transform duration-300" :class="{ 'rotate-180': isDrawerOpen }"><ArrowDown /></el-icon>
          </button>

          <!-- 抽拉式折叠面板 Drawer Dropdown -->
          <transition name="el-zoom-in-top">
            <div
              v-if="isDrawerOpen"
              class="absolute top-10 left-0 w-80 bg-slate-900/95 backdrop-blur-xl border border-slate-700/80 rounded-2xl shadow-2xl p-3 z-50 space-y-1.5"
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
                  <span class="font-bold mr-2">{{ s.name }}</span>
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

      <div class="flex items-center gap-4">
        <!-- 交易日与区间日期选择器 DatePicker Range -->
        <el-date-picker
          v-model="selectedDate"
          type="date"
          placeholder="选择复盘日期"
          format="YYYY-MM-DD"
          value-format="YYYY-MM-DD"
          size="small"
          class="custom-datepicker"
          @change="handleDateChange"
        />

        <div class="flex items-center gap-2 bg-slate-800/60 border border-slate-700/50 px-3 py-1 rounded-full text-xs">
          <span :class="isTradingTime ? 'w-2 h-2 rounded-full bg-emerald-400 animate-ping' : 'w-2 h-2 rounded-full bg-amber-400'"></span>
          <span :class="isTradingTime ? 'text-emerald-400 font-mono font-bold' : 'text-amber-400 font-mono font-bold'">
            {{ isTradingTime ? '1分钟实盘对冲中' : '非交易时间休眠中' }}
          </span>
        </div>

        <el-button type="danger" plain size="small" circle @click="handleLogout" title="退出登录">
          <el-icon><SwitchButton /></el-icon>
        </el-button>
      </div>
    </header>

    <!-- 主体 DASHBOARD BODY (优化屏占比，支持一屏全显) -->
    <main class="flex-1 p-4 space-y-4 max-w-7xl mx-auto w-full">
      
      <!-- 核心对比区：多维折线图 ECharts + 右侧策略面板 (一屏直达) -->
      <div v-if="selectedStock" class="grid grid-cols-1 lg:grid-cols-3 gap-4">
        
        <!-- 左侧 2 列：ECharts 多维折线重叠对比大图 -->
        <div class="lg:col-span-2 glass-card p-4 border border-slate-800 flex flex-col">
          <div class="flex justify-between items-center mb-2">
            <div>
              <h2 class="text-sm font-extrabold text-white flex items-center gap-2">
                <span>{{ selectedStock.name }} ({{ selectedStock.code }}) 波动折线多维重叠对比</span>
                <span class="text-[10px] font-mono text-cyan-400 bg-cyan-950/80 border border-cyan-800/60 px-2 py-0.5 rounded-full">
                  复盘日期：{{ selectedDate }}
                </span>
              </h2>
              <p class="text-[11px] text-slate-400 mt-0.5">包含：①开盘前全天预判线(241点不可改) ②提前5min动态修正线 ③偏差重模拟对比线 ④真实实盘轨迹</p>
            </div>
            
            <div class="flex items-center gap-2">
              <el-button v-if="hasDeviated" type="warning" size="small" @click="handleRePredict">
                <el-icon class="mr-1"><TrendCharts /></el-icon> 偏差过大：重新模拟新线对比
              </el-button>
              <el-button type="primary" size="small" plain @click="loadAdvancedHistory(selectedStock.code)">
                <el-icon class="mr-1"><Refresh /></el-icon> 刷新
              </el-button>
            </div>
          </div>

          <!-- ECharts 容器 (高度微调保证一屏全显) -->
          <div ref="chartRef" class="w-full h-72"></div>
        </div>

        <!-- 右侧 1 列：做 T 关键位与控盘风格 -->
        <div class="glass-card p-4 border border-slate-800 flex flex-col justify-between space-y-3">
          <h3 class="text-sm font-extrabold text-cyan-400 border-b border-slate-800 pb-2 flex items-center gap-1.5">
            <el-icon><Compass /></el-icon>
            <span>{{ selectedStock.name }} 盘中关键位</span>
          </h3>

          <div class="grid grid-cols-3 gap-2 font-mono text-xs">
            <div class="bg-slate-950/60 p-2 rounded-xl border border-slate-800 text-center">
              <div class="text-[10px] text-slate-400">低吸支撑</div>
              <div class="text-emerald-400 font-bold text-xs mt-1">¥{{ selectedStock.predictedLow.toFixed(2) }}</div>
            </div>
            <div class="bg-slate-950/60 p-2 rounded-xl border border-slate-800 text-center">
              <div class="text-[10px] text-slate-400">高抛阻力</div>
              <div class="text-red-400 font-bold text-xs mt-1">¥{{ selectedStock.predictedHigh.toFixed(2) }}</div>
            </div>
            <div class="bg-slate-950/60 p-2 rounded-xl border border-slate-800 text-center">
              <div class="text-[10px] text-slate-400">做 T 振幅</div>
              <div class="text-amber-400 font-bold text-xs mt-1">
                ¥{{ (selectedStock.highPrice - selectedStock.lowPrice).toFixed(2) }}
              </div>
            </div>
          </div>

          <div v-if="currentAnalysis" class="space-y-2 text-[11px]">
            <div class="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800/80">
              <div class="text-slate-400 font-bold mb-0.5">【筹码拆解】</div>
              <div class="text-slate-200 leading-snug">{{ currentAnalysis.chipAnalysis }}</div>
            </div>
            <div class="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800/80">
              <div class="text-slate-400 font-bold mb-0.5">【主力资金风格】</div>
              <div class="text-slate-200 leading-snug">{{ currentAnalysis.hostStyle }}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- 下方：全量做 T 四大动态分支与踩空/被套应对预案面板 (一屏直视) -->
      <div v-if="selectedStock && currentAnalysis" class="glass-card p-4 border border-slate-800">
        <h3 class="text-sm font-extrabold text-red-400 mb-3 flex items-center gap-1.5 border-b border-slate-800 pb-2">
          <el-icon><Warning /></el-icon>
          <span>{{ selectedStock.name }} 做 T 四大动态分支与踩空/被套应对预案</span>
        </h3>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-[11px]">
          <!-- 分支一：高卖后不跌反涨 -->
          <div class="p-3 rounded-xl bg-red-950/20 border border-red-900/40">
            <div class="font-bold text-red-400 text-xs mb-1">🚨 1. 高卖后不跌反涨(踩空)</div>
            <div class="text-slate-300 leading-relaxed">{{ currentAnalysis.scenario1 }}</div>
          </div>

          <!-- 分支二：高卖后正常回调 -->
          <div class="p-3 rounded-xl bg-cyan-950/20 border border-cyan-900/40">
            <div class="font-bold text-cyan-400 text-xs mb-1">🎯 2. 高卖后正常回调</div>
            <div class="text-slate-300 leading-relaxed">{{ currentAnalysis.scenario2 }}</div>
          </div>

          <!-- 分支三：低吸被套 -->
          <div class="p-3 rounded-xl bg-amber-950/20 border border-amber-900/40">
            <div class="font-bold text-amber-400 text-xs mb-1">🛡️ 3. 低吸被套(买完不涨反跌)</div>
            <div class="text-slate-300 leading-relaxed">{{ currentAnalysis.scenario3 }}</div>
          </div>

          <!-- 分支四：大跌破位 -->
          <div class="p-3 rounded-xl bg-purple-950/20 border border-purple-900/40">
            <div class="font-bold text-purple-400 text-xs mb-1">⚠️ 4. 深跌破位止损</div>
            <div class="text-slate-300 leading-relaxed">{{ currentAnalysis.scenario4 }}</div>
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
const selectedDate = ref('2026-08-10') // 默认下一个开盘日

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

const handleDateChange = (val: string) => {
  if (selectedStock.value) {
    loadAdvancedHistory(selectedStock.value.code)
  }
}

const loadAdvancedHistory = async (code: string) => {
  try {
    const res: any = await api.get(`/stocks/${code}/advanced-history?date=${selectedDate.value}`)
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
    // 重新模拟生成一条新的 Version2 全天预测折线
    const newPoints = []
    const base = selectedStock.value.currentPrice
    // 生成全天 241 点
    for (let i = 0; i < 241; i++) {
      const timeStr = i < 121 
        ? `${Math.floor(9 + i/60).toString().padStart(2,'0')}:${(i%60).toString().padStart(2,'0')}` 
        : `${Math.floor(13 + (i-121)/60).toString().padStart(2,'0')}:${((i-121)%60).toString().padStart(2,'0')}`
      newPoints.append
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

const renderChart = () => {
  if (!chartRef.value) return
  if (!chartInstance) {
    chartInstance = echarts.init(chartRef.value, 'dark')
  }

  const data = advancedHistory.value
  const basePrediction = data.predictions.find((p: any) => p.isBase) || data.predictions[0]
  
  const timeCategories = basePrediction ? basePrediction.timePoints.map((tp: any) => tp.time) : []
  const basePrices = basePrediction ? basePrediction.timePoints.map((tp: any) => tp.price) : []

  // 组装 Series
  const series: any[] = [
    {
      name: '① 开盘前全天预判线 (基准不可改)',
      type: 'line',
      smooth: true,
      data: basePrices,
      itemStyle: { color: '#06b6d4' },
      lineStyle: { width: 2, type: 'dashed' },
    }
  ]

  // ② 重预测版本对比线 (V2, V3...)
  data.predictions.filter((p: any) => !p.isBase).forEach((p: any, idx: number) => {
    const vPrices = p.timePoints.map((tp: any) => tp.price)
    series.push({
      name: `④ 重新模拟修正对比线 (V${p.version})`,
      type: 'line',
      smooth: true,
      data: vPrices,
      itemStyle: { color: '#a855f7' },
      lineStyle: { width: 2, type: 'dotted' },
    })
  })

  // ③ 真实开盘实盘轨迹
  if (data.realHistories && data.realHistories.length > 0) {
    const realPricesMap = new Map(data.realHistories.map((h: any) => [dayjs(h.timestamp).format('HH:mm'), h.realPrice]))
    const realDataArr = timeCategories.map((t: string) => realPricesMap.get(t) || null)

    series.push({
      name: '③ 真实开盘实盘轨迹 (腾讯API)',
      type: 'line',
      smooth: true,
      data: realDataArr,
      itemStyle: { color: '#ef4444' },
      lineStyle: { width: 3 },
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
      textStyle: { color: '#f8fafc', fontSize: 12 },
    },
    legend: {
      top: 0,
      textStyle: { color: '#94a3b8', fontSize: 11 },
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      top: '18%',
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: timeCategories,
      axisLine: { lineStyle: { color: '#334155' } },
      axisLabel: { color: '#64748b', fontSize: 10 },
    },
    yAxis: {
      type: 'value',
      scale: true,
      axisLine: { lineStyle: { color: '#334155' } },
      splitLine: { lineStyle: { color: 'rgba(255, 255, 255, 0.05)' } },
      axisLabel: { color: '#64748b' },
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

const handleLogout = () => {
  localStorage.removeItem('zeroquant_token')
  localStorage.removeItem('zeroquant_user')
  ElMessage.success('已退出登录')
  router.replace('/login')
}

onMounted(() => {
  fetchStockList()
  timer = setInterval(() => {
    fetchStockList()
    if (selectedStock.value) {
      loadAdvancedHistory(selectedStock.value.code)
    }
  }, 10000)
})

onUnmounted(() => {
  if (timer) clearInterval(timer)
  if (chartInstance) chartInstance.dispose()
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
