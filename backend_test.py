import requests
import sys
import json
from datetime import datetime

class FabricEnquiryAPITester:
    def __init__(self, base_url="https://enquiry-stage-view.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.session = requests.Session()
        self.session.headers.update({'Content-Type': 'application/json'})
        self.tests_run = 0
        self.tests_passed = 0
        self.user_id = None
        self.stage_id = None
        self.date_stage_id = None
        self.select_stage_id = None
        self.enquiry_id = None

    def run_test(self, name, method, endpoint, expected_status, data=None, params=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        
        try:
            if method == 'GET':
                response = self.session.get(url, params=params)
            elif method == 'POST':
                response = self.session.post(url, json=data)
            elif method == 'PUT':
                response = self.session.put(url, json=data)
            elif method == 'DELETE':
                response = self.session.delete(url)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    return success, response.json()
                except:
                    return success, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    print(f"   Response: {response.json()}")
                except:
                    print(f"   Response: {response.text}")
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_login(self):
        """Test admin login"""
        success, response = self.run_test(
            "Admin Login",
            "POST",
            "auth/login",
            200,
            data={"email": "admin@example.com", "password": "admin123"}
        )
        if success:
            print(f"   Logged in as: {response.get('name')} ({response.get('role')})")
        return success

    def test_auth_me(self):
        """Test getting current user"""
        success, response = self.run_test(
            "Get Current User",
            "GET",
            "auth/me",
            200
        )
        return success

    def test_dashboard(self):
        """Test dashboard endpoint"""
        success, response = self.run_test(
            "Dashboard Data",
            "GET",
            "dashboard",
            200
        )
        if success:
            print(f"   Total enquiries: {response.get('total_enquiries', 0)}")
            print(f"   Total users: {response.get('total_users', 0)}")
        return success

    def test_create_stage(self):
        """Test creating a stage with enhanced fields"""
        success, response = self.run_test(
            "Create Stage (Text Type)",
            "POST",
            "stages",
            200,
            data={
                "name": "Test Text Stage",
                "order": 1,
                "color": "#3B82F6",
                "description": "Test stage for API testing",
                "input_type": "text",
                "is_mandatory": False,
                "select_options": []
            }
        )
        if success:
            self.stage_id = response.get('id')
            print(f"   Created stage ID: {self.stage_id}")
        return success

    def test_create_date_stage(self):
        """Test creating a date stage"""
        success, response = self.run_test(
            "Create Stage (Date Type)",
            "POST",
            "stages",
            200,
            data={
                "name": "Test Date Stage",
                "order": 2,
                "color": "#EF4444",
                "description": "Date stage for testing",
                "input_type": "date",
                "is_mandatory": True,
                "select_options": []
            }
        )
        if success:
            self.date_stage_id = response.get('id')
            print(f"   Created date stage ID: {self.date_stage_id}")
        return success

    def test_create_select_stage(self):
        """Test creating a select stage"""
        success, response = self.run_test(
            "Create Stage (Select Type)",
            "POST",
            "stages",
            200,
            data={
                "name": "Test Select Stage",
                "order": 3,
                "color": "#22C55E",
                "description": "Select stage for testing",
                "input_type": "select",
                "is_mandatory": True,
                "select_options": ["APPROVED", "PENDING", "REJECTED"]
            }
        )
        if success:
            self.select_stage_id = response.get('id')
            print(f"   Created select stage ID: {self.select_stage_id}")
        return success

    def test_get_stages(self):
        """Test getting all stages"""
        success, response = self.run_test(
            "Get Stages",
            "GET",
            "stages",
            200
        )
        if success:
            print(f"   Found {len(response)} stages")
        return success

    def test_create_user(self):
        """Test creating a user"""
        success, response = self.run_test(
            "Create User",
            "POST",
            "users",
            200,
            data={
                "email": f"test_user_{datetime.now().strftime('%H%M%S')}@example.com",
                "password": "testpass123",
                "name": "Test User",
                "role": "sales",
                "department": "Sales"
            }
        )
        if success:
            self.user_id = response.get('_id')
            print(f"   Created user ID: {self.user_id}")
        return success

    def test_get_users(self):
        """Test getting all users"""
        success, response = self.run_test(
            "Get Users",
            "GET",
            "users",
            200
        )
        if success:
            print(f"   Found {len(response)} users")
        return success

    def test_create_enquiry(self):
        """Test creating an enquiry with enhanced fields"""
        stage_values = {}
        if self.stage_id:
            stage_values[self.stage_id] = {"value": "Test text value"}
        if self.date_stage_id:
            stage_values[self.date_stage_id] = {"value": "2024-01-15"}
        if self.select_stage_id:
            stage_values[self.select_stage_id] = {"value": "APPROVED"}
            
        success, response = self.run_test(
            "Create Enquiry",
            "POST",
            "enquiries",
            200,
            data={
                "customer_name": "Test Customer",
                "fabric_type": "Cotton",
                "quantity": "100 meters",
                "style_no": "STY001",
                "assigned_to": self.user_id or "",
                "department": "Sales",
                "notes": "Test enquiry for API testing",
                "rate": "150.00",
                "po_no": "PO123",
                "po_del_date": "2024-02-15",
                "stage_values": stage_values
            }
        )
        if success:
            self.enquiry_id = response.get('id')
            print(f"   Created enquiry ID: {self.enquiry_id}")
            print(f"   Stage values: {len(stage_values)} stages set")
        return success

    def test_get_enquiries(self):
        """Test getting all enquiries"""
        success, response = self.run_test(
            "Get Enquiries",
            "GET",
            "enquiries",
            200
        )
        if success:
            print(f"   Found {len(response)} enquiries")
        return success

    def test_get_enquiry_detail(self):
        """Test getting enquiry details"""
        if not self.enquiry_id:
            print("⚠️  Skipping enquiry detail test - no enquiry ID")
            return True
            
        success, response = self.run_test(
            "Get Enquiry Detail",
            "GET",
            f"enquiries/{self.enquiry_id}",
            200
        )
        if success:
            print(f"   Customer: {response.get('customer_name')}")
            print(f"   History entries: {len(response.get('history', []))}")
        return success

    def test_update_enquiry(self):
        """Test updating an enquiry with stage values"""
        if not self.enquiry_id:
            print("⚠️  Skipping enquiry update test - no enquiry ID")
            return True
            
        stage_values = {}
        if self.select_stage_id:
            stage_values[self.select_stage_id] = {"value": "PENDING"}
            
        success, response = self.run_test(
            "Update Enquiry",
            "PUT",
            f"enquiries/{self.enquiry_id}",
            200,
            data={
                "notes": "Updated notes for testing",
                "rate": "175.00",
                "stage_values": stage_values
            }
        )
        if success:
            print(f"   Updated stage values: {len(stage_values)} stages")
        return success

    def test_reports_enquiries_with_filters(self):
        """Test enquiries report with filters"""
        success, response = self.run_test(
            "Enquiries Report with Filters",
            "GET",
            "reports/enquiries",
            200,
            params={
                "customer_name": "Test",
                "fabric_type": "Cotton",
                "department": "Sales"
            }
        )
        if success:
            print(f"   Filtered results: {response.get('total', 0)}")
        return success

    def test_excel_export(self):
        """Test Excel export functionality"""
        success, response = self.run_test(
            "Excel Export",
            "GET",
            "reports/export-excel",
            200,
            params={"department": "Sales"}
        )
        if success:
            print(f"   Excel export successful")
        return success

    def test_reports_stage_summary(self):
        """Test stage summary report"""
        success, response = self.run_test(
            "Stage Summary Report",
            "GET",
            "reports/stage-summary",
            200
        )
        if success:
            print(f"   Stages in summary: {len(response)}")
        return success

    def test_reports_user_performance(self):
        """Test user performance report"""
        success, response = self.run_test(
            "User Performance Report",
            "GET",
            "reports/user-performance",
            200
        )
        if success:
            print(f"   Users in performance report: {len(response)}")
        return success

    def test_reports_department(self):
        """Test department report"""
        success, response = self.run_test(
            "Department Report",
            "GET",
            "reports/department",
            200
        )
        if success:
            print(f"   Departments in report: {len(response)}")
        return success

    def test_logout(self):
        """Test logout"""
        success, response = self.run_test(
            "Logout",
            "POST",
            "auth/logout",
            200
        )
        return success

def main():
    print("🚀 Starting Fabric Enquiry API Tests")
    print("=" * 50)
    
    tester = FabricEnquiryAPITester()
    
    # Authentication tests
    if not tester.test_login():
        print("❌ Login failed, stopping tests")
        return 1
    
    if not tester.test_auth_me():
        print("❌ Auth verification failed")
        return 1
    
    # Dashboard test
    tester.test_dashboard()
    
    # Stage management tests
    tester.test_create_stage()
    tester.test_create_date_stage()
    tester.test_create_select_stage()
    tester.test_get_stages()
    
    # User management tests
    tester.test_create_user()
    tester.test_get_users()
    
    # Enquiry management tests
    tester.test_create_enquiry()
    tester.test_get_enquiries()
    tester.test_get_enquiry_detail()
    tester.test_update_enquiry()
    
    # Reports tests
    tester.test_reports_enquiries_with_filters()
    tester.test_excel_export()
    tester.test_reports_stage_summary()
    tester.test_reports_user_performance()
    tester.test_reports_department()
    
    # Logout test
    tester.test_logout()
    
    # Print results
    print("\n" + "=" * 50)
    print(f"📊 Test Results: {tester.tests_passed}/{tester.tests_run} passed")
    success_rate = (tester.tests_passed / tester.tests_run * 100) if tester.tests_run > 0 else 0
    print(f"📈 Success Rate: {success_rate:.1f}%")
    
    if success_rate >= 90:
        print("🎉 Excellent! Backend APIs are working well")
    elif success_rate >= 70:
        print("⚠️  Good, but some issues need attention")
    else:
        print("❌ Multiple issues found, needs investigation")
    
    return 0 if tester.tests_passed == tester.tests_run else 1

if __name__ == "__main__":
    sys.exit(main())