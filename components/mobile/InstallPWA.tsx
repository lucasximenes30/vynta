'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { X, Download, Share, PlusSquare } from 'lucide-react'

export default function InstallPWA() {
  const [isIOS, setIsIOS] = useState(false)
  const [isStandalone, setIsStandalone] = useState(false)
  const [showPrompt, setShowPrompt] = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)

  const pathname = usePathname()

  useEffect(() => {
    // Check if device is iOS
    const isIosDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream
    setIsIOS(isIosDevice)

    // Check if app is already installed (standalone mode)
    const isAppStandalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone
    setIsStandalone(isAppStandalone)

    // Listen for PWA install prompt on Android/Chrome
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault()
      setDeferredPrompt(e)
      ;(window as any).pwaDeferredPrompt = e // Save globally for settings/tutorial
      if (!isAppStandalone) {
        const hasDismissed = localStorage.getItem('vynta_pwa_dismissed')
        const hasShownSession = sessionStorage.getItem('vynta_pwa_shown')
        if (!hasDismissed && !hasShownSession) {
          setShowPrompt(true)
          sessionStorage.setItem('vynta_pwa_shown', 'true')
        }
      }
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

    // Show iOS prompt if not installed
    if (isIosDevice && !isAppStandalone) {
      // Show iOS prompt only once ever (or until cleared)
      const hasDismissed = localStorage.getItem('vynta_pwa_dismissed')
      const hasShownSession = sessionStorage.getItem('vynta_pwa_shown')
      if (!hasDismissed && !hasShownSession) {
        setShowPrompt(true)
        sessionStorage.setItem('vynta_pwa_shown', 'true')
      }
    } else if (!isIosDevice && !isAppStandalone) {
      const hasDismissed = localStorage.getItem('vynta_pwa_dismissed')
      if (hasDismissed) {
        setShowPrompt(false)
      }
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    }
  }, [])

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      if (outcome === 'accepted') {
        setShowPrompt(false)
        localStorage.setItem('vynta_pwa_dismissed', 'true')
      }
      setDeferredPrompt(null)
      ;(window as any).pwaDeferredPrompt = null
    }
  }

  const handleClose = () => {
    setShowPrompt(false)
    localStorage.setItem('vynta_pwa_dismissed', 'true')
  }

  if (isStandalone || !showPrompt || !pathname.startsWith('/dashboard')) return null

  return (
    <div className="fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom))] left-0 right-0 z-50 p-4 animate-auth-fade md:bottom-0">
      <div className="bg-surface-900 border border-surface-800 rounded-2xl p-4 shadow-2xl relative">
        <button onClick={handleClose} className="absolute top-2 right-2 p-2 text-surface-400 hover:text-white transition-colors">
          <X className="w-4 h-4" />
        </button>
        
        <div className="flex items-start gap-4 pr-6">
          <div className="w-12 h-12 bg-brand-500/20 text-brand-400 rounded-xl flex items-center justify-center shrink-0">
            <Download className="w-6 h-6" />
          </div>
          <div className="flex-1 pt-1">
            <h3 className="font-semibold text-white mb-1">Instale o Vynta</h3>
            {isIOS ? (
              <p className="text-sm text-surface-400">
                Receba lembretes de contas e hábitos e abra em 1 toque. Toque em <Share className="inline w-4 h-4 mx-1 text-blue-500" /> e depois em <strong className="text-surface-200 font-medium whitespace-nowrap"><PlusSquare className="inline w-4 h-4 mx-1" /> Adicionar à Tela de Início</strong>.
              </p>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-surface-400">Abre em 1 toque, funciona sem internet e te avisa de contas e hábitos.</p>
                <button 
                  onClick={handleInstallClick}
                  className="bg-brand-600 hover:bg-brand-700 text-white font-semibold py-2 px-4 rounded-lg text-sm transition-colors"
                >
                  Instalar Aplicativo
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
