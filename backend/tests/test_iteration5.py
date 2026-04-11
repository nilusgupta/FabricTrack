"""
Backend API Tests - Iteration 5
Testing: Department Master CRUD, Stage-level permissions, Excel export columns, assigned_users field
"""
import pytest
import requests
import os
import io

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://enquiry-stage-view.preview.emergentagent.com')

class TestAuth:
    """Authentication tests"""
    
    def test_admin_login(self):
        """Test admin login with correct credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@example.com",
            "password": "admin123"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == "admin@example.com"
        assert data["role"] == "admin"
        assert "_id" in data

class TestDepartmentCRUD:
    """Department Master CRUD tests"""
    
    @pytest.fixture
    def admin_session(self):
        session = requests.Session()
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@example.com",
            "password": "admin123"
        })
        assert response.status_code == 200
        return session
    
    def test_list_departments(self, admin_session):
        """Test listing departments - should include seeded departments"""
        response = admin_session.get(f"{BASE_URL}/api/departments")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        # Check seeded departments exist
        dept_names = [d["name"] for d in data]
        expected_depts = ["Sales", "Production", "Quality", "Admin", "Design", "Logistics"]
        for dept in expected_depts:
            assert dept in dept_names, f"Seeded department '{dept}' not found"
    
    def test_create_department(self, admin_session):
        """Test creating a new department"""
        response = admin_session.post(f"{BASE_URL}/api/departments", json={
            "name": "TEST_NewDept",
            "description": "Test department"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "TEST_NewDept"
        assert data["description"] == "Test department"
        assert "id" in data
        # Cleanup
        admin_session.delete(f"{BASE_URL}/api/departments/{data['id']}")
    
    def test_update_department(self, admin_session):
        """Test updating a department"""
        # Create
        create_res = admin_session.post(f"{BASE_URL}/api/departments", json={
            "name": "TEST_UpdateDept",
            "description": "Original"
        })
        dept_id = create_res.json()["id"]
        # Update
        response = admin_session.put(f"{BASE_URL}/api/departments/{dept_id}", json={
            "description": "Updated description"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["description"] == "Updated description"
        # Cleanup
        admin_session.delete(f"{BASE_URL}/api/departments/{dept_id}")
    
    def test_delete_department(self, admin_session):
        """Test deleting a department"""
        # Create
        create_res = admin_session.post(f"{BASE_URL}/api/departments", json={
            "name": "TEST_DeleteDept",
            "description": "To be deleted"
        })
        dept_id = create_res.json()["id"]
        # Delete
        response = admin_session.delete(f"{BASE_URL}/api/departments/{dept_id}")
        assert response.status_code == 200
        # Verify deleted
        get_res = admin_session.get(f"{BASE_URL}/api/departments")
        dept_names = [d["name"] for d in get_res.json()]
        assert "TEST_DeleteDept" not in dept_names

class TestStagePermissions:
    """Stage-level permission tests"""
    
    @pytest.fixture
    def admin_session(self):
        session = requests.Session()
        session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@example.com",
            "password": "admin123"
        })
        return session
    
    @pytest.fixture
    def user_session(self):
        session = requests.Session()
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test_user_144530@example.com",
            "password": "testpass123"
        })
        if response.status_code != 200:
            pytest.skip("Test user not available")
        return session
    
    def test_stage_has_assigned_users_field(self, admin_session):
        """Test that stages API returns assigned_users field"""
        # Create a stage with assigned_users
        response = admin_session.post(f"{BASE_URL}/api/stages", json={
            "name": "TEST_AssignedUsersStage",
            "order": 999,
            "color": "#FF5733",
            "input_type": "text",
            "assigned_users": ["test_user_id"]
        })
        assert response.status_code == 200
        data = response.json()
        assert "assigned_users" in data
        assert data["assigned_users"] == ["test_user_id"]
        # Cleanup
        admin_session.delete(f"{BASE_URL}/api/stages/{data['id']}")
    
    def test_comment_permission_denied(self, admin_session, user_session):
        """Test that non-assigned user cannot comment on restricted stage"""
        # Get user ID
        me_res = user_session.get(f"{BASE_URL}/api/auth/me")
        user_id = me_res.json()["_id"]
        
        # Create stage assigned to admin only (not the test user)
        stage_res = admin_session.post(f"{BASE_URL}/api/stages", json={
            "name": "TEST_RestrictedStage",
            "order": 998,
            "color": "#FF0000",
            "input_type": "text",
            "assigned_users": ["69d90b2dde4fac0d6b3d87e9"]  # Admin ID
        })
        stage_id = stage_res.json()["id"]
        
        # Get an enquiry
        enq_res = admin_session.get(f"{BASE_URL}/api/enquiries")
        if not enq_res.json():
            admin_session.delete(f"{BASE_URL}/api/stages/{stage_id}")
            pytest.skip("No enquiries available")
        enquiry_id = enq_res.json()[0]["id"]
        
        # Try to comment as non-assigned user
        response = user_session.post(f"{BASE_URL}/api/enquiries/{enquiry_id}/comments", json={
            "stage_id": stage_id,
            "comment": "Unauthorized comment"
        })
        assert response.status_code == 403
        assert "not assigned" in response.json()["detail"].lower()
        
        # Cleanup
        admin_session.delete(f"{BASE_URL}/api/stages/{stage_id}")
    
    def test_comment_permission_allowed(self, admin_session, user_session):
        """Test that assigned user can comment on their stage"""
        # Get user ID
        me_res = user_session.get(f"{BASE_URL}/api/auth/me")
        user_id = me_res.json()["_id"]
        
        # Create stage assigned to test user
        stage_res = admin_session.post(f"{BASE_URL}/api/stages", json={
            "name": "TEST_AllowedStage",
            "order": 997,
            "color": "#00FF00",
            "input_type": "text",
            "assigned_users": [user_id]
        })
        stage_id = stage_res.json()["id"]
        
        # Get an enquiry
        enq_res = admin_session.get(f"{BASE_URL}/api/enquiries")
        if not enq_res.json():
            admin_session.delete(f"{BASE_URL}/api/stages/{stage_id}")
            pytest.skip("No enquiries available")
        enquiry_id = enq_res.json()[0]["id"]
        
        # Comment as assigned user
        response = user_session.post(f"{BASE_URL}/api/enquiries/{enquiry_id}/comments", json={
            "stage_id": stage_id,
            "comment": "Authorized comment"
        })
        assert response.status_code == 200
        
        # Cleanup
        admin_session.delete(f"{BASE_URL}/api/stages/{stage_id}")

class TestExcelExport:
    """Excel export tests"""
    
    @pytest.fixture
    def admin_session(self):
        session = requests.Session()
        session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@example.com",
            "password": "admin123"
        })
        return session
    
    def test_excel_export_has_new_columns(self, admin_session):
        """Test that Excel export includes Created By, Department, Created Date columns"""
        import openpyxl
        
        response = admin_session.get(f"{BASE_URL}/api/reports/export-excel")
        assert response.status_code == 200
        assert "spreadsheetml" in response.headers.get("Content-Type", "")
        
        # Parse Excel
        wb = openpyxl.load_workbook(io.BytesIO(response.content))
        ws = wb.active
        headers = [cell.value for cell in ws[1]]
        
        # Check new columns exist
        assert "Created By" in headers, "Missing 'Created By' column"
        assert "Department" in headers, "Missing 'Department' column"
        assert "Created Date" in headers, "Missing 'Created Date' column"
        
        # Check old column removed
        assert "Assigned To" not in headers, "'Assigned To' column should be removed"

class TestEnquiryNoAssignedTo:
    """Test that Assigned To field is removed from enquiry"""
    
    @pytest.fixture
    def admin_session(self):
        session = requests.Session()
        session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@example.com",
            "password": "admin123"
        })
        return session
    
    def test_enquiry_creation_without_assigned_to(self, admin_session):
        """Test creating enquiry without assigned_to field"""
        response = admin_session.post(f"{BASE_URL}/api/enquiries", json={
            "customer_name": "TEST_Customer",
            "fabric_type": "Cotton",
            "quantity": "100",
            "department": "Sales"
        })
        assert response.status_code == 200
        data = response.json()
        # assigned_to should not be required
        assert "customer_name" in data
        # Cleanup
        admin_session.delete(f"{BASE_URL}/api/enquiries/{data['id']}")

if __name__ == "__main__":
    pytest.main([__file__, "-v"])
