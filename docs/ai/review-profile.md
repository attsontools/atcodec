# AT Codec Review Profile

## 业务域

- 项目名称：`atcodec`
- 项目定位：同一套 Vue 编码转换 UI 与核心逻辑，同时发布为独立 Tauri 桌面应用和可被 AT Tool 动态安装的插件。
- 主要调用方：独立桌面应用用户，以及通过 `@attson/plugin-sdk` 加载插件的 AT Tool 平台用户。
- 核心业务对象：编码转换输入与输出、宿主适配器、插件 manifest、签名插件包、跨平台安装包、GitHub Release 资产。
- 关键状态流转：源码构建为 standalone 或 plugin 两种产物；插件产物经过 manifest 生成、Ed25519 签名、归档和回读校验后发布；无持久化业务状态机。

## 关键约定

- `src/codec.ts` 和共享 Vue UI 必须保持宿主无关；独立应用与插件的系统能力只能通过 `src/host/` 中的 `CodecHost` 适配器接入。
- Vite 的 `@host` 别名必须按构建模式选择 `src/host/standalone.ts` 或 `src/host/plugin.ts`，不得让插件构建直接依赖 Tauri API。
- 插件身份固定为 `appId=com.attson.codec`、`publisher.id=com.attson`、名称 `编码转换`；变更这些字段视为安装身份或信任关系迁移，不能作为普通重命名发布。
- 插件 Host API 范围固定为 `1.0.0` 至 `1.x`；权限仅可声明实际使用的最小集合。新增权限必须同时核对 AT Tool 宿主实现和用户授权影响。
- 插件 manifest 必须由 `@attson/plugin-sdk` 的 schema 与签名 API 生成和验证；不得在本仓库复制或分叉共享 schema、规范化或签名算法。
- `.atpkg` 必须包含 `manifest.json`、`manifest.sig` 和 manifest 声明的精确文件集合；签名、文件哈希、目标平台、版本、发布者 key ID 和包名任一不一致都必须失败。
- 发布者私钥必须与 `ATCODEC_PUBLISHER_PUBLIC_KEY` 匹配，且 manifest 中的 key ID 必须与 `ATCODEC_PUBLISHER_KEY_ID` 一致；不得自动选择其他密钥或静默降级为未签名包。
- Release tag、`package.json`、`src-tauri/tauri.conf.json` 和 `src-tauri/Cargo.toml` 的版本必须一致，并且 tag 必须是 `v` 前缀的有效 SemVer。
- 正式 Release 必须为五个目标各发布一个独立安装包和一个 `.atpkg`，共十个非空且名称精确匹配的资产；多文件、少文件、空文件或非文件条目均必须阻止发布。
- Root 与 Catalog 的生成、签名和发布属于 `attsontools/attool`；本仓库只生成 Codec 发布者签名的插件包，不得持有或使用 Root/Catalog 私钥。

## 高风险路径

- `.github/workflows/release.yml`：控制五平台构建、生产环境密钥、资产聚合和 GitHub Release 发布。
- `scripts/package-plugin.mjs`：生成插件身份与权限、读取发布者密钥、签名、归档并验证 `.atpkg`。
- `scripts/verify-release.mjs`：约束版本一致性和正式 Release 的精确资产集合。
- `vite.config.ts`：决定 standalone/plugin 构建使用的宿主边界。
- `src/host/**`：实现独立应用与 AT Tool 插件的能力适配和权限调用。
- `src-tauri/src/lib.rs`：独立应用本地文件写入能力及 Tauri command 暴露面。
- `src-tauri/tauri.conf.json`：应用身份、CSP、窗口和跨平台 bundle 配置。

## 忽略路径

- `node_modules/**`：第三方安装产物。
- `dist/**`、`dist-plugin/**`、`artifacts/**`：本地生成产物，应由源码、构建脚本和 CI 契约验证。
- `src-tauri/target/**`、`src-tauri/gen/**`：Rust/Tauri 构建与生成产物。
- `src-tauri/icons/**`：默认不精读二进制图标；文件缺失、打包失败或明显敏感信息除外。

## 独立发布范围

无独立发布范围。standalone 安装包与插件包由同一 tag 和同一 Release workflow 联合发布，必须作为一个发布契约审查。

## 领域术语

- `standalone`：由 Tauri 提供系统能力的独立桌面应用，不等于 AT Tool 内置模块。
- `plugin`：由 AT Tool 通过 Host API 加载的 Web UI 包，不包含独立 Tauri 壳。
- `.atpkg`：ZIP 格式的签名插件包，内部文件必须与 manifest 一一对应。
- `Publisher key`：Codec 仓库用于签署插件 manifest 的 Ed25519 密钥，不是 AT Tool 的 Root 或 Catalog 密钥。
- `Catalog`：AT Tool 主仓库维护的可安装插件索引；本仓库的 GitHub Release 是 Catalog 引用的不可变插件资产来源。

## 重点检查项

### 业务约束

- 编码、解码、哈希和 JWT 展示逻辑在两种宿主下必须产生一致结果；宿主差异只能影响主题、保存和通知等平台能力。
- 插件 manifest 的应用身份、版本、目标、Host API、权限和文件哈希必须与实际包内容一致。
- 取消保存与保存失败必须保持可区分，不得把宿主未连接、权限拒绝或写入失败报告为成功。

### 架构边界

- `src/App.vue` 和 `src/codec.ts` 不得直接 import Tauri 或 plugin browser client；平台调用应经 `CodecHost`。
- `src/host/plugin.ts` 只能调用 manifest 已声明且 AT Tool Host API 支持的权限。
- SDK contract 变化应在 `attool-plugin-sdk` 发布后通过精确 tag 引用，不依赖本地路径、分支漂移或未发布提交。

### 数据与兼容性

- `appId`、publisher 身份、manifest schema、文件路径和 Release 资产命名是安装、升级与信任校验契约。
- 版本或目标元数据错误会使 Catalog 指向不可安装资产；禁止以默认 target、猜测版本或忽略额外文件的方式继续发布。
- 插件 UI 入口必须保持相对路径可加载，plugin build 不得引入绝对资源路径。

### 外部依赖

- `@attson/plugin-sdk` 同时定义 manifest 解析、签名和浏览器 Host API；升级时必须核对 AT Tool 客户端的兼容范围。
- GitHub Actions `prod` Environment 提供三个 `ATCODEC_PUBLISHER_*` Secrets；缺失、格式错误或密钥不匹配必须 fail closed。
- `zip`/`unzip` 或 Windows `7z` 的归档行为必须生成兼容包，且不得允许重复条目绕过文件集合与哈希校验。

### 测试重点

- 纯编码逻辑覆盖 Unicode、空输入、非法编码、URL-safe Base64、Hex 边界和 JWT 非法结构。
- 插件打包覆盖身份、权限、签名、哈希、文件增减、目标、文件名、密钥不匹配和重复归档条目。
- 发布校验覆盖非法 tag、四处版本不一致、五目标十资产精确集合、空资产及额外资产。
- 修改 adapter 或构建模式时，至少验证 standalone 与 plugin 两种构建；修改发布矩阵时需要对应平台的 CI 证据。

## 触发关键词检查

- `@host`、`mode === 'plugin'`：核对构建模式是否仍隔离 Tauri 与插件 SDK。
- `appId`、`publisher`、`keyId`、`hostApi`、`permissions`：核对安装身份、信任链、兼容范围和最小权限。
- `manifest.json`、`manifest.sig`、`files`、`sha256`：核对签名对象与包内实际内容完全一致。
- `ATCODEC_PUBLISHER_`、`environment: prod`：核对 Secret 暴露范围、密钥身份验证和 fail-closed 行为。
- `matrix.target`、`release-assets`、`gh release create`：核对五目标与十个正式资产的完整性和不可混发。
- `version`、`GITHUB_REF_NAME`：核对 SemVer 和 package/Tauri/Cargo/tag 四方一致。

## Verification Evidence

```bash
pnpm test
pnpm build
pnpm build:plugin
cargo check --manifest-path src-tauri/Cargo.toml
```

- 运行条件：Node.js 22、pnpm 10.29.3、Rust stable；插件签名打包还需要有效的三个 `ATCODEC_PUBLISHER_*` 环境变量和平台归档工具。
- 常见环境失败：缺少 WebKit/Tauri 系统库、Rust target、`zip`/`unzip`/`7z` 或生产 Secrets 属环境问题；schema、签名、版本、资产集合和 TypeScript/Rust 编译失败属于代码或发布配置问题。
- 无法本地验证时需要的证据：五个 GitHub Actions matrix job 的构建日志、每目标 installer 与 `.atpkg` 的 staged 文件清单，以及 release job 的十资产校验结果。

## Risk & Compatibility

- Breaking change 判断：改变应用或发布者身份、manifest schema/入口/权限、Host API 范围、SDK 行为、资产命名或目标集合均视为兼容性变更。
- 迁移要求：身份或密钥轮换必须先在 AT Tool Root/Catalog 信任链中完成明确迁移；不得靠同名覆盖或客户端静默接受。
- 发布影响：tag 发布会创建公开 GitHub Release；回滚应发布新的 SemVer 和 Catalog 序列，不覆盖既有不可变资产。
- 安全/权限：重点防止私钥泄露、签名身份错配、包内容与 manifest 不一致、权限扩大、路径穿越和重复 ZIP 条目。
- 性能/容量：无服务端热路径；重点关注大输入导致的 UI 阻塞、过大插件包和 CI 构建资源，但须有实际影响证据再报 finding。

## 跨仓库联动

- manifest schema、签名格式或 Host API contract 变化：先同步并发布 `attsontools/attool-plugin-sdk`，再核对 `attsontools/attool` 宿主实现，最后更新本仓库的精确 SDK tag。
- Codec 插件版本、目标、发布者 key 或 Release URL 变化：需要在 `attsontools/attool` Catalog 发布流程中同步相应条目和签名元数据。
- Root/Catalog key 生命周期变化：由 `attsontools/attool` 维护；本仓库仅配合 Publisher key 身份和有效期验证。

## Review Routing

- 默认 owner：`NEEDS_INPUT: 仓库没有 CODEOWNERS 或已记录的模块负责人。`
- 需要额外评审的情况：应用/发布者身份变化、Publisher key 轮换、Host API 或权限变化、SDK contract 变化、发布目标或资产命名变化。
- 升级路径：`NEEDS_INPUT: 仓库没有记录 TL、发布负责人或安全负责人升级路径。`
- 应 request changes 的情况：签名或资产校验被削弱、生产 Secret 范围扩大、五目标发布不完整、跨仓库 contract 未同步。
- 可接受残余风险：`NEEDS_INPUT: 仓库没有记录已接受的发布或兼容性残余风险。`

## Verdict 调整

默认规则：存在 P0/P1 finding 则 Block；只有 P2/P3 则 Needs attention；没有 finding 则 OK。签名验证、生产密钥身份、精确资产集合或五目标发布任一无法提供证据时，完整发布审查至少为 Needs attention；已证明可导致错误包公开发布时升级为 Block。

## Code Pointers

- `src/codec.ts`：宿主无关的编码转换核心。
- `src/host/types.ts`：两种宿主必须共同遵守的能力接口。
- `src/host/standalone.ts`、`src/host/plugin.ts`：独立应用与插件能力边界。
- `vite.config.ts`：按构建模式切换宿主实现。
- `scripts/package-plugin.mjs`：插件 manifest、签名、归档与回读校验。
- `scripts/verify-release.mjs`：版本和 Release 资产契约。
- `.github/workflows/release.yml`：正式跨平台发布入口。
- `src-tauri/src/lib.rs`、`src-tauri/tauri.conf.json`：独立应用本地能力与打包身份。

## 维护规则

- 不要把单次 review finding 直接提升为长期 profile 规则；需要 owner 确认、已有项目文档、重复事故/高频问题证据，或团队已接受的决策后再沉淀。
- 当验证命令、目录结构、发布目标、核心身份、owner 或跨仓库联动变化时同步更新本 profile。
- 不要复制通用代码风格、命名偏好、注释偏好或泛泛最佳实践；通用流程保留在共享 code-review skill。
