# Passport and driving-licence verification

Business senders can choose photo ID verification for each recipient when the provider is configured. The signer follows a Stripe-hosted flow that requests a live document capture and matching selfie. Accepted document categories are passport and driving licence; provider-supported issuing countries and documents still apply.

CivicSign checks the VerificationSession on its server after the signer returns and clicks **Check verification result**. Returning to the page is not proof of success. Only a verified session bound to the envelope and recipient, in the correct Stripe mode, with a matching full legal name can unlock viewing and signing. Names are compared conservatively after Unicode/case/punctuation normalization. A name mismatch requires a new corrected request from the sender; there is no self-approval override.

The existing document-access and signing gates enforce the result. Editing a draft identity recipient rotates its signing token and discards prior verification. The audit records the provider, verification time, and outcome. CivicSign does not persist extracted names, ID numbers, dates of birth, ID images, or selfies from provider responses. Stripe processes and retains verification information according to the agreed provider setup.

## Configuration

Default: disabled. This is not an age check, a QES upgrade, or a claim of regulatory certification.

- `IDENTITY_VERIFICATION_ENABLED=true`
- `STRIPE_IDENTITY_API_KEY`: a dedicated Stripe Identity secret key. Production accepts live mode only. Local `DEV_MODE=true` permits a test-mode key for sandbox acceptance testing.
- `IDENTITY_RETURN_ORIGIN=https://www.civicsign.co.uk`

Enable Stripe Identity in the provider account, review its service terms, fees, data processing/retention and biometric privacy requirements, and update CivicSign's privacy notice before enabling customer use. The existing payments key is not automatically reused. No live verification was submitted during implementation.

Use provider test scenarios first. Acceptance testing must include: valid passport; valid driving licence; failed document/selfie; processing; cancelled; wrong name; wrong recipient/session; expired/voided envelope; PDF/submit attempts before verification; recipient edit; provider outage. A real live check requires a consenting tester and authorized provider charges.

## Limits

This implementation polls on explicit user request; it does not depend on browser query parameters or an unsigned callback. It does not yet automate provider data redaction or offer manual ID review. If verification cannot be completed, the signer contacts the sender. The feature should remain disabled until those operational requirements are agreed.

References:
- https://docs.stripe.com/identity/verification-checks
- https://docs.stripe.com/api/identity/verification_sessions/create
- https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/special-category-data/biometric-data-guidance-biometric-recognition/
