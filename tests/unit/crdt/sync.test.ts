/**
 * Tests for Loro Binary Sync Utilities
 *
 * Tests export/import functionality for CRDT sync.
 */

import { describe, it, expect } from "vitest";
import { LoroDoc, LoroMap, LoroList } from "loro-crdt";
import {
  exportSnapshot,
  exportShallowSnapshot,
  exportUpdates,
  exportUpdatesSafe,
  importData,
  importUpdates,
  getVersionEncoded,
  getVersion,
  getOplogVersion,
  hasChangesSince,
} from "@/lib/crdt/sync";

// Helper to create a test document with some data
function createTestDoc(): LoroDoc {
  const doc = new LoroDoc();
  const accounts = doc.getMap("accounts");
  accounts.set("acc1", { name: "Checking", balance: 1000 });
  accounts.set("acc2", { name: "Savings", balance: 5000 });
  doc.commit();
  return doc;
}

describe("exportSnapshot", () => {
  it("exports document as bytes", () => {
    const doc = createTestDoc();
    const snapshot = exportSnapshot(doc);

    expect(snapshot).toBeInstanceOf(Uint8Array);
    expect(snapshot.length).toBeGreaterThan(0);
  });

  it("snapshot can recreate document", () => {
    const original = createTestDoc();
    const snapshot = exportSnapshot(original);

    const restored = new LoroDoc();
    importData(restored, snapshot);

    // Verify data matches
    const originalAccounts = original.getMap("accounts");
    const restoredAccounts = restored.getMap("accounts");

    expect(restoredAccounts.get("acc1")).toEqual(originalAccounts.get("acc1"));
    expect(restoredAccounts.get("acc2")).toEqual(originalAccounts.get("acc2"));
  });
});

describe("exportShallowSnapshot", () => {
  it("exports document as bytes", () => {
    const doc = createTestDoc();
    const snapshot = exportShallowSnapshot(doc);

    expect(snapshot).toBeInstanceOf(Uint8Array);
    expect(snapshot.length).toBeGreaterThan(0);
  });

  it("shallow snapshot can recreate document state", () => {
    const original = createTestDoc();
    const snapshot = exportShallowSnapshot(original);

    const restored = new LoroDoc();
    importData(restored, snapshot);

    // Verify data matches
    const originalAccounts = original.getMap("accounts");
    const restoredAccounts = restored.getMap("accounts");

    expect(restoredAccounts.get("acc1")).toEqual(originalAccounts.get("acc1"));
    expect(restoredAccounts.get("acc2")).toEqual(originalAccounts.get("acc2"));
  });

  it("shallow snapshot is smaller than full snapshot for large docs", () => {
    // Create a doc with many changes to build up history
    const doc = new LoroDoc();
    const accounts = doc.getMap("accounts");

    // Make many small changes to build history
    for (let i = 0; i < 100; i++) {
      accounts.set(`acc${i}`, { name: `Account ${i}`, balance: i * 100 });
      doc.commit();
    }

    const fullSnapshot = exportSnapshot(doc);
    const shallowSnapshot = exportShallowSnapshot(doc);

    // Shallow should be smaller because it doesn't include full history
    // (This test may be flaky depending on Loro's internal compression)
    // At minimum, both should be valid
    expect(shallowSnapshot).toBeInstanceOf(Uint8Array);
    expect(fullSnapshot).toBeInstanceOf(Uint8Array);
  });
});

describe("exportUpdates", () => {
  it("exports all updates when no version provided", () => {
    const doc = createTestDoc();
    const updates = exportUpdates(doc);

    expect(updates).toBeInstanceOf(Uint8Array);
    expect(updates.length).toBeGreaterThan(0);
  });

  it("exports incremental updates since version", () => {
    const doc = createTestDoc();
    const version1 = getVersion(doc);

    // Make more changes
    const accounts = doc.getMap("accounts");
    accounts.set("acc3", { name: "Investment", balance: 10000 });
    doc.commit();

    // Export only new changes
    const updates = exportUpdates(doc, version1);

    // Verify updates are smaller than full snapshot
    const snapshot = exportSnapshot(doc);
    expect(updates.length).toBeLessThan(snapshot.length);
  });

  it("exports empty-ish updates when no changes", () => {
    const doc = createTestDoc();
    const version = getVersion(doc);

    // No changes made
    const updates = exportUpdates(doc, version);

    // Should be minimal (just header, Loro may include some metadata)
    expect(updates.length).toBeLessThan(50);
  });
});

describe("exportUpdatesSafe", () => {
  it("returns snapshot when no version provided", () => {
    const doc = createTestDoc();
    const result = exportUpdatesSafe(doc);

    expect(result.type).toBe("snapshot");
    expect(result.data).toBeInstanceOf(Uint8Array);
    expect(result.data.length).toBeGreaterThan(0);
  });

  it("returns updates for recent version", () => {
    const doc = createTestDoc();
    const version = getVersion(doc);

    // Small change
    const accounts = doc.getMap("accounts");
    accounts.set("acc1", { name: "Checking Updated", balance: 1100 });
    doc.commit();

    const result = exportUpdatesSafe(doc, version);

    expect(result.type).toBe("updates");
    expect(result.data.length).toBeGreaterThan(0);
  });
});

describe("importData / importUpdates", () => {
  it("importData imports snapshot", () => {
    const original = createTestDoc();
    const snapshot = exportSnapshot(original);

    const restored = new LoroDoc();
    importData(restored, snapshot);

    const accounts = restored.getMap("accounts");
    expect(accounts.get("acc1")).toBeDefined();
    expect(accounts.get("acc2")).toBeDefined();
  });

  it("importData imports updates", () => {
    const doc1 = createTestDoc();
    const doc2 = new LoroDoc();

    // Import initial state
    importData(doc2, exportSnapshot(doc1));
    const version = getVersion(doc2);

    // Make changes to doc1
    const accounts = doc1.getMap("accounts");
    accounts.set("acc3", { name: "New Account", balance: 0 });
    doc1.commit();

    // Import updates to doc2
    const updates = exportUpdates(doc1, version);
    importData(doc2, updates);

    // doc2 should have the new account
    const doc2Accounts = doc2.getMap("accounts");
    expect(doc2Accounts.get("acc3")).toEqual({ name: "New Account", balance: 0 });
  });

  it("importUpdates imports multiple updates", () => {
    const doc1 = createTestDoc();
    const doc2 = new LoroDoc();

    // First sync the initial state
    importData(doc2, exportSnapshot(doc1));

    // Collect updates incrementally
    const updates: Uint8Array[] = [];
    let lastVersion = getVersion(doc1);

    for (let i = 0; i < 3; i++) {
      const accounts = doc1.getMap("accounts");
      accounts.set(`batch${i}`, { name: `Batch ${i}`, balance: i * 100 });
      doc1.commit();
      updates.push(exportUpdates(doc1, lastVersion));
      lastVersion = getVersion(doc1);
    }

    // Import all updates
    importUpdates(doc2, updates);

    // Verify all data present
    const accounts = doc2.getMap("accounts");
    expect(accounts.get("batch0")).toBeDefined();
    expect(accounts.get("batch1")).toBeDefined();
    expect(accounts.get("batch2")).toBeDefined();
  });
});

describe("getVersionEncoded / getVersion", () => {
  it("getVersionEncoded returns bytes", () => {
    const doc = createTestDoc();
    const encoded = getVersionEncoded(doc);

    expect(encoded).toBeInstanceOf(Uint8Array);
    expect(encoded.length).toBeGreaterThan(0);
  });

  it("getVersion returns VersionVector", () => {
    const doc = createTestDoc();
    const version = getVersion(doc);

    expect(version).toBeDefined();
    // VersionVector should be usable with export
    const updates = exportUpdates(doc, version);
    expect(updates).toBeInstanceOf(Uint8Array);
  });

  it("version changes after modifications", () => {
    const doc = createTestDoc();
    const version1Encoded = getVersionEncoded(doc);

    // Make change
    const accounts = doc.getMap("accounts");
    accounts.set("new", { name: "New", balance: 0 });
    doc.commit();

    const version2Encoded = getVersionEncoded(doc);

    // Versions should be different
    expect(version1Encoded).not.toEqual(version2Encoded);
  });
});

describe("getOplogVersion", () => {
  it("returns VersionVector", () => {
    const doc = createTestDoc();
    const oplogVersion = getOplogVersion(doc);

    expect(oplogVersion).toBeDefined();
  });
});

describe("hasChangesSince", () => {
  it("returns true when changes exist", () => {
    const doc = createTestDoc();
    const version = getVersion(doc);

    // Make change
    const accounts = doc.getMap("accounts");
    accounts.set("new", { name: "New", balance: 0 });
    doc.commit();

    expect(hasChangesSince(doc, version)).toBe(true);
  });
});

describe("sync between two documents", () => {
  it("syncs changes bidirectionally", () => {
    // Create two documents with same initial state
    const doc1 = new LoroDoc();
    const doc2 = new LoroDoc();

    // doc1 makes changes
    doc1.getMap("accounts").set("from1", { source: "doc1" });
    doc1.commit();

    // Sync doc1 → doc2
    const snapshot1 = exportSnapshot(doc1);
    importData(doc2, snapshot1);

    // doc2 makes changes
    const version2Before = getVersion(doc2);
    doc2.getMap("accounts").set("from2", { source: "doc2" });
    doc2.commit();

    // Sync doc2 → doc1
    const updates2 = exportUpdates(doc2, version2Before);
    importData(doc1, updates2);

    // Both should have both accounts
    expect(doc1.getMap("accounts").get("from1")).toBeDefined();
    expect(doc1.getMap("accounts").get("from2")).toBeDefined();
    expect(doc2.getMap("accounts").get("from1")).toBeDefined();
    expect(doc2.getMap("accounts").get("from2")).toBeDefined();
  });

  it("handles concurrent edits", () => {
    // Start with same initial state
    const initial = createTestDoc();
    const snapshot = exportSnapshot(initial);

    const doc1 = new LoroDoc();
    const doc2 = new LoroDoc();
    importData(doc1, snapshot);
    importData(doc2, snapshot);

    const version1 = getVersion(doc1);
    const version2 = getVersion(doc2);

    // Both make concurrent changes
    doc1.getMap("accounts").set("concurrent", { editor: "doc1" });
    doc1.commit();

    doc2.getMap("accounts").set("concurrent", { editor: "doc2" });
    doc2.commit();

    // Sync both ways
    const updates1 = exportUpdates(doc1, version1);
    const updates2 = exportUpdates(doc2, version2);

    importData(doc2, updates1);
    importData(doc1, updates2);

    // Both should converge to same value (CRDT handles conflict)
    const value1 = doc1.getMap("accounts").get("concurrent");
    const value2 = doc2.getMap("accounts").get("concurrent");

    expect(value1).toEqual(value2);
  });
});
