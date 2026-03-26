import React, { useState, useEffect } from 'react'
import './Settings.css'
import { AppSettings } from '@shared/types'

interface APIConfig {
  provider: string
  apiKey: string
  apiUrl: string
  model: string
}

const PRESET_PROVIDERS = [
  {
    name: 'DeepSeek',
    url: 'https://api.deepseek.com',
    model: 'deepseek-chat',
  },
  {
    name: 'OpenAI',
    url: 'https://api.openai.com/v1',
    model: 'gpt-4-turbo',
  },
  {
    name: 'Claude (Anthropic)',
    url: 'https://api.anthropic.com/v1',
    model: 'claude-3-5-sonnet-20241022',
  },
  {
    name: 'Ollama',
    url: 'http://localhost:11434/v1',
    model: 'llama2',
  },
]

export default function Settings() {
  const [config, setConfig] = useState<APIConfig>({
    provider: '',
    apiKey: '',
    apiUrl: '',
    model: '',
  })
  const [savedConfig, setSavedConfig] = useState<APIConfig | null>(null)
  const [message, setMessage] = useState('')
  const [isCustom, setIsCustom] = useState(false)

  useEffect(() => {
    // 从主进程 store 加载设置
    const loadSettings = async () => {
      try {
        const settings: AppSettings = await window.electronAPI?.store?.getSettings?.()
        if (settings?.apiKey) {
          const parsed = {
            provider: settings.provider || '',
            apiKey: settings.apiKey || '',
            apiUrl: settings.apiUrl || '',
            model: settings.model || '',
          }
          setSavedConfig(parsed)
          setConfig(parsed)
          setIsCustom(!PRESET_PROVIDERS.some(p => p.name === parsed.provider))
        }
      } catch (e) {
        console.error('Failed to load settings:', e)
      }
    }
    loadSettings()
  }, [])

  const handleProviderSelect = (providerName: string) => {
    const provider = PRESET_PROVIDERS.find(p => p.name === providerName)
    if (provider) {
      setConfig({
        provider: provider.name,
        apiKey: config.apiKey,
        apiUrl: provider.url,
        model: provider.model,
      })
      setIsCustom(false)
    }
  }

  const handleCustomProvider = () => {
    setIsCustom(true)
    setConfig({
      provider: '',
      apiKey: config.apiKey,
      apiUrl: '',
      model: '',
    })
  }

  const handleInputChange = (field: keyof APIConfig, value: string) => {
    setConfig(prev => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleSave = () => {
    // 验证必填字段
    if (!config.apiKey.trim()) {
      setMessage('❌ API Key 不能为空')
      return
    }
    if (!config.apiUrl.trim()) {
      setMessage('❌ API URL 不能为空')
      return
    }
    if (!config.model.trim()) {
      setMessage('❌ 模型名称不能为空')
      return
    }
    if (!config.provider.trim()) {
      setMessage('❌ 请选择或填写服务商名称')
      return
    }

    // 验证 URL 格式
    try {
      new URL(config.apiUrl)
    } catch (e) {
      setMessage('❌ 请输入有效的 API URL')
      return
    }

    // 保存到主进程 store
    window.electronAPI?.store?.saveSettings?.({
      provider: config.provider,
      apiKey: config.apiKey,
      apiUrl: config.apiUrl,
      model: config.model,
      whisperModel: 'base',
      language: 'zh',
      shortcuts: {
        toggleRecording: 'CommandOrControl+Shift+R',
        showWindow: 'CommandOrControl+Shift+I',
      }
    })
    
    // 同时保存到 localStorage 作为备份
    localStorage.setItem('ai-api-config', JSON.stringify(config))
    setSavedConfig(config)
    setMessage('✅ API 配置保存成功！')

    setTimeout(() => {
      setMessage('')
    }, 3000)
  }

  const handleReset = () => {
    if (savedConfig) {
      setConfig(savedConfig)
      setIsCustom(!PRESET_PROVIDERS.some(p => p.name === savedConfig.provider))
    }
  }

  const handleClear = () => {
    if (confirm('确定要清除保存的 API 配置吗？')) {
      localStorage.removeItem('ai-api-config')
      // 清除主进程 store 中的 API 配置
      window.electronAPI?.store?.saveSettings?.({
        provider: '',
        apiKey: '',
        apiUrl: '',
        model: '',
        whisperModel: 'base',
        language: 'zh',
        shortcuts: {
          toggleRecording: 'CommandOrControl+Shift+R',
          showWindow: 'CommandOrControl+Shift+I',
        }
      })
      setSavedConfig(null)
      setConfig({
        provider: '',
        apiKey: '',
        apiUrl: '',
        model: '',
      })
      setIsCustom(false)
      setMessage('✅ API 配置已清除')
      setTimeout(() => {
        setMessage('')
      }, 3000)
    }
  }

  const maskKey = (key: string) => {    if (!key) return ''
    return key.substring(0, 8) + '...' + key.substring(key.length - 4)
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <span className="page-icon">⚙️</span>
        <div>
          <h1 className="page-title">设置</h1>
          <p className="page-subtitle">配置 AI API 用于生成面试备忘卡</p>
        </div>
      </div>

      <div className="settings-grid">
        {/* API 配置 */}
        <div className="settings-card card" style={{ gridColumn: '1 / -1' }}>
          <div className="settings-section">
            <h2 className="section-title">🔑 AI API 配置</h2>
            <p className="section-description">
              支持任何兼容 OpenAI 格式的 API（DeepSeek、OpenAI、Claude、Ollama 等）
            </p>

            {/* 预设服务商 */}
            <div className="settings-field">
              <label>选择 AI 服务商</label>
              <div className="provider-grid">
                {PRESET_PROVIDERS.map(provider => (
                  <button
                    key={provider.name}
                    className={`provider-btn ${!isCustom && config.provider === provider.name ? 'active' : ''}`}
                    onClick={() => handleProviderSelect(provider.name)}
                  >
                    <span className="provider-name">{provider.name}</span>
                    <span className="provider-model">{provider.model}</span>
                  </button>
                ))}
                <button
                  className={`provider-btn custom ${isCustom ? 'active' : ''}`}
                  onClick={handleCustomProvider}
                >
                  <span className="provider-name">+ 自定义</span>
                  <span className="provider-model">其他 OpenAI 兼容 API</span>
                </button>
              </div>
            </div>

            {/* 配置字段 */}
            <div className="config-fields">
              {/* 服务商名称 */}
              <div className="settings-field">
                <label htmlFor="provider">服务商名称</label>
                <input
                  id="provider"
                  type="text"
                  placeholder={isCustom ? '输入自定义服务商名称，如：LM Studio' : config.provider}
                  value={config.provider}
                  onChange={(e) => handleInputChange('provider', e.target.value)}
                  disabled={!isCustom && PRESET_PROVIDERS.some(p => p.name === config.provider)}
                />
              </div>

              {/* API 端点 */}
              <div className="settings-field">
                <label htmlFor="apiUrl">API 端点 (Base URL)</label>
                <input
                  id="apiUrl"
                  type="text"
                  placeholder="如：https://api.deepseek.com 或 http://localhost:11434/v1"
                  value={config.apiUrl}
                  onChange={(e) => handleInputChange('apiUrl', e.target.value)}
                />
                <p className="field-hint">
                  确保 URL 不包含 /chat/completions 等路径，系统会自动附加
                </p>
              </div>

              {/* 模型名称 */}
              <div className="settings-field">
                <label htmlFor="model">模型名称</label>
                <input
                  id="model"
                  type="text"
                  placeholder={`如：${config.provider === 'DeepSeek' ? 'deepseek-chat' : config.provider === 'OpenAI' ? 'gpt-4-turbo' : 'llama2'}`}
                  value={config.model}
                  onChange={(e) => handleInputChange('model', e.target.value)}
                />
                <p className="field-hint">
                  输入你要使用的具体模型名称
                </p>
              </div>

              {/* API Key */}
              <div className="settings-field">
                <label htmlFor="apiKey">API Key</label>
                <div className="key-input-group">
                  <input
                    id="apiKey"
                    type="password"
                    placeholder="sk-... 或其他 API Key 格式"
                    value={config.apiKey}
                    onChange={(e) => handleInputChange('apiKey', e.target.value)}
                  />
                  <span className="key-status">
                    {savedConfig?.apiKey ? '✓ 已配置' : '○ 未配置'}
                  </span>
                </div>
                <p className="field-hint">
                  你的 API Key 将仅存储在本地浏览器，不会上传到任何服务器
                </p>
              </div>
            </div>

            {/* 操作按钮 */}
            <div className="settings-actions">
              <button className="btn-primary" onClick={handleSave}>
                💾 保存配置
              </button>
              <button
                className="btn-secondary"
                onClick={handleReset}
                disabled={!savedConfig}
              >
                ↶ 重置
              </button>
              <button
                className="btn-danger"
                onClick={handleClear}
                disabled={!savedConfig}
              >
                🗑️ 清除配置
              </button>
            </div>

            {message && (
              <div className={`settings-message ${message.includes('✅') ? 'success' : 'error'}`}>
                {message}
              </div>
            )}
          </div>
        </div>

        {/* 已保存配置信息 */}
        {savedConfig && (
          <div className="settings-card card">
            <div className="settings-section">
              <h2 className="section-title">📋 当前配置</h2>

              <div className="info-group">
                <div className="info-item">
                  <span className="info-label">服务商</span>
                  <span className="info-value">{savedConfig.provider}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">API 端点</span>
                  <span className="info-value code">{savedConfig.apiUrl}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">模型</span>
                  <span className="info-value code">{savedConfig.model}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">API Key</span>
                  <span className="info-value code">{maskKey(savedConfig.apiKey)}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 常见 API 端点参考 */}
        <div className="settings-card card">
          <div className="settings-section">
            <h2 className="section-title">📚 API 端点参考</h2>

            <div className="api-reference">
              <div className="api-endpoint">
                <div className="endpoint-name">DeepSeek</div>
                <div className="endpoint-url">https://api.deepseek.com</div>
                <div className="endpoint-model">deepseek-chat</div>
              </div>

              <div className="api-endpoint">
                <div className="endpoint-name">OpenAI</div>
                <div className="endpoint-url">https://api.openai.com/v1</div>
                <div className="endpoint-model">gpt-4-turbo / gpt-3.5-turbo</div>
              </div>

              <div className="api-endpoint">
                <div className="endpoint-name">Claude (Anthropic)</div>
                <div className="endpoint-url">https://api.anthropic.com/v1</div>
                <div className="endpoint-model">claude-3-5-sonnet-20241022</div>
              </div>

              <div className="api-endpoint">
                <div className="endpoint-name">Ollama (本地)</div>
                <div className="endpoint-url">http://localhost:11434/v1</div>
                <div className="endpoint-model">llama2 / mistral / neural-chat</div>
              </div>

              <div className="api-endpoint">
                <div className="endpoint-name">Groq</div>
                <div className="endpoint-url">https://api.groq.com/openai/v1</div>
                <div className="endpoint-model">mixtral-8x7b-32768</div>
              </div>

              <div className="api-endpoint">
                <div className="endpoint-name">LM Studio (本地)</div>
                <div className="endpoint-url">http://localhost:1234/v1</div>
                <div className="endpoint-model">local-model</div>
              </div>
            </div>
          </div>
        </div>

        {/* 使用说明 */}
        <div className="settings-card card" style={{ gridColumn: '1 / -1' }}>
          <div className="settings-section">
            <h2 className="section-title">📖 使用指南</h2>
            <div className="guide-content">
              <div className="guide-step">
                <div className="step-number">1</div>
                <div className="step-content">
                  <h3>选择或配置 API</h3>
                  <p>从预设的服务商中选择，或选择"自定义"配置其他兼容 OpenAI 格式的 API</p>
                </div>
              </div>

              <div className="guide-step">
                <div className="step-number">2</div>
                <div className="step-content">
                  <h3>填写必要信息</h3>
                  <p>输入 API 端点 URL、模型名称和 API Key。确保信息准确无误</p>
                </div>
              </div>

              <div className="guide-step">
                <div className="step-number">3</div>
                <div className="step-content">
                  <h3>保存配置</h3>
                  <p>点击"💾 保存配置"按钮。配置仅存储在本地浏览器中，不会上传</p>
                </div>
              </div>

              <div className="guide-step">
                <div className="step-number">4</div>
                <div className="step-content">
                  <h3>生成备忘卡</h3>
                  <p>返回"面试准备"页面，填写岗位信息后点击"✨ 生成备忘卡"</p>
                </div>
              </div>

              <div className="guide-step">
                <div className="step-number">5</div>
                <div className="step-content">
                  <h3>查看和导出</h3>
                  <p>预览生成的备忘卡，点击"⬇️"导出为 TXT 文件，或直接开始录音</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 安全提示 */}
        <div className="settings-card card info-card">
          <div className="settings-section">
            <h2 className="section-title">🔒 隐私与安全</h2>
            <div className="security-info">
              <p>✅ <strong>本地存储</strong>：你的 API Key 仅存储在浏览器的 localStorage 中，不会上传到任何服务器</p>
              <p>✅ <strong>直接调用</strong>：应用直接调用你配置的 AI API，不经过中间服务</p>
              <p>⚠️ <strong>责任提示</strong>：妥善保管你的 API Key，避免与他人共享或提交到公开代码库</p>
              <p>ℹ️ <strong>费用提示</strong>：使用付费 API（如 OpenAI）时可能产生费用，请及时检查账户余额</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
