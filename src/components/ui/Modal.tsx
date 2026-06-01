import { ReactNode, useEffect } from 'react'
import { X } from 'lucide-react'
import { Button } from './Button'

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
}

export function Modal({ open, onClose, title, children }: ModalProps) {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [open])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative z-10 w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-lg bg-white p-6 shadow-xl mx-4">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>
        {children}
      </div>
    </div>
  )
}
