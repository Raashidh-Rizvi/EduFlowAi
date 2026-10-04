import sys
import os

# Ensure the root ai-agent directory is on Python path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from main import app
