<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';

import {
  base64Decode,
  base64Encode,
  decodeJwt,
  hexDecode,
  hexEncode,
  md5,
  sha1,
  sha256,
  sha512,
  unicodeEscape,
  unicodeUnescape,
  urlDecode,
  urlEncode
} from './codec';
import type { CodecHost, ThemeName } from './host/types';

const props = defineProps<{ host: CodecHost }>();

type Tab = 'base64' | 'url' | 'unicode' | 'hex' | 'hash' | 'jwt';
const tabs: Array<{ id: Tab; label: string; detail: string }> = [
  { id: 'base64', label: 'Base64', detail: 'UTF-8 与 URL Safe' },
  { id: 'url', label: 'URL', detail: 'URI 与 Component' },
  { id: 'unicode', label: 'Unicode', detail: '转义与还原' },
  { id: 'hex', label: 'Hex', detail: '字节十六进制' },
  { id: 'hash', label: 'Hash', detail: 'MD5 / SHA' },
  { id: 'jwt', label: 'JWT', detail: 'Header / Payload' }
];

const active = ref<Tab>('base64');
const theme = ref<ThemeName>('dark');
const connecting = ref(true);
const connectionError = ref('');
const input = ref('');
const output = ref('');
const error = ref('');
const urlSafe = ref(false);
const componentMode = ref(true);
const separator = ref('');
const hashes = ref<Array<{ name: string; value: string }>>([]);
const jwt = ref<{ header: string; payload: string; signature: string } | null>(null);
const actionState = ref('');
let hashRevision = 0;

const current = computed(() => tabs.find((tab) => tab.id === active.value)!);
const canReverse = computed(() => ['base64', 'url', 'unicode', 'hex'].includes(active.value));

onMounted(async () => {
  try {
    theme.value = await props.host.initialize((value) => {
      theme.value = value;
      applyTheme();
    });
    applyTheme();
  } catch (reason) {
    connectionError.value = String(reason);
  } finally {
    connecting.value = false;
  }
});

onBeforeUnmount(() => props.host.dispose());

watch(active, () => {
  input.value = '';
  output.value = '';
  error.value = '';
  hashes.value = [];
  jwt.value = null;
});

watch(input, () => {
  if (active.value === 'hash') void computeHashes();
  if (active.value === 'jwt') decodeToken();
});

function applyTheme() {
  document.documentElement.dataset.theme = theme.value;
}

async function toggleTheme() {
  theme.value = await props.host.toggleTheme();
  applyTheme();
}

function convertForward() {
  error.value = '';
  try {
    if (active.value === 'base64') output.value = base64Encode(input.value, urlSafe.value);
    else if (active.value === 'url') output.value = urlEncode(input.value, componentMode.value);
    else if (active.value === 'unicode') output.value = unicodeEscape(input.value);
    else if (active.value === 'hex') output.value = hexEncode(input.value, separator.value);
  } catch (reason) {
    error.value = String(reason);
  }
}

function convertReverse() {
  error.value = '';
  try {
    if (active.value === 'base64') input.value = base64Decode(output.value, urlSafe.value);
    else if (active.value === 'url') input.value = urlDecode(output.value, componentMode.value);
    else if (active.value === 'unicode') input.value = unicodeUnescape(output.value);
    else if (active.value === 'hex') input.value = hexDecode(output.value);
  } catch (reason) {
    error.value = String(reason);
  }
}

async function computeHashes() {
  const revision = ++hashRevision;
  const values = await Promise.all([sha1(input.value), sha256(input.value), sha512(input.value)]);
  if (revision !== hashRevision) return;
  hashes.value = [
    { name: 'MD5', value: md5(input.value) },
    { name: 'SHA-1', value: values[0] },
    { name: 'SHA-256', value: values[1] },
    { name: 'SHA-512', value: values[2] }
  ];
}

function decodeToken() {
  error.value = '';
  if (!input.value.trim()) {
    jwt.value = null;
    return;
  }
  try {
    jwt.value = decodeJwt(input.value);
  } catch (reason) {
    jwt.value = null;
    error.value = String(reason);
  }
}

async function copy(value: string) {
  if (!value) return;
  try {
    await props.host.copy(value);
    actionState.value = '已复制';
  } catch {
    actionState.value = '复制失败';
  }
  setTimeout(() => (actionState.value = ''), 1200);
}

async function exportValue(value: string, name: string) {
  if (!value) return;
  try {
    const saved = await props.host.saveText(name, value);
    if (saved) {
      actionState.value = '已导出';
      await props.host.notify('文件已保存', 'success');
    }
  } catch (reason) {
    error.value = String(reason);
  }
  setTimeout(() => (actionState.value = ''), 1200);
}
</script>

<template>
  <main class="app">
    <header class="topbar">
      <div class="brand">
        <span class="brand-mark">AC</span>
        <div><strong>AT Codec</strong><span>编码与摘要工作台</span></div>
      </div>
      <div class="top-actions">
        <span class="host-badge">{{ host.mode === 'plugin' ? '平台插件' : '独立应用' }}</span>
        <button v-if="host.mode === 'standalone'" class="icon-button" type="button" title="切换主题" @click="toggleTheme">
          {{ theme === 'dark' ? 'Light' : 'Dark' }}
        </button>
      </div>
    </header>

    <div v-if="connecting" class="center-state">正在连接宿主</div>
    <div v-else-if="connectionError" class="center-state error-state">
      <strong>无法启动 AT Codec</strong><span>{{ connectionError }}</span>
    </div>

    <div v-else class="workspace">
      <nav class="tabs" aria-label="编码工具">
        <button v-for="tab in tabs" :key="tab.id" type="button" :class="{ active: active === tab.id }" @click="active = tab.id">
          <strong>{{ tab.label }}</strong><span>{{ tab.detail }}</span>
        </button>
      </nav>

      <section class="content">
        <header class="section-head">
          <div><h1>{{ current.label }}</h1><p>{{ current.detail }}</p></div>
          <span v-if="actionState" class="action-state">{{ actionState }}</span>
        </header>

        <div v-if="active === 'base64' || active === 'url' || active === 'unicode' || active === 'hex'" class="options">
          <label v-if="active === 'base64'"><input v-model="urlSafe" type="checkbox" /> URL Safe</label>
          <label v-if="active === 'url'"><input v-model="componentMode" type="checkbox" /> Component 模式</label>
          <label v-if="active === 'hex'">分隔符
            <select v-model="separator"><option value="">无</option><option value=" ">空格</option><option value=":">冒号</option><option value="-">短横线</option></select>
          </label>
        </div>

        <template v-if="canReverse">
          <div class="converter">
            <article class="panel"><header><strong>原文</strong></header><textarea v-model="input" spellcheck="false" placeholder="输入要处理的文本" /></article>
            <div class="convert-actions"><button class="primary" type="button" @click="convertForward">转换</button><button type="button" @click="convertReverse">还原</button></div>
            <article class="panel"><header><strong>结果</strong><span><button type="button" @click="copy(output)">复制</button><button type="button" @click="exportValue(output, `${active}.txt`)">导出</button></span></header><textarea v-model="output" spellcheck="false" placeholder="转换结果" /></article>
          </div>
        </template>

        <template v-else-if="active === 'hash'">
          <article class="panel input-panel"><header><strong>输入</strong></header><textarea v-model="input" spellcheck="false" placeholder="输入文本，摘要会实时计算" /></article>
          <div class="result-list">
            <article v-for="item in hashes" :key="item.name" class="panel result-row"><header><strong>{{ item.name }}</strong><span><button type="button" @click="copy(item.value)">复制</button><button type="button" @click="exportValue(item.value, `${item.name.toLowerCase()}.txt`)">导出</button></span></header><code>{{ item.value }}</code></article>
          </div>
        </template>

        <template v-else>
          <article class="panel input-panel"><header><strong>JWT</strong></header><textarea v-model="input" spellcheck="false" placeholder="粘贴 xxxxx.yyyyy.zzzzz" /></article>
          <div v-if="jwt" class="jwt-grid">
            <article v-for="item in [{ name: 'Header', value: jwt.header }, { name: 'Payload', value: jwt.payload }, { name: 'Signature', value: jwt.signature }]" :key="item.name" class="panel"><header><strong>{{ item.name }}</strong><button type="button" @click="copy(item.value)">复制</button></header><pre>{{ item.value }}</pre></article>
          </div>
        </template>

        <p v-if="error" class="error-message">{{ error }}</p>
      </section>
    </div>
  </main>
</template>

