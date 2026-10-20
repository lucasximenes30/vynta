'use client'

import { useState } from 'react'
import * as Lucide from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface ExportModalProps {
  isOpen: boolean
  onClose: () => void
  selectedMonth: string // YYYY-MM
}

export default function ExportModal({ isOpen, onClose, selectedMonth }: ExportModalProps) {
  const [period, setPeriod] = useState<'monthly' | 'annual'>('monthly')
  const [includeExtract, setIncludeExtract] = useState(true)
  const [isExporting, setIsExporting] = useState(false)

  const handleExport = async (format: 'pdf' | 'xlsx' | 'csv') => {
    setIsExporting(true)
    try {
      const [year, month] = selectedMonth.split('-').map(Number)
      
      const res = await fetch(`/api/export?type=${period}&year=${year}&month=${month}&includeExtract=${includeExtract}`)
      if (!res.ok) throw new Error('Falha ao buscar dados para exportação')
      
      // Heavy libs (exceljs, jspdf) are only downloaded when the user actually exports
      const [data, { exportToCSV, exportToPDF, exportToXLSX }] = await Promise.all([
        res.json(),
        import('@/lib/export.service'),
      ])
      
      const fileName = `Relatorio_Vynta_${period === 'monthly' ? selectedMonth : year}`

      if (format === 'csv') {
        exportToCSV(data, fileName)
      } else if (format === 'xlsx') {
        await exportToXLSX(data, fileName)
      } else if (format === 'pdf') {
        exportToPDF(data, fileName)
      }

      onClose()
    } catch (err) {
      console.error('Erro ao exportar:', err)
      alert('Ocorreu um erro ao exportar. Tente novamente.')
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-surface-950/40 backdrop-blur-sm"
            onClick={onClose}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="w-full max-w-md overflow-hidden rounded-2xl bg-white dark:bg-surface-900 shadow-xl pointer-events-auto border border-surface-200 dark:border-surface-800"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-surface-100 dark:border-surface-800 px-6 py-4 bg-surface-50/50 dark:bg-surface-950/50">
                <h2 className="text-lg font-semibold text-surface-900 dark:text-white flex items-center gap-2">
                  <Lucide.Download className="w-5 h-5 text-brand-500" />
                  Exportar Relatório
                </h2>
                <button
                  onClick={onClose}
                  className="rounded-full p-2 text-surface-400 hover:bg-surface-200 hover:text-surface-600 dark:hover:bg-surface-800 dark:hover:text-surface-300 transition-colors"
                >
                  <Lucide.X className="w-5 h-5" />
                </button>
              </div>

              {/* Body */}
              <div className="p-6 space-y-6">
                
                {/* Period Selection */}
                <div>
                  <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-3">
                    Período
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => setPeriod('monthly')}
                      className={`flex items-center justify-center gap-2 rounded-xl border p-3 text-sm font-medium transition-all ${
                        period === 'monthly'
                          ? 'border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-900/20 dark:text-brand-300 ring-1 ring-brand-500'
                          : 'border-surface-200 dark:border-surface-700 text-surface-600 dark:text-surface-400 hover:bg-surface-50 dark:hover:bg-surface-800'
                      }`}
                    >
                      <Lucide.Calendar className="w-4 h-4" />
                      Este Mês
                    </button>
                    <button
                      onClick={() => setPeriod('annual')}
                      className={`flex items-center justify-center gap-2 rounded-xl border p-3 text-sm font-medium transition-all ${
                        period === 'annual'
                          ? 'border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-900/20 dark:text-brand-300 ring-1 ring-brand-500'
                          : 'border-surface-200 dark:border-surface-700 text-surface-600 dark:text-surface-400 hover:bg-surface-50 dark:hover:bg-surface-800'
                      }`}
                    >
                      <Lucide.CalendarDays className="w-4 h-4" />
                      Ano Todo
                    </button>
                  </div>
                </div>

                {/* Extract Checkbox */}
                <div>
                  <label className="flex items-center gap-3 p-3 rounded-xl border border-surface-200 dark:border-surface-700 cursor-pointer hover:bg-surface-50 dark:hover:bg-surface-800/50 transition-colors">
                    <div className="relative flex items-center">
                      <input
                        type="checkbox"
                        checked={includeExtract}
                        onChange={(e) => setIncludeExtract(e.target.checked)}
                        className="peer h-5 w-5 cursor-pointer appearance-none rounded border-2 border-surface-300 checked:border-brand-500 checked:bg-brand-500 transition-all dark:border-surface-600"
                      />
                      <Lucide.Check className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white opacity-0 peer-checked:opacity-100 pointer-events-none" strokeWidth={3} />
                    </div>
                    <div>
                      <span className="text-sm font-medium text-surface-900 dark:text-white block">
                        Incluir Extrato Detalhado
                      </span>
                      <span className="text-xs text-surface-500 dark:text-surface-400">
                        Histórico completo de receitas e despesas
                      </span>
                    </div>
                  </label>
                </div>

                {/* Formats */}
                <div>
                  <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-3">
                    Formato de Exportação
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    <button
                      onClick={() => handleExport('pdf')}
                      disabled={isExporting}
                      className="flex flex-col items-center justify-center gap-2 rounded-xl border border-surface-200 dark:border-surface-700 p-4 text-surface-600 dark:text-surface-400 hover:border-red-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10 dark:hover:text-red-400 dark:hover:border-red-500/50 transition-all disabled:opacity-50"
                    >
                      <Lucide.FileText className="w-6 h-6" />
                      <span className="text-xs font-semibold">PDF</span>
                    </button>
                    <button
                      onClick={() => handleExport('xlsx')}
                      disabled={isExporting}
                      className="flex flex-col items-center justify-center gap-2 rounded-xl border border-surface-200 dark:border-surface-700 p-4 text-surface-600 dark:text-surface-400 hover:border-green-500 hover:bg-green-50 hover:text-green-600 dark:hover:bg-green-500/10 dark:hover:text-green-400 dark:hover:border-green-500/50 transition-all disabled:opacity-50"
                    >
                      <Lucide.FileSpreadsheet className="w-6 h-6" />
                      <span className="text-xs font-semibold">XLSX</span>
                    </button>
                    <button
                      onClick={() => handleExport('csv')}
                      disabled={isExporting}
                      className="flex flex-col items-center justify-center gap-2 rounded-xl border border-surface-200 dark:border-surface-700 p-4 text-surface-600 dark:text-surface-400 hover:border-surface-400 hover:bg-surface-100 hover:text-surface-900 dark:hover:bg-surface-800 dark:hover:text-white transition-all disabled:opacity-50"
                    >
                      <Lucide.Table className="w-6 h-6" />
                      <span className="text-xs font-semibold">CSV</span>
                    </button>
                  </div>
                  {isExporting && (
                    <p className="text-xs text-center text-surface-500 mt-4 animate-pulse">
                      Gerando arquivo, aguarde...
                    </p>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  )
}
