#!/usr/bin/env python
"""
MediLink AI — Drug-Drug Interaction (DDI) Pipeline CLI Script.

Collects drug names from the user's database, creates all 2-drug combinations,
executes the deep learning DDI prediction model from `drug-to-drug-interaction-using-XAI`,
and exports an app-ready structured JSON report (`UserDDIReport`).

Usage:
    python ddi_pipeline.py --profile-id <USER_UUID>
    python ddi_pipeline.py --drugs "Aspirin, Warfarin, Metformin"
    python ddi_pipeline.py --output custom_ddi_results.json
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path

# Add backend directory to sys.path if running script directly
BACKEND_DIR = Path(__file__).resolve().parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

# Load .env file if available
try:
    from dotenv import load_dotenv
    load_dotenv(BACKEND_DIR / ".env")
    load_dotenv(BACKEND_DIR.parent / ".env")
except ImportError:
    pass

from app.services.ddi_service import DDIPipelineEngine, fetch_user_medications, print_cli_report
from app.models.ddi import UserDDIReport


def parse_arguments() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="MediLink AI — Drug-Drug Interaction (DDI) Analysis Pipeline"
    )
    parser.add_argument(
        "--profile-id",
        type=str,
        default=None,
        help="Supabase profile ID to fetch medications for. Defaults to all database medications if omitted.",
    )
    parser.add_argument(
        "--drugs",
        type=str,
        default=None,
        help="Optional comma-separated list of drug names to evaluate directly (e.g., 'Aspirin, Warfarin, Metformin').",
    )
    parser.add_argument(
        "--threshold",
        type=float,
        default=0.5,
        help="Interaction probability cutoff threshold (default: 0.5).",
    )
    parser.add_argument(
        "--output",
        type=str,
        default="ddi_report.json",
        help="Path to output JSON file (default: ddi_report.json).",
    )
    return parser.parse_args()


def get_supabase_client_if_available():
    """Attempt to initialize Supabase client from environment variables."""
    url = os.getenv("SUPABASE_URL") or os.getenv("VITE_SUPABASE_URL")
    key = (
        os.getenv("SUPABASE_SERVICE_ROLE_KEY")
        or os.getenv("SUPABASE_KEY")
        or os.getenv("VITE_SUPABASE_ANON_KEY")
    )
    if url and key:
        try:
            from supabase import create_client
            return create_client(url, key)
        except Exception as e:
            print(f"[!] Warning: Could not initialize Supabase client: {e}")
    return None


def print_report_summary(report: UserDDIReport):
    """Print clean formatted CLI output summary."""
    print_cli_report(report)


def main():
    if hasattr(sys.stdout, "reconfigure"):
        try:
            sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        except Exception:
            pass

    args = parse_arguments()

    print("\n[*] Initializing MediLink AI DDI Engine...")

    # 1. Initialize PyTorch model engine from sub-repository
    try:
        engine = DDIPipelineEngine()
        print("[OK] Model & Similarity Matrices loaded successfully.")
    except Exception as exc:
        print(f"[X] Error initializing DDI Pipeline Engine: {exc}")
        sys.exit(1)

    # 2. Collect drugs
    drugs_list: list[str] = []
    user_name: str | None = None
    profile_id = args.profile_id

    if args.drugs:
        print(f"[*] Reading explicit drugs input: {args.drugs}")
        drugs_list = [d.strip() for d in args.drugs.split(",") if d.strip()]
    else:
        print("[*] Connecting to database to fetch user medications...")
        supabase = get_supabase_client_if_available()
        if supabase and profile_id:
            drugs_list, user_name = fetch_user_medications(supabase, profile_id=profile_id)
            print(f"[OK] Fetched {len(drugs_list)} medication(s) from database.")
        else:
            print("[!] Supabase client unavailable or no profile_id specified.")

    # 3. Evaluate drug combinations
    target_id = profile_id or "user"
    report = engine.evaluate_drug_list(
        drugs=drugs_list,
        profile_id=profile_id,
        user_name=user_name,
        threshold=args.threshold,
    )

    # 4. Print summary
    print_report_summary(report)

    # 5. Save output JSON report
    output_path = Path(args.output)
    if not output_path.is_absolute():
        output_path = BACKEND_DIR / output_path

    report_json = report.model_dump_json(indent=2)
    with open(output_path, "w", encoding="utf-8") as f:
        f.write(report_json)

    print(f"\n[OK] App-ready DDI Report saved to: {output_path.resolve()}\n")


if __name__ == "__main__":
    main()
