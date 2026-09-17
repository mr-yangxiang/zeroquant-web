/** API 传输层：内存访问令牌、一次刷新重试、统一错误展示。 */
import axios from 'axios'
import { ElMessage } from 'element-plus'
import { accessToken, refreshSession, clearSession, sessionGeneration } from './session'
declare module 'axios' {
  interface AxiosRequestConfig { _sessionGeneration?: number; _retried?: boolean }
}
const api = axios.create({ baseURL: '/zeroquant/api/v1', timeout: 120000, withCredentials: true })
api.interceptors.request.use(config => {
  if (config._sessionGeneration !== undefined && config._sessionGeneration !== sessionGeneration()) throw new Error('账号已切换，请重新操作')
  config._sessionGeneration = sessionGeneration()
  const token = accessToken()
  if (token && !['/auth/login','/auth/register'].includes(config.url ?? '')) config.headers.Authorization = 'Bearer ' + token
  config.headers['X-ZeroQuant-Client'] = 'web'
  return config
})
api.interceptors.response.use(
  response => {
    if (response.config._sessionGeneration !== sessionGeneration()) return Promise.reject(new Error('账号已切换，已忽略旧请求结果'))
    const result = response.data
    if (result.code !== 0) {
      ElMessage.error(result.message || '请求失败')
      return Promise.reject(new Error(result.message))
    }
    return result
  },
  async error => {
    const config = error.config
    if (config?._sessionGeneration !== undefined && config._sessionGeneration !== sessionGeneration()) return Promise.reject(error)
    if (error.response?.status === 401 && config && !config.url?.startsWith('/auth/') && !config._retried) {
      config._retried = true
      // 同批请求可能携带旧令牌；若另一请求已刷新，先复用新令牌，避免重复轮换。
      const current = accessToken()
      const refreshed = (current && config.headers?.Authorization !== 'Bearer ' + current) || await refreshSession()
      if (config._sessionGeneration !== sessionGeneration()) return Promise.reject(error)
      if (refreshed) return api.request(config)
      clearSession()
      if (window.location.hash !== '#/login') window.location.hash = '#/login'
      ElMessage.error('登录已过期，请重新登录')
    } else {
      ElMessage.error(error.response?.data?.message || error.message || '网络请求故障')
    }
    return Promise.reject(error)
  }
)
export default api
