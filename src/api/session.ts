/** 浏览器认证状态：访问令牌仅留内存，刷新凭据由 HttpOnly Cookie 管理。 */
import axios from 'axios'
const transport = axios.create({ baseURL: '/zeroquant/api/v1', timeout: 15000,
  withCredentials: true, headers: { 'X-ZeroQuant-Client': 'web' } })
let token: string | null = null
let refreshing: Promise<boolean> | null = null
let generation = 0
// Tabs share the refresh cookie. A login/logout in another tab invalidates this tab's
// pending requests before they can retry under the newly selected account.
const identityChannel = typeof BroadcastChannel === 'undefined' ? null : new BroadcastChannel('zeroquant-identity')
if (identityChannel) identityChannel.onmessage = event => {
  if (event.data !== 'changed') return
  generation++
  token = null
  window.location.hash = '#/login'
}
// 一次性清除旧版本持久化 JWT；禁止继续消费无撤销能力的旧凭据。
localStorage.removeItem('zeroquant_token')
localStorage.removeItem('zeroquant_user')
export function accessToken() { return token }
/** 登录/退出代次；普通刷新不改变身份代次，旧请求不得跨账号重放。 */
export function sessionGeneration() { return generation }
export function acceptSession(value: string) { generation++; token = value; identityChannel?.postMessage('changed') }
export function clearSession() { generation++; token = null; identityChannel?.postMessage('changed') }
/** 同一页共用刷新 Promise；支持 Web Locks 时还串行化同源多个标签页的 Cookie 轮换。 */
export function refreshSession(): Promise<boolean> {
  if (refreshing) return refreshing
  const current = generation
  const run = async () => {
    try {
      const response = await transport.post('/auth/refresh', {})
      if (current !== generation) return false
      const next = response.data?.data?.token
      if (response.data?.code !== 0 || typeof next !== 'string') return false
      token = next
      return true
    } catch {
      if (current === generation) token = null
      return false
    }
  }
  // await 展平 Web Locks 回调结果，兼容 DOM 类型中 Promise<T> 的泛型定义。
  const operation = (async () => navigator.locks ? await navigator.locks.request('zeroquant-refresh', run) : await run())()
  const pending = operation.finally(() => { refreshing = null })
  refreshing = pending
  return pending
}
export async function ensureSession() { return !!token || await refreshSession() }
