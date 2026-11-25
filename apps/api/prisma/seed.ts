import { config } from 'dotenv'
import { resolve } from 'path'
config({ path: resolve(__dirname, '../../../.env') })
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../src/generated/prisma/client'

const connectionString = process.env.DATABASE_URL
if (!connectionString) throw new Error('DATABASE_URL is required')
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) })

async function main() {
  const user = await prisma.user.upsert({
    where: { openid: 'home-pantry-demo-openid' },
    update: {},
    create: { openid: 'home-pantry-demo-openid', nickname: '演示用户', avatarKey: 'sunflower' },
  })
  let household = await prisma.household.findFirst({ where: { createdBy: user.id } })
  if (!household) {
    household = await prisma.household.create({
      data: { name: '我的家', createdBy: user.id, members: { create: { userId: user.id, role: 'OWNER' } }, notificationSettings: { create: {} } },
    })
  }

  const categoryNames = ['蔬菜', '肉类', '水产', '蛋奶', '主食', '调味品', '其他']
  const categoryMap = new Map<string, string>()
  for (const [index, name] of categoryNames.entries()) {
    const category = await prisma.ingredientCategory.upsert({ where: { name }, update: { sortOrder: index }, create: { name, sortOrder: index } })
    categoryMap.set(name, category.id)
  }

  const ingredientSeeds = [
    { name: '西红柿', category: '蔬菜', unit: '个', emoji: '🍅', quantity: 4 },
    { name: '青椒', category: '蔬菜', unit: '个', emoji: '🫑', quantity: 3 },
    { name: '土豆', category: '蔬菜', unit: 'g', emoji: '🥔', quantity: 500 },
    { name: '猪肉', category: '肉类', unit: 'g', emoji: '🥩', quantity: 350 },
    { name: '鸡蛋', category: '蛋奶', unit: '个', emoji: '🥚', quantity: 6 },
    { name: '嫩豆腐', category: '其他', unit: '包', emoji: '🧈', quantity: 1 },
    { name: '大米', category: '主食', unit: 'kg', emoji: '🍚', quantity: 2 },
    { name: '生抽', category: '调味品', unit: 'ml', emoji: '🫙', quantity: 200 },
    { name: '小葱', category: '蔬菜', unit: '根', emoji: '🌿', quantity: 2 },
    { name: '食用油', category: '调味品', unit: 'ml', emoji: '🫗', quantity: 500 },
    { name: '食盐', category: '调味品', unit: 'g', emoji: '🧂', quantity: 300 },
  ]
  const ingredientIds = new Map<string, string>()
  for (const item of ingredientSeeds) {
    const ingredient = await prisma.ingredient.upsert({
      where: { name: item.name },
      update: { categoryId: categoryMap.get(item.category)!, defaultUnit: item.unit, emoji: item.emoji },
      create: { name: item.name, categoryId: categoryMap.get(item.category)!, defaultUnit: item.unit, emoji: item.emoji },
    })
    ingredientIds.set(item.name, ingredient.id)
    await prisma.inventoryItem.upsert({
      where: { householdId_ingredientId_unit: { householdId: household.id, ingredientId: ingredient.id, unit: item.unit } },
      update: { quantity: item.quantity },
      create: { householdId: household.id, ingredientId: ingredient.id, quantity: item.quantity, unit: item.unit },
    })
  }

  const recipes = [
    { name: '西红柿炒鸡蛋', difficulty: 1, emoji: '🍅', theme: 'tomato', prep: 5, cook: 8, required: [['西红柿', 2, '个'], ['鸡蛋', 3, '个'], ['食用油', 10, 'ml'], ['食盐', 2, 'g']], optional: [['小葱', 1, '根']] },
    { name: '青椒土豆炒肉', difficulty: 2, emoji: '🥔', theme: 'pepper', prep: 12, cook: 12, required: [['青椒', 2, '个'], ['土豆', 250, 'g'], ['猪肉', 150, 'g'], ['生抽', 10, 'ml']], optional: [] },
    { name: '香煎嫩豆腐', difficulty: 1, emoji: '🧈', theme: 'tofu', prep: 5, cook: 10, required: [['嫩豆腐', 1, '包'], ['生抽', 8, 'ml'], ['食用油', 10, 'ml']], optional: [['小葱', 1, '根']] },
  ] as const
  for (const item of recipes) {
    const exists = await prisma.recipe.findFirst({ where: { name: item.name, householdId: household.id } })
    if (exists) continue
    const all = [
      ...item.required.map(([name, amount, unit]) => ({ name, amount, unit, kind: 'REQUIRED' as const })),
      ...item.optional.map(([name, amount, unit]) => ({ name, amount, unit, kind: 'OPTIONAL' as const })),
    ]
    await prisma.recipe.create({
      data: {
        householdId: household.id, name: item.name, difficulty: item.difficulty, emoji: item.emoji, theme: item.theme,
        prepMinutes: item.prep, cookMinutes: item.cook, description: '用家里的食材，做一顿简单又舒服的家常饭。',
        ingredients: { create: all.map((ingredient, index) => ({ ingredientId: ingredientIds.get(ingredient.name)!, kind: ingredient.kind, amount: ingredient.amount, unit: ingredient.unit, sortOrder: index })) },
        steps: { create: [{ stepNumber: 1, instruction: '准备并处理好所有食材。' }, { stepNumber: 2, instruction: '按照食材熟成时间依次下锅，调味后烹饪至熟。' }] },
      },
    })
  }
  console.log(`Seed complete. Demo household: ${household.id}`)
}

main().catch((error) => { console.error(error); process.exitCode = 1 }).finally(async () => prisma.$disconnect())
