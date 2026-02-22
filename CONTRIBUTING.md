## Contributing to AnchorMed ⚓
First off, thank you for considering contributing! AnchorMed is a mission-critical system for low-connectivity environments, and we value precision and stability above all else.

## 🛠️ Tech Stack & Style
To keep the codebase maintainable, we adhere to the following:
* Backend: Python (3.14.0)
* Frontend: Node.js (v18.0+) and React
* Code Style: Please follow PEP 8 for Python logic and use descriptive variable names—especially within the B-Tree implementation.


## 🧠 The B-Tree Rulebook
The custom storage engine is the heart of AnchorMed. To ensure the integrity of the database kernel:
* Maintain Order: All modifications to btree_logic.py must maintain a B-Tree order of `t=3`.
* WAL First: Any new data-altering operations must be logged to the Write-Ahead Log before being committed to the tree memory.
* Mandatory Testing: Any change to the storage engine must pass `test_crash.py` without data corruption.

## 🔄 Pull Request Process
We want to merge your code! To make that happen smoothly:
* Open an Issue First: For any significant features or structural changes, please open an Issue to discuss the approach before coding.
* Atomic Commits: Keep your Pull Requests focused on a single fix or feature.
* Write Tests: All new features or logic changes must include a corresponding test case in the `tests/` directory.
* Crash-Resilience Check: If you touch the backend, run the crash simulation to ensure the WAL replay still functions correctly.

