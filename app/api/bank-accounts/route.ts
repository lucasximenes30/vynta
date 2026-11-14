import { getBankAccounts, saveBankAccount } from '@/services/bankAccount.service'
import { authorize, failure, json } from './policy'

export async function GET(request: Request) {
  try {
    const auth = await authorize(request)
    if (auth.response) return auth.response
    return json({ accounts: await getBankAccounts(auth.userId!) })
  } catch (error) { return failure(error) }
}

export async function POST(request: Request) {
  try {
    const auth = await authorize(request)
    if (auth.response) return auth.response
    return json({ account: await saveBankAccount(auth.userId!, await request.json()) }, 201)
  } catch (error) { return failure(error) }
}
