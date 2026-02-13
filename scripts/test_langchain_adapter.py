import sys
import os
import uuid
from typing import Any, Dict, List, Optional

# Add sdk-python to path
sys.path.append(os.path.join(os.getcwd(), 'sdk-python'))

from dashclaw import DashClaw
from dashclaw.integrations.langchain import DashClawCallbackHandler

# --- Mocks for LangChain classes ---
class MockLLMResult:
    def __init__(self, text, token_usage=None):
        self.generations = [[type('Gen', (), {'text': text})]]
        self.llm_output = {'token_usage': token_usage, 'model_name': 'gpt-4-mock'}

# --- Test ---
def test_adapter():
    print("Testing DashClaw LangChain Adapter (Mocked)...")
    
    # Init client
    client = DashClaw(
        base_url="http://localhost:3000",
        api_key="test-key",
        agent_id="langchain-test-agent"
    )
    
    # Init handler
    handler = DashClawCallbackHandler(client)
    
    # 1. Test LLM Start
    run_id = uuid.uuid4()
    print(f"\n1. on_llm_start (Run ID: {run_id})")
    
    # Mock create_action response
    def mock_create_action(**kwargs):
        print(f"   -> create_action called: {kwargs.get('declared_goal')}")
        return {'action_id': 'act_mock_llm'}
    
    client.create_action = mock_create_action
    
    handler.on_llm_start(
        serialized={}, 
        prompts=["Explain quantum physics"], 
        run_id=run_id,
        invocation_params={'model_name': 'gpt-4-mock'}
    )
    
    # 2. Test LLM End (with tokens)
    print("\n2. on_llm_end (Tokens: 50 in, 100 out)")
    
    # Mock update_outcome
    def mock_update_outcome(action_id, **kwargs):
        print(f"   -> update_outcome called for {action_id}: status={kwargs.get('status')}")
        if 'tokens_in' in kwargs:
            print(f"      [Cost Analytics] Tokens captured: {kwargs['tokens_in']} in, {kwargs['tokens_out']} out")
            
    client.update_outcome = mock_update_outcome
    client.report_token_usage = lambda x: print(f"   -> report_token_usage called: {x}")

    result = MockLLMResult("Quantum physics is...", token_usage={'prompt_tokens': 50, 'completion_tokens': 100})
    handler.on_llm_end(result, run_id=run_id)
    
    # 3. Test Tool Usage
    tool_run_id = uuid.uuid4()
    print(f"\n3. on_tool_start (Tool: Calculator)")
    
    def mock_create_tool_action(**kwargs):
        print(f"   -> create_action called: {kwargs.get('declared_goal')}")
        return {'action_id': 'act_mock_tool'}
        
    client.create_action = mock_create_tool_action
    
    handler.on_tool_start(
        serialized={'name': 'Calculator'},
        input_str="2 + 2",
        run_id=tool_run_id,
        parent_run_id=run_id
    )
    
    print("\n4. on_tool_end")
    handler.on_tool_end("4", run_id=tool_run_id, parent_run_id=run_id)
    
    print("\n✅ Adapter logic verified.")

if __name__ == "__main__":
    test_adapter()
