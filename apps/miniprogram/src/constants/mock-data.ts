import { Ingredient, Recipe, UserProfile, MealRecord } from '../types'

export const CATEGORIES = ['全部', '蔬菜', '肉类', '水产', '蛋奶', '主食', '调味品', '其他'] as const

export const INITIAL_INVENTORY: Ingredient[] = [
  { id: 'i1', name: '西红柿', category: '蔬菜', quantity: 4, unit: '个', emoji: '🍅' },
  { id: 'i2', name: '青椒', category: '蔬菜', quantity: 3, unit: '个', emoji: '🫑' },
  { id: 'i3', name: '土豆', category: '蔬菜', quantity: 500, unit: 'g', emoji: '🥔' },
  { id: 'i4', name: '猪肉', category: '肉类', quantity: 350, unit: 'g', emoji: '🥩' },
  { id: 'i5', name: '鸡蛋', category: '蛋奶', quantity: 6, unit: '个', emoji: '🥚' },
  { id: 'i6', name: '嫩豆腐', category: '其他', quantity: 1, unit: '包', emoji: '🧈' },
  { id: 'i7', name: '大米', category: '主食', quantity: 2, unit: 'kg', emoji: '🍚' },
  { id: 'i8', name: '生抽', category: '调味品', quantity: 200, unit: 'ml', emoji: '🫙' },
  { id: 'i9', name: '小葱', category: '蔬菜', quantity: 2, unit: '根', emoji: '🌿' },
  { id: 'i10', name: '食用油', category: '调味品', quantity: 500, unit: 'ml', emoji: '🫗' },
  { id: 'i11', name: '食盐', category: '调味品', quantity: 300, unit: 'g', emoji: '🧂' },
]

export const INITIAL_RECIPES: Recipe[] = [
  {
    id: 'r1', name: '西红柿炒鸡蛋', description: '酸甜柔软的家常搭配，十分钟就能上桌。', difficulty: 1, prepMinutes: 5, cookMinutes: 8,
    emoji: '🍅', theme: 'tomato',
    ingredients: [
      { ingredientName: '西红柿', kind: 'required', amount: 2, unit: '个' },
      { ingredientName: '鸡蛋', kind: 'required', amount: 3, unit: '个' },
      { ingredientName: '食用油', kind: 'required', amount: 10, unit: 'ml' },
      { ingredientName: '食盐', kind: 'required', amount: 2, unit: 'g' },
      { ingredientName: '小葱', kind: 'optional', amount: 1, unit: '根' },
    ],
    steps: [
      { id: 's1', instruction: '西红柿洗净切块，鸡蛋加少许盐打散。' },
      { id: 's2', instruction: '热锅放油，倒入蛋液炒至凝固，盛出备用。' },
      { id: 's3', instruction: '锅中补少许油，放入西红柿炒出汁水。' },
      { id: 's4', instruction: '倒回鸡蛋翻炒均匀，调味后撒葱花即可。' },
    ],
  },
  {
    id: 'r2', name: '青椒土豆炒肉', description: '脆嫩青椒搭配绵软土豆，咸香下饭。', difficulty: 2, prepMinutes: 12, cookMinutes: 12,
    emoji: '🥔', theme: 'pepper',
    ingredients: [
      { ingredientName: '青椒', kind: 'required', amount: 2, unit: '个' },
      { ingredientName: '土豆', kind: 'required', amount: 250, unit: 'g' },
      { ingredientName: '猪肉', kind: 'required', amount: 150, unit: 'g' },
      { ingredientName: '生抽', kind: 'required', amount: 10, unit: 'ml' },
      { ingredientName: '大蒜', kind: 'optional', amount: 2, unit: '颗' },
    ],
    steps: [
      { id: 's1', instruction: '土豆切薄片，青椒切块，猪肉切片。' },
      { id: 's2', instruction: '热锅炒香肉片，变色后加入生抽。' },
      { id: 's3', instruction: '放入土豆片翻炒至边缘透明，必要时淋少量水。' },
      { id: 's4', instruction: '加入青椒炒熟，按口味调味即可。' },
    ],
  },
  {
    id: 'r3', name: '家常红烧肉', description: '慢火焖出软糯口感，适合周末认真做一顿。', difficulty: 3, prepMinutes: 15, cookMinutes: 45,
    emoji: '🍖', theme: 'braise',
    ingredients: [
      { ingredientName: '猪肉', kind: 'required', amount: 500, unit: 'g' },
      { ingredientName: '生抽', kind: 'required', amount: 25, unit: 'ml' },
      { ingredientName: '冰糖', kind: 'required', amount: 20, unit: 'g' },
      { ingredientName: '生姜', kind: 'required', amount: 20, unit: 'g' },
      { ingredientName: '八角', kind: 'optional', amount: 2, unit: '颗' },
    ],
    steps: [
      { id: 's1', instruction: '猪肉切成块，冷水下锅焯水后洗净。' },
      { id: 's2', instruction: '小火炒化冰糖，放入肉块翻炒上色。' },
      { id: 's3', instruction: '加入生抽、生姜和热水，小火焖煮约 40 分钟。' },
      { id: 's4', instruction: '大火收汁，汤汁浓稠即可出锅。' },
    ],
  },
  {
    id: 'r4', name: '香煎嫩豆腐', description: '外层微焦、内里嫩滑，简单又满足。', difficulty: 1, prepMinutes: 5, cookMinutes: 10,
    emoji: '🧈', theme: 'tofu',
    ingredients: [
      { ingredientName: '嫩豆腐', kind: 'required', amount: 1, unit: '包' },
      { ingredientName: '生抽', kind: 'required', amount: 8, unit: 'ml' },
      { ingredientName: '食用油', kind: 'required', amount: 10, unit: 'ml' },
      { ingredientName: '小葱', kind: 'optional', amount: 1, unit: '根' },
    ],
    steps: [
      { id: 's1', instruction: '豆腐切成厚片，用厨房纸轻轻吸去表面水分。' },
      { id: 's2', instruction: '平底锅加油，中小火将豆腐两面煎至金黄。' },
      { id: 's3', instruction: '淋入生抽和少量清水，轻轻晃锅裹匀。' },
      { id: 's4', instruction: '撒上葱花，趁热享用。' },
    ],
  },
  {
    id: 'r5', name: '青椒肉丝', description: '经典下饭菜，咸香爽脆，做法不复杂。', difficulty: 2, prepMinutes: 10, cookMinutes: 10,
    emoji: '🫑', theme: 'green',
    ingredients: [
      { ingredientName: '青椒', kind: 'required', amount: 2, unit: '个' },
      { ingredientName: '猪肉', kind: 'required', amount: 180, unit: 'g' },
      { ingredientName: '生抽', kind: 'required', amount: 10, unit: 'ml' },
      { ingredientName: '淀粉', kind: 'optional', amount: 5, unit: 'g' },
    ],
    steps: [
      { id: 's1', instruction: '青椒切丝，猪肉切丝备用。' },
      { id: 's2', instruction: '肉丝下锅滑炒至变色，盛出。' },
      { id: 's3', instruction: '青椒大火翻炒至断生，倒入肉丝。' },
      { id: 's4', instruction: '加入生抽快速翻匀即可。' },
    ],
  },
]

export const INITIAL_PROFILE: UserProfile = {
  nickname: '小厨房主人', avatar: '🌻', autoRecommend: true, notifyMode: 'auto', recommendTime: '08:00', householdRole: 'owner',
}

export const INITIAL_HISTORY: MealRecord[] = [
  { id: 'h1', recipeId: 'r3', cookedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() },
  { id: 'h2', recipeId: 'r2', cookedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString() },
]

export const AVATARS = ['🌻', '🐼', '🐱', '🐻', '🐰', '🦊', '🐸', '🐣']
