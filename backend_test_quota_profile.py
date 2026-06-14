"""
CIVICSIGN Backend API Testing: Quota System + Extended Profile
Tests the THREE NEW backend changes:
1. GET /api/usage (monthly quota endpoint)
2. POST /api/envelopes quota enforcement (402 when limit reached)
3. PUT /api/auth/profile + GET /api/auth/me (extended business profile fields)
"""
import requests
import sys
import subprocess
import json
from datetime import datetime, timezone

# Use the production-configured external URL from frontend/.env
BASE_URL = "https://git-workspace-3.preview.emergentagent.com/api"

class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    END = '\033[0m'

class QuotaProfileTester:
    def __init__(self):
        self.tests_run = 0
        self.tests_passed = 0
        self.tests_failed = 0
        self.token = None
        self.admin_token = None
        self.user_id = None
        self.test_envelope_ids = []

    def log(self, msg, color=Colors.BLUE):
        print(f"{color}{msg}{Colors.END}")

    def mongo_exec(self, command):
        """Execute a MongoDB command via mongosh"""
        try:
            result = subprocess.run(
                ["mongosh", "civicsign", "--quiet", "--eval", command],
                capture_output=True,
                text=True,
                timeout=10
            )
            return result.stdout.strip(), result.returncode == 0
        except Exception as e:
            self.log(f"MongoDB command failed: {e}", Colors.RED)
            return "", False

    def test(self, name, method, endpoint, expected_status, data=None, headers=None, check_fn=None, use_admin=False, skip_auth=False):
        """Run a single API test"""
        url = f"{BASE_URL}/{endpoint}"
        h = headers or {}
        
        # Use appropriate token (unless skip_auth is True)
        if not skip_auth:
            token = self.admin_token if use_admin else self.token
            if token and 'Authorization' not in h:
                h['Authorization'] = f'Bearer {token}'
        
        if data is not None and 'Content-Type' not in h:
            h['Content-Type'] = 'application/json'

        self.tests_run += 1
        self.log(f"\n🔍 Test {self.tests_run}: {name}", Colors.BLUE)
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=h, timeout=15)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=h, timeout=15)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=h, timeout=15)
            elif method == 'DELETE':
                response = requests.delete(url, json=data, headers=h, timeout=15)

            status_ok = response.status_code == expected_status
            
            if not status_ok:
                self.log(f"❌ FAILED - Expected {expected_status}, got {response.status_code}", Colors.RED)
                self.log(f"   Response: {response.text[:300]}", Colors.RED)
                self.tests_failed += 1
                return False, {}

            try:
                resp_data = response.json()
            except:
                resp_data = {}

            # Run custom check function if provided
            if check_fn:
                check_result = check_fn(resp_data)
                if not check_result:
                    self.log(f"❌ FAILED - Check function failed", Colors.RED)
                    self.log(f"   Response: {json.dumps(resp_data, indent=2)[:500]}", Colors.RED)
                    self.tests_failed += 1
                    return False, resp_data

            self.tests_passed += 1
            self.log(f"✅ PASSED - Status: {response.status_code}", Colors.GREEN)
            return True, resp_data

        except Exception as e:
            self.log(f"❌ FAILED - Error: {str(e)}", Colors.RED)
            self.tests_failed += 1
            return False, {}

    def run_all_tests(self):
        self.log("\n" + "="*80, Colors.YELLOW)
        self.log("CIVICSIGN BACKEND API TESTS - Quota System + Extended Profile", Colors.YELLOW)
        self.log("="*80 + "\n", Colors.YELLOW)

        # ===== SETUP: LOGIN AS PRO USER =====
        self.log("\n🔐 SETUP: Login as Pro user (tester@civicsign.app)", Colors.YELLOW)
        
        success, data = self.test(
            "Login as Pro user (tester@civicsign.app / TestUser@2026)",
            "POST", "auth/login", 200,
            data={"email": "tester@civicsign.app", "password": "TestUser@2026"},
            check_fn=lambda d: "access_token" in d and d.get("user", {}).get("plan") == "pro"
        )
        if not success:
            self.log("❌ CRITICAL: Cannot login as Pro user. Aborting tests.", Colors.RED)
            return 1
        
        self.token = data.get("access_token")
        self.user_id = data.get("user", {}).get("user_id")
        self.log(f"   User ID: {self.user_id}", Colors.BLUE)
        self.log(f"   Plan: {data.get('user', {}).get('plan')}", Colors.BLUE)

        # ===== TEST 1: GET /api/usage (Monthly Quota Endpoint) =====
        self.log("\n📊 TEST 1: GET /api/usage (Monthly Quota Endpoint)", Colors.YELLOW)
        
        success, data = self.test(
            "GET /api/usage returns correct structure for Pro user",
            "GET", "usage", 200,
            check_fn=lambda d: (
                d.get("plan") == "pro" and
                isinstance(d.get("month"), str) and
                isinstance(d.get("used"), int) and
                d.get("limit") == 500 and
                d.get("unlimited") == False and
                isinstance(d.get("remaining"), int) and
                isinstance(d.get("percent"), int)
            )
        )
        if success:
            self.log(f"   Plan: {data.get('plan')}", Colors.BLUE)
            self.log(f"   Month: {data.get('month')}", Colors.BLUE)
            self.log(f"   Used: {data.get('used')}", Colors.BLUE)
            self.log(f"   Limit: {data.get('limit')}", Colors.BLUE)
            self.log(f"   Remaining: {data.get('remaining')}", Colors.BLUE)
            self.log(f"   Percent: {data.get('percent')}%", Colors.BLUE)

        # Test unauthenticated access
        self.test(
            "GET /api/usage without auth returns 401",
            "GET", "usage", 401,
            skip_auth=True
        )

        # ===== TEST 2: POST /api/envelopes Quota Enforcement =====
        self.log("\n🚫 TEST 2: POST /api/envelopes Quota Enforcement", Colors.YELLOW)
        
        # Step 1: Downgrade user to "free" plan
        self.log("   Step 1: Downgrading user to 'free' plan via MongoDB...", Colors.BLUE)
        cmd = f'db.users.updateOne({{email:"tester@civicsign.app"}}, {{$set:{{plan:"free"}}}})'
        output, success_mongo = self.mongo_exec(cmd)
        if success_mongo:
            self.log(f"   ✓ User downgraded to free plan", Colors.GREEN)
        else:
            self.log(f"   ✗ Failed to downgrade user: {output}", Colors.RED)

        # Step 2: Insert 5 fake envelopes for current month
        self.log("   Step 2: Inserting 5 fake envelopes for current month...", Colors.BLUE)
        current_month_iso = datetime.now(timezone.utc).replace(day=1, hour=0, minute=0, second=0, microsecond=0).isoformat()
        
        for i in range(1, 6):
            env_id = f"env_qtest_{i}_{int(datetime.now().timestamp())}"
            self.test_envelope_ids.append(env_id)
            cmd = f'''db.envelopes.insertOne({{
                envelope_id: "{env_id}",
                owner_id: "{self.user_id}",
                title: "Quota Test {i}",
                status: "draft",
                created_at: "{current_month_iso}",
                owner_name: "Test User",
                message: "",
                signing_order: "sequential",
                document: {{file_id: "test", page_count: 1, pages: []}},
                recipients: [],
                fields: [],
                audit_events: [],
                updated_at: "{current_month_iso}"
            }})'''
            output, success_mongo = self.mongo_exec(cmd)
            if not success_mongo:
                self.log(f"   ✗ Failed to insert envelope {i}: {output}", Colors.RED)
        
        self.log(f"   ✓ Inserted 5 fake envelopes", Colors.GREEN)

        # Step 3: Verify quota is now at limit (5/5)
        success, data = self.test(
            "GET /api/usage shows quota at limit (5/5 for free plan)",
            "GET", "usage", 200,
            check_fn=lambda d: (
                d.get("plan") == "free" and
                d.get("used") == 5 and
                d.get("limit") == 5 and
                d.get("remaining") == 0
            )
        )
        if success:
            self.log(f"   Used: {data.get('used')}/{data.get('limit')}", Colors.BLUE)

        # Step 4: Try to create 6th envelope (should return 402)
        self.log("   Step 4: Attempting to create 6th envelope (should be blocked with 402)...", Colors.BLUE)
        
        # Create a minimal PDF-like file (we just need to test quota check, not PDF parsing)
        # The quota check happens BEFORE PDF parsing, so we can send minimal data
        import io
        pdf_content = b"%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [] /Count 0 >>\nendobj\nxref\n0 3\ntrailer\n<< /Root 1 0 R >>\n%%EOF"
        
        # Use requests with files parameter for multipart/form-data
        try:
            url = f"{BASE_URL}/envelopes"
            files = {'file': ('test.pdf', io.BytesIO(pdf_content), 'application/pdf')}
            data_form = {'title': 'Test Envelope 6'}
            headers = {'Authorization': f'Bearer {self.token}'}
            
            self.tests_run += 1
            self.log(f"\n🔍 Test {self.tests_run}: POST /api/envelopes when quota exceeded returns 402", Colors.BLUE)
            
            response = requests.post(url, files=files, data=data_form, headers=headers, timeout=15)
            
            if response.status_code == 402:
                resp_data = response.json()
                detail = resp_data.get("detail", "")
                if "Free plan limit of 5 envelopes" in detail and "Upgrade your plan" in detail:
                    self.tests_passed += 1
                    self.log(f"✅ PASSED - Got 402 with correct message", Colors.GREEN)
                    self.log(f"   Message: {detail}", Colors.BLUE)
                else:
                    self.tests_failed += 1
                    self.log(f"❌ FAILED - Got 402 but wrong message: {detail}", Colors.RED)
            else:
                self.tests_failed += 1
                self.log(f"❌ FAILED - Expected 402, got {response.status_code}", Colors.RED)
                self.log(f"   Response: {response.text[:300]}", Colors.RED)
        except Exception as e:
            self.tests_failed += 1
            self.log(f"❌ FAILED - Error: {str(e)}", Colors.RED)

        # Step 5: Upgrade user back to "pro" plan
        self.log("   Step 5: Upgrading user back to 'pro' plan...", Colors.BLUE)
        cmd = f'db.users.updateOne({{email:"tester@civicsign.app"}}, {{$set:{{plan:"pro"}}}})'
        output, success_mongo = self.mongo_exec(cmd)
        if success_mongo:
            self.log(f"   ✓ User upgraded back to pro plan", Colors.GREEN)

        # Step 6: Verify quota no longer blocks (Pro has 500 limit)
        success, data = self.test(
            "GET /api/usage shows Pro quota (5/500)",
            "GET", "usage", 200,
            check_fn=lambda d: (
                d.get("plan") == "pro" and
                d.get("used") == 5 and
                d.get("limit") == 500 and
                d.get("remaining") == 495
            )
        )

        # Step 7: Try to create envelope again (should NOT return 402)
        self.log("   Step 7: Attempting to create envelope as Pro user (should NOT be blocked)...", Colors.BLUE)
        try:
            url = f"{BASE_URL}/envelopes"
            files = {'file': ('test.pdf', io.BytesIO(pdf_content), 'application/pdf')}
            data_form = {'title': 'Test Envelope Pro'}
            headers = {'Authorization': f'Bearer {self.token}'}
            
            self.tests_run += 1
            self.log(f"\n🔍 Test {self.tests_run}: POST /api/envelopes as Pro user (quota NOT exceeded)", Colors.BLUE)
            
            response = requests.post(url, files=files, data=data_form, headers=headers, timeout=15)
            
            # Should NOT be 402 (either 200 success or some other error, but NOT quota error)
            if response.status_code != 402:
                self.tests_passed += 1
                self.log(f"✅ PASSED - Not blocked by quota (status: {response.status_code})", Colors.GREEN)
                if response.status_code == 200:
                    resp_data = response.json()
                    created_env_id = resp_data.get("envelope_id")
                    if created_env_id:
                        self.test_envelope_ids.append(created_env_id)
                        self.log(f"   Created envelope: {created_env_id}", Colors.BLUE)
            else:
                self.tests_failed += 1
                self.log(f"❌ FAILED - Still blocked with 402 after upgrade to Pro", Colors.RED)
                self.log(f"   Response: {response.text[:300]}", Colors.RED)
        except Exception as e:
            self.tests_failed += 1
            self.log(f"❌ FAILED - Error: {str(e)}", Colors.RED)

        # ===== TEST 3: Extended Profile (PUT /api/auth/profile + GET /api/auth/me) =====
        self.log("\n👤 TEST 3: Extended Profile (PUT /api/auth/profile + GET /api/auth/me)", Colors.YELLOW)
        
        # Test PUT /api/auth/profile with all extended fields
        profile_data = {
            "name": "Test User Updated",
            "company": "Acme Solicitors Ltd",
            "job_title": "Director",
            "phone": "+44 20 1234 5678",
            "country": "United Kingdom",
            "city": "London",
            "postcode": "WC2H 9JQ",
            "vat_number": "GB123456789",
            "company_size": "2-10",
            "industry": "Legal",
            "marketing_opt_in": True
        }
        
        success, data = self.test(
            "PUT /api/auth/profile with extended business fields",
            "PUT", "auth/profile", 200,
            data=profile_data,
            check_fn=lambda d: (
                d.get("name") == "Test User Updated" and
                d.get("company") == "Acme Solicitors Ltd" and
                d.get("job_title") == "Director" and
                d.get("phone") == "+44 20 1234 5678" and
                d.get("country") == "United Kingdom" and
                d.get("city") == "London" and
                d.get("postcode") == "WC2H 9JQ" and
                d.get("vat_number") == "GB123456789" and
                d.get("company_size") == "2-10" and
                d.get("industry") == "Legal" and
                d.get("marketing_opt_in") == True
            )
        )
        if success:
            self.log(f"   ✓ All extended fields saved correctly", Colors.GREEN)

        # Test GET /api/auth/me returns the same fields
        success, data = self.test(
            "GET /api/auth/me returns extended profile fields",
            "GET", "auth/me", 200,
            check_fn=lambda d: (
                d.get("name") == "Test User Updated" and
                d.get("company") == "Acme Solicitors Ltd" and
                d.get("job_title") == "Director" and
                d.get("phone") == "+44 20 1234 5678" and
                d.get("country") == "United Kingdom" and
                d.get("city") == "London" and
                d.get("postcode") == "WC2H 9JQ" and
                d.get("vat_number") == "GB123456789" and
                d.get("company_size") == "2-10" and
                d.get("industry") == "Legal" and
                d.get("marketing_opt_in") == True
            )
        )

        # Test default values for new user (country="United Kingdom", timezone="Europe/London")
        # Create a new test user
        test_email = f"newuser_{int(datetime.now().timestamp())}@test.com"
        success, reg_data = self.test(
            "Register new user to test default values",
            "POST", "auth/register", 200,
            data={"name": "New User", "email": test_email, "password": "TestPass123!"}
        )
        
        if success and reg_data.get("dev_code"):
            # Verify email
            success, verify_data = self.test(
                "Verify new user email",
                "POST", "auth/verify-email", 200,
                data={"email": test_email, "code": reg_data.get("dev_code")}
            )
            
            if success:
                new_user_token = verify_data.get("access_token")
                # Check defaults
                self.test(
                    "GET /api/auth/me for new user has UK defaults",
                    "GET", "auth/me", 200,
                    headers={'Authorization': f'Bearer {new_user_token}'},
                    check_fn=lambda d: (
                        d.get("country") == "United Kingdom" and
                        d.get("timezone") == "Europe/London"
                    )
                )

        # Test email uniqueness check (400 when email already used)
        # Try to update to superadmin's email
        self.test(
            "PUT /api/auth/profile with existing email returns 400",
            "PUT", "auth/profile", 400,
            data={"email": "superadmin@civicsign.app"},
            check_fn=lambda d: "already in use" in d.get("detail", "").lower()
        )

        # Test unauthenticated access
        self.test(
            "PUT /api/auth/profile without auth returns 401",
            "PUT", "auth/profile", 401,
            data={"name": "Test"},
            skip_auth=True
        )

        # ===== REGRESSION SMOKE TESTS =====
        self.log("\n🔄 REGRESSION SMOKE TESTS", Colors.YELLOW)
        
        # Login as admin for admin endpoints
        success, data = self.test(
            "Login as super-admin (superadmin@civicsign.app / SuperAdmin@2026)",
            "POST", "auth/login", 200,
            data={"email": "superadmin@civicsign.app", "password": "SuperAdmin@2026"},
            check_fn=lambda d: "access_token" in d and d.get("user", {}).get("role") == "admin"
        )
        if success:
            self.admin_token = data.get("access_token")
            self.log(f"   Admin token obtained", Colors.BLUE)

        # Test admin endpoints
        if self.admin_token:
            self.test(
                "GET /api/admin/billing/metrics (admin) returns 200",
                "GET", "admin/billing/metrics", 200,
                use_admin=True,
                check_fn=lambda d: "currency" in d and "totals" in d
            )

            self.test(
                "GET /api/admin/transactions (admin) returns 200",
                "GET", "admin/transactions", 200,
                use_admin=True,
                check_fn=lambda d: isinstance(d, list)
            )

        # Test regular user endpoints
        self.test(
            "GET /api/stats (regular user) returns 200",
            "GET", "stats", 200,
            check_fn=lambda d: "total" in d and "counts" in d
        )

        self.test(
            "GET /api/envelopes (regular user) returns 200",
            "GET", "envelopes", 200,
            check_fn=lambda d: isinstance(d, list)
        )

        # ===== CLEANUP =====
        self.log("\n🧹 CLEANUP: Removing test envelopes", Colors.YELLOW)
        if self.test_envelope_ids:
            env_ids_str = '", "'.join(self.test_envelope_ids)
            cmd = f'db.envelopes.deleteMany({{envelope_id: {{$in: ["{env_ids_str}"]}}}})'
            output, success_mongo = self.mongo_exec(cmd)
            if success_mongo:
                self.log(f"   ✓ Deleted {len(self.test_envelope_ids)} test envelopes", Colors.GREEN)
            else:
                self.log(f"   ✗ Failed to delete test envelopes: {output}", Colors.RED)

        # Print summary
        self.log("\n" + "="*80, Colors.YELLOW)
        self.log("TEST SUMMARY", Colors.YELLOW)
        self.log("="*80, Colors.YELLOW)
        self.log(f"Total tests: {self.tests_run}", Colors.BLUE)
        self.log(f"Passed: {self.tests_passed}", Colors.GREEN)
        self.log(f"Failed: {self.tests_failed}", Colors.RED)
        success_rate = (self.tests_passed / self.tests_run * 100) if self.tests_run > 0 else 0
        self.log(f"Success rate: {success_rate:.1f}%", Colors.GREEN if success_rate >= 90 else Colors.YELLOW)
        self.log("="*80 + "\n", Colors.YELLOW)

        return 0 if self.tests_failed == 0 else 1

if __name__ == "__main__":
    tester = QuotaProfileTester()
    sys.exit(tester.run_all_tests())
