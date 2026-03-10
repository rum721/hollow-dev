import React from 'react';
import { View, StyleSheet, Text, TouchableOpacity } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { colors, spacing, borderRadius } from '../../theme';

interface Props {
  content: string;
  createdAt?: string;
  isStreaming?: boolean;
  onCopy?: () => void;
}

function renderMarkdown(text: string): React.ReactNode[] {
  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];

  lines.forEach((line, lineIdx) => {
    // Blockquote
    if (line.startsWith('> ')) {
      elements.push(
        <View key={`bq-${lineIdx}`} style={mdStyles.blockquote}>
          <Text style={mdStyles.blockquoteText}>{renderInline(line.slice(2))}</Text>
        </View>
      );
      return;
    }

    // Headers
    if (line.startsWith('### ')) {
      elements.push(
        <Text key={`h3-${lineIdx}`} style={mdStyles.h3}>{renderInline(line.slice(4))}</Text>
      );
      return;
    }
    if (line.startsWith('## ')) {
      elements.push(
        <Text key={`h2-${lineIdx}`} style={mdStyles.h2}>{renderInline(line.slice(3))}</Text>
      );
      return;
    }

    // Bullet points
    if (line.match(/^[-*]\s/)) {
      elements.push(
        <Text key={`li-${lineIdx}`} style={mdStyles.listItem}>
          {'  \u2022 '}{renderInline(line.slice(2))}
        </Text>
      );
      return;
    }

    // Numbered list
    const numMatch = line.match(/^(\d+)\.\s/);
    if (numMatch) {
      elements.push(
        <Text key={`ol-${lineIdx}`} style={mdStyles.listItem}>
          {'  '}{numMatch[1]}.{' '}{renderInline(line.slice(numMatch[0].length))}
        </Text>
      );
      return;
    }

    // Empty line = paragraph break
    if (line.trim() === '') {
      elements.push(<View key={`br-${lineIdx}`} style={mdStyles.paragraphBreak} />);
      return;
    }

    // Normal paragraph
    elements.push(
      <Text key={`p-${lineIdx}`} style={mdStyles.paragraph}>{renderInline(line)}</Text>
    );
  });

  return elements;
}

function renderInline(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  // Pattern: **bold**, *italic*, `code`
  const regex = /(\*\*(.+?)\*\*|\*(.+?)\*|`(.+?)`)/g;
  let lastIndex = 0;
  let match;
  let key = 0;

  while ((match = regex.exec(text)) !== null) {
    // Text before match
    if (match.index > lastIndex) {
      parts.push(<Text key={`t-${key++}`}>{text.slice(lastIndex, match.index)}</Text>);
    }

    if (match[2]) {
      // Bold **text**
      parts.push(<Text key={`b-${key++}`} style={mdStyles.bold}>{match[2]}</Text>);
    } else if (match[3]) {
      // Italic *text*
      parts.push(<Text key={`i-${key++}`} style={mdStyles.italic}>{match[3]}</Text>);
    } else if (match[4]) {
      // Code `text`
      parts.push(<Text key={`c-${key++}`} style={mdStyles.codeInline}>{match[4]}</Text>);
    }

    lastIndex = match.index + match[0].length;
  }

  // Remaining text
  if (lastIndex < text.length) {
    parts.push(<Text key={`t-${key++}`}>{text.slice(lastIndex)}</Text>);
  }

  return parts.length > 0 ? parts : [<Text key="plain">{text}</Text>];
}

export function AIMessage({ content, isStreaming, onCopy }: Props) {
  const handleLongPress = async () => {
    await Clipboard.setStringAsync(content);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onCopy?.();
  };

  return (
    <Animated.View entering={FadeInDown.duration(200)}>
      <TouchableOpacity
        onLongPress={isStreaming ? undefined : handleLongPress}
        activeOpacity={isStreaming ? 1 : 0.7}
        style={styles.container}
      >
        <View style={styles.bubble} pointerEvents="none">
          <View>
            {renderMarkdown(content)}
            {isStreaming ? <Text style={mdStyles.cursor}>|</Text> : null}
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const mdStyles = StyleSheet.create({
  paragraph: { color: colors.textPrimary, fontSize: 16, lineHeight: 26 },
  bold: { color: colors.textPrimary, fontWeight: '600' },
  italic: { color: colors.textPrimary, fontStyle: 'italic' },
  codeInline: {
    backgroundColor: colors.surfaceLight,
    color: colors.amberLight,
    paddingHorizontal: 4,
    borderRadius: 3,
    fontSize: 14,
    fontFamily: 'monospace',
  },
  blockquote: {
    borderLeftWidth: 2,
    borderLeftColor: colors.amber,
    paddingLeft: 12,
    marginVertical: 4,
  },
  blockquoteText: { color: colors.textSecondary, fontSize: 16, lineHeight: 24 },
  h2: { color: colors.textPrimary, fontSize: 18, fontWeight: '600', marginVertical: 6, lineHeight: 26 },
  h3: { color: colors.textPrimary, fontSize: 17, fontWeight: '600', marginVertical: 4, lineHeight: 24 },
  listItem: { color: colors.textPrimary, fontSize: 16, lineHeight: 26, paddingLeft: 8 },
  paragraphBreak: { height: 8 },
  cursor: { color: colors.amber, fontSize: 16 },
});

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.xl,
  },
  bubble: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderTopLeftRadius: borderRadius.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    maxWidth: '90%',
  },
});
