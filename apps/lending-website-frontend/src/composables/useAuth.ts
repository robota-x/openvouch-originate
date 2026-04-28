// import { ref, computed, reactive } from "vue";
// import { getWallets } from "@wallet-standard/app";
// import { backendClient } from "../api/client";

// // Minimal wallet interfaces — avoids adding @wallet-standard/base as a direct dep.
// // Runtime objects from getWallets() implement this shape.
// interface WalletAccount {
//   address: string;
//   publicKey: Uint8Array;
//   chains: readonly string[];
//   features: readonly string[];
// }

// interface WalletFeatureConnect {
//   connect(opts?: {
//     silent?: boolean;
//   }): Promise<{ accounts: readonly WalletAccount[] }>;
// }

// interface WalletFeatureSignMessage {
//   signMessage(opts: {
//     account: WalletAccount;
//     message: Uint8Array;
//   }): Promise<readonly { signature: Uint8Array }[]>;
// }

// export interface DetectedWallet {
//   name: string;
//   icon: string;
//   // eslint-disable-next-line @typescript-eslint/no-explicit-any
//   raw: any;
// }

// // Refs live at module scope, not inside the function — this is intentional.
// // Every component that calls useAuth() receives the same ref instances, giving
// // shared reactive state without a store library. Moving them inside the function
// // would create a new independent copy per call, breaking cross-component sync.
// const address = ref<string | null>(null);
// const token = ref<string | null>(null);

// const isConnected = computed(() => !!address.value && !!token.value);

// /** Returns all Solana-compatible wallets detected in the browser. */
// function getSolanaWallets(): DetectedWallet[] {
//   const { get } = getWallets();
//   return get()
//     .filter((w) => w.chains.some((c) => c.startsWith("solana:")))
//     .map((w) => ({ name: w.name, icon: w.icon ?? "", raw: w }));
// }

// /** Full challenge → sign → verify flow for a single detected wallet. */
// async function connect(wallet: DetectedWallet): Promise<void> {
//   // 1. Connect wallet and get the first account
//   const connectFeature = wallet.raw.features[
//     "standard:connect"
//   ] as WalletFeatureConnect;
//   const { accounts } = await connectFeature.connect();
//   const account = accounts[0];
//   if (!account) throw new Error("No account returned by wallet");

//   const walletAddress = account.address;

//   // 2. Request a challenge nonce from the backend
//   const { nonce } = await backendClient.challenge(walletAddress);

//   // 3. Build the human-readable message and sign it
//   const message = new TextEncoder().encode(
//     `Sign this message to authenticate with OpenVouch Originate.\n\nNonce: ${nonce}`,
//   );
//   const signFeature = wallet.raw.features[
//     "solana:signMessage"
//   ] as WalletFeatureSignMessage;
//   const [{ signature }] = await signFeature.signMessage({ account, message });

//   // 4. Send signature to backend; receive JWT
//   const sigBase64 = btoa(String.fromCharCode(...signature));
//   const { token: jwt } = await backendClient.verify(
//     walletAddress,
//     nonce,
//     sigBase64,
//   );

//   address.value = walletAddress;
//   token.value = jwt;
// }

// async function disconnect(): Promise<void> {
//   if (token.value) await backendClient.logout(token.value).catch(() => {});
//   address.value = null;
//   token.value = null;
// }

// // reactive() is required here. Vue only auto-unwraps refs that are top-level
// // variables in <script setup>. Properties of a plain object (e.g. auth.address)
// // stay as Ref objects and do NOT unwrap in templates — auth.address.slice(...)
// // would throw at runtime. Wrapping in reactive() restores the auto-unwrap
// // behaviour that Pinia stores provide implicitly.
// export function useAuth() {
//   return reactive({
//     address,
//     token,
//     isConnected,
//     getSolanaWallets,
//     connect,
//     disconnect,
//   });
// }

// import { ref, computed, reactive } from "vue";
// import { getWallets } from "@wallet-standard/app";
// import { backendClient } from "../api/client";

// // ─────────────────────────────────────────────────────────────
// // Types
// // ─────────────────────────────────────────────────────────────

// interface WalletAccount {
//   address: string;
//   publicKey: Uint8Array;
//   chains: readonly string[];
//   features: readonly string[];
// }

// interface WalletFeatureConnect {
//   connect(opts?: {
//     silent?: boolean;
//   }): Promise<{ accounts: readonly WalletAccount[] }>;
// }

// interface WalletFeatureSignMessage {
//   signMessage(opts: {
//     account: WalletAccount;
//     message: Uint8Array;
//   }): Promise<readonly { signature: Uint8Array }[]>;
// }

// export interface DetectedWallet {
//   name: string;
//   icon: string;
//   raw: any;
// }

// // ─────────────────────────────────────────────────────────────
// // Global reactive state (shared across app)
// // ─────────────────────────────────────────────────────────────

// const address = ref<string | null>(localStorage.getItem("address"));
// const token = ref<string | null>(localStorage.getItem("token"));

// // True auth state (wallet + backend session)
// const isAuthenticated = computed(() => !!address.value && !!token.value);

// // ─────────────────────────────────────────────────────────────
// // Wallet discovery
// // ─────────────────────────────────────────────────────────────

// function getSolanaWallets(): DetectedWallet[] {
//   const { get } = getWallets();

//   return (
//     get()
//       .filter((w) => w.chains.some((c) => c.startsWith("solana:")))
//       // Optional: prioritize Phantom in UI
//       .sort((a, b) => (a.name === "Phantom" ? -1 : 1))
//       .map((w) => ({
//         name: w.name,
//         icon: w.icon ?? "",
//         raw: w,
//       }))
//   );
// }

// // ─────────────────────────────────────────────────────────────
// // Core login flow
// // ─────────────────────────────────────────────────────────────

// async function connect(wallet: DetectedWallet): Promise<void> {
//   // 1. Connect wallet
//   const connectFeature = wallet.raw.features[
//     "standard:connect"
//   ] as WalletFeatureConnect;
//   const { accounts } = await connectFeature.connect();

//   const account = accounts[0];
//   if (!account) throw new Error("No account returned by wallet");

//   const walletAddress = account.address;

//   // 2. Get nonce from backend
//   const { nonce } = await backendClient.challenge(walletAddress);

//   // 3. Sign message
//   const message = new TextEncoder().encode(
//     `Sign this message to authenticate with OpenVouch Originate.\n\nNonce: ${nonce}`,
//   );

//   const signFeature = wallet.raw.features[
//     "solana:signMessage"
//   ] as WalletFeatureSignMessage;
//   const [{ signature }] = await signFeature.signMessage({
//     account,
//     message,
//   });

//   // 4. Convert signature → base64
//   const sigBase64 = btoa(String.fromCharCode(...signature));

//   // 5. Verify with backend → get JWT
//   const { token: jwt } = await backendClient.verify(
//     walletAddress,
//     nonce,
//     sigBase64,
//   );

//   // 6. Persist session
//   address.value = walletAddress;
//   token.value = jwt;

//   localStorage.setItem("address", walletAddress);
//   localStorage.setItem("token", jwt);
// }

// // ─────────────────────────────────────────────────────────────
// // Restore session (silent reconnect)
// // ─────────────────────────────────────────────────────────────

// async function restoreSession(): Promise<void> {
//   const wallets = getSolanaWallets();

//   for (const wallet of wallets) {
//     const connectFeature = wallet.raw.features[
//       "standard:connect"
//     ] as WalletFeatureConnect;

//     try {
//       const { accounts } = await connectFeature.connect({ silent: true });

//       if (accounts.length > 0) {
//         address.value = accounts[0].address;
//         return;
//       }
//     } catch {
//       // ignore silently
//     }
//   }
// }

// // ─────────────────────────────────────────────────────────────
// // Logout
// // ─────────────────────────────────────────────────────────────

// async function disconnect(): Promise<void> {
//   try {
//     if (token.value) {
//       await backendClient.logout(token.value);
//     }
//   } catch {
//     // ignore logout errors
//   }

//   address.value = null;
//   token.value = null;

//   localStorage.removeItem("address");
//   localStorage.removeItem("token");
// }

// // ─────────────────────────────────────────────────────────────
// // Export composable
// // ─────────────────────────────────────────────────────────────

// export function useAuth() {
//   return reactive({
//     address,
//     token,
//     isAuthenticated,
//     getSolanaWallets,
//     connect,
//     disconnect,
//     restoreSession,
//   });
// }

import { ref, computed, reactive } from "vue";
import { getWallets } from "@wallet-standard/app";
import { backendClient } from "../api/client";

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

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

// ─────────────────────────────────────────────────────────────
// State (shared across app)
// ─────────────────────────────────────────────────────────────

const address = ref<string | null>(localStorage.getItem("auth_address"));

const token = ref<string | null>(localStorage.getItem("auth_token"));

const isAuthenticated = computed(() => !!address.value && !!token.value);

// ─────────────────────────────────────────────────────────────
// Wallet detection
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

// ─────────────────────────────────────────────────────────────
// LOGIN FLOW (Phantom)
// ─────────────────────────────────────────────────────────────

async function connect(wallet: DetectedWallet): Promise<void> {
  const connectFeature = wallet.raw.features[
    "standard:connect"
  ] as WalletFeatureConnect;

  const { accounts } = await connectFeature.connect();

  const account = accounts[0];
  if (!account) throw new Error("No account returned by wallet");

  const walletAddress = account.address;

  const { nonce } = await backendClient.challenge(walletAddress);

  const message = new TextEncoder().encode(
    `Sign this message to authenticate with OpenVouch Originate.\n\nNonce: ${nonce}`,
  );

  const signFeature = wallet.raw.features[
    "solana:signMessage"
  ] as WalletFeatureSignMessage;

  const [{ signature }] = await signFeature.signMessage({
    account,
    message,
  });

  const sigBase64 = btoa(String.fromCharCode(...signature));

  const { token: jwt } = await backendClient.verify(
    walletAddress,
    nonce,
    sigBase64,
  );

  // ✅ STORE SESSION (THIS IS CORRECT PLACE)
  address.value = walletAddress;
  token.value = jwt;

  localStorage.setItem("auth_address", walletAddress);
  localStorage.setItem("auth_token", jwt);
}

// ─────────────────────────────────────────────────────────────
// 🔐 SECURE SESSION RESTORE (IMPORTANT FIX)
// ─────────────────────────────────────────────────────────────

async function restoreSession(): Promise<void> {
  const savedAddress = localStorage.getItem("auth_address");
  const savedToken = localStorage.getItem("auth_token");

  if (!savedAddress || !savedToken) return;

  try {
    // validate token with backend
    const me = await backendClient.me(savedToken);

    address.value = me.address;
    token.value = savedToken;
  } catch {
    // invalid session → clear everything
    localStorage.removeItem("auth_address");
    localStorage.removeItem("auth_token");

    address.value = null;
    token.value = null;
  }
}

// ─────────────────────────────────────────────────────────────
// LOGOUT
// ─────────────────────────────────────────────────────────────

async function disconnect(): Promise<void> {
  try {
    if (token.value) {
      await backendClient.logout(token.value);
    }
  } catch {
    // ignore backend errors
  }

  address.value = null;
  token.value = null;

  localStorage.removeItem("auth_address");
  localStorage.removeItem("auth_token");
}

// ─────────────────────────────────────────────────────────────
// EXPORT
// ─────────────────────────────────────────────────────────────

export function useAuth() {
  return reactive({
    address,
    token,
    isAuthenticated,
    getSolanaWallets,
    connect,
    disconnect,
    restoreSession,
  });
}
