"""scripts/smoke_test.py

Smoke test runner for CyberCheckmate per PRD Section 16.11.

Sends requests to GET /health and POST /analyze for all demo cases defined in
demo/demo_inputs.json. Prints an assessment table of Name, Expected, Actual,
Risk Score, Processing Time, and PASS/FAIL verdict.

Usage:
    python scripts/smoke_test.py [--base-url http://127.0.0.1:8000]
"""

from __future__ import annotations

import argparse
import json
import sys
import time
from pathlib import Path

import httpx

PROJECT_ROOT = Path(__file__).resolve().parent.parent
DEMO_INPUTS_PATH = PROJECT_ROOT / "demo" / "demo_inputs.json"


def run_smoke_tests(base_url: str) -> int:
    base_url = base_url.rstrip("/")
    print("=" * 80)
    print(f"CyberCheckmate Smoke Test Suite")
    print(f"Target Base URL: {base_url}")
    print("=" * 80)

    client = httpx.Client(timeout=10.0)

    # -----------------------------------------------------------------------
    # Step 1: Health Check
    # -----------------------------------------------------------------------
    health_url = f"{base_url}/health"
    try:
        t0 = time.perf_counter()
        health_resp = client.get(health_url)
        elapsed_health = (time.perf_counter() - t0) * 1000

        if health_resp.status_code != 200:
            print(f"[FAIL] /health returned HTTP {health_resp.status_code}: {health_resp.text}")
            return 1

        health_data = health_resp.json()
        print(f"[OK] GET /health returned 200 in {elapsed_health:.1f} ms")
        print(f"     Status: {health_data.get('status')}")
        print(f"     Model Version: {health_data.get('model_version')}")
        print(f"     Components: {health_data.get('components')}")
        print("-" * 80)

    except Exception as exc:
        print(f"[FAIL] Could not connect to {health_url}: {exc}")
        print("Please start the backend server first:")
        print("    uvicorn backend.main:app --reload --host 127.0.0.1 --port 8000")
        return 1

    # -----------------------------------------------------------------------
    # Step 2: Load Demo Inputs
    # -----------------------------------------------------------------------
    if not DEMO_INPUTS_PATH.exists():
        print(f"[FAIL] Missing demo inputs file at {DEMO_INPUTS_PATH}")
        return 1

    demo_cases = json.loads(DEMO_INPUTS_PATH.read_text(encoding="utf-8"))
    print(f"Running {len(demo_cases)} demo test cases through /analyze ...\n")

    results = []
    all_passed = True
    analyze_url = f"{base_url}/analyze"

    # Header for report table
    print(f"{'Case Name':<30} | {'Expected':<12} | {'Actual':<8} | {'Score':>5} | {'Latency':>8} | {'Status':<6}")
    print("-" * 80)

    for case_name, case_data in demo_cases.items():
        expected_level = case_data.get("expected_level", "").lower().strip()
        payload = {}
        if "text" in case_data:
            payload["text"] = case_data["text"]
        if "url" in case_data:
            payload["url"] = case_data["url"]

        t_start = time.perf_counter()
        try:
            resp = client.post(analyze_url, json=payload)
            elapsed_ms = (time.perf_counter() - t_start) * 1000

            if resp.status_code != 200:
                actual_level = f"ERR {resp.status_code}"
                score_display = "N/A"
                is_pass = False
            else:
                resp_json = resp.json()
                actual_level = resp_json.get("level", "").lower().strip()
                score_display = str(resp_json.get("risk_score", 0))

                # Check if expected is satisfied
                if "or" in expected_level:
                    allowed = [x.strip() for x in expected_level.split("or")]
                    is_pass = actual_level in allowed
                else:
                    is_pass = actual_level == expected_level

        except Exception as exc:
            elapsed_ms = (time.perf_counter() - t_start) * 1000
            actual_level = "EXC"
            score_display = "ERR"
            is_pass = False

        status_str = "PASS" if is_pass else "FAIL"
        if not is_pass:
            all_passed = False

        print(
            f"{case_name:<30} | {expected_level:<12} | {actual_level:<8} | {score_display:>5} | {elapsed_ms:>6.1f} ms | {status_str:<6}"
        )

        results.append({
            "name": case_name,
            "expected": expected_level,
            "actual": actual_level,
            "score": score_display,
            "elapsed_ms": elapsed_ms,
            "passed": is_pass,
        })

    print("-" * 80)
    if all_passed:
        print("[SUCCESS] All demo smoke tests PASSED!")
        print("=" * 80)
        return 0
    else:
        print("[FAILURE] One or more smoke test cases failed.")
        print("=" * 80)
        return 1


def main() -> None:
    parser = argparse.ArgumentParser(description="CyberCheckmate Demo Smoke Test Runner")
    parser.add_argument(
        "--base-url",
        default="http://127.0.0.1:8000",
        help="Base URL of the running FastAPI server (default: http://127.0.0.1:8000)",
    )
    args = parser.parse_args()
    sys.exit(run_smoke_tests(args.base_url))


if __name__ == "__main__":
    main()
