import { useState, useEffect } from 'react'

export default function Toast({ message, type = 'info', duration = 3000, onClose }) {
  const [isVisible, setIsVisible] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false)
      onClose?.()
    }, duration)
    return () => clearTimeout(timer)
  }, [duration, onClose])

  if (!isVisible) return null

  const colors = {
    success: { bg: '#ecfdf5', border: '#10b981', icon: '✓', text: '#166534' },
    error: { bg: '#fef2f2', border: '#ef4444', icon: '✕', text: '#991b1b' },
    info: { bg: '#eff6ff', border: '#3b82f6', icon: 'ℹ', text: '#1e40af' },
    warning: { bg: '#fffbeb', border: '#f59e0b', icon: '⚠', text: '#92400e' },
  }

  const style = colors[type] || colors.info

  return (
    <div style={{
      position: 'fixed',
      top: '20px',
      right: '20px',
      zIndex: 9999,
    }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '1rem 1.5rem',
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
          fontWeight: '500',
          fontSize: '0.95rem',
          background: style.bg,
          borderLeft: `4px solid ${style.border}`,
          color: style.text,
          animation: 'slideIn 0.3s ease-out',
          maxWidth: '400px',
        }}
      >
        <span style={{ fontSize: '1.2rem', marginRight: '0.8rem' }}>{style.icon}</span>
        <span style={{ flex: 1 }}>{message}</span>
        <button
          onClick={() => setIsVisible(false)}
          style={{
            marginLeft: '1rem',
            background: 'none',
            border: 'none',
            color: style.text,
            cursor: 'pointer',
            fontSize: '1.5rem',
            padding: '0',
            lineHeight: '1',
          }}
        >
          ×
        </button>
      </div>
      <style>{`
        @keyframes slideIn {
          from {
            transform: translateX(400px);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  )
}