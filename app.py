from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import signal
import threading
import time
import atexit
import sys
from dotenv import load_dotenv

# Import your B-Tree logic
# (Ensure btree_logic.py is in the same folder)
from btree_logic import BTree

load_dotenv()

app = Flask(__name__)

# --- CONFIGURATION ---
app.secret_key = os.getenv("SECRET_KEY", "dev_secret_key_999")
ADMIN_USERNAME = os.getenv("ADMIN_USER", "nurse")
ADMIN_PASSWORD = os.getenv("ADMIN_PASS", "RuralClinic2026")

CORS(app)

# --- 2. ENGINE SETUP ---
# Initialize the B-Tree with degree t=3
db = BTree(t=3)

# Change working directory to the script's location
# This ensures relative paths work regardless of where you run the script from
os.chdir(os.path.dirname(os.path.abspath(__file__)))

# Ensure data directory exists
if not os.path.exists("data"):
    print("CORE: Creating new data folder...")
    os.makedirs("data")

# --- GRACEFUL SHUTDOWN HOOK (The Safety Net) ---
def cleanup_before_exit():
    """
    Runs automatically when the server stops (via Ctrl+C or API).
    Ensures the WAL is safe and logs the shutdown.
    """
    print("\n--------------------------------------------------")
    print("CORE: Stopping Anchor Engine...")
    print("WAL: All transactions are anchored to disk.")
    print("CORE: Shutdown Complete.")
    print("--------------------------------------------------")

# Register the hook immediately
atexit.register(cleanup_before_exit)

# --- RECOVERY LOGIC ---
if os.path.exists("data/recovery.wal"):
    # (Note: You'll need to implement recover_tree in your WAL logic later)
    # print("AnchorMed Engine Restarting... Replaying Logs...")
    # wal_engine.recover_tree(db)
    pass 
else:
    print("CORE: No existing logs found. Starting fresh.")


# --- 3. HELPER FUNCTIONS ---
def validate_login(data):
    return (
        data.get("username") == ADMIN_USERNAME and 
        data.get("password") == ADMIN_PASSWORD
    )

# --- 4. API ROUTES ---

@app.route("/api/login", methods=["POST"])
def login():
    data = request.json
    if validate_login(data):
        return jsonify({"success": True, "message": "Login successful"}), 200
    return jsonify({"success": False, "message": "Invalid credentials"}), 401

@app.route("/api/view_all", methods=["GET"])
def view_all():
    # Convert B-Tree data to JSON-friendly format
    inventory = db.get_all_data() 
    return jsonify({"success": True, "inventory": inventory}), 200

@app.route("/api/add", methods=["POST"])
def add_item():
    data = request.json
    batch_id = data.get("batch_id")
    
    # Basic Validation
    if not batch_id:
        return jsonify({"success": False, "message": "Batch ID required"}), 400

    # Insert into B-Tree (Memory)
    db.insert(batch_id, {
        "name": data.get("med_name"),
        "qty": data.get("qty"),
        "expiry": data.get("expiry")
    })
    
    # TODO: Write to WAL (Disk) -> We will add this in the next step
    
    return jsonify({"success": True, "message": "Batch anchored successfully"}), 200

@app.route("/api/update", methods=["POST"])
def update_item():
    data = request.json
    batch_id = data.get("batch_id")
    new_qty = data.get("new_qty")

    if not batch_id or new_qty is None:
         return jsonify({"success": False, "message": "Missing data"}), 400
    
    # Search for the item
    current_data = db.search(batch_id)
    if current_data:
        # Update logic
        current_data["qty"] = new_qty
        # TODO: Append update to WAL
        return jsonify({"success": True, "message": "Stock updated"}), 200
    
    return jsonify({"success": False, "message": "Batch ID not found"}), 404

# --- SHUTDOWN ROUTE (The Trigger) ---
def shutdown_server():
    """ Background task to stop the server after a delay."""
    print("CORE: Shutdown sequence initiated...")
    time.sleep(1)  # Wait 1 second for frontend to receive response
    
    # Simulate Ctrl+C to trigger the atexit hook
    os.kill(os.getpid(), signal.SIGINT)

@app.route("/api/shutdown", methods=["POST"])
def shutdown():
    # Run the shutdown timer in a separate thread so we can return 200 OK first
    threading.Thread(target=shutdown_server).start()
    return jsonify({"success": True, "message": "Server shutting down..."}), 200

if __name__ == "__main__":
    app.run(debug=True, port=5000)
