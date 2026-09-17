/** 使用实际 Markdown 函数和 Dashboard 图表构造函数；不加载真实账号或行情。 */
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readFileSync } from 'node:fs'
import ts from 'typescript'
import * as echarts from 'echarts'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc.js'
import timezone from 'dayjs/plugin/timezone.js'
dayjs.extend(utc); dayjs.extend(timezone)
const mdSource = readFileSync(new URL('../src/utils/markdown.ts', import.meta.url),'utf8')
const compiled = ts.transpileModule(mdSource, { compilerOptions:{module:ts.ModuleKind.CommonJS} }).outputText
const exports = {}
new Function('exports',compiled)(exports)
test('聊天 Markdown 拒绝原始 HTML、脚本、事件属性与图片注入', () => {
  for (const input of ['<img src=x onerror=alert(1)>','**<svg onload=alert(1)>**','### <script>alert(1)</script>','- <a href="javascript:alert(1)">x</a>']) {
    const output=exports.formatMarkdownToHtml(input)
    assert.ok(!/<(?:img|svg|script|a)\b/i.test(output))
    assert.ok(output.includes('&lt;'))
  }
  assert.match(exports.formatMarkdownToHtml('**中文加粗**'), /<strong[^>]*>中文加粗<\/strong>/)
})
const dashboard=readFileSync(new URL('../src/views/Dashboard.vue',import.meta.url),'utf8')
const chartCode=dashboard.slice(dashboard.indexOf('const renderChart ='),dashboard.indexOf('const todayDateStr ='))
const functionBody=ts.transpileModule(`
  let captured;
  const chartInstance={setOption(option){captured=option}};
  const chartRef={value:true}, advancedHistory={value:fixture}, isHistoryView={value:historical};
  ${chartCode}
  renderChart();
  return captured;
`,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None}}).outputText
const buildOption=new Function('echarts','dayjs','fixture','historical',functionBody)
test('ECharts 6.1 使用实际页面配置渲染预测、边界、动态留档和真实曲线', () => {
  const fixture={predictions:[{isBase:true,timePoints:[{time:'09:30',price:10,lower:9,upper:11},{time:'09:31',price:11,lower:10,upper:12}]}],
    rollingPredictions:[{targetTime:'09:30',predictedPrice:10.1},{targetTime:'09:31',predictedPrice:10.8}],
    realHistories:[{timestamp:'2026-09-15T09:30:00+08:00',realPrice:10},{timestamp:'2026-09-15T09:31:00+08:00',realPrice:10.5}]}
  const option=buildOption(echarts,dayjs,fixture,false)
  assert.equal(option.series.length,5)
  assert.deepEqual(option.series[3].data,[10.1,10.8])
  assert.deepEqual(option.series[4].data,[10,10.5])
  assert.equal(option.tooltip.renderMode,'richText')
  const chart=echarts.init(null,'dark',{renderer:'svg',ssr:true,width:1000,height:500})
  try {
    chart.setOption({...option,animation:false})
    const svg=chart.renderToSVGString()
    assert.match(svg,/<svg/); assert.match(svg,/09:30/)
  } finally { chart.dispose() }
})
test('无基线时仍生成 242 个分钟时点，历史动态预测不会被删除', () => {
  const option=buildOption(echarts,dayjs,{predictions:[],rollingPredictions:[{targetTime:'10:00',predictedPrice:10}],realHistories:[]},true)
  assert.equal(option.xAxis.data.length,242)
  assert.equal(option.series[0].data[30],10)
})

test('账号切换后旧请求不能跨账号重放、覆盖页面或清除新会话', async () => {
  const source = readFileSync(new URL('../src/api/index.ts', import.meta.url), 'utf8')
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText
  let requestHandler, successHandler, failureHandler
  let generation = 1, token = 'user-a-token', retries = 0, clears = 0, refreshes = 0
  const client = { interceptors: {
    request: { use(fn) { requestHandler = fn } },
    response: { use(ok, fail) { successHandler = ok; failureHandler = fail } },
  }, request() { retries++; return Promise.resolve('retried') } }
  const modules = {
    axios: { default: { create() { return client } } },
    'element-plus': { ElMessage: { error() {} } },
    './session': { accessToken: () => token, sessionGeneration: () => generation,
      clearSession() { clears++ }, async refreshSession() { refreshes++; return true } },
  }
  new Function('require', 'exports', code)(name => modules[name], {})
  const request = requestHandler({ url: '/user/trade-action', headers: {} })
  assert.equal(request.headers.Authorization, 'Bearer user-a-token')
  generation = 2; token = 'user-b-token'
  const failure = { config: request, response: { status: 401 } }
  await assert.rejects(() => failureHandler(failure), e => e === failure)
  await assert.rejects(() => successHandler({ config: request, data: { code: 0 } }))
  assert.throws(() => requestHandler(request), /账号已切换/)
  assert.equal(retries, 0); assert.equal(clears, 0); assert.equal(refreshes, 0)
  // 同一账号的并发请求仍可复用已经刷新的令牌。
  generation = 1; token = 'user-a-refreshed'
  assert.equal(await failureHandler(failure), 'retried')
  assert.equal(retries, 1)
})

const chatSource = readFileSync(new URL('../src/api/chat-requests.ts', import.meta.url), 'utf8')
const chatCompiled = ts.transpileModule(chatSource, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText
const chatExports = {}
new Function('exports', chatCompiled)(chatExports)
function memoryStorage() {
  const entries = new Map()
  return { getItem: key => entries.get(key) ?? null, setItem: (key,value) => entries.set(key,value), removeItem: key => entries.delete(key) }
}
test('聊天重试在页面重载后复用请求编号，账号隔离且不会误清除新请求', () => {
  const storage = memoryStorage()
  let sequence = 0
  const uuid = () => '10000000-0000-4000-8000-' + String(++sequence).padStart(12, '0')
  const one = chatExports.createChatOutbox(storage,uuid)
  const first = one.prepare('user-a','000572','买了100股10元')
  const reloaded = chatExports.createChatOutbox(storage,uuid)
  assert.deepEqual(reloaded.prepare('user-a','000572','买了100股10元'),first)
  assert.throws(() => reloaded.prepare('user-a','000572','买了200股10元'), chatExports.PendingChatRequestError)
  const other = reloaded.prepare('user-b','000572','买了100股10元')
  assert.notEqual(other.requestId, first.requestId)
  reloaded.complete('user-a','000572',other.requestId)
  assert.deepEqual(reloaded.pending('user-a','000572'),first)
  reloaded.complete('user-a','000572',first.requestId)
  assert.notEqual(reloaded.prepare('user-a','000572','买了100股10元').requestId,first.requestId)
})
test('请求编号存储失败或损坏时拒绝创建替代请求；本地分区不充当授权', () => {
  const full = chatExports.createChatOutbox({ getItem() { return null },setItem() { throw new Error('quota') } }, () => '10000000-0000-4000-8000-000000000001')
  assert.throws(() => full.prepare('a','000572','买了100股10元'), /quota/)
  const broken = chatExports.createChatOutbox({ getItem() { return '{broken' } }, () => { throw new Error('must not create id') })
  assert.throws(() => broken.prepare('a','000572','买了100股10元'), SyntaxError)
  const fake = 'header.' + Buffer.from(JSON.stringify({sub:'user-a'})).toString('base64url') + '.signature'
  assert.equal(chatExports.chatOwner(fake),'user-a')
  assert.throws(() => chatExports.chatOwner(null))
})
test('实际发送逻辑：未知结果重试沿用编号；成功后的渲染失败不恢复可重复成交的输入', async () => {
  const latest = readFileSync(new URL('../src/views/Dashboard.vue',import.meta.url),'utf8')
  const handler = latest.slice(latest.indexOf('const chatOutbox ='), latest.indexOf('const handleClearChat'))
  const functionSource = ts.transpileModule(`
    const { createChatOutbox, chatOwner, PendingChatRequestError, sessionStorage, crypto,
      selectedStock, chatInput, isSendingChat, sessionGeneration, accessToken, ElMessage,
      chatMessages, dayjs, scrollChatToBottom, api, reactive, typewriterEffect, loadAdvancedHistory } = env;
    let chatHistoryRequest = 0;
    const isLoadingChat = {value:false};
    ${handler}
    return handleSendChat;
  `,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None}}).outputText
  const storage = memoryStorage(), calls = [], errors = []
  let failNetwork = true, ids = 0
  const env = { ...chatExports, sessionStorage:storage,
    crypto:{randomUUID:()=>'10000000-0000-4000-8000-'+String(++ids).padStart(12,'0')},
    selectedStock:{value:{code:'000572'}},chatInput:{value:'买了100股10元'},isSendingChat:{value:false},
    sessionGeneration:()=>1,accessToken:()=> 'header.'+Buffer.from(JSON.stringify({sub:'user-a'})).toString('base64url')+'.signature',
    ElMessage:{error:value=>errors.push(value)},chatMessages:{value:[]},dayjs,scrollChatToBottom(){},
    api:{async post(_url,body){calls.push({...body});if(failNetwork) throw new Error('lost response'); return {data:{id:1,content:'成交已记录',tradeRecorded:true}}}},
    reactive:value=>value,typewriterEffect(){throw new Error('render failed after commit')},loadAdvancedHistory:async()=>{},
  }
  const send = new Function('env', functionSource)(env)
  await send()
  assert.equal(env.chatInput.value,'买了100股10元')
  failNetwork = false
  await send()
  assert.equal(calls.length,2);assert.equal(calls[0].requestId,calls[1].requestId)
  assert.equal(env.chatInput.value,'')
  assert.ok(errors.at(-1).includes('不要重复录入'))
  assert.equal(env.chatMessages.value.filter(message=>message.role==='user').length,1)
})


test('实际历史读取：分页拼接去重，乱序响应和切换账号/股票不能覆盖列表', async () => {
  const latest=readFileSync(new URL('../src/views/Dashboard.vue',import.meta.url),'utf8')
  const source=latest.slice(latest.indexOf('const chatNextCursor ='),latest.indexOf('const openAiChat'))
  const compiled=ts.transpileModule(`
    const {ref,selectedStock,sessionGeneration,chatMessages,api,scrollChatToBottom,ElMessage}=env;
    ${source}
    return {fetchChatMessages,chatNextCursor,isLoadingChat};
  `,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None}}).outputText
  const pending=[],urls=[];let generation=1
  const env={ref:value=>({value}),selectedStock:{value:{code:'000572'}},sessionGeneration:()=>generation,
    chatMessages:{value:[]},api:{get(url){urls.push(url);return new Promise(resolve=>pending.push(resolve))}},scrollChatToBottom(){},ElMessage:{error(){}}}
  const ui=new Function('env',compiled)(env)
  const olderInitial=ui.fetchChatMessages(),newerInitial=ui.fetchChatMessages()
  pending[1]({data:[{id:3},{id:4}],nextCursor:'3'});await newerInitial
  pending[0]({data:[{id:99}],nextCursor:null});await olderInitial
  assert.deepEqual(env.chatMessages.value,[{id:3},{id:4}])
  const older=ui.fetchChatMessages(true)
  assert.match(urls.at(-1),/before=3/)
  pending[2]({data:[{id:1},{id:2}],nextCursor:null});await older
  assert.deepEqual(env.chatMessages.value.map(row=>row.id),[1,2,3,4])
  const switched=ui.fetchChatMessages();generation=2
  pending[3]({data:[{id:100}],nextCursor:null});await switched
  assert.equal(env.chatMessages.value.length,4)
  const stockSwitch=ui.fetchChatMessages();env.selectedStock.value={code:'600839'}
  pending[4]({data:[{id:101}],nextCursor:null});await stockSwitch
  assert.equal(env.chatMessages.value.length,4)
})
