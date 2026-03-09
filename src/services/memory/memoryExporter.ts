import { cacheDirectory, writeAsStringAsync, EncodingType } from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { cleanContent, stripYearFromContent } from '../ai/memoryExtractor';
import type { CoreProfile, EpisodicMemory, SessionSummary } from '../../types/memory';

// Category labels (ordered by display priority)
const PROFILE_CATEGORY_CONFIG: Array<{ key: string; label: string; aliases: string[] }> = [
  { key: 'identity', label: '基本信息', aliases: ['identity'] },
  { key: 'trait', label: '性格特点', aliases: ['trait', 'emotions'] },
  { key: 'relationship', label: '重要的人', aliases: ['relationship', 'people'] },
  { key: 'preference', label: '偏好习惯', aliases: ['preference', 'preferences'] },
];

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

  // Section 1: Core Profiles (ordered by category)
  md += `## 核心画像\n\n`;

  if (profiles.length === 0) {
    md += `*暂无画像数据*\n\n`;
  } else {
    for (const config of PROFILE_CATEGORY_CONFIG) {
      const entries = profiles.filter((p) => config.aliases.includes(p.category));
      if (entries.length === 0) continue;

      md += `### ${config.label}\n\n`;
      // Sort by mentionCount desc (most referenced = most important)
      entries.sort((a, b) => b.mentionCount - a.mentionCount);

      for (const item of entries) {
        // Clean content of any raw metadata leakage and strip year references before export
        const cleaned = stripYearFromContent(cleanContent(item.content));
        // Embed key as HTML comment for lossless re-import
        md += `- **${item.title}** <!-- key:${item.key} -->: ${cleaned}\n`;
      }
      md += `\n`;
    }

    // Catch any profiles with unrecognized categories
    const knownAliases = PROFILE_CATEGORY_CONFIG.flatMap((c) => c.aliases);
    const uncategorized = profiles.filter((p) => !knownAliases.includes(p.category));
    if (uncategorized.length > 0) {
      md += `### 其他\n\n`;
      for (const item of uncategorized) {
        const cleaned = stripYearFromContent(cleanContent(item.content));
        md += `- **${item.title}** <!-- key:${item.key} -->: ${cleaned}\n`;
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
      const episodeContent = stripYearFromContent(ep.content);
      md += `- ${episodeContent} — *${emotionLabel}* ${intensityStars}\n`;
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
