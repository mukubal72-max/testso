import React from 'react';
import { 
  Gem, 
  Search, 
  Filter, 
  ArrowRight, 
  Box, 
  ShieldCheck,
  History,
  MoreVertical,
  Plus,
  X,
  Calculator
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import { supabase } from '../lib/supabase';

export default function GirviItems() {
  const [items, setItems] = React.useState<any[]>([]);
  const [loans, setLoans] = React.useState<any[]>([]);
  const [search, setSearch] = React.useState('');
  const [selectedItem, setSelectedItem] = React.useState<any>(null);
  const [isAddModalOpen, setIsAddModalOpen] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(true);
  const [newItem, setNewItem] = React.useState({
    loan_id: '',
    type: 'Gold Ornament',
    purity: '22K',
    gross_weight: '',
    net_weight: '',
    wastage: '0',
    market_rate: '',
    valuation: 0,
    packet_number: '',
    locker_location: ''
  });

  React.useEffect(() => {
    fetchItems();
    fetchLoans();
  }, []);

  const fetchItems = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('items')
        .select('*, loans(loan_number, customers(full_name))');
      
      if (error) throw error;
      setItems(data?.map(item => ({
        ...item,
        customer_name: item.loans?.customers?.full_name,
        loan_number: item.loans?.loan_number
      })) || []);
    } catch (err) {
      console.error('Error fetching items:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchLoans = async () => {
    try {
      const { data, error } = await supabase
        .from('loans')
        .select('*, customers(full_name)');
      
      if (error) throw error;
      setLoans(data?.map(l => ({
        ...l,
        customer_name: l.customers?.full_name
      })) || []);
    } catch (err) {
      console.error('Error fetching loans:', err);
    }
  };

  const calculateValuation = (netWeight: string, marketRate: string) => {
    const val = Number(netWeight) * Number(marketRate);
    setNewItem(prev => ({ ...prev, valuation: val }));
  };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { error } = await supabase
        .from('items')
        .insert([{
          ...newItem,
          loan_id: Number(newItem.loan_id),
          gross_weight: Number(newItem.gross_weight),
          net_weight: Number(newItem.net_weight),
          wastage: Number(newItem.wastage),
          market_rate: Number(newItem.market_rate)
        }]);

      if (error) throw error;

      setIsAddModalOpen(false);
      setNewItem({
        loan_id: '',
        type: 'Gold Ornament',
        purity: '22K',
        gross_weight: '',
        net_weight: '',
        wastage: '0',
        market_rate: '',
        valuation: 0,
        packet_number: '',
        locker_location: ''
      });
      fetchItems();
    } catch (err: any) {
      console.error('Error adding item:', err);
      alert('Failed to add item: ' + err.message);
    }
  };

  const filteredItems = items.filter(item => 
    item.type?.toLowerCase().includes(search.toLowerCase()) || 
    item.customer_name?.toLowerCase().includes(search.toLowerCase()) ||
    item.packet_number?.toLowerCase().includes(search.toLowerCase()) ||
    item.loan_number?.toLowerCase().includes(search.toLowerCase())
  );

  const totalValuation = items.reduce((acc, item) => acc + (item.valuation || 0), 0);

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-text-dark">Girvi Item Inventory</h1>
          <p className="text-gray-500 mt-1">Track and manage all pledged physical assets</p>
        </div>
        <div className="flex gap-3">
          <button className="px-4 py-2 border border-gray-200 rounded-lg flex items-center gap-2 hover:bg-gray-50 font-medium">
            <History size={18} />
            Valuation History
          </button>
          <button 
            onClick={() => setIsAddModalOpen(true)}
            className="btn-primary flex items-center gap-2"
          >
            <Plus size={18} />
            Add Item
          </button>
        </div>
      </header>

      {/* Search & Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3 flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="Search by item, customer, or packet ID..." 
              className="input-field pl-10"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button className="px-4 py-2 border border-gray-200 rounded-lg flex items-center gap-2 hover:bg-gray-50">
            <Filter size={18} />
            Filter
          </button>
        </div>
        <div className="card p-4 bg-primary text-white flex items-center justify-between">
          <div>
            <p className="text-xs text-white/70 uppercase font-bold">Total Value</p>
            <h4 className="text-xl font-bold">₹{(totalValuation / 100000).toFixed(2)}L</h4>
          </div>
          <Gem size={24} className="text-secondary" />
        </div>
      </div>

      {/* Items Table */}
      <div className="card">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4 font-semibold">Item Details</th>
                <th className="px-6 py-4 font-semibold">Customer / Loan</th>
                <th className="px-6 py-4 font-semibold">Weight / Purity</th>
                <th className="px-6 py-4 font-semibold">Valuation</th>
                <th className="px-6 py-4 font-semibold">Locker Info</th>
                <th className="px-6 py-4 font-semibold">Status</th>
                <th className="px-6 py-4 font-semibold"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredItems.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50 transition-all group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary/5 text-primary rounded-lg">
                        <Gem size={18} />
                      </div>
                      <div>
                        <p className="font-bold text-sm">{item.type}</p>
                        <p className="text-xs text-gray-500">ID: ITEM-{item.id.toString().padStart(4, '0')}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm font-medium">{item.customer_name}</p>
                    <p className="text-xs text-primary font-bold">{item.loan_number}</p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm font-bold">{item.net_weight}g</p>
                    <p className="text-xs text-gray-500">{item.purity}</p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm font-bold text-emerald-600">₹{(item.valuation ?? 0).toLocaleString()}</p>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-sm">
                      <Box size={14} className="text-gray-400" />
                      {item.packet_number || 'N/A'}
                    </div>
                    <p className="text-[10px] text-gray-400">{item.locker_location}</p>
                  </td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                      item.status === 'pledged' ? "bg-amber-50 text-amber-600" : "bg-emerald-50 text-emerald-600"
                    )}>
                      {item.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button 
                      onClick={() => setSelectedItem(item)}
                      className="p-1 hover:bg-white rounded-md text-gray-400 hover:text-primary transition-colors"
                    >
                      <MoreVertical size={18} />
                    </button>
                  </td>
                </tr>
              ))}
              {filteredItems.length === 0 && !isLoading && (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-400">No items found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Item Modal */}
      <AnimatePresence>
        {isAddModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                <h3 className="text-xl font-bold">Add Item to Inventory</h3>
                <button onClick={() => setIsAddModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-full">
                  <X size={20} />
                </button>
              </div>
              <form onSubmit={handleAddItem} className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 uppercase">Link to Loan</label>
                    <select 
                      required
                      className="input-field"
                      value={newItem.loan_id}
                      onChange={(e) => setNewItem({...newItem, loan_id: e.target.value})}
                    >
                      <option value="">Choose loan...</option>
                      {loans.filter(l => l.status === 'active').map(loan => (
                        <option key={loan.id} value={loan.id}>{loan.loan_number} - {loan.customer_name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 uppercase">Item Type</label>
                    <input 
                      required
                      type="text" 
                      className="input-field" 
                      placeholder="e.g. Gold Chain"
                      value={newItem.type}
                      onChange={(e) => setNewItem({...newItem, type: e.target.value})}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 uppercase">Purity</label>
                    <select 
                      className="input-field"
                      value={newItem.purity}
                      onChange={(e) => setNewItem({...newItem, purity: e.target.value})}
                    >
                      <option>24K</option>
                      <option>22K</option>
                      <option>20K</option>
                      <option>18K</option>
                      <option>925 Silver</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 uppercase">Net Weight (g)</label>
                    <input 
                      required
                      type="number" 
                      step="0.001"
                      className="input-field" 
                      value={newItem.net_weight}
                      onChange={(e) => {
                        setNewItem({...newItem, net_weight: e.target.value});
                        calculateValuation(e.target.value, newItem.market_rate);
                      }}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 uppercase">Market Rate (₹/g)</label>
                    <input 
                      required
                      type="number" 
                      className="input-field" 
                      value={newItem.market_rate}
                      onChange={(e) => {
                        setNewItem({...newItem, market_rate: e.target.value});
                        calculateValuation(newItem.net_weight, e.target.value);
                      }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 uppercase">Packet Number</label>
                    <input 
                      type="text" 
                      className="input-field" 
                      placeholder="e.g. PKT-501"
                      value={newItem.packet_number}
                      onChange={(e) => setNewItem({...newItem, packet_number: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 uppercase">Locker Location</label>
                    <input 
                      type="text" 
                      className="input-field" 
                      placeholder="e.g. Locker A-1"
                      value={newItem.locker_location}
                      onChange={(e) => setNewItem({...newItem, locker_location: e.target.value})}
                    />
                  </div>
                </div>

                <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-emerald-700">
                    <Calculator size={18} />
                    <span className="text-sm font-bold uppercase">Estimated Valuation</span>
                  </div>
                  <span className="text-xl font-bold text-emerald-600">₹{newItem.valuation.toLocaleString()}</span>
                </div>

                <button type="submit" className="w-full btn-primary py-3 mt-4">
                  Add to Inventory
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Item Details Modal */}
      <AnimatePresence>
        {selectedItem && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl p-8 w-full max-w-2xl"
            >
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-2xl font-bold">Item Details</h2>
                  <p className="text-gray-500 text-sm">Packet: {selectedItem.packet_number}</p>
                </div>
                <button onClick={() => setSelectedItem(null)} className="p-2 hover:bg-gray-100 rounded-full">
                  <X size={20} />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <p className="text-xs font-bold text-gray-400 uppercase">Item Type</p>
                    <p className="font-bold text-lg">{selectedItem.type}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-400 uppercase">Purity</p>
                    <p className="font-bold">{selectedItem.purity}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-400 uppercase">Weights</p>
                    <p className="text-sm">Gross: {selectedItem.gross_weight}g</p>
                    <p className="text-sm">Net: {selectedItem.net_weight}g</p>
                    <p className="text-sm">Wastage: {selectedItem.wastage}g</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <p className="text-xs font-bold text-gray-400 uppercase">Valuation</p>
                    <p className="font-bold text-2xl text-emerald-600">₹{selectedItem.valuation.toLocaleString()}</p>
                    <p className="text-xs text-gray-500">@ ₹{selectedItem.market_rate}/g</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-400 uppercase">Storage</p>
                    <p className="text-sm">Locker: {selectedItem.locker_location}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-400 uppercase">Status</p>
                    <span className={cn(
                      "px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                      selectedItem.status === 'pledged' ? "bg-amber-50 text-amber-600" : "bg-emerald-50 text-emerald-600"
                    )}>
                      {selectedItem.status}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-gray-100 flex justify-end">
                <button 
                  onClick={() => setSelectedItem(null)}
                  className="btn-primary px-8 py-2"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
