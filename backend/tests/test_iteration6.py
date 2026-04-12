"""
Iteration 6 Backend Tests
Tests for:
- Customer Master CRUD (GET, POST, PUT, DELETE /api/customers)
- Fabric Type Master CRUD (GET, POST, PUT, DELETE /api/fabric-types)
- Enquiry create/update with customer_name and fabric_type from masters
- fabric_received and qty_received fields
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestAuth:
    """Authentication for subsequent tests"""
    
    @pytest.fixture(scope="class")
    def session(self):
        """Create authenticated session"""
        s = requests.Session()
        s.headers.update({"Content-Type": "application/json"})
        return s
    
    @pytest.fixture(scope="class")
    def auth_session(self, session):
        """Login and return authenticated session"""
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@example.com",
            "password": "admin123"
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "email" in data
        assert data["email"] == "admin@example.com"
        print(f"Logged in as: {data['email']} (role: {data.get('role')})")
        return session


class TestCustomerMaster(TestAuth):
    """Customer Master CRUD tests"""
    
    created_customer_id = None
    
    def test_get_customers_list(self, auth_session):
        """GET /api/customers - List all customers"""
        response = auth_session.get(f"{BASE_URL}/api/customers")
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"Found {len(data)} customers")
        # Check if ABC Textiles exists (from previous testing)
        customer_names = [c.get('name') for c in data]
        print(f"Customer names: {customer_names}")
    
    def test_create_customer(self, auth_session):
        """POST /api/customers - Create new customer"""
        payload = {"name": "TEST_Customer_Iter6"}
        response = auth_session.post(f"{BASE_URL}/api/customers", json=payload)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert "id" in data, "Response should contain id"
        assert data["name"] == payload["name"], "Name should match"
        TestCustomerMaster.created_customer_id = data["id"]
        print(f"Created customer: {data['name']} (id: {data['id']})")
    
    def test_create_duplicate_customer_fails(self, auth_session):
        """POST /api/customers - Duplicate name should fail"""
        payload = {"name": "TEST_Customer_Iter6"}
        response = auth_session.post(f"{BASE_URL}/api/customers", json=payload)
        assert response.status_code == 400, f"Should fail with 400, got {response.status_code}"
        assert "already exists" in response.json().get("detail", "").lower()
        print("Duplicate customer correctly rejected")
    
    def test_get_customer_after_create(self, auth_session):
        """GET /api/customers - Verify created customer appears in list"""
        response = auth_session.get(f"{BASE_URL}/api/customers")
        assert response.status_code == 200
        data = response.json()
        customer_names = [c.get('name') for c in data]
        assert "TEST_Customer_Iter6" in customer_names, "Created customer should be in list"
        print("Created customer verified in list")
    
    def test_update_customer(self, auth_session):
        """PUT /api/customers/{id} - Update customer name"""
        if not TestCustomerMaster.created_customer_id:
            pytest.skip("No customer created to update")
        
        payload = {"name": "TEST_Customer_Iter6_Updated"}
        response = auth_session.put(
            f"{BASE_URL}/api/customers/{TestCustomerMaster.created_customer_id}",
            json=payload
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert data["name"] == payload["name"], "Name should be updated"
        print(f"Updated customer name to: {data['name']}")
    
    def test_delete_customer(self, auth_session):
        """DELETE /api/customers/{id} - Delete customer"""
        if not TestCustomerMaster.created_customer_id:
            pytest.skip("No customer created to delete")
        
        response = auth_session.delete(
            f"{BASE_URL}/api/customers/{TestCustomerMaster.created_customer_id}"
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        print(f"Deleted customer: {TestCustomerMaster.created_customer_id}")
        
        # Verify deletion
        response = auth_session.get(f"{BASE_URL}/api/customers")
        data = response.json()
        customer_ids = [c.get('id') for c in data]
        assert TestCustomerMaster.created_customer_id not in customer_ids, "Deleted customer should not be in list"
        print("Customer deletion verified")


class TestFabricTypeMaster(TestAuth):
    """Fabric Type Master CRUD tests"""
    
    created_fabric_id = None
    
    def test_get_fabric_types_list(self, auth_session):
        """GET /api/fabric-types - List all fabric types"""
        response = auth_session.get(f"{BASE_URL}/api/fabric-types")
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"Found {len(data)} fabric types")
        for f in data:
            print(f"  - {f.get('name')} (GSM: {f.get('gsm')}, Width: {f.get('width')})")
    
    def test_create_fabric_type_with_all_fields(self, auth_session):
        """POST /api/fabric-types - Create fabric type with all fields"""
        payload = {
            "name": "TEST_Fabric_Iter6",
            "gsm": "200",
            "width": "60 inches",
            "composition": "80% Cotton 20% Polyester",
            "construction": "Twill Weave"
        }
        response = auth_session.post(f"{BASE_URL}/api/fabric-types", json=payload)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert "id" in data, "Response should contain id"
        assert data["name"] == payload["name"]
        assert data["gsm"] == payload["gsm"]
        assert data["width"] == payload["width"]
        assert data["composition"] == payload["composition"]
        assert data["construction"] == payload["construction"]
        TestFabricTypeMaster.created_fabric_id = data["id"]
        print(f"Created fabric type: {data['name']} (id: {data['id']})")
    
    def test_create_fabric_type_name_only(self, auth_session):
        """POST /api/fabric-types - Create with name only (other fields optional)"""
        payload = {"name": "TEST_Fabric_NameOnly"}
        response = auth_session.post(f"{BASE_URL}/api/fabric-types", json=payload)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert data["name"] == payload["name"]
        # Optional fields should be empty strings
        assert data.get("gsm", "") == ""
        assert data.get("width", "") == ""
        print(f"Created fabric type with name only: {data['name']}")
        # Clean up
        auth_session.delete(f"{BASE_URL}/api/fabric-types/{data['id']}")
    
    def test_create_duplicate_fabric_type_fails(self, auth_session):
        """POST /api/fabric-types - Duplicate name should fail"""
        payload = {"name": "TEST_Fabric_Iter6"}
        response = auth_session.post(f"{BASE_URL}/api/fabric-types", json=payload)
        assert response.status_code == 400, f"Should fail with 400, got {response.status_code}"
        assert "already exists" in response.json().get("detail", "").lower()
        print("Duplicate fabric type correctly rejected")
    
    def test_update_fabric_type(self, auth_session):
        """PUT /api/fabric-types/{id} - Update fabric type"""
        if not TestFabricTypeMaster.created_fabric_id:
            pytest.skip("No fabric type created to update")
        
        payload = {
            "name": "TEST_Fabric_Iter6_Updated",
            "gsm": "220",
            "composition": "100% Cotton"
        }
        response = auth_session.put(
            f"{BASE_URL}/api/fabric-types/{TestFabricTypeMaster.created_fabric_id}",
            json=payload
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert data["name"] == payload["name"]
        assert data["gsm"] == payload["gsm"]
        assert data["composition"] == payload["composition"]
        # Width and construction should remain unchanged
        assert data["width"] == "60 inches"
        assert data["construction"] == "Twill Weave"
        print(f"Updated fabric type: {data['name']}")
    
    def test_delete_fabric_type(self, auth_session):
        """DELETE /api/fabric-types/{id} - Delete fabric type"""
        if not TestFabricTypeMaster.created_fabric_id:
            pytest.skip("No fabric type created to delete")
        
        response = auth_session.delete(
            f"{BASE_URL}/api/fabric-types/{TestFabricTypeMaster.created_fabric_id}"
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        print(f"Deleted fabric type: {TestFabricTypeMaster.created_fabric_id}")
        
        # Verify deletion
        response = auth_session.get(f"{BASE_URL}/api/fabric-types")
        data = response.json()
        fabric_ids = [f.get('id') for f in data]
        assert TestFabricTypeMaster.created_fabric_id not in fabric_ids
        print("Fabric type deletion verified")


class TestEnquiryWithMasters(TestAuth):
    """Test enquiry creation with Customer and Fabric Type from masters"""
    
    test_customer_id = None
    test_fabric_id = None
    test_enquiry_id = None
    
    def test_setup_test_data(self, auth_session):
        """Create test customer and fabric type for enquiry tests"""
        # Create customer
        cust_resp = auth_session.post(f"{BASE_URL}/api/customers", json={"name": "TEST_EnqCustomer"})
        if cust_resp.status_code == 200:
            TestEnquiryWithMasters.test_customer_id = cust_resp.json()["id"]
        elif cust_resp.status_code == 400:
            # Already exists, get from list
            custs = auth_session.get(f"{BASE_URL}/api/customers").json()
            for c in custs:
                if c["name"] == "TEST_EnqCustomer":
                    TestEnquiryWithMasters.test_customer_id = c["id"]
                    break
        
        # Create fabric type
        fab_resp = auth_session.post(f"{BASE_URL}/api/fabric-types", json={
            "name": "TEST_EnqFabric",
            "gsm": "180",
            "width": "58 inches"
        })
        if fab_resp.status_code == 200:
            TestEnquiryWithMasters.test_fabric_id = fab_resp.json()["id"]
        elif fab_resp.status_code == 400:
            # Already exists, get from list
            fabs = auth_session.get(f"{BASE_URL}/api/fabric-types").json()
            for f in fabs:
                if f["name"] == "TEST_EnqFabric":
                    TestEnquiryWithMasters.test_fabric_id = f["id"]
                    break
        
        print(f"Test data setup: customer_id={TestEnquiryWithMasters.test_customer_id}, fabric_id={TestEnquiryWithMasters.test_fabric_id}")
    
    def test_create_enquiry_with_fabric_received_no(self, auth_session):
        """POST /api/enquiries - Create enquiry with fabric_received='no'"""
        payload = {
            "customer_name": "TEST_EnqCustomer",
            "fabric_type": "TEST_EnqFabric",
            "quantity": "500 meters",
            "style_no": "TEST-STYLE-001",
            "fabric_received": "no",
            "qty_received": ""
        }
        response = auth_session.post(f"{BASE_URL}/api/enquiries", json=payload)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert data["customer_name"] == payload["customer_name"]
        assert data["fabric_type"] == payload["fabric_type"]
        assert data["fabric_received"] == "no"
        assert data["qty_received"] == ""
        TestEnquiryWithMasters.test_enquiry_id = data["id"]
        print(f"Created enquiry with fabric_received='no': {data['id']}")
    
    def test_update_enquiry_fabric_received_yes(self, auth_session):
        """PUT /api/enquiries/{id} - Update to fabric_received='yes' with qty_received"""
        if not TestEnquiryWithMasters.test_enquiry_id:
            pytest.skip("No enquiry created")
        
        payload = {
            "fabric_received": "yes",
            "qty_received": "450 meters"
        }
        response = auth_session.put(
            f"{BASE_URL}/api/enquiries/{TestEnquiryWithMasters.test_enquiry_id}",
            json=payload
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert data["fabric_received"] == "yes"
        assert data["qty_received"] == "450 meters"
        print(f"Updated enquiry fabric_received='yes', qty_received='450 meters'")
    
    def test_get_enquiry_verify_fields(self, auth_session):
        """GET /api/enquiries/{id} - Verify all fields"""
        if not TestEnquiryWithMasters.test_enquiry_id:
            pytest.skip("No enquiry created")
        
        response = auth_session.get(f"{BASE_URL}/api/enquiries/{TestEnquiryWithMasters.test_enquiry_id}")
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert data["customer_name"] == "TEST_EnqCustomer"
        assert data["fabric_type"] == "TEST_EnqFabric"
        assert data["fabric_received"] == "yes"
        assert data["qty_received"] == "450 meters"
        print(f"Verified enquiry fields: customer={data['customer_name']}, fabric={data['fabric_type']}, fabric_received={data['fabric_received']}, qty_received={data['qty_received']}")
    
    def test_cleanup_test_data(self, auth_session):
        """Clean up test data"""
        # Delete enquiry
        if TestEnquiryWithMasters.test_enquiry_id:
            auth_session.delete(f"{BASE_URL}/api/enquiries/{TestEnquiryWithMasters.test_enquiry_id}")
            print(f"Deleted test enquiry: {TestEnquiryWithMasters.test_enquiry_id}")
        
        # Delete customer
        if TestEnquiryWithMasters.test_customer_id:
            auth_session.delete(f"{BASE_URL}/api/customers/{TestEnquiryWithMasters.test_customer_id}")
            print(f"Deleted test customer: {TestEnquiryWithMasters.test_customer_id}")
        
        # Delete fabric type
        if TestEnquiryWithMasters.test_fabric_id:
            auth_session.delete(f"{BASE_URL}/api/fabric-types/{TestEnquiryWithMasters.test_fabric_id}")
            print(f"Deleted test fabric type: {TestEnquiryWithMasters.test_fabric_id}")


class TestExcelExportColumns(TestAuth):
    """Test Excel export includes new columns"""
    
    def test_excel_export_endpoint(self, auth_session):
        """GET /api/reports/export-excel - Verify endpoint works"""
        response = auth_session.get(f"{BASE_URL}/api/reports/export-excel")
        assert response.status_code == 200, f"Failed: {response.text}"
        assert "spreadsheetml" in response.headers.get("Content-Type", "")
        print("Excel export endpoint working")
        # Note: Full column verification would require parsing the Excel file


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
