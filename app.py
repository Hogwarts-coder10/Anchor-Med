import os
import sys
import signal
import requests  # type: ignore
from flask import Flask, request, jsonify, Response
from flask_cors import CORS
from dotenv import load_dotenv
from typing import Any, Optional

# Custom Modules
from btree_logic import BTree
import wal_engine

# --- 0. THE MAGIC PATH FIX (ADD THIS) ---
# This forces the app to look for 'data' in the same folder as the .exe
if getattr(sys, 'frozen', False):
    # If we are running as an .exe
    BASE_DIR = os.path.dirname(sys.executable)
    os.chdir(BASE_DIR) # <--- CRITICAL: Sets the Current Working Directory
    print(f"CORE: Running as EXE. Working Directory set to: {BASE_DIR}")
else:
    # If we are running as a script (dev mode)
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))
    print(f"CORE: Running as Script. Working Directory: {BASE_DIR}")

# --- 1. CONFIGURATION & SECURITY ---
load_dotenv()

app = Flask(__name__)

app.secret_key = os.getenv("SECRET_KEY", "dev_secret_key_999")
ADMIN_USERNAME = os.getenv("ADMIN_USER", "admin")
ADMIN_PASSWORD = os.getenv("ADMIN_PASS", "admin123")

CORS(app)

# --- 2. ENGINE SETUP ---
db = BTree(t=3)

# Now these relative paths will work correctly because we set os.chdir()
if not os.path.exists("data"):
    print("CORE: Creating new data folder...")
    os.makedirs("data")

if os.path.exists("data/recovery.wal"):
    print("AnchorMed Engine Restarting... Replaying Logs...")
    wal_engine.recover_tree(db)
else:
    print("CORE: No existing logs found. Starting fresh.")

# --- 3. HELPER FUNCTIONS ---

def validate_login(data: dict[str, Any]) -> bool:
    return (
        data.get("username") == ADMIN_USERNAME and 
        data.get("password") == ADMIN_PASSWORD
    )

# --- 4. API ROUTES ---

@app.route("/api/status", methods=["GET"])
def status() -> Response:
    return jsonify({"status": "online", "message": "Anchor Engine is Running"})

@app.route("/api/login", methods=["POST"])
def login() -> tuple[Response, int]:
    data: dict[str, Any] = request.json or {}
    if validate_login(data):
        return jsonify({"success": True, "token": "access_granted_securely"}), 200
    return jsonify({"success": False, "message": "Invalid credentials"}), 401

@app.route("/api/shutdown", methods=["POST"])
def shutdown() -> tuple[Response, int]:
    try:
        pid = os.getpid()
        print(f"Shutting down server (PID: {pid})...")
        os.kill(pid, signal.SIGINT)
        return jsonify({"success": True, "message": "Server shutting down..."}), 200
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route("/api/view_all", methods=["GET"])
def view_all() -> tuple[Response, int]:
    try:
        all_data = db.get_all_data()
        active_inventory = [item for item in all_data if int(item["details"]["qty"]) > 0]
        return jsonify({"success": True, "inventory": active_inventory}), 200
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route("/api/add", methods=["POST"])
def add_stock() -> tuple[Response, int]:
    try:
        data: dict[str, Any] = request.json or {}
        batch_id = data.get("batch_id")
        record = {
            "name": data.get("med_name"),
            "qty": data.get("qty"),
            "expiry": data.get("expiry"),
            "status": "In Stock"
        }
        wal_engine.log_transaction(batch_id, record)
        db.insert(batch_id, record)
        return jsonify({"success": True, "message": f"Batch {batch_id} anchored."}), 200
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route("/api/update", methods=["POST"])
def update_stock() -> tuple[Response, int]:
    try:
        data: dict[str, Any] = request.json or {}
        batch_id = data.get("batch_id")
        new_qty = int(data.get("new_qty")) 

        existing_record = db.search(batch_id)
        if not existing_record:
            return jsonify({"success": False, "message": "Batch ID not found!"}), 404

        updated_record = existing_record.copy()
        updated_record["qty"] = new_qty
        
        message: str
        if new_qty <= 0:
            updated_record["status"] = "Depleted"
            message = f"Batch {batch_id} is empty."
        else:
            message = f"Batch {batch_id} updated to {new_qty}."

        wal_engine.log_transaction(batch_id, updated_record)
        db.insert(batch_id, updated_record)

        return jsonify({"success": True, "message": message}), 200
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500
    
@app.route("/api/search", methods=["POST"])
def search_stock() -> tuple[Response, int]:
    try:
        data: dict[str, Any] = request.json or {}
        result = db.search(data.get("query_id"))
        if result:
            return jsonify({"found": True, "data": result}), 200
        else:
            return jsonify({"found": False, "message": "Batch not found."}), 404
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route("/api/sync", methods=["POST"])
def sync_with_peer() -> tuple[Response, int]:
    try:
        data: dict[str, Any] = request.json or {}
        target_ip = data.get("target_ip")
        if not target_ip:
            return jsonify({"success": False, "message": "Target IP required"}), 400

        my_data = db.get_all_data()
        count = 0
        
        for item in my_data:
            payload = {
                "batch_id": item["batch_id"],
                "med_name": item["details"]["name"],
                "qty": item["details"]["qty"],
                "expiry": item["details"]["expiry"]
            }
            try:
                url = f"http://{target_ip}:5000/api/add"
                requests.post(url, json=payload, timeout=2)
                count += 1
            except:
                continue

        return jsonify({"success": True, "message": f"Synced {count} records."}), 200
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

if __name__ == "__main__":
    app.run(host='0.0.0.0', port=5000, debug=True)
