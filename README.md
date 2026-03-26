# InterviewCopilot

AI驱动的面试辅助工具，支持音频录制、语音转文字和AI深度分析，助力面试准备和复盘。

## 功能特性

- 🎙️ **系统音频录制**：支持系统音频（扬声器输出）和麦克风输入同步录制
- 🎤 **本地语音转文字**：使用 whisper.cpp 本地模型进行语音识别，完全免费无需联网
- 🤖 **AI 智能分析**：基于转录文本生成结构化面试复盘报告
- 💾 **会话历史管理**：面试记录和分析报告持久化存储
- 📝 **面试题目生成**：根据岗位描述和简历智能生成高频面试题目
- 📊 **复盘报告**：详细的面试表现评分、亮点和改进建议

## 技术栈

- **框架**：Electron + React 18 + TypeScript
- **构建工具**：electron-vite + Vite
- **状态管理**：Zustand
- **本地存储**：electron-store
- **语音识别**：whisper.cpp (本地运行)
- **AI 集成**：支持 DeepSeek、OpenAI、Claude、Ollama 等 OpenAI 兼容 API

## 平台支持

- **macOS**：需要 BlackHole 或 Soundflower 虚拟音频设备来捕获系统音频
- **Windows**：使用原生 WASAPI 环形缓冲（无需额外设置）
- **Linux**：暂不支持

## 快速开始

### 环境要求

- Node.js >= 18.0.0
- npm >= 9.0.0

### 安装步骤

1. **安装依赖**
```bash
npm install
```

2. **准备资源文件**（仅开发环境）
```bash
# 创建资源目录
mkdir -p resources/whisper/Release
mkdir -p resources/whisper/models

# 下载 whisper-cli.exe 到 resources/whisper/Release/
# 下载模型文件到 resources/whisper/models/
```

3. **运行开发服务器**
```bash
npm run dev
```

4. **构建生产版本**
```bash
# 构建
npm run build

# 打包为可执行文件
npm run dist
```

## 项目结构

```
├── src/
│   ├── main/                 # Electron 主进程
│   │   ├── index.ts          # 应用入口和窗口管理
│   │   ├── audio.ts         # 音频录制状态机
│   │   ├── tray.ts           # 系统托盘和全局快捷键
│   │   ├── whisper.ts        # whisper.cpp CLI 封装
│   │   ├── claude.ts         # Claude AI SDK 集成
│   │   ├── store.ts          # electron-store 数据持久化
│   │   ├── ipc/              # IPC 处理器
│   │   └── capturer/         # 平台特定的音频捕获逻辑
│   │
│   ├── renderer/             # 渲染进程（React 应用）
│   │   └── src/
│   │       ├── pages/        # 页面组件
│   │       ├── components/   # 可复用组件
│   │       ├── store/         # Zustand 状态管理
│   │       └── utils/         # 工具函数
│   │
│   ├── preload/               # 预加载脚本
│   └── shared/                # 共享类型和常量
│
├── resources/                 # 资源文件
│   └── whisper/              # whisper.cpp 模型和可执行文件
└── dist-electron/            # 编译输出
```

## 默认快捷键

| 快捷键 | 功能 |
|--------|------|
| `Ctrl/Cmd + Shift + R` | 开始/暂停录音 |
| `Ctrl/Cmd + Shift + I` | 显示/隐藏主窗口 |

## API 配置

应用支持多种 OpenAI 兼容的 API 服务商：

- **DeepSeek** (推荐) - 性价比高
- **OpenAI** - GPT-4/3.5
- **Claude (Anthropic)** - Claude 3.5
- **Ollama** - 本地模型
- **其他** - 任何兼容 OpenAI 格式的 API

配置方式：设置页面 → 选择服务商 → 填写 API Key

## 开发说明

- 项目使用 electron-vite 提供快速的开发热重载体验
- IPC 通信通过 contextBridge 实现类型安全的桥梁
- 所有敏感操作（API 调用）在主进程中执行
- 音频数据通过 IPC 从渲染进程流向主进程进行文件写入

## 许可证

MIT License

## 贡献

欢迎提交 Issue 和 Pull Request！

