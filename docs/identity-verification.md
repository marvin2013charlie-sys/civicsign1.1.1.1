# Embedded passport and driving-licence checks

Business senders can choose photo ID verification when the provider is configured. CivicSign opens Veriff's InContext SDK on its own signing page. Stripe is not involved in identity checks; Stripe billing is unchanged.

A dedicated Veriff **Document + Selfie IDV** integration must require document authenticity checks, live capture/liveness and face matching. Restrict the capture flow to passports and driving licences. CivicSign independently rejects approvals for other document types and conservatively matches the verified full name to the intended signer. A sender must issue a corrected request for a name mismatch. This is not an age check or a QES upgrade.

The SDK's FINISHED message means submission, never approval. CivicSign retrieves the decision server-to-server, signs the session ID with HMAC-SHA256, authenticates the response against the raw response bytes, then checks session ID, opaque recipient binding, approved status/code, supported document type and name. A verified result unlocks the existing PDF and signing gates. No unsigned browser callback can approve a signer.

## Setup required before live use

The feature defaults to disabled. An active Veriff account and approved integration are required. Obtain the integration's API base and session origin from Veriff; both must be HTTPS Veriff domains. No new account or paid provider checks have been created by this change.

- `VERIFF_API_KEY` and `VERIFF_SHARED_SECRET`: server secrets from your dedicated integration.
- `VERIFF_API_BASE`: exact API origin supplied for the integration, without `/v1`.
- `VERIFF_SESSION_ORIGIN`: exact HTTPS origin used in returned verification URLs.
- `VERIFF_IDV_PROFILE_CONFIRMED=true`: set only after confirming Document + Selfie IDV, live capture/liveness and face matching in the provider configuration.
- `VERIFF_ENVIRONMENT=live`: set only with production credentials. Test environments may be used locally with `DEV_MODE=true`.
- `IDENTITY_VERIFICATION_ENABLED=true`: enable only after sandbox and controlled live acceptance testing, provider terms/data processing and retention review, and updating the customer privacy notice.

A provider profile is configured in Veriff, not by the create-session API. These deployment settings are administrator assertions, not certification checks. Mislabelled test credentials must never be installed in production.

CivicSign stores only the provider session reference/URL and minimal audit outcome, not ID images, selfies, ID numbers, DOB or extracted identity fields. Veriff still processes and retains data under its provider setup; embedded UI does not mean the data stays only with CivicSign. Session URLs are sensitive and follow document-access controls.

## Failure and recovery

The server claims session creation atomically before calling Veriff, preventing concurrent clicks from creating multiple paid sessions. An uncertain create failure retains that claim to prevent duplicate charges. The signer should contact the sender; inspect the provider account before issuing a fresh request. Existing sessions are reused.

Decision polling occurs when the signer clicks **Check verification result**. Pending, declined, expired, unsupported-document, mismatched-name and unauthenticated results leave signing locked. This version does not implement push webhooks, automatic provider redaction or manual ID review. Requests require the sender's Business feature and an envelope currently awaiting that recipient. Draft identity edits reset verification and rotate the signing link.

## Acceptance checks

Test valid passport and photocard driving licence, wrong person, failed selfie/liveness, unsupported ID, pending/declined/expired results, forged responses, cross-session results, parallel start requests, provider failure, revoked signing links, draft edits and attempted PDF/signing access before approval. Browser testing must verify camera permission and mobile behaviour. Use fictional provider test cases first; real ID submissions and charges require a consenting tester.

References:
- https://devdocs.veriff.com/v1/docs/incontext-sdk-1
- https://devdocs.veriff.com/apidocs/v1sessions
- https://devdocs.veriff.com/apidocs/v1sessionsiddecision-1
- https://devdocs.veriff.com/docs/hmac-authentication-and-endpoint-security
