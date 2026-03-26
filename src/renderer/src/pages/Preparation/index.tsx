import React, { useState } from 'react'
import { useSessionStore } from '../../store/sessionStore'
import { MemoCard, InterviewSession } from '@shared/types'
import { extractTextFromFile } from '../../utils/fileParser'
import { exportToDocx } from '../../utils/exportCards'
import MemoCardsViewer from '../../components/MemoCardsViewer'
import './Preparation.css'

const COMMON_POSITIONS = [
  'AI 算法工程师',
  '软件开发工程师',
  '前端工程师',
  '后端工程师',
  '全栈工程师',
  'DevOps 工程师',
  '数据科学家',
  '产品经理',
  '测试工程师',
  '运维工程师',
]

export default function Preparation() {
  const { addSession, updateSession } = useSessionStore()
  const [position, setPosition] = useState('')
  const [customPosition, setCustomPosition] = useState('')
  const [jobDescription, setJobDescription] = useState('')
  const [resume, setResume] = useState('')
  const [resumeFile, setResumeFile] = useState<File | null>(null)
  const [showCustomInput, setShowCustomInput] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [memoCards, setMemoCards] = useState<MemoCard[]>([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [showMemos, setShowMemos] = useState(false)
  const [parsingFile, setParsingFile] = useState(false)
  const [currentSessionId, setCurrentSessionId] = useState<string>('')

  const finalPosition = customPosition.trim() || position

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!finalPosition) {
      newErrors.position = '请选择或输入目标岗位'
    }
    if (!jobDescription.trim()) {
      newErrors.jobDescription = '请输入岗位描述'
    }
    if (!resume.trim() && !resumeFile) {
      newErrors.resume = '请输入简历内容或上传文件'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const generateMemoCards = async () => {
    if (!validateForm()) {
      return
    }

    const savedConfig = localStorage.getItem('ai-api-config')
    if (!savedConfig) {
      setErrors(prev => ({ ...prev, generate: '请先在设置页面配置 API' }))
      return
    }

    let config
    try {
      config = JSON.parse(savedConfig)
    } catch (e) {
      setErrors(prev => ({ ...prev, generate: 'API 配置无效，请重新配置' }))
      return
    }

    if (!config.apiKey || !config.apiUrl || !config.model) {
      setErrors(prev => ({ ...prev, generate: 'API 配置不完整，请在设置页面完成配置' }))
      return
    }

    setIsGenerating(true)
    try {
      let resumeContent = resume.trim()

      if (resumeFile && !resumeContent) {
        setErrors(prev => ({ ...prev, generate: '正在解析简历文件...' }))
        try {
          resumeContent = await extractTextFromFile(resumeFile)
        } catch (error) {
          throw new Error(`简历解析失败: ${error instanceof Error ? error.message : '未知错误'}`)
        }
      }

      // 步骤1：先规划题目列表
      setErrors(prev => ({ ...prev, generate: '正在规划面试题目...' }))

      const planPrompt = `Based on the job description and candidate's resume, plan 10 important interview questions for this position.

Job Position: ${finalPosition}

Job Description:
${jobDescription}

Resume:
${resumeContent}

Please respond in JSON format ONLY:
{
  "questions": [
    "question 1",
    "question 2",
    ...
  ]
}

Generate exactly 10 question titles (no detailed answers, just the question text).`

      const apiUrl = config.apiUrl.endsWith('/') ? config.apiUrl : config.apiUrl + '/'
      const endpoint = apiUrl + 'chat/completions'

      const planResponse = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify({
          model: config.model,
          messages: [{ role: 'user', content: planPrompt }],
          temperature: 0.7,
          max_tokens: 1000,
        }),
      })

      if (!planResponse.ok) {
        const error = await planResponse.json()
        throw new Error(error.error?.message || `API 返回错误: ${planResponse.status}`)
      }

      const planData = await planResponse.json()
      const planContent = planData.choices[0].message.content

      const jsonStart = planContent.indexOf('{')
      const jsonEnd = planContent.lastIndexOf('}')
      const planJson = JSON.parse(planContent.substring(jsonStart, jsonEnd + 1))
      const questionTexts = planJson.questions || []

      if (questionTexts.length === 0) {
        throw new Error('没有生成任何问题')
      }

      // 步骤2：并行生成所有批次的题目
      setErrors(prev => ({ ...prev, generate: '正在生成题目答案...' }))

      const batchSize = 2
      const batches = Math.ceil(questionTexts.length / batchSize)
      const batchPromises = []

      for (let i = 0; i < batches; i++) {
        const batchQuestions = questionTexts.slice(i * batchSize, (i + 1) * batchSize)

        const batchPrompt = `For the following interview questions, provide key points and sample answers.

Job Position: ${finalPosition}

Questions:
${batchQuestions.map((q: string, idx: number) => `${idx + 1}. ${q}`).join('\n')}

Respond in JSON format ONLY:
{
  "answers": [
    {
      "question": "question text",
      "keyPoints": ["point1", "point2", "point3"],
      "sampleAnswer": "detailed 100-150 word answer"
    }
  ]
}`

        const batchPromise = fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${config.apiKey}`,
          },
          body: JSON.stringify({
            model: config.model,
            messages: [{ role: 'user', content: batchPrompt }],
            temperature: 0.7,
            max_tokens: 2000,
          }),
        })
          .then(async (response) => {
            if (!response.ok) {
              const error = await response.json()
              throw new Error(`第 ${i + 1} 批生成失败: ${error.error?.message || response.status}`)
            }
            return response.json()
          })
          .then((data) => {
            const batchContent = data.choices[0].message.content
            const batchJsonStart = batchContent.indexOf('{')
            const batchJsonEnd = batchContent.lastIndexOf('}')
            const batchJson = JSON.parse(batchContent.substring(batchJsonStart, batchJsonEnd + 1))
            return {
              batchIndex: i,
              answers: batchJson.answers || [],
            }
          })

        batchPromises.push(batchPromise)
      }

      // 等待所有批次完成
      const results = await Promise.all(batchPromises)

      // 按顺序合并结果
      const allCards: MemoCard[] = []
      results
        .sort((a, b) => a.batchIndex - b.batchIndex)
        .forEach((result) => {
          result.answers.forEach((ans: any, idx: number) => {
            const cardIndex = result.batchIndex * batchSize + idx + 1
            allCards.push({
              id: `q${cardIndex}`,
              question: ans.question || '',
              category: 'frequency' as const,
              keywords: Array.isArray(ans.keyPoints) ? ans.keyPoints : [],
              tips: ans.sampleAnswer ? [ans.sampleAnswer] : [],
            })
          })
        })

      setMemoCards(allCards)
      setShowMemos(true)
      setErrors(prev => ({ ...prev, generate: '' }))

      // 自动保存会话
      const sessionId = currentSessionId || `session-${Date.now()}`
      const session: InterviewSession = {
        id: sessionId,
        createdAt: Date.now(),
        targetRole: finalPosition,
        jobDescription: jobDescription,
        resumeSnapshot: resumeContent,
        memoCards: allCards,
        status: 'done',
      }

      if (currentSessionId) {
        updateSession(session)
      } else {
        addSession(session)
        setCurrentSessionId(sessionId)
      }
    } catch (error) {
      console.error('Error generating memo cards:', error)
      setErrors(prev => ({
        ...prev,
        generate: error instanceof Error ? `生成失败: ${error.message}` : '生成备忘卡失败，请检查 API 配置或稍后重试'
      }))
    } finally {
      setIsGenerating(false)
    }
  }

  const handleExportMemoCards = async (format: 'docx') => {
    if (memoCards.length === 0) return

    try {
      const params = {
        position: finalPosition,
        jobDescription: jobDescription,
        cards: memoCards,
        createdAt: Date.now(),
      }

      await exportToDocx(params)
    } catch (error) {
      console.error('导出失败:', error)
      setErrors(prev => ({
        ...prev,
        export: error instanceof Error ? error.message : '导出失败'
      }))
    }
  }

  const handleResumeFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const validTypes = ['application/pdf', 'application/msword', 'text/plain',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
      if (!validTypes.includes(file.type)) {
        setErrors(prev => ({ ...prev, resumeFile: '仅支持 PDF、Word (.docx) 和纯文本格式' }))
        return
      }

      setResumeFile(file)
      setErrors(prev => ({ ...prev, resumeFile: '' }))

      if (file.type === 'application/pdf' || file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || file.type === 'text/plain') {
        setParsingFile(true)
        try {
          const text = await extractTextFromFile(file)
          if (text.trim()) {
            setResume(text)
            setErrors(prev => ({ ...prev, resumeFile: '' }))
          }
        } catch (err) {
          const errorMsg = err instanceof Error ? err.message : '文件解析失败'
          setErrors(prev => ({ ...prev, resumeFile: errorMsg }))
          console.error('文件解析错误详情:', err)
        } finally {
          setParsingFile(false)
        }
      }
    }
  }

  if (showMemos && memoCards.length > 0) {
    return (
      <MemoCardsViewer
        title="面试题目"
        position={finalPosition}
        cards={memoCards}
        onExport={handleExportMemoCards}
        onClose={() => setShowMemos(false)}
      />
    )
  }

  return (
    <div className="page-container prep-page">
      <div className="page-header">
        <span className="page-icon">📝</span>
        <div>
          <h1 className="page-title">面试准备</h1>
          <p className="page-subtitle">输入岗位信息和简历，AI 将为你生成针对性的面试题目和答案</p>
        </div>
      </div>

      <div className="prep-wrapper">
        {/* 第一步：目标岗位 */}
        <div className="prep-card">
          <div className="prep-step">
            <div className="step-badge">1</div>
            <h2 className="prep-card-title">选择目标岗位</h2>
          </div>

          <div className="position-grid">
            {COMMON_POSITIONS.map((pos) => (
              <button
                key={pos}
                type="button"
                className={`position-btn ${position === pos && !customPosition ? 'active' : ''}`}
                onClick={() => {
                  setPosition(pos)
                  setCustomPosition('')
                  setShowCustomInput(false)
                  setErrors(prev => ({ ...prev, position: '' }))
                }}
              >
                {pos}
              </button>
            ))}
          </div>

          <div className="custom-position-section">
            <button
              type="button"
              className={`custom-btn ${showCustomInput ? 'active' : ''}`}
              onClick={() => setShowCustomInput(!showCustomInput)}
            >
              {showCustomInput ? '✕ 隐藏' : '+ 自定义岗位'}
            </button>

            {showCustomInput && (
              <input
                type="text"
                className="custom-input"
                placeholder="输入自定义岗位名称，例如：机器学习工程师"
                value={customPosition}
                onChange={(e) => {
                  setCustomPosition(e.target.value)
                  setPosition('')
                  setErrors(prev => ({ ...prev, position: '' }))
                }}
              />
            )}
          </div>

          {errors.position && <p className="error-text">⚠️ {errors.position}</p>}
        </div>

        {/* 第二步：岗位描述 */}
        <div className="prep-card">
          <div className="prep-step">
            <div className="step-badge">2</div>
            <h2 className="prep-card-title">粘贴岗位描述</h2>
          </div>

          <textarea
            className="large-textarea"
            placeholder="粘贴完整的职位描述、JD 或岗位要求。越详细越好，这样生成的题目会更贴切。"
            value={jobDescription}
            onChange={(e) => {
              setJobDescription(e.target.value)
              setErrors(prev => ({ ...prev, jobDescription: '' }))
            }}
            rows={6}
          />
          <div className="char-counter">
            {jobDescription.length} / 5000 字符
          </div>
          {errors.jobDescription && <p className="error-text">⚠️ {errors.jobDescription}</p>}
        </div>

        {/* 第三步：简历 */}
        <div className="prep-card">
          <div className="prep-step">
            <div className="step-badge">3</div>
            <h2 className="prep-card-title">上传简历</h2>
          </div>

          <div className="resume-input-container">
            <h3 className="resume-subtitle">方式一：直接粘贴简历内容</h3>
            <textarea
              className="large-textarea"
              placeholder="粘贴你的简历内容。包含个人信息、工作经历、项目经验、技能等。"
              value={resume}
              onChange={(e) => {
                setResume(e.target.value)
                setErrors(prev => ({ ...prev, resume: '' }))
              }}
              rows={6}
              disabled={parsingFile}
            />
          </div>

          <div className="resume-divider">
            <span>或</span>
          </div>

          <div className="resume-file-container">
            <h3 className="resume-subtitle">方式二：上传简历文件</h3>
            <label className="file-upload-zone">
              <div className="file-upload-content">
                <div className="file-icon">
                  {parsingFile ? '⏳' : '📄'}
                </div>
                <div className="file-text">
                  <p className="file-title">
                    {parsingFile ? '正在解析文件...' : resumeFile ? resumeFile.name : '点击选择文件或拖拽上传'}
                  </p>
                  <p className="file-hint">支持 PDF、Word (.docx)、纯文本 (TXT)</p>
                </div>
              </div>
              <input
                type="file"
                accept=".pdf,.docx,.txt"
                onChange={handleResumeFile}
                disabled={parsingFile}
              />
            </label>

            {errors.resumeFile && (
              <div className="error-box">
                <p className="error-box-title">⚠️ {errors.resumeFile}</p>
                <p className="error-box-hint">💡 如果上传失败，请复制文件内容直接粘贴到上方文本框</p>
              </div>
            )}
          </div>

          {errors.resume && <p className="error-text">⚠️ {errors.resume}</p>}
        </div>

        {/* 生成按钮 */}
        <div className="generate-section">
          <button
            type="button"
            className="btn-generate"
            onClick={generateMemoCards}
            disabled={isGenerating || parsingFile}
          >
            {isGenerating ? (
              <>
                <span className="spinner">⚡</span> 生成中，请稍候...
              </>
            ) : (
              <>
                <span>✨</span> 开始生成面试题目
              </>
            )}
          </button>

          {errors.generate && (
            <div className="error-box">
              <p className="error-box-title">❌ {errors.generate}</p>
            </div>
          )}

          <div className="generate-tips">
            <p>💡 <strong>提示：</strong>生成过程中会分析你的岗位描述和简历，为你量身定制 10 道高频面试题目，包含参考答案和 STAR 框架指导。</p>
          </div>
        </div>
      </div>
    </div>
  )
}
