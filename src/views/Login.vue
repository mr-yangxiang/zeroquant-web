<template>
  <div class="min-h-screen w-full bg-slate-950 flex items-center justify-center relative overflow-hidden">
    <!-- 背景极光发光特效 -->
    <div class="absolute top-1/4 left-1/3 w-96 h-96 bg-cyan-500/15 rounded-full blur-3xl pointer-events-none animate-pulse"></div>
    <div class="absolute bottom-1/4 right-1/3 w-96 h-96 bg-blue-600/15 rounded-full blur-3xl pointer-events-none"></div>

    <div class="w-full max-w-md p-8 glass-card-glow relative z-10 mx-4 border border-cyan-500/30">
      <div class="text-center mb-8">
        <div class="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 mb-4 shadow-lg shadow-cyan-500/20">
          <el-icon class="text-3xl"><DataLine /></el-icon>
        </div>
        <h1 class="text-2xl font-black tracking-wider text-white">ZeroQuant 智脑平台</h1>
        <p class="text-xs text-slate-400 mt-2 font-mono">AI 量化交易与盘中做 T 决策系统</p>
      </div>

      <div class="flex items-center justify-center gap-4 mb-6 border-b border-slate-800 pb-3">
        <button
          @click="isRegister = false"
          :class="!isRegister ? 'text-cyan-400 font-extrabold border-b-2 border-cyan-400 pb-1 text-sm' : 'text-slate-400 text-sm hover:text-white'"
        >
          账号登录
        </button>
        <button
          @click="isRegister = true"
          :class="isRegister ? 'text-cyan-400 font-extrabold border-b-2 border-cyan-400 pb-1 text-sm' : 'text-slate-400 text-sm hover:text-white'"
        >
          注册新账号
        </button>
      </div>

      <el-form :model="form" @submit.prevent="handleSubmit" size="large">
        <el-form-item v-if="isRegister">
          <el-input
            v-model="form.username"
            placeholder="昵称 / 战友姓名 (如: 战友-老李)"
            prefix-icon="User"
            class="custom-input"
          />
        </el-form-item>
        <el-form-item class="mt-4">
          <el-input
            v-model="form.phone"
            placeholder="账号 / 手机号"
            prefix-icon="Iphone"
            class="custom-input"
          />
        </el-form-item>
        <el-form-item class="mt-4">
          <el-input
            v-model="form.password"
            type="password"
            placeholder="密码"
            prefix-icon="Lock"
            show-password
            class="custom-input"
          />
        </el-form-item>

        <button
          type="submit"
          :disabled="loading"
          class="w-full mt-6 py-3.5 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold tracking-wide shadow-lg shadow-cyan-500/25 active:scale-95 transition-all duration-200 disabled:opacity-50"
        >
          {{ loading ? '验证处理中...' : (isRegister ? '注册并进入智脑大盘' : '进入做 T 智脑大盘') }}
        </button>
      </el-form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import api from '../api'

const router = useRouter()
const loading = ref(false)
const isRegister = ref(false)
const form = ref({
  username: '',
  phone: '',
  password: '',
})

const handleSubmit = async () => {
  if (!form.value.phone || !form.value.password) {
    return ElMessage.warning('请输入账号和密码')
  }
  if (isRegister.value && !form.value.username) {
    return ElMessage.warning('请输入战友昵称/姓名')
  }

  loading.value = true
  try {
    const url = isRegister.value ? '/auth/register' : '/auth/login'
    const res: any = await api.post(url, form.value)
    localStorage.setItem('zeroquant_token', res.data.token)
    localStorage.setItem('zeroquant_user', JSON.stringify(res.data.user))
    ElMessage.success(isRegister.value ? '注册成功，欢迎加入 ZeroQuant 智脑做 T 平台！' : '欢迎进入 ZeroQuant 做 T 智脑平台！')
    router.replace('/')
  } catch (err: any) {
    // 错误在拦截器处理
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
:deep(.el-input__wrapper) {
  background-color: rgba(15, 23, 42, 0.6) !important;
  border: 1px solid rgba(255, 255, 255, 0.1) !important;
  border-radius: 12px !important;
  box-shadow: none !important;
  color: #fff !important;
}
:deep(.el-input__wrapper.is-focus) {
  border-color: #06b6d4 !important;
}
:deep(.el-input__inner) {
  color: #fff !important;
}
</style>
