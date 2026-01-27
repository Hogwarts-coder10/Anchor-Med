import os
import json

# Get the directory where THIS file (wal_engine.py) is located
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# Force the data folder to be inside that directory
DATA_DIR = os.path.join(BASE_DIR, "data")
WAL_FILE = os.path.join(DATA_DIR, "recovery.wal")

# Ensure the 'data' folder exists
os.makedirs(DATA_DIR, exist_ok=True)


def log_transaction(key:str,value:dict) -> None:
    """
    Docstring for log_transaction

    Step 1: Save to the Black Box (Disk)
    We do this BEFORE we touch the B-Tree in memory.
    """

    record = {"k": key,"v" : value}

    # Converting the records to String(JSON) and adding a new line
    entry = json.dumps(record) + "\n"

    # append to the file

    with open(WAL_FILE, "a") as f:
        f.write(entry)

        # now we need to force write this entry on HDD or SSD
        f.flush()
        os.fsync(f.fileno())

    print(f"WAL: Safely anchored '{key}' to disk.")


def recover_tree(btree_instance) -> None:
    """
    Docstring for recover_tree

    Step 2: Replay the Black Box (Recovery)
    Run this when the app starts up to fix the empty memory.
    """

    if not os.path.exists(WAL_FILE):
        print("Clean Start, No history Found")
        return
    
    count = 0
    try:
        with open(WAL_FILE,'r') as f:
            for line in f:
                if line.strip(): # we skip empty lines here.
                    try:
                        data = json.loads(line)
                        # RE-INSERT the data into b-tree
                        btree_instance.insert(data['k'],data['v'])
                        count += 1
                    except ValueError:
                        continue

    except Exception as e:
        print(f"Error reading WAL-FILE: ",{e})

    
    print(f" Recovery Complete. Restored {count} records into B-Tree.")