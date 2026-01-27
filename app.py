from flask import Flask, request, jsonify
from flask_cors import CORS
from btree_logic import BTree
import wal_engine
import os
import requests  # Needed for syncing

app = Flask(__name__)
app.secret_key = "anchormed_secret_key"
CORS(app) # Allows the Flutter/Flet UI to talk to this backend

# --- 1. SETUP ---
db = BTree(t=3)

if not os.path.exists("data"):
    os.makedirs("data")

# --- 2. RECOVERY ---
if os.path.exists("data/recovery.wal"):
    print("⚡ AnchorMed Engine Restarting... Replaying Logs...")
    wal_engine.recover_tree(db)

# --- 3. API ROUTES ---

@app.route("/api/status", methods=["GET"])
def status():
    return jsonify({"status": "online", "message": "Anchor Engine is Running"})

@app.route("/api/login", methods=["POST"])
def login():
    data = request.json
    if data.get("username") == "nurse" and data.get("password") == "admin123":
        return jsonify({"success": True, "token": "access_granted"})
    return jsonify({"success": False, "message": "Invalid credentials"}), 401

# --- FIXED: Consolidated View Route ---
@app.route("/api/view_all", methods=["GET"])
def view_all():
    try:
        all_data = db.get_all_data()
        
        # FILTER: Only show items where quantity is greater than 0
        # This keeps the dashboard clean
        active_inventory = [
            item for item in all_data 
            if int(item["details"]["qty"]) > 0
        ]
        
        return jsonify({"success": True, "inventory": active_inventory})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

# --- NEW: The Missing Route for Sync ---
@app.route("/api/add", methods=["POST"])
def add_stock():
    try:
        data = request.json
        batch_id = data.get("batch_id")
        
        # Build the record
        record = {
            "name": data.get("med_name"),
            "qty": data.get("qty"),
            "expiry": data.get("expiry"),
            "status": "In Stock"
        }

        # 1. Write to Disk (Safety)
        wal_engine.log_transaction(batch_id, record)
        
        # 2. Write to RAM (Speed)
        db.insert(batch_id, record)

        return jsonify({"success": True, "message": f"Batch {batch_id} anchored."})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route("/api/update", methods=["POST"])
def update_stock():
    try:
        data = request.json
        batch_id = data.get("batch_id")
        new_qty = int(data.get("new_qty")) 

        existing_record = db.search(batch_id)
        if not existing_record:
            return jsonify({"success": False, "message": "Batch ID not found!"})

        # Update logic
        updated_record = existing_record.copy()
        updated_record["qty"] = new_qty
        
        if new_qty <= 0:
            updated_record["status"] = "Depleted"
            message = f"Batch {batch_id} is empty."
        else:
            message = f"Batch {batch_id} updated to {new_qty}."

        wal_engine.log_transaction(batch_id, updated_record)
        db.insert(batch_id, updated_record)

        return jsonify({"success": True, "message": message})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500
    
@app.route("/api/search", methods=["POST"])
def search_stock():
    try:
        data = request.json
        result = db.search(data.get("query_id"))
        if result:
            return jsonify({"found": True, "data": result})
        else:
            return jsonify({"found": False, "message": "Batch not found."})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

# --- SYNC ROUTE ---
@app.route("/api/sync", methods=["POST"])
def sync_with_peer():
    """Pushes local inventory to a peer clinic."""
    try:
        target_ip = request.json.get("target_ip")
        if not target_ip:
            return jsonify({"success": False, "message": "Target IP required"}), 400

        # 1. Get all local data
        my_data = db.get_all_data()
        
        count = 0
        errors = 0
        
        # 2. Push each item to the other computer
        for item in my_data:
            payload = {
                "batch_id": item["batch_id"],
                "med_name": item["details"]["name"],
                "qty": item["details"]["qty"],
                "expiry": item["details"]["expiry"]
            }
            try:
                # 3. The Network Call to the /api/add route we just created
                url = f"http://{target_ip}:5000/api/add"
                requests.post(url, json=payload, timeout=2)
                count += 1
            except:
                errors += 1
                continue

        return jsonify({
            "success": True, 
            "message": f"Synced {count} records to {target_ip}. ({errors} failed)"
        })

    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

if __name__ == "__main__":
    # host='0.0.0.0' is critical for the sync demo between two laptops
    app.run(host='0.0.0.0', port=5000, debug=True)