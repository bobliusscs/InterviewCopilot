/**
 * 面试题目导出工具
 * 支持 Word (DOCX) 格式
 */
// @ts-nocheck - pdfkit has incomplete type definitions

import { MemoCard } from '@shared/types'

interface ExportParams {
  position: string
  jobDescription: string
  cards: MemoCard[]
  createdAt?: number
}

/**
 * 导出为 DOCX 格式
 */
export async function exportToDocx(params: ExportParams): Promise<void> {
  try {
    const { Document, Packer, Paragraph, TextRun, HeadingLevel, convertInchesToTwip } = await import('docx')

    const { position, jobDescription, cards, createdAt } = params

    // 构建文档内容
    const sections: any[] = []

    // 标题
    sections.push(
      new Paragraph({
        text: `${position} - 面试题目与答案`,
        heading: HeadingLevel.HEADING_1,
        alignment: 'center',
        spacing: { after: 200 },
      })
    )

    // 基础信息
    sections.push(
      new Paragraph({
        text: '基础信息',
        heading: HeadingLevel.HEADING_2,
        spacing: { after: 100 },
      }),
      new Paragraph({
        text: `岗位：${position}`,
        spacing: { after: 50 },
      }),
      new Paragraph({
        text: `生成时间：${new Date(createdAt || Date.now()).toLocaleString('zh-CN')}`,
        spacing: { after: 200 },
      })
    )

    // 岗位描述
    if (jobDescription) {
      sections.push(
        new Paragraph({
          text: '岗位描述',
          heading: HeadingLevel.HEADING_2,
          spacing: { after: 100 },
        }),
        new Paragraph({
          text: jobDescription,
          spacing: { after: 200 },
        })
      )
    }

    // 题目
    cards.forEach((card, i) => {
      sections.push(
        new Paragraph({
          text: `第 ${i + 1} 题：${card.question}`,
          heading: HeadingLevel.HEADING_3,
          spacing: { after: 100 },
        })
      )

      if (card.keywords && card.keywords.length > 0) {
        sections.push(
          new Paragraph({
            children: [
              new TextRun({
                text: '关键要点：',
                bold: true,
              }),
            ],
            spacing: { after: 50 },
          })
        )
        card.keywords.forEach(kw => {
          sections.push(
            new Paragraph({
              text: kw,
              spacing: { before: 0, after: 30 },
              indent: { left: convertInchesToTwip(0.25) },
            })
          )
        })
        sections.push(new Paragraph({ text: '', spacing: { after: 50 } }))
      }

      if (card.tips && card.tips.length > 0) {
        sections.push(
          new Paragraph({
            children: [
              new TextRun({
                text: '参考答案：',
                bold: true,
              }),
            ],
            spacing: { after: 50 },
          }),
          new Paragraph({
            text: card.tips[0],
            spacing: { after: 100 },
            indent: { left: convertInchesToTwip(0.25) },
          })
        )
      }

      if (card.starFramework) {
        const sf = card.starFramework
        if (sf.situation || sf.task || sf.action || sf.result) {
          sections.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: 'STAR 框架：',
                  bold: true,
                }),
              ],
              spacing: { after: 50 },
            })
          )
          if (sf.situation) {
            sections.push(
              new Paragraph({
                text: `情景 (S)：${sf.situation}`,
                spacing: { after: 30 },
                indent: { left: convertInchesToTwip(0.25) },
              })
            )
          }
          if (sf.task) {
            sections.push(
              new Paragraph({
                text: `任务 (T)：${sf.task}`,
                spacing: { after: 30 },
                indent: { left: convertInchesToTwip(0.25) },
              })
            )
          }
          if (sf.action) {
            sections.push(
              new Paragraph({
                text: `行动 (A)：${sf.action}`,
                spacing: { after: 30 },
                indent: { left: convertInchesToTwip(0.25) },
              })
            )
          }
          if (sf.result) {
            sections.push(
              new Paragraph({
                text: `结果 (R)：${sf.result}`,
                spacing: { after: 100 },
                indent: { left: convertInchesToTwip(0.25) },
              })
            )
          }
        }
      }

      sections.push(new Paragraph({ text: '', spacing: { after: 100 } }))
    })

    // 创建文档
    const doc = new Document({
      sections: [
        {
          children: sections,
        },
      ],
    })

    // 导出
    const blob = await Packer.toBlob(doc)
    downloadFile(blob, `${position}_面试题目_${Date.now()}.docx`)
  } catch (error) {
    console.error('DOCX 导出失败:', error)
    alert('DOCX 导出失败，请重试')
  }
}

/**
 * 通用下载函数
 */
function downloadFile(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
