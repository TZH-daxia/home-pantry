import React from 'react'
import { View, Text } from '@tarojs/components'
import './index.scss'

const glyphs: Record<string, string> = {
  home: '⌂', user: '◉', add: '+', arrow: '›', bell: '◔', calendar: '▦', check: '✓',
  close: '×', clock: '◷', edit: '✎', leaf: '✦', more: '···', search: '⌕', settings: '⚙',
  spoon: '⌁', trash: '⌫', chevron: '⌄', heart: '♡', sparkles: '✧', package: '▣',
}

interface AppIconProps { name: string; size?: 'sm' | 'md' | 'lg' | 'xl'; className?: string }
const AppIcon: React.FC<AppIconProps> = ({ name, size = 'md', className = '' }) => (
  <View className={`app-icon app-icon-${size} ${className}`}><Text>{glyphs[name] || '·'}</Text></View>
)
export default AppIcon
