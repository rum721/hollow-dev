import * as settingsRepo from '../storage/settingsRepo';

const LAST_GREETING_KEY = 'hollow_last_greeting_date';

/** Check whether today's greeting has already been sent */
export async function shouldSendGreeting(): Promise<boolean> {
  const lastDate = await settingsRepo.getSetting(LAST_GREETING_KEY);
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  return lastDate !== today;
}

/** Mark today's greeting as sent */
export async function markGreetingSent(): Promise<void> {
  const today = new Date().toISOString().slice(0, 10);
  await settingsRepo.setSetting(LAST_GREETING_KEY, today);
}

function getTimeOfDay(): 'morning' | 'afternoon' | 'evening' | 'night' {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 18) return 'afternoon';
  if (hour >= 18 && hour < 23) return 'evening';
  return 'night';
}

/** Generate a greeting message based on time, style and locale (no API call) */
export function generateGreeting(nickname: string, style: string, locale: string): string {
  const timeOfDay = getTimeOfDay();
  const name = nickname || '';

  const zhGreetings: Record<string, Record<string, string[]>> = {
    morning: {
      empathetic: [
        `早安${name ? '，' + name : ''}。新的一天，想聊点什么吗？`,
        `${name ? name + '，' : ''}早上好。昨晚睡得还好吗？`,
        `早安。不管今天有什么安排，记得对自己好一点。`,
      ],
      analytical: [
        `早上好${name ? '，' + name : ''}。新的一天开始了，有什么想法想整理一下吗？`,
        `${name ? name + '，' : ''}早安。今天有什么计划需要梳理的？`,
      ],
      balanced: [
        `早安${name ? '，' + name : ''}。新的一天，我在这里。`,
        `${name ? name + '，' : ''}早上好。今天感觉怎么样？`,
      ],
    },
    afternoon: {
      empathetic: [
        `下午好${name ? '，' + name : ''}。忙了一上午，歇一会儿吧。`,
        `${name ? name + '，' : ''}下午了。今天过得怎么样？`,
      ],
      analytical: [
        `下午好${name ? '，' + name : ''}。上午的事情进展如何？`,
        `${name ? name + '，' : ''}下午了，有什么想复盘的吗？`,
      ],
      balanced: [
        `下午好${name ? '，' + name : ''}。有什么想聊的吗？`,
        `${name ? name + '，' : ''}下午好。我在这里。`,
      ],
    },
    evening: {
      empathetic: [
        `晚上好${name ? '，' + name : ''}。今天辛苦了。`,
        `${name ? name + '，' : ''}一天快结束了，有什么想说的吗？`,
        `晚上好。不管今天怎么样，都已经过去了。`,
      ],
      analytical: [
        `晚上好${name ? '，' + name : ''}。今天有什么收获或者想法？`,
        `${name ? name + '，' : ''}一天结束了，想回顾一下吗？`,
      ],
      balanced: [
        `晚上好${name ? '，' + name : ''}。今天过得怎么样？`,
        `${name ? name + '，' : ''}晚上好。想聊聊吗？`,
      ],
    },
    night: {
      empathetic: [
        `夜深了${name ? '，' + name : ''}。还没睡吗？`,
        `${name ? name + '，' : ''}这么晚了，有什么心事吗？`,
        `深夜了。睡不着的话，我陪你聊聊。`,
      ],
      analytical: [
        `夜深了${name ? '，' + name : ''}。还在忙吗？`,
        `${name ? name + '，' : ''}这么晚了，有什么在想的？`,
      ],
      balanced: [
        `夜深了${name ? '，' + name : ''}。还好吗？`,
        `${name ? name + '，' : ''}深夜了，我在这里。`,
      ],
    },
  };

  const enGreetings: Record<string, Record<string, string[]>> = {
    morning: {
      empathetic: [
        `Good morning${name ? ', ' + name : ''}. How are you feeling today?`,
        `${name ? name + ', ' : ''}Morning. Hope you slept well.`,
      ],
      analytical: [
        `Good morning${name ? ', ' + name : ''}. What's on your mind today?`,
        `${name ? name + ', ' : ''}Morning. Any plans to sort through?`,
      ],
      balanced: [
        `Good morning${name ? ', ' + name : ''}. I'm here whenever you're ready.`,
        `${name ? name + ', ' : ''}Morning. How's the day starting?`,
      ],
    },
    afternoon: {
      empathetic: [
        `Good afternoon${name ? ', ' + name : ''}. How's your day going?`,
        `${name ? name + ', ' : ''}Afternoon. Take a breather if you need one.`,
      ],
      analytical: [
        `Good afternoon${name ? ', ' + name : ''}. How's the day shaping up?`,
      ],
      balanced: [
        `Good afternoon${name ? ', ' + name : ''}. Anything on your mind?`,
      ],
    },
    evening: {
      empathetic: [
        `Good evening${name ? ', ' + name : ''}. You've done well today.`,
        `${name ? name + ', ' : ''}Evening. Want to talk about your day?`,
      ],
      analytical: [
        `Good evening${name ? ', ' + name : ''}. Any reflections from today?`,
      ],
      balanced: [
        `Good evening${name ? ', ' + name : ''}. How was your day?`,
      ],
    },
    night: {
      empathetic: [
        `It's late${name ? ', ' + name : ''}. Can't sleep?`,
        `${name ? name + ', ' : ''}Late night. I'm here if you need to talk.`,
      ],
      analytical: [
        `Late night${name ? ', ' + name : ''}. Still working on something?`,
      ],
      balanced: [
        `It's late${name ? ', ' + name : ''}. Everything okay?`,
      ],
    },
  };

  const greetings = locale.startsWith('zh') ? zhGreetings : enGreetings;
  const timeGreetings = greetings[timeOfDay]?.[style] || greetings[timeOfDay]?.balanced || [''];
  const randomIndex = Math.floor(Math.random() * timeGreetings.length);
  return timeGreetings[randomIndex];
}
