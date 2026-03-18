import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';

export const exportToPDF = (title: string, headers: string[], data: any[][], filename: string, settings?: any) => {
  const doc = new jsPDF();
  
  // Shop Header
  if (settings) {
    doc.setFontSize(20);
    doc.setTextColor(44, 90, 160);
    doc.text(settings.shop_name || 'GOLD GIRVI MANAGEMENT', 105, 15, { align: 'center' });
    
    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.text(settings.shop_address || '', 105, 22, { align: 'center' });
    doc.text(`Phone: ${settings.shop_mobile || ''}`, 105, 27, { align: 'center' });
    
    doc.setDrawColor(200);
    doc.line(14, 32, 196, 32);
  }

  // Add Title
  doc.setFontSize(16);
  doc.setTextColor(0);
  doc.text(title, 14, settings ? 42 : 22);
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Generated on: ${format(new Date(), 'dd MMM yyyy HH:mm')}`, 14, settings ? 48 : 30);
  
  autoTable(doc, {
    head: [headers],
    body: data,
    startY: settings ? 55 : 35,
    theme: 'grid',
    headStyles: { fillColor: [44, 90, 160], textColor: 255 },
    alternateRowStyles: { fillColor: [245, 245, 245] },
  });
  
  doc.save(`${filename}.pdf`);
};

export const exportToExcel = (data: any[], filename: string) => {
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Report");
  XLSX.writeFile(workbook, `${filename}.xlsx`);
};

export const printTable = (title: string, headers: string[], data: any[][], settings?: any) => {
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  const html = `
    <html>
      <head>
        <title>${title}</title>
        <style>
          body { font-family: sans-serif; padding: 20px; color: #333; }
          .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #2C5AA0; padding-bottom: 20px; }
          .shop-name { font-size: 28px; font-bold; color: #2C5AA0; margin-bottom: 5px; }
          .shop-info { font-size: 14px; color: #666; }
          h1 { color: #2C5AA0; font-size: 20px; margin-top: 20px; }
          .meta { font-size: 12px; color: #888; margin-bottom: 20px; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          th, td { border: 1px solid #ddd; padding: 10px; text-align: left; font-size: 12px; }
          th { background-color: #f8f9fa; font-weight: bold; color: #2C5AA0; }
          .footer { margin-top: 40px; font-size: 11px; color: #999; text-align: center; border-top: 1px solid #eee; padding-top: 20px; }
        </style>
      </head>
      <body>
        ${settings ? `
          <div class="header">
            <div class="shop-name">${settings.shop_name || 'GOLD GIRVI MANAGEMENT'}</div>
            <div class="shop-info">${settings.shop_address || ''}</div>
            <div class="shop-info">Phone: ${settings.shop_mobile || ''}</div>
          </div>
        ` : ''}
        <h1>${title}</h1>
        <div class="meta">Generated on: ${format(new Date(), 'dd MMM yyyy HH:mm')}</div>
        <table>
          <thead>
            <tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr>
          </thead>
          <tbody>
            ${data.map(row => `<tr>${row.map(cell => `<td>${cell}</td>`).join('')}</tr>`).join('')}
          </tbody>
        </table>
        <div class="footer">
          © ${new Date().getFullYear()} ${settings?.shop_name || 'Girvi Loan Management System'} | Computer Generated Report
        </div>
        <script>
          window.onload = () => {
            window.print();
            window.onafterprint = () => window.close();
          };
        </script>
      </body>
    </html>
  `;

  printWindow.document.write(html);
  printWindow.document.close();
};

export const generateLoanReceipt = (loan: any, settings?: any) => {
  const doc = new jsPDF();
  
  // Header with Shop Info
  doc.setFontSize(22);
  doc.setTextColor(44, 90, 160);
  doc.text(settings?.shop_name || 'GOLD GIRVI MANAGEMENT', 105, 20, { align: 'center' });
  
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(settings?.shop_address || 'Shop Address Not Set', 105, 27, { align: 'center' });
  doc.text(`Phone: ${settings?.shop_mobile || 'N/A'}`, 105, 32, { align: 'center' });
  
  doc.setDrawColor(200);
  doc.line(14, 38, 196, 38);
  
  // Receipt Title
  doc.setFontSize(16);
  doc.setTextColor(44, 90, 160);
  doc.setFont('helvetica', 'bold');
  doc.text('LOAN DISBURSEMENT RECEIPT', 105, 48, { align: 'center' });
  
  // Basic Info
  doc.setFontSize(10);
  doc.setTextColor(0);
  doc.setFont('helvetica', 'normal');
  doc.text(`Receipt No: ${loan.loan_number}`, 14, 58);
  doc.text(`Date: ${format(new Date(loan.created_at), 'dd MMM yyyy HH:mm')}`, 14, 63);
  
  // Customer Info
  doc.setDrawColor(240);
  doc.setFillColor(250, 250, 250);
  doc.rect(14, 70, 182, 30, 'F');

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Customer Details', 20, 78);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`Name: ${loan.customer_name}`, 20, 85);
  doc.text(`Mobile: ${loan.customer_mobile}`, 20, 92);
  
  // Loan Details
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Loan Terms', 14, 110);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  
  const loanDetails = [
    ['Principal Amount', `INR ${(loan.loan_amount || loan.amount)?.toLocaleString()}`],
    ['Interest Rate', `${loan.monthly_interest || loan.interest_rate}% per month`],
    ['Interest Cycle', loan.interest_cycle || 'Monthly'],
    ['Start Date', format(new Date(loan.start_date || loan.created_at), 'dd MMM yyyy')],
    ['Maturity Date', loan.maturity_date ? format(new Date(loan.maturity_date), 'dd MMM yyyy') : 'N/A'],
  ];
  
  autoTable(doc, {
    body: loanDetails,
    startY: 115,
    theme: 'grid',
    styles: { fontSize: 10, cellPadding: 3 },
    columnStyles: { 0: { fontStyle: 'bold', fillColor: [245, 245, 245], cellWidth: 50 } }
  });
  
  // Items
  if (loan.items && loan.items.length > 0) {
    const startY = (doc as any).lastAutoTable.finalY + 15;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Pledged Items', 14, startY);
    
    const itemHeaders = ['Type', 'Purity', 'Weight', 'Packet', 'Valuation'];
    const itemData = loan.items.map((item: any) => [
      item.type || item.item_type,
      item.purity,
      `${item.net_weight}g`,
      item.packet_number,
      `INR ${(item.valuation || item.estimated_valuation)?.toLocaleString()}`
    ]);
    
    autoTable(doc, {
      head: [itemHeaders],
      body: itemData,
      startY: startY + 5,
      theme: 'grid',
      headStyles: { fillColor: [44, 90, 160] },
      styles: { fontSize: 9 }
    });
  }
  
  // Signature Section
  const finalY = (doc as any).lastAutoTable.finalY + 40;
  doc.setDrawColor(200);
  doc.line(20, finalY, 70, finalY);
  doc.line(140, finalY, 190, finalY);
  
  doc.setFontSize(10);
  doc.text('Customer Signature', 45, finalY + 7, { align: 'center' });
  doc.text('Authorized Signatory & Stamp', 165, finalY + 7, { align: 'center' });
  
  // Footer
  doc.setFontSize(9);
  doc.setTextColor(150);
  doc.text('This is a computer generated receipt and does not require a physical signature.', 105, 280, { align: 'center' });
  
  doc.save(`Loan_Receipt_${loan.loan_number}.pdf`);
};

export const generatePaymentReceipt = (payment: any, loan: any, customer: any, settings: any) => {
  const doc = new jsPDF();
  
  // Header with Shop Info
  doc.setFontSize(22);
  doc.setTextColor(44, 90, 160);
  doc.text(settings?.shop_name || 'GOLD GIRVI MANAGEMENT', 105, 20, { align: 'center' });
  
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(settings?.shop_address || 'Shop Address Not Set', 105, 27, { align: 'center' });
  doc.text(`Phone: ${settings?.shop_mobile || 'N/A'}`, 105, 32, { align: 'center' });
  
  doc.setDrawColor(200);
  doc.line(14, 38, 196, 38);
  
  // Receipt Title
  doc.setFontSize(16);
  doc.setTextColor(44, 90, 160);
  doc.setFont('helvetica', 'bold');
  doc.text('PAYMENT RECEIPT', 105, 48, { align: 'center' });
  
  // Basic Info
  doc.setFontSize(10);
  doc.setTextColor(0);
  doc.setFont('helvetica', 'normal');
  doc.text(`Receipt Date: ${format(new Date(payment.payment_date || payment.created_at), 'dd MMM yyyy HH:mm')}`, 14, 58);
  doc.text(`Transaction ID: ${payment.transaction_id || 'N/A'}`, 14, 63);
  
  // Customer & Loan Info
  doc.setDrawColor(240);
  doc.setFillColor(250, 250, 250);
  doc.rect(14, 70, 182, 35, 'F');
  
  doc.setFont('helvetica', 'bold');
  doc.text('Customer Details', 20, 78);
  doc.setFont('helvetica', 'normal');
  doc.text(`Name: ${customer?.full_name}`, 20, 85);
  doc.text(`Customer ID: ${customer?.id || customer?.portal_user_id}`, 20, 92);
  doc.text(`Phone: ${customer?.mobile_number}`, 20, 99);
  
  doc.setFont('helvetica', 'bold');
  doc.text('Loan Details', 110, 78);
  doc.setFont('helvetica', 'normal');
  doc.text(`Loan No: ${loan?.loan_number}`, 110, 85);
  doc.text(`Loan Amount: INR ${loan?.loan_amount?.toLocaleString()}`, 110, 92);
  
  // Payment Details Table
  const paymentDetails = [
    ['Payment Type', payment.payment_type?.replace('_', ' ').toUpperCase()],
    ['Payment Mode', payment.payment_mode],
    ['Amount Received', `INR ${payment.amount?.toLocaleString()}`],
  ];
  
  autoTable(doc, {
    body: paymentDetails,
    startY: 115,
    theme: 'grid',
    styles: { fontSize: 11, cellPadding: 5 },
    columnStyles: { 0: { fontStyle: 'bold', fillColor: [245, 245, 245], cellWidth: 60 } }
  });
  
  // Remarks
  const finalY = (doc as any).lastAutoTable.finalY + 15;
  if (payment.remarks) {
    doc.setFont('helvetica', 'bold');
    doc.text('Remarks:', 14, finalY);
    doc.setFont('helvetica', 'normal');
    doc.text(payment.remarks, 14, finalY + 7);
  }
  
  // Signature Section
  const sigY = finalY + 40;
  doc.setDrawColor(200);
  doc.line(20, sigY, 70, sigY);
  doc.line(140, sigY, 190, sigY);
  
  doc.setFontSize(10);
  doc.text('Customer Signature', 45, sigY + 7, { align: 'center' });
  doc.text('Authorized Signatory & Stamp', 165, sigY + 7, { align: 'center' });
  
  // Footer
  doc.setFontSize(9);
  doc.setTextColor(150);
  doc.text('Thank you for your payment. Please keep this receipt for your records.', 105, 280, { align: 'center' });
  
  doc.save(`Payment_Receipt_${payment.id}.pdf`);
};
