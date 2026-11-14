import { z } from 'zod'
import { removeBankAccount, saveBankAccount } from '@/services/bankAccount.service'
import { authorize, failure, json } from '../policy'

type Context = { params: Promise<{ id: string }> }
export async function PATCH(request: Request, context: Context) {
  try {
    const auth = await authorize(request)
    if (auth.response) return auth.response
    const id = z.uuid().parse((await context.params).id)
    return json({ account: await saveBankAccount(auth.userId!, await request.json(), id) })
  } catch (error) { return failure(error) }
}

export async function DELETE(request: Request, context: Context) {
  try {
    const auth = await authorize(request)
    if (auth.response) return auth.response
    const id = z.uuid().parse((await context.params).id)
    await removeBankAccount(auth.userId!, id)
    return json({ success: true })
  } catch (error) { return failure(error) }
}
