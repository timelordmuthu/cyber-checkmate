import { useEffect } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAnalysis } from '@/context/AnalysisContext.jsx'
import { ROUTES } from '@/routes.js'
import redFixture from '@contracts/fixtures/analyze_red_kyc_en.json'
import greenFixture from '@contracts/fixtures/analyze_green_otp.json'
import urlOnlyFixture from '@contracts/fixtures/analyze_url_only_official.json'

const DEV_FIXTURES = {
  red: redFixture,
  green: greenFixture,
  'url-only': urlOnlyFixture,
}

export default function RequireResult({ children }) {
  const { result, setResult } = useAnalysis()
  const location = useLocation()
  const searchParams = new URLSearchParams(location.search)
  const devFixture = searchParams.get('devFixture')
  const stateResult = location.state?.result

  useEffect(() => {
    if (devFixture && DEV_FIXTURES[devFixture] && !result) {
      setResult(DEV_FIXTURES[devFixture])
    } else if (stateResult && !result) {
      setResult(stateResult)
    }
  }, [devFixture, stateResult, result, setResult])

  if (!result && !(devFixture && DEV_FIXTURES[devFixture]) && !stateResult) {
    return <Navigate to={ROUTES.check} replace />
  }

  return children
}
