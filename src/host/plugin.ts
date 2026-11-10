import { connectPlugin, type PluginClient } from '@attson/plugin-sdk/browser';

import { copyText, type CodecHost, type ThemeName } from './types';

let client: PluginClient | null = null;
let removeThemeListener: (() => void) | null = null;
let currentTheme: ThemeName = 'dark';

export const host: CodecHost = {
  mode: 'plugin',
  async initialize(onTheme) {
    client = await connectPlugin('com.attson.codec');
    const handshake = await client.handshake();
    currentTheme = handshake.theme;
    removeThemeListener = client.onThemeChange((theme) => {
      currentTheme = theme;
      onTheme(theme);
    });
    return currentTheme;
  },
  async toggleTheme() {
    return currentTheme;
  },
  copy: copyText,
  async saveText(suggestedName, value) {
    if (!client) throw new Error('Host API is not connected');
    const result = await client.call<{ cancelled: boolean }>('host.file.save', {
      suggestedName,
      content: value,
      encoding: 'utf8'
    });
    return !result.cancelled;
  },
  async notify(message, kind = 'info') {
    if (!client) return;
    await client.call('host.notification.show', { message, kind });
  },
  dispose() {
    removeThemeListener?.();
    removeThemeListener = null;
    client?.close();
    client = null;
  }
};

