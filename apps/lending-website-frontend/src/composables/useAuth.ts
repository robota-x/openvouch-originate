import { ref, computed, reactive, markRaw } from "vue";
import { getWallets } from "@wallet-standard/app";
import { backendClient } from "../api/client";

// ─────────────────────────────────────────────────────────────
// Types & Constants
// ─────────────────────────────────────────────────────────────

const STORAGE_KEY_ADDRESS = 'openvouch_auth_address'
const STORAGE_KEY_TOKEN   = 'openvouch_auth_token'
const STORAGE_KEY_WALLET  = 'openvouch_auth_wallet'

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

const address = ref<string | null>(localStorage.getItem(STORAGE_KEY_ADDRESS));
const token   = ref<string | null>(localStorage.getItem(STORAGE_KEY_TOKEN));
const connectedWallet = ref<any>(null);
const attestationCount = ref(0);

const isAuthenticated = computed(() => !!address.value && !!token.value);
const isWalletMissing = computed(() => isAuthenticated.value && !connectedWallet.value);

// ─────────────────────────────────────────────────────────────
// Actions
// ─────────────────────────────────────────────────────────────

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
  // NOTE: markRaw is essential for Metamask (Solana Snaps) compatibility.
  // Vue proxies can interfere with private fields/methods in the wallet provider object.
  connectedWallet.value = markRaw(wallet.raw);
  
  localStorage.setItem(STORAGE_KEY_ADDRESS, walletAddress);
  localStorage.setItem(STORAGE_KEY_TOKEN, jwt);
  localStorage.setItem(STORAGE_KEY_WALLET, wallet.name);
}

/**
 * Called on every page load. Verifies the stored JWT, then silently reconnects
 * the wallet without prompting the user. If the wallet is locked, connectedWallet
 * stays null and isWalletMissing shows the Re-authorize button.
 */
async function restoreSession(): Promise<void> {
  const savedToken      = localStorage.getItem(STORAGE_KEY_TOKEN);
  const savedAddress    = localStorage.getItem(STORAGE_KEY_ADDRESS);
  const savedWalletName = localStorage.getItem(STORAGE_KEY_WALLET);

  if (!savedToken || !savedAddress) return;

  try {
    const me = await backendClient.me(savedToken);
    address.value = me.address;
    token.value   = savedToken;
  } catch {
    // JWT expired or backend unreachable — clear persisted session.
    await disconnect();
    return;
  }

  if (!savedWalletName) return;

  const match = getSolanaWallets().find(w => w.name === savedWalletName);
  if (!match) return;

  try {
    // silent:true reconnects without a popup when the wallet is already unlocked
    // and the site is trusted. Falls through to the Re-authorize button otherwise.
    const connectFeature = match.raw.features['standard:connect'] as WalletFeatureConnect;
    const { accounts } = await connectFeature.connect({ silent: true });
    if (accounts.some((a: WalletAccount) => a.address === savedAddress)) {
      connectedWallet.value = markRaw(match.raw);
    }
  } catch {
    // Wallet locked — isWalletMissing will display the Re-authorize button.
  }
}

/**
 * Explicitly triggers reconnection for the stored wallet provider.
 */
async function reconnect(): Promise<void> {
  const savedWalletName = localStorage.getItem(STORAGE_KEY_WALLET);
  if (!savedWalletName) throw new Error("No wallet provider stored");

  const wallets = getSolanaWallets();
  const match = wallets.find(w => w.name === savedWalletName);
  if (!match) throw new Error(`Wallet ${savedWalletName} not found`);

  // We re-run connect but it should be fast since they are already authorized in the backend
  await connect(match);
}

async function disconnect(): Promise<void> {
  if (token.value) {
    await backendClient.logout(token.value).catch(() => {});
  }
  
  address.value = null;
  token.value   = null;
  connectedWallet.value = null;
  localStorage.removeItem(STORAGE_KEY_ADDRESS);
  localStorage.removeItem(STORAGE_KEY_TOKEN);
  localStorage.removeItem(STORAGE_KEY_WALLET);
}

export function useAuth() {
  return reactive({ 
    address, 
    token, 
    connectedWallet,
    attestationCount,
    isAuthenticated,
    isWalletMissing,
    getSolanaWallets, 
    connect, 
    reconnect,
    disconnect, 
    restoreSession 
  })
}
