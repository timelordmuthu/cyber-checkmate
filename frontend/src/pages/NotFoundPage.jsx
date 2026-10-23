import { Link } from 'react-router-dom'
import { ROUTES } from '@/routes.js'

export default function NotFoundPage() {
  return (
    <div className="min-h-dvh flex items-center justify-center p-6 bg-cc-black text-cc-mint">
      <div className="max-w-md w-full bg-cc-deep border border-cc-pine rounded-2xl p-8 text-center space-y-4 shadow-xl">
        <div className="text-4xl select-none">404</div>
        <h1 className="text-2xl font-extrabold text-cc-mint">
          Page Not Found
        </h1>
        <p className="text-sm text-cc-glow">
          This page does not exist. Check before you trust.
        </p>
        <div className="pt-2">
          <Link
            to={ROUTES.dashboard}
            className="inline-flex items-center gap-2 bg-cc-juniper hover:bg-cc-juniper text-cc-mint font-bold px-5 py-2.5 rounded-xl shadow transition-colors text-sm"
          >
            Go to Home
          </Link>
        </div>
      </div>
    </div>
  )
}
