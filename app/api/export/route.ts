import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getUserBalance } from '@/services/transaction.service'

export async function GET(req: Request) {
  try {
    const session = await getSession()
    if (!session?.userId) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const type = searchParams.get('type') // 'monthly' | 'annual'
    const yearParam = searchParams.get('year')
    const monthParam = searchParams.get('month')
    const includeExtract = searchParams.get('includeExtract') === 'true'

    if (!type || !yearParam || (type === 'monthly' && !monthParam)) {
      return NextResponse.json({ error: 'Parâmetros inválidos' }, { status: 400 })
    }

    const year = parseInt(yearParam, 10)
    let startDate: Date
    let endDate: Date

    if (type === 'monthly') {
      const month = parseInt(monthParam!, 10)
      startDate = new Date(year, month - 1, 1)
      endDate = new Date(year, month, 0, 23, 59, 59, 999)
    } else {
      // annual
      startDate = new Date(year, 0, 1)
      endDate = new Date(year, 11, 31, 23, 59, 59, 999)
    }

    // Fetch all transactions for the user
    const rawTransactions = await prisma.transaction.findMany({
      where: { userId: session.userId },
      orderBy: { date: 'asc' },
      include: {
        card: {
          select: { dueDay: true, closingDay: true }
        }
      }
    })

    const extract: any[] = []
    let totalIncome = 0
    let totalExpense = 0

    const isDateInPeriod = (d: Date) => d >= startDate && d <= endDate

    for (const t of rawTransactions) {
      if (!t.isActive) continue; // Skip inactive

      if (t.isInstallment && t.totalInstallments && t.purchaseDate) {
        const pDate = new Date(t.purchaseDate)
        pDate.setHours(0, 0, 0, 0)
        const dueDay = t.dueDay || pDate.getDate()
        let startMonth = pDate.getMonth()
        let startYear = pDate.getFullYear()

        if (t.card && t.cardId) {
          if (pDate.getDate() >= t.card.closingDay) { startMonth++; if (startMonth > 11) { startMonth = 0; startYear++; } }
          if (t.card.dueDay < t.card.closingDay) { startMonth++; if (startMonth > 11) { startMonth = 0; startYear++; } }
        } else {
          if (pDate.getDate() > dueDay) { startMonth++; if (startMonth > 11) { startMonth = 0; startYear++; } }
        }

        for (let i = 0; i < t.totalInstallments; i++) {
          const instDate = new Date(startYear, startMonth + i, dueDay)
          if (isDateInPeriod(instDate)) {
            const amount = Number(t.installmentAmount)
            if (t.type === 'INCOME') totalIncome += amount; else totalExpense += amount;
            
            if (includeExtract) {
              extract.push({
                id: `${t.id}-${i}`,
                title: `${t.title} (${i + 1}/${t.totalInstallments})`,
                date: instDate.toISOString(),
                type: t.type,
                amount: amount,
                category: t.category,
                paymentMethod: t.paymentMethod || (t.cardId ? 'credit_card' : null)
              })
            }
          }
        }
      } else if (t.isRecurring) {
        const sDate = new Date(t.date)
        sDate.setHours(0, 0, 0, 0)
        const rDay = t.recurringDay || sDate.getDate()
        let baseMonth = sDate.getMonth()
        let baseYear = sDate.getFullYear()

        if (t.card && t.cardId) {
          if (sDate.getDate() >= t.card.closingDay) { baseMonth++; if (baseMonth > 11) { baseMonth = 0; baseYear++; } }
          if (t.card.dueDay < t.card.closingDay) { baseMonth++; if (baseMonth > 11) { baseMonth = 0; baseYear++; } }
        } else {
          if (sDate.getDate() > rDay) { baseMonth++; if (baseMonth > 11) { baseMonth = 0; baseYear++; } }
        }

        const limitDate = t.endDate ? new Date(t.endDate) : endDate
        const upperLimit = limitDate < endDate ? limitDate : endDate
        let current = new Date(baseYear, baseMonth, rDay)

        while (current <= upperLimit) {
          if (isDateInPeriod(current)) {
            const amount = Number(t.amount)
            if (t.type === 'INCOME') totalIncome += amount; else totalExpense += amount;
            
            if (includeExtract) {
              extract.push({
                id: `${t.id}-${current.getTime()}`,
                title: t.title,
                date: current.toISOString(),
                type: t.type,
                amount: amount,
                category: t.category,
                paymentMethod: t.paymentMethod || (t.cardId ? 'credit_card' : null)
              })
            }
          }
          current = new Date(current.getFullYear(), current.getMonth() + 1, rDay)
        }
      } else {
        const tDate = new Date(t.date)
        tDate.setHours(0, 0, 0, 0)
        let effectiveDate = tDate

        if (t.card && t.cardId) {
          let billMonth = tDate.getMonth()
          let billYear = tDate.getFullYear()
          if (tDate.getDate() >= t.card.closingDay) { billMonth++; if (billMonth > 11) { billMonth = 0; billYear++; } }
          let dueMonth = billMonth
          let dueYear = billYear
          if (t.card.dueDay < t.card.closingDay) { dueMonth++; if (dueMonth > 11) { dueMonth = 0; dueYear++; } }
          effectiveDate = new Date(dueYear, dueMonth, t.card.dueDay)
        }

        if (isDateInPeriod(effectiveDate)) {
          const amount = Number(t.amount)
          if (t.type === 'INCOME') totalIncome += amount; else totalExpense += amount;
          
          if (includeExtract) {
            extract.push({
              id: t.id,
              title: t.title,
              date: effectiveDate.toISOString(),
              type: t.type,
              amount: amount,
              category: t.category,
              paymentMethod: t.paymentMethod || (t.cardId ? 'credit_card' : null)
            })
          }
        }
      }
    }
    
    // Sort extract by date
    extract.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

    // Get the overall accumulated balance up to endDate using getUserBalance
    const overallBalanceData = await getUserBalance(session.userId, endDate)

    // Fetch user goals
    const goals = await prisma.financialGoal.findMany({
      where: { userId: session.userId },
      include: {
        transactions: {
          orderBy: { date: 'asc' }
        }
      },
      orderBy: { createdAt: 'desc' }
    })
    
    return NextResponse.json({
      summary: {
        income: totalIncome,
        expense: totalExpense,
        balance: overallBalanceData.balance
      },
      extract: includeExtract ? extract : [],
      goals,
      period: {
        type,
        year,
        month: type === 'monthly' ? parseInt(monthParam!, 10) : null
      }
    })
  } catch (error: any) {
    console.error('Erro ao gerar dados de exportação:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
