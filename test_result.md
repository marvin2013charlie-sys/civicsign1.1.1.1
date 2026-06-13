#====================================================================================================
# START - Testing Protocol - DO NOT EDIT OR REMOVE THIS SECTION
#====================================================================================================

# THIS SECTION CONTAINS CRITICAL TESTING INSTRUCTIONS FOR BOTH AGENTS
# BOTH MAIN_AGENT AND TESTING_AGENT MUST PRESERVE THIS ENTIRE BLOCK

# Communication Protocol:
# If the `testing_agent` is available, main agent should delegate all testing tasks to it.
#
# You have access to a file called `test_result.md`. This file contains the complete testing state
# and history, and is the primary means of communication between main and the testing agent.
#
# Main and testing agents must follow this exact format to maintain testing data. 
# The testing data must be entered in yaml format Below is the data structure:
# 
## user_problem_statement: {problem_statement}
## backend:
##   - task: "Task name"
##     implemented: true
##     working: true  # or false or "NA"
##     file: "file_path.py"
##     stuck_count: 0
##     priority: "high"  # or "medium" or "low"
##     needs_retesting: false
##     status_history:
##         -working: true  # or false or "NA"
##         -agent: "main"  # or "testing" or "user"
##         -comment: "Detailed comment about status"
##
## frontend:
##   - task: "Task name"
##     implemented: true
##     working: true  # or false or "NA"
##     file: "file_path.js"
##     stuck_count: 0
##     priority: "high"  # or "medium" or "low"
##     needs_retesting: false
##     status_history:
##         -working: true  # or false or "NA"
##         -agent: "main"  # or "testing" or "user"
##         -comment: "Detailed comment about status"
##
## metadata:
##   created_by: "main_agent"
##   version: "1.0"
##   test_sequence: 0
##   run_ui: false
##
## test_plan:
##   current_focus:
##     - "Task name 1"
##     - "Task name 2"
##   stuck_tasks:
##     - "Task name with persistent issues"
##   test_all: false
##   test_priority: "high_first"  # or "sequential" or "stuck_first"
##
## agent_communication:
##     -agent: "main"  # or "testing" or "user"
##     -message: "Communication message between agents"

# Protocol Guidelines for Main agent
#
# 1. Update Test Result File Before Testing:
#    - Main agent must always update the `test_result.md` file before calling the testing agent
#    - Add implementation details to the status_history
#    - Set `needs_retesting` to true for tasks that need testing
#    - Update the `test_plan` section to guide testing priorities
#    - Add a message to `agent_communication` explaining what you've done
#
# 2. Incorporate User Feedback:
#    - When a user provides feedback that something is or isn't working, add this information to the relevant task's status_history
#    - Update the working status based on user feedback
#    - If a user reports an issue with a task that was marked as working, increment the stuck_count
#    - Whenever user reports issue in the app, if we have testing agent and task_result.md file so find the appropriate task for that and append in status_history of that task to contain the user concern and problem as well 
#
# 3. Track Stuck Tasks:
#    - Monitor which tasks have high stuck_count values or where you are fixing same issue again and again, analyze that when you read task_result.md
#    - For persistent issues, use websearch tool to find solutions
#    - Pay special attention to tasks in the stuck_tasks list
#    - When you fix an issue with a stuck task, don't reset the stuck_count until the testing agent confirms it's working
#
# 4. Provide Context to Testing Agent:
#    - When calling the testing agent, provide clear instructions about:
#      - Which tasks need testing (reference the test_plan)
#      - Any authentication details or configuration needed
#      - Specific test scenarios to focus on
#      - Any known issues or edge cases to verify
#
# 5. Call the testing agent with specific instructions referring to test_result.md
#
# IMPORTANT: Main agent must ALWAYS update test_result.md BEFORE calling the testing agent, as it relies on this file to understand what to test next.

#====================================================================================================
# END - Testing Protocol - DO NOT EDIT OR REMOVE THIS SECTION
#====================================================================================================



#====================================================================================================
# Testing Data - Main Agent and testing sub agent both should log testing data below this section
#====================================================================================================

user_problem_statement: |
  Build an end-to-end super-admin panel for CIVICSIGN (e-signature platform) that lets the
  internal team view platform metrics (sign-ups, envelopes, users) and — critically — issue
  Stripe refunds from inside the admin panel. The existing CIVICSIGN admin already covers users,
  envelopes, contacts and overview KPIs; this task adds the missing Billing & Refunds workspace
  plus an Audit Log so refunds/impersonations/password-resets are traceable.

backend:
  - task: "Admin Billing Metrics endpoint (GET /api/admin/billing/metrics)"
    implemented: true
    working: true
    file: "backend/admin.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: "NA"
        agent: "main"
        comment: "New endpoint returns gross, refunded, net, by-plan breakdown and 30-day series. Verified manually via curl returns valid JSON when no transactions exist."
      - working: true
        agent: "testing"
        comment: "✅ PASSED all tests. Returns 200 with correct structure: currency='gbp', totals{gross,refunded,net,paid_count,refunded_count,transactions}, by_plan breakdown, and 30-day series array with exactly 30 items. Correctly returns 403 for non-admin users (demo@civicsign.com). All validation paths working as expected."

  - task: "Admin Transactions list endpoint (GET /api/admin/transactions)"
    implemented: true
    working: true
    file: "backend/admin.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: "NA"
        agent: "main"
        comment: "Lists payment_transactions with filters (q + status: all/paid/pending/refunded/failed), enriches with user name/email/plan via a single $in lookup. Verified manually."
      - working: true
        agent: "testing"
        comment: "✅ PASSED all tests. Returns 200 with array of transactions. Enrichment fields (user_name, user_email, user_plan) correctly populated via user lookup. All status filters working: paid, pending, refunded, failed, all. Search query filters working for both email and session_id. Correctly returns 403 for non-admin users. Tested with fixture transactions inserted via MongoDB."

  - task: "Admin Refund endpoint (POST /api/admin/transactions/{tx_id}/refund)"
    implemented: true
    working: true
    file: "backend/admin.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: "NA"
        agent: "main"
        comment: |
          Uses official stripe SDK (14.4.1) Refund.create. Supports full or partial refund, downgrade-to-free,
          internal reason note. Persists refund event on the transaction (refund_status, refund_amount, refunds[])
          and writes to admin_audit. Returns clear error 'Refunds unavailable: STRIPE_API_KEY missing.' when
          unconfigured. Cannot fully validate the Stripe network call without a real test key; the validation
          and persistence paths are testable now.
      - working: true
        agent: "testing"
        comment: "✅ PASSED all validation paths. 404 when tx_id does not exist ✓. 400 when payment_status != 'paid' (tested with pending transaction) ✓. 500 with correct error message 'Refunds unavailable: Stripe is not configured on the server (STRIPE_API_KEY missing).' when STRIPE_API_KEY is empty ✓. 403 for non-admin users ✓. Request body parsing validated (amount validation order: STRIPE_API_KEY check fires before amount validation as expected). All validation logic working correctly. Note: Full Stripe network refund not testable without real API key, but all validation and error handling paths confirmed working."

  - task: "Admin Audit Log endpoint (GET /api/admin/audit-log)"
    implemented: true
    working: true
    file: "backend/admin.py"
    stuck_count: 0
    priority: "medium"
    needs_retesting: false
    status_history:
      - working: "NA"
        agent: "main"
        comment: "Lists admin_audit (refunds, impersonations, password-reset sends) with filter by action."
      - working: true
        agent: "testing"
        comment: "✅ PASSED all tests. Returns 200 with array of audit log entries. Action filters working correctly: refund_transaction, send_password_reset, impersonate. Correctly returns 403 for non-admin users. Endpoint functioning as expected."

  - task: "Existing admin endpoints (metrics, users, envelopes, contacts, impersonate, send-reset, exports)"
    implemented: true
    working: true
    file: "backend/admin.py"
    stuck_count: 0
    priority: "medium"
    needs_retesting: false
    status_history:
      - working: true
        agent: "main"
        comment: "Already present in the imported repo and previously verified by author. Not modified by this change."

  - task: "Monthly quota endpoint (GET /api/usage)"
    implemented: true
    working: true
    file: "backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: "NA"
        agent: "main"
        comment: |
          Returns {plan, month, used, limit, unlimited, remaining, percent}. Limits are
          PLAN_MONTHLY_QUOTA = {free:5, pro:500, business:-1}. Manual curl returns the right
          shape for the Pro test user (used:0, limit:500, remaining:500, percent:0).
      - working: true
        agent: "testing"
        comment: |
          ✅ PASSED all tests. GET /api/usage returns correct structure with all required fields:
          - Pro user: plan="pro", month="June 2026", used=0, limit=500, unlimited=false, remaining=500, percent=0
          - All field types validated (plan:str, month:str, used:int, limit:int, unlimited:bool, remaining:int, percent:int)
          - Auth working correctly: returns 401 when unauthenticated
          - Tested with Pro user (tester@civicsign.app) and verified quota calculations

  - task: "Envelope-creation quota enforcement (POST /api/envelopes 402)"
    implemented: true
    working: true
    file: "backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: "NA"
        agent: "main"
        comment: |
          create_envelope now counts the caller's envelopes in the current calendar month (UTC) and
          returns HTTP 402 with detail "You've reached your <Plan> plan limit of N envelopes this
          month. Upgrade your plan to send more." when the count >= limit. Business plan (-1) is
          unlimited. Tester should manually drop the test user's plan to "free" to exercise the
          422->402 boundary by sending 6 envelopes, OR insert >=5 fake envelopes for the Free user
          and confirm POST returns 402.
      - working: true
        agent: "testing"
        comment: |
          ✅ PASSED all quota enforcement tests. Comprehensive boundary testing completed:
          1. Downgraded Pro user to "free" plan (limit=5) via MongoDB
          2. Inserted 5 fake envelopes for current month to reach quota limit
          3. Verified GET /api/usage shows quota at limit (used=5, limit=5, remaining=0)
          4. Attempted 6th envelope creation → correctly returned 402 with message: "You've reached your Free plan limit of 5 envelopes this month. Upgrade your plan to send more."
          5. Upgraded user back to "pro" plan (limit=500)
          6. Verified GET /api/usage shows Pro quota (used=5, limit=500, remaining=495)
          7. Successfully created envelope as Pro user → NOT blocked (status 200)
          Quota enforcement working correctly for both Free and Pro plans. Cleanup: deleted all test envelopes.

  - task: "Extended user profile (PUT /api/auth/profile + /api/auth/me)"
    implemented: true
    working: true
    file: "backend/auth.py, backend/models.py"
    stuck_count: 0
    priority: "medium"
    needs_retesting: false
    status_history:
      - working: "NA"
        agent: "main"
        comment: |
          ProfileUpdate accepts: name, mobile, email, company, job_title, phone, country,
          city, postcode, vat_number, company_size, industry, timezone, marketing_opt_in.
          _public_user returns them with sensible UK defaults (country=United Kingdom,
          timezone=Europe/London). Email uniqueness check still enforced.
      - working: true
        agent: "testing"
        comment: |
          ✅ PASSED all extended profile tests. Comprehensive validation completed:
          1. PUT /api/auth/profile with all extended business fields → 200 with all fields saved correctly:
             - name, company, job_title, phone, country, city, postcode, vat_number, company_size, industry, marketing_opt_in
             - Test data: "Acme Solicitors Ltd", "Director", "+44 20 1234 5678", "United Kingdom", "London", "WC2H 9JQ", "GB123456789", "2-10", "Legal", true
          2. GET /api/auth/me returns all extended profile fields persisted correctly
          3. New user defaults verified: country="United Kingdom", timezone="Europe/London" (UK-friendly defaults working)
          4. Email uniqueness check working: PUT with existing email (superadmin@civicsign.app) → 400 with "already in use" message
          5. Auth working correctly: PUT /api/auth/profile without auth → 401
          All extended profile fields working as expected with proper validation and UK defaults.

frontend:
  - task: "Admin Billing & Refunds page (AdminBilling.jsx)"
    implemented: true
    working: "NA"
    file: "frontend/src/pages/admin/AdminBilling.jsx"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: "NA"
        agent: "main"
        comment: "New page with KPIs (gross/refunded/net/transactions), 30-day revenue area chart (recharts), by-plan breakdown, filter+search, transactions table, and Refund dialog with partial/full toggle, reason note, and downgrade-to-free checkbox."

  - task: "Admin Audit Log page (AdminAuditLog.jsx)"
    implemented: true
    working: "NA"
    file: "frontend/src/pages/admin/AdminAuditLog.jsx"
    stuck_count: 0
    priority: "medium"
    needs_retesting: false
    status_history:
      - working: "NA"
        agent: "main"
        comment: "New page listing admin actions with action filter (refunds/password-resets/impersonations)."

  - task: "AdminShell nav + App.js routes for Billing/Audit"
    implemented: true
    working: "NA"
    file: "frontend/src/components/AdminShell.jsx, frontend/src/App.js"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: "NA"
        agent: "main"
        comment: "Added /admin/billing and /admin/audit routes inside AdminProtected AdminShell, plus nav items with CreditCard and History icons."

metadata:
  created_by: "main_agent"
  version: "1.0"
  test_sequence: 1
  run_ui: false

test_plan:
  current_focus:
    - "Monthly quota endpoint (GET /api/usage)"
    - "Envelope-creation quota enforcement (POST /api/envelopes 402)"
    - "Extended user profile (PUT /api/auth/profile + /api/auth/me)"
  stuck_tasks: []
  test_all: false
  test_priority: "high_first"

agent_communication:
  - agent: "main"
    message: |
      Built the missing Billing & Refunds workspace for the CIVICSIGN admin panel + an Audit Log.
      Backend: 4 new endpoints in backend/admin.py. Pydantic RefundRequest in models.py. billing.py
      updated to capture payment_intent_id from Stripe Checkout sessions so refunds resolve cleanly.
      Frontend: AdminBilling.jsx + AdminAuditLog.jsx pages, AdminShell nav updated, App.js routes added.
      Admin auth: super-admin = admin@civicsign.com / Admin1234! (seeded automatically by backend).
      Refund flow validates input + downgrade-to-free; calls stripe.Refund.create using the official
      SDK (14.4.1) which is already in requirements.txt. STRIPE_API_KEY is currently EMPTY in
      backend/.env, so the refund endpoint returns a friendly 500 — this is expected and validated.
      Please test the four new endpoints. For the Refund endpoint, focus on the validation paths
      (not-found tx, non-paid tx, missing STRIPE_API_KEY, amount > remaining); a fully successful
      Stripe-network refund is not testable until the user provides a real key.

  - agent: "main"
    message: |
      ROUND 2 — User wanted: (a) re-worded Pro pricing copy with a 500-doc/month quota,
      (b) the quota visible on the user dashboard, (c) more profile fields on the user side.

      Backend additions in this round:
      • New module-level constant PLAN_MONTHLY_QUOTA = {free:5, pro:500, business:-1} in server.py.
      • New helpers _month_window() and _current_month_envelope_count(owner_id) in server.py.
      • NEW endpoint GET /api/usage  -> {plan, month, used, limit, unlimited, remaining, percent}.
      • Hard quota enforcement: POST /api/envelopes now returns 402 with a clear upgrade message
        when the user reaches their monthly cap (Business is unlimited).
      • ProfileUpdate model expanded with company, job_title, phone, country, city, postcode,
        vat_number, company_size, industry, timezone, marketing_opt_in (all optional).
      • _public_user (returned by /api/auth/me + /api/auth/profile) now includes those fields,
        with country defaulting to "United Kingdom" and timezone to "Europe/London".

      Frontend in this round: Landing/Settings pricing copy refreshed; Dashboard now shows a
      monthly quota meter (data-testid="dashboard-quota-card"); Settings has a new Business
      details card (data-testid="business-details-card") with Company/Job/Phone/Country/City/
      Postcode/VAT/Industry/Company-size + marketing opt-in.

      Auth credentials are now: super-admin superadmin@civicsign.app / SuperAdmin@2026 and
      regular demo tester@civicsign.app / TestUser@2026 (the old defaults were deleted).
      Please test the new backend endpoints + quota enforcement only.
  - agent: "testing"
    message: |
      ✅ BACKEND TESTING COMPLETE - All 4 new admin billing & refunds endpoints PASSED (27/27 tests, 100% success rate).
      
      Tested endpoints:
      1. GET /api/admin/billing/metrics - Returns correct revenue KPIs (currency: gbp, totals, by_plan, 30-day series). Auth working (403 for non-admin).
      2. GET /api/admin/transactions - Lists transactions with enrichment (user_name, user_email, user_plan). All filters working (status: paid/pending/refunded/failed/all, search by email/session_id). Auth working (403 for non-admin).
      3. POST /api/admin/transactions/{tx_id}/refund - All validation paths working: 404 for non-existent tx, 400 for non-paid tx, 500 with correct error message when STRIPE_API_KEY missing, 403 for non-admin. Request body parsing validated.
      4. GET /api/admin/audit-log - Returns audit log entries with action filters (refund_transaction, send_password_reset, impersonate). Auth working (403 for non-admin).
      
      Regression tests: All existing admin endpoints (metrics, users, envelopes) still working correctly.
      
      Test methodology: Created comprehensive test suite (backend_test_admin_billing.py) with fixture transactions inserted via MongoDB and cleaned up after testing. All scenarios from review request covered.
      
      Note: Full Stripe network refund not testable without real STRIPE_API_KEY, but all validation and error handling paths confirmed working as expected.
  - agent: "testing"
    message: |
      ✅ BACKEND TESTING COMPLETE - All THREE NEW backend changes PASSED (19/19 tests, 100% success rate).
      
      Tested features (ROUND 2 - Quota System + Extended Profile):
      
      1. GET /api/usage (Monthly Quota Endpoint) ✅
         - Returns correct structure: {plan, month, used, limit, unlimited, remaining, percent}
         - Pro user: used=0, limit=500, unlimited=false, remaining=500, percent=0
         - Auth working: 401 when unauthenticated
      
      2. POST /api/envelopes Quota Enforcement ✅
         - Comprehensive boundary testing completed:
         - Downgraded Pro user to "free" (limit=5), inserted 5 fake envelopes
         - 6th envelope attempt → 402 with correct message: "You've reached your Free plan limit of 5 envelopes this month. Upgrade your plan to send more."
         - Upgraded back to "pro" (limit=500) → envelope creation NOT blocked (200)
         - Quota enforcement working correctly for both Free and Pro plans
      
      3. PUT /api/auth/profile + GET /api/auth/me (Extended Profile) ✅
         - All extended business fields working: company, job_title, phone, country, city, postcode, vat_number, company_size, industry, marketing_opt_in
         - UK defaults verified: new users get country="United Kingdom", timezone="Europe/London"
         - Email uniqueness check working: 400 when email already in use
         - Auth working: 401 when unauthenticated
      
      Regression smoke tests: ✅
      - GET /api/admin/billing/metrics (admin) → 200
      - GET /api/admin/transactions (admin) → 200
      - GET /api/stats (regular user) → 200
      - GET /api/envelopes (regular user) → 200
      
      Test methodology: Created comprehensive test suite (backend_test_quota_profile.py) with MongoDB manipulation for quota boundary testing. All test envelopes cleaned up after testing.
      
      All backend features working as expected. No issues found.