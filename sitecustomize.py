"""Ensure project root is on sys.path for stub packages used in tests.
This file is automatically imported by Python's site module if present on sys.path.
"""
import sys
import pathlib

project_root = pathlib.Path(__file__).resolve().parent
if str(project_root) not in sys.path:
    # Insert at front to prioritize project modules
    sys.path.insert(0, str(project_root))
