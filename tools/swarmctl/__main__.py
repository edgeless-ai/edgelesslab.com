"""Entry point for `python -m swarmctl <cmd>`."""
import sys

from .cli import main

sys.exit(main())
