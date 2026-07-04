"""
CIVICSIGN Backend API Testing: Admin Billing & Refunds
Tests the new admin billing metrics, transactions, refunds, and audit log endpoints.
"""
import requests
import sys
import time
import subprocess
import json
from datetime import datetime

BASE_URL = "http://localhost:8001/api"

class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    END = '\033[0m'

class AdminBillingTester:
    def __init__(self):
        self.tests_run = 0
        self.tests_passed = 0
        self.tests_failed = 0
        self.admin_token = None
        self.demo_token = None
        self.admin_user_id = None
        self.demo_user_id = None
        self.fixture_tx_ids = []

    def log(self, msg, color=Colors.BLUE):
        print(f"{color}{msg}{Colors.END}")

    def test(self, name, method, endpoint, expected_status, data=None, headers=None, check_fn=None, token=None):
        """Run a single API test"""
        url = f"{BASE_URL}/{endpoint}"
        h = headers or {}
        
        # Use provided token or default to admin_token
        if token:
            h['Authorization'] = f'Bearer {token}'
        elif self.admin_token and 'Authorization' not in h:
            h['Authorization'] = f'Bearer {self.admin_token}'
            
        if data is not None and 'Content-Type' not in h:
            h['Content-Type'] = 'application/json'

        self.tests_run += 1
        self.log(f"\n🔍 Test {self.tests_run}: {name}", Colors.BLUE)
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=h, timeout=15)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=h, timeout=15)
            elif method == 'PATCH':
                response = requests.patch(url, json=data, headers=h, timeout=15)
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

    def insert_fixture_transaction(self, tx_id, user_id, email, payment_status="paid"):
        """Insert a fixture transaction via MongoDB"""
        self.log(f"   Inserting fixture transaction: {tx_id}", Colors.BLUE)
        now = datetime.utcnow().isoformat()
        doc = {
            "tx_id": tx_id,
            "session_id": f"cs_test_{tx_id}",
            "user_id": user_id,
            "email": email,
            "plan_id": "pro",
            "amount": 15.00,
            "currency": "gbp",
            "status": "complete",
            "payment_status": payment_status,
            "processed": True,
            "created_at": now,
            "updated_at": now
        }
        
        cmd = f"mongosh civicsign --quiet --eval 'db.payment_transactions.insertOne({json.dumps(doc)})'"
        try:
            result = subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=10)
            if result.returncode == 0:
                self.log(f"   ✓ Fixture inserted: {tx_id}", Colors.GREEN)
                self.fixture_tx_ids.append(tx_id)
                return True
            else:
                self.log(f"   ✗ Failed to insert fixture: {result.stderr}", Colors.RED)
                return False
        except Exception as e:
            self.log(f"   ✗ Error inserting fixture: {e}", Colors.RED)
            return False

    def cleanup_fixtures(self):
        """Delete all fixture transactions"""
        if not self.fixture_tx_ids:
            return
        
        self.log(f"\n🧹 Cleaning up {len(self.fixture_tx_ids)} fixture transactions...", Colors.YELLOW)
        for tx_id in self.fixture_tx_ids:
            cmd = f"mongosh civicsign --quiet --eval 'db.payment_transactions.deleteOne({{tx_id: \"{tx_id}\"}})';"
            try:
                subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=10)
                self.log(f"   ✓ Deleted: {tx_id}", Colors.GREEN)
            except Exception as e:
                self.log(f"   ✗ Failed to delete {tx_id}: {e}", Colors.RED)

    def run_all_tests(self):
        self.log("\n" + "="*80, Colors.YELLOW)
        self.log("CIVICSIGN ADMIN BILLING & REFUNDS API TESTS", Colors.YELLOW)
        self.log("="*80 + "\n", Colors.YELLOW)

        # ===== AUTH SETUP =====
        self.log("\n🔐 AUTH SETUP", Colors.YELLOW)
        
        # Login as admin
        success, data = self.test(
            "Login as super-admin (admin@civicsign.com)",
            "POST", "auth/login", 200,
            data={"email": "admin@civicsign.com", "password": "Admin1234!"},
            headers={},  # No auth for login
            check_fn=lambda d: "access_token" in d and d.get("user", {}).get("role") == "admin"
        )
        if success:
            self.admin_token = data.get("access_token")
            self.admin_user_id = data.get("user", {}).get("user_id")
            self.log(f"   Admin token: {self.admin_token[:30]}...", Colors.BLUE)
            self.log(f"   Admin user_id: {self.admin_user_id}", Colors.BLUE)
        else:
            self.log("   ⚠️  Cannot proceed without admin token", Colors.RED)
            return 1

        # Login as demo user (for negative tests)
        success, data = self.test(
            "Login as demo user (demo@civicsign.com)",
            "POST", "auth/login", 200,
            data={"email": "demo@civicsign.com", "password": "Demo1234!"},
            headers={},  # No auth for login
            check_fn=lambda d: "access_token" in d
        )
        if success:
            self.demo_token = data.get("access_token")
            self.demo_user_id = data.get("user", {}).get("user_id")
            self.log(f"   Demo token: {self.demo_token[:30]}...", Colors.BLUE)
            self.log(f"   Demo user_id: {self.demo_user_id}", Colors.BLUE)

        # ===== TEST 1: GET /api/admin/billing/metrics =====
        self.log("\n💰 TEST 1: GET /api/admin/billing/metrics", Colors.YELLOW)
        
        # Test with admin auth (should succeed)
        self.test(
            "GET /api/admin/billing/metrics (admin auth)",
            "GET", "admin/billing/metrics", 200,
            check_fn=lambda d: (
                d.get("currency") == "gbp" and
                "totals" in d and
                "gross" in d["totals"] and
                "refunded" in d["totals"] and
                "net" in d["totals"] and
                "paid_count" in d["totals"] and
                "refunded_count" in d["totals"] and
                "transactions" in d["totals"] and
                "by_plan" in d and
                "series" in d and
                len(d["series"]) == 30
            )
        )
        
        # Test with demo user (should fail with 403)
        self.test(
            "GET /api/admin/billing/metrics (demo user - should fail 403)",
            "GET", "admin/billing/metrics", 403,
            token=self.demo_token
        )

        # ===== TEST 2: GET /api/admin/transactions =====
        self.log("\n📋 TEST 2: GET /api/admin/transactions", Colors.YELLOW)
        
        # Insert fixture transactions for testing
        self.log("   Setting up fixture transactions...", Colors.BLUE)
        self.insert_fixture_transaction("tx_test_refund_002", self.admin_user_id, "admin@civicsign.com", "paid")
        self.insert_fixture_transaction("tx_test_pending_001", self.admin_user_id, "admin@civicsign.com", "pending")
        
        # Test basic list (should succeed)
        success, data = self.test(
            "GET /api/admin/transactions (admin auth)",
            "GET", "admin/transactions", 200,
            check_fn=lambda d: isinstance(d, list)
        )
        if success and len(data) > 0:
            # Check enrichment fields
            tx = data[0]
            has_enrichment = "user_name" in tx and "user_email" in tx and "user_plan" in tx
            if has_enrichment:
                self.log(f"   ✓ Enrichment fields present: user_name, user_email, user_plan", Colors.GREEN)
            else:
                self.log(f"   ✗ Missing enrichment fields", Colors.RED)
        
        # Test with status filter: paid
        self.test(
            "GET /api/admin/transactions?status=paid",
            "GET", "admin/transactions?status=paid", 200,
            check_fn=lambda d: isinstance(d, list)
        )
        
        # Test with status filter: pending
        self.test(
            "GET /api/admin/transactions?status=pending",
            "GET", "admin/transactions?status=pending", 200,
            check_fn=lambda d: isinstance(d, list)
        )
        
        # Test with status filter: refunded
        self.test(
            "GET /api/admin/transactions?status=refunded",
            "GET", "admin/transactions?status=refunded", 200,
            check_fn=lambda d: isinstance(d, list)
        )
        
        # Test with status filter: failed
        self.test(
            "GET /api/admin/transactions?status=failed",
            "GET", "admin/transactions?status=failed", 200,
            check_fn=lambda d: isinstance(d, list)
        )
        
        # Test with status filter: all
        self.test(
            "GET /api/admin/transactions?status=all",
            "GET", "admin/transactions?status=all", 200,
            check_fn=lambda d: isinstance(d, list)
        )
        
        # Test with search query (email)
        self.test(
            "GET /api/admin/transactions?q=admin@civicsign.com",
            "GET", "admin/transactions?q=admin@civicsign.com", 200,
            check_fn=lambda d: isinstance(d, list)
        )
        
        # Test with search query (session_id)
        self.test(
            "GET /api/admin/transactions?q=cs_test",
            "GET", "admin/transactions?q=cs_test", 200,
            check_fn=lambda d: isinstance(d, list)
        )
        
        # Test with demo user (should fail with 403)
        self.test(
            "GET /api/admin/transactions (demo user - should fail 403)",
            "GET", "admin/transactions", 403,
            token=self.demo_token
        )

        # ===== TEST 3: POST /api/admin/transactions/{tx_id}/refund =====
        self.log("\n💸 TEST 3: POST /api/admin/transactions/{tx_id}/refund", Colors.YELLOW)
        
        # Test 3a: 404 when tx_id does not exist
        self.test(
            "POST /api/admin/transactions/nonexistent_tx/refund (should fail 404)",
            "POST", "admin/transactions/nonexistent_tx/refund", 404,
            data={"amount": 10.00, "reason": "Test refund"}
        )
        
        # Test 3b: 400 when tx exists but payment_status != "paid"
        self.test(
            "POST /api/admin/transactions/tx_test_pending_001/refund (pending tx - should fail 400)",
            "POST", "admin/transactions/tx_test_pending_001/refund", 400,
            data={"amount": 10.00, "reason": "Test refund"},
            check_fn=lambda d: "only paid transactions" in d.get("detail", "").lower()
        )
        
        # Test 3c: 500 when STRIPE_API_KEY is missing (paid tx)
        self.test(
            "POST /api/admin/transactions/tx_test_refund_002/refund (STRIPE_API_KEY missing - should fail 500)",
            "POST", "admin/transactions/tx_test_refund_002/refund", 500,
            data={"amount": 10.00, "reason": "Test refund"},
            check_fn=lambda d: "Refunds unavailable" in d.get("detail", "") and "STRIPE_API_KEY missing" in d.get("detail", "")
        )
        
        # Test 3d: 403 for non-admin
        self.test(
            "POST /api/admin/transactions/tx_test_refund_002/refund (demo user - should fail 403)",
            "POST", "admin/transactions/tx_test_refund_002/refund", 403,
            data={"amount": 10.00, "reason": "Test refund"},
            token=self.demo_token
        )
        
        # Test 3e: Validate request body parsing (amount validation)
        # Note: The 500 (STRIPE_API_KEY missing) fires BEFORE amount validation, so we expect 500
        self.test(
            "POST /api/admin/transactions/tx_test_refund_002/refund (amount=0 - should fail 500 first, then 400)",
            "POST", "admin/transactions/tx_test_refund_002/refund", 500,
            data={"amount": 0, "reason": "Test refund"},
            check_fn=lambda d: "Refunds unavailable" in d.get("detail", "") or "amount must be greater than zero" in d.get("detail", "").lower()
        )
        
        # Test with negative amount
        self.test(
            "POST /api/admin/transactions/tx_test_refund_002/refund (amount=-5 - should fail 500 first)",
            "POST", "admin/transactions/tx_test_refund_002/refund", 500,
            data={"amount": -5, "reason": "Test refund"},
            check_fn=lambda d: "Refunds unavailable" in d.get("detail", "") or "amount must be greater than zero" in d.get("detail", "").lower()
        )

        # ===== TEST 4: GET /api/admin/audit-log =====
        self.log("\n📜 TEST 4: GET /api/admin/audit-log", Colors.YELLOW)
        
        # Test basic list (should succeed, may be empty)
        self.test(
            "GET /api/admin/audit-log (admin auth)",
            "GET", "admin/audit-log", 200,
            check_fn=lambda d: isinstance(d, list)
        )
        
        # Test with action filter: refund_transaction
        self.test(
            "GET /api/admin/audit-log?action=refund_transaction",
            "GET", "admin/audit-log?action=refund_transaction", 200,
            check_fn=lambda d: isinstance(d, list)
        )
        
        # Test with action filter: send_password_reset
        self.test(
            "GET /api/admin/audit-log?action=send_password_reset",
            "GET", "admin/audit-log?action=send_password_reset", 200,
            check_fn=lambda d: isinstance(d, list)
        )
        
        # Test with action filter: impersonate
        self.test(
            "GET /api/admin/audit-log?action=impersonate",
            "GET", "admin/audit-log?action=impersonate", 200,
            check_fn=lambda d: isinstance(d, list)
        )
        
        # Test with demo user (should fail with 403)
        self.test(
            "GET /api/admin/audit-log (demo user - should fail 403)",
            "GET", "admin/audit-log", 403,
            token=self.demo_token
        )

        # ===== TEST 5: REGRESSION - Existing admin endpoints =====
        self.log("\n🔄 TEST 5: REGRESSION - Existing admin endpoints", Colors.YELLOW)
        
        self.test(
            "GET /api/admin/metrics (should still work)",
            "GET", "admin/metrics", 200,
            check_fn=lambda d: "totals" in d and "status_counts" in d
        )
        
        self.test(
            "GET /api/admin/users (should still work)",
            "GET", "admin/users", 200,
            check_fn=lambda d: isinstance(d, list)
        )
        
        self.test(
            "GET /api/admin/envelopes (should still work)",
            "GET", "admin/envelopes", 200,
            check_fn=lambda d: isinstance(d, list)
        )

        # ===== CLEANUP =====
        self.cleanup_fixtures()

        # ===== SUMMARY =====
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
    tester = AdminBillingTester()
    sys.exit(tester.run_all_tests())
