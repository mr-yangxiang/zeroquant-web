import axios from 'axios'
import { ElMessage } from 'element-plus'

const api = axios.create({
  baseURL: '/zeroquant/api/v1',
  timeout: 15000,
})

// 请求拦截器
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('zeroquant_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// 响应拦截器
api.interceptors.response.use(
  (response) => {
    const res = response.data
    if (res.code !== 0) {
      ElMessage.error(res.message || '请求失败')
      return Promise.reject(new Error(res.message))
    }
    return res
  },
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('zeroquant_token')
      localStorage.removeItem('zeroquant_user')
      if (window.location.hash !== '#/login') {
        window.location.hash = '#/login'
        ElMessage.error('登录已过期，请重新登录')
      }
    } else {
      ElMessage.error(error.response?.data?.message || error.message || '网络请求故障')
    }
    return Promise.reject(error)
  }
)

export default api
