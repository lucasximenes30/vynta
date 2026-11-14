'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import * as Lucide from 'lucide-react'
import {
  format,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  isSameMonth,
  isSameDay,
  addDays,
} from 'date-fns'
import { ptBR } from 'date-fns/locale'
import EventModal from './EventModal'
import MobileEventModal from './MobileEventModal'

type CalendarEvent = {
  id: string
  title: string
  description?: string
  date: string
  startTime?: string
  endTime?: string
  isAllDay: boolean
  category?: string
  color: string
}

export default function CalendarClient() {
  const router = useRouter()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)

  const fetchEvents = async () => {
    try {
      setLoading(true)
      const start = startOfWeek(startOfMonth(currentDate)).toISOString()
      const end = endOfWeek(endOfMonth(currentDate)).toISOString()
      
      const res = await fetch(`/api/calendar/events?start=${start}&end=${end}`)
      if (res.ok) {
        const data = await res.json()
        setEvents(data.events)
      }
    } catch (error) {
      console.error('Failed to fetch events:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchEvents()
  }, [currentDate])

  const handlePrevMonth = () => setCurrentDate(subMonths(currentDate, 1))
  const handleNextMonth = () => setCurrentDate(addMonths(currentDate, 1))
  const handleToday = () => {
    setCurrentDate(new Date())
    setSelectedDate(new Date())
  }

  const handleDayClick = (day: Date) => {
    setSelectedDate(day)
  }

  const handleOpenModal = (event?: CalendarEvent) => {
    setSelectedEvent(event || null)
    setIsModalOpen(true)
  }

  const handleCloseModal = (shouldRefresh = false) => {
    setIsModalOpen(false)
    setSelectedEvent(null)
    if (shouldRefresh) {
      fetchEvents()
    }
  }

  const renderHeader = () => {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <h3 className="font-display text-lg sm:text-xl font-bold capitalize">
          {format(currentDate, 'MMMM yyyy', { locale: ptBR })}
        </h3>
        <div className="flex shrink-0 gap-2">
          <button
            onClick={handleToday}
            className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-surface-100 text-surface-700 hover:bg-surface-200 dark:bg-surface-800 dark:text-surface-300 dark:hover:bg-surface-700 transition-colors"
          >
            Hoje
          </button>
          <div className="flex gap-1">
            <button 
              aria-label="Mês anterior"
              onClick={handlePrevMonth}
              className="p-1.5 rounded-lg border border-surface-200 dark:border-surface-700 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
            >
              <Lucide.ChevronLeft className="w-4 h-4" />
            </button>
            <button 
              aria-label="Próximo mês"
              onClick={handleNextMonth}
              className="p-1.5 rounded-lg border border-surface-200 dark:border-surface-700 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
            >
              <Lucide.ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    )
  }

  const renderDays = () => {
    const days = []
    const dateFormat = 'EEEE'
    let startDate = startOfWeek(currentDate)

    for (let i = 0; i < 7; i++) {
      days.push(
        <div key={i} className="py-2 text-center text-[10px] sm:text-xs font-bold text-surface-400 uppercase tracking-wider">
          {format(addDays(startDate, i), dateFormat, { locale: ptBR }).substring(0, 3)}
        </div>
      )
    }
    return <div className="grid min-w-0 grid-cols-7 gap-1 mb-2">{days}</div>
  }

  const renderCells = () => {
    const monthStart = startOfMonth(currentDate)
    const monthEnd = endOfMonth(monthStart)
    const startDate = startOfWeek(monthStart)
    const endDate = endOfWeek(monthEnd)

    const dateFormat = 'd'
    const rows = []
    let days = []
    let day = startDate
    let formattedDate = ''

    while (day <= endDate) {
      for (let i = 0; i < 7; i++) {
        formattedDate = format(day, dateFormat)
        const cloneDay = day
        const isSelected = isSameDay(day, selectedDate)
        const isCurrentMonth = isSameMonth(day, monthStart)
        const isToday = isSameDay(day, new Date())
        
        // Find events for this day
        const dayEvents = events.filter(e => e.date.substring(0, 10) === format(cloneDay, 'yyyy-MM-dd'))

        days.push(
          <div
            key={day.toString()}
            onClick={() => handleDayClick(cloneDay)}
            className={`min-w-0 min-h-[3.5rem] sm:min-h-[5rem] p-1 sm:p-2 rounded-xl border flex flex-col items-start transition-all cursor-pointer group ${
              !isCurrentMonth
                ? 'opacity-40 border-transparent pointer-events-none'
                : isSelected
                ? 'border-brand-500 bg-brand-500/10 shadow-sm shadow-brand-500/20 z-10'
                : 'border-surface-100 dark:border-surface-800 bg-white dark:bg-surface-900 hover:bg-surface-50 dark:hover:bg-surface-800/80 hover:border-brand-500/30'
            }`}
          >
            <div className="w-full min-w-0 flex flex-col sm:flex-row sm:justify-between items-start">
              <span className={`text-xs sm:text-sm font-semibold flex items-center justify-center w-6 h-6 rounded-full ${
                isToday ? 'bg-brand-500 text-white shadow-md shadow-brand-500/30' : 
                isSelected ? 'text-brand-600 dark:text-brand-400' : 'text-surface-700 dark:text-surface-300'
              }`}>
                {formattedDate}
              </span>
              
              {/* Event Indicators (dots) on very small screens */}
              <div className="flex sm:hidden flex-wrap gap-0.5 mt-1 px-0.5">
                {dayEvents.slice(0, 3).map((e, idx) => (
                  <div key={idx} className={`w-1 h-1 shrink-0 rounded-full ${e.color}`} />
                ))}
              </div>
            </div>

            {/* Event list (visible on desktop/larger screens) */}
            <div className="hidden sm:flex flex-col gap-1 w-full mt-1 flex-1 overflow-hidden">
              {dayEvents.slice(0, 3).map((e, idx) => (
                <div key={idx} className={`w-full px-1.5 py-0.5 text-[10px] font-semibold truncate rounded-md text-white ${e.color}`}>
                  {e.startTime ? `${e.startTime} ` : ''}{e.title}
                </div>
              ))}
              {dayEvents.length > 3 && (
                <div className="text-[10px] text-surface-400 font-semibold pl-1">
                  +{dayEvents.length - 3} mais
                </div>
              )}
            </div>
          </div>
        )
        day = addDays(day, 1)
      }
      rows.push(
        <div className="grid min-w-0 grid-cols-7 gap-1 sm:gap-2 mb-1 sm:mb-2" key={day.toString()}>
          {days}
        </div>
      )
      days = []
    }
    return <div>{rows}</div>
  }

  // Selected Day Events
  const selectedDayEvents = events.filter(e => e.date.substring(0, 10) === format(selectedDate, 'yyyy-MM-dd')).sort((a, b) => {
    if (a.isAllDay) return -1
    if (b.isAllDay) return 1
    return (a.startTime || '00:00').localeCompare(b.startTime || '00:00')
  })

  return (
    <div className="min-h-screen w-full min-w-0 bg-surface-50 dark:bg-surface-950 text-surface-900 dark:text-surface-100 transition-colors duration-300 animate-dashboard-fade">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-surface-200/80 bg-white/80 dark:bg-surface-900/80 backdrop-blur-md dark:border-surface-800/80 transition-colors duration-300">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/dashboard')}
              className="flex h-9 w-9 items-center justify-center rounded-xl text-surface-500 hover:bg-surface-100 hover:text-surface-700 dark:text-surface-400 dark:hover:bg-surface-800 dark:hover:text-surface-200 transition-all duration-200"
              title="Voltar ao Dashboard"
            >
              <Lucide.ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="font-display text-base font-semibold tracking-tight">Agenda</h1>
          </div>
          <button
            aria-label="Novo evento"
            onClick={() => handleOpenModal()}
            className="btn-primary py-1.5 px-4 h-9 gap-1.5"
          >
            <Lucide.Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Novo Evento</span>
          </button>
        </div>
      </header>

      <main className="mx-auto w-full min-w-0 max-w-7xl px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        {/* Title */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Agenda & Compromissos</h1>
            <p className="text-sm text-surface-500 dark:text-surface-400 mt-1">
              Organize seus eventos, metas e rotina em um só lugar.
            </p>
          </div>
        </div>

        <div className="grid min-w-0 grid-cols-1 gap-5 lg:grid-cols-12 items-start">
          {/* Calendar Grid */}
          <div className="card min-w-0 p-3 sm:p-5 lg:col-span-8 relative overflow-hidden bg-white/60 dark:bg-surface-900/60 backdrop-blur-sm border-surface-200/50 dark:border-surface-700/50">
            <div className="absolute inset-0 bg-gradient-to-br from-brand-500/5 via-transparent to-brand-900/5 pointer-events-none" />
            <div className="relative">
              {renderHeader()}
              {renderDays()}
              {loading ? (
                <div className="h-64 flex items-center justify-center">
                  <div className="w-8 h-8 border-4 border-brand-500/30 border-t-brand-500 rounded-full animate-spin" />
                </div>
              ) : (
                renderCells()
              )}
            </div>
          </div>

          {/* Sidebar Day Details */}
          <div className="min-w-0 lg:col-span-4 flex flex-col gap-4 lg:sticky lg:top-24">
            <div className="card min-w-0 flex-1 min-h-[240px] sm:min-h-[400px] border-surface-200/50 dark:border-surface-700/50 shadow-lg shadow-brand-500/5">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-5 pb-4 border-b border-surface-100 dark:border-surface-800">
                <h3 className="font-display text-base font-semibold flex items-center gap-2">
                  <span className={`flex items-center justify-center w-8 h-8 rounded-full ${isSameDay(selectedDate, new Date()) ? 'bg-brand-500 text-white shadow-md shadow-brand-500/20' : 'bg-surface-100 dark:bg-surface-800 text-surface-700 dark:text-surface-300'}`}>
                    {format(selectedDate, 'd')}
                  </span>
                  <div className="flex flex-col">
                    <span className="text-sm capitalize">{format(selectedDate, 'EEEE', { locale: ptBR })}</span>
                    <span className="text-[10px] text-surface-400 uppercase tracking-wider">{format(selectedDate, 'MMMM yyyy', { locale: ptBR })}</span>
                  </div>
                </h3>
                <button 
                  aria-label="Novo evento"
                  onClick={() => handleOpenModal()}
                  className="p-2 rounded-lg bg-brand-50 dark:bg-brand-500/10 text-brand-600 dark:text-brand-400 hover:bg-brand-100 dark:hover:bg-brand-500/20 transition-colors"
                >
                  <Lucide.Plus className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3">
                {selectedDayEvents.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center group">
                    <div className="w-16 h-16 rounded-[1.25rem] bg-surface-100 dark:bg-surface-800/50 border border-surface-200 dark:border-surface-700/50 flex items-center justify-center mb-4 shadow-sm group-hover:rotate-3 transition-transform duration-300">
                      <Lucide.CalendarX2 strokeWidth={1.5} className="w-8 h-8 text-surface-400 dark:text-surface-500" />
                    </div>
                    <p className="text-base font-semibold text-surface-900 dark:text-white mb-2">Sem eventos hoje</p>
                    <p className="text-xs text-surface-500 dark:text-surface-400 max-w-[200px] leading-relaxed mb-6">
                      Adicione um compromisso para organizar sua semana.
                    </p>
                    <button
                      aria-label="Novo evento"
                      onClick={() => handleOpenModal()}
                      className="btn-primary py-2 px-6 text-xs font-semibold"
                    >
                      Criar evento
                    </button>
                  </div>
                ) : (
                  selectedDayEvents.map((e) => (
                    <div 
                      key={e.id}
                      onClick={() => handleOpenModal(e)}
                      className="group flex min-w-0 gap-2 p-3 rounded-xl bg-surface-50 dark:bg-surface-800/40 border border-surface-100 dark:border-surface-800/80 transition-all hover:border-brand-500/30 hover:shadow-md cursor-pointer"
                    >
                      <div className="flex shrink-0 flex-col items-center w-11">
                        <span className="text-xs font-bold text-surface-700 dark:text-surface-200">
                          {e.isAllDay ? 'Dia todo' : e.startTime || '--:--'}
                        </span>
                        {e.endTime && !e.isAllDay && (
                          <span className="text-[10px] text-surface-400 mt-0.5">{e.endTime}</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate text-surface-900 dark:text-surface-100 group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">{e.title}</p>
                        {e.description && (
                          <p className="text-xs text-surface-500 dark:text-surface-400 line-clamp-1 mt-0.5">{e.description}</p>
                        )}
                        {e.category && (
                          <span className="inline-block max-w-full truncate px-2 py-0.5 text-[10px] font-medium rounded bg-surface-200/50 dark:bg-surface-800 text-surface-600 dark:text-surface-400 mt-2">
                            {e.category}
                          </span>
                        )}
                      </div>
                      <div className={`w-1 shrink-0 self-stretch min-h-[2rem] rounded-full ${e.color}`} />
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      {isModalOpen && (
        <>
          <EventModal
            isOpen={isModalOpen}
            onClose={() => handleCloseModal(false)}
            onSuccess={() => handleCloseModal(true)}
            event={selectedEvent}
            selectedDate={selectedDate}
          />
          <MobileEventModal
            isOpen={isModalOpen}
            onClose={() => handleCloseModal(false)}
            onSuccess={() => handleCloseModal(true)}
            event={selectedEvent}
            selectedDate={selectedDate}
          />
        </>
      )}
    </div>
  )
}
