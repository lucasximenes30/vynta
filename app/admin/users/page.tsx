import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import UserTable from './UserTable'
import { AdminPageHeader, Panel, StatCard } from '../ui'
import { getLastActivityByUser } from '@/services/admin/user.admin.service'

export const dynamic = 'force-dynamic'

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; plan?: string; status?: string; usage?: string }>
}) {
  const session = await requireAuth().catch(() => null)
  if (!session || session.role !== 'ADMIN') {
    redirect('/admin/login')
  }

  const resolvedSearchParams = await searchParams
  const search = resolvedSearchParams?.search || ''
  const plan = resolvedSearchParams?.plan || 'all'
  const status = resolvedSearchParams?.status || 'all'
  const usage = resolvedSearchParams?.usage || 'all'

  const whereClause: any = {}

  if (search) {
    whereClause.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
    ]
  }

  if (status !== 'all') {
    if (status === 'ACTIVE') whereClause.subscriptionStatus = 'ACTIVE'
    else if (status === 'INACTIVE') whereClause.subscriptionStatus = 'INACTIVE'
    else if (status === 'PENDING') whereClause.subscriptionStatus = 'PENDING'
  }

  if (plan !== 'all') {
    if (plan === 'VIP') {
      whereClause.plan = 'VIP'
    } else if (plan === 'PRO') {
      whereClause.plan = 'PRO'
    } else if (plan === 'COURTESY') {
      whereClause.plan = 'COURTESY'
    } else if (plan === 'ADMIN') {
      whereClause.plan = 'ADMIN'
    } else if (plan === 'FREE_TRIAL') {
      whereClause.plan = 'FREE_TRIAL'
    } else if (plan === 'FREE') {
      whereClause.plan = 'FREE'
    }
  }

  // Analytics queries
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfTomorrow = new Date(startOfToday.getTime() + 24 * 60 * 60 * 1000);
  const startOfDayAfterTomorrow = new Date(startOfTomorrow.getTime() + 24 * 60 * 60 * 1000);

  const [
    activeVip,
    activePro,
    courtesyUsers,
    freeTrialUsers,
    pendingUsers,
    expiredUsers, // Simplified: Users with INACTIVE or PAST_DUE and plan not Admin/Courtesy
  ] = await Promise.all([
    prisma.user.count({ where: { plan: 'VIP', subscriptionStatus: 'ACTIVE' } }),
    prisma.user.count({ where: { plan: 'PRO', subscriptionStatus: 'ACTIVE' } }),
    prisma.user.count({ where: { plan: 'COURTESY' } }),
    prisma.user.count({ where: { plan: 'FREE_TRIAL' } }),
    prisma.user.count({ where: { subscriptionStatus: 'PENDING' } }),
    prisma.user.count({ where: { subscriptionStatus: { in: ['INACTIVE', 'PAST_DUE'] }, plan: { notIn: ['ADMIN', 'COURTESY'] } } }),
  ]);

  // Free Trial Specific Analytics
  const allFreeTrials = await prisma.user.findMany({
    where: { plan: 'FREE_TRIAL' },
    select: { createdAt: true, subscriptionExpiresAt: true }
  });

  let trialActive = 0;
  let trialExpiringToday = 0;
  let trialExpiringTomorrow = 0;
  let trialExpired = 0;

  const oneDayMs = 24 * 60 * 60 * 1000;

  allFreeTrials.forEach(u => {
    const expiresAt = u.subscriptionExpiresAt ?? new Date(u.createdAt.getTime() + oneDayMs);
    if (expiresAt < now) {
      trialExpired++;
    } else {
      trialActive++;
      const daysUntilExpiration = Math.floor((expiresAt.getTime() - startOfToday.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysUntilExpiration === 0) trialExpiringToday++;
      else if (daysUntilExpiration === 1) trialExpiringTomorrow++;
    }
  });

  const DAY = 24 * 60 * 60 * 1000
  if (usage === 'today') whereClause.lastSeenAt = { gte: new Date(now.getTime() - DAY) }
  else if (usage === 'inactive2') whereClause.lastSeenAt = { lt: new Date(now.getTime() - 2 * DAY) }
  else if (usage === 'never') whereClause.lastSeenAt = null

  const [users, seenToday, seen7d, inactive2d, neverSeen] = await Promise.all([
    prisma.user.findMany({
      where: Object.keys(whereClause).length > 0 ? whereClause : undefined,
      orderBy: usage === 'all' ? { createdAt: 'desc' } : { lastSeenAt: { sort: 'desc', nulls: 'last' } },
      select: {
        id: true,
        name: true,
        email: true,
        plan: true,
        role: true,
        subscriptionStatus: true,
        createdAt: true,
        phone: true,
        subscriptionExpiresAt: true,
        subscriptionEndDate: true,
        lastSeenAt: true,
      },
    }),
    prisma.user.count({ where: { lastSeenAt: { gte: new Date(now.getTime() - DAY) } } }),
    prisma.user.count({ where: { lastSeenAt: { gte: new Date(now.getTime() - 7 * DAY) } } }),
    prisma.user.count({ where: { lastSeenAt: { lt: new Date(now.getTime() - 2 * DAY) }, role: { not: 'ADMIN' } } }),
    prisma.user.count({ where: { lastSeenAt: null, role: { not: 'ADMIN' } } }),
  ])
  const lastActivity = await getLastActivityByUser(users.map((u) => u.id))

  // Provide fallback phone logic - UI will simply show 'Não informado'
  const formattedUsers = users.map((user: any) => ({
    ...user,
    createdAt: user.createdAt.toISOString(),
    subscriptionExpiresAt: user.subscriptionExpiresAt?.toISOString() || null,
    subscriptionEndDate: user.subscriptionEndDate?.toISOString() || null,
    lastSeenAt: user.lastSeenAt?.toISOString() || null,
    lastActivityAt: lastActivity.get(user.id)?.toISOString() || null,
  }))

  const pill = (href: string, label: string, value: number, cls: string) => (
    <a href={href} className="flex items-center justify-between gap-3 rounded-xl px-3 py-2 hover:bg-surface-50 dark:hover:bg-surface-800/40 transition-colors">
      <span className="text-sm text-surface-600 dark:text-surface-300">{label}</span>
      <span className={`font-display text-lg font-bold ${cls}`}>{value}</span>
    </a>
  )

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <AdminPageHeader
        title="Usuários"
        subtitle="Contas, acessos e engajamento de cada usuário."
        aside={<span className="rounded-xl bg-surface-100 dark:bg-surface-800 px-4 py-2 text-sm font-semibold text-surface-600 dark:text-surface-300">{users.length} {users.length === 1 ? 'usuário' : 'usuários'} na lista</span>}
      />

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard icon="UserCheck" label="PRO ativos" value={activePro} tone="violet" href="/admin/users?plan=PRO&status=ACTIVE" />
        <StatCard icon="UserCheck" label="VIP ativos" value={activeVip} tone="brand" href="/admin/users?plan=VIP&status=ACTIVE" />
        <StatCard icon="Clock" label="Em teste" value={trialActive} tone="blue" href="/admin/users?plan=FREE_TRIAL" />
        <StatCard icon="Users" label="Cortesia" value={courtesyUsers} tone="emerald" href="/admin/users?plan=COURTESY" />
        <StatCard icon="UserX" label="Expirados" value={expiredUsers + trialExpired} tone="red" />
        <StatCard icon="CreditCard" label="Pendentes" value={pendingUsers} tone="amber" href="/admin/users?status=PENDING" />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Panel title="Uso do sistema" subtitle="Último acesso ao app (abrir o app conta como acesso).">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
            {pill('/admin/users?usage=today', 'Acessaram nas últimas 24h', seenToday, 'text-emerald-600 dark:text-emerald-400')}
            {pill('/admin/users', 'Acessaram em 7 dias', seen7d, 'text-blue-600 dark:text-blue-400')}
            {pill('/admin/users?usage=inactive2', 'Sem acessar há 2+ dias', inactive2d, 'text-amber-600 dark:text-amber-500')}
            {pill('/admin/users?usage=never', 'Nunca abriram', neverSeen, 'text-red-500 dark:text-red-400')}
          </div>
        </Panel>
        <Panel title="Teste grátis" subtitle="Situação dos testes de 7 dias.">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
            {pill('/admin/users?plan=FREE_TRIAL', 'Testes ativos', trialActive, 'text-blue-600 dark:text-blue-400')}
            {pill('/admin/users?plan=FREE_TRIAL', 'Terminam hoje', trialExpiringToday, 'text-orange-600 dark:text-orange-500')}
            {pill('/admin/users?plan=FREE_TRIAL', 'Terminam amanhã', trialExpiringTomorrow, 'text-amber-600 dark:text-amber-500')}
            {pill('/admin/users?plan=FREE_TRIAL', 'Testes expirados', trialExpired, 'text-red-500 dark:text-red-400')}
          </div>
        </Panel>
      </div>

      <UserTable initialUsers={formattedUsers} initialSearch={search} initialPlan={plan} initialStatus={status} initialUsage={usage} />
    </div>
  )
}
