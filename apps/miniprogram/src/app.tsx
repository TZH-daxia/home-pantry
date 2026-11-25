import React, { useEffect } from 'react'
import Taro from '@tarojs/taro'
import { ensureDemoData } from './utils/storage'
import { ensureLogin } from './services/session'
import { isLocalOnly } from './services/runtime'
import './app.scss'

const App: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  useEffect(() => {
    ensureDemoData()
    Taro.setNavigationBarTitle({ title: '今天吃啥' })
    // 纯本地演示版本：不登录、不请求后端
    if (isLocalOnly()) return
    // 冷启动若来自邀请分享，把邀请码带进首次登录：新用户直接加入家庭，不再创建空家庭
    const query = Taro.getLaunchOptionsSync()?.query || {}
    const invite = typeof query.invite === 'string' ? decodeURIComponent(query.invite) : ''
    void ensureLogin(invite || undefined).catch((error) => console.warn('[home-pantry] 登录失败，使用本地演示数据', error))
  }, [])
  return <>{children}</>
}

export default App
