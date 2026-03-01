import { cacheDirectory, writeAsStringAsync, EncodingType } from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import type { CoreProfile, EpisodicMemory, SessionSummary } from '../../types/memory';

// Category labels (bilingual)
const PROFILE_CATEGORY_LABELS: Record<string, string> = {
  identity: '身份信息',
  relationship: '人际关系',
  preference: '偏好习惯',
  trait: '性格特征',
};

const EMOTION_LABELS: Record<string, string> = {
  happy: '开心',
  sad: '难过',
  anxious: '焦虑',
  angry: '生气',
  excited: '兴奋',
  calm: '平静',
  frustrated: '沮丧',
  hopeful: '期待',
  neutral: '平静',
};

export function formatMemoryAsMarkdown(
  profiles: CoreProfile[],
  episodes: EpisodicMemory[],
  summaries: SessionSummary[],
  nickname: string,
): string {
  const now = new Date().toISOString().split('T')[0];
  let md = `# ${nickname} 的记忆档案\n\n`;
  md += `> 由 Hollow 导出于 ${now}\n`;
  md += `> 此文件可以重新导入 Hollow，也可以作为个人备份保留\n\n`;
  md += `---\n\n`;

  // Section 1: Core Profiles
  md += `## 核心画像\n\n`;

  const grouped: Record<string, CoreProfile[]> = {};
  for (const p of profiles) {
    const cat = p.category || 'identity';
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(p);
  }

  if (Object.keys(grouped).length === 0) {
    md += `*暂无画像数据*\n\n`;
  } else {
    for (const [category, items] of Object.entries(grouped)) {
      const label = PROFILE_CATEGORY_LABELS[category] || category;
      md += `### ${label}\n\n`;
      for (const item of items) {
        md += `- **${item.title}**: ${item.content}\n`;
      }
      md += `\n`;
    }
  }

  // Section 2: Episodic Memories
  if (episodes.length > 0) {
    md += `## 情境记忆\n\n`;
    md += `> 这些是 Hollow 从对话中自动提取的具体事件和情绪体验\n\n`;

    const sorted = [...episodes].sort(
      (a, b) => new Date(b.eventDate || b.createdAt).getTime() - new Date(a.eventDate || a.createdAt).getTime(),
    );

    let lastDate = '';
    for (const ep of sorted) {
      const date = (ep.eventDate || ep.createdAt)?.split('T')[0] || '未知日期';
      if (date !== lastDate) {
        md += `### ${date}\n\n`;
        lastDate = date;
      }
      const emotionLabel = EMOTION_LABELS[ep.emotion] || ep.emotion;
      const intensityStars = '●'.repeat(Math.min(5, ep.intensity)) + '○'.repeat(Math.max(0, 5 - ep.intensity));
      md += `- ${ep.content} — *${emotionLabel}* ${intensityStars}\n`;
    }
    md += `\n`;
  }

  // Section 3: Session Summaries
  if (summaries.length > 0) {
    md += `## 对话摘要\n\n`;
    md += `> 每次对话结束后的自动总结\n\n`;

    for (const s of summaries) {
      const date = s.createdAt?.split('T')[0] || '未知日期';
      const topics = s.keyTopics?.length > 0 ? s.keyTopics.join('、') : '';
      md += `### ${date}\n\n`;
      md += `${s.summary}\n`;
      if (topics) {
        md += `\n*话题: ${topics}*\n`;
      }
      md += `\n`;
    }
  }

  // Footer
  md += `---\n\n`;
  md += `## 导入说明\n\n`;
  md += `此文件可以通过 Hollow 的"导入记忆"功能重新导入。\n`;
  md += `导入时，Hollow 会智能解析文件内容并更新记忆库。\n`;
  md += `你可以在导入前自由编辑此文件的内容。\n`;

  return md;
}

export async function exportMemoryToFile(
  profiles: CoreProfile[],
  episodes: EpisodicMemory[],
  summaries: SessionSummary[],
  nickname: string,
): Promise<void> {
  const markdown = formatMemoryAsMarkdown(profiles, episodes, summaries, nickname);
  const date = new Date().toISOString().split('T')[0];
  const filename = `hollow_memory_${date}.md`;
  const filePath = `${cacheDirectory}${filename}`;

  await writeAsStringAsync(filePath, markdown, {
    encoding: EncodingType.UTF8,
  });

  const canShare = await Sharing.isAvailableAsync();
  if (canShare) {
    await Sharing.shareAsync(filePath, {
      mimeType: 'text/markdown',
      dialogTitle: '导出记忆档案',
      UTI: 'net.daringfireball.markdown',
    });
  }
}
