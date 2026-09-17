import { test, expect } from '@playwright/test'
test('actual login, refresh cookie, simultaneous tabs, logout and origin rejection', async ({page,context,request}) => {
  const phone='139'+String(Date.now()).slice(-8),password='BrowserIsolatedTest!234'
  const created=await request.post('http://127.0.0.1:3102/api/v1/auth/register',{
    headers:{'X-ZeroQuant-Client':'web',Origin:'http://localhost:3003'},
    data:{phone,password,username:'browser-test'},
  })
  expect(created.status(),await created.text()).toBe(201)
  const denied=await request.post('http://127.0.0.1:3102/api/v1/auth/login',{
    headers:{'X-ZeroQuant-Client':'web',Origin:'https://unapproved.invalid'},data:{phone,password},
  })
  expect(denied.status()).toBe(403)
  await page.goto('#/login')
  await page.getByPlaceholder('账号 / 手机号').fill(phone)
  await page.getByPlaceholder('密码',{exact:true}).fill(password)
  await page.getByRole('button',{name:'进入做 T 智脑大盘',exact:true}).click()
  await expect(page.getByTitle('退出登录')).toBeVisible()
  const cookies=await context.cookies('http://localhost:3003/zeroquant/api/v1/auth/refresh')
  expect(cookies.find(c=>c.name==='zeroquant_refresh')?.httpOnly).toBe(true)
  await page.reload()
  await expect(page.getByTitle('退出登录')).toBeVisible()
  const other=await context.newPage()
  await Promise.all([page.reload(),other.goto('http://localhost:3003/zeroquant/#/')])
  await expect(page.getByTitle('退出登录')).toBeVisible()
  await expect(other.getByTitle('退出登录')).toBeVisible()
  await page.getByTitle('退出登录').click()
  await expect(page.getByPlaceholder('账号 / 手机号')).toBeVisible()
  await other.reload()
  await expect(other.getByPlaceholder('账号 / 手机号')).toBeVisible()
  await page.getByPlaceholder('账号 / 手机号').fill(phone)
  await page.getByPlaceholder('密码',{exact:true}).fill(password)
  await page.getByRole('button',{name:'进入做 T 智脑大盘',exact:true}).click()
  await expect(page.getByTitle('退出登录')).toBeVisible()
  await other.goto('http://localhost:3003/zeroquant/#/')
  await expect(other.getByTitle('退出登录')).toBeVisible()
  await page.goto('http://localhost:3003/zeroquant/#/login')
  await page.getByRole('button',{name:'注册新账号',exact:true}).click()
  await page.getByPlaceholder('昵称 / 战友姓名 (如: 战友-老李)').fill('second-account')
  await page.getByPlaceholder('账号 / 手机号').fill('137'+String(Date.now()).slice(-8))
  await page.getByPlaceholder('至少 15 个字符的长口令').fill(password)
  await page.getByRole('button',{name:'注册并进入智脑大盘',exact:true}).click()
  await expect(page.getByTitle('退出登录')).toBeVisible()
  await expect(other.getByPlaceholder('账号 / 手机号')).toBeVisible()
})
