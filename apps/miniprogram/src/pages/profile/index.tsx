import React, { useState } from 'react'
import { View } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'
import BottomNav from '../../components/BottomNav'
import ProfilePanel from '../../components/ProfilePanel'
import { UserProfile } from '../../types'
import { getProfile } from '../../utils/storage'
import { enterGuestMode, exitGuestMode, isGuest } from '../../services/session'
import { logout } from '../../services/repository'
import { isLocalOnly } from '../../services/runtime'

const ProfilePage: React.FC = () => {
  const [profile, setProfile] = useState<UserProfile>(getProfile())
  const [guest, setGuest] = useState(isGuest())
  const [familyOpen, setFamilyOpen] = useState(false)

  useDidShow(() => {
    setProfile(getProfile())
    setGuest(isGuest())
  })

  const handleLogout = () => {
    void logout().then(() => {
      enterGuestMode()
      setGuest(true)
      Taro.showToast({ title: '已退出登录，切换为本地演示模式', icon: 'none' })
    })
  }

  const handleLogin = () => {
    exitGuestMode()
    setGuest(false)
    Taro.showToast({ title: '正在登录并同步数据', icon: 'none' })
  }

  return (
    <View>
      <ProfilePanel
        profile={profile}
        guest={guest}
        onProfileChange={setProfile}
        onLogout={handleLogout}
        onLogin={handleLogin}
        onHouseholdChanged={() => setProfile(getProfile())}
        familyOpen={familyOpen}
        onFamilyOpenChange={setFamilyOpen}
        localOnly={isLocalOnly()}
      />
      <BottomNav active='profile' onChange={(tab) => { if (tab === 'home') Taro.redirectTo({ url: '/pages/home/index' }) }} />
    </View>
  )
}
export default ProfilePage
