import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createRouter, createWebHistory } from 'vue-router'
import VerifyPortalPage from './VerifyPortalPage.vue'

const {
  startVerification,
  completeVerification,
  getIdentity,
} = vi.hoisted(() => ({
  startVerification: vi.fn(),
  completeVerification: vi.fn(),
  getIdentity: vi.fn(),
}))

vi.mock('../api/client', () => ({
  identityClient: {
    startVerification,
    completeVerification,
    getIdentity,
  },
}))

async function mountPage(path = '/verify/portal') {
  const router = createRouter({
    history: createWebHistory(),
    routes: [{ path: '/verify/portal', component: VerifyPortalPage }],
  })
  await router.push(path)
  await router.isReady()
  return mount(VerifyPortalPage, {
    global: { plugins: [router] },
  })
}

describe('VerifyPortalPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    startVerification.mockResolvedValue({
      sessionId: 'id_test_123',
      verificationUrl: 'https://frontend.example/verify/portal?sessionId=id_test_123',
    })
    completeVerification.mockResolvedValue({ success: true, verified: true })
    getIdentity.mockResolvedValue({
      verified: true,
      identity: {
        fullName: 'ADA LOVELACE',
        dob: '1815-12-10',
        country: 'GB',
        verifiedAt: Date.now(),
      },
    })
  })

  it('shows validation error when wallet address is missing on start', async () => {
    const wrapper = await mountPage()
    await wrapper.get('[data-testid="start-button"]').trigger('click')
    expect(wrapper.get('[data-testid="error-message"]').text()).toContain('Wallet address is required')
  })

  it('completes the verification flow and shows success state', async () => {
    const wrapper = await mountPage()

    await wrapper.get('[data-testid="wallet-input"]').setValue('7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU')
    await wrapper.get('[data-testid="start-button"]').trigger('click')
    await Promise.resolve()

    await wrapper.get('[data-testid="full-name-input"]').setValue('Ada Lovelace')
    await wrapper.get('[data-testid="complete-button"]').trigger('click')
    await Promise.resolve()

    expect(startVerification).toHaveBeenCalledTimes(1)
    expect(completeVerification).toHaveBeenCalledTimes(1)
    expect(getIdentity).toHaveBeenCalledTimes(1)
    expect(wrapper.text()).toContain('Verification complete')
  })

  it('redirects back when redirectUrl is provided in query', async () => {
    const assign = vi.spyOn(window.location, 'assign').mockImplementation(() => {})
    const wrapper = await mountPage('/verify/portal?sessionId=id_test_123&walletAddress=WalletXYZ&redirectUrl=%2Fverify%2Fcompany%3Fresume%3D1')

    await wrapper.get('[data-testid="full-name-input"]').setValue('Ada Lovelace')
    await wrapper.get('[data-testid="complete-button"]').trigger('click')
    await Promise.resolve()

    expect(assign).toHaveBeenCalledTimes(1)
    expect(assign.mock.calls[0]?.[0]).toContain('/verify/company?resume=1')
    expect(assign.mock.calls[0]?.[0]).toContain('identityVerified=1')
  })

  it('locks prefilled identity fields during company handover', async () => {
    const wrapper = await mountPage('/verify/portal?sessionId=id_test_123&walletAddress=WalletXYZ&fullName=Ada%20Lovelace&dob=1815-12-10&country=GB')
    const fullNameInput = wrapper.get('[data-testid="full-name-input"]')
    expect((fullNameInput.element as HTMLInputElement).value).toBe('Ada Lovelace')
    expect(fullNameInput.attributes('readonly')).toBeDefined()
    expect(wrapper.text()).toContain('prefilled from the selected company officer')
  })
})
