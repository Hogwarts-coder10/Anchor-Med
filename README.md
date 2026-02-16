# Anchor-Med
# ⚓ AnchorMed

> **A local-first, crash-resilient medical inventory system powered by a custom B-Tree database engine.**

![AnchorMed Status](https://img.shields.io/badge/Status-Stable%20v3.0.0-green?style=for-the-badge)
![Tech Stack](https://img.shields.io/badge/Stack-Electron%20%7C%20React%20%7C%20Python-blue?style=for-the-badge)
![Database](https://img.shields.io/badge/Engine-Custom%20B--Tree%20%2B%20WAL-red?style=for-the-badge)

## 📖 Overview

**AnchorMed** is a desktop application designed for medical clinics in low-connectivity environments. Unlike traditional apps that rely on SQLite or cloud databases, AnchorMed runs on a **custom-built storage engine** engineered from scratch in Python.

It features a **Write-Ahead Log (WAL)** to ensure data integrity (ACID compliance), meaning zero data loss even if the power cuts out or the application crashes.

---

## 🏗️ The Engineering (Why Custom?)

The core goal of this project was to implement **Database Internals** rather than just using them.

### 🧠 1. Custom B-Tree Engine
Instead of `import sqlite3`, I implemented a **B-Tree (Order t=3)** data structure in Python.
* **Search Complexity:** O(log n)
* **Disk Storage:** JSON-based serialization for portability.
* **Logic:** Handles complex node splitting and merging algorithms manually.

### 🛡️ 2. Write-Ahead Logging (WAL)
To prevent data corruption during crashes:
1.  Every transaction (Add/Update) is first appended to `recovery.wal`.
2.  Only after a successful log write is the data committed to the B-Tree memory.
3.  **Crash Recovery:** On startup, the engine checks the WAL. If it finds uncommitted logs (from a crash), it "replays" them to restore the database state automatically.

### 🔌 3. Electron-Python Interop
* **Architecture:** The UI (React) runs in Electron, while the Logic (B-Tree) runs as a spawned Python child process.
* **Lifecycle Management:** Implemented a robust "Zombie Killer" routine. When the main Electron window closes, it explicitly hunts down and terminates the Python background process to prevent memory leaks.

### 🌐 4. P2P Network Synchronisation
* Implemented a "Two-Step Handshake" protocol allowing multiple instances of AnchorMed to discover each other on a local Wi-Fi network and merge B-Tree states without a central server.
---



## 📥 Download & Install
**[👉 Download the latest Windows Installer (v3.0.0)](./releases)**
1. Go to the **Releases** tab.
2. Download `Anchor-Med Setup 3.0.0.exe`.
3. Run the installer and follow the setup wizard.

1.  Go to the **Releases** tab.
2.  Download `AnchorMed-v2.1-Portable.zip`.
3.  Extract the folder.
4.  Run `AnchorMed.exe`.
    * *Note: No Python or Node.js installation required.*

---

## 💻 Local Development (For Developers)

If you want to modify the B-Tree logic or the React frontend:

### Prerequisites
* Node.js (v18+)
* Python (v3.10+)

### 1. Setup
```bash
# Clone the repository
git clone [https://github.com/YOUR_USERNAME/anchor-med.git](https://github.com/YOUR_USERNAME/anchor-med.git)
cd anchor-med

# Install Frontend Dependencies
npm install

# Install Backend Dependencies
pip install flask flask-cors python-dotenv requests


```

## Contributors
**[V SS Karthik]** - *Lead Engineer (Backend Architecture, B-Tree Engine, WAL Implementation)*
* **[Mouktika]** - *Frontend Developer / UI Design*
* **[Avinash]** - *Flask and WAL Implementation, Frontend Developer / UI Design*

## Project Status

Anchor-Med is an active systems project.  
Core functionality (custom B-Tree storage, WAL-based crash recovery, and
Flask integration) is implemented and manually stress-tested.

Known limitations and planned improvements are tracked transparently
in the GitHub Issues tab.


## Crash Recovery Testing

The database engine has been manually stress-tested for crash recovery.

Testing methodology:
- Continuous insert and update operations under load
- Backend process forcefully terminated at random points
- Application restarted to trigger WAL replay

Results:
- WAL replay consistently restored a valid B-Tree state
- No partial or corrupted records observed
- Operations were either fully applied or safely ignored

Automated crash-recovery tests are planned as a future improvement.


## Known Limitations

Some advanced features (checkpointing, transaction boundaries, and
full duplicate-key enforcement) They are under active development.

Please have a look at the Issues tab for detailed, tracked limitations and fixes.

