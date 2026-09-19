"""
PRAHARI AI Service — Test Configuration

Ensures the services/ai directory is in sys.path for all tests.
"""

import sys
import os

# Add the services/ai directory to path so imports work
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
