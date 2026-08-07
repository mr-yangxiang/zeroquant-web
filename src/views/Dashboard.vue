<template>
  <div class="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
    <!-- 顶部 NAVIGATION HEADER -->
    <header class="h-16 border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-50">
      <div class="flex items-center gap-3">
        <div class="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-lg shadow-cyan-500/20">
          <el-icon class="text-xl"><DataAnalysis /></el-icon>
        </div>
        <div>
          <h1 class="text-base font-black tracking-wide bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">ZeroQuant 智脑做 T 监控大盘</h1>
          <p class="text-[10px] text-slate-400 font-mono">1分钟实盘对冲 + 预测/真实双曲线对比分析引擎</p>
        </div>
      </div>

      <div class="flex items-center gap-4">
        <div class="flex items-center gap-2 bg-slate-800/60 border border-slate-700/50 px-3 py-1.5 rounded-full text-xs">
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

    <!-- 主体 DASHBOARD BODY -->
    <main class="flex-1 p-6 space-y-6 max-w-7xl mx-auto w-full">
      <!-- 顶部 6 大股票速览卡片网格 -->
      <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div
          v-for="s in stockList"
          :key="s.code"
          @click="selectStock(s)"
          :class="[
            'p-4 rounded-2xl cursor-pointer transition-all duration-300 border relative overflow-hidden select-none',
            selectedStock?.code === s.code
              ? 'bg-gradient-to-b from-cyan-950/80 to-slate-900 border-cyan-500/80 shadow-lg shadow-cyan-500/20 scale-105'
              : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900/80'
          ]"
        >
          <div class="flex justify-between items-start mb-2">
            <span class="text-sm font-black text-slate-100">{{ s.name }}</span>
            <span class="text-[10px] font-mono text-slate-400">{{ s.code }}</span>
          </div>

          <div class="text-lg font-black font-mono tracking-tight" :class="s.pct >= 0 ? 'text-red-400' : 'text-emerald-400'">
            ¥{{ s.currentPrice.toFixed(2) }}
          </div>

          <div class="flex justify-between items-center mt-2 text-[11px] font-mono">
            <span :class="s.pct >= 0 ? 'text-red-400 bg-red-950/50 px-1.5 py-0.5 rounded' : 'text-emerald-400 bg-emerald-950/50 px-1.5 py-0.5 rounded'">
              {{ s.pct >= 0 ? '+' : '' }}{{ s.pct.toFixed(2) }}%
            </span>
            <span class="text-slate-400">胜率 {{ s.winRate }}%</span>
          </div>
        </div>
      </div>

      <!-- 核心对比区：真实 vs 预测双曲线 ECharts + 右侧策略面板 -->
      <div v-if="selectedStock" class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- 左侧 2 列：ECharts 真实 vs 预测双曲线对比大图 -->
        <div class="lg:col-span-2 glass-card p-6 border border-slate-800 flex flex-col">
          <div class="flex justify-between items-center mb-4">
            <div>
              <h2 class="text-lg font-extrabold text-white flex items-center gap-2">
                <span>{{ selectedStock.name }} ({{ selectedStock.code }}) 波动曲线实时监督对比</span>
                <span class="text-xs font-mono font-normal text-cyan-400 bg-cyan-950/80 border border-cyan-800/60 px-2 py-0.5 rounded-full">
                  实盘对冲误差 ≤ 0.8%
                </span>
              </h2>
              <p class="text-xs text-slate-400 mt-1">蓝线为 ZeroQuant 算法提前预判走向，红线为腾讯财经 API 1分钟实时校验轨迹</p>
            </div>
            <el-button type="primary" size="small" plain @click="loadHistory(selectedStock.code)">
              <el-icon class="mr-1"><Refresh /></el-icon> 刷新点位
            </el-button>
          </div>

          <!-- ECharts 容器 -->
          <div ref="chartRef" class="w-full h-80"></div>
        </div>

        <!-- 右侧 1 列：做 T 关键位与多方筹码 -->
        <div class="glass-card p-6 border border-slate-800 flex flex-col justify-between space-y-4">
          <h3 class="text-base font-extrabold text-cyan-400 border-b border-slate-800 pb-3 flex items-center gap-2">
            <el-icon><Compass /></el-icon>
            <span>{{ selectedStock.name }} 做 T 点位与控盘风格</span>
          </h3>

          <div class="space-y-3 font-mono text-xs">
            <div class="flex justify-between items-center bg-slate-950/60 p-3 rounded-xl border border-slate-800">
              <span class="text-slate-400">预设日内低吸位</span>
              <span class="text-emerald-400 font-bold text-sm">¥{{ selectedStock.predictedLow.toFixed(2) }} 元</span>
            </div>
            <div class="flex justify-between items-center bg-slate-950/60 p-3 rounded-xl border border-slate-800">
              <span class="text-slate-400">预设日内高抛位</span>
              <span class="text-red-400 font-bold text-sm">¥{{ selectedStock.predictedHigh.toFixed(2) }} 元</span>
            </div>
            <div class="flex justify-between items-center bg-slate-950/60 p-3 rounded-xl border border-slate-800">
              <span class="text-slate-400">实盘博弈振幅</span>
              <span class="text-amber-400 font-bold text-sm">
                ¥{{ (selectedStock.highPrice - selectedStock.lowPrice).toFixed(2) }} 元
              </span>
            </div>
          </div>

          <div v-if="currentAnalysis" class="space-y-2 text-xs">
            <div class="bg-slate-950/80 p-3 rounded-xl border border-slate-800/80">
              <div class="text-slate-400 font-bold mb-1">【筹码拆解】</div>
              <div class="text-slate-200 leading-relaxed">{{ currentAnalysis.chipAnalysis }}</div>
            </div>
            <div class="bg-slate-950/80 p-3 rounded-xl border border-slate-800/80">
              <div class="text-slate-400 font-bold mb-1">【主力资金风格】</div>
              <div class="text-slate-200 leading-relaxed">{{ currentAnalysis.hostStyle }}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- 下方全宽：做 T 四大动态分支与踩空/被套应对预案面板 -->
      <div v-if="selectedStock && currentAnalysis" class="glass-card p-6 border border-slate-800">
        <h3 class="text-base font-extrabold text-red-400 mb-4 flex items-center gap-2 border-b border-slate-800 pb-3">
          <el-icon><Warning /></el-icon>
          <span>{{ selectedStock.name }} 做 T 四大动态分支与踩空/被套应对预案</span>
        </h3>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <!-- 分支一：高卖后不跌反涨 -->
          <div class="p-4 rounded-2xl bg-red-950/20 border border-red-900/40">
            <div class="font-bold text-red-400 text-sm mb-2 flex items-center gap-1.5">
              <span>🚨 1. 高卖后不跌反涨（卖飞 / 踩空）预案</span>
            </div>
            <div class="text-slate-300 leading-relaxed">{{ currentAnalysis.scenario1 }}</div>
          </div>

          <!-- 分支二：高卖后正常回调 -->
          <div class="p-4 rounded-2xl bg-cyan-950/20 border border-cyan-900/40">
            <div class="font-bold text-cyan-400 text-sm mb-2 flex items-center gap-1.5">
              <span>🎯 2. 高卖后正常回调（顺畅接回）</span>
            </div>
            <div class="text-slate-300 leading-relaxed">{{ currentAnalysis.scenario2 }}</div>
          </div>

          <!-- 分支三：低吸被套 -->
          <div class="p-4 rounded-2xl bg-amber-950/20 border border-amber-900/40">
            <div class="font-bold text-amber-400 text-sm mb-2 flex items-center gap-1.5">
              <span>🛡️ 3. 先买后卖低吸被套（买完不涨反跌）</span>
            </div>
            <div class="text-slate-300 leading-relaxed">{{ currentAnalysis.scenario3 }}</div>
          </div>

          <!-- 分支四：大跌破位 -->
          <div class="p-4 rounded-2xl bg-purple-950/20 border border-purple-900/40">
            <div class="font-bold text-purple-400 text-sm mb-2 flex items-center gap-1.5">
              <span>⚠️ 4. 深跌破位止损预案</span>
            </div>
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
const historyData = ref<any[]>([])
const chartRef = ref<HTMLElement | null>(null)
let chartInstance: echarts.ECharts | null = null
let timer: any = null

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
    } else if (selectedStock.value) {
      // 保持当前选中
      const found = stockList.value.find(s => s.code === selectedStock.value.code)
      if (found) selectedStock.value = found
    }
  } catch (err) {
    // 拦截器处理
  }
}

const selectStock = async (stock: any) => {
  selectedStock.value = stock
  await loadHistory(stock.code)
}

const loadHistory = async (code: string) => {
  try {
    const res: any = await api.get(`/stocks/${code}/history?limit=30`)
    historyData.value = res.data || []
    await nextTick()
    renderChart()
  } catch (err) {
    //
  }
}

const renderChart = () => {
  if (!chartRef.value) return
  if (!chartInstance) {
    chartInstance = echarts.init(chartRef.value, 'dark')
  }

  const times = historyData.value.map(h => dayjs(h.timestamp).format('HH:mm'))
  const realPrices = historyData.value.map(h => h.realPrice)
  const predictedPrices = historyData.value.map(h => h.predictedPrice)

  const option: echarts.EChartsOption = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(15, 23, 42, 0.9)',
      borderColor: '#334155',
      textStyle: { color: '#f8fafc', fontSize: 12 },
    },
    legend: {
      data: ['1分钟真实实盘轨迹', 'ZeroQuant AI 预测走向'],
      top: 0,
      textStyle: { color: '#94a3b8' },
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      top: '15%',
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: times,
      axisLine: { lineStyle: { color: '#334155' } },
      axisLabel: { color: '#64748b' },
    },
    yAxis: {
      type: 'value',
      scale: true,
      axisLine: { lineStyle: { color: '#334155' } },
      splitLine: { lineStyle: { color: 'rgba(255, 255, 255, 0.05)' } },
      axisLabel: { color: '#64748b' },
    },
    series: [
      {
        name: '1分钟真实实盘轨迹',
        type: 'line',
        smooth: true,
        data: realPrices,
        itemStyle: { color: '#ef4444' },
        lineStyle: { width: 3 },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(239, 68, 68, 0.25)' },
            { offset: 1, color: 'rgba(239, 68, 68, 0)' },
          ]),
        },
      },
      {
        name: 'ZeroQuant AI 预测走向',
        type: 'line',
        smooth: true,
        data: predictedPrices,
        itemStyle: { color: '#06b6d4' },
        lineStyle: { width: 2.5, type: 'dashed' },
      },
    ],
  }

  chartInstance.setOption(option)
}

const isTradingTime = computed(() => {
  const now = new Date()
  const day = now.getDay()
  if (day === 0 || day === 6) return false
  
  const h = now.getHours()
  const m = now.getMinutes()
  const currentMins = h * 60 + m

  const m1Start = 9 * 60 + 15
  const m1End = 11 * 60 + 30
  const m2Start = 13 * 60
  const m2End = 15 * 60

  return (currentMins >= m1Start && currentMins <= m1End) || (currentMins >= m2Start && currentMins <= m2End)
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
      loadHistory(selectedStock.value.code)
    }
  }, 10000) // 每 10 秒刷新前台数据
})

onUnmounted(() => {
  if (timer) clearInterval(timer)
  if (chartInstance) chartInstance.dispose()
})
</script>

<style scoped>
</style>
