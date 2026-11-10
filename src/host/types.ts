export type ThemeName = 'dark' | 'light';

export interface CodecHost {
  mode: 'standalone' | 'plugin';
  initialize(onTheme: (theme: ThemeName) => void): Promise<ThemeName>;
  toggleTheme(): Promise<ThemeName>;
  copy(value: string): Promise<void>;
  saveText(suggestedName: string, value: string): Promise<boolean>;
  notify(message: string, kind?: 'info' | 'success' | 'warning' | 'error'): Promise<void>;
  dispose(): void;
}

export async function copyText(value: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }
  const textarea = document.createElement('textarea');
  textarea.value = value;
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand('copy');
  textarea.remove();
}

