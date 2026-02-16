from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import signal
import threading
import time
import atexit
from dotenv import load_dotenv

# Import your B-Tree logic and WAL-engine
from btree_logic import BTree
import wal_engine 

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

# Let wal_engine handle all the pathing logic! We just call recover immediately.
print("CORE: Booting AnchorMed Engine...")
wal_engine.recover_tree(db)

# --- GRACEFUL SHUTDOWN HOOK ---
def cleanup_before_exit():
    print("\n--------------------------------------------------")
    print("CORE: Stopping Anchor Engine...")
    print("WAL: All transactions are anchored to disk.")
    print("CORE: Shutdown Complete.")
    print("--------------------------------------------------")

atexit.register(cleanup_before_exit)

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
    inventory = db.get_all_data() 
    return jsonify({"success": True, "inventory": inventory}), 200

@app.route("/api/add", methods=["POST"])
def add_item():
    data = request.json
    batch_id = data.get("batch_id")
    
    if not batch_id:
        return jsonify({"success": False, "message": "Batch ID required"}), 400

    details = {
        "name": data.get("med_name"),
        "qty": data.get("qty"),
        "expiry": data.get("expiry")
    }

    # 1. Insert into B-Tree (Memory)
    db.insert(batch_id, details)
    
    # 2. Write to WAL (Disk) so it survives a crash!
    wal_engine.log_transaction(batch_id, details)
    
    return jsonify({"success": True, "message": "Batch anchored successfully"}), 200

@app.route("/api/update", methods=["POST"])
def update_item():
    data = request.json
    batch_id = data.get("batch_id")
    new_qty = data.get("new_qty")

    if not batch_id or new_qty is None:
         return jsonify({"success": False, "message": "Missing data"}), 400
    
    current_data = db.search(batch_id)
    if current_data:
        current_data["qty"] = new_qty
        # Log the update to disk!
        wal_engine.log_transaction(batch_id, current_data)
        return jsonify({"success": True, "message": "Stock updated"}), 200
    
    return jsonify({"success": False, "message": "Batch ID not found"}), 404

@app.route("/api/delete", methods=["POST"])
def delete_item():
    data = request.json
    batch_id = data.get("batch_id")

    if not batch_id:
         return jsonify({"success": False, "message": "Missing data"}), 400
    
    current_data = db.search(batch_id)
    if current_data:
        current_data["qty"] = 0
        # Log the soft-delete to disk!
        wal_engine.log_transaction(batch_id, current_data)
        return jsonify({"success": True, "message": "Record deleted"}), 200
        
    return jsonify({"success": False, "message": "Batch ID not found"}), 404

@app.route("/api/sync", methods=["POST"])
def sync_inventory():
    data = request.json
    incoming_inventory = data.get("inventory", [])
    
    if not incoming_inventory:
        return jsonify({"success": False, "message": "No data received"}), 400

    sync_count = 0
    
    for item in incoming_inventory:
        batch_id = item.get("batch_id")
        details = item.get("details")
        
        if not batch_id or not details:
            continue
            
        local_item = db.search(batch_id)
        
        if not local_item:
            # NEW ITEM: Insert and log
            db.insert(batch_id, details)
            wal_engine.log_transaction(batch_id, details)
            sync_count += 1
        else:
            # EXISTING ITEM: Overwrite if quantity differs
            if local_item["qty"] != details["qty"]:
                local_item["qty"] = details["qty"]
                wal_engine.log_transaction(batch_id, local_item)
                sync_count += 1

    return jsonify({
        "success": True, 
        "message": f"Merged {sync_count} records."
    }), 200

# --- SHUTDOWN ROUTE ---
def shutdown_server():
    print("CORE: Shutdown sequence initiated...")
    time.sleep(1) 
    
    print("CORE: Taking Snapshot before shutdown....")
    wal_engine.create_checkpoint(db)
    os.kill(os.getpid(), signal.SIGINT)

@app.route("/api/shutdown", methods=["POST"])
def shutdown():
    threading.Thread(target=shutdown_server).start()
    return jsonify({"success": True, "message": "Server shutting down..."}), 200


if __name__ == "__main__":
    # host="0.0.0.0" is required for other computers to talk to this computer
    app.run(host="0.0.0.0", debug=True, port=5000)
