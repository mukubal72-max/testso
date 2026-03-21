import React from 'react';
import { 
  Settings as SettingsIcon, 
  UserCog, 
  Shield, 
  Database, 
  Globe, 
  BellRing, 
  Smartphone,
  CreditCard,
  ChevronRight,
  Save,
  Users,
  Eye,
  EyeOff,
  Key,
  AlertCircle,
  RefreshCw,
  Camera,
  Upload,
  Trash2,
  TrendingUp
} from 'lucide-react';
import { motion } from 'framer-motion';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const sections = [
  { id: 'general', title: 'General Settings', icon: Globe, description: 'Branch info, currency, and localization' },
  { id: 'market', title: 'Market Rates', icon: TrendingUp, description: 'Set current gold and silver rates' },
  { id: 'interest', title: 'Interest Rate Table', icon: CreditCard, description: 'Manage standard and penalty rates' },
  { id: 'customers', title: 'Customer Credentials', icon: Users, description: 'Manage Customer Panel IDs and Passwords' },
  { id: 'users', title: 'User Management', icon: UserCog, description: 'Role-based access and staff accounts' },
  { id: 'notifications', title: 'Notification Templates', icon: BellRing, description: 'Customize SMS and WhatsApp messages' },
  { id: 'security', title: 'Security & Compliance', icon: Shield, description: 'Audit logs and data encryption' },
  { id: 'backup', title: 'Backup & Export', icon: Database, description: 'Cloud sync and manual data exports' },
];

import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export default function Settings() {
  const [activeSection, setActiveSection] = React.useState('general');
  const [customers, setCustomers] = React.useState<any[]>([]);
  const [showPassword, setShowPassword] = React.useState<Record<number, boolean>>({});
  const [loading, setLoading] = React.useState(false);
  const [settings, setSettings] = React.useState<any>({
    branchName: 'Digital Communique - Main Branch',
    contactNumber: '+91 98765 43210',
    branchAddress: '123, Gold Plaza, MG Road, Mumbai, Maharashtra - 400001',
    financialYearStart: '2025-04-01',
    currencySymbol: '₹',
    standardInterestRate: '1.5',
    penaltyInterestRate: '2.0',
    gstNumber: '',
    logo: ''
  });

  React.useEffect(() => {
    fetchSettings();
  }, []);

  React.useEffect(() => {
    if (activeSection === 'customers') {
      fetchCustomers();
    }
  }, [activeSection]);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase.from('settings').select('*');
      if (error) throw error;
      
      if (data && data.length > 0) {
        const settingsObj = data.reduce((acc: any, curr: any) => {
          acc[curr.key] = curr.value;
          return acc;
        }, {});
        setSettings(prev => ({ ...prev, ...settingsObj }));
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    }
  };

  const handleSaveSettings = async () => {
    try {
      setLoading(true);
      const upsertData = Object.entries(settings).map(([key, value]) => ({
        key,
        value: String(value)
      }));

      const { error } = await supabase.from('settings').upsert(upsertData, { onConflict: 'key' });
      
      if (error) throw error;
      alert('Settings saved successfully!');
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Failed to save settings');
    } finally {
      setLoading(false);
    }
  };

  const updateSetting = (key: string, value: string) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.from('customers').select('*');
      if (error) throw error;
      setCustomers(data || []);
    } catch (error) {
      console.error('Error fetching customers:', error);
      alert('Failed to load customers');
    } finally {
      setLoading(false);
    }
  };

  const updateCredentials = async (customerId: number, username: string, pass: string) => {
    try {
      const { error } = await supabase
        .from('customers')
        .update({ portal_user_id: username, portal_password: pass })
        .eq('id', customerId);
      
      if (error) throw error;
      fetchCustomers();
    } catch (error) {
      console.error('Error updating credentials:', error);
      alert('Failed to update credentials');
    }
  };

  const togglePassword = (id: number) => {
    setShowPassword(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert('Logo size should be less than 2MB');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        updateSetting('logo', reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-text-dark">System Settings</h1>
          <p className="text-gray-500 mt-1">Configure your Girvi Management platform</p>
        </div>
        <button 
          onClick={handleSaveSettings}
          disabled={loading}
          className="btn-primary flex items-center gap-2 disabled:opacity-50"
        >
          <Save size={18} />
          {loading ? 'Saving...' : 'Save All Changes'}
        </button>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Sidebar Navigation */}
        <div className="lg:col-span-1 space-y-2">
          {sections.map((section) => (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              className={cn(
                "w-full flex items-center gap-3 p-4 rounded-xl transition-all text-left group",
                activeSection === section.id 
                  ? "bg-primary text-white shadow-lg shadow-primary/20" 
                  : "bg-white text-gray-600 hover:bg-gray-50"
              )}
            >
              <section.icon size={20} className={cn(
                activeSection === section.id ? "text-white" : "text-gray-400 group-hover:text-primary"
              )} />
              <div className="flex-1">
                <p className="font-bold text-sm">{section.title}</p>
              </div>
              <ChevronRight size={16} className={activeSection === section.id ? "text-white/50" : "text-gray-300"} />
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="lg:col-span-3 card p-8">
          <div className="mb-8 border-b border-gray-100 pb-6">
            <h2 className="text-2xl font-bold">
              {sections.find(s => s.id === activeSection)?.title}
            </h2>
            <p className="text-gray-500 mt-1">
              {sections.find(s => s.id === activeSection)?.description}
            </p>
          </div>

          <div className="space-y-8">
            {activeSection === 'general' && (
              <div className="space-y-8">
                <div className="flex flex-col md:flex-row gap-8 items-start">
                  <div className="space-y-4">
                    <label className="text-sm font-medium block">Company Logo</label>
                    <div className="relative group">
                      <div className="w-32 h-32 rounded-2xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center overflow-hidden bg-gray-50 group-hover:border-primary/50 transition-colors">
                        {settings.logo ? (
                          <>
                            <img src={settings.logo} alt="Logo" className="w-full h-full object-contain" />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                              <button 
                                onClick={() => updateSetting('logo', '')}
                                className="p-2 bg-rose-500 text-white rounded-lg hover:bg-rose-600 transition-colors"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </>
                        ) : (
                          <>
                            <Camera size={32} className="text-gray-300 mb-2" />
                            <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">Upload Logo</p>
                          </>
                        )}
                      </div>
                      <input 
                        type="file" 
                        accept="image/*" 
                        className="absolute inset-0 opacity-0 cursor-pointer" 
                        onChange={handleLogoUpload}
                      />
                    </div>
                    <p className="text-[10px] text-gray-400 max-w-[128px]">Recommended: Square PNG or JPG, max 2MB</p>
                  </div>

                  <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
                    <div className="space-y-1">
                      <label className="text-sm font-medium">Branch Name</label>
                      <input 
                        className="input-field" 
                        value={settings.branchName} 
                        onChange={(e) => updateSetting('branchName', e.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm font-medium">GST Number (Optional)</label>
                      <input 
                        className="input-field" 
                        placeholder="e.g. 27AAAAA0000A1Z5"
                        value={settings.gstNumber} 
                        onChange={(e) => updateSetting('gstNumber', e.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm font-medium">Contact Number</label>
                      <input 
                        className="input-field" 
                        value={settings.contactNumber} 
                        onChange={(e) => updateSetting('contactNumber', e.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm font-medium">Currency Symbol</label>
                      <input 
                        className="input-field" 
                        value={settings.currencySymbol} 
                        onChange={(e) => updateSetting('currencySymbol', e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-1 md:col-span-2">
                    <label className="text-sm font-medium">Branch Address</label>
                    <textarea 
                      className="input-field h-24" 
                      value={settings.branchAddress} 
                      onChange={(e) => updateSetting('branchAddress', e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium">Financial Year Start</label>
                    <input 
                      type="date" 
                      className="input-field" 
                      value={settings.financialYearStart} 
                      onChange={(e) => updateSetting('financialYearStart', e.target.value)}
                    />
                  </div>
                </div>
              </div>
            )}

            {activeSection === 'market' && (
              <div className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-1">
                    <label className="text-sm font-medium">Gold 24K (per 10g)</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">₹</span>
                      <input 
                        type="number"
                        className="input-field pl-8" 
                        value={settings.gold24k || ''} 
                        onChange={(e) => updateSetting('gold24k', e.target.value)}
                        placeholder="e.g. 72000"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium">Gold 22K (per 10g)</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">₹</span>
                      <input 
                        type="number"
                        className="input-field pl-8" 
                        value={settings.gold22k || ''} 
                        onChange={(e) => updateSetting('gold22k', e.target.value)}
                        placeholder="e.g. 66000"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium">Silver (per 1kg)</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">₹</span>
                      <input 
                        type="number"
                        className="input-field pl-8" 
                        value={settings.silver || ''} 
                        onChange={(e) => updateSetting('silver', e.target.value)}
                        placeholder="e.g. 85000"
                      />
                    </div>
                  </div>
                </div>
                <div className="p-4 bg-amber-50 rounded-xl border border-amber-100 flex gap-3">
                  <AlertCircle className="text-amber-500 shrink-0" size={20} />
                  <p className="text-sm text-amber-800">
                    These rates will be used as default values when creating new loans. 
                    The AI-powered live rates on the dashboard are for reference only.
                  </p>
                </div>
              </div>
            )}

            {activeSection === 'interest' && (
              <div className="space-y-6">
                <div className="p-4 bg-primary/5 rounded-xl border border-primary/10 flex justify-between items-center">
                  <div>
                    <h4 className="font-bold">Standard Interest Rate</h4>
                    <p className="text-xs text-gray-500">Applied to all new Girvi loans by default</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <input 
                      type="number" 
                      step="0.1" 
                      className="w-20 input-field text-center font-bold" 
                      value={settings.standardInterestRate} 
                      onChange={(e) => updateSetting('standardInterestRate', e.target.value)}
                    />
                    <span className="font-bold text-gray-500">% / Mo</span>
                  </div>
                </div>
                <div className="p-4 bg-rose-50 rounded-xl border border-rose-100 flex justify-between items-center">
                  <div>
                    <h4 className="font-bold text-rose-700">Penalty Interest Rate</h4>
                    <p className="text-xs text-rose-500">Applied after loan maturity date</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <input 
                      type="number" 
                      step="0.1" 
                      className="w-20 input-field text-center font-bold text-rose-700 border-rose-200" 
                      value={settings.penaltyInterestRate} 
                      onChange={(e) => updateSetting('penaltyInterestRate', e.target.value)}
                    />
                    <span className="font-bold text-rose-500">% / Mo</span>
                  </div>
                </div>
              </div>
            )}

            {activeSection === 'customers' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-bold">Customer Portal Access</h3>
                  <button 
                    onClick={fetchCustomers}
                    className="text-sm text-primary hover:underline flex items-center gap-1"
                  >
                    <Database size={14} />
                    Refresh List
                  </button>
                </div>
                {loading ? (
                  <div className="text-center py-12">
                    <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
                    <p className="text-gray-500">Loading customer data...</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="text-left text-xs font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100">
                          <th className="pb-4 px-2">Customer</th>
                          <th className="pb-4 px-2">Portal ID (Username)</th>
                          <th className="pb-4 px-2">Password</th>
                          <th className="pb-4 px-2 text-right">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {customers.map((customer) => (
                          <tr key={customer.id} className="group hover:bg-gray-50/50 transition-colors">
                            <td className="py-4 px-2">
                              <p className="font-bold text-gray-900">{customer.name}</p>
                              <p className="text-xs text-gray-500">{customer.mobile}</p>
                            </td>
                            <td className="py-4 px-2">
                              <div className="relative max-w-[160px]">
                                <input 
                                  className="text-sm bg-white border border-gray-200 rounded-lg px-3 py-2 w-full focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                                  defaultValue={customer.portal_user_id || ''}
                                  onBlur={(e) => {
                                    if (e.target.value !== (customer.portal_user_id || '')) {
                                      updateCredentials(customer.id, e.target.value, customer.portal_password || '');
                                    }
                                  }}
                                  placeholder="Not Set"
                                />
                              </div>
                            </td>
                            <td className="py-4 px-2">
                              <div className="flex items-center gap-2 max-w-[180px]">
                                <div className="relative flex-1">
                                  <input 
                                    type={showPassword[customer.id] ? 'text' : 'password'}
                                    className="text-sm bg-white border border-gray-200 rounded-lg px-3 py-2 w-full focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                                    defaultValue={customer.portal_password || ''}
                                    onBlur={(e) => {
                                      if (e.target.value !== (customer.portal_password || '')) {
                                        updateCredentials(customer.id, customer.portal_user_id || '', e.target.value);
                                      }
                                    }}
                                    placeholder="Not Set"
                                  />
                                  <button 
                                    onClick={() => togglePassword(customer.id)}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-primary transition-colors"
                                  >
                                    {showPassword[customer.id] ? <EyeOff size={14} /> : <Eye size={14} />}
                                  </button>
                                </div>
                                <button 
                                  onClick={() => {
                                    const randomPass = Math.random().toString(36).slice(-6).toUpperCase();
                                    updateCredentials(customer.id, customer.portal_user_id || customer.name.split(' ')[0].toLowerCase() + customer.id, randomPass);
                                  }}
                                  className="p-2 text-gray-400 hover:text-primary hover:bg-primary/5 rounded-lg transition-all"
                                  title="Auto-generate"
                                >
                                  <Smartphone size={16} />
                                </button>
                              </div>
                            </td>
                            <td className="py-4 px-2 text-right">
                              {customer.portal_user_id && customer.portal_password ? (
                                <span className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-50 text-emerald-600 rounded-full text-[10px] font-bold uppercase">
                                  <Shield size={10} />
                                  Active
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-50 text-amber-600 rounded-full text-[10px] font-bold uppercase">
                                  <AlertCircle size={10} />
                                  Pending
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                        {customers.length === 0 && (
                          <tr>
                            <td colSpan={4} className="py-12 text-center text-gray-400 italic">
                              No customers found in the system.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {activeSection === 'notifications' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-bold text-text-dark">Notification Templates</h2>
                  <p className="text-sm text-gray-500">Customize automated messages for your customers</p>
                </div>
                <div className="grid grid-cols-1 gap-6">
                  {[
                    { id: 'sms_loan_disbursed', label: 'Loan Disbursed SMS', default: 'Dear {name}, your loan {loan_number} of ₹{amount} has been disbursed. Thank you for choosing us.' },
                    { id: 'sms_payment_received', label: 'Payment Received SMS', default: 'Dear {name}, we have received your payment of ₹{amount} for loan {loan_number}. Current balance: ₹{balance}.' },
                    { id: 'sms_overdue_reminder', label: 'Overdue Reminder SMS', default: 'URGENT: Dear {name}, your loan {loan_number} is overdue. Please visit our branch to avoid penalties.' }
                  ].map((tpl) => (
                    <div key={tpl.id} className="space-y-2">
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">{tpl.label}</label>
                      <textarea 
                        className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all min-h-[100px]"
                        value={settings[tpl.id] || tpl.default}
                        onChange={(e) => updateSetting(tpl.id, e.target.value)}
                      />
                    </div>
                  ))}
                  <button 
                    onClick={handleSaveSettings}
                    disabled={loading}
                    className="btn-primary w-fit flex items-center gap-2"
                  >
                    <Save size={18} />
                    Save Templates
                  </button>
                </div>
              </div>
            )}

            {activeSection === 'backup' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-bold text-text-dark">Backup & Export</h2>
                  <p className="text-sm text-gray-500">Secure your data with manual and automated backups</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="card p-6 border-2 border-primary/10 bg-primary/5">
                    <Database className="text-primary mb-4" size={32} />
                    <h3 className="font-bold text-lg">Supabase Cloud Data</h3>
                    <p className="text-sm text-gray-500 mt-2 mb-6">Your data is securely stored in Supabase with automatic daily backups and point-in-time recovery.</p>
                    <a 
                      href="https://supabase.com/dashboard" 
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-primary inline-flex items-center gap-2"
                    >
                      <Globe size={18} />
                      Open Supabase Dashboard
                    </a>
                  </div>
                  <div className="card p-6 border-2 border-gray-100">
                    <RefreshCw className="text-gray-400 mb-4" size={32} />
                    <h3 className="font-bold text-lg">Local Export</h3>
                    <p className="text-sm text-gray-500 mt-2 mb-6">Export your current data to a JSON format for local record keeping.</p>
                    <button 
                      onClick={() => {
                        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify({ settings, timestamp: new Date().toISOString() }));
                        const downloadAnchorNode = document.createElement('a');
                        downloadAnchorNode.setAttribute("href", dataStr);
                        downloadAnchorNode.setAttribute("download", "settings_backup.json");
                        document.body.appendChild(downloadAnchorNode);
                        downloadAnchorNode.click();
                        downloadAnchorNode.remove();
                      }}
                      className="btn-secondary flex items-center gap-2"
                    >
                      <Upload size={18} />
                      Export Settings JSON
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeSection !== 'general' && activeSection !== 'interest' && activeSection !== 'customers' && activeSection !== 'notifications' && activeSection !== 'backup' && (
              <div className="h-64 flex flex-col items-center justify-center text-gray-400 border-2 border-dashed border-gray-100 rounded-2xl">
                <SettingsIcon size={48} className="mb-4 opacity-10" />
                <p>Configuration options for {sections.find(s => s.id === activeSection)?.title} coming soon</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
