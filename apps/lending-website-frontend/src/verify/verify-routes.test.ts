import { describe, it, expect } from 'vitest'
import router from '../router'

describe('/verify routes', () => {
  it('registers /verify/company with authentication requirement', () => {
    const companyFlow = router.resolve('/verify/company')
    expect(companyFlow.matched.length).toBeGreaterThan(0)
    expect(companyFlow.meta.requiresAuth).toBe(true)
    expect(companyFlow.meta.hideNav).toBeUndefined()
  })

  it('registers /verify/portal with authentication requirement', () => {
    const portal = router.resolve('/verify/portal')
    expect(portal.matched.length).toBeGreaterThan(0)
    expect(portal.meta.requiresAuth).toBe(true)
    expect(portal.meta.hideNav).toBeUndefined()
  })

  it('keeps /verify route reserved for verification section', () => {
    const root = router.resolve('/verify')
    expect(root.matched.length).toBeGreaterThan(0)
    // The redirect inherits meta if defined on the route, but here we check the target or the redirect itself
  })
})
