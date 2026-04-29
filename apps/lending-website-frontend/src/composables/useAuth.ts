import { ref, computed, reactive } from "vue";
import { getWallets } from "@wallet-standard/app";
import { backendClient } from "../api/client";

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

interface WalletAccount {
  address: string;
  publicKey: Uint8Array;
  chains: readonly string[];
  features: readonly string[];
}

interface WalletFeatureConnect {
  connect(opts?: {
    silent?: boolean;
  }): Promise<{ accounts: readonly WalletAccount[] }>;
}

interface WalletFeatureSignMessage {
  signMessage(opts: {
    account: WalletAccount;
    message: Uint8Array;
  }): Promise<readonly { signature: Uint8Array }[]>;
}

export interface DetectedWallet {
  name: string;
  icon: string;
  raw: any;
}

// ─────────────────────────────────────────────
// State
// ─────────────────────────────────────────────

const address = ref<string | null>(localStorage.getItem("auth_address"));

const token = ref<string | null>(localStorage.getItem("auth_token"));

const loading = ref(false);

const isAuthenticated = computed(() => !!address.value && !!token.value);

// ─────────────────────────────────────────────
// Wallet discovery
// ─────────────────────────────────────────────

function getSolanaWallets(): DetectedWallet[] {
  const { get } = getWallets();

  return get()
    .filter((w) => w.chains.some((c) => c.startsWith("solana:")))
    .sort((a, b) => (a.name === "Phantom" ? -1 : 1)) // prioritize Phantom
    .map((w) => ({
      name: w.name,
      icon: w.icon ?? "",
      raw: w,
    }));
}

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

function toBase64(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes));
}

// ─────────────────────────────────────────────
// CONNECT (Phantom login flow)
// ─────────────────────────────────────────────

async function connect(wallet: DetectedWallet): Promise<void> {
  if (loading.value) return;
  loading.value = true;

  try {
    const connectFeature = wallet.raw.features[
      "standard:connect"
    ] as WalletFeatureConnect;

    const { accounts } = await connectFeature.connect();

    const account = accounts?.[0];
    if (!account) throw new Error("No wallet account returned");

    const walletAddress = account.address;

    // 1. get nonce
    const { nonce } = await backendClient.challenge(walletAddress);

    // 2. sign message
    const message = new TextEncoder().encode(
      `Sign this message to authenticate with our platform.\n\nNonce: ${nonce}`,
    );

    const signFeature = wallet.raw.features[
      "solana:signMessage"
    ] as WalletFeatureSignMessage;

    const [{ signature }] = await signFeature.signMessage({
      account,
      message,
    });

    // 3. verify backend
    const sigBase64 = toBase64(signature);

    const { token: jwt } = await backendClient.verify(
      walletAddress,
      nonce,
      sigBase64,
    );

    // 4. persist session
    address.value = walletAddress;
    token.value = jwt;

    localStorage.setItem("auth_address", walletAddress);
    localStorage.setItem("auth_token", jwt);
  } finally {
    loading.value = false;
  }
}

// ─────────────────────────────────────────────
// RESTORE SESSION
// ─────────────────────────────────────────────

async function restoreSession(): Promise<void> {
  const savedToken = localStorage.getItem("auth_token");
  const savedAddress = localStorage.getItem("auth_address");

  if (!savedToken || !savedAddress) return;

  try {
    const me = await backendClient.me(savedToken);

    address.value = me.address;
    token.value = savedToken;
  } catch {
    // invalid session cleanup
    localStorage.removeItem("auth_token");
    localStorage.removeItem("auth_address");

    address.value = null;
    token.value = null;
  }
}

// ─────────────────────────────────────────────
// LOGOUT
// ─────────────────────────────────────────────

async function disconnect(): Promise<void> {
  try {
    if (token.value) {
      await backendClient.logout(token.value);
    }
  } catch {
    // ignore
  }

  address.value = null;
  token.value = null;

  localStorage.removeItem("auth_address");
  localStorage.removeItem("auth_token");
}

// ─────────────────────────────────────────────
// EXPORT
// ─────────────────────────────────────────────

export function useAuth() {
  return reactive({
    address,
    token,
    loading,
    isAuthenticated,

    getSolanaWallets,
    connect,
    disconnect,
    restoreSession,
  });
}
