import React, { useState, useEffect } from "react";
import { AlertCircle, Package, Pill, RefreshCw, Search, Plus, Trash2, LogOut, Calendar, AlertTriangle, CheckCircle, Activity, LayoutDashboard, Zap, Power } from "lucide-react";
import CONFIG from "./config.js";

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
        setInventory(data.inventory);
        
        // Calculate comprehensive stats
        const total = data.inventory.length;
        const low = data.inventory.filter(i => parseInt(i.details.qty) < 20).length;
        const expiring = data.inventory.filter(i => {
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
    const endpoint = isUpdate ? "/update" : "/add";
    const payload = isUpdate 
      ? { batch_id: tId, new_qty: tQty } 
      : { batch_id: batchId, med_name: medName, qty: parseInt(qty), expiry };

    try {
      const res = await fetch(`${CONFIG.API_BASE_URL}${endpoint}`, {
        method: "POST", 
        headers: { "Content-Type": "application/json" }, 
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      
      if (data.success) {
        setStatus({ type: "success", message: data.message });
        await fetchInventory();
        
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
    setStatus({ type: "info", message: `Connecting to ${targetIp}...` });
    
    try {
      const res = await fetch(`${CONFIG.API_BASE_URL}/sync`, {
        method: "POST", 
        headers: { "Content-Type": "application/json" }, 
        body: JSON.stringify({ target_ip: targetIp })
      });
      const data = await res.json();
      setStatus({ 
        type: data.success ? "success" : "error", 
        message: data.success ? "Sync complete" : data.message 
      });
    } catch (e) { 
      setStatus({ type: "error", message: "Network error during sync" });
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
      
      // Close window after a short delay
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
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20"></div>
      
      {/* Animated background blobs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-[100px] animate-pulse"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-[100px] animate-pulse delay-700"></div>
      
      <div className="w-full max-w-md mx-4 z-10">
        <div className="bg-zinc-900/40 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 p-8 border-b border-white/5">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-white/10 rounded-lg backdrop-blur-md border border-white/10">
                <Activity size={24} className="text-blue-400" />
              </div>
              <h1 className="text-2xl font-bold text-white tracking-tight">Anchor<span className="text-blue-400">Med</span></h1>
            </div>
            <p className="text-zinc-400 text-sm">Secure WAL-Engine Login</p>
          </div>
          
          <div className="p-8 space-y-5">
            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Operator ID</label>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                onKeyPress={handleKeyPress}
                className="w-full px-4 py-3 bg-black/20 border border-white/10 rounded-xl text-white placeholder-zinc-600 focus:outline-none focus:border-blue-500/50 focus:bg-black/40 transition-all"
                placeholder="Ident Code"
                disabled={loading}
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Passkey</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                onKeyPress={handleKeyPress}
                className="w-full px-4 py-3 bg-black/20 border border-white/10 rounded-xl text-white placeholder-zinc-600 focus:outline-none focus:border-blue-500/50 focus:bg-black/40 transition-all"
                placeholder="••••••••"
                disabled={loading}
              />
            </div>
            
            {authError && (
              <div className="flex items-center gap-3 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                <AlertCircle size={16} className="text-red-400" />
                <p className="text-xs text-red-200">{authError}</p>
              </div>
            )}
            
            <button
              onClick={handleLogin}
              disabled={loading}
              className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-xl shadow-lg shadow-blue-900/20 transition-all hover:scale-[1.02] disabled:opacity-50 disabled:scale-100"
            >
              {loading ? "Authenticating..." : "Initialize Session"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  // --- DASHBOARD ---
  const filteredInventory = inventory.filter(i => 
    i.batch_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    i.details.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex h-screen bg-zinc-950 text-white font-sans overflow-hidden selection:bg-blue-500/30">
      
      {/* SIDEBAR */}
      <div className="w-64 bg-zinc-900/50 backdrop-blur-xl border-r border-white/5 flex flex-col">
        <div className="p-6 border-b border-white/5">
            <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
                <span className="w-2 h-6 bg-gradient-to-b from-blue-400 to-purple-500 rounded-full"></span>
                Anchor<span className="text-zinc-500">Med</span>
            </h1>
            <p className="text-[10px] text-zinc-500 mt-2 font-mono uppercase tracking-widest">v2.1 • Stable Build</p>
        </div>
        
        <nav className="flex-1 p-4 space-y-1">
          <div className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest mb-3 px-2 mt-2">Core</div>
          <button className="w-full flex items-center gap-3 px-3 py-2.5 bg-white/5 text-white rounded-lg font-medium border border-white/5 shadow-inner">
            <LayoutDashboard size={18} className="text-blue-400" />
            <span>Dashboard</span>
          </button>
          
          <button 
            onClick={() => setShowAddModal(true)}
            className="w-full flex items-center gap-3 px-3 py-2.5 text-zinc-400 hover:text-white hover:bg-white/5 rounded-lg transition-all"
          >
            <Plus size={18} />
            <span>Add Stock</span>
          </button>
          
          <button 
            onClick={fetchInventory}
            disabled={loading}
            className="w-full flex items-center gap-3 px-3 py-2.5 text-zinc-400 hover:text-white hover:bg-white/5 rounded-lg transition-all"
          >
            <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
            <span>Refresh</span>
          </button>

          <div className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest mb-3 px-2 mt-8">P2P Network</div>
          <div className="px-2">
            <div className="bg-black/30 p-3 rounded-lg border border-white/5 space-y-2">
                <input
                type="text"
                placeholder="Peer IP Address"
                value={targetIp}
                onChange={e => setTargetIp(e.target.value)}
                className="w-full px-2 py-1.5 text-xs bg-black/50 border border-white/10 rounded text-zinc-300 focus:outline-none focus:border-blue-500/50 font-mono"
                />
                <button 
                onClick={handleSync}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 px-2 py-1.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 text-xs rounded border border-blue-500/20 transition-all font-medium"
                >
                <Zap size={12} /> Sync Node
                </button>
            </div>
          </div>
        </nav>

        {/* SYSTEM ACTIONS FOOTER */}
        <div className="p-4 border-t border-white/5 space-y-2">
          <button 
            onClick={() => setIsLoggedIn(false)}
            className="w-full flex items-center gap-2 px-3 py-2 text-zinc-500 hover:bg-white/5 hover:text-zinc-300 rounded-lg text-sm transition-all"
          >
            <LogOut size={16} />
            <span>Disconnect</span>
          </button>

          {/* SHUTDOWN BUTTON */}
          <button 
            onClick={handleShutdown}
            className="w-full flex items-center gap-2 px-3 py-2 text-red-400/60 hover:bg-red-500/10 hover:text-red-400 rounded-lg text-sm transition-all border border-transparent hover:border-red-500/20"
          >
            <Power size={16} />
            <span>Shutdown System</span>
          </button>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        {/* Subtle background gradient */}
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-blue-900/10 to-purple-900/5 pointer-events-none"></div>

        {/* HEADER BAR */}
        <div className="h-16 border-b border-white/5 flex items-center justify-between px-8 bg-zinc-900/30 backdrop-blur-sm z-10">
             <div className="flex items-center gap-2 text-zinc-500 text-sm">
                <Activity size={16} />
                <span>/</span>
                <span className="text-zinc-300">Live Inventory</span>
             </div>
             
             <div className="flex items-center gap-4">
                 {status.message !== "System Ready" && (
                    <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium border ${
                        status.type === "success" ? "bg-green-500/10 text-green-400 border-green-500/20" :
                        status.type === "error" ? "bg-red-500/10 text-red-400 border-red-500/20" :
                        "bg-blue-500/10 text-blue-400 border-blue-500/20"
                    }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                            status.type === "success" ? "bg-green-400 shadow-[0_0_10px_rgba(74,222,128,0.5)]" :
                            status.type === "error" ? "bg-red-400" :
                            "bg-blue-400 animate-pulse"
                        }`}></span>
                        {status.message}
                    </div>
                 )}
                 <div className="h-8 w-8 bg-zinc-800 rounded-full flex items-center justify-center font-bold text-xs text-zinc-400 border border-white/5">
                     OP
                 </div>
             </div>
        </div>

        <div className="flex-1 overflow-y-auto p-8 z-10">
          {/* STATS ROW */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-zinc-900/50 backdrop-blur-md p-6 rounded-2xl border border-white/5 shadow-xl flex items-center justify-between group hover:border-blue-500/30 transition-all">
              <div>
                <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Total Batches</p>
                <h2 className="text-3xl font-bold text-white mt-1 group-hover:text-blue-400 transition-colors">{stats.total}</h2>
              </div>
              <div className="p-3 bg-blue-500/10 rounded-xl border border-blue-500/20 group-hover:shadow-[0_0_15px_rgba(59,130,246,0.3)] transition-all">
                <Package size={24} className="text-blue-400" />
              </div>
            </div>

            <div className="bg-zinc-900/50 backdrop-blur-md p-6 rounded-2xl border border-white/5 shadow-xl flex items-center justify-between group hover:border-red-500/30 transition-all">
              <div>
                <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Low Stock</p>
                <h2 className="text-3xl font-bold text-white mt-1 group-hover:text-red-400 transition-colors">{stats.lowStock}</h2>
              </div>
              <div className="p-3 bg-red-500/10 rounded-xl border border-red-500/20 group-hover:shadow-[0_0_15px_rgba(239,68,68,0.3)] transition-all">
                <AlertTriangle size={24} className="text-red-400" />
              </div>
            </div>

            <div className="bg-zinc-900/50 backdrop-blur-md p-6 rounded-2xl border border-white/5 shadow-xl flex items-center justify-between group hover:border-amber-500/30 transition-all">
              <div>
                <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Expiring</p>
                <h2 className="text-3xl font-bold text-white mt-1 group-hover:text-amber-400 transition-colors">{stats.expiringSoon}</h2>
              </div>
              <div className="p-3 bg-amber-500/10 rounded-xl border border-amber-500/20 group-hover:shadow-[0_0_15px_rgba(245,158,11,0.3)] transition-all">
                <Calendar size={24} className="text-amber-400" />
              </div>
            </div>
          </div>

          {/* TABLE CONTAINER */}
          <div className="bg-zinc-900/50 backdrop-blur-md border border-white/5 rounded-2xl shadow-xl overflow-hidden flex flex-col min-h-[400px]">
            <div className="p-5 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
              <h2 className="text-lg font-bold text-zinc-100">Database Records</h2>
              <div className="relative w-72">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                <input
                  type="text"
                  placeholder="Query Database..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-sm bg-black/20 border border-white/10 rounded-lg text-zinc-300 focus:outline-none focus:border-blue-500/50 transition-all placeholder-zinc-600"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-white/[0.02]">
                  <tr>
                    <th className="px-6 py-4 text-left text-[10px] font-bold text-zinc-500 uppercase tracking-widest border-b border-white/5">Batch ID</th>
                    <th className="px-6 py-4 text-left text-[10px] font-bold text-zinc-500 uppercase tracking-widest border-b border-white/5">Medicine</th>
                    <th className="px-6 py-4 text-left text-[10px] font-bold text-zinc-500 uppercase tracking-widest border-b border-white/5">Qty</th>
                    <th className="px-6 py-4 text-left text-[10px] font-bold text-zinc-500 uppercase tracking-widest border-b border-white/5">Expiry</th>
                    <th className="px-6 py-4 text-left text-[10px] font-bold text-zinc-500 uppercase tracking-widest border-b border-white/5">Status</th>
                    <th className="px-6 py-4 text-right text-[10px] font-bold text-zinc-500 uppercase tracking-widest border-b border-white/5">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredInventory.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="px-6 py-20 text-center">
                        <div className="flex flex-col items-center justify-center text-zinc-600">
                          <Package size={48} strokeWidth={1} />
                          <p className="mt-4 text-sm font-medium text-zinc-500">No records found locally</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredInventory.map((item) => {
                      const expiryStatus = checkExpiry(item.details.expiry);
                      const qtyNum = parseInt(item.details.qty);
                      
                      return (
                        <tr key={item.batch_id} className="hover:bg-white/[0.02] transition-colors group">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="font-mono text-xs font-medium text-blue-400 bg-blue-500/10 px-2 py-1 rounded border border-blue-500/20">
                                {item.batch_id}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-sm font-medium text-zinc-300 group-hover:text-white transition-colors">{item.details.name}</span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleTransaction(true, item.batch_id, Math.max(0, qtyNum - 10))}
                                disabled={loading || qtyNum === 0}
                                className="w-6 h-6 flex items-center justify-center rounded border border-white/10 text-zinc-500 hover:bg-white/10 hover:text-white transition-all disabled:opacity-30"
                              >
                                −
                              </button>
                              <span className="text-sm font-bold text-zinc-300 w-8 text-center">{item.details.qty}</span>
                              <button
                                onClick={() => handleTransaction(true, item.batch_id, qtyNum + 10)}
                                disabled={loading}
                                className="w-6 h-6 flex items-center justify-center rounded border border-white/10 text-zinc-500 hover:bg-white/10 hover:text-white transition-all disabled:opacity-30"
                              >
                                +
                              </button>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`text-xs font-medium ${
                              expiryStatus === "expired" ? "text-red-400" :
                              expiryStatus === "expiring" ? "text-amber-400" :
                              "text-zinc-500"
                            }`}>
                              {item.details.expiry}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            {qtyNum < 20 ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-red-500/10 text-red-400 border border-red-500/20">LOW</span>
                            ) : expiryStatus === "expired" ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-red-500/10 text-red-400 border border-red-500/20">EXP</span>
                            ) : expiryStatus === "expiring" ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">SOON</span>
                            ) : (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-green-500/10 text-green-400 border border-green-500/20">OK</span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button
                              onClick={() => {
                                if (window.confirm(`Delete record for ${item.details.name}?`)) {
                                  handleTransaction(true, item.batch_id, 0);
                                }
                              }}
                              disabled={loading}
                              className="text-zinc-600 hover:text-red-400 transition-colors p-1"
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
          </div>
        </div>
      </div>

      {/* ADD STOCK MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-white/10 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Plus size={18} className="text-blue-400" />
                Add Batch
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-zinc-500 hover:text-white transition-colors">×</button>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5">Batch ID</label>
                <input
                  type="text"
                  value={batchId}
                  onChange={e => setBatchId(e.target.value)}
                  placeholder="B-2024-001"
                  className={`w-full px-4 py-2.5 bg-black/40 border ${formErrors.batchId ? 'border-red-500/50 bg-red-500/10' : 'border-white/10'} rounded-lg text-sm text-white focus:outline-none focus:border-blue-500/50 transition-all placeholder-zinc-700`}
                />
                {formErrors.batchId && <p className="text-xs text-red-400 mt-1">{formErrors.batchId}</p>}
              </div>
              
              <div>
                <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5">Medicine Name</label>
                <input
                  type="text"
                  value={medName}
                  onChange={e => setMedName(e.target.value)}
                  placeholder="Amoxicillin 500mg"
                  className={`w-full px-4 py-2.5 bg-black/40 border ${formErrors.medName ? 'border-red-500/50 bg-red-500/10' : 'border-white/10'} rounded-lg text-sm text-white focus:outline-none focus:border-blue-500/50 transition-all placeholder-zinc-700`}
                />
                {formErrors.medName && <p className="text-xs text-red-400 mt-1">{formErrors.medName}</p>}
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5">Quantity</label>
                  <input
                    type="number"
                    value={qty}
                    onChange={e => setQty(e.target.value)}
                    placeholder="0"
                    min="1"
                    className={`w-full px-4 py-2.5 bg-black/40 border ${formErrors.qty ? 'border-red-500/50 bg-red-500/10' : 'border-white/10'} rounded-lg text-sm text-white focus:outline-none focus:border-blue-500/50 transition-all placeholder-zinc-700`}
                  />
                  {formErrors.qty && <p className="text-xs text-red-400 mt-1">{formErrors.qty}</p>}
                </div>
                
                <div>
                  <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5">Expiry (YYYY-MM)</label>
                  <input
                    type="text"
                    value={expiry}
                    onChange={e => setExpiry(e.target.value)}
                    placeholder="2025-12"
                    className={`w-full px-4 py-2.5 bg-black/40 border ${formErrors.expiry ? 'border-red-500/50 bg-red-500/10' : 'border-white/10'} rounded-lg text-sm text-white focus:outline-none focus:border-blue-500/50 transition-all placeholder-zinc-700`}
                  />
                  {formErrors.expiry && <p className="text-xs text-red-400 mt-1">{formErrors.expiry}</p>}
                </div>
              </div>
            </div>
            
            <div className="px-6 py-4 bg-white/[0.02] border-t border-white/5 flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setFormErrors({});
                }}
                className="px-4 py-2 text-sm font-medium text-zinc-400 hover:text-white hover:bg-white/5 rounded-lg transition-all"
              >
                Cancel
              </button>
              <button
                onClick={() => handleTransaction(false)}
                disabled={loading}
                className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg shadow-lg shadow-blue-900/20 hover:bg-blue-500 transition-all disabled:opacity-50"
              >
                {loading ? "Writing to Disk..." : "Anchor Batch"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
