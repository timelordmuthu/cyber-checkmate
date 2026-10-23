import { createContext, useContext, useState } from 'react'

export const AnalysisContext = createContext(null)

export function AnalysisProvider({ children }) {
  // CRITICAL PRIVACY GUARDRAIL (PRD 16.14 / FE PRD §5):
  // Stored strictly in React memory — NEVER in localStorage or sessionStorage.
  // Message texts, analysis results, entities, and screenshots must never touch persistent or session storage.
  const [currentResult, setCurrentResult] = useState(null)
  const [lastInput, setLastInput] = useState({ text: '', url: '', image: null })
  const [fallback, setFallback] = useState(false)

  const setResult = (result, inputData = {}, isFallback = false) => {
    setCurrentResult(result)
    setLastInput(inputData)
    setFallback(Boolean(isFallback || result?._fallback))
  }

  const clearResult = () => {
    setCurrentResult(null)
    setLastInput({ text: '', url: '', image: null })
    setFallback(false)
  }

  return (
    <AnalysisContext.Provider
      value={{
        result: currentResult,
        lastInput,
        fallback,
        setResult,
        clearResult,
      }}
    >
      {children}
    </AnalysisContext.Provider>
  )
}

export function useAnalysis() {
  const ctx = useContext(AnalysisContext)
  if (!ctx) {
    throw new Error('useAnalysis must be used within an AnalysisProvider')
  }
  return ctx
}
