import { createContext, useContext, useState } from 'react'
import { safeGet, safeSet } from '@/lib/storage.js'

const PrivateModeContext = createContext(null)

const STORAGE_KEY = 'cc_private_mode'

export function PrivateModeProvider({ children }) {
  const [privateMode, setPrivateModeState] = useState(() => safeGet(STORAGE_KEY) === '1')

  const setPrivateMode = (val) => {
    setPrivateModeState((prev) => {
      const nextVal = typeof val === 'function' ? val(prev) : Boolean(val)
      safeSet(STORAGE_KEY, nextVal ? '1' : '0')
      return nextVal
    })
  }

  return (
    <PrivateModeContext.Provider value={{ privateMode, setPrivateMode }}>
      {children}
    </PrivateModeContext.Provider>
  )
}

export function usePrivateMode() {
  const ctx = useContext(PrivateModeContext)
  if (!ctx) {
    throw new Error('usePrivateMode must be used within a PrivateModeProvider')
  }
  return ctx
}
