import React from 'react';
import {
  Modal,
  View,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  StatusBar,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors, spacing } from '../../theme';
import { EncryptedImage } from './EncryptedImage';
import type { ImageAttachment } from '../../types/chat';

interface Props {
  image: ImageAttachment | null;
  visible: boolean;
  onClose: () => void;
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export function ImageViewer({ image, visible, onClose }: Props) {
  if (!image) return null;

  // Calculate display size to fit screen with padding
  const maxW = SCREEN_WIDTH - spacing.xl * 2;
  const maxH = SCREEN_HEIGHT * 0.75;
  const ratio = image.width / image.height;
  let displayWidth = maxW;
  let displayHeight = displayWidth / ratio;
  if (displayHeight > maxH) {
    displayHeight = maxH;
    displayWidth = displayHeight * ratio;
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <StatusBar barStyle="light-content" />
      <View style={styles.overlay}>
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={onClose}
        />
        <EncryptedImage
          uri={image.uri}
          mimeType={image.mimeType}
          width={displayWidth}
          height={displayHeight}
          borderRadius={8}
          resizeMode="contain"
        />
        <TouchableOpacity
          style={styles.closeBtn}
          onPress={onClose}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Feather name="x" size={22} color={colors.white} />
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.92)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  closeBtn: {
    position: 'absolute',
    top: 60,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
