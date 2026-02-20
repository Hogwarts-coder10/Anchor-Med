# ⚓ Anchor-Med Master Engineering Roadmap (v3.1.0 - v4.0.0)

This roadmap outlines the path to pushing Anchor-Med beyond standard CRUD operations and evolving it into a highly resilient, offline-first distributed system with embedded local machine learning.

## 🛠️ v3.1.0 - Engine Hardening & Distributed Resilience

### Database Internals
- [ ] **Transaction Rollbacks:** Implement boundary logic to safely abort and roll back partial batch operations if an insertion fails (maintaining ACID compliance).
- [ ] **Automated Chaos Testing Suite:** Build a Python script to continuously blast the B-Tree with rapid insertions while randomly triggering `os.kill()` to definitively prove WAL recovery reliability.
- [ ] **Secondary B-Tree Indexing:** Engineer a supplementary B-Tree alongside the primary one specifically for sorting metadata (e.g., Expiration Dates) to allow for instant O(log n) range queries without scanning every node.

### P2P Sync & Distributed Systems
- [ ] **Conflict Resolution Engine:** Upgrade the P2P merge logic. Implement a versioning or "last-write-wins" timestamp protocol to resolve collisions gracefully when two disconnected clinics edit the same medicine count.
- [ ] **Silent Background Syncing:** Evolve the "Two-Step Handshake" into a background daemon that periodically pings the local Wi-Fi and synchronizes states automatically.

### Architecture & Clinic Features
- [ ] **Event Sourcing (Audit Trail):** Transition from simple value updates to an immutable, append-only ledger that tracks every single dispense, restock, or deletion with a timestamp and Operator ID.
- [ ] **Export & Reporting Engine:** Build a utility to serialize the B-Tree state into clean CSV/PDF files for official clinic audits.
- [ ] **Role-Based Access Control (RBAC):** Implement basic permissions isolating `Admin` accounts (can delete, sync, manage users) from standard `Operator` accounts.

---

## 🤖 v3.2.0 / v4.0.0 - Local Intelligence (Offline ML Pipeline)

*Goal: Utilize the Python backend to run lightweight, offline machine learning models to transition the app from a reactive recording tool to a proactive, predictive system.*

- [ ] **Predictive Restocking (Time-Series Forecasting):** Train a local model (ARIMA/Prophet) on the append-only audit log to learn seasonal trends and actively forecast when the clinic will run out of specific supplies.
- [ ] **Audit Anomaly Detection:** Implement an unsupervised learning algorithm (like Isolation Forests) to monitor dispensing patterns in the background and instantly flag highly unusual checkouts to the admin.
- [ ] **Expiry Waste Optimization:** Develop an algorithm that analyzes delivery lag, current stock, and burn rates to recommend the exact mathematically optimal quantity to order, minimizing expired waste.
- [ ] **Local OCR Invoice Scanning:** Integrate a lightweight computer vision model (e.g., Tesseract) so operators can hold a supplier invoice up to the webcam to automatically parse text and stage inventory updates.
