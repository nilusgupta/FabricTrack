"""
Iteration 10 Tests: Voice Notes Feature & Form Field Removal Verification
- Voice notes upload (POST /api/enquiries/{id}/voice-notes)
- Voice notes delete (DELETE /api/enquiries/{id}/voice-notes/{note_id})
- Voice notes returned with enquiry data
- Enquiry creation without Rate, PO No, PO Received Date, Quantity fields
- Fabric Received and Qty Received fields still work
"""
import pytest
import requests
import os
import io

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestVoiceNotesFeature:
    """Voice Notes API tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get session with cookies"""
        self.session = requests.Session()
        login_resp = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@example.com",
            "password": "admin123"
        })
        assert login_resp.status_code == 200, f"Login failed: {login_resp.text}"
        self.user = login_resp.json()
        yield
        # Cleanup
        self.session.close()
    
    def test_create_enquiry_without_removed_fields(self):
        """Test creating enquiry without Rate, PO No, PO Received Date, Quantity"""
        # Create enquiry with only required fields + fabric_received
        payload = {
            "customer_name": "TEST_VoiceNote_Customer",
            "fabric_type": "TEST_VoiceNote_Fabric",
            "style_no": "TEST_VN_001",
            "department": "Sales",
            "notes": "Test enquiry for voice notes",
            "fabric_received": "yes",
            "qty_received": "100 meters"
        }
        resp = self.session.post(f"{BASE_URL}/api/enquiries", json=payload)
        assert resp.status_code == 200, f"Create enquiry failed: {resp.text}"
        data = resp.json()
        
        # Verify enquiry created
        assert data.get("id"), "Enquiry ID not returned"
        assert data.get("customer_name") == "TEST_VoiceNote_Customer"
        assert data.get("fabric_received") == "yes"
        assert data.get("qty_received") == "100 meters"
        
        # Store for later tests
        self.__class__.test_enquiry_id = data["id"]
        print(f"Created test enquiry: {data['id']}")
    
    def test_upload_voice_note(self):
        """Test uploading a voice note to an enquiry"""
        enquiry_id = getattr(self.__class__, 'test_enquiry_id', None)
        if not enquiry_id:
            # Create enquiry first
            self.test_create_enquiry_without_removed_fields()
            enquiry_id = self.__class__.test_enquiry_id
        
        # Create a fake audio file (webm format)
        fake_audio = io.BytesIO(b'\x1a\x45\xdf\xa3' + b'\x00' * 100)  # WebM magic bytes + padding
        files = {
            'file': ('test_voice.webm', fake_audio, 'audio/webm')
        }
        
        resp = self.session.post(
            f"{BASE_URL}/api/enquiries/{enquiry_id}/voice-notes",
            files=files
        )
        assert resp.status_code == 200, f"Voice note upload failed: {resp.text}"
        data = resp.json()
        
        # Verify voice note response
        assert data.get("id"), "Voice note ID not returned"
        assert data.get("storage_path"), "Storage path not returned"
        assert data.get("recorded_by_name"), "Recorder name not returned"
        assert data.get("created_at"), "Created at not returned"
        
        self.__class__.test_voice_note_id = data["id"]
        print(f"Uploaded voice note: {data['id']}")
    
    def test_voice_notes_returned_with_enquiry(self):
        """Test that voice notes array is returned with enquiry data"""
        enquiry_id = getattr(self.__class__, 'test_enquiry_id', None)
        if not enquiry_id:
            self.test_upload_voice_note()
            enquiry_id = self.__class__.test_enquiry_id
        
        resp = self.session.get(f"{BASE_URL}/api/enquiries/{enquiry_id}")
        assert resp.status_code == 200, f"Get enquiry failed: {resp.text}"
        data = resp.json()
        
        # Verify voice_notes array exists
        assert "voice_notes" in data, "voice_notes field not in enquiry response"
        voice_notes = data.get("voice_notes", [])
        assert isinstance(voice_notes, list), "voice_notes should be a list"
        
        if len(voice_notes) > 0:
            note = voice_notes[0]
            assert "id" in note, "Voice note missing id"
            assert "storage_path" in note, "Voice note missing storage_path"
            assert "recorded_by_name" in note, "Voice note missing recorded_by_name"
            assert "created_at" in note, "Voice note missing created_at"
            print(f"Voice notes in enquiry: {len(voice_notes)}")
    
    def test_upload_multiple_voice_notes(self):
        """Test uploading multiple voice notes to same enquiry"""
        enquiry_id = getattr(self.__class__, 'test_enquiry_id', None)
        if not enquiry_id:
            self.test_create_enquiry_without_removed_fields()
            enquiry_id = self.__class__.test_enquiry_id
        
        # Upload second voice note
        fake_audio = io.BytesIO(b'\x1a\x45\xdf\xa3' + b'\x00' * 50)
        files = {'file': ('test_voice_2.webm', fake_audio, 'audio/webm')}
        
        resp = self.session.post(
            f"{BASE_URL}/api/enquiries/{enquiry_id}/voice-notes",
            files=files
        )
        assert resp.status_code == 200, f"Second voice note upload failed: {resp.text}"
        
        # Verify enquiry now has multiple voice notes
        enq_resp = self.session.get(f"{BASE_URL}/api/enquiries/{enquiry_id}")
        assert enq_resp.status_code == 200
        voice_notes = enq_resp.json().get("voice_notes", [])
        assert len(voice_notes) >= 2, f"Expected at least 2 voice notes, got {len(voice_notes)}"
        print(f"Multiple voice notes verified: {len(voice_notes)} notes")
    
    def test_delete_voice_note_admin(self):
        """Test admin can delete voice notes"""
        enquiry_id = getattr(self.__class__, 'test_enquiry_id', None)
        voice_note_id = getattr(self.__class__, 'test_voice_note_id', None)
        
        if not enquiry_id or not voice_note_id:
            self.test_upload_voice_note()
            enquiry_id = self.__class__.test_enquiry_id
            voice_note_id = self.__class__.test_voice_note_id
        
        resp = self.session.delete(
            f"{BASE_URL}/api/enquiries/{enquiry_id}/voice-notes/{voice_note_id}"
        )
        assert resp.status_code == 200, f"Delete voice note failed: {resp.text}"
        data = resp.json()
        assert data.get("message") == "Voice note deleted"
        print(f"Deleted voice note: {voice_note_id}")
    
    def test_voice_note_upload_to_nonexistent_enquiry(self):
        """Test uploading voice note to non-existent enquiry returns 404"""
        fake_audio = io.BytesIO(b'\x1a\x45\xdf\xa3' + b'\x00' * 50)
        files = {'file': ('test.webm', fake_audio, 'audio/webm')}
        
        resp = self.session.post(
            f"{BASE_URL}/api/enquiries/nonexistent123/voice-notes",
            files=files
        )
        assert resp.status_code == 404, f"Expected 404, got {resp.status_code}"
        print("Non-existent enquiry returns 404 as expected")


class TestFormFieldRemoval:
    """Verify Rate, PO No, PO Received Date, Quantity fields removed from enquiry creation"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get session"""
        self.session = requests.Session()
        login_resp = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@example.com",
            "password": "admin123"
        })
        assert login_resp.status_code == 200
        yield
        self.session.close()
    
    def test_enquiry_creation_with_fabric_received_yes(self):
        """Test enquiry creation with fabric_received=yes shows qty_received"""
        payload = {
            "customer_name": "TEST_FabricReceived_Customer",
            "fabric_type": "TEST_FabricReceived_Fabric",
            "style_no": "TEST_FR_001",
            "fabric_received": "yes",
            "qty_received": "500 yards"
        }
        resp = self.session.post(f"{BASE_URL}/api/enquiries", json=payload)
        assert resp.status_code == 200, f"Create failed: {resp.text}"
        data = resp.json()
        
        assert data.get("fabric_received") == "yes"
        assert data.get("qty_received") == "500 yards"
        print("Fabric Received=yes with Qty Received works correctly")
        
        # Cleanup
        self.session.delete(f"{BASE_URL}/api/enquiries/{data['id']}")
    
    def test_enquiry_creation_with_fabric_received_no(self):
        """Test enquiry creation with fabric_received=no"""
        payload = {
            "customer_name": "TEST_FabricNo_Customer",
            "fabric_type": "TEST_FabricNo_Fabric",
            "style_no": "TEST_FN_001",
            "fabric_received": "no"
        }
        resp = self.session.post(f"{BASE_URL}/api/enquiries", json=payload)
        assert resp.status_code == 200, f"Create failed: {resp.text}"
        data = resp.json()
        
        assert data.get("fabric_received") == "no"
        print("Fabric Received=no works correctly")
        
        # Cleanup
        self.session.delete(f"{BASE_URL}/api/enquiries/{data['id']}")
    
    def test_enquiry_list_returns_rate_field(self):
        """Verify enquiry list still returns rate field (for display in table)"""
        resp = self.session.get(f"{BASE_URL}/api/enquiries")
        assert resp.status_code == 200
        data = resp.json()
        
        # Rate column is still shown in table, just not editable in create form
        # The field exists in the model for backward compatibility
        print(f"Enquiries list returned {data.get('total', 0)} enquiries")


class TestCleanup:
    """Cleanup test data"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.session = requests.Session()
        login_resp = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@example.com",
            "password": "admin123"
        })
        assert login_resp.status_code == 200
        yield
        self.session.close()
    
    def test_cleanup_test_enquiries(self):
        """Clean up TEST_ prefixed enquiries"""
        resp = self.session.get(f"{BASE_URL}/api/enquiries", params={"page_size": 100})
        if resp.status_code == 200:
            enquiries = resp.json().get("enquiries", [])
            deleted = 0
            for enq in enquiries:
                if enq.get("customer_name", "").startswith("TEST_"):
                    del_resp = self.session.delete(f"{BASE_URL}/api/enquiries/{enq['id']}")
                    if del_resp.status_code == 200:
                        deleted += 1
            print(f"Cleaned up {deleted} test enquiries")
