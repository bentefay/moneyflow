/**
 * Unlock Page
 *
 * Users enter their seed phrase to unlock the app.
 */

export default function UnlockPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-bold">Welcome back</h1>
        <p className="text-muted-foreground">Enter your recovery phrase to unlock your vault.</p>
      </div>

      {/* Placeholder - will be implemented in user stories */}
      <div className="text-muted-foreground rounded-lg border p-8 text-center">
        <p>Unlock form will be implemented in US-001</p>
      </div>
    </div>
  );
}
