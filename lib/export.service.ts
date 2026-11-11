import { saveAs } from 'file-saver'
import ExcelJS from 'exceljs'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { localizeCategoryName } from './categories'
import { csvRow } from './csv'

interface ExportData {
  summary: { income: number; expense: number; balance: number }
  extract: Array<{
    id: string
    title: string
    date: string
    type: 'INCOME' | 'EXPENSE'
    amount: number
    category: string
    paymentMethod: string | null
  }>
  period: { type: string; year: number; month: number | null }
  goals?: Array<{
    id: string
    title: string
    targetAmount: string | number
    currentAmount: string | number
    category: string | null
    transactions: Array<{
      id: string
      amount: string | number
      type: string
      date: string
      description: string | null
    }>
  }>
}

const formatCurrency = (val: number) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)
}

const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleDateString('pt-BR')
}

const getPeriodTitle = (data: ExportData) => {
  if (data.period.type === 'monthly') {
    const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']
    return `${months[data.period.month! - 1]} de ${data.period.year}`
  }
  return `Ano de ${data.period.year}`
}

export const exportToCSV = (data: ExportData, fileName: string) => {
  const headers = ['Data', 'Título', 'Categoria', 'Tipo', 'Valor']
  let csvContent = csvRow(headers)

  data.extract.forEach(item => {
    const row = [
      formatDate(item.date),
      item.title,
      localizeCategoryName(item.category),
      item.type === 'INCOME' ? 'Receita' : 'Despesa',
      item.amount.toString().replace('.', ',') // simple format for generic CSV
    ]
    csvContent += csvRow(row)
  })

  // Add summary at the bottom
  csvContent += '\r\n' + csvRow(['Resumo'])
  csvContent += csvRow(['Receitas', formatCurrency(data.summary.income)])
  csvContent += csvRow(['Despesas', formatCurrency(data.summary.expense)])
  csvContent += csvRow(['Saldo', formatCurrency(data.summary.balance)])

  if (data.goals && data.goals.length > 0) {
    csvContent += '\r\n' + csvRow(['Metas e Caixinhas'])
    csvContent += csvRow(['Título', 'Categoria', 'Acumulado', 'Objetivo'])
    data.goals.forEach(g => {
      csvContent += csvRow([g.title, g.category || 'Geral', formatCurrency(Number(g.currentAmount)), formatCurrency(Number(g.targetAmount))])
    })
  }

  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' })
  saveAs(blob, `${fileName}.csv`)
}

export const exportToXLSX = async (data: ExportData, fileName: string) => {
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'Vynta'
  workbook.created = new Date()

  // Sheet 1: Resumo
  const summarySheet = workbook.addWorksheet('Resumo Financeiro', {
    views: [{ showGridLines: false }]
  })

  summarySheet.getColumn('A').width = 25
  summarySheet.getColumn('B').width = 20

  summarySheet.getCell('A1').value = 'Resumo Financeiro'
  summarySheet.getCell('A1').font = { size: 16, bold: true, color: { argb: 'FFFFFFFF' } }
  summarySheet.getCell('A1').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF3040EB' } } // Vynta brand color
  summarySheet.mergeCells('A1:B1')

  summarySheet.getCell('A2').value = `Período: ${getPeriodTitle(data)}`
  summarySheet.getCell('A2').font = { italic: true }
  summarySheet.mergeCells('A2:B2')

  summarySheet.getCell('A4').value = 'Receitas'
  summarySheet.getCell('B4').value = data.summary.income
  summarySheet.getCell('B4').numFmt = 'R$ #,##0.00'
  summarySheet.getCell('B4').font = { color: { argb: 'FF22C55E' }, bold: true } // Green

  summarySheet.getCell('A5').value = 'Despesas'
  summarySheet.getCell('B5').value = -data.summary.expense // Show as negative
  summarySheet.getCell('B5').numFmt = 'R$ #,##0.00'
  summarySheet.getCell('B5').font = { color: { argb: 'FFF43F5E' }, bold: true } // Red

  summarySheet.getCell('A6').value = 'Saldo'
  summarySheet.getCell('A6').font = { bold: true }
  summarySheet.getCell('B6').value = data.summary.balance
  summarySheet.getCell('B6').numFmt = 'R$ #,##0.00'
  summarySheet.getCell('B6').font = { bold: true, color: { argb: data.summary.balance >= 0 ? 'FF22C55E' : 'FFF43F5E' } }

  // Sheet 2: Extrato (If included)
  if (data.extract.length > 0) {
    const extractSheet = workbook.addWorksheet('Extrato', {
      views: [{ state: 'frozen', ySplit: 1 }]
    })

    extractSheet.columns = [
      { header: 'Data', key: 'date', width: 15 },
      { header: 'Título', key: 'title', width: 35 },
      { header: 'Categoria', key: 'category', width: 20 },
      { header: 'Tipo', key: 'type', width: 15 },
      { header: 'Valor', key: 'amount', width: 15 }
    ]

    extractSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } }
    extractSheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } }

    data.extract.forEach(item => {
      const row = extractSheet.addRow({
        date: formatDate(item.date),
        title: item.title,
        category: localizeCategoryName(item.category),
        type: item.type === 'INCOME' ? 'Receita' : 'Despesa',
        amount: item.type === 'INCOME' ? item.amount : -item.amount
      })
      
      const amountCell = row.getCell('amount')
      amountCell.numFmt = 'R$ #,##0.00'
      amountCell.font = { color: { argb: item.type === 'INCOME' ? 'FF22C55E' : 'FFF43F5E' } }
    })
  }

  if (data.goals && data.goals.length > 0) {
    const goalsSheet = workbook.addWorksheet('Metas', {
      views: [{ state: 'frozen', ySplit: 1 }]
    })

    goalsSheet.columns = [
      { header: 'Título', key: 'title', width: 30 },
      { header: 'Categoria', key: 'category', width: 20 },
      { header: 'Acumulado', key: 'current', width: 15 },
      { header: 'Objetivo', key: 'target', width: 15 },
      { header: 'Progresso', key: 'progress', width: 15 }
    ]

    goalsSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } }
    goalsSheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } }

    data.goals.forEach(g => {
      const current = Number(g.currentAmount)
      const target = Number(g.targetAmount)
      const progress = target > 0 ? (current / target) : 0
      
      const row = goalsSheet.addRow({
        title: g.title,
        category: g.category || 'Geral',
        current: current,
        target: target,
        progress: progress
      })
      
      row.getCell('current').numFmt = 'R$ #,##0.00'
      row.getCell('target').numFmt = 'R$ #,##0.00'
      row.getCell('progress').numFmt = '0.0%'
    })
  }

  const buffer = await workbook.xlsx.writeBuffer()
  saveAs(new Blob([buffer]), `${fileName}.xlsx`)
}

export const exportToPDF = (data: ExportData, fileName: string) => {
  const doc = new jsPDF()
  const period = getPeriodTitle(data)

  // Vynta Header Background
  doc.setFillColor(15, 23, 42) // Very dark blue/slate (surface-950)
  doc.rect(0, 0, 210, 60, 'F')

  // Vynta Logo / Title
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(28)
  doc.setFont('helvetica', 'bold')
  doc.text('VYNTA', 14, 25)

  // Report Title & Period
  doc.setFontSize(14)
  doc.setFont('helvetica', 'normal')
  doc.text('Relatório Financeiro', 14, 38)
  
  doc.setFontSize(11)
  doc.setTextColor(148, 163, 184) // slate-400
  doc.text(`Período: ${period}`, 14, 46)

  // Summary Cards (Drawn as rectangles)
  const drawCard = (x: number, y: number, title: string, value: string, color: number[]) => {
    doc.setFillColor(30, 41, 59) // surface-800
    doc.roundedRect(x, y, 55, 25, 3, 3, 'F')
    
    doc.setTextColor(148, 163, 184)
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.text(title.toUpperCase(), x + 5, y + 8)

    doc.setTextColor(color[0], color[1], color[2])
    doc.setFontSize(12)
    doc.text(value, x + 5, y + 18)
  }

  const incomeColor = [34, 197, 94] // emerald-500
  const expenseColor = [244, 63, 94] // rose-500
  const balanceColor = data.summary.balance >= 0 ? incomeColor : expenseColor

  // Draw Summary Cards
  drawCard(14, 65, 'Receitas', `+${formatCurrency(data.summary.income)}`, incomeColor)
  drawCard(74, 65, 'Despesas', `-${formatCurrency(data.summary.expense)}`, expenseColor)
  drawCard(134, 65, 'Saldo', formatCurrency(data.summary.balance), balanceColor)

  let startY = 105

  // Extract Table
  if (data.extract.length > 0) {
    doc.setTextColor(15, 23, 42)
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text('Extrato de Transações', 14, 100)

    const tableBody = data.extract.map(item => [
      formatDate(item.date),
      item.title,
      localizeCategoryName(item.category),
      item.type === 'INCOME' ? 'Receita' : 'Despesa',
      formatCurrency(item.amount)
    ])

    autoTable(doc, {
      startY,
      head: [['Data', 'Título', 'Categoria', 'Tipo', 'Valor']],
      body: tableBody,
      theme: 'grid',
      headStyles: { fillColor: [30, 41, 59], textColor: 255, fontStyle: 'bold' },
      bodyStyles: { textColor: [51, 65, 85] },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      didParseCell: function (data) {
        if (data.section === 'body' && data.column.index === 4) {
          // Colorize the amount cell
          const rowData = data.row.raw as any[]
          if (rowData[3] === 'Receita') {
            data.cell.styles.textColor = [34, 197, 94]
            data.cell.styles.fontStyle = 'bold'
          } else {
            data.cell.styles.textColor = [244, 63, 94]
            data.cell.text = [`-${data.cell.text[0]}`]
            data.cell.styles.fontStyle = 'bold'
          }
        }
      }
    })
  }

  if (data.goals && data.goals.length > 0) {
    // Adiciona uma nova página se já houver tabelas antes, ou ajusta o startY
    if (data.extract.length > 0) {
      doc.addPage()
    }
    
    doc.setTextColor(15, 23, 42)
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text('Metas e Caixinhas', 14, 20)
    
    const goalsBody = data.goals.map(g => {
      const current = Number(g.currentAmount)
      const target = Number(g.targetAmount)
      const progress = target > 0 ? ((current / target) * 100).toFixed(1) + '%' : '0%'
      return [
        g.title,
        g.category || 'Geral',
        formatCurrency(current),
        formatCurrency(target),
        progress
      ]
    })
    
    autoTable(doc, {
      startY: 25,
      head: [['Título', 'Categoria', 'Acumulado', 'Objetivo', 'Progresso']],
      body: goalsBody,
      theme: 'grid',
      headStyles: { fillColor: [30, 41, 59], textColor: 255, fontStyle: 'bold' },
      bodyStyles: { textColor: [51, 65, 85] },
      alternateRowStyles: { fillColor: [248, 250, 252] },
    })
  }

  doc.save(`${fileName}.pdf`)
}
