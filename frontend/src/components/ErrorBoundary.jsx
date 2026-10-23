import React from 'react'
import { ROUTES } from '@/routes.js'

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    if (!import.meta.env.PROD) {
      console.error('ErrorBoundary caught an error:', error, errorInfo)
    }
  }

  handleReload = () => {
    window.location.reload()
  }

  handleGoHome = () => {
    window.location.href = ROUTES.dashboard
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-dvh flex items-center justify-center p-6 bg-cc-black text-cc-mint">
          <div className="max-w-md w-full bg-cc-deep border border-cc-pine rounded-2xl p-6 text-center space-y-4 shadow-xl">
            <div className="text-4xl select-none">⚠️</div>
            <h1 className="text-xl font-bold text-cc-mint">
              Something went wrong on this page.
            </h1>
            <p className="text-sm text-cc-glow">
              An unexpected error occurred. You can reload the page or return to the home screen.
            </p>
            <div className="pt-2 flex flex-wrap justify-center gap-3">
              <button
                type="button"
                onClick={this.handleReload}
                className="px-4 py-2 bg-cc-pine hover:bg-cc-juniper text-cc-mint text-sm font-semibold rounded-xl border border-cc-juniper transition-colors cursor-pointer"
              >
                Reload
              </button>
              <button
                type="button"
                onClick={this.handleGoHome}
                className="px-4 py-2 bg-cc-juniper hover:bg-cc-juniper text-cc-mint text-sm font-bold rounded-xl shadow transition-colors cursor-pointer"
              >
                Go home
              </button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
