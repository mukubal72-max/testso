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
  Filter,
  Loader2,
  Share2
} from 'lucide-react';
import { motion } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { format, differenceInDays, addMonths, addWeeks, addDays, isBefore, isAfter, startOfDay } from 'date-fns';

export default function Alerts() {
  const [alerts, setAlerts] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [stats, setStats] = React.useState({
    critical: 0,
    upcoming: 0,
    sentToday: 0,
    optOut: '0.5%'
  });

  React.useEffect(() => {
    async function fetchAlerts() {
      try {
        setLoading(true);
        const { data: loans, error } = await supabase
          .from('loans')
          .select('*, customers(full_name, mobile_number), payments(*)')
          .eq('status', 'active');

        if (error) throw error;

        const generatedAlerts: any[] = [];
        const today = startOfDay(new Date());
        let criticalCount = 0;
        let upcomingCount = 0;

        loans?.forEach(loan => {
          const customer = loan.customers;
          const maturityDate = new Date(loan.maturity_date);
          const daysToMaturity = differenceInDays(maturityDate, today);

          // 1. Maturity Alerts
          if (daysToMaturity <= 0) {
            criticalCount++;
            generatedAlerts.push({
              id: `maturity-${loan.id}`,
              type: 'overdue',
              customer: customer?.full_name || 'Unknown',
              loan: loan.loan_number,
              amount: `₹${loan.loan_amount.toLocaleString()}`,
              due: daysToMaturity === 0 ? 'Today' : `${Math.abs(daysToMaturity)} Days Ago`,
              status: Math.abs(daysToMaturity) > 30 ? 'critical' : 'urgent',
              channel: 'WhatsApp',
              mobile: customer?.mobile_number
            });
          } else if (daysToMaturity <= 7) {
            upcomingCount++;
            generatedAlerts.push({
              id: `maturity-${loan.id}`,
              type: 'maturity',
              customer: customer?.full_name || 'Unknown',
              loan: loan.loan_number,
              amount: `₹${loan.loan_amount.toLocaleString()}`,
              due: `In ${daysToMaturity} Days`,
              status: 'upcoming',
              channel: 'SMS',
              mobile: customer?.mobile_number
            });
          }

          // 2. Payment Alerts (Interest)
          const lastPayment = loan.payments
            ?.filter((p: any) => p.payment_type === 'interest' || p.payment_type === 'full_settlement')
            .sort((a: any, b: any) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime())[0];

          let nextPaymentDate = new Date(loan.start_date);
          if (lastPayment) {
            nextPaymentDate = new Date(lastPayment.payment_date);
          }

          if (loan.interest_cycle === 'Weekly') {
            nextPaymentDate = addWeeks(nextPaymentDate, 1);
          } else if (loan.interest_cycle === 'Daily') {
            nextPaymentDate = addDays(nextPaymentDate, 1);
          } else {
            nextPaymentDate = addMonths(nextPaymentDate, 1);
          }

          const daysToPayment = differenceInDays(nextPaymentDate, today);
          if (daysToPayment <= 0) {
            generatedAlerts.push({
              id: `payment-${loan.id}`,
              type: 'payment',
              customer: customer?.full_name || 'Unknown',
              loan: loan.loan_number,
              amount: `₹${((loan.loan_amount * loan.interest_rate) / 100).toLocaleString()}`,
              due: daysToPayment === 0 ? 'Today' : `${Math.abs(daysToPayment)} Days Overdue`,
              status: daysToPayment === 0 ? 'pending' : 'urgent',
              channel: 'WhatsApp',
              mobile: customer?.mobile_number
            });
            if (daysToPayment === 0) upcomingCount++;
            else criticalCount++;
          }
        });

        setAlerts(generatedAlerts.sort((a, b) => {
          const statusPriority: any = { critical: 0, urgent: 1, pending: 2, upcoming: 3 };
          return statusPriority[a.status] - statusPriority[b.status];
        }));
        setStats(prev => ({ ...prev, critical: criticalCount, upcoming: upcomingCount }));
      } catch (err) {
        console.error('Error fetching alerts:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchAlerts();
  }, []);

  const handleSendAlert = (alertData: any) => {
    const message = `*Reminder from Girvi Management*\n\nDear ${alertData.customer},\n\nThis is a reminder regarding your loan *${alertData.loan}*.\n\n*Details:*\nType: ${alertData.type === 'payment' ? 'Interest Payment Due' : 
                   alertData.type === 'overdue' ? 'Loan Overdue Notice' : 
                   alertData.type === 'maturity' ? 'Loan Maturity Reminder' : 'Final Auction Warning'}\nAmount: ${alertData.amount}\nStatus: ${alertData.due}\n\nPlease contact us for more details.\n\nThank you!`;
    
    const cleanMobile = alertData.mobile?.replace(/\D/g, '');
    const mobileWithCode = cleanMobile?.length === 10 ? `91${cleanMobile}` : cleanMobile;
    
    if (alertData.channel === 'WhatsApp' && mobileWithCode) {
      const url = `https://wa.me/${mobileWithCode}?text=${encodeURIComponent(message)}`;
      window.open(url, '_blank');
      
      // Update stats locally for demo purposes
      setStats(prev => ({ ...prev, sentToday: prev.sentToday + 1 }));
      setAlerts(prev => prev.filter(a => a.id !== alertData.id));
    } else {
      window.alert(`Sending ${alertData.type} alert to ${alertData.customer} (${alertData.mobile}) via ${alertData.channel}\n\nMessage: ${message}`);
      setStats(prev => ({ ...prev, sentToday: prev.sentToday + 1 }));
      setAlerts(prev => prev.filter(a => a.id !== alertData.id));
    }
  };

  const handleBulkWhatsApp = () => {
    const whatsappAlerts = alerts.filter(a => a.channel === 'WhatsApp');
    if (whatsappAlerts.length === 0) return alert('No pending WhatsApp alerts');
    
    if (!window.confirm(`This will open ${whatsappAlerts.length} WhatsApp chats in new tabs. Do you want to continue?`)) return;
    
    whatsappAlerts.forEach((alertData, index) => {
      setTimeout(() => {
        handleSendAlert(alertData);
      }, index * 1000); // 1 second delay between each to avoid browser blocking
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="animate-spin text-primary" size={48} />
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-text-dark">Alerts & Notifications</h1>
          <p className="text-gray-500 mt-1">Automated reminders and critical notices</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={handleBulkWhatsApp}
            className="btn-secondary flex items-center gap-2"
          >
            <MessageSquare size={18} />
            Bulk WhatsApp
          </button>
          <button 
            onClick={() => window.alert('SMS integration requires a gateway provider (e.g., Twilio, TextLocal).')}
            className="btn-primary flex items-center gap-2"
          >
            <Smartphone size={18} />
            Send SMS
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="card p-6 border-l-4 border-rose-500">
          <p className="text-xs font-bold text-gray-400 uppercase">Critical</p>
          <h4 className="text-2xl font-bold mt-1">{stats.critical}</h4>
          <p className="text-xs text-rose-500 mt-2 flex items-center gap-1">
            <AlertTriangle size={12} />
            Requires immediate action
          </p>
        </div>
        <div className="card p-6 border-l-4 border-amber-500">
          <p className="text-xs font-bold text-gray-400 uppercase">Upcoming</p>
          <h4 className="text-2xl font-bold mt-1">{stats.upcoming}</h4>
          <p className="text-xs text-amber-500 mt-2 flex items-center gap-1">
            <Clock size={12} />
            Due in next 7 days
          </p>
        </div>
        <div className="card p-6 border-l-4 border-emerald-500">
          <p className="text-xs font-bold text-gray-400 uppercase">Sent Today</p>
          <h4 className="text-2xl font-bold mt-1">{stats.sentToday}</h4>
          <p className="text-xs text-emerald-500 mt-2 flex items-center gap-1">
            <CheckCircle2 size={12} />
            All automated alerts delivered
          </p>
        </div>
        <div className="card p-6 border-l-4 border-primary">
          <p className="text-xs font-bold text-gray-400 uppercase">Opt-out Rate</p>
          <h4 className="text-2xl font-bold mt-1">{stats.optOut}</h4>
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
            <button 
              onClick={handleBulkWhatsApp}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-sm font-bold"
            >
              <Share2 size={16} />
              Bulk WhatsApp
            </button>
            <button className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50">
              <Filter size={18} />
            </button>
            <button className="text-sm font-bold text-primary hover:underline">Mark All as Sent</button>
          </div>
        </div>
        <div className="divide-y divide-gray-100">
          {alerts.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              <CheckCircle2 size={48} className="mx-auto text-emerald-500 mb-4 opacity-20" />
              <p>No pending alerts at the moment.</p>
            </div>
          ) : (
            alerts.map((alert) => (
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
                  <button 
                    onClick={() => handleSendAlert(alert)}
                    className="p-3 bg-primary text-white rounded-xl hover:bg-primary/90 transition-all"
                  >
                    <Send size={18} />
                  </button>
                </div>
              </div>
            ))
          )}
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
