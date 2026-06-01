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

    def run_all_tests(self):
        """Run all Phase 5 tests."""
        self.log("\n" + "="*80, "HEADER")
        self.log("CIVICSIGN PHASE 5 BACKEND API TESTS", "HEADER")
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
