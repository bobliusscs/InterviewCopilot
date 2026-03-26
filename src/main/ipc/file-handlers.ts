import { ipcMain, shell } from 'electron'
import { unlink, readFile } from 'fs/promises'

// 打开文件（用系统默认应用播放）
ipcMain.handle('file:open-file', async (_event, filePath: string) => {
  try {
    if (!filePath) {
      throw new Error('文件路径不能为空')
    }

    await shell.openPath(filePath)
    console.log('[File] Opened:', filePath)
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : '未知错误'
    console.error('[File] Failed to open:', errorMsg)
    throw new Error(`打开文件失败: ${errorMsg}`)
  }
})

// 读取文件内容（用于播放音频）
ipcMain.handle('file:read-file', async (_event, filePath: string) => {
  try {
    if (!filePath) {
      throw new Error('文件路径不能为空')
    }

    const buffer = await readFile(filePath)
    // 返回 base64 编码的内容
    return {
      success: true,
      data: buffer.toString('base64'),
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : '未知错误'
    console.error('[File] Failed to read:', errorMsg)
    throw new Error(`读取文件失败: ${errorMsg}`)
  }
})

// PDF 解析处理器 - 使用 pdfjs-dist
ipcMain.handle('file:parse-pdf', async (_event, arrayBuffer: ArrayBuffer) => {
  try {
    // 动态导入 pdfjs-dist
    const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs')
    const pdfjs = pdfjsLib.default || pdfjsLib

    const buffer = Buffer.from(arrayBuffer)
    const uint8Array = new Uint8Array(buffer)

    // 使用 pdfjs 的 getDocument 方法
    const loadingTask = pdfjs.getDocument({ data: uint8Array })
    const pdf = await loadingTask.promise

    if (!pdf || pdf.numPages === 0) {
      throw new Error('PDF 文件不包含任何页面')
    }

    let text = ''
    let pageCount = 0

    // 遍历所有页面
    for (let i = 1; i <= pdf.numPages; i++) {
      try {
        const page = await pdf.getPage(i)
        const textContent = await page.getTextContent()

        const pageText = textContent.items
          .map((item: any) => {
            if (typeof item.str === 'string') {
              return item.str
            }
            return ''
          })
          .join(' ')

        if (pageText.trim()) {
          text += pageText + '\n'
          pageCount++
        }
      } catch (pageError) {
        console.warn(`Page ${i} extraction failed`, pageError)
        // 继续处理下一页
      }
    }

    const trimmedText = text.trim()

    if (!trimmedText || pageCount === 0) {
      throw new Error(
        'PDF 中没有可提取的文本。可能的原因：1) PDF 是扫描件 2) PDF 已加密 3) 文件损坏'
      )
    }

    return {
      success: true,
      text: trimmedText,
      pages: pdf.numPages,
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : '未知错误'
    console.error('PDF 解析错误:', errorMsg)
    return {
      success: false,
      error: `PDF 解析失败: ${errorMsg}`,
    }
  }
})

// Word 文档解析处理器（可选，因为 mammoth 已经在前端处理）
ipcMain.handle('file:parse-word', async (_event, _arrayBuffer: ArrayBuffer) => {
  // Word 解析已由前端 mammoth 处理，这里仅作备选
  return {
    success: false,
    error: 'Word 解析请在前端处理',
  }
})

// 删除文件处理器
ipcMain.handle('file:delete-file', async (_event, filePath: string) => {
  try {
    if (!filePath) {
      throw new Error('文件路径不能为空')
    }

    // 删除文件
    await unlink(filePath)
    console.log('[File] Deleted:', filePath)
    return { success: true }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : '未知错误'
    console.error('[File] Failed to delete:', errorMsg)
    throw new Error(`删除文件失败: ${errorMsg}`)
  }
})


