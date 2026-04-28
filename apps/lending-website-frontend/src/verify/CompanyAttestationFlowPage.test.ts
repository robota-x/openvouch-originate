import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createRouter, createWebHistory } from 'vue-router'
import CompanyAttestationFlowPage from './CompanyAttestationFlowPage.vue'
import { ApiError } from '../types'

const {
  getIdentity,
  startVerification,
  getCompany,
  startVerificationSession,
  completeVerificationSession,
  getStatus,
} = vi.hoisted(() => ({
  getIdentity: vi.fn(),
  startVerification: vi.fn(),
  getCompany: vi.fn(),
  startVerificationSession: vi.fn(),
  completeVerificationSession: vi.fn(),
  getStatus: vi.fn(),
}))

vi.mock('../api/client', () => ({
  identityClient: {
    getIdentity,
    startVerification,
  },
  attestationClient: {
    getCompany,
    startVerificationSession,
    completeVerificationSession,
    getStatus,
  },
  ApiError: class ApiError extends Error {
    status?: number

    constructor(message: string, _code: string, status?: number) {
      super(message)
      this.status = status
    }
  },
}))

vi.mock('../composables/useAuth', () => ({
  useAuth: () => ({
    address: 'WalletABC',
  }),
}))

async function mountPage(path = '/verify/company') {
  const router = createRouter({
    history: createWebHistory(),
    routes: [{ path: '/verify/company', component: CompanyAttestationFlowPage }],
  })
  await router.push(path)
  await router.isReady()
  return mount(CompanyAttestationFlowPage, {
    global: { plugins: [router] },
  })
}

describe('CompanyAttestationFlowPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getCompany.mockResolvedValue({
      companyNumber: '12345678',
      name: 'ACME LTD',
      status: 'active',
      registeredOfficeAddress: {},
      directors: [{
        name: 'Ada Lovelace',
        role: 'director',
        appointedOn: '2020-01-01',
        dob: '1815-12-10',
        country: 'GB',
      }],
    })
    startVerificationSession.mockResolvedValue({
      sessionId: 'sess_1',
      challengeMessage: 'challenge',
      companyName: 'ACME LTD',
      verifiedIdentity: 'ADA LOVELACE',
    })
    completeVerificationSession.mockResolvedValue({
      success: true,
      attestationAddress: 'att_1',
      companyName: 'ACME LTD',
      expiresAt: 123,
    })
    getStatus.mockResolvedValue({
      verified: true,
      attestationAddress: 'att_1',
      companyName: 'ACME LTD',
    })
  })

  it('completes attestation directly when identity already matches selected director', async () => {
    getIdentity.mockResolvedValue({
      verified: true,
      identity: { fullName: 'ADA LOVELACE', dob: '1815-12-10', country: 'GB', verifiedAt: Date.now() },
    })

    const wrapper = await mountPage()
    await wrapper.get('[data-testid="company-number-input"]').setValue('12345678')
    await wrapper.get('[data-testid="lookup-company-button"]').trigger('click')
    await Promise.resolve()
    await wrapper.get('[data-testid="start-company-flow-button"]').trigger('click')
    await Promise.resolve()
    await Promise.resolve()

    expect(startVerification).not.toHaveBeenCalled()
    expect(startVerificationSession).toHaveBeenCalledTimes(1)
    expect(completeVerificationSession).toHaveBeenCalledTimes(1)
    expect(wrapper.text()).toContain('Attestation completed')
  })

  it('redirects to identity portal when identity is missing', async () => {
    getIdentity.mockResolvedValue({ verified: false })
    startVerification.mockResolvedValue({
      sessionId: 'id_sess_1',
      verificationUrl: 'http://localhost:5173/verify/portal?sessionId=id_sess_1',
    })
    const assign = vi.spyOn(window.location, 'assign').mockImplementation(() => {})

    const wrapper = await mountPage()
    await wrapper.get('[data-testid="company-number-input"]').setValue('12345678')
    await wrapper.get('[data-testid="lookup-company-button"]').trigger('click')
    await Promise.resolve()
    await wrapper.get('[data-testid="start-company-flow-button"]').trigger('click')
    await Promise.resolve()

    expect(startVerificationSession).not.toHaveBeenCalled()
    expect(startVerification).toHaveBeenCalledTimes(1)
    expect(startVerification).toHaveBeenCalledWith(
      'WalletABC',
      expect.stringContaining('/verify/company?resume=1'),
      expect.objectContaining({
        fullName: 'Ada Lovelace',
        dob: '1815-12-10',
        country: 'GB',
      }),
    )
    expect(assign).toHaveBeenCalledTimes(1)
  })

  it('shows actionable error when Companies House auth fails', async () => {
    getCompany.mockRejectedValue(new ApiError('ch_api_auth_failed', 'HTTP_502', 502))

    const wrapper = await mountPage()
    await wrapper.get('[data-testid="company-number-input"]').setValue('06770815')
    await wrapper.get('[data-testid="lookup-company-button"]').trigger('click')
    await Promise.resolve()

    expect(wrapper.get('[data-testid="company-flow-error"]').text()).toContain('Companies House API key is missing or invalid')
  })
})
