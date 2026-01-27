class BTreeNode:
    def __init__(self, leaf=False):
        self.leaf = leaf
        self.keys = []
        self.values = []
        self.children = []

class BTree:
    def __init__(self, t):
        self.root = BTreeNode(True)
        self.t = t

    def insert(self, k, v):
        root = self.root
        if len(root.keys) == (2 * self.t) - 1:
            temp = BTreeNode()
            self.root = temp
            temp.children.insert(0, root)
            self.split_child(temp, 0)
            self.insert_non_full(temp, k, v)
        else:
            self.insert_non_full(root, k, v)

    def insert_non_full(self, x, k, v):
        i = len(x.keys) - 1
        
        # --- NEW LOGIC: Check for Duplicates / Update Existing ---
        # We scan to see if 'k' is already in this node
        # (This is a simple linear scan, sufficient for small node sizes)
        for idx, key in enumerate(x.keys):
            if key == k:
                x.values[idx] = v # UPDATE the existing value
                return 
        # ---------------------------------------------------------

        if x.leaf:
            x.keys.append(None)
            x.values.append(None)
            while i >= 0 and k < x.keys[i]:
                x.keys[i + 1] = x.keys[i]
                x.values[i + 1] = x.values[i]
                i -= 1
            x.keys[i + 1] = k
            x.values[i + 1] = v
        else:
            while i >= 0 and k < x.keys[i]:
                i -= 1
            i += 1
            if len(x.children[i].keys) == (2 * self.t) - 1:
                self.split_child(x, i)
                if k > x.keys[i]:
                    i += 1
            self.insert_non_full(x.children[i], k, v)

            
    def split_child(self, x, i):
        t = self.t
        y = x.children[i]
        z = BTreeNode(y.leaf)
        
        # 1. Save the median data BEFORE truncating y (Fixing the bug)
        median_key = y.keys[t-1]
        median_val = y.values[t-1]

        # 2. Move second half to z
        z.keys = y.keys[t:]
        z.values = y.values[t:]
        
        if not y.leaf:
            z.children = y.children[t:]
            
        # 3. Truncate y (Now it's safe)
        y.keys = y.keys[:t-1]
        y.values = y.values[:t-1]
        if not y.leaf:
            y.children = y.children[:t]
            
        # 4. Link everything to parent x
        x.children.insert(i + 1, z)
        x.keys.insert(i, median_key)
        x.values.insert(i, median_val)

    def search(self, k, x=None):
        if x is None: x = self.root
        i = 0
        while i < len(x.keys) and k > x.keys[i]:
            i += 1
        if i < len(x.keys) and k == x.keys[i]:
            return x.values[i]
        if x.leaf:
            return None
        return self.search(k, x.children[i])
    
    def get_all_data(self):
        """Returns a list of all items in the tree."""
        results = []
        self._traverse_node(self.root, results)
        return results

    def _traverse_node(self, node, results):
        if node:
            # 1. Traverse left children
            for i in range(len(node.keys)):
                if not node.leaf:
                    self._traverse_node(node.children[i], results)
                # 2. Add current key (Batch ID) + Value (Medicine Data)
                results.append({
                    "batch_id": node.keys[i],
                    "details": node.values[i]
                })
            # 3. Traverse last child
            if not node.leaf:
                self._traverse_node(node.children[len(node.keys)], results)