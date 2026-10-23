import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react'
import { getHealth, getLanguages, isMockMode } from '@/api/index.js'

const ServerContext = createContext(null)

export function ServerProvider({ children }) {
  const isMock = isMockMode()

  const [serverState, setServerState] = useState({
    online: isMock ? true : null,
    apiVersion: null,
    ocr: false,
    translator: 'not_loaded',
    translatorEngine: null,
    modelVersion: null,
    checkedAt: null,
    mock: isMock
  })

  const [serverLanguages, setServerLanguages] = useState([])
  const [legacy, setLegacy] = useState(false)

  const prevOnlineRef = useRef(null)

  const fetchLanguages = useCallback(async () => {
    try {
      const res = await getLanguages()
      setServerLanguages(res?.languages || [])
      setLegacy(Boolean(res?.legacy))
    } catch {
      // getLanguages already catches 404 and returns legacy: true
    }
  }, [])

  const checkHealth = useCallback(async () => {
    try {
      const h = await getHealth()
      const now = new Date().toISOString()
      const wasOffline = prevOnlineRef.current === false
      const currentOnline = Boolean(h.online)
      prevOnlineRef.current = currentOnline

      setServerState({
        online: isMock ? true : currentOnline,
        apiVersion: h.apiVersion ?? null,
        ocr: Boolean(h.ocr),
        translator: h.translator || 'not_loaded',
        translatorEngine: h.translatorEngine ?? null,
        modelVersion: h.modelVersion ?? null,
        checkedAt: now,
        mock: isMock
      })

      if (wasOffline && currentOnline) {
        await fetchLanguages()
      }

      return h
    } catch {
      prevOnlineRef.current = false
      setServerState((prev) => ({
        ...prev,
        online: false,
        checkedAt: new Date().toISOString()
      }))
    }
  }, [fetchLanguages, isMock])

  const refresh = useCallback(async () => {
    await checkHealth()
    await fetchLanguages()
  }, [checkHealth, fetchLanguages])

  useEffect(() => {
    let timerId = null

    const runHealthCheck = async () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
        return
      }
      await checkHealth()
    }

    runHealthCheck()
    fetchLanguages()

    timerId = setInterval(runHealthCheck, 30000)

    const handleVisibilityChange = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        runHealthCheck()
      }
    }

    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', handleVisibilityChange)
    }

    return () => {
      if (timerId) clearInterval(timerId)
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', handleVisibilityChange)
      }
    }
  }, [checkHealth, fetchLanguages])

  const contextValue = {
    ...serverState,
    serverLanguages,
    legacy,
    refresh,
    server: serverState
  }

  return (
    <ServerContext.Provider value={contextValue}>
      {children}
    </ServerContext.Provider>
  )
}

export function useServer() {
  const ctx = useContext(ServerContext)
  if (!ctx) {
    throw new Error('useServer must be used within a ServerProvider')
  }
  return ctx
}
