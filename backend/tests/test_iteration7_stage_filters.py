"""
Iteration 7 Tests: Stage Filters and Grid Filters for Reports
Tests:
- Stage filters in /api/reports/enquiries endpoint via stage_filters JSON param
- Stage filters in /api/reports/export-excel endpoint via stage_filters JSON param
- Existing standard filters still work correctly
"""
import pytest
import requests
import json
import os
import secrets

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestStageFiltersBackend:
    """Test stage filters functionality in reports endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self, api_client, auth_token):
        """Setup test data"""
        self.client = api_client
        self.token = auth_token
        self.created_stages = []
        self.created_enquiries = []
        
        # Create test stages
        self._create_test_stages()
        # Create test enquiries with stage values
        self._create_test_enquiries()
        
        yield
        
        # Cleanup
        self._cleanup()
    
    def _create_test_stages(self):
        """Create test stages for filtering"""
        # Create a text stage
        stage1 = {
            "name": "TEST_TextStage_Iter7",
            "order": 100,
            "color": "#FF5733",
            "input_type": "text",
            "is_mandatory": False,
            "select_options": [],
            "lead_time_days": 0
        }
        res = self.client.post(f"{BASE_URL}/api/stages", json=stage1)
        if res.status_code == 200:
            self.created_stages.append(res.json())
            print(f"Created text stage: {res.json()['id']}")
        
        # Create a select stage
        stage2 = {
            "name": "TEST_SelectStage_Iter7",
            "order": 101,
            "color": "#33FF57",
            "input_type": "select",
            "is_mandatory": False,
            "select_options": ["Option A", "Option B", "Option C"],
            "lead_time_days": 0
        }
        res = self.client.post(f"{BASE_URL}/api/stages", json=stage2)
        if res.status_code == 200:
            self.created_stages.append(res.json())
            print(f"Created select stage: {res.json()['id']}")
    
    def _create_test_enquiries(self):
        """Create test enquiries with stage values"""
        if len(self.created_stages) < 2:
            print("Not enough stages created, skipping enquiry creation")
            return
        
        text_stage_id = self.created_stages[0]['id']
        select_stage_id = self.created_stages[1]['id']
        
        # Enquiry 1: Text stage = "Alpha", Select stage = "Option A"
        enq1 = {
            "customer_name": "TEST_Customer_Alpha",
            "fabric_type": "TEST_Fabric_Alpha",
            "quantity": "100",
            "style_no": "TEST_STYLE_001",
            "department": "Sales",
            "stage_values": {
                text_stage_id: {"value": "Alpha Value"},
                select_stage_id: {"value": "Option A"}
            }
        }
        res = self.client.post(f"{BASE_URL}/api/enquiries", json=enq1)
        if res.status_code == 200:
            self.created_enquiries.append(res.json())
            print(f"Created enquiry 1: {res.json()['id']}")
        
        # Enquiry 2: Text stage = "Beta", Select stage = "Option B"
        enq2 = {
            "customer_name": "TEST_Customer_Beta",
            "fabric_type": "TEST_Fabric_Beta",
            "quantity": "200",
            "style_no": "TEST_STYLE_002",
            "department": "Production",
            "stage_values": {
                text_stage_id: {"value": "Beta Value"},
                select_stage_id: {"value": "Option B"}
            }
        }
        res = self.client.post(f"{BASE_URL}/api/enquiries", json=enq2)
        if res.status_code == 200:
            self.created_enquiries.append(res.json())
            print(f"Created enquiry 2: {res.json()['id']}")
        
        # Enquiry 3: Text stage = "Alpha", Select stage = "Option C"
        enq3 = {
            "customer_name": "TEST_Customer_Gamma",
            "fabric_type": "TEST_Fabric_Gamma",
            "quantity": "300",
            "style_no": "TEST_STYLE_003",
            "department": "Quality",
            "stage_values": {
                text_stage_id: {"value": "Alpha Special"},
                select_stage_id: {"value": "Option C"}
            }
        }
        res = self.client.post(f"{BASE_URL}/api/enquiries", json=enq3)
        if res.status_code == 200:
            self.created_enquiries.append(res.json())
            print(f"Created enquiry 3: {res.json()['id']}")
    
    def _cleanup(self):
        """Cleanup test data"""
        for enq in self.created_enquiries:
            try:
                self.client.delete(f"{BASE_URL}/api/enquiries/{enq['id']}")
            except:
                pass
        
        for stage in self.created_stages:
            try:
                self.client.delete(f"{BASE_URL}/api/stages/{stage['id']}")
            except:
                pass
    
    def test_reports_enquiries_without_stage_filters(self):
        """Test /api/reports/enquiries returns all enquiries without stage_filters"""
        res = self.client.get(f"{BASE_URL}/api/reports/enquiries")
        assert res.status_code == 200, f"Expected 200, got {res.status_code}"
        data = res.json()
        assert "enquiries" in data
        assert "total" in data
        print(f"Total enquiries without filter: {data['total']}")
        
        # Verify our test enquiries are in the results
        test_ids = [e['id'] for e in self.created_enquiries]
        result_ids = [e['id'] for e in data['enquiries']]
        for tid in test_ids:
            assert tid in result_ids, f"Test enquiry {tid} not found in results"
        print("All test enquiries found in unfiltered results")
    
    def test_reports_enquiries_with_text_stage_filter(self):
        """Test /api/reports/enquiries filters by text stage value"""
        if len(self.created_stages) < 1:
            pytest.skip("No test stages created")
        
        text_stage_id = self.created_stages[0]['id']
        stage_filters = json.dumps({text_stage_id: "Alpha"})
        
        res = self.client.get(f"{BASE_URL}/api/reports/enquiries", params={"stage_filters": stage_filters})
        assert res.status_code == 200, f"Expected 200, got {res.status_code}"
        data = res.json()
        
        # Should find enquiries with "Alpha" in text stage (enquiry 1 and 3)
        print(f"Filtered results for 'Alpha': {data['total']} enquiries")
        
        # Verify filtering works - all results should have "Alpha" in the stage value
        for enq in data['enquiries']:
            sv = enq.get('stage_values', {})
            stage_val = sv.get(text_stage_id, {})
            value = stage_val.get('value', '') if isinstance(stage_val, dict) else str(stage_val)
            if enq['id'] in [e['id'] for e in self.created_enquiries]:
                assert 'alpha' in value.lower(), f"Expected 'Alpha' in stage value, got: {value}"
        print("Text stage filter working correctly")
    
    def test_reports_enquiries_with_select_stage_filter(self):
        """Test /api/reports/enquiries filters by select stage value"""
        if len(self.created_stages) < 2:
            pytest.skip("Not enough test stages created")
        
        select_stage_id = self.created_stages[1]['id']
        stage_filters = json.dumps({select_stage_id: "Option B"})
        
        res = self.client.get(f"{BASE_URL}/api/reports/enquiries", params={"stage_filters": stage_filters})
        assert res.status_code == 200, f"Expected 200, got {res.status_code}"
        data = res.json()
        
        print(f"Filtered results for 'Option B': {data['total']} enquiries")
        
        # Verify only enquiry 2 matches
        test_ids = [e['id'] for e in self.created_enquiries]
        matching_test_enquiries = [e for e in data['enquiries'] if e['id'] in test_ids]
        
        for enq in matching_test_enquiries:
            sv = enq.get('stage_values', {})
            stage_val = sv.get(select_stage_id, {})
            value = stage_val.get('value', '') if isinstance(stage_val, dict) else str(stage_val)
            assert 'option b' in value.lower(), f"Expected 'Option B' in stage value, got: {value}"
        print("Select stage filter working correctly")
    
    def test_reports_enquiries_with_multiple_stage_filters(self):
        """Test /api/reports/enquiries with multiple stage filters (AND logic)"""
        if len(self.created_stages) < 2:
            pytest.skip("Not enough test stages created")
        
        text_stage_id = self.created_stages[0]['id']
        select_stage_id = self.created_stages[1]['id']
        
        # Filter for Alpha AND Option A - should only match enquiry 1
        stage_filters = json.dumps({
            text_stage_id: "Alpha",
            select_stage_id: "Option A"
        })
        
        res = self.client.get(f"{BASE_URL}/api/reports/enquiries", params={"stage_filters": stage_filters})
        assert res.status_code == 200, f"Expected 200, got {res.status_code}"
        data = res.json()
        
        print(f"Filtered results for 'Alpha' AND 'Option A': {data['total']} enquiries")
        
        # Verify only enquiry 1 matches from our test data
        test_ids = [e['id'] for e in self.created_enquiries]
        matching_test_enquiries = [e for e in data['enquiries'] if e['id'] in test_ids]
        
        # Should have exactly 1 match (enquiry 1)
        assert len(matching_test_enquiries) == 1, f"Expected 1 match, got {len(matching_test_enquiries)}"
        assert matching_test_enquiries[0]['customer_name'] == "TEST_Customer_Alpha"
        print("Multiple stage filters (AND logic) working correctly")
    
    def test_reports_enquiries_combined_with_standard_filters(self):
        """Test stage_filters combined with standard filters (department, customer_name)"""
        if len(self.created_stages) < 1:
            pytest.skip("No test stages created")
        
        text_stage_id = self.created_stages[0]['id']
        stage_filters = json.dumps({text_stage_id: "Alpha"})
        
        # Filter by stage AND department
        res = self.client.get(f"{BASE_URL}/api/reports/enquiries", params={
            "stage_filters": stage_filters,
            "department": "Sales"
        })
        assert res.status_code == 200, f"Expected 200, got {res.status_code}"
        data = res.json()
        
        print(f"Filtered results for 'Alpha' AND department='Sales': {data['total']} enquiries")
        
        # Verify results match both criteria
        test_ids = [e['id'] for e in self.created_enquiries]
        matching_test_enquiries = [e for e in data['enquiries'] if e['id'] in test_ids]
        
        for enq in matching_test_enquiries:
            assert enq['department'] == 'Sales', f"Expected department 'Sales', got: {enq['department']}"
        print("Stage filters combined with standard filters working correctly")
    
    def test_reports_enquiries_empty_stage_filter(self):
        """Test that empty stage_filters param is handled gracefully"""
        res = self.client.get(f"{BASE_URL}/api/reports/enquiries", params={"stage_filters": "{}"})
        assert res.status_code == 200, f"Expected 200, got {res.status_code}"
        print("Empty stage_filters handled correctly")
    
    def test_reports_enquiries_invalid_stage_filter_json(self):
        """Test that invalid JSON in stage_filters is handled gracefully"""
        res = self.client.get(f"{BASE_URL}/api/reports/enquiries", params={"stage_filters": "invalid json"})
        assert res.status_code == 200, f"Expected 200, got {res.status_code}"
        print("Invalid stage_filters JSON handled gracefully (no crash)")
    
    def test_export_excel_with_stage_filters(self):
        """Test /api/reports/export-excel respects stage_filters"""
        if len(self.created_stages) < 1:
            pytest.skip("No test stages created")
        
        text_stage_id = self.created_stages[0]['id']
        stage_filters = json.dumps({text_stage_id: "Alpha"})
        
        res = self.client.get(f"{BASE_URL}/api/reports/export-excel", params={"stage_filters": stage_filters})
        assert res.status_code == 200, f"Expected 200, got {res.status_code}"
        
        # Verify it returns an Excel file
        content_type = res.headers.get('Content-Type', '')
        assert 'spreadsheet' in content_type or 'excel' in content_type.lower() or 'octet-stream' in content_type, \
            f"Expected Excel content type, got: {content_type}"
        
        # Verify content disposition header
        content_disp = res.headers.get('Content-Disposition', '')
        assert 'enquiry_report.xlsx' in content_disp, f"Expected filename in header, got: {content_disp}"
        
        print("Excel export with stage_filters working correctly")
    
    def test_export_excel_with_multiple_filters(self):
        """Test /api/reports/export-excel with stage_filters and standard filters"""
        if len(self.created_stages) < 2:
            pytest.skip("Not enough test stages created")
        
        text_stage_id = self.created_stages[0]['id']
        select_stage_id = self.created_stages[1]['id']
        
        stage_filters = json.dumps({
            text_stage_id: "Alpha",
            select_stage_id: "Option A"
        })
        
        res = self.client.get(f"{BASE_URL}/api/reports/export-excel", params={
            "stage_filters": stage_filters,
            "department": "Sales"
        })
        assert res.status_code == 200, f"Expected 200, got {res.status_code}"
        print("Excel export with multiple filters working correctly")


class TestStandardFiltersStillWork:
    """Verify existing standard filters still work correctly"""
    
    def test_filter_by_customer_name(self, api_client, auth_token):
        """Test customer_name filter still works"""
        res = api_client.get(f"{BASE_URL}/api/reports/enquiries", params={"customer_name": "TEST"})
        assert res.status_code == 200
        print(f"Customer name filter returned {res.json()['total']} results")
    
    def test_filter_by_fabric_type(self, api_client, auth_token):
        """Test fabric_type filter still works"""
        res = api_client.get(f"{BASE_URL}/api/reports/enquiries", params={"fabric_type": "TEST"})
        assert res.status_code == 200
        print(f"Fabric type filter returned {res.json()['total']} results")
    
    def test_filter_by_department(self, api_client, auth_token):
        """Test department filter still works"""
        res = api_client.get(f"{BASE_URL}/api/reports/enquiries", params={"department": "Sales"})
        assert res.status_code == 200
        print(f"Department filter returned {res.json()['total']} results")
    
    def test_filter_by_style_no(self, api_client, auth_token):
        """Test style_no filter still works"""
        res = api_client.get(f"{BASE_URL}/api/reports/enquiries", params={"style_no": "TEST"})
        assert res.status_code == 200
        print(f"Style no filter returned {res.json()['total']} results")
    
    def test_filter_by_date_range(self, api_client, auth_token):
        """Test date range filters still work"""
        res = api_client.get(f"{BASE_URL}/api/reports/enquiries", params={
            "start_date": "2024-01-01T00:00:00Z",
            "end_date": "2030-12-31T23:59:59Z"
        })
        assert res.status_code == 200
        print(f"Date range filter returned {res.json()['total']} results")


class TestStagesEndpoint:
    """Test stages endpoint returns correct data for frontend filters"""
    
    def test_stages_returns_input_type(self, api_client, auth_token):
        """Test /api/stages returns input_type for each stage"""
        res = api_client.get(f"{BASE_URL}/api/stages")
        assert res.status_code == 200
        stages = res.json()
        
        for stage in stages:
            assert 'input_type' in stage, f"Stage {stage.get('name')} missing input_type"
            assert stage['input_type'] in ['text', 'date', 'select'], \
                f"Invalid input_type: {stage['input_type']}"
        print(f"All {len(stages)} stages have valid input_type")
    
    def test_stages_returns_select_options(self, api_client, auth_token):
        """Test /api/stages returns select_options for select-type stages"""
        res = api_client.get(f"{BASE_URL}/api/stages")
        assert res.status_code == 200
        stages = res.json()
        
        for stage in stages:
            if stage.get('input_type') == 'select':
                assert 'select_options' in stage, f"Select stage {stage.get('name')} missing select_options"
                assert isinstance(stage['select_options'], list), "select_options should be a list"
        print("Select stages have select_options array")


# Fixtures
@pytest.fixture
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session

@pytest.fixture
def auth_token(api_client):
    """Get authentication token via cookie"""
    response = api_client.post(f"{BASE_URL}/api/auth/login", json={
        "email": "admin@example.com",
        "password": "admin123"
    })
    if response.status_code == 200:
        # Cookies are automatically stored in session
        return True
    pytest.fail(f"Authentication failed: {response.status_code} - {response.text}")
