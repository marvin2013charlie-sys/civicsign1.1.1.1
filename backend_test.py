"""
CIVICSIGN Backend API Testing: Email Verification & Stripe Billing
Tests email-based registration/auth and Stripe subscription checkout.
"""
import requests
import sys
import time
from datetime import datetime

BASE_URL = "http://localhost:8001/api"

class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    END = '\033[0m'

class APITester:
    def __init__(self):
        self.tests_run = 0
        self.tests_passed = 0
        self.tests_failed = 0
        self.token = None
        self.test_email = f"test_{int(time.time())}@example.com"
        self.test_password = "TestPass123!"
        self.test_name = "Test User"
        self.dev_code = None
        self.session_id = None

    def log(self, msg, color=Colors.BLUE):
        print(f"{color}{msg}{Colors.END}")

    def test(self, name, method, endpoint, expected_status, data=None, headers=None, check_fn=None):
        """Run a single API test"""
        url = f"{BASE_URL}/{endpoint}"
        h = headers or {}
        if self.token and 'Authorization' not in h:
            h['Authorization'] = f'Bearer {self.token}'
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
                self.log(f"   Response: {response.text[:200]}", Colors.RED)
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
                    self.log(f"   Response: {resp_data}", Colors.RED)
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
        self.log("\n" + "="*70, Colors.YELLOW)
        self.log("CIVICSIGN BACKEND API TESTS - Email Verification & Billing", Colors.YELLOW)
        self.log("="*70 + "\n", Colors.YELLOW)

        # ===== EMAIL VERIFICATION & AUTH TESTS =====
        self.log("\n📧 EMAIL VERIFICATION & AUTHENTICATION TESTS", Colors.YELLOW)
        
        # Test 1: Register new user (should return verification_required + dev_code)
        success, data = self.test(
            "Register new user (email verification required)",
            "POST", "auth/register", 200,
            data={"name": self.test_name, "email": self.test_email, "password": self.test_password},
            check_fn=lambda d: d.get("verification_required") == True and "dev_code" in d and d.get("dev_mode") == True
        )
        if success:
            self.dev_code = data.get("dev_code")
            self.log(f"   Dev code: {self.dev_code}", Colors.BLUE)

        # Test 2: Login before verification (should be blocked with 403)
        self.test(
            "Login before verification (should be blocked)",
            "POST", "auth/login", 403,
            data={"email": self.test_email, "password": self.test_password},
            check_fn=lambda d: "verify your email" in d.get("detail", "").lower()
        )

        # Test 3: Verify email with WRONG code (should fail with 400)
        self.test(
            "Verify email with WRONG code",
            "POST", "auth/verify-email", 400,
            data={"email": self.test_email, "code": "000000"}
        )

        # Test 4: Verify email with CORRECT code (should succeed + return access_token)
        if self.dev_code:
            success, data = self.test(
                "Verify email with CORRECT code",
                "POST", "auth/verify-email", 200,
                data={"email": self.test_email, "code": self.dev_code},
                check_fn=lambda d: "access_token" in d and d.get("user", {}).get("email_verified") == True
            )
            if success:
                self.token = data.get("access_token")
                self.log(f"   Token obtained: {self.token[:20]}...", Colors.BLUE)

        # Test 5: Login AFTER verification (should succeed)
        success, data = self.test(
            "Login after verification",
            "POST", "auth/login", 200,
            data={"email": self.test_email, "password": self.test_password},
            check_fn=lambda d: "access_token" in d
        )
        if success:
            self.token = data.get("access_token")

        # Test 6: Resend verification for already-verified email (should fail with 400)
        self.test(
            "Resend verification for already-verified email",
            "POST", "auth/resend-verification", 400,
            data={"email": self.test_email}
        )

        # Test 7: Re-register an already-VERIFIED email (should fail with 400)
        self.test(
            "Re-register already-verified email",
            "POST", "auth/register", 400,
            data={"name": "Another User", "email": self.test_email, "password": "AnotherPass123!"}
        )

        # Test 8: Forgot password flow (should return dev_link)
        success, data = self.test(
            "Forgot password (should return dev_link)",
            "POST", "auth/forgot-password", 200,
            data={"email": self.test_email, "base_url": "https://civicsign.test"},
            check_fn=lambda d: d.get("dev_mode") == True and "dev_link" in d
        )
        if success:
            self.log(f"   Dev link: {data.get('dev_link', '')[:60]}...", Colors.BLUE)

        # Test 9: Existing accounts still work (demo@civicsign.com)
        success, data = self.test(
            "Existing account login (demo@civicsign.com)",
            "POST", "auth/login", 200,
            data={"email": "demo@civicsign.com", "password": "Demo1234!"},
            check_fn=lambda d: "access_token" in d
        )
        if success:
            demo_token = data.get("access_token")
            demo_plan = data.get("user", {}).get("plan", "free")
            self.log(f"   Demo account plan: {demo_plan}", Colors.BLUE)

        # Test 10: Admin account login
        success, data = self.test(
            "Admin account login (admin@civicsign.com)",
            "POST", "auth/login", 200,
            data={"email": "admin@civicsign.com", "password": "Admin1234!"},
            check_fn=lambda d: "access_token" in d and d.get("user", {}).get("role") == "admin"
        )
        if success:
            admin_token = data.get("access_token")

        # Test 11: Create another unverified user for resend test
        unverified_email = f"unverified_{int(time.time())}@example.com"
        success, data = self.test(
            "Register another user for resend test",
            "POST", "auth/register", 200,
            data={"name": "Unverified User", "email": unverified_email, "password": "TestPass123!"},
            check_fn=lambda d: d.get("verification_required") == True
        )

        # Test 12: Resend verification for unverified email (should return new dev_code)
        if success:
            self.test(
                "Resend verification for unverified email",
                "POST", "auth/resend-verification", 200,
                data={"email": unverified_email},
                check_fn=lambda d: "dev_code" in d and d.get("dev_mode") == True
            )

        # ===== PUBLIC ASSISTANT TESTS (UK-focused) =====
        self.log("\n🤖 PUBLIC ASSISTANT TESTS (UK-focused)", Colors.YELLOW)

        # Test 13: POST /api/assistant/chat WITHOUT auth (public endpoint)
        success, data = self.test(
            "Public assistant chat (no auth required)",
            "POST", "assistant/chat", 200,
            data={"message": "Hello", "history": []},
            headers={},  # No Authorization header
            check_fn=lambda d: "reply" in d and len(d.get("reply", "")) > 0
        )

        # Test 14: Assistant mentions UK law when asked about e-signature legality
        success, data = self.test(
            "Assistant mentions UK law (Electronic Communications Act 2000 / UK eIDAS)",
            "POST", "assistant/chat", 200,
            data={"message": "Are e-signatures legal in the UK?", "history": []},
            headers={},  # No Authorization header
            check_fn=lambda d: (
                "reply" in d and 
                ("Electronic Communications Act 2000" in d.get("reply", "") or 
                 "UK eIDAS" in d.get("reply", "") or
                 "eIDAS" in d.get("reply", ""))
            )
        )
        if success:
            self.log(f"   Reply preview: {data.get('reply', '')[:150]}...", Colors.BLUE)

        # Test 15: Assistant quotes prices in GBP (£), not dollars
        success, data = self.test(
            "Assistant quotes prices in GBP (£15, £49)",
            "POST", "assistant/chat", 200,
            data={"message": "What are your pricing plans?", "history": []},
            headers={},  # No Authorization header
            check_fn=lambda d: (
                "reply" in d and 
                ("£" in d.get("reply", "") or "GBP" in d.get("reply", "")) and
                "$" not in d.get("reply", "")
            )
        )
        if success:
            self.log(f"   Reply preview: {data.get('reply', '')[:150]}...", Colors.BLUE)

        # ===== STRIPE BILLING TESTS (GBP) =====
        self.log("\n💳 STRIPE BILLING TESTS (GBP)", Colors.YELLOW)

        # Use demo account token for billing tests
        current_plan = "free"
        success, data = self.test(
            "Login as demo for billing tests",
            "POST", "auth/login", 200,
            data={"email": "demo@civicsign.com", "password": "Demo1234!"}
        )
        if success:
            self.token = data.get("access_token")
            current_plan = data.get("user", {}).get("plan", "free")
            self.log(f"   Current plan: {current_plan}", Colors.BLUE)

        # Test 16: GET /api/billing/plans (GBP, ex-VAT catalogue + tax slabs)
        self.test(
            "Get billing plans (GBP currency, ex-VAT + VAT slabs)",
            "GET", "billing/plans", 200,
            check_fn=lambda d: (
                d.get("currency") == "gbp" and
                d.get("prices_exclude_vat") is True and
                d.get("tax", {}).get("percent") == 20 and
                any(
                    p["id"] == "pro"
                    and p["amount_monthly"] == 15.00
                    and p["tax_monthly"]["amount_inc_vat"] == 18.00
                    for p in d.get("plans", [])
                ) and
                any(
                    p["id"] == "business"
                    and p["amount_monthly"] == 79.00
                    and p["tax_monthly"]["amount_inc_vat"] == 94.80
                    for p in d.get("plans", [])
                )
            )
        )

        # Test 17: POST /api/billing/checkout for CURRENT plan (should fail with 400)
        if current_plan in ["pro", "business"]:
            self.test(
                f"Checkout for CURRENT plan ({current_plan}) - should fail",
                "POST", "billing/checkout", 400,
                data={"plan_id": current_plan, "origin_url": "https://civicsign.test"}
            )

        # Test 18: POST /api/billing/checkout for DIFFERENT plan (should succeed)
        target_plan = "business" if current_plan != "business" else "pro"
        success, data = self.test(
            f"Checkout for {target_plan} plan",
            "POST", "billing/checkout", 200,
            data={"plan_id": target_plan, "origin_url": "https://civicsign.test"},
            check_fn=lambda d: "url" in d and "session_id" in d and "checkout.stripe.com" in d.get("url", "")
        )
        if success:
            self.session_id = data.get("session_id")
            self.log(f"   Checkout URL: {data.get('url', '')[:60]}...", Colors.BLUE)
            self.log(f"   Session ID: {self.session_id}", Colors.BLUE)

        # Test 19: POST /api/billing/checkout with invalid plan_id (should fail with 400)
        self.test(
            "Checkout with invalid plan_id",
            "POST", "billing/checkout", 400,
            data={"plan_id": "invalid_plan", "origin_url": "https://civicsign.test"}
        )

        # Test 20: GET /api/billing/status/{session_id} before payment (should show pending)
        if self.session_id:
            self.test(
                "Get checkout status (before payment)",
                "GET", f"billing/status/{self.session_id}", 200,
                check_fn=lambda d: d.get("status") in ["open", "initiated"] and d.get("payment_status") in ["unpaid", "pending"]
            )

        # ===== REGRESSION TESTS =====
        self.log("\n🔄 REGRESSION TESTS", Colors.YELLOW)

        # Test 21: GET /auth/me (should work)
        self.test(
            "Get current user (/auth/me)",
            "GET", "auth/me", 200,
            check_fn=lambda d: "email" in d
        )

        # Print summary
        self.log("\n" + "="*70, Colors.YELLOW)
        self.log("TEST SUMMARY", Colors.YELLOW)
        self.log("="*70, Colors.YELLOW)
        self.log(f"Total tests: {self.tests_run}", Colors.BLUE)
        self.log(f"Passed: {self.tests_passed}", Colors.GREEN)
        self.log(f"Failed: {self.tests_failed}", Colors.RED)
        success_rate = (self.tests_passed / self.tests_run * 100) if self.tests_run > 0 else 0
        self.log(f"Success rate: {success_rate:.1f}%", Colors.GREEN if success_rate >= 90 else Colors.YELLOW)
        self.log("="*70 + "\n", Colors.YELLOW)

        return 0 if self.tests_failed == 0 else 1

if __name__ == "__main__":
    tester = APITester()
    sys.exit(tester.run_all_tests())
