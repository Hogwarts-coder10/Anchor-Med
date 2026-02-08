# Anchor-Med
# ⚓ AnchorMed

> **A local-first, crash-resilient medical inventory system powered by a custom B-Tree database engine.**

![AnchorMed Status](https://img.shields.io/badge/Status-Beta%20v2.1-orange?style=for-the-badge)
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

---

## 📸 Screenshots

*(Add your screenshots here later - e.g., The Dashboard, The Inventory List)*

---

## 📥 Download & Install (For Users)

**[👉 Download the latest Windows Portable Version (v2.1)](./releases)**

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
