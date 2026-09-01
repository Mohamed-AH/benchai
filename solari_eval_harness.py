#!/usr/bin/env python3
# Solari Agent Evaluation Harness
# Deterministic benchmark execution engine inside ephemeral Solari MicroVM sandboxes.

import asyncio
import json
import os
import re
import time
from dataclasses import dataclass, asdict, field
from typing import List, Dict, Any, Optional

try:
    from solari_sandbox import SandboxClient
except ImportError:
    raise ImportError("Missing required package 'solari-sandbox'. Install via: pip install solari-sandbox")

try:
    from google import genai
    HAS_GENAI = True
except ImportError:
    HAS_GENAI = False
    import urllib.request


@dataclass
class Assertion:
    type: str  # 'file_exists', 'file_contains', 'code_output'
    target: str
    expected: str = ''
    description: str = ''

@dataclass
class BenchmarkTask:
    id: str
    name: str
    category: str
    difficulty: str
    description: str
    prompt: str
    setup_commands: List[str] = field(default_factory=list)
    assertions: List[Assertion] = field(default_factory=list)

@dataclass
class TaskResult:
    task_id: str
    task_name: str
    category: str
    passed: bool
    score: float
    latency_ms: float
    trajectory: List[Dict[str, Any]]
    assertions_detail: List[Dict[str, Any]]
    error: Optional[str] = None


BENCHMARK_SUITE: List[BenchmarkTask] = [
    BenchmarkTask(
        id='task_01_json_parser',
        name='Structured Log Aggregation',
        category='Data Processing',
        difficulty='Easy',
        description='Extract raw log items and output metrics JSON file.',
        prompt=(
            'Inspect /workspace/server.log. Extract HTTP status codes. '
            'Calculate total count, total errors (4xx and 5xx), and error rate. '
            'Write JSON output to /workspace/metrics.json with keys: total, errors, error_rate.'
        ),
        setup_commands=[
            'mkdir -p /workspace',
            "echo '2026-09-01 10:00:00 HTTP 200 GET /index' > /workspace/server.log",
            "echo '2026-09-01 10:01:00 HTTP 500 POST /api/v1/submit' >> /workspace/server.log",
            "echo '2026-09-01 10:02:00 HTTP 200 GET /about' >> /workspace/server.log",
            "echo '2026-09-01 10:03:00 HTTP 404 GET /missing' >> /workspace/server.log",
            "echo '2026-09-01 10:04:00 HTTP 200 POST /login' >> /workspace/server.log"
        ],
        assertions=[
            Assertion(type='file_exists', target='/workspace/metrics.json', description='metrics.json exists'),
            Assertion(type='file_contains', target='/workspace/metrics.json', expected='"errors": 2', description='Correct error count'),
            Assertion(type='file_contains', target='/workspace/metrics.json', expected='"total": 5', description='Correct total count')
        ]
    ),
    BenchmarkTask(
        id='task_02_script_refactor',
        name='ZeroDivision Bug Remediation',
        category='Software Engineering',
        difficulty='Medium',
        description='Fix edge case bug without altering signature.',
        prompt=(
            'In /workspace/calculator.py, fix ZeroDivisionError on empty input arrays. '
            'Ensure running python3 /workspace/calculator.py prints AVERAGE: 0.0 on empty data.'
        ),
        setup_commands=[
            'mkdir -p /workspace',
            "echo 'def calculate_avg(numbers):\n    return sum(numbers) / len(numbers) if numbers else 0.0\n\ndata = []\nprint(f\"AVERAGE: {calculate_avg(data)}\")' > /workspace/calculator.py"
        ],
        assertions=[
            Assertion(type='code_output', target='python3 /workspace/calculator.py', expected='AVERAGE: 0.0', description='No ZeroDivisionError')
        ]
    )
]


class GeminiAgentSolver:
    def __init__(self, api_key: str):
        self.api_key = api_key
        if HAS_GENAI:
            self.client = genai.Client(api_key=api_key)
            self.use_official_sdk = True
        else:
            self.use_official_sdk = False

    async def solve_task(self, task_prompt: str, context: List[str]) -> str:
        prompt = f'Solve this python task. Return ONLY valid executable python code inside markdown block.\nTask: {task_prompt}\nContext: {context}'
        if self.use_official_sdk:
            loop = asyncio.get_running_loop()
            res = await loop.run_in_executor(None, lambda: self.client.models.generate_content(model='gemini-flash-lite-latest', contents=prompt))
            raw = res.text
        else:
            url = f'https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-lite-latest:generateContent?key={self.api_key}'
            payload = json.dumps({'contents': [{'parts': [{'text': prompt}]}]}).encode('utf-8')
            req = urllib.request.Request(url, data=payload, headers={'Content-Type': 'application/json'})
            loop = asyncio.get_running_loop()
            def req_fn():
                with urllib.request.urlopen(req) as response:
                    return json.loads(response.read().decode('utf-8'))['candidates'][0]['content']['parts'][0]['text']
            raw = await loop.run_in_executor(None, req_fn)

        match = re.search(r'```python\s*(.*?)\s*```', raw, re.DOTALL)
        return match.group(1).strip() if match else raw.strip()


def _get_execution_output(res) -> str:
    """Safely extract text output from RunCodeResult."""
    for attr in ("output", "logs", "text", "result"):
        val = getattr(res, attr, None)
        if val is not None:
            return str(val)
    return str(res)


class SolariBenchmarkRunner:
    def __init__(self, solari_api_key: str, gemini_api_key: str):
        self.solari_client = SandboxClient(
            api_key=solari_api_key, 
            base_url="https://api.getsolari.com"
        )
        self.agent = GeminiAgentSolver(api_key=gemini_api_key)

    async def run_task(self, task: BenchmarkTask) -> TaskResult:
        print(f"\n[VM] Provisioning MicroVM for {task.name}...")
        start = time.time()
        sb = await self.solari_client.create(template="base")
        await sb.connect()
        try:
            for cmd in task.setup_commands:
                await sb.run_code(f'import subprocess; subprocess.getoutput("{cmd}")')
            code = await self.agent.solve_task(task.prompt, task.setup_commands)
            await sb.run_code(code)
            
            assertions_detail = []
            passed_cnt = 0
            for a in task.assertions:
                p = False
                if a.type == 'file_exists':
                    res = await sb.run_code(f"import os; print(os.path.exists('{a.target}'))")
                    p = 'True' in _get_execution_output(res)
                elif a.type == 'file_contains':
                    res = await sb.run_code(f"import os; print(open('{a.target}').read() if os.path.exists('{a.target}') else '')")
                    p = a.expected in _get_execution_output(res)
                elif a.type == 'code_output':
                    res = await sb.run_code(f"import subprocess; print(subprocess.getoutput('{a.target}'))")
                    p = a.expected in _get_execution_output(res)
                if p: 
                    passed_cnt += 1
                assertions_detail.append({'description': a.description, 'passed': p})
                
            score = passed_cnt / len(task.assertions) if task.assertions else 1.0
            return TaskResult(
                task.id, task.name, task.category, score == 1.0, score, 
                (time.time() - start) * 1000, [], assertions_detail
            )
        finally:
            await sb.kill()

    async def run_suite(self, suite: List[BenchmarkTask]) -> Dict[str, Any]:
        results = [await self.run_task(t) for t in suite]
        return {
            'total': len(suite),
            'passed': sum(1 for r in results if r.passed),
            'results': [asdict(r) for r in results]
        }


async def main():
    s_key = os.environ.get('SOLARI_API_KEY')
    g_key = os.environ.get('GEMINI_API_KEY')
    if not s_key or not g_key:
        print('Missing SOLARI_API_KEY or GEMINI_API_KEY environment variables.')
        return
    runner = SolariBenchmarkRunner(s_key, g_key)
    res = await runner.run_suite(BENCHMARK_SUITE)
    with open('benchmark_results.json', 'w') as f:
        json.dump(res, f, indent=2)
    print('\nBenchmark Execution Complete! Results saved to benchmark_results.json')

if __name__ == '__main__':
    asyncio.run(main())
