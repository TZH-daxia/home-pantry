import React, { useEffect } from 'react'
import Taro from '@tarojs/taro'
import { ensureDemoData } from './utils/storage'
import './app.scss'

const App: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  useEffect(() => {
    ensureDemoData()
    Taro.setNavigationBarTitle({ title: '今天吃啥' })
  }, [])
  return <>{children}</>
}

export default App
