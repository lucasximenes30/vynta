'use client'

// Guided "first steps" tour: client-side state + the glue that lets the tour open the right
// modal on each screen (salary, card, habit, workout) and notice when the user finished a step.

import { useEffect, useRef } from 'react'

export type TourStepId = 'salary' | 'expense' | 'quick' | 'card' | 'habit' | 'workout'
export type TourActionId = 'salary' | 'card' | 'habit' | 'workout'

export interface TourState {
  active: boolean
  /** 'welcome' → steps → 'finish' */
  stage: 'welcome' | 'steps' | 'finish'
  step: number
  done: TourStepId[]
  /** Collapsed into the small progress pill while the user is doing the step. */
  minimized: boolean
}

export const TOUR_STEP_ORDER: TourStepId[] = ['salary', 'expense', 'quick', 'card', 'habit', 'workout']

const STORAGE_KEY = 'vynta_tour_v1'
const PENDING_ACTION_KEY = 'vynta_tour_pending_action'
export const TOUR_CHANGED_EVENT = 'vynta:tour-changed'
export const TOUR_ACTION_EVENT = 'vynta:tour-action'
/** Fired by RouterCacheSync after any successful `/api/*` mutation: detail = { path, method }. */
export const API_MUTATION_EVENT = 'vynta:api-mutation'

const INITIAL: TourState = { active: true, stage: 'welcome', step: 0, done: [], minimized: false }

export function readTour(): TourState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? { ...INITIAL, ...JSON.parse(raw) } : null
  } catch {
    return null
  }
}

export function writeTour(state: TourState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  window.dispatchEvent(new Event(TOUR_CHANGED_EVENT))
}

/** Starts (or restarts) the tour from the welcome screen. */
export function startTour() {
  writeTour({ ...INITIAL })
}

/** Login/register screens: forget this device's tour progress so the next account starts fresh. */
export function clearLocalTour() {
  localStorage.removeItem(STORAGE_KEY)
  sessionStorage.removeItem(PENDING_ACTION_KEY)
}

/** Saves "finished/skipped" on this device and on the account (so other devices don't show it again). */
export function finishTour() {
  const current = readTour()
  writeTour({ ...(current ?? INITIAL), active: false, minimized: false })
  persistTourCompleted()
}

export function persistTourCompleted() {
  fetch('/api/onboarding/tour', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'complete' }),
    keepalive: true,
  }).catch(() => {})
}

/**
 * Asks the screen at `href` to open the modal for `action`. If we're already there, the open
 * screen hears the event; otherwise the pending action is picked up once the screen mounts.
 */
export function requestTourAction(action: TourActionId, href: string, push: (href: string) => void) {
  sessionStorage.setItem(PENDING_ACTION_KEY, action)
  if (window.location.pathname === href) {
    window.dispatchEvent(new CustomEvent(TOUR_ACTION_EVENT, { detail: action }))
  } else {
    push(href)
  }
}

/** Screens call this to open their "create" modal when the tour asks for it. */
export function useTourAction(action: TourActionId, handler: () => void) {
  const handlerRef = useRef(handler)
  handlerRef.current = handler

  useEffect(() => {
    const run = () => {
      if (sessionStorage.getItem(PENDING_ACTION_KEY) !== action) return
      sessionStorage.removeItem(PENDING_ACTION_KEY)
      // Let the screen finish its first paint so the modal animates in smoothly.
      setTimeout(() => handlerRef.current(), 250)
    }
    run()
    const onAction = (e: Event) => {
      if ((e as CustomEvent<TourActionId>).detail === action) run()
    }
    window.addEventListener(TOUR_ACTION_EVENT, onAction)
    return () => window.removeEventListener(TOUR_ACTION_EVENT, onAction)
  }, [action])
}

/** Which tour step a successful API mutation completes (if any). */
export function stepForMutation(path: string, method: string): TourStepId | null {
  if (method !== 'POST') return null
  if (path === '/api/salary') return 'salary'
  if (path === '/api/cards' || path === '/api/cards/import') return 'card'
  if (path === '/api/habits') return 'habit'
  if (path === '/api/workout/plans') return 'workout'
  return null
}
