import React from 'react'
import { View, Text } from '@tarojs/components'
import AppIcon from '../AppIcon'
import './index.scss'

interface Props {
  open: boolean
  title?: string
  onClose: () => void
  children: React.ReactNode
}
const Modal: React.FC<Props> = ({ open, title, onClose, children }) => {
  if (!open) return null
  return (
    <View className='modal-mask' catchMove onClick={onClose}>
      <View className='modal-sheet' onClick={(event) => event.stopPropagation()}>
        <View className='modal-handle' />
        <View className='modal-head'>
          <Text className='modal-title'>{title || ''}</Text>
          <View className='modal-close' onClick={onClose}><AppIcon name='close' /></View>
        </View>
        <View className='modal-body'>{children}</View>
      </View>
    </View>
  )
}
export default Modal
