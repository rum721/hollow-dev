import React, { useState } from 'react';
import { View, StyleSheet, TextInput, TouchableOpacity, Image, Alert, Platform } from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { colors, spacing, borderRadius } from '../../theme';
import { useI18n } from '../../i18n';
import { pickImageFromLibrary, takePhoto } from '../../services/image/imageService';
import type { ImageAttachment } from '../../types/chat';

interface Props {
  onSend: (text: string, images?: ImageAttachment[]) => void;
  onMicPress: () => void;
  onCancel?: () => void;
  isStreaming?: boolean;
  disabled?: boolean;
}

export function ChatInput({ onSend, onMicPress, onCancel, isStreaming, disabled }: Props) {
  const { t } = useI18n();
  const [text, setText] = useState('');
  const [pendingImage, setPendingImage] = useState<ImageAttachment | null>(null);

  const handleSend = () => {
    const trimmed = text.trim();
    if (trimmed || pendingImage) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onSend(trimmed || '', pendingImage ? [pendingImage] : undefined);
      setText('');
      setPendingImage(null);
    }
  };

  const handleImagePress = () => {
    if (isStreaming || disabled) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (Platform.OS === 'web') {
      handlePickFromLibrary();
      return;
    }

    Alert.alert(
      '',
      undefined,
      [
        { text: '从相册选择', onPress: handlePickFromLibrary },
        { text: '拍照', onPress: handleTakePhoto },
        { text: '取消', style: 'cancel' },
      ],
    );
  };

  const handlePickFromLibrary = async () => {
    const image = await pickImageFromLibrary();
    if (image) setPendingImage(image);
  };

  const handleTakePhoto = async () => {
    const image = await takePhoto();
    if (image) setPendingImage(image);
  };

  const canSend = Boolean(text.trim() || pendingImage);

  return (
    <View>
      {/* Image preview */}
      {pendingImage && (
        <View style={styles.previewRow}>
          <View style={styles.previewContainer}>
            <Image source={{ uri: pendingImage.uri }} style={styles.previewImage} />
            <TouchableOpacity
              style={styles.removeBtn}
              onPress={() => setPendingImage(null)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Feather name="x" size={12} color={colors.white} />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Input row */}
      <View style={styles.container}>
        <TouchableOpacity onPress={onMicPress} style={styles.iconBtn}>
          <Feather name="mic" size={20} color={colors.textSecondary} />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={handleImagePress}
          style={styles.iconBtn}
          disabled={isStreaming || disabled}
        >
          <Feather
            name="image"
            size={20}
            color={isStreaming || disabled ? colors.textMuted : colors.textSecondary}
          />
        </TouchableOpacity>
        <TextInput
          style={styles.input}
          value={text}
          onChangeText={setText}
          placeholder={t('chat.placeholder')}
          placeholderTextColor={colors.textMuted}
          selectionColor={colors.amber}
          multiline
          maxLength={2000}
          editable={!disabled}
        />
        {isStreaming ? (
          <TouchableOpacity
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              onCancel?.();
            }}
            style={styles.stopBtn}
            activeOpacity={0.7}
          >
            <Feather name="square" size={16} color={colors.background} />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            onPress={handleSend}
            style={[styles.sendBtn, !canSend && styles.sendBtnDisabled]}
            disabled={!canSend || disabled}
          >
            <Feather name="send" size={18} color={canSend ? colors.background : colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  previewRow: {
    paddingHorizontal: spacing.lg + spacing.md,
    paddingBottom: spacing.sm,
  },
  previewContainer: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.sm,
    overflow: 'visible',
  },
  previewImage: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.sm,
  },
  removeBtn: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBtn: {
    padding: spacing.sm,
    marginBottom: 2,
  },
  input: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 15,
    lineHeight: 20,
    maxHeight: 100,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  sendBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.amber,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  sendBtnDisabled: {
    backgroundColor: colors.surfaceLight,
  },
  stopBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
});
