| Requirement | Tests | Level |
| --- | --- | --- |
| FR-1 Add a user | pgTAP: add with each ground creates one open case with no warning; action test: add returns the added result | integration |
| FR-1 Add twice | pgTAP: second add answers `already-in-list`, one open case, no new log row; pgTAP: two inserts race on the partial unique index | integration |
| FR-1 An admin cannot be added | pgTAP: add of another admin and of the caller answers `target-is-admin`, no case; action test maps the answer | integration |
| FR-1 A restricted user cannot be added | pgTAP: add of a blocked and of a banned user answers `already-restricted`, no case | integration |
| FR-1 Someone else's content cannot be attached | pgTAP: add with another user's poem or collection answers `content-not-found`, no case | integration |
| FR-1 Content already deleted | pgTAP: add with a deleted poem id answers `content-not-found`; action test maps it to its own reason | integration |
| FR-1 A non-admin cannot add | pgTAP: a non-admin and a signed-out caller get a permission error and no case, for both add functions | integration |
| FR-1 A removed case can be reopened | pgTAP: add, remove, add again gives a new open case with no warning | integration |
| FR-2 Admin adds from a poem page | component test: the control on a poem page opens the ground choice and the action gets the author and that poem; action test: case stores the content | unit |
| FR-2 Admin adds from the author page | component test: the control on the author page calls the add action with no content | unit |
| FR-2 Already on the list | component test: an `already-in-list` answer shows the "already on the list" notice and changes nothing | unit |
| FR-2 Others never see it | component tests: nothing renders for a guest, a non-admin, the author, and an admin on their own page, and the rest of the page is unchanged | unit |
| FR-3 Link | component test: `/admin` shows «Список нарушителей» with `href` `/admin/violations` above the list | unit |
| FR-3 Drop a row | component test with a simulated drag: dropping a row on the link opens the ground choice, choosing calls the add action and shows the confirmation notice | unit |
| FR-3 Drop, then cancel | component test: cancelling the ground choice after a drop calls no action | unit |
| FR-3 Drop of a user already on the list | component test: the `already-in-list` answer after a drop shows the "already on the list" notice | unit |
| FR-3 Button instead of a drop | component test: the row's add button opens the same choice and gives the same result as a drop | unit |
| FR-4 Admin opens the page | page test: two cases render newest first, each with email, ground and status; browser pass in task 4.7 | unit |
| FR-4 Signed-in non-admin | page test: the not-found screen, no trail and no case data | unit |
| FR-4 Signed out | page test: redirect to `/login` | unit |
| FR-4 Empty list | page test: the empty state shows | unit |
| FR-4 More cases than the cap | pgTAP: 101 open cases return 100 rows newest first; page test: the "more cases exist" line shows | integration |
| FR-4 A non-admin cannot list cases | pgTAP: a non-admin and a signed-out caller get a permission error from the list function | integration |
| FR-5 Waiting | model unit test: no `warned_at` gives `waiting` and no deadline; row component test shows it | unit |
| FR-5 Warned | model unit test: warned 2 hours ago gives `warned` and the deadline as the UTC date and time plus 24 hours | unit |
| FR-5 Deadline passed | model unit test at the 24 hour boundary gives `deadline-passed`; pgTAP: the user is still not restricted | unit |
| FR-7 Switch the ground | pgTAP: switch updates the ground and writes one log row; row component test shows the new ground | integration |
| FR-7 Switch keeps the warning | pgTAP: switch there and back leaves `warned_at` unchanged; component test: the row still shows `warned` with the same deadline and no warning action | integration |
| FR-7 Remove | pgTAP: remove closes the case as `removed`, leaves the user unchanged; action test: no email function is called | integration |
| FR-7 Case already gone | pgTAP: set ground and remove on a closed case answer `not-found`; action test maps it to the "case no longer exists" reason | integration |
| FR-8 Malicious ground | component test: a `malicious-activity` row blocks on one click with no warning action, and the action sends the standard notice | unit |
| FR-8 Harmful ground before the deadline | component test: block opens a confirmation saying the deadline has not passed and runs only after confirming | unit |
| FR-8 Harmful ground after the deadline | component test: block runs on one click with no confirmation | unit |
| FR-8 Harmful ground with no warning | component test: block opens a confirmation saying no warning was sent | unit |
| FR-8 Ban always asks | component test: ban opens the confirmation naming the email for any case | unit |
| FR-8 Early ban of a harmful-content case | component test: the ban confirmation carries the early-block line for a harmful case with no warning or an open deadline | unit |
| FR-8 Ban of a malicious-activity case | component test: the ban confirmation shows with no early-block line | unit |
| FR-10 Block closes the case | pgTAP: block closes the open case as `blocked` in the same transaction and returns the ground | integration |
| FR-10 Ban closes the case | pgTAP: ban closes the open case as `banned` | integration |
| FR-10 No case | pgTAP: block of a user with no case works and returns a null ground | integration |
| FR-12 Add is logged | pgTAP: one log row with the admin, the action and the user id, and no address in any column | integration |
| FR-12 Tables are closed to clients | pgTAP: select, insert, update, delete on the case table refused for `anon` and `authenticated`, admin included | integration |
| FR-13 Document delivered | reading `docs/about-rules-proposal.md`: each ground, the warning period and the email notice listed as covered or missing with wording for each gap (task 6.2) | end-to-end |
| NFR-2 Signed-out caller | pgTAP: every new function refused for a request with only the publishable key | integration |
| NFR-2 Function inventory | pgTAP: each new `admin_*` function starts with the admin check, none is executable by `anon` or `public`; the updated allowlist and count in the two existing pgTAP files pass | integration |
| NFR-4 Guest costs no call | page test: a guest request makes no `is_admin` and no `may_moderate_author` call | unit |
| NFR-4 Build output unchanged | `npm run build` output compared to before: the three public pages keep their rendering mode (task 5.2) | end-to-end |
| FR-6 Modal opens filled in | component test: the modal shows the address read-only and an empty message field | unit |
| FR-6 Successful send | action test: one `sendEmail` call with the fixed frame around the message, then marking; component test: success notice, closed modal, `warned` row with the deadline | unit |
| FR-6 Empty or too long message | schema unit test: empty, whitespace and over 2000 characters fail; component test: field error and no action call | unit |
| FR-6 Second warning | pgTAP: start-warning answers `already-warned`; action test: no email sent; component test: no send action on a warned row | integration |
| FR-6 Malicious ground has no warning | pgTAP: start-warning answers `wrong-ground`; action test: no email sent; component test: no warning action on that row | integration |
| FR-11 Retry after a lost answer | action test: a repeat call on an already warned case sends nothing and returns `already-warned`; component test: notice and row refresh | unit |
| FR-11 Email accepted but the case not marked | action test: mark fails after acceptance, the retry sends under the same key and then marks | unit |
| FR-11 Key conflict means already accepted | action test: a `conflict` answer leads to marking, no failure shown | unit |
| FR-11 Unknown outcome keeps the text | component test: after a timeout, a network error, a 5xx or a missing answer the message field is read-only | unit |
| FR-11 A refusal leaves the text editable | component test: after `config` or a 4xx the field stays editable | unit |
| FR-11 The lock lives only in the open modal | component test: cancel and reopen gives an empty editable field | unit |
| FR-11 Email service refuses or errors | action test per failure kind: case stays `waiting`, no mark call; component test: modal open with the text and the kind-specific notice | unit |
| FR-11 Connection lost | component test with the browser offline: the no-connection notice, modal open with the text, no change | unit |
| FR-9 Block sends the notice | action test: block with a ground sends one email with the fixed subject and the reason from the ground; row component test shows the notice as sent | unit |
| FR-9 Ban sends the notice | action test: ban with no case sends one email with the general reason | unit |
| FR-9 Admin deletes a poem | action test: delete sends one email whose body names the title from the database answer | unit |
| FR-9 Admin deletes a collection | action test: delete sends one email naming the collection title | unit |
| FR-9 A title with line breaks | copy builder unit test: the subject is fixed and the title appears only in the body | unit |
| FR-9 Unblock and revoke send nothing | action tests: unblock and revoke call no email function | unit |
| FR-9 A no-op action sends nothing | action tests: `already-restricted` and `not-found` answers call no email function | unit |
| FR-14 Email service down | action test: two attempts fail, the action result is `ok` with `notice: "failed"`, the failure is logged by kind and the notice row is `notice-failed`; component test shows the "email not sent" line | unit |
| FR-14 Conflict on the retry counts as sent | action test: timeout then `conflict` gives `sent` | unit |
| FR-14 One retry succeeds | action test: timeout then success gives one delivered email and `sent` | unit |
| FR-14 Failed notice after a delete | component test: the delete control stores the failed outcome before redirecting; author page test shows it once and not after a reload | unit |
| FR-14 No address on file | action test: a null address gives `failed` and no `sendEmail` call; pgTAP: the functions return a null `notice_email` for such an account | unit |
| FR-14 Email settings missing | action test: `config` is not retried, the action stands, the log holds the reason and no value | unit |
| FR-14 A refusal is not retried | action test: a 422 answer makes exactly one request | unit |
| FR-15 Session ended | action tests for add and warning: an ended session returns `unauthenticated` and calls no function; component test shows the notice | unit |
| FR-15 Prompting content already deleted | action test maps `content-not-found`; component test shows the "poem no longer exists" notice and no case | unit |
| FR-15 Offline | component test: every action of this change shows the no-connection notice and changes nothing | unit |
| FR-15 Server error | component test: a thrown or missing answer shows the failure notice and the case stays | unit |
| FR-15 User blocked in another tab | action test maps `already-restricted`; component test: notice and row refresh | unit |
| FR-15 Case removed in another tab | action test: warning on a missing case sends no email; component test: notice and the row disappears | unit |
| FR-15 Account deleted in another tab | component test: the same "case no longer exists" notice as a removed case | unit |
| NFR-1 Config missing | email module test: unset key gives `config`, no request made | unit |
| NFR-1 Service rejects | email module test: a 422 gives `http` with the status, nothing logged holds the address or body | unit |
| NFR-3 Timeout | email module test: no answer in time gives `timeout`; module tests also cover `network`, `conflict` for a 409, and that every file starts with `import "server-only"` | unit |
| NFR-1 No secret in the client bundle | extended no-secret scan test over `src/`, and a build-output search for the key's variable name | integration |
| FR-9 Block an active user | pgTAP: block keeps its existing effects; action test: the standard email is sent after the commit | integration |
| FR-10 Block closes an open case (admin-moderation) | pgTAP: block closes the case in the same transaction | integration |
| FR-9 Unblock | existing unblock tests extended: no email function is called | unit |
| FR-9 Block twice | existing block tests extended: `already-restricted`, no second log row, no email | unit |
| FR-9 Banned users have no unblock | existing pgTAP and component tests, unchanged | integration |
| FR-9 Ban an active user | pgTAP: ban keeps its effects; action test: the standard email is sent | integration |
| FR-9 Ban a blocked user | pgTAP: ban of a blocked user replaces the restriction; action test: the standard email is sent | integration |
| FR-10 Ban closes an open case (admin-moderation) | pgTAP: ban closes the case in the same transaction | integration |
| FR-9 Ban twice | existing ban tests extended: `already-restricted` and no email | unit |
| FR-9 Delete another user's poem | pgTAP: the answer now also carries `title`, `notice_email` and `ground`; action test: author gets the email naming the poem | integration |
| FR-9 Unknown poem | existing delete tests extended: `not-found` and no email | unit |
| FR-9 Illustration removal fails | existing delete tests extended: the delete stands and the email is still sent | unit |
| FR-9 Admin removes another author's file | existing pgTAP storage tests, unchanged | integration |
| FR-9 A non-admin cannot delete another's poem | existing pgTAP test, unchanged | integration |
| FR-9 Delete another user's collection | pgTAP: the answer carries `notice_email` and `ground`; action test: author gets the email naming the collection | integration |
| FR-9 Unknown collection | existing delete tests extended: `not-found` and no email | unit |
| FR-9 A non-admin cannot delete another's collection | existing pgTAP test, unchanged | integration |
| FR-12 Block is logged | existing pgTAP test, unchanged | integration |
| FR-12 Content delete is logged against its author | existing pgTAP test, unchanged | integration |
| FR-12 No-op writes no row | existing pgTAP test extended with `already-in-list`, `already-warned` and `content-not-found` | integration |
| FR-12 Deleted account | existing pgTAP test extended: the case is removed with the account, log rows remain | integration |
| FR-12 Log is closed to clients | existing pgTAP test, unchanged | integration |
| FR-3 First page | existing list tests, unchanged | unit |
| FR-3 Next page | existing list tests, unchanged | unit |
| FR-3 Fresh after an action | existing list tests, unchanged | unit |
| FR-3 Admins are not listed | existing pgTAP and list tests, unchanged | integration |
| FR-3 Admins don't take a place on a page | existing pgTAP test, unchanged | integration |
| FR-3 No email filter | page test: no email field or find button, and a request carrying `?email=` shows the unfiltered list | unit |
| FR-3 Review-list link at the top | component test: the link shows above the list | unit |
| FR-3 A non-admin cannot list users | existing pgTAP test, unchanged | integration |
