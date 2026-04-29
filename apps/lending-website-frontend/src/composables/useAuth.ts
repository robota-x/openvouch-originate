import { ref, computed, reactive } from "vue";
import { getWallets } from "@wallet-standard/app";
import { backendClient } from "../api/client";

// ─────────────────────────────────────────────────────────────
// Types & Constants
// ─────────────────────────────────────────────────────────────

const STORAGE_KEY_ADDRESS = 'openvouch_auth_address'
const STORAGE_KEY_TOKEN   = 'openvouch_auth_token'

interface WalletAccount {
  address: string;
  publicKey: Uint8Array;
  chains: readonly string[];
  features: readonly string[];
}

interface WalletFeatureConnect {
  connect(opts?: { silent?: boolean }): Promise<{ accounts: readonly WalletAccount[] }>;
}

interface WalletFeatureSignMessage {
  signMessage(opts: { account: WalletAccount; message: Uint8Array }): Promise<readonly { signature: Uint8Array }[]>;
}

export interface DetectedWallet {
  name: string;
  icon: string;
  raw: any;
}

// ─────────────────────────────────────────────────────────────
// Global Auth State
// ─────────────────────────────────────────────────────────────

// Shared reactive state across components
const address = ref<string | null>(localStorage.getItem(STORAGE_KEY_ADDRESS));
const token   = ref<string | null>(localStorage.getItem(STORAGE_KEY_TOKEN));
const connectedWallet = ref<any>(null);

const isAuthenticated = computed(() => !!address.value && !!token.value);

// ─────────────────────────────────────────────────────────────
// Actions
// ─────────────────────────────────────────────────────────────

/**
 * Discovers and returns Solana-compatible wallets available in the browser.
 */
function getSolanaWallets(): DetectedWallet[] {
  const { get } = getWallets();
  return get()
    .filter((w) => w.chains.some((c) => c.startsWith("solana:")))
    .sort((a, b) => (a.name === "Phantom" ? -1 : 1))
    .map((w) => ({
      name: w.name,
      icon: w.icon ?? "",
      raw: w,
    }));
}

/**
 * Standardizes the login flow: 
 * 1. Wallet Connection
 * 2. Backend Challenge (Nonce)
 * 3. Message Signing
 * 4. Signature Verification & JWT issuance
 */
async function connect(wallet: DetectedWallet): Promise<void> {
  const connectFeature = wallet.raw.features["standard:connect"] as WalletFeatureConnect;
  const { accounts } = await connectFeature.connect();
  const account = accounts[0];
  if (!account) throw new Error("No account returned by wallet");

  const walletAddress = account.address;

  // Authentication cycle
  const { nonce } = await backendClient.challenge(walletAddress);
  const message = new TextEncoder().encode(
    `Sign this message to authenticate with OpenVouch Originate.\n\nNonce: ${nonce}`,
  );
  const signFeature = wallet.raw.features["solana:signMessage"] as WalletFeatureSignMessage;
  const [{ signature }] = await signFeature.signMessage({ account, message });

  const sigBase64 = btoa(String.fromCharCode(...signature));
  const { token: jwt } = await backendClient.verify(walletAddress, nonce, sigBase64);

  // Atomic state commit
  address.value = walletAddress;
  token.value   = jwt;
  connectedWallet.value = wallet.raw;
  localStorage.setItem(STORAGE_KEY_ADDRESS, walletAddress);
  localStorage.setItem(STORAGE_KEY_TOKEN, jwt);
}

/**
 * Validates any persisted session against the backend.
 * Clears state silently on failure.
 */
async function restoreSession(): Promise<void> {
  const savedToken = localStorage.getItem(STORAGE_KEY_TOKEN);
  if (!savedToken) return;

  try {
    const me = await backendClient.me(savedToken);
    address.value = me.address;
    token.value = savedToken;
  } catch (err) {
    console.warn('[useAuth] Session restoration failed (likely expired token)');
    await disconnect();
  }
}

/**
 * Clears local state and optionally notifies the backend.
 */
async function disconnect(): Promise<void> {
  if (token.value) {
    await backendClient.logout(token.value).catch(() => {});
  }
  
  address.value = null;
  token.value   = null;
  connectedWallet.value = null;
  localStorage.removeItem(STORAGE_KEY_ADDRESS);
  localStorage.removeItem(STORAGE_KEY_TOKEN);
}

// ─────────────────────────────────────────────────────────────
// Composable
// ─────────────────────────────────────────────────────────────

export function useAuth() {
  return reactive({ 
    address, 
    token, 
    connectedWallet,
    isAuthenticated, 
    getSolanaWallets, 
    connect, 
    disconnect, 
    restoreSession 
  })
}
