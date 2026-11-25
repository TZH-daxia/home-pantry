import React, { useMemo, useState } from 'react'
import { View, Text, ScrollView, Input, Picker } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'
import BottomNav from '../../components/BottomNav'
import Modal from '../../components/Modal'
import AppIcon from '../../components/AppIcon'
import { CATEGORIES } from '../../constants/mock-data'
import { Ingredient, IngredientCategory, Recipe, RecipeMatch, Unit } from '../../types'
import { buildRecommendations } from '../../utils/recommendation'
import { getChineseDate } from '../../utils/date'
import { getHistory, getInventory, getProfile, getRecipes, saveHistory, saveInventory, saveRecipes } from '../../utils/storage'
import './index.scss'

const CATEGORY_OPTIONS = ['蔬菜', '肉类', '水产', '蛋奶', '主食', '调味品', '其他']
const UNIT_OPTIONS: Unit[] = ['g', 'kg', '个', '颗', '根', 'ml', 'L', '包']
const DIFFICULTY_OPTIONS = ['入门', '简单', '进阶', '挑战']
const CATEGORY_EMOJI: Record<string, string> = { 蔬菜: '🥬', 肉类: '🥩', 水产: '🐟', 蛋奶: '🥚', 主食: '🍚', 调味品: '🫙', 其他: '🧺' }
const difficultyName = (value: number) => ['入门', '简单', '进阶', '挑战'][value - 1] || '简单'

type ModuleKey = 'recommend' | 'inventory' | 'recipes' | 'today'
const MODULES: { key: ModuleKey; label: string; icon: string }[] = [
  { key: 'recommend', label: '推荐', icon: '✦' },
  { key: 'inventory', label: '食材库存', icon: '🥬' },
  { key: 'recipes', label: '菜品食谱', icon: '🍳' },
  { key: 'today', label: '今日宜吃', icon: '◷' },
]

const HomePage: React.FC = () => {
  const [inventory, setInventory] = useState<Ingredient[]>(getInventory())
  const [recipes, setRecipes] = useState<Recipe[]>(getRecipes())
  const [history, setHistory] = useState(getHistory())
  const [profile, setProfile] = useState(getProfile())
  const [filter, setFilter] = useState<string>('全部')
  const [modal, setModal] = useState<'ingredient' | 'recipe' | 'detail' | null>(null)
  const [activeMatch, setActiveMatch] = useState<RecipeMatch | null>(null)
  const [activeRecipe, setActiveRecipe] = useState<Recipe | null>(null)
  const [activeModule, setActiveModule] = useState<ModuleKey>('recommend')

  const [ingredientName, setIngredientName] = useState('')
  const [ingredientCategory, setIngredientCategory] = useState('蔬菜')
  const [ingredientQuantity, setIngredientQuantity] = useState('1')
  const [ingredientUnit, setIngredientUnit] = useState<Unit>('个')
  const [recipeName, setRecipeName] = useState('')
  const [recipeRequired, setRecipeRequired] = useState('')
  const [recipeOptional, setRecipeOptional] = useState('')
  const [recipeDifficulty, setRecipeDifficulty] = useState(1)
  const [editingIngredient, setEditingIngredient] = useState<Ingredient | null>(null)

  useDidShow(() => {
    setInventory(getInventory())
    setRecipes(getRecipes())
    setHistory(getHistory())
    setProfile(getProfile())
  })

  const matches = useMemo(() => buildRecommendations(recipes, inventory, history), [recipes, inventory, history])
  const visibleInventory = filter === '全部' ? inventory : inventory.filter((item) => item.category === filter)
  const readyCount = matches.filter((item) => item.ready).length

  const refreshInventory = (next: Ingredient[]) => { setInventory(next); saveInventory(next) }
  const refreshRecipes = (next: Recipe[]) => { setRecipes(next); saveRecipes(next) }

  const openIngredientModal = (item?: Ingredient) => {
    if (item) {
      setEditingIngredient(item)
      setIngredientName(item.name)
      setIngredientCategory(item.category)
      setIngredientQuantity(String(item.quantity))
      setIngredientUnit(item.unit)
    } else {
      setEditingIngredient(null)
      setIngredientName('')
      setIngredientCategory('蔬菜')
      setIngredientQuantity('1')
      setIngredientUnit('个')
    }
    setModal('ingredient')
  }

  const handleAddIngredient = () => {
    const name = ingredientName.trim()
    const quantity = Number(ingredientQuantity)
    if (!name || !Number.isFinite(quantity) || quantity <= 0) {
      Taro.showToast({ title: '请填写有效的食材和数量', icon: 'none' })
      return
    }
    const existing = inventory.find((item) => item.name === name && item.unit === ingredientUnit)
    if (editingIngredient) {
      const next = inventory.map((item) => item.id === editingIngredient.id ? { ...item, name, category: ingredientCategory as IngredientCategory, quantity, unit: ingredientUnit, emoji: CATEGORY_EMOJI[ingredientCategory] || item.emoji } : item)
      refreshInventory(next)
    } else {
      const next = existing
        ? inventory.map((item) => item.id === existing.id ? { ...item, quantity: item.quantity + quantity } : item)
        : [...inventory, { id: `i_${Date.now()}`, name, category: ingredientCategory as IngredientCategory, quantity, unit: ingredientUnit, emoji: CATEGORY_EMOJI[ingredientCategory] || '🥬' }]
      refreshInventory(next)
    }
    setIngredientName(''); setIngredientQuantity('1'); setEditingIngredient(null); setModal(null)
    Taro.showToast({ title: editingIngredient ? '库存已更新' : existing ? '库存数量已合并' : '食材已添加', icon: 'success' })
  }

  const handleDeleteIngredient = (id: string) => {
    Taro.showModal({ title: '移除这项食材？', content: '移除后，推荐结果会立即重新计算。', success: (res) => {
      if (res.confirm) refreshInventory(inventory.filter((item) => item.id !== id))
    } })
  }

  const handleAddRecipe = () => {
    const name = recipeName.trim()
    const splitNames = (value: string) => value.split(/[，,、\s]+/).map((item) => item.trim()).filter(Boolean)
    const requiredNames = splitNames(recipeRequired)
    const optionalNames = splitNames(recipeOptional)
    if (!name || !requiredNames.length) {
      Taro.showToast({ title: '至少填写菜名和一项必选配料', icon: 'none' })
      return
    }
    const nextRecipe: Recipe = {
      id: `r_${Date.now()}`, name, description: '一道为家庭库存量身推荐的家常菜。', difficulty: recipeDifficulty as Recipe['difficulty'],
      prepMinutes: 10, cookMinutes: 15, emoji: '🍳', theme: 'custom',
      ingredients: [
        ...requiredNames.map((ingredientName) => { const stock = inventory.find((item) => item.name === ingredientName); const unit = stock?.unit || '个'; const amount = unit === 'g' ? 100 : unit === 'ml' ? 10 : 1; return { ingredientName, kind: 'required' as const, amount, unit } }),
        ...optionalNames.map((ingredientName) => { const stock = inventory.find((item) => item.name === ingredientName); const unit = stock?.unit || '个'; const amount = unit === 'g' ? 100 : unit === 'ml' ? 10 : 1; return { ingredientName, kind: 'optional' as const, amount, unit } }),
      ],
      steps: [{ id: 's1', instruction: '准备好配料，按个人习惯处理食材。' }, { id: 's2', instruction: '根据菜品特点依次下锅，调味并烹饪至熟。' }],
    }
    refreshRecipes([nextRecipe, ...recipes])
    setRecipeName(''); setRecipeRequired(''); setRecipeOptional(''); setRecipeDifficulty(1); setModal(null)
    Taro.showToast({ title: '菜谱已添加', icon: 'success' })
  }

  const handleDeleteRecipe = (recipe: Recipe) => {
    Taro.showModal({ title: '删除这道菜谱？', content: '删除后将不再参与每日推荐。', success: (res) => {
      if (res.confirm) {
        refreshRecipes(recipes.filter((item) => item.id !== recipe.id))
        setActiveRecipe(null); setActiveMatch(null); setModal(null)
      }
    } })
  }

  const markCooked = (match: RecipeMatch) => {
    const next = [{ id: `h_${Date.now()}`, recipeId: match.recipe.id, cookedAt: new Date().toISOString() }, ...history]
    setHistory(next); saveHistory(next); setModal(null)
    Taro.showToast({ title: '已记入今日做菜记录', icon: 'success' })
  }

  const openMatch = (match: RecipeMatch) => { setActiveMatch(match); setActiveRecipe(match.recipe); setModal('detail') }
  const openRecipe = (recipe: Recipe) => { setActiveRecipe(recipe); setActiveMatch(matches.find((item) => item.recipe.id === recipe.id) || null); setModal('detail') }
  const openTab = (tab: 'home' | 'profile') => { if (tab === 'profile') Taro.redirectTo({ url: '/pages/profile/index' }) }

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
      <View className='side-rail'>
        <View className='rail-brand'><Text>🥗</Text></View>
        {MODULES.map((item) => (
          <View key={item.key} className={`rail-item ${activeModule === item.key ? 'active' : ''}`} onClick={() => setActiveModule(item.key)}>
            <Text className='rail-icon'>{item.icon}</Text>
            <Text className='rail-label'>{item.label}</Text>
          </View>
        ))}
      </View>

      <View className='home-main'>
        <View className='home-head content-wrap'>
          <View>
            <Text className='hello-title'>你好，{profile.nickname || '厨房主人'}</Text>
            <Text className='date-line'>{getChineseDate()}</Text>
          </View>
          <View className='family-chip' onClick={() => Taro.showToast({ title: '家庭共享将在二期开放', icon: 'none' })}>
            <Text className='family-avatar'>🏡</Text><Text>我的家</Text>
          </View>
        </View>

        {activeModule === 'recommend' && (
          <View className='module-pane content-wrap'>
            <View className='hero-card'>
              <View className='hero-copy'>
                <Text className='hero-title'>今天吃什么，
                  <Text className='hero-title-accent'>交给好食材。</Text>
                </Text>
                <View className='hero-cta' onClick={() => matches[0] && openMatch(matches[0])}>
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
            {matches[0] && (
              <View className='featured-block'>
                <View className='featured-heading'>
                  <Text className='section-title'>最合适的一餐</Text>
                  <View className='featured-more' onClick={() => setActiveModule('today')}><Text>查看全部</Text><AppIcon name='arrow' size='sm' /></View>
                </View>
                {renderMatchCard(matches[0], 0)}
              </View>
            )}
          </View>
        )}

        {activeModule === 'inventory' && (
          <View className='module-pane'>
            <View className='section-heading content-wrap'>
              <Text className='section-title'>食材库存</Text>
              <View className='add-link' onClick={() => openIngredientModal()}><AppIcon name='add' size='sm' /><Text>添加食材</Text></View>
            </View>
            <ScrollView className='category-scroll' scrollX showScrollbar={false}>
              <View className='category-row'>
                {CATEGORIES.map((category) => <View key={category} className={`category-pill ${filter === category ? 'selected' : ''}`} onClick={() => setFilter(category)}><Text>{category}</Text></View>)}
              </View>
            </ScrollView>
            <View className='inventory-grid content-wrap'>
              {visibleInventory.length ? visibleInventory.map((item) => (
                <View className='ingredient-card' key={item.id} onClick={() => openIngredientModal(item)}>
                  <View className='ingredient-emoji-wrap'><Text className='ingredient-emoji'>{item.emoji}</Text></View>
                  <View className='ingredient-info'><Text className='ingredient-name'>{item.name}</Text><Text className='ingredient-meta'>{item.category}</Text><Text className='ingredient-quantity'>{item.quantity}<Text className='ingredient-unit'> {item.unit}</Text></Text></View>
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
              <View className='add-link' onClick={() => setModal('recipe')}><AppIcon name='add' size='sm' /><Text>新增菜谱</Text></View>
            </View>
            <ScrollView className='recipe-scroll' scrollX showScrollbar={false}>
              <View className='recipe-row'>
                {recipes.map((recipe, index) => (
                  <View key={recipe.id} className={`recipe-card recipe-theme-${recipe.theme}`} onClick={() => openRecipe(recipe)}>
                    <View className='recipe-art'><View className='recipe-art-orbit' /><Text className='recipe-art-emoji'>{recipe.emoji}</Text><Text className='recipe-art-spark'>✦</Text></View>
                    <View className='recipe-card-copy'><View className='recipe-card-meta'><Text>{`0${index + 1}`}</Text><Text className='recipe-difficulty'>{difficultyName(recipe.difficulty)}级</Text></View><Text className='recipe-card-title'>{recipe.name}</Text><Text className='recipe-card-time'><AppIcon name='clock' size='sm' /> {recipe.prepMinutes + recipe.cookMinutes} 分钟</Text></View>
                  </View>
                ))}
                <View className='recipe-add-card' onClick={() => setModal('recipe')}><View className='recipe-add-icon'><AppIcon name='add' size='lg' /></View><Text>添加一道</Text></View>
              </View>
            </ScrollView>
          </View>
        )}

        {activeModule === 'today' && (
          <View className='module-pane content-wrap'>
            <View className='section-heading'>
              <View className='today-title-line'><Text className='section-title'>今日宜吃</Text><View className='today-star'>✦</View></View>
            </View>
            {matches.slice(0, 8).map((match, index) => renderMatchCard(match, index))}
          </View>
        )}
      </View>

      <BottomNav active='home' onChange={openTab} />

      <Modal open={modal === 'ingredient'} title={editingIngredient ? '编辑库存' : '添加食材'} onClose={() => { setModal(null); setEditingIngredient(null) }}>
        <View className='form-group'><Text className='field-label'>食材名称</Text><Input className='form-field' placeholder='例如：胡萝卜' value={ingredientName} onInput={(e) => setIngredientName(e.detail.value)} /></View>
        <View className='form-row'>
          <View className='form-group form-half'><Text className='field-label'>食材分类</Text><Picker mode='selector' range={CATEGORY_OPTIONS} onChange={(e) => setIngredientCategory(CATEGORY_OPTIONS[Number(e.detail.value)])}><View className='form-field picker-field'>{ingredientCategory}<AppIcon name='chevron' size='sm' /></View></Picker></View>
          <View className='form-group form-half'><Text className='field-label'>数量单位</Text><Picker mode='selector' range={UNIT_OPTIONS} onChange={(e) => setIngredientUnit(UNIT_OPTIONS[Number(e.detail.value)])}><View className='form-field picker-field'>{ingredientUnit}<AppIcon name='chevron' size='sm' /></View></Picker></View>
        </View>
        <View className='form-group'><Text className='field-label'>库存数量</Text><Input className='form-field' type='digit' value={ingredientQuantity} onInput={(e) => setIngredientQuantity(e.detail.value)} placeholder='输入数量' /></View>
        <View className='primary-btn modal-submit' onClick={handleAddIngredient}>{editingIngredient ? '保存修改' : '保存到我的库存'}</View>
      </Modal>

      <Modal open={modal === 'recipe'} title='新增菜谱' onClose={() => setModal(null)}>
        <View className='form-group'><Text className='field-label'>菜品名称</Text><Input className='form-field' placeholder='例如：蒜蓉西兰花' value={recipeName} onInput={(e) => setRecipeName(e.detail.value)} /></View>
        <View className='form-group'><Text className='field-label'>必选配料</Text><Input className='form-field' placeholder='用逗号分隔，例如：西兰花、大蒜' value={recipeRequired} onInput={(e) => setRecipeRequired(e.detail.value)} /></View>
        <View className='form-group'><Text className='field-label'>可选配料</Text><Input className='form-field' placeholder='没有可留空，例如：蚝油、芝麻' value={recipeOptional} onInput={(e) => setRecipeOptional(e.detail.value)} /></View>
        <View className='form-group'><Text className='field-label'>制作难度</Text><View className='difficulty-select'>{DIFFICULTY_OPTIONS.map((name, index) => <View key={name} className={`difficulty-option ${recipeDifficulty === index + 1 ? 'chosen' : ''}`} onClick={() => setRecipeDifficulty(index + 1)}><Text>{name}</Text></View>)}</View></View>
        <View className='primary-btn modal-submit' onClick={handleAddRecipe}>保存菜谱</View>
      </Modal>

      <Modal open={modal === 'detail'} title={activeRecipe?.name || '菜谱详情'} onClose={() => { setModal(null); setActiveRecipe(null); setActiveMatch(null) }}>
        {activeRecipe && <View className='detail-content'>
          <View className={`detail-hero recipe-theme-${activeRecipe.theme}`}><Text>{activeRecipe.emoji}</Text><View className='detail-hero-caption'><Text>{activeRecipe.description}</Text><View className='detail-stats'><Text>◷ {activeRecipe.prepMinutes + activeRecipe.cookMinutes} 分钟</Text><Text>✦ {difficultyName(activeRecipe.difficulty)}级</Text></View></View></View>
          {activeMatch && <View className='detail-match-box'><View className='detail-match-heading'><Text>库存匹配情况</Text><View className={`match-tag ${activeMatch.ready ? 'ready' : 'missing'}`}>{activeMatch.ready ? '可以直接开做' : `还差 ${activeMatch.missingRequired.length} 项`}</View></View>
            <Text className='detail-label'>已有必选配料</Text><View className='ingredient-chip-row'>{activeMatch.availableRequired.map((item) => <Text key={item.ingredientName} className='ingredient-chip good'>✓ {item.ingredientName}</Text>)}{!activeMatch.availableRequired.length && <Text className='muted'>暂无</Text>}</View>
            <Text className='detail-label'>缺少必选配料</Text><View className='ingredient-chip-row'>{activeMatch.missingRequired.map((item) => <Text key={item.ingredientName} className='ingredient-chip warn'>＋ {item.ingredientName}</Text>)}{!activeMatch.missingRequired.length && <Text className='muted'>全部齐全</Text>}</View>
            <Text className='detail-label'>可选配料</Text><View className='ingredient-chip-row'>{activeMatch.availableOptional.map((item) => <Text key={item.ingredientName} className='ingredient-chip good'>{item.ingredientName}</Text>)}{activeMatch.missingOptional.map((item) => <Text key={item.ingredientName} className='ingredient-chip neutral'>{item.ingredientName}（可选）</Text>)}</View>
          </View>}
          <View className='detail-section'><Text className='detail-section-title'>准备食材</Text>{activeRecipe.ingredients.map((item, index) => <View key={`${item.ingredientName}-${index}`} className='detail-ingredient-line'><Text>{item.ingredientName}</Text><Text className='detail-ingredient-amount'>{item.amount} {item.unit} · {item.kind === 'required' ? '必选' : '可选'}</Text></View>)}</View>
          <View className='detail-section'><Text className='detail-section-title'>制作步骤</Text>{activeRecipe.steps.map((step, index) => <View key={step.id} className='step-line'><View className='step-number'>{index + 1}</View><Text className='step-text'>{step.instruction}</Text></View>)}</View>
          <View className='detail-actions'>
            {activeMatch && <View className='primary-btn detail-cook-btn' onClick={() => markCooked(activeMatch)}>✓ 已制作，记一笔</View>}
            <View className='detail-delete' onClick={() => handleDeleteRecipe(activeRecipe)}><AppIcon name='trash' size='sm' /><Text>删除菜谱</Text></View>
          </View>
        </View>}
      </Modal>
    </View>
  )
}
export default HomePage
