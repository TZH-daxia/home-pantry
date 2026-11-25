import React, { useMemo, useRef, useState } from 'react'
import { View, Text, ScrollView, Input, Picker } from '@tarojs/components'
import Taro, { useDidShow, useShareAppMessage } from '@tarojs/taro'
import BottomNav from '../../components/BottomNav'
import ProfilePanel from '../../components/ProfilePanel'
import Modal from '../../components/Modal'
import AppIcon from '../../components/AppIcon'
import { CATEGORIES } from '../../constants/mock-data'
import { Ingredient, IngredientCategory, Recipe, RecipeMatch, UserProfile } from '../../types'
import { buildRecommendations } from '../../utils/recommendation'
import { getChineseDate } from '../../utils/date'
import { getHistory, getInventory, getProfile, getRecipes, saveHistory, saveInventory } from '../../utils/storage'
import { createIngredient, deleteIngredient, joinHousehold, loadDashboard, logout, pushProfile, recordMeal, updateIngredient } from '../../services/repository'
import { enterGuestMode, exitGuestMode, isGuest } from '../../services/session'
import { buildInvitePath, getShareInviteCode } from '../../services/share'
import { isLocalOnly } from '../../services/runtime'
import './index.scss'

const CATEGORY_OPTIONS = ['蔬菜', '肉类', '水产', '蛋奶', '主食', '调味品', '其他']
const CATEGORY_EMOJI: Record<string, string> = { 蔬菜: '🥬', 肉类: '🥩', 水产: '🐟', 蛋奶: '🥚', 主食: '🍚', 调味品: '🧂', 其他: '🧺' }
const CATEGORY_ORDER: string[] = CATEGORIES.filter((item) => item !== '全部')
const categoryRank = (category: string) => {
  const index = CATEGORY_ORDER.indexOf(category)
  return index === -1 ? CATEGORY_ORDER.length : index
}
const difficultyName = (value: number) => ['入门', '简单', '进阶', '挑战'][value - 1] || '简单'

type ModuleKey = 'recommend' | 'inventory' | 'recipes' | 'today'
const MODULES: { key: ModuleKey; label: string; icon: string }[] = [
  { key: 'recommend', label: '今日推荐', icon: '✨' },
  { key: 'inventory', label: '食材库存', icon: '🥬' },
  { key: 'recipes', label: '菜品食谱', icon: '🍳' },
  { key: 'today', label: '今日宜吃', icon: '🍚' },
]

const HomePage: React.FC = () => {
  const [inventory, setInventory] = useState<Ingredient[]>(getInventory())
  const [recipes, setRecipes] = useState<Recipe[]>(getRecipes())
  const [history, setHistory] = useState(getHistory())
  const [profile, setProfile] = useState(getProfile())
  const [filter, setFilter] = useState<string>('全部')
  const [modal, setModal] = useState<'ingredient' | 'detail' | null>(null)
  const [activeMatch, setActiveMatch] = useState<RecipeMatch | null>(null)
  const [activeRecipe, setActiveRecipe] = useState<Recipe | null>(null)
  const [activeModule, setActiveModule] = useState<ModuleKey>('recommend')
  const [activeTab, setActiveTab] = useState<'home' | 'profile'>('home')
  const [guest, setGuest] = useState(isGuest())
  const [remoteMode, setRemoteMode] = useState(false)
  const [familyOpen, setFamilyOpen] = useState(false)

  const [ingredientName, setIngredientName] = useState('')
  const [ingredientCategory, setIngredientCategory] = useState('蔬菜')
  const [editingIngredient, setEditingIngredient] = useState<Ingredient | null>(null)

  const [matches, setMatches] = useState<RecipeMatch[]>(() => buildRecommendations(getRecipes(), getInventory(), getHistory()))

  const applyBundle = (bundle: Awaited<ReturnType<typeof loadDashboard>>) => {
    setInventory(bundle.inventory)
    setRecipes(bundle.recipes)
    setHistory(bundle.history)
    setProfile(bundle.profile)
    setMatches(bundle.matches)
    setRemoteMode(bundle.remote)
  }

  /** 优先从后端加载，失败时自动回落到本地演示数据 */
  const syncFromServer = async (): Promise<Awaited<ReturnType<typeof loadDashboard>> | null> => {
    try {
      const bundle = await loadDashboard()
      applyBundle(bundle)
      return bundle
    } catch (error) {
      console.warn('[home-pantry] 同步失败', error)
      return null
    }
  }

  /** 手动刷新：家庭成员新增食材后，其他人可主动拉取最新数据 */
  const [refreshing, setRefreshing] = useState(false)
  const handleRefresh = async () => {
    if (refreshing) return
    setRefreshing(true)
    try {
      const bundle = await syncFromServer()
      Taro.showToast({ title: bundle?.remote ? '已刷新最新库存与推荐' : '当前为本地数据', icon: 'none' })
    } finally {
      setRefreshing(false)
    }
  }

  useShareAppMessage(() => {
    const code = getShareInviteCode()
    return {
      title: code ? '邀请你一起管理家里的食材和菜谱' : '今天吃啥 · 家庭食材与菜谱推荐',
      path: code ? buildInvitePath(code) : '/pages/home/index',
    }
  })

  /** 通过分享卡片进入时自动加入对应家庭（同一个邀请码只处理一次） */
  const acceptedInvite = useRef('')
  const handleIncomingInvite = async (code: string) => {
    if (isLocalOnly() || !code || acceptedInvite.current === code) return
    acceptedInvite.current = code
    try {
      exitGuestMode()
      setGuest(false)
      const result = await joinHousehold(code)
      // 首次登录携带邀请码时后端已自动加入，这里静默跳过避免重复提示
      if (!result.alreadyMember) Taro.showToast({ title: `已加入「${result.name}」`, icon: 'none' })
    } catch (error) {
      acceptedInvite.current = ''
      console.warn('[home-pantry] 邀请码加入失败', error)
      Taro.showToast({ title: '邀请码无效或已过期', icon: 'none' })
    }
  }

  useDidShow(() => {
    const invite = Taro.getCurrentInstance().router?.params?.invite
    if (invite) {
      void handleIncomingInvite(decodeURIComponent(invite)).then(() => { void syncFromServer() })
    } else {
      void syncFromServer()
    }
  })

  const visibleInventory = useMemo(() => {
    const list = filter === '全部' ? inventory : inventory.filter((item) => item.category === filter)
    return list
      .map((item, index) => ({ item, index }))
      .sort((a, b) => categoryRank(a.item.category) - categoryRank(b.item.category) || a.index - b.index)
      .map((entry) => entry.item)
  }, [inventory, filter])
  const readyCount = matches.filter((item) => item.ready).length
  // 最合适的一餐：取今日宜吃中「食材齐全」的榜首；后续由 AI 推荐结果决定
  const featuredMatch = matches.find((item) => item.ready) || null

  const refreshInventory = (next: Ingredient[]) => { setInventory(next); saveInventory(next) }
  /** 本地先更新，再异步同步到后端；成功后以服务端数据（含推荐结果）为准 */
  const pushMutation = (task: Promise<boolean>) => {
    void task.then((ok) => {
      if (ok) void syncFromServer()
      else Taro.showToast({ title: guest ? '本地演示模式，改动仅保存在本机' : '未连接后端，改动仅保存在本机', icon: 'none' })
    })
  }

  const handleLogout = () => {
    // 先让服务端令牌失效，再清本机登录态；失败也允许本地退出
    void logout().then(() => {
      enterGuestMode()
      setGuest(true)
      Taro.showToast({ title: '已退出登录，切换为本地演示模式', icon: 'none' })
      void syncFromServer()
    })
  }

  const handleLogin = () => {
    exitGuestMode()
    setGuest(false)
    Taro.showToast({ title: '正在登录并同步数据', icon: 'none' })
    void syncFromServer()
  }

  const openIngredientModal = (item?: Ingredient) => {
    if (item) {
      setEditingIngredient(item)
      setIngredientName(item.name)
      setIngredientCategory(item.category)
    } else {
      setEditingIngredient(null)
      setIngredientName('')
      setIngredientCategory('蔬菜')
    }
    setModal('ingredient')
  }

  const handleAddIngredient = () => {
    const name = ingredientName.trim()
    if (!name) {
      Taro.showToast({ title: '请填写食材名称', icon: 'none' })
      return
    }
    if (editingIngredient) {
      const next = inventory.map((item) => item.id === editingIngredient.id ? { ...item, name, category: ingredientCategory as IngredientCategory, emoji: CATEGORY_EMOJI[ingredientCategory] || item.emoji } : item)
      refreshInventory(next)
      pushMutation(updateIngredient(editingIngredient.id, { name, category: ingredientCategory }))
      setIngredientName(''); setEditingIngredient(null); setModal(null)
      Taro.showToast({ title: '库存已更新', icon: 'success' })
      return
    }
    if (inventory.some((item) => item.name === name)) {
      Taro.showToast({ title: '库存里已有同名食材', icon: 'none' })
      return
    }
    refreshInventory([...inventory, { id: `i_${Date.now()}`, name, category: ingredientCategory as IngredientCategory, quantity: 1, unit: '个', emoji: CATEGORY_EMOJI[ingredientCategory] || '🥬' }])
    pushMutation(createIngredient({ name, category: ingredientCategory }))
    setIngredientName(''); setModal(null)
    Taro.showToast({ title: '食材已添加', icon: 'success' })
  }

  const handleDeleteIngredient = (id: string) => {
    Taro.showModal({ title: '删除这项食材？', content: '删除后，这项食材将从库存列表中移除。', confirmText: '删除', confirmColor: '#c75d4d', success: (res) => {
      if (res.confirm) {
        refreshInventory(inventory.filter((item) => item.id !== id))
        pushMutation(deleteIngredient(id))
      }
    } })
  }

  const markCooked = (match: RecipeMatch) => {
    const next = [{ id: `h_${Date.now()}`, recipeId: match.recipe.id, cookedAt: new Date().toISOString() }, ...history]
    setHistory(next); saveHistory(next); setModal(null)
    pushMutation(recordMeal(match.recipe.id))
    Taro.showToast({ title: '已记入今日做菜记录', icon: 'success' })
  }

  const handleProfileChange = (next: UserProfile) => {
    setProfile(next)
    void pushProfile(next).then((remote) => { if (remote) setProfile(remote) })
  }

  const openMatch = (match: RecipeMatch) => { setActiveMatch(match); setActiveRecipe(match.recipe); setModal('detail') }
  const openRecipe = (recipe: Recipe) => { setActiveRecipe(recipe); setActiveMatch(matches.find((item) => item.recipe.id === recipe.id) || null); setModal('detail') }
  const switchModule = (key: ModuleKey) => {
    setActiveModule(key)
    Taro.pageScrollTo({ scrollTop: 0, duration: 0 })
  }

  /** 首页「我的家」胶囊：切到我的页并打开家庭空间面板 */
  const openFamily = () => {
    setActiveTab('profile')
    setFamilyOpen(true)
    Taro.pageScrollTo({ scrollTop: 0, duration: 0 })
  }

  const switchTab = (tab: 'home' | 'profile') => {
    if (tab === activeTab) return
    setActiveTab(tab)
    Taro.pageScrollTo({ scrollTop: 0, duration: 0 })
  }

  const renderMatchCard = (match: RecipeMatch, index: number) => (
    <View className='recommend-card' key={match.recipe.id} onClick={() => openMatch(match)}>
      <View className={`recommend-art recommend-art-${match.recipe.theme}`}><Text>{match.recipe.emoji}</Text><View className='recommend-rank'>{String(index + 1).padStart(2, '0')}</View></View>
      <View className='recommend-copy'>
        <View className='recommend-topline'><Text className='recommend-name'>{match.recipe.name}</Text><View className={`match-tag ${match.ready ? 'ready' : 'missing'}`}>{match.ready ? '食材齐全' : `缺少 ${match.missingRequired.length} 项`}</View></View>
        <Text className='recommend-meta'>{difficultyName(match.recipe.difficulty)}级 · {match.recipe.prepMinutes + match.recipe.cookMinutes} 分钟</Text>
        <Text className='recommend-ingredients'>已有 {match.availableRequired.length}/{match.availableRequired.length + match.missingRequired.length} 项必选配料{match.missingRequired.length ? ` · 缺少 ${match.missingRequired.map((item) => item.ingredientName).join('、')}` : ''}</Text>
      </View>
      <AppIcon name='arrow' className='recommend-arrow' />
    </View>
  )

  return (
    <View className='page-shell home-page'>
      <View className='tab-stage' style={{ display: activeTab === 'home' ? 'block' : 'none' }}>
      <View className='side-rail'>
        {MODULES.map((item) => (
          <View key={item.key} className={`rail-item ${activeModule === item.key ? 'active' : ''}`} onClick={() => switchModule(item.key)}>
            <Text className='rail-icon'>{item.icon}</Text>
            <Text className='rail-label'>{item.label}</Text>
          </View>
        ))}
      </View>

      <View className='home-main'>
        {activeModule === 'recommend' && (
          <View className='module-pane content-wrap'>
            <View className='home-head'>
              <View>
                <Text className='hello-title'>你好，{profile.nickname || '厨房主人'}</Text>
                <Text className='date-line'>{getChineseDate()}</Text>
              </View>
              <View className='head-side'>
                {!remoteMode && <View className='offline-chip'><Text>本地演示</Text></View>}
                {!isLocalOnly() && (
                  <View className='family-chip' onClick={openFamily}>
                    <Text className='family-avatar'>🏡</Text><Text>{profile.householdName || '我的家'}</Text>
                  </View>
                )}
              </View>
            </View>
            <View className='hero-card'>
              <View className='hero-copy'>
                <Text className='hero-title'>今天吃什么，
                  <Text className='hero-title-accent'>交给好食材。</Text>
                </Text>
                <View className='hero-cta' onClick={() => switchModule('today')}>
                  <Text>看看今日推荐</Text><AppIcon name='arrow' size='sm' />
                </View>
              </View>
              <View className='hero-illustration'>
                <View className='hero-orbit orbit-one' /><View className='hero-orbit orbit-two' />
                <View className='hero-plate'><Text>🥗</Text></View>
                <Text className='float-ingredient float-tomato'>🍅</Text>
                <Text className='float-ingredient float-leaf'>🌿</Text>
                <Text className='float-ingredient float-pepper'>🫑</Text>
              </View>
              <View className='hero-bottom'><View className='hero-dot' /><Text>已找到 {readyCount} 道库存可直接开做的菜</Text></View>
            </View>
            <View className='featured-block'>
              <View className='featured-heading'>
                <Text className='section-title'>最合适的一餐</Text>
              </View>
              {featuredMatch
                ? renderMatchCard(featuredMatch, 0)
                : <View className='empty-card'><Text>当前库存还凑不齐一道菜</Text></View>}
            </View>
          </View>
        )}

        {activeModule === 'inventory' && (
          <View className='module-pane'>
            <View className='section-heading content-wrap'>
              <Text className='section-title'>食材库存</Text>
              <View className='heading-actions'>
                <View className={`refresh-link ${refreshing ? 'refreshing' : ''}`} onClick={handleRefresh}>
                  <Text>{refreshing ? '刷新中…' : '刷新'}</Text>
                </View>
                <View className='add-link' onClick={() => openIngredientModal()}><AppIcon name='add' size='sm' /><Text>添加食材</Text></View>
              </View>
            </View>
            <ScrollView className='category-scroll' scrollX showScrollbar={false}>
              <View className='category-row'>
                {CATEGORIES.map((category) => <View key={category} className={`category-pill ${filter === category ? 'selected' : ''}`} onClick={() => setFilter(category)}><Text>{category}</Text></View>)}
              </View>
            </ScrollView>
            <View className='inventory-grid content-wrap'>
              {visibleInventory.length ? visibleInventory.map((item) => (
                <View className='ingredient-card' key={item.id} onClick={() => openIngredientModal(item)}>
                  <View className='ingredient-emoji-wrap'><Text className='ingredient-emoji'>{CATEGORY_EMOJI[item.category] || '🥬'}</Text></View>
                  <Text className='ingredient-name'>{item.name}</Text>
                  <Text className='ingredient-category'>{item.category}</Text>
                  <View className='ingredient-remove' onClick={(event) => { event.stopPropagation(); handleDeleteIngredient(item.id) }}><AppIcon name='close' size='sm' /></View>
                </View>
              )) : <View className='empty-card'><Text>这个分类还没有食材</Text></View>}
            </View>
          </View>
        )}

        {activeModule === 'recipes' && (
          <View className='module-pane'>
            <View className='section-heading content-wrap'>
              <Text className='section-title'>菜品食谱</Text>
            </View>
            <View className='recipe-list content-wrap'>
              {!recipes.length && <View className='empty-card'><Text>暂时还没有菜谱</Text></View>}
              {recipes.map((recipe, index) => (
                <View key={recipe.id} className={`recipe-card recipe-theme-${recipe.theme}`} onClick={() => openRecipe(recipe)}>
                  <View className='recipe-art'><View className='recipe-art-orbit' /><Text className='recipe-art-emoji'>{recipe.emoji}</Text></View>
                  <View className='recipe-card-copy'>
                    <View className='recipe-card-meta'><Text className='recipe-index'>{String(index + 1).padStart(2, '0')}</Text><Text className='recipe-difficulty'>{difficultyName(recipe.difficulty)}级</Text></View>
                    <Text className='recipe-card-title'>{recipe.name}</Text>
                    <View className='recipe-card-foot'>
                      <Text className='recipe-card-time'><AppIcon name='clock' size='sm' /> {recipe.prepMinutes + recipe.cookMinutes} 分钟</Text>
                      <Text className='recipe-card-count'>{recipe.ingredients.length} 项配料</Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {activeModule === 'today' && (
          <View className='module-pane content-wrap'>
            <View className='section-heading'>
              <View className='today-title-line'><Text className='section-title'>今日宜吃</Text><View className='today-star'>✦</View></View>
            </View>
            {matches.length ? matches.map((match, index) => renderMatchCard(match, index)) : <View className='empty-card'><Text>还没有可推荐的菜谱</Text></View>}
          </View>
        )}
      </View>
      </View>

      <View className='tab-stage' style={{ display: activeTab === 'profile' ? 'block' : 'none' }}>
        <ProfilePanel
          profile={profile}
          guest={guest}
          meals={history}
          onProfileChange={handleProfileChange}
          onLogout={handleLogout}
          onLogin={handleLogin}
          onHouseholdChanged={() => { void syncFromServer() }}
          familyOpen={familyOpen}
          onFamilyOpenChange={setFamilyOpen}
          localOnly={isLocalOnly()}
        />
      </View>

      <BottomNav active={activeTab} onChange={switchTab} />

      <Modal open={modal === 'ingredient'} title={editingIngredient ? '编辑库存' : '添加食材'} onClose={() => { setModal(null); setEditingIngredient(null) }}>
        <View className='form-group'><Text className='field-label'>食材名称</Text><Input className='form-field' placeholder='例如：胡萝卜' maxlength={12} value={ingredientName} onInput={(e) => setIngredientName(e.detail.value)} /></View>
        <View className='form-group'>
          <Text className='field-label'>食材分类</Text>
          <Picker mode='selector' range={CATEGORY_OPTIONS} onChange={(e) => setIngredientCategory(CATEGORY_OPTIONS[Number(e.detail.value)])}>
            <View className='form-field picker-field'><Text>{ingredientCategory}</Text><View className='picker-caret' /></View>
          </Picker>
        </View>
        <View className='primary-btn modal-submit' onClick={handleAddIngredient}>{editingIngredient ? '保存修改' : '保存到我的库存'}</View>
      </Modal>

      <Modal open={modal === 'detail'} title={activeRecipe?.name || '菜谱详情'} onClose={() => { setModal(null); setActiveRecipe(null); setActiveMatch(null) }}>
        {activeRecipe && <View className='detail-content'>
          <View className={`detail-hero recipe-theme-${activeRecipe.theme}`}><Text>{activeRecipe.emoji}</Text><View className='detail-hero-caption'><Text>{activeRecipe.description}</Text><View className='detail-stats'><Text>◷ {activeRecipe.prepMinutes + activeRecipe.cookMinutes} 分钟</Text><Text>✦ {difficultyName(activeRecipe.difficulty)}级</Text></View></View></View>
          {activeMatch && <View className='detail-match-box'><View className='detail-section-head'><Text className='detail-section-title'>库存匹配情况</Text><View className={`match-tag ${activeMatch.ready ? 'ready' : 'missing'}`}>{activeMatch.ready ? '可以直接开做' : `还差 ${activeMatch.missingRequired.length} 项`}</View></View>
            <Text className='detail-label'>已有必选配料</Text><View className='ingredient-chip-row'>{activeMatch.availableRequired.map((item) => <Text key={item.ingredientName} className='ingredient-chip good'>✓ {item.ingredientName}</Text>)}{!activeMatch.availableRequired.length && <Text className='muted'>暂无</Text>}</View>
            <Text className='detail-label'>缺少必选配料</Text><View className='ingredient-chip-row'>{activeMatch.missingRequired.map((item) => <Text key={item.ingredientName} className='ingredient-chip warn'>{item.ingredientName}</Text>)}</View>
            <Text className='detail-label'>可选配料</Text><View className='ingredient-chip-row'>{activeMatch.availableOptional.map((item) => <Text key={item.ingredientName} className='ingredient-chip good'>{item.ingredientName}</Text>)}{activeMatch.missingOptional.map((item) => <Text key={item.ingredientName} className='ingredient-chip warn'>{item.ingredientName}</Text>)}</View>
          </View>}
          <View className='detail-section'><Text className='detail-section-title'>准备食材</Text>{activeRecipe.ingredients.map((item, index) => <View key={`${item.ingredientName}-${index}`} className='detail-ingredient-line'><Text>{item.ingredientName}</Text><Text className='detail-ingredient-amount'>{item.amount} {item.unit} · {item.kind === 'required' ? '必选' : '可选'}</Text></View>)}</View>
          <View className='detail-section'><Text className='detail-section-title'>制作步骤</Text>{activeRecipe.steps.map((step, index) => <View key={step.id} className='step-line'><View className='step-number'>{index + 1}</View><Text className='step-text'>{step.instruction}</Text></View>)}</View>
          <View className='detail-actions'>
            {activeMatch && <View className='primary-btn detail-cook-btn' onClick={() => markCooked(activeMatch)}>✓ 已制作，记一笔</View>}
          </View>
        </View>}
      </Modal>
    </View>
  )
}
export default HomePage
