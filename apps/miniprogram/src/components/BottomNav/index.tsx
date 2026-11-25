import React from 'react'
import { View, Text } from '@tarojs/components'
import AppIcon from '../AppIcon'
import './index.scss'

interface Props { active: 'home' | 'profile'; onChange: (tab: 'home' | 'profile') => void }
const BottomNav: React.FC<Props> = ({ active, onChange }) => (
  <View className='bottom-nav-wrap'>
    <View className='bottom-nav'>
      <View className={`nav-item ${active === 'home' ? 'active' : ''}`} onClick={() => onChange('home')}>
        <AppIcon name='home' size='lg' />
        <Text>首页</Text>
      </View>
      <View className={`nav-item ${active === 'profile' ? 'active' : ''}`} onClick={() => onChange('profile')}>
        <AppIcon name='user' size='lg' />
        <Text>我的</Text>
      </View>
    </View>
  </View>
)
export default BottomNav
