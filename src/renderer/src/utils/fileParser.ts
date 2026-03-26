/**
 * 简历文件解析工具
 * 支持 Word (.docx)、纯文本格式
 * PDF 通过 Electron IPC 在主进程处理
 */

/**
 * 从 PDF 文件提取文本（使用 Electron IPC）
 */
export async function extractTextFromPDF(file: File): Promise<string> {
  try {
    // 检查是否在 Electron 环境中
    if (!window.electronAPI?.file?.parsePdf) {
      throw new Error(
        '浏览器环境不支持 PDF 解析。请转换为 Word 或纯文本格式后重试'
      )
    }

    const arrayBuffer = await file.arrayBuffer()
    const result = await window.electronAPI.file.parsePdf(arrayBuffer)

    if (!result.success) {
      throw new Error(result.error || 'PDF 解析失败')
    }

    if (!result.text?.trim()) {
      throw new Error('PDF 文件中没有可提取的文本（可能是扫描件或加密文件）')
    }

    return result.text.trim()
  } catch (error) {
    console.error('PDF 解析错误:', error)
    const errorMsg = error instanceof Error ? error.message : '未知错误'
    throw new Error(`PDF 文件解析失败: ${errorMsg}`)
  }
}

/**
 * 从 Word 文档 (.docx) 提取文本
 */
export async function extractTextFromWord(file: File): Promise<string> {
  try {
    const mammoth = (await import('mammoth')).default
    const arrayBuffer = await file.arrayBuffer()
    const result = await mammoth.extractRawText({ arrayBuffer })

    const trimmedText = result.value.trim()
    if (!trimmedText) {
      throw new Error('未能从 Word 文件中提取任何文本')
    }

    return trimmedText
  } catch (error) {
    console.error('Word 解析错误:', error)
    const errorMsg = error instanceof Error ? error.message : '未知错误'
    throw new Error(`Word 文件解析失败: ${errorMsg}`)
  }
}

/**
 * 从纯文本文件提取文本
 */
export async function extractTextFromPlainText(file: File): Promise<string> {
  try {
    const text = await file.text()

    const trimmedText = text.trim()
    if (!trimmedText) {
      throw new Error('文本文件为空')
    }

    return trimmedText
  } catch (error) {
    console.error('文本文件解析错误:', error)
    throw new Error('文本文件解析失败')
  }
}

/**
 * 根据文件类型自动选择解析方法
 */
export async function extractTextFromFile(file: File): Promise<string> {
  const type = file.type.toLowerCase()
  const name = file.name.toLowerCase()

  // PDF 文件
  if (type === 'application/pdf' || name.endsWith('.pdf')) {
    return extractTextFromPDF(file)
  }

  // Word 文件 (.docx)
  if (
    type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    name.endsWith('.docx')
  ) {
    return extractTextFromWord(file)
  }

  // 旧版 Word 文件 (.doc)
  if (type === 'application/msword' || name.endsWith('.doc')) {
    throw new Error('不支持 .doc 格式，请先转换为 .docx 格式')
  }

  // 纯文本文件
  if (type === 'text/plain' || name.endsWith('.txt')) {
    return extractTextFromPlainText(file)
  }

  // 未知格式
  throw new Error(`不支持的文件格式: ${type || '未知'}`)
}
