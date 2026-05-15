import { ReactNode,Suspense,lazy } from 'react'
import { getSpacetimeConfig } from './config'

const SpacetimeProvider = lazy(() =>
  import('./SpacetimeProvider').then((module) => ({
    default: module.SpacetimeProvider,
  })),
)

interface OptionalSpacetimeProviderProps {
  children: ReactNode
}

export const OptionalSpacetimeProvider = ({ children }: OptionalSpacetimeProviderProps) => {
  const config = getSpacetimeConfig()

  if (!config.enabled) {
    return <>{children}</>
  }

  return (
    <Suspense fallback={<>{children}</>}>
      <SpacetimeProvider>{children}</SpacetimeProvider>
    </Suspense>
  )
}
