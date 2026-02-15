import os
import multiprocessing
import time
from btree_logic import BTree
import wal_engine

def brutal_crash_writer():
    """
    This process acts as the server under heavy load.
    It will intentionally commit seppuku (hard crash) halfway through.
    """
    # 1. Start fresh by wiping old test data
    if os.path.exists("data/recovery.wal"):
        os.remove("data/recovery.wal")
    if os.path.exists("data/checkpoint.json"):
        os.remove("data/checkpoint.json")
        
    db = BTree(t=3)
    print("💥 [SERVER] Processing massive influx of inventory...")
    
    # 2. Rapidly insert 1000 records
    for i in range(1, 1001):
        batch_id = f"CRASH-TEST-{i}"
        payload = {"name": f"Adrenaline-{i}mg", "qty": i, "expiry": "2026-12"}
        
        # Write to Disk (WAL) then Memory (B-Tree)
        wal_engine.log_transaction(batch_id, payload)
        db.insert(batch_id, payload)
        
        # 3. PULL THE POWER PLUG AT EXACTLY RECORD 404
        if i == 404:
            print("\n⚡ [SERVER] FATAL HARDWARE FAULT! SYSTEM POWER LOST AT RECORD 404!")
            print("⚡ [SERVER] (Bypassing graceful shutdown hooks...)")
            os._exit(1)  # This kills the process instantly. No saves. No goodbyes.

if __name__ == "__main__":
    print("=== 🧪 ANCHORMED STRESS TEST: DISASTER RECOVERY ===")
    
    # Step 1: Run the server in an isolated process so its crash doesn't kill our test
    p = multiprocessing.Process(target=brutal_crash_writer)
    p.start()
    p.join() # Wait for the inevitable crash
    
    print("\n🏥 [RECOVERY TEAM] Power restored. Booting Anchor Engine...")
    time.sleep(1) # Dramatic effect
    
    # Step 2: Boot up a fresh engine and attempt recovery
    recovery_db = BTree(t=3)
    wal_engine.recover_tree(recovery_db)
    
    # Step 3: Audit the data
    all_data = recovery_db.get_all_data()
    recovered_count = len(all_data)
    
    print("\n" + "="*50)
    print(f"📊 EXPECTED RECORDS: 404")
    print(f"📊 RECOVERED RECORDS: {recovered_count}")
    
    if recovered_count == 404:
        print("✅ STRESS TEST PASSED: AnchorMed survived a catastrophic power failure with 0% data loss!")
        print("="*50)
    else:
        print("❌ STRESS TEST FAILED: Data corruption or data loss detected.")
        print("="*50)