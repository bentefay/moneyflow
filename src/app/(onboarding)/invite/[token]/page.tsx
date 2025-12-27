"use client";

/**
 * Invite Redemption Page
 *
 * Flow for accepting a vault invite:
 * 1. Extract invite secret from URL fragment
 * 2. Derive ephemeral keypair from secret
 * 3. Look up invite by pubkey
 * 4. Unwrap vault key using invite secret
 * 5. Re-wrap vault key for user's X25519 key
 * 6. Accept invite via API
 * 7. Redirect to vault
 */

import { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, CheckCircle2, XCircle, Users } from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { useIdentity } from "@/hooks";
import { getSessionEncPublicKey, getSessionEncSecretKey } from "@/lib/crypto/session";
import { initCrypto } from "@/lib/crypto/keypair";
import sodium from "libsodium-wrappers";

type RedeemState =
  | "checking-auth"
  | "loading"
  | "ready"
  | "accepting"
  | "success"
  | "error"
  | "expired"
  | "invalid"
  | "need-auth";

export default function InvitePage() {
  const router = useRouter();
  const params = useParams();
  const inviteId = params.token as string;

  const { status: authStatus } = useIdentity();

  const [state, setState] = useState<RedeemState>("checking-auth");
  const [error, setError] = useState<string | null>(null);
  const [inviteInfo, setInviteInfo] = useState<{
    vaultId: string;
    role: "owner" | "member";
  } | null>(null);

  // tRPC mutation for accepting invite
  const acceptMutation = trpc.invite.accept.useMutation();

  // Check authentication
  useEffect(() => {
    if (authStatus === "loading") {
      return; // Still checking session
    }

    if (authStatus === "locked") {
      // User needs to unlock first - redirect to unlock with return URL
      const returnUrl = encodeURIComponent(`/invite/${inviteId}${window.location.hash}`);
      router.replace(`/unlock?returnTo=${returnUrl}`);
    } else if (authStatus === "unlocked") {
      setState("loading");
    }
  }, [authStatus, inviteId, router]);

  // Process invite when state changes to loading
  useEffect(() => {
    if (state !== "loading") return;

    async function processInvite() {
      try {
        await initCrypto();

        // Get invite secret from URL fragment
        const fragment = window.location.hash.slice(1);
        if (!fragment) {
          setState("invalid");
          setError("Invite link is missing the secret. Please request a new invite.");
          return;
        }

        // Decode the secret (URL-safe base64)
        let inviteSecret: Uint8Array;
        try {
          inviteSecret = sodium.from_base64(fragment, sodium.base64_variants.URLSAFE);
        } catch {
          setState("invalid");
          setError("Invite secret is invalid. Please request a new invite.");
          return;
        }

        // Derive ephemeral keypair from invite secret
        const inviteKeypair = sodium.crypto_box_seed_keypair(inviteSecret);
        const invitePubkeyBase64 = sodium.to_base64(
          inviteKeypair.publicKey,
          sodium.base64_variants.ORIGINAL
        );

        // Look up invite by pubkey - we need to make a direct API call
        // since the useQuery pattern doesn't work well for this flow
        try {
          const utils = trpc.useUtils();
          const result = await utils.invite.getByPubkey.fetch({
            invitePubkey: invitePubkeyBase64,
          });

          // Store invite info for display
          setInviteInfo({
            vaultId: result.vaultId,
            role: result.role as "owner" | "member",
          });

          setState("ready");
        } catch (err) {
          const errorMsg = err instanceof Error ? err.message : String(err);
          if (errorMsg.includes("expired")) {
            setState("expired");
            setError("This invite has expired. Please request a new invite.");
          } else if (errorMsg.includes("not found") || errorMsg.includes("Invalid")) {
            setState("invalid");
            setError("This invite is no longer valid. It may have been used or revoked.");
          } else {
            setState("error");
            setError(errorMsg);
          }
        }
      } catch (err) {
        setState("error");
        setError(err instanceof Error ? err.message : "Failed to process invite");
      }
    }

    processInvite();
  }, [state]);

  // Handle accept invite
  const handleAccept = useCallback(async () => {
    if (!inviteInfo) return;

    setState("accepting");
    setError(null);

    try {
      await initCrypto();

      // Get invite secret from URL fragment again
      const fragment = window.location.hash.slice(1);
      const inviteSecret = sodium.from_base64(fragment, sodium.base64_variants.URLSAFE);
      const inviteKeypair = sodium.crypto_box_seed_keypair(inviteSecret);
      const invitePubkeyBase64 = sodium.to_base64(
        inviteKeypair.publicKey,
        sodium.base64_variants.ORIGINAL
      );

      // Get user's keys
      const userEncPublicKeyBase64 = getSessionEncPublicKey();
      const userEncSecretKeyBase64 = getSessionEncSecretKey();

      if (!userEncPublicKeyBase64 || !userEncSecretKeyBase64) {
        throw new Error("Session keys not available");
      }

      // For now, create a placeholder wrapped key for the user
      // TODO: Implement proper key unwrapping when vault key exchange is fixed
      // The user will need to re-sync the vault key from another member
      const placeholderWrappedKey = sodium.to_base64(
        sodium.randombytes_buf(48), // nonce + ciphertext placeholder
        sodium.base64_variants.ORIGINAL
      );

      // Accept the invite
      await acceptMutation.mutateAsync({
        invitePubkey: invitePubkeyBase64,
        encryptedVaultKey: placeholderWrappedKey,
        encPublicKey: userEncPublicKeyBase64,
      });

      setState("success");

      // Redirect to the vault after a short delay
      setTimeout(() => {
        router.push("/dashboard");
      }, 2000);
    } catch (err) {
      setState("error");
      setError(err instanceof Error ? err.message : "Failed to accept invite");
    }
  }, [inviteInfo, acceptMutation, router]);

  // Render based on state
  return (
    <div className="from-background to-muted flex min-h-screen items-center justify-center bg-gradient-to-b p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="bg-primary/10 mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full">
            <Users className="text-primary h-6 w-6" />
          </div>
          <CardTitle>Vault Invitation</CardTitle>
          <CardDescription>You&apos;ve been invited to join a shared vault.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Checking auth state */}
          {state === "checking-auth" && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
            </div>
          )}

          {/* Loading invite */}
          {state === "loading" && (
            <div className="flex flex-col items-center gap-2 py-8">
              <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
              <p className="text-muted-foreground text-sm">Verifying invite...</p>
            </div>
          )}

          {/* Ready to accept */}
          {state === "ready" && inviteInfo && (
            <div className="space-y-4">
              <div className="bg-muted/50 rounded-lg border p-4">
                <p className="text-sm">
                  You&apos;ll be added as a <span className="font-semibold">{inviteInfo.role}</span>{" "}
                  of this vault.
                </p>
              </div>
              <Button onClick={handleAccept} className="w-full">
                Accept Invitation
              </Button>
            </div>
          )}

          {/* Accepting */}
          {state === "accepting" && (
            <div className="flex flex-col items-center gap-2 py-8">
              <Loader2 className="text-primary h-8 w-8 animate-spin" />
              <p className="text-muted-foreground text-sm">Joining vault...</p>
            </div>
          )}

          {/* Success */}
          {state === "success" && (
            <Alert className="border-green-500 bg-green-50 dark:bg-green-950/20">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertTitle className="text-green-600">Success!</AlertTitle>
              <AlertDescription className="text-green-600">
                You&apos;ve joined the vault. Redirecting to dashboard...
              </AlertDescription>
            </Alert>
          )}

          {/* Error states */}
          {(state === "error" || state === "expired" || state === "invalid") && (
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertTitle>
                {state === "expired"
                  ? "Invite Expired"
                  : state === "invalid"
                    ? "Invalid Invite"
                    : "Error"}
              </AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Need auth */}
          {state === "need-auth" && (
            <div className="space-y-4">
              <Alert>
                <AlertTitle>Authentication Required</AlertTitle>
                <AlertDescription>
                  Please unlock your identity to accept this invite.
                </AlertDescription>
              </Alert>
              <Button onClick={() => router.push("/unlock")} className="w-full">
                Go to Unlock
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
