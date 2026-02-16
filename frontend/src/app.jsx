import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  AlertCircle, Package, RefreshCw, Search, Plus, Trash2, 
  LogOut, Calendar, AlertTriangle, CheckCircle, Activity, 
  LayoutDashboard, Zap, Power 
} from "lucide-react";
import CONFIG from "./config.js";

// --- REUSABLE UI COMPONENTS ---
const StatCard = ({ title, value, icon: Icon, color, delay }) => (
  <motion.div 
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay, duration: 0.4 }}
    className="glass-panel p-6 rounded-2xl group hover:border-white/20 transition-all duration-500"
  >
    <div className="flex justify-between items-start z-10 relative">
      <div>
        <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest mb-1">{title}</p>
        <h3 className="text-3xl font-bold text-white tracking-tight group-hover:scale-105 transition-transform origin-left">{value}</h3>
      </div>
      <div className={`p-3 rounded-xl bg-${color}-500/10 text-${color}-400 group-hover:bg-${color}-500/20 transition-colors`}>
        <Icon size={24} />
      </div>
    </div>
    <div className={`absolute -right-6 -bottom-6 w-24 h-24 bg-${color}-500/10 rounded-full blur-2xl group-hover:bg-${color}-500/30 transition-all duration-500`} />
  </motion.div>
);

function App() {
  // --- AUTH ---
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");

  // --- DATA ---
  const [inventory, setInventory] = useState([]);
  const [stats, setStats] = useState({ total: 0, lowStock: 0, expiringSoon: 0 });
  const [status, setStatus] = useState({ type: "ready", message: "System Ready" });
  const [loading, setLoading] = useState(false);
  
  // --- FORMS ---
  const [showAddModal, setShowAddModal] = useState(false);
  const [batchId, setBatchId] = useState("");
  const [medName, setMedName] = useState("");
  const [qty, setQty] = useState("");
  const [expiry, setExpiry] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [targetIp, setTargetIp] = useState("");
  const [formErrors, setFormErrors] = useState({});

  // --- INIT ---
  useEffect(() => { 
    if(isLoggedIn) fetchInventory(); 
  }, [isLoggedIn]);

  // --- VALIDATION ---
  const validateForm = () => {
    const errors = {};
    if (!batchId.trim()) errors.batchId = "Batch ID is required";
    if (!medName.trim()) errors.medName = "Medicine name is required";
    if (!qty || parseInt(qty) <= 0) errors.qty = "Valid quantity required";
    if (!expiry.match(/^\d{4}-(0[1-9]|1[0-2])$/)) errors.expiry = "Valid expiry date required (YYYY-MM)";
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const checkExpiry = (expiryDate) => {
    const [year, month] = expiryDate.split('-');
    const expiry = new Date(parseInt(year), parseInt(month) - 1);
    const now = new Date();
    const threeMonths = new Date();
    threeMonths.setMonth(threeMonths.getMonth() + 3);
    
    if (expiry < now) return "expired";
    if (expiry < threeMonths) return "expiring";
    return "valid";
  };

  // --- API CALLS ---
  const handleLogin = async () => {
    setAuthError("");
    setLoading(true);
    
    try {
      const res = await fetch(`${CONFIG.API_BASE_URL}/login` ,{
        method: "POST", 
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }) 
      });
      const data = await res.json();
      
      if (data.success) {
        setIsLoggedIn(true);
        setStatus({ type: "success", message: "Login successful" });
      } else {
        setAuthError(data.message || "Invalid credentials");
      }
    } catch (e) { 
      setAuthError("Server is offline. Please contact IT support.");
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !loading) {
      handleLogin();
    }
  };

  const fetchInventory = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${CONFIG.API_BASE_URL}/view_all`);
      const data = await res.json();
      
      if (data.success) {
        // 👇 THE FIX: Strip out deleted (0 qty) items immediately
        const activeInventory = data.inventory.filter(i => parseInt(i.details.qty) > 0);
        
        setInventory(activeInventory);
        
        // Calculate stats based ONLY on active inventory
        const total = activeInventory.length;
        const low = activeInventory.filter(i => parseInt(i.details.qty) < 20).length;
        const expiring = activeInventory.filter(i => {
          const status = checkExpiry(i.details.expiry);
          return status === "expiring" || status === "expired";
        }).length;
        
        setStats({ total, lowStock: low, expiringSoon: expiring });
        setStatus({ type: "success", message: "Inventory synced" });
      }
    } catch (e) { 
      setStatus({ type: "error", message: "Failed to fetch inventory" });
    } finally {
      setLoading(false);
    }
  };

  const handleTransaction = async (isUpdate, tId, tQty) => {
    if (!isUpdate && !validateForm()) return;
    
    setLoading(true);

    // --- DYNAMIC ENDPOINT ROUTING ---
    let endpoint = "/add";
    let payload = {};

    if (isUpdate) {
      if (tQty === 0) {
        endpoint = "/delete"; // Tell the backend to destroy the record
        payload = { batch_id: tId };
      } else {
        endpoint = "/update"; // Normal quantity update
        payload = { batch_id: tId, new_qty: tQty };
      }
    } else {
      // New record creation
      payload = { batch_id: batchId, med_name: medName, qty: parseInt(qty), expiry };
    }

    try {
      const res = await fetch(`${CONFIG.API_BASE_URL}${endpoint}`, {
        method: "POST", 
        headers: { "Content-Type": "application/json" }, 
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      
      if (data.success) {
        setStatus({ type: "success", message: data.message });
        await fetchInventory(); // Refresh the UI
        
        // Clear the form if it was a new addition
        if(!isUpdate) {
          setShowAddModal(false);
          setBatchId("");
          setMedName("");
          setQty("");
          setExpiry("");
          setFormErrors({});
        }
      } else { 
        setStatus({ type: "error", message: data.message });
      }
    } catch (e) { 
      setStatus({ type: "error", message: "Operation failed" });
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    if (!targetIp.trim()) {
      setStatus({ type: "error", message: "Please enter target IP" });
      return;
    }
    
    setLoading(true);
    setStatus({ type: "info", message: `Pulling from ${targetIp}...` });
    
    try {
      // STEP 1: Reach across the network to grab the other computer's data
      const pullRes = await fetch(`http://${targetIp}:5000/api/view_all`);
      if (!pullRes.ok) throw new Error("Could not reach Target");
      const targetData = await pullRes.json();
      
      if (targetData.success && targetData.inventory) {
        setStatus({ type: "info", message: "Merging records locally..." });
        
        // STEP 2: Send that data to YOUR local backend to merge and anchor
        const pushRes = await fetch(`${CONFIG.API_BASE_URL}/sync`, {
          method: "POST", 
          headers: { "Content-Type": "application/json" }, 
          body: JSON.stringify({ inventory: targetData.inventory })
        });
        
        const syncResult = await pushRes.json();
        
        setStatus({ 
          type: syncResult.success ? "success" : "error", 
          message: syncResult.success ? syncResult.message : "Merge failed" 
        });
        
        if (syncResult.success) await fetchInventory(); // Refresh UI
      }
    } catch (e) { 
      setStatus({ type: "error", message: "Network error. Is their app open?" });
    } finally {
      setLoading(false);
    }
  };

  
  // --- SYSTEM CONTROL (Shutdown Logic) ---
  const handleShutdown = async () => {
    if (!window.confirm("⚠️ SYSTEM SHUTDOWN\n\nAre you sure you want to stop the Anchor Engine?")) return;
    
    setStatus({ type: "info", message: "Stopping Engine..." });
    setLoading(true);

    try {
      await fetch(`${CONFIG.API_BASE_URL}/shutdown`, { method: "POST" });
      setStatus({ type: "success", message: "System Offline. Goodbye." });
      
      setTimeout(() => {
        window.close(); 
      }, 1500);

    } catch (e) {
      setStatus({ type: "error", message: "Shutdown signal failed" });
      setLoading(false);
    }
  };

  // --- LOGIN SCREEN ---
  if (!isLoggedIn) return (
    <div className="flex h-screen w-full items-center justify-center bg-zinc-950 relative overflow-hidden">
      {/* Ambient Blobs */}
      <div className="ambient-blob bg-teal-600 w-[500px] h-[500px] -top-20 -left-20 animate-pulse" />
      <div className="ambient-blob bg-blue-600 w-[500px] h-[500px] bottom-0 right-0 delay-700 animate-pulse" />
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md mx-4 z-10 glass-panel p-0"
      >
        <div className="bg-gradient-to-r from-teal-500/10 to-blue-500/10 p-8 border-b border-white/5">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-white/5 rounded-lg border border-white/10 shadow-[0_0_15px_rgba(45,212,191,0.2)]">
              <Activity size={24} className="text-teal-400" />
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Anchor<span className="text-teal-400">Med</span></h1>
          </div>
          <p className="text-zinc-400 text-sm">Secure WAL-Engine Login</p>
        </div>
        
        <div className="p-8 space-y-5">
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Operator ID</label>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              onKeyPress={handleKeyPress}
              className="w-full px-4 py-3 glass-input rounded-xl"
              placeholder="Ident Code"
              disabled={loading}
            />
          </div>
          
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Passkey</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyPress={handleKeyPress}
              className="w-full px-4 py-3 glass-input rounded-xl"
              placeholder="••••••••"
              disabled={loading}
            />
          </div>
          
          <AnimatePresence>
            {authError && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }} 
                animate={{ opacity: 1, height: 'auto' }} 
                exit={{ opacity: 0, height: 0 }}
                className="flex items-center gap-3 p-3 bg-red-500/10 border border-red-500/20 rounded-lg overflow-hidden"
              >
                <AlertCircle size={16} className="text-red-400 flex-shrink-0" />
                <p className="text-xs text-red-200">{authError}</p>
              </motion.div>
            )}
          </AnimatePresence>
          
          <button
            onClick={handleLogin}
            disabled={loading}
            className="w-full py-3 bg-teal-500/20 hover:bg-teal-500/30 text-teal-300 font-medium rounded-xl border border-teal-500/30 shadow-[0_0_20px_rgba(45,212,191,0.1)] transition-all hover:scale-[1.02] disabled:opacity-50 disabled:scale-100"
          >
            {loading ? "Authenticating..." : "Initialize Session"}
          </button>
        </div>
      </motion.div>
    </div>
  );

  // --- DASHBOARD RENDER ---
  const filteredInventory = inventory.filter(i => 
    parseInt(i.details.qty) > 0 && // 👈 THE FIX: Hide items with 0 quantity
    (i.batch_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    i.details.name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="flex h-screen w-full relative overflow-hidden bg-zinc-950">
      
      {/* 1. AMBIENT BACKGROUND */}
      <div className="fixed inset-0 z-0">
        <div className="ambient-blob bg-teal-600 w-[600px] h-[600px] -top-[10%] -left-[10%] animate-pulse" />
        <div className="ambient-blob bg-blue-600 w-[500px] h-[500px] bottom-[10%] right-[-5%]" />
      </div>

      {/* 2. SIDEBAR */}
      <nav className="w-64 z-10 flex flex-col glass-panel border-r border-white/5 rounded-none shadow-none border-y-0 border-l-0">
        <div className="p-8">
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                <div className="w-1.5 h-6 bg-gradient-to-b from-teal-400 to-blue-500 rounded-full shadow-[0_0_10px_rgba(45,212,191,0.5)]"></div>
                Anchor<span className="text-zinc-500">Med</span>
            </h1>
            <p className="text-[10px] text-zinc-500 mt-2 font-mono uppercase tracking-widest pl-3.5">v3.0 • Stable</p>
        </div>
        
        <div className="flex-1 px-4 space-y-2">
          <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest px-2 mb-2">Core</p>
          
          <button className="w-full flex items-center gap-3 px-4 py-3 bg-white/5 text-white rounded-xl font-medium border border-white/5 shadow-inner">
            <LayoutDashboard size={18} className="text-teal-400" />
            <span>Dashboard</span>
          </button>
          
          <button onClick={() => setShowAddModal(true)} className="w-full flex items-center gap-3 px-4 py-3 text-zinc-400 hover:text-white hover:bg-white/5 rounded-xl transition-all group">
            <Plus size={18} className="group-hover:text-teal-400 transition-colors" />
            <span>Add Stock</span>
          </button>
          
          <button onClick={fetchInventory} disabled={loading} className="w-full flex items-center gap-3 px-4 py-3 text-zinc-400 hover:text-white hover:bg-white/5 rounded-xl transition-all group">
            <RefreshCw size={18} className={`group-hover:text-blue-400 transition-colors ${loading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>
        </div>

        <div className="p-4 border-t border-white/5 space-y-4">
            <div className="bg-black/40 p-3 rounded-xl border border-white/5">
                <input
                    type="text"
                    placeholder="Peer IP Address"
                    value={targetIp}
                    onChange={e => setTargetIp(e.target.value)}
                    className="w-full bg-transparent text-xs text-zinc-300 font-mono focus:outline-none mb-2 placeholder-zinc-700"
                />
                <button onClick={handleSync} disabled={loading} className="w-full py-1.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 text-[10px] font-bold uppercase tracking-wider rounded border border-blue-500/20 transition-all flex justify-center items-center gap-2">
                    <Zap size={12} /> {loading ? "Syncing..." : "Sync Node"}
                </button>
            </div>

            <div className="space-y-1 border-t border-white/5 pt-3">
              <button onClick={() => setIsLoggedIn(false)} className="w-full flex items-center gap-2 px-3 py-2 text-zinc-500 hover:text-zinc-300 hover:bg-white/5 rounded-lg text-sm transition-all">
                  <LogOut size={16} />
                  <span>Disconnect</span>
              </button>

              <button onClick={handleShutdown} className="w-full flex items-center gap-2 px-3 py-2 text-red-400/60 hover:text-red-400 hover:bg-red-500/10 rounded-lg text-sm transition-all border border-transparent hover:border-red-500/20">
                  <Power size={16} />
                  <span>Shutdown System</span>
              </button>
            </div>
        </div>
      </nav>

      {/* 3. MAIN CONTENT */}
      <main className="flex-1 z-10 flex flex-col h-full overflow-hidden">
        
        {/* Header */}
        <header className="h-20 px-8 flex items-center justify-between border-b border-white/5 bg-zinc-900/20 backdrop-blur-md">
             <div className="flex items-center gap-3 text-sm">
                <span className="flex items-center gap-2 text-zinc-400 bg-white/5 px-3 py-1.5 rounded-lg border border-white/5 shadow-inner">
                    <Activity size={14} className="text-teal-400" />
                    Live Inventory
                </span>
             </div>
             
             <div className="flex items-center gap-4">
                 <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold border backdrop-blur-md ${
                        status.type === "success" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                        status.type === "error" ? "bg-red-500/10 text-red-400 border-red-500/20" :
                        "bg-blue-500/10 text-blue-400 border-blue-500/20"
                    }`}>
                        <span className={`w-2 h-2 rounded-full ${
                            status.type === "success" ? "bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.5)]" :
                            status.type === "error" ? "bg-red-400" :
                            "bg-blue-400 animate-pulse"
                        }`}></span>
                        {status.message}
                 </div>
                 <div className="h-8 w-8 bg-black/40 rounded-full flex items-center justify-center font-bold text-xs text-zinc-400 border border-white/10 shadow-inner">
                     OP
                 </div>
             </div>
        </header>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-8">
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <StatCard title="Total Batches" value={stats.total} icon={Package} color="blue" delay={0.1} />
            <StatCard title="Low Stock" value={stats.lowStock} icon={AlertTriangle} color="red" delay={0.2} />
            <StatCard title="Expiring" value={stats.expiringSoon} icon={Calendar} color="amber" delay={0.3} />
          </div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="glass-panel rounded-2xl flex flex-col min-h-[500px]"
          >
            <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <CheckCircle size={18} className="text-teal-400" />
                Database Records
              </h2>
              <div className="relative w-80 group">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-teal-400 transition-colors" />
                <input
                  type="text"
                  placeholder="Query Database..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 glass-input rounded-xl text-sm"
                />
              </div>
            </div>

            <div className="flex-1 overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-black/20 text-[10px] font-bold text-zinc-500 uppercase tracking-widest border-b border-white/5">
                  <tr>
                    <th className="px-6 py-4">Batch ID</th>
                    <th className="px-6 py-4">Medicine</th>
                    <th className="px-6 py-4">Qty</th>
                    <th className="px-6 py-4">Expiry</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="text-sm divide-y divide-white/5">
                  {filteredInventory.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="py-24 text-center text-zinc-500">
                        <Package size={48} className="mx-auto mb-3 opacity-20" />
                        No records found locally.
                      </td>
                    </tr>
                  ) : (
                    filteredInventory.map((item) => {
                      const expiryStatus = checkExpiry(item.details.expiry);
                      const qtyNum = parseInt(item.details.qty);
                      
                      return (
                        <tr key={item.batch_id} className="group hover:bg-white/[0.03] transition-colors">
                          <td className="px-6 py-4 font-mono text-xs font-medium text-teal-400">
                            <span className="bg-teal-500/10 px-2 py-1 rounded border border-teal-500/20">{item.batch_id}</span>
                          </td>
                          <td className="px-6 py-4 font-medium text-zinc-300 group-hover:text-white transition-colors">
                            {item.details.name}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                                <button 
                                    onClick={() => handleTransaction(true, item.batch_id, Math.max(0, qtyNum - 1))}
                                    disabled={loading || qtyNum === 0}
                                    className="w-6 h-6 rounded flex items-center justify-center border border-white/10 hover:bg-white/10 hover:text-white text-zinc-500 transition-all disabled:opacity-30"
                                >−</button>
                                <span className="font-mono font-bold w-10 text-center text-zinc-300">{qtyNum}</span>
                                <button 
                                    onClick={() => handleTransaction(true, item.batch_id, qtyNum + 1)}
                                    disabled={loading}
                                    className="w-6 h-6 rounded flex items-center justify-center border border-white/10 hover:bg-white/10 hover:text-white text-zinc-500 transition-all disabled:opacity-30"
                                >+</button>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-zinc-400 text-xs font-mono">{item.details.expiry}</td>
                          <td className="px-6 py-4">
                             {qtyNum < 20 ? (
                                <span className="inline-flex px-2 py-0.5 rounded bg-red-500/10 text-red-400 text-[10px] font-bold border border-red-500/20">LOW</span>
                             ) : expiryStatus === "expired" ? (
                                <span className="inline-flex px-2 py-0.5 rounded bg-red-500/10 text-red-400 text-[10px] font-bold border border-red-500/20">EXP</span>
                             ) : expiryStatus === "expiring" ? (
                                <span className="inline-flex px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 text-[10px] font-bold border border-amber-500/20">SOON</span>
                             ) : (
                                <span className="inline-flex px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[10px] font-bold border border-emerald-500/20">OK</span>
                             )}
                          </td>
                          <td className="px-6 py-4 text-right">
                             <button 
                                onClick={() => window.confirm(`Delete record for ${item.details.name}?`) && handleTransaction(true, item.batch_id, 0)}
                                disabled={loading}
                                className="p-2 text-zinc-600 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                                title="Delete Record"
                             >
                                <Trash2 size={16} />
                             </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </motion.div>
        </div>
      </main>

      {/* 4. ADD STOCK MODAL */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="glass-panel w-full max-w-md p-0 rounded-2xl"
            >
              <div className="px-6 py-5 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <div className="p-1.5 bg-teal-500/20 rounded-lg border border-teal-500/30">
                    <Plus size={16} className="text-teal-400" />
                  </div>
                  Add Batch
                </h3>
                <button onClick={() => { setShowAddModal(false); setFormErrors({}); }} className="text-zinc-500 hover:text-white transition-colors">×</button>
              </div>
              
              <div className="p-6 space-y-5">
                <div>
                  <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Batch ID</label>
                  <input
                    type="text"
                    value={batchId}
                    onChange={e => setBatchId(e.target.value)}
                    placeholder="B-2024-001"
                    className={`w-full px-4 py-3 glass-input rounded-xl text-sm ${formErrors.batchId ? 'border-red-500/50 bg-red-500/10' : ''}`}
                  />
                  {formErrors.batchId && <p className="text-xs text-red-400 mt-1.5">{formErrors.batchId}</p>}
                </div>
                
                <div>
                  <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Medicine Name</label>
                  <input
                    type="text"
                    value={medName}
                    onChange={e => setMedName(e.target.value)}
                    placeholder="Amoxicillin 500mg"
                    className={`w-full px-4 py-3 glass-input rounded-xl text-sm ${formErrors.medName ? 'border-red-500/50 bg-red-500/10' : ''}`}
                  />
                  {formErrors.medName && <p className="text-xs text-red-400 mt-1.5">{formErrors.medName}</p>}
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Quantity</label>
                    <input
                      type="number"
                      value={qty}
                      onChange={e => setQty(e.target.value)}
                      placeholder="0"
                      min="1"
                      className={`w-full px-4 py-3 glass-input rounded-xl text-sm ${formErrors.qty ? 'border-red-500/50 bg-red-500/10' : ''}`}
                    />
                    {formErrors.qty && <p className="text-xs text-red-400 mt-1.5">{formErrors.qty}</p>}
                  </div>
                  
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Expiry (YYYY-MM)</label>
                    <input
                      type="text"
                      value={expiry}
                      onChange={e => setExpiry(e.target.value)}
                      placeholder="2025-12"
                      className={`w-full px-4 py-3 glass-input rounded-xl text-sm ${formErrors.expiry ? 'border-red-500/50 bg-red-500/10' : ''}`}
                    />
                    {formErrors.expiry && <p className="text-xs text-red-400 mt-1.5">{formErrors.expiry}</p>}
                  </div>
                </div>
              </div>
              
              <div className="px-6 py-4 bg-black/40 border-t border-white/5 flex gap-3 justify-end">
                <button
                  onClick={() => { setShowAddModal(false); setFormErrors({}); }}
                  className="px-5 py-2.5 text-sm font-medium text-zinc-400 hover:text-white hover:bg-white/5 rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleTransaction(false)}
                  disabled={loading}
                  className="px-5 py-2.5 text-sm font-bold bg-teal-500/20 hover:bg-teal-500/30 text-teal-300 rounded-xl border border-teal-500/30 shadow-[0_0_15px_rgba(45,212,191,0.1)] transition-all disabled:opacity-50"
                >
                  {loading ? "Writing to Disk..." : "Anchor Batch"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default App;
