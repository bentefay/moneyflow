- [x] The account selector in the transaction row doesn't work (it doesn't open the dropdown)

- [x] The add transaction row should have the same columns as the main table rows (including account
      and status)

- [x] Current clicking a row selects it. Change that so you have to click the checkbox (with a click
      area of the entire cell to make it easy) to select. This avoids accidental selection when
      trying to edit a cell.

- [x] Consider switch to ag grid community. I believe it supports all our needs out of the box,
      including virtual scrolling, cell editing, custom cell renderers, keyboard navigation, etc. It
      would reduce our custom code and maintenance burden. We can keep using our own implementation,
      as keyboard navigation (below) worked better than expected.

- [x] Add keyboard navigation to the transactions table. Arrow keys to move between cells, enter to
      start editing a cell, escape to stop editing a cell, tab to move to next editable cell, shift
      tab to move to previous editable cell.

- [x] On small width devices the entire page scrolls rather than just the transactions table. We
      should fix this so only the transactions table scrolls horizontally. The border under each row
      and the hover background is only the visible width of the container (the client width rather
      than the scroll width) in the transaction table at small break points

- [x] Can you implement a few features related to the top app menu bar on the left?
    - The vault selector and saving indicator should be visible when the menu is collapsed, with
      nice icons. Specifically, lets switch the coloured circles to larger coloured circles with
      icons inside. Use lucide icons. Add a tooltip so it's obvious what they are even when
      collapsed. Then show the circle with icon only when collapsed. The vault indicator should just
      be an icon that opens the select popup. The whole vault name doesn't need to be visible.
    - At small breakpoints the left bar should switch to a top bar with the MoneyFlow icon logo and
      a menu that you can click to open a menu page.

- [x] When creating a vault the default currency should be inferred from time zone or culture
      (https://gist.github.com/mizrael/50c10be8ec92264751187d7705362eb2)? I'm guessing time zone is
      probably a better indicator of country?

- [x] Tags should be stored as IDs on transactions so they can be renamed. The tag management page
      should support renaming tags. Tags also have a default colour, and this can be changed on the
      tag management page. **DONE**: Tags were already stored as IDs. Added `color` field to
      tagSchema with auto-assignment from 16-color palette on creation. Tags page shows colored icon
      and color picker. Transaction table shows colored tag pills.

- [x] In csv and OFX exports the merchant (for credit card) and user descriptions of transfers (for
      savings accounts) are saved in the "memo" field. Calling it merchant is thus incorrect. I
      doubt many people would know what "memo" means, so what do you think about renaming the
      current "description" field to "notes" and then rename the current "merchant" field to
      "description". **DONE**: Renamed `description` → `notes` (user notes/memo field) and
      `merchant` → `description` (imported text from bank file). Automation conditions now use
      `description` column.

- [x] We need a transfer tag, right? Should be used to determine who owes who what. I think this
      already exists.

- [x] Fix ofx import

- [x] When importing, add a select to optionally either...
    1. ignore all or
    2. ignore duplicates or
    3. do not ignore

    ...transactions that are more than X days older than the newest existing transaction

- [x] Add two selects for configuring whether a transaction wheter a transaction must be an exact
      match to be considered duplicate or whether additionally can be:
    -   1. have a date within X days and
    -   2. a similar description (using the current string similarity logic with threshold)

- [x] Duplicate checking should only ever compare existing transactions in account against new
      transactions in account (i.e. identical transaction in a file or in an existing vault are
      never considered as duplicates (unless they're already duplicates))

- [x] For CSV and OFX, I want to change the import flow a bit. All of the features that currently
      exist are great and should be kept. However, I think it would be more streamlined if we switch
      to always showing input and output data, and having tabs to configure the transformation. At
      any point you can click import to complete the process. Specifically, the import process
      should show the raw file data and a preview of the imported data as a single table (columns
      for both, with a strong vertical line between). The raw data should be on the left, unordered,
      completely unformatted. The preview columns should be representative of how the transactions
      will look in the transactions table after parsing (show duplicates, formatted dates, tags,
      description aliases, etc). Plus a status column at the end, same as what you currently have in
      the preview table. The current preview table is really good. It just diverges from how it will
      look in the final transaction view. Keep the total rows, valid transactions, rows with errors
      counts as well (the current preview looks really good). Make sure this logic is reused - i.e.
      the import is where these things are calculated for the new transactions. Then when import
      confirmed the new transactions are merged into the existing data structure. Replace the
      wizard. The table should be always visible on the right or below (if screen too small). On the
      left are tabs replacing the wizard steps (use animate-ui tabs - see below), for
      choosing/creating template, column mapping, formatting, etc. The "auto-detect" buttons should
      be automatically applied rather than needing to be clicked.

- [x] When importing, add a checkbox to optionally choose to collapse whitespace between words for
      descriptions (similar to how text works in html without pre).

- [x] When importing CSV, add a required account select to choose which account to import into.
      There should be a account selector for OFX too - except with OFX we use the account from the
      file by default if it matches an existing account. If the account id doesn't match any
      configured account and the OFX file contains an account number and the account selected by the
      user doesn't have an account id already, we apply the account id from the OFX file to the
      account.

- [x] Investigate Uppy 5.0 (https://uppy.io/blog/uppy-5.0/) as replacement for custom FileDropzone
      component
    - Current: Custom HTML5 drag-and-drop implementation in
      src/components/features/import/FileDropzone.tsx
    - Evaluate: Bundle size impact, features (progress, resumable uploads, file previews),
      integration complexity
    - Specifically using the useDropzone hook (if it provides any value)
    - Nevermind - the current implementation is already really good, and we only need the most basic
      features (we don't need uploading, resumable uploads, etc.)

- [x] Import should default to match exactly on date and description

- [x] Duplicate transactions should always sort immediately after the original row

- [x] Before release (and needing to make backwards compatible changes), we should make sure we are
      storing transactions and other state in a way that supports efficient lookup and modification
      given our access patterns. Should we store transactions as an ordered movable list and always
      use both date and transaction id to locate transaction for update using binary search on date
      (i.e. never look up by id alone).
    - Ordering within date should be preserved when importing. Perhaps we should store the source's
      transaction ordering within each date as an additional sub date index on each transaction so
      we can preserve ordering?

    - Should we should store transactions as follows:

    ```
    type Transactions = LoroMap<account id, YearlyTransactions>
    type YearlyTransactions = { transactions: LoroMovableList<MonthlyTransactions>, transactionCount:
       number, balance: number, byPersonAmountsOwing: Map<personId, number> }
    type MonthlyTransactions = { transactions: LoroMovableList<DailyTransactions>, transactionCount: number,
      balance: number, byPersonAmountsOwing: Map<personId, number> }
    - type DailyTransactions = { transactions: LoroMovableList<TransactionList>, transactionCount: number, balance:
      number, byPersonAmountsOwing: Map<personId, number> }
    ```

    - I'm wondering specifically whether this might prevent the need to modify a potentially
      enormous list if we keep transactions flattened. Potentially faster for aggregation, less
      churn on  
      indices and better memory reuse? We can then do linear time merge for rendering, and much
      faster searching by account? Imports should be very efficient using this structure (linear
      time).
    - We should make sure that if we are mapping from the immutable loro data structures to
      in-memory structures for rendering, that we memoize and reuse as much as possible to avoid
      garbage collection churn and unnecessary re-renders. With this structure we can potentially
      even reuse  
      all the existing monthly and yearly structures if they are unchanged during an import?
    - When doing performance optimisation, duplicate detection should be updated to be O(n + m) by
      sorting the import transactions and linearly scanning the existing (n) and new (m)
      transactions (plus the allowed date closeness in days n)

- [x] When clicking "Add Transaction" on the Transactions tab, it should just add a new empty row
  with all normal affordances. If we need to support empty descriptions as a result, that's fine.
  The current behaviour where you have to click the checkbox or x is too confusing. So specifically,
  it is just a normal, selectable row without the tick or cross buttons at the end. Pressing arrow
  keys moves between rows like normal. More than one empty row can be created.

- [x] Upgrade to the very latest safe-chain supported version of all dependencies

- [] Do a sweep of the full code base for code quality based on our style guide

- [] We should be using loro ephemeral state for tracking presence and active transaction. Make sure
  you understand https://loro.dev/llms-full.txt and https://github.com/loro-dev/loro-mirror before
  implementing.

- [x] Add description aliases - these are much like tags in that there is a single curated list of
  aliases. Stored as an optional ID on each transaction. There is a page ("Tx Descriptions" nav
  item) where description aliases can be created, deleted and renamed. As part of this feature, we
  change the description field on transactions to make it read only - the raw imported description
  text can't be changed. Instead, the description cell in the transactions table becomes a hybrid
  text input / autocomplete.

    **Cell UX:** The description cell is a text input that always shows text — either the alias name
    (if one is set) or the original imported description (if no alias yet). It behaves like
    InlineEditableText: _click once_ to position cursor, then edit. In other words, there is no
    friction - the user can click any description in the table and have their cursor immediately at
    that position in the clicked description. As the user types, an autocomplete dropdown appears
    showing existing aliases that match. The dropdown only mounts on hover or keyboard navigation
    into the cell (not on every row) to keep the virtualized table performant. The first item in the
    autocomplete is NOT selected by default. The user must press down to focus the first element,
    then enter to select it and have it populated into the description. Pressing up and down
    navigates through the autocompleted, and enter accepts an item. Esc closes the autocomplete.
    When the autocomplete is closed, pressing the up and down arrows moves focus to the next or
    previous row (the normal behaviour).

    **Seamless alias creation:** The alias system is invisible to the user until it matters:
    - User imports transactions. Descriptions show as regular text. No aliases exist yet.
    - User clicks a description, edits it, presses Enter or blurs. If the text doesn't match an
      existing alias, one is automatically created and applied. No modal, no extra steps.
    - If the partially typed text matches an existing alias in the dropdown, user can click it to
      apply that alias (the visible description updates to the full alias). If the typed text
      matches the alias, it is attached to the alias, even if the autocomplete option is not
      clicked.
    - For added transactions (rather than imported), a description automatically becomes an alias on
      blur/enter.
    - First-time alias assignment (no previous alias) never shows a modal.

    **Editing an aliased description:** User clicks the cell, edits the text. On Enter/blur:
    - If the current alias only has 1 transaction (total across alias + symlinks `transactionIds`
      size is 1), the alias is simply renamed. No modal. Still seamless.
    - If the current alias has multiple transactions, a modal appears.

    **When an alias is set:** The original imported description text shows on hover via tooltip
    (shadcn tooltip) if the alias and description are different. For manually created transactions
    there is no original description — only the alias name.

    **Manual transaction creation:** Same text input with autocomplete. Type a description, and on
    submit it creates or selects an alias. No raw description text is stored.

    **Alias change modal:** Only appears when the current alias has multiple transactions (total
    `transactionIds` across alias + its symlinks > 1). Triggered on Enter/blur when the text has
    changed, or when selecting a different alias from the dropdown:
    - If changing to a different alias (existing or new text): "Change just this one", "Change all",
      "Cancel".
    - If clearing the alias: "Remove from just this one", "Remove from all", "Cancel".
    - First option is selected by default. Tab cycles between options. Enter confirms and closes.

    **Symlink model for "Change all":**
    - A description alias can be either a real alias (has `name`) or a symlink (has `targetAliasId`
      pointing to a real alias).
    - Real aliases track `symlinkIds: LoroList(String)` as backlinks to their symlinks.
    - Each alias/symlink tracks `transactionIds` (set of transaction IDs pointing directly at it).
      Used for modal skip logic and GC worker.
    - "Change all" makes the old alias a symlink to the new alias. O(1) operation.
    - "Change just this one" updates `descriptionAliasId` on the transaction only. Moves the
      transaction ID between the old and new alias's `transactionIds` sets.
    - "Remove from just this one" sets `descriptionAliasId = undefined` on the transaction. Removes
      the transaction ID from the alias's `transactionIds` set.
    - "Remove from all" soft-deletes the alias (sets `deletedAt`). Transactions pointing to it
      render as having no alias (resolve deleted/missing alias as empty).
    - Invariant: no symlink chains. When alias B becomes a symlink to alias C, all existing symlinks
      pointing at B are repointed to C. C's `symlinkIds` gains B plus all of B's former symlinks.
      B's `symlinkIds` is cleared.
    - New transactions must always point to the final (real) alias, never a symlink.
    - Symlink resolution on read is O(1) - single hash map lookup.

    **Background GC worker:** See separate task below.

- [x] Background GC worker - a requestAnimationFrame-based worker that incrementally processes a
  bounded number of transactions per frame. Responsibilities: (a) merge adjacent transaction buckets
  with same year/month/day (CRDT merge artifacts), (b) update transactions pointing to description
  alias symlinks to point to the final alias, then hard-delete symlinks with no remaining
  references. This is a performance refinement - description aliases work correctly without it via
  symlink resolution on read.

- [x] Add undo and redo buttons and standard ctrl + z / ctrl + shift + z / ctrl + y bindings. Use the
  standard loro UndoManager for this.

- [x] Change how automations work. They work differently for each field.
    - For description aliases, when you apply a description alias to a transaction on the
      transactions page where the description text doesn't already match a rule, some controls
      appear.
        - The controls should not cause the table to resize, should not occlude anything, and should
          be close to the user's mouse - so they should either appear in an unfocused popup or
          hovering to the right or below the description. The controls include:
            - A select that contains the options: 1. updating all 2. updating new 3. update all 4.
              update new.
            - There is a button with a tick icon next to the select.
            - There is also an "only if $x" checkbox (that restricts the rule to exact match on that
              amount x of the transaction) and "only this account" checkbox (that restricts the rule
              to just the selected account).
            - A tooltip should explain that update all means update all existing and new
              transactions with the exact same description text to have the alias. Update new means
              update only newer transactions (greater date than the current transaction). The prefix
              "Updating" implies the change will apply automatically when the row loses focus, or if
              you click the tick button. "Update" implies you have to manually click the tick
              button.
        - The created rule will apply for that exact description text (and optionally account id and
          or amount) moving forward, and will run for newly imported transactions. It does not apply
          to manually created transactions, as they don't have description text (just a description
          alias). We remember the user's last choices for the select and check boxes in a new user
          preferences part of the vault. There can only be one rule for each description text with
          no account or amount constraints. This can be superseded by rules matching description
          text for specific amounts, followed by rules for each account, followed by rules for each
          account for each amount (there is a natural precedence).
    - Rules set the field on a transaction. There is no explicit link between the rule and the
      transaction. However, for each transaction, we calculate the highest precedence rule that
      matches (i.e. the description text is an exact match, and optionally the account and amount),
      if there is one. If the transaction has the description alias implied by the rule, and the
      transaction is not currently being edited, we show a small robot icon button that you can
      click to view and edit or delete the rule inline in a popup. If the rule matches but the
      description alias is not the same as the rule would imply, the robot icon is red (but
      otherwise works the same). In this case the popup also has an "apply to this transaction"
      button. This should reuse the exact same UI as the automations page. This UI should have an
      "apply to all" and "apply to new imports" button. If the UI is open in the context of a
      transaction, apply to new imports implies newer that the current transaction. If we're not in
      the context of a transaction, it means all new imports moving forward. When a description
      alias is changed on a transaction in the transactions table, and it has a matching rule (as
      calculated above to show the robot button), we then offer then same 4 select choices and
      checkboxes. This time, if applied, we update the rule rather than create one. Automation rules
      for description, tags and person percentage attribution work similarly. For tags there is an
      additional select after "only this account" that has two options: "add tags" or "set tags"
      (that will clear existing tags). For person percentage attribution there is a column per
      person. The rule applies to the whole set of percentage columns. It should span all the
      columns. Unlike description alias rules, these other rules do apply to manually created
      transactions.

- [x] We should save an importId on imported transactions. If the amount is edited we should save the
  amount in a originalAmount field and show that as a tooltip on the amount cell in the transactions
  table. Deleting an import deletes the associated transactions (essentially letting you undo an
  import).

- [x] People percent allocations should not be able to exceed + or - 100

- [x] We should drop the user state column from the user table until we use it (we'd want it to use
  the same sync and crdt logic, which is unnecessary complexity at this point).

- [x] What is the current UX for adding a new user to a vault? I thought we had an invite flow? But I
  can't see it? Does it make sense that each user must be a person in the vault? You can then
  optionally invite that person to join the vault as a user? So the person page is also used for
  managing users that have access to the vault? Or perhaps users with access should live in vault
  settings?

- [x] There should be a person created for each user automatically, person should have an optional
  user id (pub key hash?) and the person name should become optional and uses the user name as a
  fallback if it has an associated user.

- [x] The transactions table and imports list page should be a drop zone to trigger an import.

- [x] Review tables and row level permissions - why are there two ops and snapshot tables? Is the
  hashed public key used to enforce row level permissions consistently? (i.e. you are authenticed by
  your public key hash, this is always sent with TLS and never stored in plain in urls or anyway
  (can't be intercepted), and then your row level access is determined by whether you have
  permission to access that vault?)

- [x] How are we handling the client connection to supabase for websockets? Does this work with CORS?
  Is it properly secured based on pub key hash access to vault?

- [] Update the marketing pages to include all these features. Be clear, succinct and not too
  "markety". It's private. It's for categorising and allocating your transactions, not budgeting.
  Supports importing CSV and ofx. Multiple people can collaborate in real-time. It intelligently
  applies your tags, aliases and allocations to new imports.

- [x] Investigate animate-ui shadcn registry components (https://animate-ui.com/docs/components)
    - We've already used it for the import tabs - good to use it more broadly for consistency and
      because it looks great!
    - Focus on /radix/ components: Dialog, Alert Dialog, Dropdown Menu, Tooltip, etc.
    - Evaluate: Animation quality, accessibility, bundle size, compatibility with existing shadcn/ui
      setup
    - Compare with current @radix-ui/\* primitives + tw-animate-css setup

- [x] Update tanstack virtual once https://github.com/TanStack/virtual/pull/1100 is released and
  enable useFlushSync

- [x] Is there a way we can make the recovery phrase more compatible with password managers? It would
  be great if password managers automatically offer to save and fill the recovery phrase when
  creating or logging in to a vault.

- [x] Support using a passkey instead of, or in addition to, the recovery phrase, using the new PRF
  extension. Change the vault creation and login flows to support passkey as a second option using
  an ---- OR ---- style UI.
