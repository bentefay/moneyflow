- When creating a vault the default currency should be inferred from time zone or culture
  (https://gist.github.com/mizrael/50c10be8ec92264751187d7705362eb2)? I'm guessing time zone is probably a better
  indicator of country?

- Tags should be stored as IDs on transactions so they can be renamed. The tag management page should support renaming
  tags. Tags also have a default colour, and this can be changed on the tag management page.

- We should rename the merchant field to "description", and the "description" field to "notes".

- description aliases - these are much like tags in that there is a single curated list of aliases. Stored as an
  optional ID on each transaction. There is a page where description aliases can be created, deleted and renamed. As
  part of this feature, we change the description field on transactions to make it read only - it can't be changed for
  imported transactions. Instead, the description cell in the transactions table changes so it shows the original
  description text as the placeholder for a searchable select. The select is where you can search and find, or inline
  create (important), a description alias. The original description text should show on hover (use shadcn tooltip
  efficiently). When manually creating transactions, the original description text is never set - you're always
  searching and choosing an existing alias, or creating a new alias (use the same UI as for editing existing rows). The
  create UX should be as simple as always showing the currently entered text with a (create) tag next to it in the
  select list, and pressing enter or clicking it creates it.

- Change how automations work. They work differently for each field. For description aliases, when you apply a
  description alias to a transaction on the transactions page where the description text doesn't already match a rule,
  some controls appear inline below the field in the table. A select that contains the options: 1. updating all 2.
  updating new 3. update all 4. update new. There is a button with a tick icon next to the select. There is also an
  "only if $x" checkbox (that restricts the rule to exact match on that amount x of the transaction) and "only this
  account" checkbox (that restricts the rule to just the selected account). A tooltip should explain that update all
  means update all existing and new transactions with the exact same description text to have the alias. Update new
  means update only newer transactions (greater date than the current transaction). The prefix "Updating" implies the
  change will apply automatically when the row loses focus, or if you click the tick button. "Update" implies you have
  to manually click the tick button. The created rule will apply for that exact description text (and optionally account
  id and or amount) and will run for newly imported transactions. It does not apply to manually created transactions, as
  they don't have description text (just a description alias). We remember the user's choice of select and check boxes
  in a new user preferences part of the vault. There can only be one rule for each description text with no account or
  amount constraints. This can be superseded by rules matching description text for specific amounts, followed by rules
  for each account, followed by rules for each account for each amount (there is a natural precedence). Rules set the
  field on a transaction. There is no explicit link between the rule and the transaction. However, for each transaction,
  we calculate the highest precedence rule that matches (i.e. the description text is an exact match, and optionally the
  account and amount), if there is one. If the transaction has the description alias implied by the rule, and the
  transaction is not currently being edited, we show a small robot icon button that you can click to view and edit or
  delete the rule inline in a popup. If the rule matches but the description alias is not the same as the rule would
  imply, the robot icon is red (but otherwise works the same). In this case the popup also has an "apply to this
  transaction" button. This should reuse the exact same UI as the automations page. This UI should have an "apply to
  all" and "apply to new imports" button. If the UI is open in the context of a transaction, apply to new imports
  implies newer that the current transaction. If we're not in the context of a transaction, it means all new imports
  moving forward. When a description alias is changed on a transaction in the transactions table, and it has a matching
  rule (as calculated above to show the robot button), we then offer then same 4 select choices and checkboxes. This
  time, if applied, we update the rule rather than create one. Automation rules for description, tags and person
  percentage attribution work similarly. For tags there is an additional select after "only this account" that has two
  options: "add tags" or "set tags" (that will clear existing tags). For person percentage attribution there is a column
  per person. The rule applies to the whole set of percentage columns. It should span all the columns. Unlike
  description alias rules, these other rules do apply to manually created transactions.

- We should save an importId on imported transactions. If the amount is edited we should save the amount in a
  originalAmount field and show that as a tooltip on the amount cell in the transactions table. Deleting an import
  deletes the associated transactions (essentially letting you undo an import).

- People percent allocations should not be able to exceed + or - 100

- We should drop the user state column from the user table until we use it (we'd want it to use the same sync and crdt
  logic, which is unnecessary complexity at this point).

- We need a transfer tag, right? Should be used to determine who owes who what

- Fix ofx import

- When importing, optionally either 1. ignore all or 2. or ignore duplicates or 3. do not ignore, transactions that are
  more than X days older than the newest existing transaction

- Configure whether must be exact match to be considered duplicate or whether additionally can be 1. within X days and
  b. a similar description

- Duplicate checking should only ever compare existing transactions in account against new transactions in account (i.e.
  duplicates in a file or in existing vault are never considered as duplicates)

- For CSV and OFX, the import process should show the raw file data and a preview of the imported data as a single table
  (columns for both, with a strong vertical line between). The raw data should be on the left, unordered, completely
  unformatted. The preview columns should be representative of how they will look in the transactions table after
  parsing (show duplicates, formatted dates, tags, description aliases, etc). Plus a status column at the end. And total
  rows, valid transactions, rows with errors counts (the current preview looks really good). Make sure this logic is
  reused - i.e. the import is where these things are calculated for the new transactions. Then when import confirmed the
  new transactions are merged into the existing data structure. Replace the wizard. The table should be always visible
  on the right or below (if screen too small). On the left are tabs replacing the wizard steps (use animate-ui tabs -
  see below), for choosing/creating template, column mapping, formatting, etc. The "auto-detect" buttons should be
  automatically applied rather than needing to be clicked.

- When importing, add a checkbox to optionally choose to collapse whitespace between words for descriptions (similar to
  how text works in html without pre).

  - When importing CSV, add a required account select to choose which account to import into. There should be a account
    selector for OFX too - except with OFX we use the account from the file by default if it matches an existing
    account. If the account id doesn't match any configured account and the OFX file contains an account number and the
    account selected by the user doesn't have an account id already, we apply the account id from the OFX file to the
    account.

- Store transactions as ordered movable list and always use both date and transaction id to locate transaction for
  update using binary search on date (i.e. never look up by id alone). Ordering within date should be preserved when
  importing. Perhaps we store this as an additional sub date index on each transaction? Should we group transactions by
  set of account > chronologically ordered movable list of year > chronologically ordered movable list of month >
  chronologically ordered movable list of transaction. Then track total count and position and by person amounts owing
  in the year and month groupings? Potentially faster for aggregation and less churn on indices? Can then do linear time
  merge for rendering, and much faster searching by account? Imports should be very efficient using this structure
  (linear time)

- We should be using loro ephemeral state for tracking presence and active transaction.

- Each user with access to the vault should have a name saved alongside their automation preferences in the crdt of the
  vault (this is what is used for showing presence in the vault)

- There should be a person created for each user automatically, person should have an optional user id (pub key hash?)
  and the person name should become optional and uses the user name as a fallback if it has an associated user.

- The transactions table and imports list page should be a drop zone to trigger an import.

- Review tables and row level permissions - why are there two ops and snapshot tables? Is the hashed public key used to
  enforce row level permissions consistently? (i.e. you are authenticed by your public key hash, this is always sent
  with TLS and never stored in plain in urls or anyway (can't be intercepted), and then your row level access is
  determined by whether you have permission to access that vault?)

- How are we handling the client connection to supabase for websockets? Does this work with CORS? Is it properly secured
  based on pub key hash access to vault?

- Update the marketing pages to include all these features. Be clear, succinct and not too "markety". It's private. It's
  for categorising and allocating your transactions, not budgeting. Supports importing CSV and ofx. Multiple people can
  collaborate in real-time. It intelligently applies your tags, aliases and allocations to new imports.

- Investigate Uppy 5.0 (https://uppy.io/blog/uppy-5.0/) as replacement for custom FileDropzone component

  - Current: Custom HTML5 drag-and-drop implementation in src/components/features/import/FileDropzone.tsx
  - Evaluate: Bundle size impact, features (progress, resumable uploads, file previews), integration complexity
  - Specifically using the useDropzone hook (if it provides any value)

- Investigate animate-ui shadcn registry components (https://animate-ui.com/docs/components)

  - Focus on /radix/ components: Dialog, Alert Dialog, Dropdown Menu, Tooltip, etc.
  - Evaluate: Animation quality, accessibility, bundle size, compatibility with existing shadcn/ui setup
  - Compare with current @radix-ui/\* primitives + tw-animate-css setup

- Update tanstack virtual once https://github.com/TanStack/virtual/pull/1100 is released and enable useFlushSync
