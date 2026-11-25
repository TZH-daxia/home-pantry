import React, { useEffect, useState } from 'react'
import { View, Text, Input, Button } from '@tarojs/components'
import Taro from '@tarojs/taro'
import Modal from '../Modal'
import AppIcon from '../AppIcon'
import { HouseholdMember, HouseholdSummary, InviteCode } from '../../services/api'
import { createInviteCode, joinHousehold, loadHouseholdMembers, loadHouseholds, removeHouseholdMember, switchHousehold } from '../../services/repository'
import { getHouseholdId } from '../../services/session'
import { clearShareInviteCode, setShareInviteCode } from '../../services/share'
import './index.scss'

interface Props {
  open: boolean
  onClose: () => void
  /** 当前家庭中的身份，仅管理员可邀请/移除 */
  role: 'owner' | 'member'
  onChanged: () => void
}

const FamilyModal: React.FC<Props> = ({ open, onClose, role, onChanged }) => {
  const [households, setHouseholds] = useState<HouseholdSummary[]>([])
  const [members, setMembers] = useState<HouseholdMember[]>([])
  const [invite, setInvite] = useState<InviteCode | null>(null)
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)

  const activeId = getHouseholdId()
  const current = households.find((item) => item.id === activeId) || households[0]
  const isOwner = (current?.role || role) === 'owner'

  const refresh = async () => {
    try {
      const [list, memberList] = await Promise.all([loadHouseholds(), loadHouseholdMembers()])
      setHouseholds(list)
      setMembers(memberList)
    } catch (error) {
      console.warn('[home-pantry] 家庭信息加载失败', error)
      Taro.showToast({ title: '家庭信息加载失败', icon: 'none' })
    }
  }

  useEffect(() => {
    if (!open) return
    setInvite(null)
    setCode('')
    void refresh()
  }, [open])

  const handleInvite = async () => {
    if (busy) return
    setBusy(true)
    try {
      const created = await createInviteCode()
      setInvite(created)
      setShareInviteCode(created.code)
    } catch (error) {
      Taro.showToast({ title: (error as Error).message || '生成邀请码失败', icon: 'none' })
    } finally {
      setBusy(false)
    }
  }

  const closeModal = () => {
    clearShareInviteCode()
    onClose()
  }

  const copyCode = () => {
    if (!invite) return
    Taro.setClipboardData({ data: invite.code })
  }

  const handleRemove = (member: HouseholdMember) => {
    Taro.showModal({
      title: `移除 ${member.nickname}？`,
      content: '移除后该成员将无法查看这个家庭的库存与推荐。',
      confirmText: '移除',
      confirmColor: '#c75d4d',
      success: async (res) => {
        if (!res.confirm) return
        try {
          await removeHouseholdMember(member.userId)
          Taro.showToast({ title: '已移除', icon: 'success' })
          await refresh()
          onChanged()
        } catch (error) {
          Taro.showToast({ title: (error as Error).message || '移除失败', icon: 'none' })
        }
      },
    })
  }

  const handleJoin = async () => {
    const value = code.trim().toUpperCase()
    if (!value) { Taro.showToast({ title: '请输入邀请码', icon: 'none' }); return }
    if (busy) return
    setBusy(true)
    try {
      const result = await joinHousehold(value)
      Taro.showToast({ title: result.alreadyMember ? `已在「${result.name}」中` : `已加入「${result.name}」`, icon: 'none' })
      setCode('')
      await refresh()
      onChanged()
    } catch (error) {
      Taro.showToast({ title: (error as Error).message || '邀请码无效', icon: 'none' })
    } finally {
      setBusy(false)
    }
  }

  const handleSwitch = async (household: HouseholdSummary) => {
    switchHousehold(household.id)
    Taro.showToast({ title: `已切换到「${household.name}」`, icon: 'none' })
    await refresh()
    onChanged()
  }

  return (
    <Modal open={open} title='家庭空间' onClose={closeModal}>
      <View className='family-modal'>
        <View className='family-current'>
          <View className='family-current-main'>
            <Text className='family-name'>{current?.name || '我的家'}</Text>
            <Text className='family-caption'>{current ? `${current.memberCount} 位成员` : '加载中'}</Text>
          </View>
          <View className={`family-role ${isOwner ? 'owner' : ''}`}>{isOwner ? '管理员' : '成员'}</View>
        </View>

        <View className='family-block'>
          <Text className='family-block-title'>成员</Text>
          {members.map((member) => (
            <View className='family-member' key={member.userId}>
              <View className='family-avatar'><Text>{member.avatar}</Text></View>
              <View className='family-member-copy'>
                <Text className='family-member-name'>{member.nickname}{member.isSelf ? '（我）' : ''}</Text>
                <Text className='family-member-role'>{member.role === 'owner' ? '管理员' : '成员'}</Text>
              </View>
              {isOwner && !member.isSelf && member.role !== 'owner' && (
                <View className='family-remove' onClick={() => handleRemove(member)}>
                  <AppIcon name='close' size='sm' /><Text>移除</Text>
                </View>
              )}
            </View>
          ))}
        </View>

        {isOwner && (
          <View className='family-block'>
            <Text className='family-block-title'>邀请成员</Text>
            {invite ? (
              <View className='family-invite'>
                <Text className='family-invite-code'>{invite.code}</Text>
                <View className='family-invite-actions'>
                  <Button className='family-share' open-type='share' onClick={() => setShareInviteCode(invite.code)}>分享给微信好友</Button>
                  <View className='secondary-btn family-copy' onClick={copyCode}>复制</View>
                </View>
                <View className='family-invite-foot'>
                  <Text className='family-hint'>24 小时内有效，可邀请多位成员，过期后可重新生成。</Text>
                  <Text className='family-link' onClick={handleInvite}>重新生成</Text>
                </View>
              </View>
            ) : (
              <View className='primary-btn family-action' onClick={handleInvite}>{busy ? '生成中…' : '生成邀请码'}</View>
            )}
          </View>
        )}

        <View className='family-block'>
          <Text className='family-block-title'>加入其他家庭</Text>
          <View className='family-join'>
            <Input className='family-input' maxlength={6} value={code} placeholder='输入 6 位邀请码' onInput={(event) => setCode(event.detail.value.toUpperCase())} />
            <View className='secondary-btn family-join-btn' onClick={handleJoin}>加入</View>
          </View>
          <Text className='family-hint'>加入后可在下方切换家庭，成员只能查看和使用家庭数据，不能邀请或移除他人。</Text>
        </View>

        {households.length > 1 && (
          <View className='family-block'>
            <Text className='family-block-title'>切换家庭</Text>
            {households.map((household) => (
              <View key={household.id} className={`family-switch ${current?.id === household.id ? 'active' : ''}`} onClick={() => current?.id === household.id ? undefined : handleSwitch(household)}>
                <View className='family-switch-main'>
                  <Text className='family-switch-name'>{household.name}</Text>
                  <Text className='family-switch-meta'>{household.memberCount} 位成员 · {household.role === 'owner' ? '管理员' : '成员'}</Text>
                </View>
                {current?.id === household.id
                  ? <Text className='family-switch-tag'>当前</Text>
                  : <AppIcon name='arrow' className='family-switch-arrow' />}
              </View>
            ))}
          </View>
        )}
      </View>
    </Modal>
  )
}

export default FamilyModal
