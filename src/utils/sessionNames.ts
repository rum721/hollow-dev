/**
 * Poetic session naming based on time of day.
 * Each time slot has multiple options to add variety.
 */

const MORNING_NAMES = ['晨曦低语', '朝露心事', '晨光絮语'];
const NOON_NAMES = ['正午光斑', '日中小憩', '午间暖意'];
const AFTERNOON_NAMES = ['午后书页', '午后漫想', '午后余温'];
const EVENING_NAMES = ['暮色渐浓', '日落余晖', '暮色低语'];
const NIGHT_NAMES = ['月下独白', '深夜呢喃', '夜色温柔'];

function pickRandom(arr: string[]): string {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function generateSessionTitle(): string {
  const hour = new Date().getHours();

  if (hour >= 5 && hour < 12) return pickRandom(MORNING_NAMES);
  if (hour >= 12 && hour < 14) return pickRandom(NOON_NAMES);
  if (hour >= 14 && hour < 18) return pickRandom(AFTERNOON_NAMES);
  if (hour >= 18 && hour < 22) return pickRandom(EVENING_NAMES);
  return pickRandom(NIGHT_NAMES);
}
