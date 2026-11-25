export function getChineseDate() {
  const date = new Date()
  const week = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][date.getDay()]
  return `${date.getMonth() + 1}月${date.getDate()}日 · ${week}`
}

const pad = (value: number) => String(value).padStart(2, '0')

/** 做菜记录时间：MM-DD HH:mm，同一天内只显示时分更紧凑 */
export function formatMealTime(iso: string) {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  const now = new Date()
  const sameDay = date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth() && date.getDate() === now.getDate()
  const time = `${pad(date.getHours())}:${pad(date.getMinutes())}`
  return sameDay ? `今天 ${time}` : `${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${time}`
}
