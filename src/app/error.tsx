'use client'

import { useEffect } from 'react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center', 
      height: '100vh', 
      fontFamily: 'sans-serif',
      textAlign: 'center',
      padding: '20px'
    }}>
      <h2>Упс! Что-то сломалось</h2>
      <p style={{ color: '#666' }}>{error.message || "Произошла непредвиденная ошибка"}</p>
      <button
        onClick={() => reset()}
        style={{ 
          marginTop: '20px', 
          padding: '10px 20px', 
          backgroundColor: '#0070f3', 
          color: 'white', 
          border: 'none', 
          borderRadius: '5px',
          cursor: 'pointer' 
        }}
      >
        Попробовать еще раз
      </button>
    </div>
  )
}
