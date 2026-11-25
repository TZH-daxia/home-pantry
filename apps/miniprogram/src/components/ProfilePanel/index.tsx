import React, { useEffect, useState } from 'react'
import { View, Text, Input, Picker } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { MealRecord } from '../../types'
import { formatMealTime } from '../../utils/date'
import { loadMeals } from '../../services/repository'
import Modal from '../Modal'
import AppIcon from '../AppIcon'
import FamilyModal from '../FamilyModal'
import { AVATARS } from '../../constants/mock-data'
import { UserProfile } from '../../types'
import { saveProfile } from '../../utils/storage'
import './index.scss'

interface Props {
  profile: UserProfile
  guest: boolean
  /** 做菜记录由首页统一加载后传入；未传时组件自行拉取 */
  meals?: MealRecord[]
  onProfileChange: (profile: UserProfile) => void
  onLogout: () => void
  onLogin: () => void
  /** 家庭信息变化（加入/切换/移除成员）后通知外层重新同步数据 */
  onHouseholdChanged: () => void
  /** 家庭面板开关由外层控制，便于首页「我的家」胶囊直接打开 */
  familyOpen: boolean
  onFamilyOpenChange: (open: boolean) => void
  /** 纯本地演示版本：隐藏家庭协同与登录入口 */
  localOnly?: boolean
}

const ProfilePanel: React.FC<Props> = ({ profile, guest, meals, onProfileChange, onLogout, onLogin, onHouseholdChanged, familyOpen, onFamilyOpenChange, localOnly }) => {
  const [modal, setModal] = useState<'nickname' | 'avatar' | null>(null)
  const [nicknameDraft, setNicknameDraft] = useState(profile.nickname)
  const PAGE_SIZE = 20
  const [mealList, setMealList] = useState<MealRecord[]>(meals || [])
  const [mealHasMore, setMealHasMore] = useState((meals?.length || 0) >= PAGE_SIZE)
  const [mealLoading, setMealLoading] = useState(false)

  useEffect(() => {
    if (meals) {
      setMealList(meals)
      setMealHasMore(meals.length >= PAGE_SIZE)
      return
    }
    let cancelled = false
    void loadMeals(0, PAGE_SIZE).then((list) => {
      if (cancelled) return
      setMealList(list)
      setMealHasMore(list.length >= PAGE_SIZE)
    })
    return () => { cancelled = true }
  }, [meals])

  const handleLoadMoreMeals = async () => {
    if (mealLoading) return
    setMealLoading(true)
    try {
      const next = await loadMeals(mealList.length, PAGE_SIZE)
      setMealList([...mealList, ...next])
      setMealHasMore(next.length >= PAGE_SIZE)
    } finally {
      setMealLoading(false)
    }
  }

  const updateProfile = (next: UserProfile) => { saveProfile(next); onProfileChange(next) }

  const saveNickname = () => {
    if (!nicknameDraft.trim()) { Taro.showToast({ title: '昵称不能为空', icon: 'none' }); return }
    updateProfile({ ...profile, nickname: nicknameDraft.trim() })
    setModal(null)
    Taro.showToast({ title: '昵称已更新', icon: 'success' })
  }

  const toggleRecommend = () => {
    const enabled = !profile.autoRecommend
    updateProfile({ ...profile, autoRecommend: enabled, notifyMode: enabled ? 'auto' : 'manual' })
    Taro.showToast({ title: enabled ? '已开启每日自动推荐' : '已关闭自动推荐，需手动查看', icon: 'none' })
  }

  const handleLogout = () => Taro.showModal({
    title: '退出登录',
    content: '退出后将清除本机登录状态，改为本地演示模式；本地数据不会被删除。',
    confirmText: '退出',
    confirmColor: '#c75d4d',
    success: (res) => { if (res.confirm) onLogout() },
  })

  return (
    <View className='page-shell profile-page'>
      <View className='profile-top content-wrap'>
        <Text className='profile-heading'>我的小厨房</Text>
        <Text className='profile-subheading'>让每一份食材，都有自己的好去处。</Text>
      </View>

      <View className='profile-user-card content-wrap'>
        <View className='user-card-inner'>
          <View className='user-avatar' onClick={() => setModal('avatar')}><Text>{profile.avatar}</Text><View className='avatar-edit'><AppIcon name='edit' size='sm' /></View></View>
          <View className='user-main'>
            <Text className='user-name'>{profile.nickname}</Text>
            <Text className='user-caption'>今天也要认真吃饭呀</Text>
            <View className='user-badge'><Text>{profile.householdRole === 'member' ? '✦ 家庭厨房成员' : '✦ 家庭厨房管理员'}</Text></View>
          </View>
          <View className='user-edit' onClick={() => { setNicknameDraft(profile.nickname); setModal('nickname') }}><AppIcon name='edit' size='md' /></View>
        </View>
      </View>

      <View className='profile-content content-wrap'>
        {!localOnly && (
          <>
            <View className='profile-section-title'><Text>家庭空间</Text><Text className='section-caption'>{profile.householdRole === 'member' ? '成员' : '管理员'}</Text></View>
            <View className='setting-card family-card' onClick={() => onFamilyOpenChange(true)}>
              <View className='setting-icon family-icon'>🏡</View>
              <View className='setting-copy'><Text className='setting-name'>{profile.householdName || '我的家'}</Text><Text className='setting-desc'>成员管理 / 邀请 / 加入其他家庭</Text></View>
              <AppIcon name='arrow' className='setting-arrow' />
            </View>
          </>
        )}

        <View className='profile-section-title meal-title'><Text>做菜记录</Text><Text className='section-caption'>家庭成员共享</Text></View>
        <View className='meal-card'>
          <View className='meal-head'>
            <Text className='meal-col-index'>序号</Text>
            <Text className='meal-col-user meal-head-cell'>做菜人</Text>
            <Text className='meal-col-dish'>菜品</Text>
            <Text className='meal-col-time'>时间</Text>
          </View>
          {mealList.length ? mealList.map((meal, index) => (
            <View className='meal-row' key={meal.id}>
              <Text className='meal-col-index'>{index + 1}</Text>
              <View className='meal-col-user'>
                <Text className='meal-avatar'>{meal.userAvatar || '🌻'}</Text>
                <Text className='meal-user-name'>{meal.userName || '家庭成员'}</Text>
              </View>
              <Text className='meal-col-dish'>{meal.recipeName || '已删除的菜谱'}</Text>
              <Text className='meal-col-time'>{formatMealTime(meal.cookedAt)}</Text>
            </View>
          )) : <Text className='meal-empty'>还没有记录，做完菜后点「已制作，记一笔」就会出现在这里</Text>}
          {mealHasMore
            ? <View className='meal-more' onClick={handleLoadMoreMeals}>{mealLoading ? '加载中…' : '加载更多'}</View>
            : mealList.length > 0 ? <Text className='meal-end'>已显示全部 {mealList.length} 条</Text> : null}
        </View>

        <View className='profile-section-title notification-title'><Text>推荐与通知</Text><Text className='section-caption'>把每天的好好吃饭提醒交给我</Text></View>
        <View className='notify-card'>
          <View className='notify-row'>
            <View className='setting-icon notify-icon'><AppIcon name='bell' size='lg' /></View>
            <View className='setting-copy'>
              <Text className='setting-name'>每日推荐</Text>
              <Text className='setting-desc'>{profile.autoRecommend ? '已开启 · 每天按时自动生成推荐' : '已关闭 · 不会自动推荐，需手动查看'}</Text>
            </View>
            <View className={`toggle ${profile.autoRecommend ? 'on' : ''}`} onClick={toggleRecommend}><View className='toggle-knob' /></View>
          </View>
          <View className='time-row'>
            <View className='time-copy'>
              <Text className='time-label'>推荐时间</Text>
              <Text className='time-caption'>{profile.autoRecommend ? '每天在这个时间生成当日推荐' : '自动推荐已关闭，时间设置不生效'}</Text>
            </View>
            <Picker mode='time' disabled={!profile.autoRecommend} value={profile.recommendTime} onChange={(e) => updateProfile({ ...profile, recommendTime: e.detail.value })}>
              <View className={`time-value ${profile.autoRecommend ? '' : 'is-disabled'}`}>
                <Text>{profile.recommendTime}</Text>
                <View className='time-caret' />
              </View>
            </Picker>
          </View>
          {profile.autoRecommend && (
            <View className='notice-foot'><AppIcon name='clock' size='sm' /><Text>到点后首页自动展示当日推荐，微信服务通知需单独授权。</Text></View>
          )}
        </View>

        <View className='profile-section-title other-title'><Text>其他</Text></View>
        <View className='setting-card single-row' onClick={() => Taro.showModal({ title: '关于今天吃啥', content: '今天吃啥 · home-pantry\n智能家庭食材库存与菜谱推荐', showCancel: false })}>
          <View className='setting-icon about-icon'>✦</View><View className='setting-copy'><Text className='setting-name'>关于今天吃啥</Text><Text className='setting-desc'>版本 0.1.0 · 第一期开发展示版</Text></View><AppIcon name='arrow' className='setting-arrow' />
        </View>
        {localOnly
          ? <Text className='profile-local-hint'>本地演示版本 · 数据仅保存在本机</Text>
          : (
            <>
              <View className={`logout-btn ${guest ? 'login' : ''}`} onClick={guest ? onLogin : handleLogout}>{guest ? '登录并同步数据' : '退出登录'}</View>
              {guest && <Text className='profile-guest-hint'>当前为本地演示模式，数据只保存在本机</Text>}
            </>
          )}
        <Text className='profile-footer'>MADE FOR EVERYDAY GOOD FOOD · 2026</Text>
      </View>

      <Modal open={modal === 'nickname'} title='修改昵称' onClose={() => setModal(null)}>
        <View className='form-group'><Text className='field-label'>给自己起个名字</Text><Input className='form-field' value={nicknameDraft} maxlength={16} placeholder='输入昵称' onInput={(e) => setNicknameDraft(e.detail.value)} /></View>
        <View className='primary-btn modal-submit' onClick={saveNickname}>保存昵称</View>
      </Modal>
      <Modal open={modal === 'avatar'} title='选择一个头像' onClose={() => setModal(null)}>
        <View className='avatar-grid'>{AVATARS.map((avatar) => <View key={avatar} className={`avatar-option ${profile.avatar === avatar ? 'active' : ''}`} onClick={() => { updateProfile({ ...profile, avatar }); setModal(null) }}><Text>{avatar}</Text></View>)}</View>
        <Text className='avatar-hint'>头像使用预设资源，不支持上传图片。</Text>
      </Modal>
      <FamilyModal
        open={familyOpen}
        role={profile.householdRole === 'member' ? 'member' : 'owner'}
        onClose={() => onFamilyOpenChange(false)}
        onChanged={onHouseholdChanged}
      />
    </View>
  )
}
export default ProfilePanel
