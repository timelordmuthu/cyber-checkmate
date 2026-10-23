import { NavLink, Outlet } from 'react-router-dom'
import { ROUTES } from '@/routes.js'

export default function ConsoleLayout() {
  const tabs = [
    { name: 'Reports', path: ROUTES.consoleReports },
    { name: 'Rules', path: ROUTES.consoleRules },
    { name: 'Models', path: ROUTES.consoleModels },
    { name: 'Retrain', path: ROUTES.consoleRetrain },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-cc-mint">
          Admin Console
        </h1>
        <p className="text-sm text-cc-glow mt-1">
          Review community-reported messages, edit heuristic rules, and manage ML models.
        </p>
      </div>

      <nav className="flex flex-wrap gap-2 border-b border-cc-pine pb-3">
        {tabs.map((tab) => (
          <NavLink
            key={tab.path}
            to={tab.path}
            className={({ isActive }) =>
              `px-3.5 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
                isActive
                  ? 'bg-plum-700 text-cc-mint shadow-sm border border-plum-light/30'
                  : 'bg-cc-deep text-cc-glow hover:text-cc-mint hover:bg-cc-pine'
              }`
            }
          >
            {tab.name}
          </NavLink>
        ))}
      </nav>

      <div className="pt-2">
        <Outlet />
      </div>
    </div>
  )
}
