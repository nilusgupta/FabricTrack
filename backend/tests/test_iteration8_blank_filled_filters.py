"""
Iteration 8: Blank/Filled Filter Tests
Tests for the new Blank/Filled filtering capability on stage columns in Reports.

Features tested:
- Backend /api/reports/enquiries handles __blank__ stage filter
- Backend /api/reports/enquiries handles __filled__ stage filter
- Backend /api/reports/export-excel handles __blank__ and __filled__ stage filters
- Existing text-based stage filters still work
"""

import pytest
import requests
import os
import json

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestBlankFilledFilters:
    """Tests for Blank/Filled stage filter functionality"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup: Login and get auth cookies"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@example.com",
            "password": "admin123"
        })
        assert login_response.status_code == 200, f"Login failed: {login_response.text}"
        print(f"Login successful")
        
        # Get stages to find a stage ID for testing
        stages_response = self.session.get(f"{BASE_URL}/api/stages")
        assert stages_response.status_code == 200
        self.stages = stages_response.json()
        print(f"Found {len(self.stages)} stages")
        
        # Use the first stage (Strike Off Receipt Date) for testing
        if self.stages:
            self.test_stage_id = self.stages[0]['id']
            self.test_stage_name = self.stages[0]['name']
            print(f"Using stage: {self.test_stage_name} (ID: {self.test_stage_id})")
        
        yield
        
        # Cleanup: Logout
        self.session.post(f"{BASE_URL}/api/auth/logout")
    
    def test_reports_enquiries_blank_filter(self):
        """Test /api/reports/enquiries with __blank__ stage filter"""
        # Get all enquiries first
        all_response = self.session.get(f"{BASE_URL}/api/reports/enquiries")
        assert all_response.status_code == 200
        all_data = all_response.json()
        total_count = all_data['total']
        print(f"Total enquiries: {total_count}")
        
        # Apply __blank__ filter for the test stage
        stage_filters = json.dumps({self.test_stage_id: "__blank__"})
        blank_response = self.session.get(
            f"{BASE_URL}/api/reports/enquiries",
            params={"stage_filters": stage_filters}
        )
        assert blank_response.status_code == 200
        blank_data = blank_response.json()
        blank_count = blank_data['total']
        print(f"Enquiries with {self.test_stage_name} blank: {blank_count}")
        
        # Verify all returned enquiries have blank/empty value for the stage
        for enq in blank_data['enquiries']:
            stage_values = enq.get('stage_values', {})
            stage_val = stage_values.get(self.test_stage_id, {})
            value = stage_val.get('value', '') if isinstance(stage_val, dict) else str(stage_val) if stage_val else ''
            assert value == '', f"Expected blank value but got: {value}"
        
        print(f"SUCCESS: __blank__ filter returns only enquiries with empty stage values")
        return blank_count
    
    def test_reports_enquiries_filled_filter(self):
        """Test /api/reports/enquiries with __filled__ stage filter"""
        # Get all enquiries first
        all_response = self.session.get(f"{BASE_URL}/api/reports/enquiries")
        assert all_response.status_code == 200
        all_data = all_response.json()
        total_count = all_data['total']
        
        # Apply __filled__ filter for the test stage
        stage_filters = json.dumps({self.test_stage_id: "__filled__"})
        filled_response = self.session.get(
            f"{BASE_URL}/api/reports/enquiries",
            params={"stage_filters": stage_filters}
        )
        assert filled_response.status_code == 200
        filled_data = filled_response.json()
        filled_count = filled_data['total']
        print(f"Enquiries with {self.test_stage_name} filled: {filled_count}")
        
        # Verify all returned enquiries have non-empty value for the stage
        for enq in filled_data['enquiries']:
            stage_values = enq.get('stage_values', {})
            stage_val = stage_values.get(self.test_stage_id, {})
            value = stage_val.get('value', '') if isinstance(stage_val, dict) else str(stage_val) if stage_val else ''
            assert value != '', f"Expected filled value but got empty"
        
        print(f"SUCCESS: __filled__ filter returns only enquiries with non-empty stage values")
        return filled_count
    
    def test_blank_plus_filled_equals_total(self):
        """Test that blank + filled counts equal total"""
        # Get all enquiries
        all_response = self.session.get(f"{BASE_URL}/api/reports/enquiries")
        assert all_response.status_code == 200
        total_count = all_response.json()['total']
        
        # Get blank count
        blank_filters = json.dumps({self.test_stage_id: "__blank__"})
        blank_response = self.session.get(
            f"{BASE_URL}/api/reports/enquiries",
            params={"stage_filters": blank_filters}
        )
        blank_count = blank_response.json()['total']
        
        # Get filled count
        filled_filters = json.dumps({self.test_stage_id: "__filled__"})
        filled_response = self.session.get(
            f"{BASE_URL}/api/reports/enquiries",
            params={"stage_filters": filled_filters}
        )
        filled_count = filled_response.json()['total']
        
        print(f"Total: {total_count}, Blank: {blank_count}, Filled: {filled_count}")
        assert blank_count + filled_count == total_count, \
            f"Blank ({blank_count}) + Filled ({filled_count}) != Total ({total_count})"
        
        print(f"SUCCESS: Blank + Filled = Total ({blank_count} + {filled_count} = {total_count})")
    
    def test_text_filter_still_works(self):
        """Test that existing text-based stage filters still work"""
        # Apply a text filter (regex search)
        stage_filters = json.dumps({self.test_stage_id: "2026"})
        response = self.session.get(
            f"{BASE_URL}/api/reports/enquiries",
            params={"stage_filters": stage_filters}
        )
        assert response.status_code == 200
        data = response.json()
        print(f"Enquiries matching '2026' in {self.test_stage_name}: {data['total']}")
        
        # Verify all returned enquiries contain '2026' in the stage value
        for enq in data['enquiries']:
            stage_values = enq.get('stage_values', {})
            stage_val = stage_values.get(self.test_stage_id, {})
            value = stage_val.get('value', '') if isinstance(stage_val, dict) else str(stage_val) if stage_val else ''
            assert '2026' in value.lower() or '2026' in str(value), f"Expected '2026' in value but got: {value}"
        
        print(f"SUCCESS: Text-based stage filter still works")
    
    def test_export_excel_blank_filter(self):
        """Test /api/reports/export-excel with __blank__ stage filter"""
        stage_filters = json.dumps({self.test_stage_id: "__blank__"})
        response = self.session.get(
            f"{BASE_URL}/api/reports/export-excel",
            params={"stage_filters": stage_filters}
        )
        assert response.status_code == 200
        assert 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' in response.headers.get('Content-Type', '')
        assert len(response.content) > 0
        print(f"SUCCESS: Export Excel with __blank__ filter works (size: {len(response.content)} bytes)")
    
    def test_export_excel_filled_filter(self):
        """Test /api/reports/export-excel with __filled__ stage filter"""
        stage_filters = json.dumps({self.test_stage_id: "__filled__"})
        response = self.session.get(
            f"{BASE_URL}/api/reports/export-excel",
            params={"stage_filters": stage_filters}
        )
        assert response.status_code == 200
        assert 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' in response.headers.get('Content-Type', '')
        assert len(response.content) > 0
        print(f"SUCCESS: Export Excel with __filled__ filter works (size: {len(response.content)} bytes)")
    
    def test_multiple_stage_filters_with_blank_filled(self):
        """Test combining __blank__ and __filled__ filters on different stages"""
        if len(self.stages) < 2:
            pytest.skip("Need at least 2 stages for this test")
        
        stage1_id = self.stages[0]['id']
        stage2_id = self.stages[1]['id']
        
        # Filter: stage1 blank AND stage2 filled
        stage_filters = json.dumps({
            stage1_id: "__blank__",
            stage2_id: "__filled__"
        })
        response = self.session.get(
            f"{BASE_URL}/api/reports/enquiries",
            params={"stage_filters": stage_filters}
        )
        assert response.status_code == 200
        data = response.json()
        print(f"Enquiries with {self.stages[0]['name']} blank AND {self.stages[1]['name']} filled: {data['total']}")
        
        # Verify results
        for enq in data['enquiries']:
            sv = enq.get('stage_values', {})
            
            # Stage 1 should be blank
            val1 = sv.get(stage1_id, {})
            value1 = val1.get('value', '') if isinstance(val1, dict) else str(val1) if val1 else ''
            assert value1 == '', f"Stage 1 should be blank but got: {value1}"
            
            # Stage 2 should be filled
            val2 = sv.get(stage2_id, {})
            value2 = val2.get('value', '') if isinstance(val2, dict) else str(val2) if val2 else ''
            assert value2 != '', f"Stage 2 should be filled but got empty"
        
        print(f"SUCCESS: Multiple stage filters with blank/filled work correctly")
    
    def test_standard_filters_still_work(self):
        """Test that standard filters (customer_name, fabric_type, etc.) still work"""
        # Test customer_name filter
        response = self.session.get(
            f"{BASE_URL}/api/reports/enquiries",
            params={"customer_name": "Rare"}
        )
        assert response.status_code == 200
        data = response.json()
        print(f"Enquiries with customer_name containing 'Rare': {data['total']}")
        
        for enq in data['enquiries']:
            assert 'rare' in enq.get('customer_name', '').lower(), \
                f"Expected 'Rare' in customer_name but got: {enq.get('customer_name')}"
        
        print(f"SUCCESS: Standard filters still work")
    
    def test_combined_standard_and_stage_filters(self):
        """Test combining standard filters with stage blank/filled filters"""
        stage_filters = json.dumps({self.test_stage_id: "__filled__"})
        response = self.session.get(
            f"{BASE_URL}/api/reports/enquiries",
            params={
                "customer_name": "Rare",
                "stage_filters": stage_filters
            }
        )
        assert response.status_code == 200
        data = response.json()
        print(f"Enquiries with customer 'Rare' AND {self.test_stage_name} filled: {data['total']}")
        
        for enq in data['enquiries']:
            # Check customer name
            assert 'rare' in enq.get('customer_name', '').lower()
            
            # Check stage value is filled
            sv = enq.get('stage_values', {})
            stage_val = sv.get(self.test_stage_id, {})
            value = stage_val.get('value', '') if isinstance(stage_val, dict) else str(stage_val) if stage_val else ''
            assert value != '', f"Expected filled stage value"
        
        print(f"SUCCESS: Combined standard and stage filters work correctly")


class TestSelectTypeStageFilters:
    """Tests for select-type stage filters with Blank/Filled options"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup: Login and find a select-type stage"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@example.com",
            "password": "admin123"
        })
        assert login_response.status_code == 200
        
        # Get stages and find a select-type stage
        stages_response = self.session.get(f"{BASE_URL}/api/stages")
        assert stages_response.status_code == 200
        self.stages = stages_response.json()
        
        self.select_stage = None
        for stage in self.stages:
            if stage.get('input_type') == 'select' and stage.get('select_options'):
                self.select_stage = stage
                break
        
        if self.select_stage:
            print(f"Found select-type stage: {self.select_stage['name']} with options: {self.select_stage['select_options']}")
        
        yield
        
        self.session.post(f"{BASE_URL}/api/auth/logout")
    
    def test_select_stage_blank_filter(self):
        """Test __blank__ filter on select-type stage"""
        if not self.select_stage:
            pytest.skip("No select-type stage found")
        
        stage_filters = json.dumps({self.select_stage['id']: "__blank__"})
        response = self.session.get(
            f"{BASE_URL}/api/reports/enquiries",
            params={"stage_filters": stage_filters}
        )
        assert response.status_code == 200
        data = response.json()
        print(f"Enquiries with {self.select_stage['name']} blank: {data['total']}")
        
        # Verify all returned enquiries have blank value
        for enq in data['enquiries']:
            sv = enq.get('stage_values', {})
            stage_val = sv.get(self.select_stage['id'], {})
            value = stage_val.get('value', '') if isinstance(stage_val, dict) else str(stage_val) if stage_val else ''
            assert value == '', f"Expected blank but got: {value}"
        
        print(f"SUCCESS: Select-type stage __blank__ filter works")
    
    def test_select_stage_filled_filter(self):
        """Test __filled__ filter on select-type stage"""
        if not self.select_stage:
            pytest.skip("No select-type stage found")
        
        stage_filters = json.dumps({self.select_stage['id']: "__filled__"})
        response = self.session.get(
            f"{BASE_URL}/api/reports/enquiries",
            params={"stage_filters": stage_filters}
        )
        assert response.status_code == 200
        data = response.json()
        print(f"Enquiries with {self.select_stage['name']} filled: {data['total']}")
        
        # Verify all returned enquiries have non-empty value
        for enq in data['enquiries']:
            sv = enq.get('stage_values', {})
            stage_val = sv.get(self.select_stage['id'], {})
            value = stage_val.get('value', '') if isinstance(stage_val, dict) else str(stage_val) if stage_val else ''
            assert value != '', f"Expected filled but got empty"
        
        print(f"SUCCESS: Select-type stage __filled__ filter works")
    
    def test_select_stage_specific_option_filter(self):
        """Test filtering by specific option value on select-type stage"""
        if not self.select_stage or not self.select_stage.get('select_options'):
            pytest.skip("No select-type stage with options found")
        
        # Use the first option
        option = self.select_stage['select_options'][0]
        stage_filters = json.dumps({self.select_stage['id']: option})
        response = self.session.get(
            f"{BASE_URL}/api/reports/enquiries",
            params={"stage_filters": stage_filters}
        )
        assert response.status_code == 200
        data = response.json()
        print(f"Enquiries with {self.select_stage['name']} = '{option}': {data['total']}")
        
        print(f"SUCCESS: Select-type stage specific option filter works")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
