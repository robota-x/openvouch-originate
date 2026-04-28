import { describe, it, expect } from 'vitest'
import router from '../router'

describe('/verify routes', () => {
  it('registers /verify/company with hidden nav metadata', () => {
    const companyFlow = router.resolve('/verify/company')
    expect(companyFlow.matched.length).toBeGreaterThan(0)
    expect(companyFlow.meta.hideNav).toBe(true)
  })

  it('registers /verify/portal with hidden nav metadata', () => {
    const portal = router.resolve('/verify/portal')
    expect(portal.matched.length).toBeGreaterThan(0)
    expect(portal.meta.hideNav).toBe(true)
  })

  it('keeps /verify route reserved for verification section', () => {
    const root = router.resolve('/verify')
    expect(root.matched.length).toBeGreaterThan(0)
    expect(root.meta.hideNav).toBe(true)
  })
})
