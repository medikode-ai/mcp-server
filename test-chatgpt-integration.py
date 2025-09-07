#!/usr/bin/env python3
"""
Test script for integrating Medikode MCP Server with ChatGPT
This script demonstrates how to use the MCP server tools with OpenAI's function calling
"""

import os
import requests
import json
import openai
from typing import Dict, Any, List

# Configuration
MCP_SERVER_URL = "http://localhost:3000"
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "your-openai-api-key-here")
MEDIKODE_API_KEY = os.getenv("MEDIKODE_API_KEY", "your-medikode-api-key-here")

class MedikodeMCPClient:
    """Client for interacting with Medikode MCP Server"""
    
    def __init__(self, mcp_url: str, api_key: str):
        self.mcp_url = mcp_url
        self.api_key = api_key
        self.headers = {
            "Content-Type": "application/json",
            "x-api-key": api_key
        }
    
    def get_tools(self) -> List[Dict[str, Any]]:
        """Get OpenAI-compatible tool definitions from MCP server"""
        try:
            response = requests.get(f"{self.mcp_url}/capabilities/openai-tools")
            response.raise_for_status()
            return response.json()["tools"]
        except requests.RequestException as e:
            print(f"Error fetching tools: {e}")
            return []
    
    def process_chart(self, text: str, specialty: str = None, taxonomy_code: str = None, insurance: str = None) -> Dict[str, Any]:
        """Process patient chart and get code suggestions"""
        data = {"text": text}
        if specialty:
            data["specialty"] = specialty
        if taxonomy_code:
            data["taxonomy_code"] = taxonomy_code
        if insurance:
            data["insurance"] = insurance
        
        try:
            response = requests.post(
                f"{self.mcp_url}/mcp/tools/process_chart",
                headers=self.headers,
                json=data
            )
            response.raise_for_status()
            return response.json()
        except requests.RequestException as e:
            return {"error": str(e)}
    
    def validate_codes(self, patient_chart: str, human_coded_output: str, specialty: str = None) -> Dict[str, Any]:
        """Validate medical codes against patient chart"""
        data = {
            "patient_chart": patient_chart,
            "human_coded_output": human_coded_output
        }
        if specialty:
            data["specialty"] = specialty
        
        try:
            response = requests.post(
                f"{self.mcp_url}/mcp/tools/validate_codes",
                headers=self.headers,
                json=data
            )
            response.raise_for_status()
            return response.json()
        except requests.RequestException as e:
            return {"error": str(e)}
    
    def calculate_raf(self, demographics: str, illnesses: str, model: str = "V28") -> Dict[str, Any]:
        """Calculate RAF score"""
        data = {
            "demographics": demographics,
            "illnesses": illnesses,
            "model": model
        }
        
        try:
            response = requests.post(
                f"{self.mcp_url}/mcp/tools/calculate_raf",
                headers=self.headers,
                json=data
            )
            response.raise_for_status()
            return response.json()
        except requests.RequestException as e:
            return {"error": str(e)}
    
    def qa_validate_codes(self, coded_input: str) -> Dict[str, Any]:
        """QA validate coded medical input"""
        data = {"coded_input": coded_input}
        
        try:
            response = requests.post(
                f"{self.mcp_url}/mcp/tools/qa_validate_codes",
                headers=self.headers,
                json=data
            )
            response.raise_for_status()
            return response.json()
        except requests.RequestException as e:
            return {"error": str(e)}
    
    def parse_eob(self, content: str) -> Dict[str, Any]:
        """Parse EOB document"""
        data = {"content": content}
        
        try:
            response = requests.post(
                f"{self.mcp_url}/mcp/tools/parse_eob",
                headers=self.headers,
                json=data
            )
            response.raise_for_status()
            return response.json()
        except requests.RequestException as e:
            return {"error": str(e)}

def test_mcp_server_health():
    """Test if MCP server is running and healthy"""
    try:
        response = requests.get(f"{MCP_SERVER_URL}/health")
        response.raise_for_status()
        health_data = response.json()
        print("✅ MCP Server is healthy")
        print(f"   Status: {health_data['status']}")
        print(f"   Version: {health_data['version']}")
        print(f"   Environment: {health_data['environment']}")
        return True
    except requests.RequestException as e:
        print(f"❌ MCP Server health check failed: {e}")
        return False

def test_direct_mcp_tools():
    """Test MCP tools directly without ChatGPT"""
    print("\n🧪 Testing MCP Tools Directly")
    print("=" * 40)
    
    client = MedikodeMCPClient(MCP_SERVER_URL, MEDIKODE_API_KEY)
    
    # Test 1: Process Chart
    print("\n1. Testing process_chart...")
    chart_text = "65-year-old male presents with chest pain radiating to left arm. EKG shows ST elevation in leads II, III, aVF. Troponin I elevated at 15.2 ng/mL."
    result = client.process_chart(chart_text, specialty="Cardiology")
    if "error" not in result:
        print("✅ process_chart successful")
        print(f"   Suggested codes: {result.get('suggested_codes', 'N/A')}")
    else:
        print(f"❌ process_chart failed: {result['error']}")
    
    # Test 2: Validate Codes
    print("\n2. Testing validate_codes...")
    validation_result = client.validate_codes(
        patient_chart=chart_text,
        human_coded_output="I21.9, I25.10, Z95.1",
        specialty="Cardiology"
    )
    if "error" not in validation_result:
        print("✅ validate_codes successful")
        print(f"   Validation result: {validation_result.get('validation_result', 'N/A')}")
    else:
        print(f"❌ validate_codes failed: {validation_result['error']}")
    
    # Test 3: Calculate RAF
    print("\n3. Testing calculate_raf...")
    raf_result = client.calculate_raf(
        demographics="65-year-old male, Medicare beneficiary",
        illnesses="Acute myocardial infarction, Coronary artery disease, Diabetes mellitus type 2",
        model="V28"
    )
    if "error" not in raf_result:
        print("✅ calculate_raf successful")
        print(f"   RAF Score: {raf_result.get('raf', {}).get('final', 'N/A')}")
    else:
        print(f"❌ calculate_raf failed: {raf_result['error']}")
    
    # Test 4: QA Validate Codes
    print("\n4. Testing qa_validate_codes...")
    qa_result = client.qa_validate_codes("I21.9, I25.10, Z95.1, 99213")
    if "error" not in qa_result:
        print("✅ qa_validate_codes successful")
        print(f"   Denial risk: {qa_result.get('denial_risk', 'N/A')}")
    else:
        print(f"❌ qa_validate_codes failed: {qa_result['error']}")

def test_chatgpt_integration():
    """Test integration with ChatGPT using OpenAI function calling"""
    print("\n🤖 Testing ChatGPT Integration")
    print("=" * 40)
    
    if OPENAI_API_KEY == "your-openai-api-key-here":
        print("⚠️  Please set your OpenAI API key in the script to test ChatGPT integration")
        return
    
    client = openai.OpenAI(api_key=OPENAI_API_KEY)
    mcp_client = MedikodeMCPClient(MCP_SERVER_URL, MEDIKODE_API_KEY)
    
    # Get MCP tools for ChatGPT
    tools = mcp_client.get_tools()
    if not tools:
        print("❌ Failed to get MCP tools")
        return
    
    print(f"✅ Retrieved {len(tools)} MCP tools for ChatGPT")
    
    # Test ChatGPT with MCP tools
    try:
        response = client.chat.completions.create(
            model="gpt-4",
            messages=[
                {
                    "role": "user",
                    "content": "Please process this patient chart and suggest appropriate medical codes: '65-year-old male presents with chest pain radiating to left arm. EKG shows ST elevation in leads II, III, aVF. Troponin I elevated at 15.2 ng/mL.'"
                }
            ],
            tools=tools,
            tool_choice="auto"
        )
        
        print("✅ ChatGPT integration successful")
        print(f"   Response: {response.choices[0].message.content}")
        
        # Check if tools were called
        if response.choices[0].message.tool_calls:
            print(f"   Tools called: {len(response.choices[0].message.tool_calls)}")
            for tool_call in response.choices[0].message.tool_calls:
                print(f"   - {tool_call.function.name}")
        
    except Exception as e:
        print(f"❌ ChatGPT integration failed: {e}")

def main():
    """Main test function"""
    print("🚀 Medikode MCP Server - ChatGPT Integration Test")
    print("=" * 60)
    
    # Test 1: MCP Server Health
    if not test_mcp_server_health():
        print("\n❌ MCP Server is not running. Please start it first:")
        print("   cd /Users/muthuka/root/medikode.ai/allnew/mcp-server")
        print("   node index.js")
        return
    
    # Test 2: Direct MCP Tools
    test_direct_mcp_tools()
    
    # Test 3: ChatGPT Integration
    test_chatgpt_integration()
    
    print("\n📋 Next Steps:")
    print("1. Update OPENAI_API_KEY and MEDIKODE_API_KEY in this script")
    print("2. Run the script again to test ChatGPT integration")
    print("3. Use the MCP server with your ChatGPT application on localhost:8004")

if __name__ == "__main__":
    main()
