import os 
import signal
import time
import random
import multiprocessing
from btree_logic import BTree
from wal_engine import log_transaction, recover_tree,WAL_FILE,CHECKPOINT_FILE


def chaos_worker():
    """
    This is the doomed process. It will rapidly insert data and then violently 
    crash itself at a random interval to simulate a sudden power failure.
    """
    print("[CHAOS WORKER] Spawning B-Tree and starting rapid insertions...")
    tree = BTree(t=3)
    
    # Pick a random number of operations before the fatal crash
    crash_point = random.randint(50, 150)
    
    for i in range(1, 200):
        batch_id = f"BATCH_TEST_{i}"
        data = {"med": "Chaos_Pills", "qty": random.randint(10, 100)}
        
        # 1. Log to disk (WAL)
        log_transaction(batch_id, data)
        # 2. Insert to memory (B-Tree)
        tree.insert(batch_id, data)
        
        # THE ANOMALY
        if i == crash_point:
            print(f"\n[CHAOS WORKER] 💥 FATAL CRASH TRIGGERED AT INSERT #{i}! 💥")
            print("[CHAOS WORKER] Simulating total power loss...")
            
            # Violently kill this process immediately. 
            # No cleanup, no finally blocks, no saving memory to disk.
            if os.name == 'nt':
                os.kill(os.getpid(), signal.SIGTERM) # Windows
            else:
                os.kill(os.getpid(), signal.SIGKILL) # Mac/Linux

def verify_recovery():
    """
    The parent process runs this to survey the wreckage and test the WAL.
    """
    print("\n[VERIFIER] Child process terminated abruptly. Initializing recovery sequence...")
    
    # Spin up a brand new, empty B-Tree
    recovered_tree = BTree(t=3)
    
    # Run your custom WAL recovery protocol
    recover_tree(recovered_tree)
    
    # Check what survived in the tree
    surviving_data = recovered_tree.get_all_data()
    tree_count = len(surviving_data)
    
    # Check how many transactions were actually written to the WAL file
    wal_count = 0
    if os.path.exists(WAL_FILE):
        with open(WAL_FILE, 'r') as f:
            wal_count = sum(1 for line in f if line.strip())
            
    # THE MOMENT OF TRUTH
    print(f"\n--- 📊 CHAOS TEST RESULTS ---")
    print(f"Transactions anchored in WAL: {wal_count}")
    print(f"Records recovered in B-Tree:  {tree_count}")
    
    if tree_count == wal_count and tree_count > 0:
        print("\n✅ TEST PASSED: 100% Data Durability! Your WAL engine is bulletproof.")
    else:
        print("\n❌ TEST FAILED: Data mismatch. The database has been corrupted.")

if __name__ == '__main__':
    print("=== ANCHOR-MED AUTOMATED CHAOS TEST SUITE ===")
    
    # 1. Wipe old test files to ensure a clean slate
    if os.path.exists(WAL_FILE):
        os.remove(WAL_FILE)
    if os.path.exists(CHECKPOINT_FILE):
        os.remove(CHECKPOINT_FILE)
        
    # 2. Spawn the worker process
    p = multiprocessing.Process(target=chaos_worker)
    p.start()
    
    # 3. Wait for the worker to inevitably crash
    p.join()
    
    # 4. Verify the aftermath
    verify_recovery()