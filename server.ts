import express from "express";
import { createServer as createViteServer } from "vite";
import { createClient } from '@supabase/supabase-js';
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Supabase Configuration
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://njsjpvjqrnjzignaafbn.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_XcKTe4KVhZKnv4IRdTNKSA_eQuuBI3K';
const supabase = createClient(supabaseUrl, supabaseKey);

export const app = express();

// Set initial state
app.set("ready", false);

async function setupApp() {
  app.use(express.json({ limit: '50mb' }));

  // Loading middleware for root
  app.get("/", (req, res, next) => {
    if (app.get("ready")) {
      next();
    } else {
      res.send(`
        <html>
          <head>
            <title>Starting Server...</title>
            <style>
              body { font-family: system-ui, sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #f9fafb; color: #374151; }
              .spinner { width: 40px; height: 40px; border: 4px solid #e5e7eb; border-top-color: #10b981; border-radius: 50%; animation: spin 1s linear infinite; margin-bottom: 1rem; }
              @keyframes spin { to { transform: rotate(360deg); } }
            </style>
          </head>
          <body>
            <div class="spinner"></div>
            <h1>Initializing Application</h1>
            <p>Please wait while the development server starts up...</p>
            <script>setTimeout(() => location.reload(), 2000)</script>
          </body>
        </html>
      `);
    }
  });

  // Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", database: "supabase", timestamp: new Date().toISOString() });
  });

  app.get("/ping", (req, res) => {
    res.send("pong");
  });

  // Auth API
  app.post("/api/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      
      if (username === 'admin' && password === '12345') {
        return res.json({ role: 'admin', user: { id: 'admin', name: 'Administrator' } });
      }

      const { data: customer, error } = await supabase
        .from('customers')
        .select('*')
        .eq('portal_user_id', username)
        .eq('portal_password', password)
        .maybeSingle();

      if (error) throw error;

      if (customer) {
        return res.json({ role: 'customer', user: customer });
      }

      res.status(401).json({ error: "Invalid credentials" });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Dashboard Stats
  app.get("/api/dashboard/stats", async (req, res) => {
    try {
      const { data: activeLoans, count: activeCount } = await supabase
        .from('loans')
        .select('loan_amount', { count: 'exact' })
        .eq('status', 'active');

      const { count: releasedCount } = await supabase
        .from('items')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'released');

      const { count: overdueCount } = await supabase
        .from('loans')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active')
        .lt('maturity_date', new Date().toISOString().split('T')[0]);

      const { data: upcomingMaturity } = await supabase
        .from('loans')
        .select('*, customers(full_name)')
        .eq('status', 'active')
        .gte('maturity_date', new Date().toISOString().split('T')[0])
        .order('maturity_date', { ascending: true })
        .limit(5);
      
      const totalActiveAmount = activeLoans?.reduce((sum, l) => sum + Number(l.loan_amount), 0) || 0;

      res.json({
        activeLoans: activeCount || 0,
        totalActiveAmount,
        releasedItems: releasedCount || 0,
        overdueLoans: overdueCount || 0,
        upcomingMaturity: upcomingMaturity?.map(l => ({ ...l, customer_name: l.customers?.full_name })) || [],
        dailyCollection: 0,
        monthlyEarnings: 0
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Customers
  app.get("/api/customers", async (req, res) => {
    try {
      const { data } = await supabase
        .from('customers')
        .select('*')
        .order('created_at', { ascending: false });
      res.json(data || []);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/customers", async (req, res) => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .insert([req.body])
        .select()
        .single();

      if (error) throw error;
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.patch("/api/customers/:id/status", async (req, res) => {
    try {
      const { status } = req.body;
      const { error } = await supabase
        .from('customers')
        .update({ status })
        .eq('id', req.params.id);
      
      if (error) return res.status(500).json({ error: error.message });
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Loans
  app.get("/api/loans", async (req, res) => {
    try {
      const customerId = req.query.customerId;
      let query = supabase
        .from('loans')
        .select('*, customers(full_name, mobile_number)');
      
      if (customerId) {
        query = query.eq('customer_id', customerId);
      }
      
      const { data } = await query.order('created_at', { ascending: false });
      res.json(data?.map(l => ({ 
        ...l, 
        customer_name: l.customers?.full_name,
        customer_mobile: l.customers?.mobile_number
      })) || []);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/loans/:id", async (req, res) => {
    try {
      const { data: loan } = await supabase
        .from('loans')
        .select('*, customers(*)')
        .or(`id.eq.${req.params.id},loan_number.eq.${req.params.id}`)
        .single();
      
      if (!loan) return res.status(404).json({ error: "Loan not found" });

      const { data: items } = await supabase.from('items').select('*').eq('loan_id', loan.id);
      const { data: payments } = await supabase.from('payments').select('*').eq('loan_id', loan.id).order('payment_date', { ascending: true });
      const { data: top_ups } = await supabase.from('top_ups').select('*').eq('loan_id', loan.id).order('top_up_date', { ascending: true });
      
      res.json({ 
        ...loan, 
        customer_name: loan.customers?.full_name,
        customer_mobile: loan.customers?.mobile_number,
        items, 
        payments, 
        top_ups 
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/loans", async (req, res) => {
    try {
      const { items, ...loanData } = req.body;
      const loan_number = "LN-" + Date.now();
      
      const { data: loan, error: loanError } = await supabase
        .from('loans')
        .insert([{ ...loanData, loan_number }])
        .select()
        .single();
      
      if (loanError) throw loanError;
      
      if (items && Array.isArray(items)) {
        const itemsToInsert = items.map(item => ({
          ...item,
          loan_id: loan.id
        }));
        await supabase.from('items').insert(itemsToInsert);
      }
      
      res.json({ id: loan.id, loan_number });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/loans/:id/top-up", async (req, res) => {
    try {
      const { amount, date, remarks } = req.body;
      const loanId = req.params.id;

      await supabase.from('top_ups').insert([{ loan_id: loanId, amount, top_up_date: date, remarks }]);
      const { data: loan } = await supabase.from('loans').select('loan_amount').eq('id', loanId).single();
      await supabase.from('loans').update({ loan_amount: Number(loan.loan_amount) + Number(amount) }).eq('id', loanId);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/admin/approve-closure", async (req, res) => {
    try {
      const { loanId, approve } = req.body;
      if (approve) {
        await supabase.from('loans').update({ status: 'closed', closure_requested: false }).eq('id', loanId);
        await supabase.from('items').update({ status: 'released' }).eq('loan_id', loanId);
      } else {
        await supabase.from('loans').update({ closure_requested: false }).eq('id', loanId);
      }
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Payments
  app.get("/api/payments", async (req, res) => {
    try {
      const loanId = req.query.loanId;
      let query = supabase
        .from('payments')
        .select('*, loans(loan_number, customers(full_name))');
      
      if (loanId) {
        query = query.eq('loan_id', loanId);
      }
      
      const { data } = await query.order('payment_date', { ascending: false });
      res.json(data?.map(p => ({ 
        ...p, 
        loan_number: p.loans?.loan_number, 
        customer_name: p.loans?.customers?.full_name 
      })) || []);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/payments", async (req, res) => {
    try {
      const { loan_id, payment_type, ...paymentData } = req.body;
      
      const { data, error } = await supabase
        .from('payments')
        .insert([{ ...paymentData, loan_id, payment_type }])
        .select()
        .single();
      
      if (error) return res.status(500).json({ error: error.message });

      if (payment_type === 'full_settlement') {
        await supabase.from('loans').update({ status: 'closed' }).eq('id', loan_id);
        await supabase.from('items').update({ status: 'released' }).eq('loan_id', loan_id);
      }
      
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/payments/check-transaction/:txId", async (req, res) => {
    try {
      const { data, error } = await supabase
        .from('payments')
        .select('id')
        .eq('transaction_id', req.params.txId)
        .maybeSingle();
      
      if (error) throw error;
      res.json({ exists: !!data });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Lockers
  app.get("/api/lockers", async (req, res) => {
    try {
      const { data: lockers } = await supabase.from('lockers').select('*');
      const { data: boxes } = await supabase.from('boxes').select('locker_id, status');
      
      const result = lockers?.map(l => {
        const occupiedCount = boxes?.filter(b => b.locker_id === l.id && b.status === 'occupied').length || 0;
        return { ...l, occupied_count: occupiedCount };
      });
      
      res.json(result || []);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/lockers", async (req, res) => {
    try {
      const { number, total_boxes } = req.body;
      const { data: locker, error } = await supabase
        .from('lockers')
        .insert([{ number, total_boxes }])
        .select()
        .single();
      
      if (error) throw error;

      // Create boxes
      const boxes = [];
      for (let i = 1; i <= total_boxes; i++) {
        boxes.push({ locker_id: locker.id, box_number: i.toString(), status: 'available' });
      }
      await supabase.from('boxes').insert(boxes);

      res.json(locker);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/lockers/:id/boxes", async (req, res) => {
    try {
      const { data } = await supabase
        .from('boxes')
        .select('*, customers(full_name), loans(loan_number)')
        .eq('locker_id', req.params.id);
      
      res.json(data?.map(b => ({
        ...b,
        customer_name: b.customers?.full_name,
        loan_number: b.loans?.loan_number
      })) || []);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/boxes/:id/assign", async (req, res) => {
    try {
      const { packet_id, loan_id, customer_id } = req.body;
      const { error } = await supabase
        .from('boxes')
        .update({ status: 'occupied', packet_id, loan_id, customer_id })
        .eq('id', req.params.id);
      
      if (error) throw error;
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/boxes/:id/empty", async (req, res) => {
    try {
      const { error } = await supabase
        .from('boxes')
        .update({ status: 'available', packet_id: null, loan_id: null, customer_id: null })
        .eq('id', req.params.id);
      
      if (error) throw error;
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/audit-logs", async (req, res) => {
    try {
      const { data } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      res.json(data || []);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Settings
  app.get("/api/settings", async (req, res) => {
    try {
      const { data } = await supabase.from('settings').select('*');
      const settingsObj = data?.reduce((acc: any, curr: any) => {
        acc[curr.key] = curr.value;
        return acc;
      }, {});
      res.json(settingsObj || {});
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/settings", async (req, res) => {
    try {
      const settings = req.body;
      for (const [key, value] of Object.entries(settings)) {
        await supabase.from('settings').upsert({ key, value: String(value) }, { onConflict: 'key' });
      }
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Reports
  app.get("/api/reports/cash-book", async (req, res) => {
    try {
      const { startDate, endDate } = req.query;
      const { data: payments } = await supabase
        .from('payments')
        .select('*, loans(loan_number, customers(full_name))')
        .eq('payment_mode', 'cash')
        .gte('payment_date', startDate || '1970-01-01')
        .lte('payment_date', endDate || '9999-12-31');

      res.json(payments?.map(p => ({
        direction: 'IN',
        amount: p.amount,
        date: p.payment_date,
        type: p.payment_type,
        loan_number: p.loans?.loan_number,
        customer_name: p.loans?.customers?.full_name,
        remarks: p.remarks
      })) || []);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/reports/bank-book", async (req, res) => {
    try {
      const { startDate, endDate } = req.query;
      const { data: payments } = await supabase
        .from('payments')
        .select('*, loans(loan_number, customers(full_name))')
        .neq('payment_mode', 'cash')
        .gte('payment_date', startDate || '1970-01-01')
        .lte('payment_date', endDate || '9999-12-31');

      res.json(payments?.map(p => ({
        date: p.payment_date,
        type: p.payment_type,
        customer_name: p.loans?.customers?.full_name,
        mode: p.payment_mode,
        transaction_id: p.transaction_id,
        amount: p.amount
      })) || []);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/reports/released-items", async (req, res) => {
    try {
      const { data } = await supabase
        .from('loans')
        .select('*, customers(full_name)')
        .eq('status', 'closed')
        .order('updated_at', { ascending: false });
      
      res.json(data?.map(l => ({
        ...l,
        customer_name: l.customers?.full_name
      })) || []);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/reports/day-book", async (req, res) => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const { data: payments } = await supabase
        .from('payments')
        .select('*, loans(loan_number)')
        .gte('payment_date', today);
      
      const { data: loans } = await supabase
        .from('loans')
        .select('*')
        .gte('created_at', today);

      const transactions = [
        ...(payments?.map(p => ({ time: p.created_at, type: 'Payment', ref: p.loans?.loan_number, amount: p.amount })) || []),
        ...(loans?.map(l => ({ time: l.created_at, type: 'Disbursement', ref: l.loan_number, amount: -l.loan_amount })) || [])
      ].sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());

      res.json(transactions);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/reports/profit-loss", async (req, res) => {
    try {
      const { startDate, endDate } = req.query;
      const { data: payments } = await supabase
        .from('payments')
        .select('amount, payment_type')
        .gte('payment_date', startDate || '1970-01-01')
        .lte('payment_date', endDate || '9999-12-31');

      const interest = payments?.filter(p => p.payment_type === 'interest').reduce((sum, p) => sum + Number(p.amount), 0) || 0;
      const penalty = payments?.filter(p => p.payment_type === 'penalty').reduce((sum, p) => sum + Number(p.amount), 0) || 0;

      res.json({
        income: { interest, penalty, total: interest + penalty },
        expenses: { total: 0 },
        netProfit: interest + penalty
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/reports/ledger/:id", async (req, res) => {
    try {
      const { data: payments } = await supabase
        .from('payments')
        .select('*, loans(loan_number)')
        .eq('customer_id', req.params.id)
        .order('payment_date', { ascending: true });
      
      res.json({ payments: payments?.map(p => ({ ...p, loan_number: p.loans?.loan_number })) || [] });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Global Error Handler
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('Unhandled Error:', err);
    res.status(500).json({ error: 'Internal Server Error', details: err.message });
  });

  console.log(`Environment: NODE_ENV=${process.env.NODE_ENV}, VERCEL=${process.env.VERCEL}`);

  // Vite middleware
  if (process.env.NODE_ENV !== "production" && process.env.VERCEL !== "1") {
    console.log("Starting in Development mode with Vite middleware...");
    try {
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa",
      });
      app.use(vite.middlewares);
      console.log("Vite middleware attached.");
    } catch (viteError) {
      console.error("Failed to create Vite server:", viteError);
      throw viteError;
    }
  } else {
    console.log("Starting in Production mode serving static files...");
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }
}

// Initialize and start the server
async function start() {
  const PORT = 3000;
  
  console.log(`Starting server initialization... Initial state: NODE_ENV=${process.env.NODE_ENV}, VERCEL=${process.env.VERCEL}`);

  try {
    await setupApp();
    app.set("ready", true);
    console.log("Application setup completed successfully.");
    
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server is listening on 0.0.0.0:${PORT}`);
    });
  } catch (err) {
    console.error("CRITICAL: Application setup failed:", err);
    app.set("ready", true);
    // Fallback: start listening anyway so we can at least see error logs via API if possible
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server is listening on 0.0.0.0:${PORT} (FALLBACK MODE)`);
    });
  }
}

if (process.env.VERCEL !== "1") {
  start();
}

export default app;
