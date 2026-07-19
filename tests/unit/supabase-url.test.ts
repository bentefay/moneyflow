import { describe, expect, it } from "vitest";

import { requireSecureSupabaseUrl } from "@/lib/supabase/url";

describe("requireSecureSupabaseUrl", () => {
    it.each(["https://example.supabase.co", "https://example.supabase.co/"])(
        "accepts HTTPS in production: %s",
        (url) => {
            expect(requireSecureSupabaseUrl(url, "production")).toBe("https://example.supabase.co");
        }
    );

    it.each(["http://localhost:54321", "http://127.0.0.1:54321"])(
        "accepts loopback HTTP outside production: %s",
        (url) => {
            expect(requireSecureSupabaseUrl(url, "development")).toBe(url);
        }
    );

    it.each([
        ["http://example.supabase.co", "development"],
        ["http://127.0.0.1:54321", "production"]
    ])("rejects insecure transport: %s in %s", (url, environment) => {
        expect(() => requireSecureSupabaseUrl(url, environment)).toThrow(
            "Supabase URL must use HTTPS"
        );
    });
});
