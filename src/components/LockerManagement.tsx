import React from 'react';
import { 
  Package, 
  Search, 
  LayoutGrid, 
  Box, 
  Lock, 
  Unlock, 
  History,
  AlertTriangle,
  CheckCircle2,
  Plus,
  X,
  ArrowRight,
  ShieldCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

import { supabase } from '../lib/supabase';

export default function LockerManagement() {
  const [lockers, setLockers] = React.useState<any[]>([]);
  const [loans, setLoans] = React.useState<any[]>([]);
  const [auditLogs, setAuditLogs] = React.useState<any[]>([]);
  const [isAddLockerOpen, setIsAddLockerOpen] = React.useState(false);
  const [isAuditLogOpen, setIsAuditLogOpen] = React.useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = React.useState(false);
  const [selectedLocker, setSelectedLocker] = React.useState<any>(null);
  const [selectedBox, setSelectedBox] = React.useState<any>(null);
  const [lockerBoxes, setLockerBoxes] = React.useState<any[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [newLocker, setNewLocker] = React.useState({ number: '', total_boxes: 12 });
  const [assignmentData, setAssignmentData] = React.useState({
    loan_id: '',
    packet_id: ''
  });

  React.useEffect(() => {
    fetchLockers();
    fetchAuditLogs();
    fetchLoans();
  }, []);

  const fetchLockers = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('lockers')
        .select(`
          *,
          boxes:boxes(count)
        `);
      
      if (error) throw error;

      // Get occupied count for each locker
      const { data: occupiedData } = await supabase
        .from('boxes')
        .select('locker_id')
        .eq('status', 'occupied');
      
      const occupiedCounts = (occupiedData || []).reduce((acc: any, box: any) => {
        acc[box.locker_id] = (acc[box.locker_id] || 0) + 1;
        return acc;
      }, {});

      setLockers(data?.map(l => ({
        ...l,
        occupied_count: occupiedCounts[l.id] || 0
      })) || []);
      setIsLoading(false);
    } catch (err) {
      console.error('Error fetching lockers:', err);
      setIsLoading(false);
    }
  };

  const fetchLoans = async () => {
    try {
      const { data, error } = await supabase
        .from('loans')
        .select('*, customers(full_name)');
      if (error) throw error;
      setLoans(data?.map(l => ({ ...l, customer_name: l.customers?.full_name })) || []);
    } catch (err) {
      console.error('Error fetching loans:', err);
    }
  };

  const fetchAuditLogs = async () => {
    try {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setAuditLogs(data || []);
    } catch (err) {
      console.error('Error fetching audit logs:', err);
    }
  };

  const fetchBoxes = async (lockerId: number) => {
    try {
      const { data, error } = await supabase
        .from('boxes')
        .select('*, customers(full_name)')
        .eq('locker_id', lockerId)
        .order('box_number', { ascending: true });
      
      if (error) throw error;
      setLockerBoxes(data?.map(b => ({ ...b, customer_name: b.customers?.full_name })) || []);
    } catch (err) {
      console.error('Error fetching boxes:', err);
    }
  };

  const handleAddLocker = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { data: locker, error: lockerError } = await supabase
        .from('lockers')
        .insert([newLocker])
        .select()
        .single();
      
      if (lockerError) throw lockerError;

      const boxes = Array.from({ length: newLocker.total_boxes }, (_, i) => ({
        locker_id: locker.id,
        box_number: (i + 1).toString(),
        status: 'available'
      }));

      const { error: boxesError } = await supabase.from('boxes').insert(boxes);
      if (boxesError) throw boxesError;

      await supabase.from('audit_logs').insert([{
        action: 'Locker Created',
        details: `Locker ${newLocker.number} with ${newLocker.total_boxes} boxes created.`
      }]);

      setIsAddLockerOpen(false);
      setNewLocker({ number: '', total_boxes: 12 });
      fetchLockers();
      fetchAuditLogs();
    } catch (err: any) {
      console.error('Error adding locker:', err);
      alert('Failed to add locker: ' + err.message);
    }
  };

  const handleAssignBox = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBox || !assignmentData.loan_id) return;

    try {
      const loan = loans.find(l => l.id.toString() === assignmentData.loan_id);
      
      const { error: updateError } = await supabase
        .from('boxes')
        .update({
          status: 'occupied',
          packet_id: assignmentData.packet_id,
          loan_id: assignmentData.loan_id,
          customer_id: loan?.customer_id
        })
        .eq('id', selectedBox.id);

      if (updateError) throw updateError;

      await supabase.from('audit_logs').insert([{
        action: 'Box Assigned',
        details: `Box ${selectedBox.box_number} in Locker ${selectedLocker.number} assigned to Loan ${loan?.loan_number}.`
      }]);

      setIsAssignModalOpen(false);
      setAssignmentData({ loan_id: '', packet_id: '' });
      fetchBoxes(selectedLocker.id);
      fetchLockers();
      fetchAuditLogs();
    } catch (err: any) {
      console.error('Error assigning box:', err);
      alert('Failed to assign box: ' + err.message);
    }
  };

  const handleEmptyBox = async (boxId: number) => {
    try {
      const box = lockerBoxes.find(b => b.id === boxId);
      const { error: updateError } = await supabase
        .from('boxes')
        .update({
          status: 'available',
          packet_id: null,
          loan_id: null,
          customer_id: null
        })
        .eq('id', boxId);

      if (updateError) throw updateError;

      await supabase.from('audit_logs').insert([{
        action: 'Box Emptied',
        details: `Box ${box?.box_number} in Locker ${selectedLocker.number} emptied.`
      }]);

      fetchBoxes(selectedLocker.id);
      fetchLockers();
      fetchAuditLogs();
    } catch (err: any) {
      console.error('Error emptying box:', err);
      alert('Failed to empty box: ' + err.message);
    }
  };

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-text-dark">Inventory & Locker Management</h1>
          <p className="text-gray-500 mt-1">Track physical assets and storage locations</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => setIsAuditLogOpen(true)}
            className="px-4 py-2 border border-gray-200 rounded-lg flex items-center gap-2 hover:bg-gray-50 font-medium"
          >
            <History size={18} />
            Audit Log
          </button>
          <button 
            onClick={() => setIsAddLockerOpen(true)}
            className="btn-primary flex items-center gap-2"
          >
            <Plus size={18} />
            Add New Locker
          </button>
        </div>
      </header>

      {/* Locker Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {lockers.map((locker) => (
          <motion.div 
            key={locker.id}
            whileHover={{ y: -5 }}
            className="card p-6 space-y-4"
          >
            <div className="flex justify-between items-start">
              <div className={cn(
                "p-3 rounded-xl",
                locker.occupied_count >= locker.total_boxes ? "bg-rose-50 text-rose-500" : "bg-emerald-50 text-emerald-500"
              )}>
                <Lock size={24} />
              </div>
              <span className={cn(
                "text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full",
                locker.occupied_count >= locker.total_boxes ? "bg-rose-50 text-rose-500" : "bg-emerald-50 text-emerald-500"
              )}>
                {locker.occupied_count >= locker.total_boxes ? 'Full' : 'Secure'}
              </span>
            </div>
            <div>
              <h3 className="text-xl font-bold">Locker {locker.number}</h3>
              <div className="mt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Occupancy</span>
                  <span className="font-bold">{Math.round((locker.occupied_count / locker.total_boxes) * 100)}%</span>
                </div>
                <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                  <div 
                    className={cn(
                      "h-full transition-all duration-500",
                      locker.occupied_count >= locker.total_boxes ? "bg-rose-500" : "bg-emerald-500"
                    )}
                    style={{ width: `${(locker.occupied_count / locker.total_boxes) * 100}%` }}
                  ></div>
                </div>
                <p className="text-xs text-gray-400">{locker.occupied_count} of {locker.total_boxes} boxes used</p>
              </div>
            </div>
            <button 
              onClick={() => {
                setSelectedLocker(locker);
                fetchBoxes(locker.id);
              }}
              className="w-full py-2 text-sm font-medium text-primary hover:bg-primary/5 rounded-lg transition-all border border-primary/10"
            >
              Manage Boxes
            </button>
          </motion.div>
        ))}
      </div>

      {/* Box Management View */}
      {selectedLocker && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card overflow-hidden"
        >
          <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
            <div className="flex items-center gap-4">
              <button onClick={() => setSelectedLocker(null)} className="p-2 hover:bg-gray-100 rounded-full">
                <X size={20} />
              </button>
              <div>
                <h3 className="font-bold text-lg">Managing Locker {selectedLocker.number}</h3>
                <p className="text-xs text-gray-500">Assign or empty boxes within this locker</p>
              </div>
            </div>
          </div>
          <div className="p-6 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {lockerBoxes.map((box) => (
              <div 
                key={box.id}
                className={cn(
                  "p-4 rounded-xl border-2 transition-all flex flex-col items-center justify-center gap-2",
                  box.status === 'occupied' 
                    ? "border-primary/20 bg-primary/5" 
                    : "border-dashed border-gray-200 hover:border-primary/30"
                )}
              >
                <p className="text-[10px] font-bold text-gray-400 uppercase">Box {box.box_number}</p>
                {box.status === 'occupied' ? (
                  <>
                    <Package size={24} className="text-primary" />
                    <div className="text-center">
                      <p className="text-xs font-bold truncate w-full">{box.packet_id}</p>
                      <p className="text-[10px] text-gray-500 truncate w-full">{box.customer_name}</p>
                    </div>
                    <button 
                      onClick={() => handleEmptyBox(box.id)}
                      className="text-[10px] font-bold text-rose-500 hover:underline"
                    >
                      Empty
                    </button>
                  </>
                ) : (
                  <button 
                    onClick={() => {
                      setSelectedBox(box);
                      setIsAssignModalOpen(true);
                    }}
                    className="flex flex-col items-center gap-1 text-gray-400 hover:text-primary"
                  >
                    <Plus size={20} />
                    <span className="text-[10px] font-bold uppercase">Assign</span>
                  </button>
                )}
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Assign Box Modal */}
      <AnimatePresence>
        {isAssignModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden"
            >
              <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                <h3 className="text-xl font-bold">Assign Box {selectedBox?.box_number}</h3>
                <button onClick={() => setIsAssignModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-full">
                  <X size={20} />
                </button>
              </div>
              <form onSubmit={handleAssignBox} className="p-6 space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase">Select Loan / Customer</label>
                  <select 
                    required
                    className="input-field"
                    value={assignmentData.loan_id}
                    onChange={(e) => setAssignmentData({...assignmentData, loan_id: e.target.value})}
                  >
                    <option value="">Choose loan...</option>
                    {loans.map(loan => (
                      <option key={loan.id} value={loan.id}>{loan.loan_number} - {loan.customer_name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase">Packet ID / Reference</label>
                  <input 
                    required
                    type="text" 
                    className="input-field" 
                    placeholder="e.g. PKT-001"
                    value={assignmentData.packet_id}
                    onChange={(e) => setAssignmentData({...assignmentData, packet_id: e.target.value})}
                  />
                </div>
                <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
                  <p className="text-xs text-blue-700 leading-relaxed">
                    Assigning this box will link it to the selected loan. The locker and box number will be visible in the loan details.
                  </p>
                </div>
                <button type="submit" className="w-full btn-primary py-3 mt-4">
                  Confirm Assignment
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add Locker Modal */}
      <AnimatePresence>
        {isAddLockerOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden"
            >
              <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                <h3 className="text-xl font-bold">Add New Locker</h3>
                <button onClick={() => setIsAddLockerOpen(false)} className="p-2 hover:bg-gray-100 rounded-full">
                  <X size={20} />
                </button>
              </div>
              <form onSubmit={handleAddLocker} className="p-6 space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase">Locker Number</label>
                  <input 
                    required
                    type="text" 
                    className="input-field" 
                    placeholder="e.g. L-005"
                    value={newLocker.number}
                    onChange={(e) => setNewLocker({...newLocker, number: e.target.value})}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase">Total Boxes</label>
                  <input 
                    required
                    type="number" 
                    className="input-field" 
                    value={newLocker.total_boxes}
                    onChange={(e) => setNewLocker({...newLocker, total_boxes: parseInt(e.target.value)})}
                  />
                </div>
                <button type="submit" className="w-full btn-primary py-3 mt-4">
                  Create Locker
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Audit Log Modal */}
      <AnimatePresence>
        {isAuditLogOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                <h3 className="text-xl font-bold">Locker Audit Log</h3>
                <button onClick={() => setIsAuditLogOpen(false)} className="p-2 hover:bg-gray-100 rounded-full">
                  <X size={20} />
                </button>
              </div>
              <div className="max-h-[60vh] overflow-y-auto p-0">
                <table className="w-full text-left">
                  <thead className="bg-gray-50 text-gray-500 text-[10px] uppercase tracking-wider sticky top-0">
                    <tr>
                      <th className="px-6 py-4 font-bold">Action</th>
                      <th className="px-6 py-4 font-bold">Details</th>
                      <th className="px-6 py-4 font-bold">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {auditLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-gray-50 transition-all">
                        <td className="px-6 py-4">
                          <span className="text-xs font-bold text-primary">{log.action}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-xs text-gray-600">{log.details}</span>
                        </td>
                        <td className="px-6 py-4 text-xs text-gray-400">
                          {format(new Date(log.created_at), 'dd MMM yyyy HH:mm')}
                        </td>
                      </tr>
                    ))}
                    {auditLogs.length === 0 && (
                      <tr>
                        <td colSpan={3} className="px-6 py-12 text-center text-gray-400">No logs found</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
