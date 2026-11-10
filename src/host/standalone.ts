import { invoke } from '@tauri-apps/api/core';
import { save } from '@tauri-apps/plugin-dialog';

import { copyText, type CodecHost, type ThemeName } from './types';

const STORAGE_KEY = 'atcodec.theme';
let theme: ThemeName = 'dark';
let themeListener: ((theme: ThemeName) => void) | null = null;

export const host: CodecHost = {
  mode: 'standalone',
  async initialize(onTheme) {
    themeListener = onTheme;
    theme = localStorage.getItem(STORAGE_KEY) === 'light' ? 'light' : 'dark';
    return theme;
  },
  async toggleTheme() {
    theme = theme === 'dark' ? 'light' : 'dark';
    localStorage.setItem(STORAGE_KEY, theme);
    themeListener?.(theme);
    return theme;
  },
  copy: copyText,
  async saveText(suggestedName, value) {
    const path = await save({ defaultPath: suggestedName });
    if (!path) return false;
    await invoke('write_text_file', { path, content: value });
    return true;
  },
  async notify() {},
  dispose() {
    themeListener = null;
  }
};

