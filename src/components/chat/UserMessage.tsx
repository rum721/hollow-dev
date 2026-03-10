import React from 'react';
import { View, StyleSheet, Text, TouchableOpacity } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { colors, spacing, borderRadius } from '../../theme';
import { EncryptedImage } from './EncryptedImage';
import type { ImageAttachment } from '../../types/chat';

interface Props {
  content: string;
  createdAt: string;
  onCopy?: () => void;
  imageAttachments?: ImageAttachment[];
  onImagePress?: (image: ImageAttachment) => void;
}

export function UserMessage({ content, onCopy, imageAttachments, onImagePress }: Props) {
  const handleLongPress = async () => {
    await Clipboard.setStringAsync(content);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onCopy?.();
  };

  const hasImages = imageAttachments && imageAttachments.length > 0;
  const hasText = content.trim().length > 0;

  return (
    <Animated.View entering={FadeInDown.duration(200)}>
    <TouchableOpacity onLongPress={handleLongPress} activeOpacity={0.8} style={styles.container}>
      <View style={styles.bubble}>
        {hasImages && imageAttachments.map((img, idx) => {
          // Maintain aspect ratio, max width 200, max height 300
          const ratio = img.width / img.height;
          let displayWidth = Math.min(200, img.width);
          let displayHeight = displayWidth / ratio;
          if (displayHeight > 300) {
            displayHeight = 300;
            displayWidth = displayHeight * ratio;
          }

          return (
            <TouchableOpacity
              key={`img-${idx}`}
              onPress={() => onImagePress?.(img)}
              activeOpacity={0.85}
              style={hasText ? styles.imageWithText : undefined}
            >
              <EncryptedImage
                uri={img.uri}
                mimeType={img.mimeType}
                width={displayWidth}
                height={displayHeight}
                borderRadius={borderRadius.md}
                resizeMode="cover"
              />
            </TouchableOpacity>
          );
        })}
        {hasText && <Text style={styles.text}>{content}</Text>}
      </View>
    </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'flex-end',
    paddingHorizontal: spacing.xl,
  },
  bubble: {
    backgroundColor: 'rgba(212, 165, 116, 0.18)',
    borderRadius: borderRadius.lg,
    borderTopRightRadius: borderRadius.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    maxWidth: '85%',
  },
  imageWithText: {
    marginBottom: spacing.sm,
  },
  text: {
    color: colors.textPrimary,
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'left',
  },
});
