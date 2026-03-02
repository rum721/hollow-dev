import React, { useState, useEffect } from 'react';
import { Image, View, ActivityIndicator, StyleSheet } from 'react-native';
import { getDisplayUri } from '../../services/image/imageService';
import { colors } from '../../theme';

interface Props {
  uri: string;
  mimeType?: string;
  width: number;
  height: number;
  borderRadius?: number;
  resizeMode?: 'cover' | 'contain' | 'stretch' | 'center';
}

/**
 * Image component that handles AES-encrypted image files.
 * Decrypts the file on mount and renders via base64 data URI.
 * Falls back to direct URI for legacy unencrypted images.
 */
export function EncryptedImage({ uri, mimeType = 'image/jpeg', width, height, borderRadius = 0, resizeMode = 'cover' }: Props) {
  const [dataUri, setDataUri] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        // Encrypted files need decryption; legacy files are passed through
        if (uri.endsWith('.enc')) {
          const result = await getDisplayUri(uri, mimeType);
          if (!cancelled) setDataUri(result);
        } else {
          // Legacy unencrypted: use file URI directly
          if (!cancelled) setDataUri(uri);
        }
      } catch {
        if (!cancelled) setError(true);
      }
    }

    setDataUri(null);
    setError(false);
    load();

    return () => { cancelled = true; };
  }, [uri, mimeType]);

  if (error) {
    return (
      <View style={[styles.placeholder, { width, height, borderRadius }]}>
        <ActivityIndicator size="small" color={colors.textMuted} />
      </View>
    );
  }

  if (!dataUri) {
    return (
      <View style={[styles.placeholder, { width, height, borderRadius }]}>
        <ActivityIndicator size="small" color={colors.amberLight} />
      </View>
    );
  }

  return (
    <Image
      source={{ uri: dataUri }}
      style={{ width, height, borderRadius }}
      resizeMode={resizeMode}
    />
  );
}

const styles = StyleSheet.create({
  placeholder: {
    backgroundColor: 'rgba(212, 165, 116, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
