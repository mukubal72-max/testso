import React from 'react';
import { 
  Bell, 
  MessageSquare, 
  Smartphone, 
  Mail, 
  Clock, 
  AlertTriangle,
  CheckCircle2,
  Send,
  Filter
} from 'lucide-react';
import { motion } from 'framer-motion';

const alerts = [
  { id: 1, type: 'payment', customer: 'Rajesh Sharma', loan: 'LN-1001', amount: '₹2,500', due: 'Today', status: 'pending', channel: 'WhatsApp' },
  { id: 2, type: 'overdue', customer: 'Sunita Verma', loan: 'LN-0982', amount: '₹15,000', due: '5 Days Ago', status: 'urgent', channel: 'SMS' },
  { id: 3, type: 'maturity', customer: 'Vikram Singh', loan: 'LN-1025', amount: '₹45,000', due: 'In 3 Days', status: 'upcoming', channel: 'Email' },
  { id: 4, type: 'auction', customer: 'Karan Mehra', loan: 'LN-0850', amount: '₹85,000', due: 'Overdue 30 Days', status: 'critical', channel: 'Legal Notice' },
];

export default function Alerts() {
  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-text-dark">Alerts & Notifications</h1>
          <p className="text-gray-500 mt-1">Automated reminders and critical notices</p>
        </div>
        <div className="flex gap-3">
          <button className="btn-secondary flex items-center gap-2">
            <MessageSquare size={18} />
            Bulk WhatsApp
          </button>
          <button className="btn-primary flex items-center gap-2">
            <Smartphone size={18} />
            Send SMS
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="card p-6 border-l-4 border-rose-500">
          <p className="text-xs font-bold text-gray-400 uppercase">Critical</p>
          <h4 className="text-2xl font-bold mt-1">12</h4>
          <p className="text-xs text-rose-500 mt-2 flex items-center gap-1">
            <AlertTriangle size={12} />
            Requires immediate action
          </p>
        </div>
        <div className="card p-6 border-l-4 border-amber-500">
          <p className="text-xs font-bold text-gray-400 uppercase">Upcoming</p>
          <h4 className="text-2xl font-bold mt-1">45</h4>
          <p className="text-xs text-amber-500 mt-2 flex items-center gap-1">
            <Clock size={12} />
            Due in next 7 days
          </p>
        </div>
        <div className="card p-6 border-l-4 border-emerald-500">
          <p className="text-xs font-bold text-gray-400 uppercase">Sent Today</p>
          <h4 className="text-2xl font-bold mt-1">128</h4>
          <p className="text-xs text-emerald-500 mt-2 flex items-center gap-1">
            <CheckCircle2 size={12} />
            All automated alerts delivered
          </p>
        </div>
        <div className="card p-6 border-l-4 border-primary">
          <p className="text-xs font-bold text-gray-400 uppercase">Opt-out Rate</p>
          <h4 className="text-2xl font-bold mt-1">0.5%</h4>
          <p className="text-xs text-primary mt-2 flex items-center gap-1">
            <Smartphone size={12} />
            High customer engagement
          </p>
        </div>
      </div>

      <div className="card">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
          <h3 className="font-bold text-lg">Pending Notifications</h3>
          <div className="flex gap-2">
            <button className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50">
              <Filter size={18} />
            </button>
            <button className="text-sm font-bold text-primary hover:underline">Mark All as Sent</button>
          </div>
        </div>
        <div className="divide-y divide-gray-100">
          {alerts.map((alert) => (
            <div key={alert.id} className="p-6 flex items-center justify-between hover:bg-gray-50 transition-all">
              <div className="flex items-center gap-4">
                <div className={cn(
                  "w-12 h-12 rounded-xl flex items-center justify-center",
                  alert.status === 'critical' ? "bg-rose-50 text-rose-500" : 
                  alert.status === 'urgent' ? "bg-amber-50 text-amber-600" : "bg-primary/5 text-primary"
                )}>
                  <Bell size={24} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-sm">{alert.customer}</h4>
                    <span className={cn(
                      "text-[10px] font-bold uppercase px-2 py-0.5 rounded-full",
                      alert.status === 'critical' ? "bg-rose-100 text-rose-700" : 
                      alert.status === 'urgent' ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700"
                    )}>
                      {alert.status}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {alert.type === 'payment' ? 'Interest Payment Due' : 
                     alert.type === 'overdue' ? 'Loan Overdue Notice' : 
                     alert.type === 'maturity' ? 'Loan Maturity Reminder' : 'Final Auction Warning'}
                    • {alert.loan} • {alert.amount}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-6">
                <div className="text-right">
                  <p className="text-sm font-bold">{alert.due}</p>
                  <p className="text-[10px] text-gray-400 flex items-center justify-end gap-1">
                    <Smartphone size={10} />
                    via {alert.channel}
                  </p>
                </div>
                <button className="p-3 bg-primary text-white rounded-xl hover:bg-primary/90 transition-all">
                  <Send size={18} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
