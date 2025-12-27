"use client";

/**
 * InviteLinkGenerator Component
 *
 * Generates invite links for sharing vault access with others.
 * The invite secret is stored only in the URL fragment (never sent to server).
 *
 * Flow:
 * 1. Generate random invite secret (32 bytes)
 * 2. Derive X25519 keypair from secret
 * 3. Wrap vault key with ephemeral public key
 * 4. Send wrapped key + pubkey to server
 * 5. Create invite URL with secret in fragment
 */

import { useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Copy, Check, Link2, Loader2, Clock } from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import sodium from "libsodium-wrappers";
import { initCrypto } from "@/lib/crypto/keypair";
import { wrapKey } from "@/lib/crypto/keywrap";

export interface InviteLinkGeneratorProps {
  /** Current vault ID */
  vaultId: string;
  /** Vault key (unwrapped) for wrapping with invite pubkey */
  vaultKey: Uint8Array;
  /** User's X25519 secret key for key wrapping */
  encSecretKey: Uint8Array;
  /** Whether user is vault owner (only owners can create invites) */
  isOwner: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Generates an invite link for sharing vault access.
 */
export function InviteLinkGenerator({
  vaultId,
  vaultKey,
  encSecretKey,
  isOwner,
  className,
}: InviteLinkGeneratorProps) {
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [role, setRole] = useState<"member" | "owner">("member");
  const [expiryHours, setExpiryHours] = useState<number>(48);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createInviteMutation = trpc.invite.create.useMutation();

  // Generate a new invite link
  const handleGenerate = useCallback(async () => {
    if (!isOwner) {
      setError("Only vault owners can create invites");
      return;
    }

    setIsGenerating(true);
    setError(null);
    setInviteUrl(null);

    try {
      await initCrypto();

      // 1. Generate random invite secret (32 bytes)
      const inviteSecret = sodium.randombytes_buf(32);

      // 2. Derive X25519 keypair from invite secret
      // We use the secret as the seed for a keypair
      const inviteKeypair = sodium.crypto_box_seed_keypair(inviteSecret);

      // 3. Wrap vault key with ephemeral public key
      const wrappedVaultKey = await wrapKey(vaultKey, inviteKeypair.publicKey, encSecretKey);

      // Convert to base64 for API
      const invitePubkeyBase64 = sodium.to_base64(
        inviteKeypair.publicKey,
        sodium.base64_variants.ORIGINAL
      );
      const wrappedVaultKeyBase64 = sodium.to_base64(
        wrappedVaultKey,
        sodium.base64_variants.ORIGINAL
      );

      // 4. Create invite on server
      const result = await createInviteMutation.mutateAsync({
        vaultId,
        invitePubkey: invitePubkeyBase64,
        encryptedVaultKey: wrappedVaultKeyBase64,
        role,
        expiresInHours: expiryHours,
      });

      // 5. Create invite URL with secret in fragment
      const inviteSecretBase64 = sodium.to_base64(inviteSecret, sodium.base64_variants.URLSAFE);
      const url = `${window.location.origin}/invite/${result.inviteId}#${inviteSecretBase64}`;

      setInviteUrl(url);
      setExpiresAt(result.expiresAt);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create invite");
    } finally {
      setIsGenerating(false);
    }
  }, [vaultId, vaultKey, encSecretKey, role, expiryHours, isOwner, createInviteMutation]);

  // Copy invite URL to clipboard
  const handleCopy = useCallback(async () => {
    if (!inviteUrl) return;

    try {
      await navigator.clipboard.writeText(inviteUrl);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch {
      setError("Failed to copy to clipboard");
    }
  }, [inviteUrl]);

  // Format expiry time
  const formatExpiry = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  };

  if (!isOwner) {
    return null;
  }

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Link2 className="h-5 w-5" />
          Invite Link
        </CardTitle>
        <CardDescription>
          Generate a link to invite someone to this vault. The link contains a secret that allows
          them to decrypt the vault key.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Invite configuration */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="role">Role</Label>
            <Select value={role} onValueChange={(v: string) => setRole(v as "member" | "owner")}>
              <SelectTrigger id="role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="member">Member</SelectItem>
                <SelectItem value="owner">Owner</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="expiry">Expires in</Label>
            <Select
              value={String(expiryHours)}
              onValueChange={(v: string) => setExpiryHours(Number(v))}
            >
              <SelectTrigger id="expiry">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1 hour</SelectItem>
                <SelectItem value="6">6 hours</SelectItem>
                <SelectItem value="24">24 hours</SelectItem>
                <SelectItem value="48">48 hours</SelectItem>
                <SelectItem value="168">1 week</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Generate button */}
        <Button onClick={handleGenerate} disabled={isGenerating} className="w-full sm:w-auto">
          {isGenerating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Link2 className="mr-2 h-4 w-4" />
              Generate Invite Link
            </>
          )}
        </Button>

        {/* Generated invite URL */}
        {inviteUrl && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Input value={inviteUrl} readOnly className="font-mono text-xs" />
              <Button variant="outline" size="icon" onClick={handleCopy}>
                {isCopied ? (
                  <Check className="h-4 w-4 text-green-600" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
                <span className="sr-only">Copy</span>
              </Button>
            </div>

            {expiresAt && (
              <p className="text-muted-foreground flex items-center gap-1 text-xs">
                <Clock className="h-3 w-3" />
                Expires: {formatExpiry(expiresAt)}
              </p>
            )}

            <p className="text-xs text-amber-600 dark:text-amber-400">
              ⚠️ This link can only be used once. Share it securely.
            </p>
          </div>
        )}

        {/* Error message */}
        {error && <p className="text-destructive text-sm">{error}</p>}
      </CardContent>
    </Card>
  );
}
