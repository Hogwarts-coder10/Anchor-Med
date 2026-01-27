class BTreeNode:
    """
    Represents a single node within the B-Tree structure.
    
    A node can hold multiple keys and values (up to 2*t - 1). 
    If it is not a leaf, it also holds pointers to child nodes.
    
    Attributes:
        leaf (bool): True if this node is a leaf (has no children), False otherwise.
        keys (list): Sorted list of keys (e.g., Batch IDs) stored in this node.
        values (list): List of values (e.g., Medicine Details) corresponding to the keys.
        children (list): List of BTreeNode objects representing the children of this node.
    """
    def __init__(self, leaf=False):
        self.leaf = leaf
        self.keys = []
        self.values = []
        self.children = []

class BTree:
    """
    A B-Tree data structure implementation for storing key-value pairs.
    
    The B-Tree is a self-balancing search tree that maintains sorted data and allows 
    searches, sequential access, insertions, and deletions in logarithmic time.
    It is optimized for systems that read and write large blocks of data.

    Attributes:
        t (int): The minimum degree of the B-Tree.
                 - Every node (except root) must have at least t-1 keys.
                 - Every node can have at most 2*t - 1 keys.
        root (BTreeNode): The root node of the B-Tree.
    """
    def __init__(self, t):
        """
        Initializes an empty B-Tree.

        Args:
            t (int): The minimum degree 't'. A higher 't' results in a flatter tree.
        """
        self.root = BTreeNode(True)
        self.t = t

    def insert(self, k, v):
        """
        Inserts a new key-value pair into the B-Tree.
        
        If the root node is full, the tree height increases: a new root is created,
        the old root is split, and the new key is inserted into the appropriate child.
        Otherwise, the key is inserted into the non-full root.

        Args:
            k: The key to insert (must be comparable, e.g., integer or string).
            v: The value associated with the key.
        """
        root = self.root
        # Check if the root is full (contains 2*t - 1 keys)
        if len(root.keys) == (2 * self.t) - 1:
            temp = BTreeNode()
            self.root = temp
            # Make the old root a child of the new root
            temp.children.insert(0, root)
            # Split the old root
            self.split_child(temp, 0)
            # Insert the new key into the appropriate child of the new root
            self.insert_non_full(temp, k, v)
        else:
            self.insert_non_full(root, k, v)

    def insert_non_full(self, x, k, v):
        """
        Helper method to insert a key into a node that is not full.
        
        This method handles recursion down the tree. It also includes logic to
        update the value if the key already exists (Duplicate Check).

        Args:
            x (BTreeNode): The current node being examined.
            k: The key to insert.
            v: The value to insert.
        """
        i = len(x.keys) - 1
        
        # --- NEW LOGIC: Check for Duplicates / Update Existing ---
        # Scan to see if 'k' is already in this node.
        # If found, update the value and exit, ensuring unique keys.
        for idx, key in enumerate(x.keys):
            if key == k:
                x.values[idx] = v # UPDATE the existing value
                return 
        # ---------------------------------------------------------

        if x.leaf:
            # If x is a leaf, we find the correct position and insert the key/value directly.
            x.keys.append(None)
            x.values.append(None)
            
            # Shift keys/values greater than k to the right
            while i >= 0 and k < x.keys[i]:
                x.keys[i + 1] = x.keys[i]
                x.values[i + 1] = x.values[i]
                i -= 1
            
            # Insert the new key/value at the correct position
            x.keys[i + 1] = k
            x.values[i + 1] = v
        else:
            # If x is not a leaf, find the child that should contain the key.
            while i >= 0 and k < x.keys[i]:
                i -= 1
            i += 1
            
            # If the found child is full, split it before descending.
            if len(x.children[i].keys) == (2 * self.t) - 1:
                self.split_child(x, i)
                # After split, the middle key moves up. Determine which of the two
                # new children the key 'k' belongs to.
                if k > x.keys[i]:
                    i += 1
            
            # Recurse into the appropriate child
            self.insert_non_full(x.children[i], k, v)

            
    def split_child(self, x, i):
        """
        Splits a full child node into two nodes and promotes the median key to the parent.
        
        This is a critical operation for maintaining B-Tree properties. It ensures 
        nodes do not exceed the maximum number of keys.

        Args:
            x (BTreeNode): The parent node.
            i (int): The index of the child in x.children that is full and needs splitting.
        """
        t = self.t
        y = x.children[i] # The full child node
        z = BTreeNode(y.leaf) # The new node to hold the second half of y's keys
        
        # 1. Save the median data BEFORE truncating y
        # The key at index t-1 is the median (since indices are 0-based and length is 2t-1)
        median_key = y.keys[t-1]
        median_val = y.values[t-1]

        # 2. Move second half of keys/values to z
        # Keys from index t to end go to z
        z.keys = y.keys[t:]
        z.values = y.values[t:]
        
        # If y is not a leaf, move the second half of children to z as well
        if not y.leaf:
            z.children = y.children[t:]
            
        # 3. Truncate y to keep only the first half
        # Keys up to t-1 are kept (median is moved up, so it's not in y anymore)
        y.keys = y.keys[:t-1]
        y.values = y.values[:t-1]
        if not y.leaf:
            y.children = y.children[:t]
            
        # 4. Link everything to parent x
        # Insert z as a child of x immediately after y
        x.children.insert(i + 1, z)
        # Move the median key and value up into x
        x.keys.insert(i, median_key)
        x.values.insert(i, median_val)

    def search(self, k, x=None):
        """
        Searches for a specific key in the B-Tree.

        Args:
            k: The key to search for.
            x (BTreeNode, optional): The node to start searching from. Defaults to root.

        Returns:
            The value associated with key 'k' if found, otherwise None.
        """
        if x is None: x = self.root
        i = 0
        
        # Find the first key greater than or equal to k
        while i < len(x.keys) and k > x.keys[i]:
            i += 1
            
        # If the found key is equal to k, return the value
        if i < len(x.keys) and k == x.keys[i]:
            return x.values[i]
        
        # If key is not found and this is a leaf node, the key doesn't exist
        if x.leaf:
            return None
        
        # Recurse into the appropriate child
        return self.search(k, x.children[i])
    
    def get_all_data(self):
        """
        Retrieves all key-value pairs stored in the tree.
        
        Returns:
            list: A list of dictionaries, where each dict contains 'batch_id' and 'details'.
                  The list is sorted by batch_id (in-order traversal).
        """
        results = []
        self._traverse_node(self.root, results)
        return results

    def _traverse_node(self, node, results):
        """
        Helper method to perform an in-order traversal of the tree.
        
        Args:
            node (BTreeNode): The current node being traversed.
            results (list): The list to append found data to.
        """
        if node:
            # Iterate through keys and interleave child traversals
            for i in range(len(node.keys)):
                # 1. Traverse left child (if not leaf)
                if not node.leaf:
                    self._traverse_node(node.children[i], results)
                
                # 2. Process current key (Batch ID) + Value (Medicine Data)
                results.append({
                    "batch_id": node.keys[i],
                    "details": node.values[i]
                })
            
            # 3. Traverse the last remaining child (rightmost)
            if not node.leaf:
                self._traverse_node(node.children[len(node.keys)], results)
