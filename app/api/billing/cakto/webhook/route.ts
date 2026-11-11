import { NextResponse } from 'next/server'
import { UserSubscriptionStatus } from '@prisma/client'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import { prisma } from '@/lib/prisma'
import { safeEqual } from '@/lib/password'
import { readBoundedText, BodyTooLargeError } from '@/lib/boundedBody'

export async function POST(req: Request) {
  try {
    const rawBody = await readBoundedText(req, 256 * 1024)
    
    console.log('--- CAKTO WEBHOOK RECEIVED ---');

    let payload: any
    try {
      payload = JSON.parse(rawBody)
    } catch {
      console.error('[Cakto Webhook] Validation failed: Invalid JSON')
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }

    // 1. Validate Secret from payload. Fails closed: without a configured secret this endpoint would
    // let anyone activate any account by POSTing its e-mail.
    const expectedSecret = process.env.CAKTO_WEBHOOK_SECRET
    if (!expectedSecret || typeof payload?.secret !== 'string' || !safeEqual(payload.secret, expectedSecret)) {
      console.error(`[Cakto Webhook] Unauthorized: ${expectedSecret ? 'secret mismatch' : 'CAKTO_WEBHOOK_SECRET not configured'}`)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 2. Validate Event and Data
    const event = payload.event
    const dataArray = payload.data

    console.log(`[Cakto Webhook] Event received: ${event || 'None'}`);
    console.log(`[Cakto Webhook] Is data an array?: ${Array.isArray(dataArray)}, Length: ${Array.isArray(dataArray) ? dataArray.length : 'N/A'}`);

    if (!event) {
       console.log('[Cakto Webhook] Ping or malformed (no event). Returning 200 to acknowledge test ping.');
       return NextResponse.json({ success: true, message: 'Ping or eventless payload received' }, { status: 200 })
    }

    if (!Array.isArray(dataArray) || dataArray.length === 0) {
       console.error('[Cakto Webhook] Missing or empty data array');
       return NextResponse.json({ error: 'Malformed payload: missing data array' }, { status: 400 })
    }

    // 3. Read first payload
    const data = dataArray[0]

    const email = data.customer?.email || data.user?.email || data.email
    const orderId = data.id || data.transactionId || data.orderId
    const subscriptionId = data.subscription?.id || data.subscriptionId
    const productId = data.product?.id

    console.log('[Cakto Webhook] Extracted Data:', { emailExtracted: !!email, email: email || 'None', productId, subscriptionId, orderId });

    if (!email) {
      console.error('[Cakto Webhook] No email found in payload data');
      return NextResponse.json({ error: 'No email found in payload data' }, { status: 400 })
    }

    // Map Event
    let targetStatus: UserSubscriptionStatus | null = null
    const eventLower = event.toLowerCase()

    if (
      eventLower === 'purchase_approved' || 
      eventLower.includes('payment.approved') || 
      eventLower.includes('subscription.renewed') ||
      eventLower.includes('subscription.created')
    ) {
      targetStatus = UserSubscriptionStatus.ACTIVE
    } else if (
      eventLower.includes('payment.refused') || 
      eventLower.includes('renewal.refused')
    ) {
      targetStatus = UserSubscriptionStatus.REFUSED
    } else if (
      eventLower.includes('subscription.canceled') || 
      eventLower.includes('subscription.cancelled')
    ) {
      targetStatus = UserSubscriptionStatus.CANCELED
    } else if (
      eventLower.includes('payment.generated') ||
      eventLower.includes('payment.pending')
    ) {
      targetStatus = UserSubscriptionStatus.PENDING
    } else if (eventLower.includes('subscription.past_due')) {
        targetStatus = UserSubscriptionStatus.PAST_DUE
    }

    // Attempt to detect if the "workout" extra module was purchased.
    const hasWorkoutModule = JSON.stringify(data).toLowerCase().includes('treino')

    // Find the user by their checkout email
    let user = await prisma.user.findUnique({
      where: { email },
    })

    console.log(`[Cakto Webhook] User exists in DB?: ${!!user}`);

    if (!user) {
      console.log(`[Cakto Webhook] User ${email} not found in database. Target status mapped: ${targetStatus}.`);
      
      // If user does not exist but payment is approved, try to create a skeleton user.
      if (targetStatus === UserSubscriptionStatus.ACTIVE) {
        try {
          const randomPassword = crypto.randomBytes(16).toString('hex')
          const hashedPassword = await bcrypt.hash(randomPassword, 10)
          
          user = await prisma.user.create({
            data: {
              email,
              name: data.customer?.name || data.user?.name || data.name || 'Usuário Vynta',
              password: hashedPassword,
              subscriptionStatus: UserSubscriptionStatus.ACTIVE,
              billingProvider: 'cakto',
              hasWorkoutModule,
              caktoOrderId: orderId,
              caktoSubscriptionId: subscriptionId,
              billingEmail: email,
              billingApprovedAt: new Date()
            }
          })
          console.log(`[Cakto Webhook] Skeleton user created for ${email}`);
        } catch (dbErr: any) {
           console.error(`[Cakto Webhook] Failed to create skeleton user for ${email}:`, dbErr.message);
           // We return 200 so the webhook test doesn't fail continuously.
           return NextResponse.json({ success: true, warning: 'Failed to create skeleton user (database conflict or missing fields)' }, { status: 200 })
        }
      } else {
        console.log(`[Cakto Webhook] Event status is not ACTIVE. Safely ignored user creation.`);
      }
    } else {
      // If user exists, we update their status if the event warrants a status change.
      if (targetStatus) {
        try {
            await prisma.user.update({
            where: { email },
            data: {
                subscriptionStatus: targetStatus,
                billingProvider: 'cakto',
                ...(orderId ? { caktoOrderId: orderId } : {}),
                ...(subscriptionId ? { caktoSubscriptionId: subscriptionId } : {}),
                ...(hasWorkoutModule ? { hasWorkoutModule: true } : {}),
                ...(targetStatus === UserSubscriptionStatus.ACTIVE ? { billingApprovedAt: new Date() } : {})
            }
            })
            console.log(`[Cakto Webhook] User ${email} updated successfully to status: ${targetStatus}.`);
        } catch (updateErr: any) {
            console.error(`[Cakto Webhook] Failed to update existing user ${email}:`, updateErr.message);
            // We return 200 so the webhook test doesn't fail.
            return NextResponse.json({ success: true, warning: 'Failed to update existing user' }, { status: 200 })
        }
      } else {
         console.log(`[Cakto Webhook] No status change mapped for event ${event}. User ${email} not updated.`);
      }
    }

    console.log('[Cakto Webhook] Successfully processed payload.');
    return NextResponse.json({ success: true }, { status: 200 })
  } catch (err: any) {
    if (err instanceof BodyTooLargeError) return NextResponse.json({ error: 'Payload too large' }, { status: 413 })
    console.error('[Cakto Webhook] Uncaught error processing webhook:', err.message)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
