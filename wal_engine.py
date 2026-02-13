import os
import json

# Get the directory where THIS file (wal_engine.py) is located
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "data")
WAL_FILE = os.path.join(DATA_DIR, "recovery.wal")
CHECKPOINT_FILE = os.path.join(DATA_DIR, "checkpoint.json")

# Ensure the 'data' folder exists
os.makedirs(DATA_DIR, exist_ok=True)

def log_transaction(key: str, value: dict) -> None:
    """
    Appends a new transaction to the Write-Ahead Log.
    """
    record = {"k": key, "v": value}
    
    with open(WAL_FILE, "a") as f:
        f.write(json.dumps(record) + "\n")
        f.flush()
        os.fsync(f.fileno()) # Force write to disk

    print(f"WAL: Anchored '{key}' to disk.")

def create_checkpoint(btree_instance) -> None:
    """
     THE SNAPSHOT MECHANISM
    1. Dumps the entire B-Tree memory to 'checkpoint.json'
    2. Wipes 'recovery.wal' clean.
    """
    print("\nWAL: Starting Checkpoint...")
    
    # 1. Get all data from B-Tree
    # Returns list like: [{'batch_id': 'B1', 'details': {...}}, ...]
    all_data = btree_instance.get_all_data() 
    
    # 2. Save Snapshot
    with open(CHECKPOINT_FILE, 'w') as f:
        json.dump(all_data, f)
    
    # 3. Truncate WAL (Wipe it clean)
    with open(WAL_FILE, 'w') as f:
        f.truncate(0)
        
    print(f" WAL: Checkpoint created with {len(all_data)} records. Log cleared.\n")

def recover_tree(btree_instance) -> None:
    """
    RESTORE PROCEDURE:
    1. Load 'checkpoint.json' (The Base)
    2. Replay 'recovery.wal' (The Updates since the checkpoint)
    """
    count = 0
    
    # PHASE 1: Load Snapshot
    if os.path.exists(CHECKPOINT_FILE):
        try:
            with open(CHECKPOINT_FILE, 'r') as f:
                snapshot = json.load(f)
                for item in snapshot:
                    # Note: get_all_data returns 'batch_id' and 'details'
                    btree_instance.insert(item['batch_id'], item['details'])
                    count += 1
            print(f"WAL: Loaded {count} records from Checkpoint.")
        except Exception as e:
            print(f" WAL: Checkpoint corrupted: {e}")

    # PHASE 2: Replay WAL
    if os.path.exists(WAL_FILE):
        wal_count = 0
        try:
            with open(WAL_FILE, 'r') as f:
                for line in f:
                    if line.strip():
                        try:
                            data = json.loads(line)
                            # WAL format is {'k': key, 'v': value}
                            btree_instance.insert(data['k'], data['v'])
                            wal_count += 1
                        except ValueError:
                            continue
            print(f"WAL: Replayed {wal_count} transactions from Log.")
            count += wal_count
        except Exception as e:
            print(f" WAL: Error reading log: {e}")

    print(f" RECOVERY COMPLETE. Total Records: {count}")
