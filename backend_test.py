"""CIVICSIGN Backend API Test Suite
Tests auth, envelope CRUD, signer flow, and finalization.
"""
import requests
import sys
import time
from pathlib import Path

BASE_URL = "https://esign-platform-hub.preview.emergentagent.com/api"
DEMO_EMAIL = "demo@civicsign.com"
DEMO_PASSWORD = "Demo1234!"
ADMIN_EMAIL = "admin@civicsign.com"
ADMIN_PASSWORD = "Admin1234!"
SAMPLE_PDF = "/app/poc/out/sample.pdf"
SAMPLE_DOCX = "/app/poc/out/sample.docx"


class CivicSignTester:
    def __init__(self):
        self.token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.envelope_id = None
        self.sign_token = None

    def log(self, msg, status="info"):
        icons = {"info": "🔍", "pass": "✅", "fail": "❌", "warn": "⚠️"}
        print(f"{icons.get(status, '•')} {msg}")

    def test(self, name, method, endpoint, expected_status, data=None, files=None, headers=None):
        """Run a single API test"""
        url = f"{BASE_URL}/{endpoint}"
        h = {"Content-Type": "application/json"}
        if self.token:
            h["Authorization"] = f"Bearer {self.token}"
        if headers:
            h.update(headers)

        self.tests_run += 1
        self.log(f"Testing {name}...", "info")

        try:
            if method == "GET":
                r = requests.get(url, headers=h, timeout=30)
            elif method == "POST":
                if files:
                    h.pop("Content-Type", None)
                    r = requests.post(url, data=data, files=files, headers=h, timeout=30)
                else:
                    r = requests.post(url, json=data, headers=h, timeout=30)
            elif method == "PUT":
                r = requests.put(url, json=data, headers=h, timeout=30)
            elif method == "PATCH":
                r = requests.patch(url, json=data, headers=h, timeout=30)
            elif method == "DELETE":
                r = requests.delete(url, headers=h, timeout=30)
            else:
                raise ValueError(f"Unsupported method: {method}")

            success = r.status_code == expected_status
            if success:
                self.tests_passed += 1
                self.log(f"PASS - {name} (status {r.status_code})", "pass")
                try:
                    return True, r.json()
                except:
                    return True, {}
            else:
                self.log(f"FAIL - {name} - Expected {expected_status}, got {r.status_code}", "fail")
                try:
                    self.log(f"Response: {r.text[:200]}", "warn")
                except:
                    pass
                return False, {}

        except Exception as e:
            self.log(f"FAIL - {name} - Error: {str(e)}", "fail")
            return False, {}

    # ========== AUTH TESTS ==========
    def test_auth_register(self):
        """Test user registration"""
        email = f"test_{int(time.time())}@civicsign.test"
        success, resp = self.test(
            "Register new user",
            "POST",
            "auth/register",
            200,
            data={"name": "Test User", "email": email, "password": "Test1234!"}
        )
        if success and "access_token" in resp:
            self.log("Registration returned access_token", "pass")
            return True
        return False

    def test_auth_login(self):
        """Test login with demo account"""
        success, resp = self.test(
            "Login with demo account",
            "POST",
            "auth/login",
            200,
            data={"email": DEMO_EMAIL, "password": DEMO_PASSWORD}
        )
        if success and "access_token" in resp:
            self.token = resp["access_token"]
            self.log(f"Login successful, token obtained", "pass")
            return True
        return False

    def test_auth_me(self):
        """Test GET /auth/me with Bearer token"""
        success, resp = self.test(
            "GET /auth/me",
            "GET",
            "auth/me",
            200
        )
        if success and resp.get("email") == DEMO_EMAIL:
            self.log(f"Auth /me returned correct user: {resp.get('email')}", "pass")
            return True
        return False

    def test_auth_logout(self):
        """Test logout"""
        success, resp = self.test(
            "Logout",
            "POST",
            "auth/logout",
            200
        )
        return success

    # ========== ENVELOPE TESTS ==========
    def test_upload_pdf(self):
        """Test PDF upload"""
        if not Path(SAMPLE_PDF).exists():
            self.log(f"Sample PDF not found: {SAMPLE_PDF}", "fail")
            return False

        with open(SAMPLE_PDF, "rb") as f:
            success, resp = self.test(
                "Upload PDF",
                "POST",
                "envelopes",
                200,
                data={"title": "Test PDF Document"},
                files={"file": ("sample.pdf", f, "application/pdf")}
            )
        if success and "envelope_id" in resp:
            self.envelope_id = resp["envelope_id"]
            self.log(f"PDF uploaded, envelope_id: {self.envelope_id}", "pass")
            return True
        return False

    def test_upload_docx(self):
        """Test Word document upload (should auto-convert to PDF)"""
        if not Path(SAMPLE_DOCX).exists():
            self.log(f"Sample DOCX not found: {SAMPLE_DOCX}", "fail")
            return False

        with open(SAMPLE_DOCX, "rb") as f:
            success, resp = self.test(
                "Upload DOCX (auto-convert)",
                "POST",
                "envelopes",
                200,
                data={"title": "Test Word Document"},
                files={"file": ("sample.docx", f, "application/vnd.openxmlformats-officedocument.wordprocessingml.document")}
            )
        if success and "envelope_id" in resp:
            self.log(f"DOCX uploaded and converted, envelope_id: {resp['envelope_id']}", "pass")
            # Check if it was converted to PDF
            if resp.get("document", {}).get("file_type") == "docx":
                self.log("Document marked as docx (converted to PDF internally)", "pass")
            return True
        return False

    def test_list_envelopes(self):
        """Test listing envelopes"""
        success, resp = self.test(
            "List envelopes",
            "GET",
            "envelopes",
            200
        )
        if success and isinstance(resp, list):
            self.log(f"Listed {len(resp)} envelope(s)", "pass")
            return True
        return False

    def test_get_stats(self):
        """Test dashboard stats"""
        success, resp = self.test(
            "Get dashboard stats",
            "GET",
            "stats",
            200
        )
        if success and "total" in resp and "completion_rate" in resp:
            self.log(f"Stats: {resp.get('total')} total, {resp.get('completion_rate')}% completion", "pass")
            return True
        return False

    def test_get_envelope(self):
        """Test getting envelope details"""
        if not self.envelope_id:
            self.log("No envelope_id available", "fail")
            return False

        success, resp = self.test(
            "Get envelope details",
            "GET",
            f"envelopes/{self.envelope_id}",
            200
        )
        if success and resp.get("envelope_id") == self.envelope_id:
            self.log(f"Retrieved envelope: {resp.get('title')}", "pass")
            return True
        return False

    def test_update_envelope(self):
        """Test updating envelope with recipients and fields"""
        if not self.envelope_id:
            self.log("No envelope_id available", "fail")
            return False

        # First, add recipient to get recipient_id
        success, resp = self.test(
            "Update envelope (add recipient)",
            "PUT",
            f"envelopes/{self.envelope_id}",
            200,
            data={
                "signing_order": "sequential",
                "recipients": [
                    {
                        "name": "Alice Signer",
                        "email": "alice@test.com",
                        "order": 1,
                        "color": "#1FB8A6"
                    }
                ]
            }
        )
        if not success:
            return False

        # Get recipient_id
        recipient_id = resp.get("recipients", [{}])[0].get("recipient_id")
        if not recipient_id:
            self.log("No recipient_id returned", "fail")
            return False

        # Now add field with both recipients and fields in same call
        success, resp = self.test(
            "Update envelope (add field)",
            "PUT",
            f"envelopes/{self.envelope_id}",
            200,
            data={
                "signing_order": "sequential",
                "recipients": [
                    {
                        "recipient_id": recipient_id,
                        "name": "Alice Signer",
                        "email": "alice@test.com",
                        "order": 1,
                        "color": "#1FB8A6"
                    }
                ],
                "fields": [
                    {
                        "recipient_id": recipient_id,
                        "page": 0,
                        "type": "signature",
                        "x": 0.1,
                        "y": 0.8,
                        "w": 0.3,
                        "h": 0.05,
                        "required": True
                    }
                ]
            }
        )
        if success and len(resp.get("fields", [])) > 0:
            self.log(f"Added {len(resp['fields'])} field(s) to envelope", "pass")
            return True
        return False

    def test_send_envelope(self):
        """Test sending envelope for signature"""
        if not self.envelope_id:
            self.log("No envelope_id available", "fail")
            return False

        success, resp = self.test(
            "Send envelope for signature",
            "POST",
            f"envelopes/{self.envelope_id}/send",
            200,
            data={
                "base_url": "https://esign-platform-hub.preview.emergentagent.com",
                "message": "Please sign this test document"
            }
        )
        if success and resp.get("status") == "sent":
            links = resp.get("links", [])
            if links:
                self.sign_token = links[0].get("token")
                self.log(f"Envelope sent, {len(links)} signing link(s) generated", "pass")
                return True
        return False

    # ========== SIGNER FLOW TESTS ==========
    def test_signer_view(self):
        """Test signer viewing document"""
        if not self.sign_token:
            self.log("No sign_token available", "fail")
            return False

        success, resp = self.test(
            "Signer view document",
            "GET",
            f"sign/{self.sign_token}",
            200
        )
        if success and resp.get("signable"):
            self.log(f"Signer can view document: {resp.get('title')}", "pass")
            return True
        return False

    def test_signer_submit(self):
        """Test signer submitting signature"""
        if not self.sign_token:
            self.log("No sign_token available", "fail")
            return False

        # First, get the document to find field_id
        success, resp = self.test(
            "Get signer fields",
            "GET",
            f"sign/{self.sign_token}",
            200
        )
        if not success:
            return False

        fields = resp.get("fields", [])
        editable_fields = [f for f in fields if f.get("editable")]
        if not editable_fields:
            self.log("No editable fields found", "fail")
            return False

        # Submit signature
        values = []
        for f in editable_fields:
            if f["type"] == "signature":
                values.append({"field_id": f["field_id"], "value": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="})
            elif f["type"] == "date":
                values.append({"field_id": f["field_id"], "value": "2024-01-15"})
            elif f["type"] == "text":
                values.append({"field_id": f["field_id"], "value": "Test Value"})
            elif f["type"] == "checkbox":
                values.append({"field_id": f["field_id"], "value": True})

        success, resp = self.test(
            "Signer submit signature",
            "POST",
            f"sign/{self.sign_token}/submit",
            200,
            data={
                "consent": True,
                "signer_name": "Alice Signer",
                "values": values
            }
        )
        if success and resp.get("status") in ("signed", "completed"):
            self.log(f"Signature submitted, status: {resp.get('status')}", "pass")
            # Wait for finalization if completed
            if resp.get("status") == "completed":
                self.log("Waiting 3s for background finalization...", "info")
                time.sleep(3)
            return True
        return False

    def test_envelope_completed(self):
        """Test checking if envelope is completed"""
        if not self.envelope_id:
            self.log("No envelope_id available", "fail")
            return False

        # Poll for completion
        for i in range(5):
            success, resp = self.test(
                f"Check envelope completion (attempt {i+1})",
                "GET",
                f"envelopes/{self.envelope_id}",
                200
            )
            if success and resp.get("status") == "completed":
                self.log(f"Envelope completed! Hash: {resp.get('doc_hash', 'N/A')[:16]}...", "pass")
                return True
            if i < 4:
                time.sleep(1)

        self.log("Envelope not completed after 5 attempts", "warn")
        return False

    def test_download_completed(self):
        """Test downloading completed PDF"""
        if not self.envelope_id:
            self.log("No envelope_id available", "fail")
            return False

        url = f"{BASE_URL}/envelopes/{self.envelope_id}/completed"
        h = {"Authorization": f"Bearer {self.token}"}

        self.tests_run += 1
        self.log("Testing download completed PDF...", "info")

        try:
            r = requests.get(url, headers=h, timeout=30)
            if r.status_code == 200 and r.headers.get("content-type") == "application/pdf":
                self.tests_passed += 1
                self.log(f"PASS - Downloaded completed PDF ({len(r.content)} bytes)", "pass")
                return True
            else:
                self.log(f"FAIL - Expected 200 + PDF, got {r.status_code}", "fail")
                return False
        except Exception as e:
            self.log(f"FAIL - Download error: {str(e)}", "fail")
            return False

    def test_decline_flow(self):
        """Test signer declining to sign"""
        # Create a new envelope for decline test
        with open(SAMPLE_PDF, "rb") as f:
            success, resp = self.test(
                "Upload PDF for decline test",
                "POST",
                "envelopes",
                200,
                data={"title": "Decline Test Document"},
                files={"file": ("sample.pdf", f, "application/pdf")}
            )
        if not success:
            return False

        decline_env_id = resp["envelope_id"]

        # Add recipient and field
        success, resp = self.test(
            "Add recipient for decline test",
            "PUT",
            f"envelopes/{decline_env_id}",
            200,
            data={
                "recipients": [{"name": "Bob Decliner", "email": "bob@test.com", "order": 1}]
            }
        )
        if not success:
            return False

        recipient_id = resp["recipients"][0]["recipient_id"]

        success, resp = self.test(
            "Add field for decline test",
            "PUT",
            f"envelopes/{decline_env_id}",
            200,
            data={
                "fields": [{
                    "recipient_id": recipient_id,
                    "page": 0,
                    "type": "signature",
                    "x": 0.1,
                    "y": 0.8,
                    "w": 0.3,
                    "h": 0.05,
                    "required": True
                }]
            }
        )
        if not success:
            return False

        # Send
        success, resp = self.test(
            "Send envelope for decline test",
            "POST",
            f"envelopes/{decline_env_id}/send",
            200,
            data={"base_url": "https://esign-platform-hub.preview.emergentagent.com"}
        )
        if not success:
            return False

        decline_token = resp["links"][0]["token"]

        # Decline
        success, resp = self.test(
            "Signer decline to sign",
            "POST",
            f"sign/{decline_token}/decline",
            200,
            data={"reason": "I do not agree with the terms"}
        )
        if success and resp.get("status") == "declined":
            self.log("Decline flow successful", "pass")
            return True
        return False

    # ========== PHASE 3: TEMPLATE TESTS ==========
    def test_save_as_template(self):
        """Test saving an envelope as a template"""
        # Create a new envelope with recipients and fields
        with open(SAMPLE_PDF, "rb") as f:
            success, resp = self.test(
                "Upload PDF for template",
                "POST",
                "envelopes",
                200,
                data={"title": "Template Test Document"},
                files={"file": ("sample.pdf", f, "application/pdf")}
            )
        if not success:
            return False

        template_env_id = resp["envelope_id"]

        # Add recipient and field
        success, resp = self.test(
            "Add recipient for template",
            "PUT",
            f"envelopes/{template_env_id}",
            200,
            data={
                "recipients": [{"name": "Signer Role", "email": "signer@test.com", "order": 1}]
            }
        )
        if not success:
            return False

        recipient_id = resp["recipients"][0]["recipient_id"]

        success, resp = self.test(
            "Add field for template",
            "PUT",
            f"envelopes/{template_env_id}",
            200,
            data={
                "fields": [{
                    "recipient_id": recipient_id,
                    "page": 0,
                    "type": "signature",
                    "x": 0.1,
                    "y": 0.8,
                    "w": 0.3,
                    "h": 0.05,
                    "required": True
                }]
            }
        )
        if not success:
            return False

        # Save as template
        success, resp = self.test(
            "Save envelope as template",
            "POST",
            f"templates/from-envelope/{template_env_id}",
            200,
            data={
                "name": "Test Template",
                "description": "A test template for automated testing"
            }
        )
        if success and "template_id" in resp:
            self.template_id = resp["template_id"]
            self.log(f"Template created: {self.template_id}", "pass")
            return True
        return False

    def test_list_templates(self):
        """Test listing templates"""
        success, resp = self.test(
            "List templates",
            "GET",
            "templates",
            200
        )
        if success and isinstance(resp, list):
            self.log(f"Listed {len(resp)} template(s)", "pass")
            return True
        return False

    def test_use_template(self):
        """Test creating an envelope from a template"""
        if not hasattr(self, 'template_id') or not self.template_id:
            self.log("No template_id available", "fail")
            return False

        success, resp = self.test(
            "Use template to create envelope",
            "POST",
            f"templates/{self.template_id}/use",
            200,
            data={
                "recipients": [
                    {
                        "role_id": "role_placeholder",  # Will be replaced by actual role_id
                        "name": "John Doe",
                        "email": "john@test.com"
                    }
                ]
            }
        )
        
        # If failed due to role_id, get the template first
        if not success:
            success2, tpl_resp = self.test(
                "Get template details",
                "GET",
                f"templates/{self.template_id}",
                200
            )
            if success2 and tpl_resp.get("roles"):
                role_id = tpl_resp["roles"][0]["role_id"]
                success, resp = self.test(
                    "Use template with correct role_id",
                    "POST",
                    f"templates/{self.template_id}/use",
                    200,
                    data={
                        "recipients": [
                            {
                                "role_id": role_id,
                                "name": "John Doe",
                                "email": "john@test.com"
                            }
                        ]
                    }
                )

        if success and "envelope_id" in resp:
            self.log(f"Envelope created from template: {resp['envelope_id']}", "pass")
            return True
        return False

    def test_bulk_send(self):
        """Test bulk sending with a single-role template"""
        if not hasattr(self, 'template_id') or not self.template_id:
            self.log("No template_id available", "fail")
            return False

        success, resp = self.test(
            "Bulk send template",
            "POST",
            f"templates/{self.template_id}/bulk-send",
            200,
            data={
                "base_url": "https://esign-platform-hub.preview.emergentagent.com",
                "message": "Bulk test message",
                "rows": [
                    {"name": "Alice Bulk", "email": "alice@bulk.test"},
                    {"name": "Bob Bulk", "email": "bob@bulk.test"}
                ]
            }
        )
        if success and resp.get("created") == 2:
            self.log(f"Bulk sent {resp['created']} envelopes", "pass")
            return True
        return False

    def test_delete_template(self):
        """Test deleting a template"""
        if not hasattr(self, 'template_id') or not self.template_id:
            self.log("No template_id available", "fail")
            return False

        success, resp = self.test(
            "Delete template",
            "DELETE",
            f"templates/{self.template_id}",
            200
        )
        if success:
            self.log("Template deleted successfully", "pass")
            return True
        return False

    # ========== PHASE 3: REMINDER & EXPIRATION TESTS ==========
    def test_send_reminder(self):
        """Test sending a reminder for an active envelope"""
        # Create and send an envelope first
        with open(SAMPLE_PDF, "rb") as f:
            success, resp = self.test(
                "Upload PDF for reminder test",
                "POST",
                "envelopes",
                200,
                data={"title": "Reminder Test Document"},
                files={"file": ("sample.pdf", f, "application/pdf")}
            )
        if not success:
            return False

        reminder_env_id = resp["envelope_id"]

        # Add recipient and field
        success, resp = self.test(
            "Add recipient for reminder test",
            "PUT",
            f"envelopes/{reminder_env_id}",
            200,
            data={
                "recipients": [{"name": "Charlie Reminder", "email": "charlie@test.com", "order": 1}]
            }
        )
        if not success:
            return False

        recipient_id = resp["recipients"][0]["recipient_id"]

        success, resp = self.test(
            "Add field for reminder test",
            "PUT",
            f"envelopes/{reminder_env_id}",
            200,
            data={
                "fields": [{
                    "recipient_id": recipient_id,
                    "page": 0,
                    "type": "signature",
                    "x": 0.1,
                    "y": 0.8,
                    "w": 0.3,
                    "h": 0.05,
                    "required": True
                }]
            }
        )
        if not success:
            return False

        # Send
        success, resp = self.test(
            "Send envelope for reminder test",
            "POST",
            f"envelopes/{reminder_env_id}/send",
            200,
            data={"base_url": "https://esign-platform-hub.preview.emergentagent.com"}
        )
        if not success:
            return False

        # Send reminder
        success, resp = self.test(
            "Send reminder",
            "POST",
            f"envelopes/{reminder_env_id}/remind",
            200,
            data={"base_url": "https://esign-platform-hub.preview.emergentagent.com"}
        )
        if success and resp.get("reminded") == 1:
            self.log(f"Reminder sent to {resp['reminded']} recipient(s)", "pass")
            return True
        return False

    def test_expiration(self):
        """Test sending an envelope with expiration"""
        with open(SAMPLE_PDF, "rb") as f:
            success, resp = self.test(
                "Upload PDF for expiration test",
                "POST",
                "envelopes",
                200,
                data={"title": "Expiration Test Document"},
                files={"file": ("sample.pdf", f, "application/pdf")}
            )
        if not success:
            return False

        expiry_env_id = resp["envelope_id"]

        # Add recipient and field
        success, resp = self.test(
            "Add recipient for expiration test",
            "PUT",
            f"envelopes/{expiry_env_id}",
            200,
            data={
                "recipients": [{"name": "Diana Expiry", "email": "diana@test.com", "order": 1}]
            }
        )
        if not success:
            return False

        recipient_id = resp["recipients"][0]["recipient_id"]

        success, resp = self.test(
            "Add field for expiration test",
            "PUT",
            f"envelopes/{expiry_env_id}",
            200,
            data={
                "fields": [{
                    "recipient_id": recipient_id,
                    "page": 0,
                    "type": "signature",
                    "x": 0.1,
                    "y": 0.8,
                    "w": 0.3,
                    "h": 0.05,
                    "required": True
                }]
            }
        )
        if not success:
            return False

        # Send with expiration
        success, resp = self.test(
            "Send envelope with 7-day expiration",
            "POST",
            f"envelopes/{expiry_env_id}/send",
            200,
            data={
                "base_url": "https://esign-platform-hub.preview.emergentagent.com",
                "expires_in_days": 7
            }
        )
        if not success:
            return False

        # Verify expiration was set
        success, resp = self.test(
            "Verify expiration was set",
            "GET",
            f"envelopes/{expiry_env_id}",
            200
        )
        if success and resp.get("expires_at"):
            self.log(f"Expiration set: {resp['expires_at']}", "pass")
            return True
        return False

    # ========== PHASE 4: SETTINGS & PROFILE TESTS ==========
    def test_profile_update(self):
        """Test updating user profile (name, mobile)"""
        success, resp = self.test(
            "Update profile (name and mobile)",
            "PUT",
            "auth/profile",
            200,
            data={
                "name": "Demo User Updated",
                "mobile": "+1 555 123 4567"
            }
        )
        if success and resp.get("name") == "Demo User Updated":
            self.log("Profile updated successfully", "pass")
            # Restore original name
            self.test(
                "Restore original name",
                "PUT",
                "auth/profile",
                200,
                data={"name": "CivicSign Demo"}
            )
            return True
        return False

    def test_email_uniqueness(self):
        """Test email uniqueness validation (should fail with 400)"""
        success, resp = self.test(
            "Try to change email to admin email (should fail)",
            "PUT",
            "auth/profile",
            400,
            data={"email": ADMIN_EMAIL}
        )
        if success:
            self.log("Email uniqueness validation working (400 returned)", "pass")
            return True
        return False

    def test_password_change(self):
        """Test changing password"""
        success, resp = self.test(
            "Change password",
            "POST",
            "auth/change-password",
            200,
            data={
                "current_password": DEMO_PASSWORD,
                "new_password": DEMO_PASSWORD  # Keep same password
            }
        )
        if success:
            self.log("Password change successful", "pass")
            return True
        return False

    def test_subscription_update(self):
        """Test updating subscription plan"""
        success, resp = self.test(
            "Update subscription to business",
            "POST",
            "auth/subscription",
            200,
            data={"plan": "business"}
        )
        if success and resp.get("plan") == "business":
            self.log("Subscription updated to business", "pass")
            # Restore to pro
            self.test(
                "Restore subscription to pro",
                "POST",
                "auth/subscription",
                200,
                data={"plan": "pro"}
            )
            return True
        return False

    # ========== PHASE 4: ADMIN TESTS ==========
    def test_admin_login(self):
        """Test admin login"""
        success, resp = self.test(
            "Admin login",
            "POST",
            "auth/login",
            200,
            data={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        if success and "access_token" in resp:
            self.admin_token = resp["access_token"]
            self.admin_user_id = resp.get("user", {}).get("user_id")
            self.log(f"Admin login successful, token obtained", "pass")
            return True
        return False

    def test_admin_metrics(self):
        """Test GET /admin/metrics"""
        # Save current token and use admin token
        user_token = self.token
        self.token = self.admin_token
        
        success, resp = self.test(
            "GET /admin/metrics",
            "GET",
            "admin/metrics",
            200
        )
        
        # Restore user token
        self.token = user_token
        
        if success and "totals" in resp and "signup_series" in resp:
            self.log(f"Admin metrics: {resp['totals']['users']} users, {resp['totals']['envelopes']} envelopes", "pass")
            return True
        return False

    def test_admin_users_list(self):
        """Test GET /admin/users"""
        user_token = self.token
        self.token = self.admin_token
        
        success, resp = self.test(
            "GET /admin/users",
            "GET",
            "admin/users",
            200
        )
        
        self.token = user_token
        
        if success and isinstance(resp, list) and len(resp) > 0:
            self.log(f"Admin users list: {len(resp)} users", "pass")
            return True
        return False

    def test_admin_users_search(self):
        """Test GET /admin/users with search"""
        user_token = self.token
        self.token = self.admin_token
        
        url = f"{BASE_URL}/admin/users?q=demo"
        h = {"Authorization": f"Bearer {self.admin_token}"}
        
        self.tests_run += 1
        self.log("Testing admin users search...", "info")
        
        try:
            r = requests.get(url, headers=h, timeout=30)
            if r.status_code == 200:
                users = r.json()
                self.tests_passed += 1
                self.log(f"PASS - Admin users search returned {len(users)} result(s)", "pass")
                self.token = user_token
                return True
            else:
                self.log(f"FAIL - Expected 200, got {r.status_code}", "fail")
                self.token = user_token
                return False
        except Exception as e:
            self.log(f"FAIL - Error: {str(e)}", "fail")
            self.token = user_token
            return False

    def test_admin_update_user(self):
        """Test PATCH /admin/users/{user_id} - update a non-admin user"""
        user_token = self.token
        self.token = self.admin_token
        
        # First get the demo user
        success, users = self.test(
            "Get demo user for update test",
            "GET",
            "admin/users?q=demo@civicsign.com",
            200
        )
        
        if not success or not users:
            self.token = user_token
            return False
        
        demo_user = next((u for u in users if u["email"] == DEMO_EMAIL), None)
        if not demo_user:
            self.log("Demo user not found", "fail")
            self.token = user_token
            return False
        
        demo_user_id = demo_user["user_id"]
        
        # Update plan to free
        success, resp = self.test(
            "Update demo user plan to free",
            "PATCH",
            f"admin/users/{demo_user_id}",
            200,
            data={"plan": "free"}
        )
        
        if success and resp.get("plan") == "free":
            self.log("Admin updated user plan successfully", "pass")
            # Restore to pro
            self.test(
                "Restore demo user plan to pro",
                "PATCH",
                f"admin/users/{demo_user_id}",
                200,
                data={"plan": "pro"}
            )
            self.token = user_token
            return True
        
        self.token = user_token
        return False

    def test_admin_self_guard(self):
        """Test admin cannot deactivate or demote themselves"""
        user_token = self.token
        self.token = self.admin_token
        
        # Try to deactivate own account (should fail with 400)
        success, resp = self.test(
            "Admin try to deactivate own account (should fail)",
            "PATCH",
            f"admin/users/{self.admin_user_id}",
            400,
            data={"active": False}
        )
        
        if success:
            self.log("Admin self-guard working: cannot deactivate own account", "pass")
        else:
            self.log("Admin self-guard failed: should return 400", "fail")
        
        # Try to demote own account (should fail with 400)
        success2, resp2 = self.test(
            "Admin try to demote own account (should fail)",
            "PATCH",
            f"admin/users/{self.admin_user_id}",
            400,
            data={"role": "user"}
        )
        
        self.token = user_token
        
        if success2:
            self.log("Admin self-guard working: cannot demote own account", "pass")
            return True
        else:
            self.log("Admin self-guard failed: should return 400", "fail")
            return False

    def test_admin_envelopes_list(self):
        """Test GET /admin/envelopes"""
        user_token = self.token
        self.token = self.admin_token
        
        success, resp = self.test(
            "GET /admin/envelopes",
            "GET",
            "admin/envelopes",
            200
        )
        
        self.token = user_token
        
        if success and isinstance(resp, list):
            self.log(f"Admin envelopes list: {len(resp)} envelopes", "pass")
            return True
        return False

    def test_admin_envelopes_filter(self):
        """Test GET /admin/envelopes with status filter"""
        user_token = self.token
        self.token = self.admin_token
        
        url = f"{BASE_URL}/admin/envelopes?status=completed"
        h = {"Authorization": f"Bearer {self.admin_token}"}
        
        self.tests_run += 1
        self.log("Testing admin envelopes filter...", "info")
        
        try:
            r = requests.get(url, headers=h, timeout=30)
            if r.status_code == 200:
                envs = r.json()
                self.tests_passed += 1
                self.log(f"PASS - Admin envelopes filter returned {len(envs)} completed envelope(s)", "pass")
                self.token = user_token
                return True
            else:
                self.log(f"FAIL - Expected 200, got {r.status_code}", "fail")
                self.token = user_token
                return False
        except Exception as e:
            self.log(f"FAIL - Error: {str(e)}", "fail")
            self.token = user_token
            return False

    def test_admin_contacts_list(self):
        """Test GET /admin/contact-messages"""
        user_token = self.token
        self.token = self.admin_token
        
        success, resp = self.test(
            "GET /admin/contact-messages",
            "GET",
            "admin/contact-messages",
            200
        )
        
        self.token = user_token
        
        if success and isinstance(resp, list):
            self.log(f"Admin contacts list: {len(resp)} message(s)", "pass")
            return True
        return False

    def test_admin_contact_handle(self):
        """Test PATCH /admin/contact-messages/{id} - mark as handled"""
        # First create a contact message
        success, resp = self.test(
            "Submit contact message for admin test",
            "POST",
            "contact",
            200,
            data={
                "name": "Test Contact",
                "email": "test@contact.com",
                "subject": "Test Subject",
                "message": "Test message for admin handling"
            }
        )
        
        if not success:
            return False
        
        # Now get the contact messages as admin
        user_token = self.token
        self.token = self.admin_token
        
        success, messages = self.test(
            "Get contact messages",
            "GET",
            "admin/contact-messages",
            200
        )
        
        if not success or not messages:
            self.token = user_token
            return False
        
        # Find the test message
        test_msg = next((m for m in messages if m["email"] == "test@contact.com"), None)
        if not test_msg:
            self.log("Test contact message not found", "fail")
            self.token = user_token
            return False
        
        contact_id = test_msg["contact_id"]
        
        # Mark as handled
        success, resp = self.test(
            "Mark contact message as handled",
            "PATCH",
            f"admin/contact-messages/{contact_id}",
            200,
            data={"handled": True}
        )
        
        if success and resp.get("handled") is True:
            self.log("Contact message marked as handled", "pass")
            # Reopen it
            self.test(
                "Reopen contact message",
                "PATCH",
                f"admin/contact-messages/{contact_id}",
                200,
                data={"handled": False}
            )
            self.token = user_token
            return True
        
        self.token = user_token
        return False

    def test_non_admin_blocked(self):
        """Test that non-admin user cannot access admin endpoints"""
        # Use demo user token (non-admin)
        success, resp = self.test(
            "Non-admin try to access /admin/metrics (should fail)",
            "GET",
            "admin/metrics",
            403
        )
        
        if success:
            self.log("Non-admin correctly blocked from admin endpoints (403)", "pass")
            return True
        return False

    def run_all(self):
        """Run all tests"""
        print("\n" + "="*60)
        print("CIVICSIGN BACKEND API TEST SUITE - PHASE 4")
        print("="*60 + "\n")

        # Auth tests
        print("\n--- AUTH TESTS ---")
        self.test_auth_register()
        if not self.test_auth_login():
            self.log("Login failed, cannot continue", "fail")
            return 1
        self.test_auth_me()

        # Envelope tests
        print("\n--- ENVELOPE TESTS ---")
        if not self.test_upload_pdf():
            self.log("PDF upload failed, cannot continue", "fail")
            return 1
        self.test_upload_docx()
        self.test_list_envelopes()
        self.test_get_stats()
        self.test_get_envelope()
        self.test_update_envelope()
        self.test_send_envelope()

        # Signer flow tests
        print("\n--- SIGNER FLOW TESTS ---")
        self.test_signer_view()
        self.test_signer_submit()
        self.test_envelope_completed()
        self.test_download_completed()

        # Decline test
        print("\n--- DECLINE FLOW TEST ---")
        self.test_decline_flow()

        # Phase 3: Template tests
        print("\n--- PHASE 3: TEMPLATE TESTS ---")
        self.test_save_as_template()
        self.test_list_templates()
        self.test_use_template()
        self.test_bulk_send()
        self.test_delete_template()

        # Phase 3: Reminder & Expiration tests
        print("\n--- PHASE 3: REMINDER & EXPIRATION TESTS ---")
        self.test_send_reminder()
        self.test_expiration()

        # Phase 4: Settings & Profile tests
        print("\n--- PHASE 4: SETTINGS & PROFILE TESTS ---")
        self.test_profile_update()
        self.test_email_uniqueness()
        self.test_password_change()
        self.test_subscription_update()

        # Phase 4: Admin tests
        print("\n--- PHASE 4: ADMIN TESTS ---")
        if not self.test_admin_login():
            self.log("Admin login failed, skipping admin tests", "fail")
        else:
            self.test_admin_metrics()
            self.test_admin_users_list()
            self.test_admin_users_search()
            self.test_admin_update_user()
            self.test_admin_self_guard()
            self.test_admin_envelopes_list()
            self.test_admin_envelopes_filter()
            self.test_admin_contacts_list()
            self.test_admin_contact_handle()
        
        # Test non-admin access control
        self.test_non_admin_blocked()

        # Logout
        print("\n--- CLEANUP ---")
        self.test_auth_logout()

        # Summary
        print("\n" + "="*60)
        print(f"📊 RESULTS: {self.tests_passed}/{self.tests_run} tests passed")
        print("="*60 + "\n")

        return 0 if self.tests_passed == self.tests_run else 1


if __name__ == "__main__":
    tester = CivicSignTester()
    sys.exit(tester.run_all())
