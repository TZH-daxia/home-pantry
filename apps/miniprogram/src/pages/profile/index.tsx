import React, { useState } from 'react'
import { View, Text, Input, Picker } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'
import BottomNav from '../../components/BottomNav'
import Modal from '../../components/Modal'
import AppIcon from '../../components/AppIcon'
import { AVATARS } from '../../constants/mock-data'
import { UserProfile } from '../../types'
import { getProfile, saveProfile } from '../../utils/storage'
import './index.scss'

const ProfilePage: React.FC = () => {
  const [profile, setProfile] = useState<UserProfile>(getProfile())
  const [modal, setModal] = useState<'nickname' | 'avatar' | null>(null)
  const [nicknameDraft, setNicknameDraft] = useState(profile.nickname)

  useDidShow(() => setProfile(getProfile()))
  const updateProfile = (next: UserProfile) => { setProfile(next); saveProfile(next) }
  const goTab = (tab: 'home' | 'profile') => { if (tab === 'home') Taro.redirectTo({ url: '/pages/home/index' }) }

  const saveNickname = () => {
    if (!nicknameDraft.trim()) { Taro.showToast({ title: '昵称不能为空', icon: 'none' }); return }
    updateProfile({ ...profile, nickname: nicknameDraft.trim() })
    setModal(null)
    Taro.showToast({ title: '昵称已更新', icon: 'success' })
  }

  const changeMode = (mode: 'auto' | 'manual') => {
    updateProfile({ ...profile, notifyMode: mode, autoRecommend: mode === 'auto' })
    Taro.showToast({ title: mode === 'auto' ? '已切换为自动模式' : '已切换为手动模式', icon: 'none' })
  }

  const toggleRecommend = () => {
    const enabled = !profile.autoRecommend
    updateProfile({ ...profile, autoRecommend: enabled, notifyMode: enabled ? 'auto' : 'manual' })
  }
  const logout = () => Taro.showModal({ title: '退出登录', content: '当前版本使用本地演示身份，退出后将返回演示状态。', confirmText: '退出', confirmColor: '#c75d4d', success: (res) => {
    if (res.confirm) Taro.showToast({ title: '演示模式暂不清除本地数据', icon: 'none' })
  } })

  return (
    <View className='page-shell profile-page'>
      <View className='profile-top content-wrap'>
        <Text className='profile-kicker'>YOUR KITCHEN, YOUR RHYTHM</Text>
        <Text className='profile-heading'>我的小厨房</Text>
        <Text className='profile-subheading'>让每一份食材，都有自己的好去处。</Text>
      </View>

      <View className='profile-user-card content-wrap'>
        <View className='user-card-inner'>
          <View className='user-avatar' onClick={() => setModal('avatar')}><Text>{profile.avatar}</Text><View className='avatar-edit'><AppIcon name='edit' size='sm' /></View></View>
          <View className='user-main'><Text className='user-name'>{profile.nickname}</Text><Text className='user-caption'>今天也要认真吃饭呀</Text><View className='user-badge'><Text>✦ 家庭厨房成员</Text></View></View>
          <View className='user-edit' onClick={() => { setNicknameDraft(profile.nickname); setModal('nickname') }}><AppIcon name='edit' size='md' /></View>
        </View>
      </View>

      <View className='profile-content content-wrap'>
        <View className='profile-section-title'><Text>家庭空间</Text><Text className='coming-soon'>二期开放</Text></View>
        <View className='setting-card family-card' onClick={() => Taro.showToast({ title: '家庭成员共享将在二期开放', icon: 'none' })}>
          <View className='setting-icon family-icon'>🏡</View>
          <View className='setting-copy'><Text className='setting-name'>家庭成员</Text><Text className='setting-desc'>邀请家人，一起管理库存和菜谱</Text></View>
          <AppIcon name='arrow' className='setting-arrow' />
        </View>

        <View className='profile-section-title notification-title'><Text>推荐与通知</Text><Text className='section-caption'>把每天的好好吃饭提醒交给我</Text></View>
        <View className='setting-card notification-card'>
          <View className='setting-icon notify-icon'><AppIcon name='bell' size='lg' /></View>
          <View className='setting-copy'><Text className='setting-name'>每日推荐</Text><Text className='setting-desc'>每天生成一份适合当前库存的菜单</Text></View>
          <View className={`toggle ${profile.autoRecommend ? 'on' : ''}`} onClick={toggleRecommend}><View className='toggle-knob' /></View>
        </View>
        <View className='mode-card'>
          <Text className='mode-title'>推荐模式</Text>
          <View className='mode-options'>
            <View className={`mode-option ${profile.notifyMode === 'auto' ? 'selected' : ''}`} onClick={() => changeMode('auto')}><View className='mode-radio'>{profile.notifyMode === 'auto' ? <View /> : null}</View><View><Text className='mode-option-title'>自动推荐</Text><Text className='mode-option-desc'>每日自动生成，进入首页即可查看</Text></View></View>
            <View className={`mode-option ${profile.notifyMode === 'manual' ? 'selected' : ''}`} onClick={() => changeMode('manual')}><View className='mode-radio'>{profile.notifyMode === 'manual' ? <View /> : null}</View><View><Text className='mode-option-title'>手动查看</Text><Text className='mode-option-desc'>由我主动打开首页查看推荐</Text></View></View>
          </View>
          <View className='time-row'><View><Text className='time-label'>每日推荐时间</Text><Text className='time-caption'>按家庭时区生成推荐</Text></View><Picker mode='time' value={profile.recommendTime} onChange={(e) => updateProfile({ ...profile, recommendTime: e.detail.value })}><View className='time-value'>{profile.recommendTime}<AppIcon name='chevron' size='sm' /></View></Picker></View>
          <View className='notice-foot'><AppIcon name='clock' size='sm' /><Text>微信服务通知需单独授权，当前为站内推荐演示模式。</Text></View>
        </View>

        <View className='profile-section-title other-title'><Text>其他</Text></View>
        <View className='setting-card single-row' onClick={() => Taro.showModal({ title: '关于今天吃啥', content: '今天吃啥 · home-pantry\n智能家庭食材库存与菜谱推荐', showCancel: false })}>
          <View className='setting-icon about-icon'>✦</View><View className='setting-copy'><Text className='setting-name'>关于今天吃啥</Text><Text className='setting-desc'>版本 0.1.0 · 第一期开发展示版</Text></View><AppIcon name='arrow' className='setting-arrow' />
        </View>
        <View className='logout-btn' onClick={logout}>退出登录</View>
        <Text className='profile-footer'>MADE FOR EVERYDAY GOOD FOOD · 2026</Text>
      </View>

      <BottomNav active='profile' onChange={goTab} />

      <Modal open={modal === 'nickname'} title='修改昵称' onClose={() => setModal(null)}>
        <View className='form-group'><Text className='field-label'>给自己起个名字</Text><Input className='form-field' value={nicknameDraft} maxlength={16} placeholder='输入昵称' onInput={(e) => setNicknameDraft(e.detail.value)} /></View>
        <View className='primary-btn modal-submit' onClick={saveNickname}>保存昵称</View>
      </Modal>
      <Modal open={modal === 'avatar'} title='选择一个头像' onClose={() => setModal(null)}>
        <View className='avatar-grid'>{AVATARS.map((avatar) => <View key={avatar} className={`avatar-option ${profile.avatar === avatar ? 'active' : ''}`} onClick={() => { updateProfile({ ...profile, avatar }); setModal(null) }}><Text>{avatar}</Text></View>)}</View>
        <Text className='avatar-hint'>头像使用预设资源，不支持上传图片。</Text>
      </Modal>
    </View>
  )
}
export default ProfilePage
