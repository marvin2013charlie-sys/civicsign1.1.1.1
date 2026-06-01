"""Backend API tests for CIVICSIGN Phase 5 features."""
import requests
import sys
import uuid
from datetime import datetime

BASE_URL = "https://esign-platform-hub.preview.emergentagent.com/api"

class Phase5Tester:
    def __init__(self):
        self.tests_run = 0
        self.tests_passed = 0
        self.admin_token = None
        self.demo_token = None
        self.throwaway_token = None
        self.throwaway_email = None

    def log(self, msg, status="INFO"):
        print(f"[{status}] {msg}")

    def test(self, name, method, endpoint, expected_status, data=None, headers=None, description=""):
        """Run a single API test."""
        url = f"{BASE_URL}/{endpoint}"
        self.tests_run += 1
        
        if description:
            self.log(f"\n🔍 Test {self.tests_run}: {name}", "TEST")
            self.log(f"   {description}", "INFO")
        else:
            self.log(f"\n🔍 Test {self.tests_run}: {name}", "TEST")
        
        try:
            if method == "GET":
                response = requests.get(url, headers=headers, timeout=30)
            elif method == "POST":
                response = requests.post(url, json=data, headers=headers, timeout=30)
            elif method == "DELETE":
                response = requests.delete(url, json=data, headers=headers, timeout=30)
            elif method == "PATCH":
                response = requests.patch(url, json=data, headers=headers, timeout=30)
            else:
                self.log(f"❌ Unsupported method: {method}", "ERROR")
                return False, {}

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                self.log(f"✅ PASSED - Status: {response.status_code}", "PASS")
                return True, response.json() if response.content and response.headers.get('content-type', '').startswith('application/json') else {}
            else:
                self.log(f"❌ FAILED - Expected {expected_status}, got {response.status_code}", "FAIL")
                if response.content:
                    try:
                        self.log(f"   Response: {response.json()}", "DEBUG")
                    except:
                        self.log(f"   Response: {response.text[:200]}", "DEBUG")
                return False, {}

        except Exception as e:
            self.log(f"❌ FAILED - Exception: {str(e)}", "ERROR")
            return False, {}

    def login(self, email, password):
        """Login and return token."""
        self.log(f"\n🔐 Logging in as {email}...", "AUTH")
        success, response = self.test(
            f"Login as {email}",
            "POST",
            "auth/login",
            200,
            data={"email": email, "password": password}
        )
        if success and 'access_token' in response:
            self.log(f"✅ Login successful, token obtained", "AUTH")
            return response['access_token']
        self.log(f"❌ Login failed", "AUTH")
        return None

    def test_ai_chat(self):
        """Test AI assistant chat endpoint."""
        self.log("\n" + "="*60, "SECTION")
        self.log("TESTING: AI HELP CHAT", "SECTION")
        self.log("="*60, "SECTION")
        
        if not self.demo_token:
            self.log("❌ Demo token not available, skipping AI chat tests", "SKIP")
            return
        
        headers = {"Authorization": f"Bearer {self.demo_token}"}
        
        # Test 1: Simple chat message
        self.test(
            "AI Chat - Simple question",
            "POST",
            "assistant/chat",
            200,
            data={"message": "How do I add a signature field?", "history": []},
            headers=headers,
            description="Testing AI assistant with a simple question about signature fields"
        )
        
        # Test 2: Chat with history
        self.test(
            "AI Chat - With conversation history",
            "POST",
            "assistant/chat",
            200,
            data={
                "message": "What about date fields?",
                "history": [
                    {"role": "user", "content": "How do I add a signature field?"},
                    {"role": "assistant", "content": "You can add signature fields in the Prepare Studio."}
                ]
            },
            headers=headers,
            description="Testing AI assistant with conversation history"
        )
        
        # Test 3: Unauthenticated request should fail
        self.test(
            "AI Chat - Unauthenticated (should fail)",
            "POST",
            "assistant/chat",
            401,
            data={"message": "Test", "history": []},
            description="Testing that unauthenticated requests are rejected"
        )

    def test_starter_templates(self):
        """Test starter templates endpoints."""
        self.log("\n" + "="*60, "SECTION")
        self.log("TESTING: STARTER TEMPLATES", "SECTION")
        self.log("="*60, "SECTION")
        
        if not self.demo_token:
            self.log("❌ Demo token not available, skipping starter templates tests", "SKIP")
            return
        
        headers = {"Authorization": f"Bearer {self.demo_token}"}
        
        # Test 1: Get sample templates
        success, response = self.test(
            "Get Starter Templates",
            "GET",
            "templates/samples",
            200,
            headers=headers,
            description="Fetching the shared starter templates library"
        )
        
        if not success or not response:
            self.log("❌ Failed to get starter templates, skipping further tests", "ERROR")
            return
        
        samples = response
        self.log(f"   Found {len(samples)} starter templates", "INFO")
        
        # Verify we have the expected 5 templates
        expected_keys = ["nda", "ip_deed", "shareholder", "offer", "onboarding"]
        found_keys = [t.get("template_id", "").replace("sample_", "") for t in samples]
        
        for key in expected_keys:
            if key in found_keys:
                self.log(f"   ✓ Found template: {key}", "INFO")
            else:
                self.log(f"   ✗ Missing template: {key}", "WARN")
        
        # Test 2: Use a sample template (NDA - 2 signers)
        nda_template = next((t for t in samples if "nda" in t.get("template_id", "").lower()), None)
        if nda_template:
            self.test(
                "Use Sample Template (NDA)",
                "POST",
                f"templates/{nda_template['template_id']}/use",
                200,
                data={
                    "recipients": [
                        {"role_id": nda_template["roles"][0]["role_id"], "name": "Alice Corp", "email": "alice@test.com"},
                        {"role_id": nda_template["roles"][1]["role_id"], "name": "Bob Inc", "email": "bob@test.com"}
                    ]
                },
                headers=headers,
                description="Creating an envelope from the NDA starter template"
            )
        
        # Test 3: Bulk send with single-signer template (Offer Letter)
        offer_template = next((t for t in samples if "offer" in t.get("template_id", "").lower()), None)
        if offer_template and len(offer_template.get("roles", [])) == 1:
            self.test(
                "Bulk Send Sample Template (Offer Letter)",
                "POST",
                f"templates/{offer_template['template_id']}/bulk-send",
                200,
                data={
                    "base_url": "https://esign-platform-hub.preview.emergentagent.com",
                    "rows": [
                        {"name": "Candidate One", "email": "candidate1@test.com"},
                        {"name": "Candidate Two", "email": "candidate2@test.com"}
                    ]
                },
                headers=headers,
                description="Bulk sending Offer Letter to multiple candidates"
            )

    def test_account_deletion(self):
        """Test account deletion with confirmation."""
        self.log("\n" + "="*60, "SECTION")
        self.log("TESTING: ACCOUNT DELETION", "SECTION")
        self.log("="*60, "SECTION")
        
        # Create a throwaway account
        throwaway_email = f"deltest_{uuid.uuid4().hex[:8]}@civicsign.io"
        throwaway_password = "Test1234!"
        
        self.log(f"Creating throwaway account: {throwaway_email}", "INFO")
        success, response = self.test(
            "Register Throwaway Account",
            "POST",
            "auth/register",
            200,
            data={
                "name": "Delete Test User",
                "email": throwaway_email,
                "password": throwaway_password
            },
            description="Creating a new account for deletion testing"
        )
        
        if not success or 'access_token' not in response:
            self.log("❌ Failed to create throwaway account, skipping deletion tests", "ERROR")
            return
        
        throwaway_token = response['access_token']
        headers = {"Authorization": f"Bearer {throwaway_token}"}
        
        # Test 1: Try to delete without correct confirmation (should fail)
        self.test(
            "Delete Account - Wrong confirmation (should fail)",
            "DELETE",
            "auth/account",
            400,
            data={"confirm": "WRONG"},
            headers=headers,
            description="Testing that deletion fails without correct confirmation"
        )
        
        # Test 2: Delete with correct confirmation
        self.test(
            "Delete Account - Correct confirmation",
            "DELETE",
            "auth/account",
            200,
            data={"confirm": "DELETE"},
            headers=headers,
            description="Deleting account with correct 'DELETE' confirmation"
        )
        
        # Test 3: Try to login with deleted account (should fail)
        self.test(
            "Login with Deleted Account (should fail)",
            "POST",
            "auth/login",
            401,
            data={"email": throwaway_email, "password": throwaway_password},
            description="Verifying that deleted account cannot login"
        )

    def test_admin_analytics(self):
        """Test admin analytics endpoints."""
        self.log("\n" + "="*60, "SECTION")
        self.log("TESTING: ADMIN ANALYTICS", "SECTION")
        self.log("="*60, "SECTION")
        
        if not self.admin_token:
            self.log("❌ Admin token not available, skipping admin analytics tests", "SKIP")
            return
        
        headers = {"Authorization": f"Bearer {self.admin_token}"}
        
        # Test 1: Get admin metrics with analytics
        success, response = self.test(
            "Get Admin Metrics with Analytics",
            "GET",
            "admin/metrics",
            200,
            headers=headers,
            description="Fetching platform metrics including deeper analytics"
        )
        
        if success and response:
            # Verify analytics object exists
            if "analytics" in response:
                self.log("   ✓ Analytics object present", "INFO")
                analytics = response["analytics"]
                
                # Check for expected fields
                expected_fields = ["avg_time_to_sign_hours", "declined", "expired", 
                                 "decline_rate", "expired_rate", "funnel", "top_users"]
                for field in expected_fields:
                    if field in analytics:
                        self.log(f"   ✓ Field '{field}': {analytics[field]}", "INFO")
                    else:
                        self.log(f"   ✗ Missing field: {field}", "WARN")
                
                # Check funnel structure
                if "funnel" in analytics and isinstance(analytics["funnel"], list):
                    self.log(f"   ✓ Funnel has {len(analytics['funnel'])} stages", "INFO")
                    for stage in analytics["funnel"]:
                        self.log(f"      - {stage.get('stage')}: {stage.get('count')}", "INFO")
                
                # Check top users
                if "top_users" in analytics:
                    self.log(f"   ✓ Top users: {len(analytics['top_users'])} entries", "INFO")
            else:
                self.log("   ✗ Analytics object missing from response", "WARN")

    def test_admin_csv_exports(self):
        """Test admin CSV export endpoints."""
        self.log("\n" + "="*60, "SECTION")
        self.log("TESTING: ADMIN CSV EXPORTS", "SECTION")
        self.log("="*60, "SECTION")
        
        if not self.admin_token:
            self.log("❌ Admin token not available, skipping CSV export tests", "SKIP")
            return
        
        headers = {"Authorization": f"Bearer {self.admin_token}"}
        
        # Test 1: Export users CSV
        url = f"{BASE_URL}/admin/export/users.csv"
        self.log(f"\n🔍 Test: Export Users CSV", "TEST")
        try:
            response = requests.get(url, headers=headers, timeout=30)
            if response.status_code == 200 and response.headers.get('content-type', '').startswith('text/csv'):
                self.tests_run += 1
                self.tests_passed += 1
                self.log(f"✅ PASSED - Users CSV export successful (size: {len(response.content)} bytes)", "PASS")
            else:
                self.tests_run += 1
                self.log(f"❌ FAILED - Expected 200 with text/csv, got {response.status_code} with {response.headers.get('content-type')}", "FAIL")
        except Exception as e:
            self.tests_run += 1
            self.log(f"❌ FAILED - Exception: {str(e)}", "ERROR")
        
        # Test 2: Export envelopes CSV
        url = f"{BASE_URL}/admin/export/envelopes.csv"
        self.log(f"\n🔍 Test: Export Envelopes CSV", "TEST")
        try:
            response = requests.get(url, headers=headers, timeout=30)
            if response.status_code == 200 and response.headers.get('content-type', '').startswith('text/csv'):
                self.tests_run += 1
                self.tests_passed += 1
                self.log(f"✅ PASSED - Envelopes CSV export successful (size: {len(response.content)} bytes)", "PASS")
            else:
                self.tests_run += 1
                self.log(f"❌ FAILED - Expected 200 with text/csv, got {response.status_code} with {response.headers.get('content-type')}", "FAIL")
        except Exception as e:
            self.tests_run += 1
            self.log(f"❌ FAILED - Exception: {str(e)}", "ERROR")
        
        # Test 3: Export contacts CSV
        url = f"{BASE_URL}/admin/export/contacts.csv"
        self.log(f"\n🔍 Test: Export Contacts CSV", "TEST")
        try:
            response = requests.get(url, headers=headers, timeout=30)
            if response.status_code == 200 and response.headers.get('content-type', '').startswith('text/csv'):
                self.tests_run += 1
                self.tests_passed += 1
                self.log(f"✅ PASSED - Contacts CSV export successful (size: {len(response.content)} bytes)", "PASS")
            else:
                self.tests_run += 1
                self.log(f"❌ FAILED - Expected 200 with text/csv, got {response.status_code} with {response.headers.get('content-type')}", "FAIL")
        except Exception as e:
            self.tests_run += 1
            self.log(f"❌ FAILED - Exception: {str(e)}", "ERROR")

    def test_admin_user_management(self):
        """Test admin user management endpoints (Phase 6)."""
        self.log("\n" + "="*60, "SECTION")
        self.log("TESTING: ADMIN USER MANAGEMENT (PHASE 6)", "SECTION")
        self.log("="*60, "SECTION")
        
        if not self.admin_token:
            self.log("❌ Admin token not available, skipping user management tests", "SKIP")
            return
        
        headers = {"Authorization": f"Bearer {self.admin_token}"}
        
        # Test 1: List all users
        success, response = self.test(
            "List All Users",
            "GET",
            "admin/users",
            200,
            headers=headers,
            description="Fetching all users from admin portal"
        )
        
        if not success or not response:
            self.log("❌ Failed to get users list, skipping further tests", "ERROR")
            return
        
        users = response
        self.log(f"   Found {len(users)} users", "INFO")
        
        # Find demo user for testing
        demo_user = next((u for u in users if u.get("email") == "demo@civicsign.com"), None)
        if not demo_user:
            self.log("❌ Demo user not found, skipping user detail tests", "ERROR")
            return
        
        demo_user_id = demo_user["user_id"]
        self.log(f"   Demo user ID: {demo_user_id}", "INFO")
        
        # Test 2: Get user detail
        success, detail = self.test(
            "Get User Detail",
            "GET",
            f"admin/users/{demo_user_id}",
            200,
            headers=headers,
            description="Fetching detailed user information with diagnostics"
        )
        
        if success and detail:
            # Verify structure
            if "user" in detail and "stats" in detail and "diagnostics" in detail:
                self.log("   ✓ User detail has correct structure", "INFO")
                self.log(f"   User: {detail['user'].get('email')}", "INFO")
                self.log(f"   Total envelopes: {detail['stats'].get('total')}", "INFO")
                self.log(f"   Account active: {detail['diagnostics'].get('account_active')}", "INFO")
                self.log(f"   Email configured: {detail['diagnostics'].get('email_configured')}", "INFO")
            else:
                self.log("   ✗ User detail missing expected fields", "WARN")
        
        # Test 3: Update user plan
        self.test(
            "Update User Plan",
            "PATCH",
            f"admin/users/{demo_user_id}",
            200,
            data={"plan": "business"},
            headers=headers,
            description="Updating user's subscription plan"
        )
        
        # Test 4: Update user active status
        self.test(
            "Update User Active Status",
            "PATCH",
            f"admin/users/{demo_user_id}",
            200,
            data={"active": True},
            headers=headers,
            description="Updating user's active status"
        )
        
        # Test 5: Try to promote user to admin (should fail with 403)
        self.test(
            "Try to Promote User to Admin (should fail)",
            "PATCH",
            f"admin/users/{demo_user_id}",
            403,
            data={"role": "admin"},
            headers=headers,
            description="Attempting to promote user to admin (should be blocked)"
        )
        
        # Test 6: Non-admin cannot access admin endpoints
        if self.demo_token:
            demo_headers = {"Authorization": f"Bearer {self.demo_token}"}
            self.test(
                "Non-admin Access to Admin Endpoint (should fail)",
                "GET",
                "admin/users",
                403,
                headers=demo_headers,
                description="Verifying non-admin users cannot access admin endpoints"
            )

    def test_password_reset_flow(self):
        """Test password reset link generation and usage (Phase 6)."""
        self.log("\n" + "="*60, "SECTION")
        self.log("TESTING: PASSWORD RESET FLOW (PHASE 6)", "SECTION")
        self.log("="*60, "SECTION")
        
        if not self.admin_token:
            self.log("❌ Admin token not available, skipping password reset tests", "SKIP")
            return
        
        # Create a throwaway account for testing
        test_email = f"reset_test_{int(datetime.now().timestamp())}@example.com"
        test_password = "Test1234!"
        
        self.log(f"Creating test account: {test_email}", "INFO")
        success, response = self.test(
            "Register Test Account for Reset",
            "POST",
            "auth/register",
            200,
            data={
                "name": "Reset Test User",
                "email": test_email,
                "password": test_password
            },
            description="Creating a test account for password reset testing"
        )
        
        if not success or 'user' not in response:
            self.log("❌ Failed to create test account, skipping reset tests", "ERROR")
            return
        
        test_user_id = response['user']['user_id']
        admin_headers = {"Authorization": f"Bearer {self.admin_token}"}
        
        # Test 1: Generate password reset link
        success, reset_response = self.test(
            "Generate Password Reset Link",
            "POST",
            f"admin/users/{test_user_id}/send-reset",
            200,
            data={"base_url": "https://esign-platform-hub.preview.emergentagent.com"},
            headers=admin_headers,
            description="Admin generating password reset link for user"
        )
        
        if not success or 'reset_link' not in reset_response:
            self.log("❌ Failed to generate reset link, skipping further tests", "ERROR")
            return
        
        reset_link = reset_response['reset_link']
        reset_token = reset_link.split("token=")[-1]
        email_status = reset_response.get('email_status')
        
        self.log(f"   Reset link generated: {reset_link[:50]}...", "INFO")
        self.log(f"   Email status: {email_status}", "INFO")
        
        # Verify email is in skip-mode
        if email_status == "skipped":
            self.log("   ✓ Email is in skip-mode as expected", "INFO")
        else:
            self.log(f"   ⚠ Email status is '{email_status}', expected 'skipped'", "WARN")
        
        # Test 2: Get reset token info
        success, info = self.test(
            "Get Reset Token Info",
            "GET",
            f"auth/reset-info?token={reset_token}",
            200,
            description="Fetching account info from reset token"
        )
        
        if success and info:
            self.log(f"   Email from token: {info.get('email')}", "INFO")
            if info.get('email') == test_email:
                self.log("   ✓ Token email matches test account", "INFO")
        
        # Test 3: Try invalid token (should fail)
        self.test(
            "Get Reset Info with Invalid Token (should fail)",
            "GET",
            "auth/reset-info?token=invalidtoken123",
            400,
            description="Verifying invalid tokens are rejected"
        )
        
        # Test 4: Reset password with valid token
        new_password = "NewPass1234!"
        self.test(
            "Reset Password with Valid Token",
            "POST",
            "auth/reset-password",
            200,
            data={"token": reset_token, "new_password": new_password},
            description="Resetting password using the generated token"
        )
        
        # Test 5: Try to login with old password (should fail)
        self.test(
            "Login with Old Password (should fail)",
            "POST",
            "auth/login",
            401,
            data={"email": test_email, "password": test_password},
            description="Verifying old password no longer works"
        )
        
        # Test 6: Login with new password (should succeed)
        success, login_response = self.test(
            "Login with New Password",
            "POST",
            "auth/login",
            200,
            data={"email": test_email, "password": new_password},
            description="Verifying new password works"
        )
        
        # Test 7: Try to reuse the same token (should fail)
        self.test(
            "Reuse Reset Token (should fail)",
            "POST",
            "auth/reset-password",
            400,
            data={"token": reset_token, "new_password": "AnotherPass1234!"},
            description="Verifying reset tokens are single-use"
        )

    def test_impersonation_flow(self):
        """Test admin impersonation OTP flow (Phase 6)."""
        self.log("\n" + "="*60, "SECTION")
        self.log("TESTING: ADMIN IMPERSONATION FLOW (PHASE 6)", "SECTION")
        self.log("="*60, "SECTION")
        
        if not self.admin_token or not self.demo_token:
            self.log("❌ Admin or demo token not available, skipping impersonation tests", "SKIP")
            return
        
        admin_headers = {"Authorization": f"Bearer {self.admin_token}"}
        
        # Get demo user ID
        success, users = self.test(
            "Get Users List for Impersonation",
            "GET",
            "admin/users",
            200,
            headers=admin_headers,
            description="Fetching users to find demo user for impersonation"
        )
        
        if not success or not users:
            self.log("❌ Failed to get users, skipping impersonation tests", "ERROR")
            return
        
        demo_user = next((u for u in users if u.get("email") == "demo@civicsign.com"), None)
        if not demo_user:
            self.log("❌ Demo user not found, skipping impersonation tests", "ERROR")
            return
        
        demo_user_id = demo_user["user_id"]
        
        # Test 1: Request impersonation OTP
        success, otp_response = self.test(
            "Request Impersonation OTP",
            "POST",
            f"admin/users/{demo_user_id}/impersonate/request",
            200,
            headers=admin_headers,
            description="Admin requesting OTP to impersonate demo user"
        )
        
        if not success or 'otp' not in otp_response:
            self.log("❌ Failed to get OTP, skipping verification tests", "ERROR")
            return
        
        request_id = otp_response['request_id']
        otp = otp_response['otp']
        dev_mode = otp_response.get('dev_mode', False)
        
        self.log(f"   Request ID: {request_id}", "INFO")
        self.log(f"   OTP: {otp}", "INFO")
        self.log(f"   Dev mode: {dev_mode}", "INFO")
        
        if dev_mode:
            self.log("   ✓ Dev mode enabled, OTP returned in response", "INFO")
        
        # Test 2: Verify OTP with wrong code (should fail)
        self.test(
            "Verify Impersonation with Wrong OTP (should fail)",
            "POST",
            f"admin/users/{demo_user_id}/impersonate/verify",
            400,
            data={"request_id": request_id, "otp": "000000"},
            headers=admin_headers,
            description="Attempting to verify with incorrect OTP"
        )
        
        # Test 3: Verify OTP with correct code
        success, verify_response = self.test(
            "Verify Impersonation with Correct OTP",
            "POST",
            f"admin/users/{demo_user_id}/impersonate/verify",
            200,
            data={"request_id": request_id, "otp": otp},
            headers=admin_headers,
            description="Verifying with correct OTP to get impersonation token"
        )
        
        if success and 'access_token' in verify_response:
            imp_token = verify_response['access_token']
            imp_user = verify_response.get('user', {})
            self.log(f"   ✓ Impersonation token obtained", "INFO")
            self.log(f"   Impersonating: {imp_user.get('email')}", "INFO")
            
            # Test 4: Use impersonation token to access user's data
            imp_headers = {"Authorization": f"Bearer {imp_token}"}
            success, me_response = self.test(
                "Access User Data with Impersonation Token",
                "GET",
                "auth/me",
                200,
                headers=imp_headers,
                description="Using impersonation token to access user's account"
            )
            
            if success and me_response:
                self.log(f"   Logged in as: {me_response.get('email')}", "INFO")
                if me_response.get('email') == demo_user['email']:
                    self.log("   ✓ Impersonation successful, viewing as target user", "INFO")
        
        # Test 5: Try to impersonate admin account (should fail)
        admin_user = next((u for u in users if u.get("role") == "admin"), None)
        if admin_user:
            self.test(
                "Try to Impersonate Admin Account (should fail)",
                "POST",
                f"admin/users/{admin_user['user_id']}/impersonate/request",
                400,
                headers=admin_headers,
                description="Attempting to impersonate another admin (should be blocked)"
            )

    def run_all_tests(self):
        """Run all Phase 5 & 6 tests."""
        self.log("\n" + "="*80, "HEADER")
        self.log("CIVICSIGN PHASE 5 & 6 BACKEND API TESTS", "HEADER")
        self.log("="*80 + "\n", "HEADER")
        
        # Login as admin
        self.admin_token = self.login("admin@civicsign.com", "Admin1234!")
        if not self.admin_token:
            self.log("❌ Failed to login as admin, some tests will be skipped", "ERROR")
        
        # Login as demo user
        self.demo_token = self.login("demo@civicsign.com", "Demo1234!")
        if not self.demo_token:
            self.log("❌ Failed to login as demo user, some tests will be skipped", "ERROR")
        
        # Run all test suites
        self.test_ai_chat()
        self.test_starter_templates()
        self.test_account_deletion()
        self.test_admin_analytics()
        self.test_admin_csv_exports()
        
        # Phase 6 tests
        self.test_admin_user_management()
        self.test_password_reset_flow()
        self.test_impersonation_flow()
        
        # Print summary
        self.log("\n" + "="*80, "SUMMARY")
        self.log("TEST SUMMARY", "SUMMARY")
        self.log("="*80, "SUMMARY")
        self.log(f"Total tests run: {self.tests_run}", "SUMMARY")
        self.log(f"Tests passed: {self.tests_passed}", "SUMMARY")
        self.log(f"Tests failed: {self.tests_run - self.tests_passed}", "SUMMARY")
        self.log(f"Success rate: {(self.tests_passed / self.tests_run * 100) if self.tests_run > 0 else 0:.1f}%", "SUMMARY")
        self.log("="*80 + "\n", "SUMMARY")
        
        return 0 if self.tests_passed == self.tests_run else 1

def main():
    tester = Phase5Tester()
    return tester.run_all_tests()

if __name__ == "__main__":
    sys.exit(main())
