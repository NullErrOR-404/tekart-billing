import React, { useState, useEffect } from 'react';
import { supabase, Expense, SalaryPayment, BankLedger, Transaction, WholesalePurchase } from '../lib/supabase';
import { Landmark, CheckCircle2, AlertTriangle, FileText, IndianRupee } from 'lucide-react';

export default function Accounts() {
  const [activeTab, setActiveTab] = useState<'Bank' | 'Expenses' | 'Salaries' | 'Income' | 'Statement'>('Statement');

  // Database states
  const [ledger, setLedger] = useState<BankLedger[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [salaries, setSalaries] = useState<SalaryPayment[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [purchases, setPurchases] = useState<WholesalePurchase[]>([]);

  // Bank Form states
  const [bankType, setBankType] = useState<'deposit' | 'withdrawal'>('deposit');
  const [bankAmt, setBankAmt] = useState<string>('0');
  const [bankRef, setBankRef] = useState('');

  // Expenses Form states
  const [expenseCat, setExpenseCat] = useState('Utilities');
  const [expenseAmt, setExpenseAmt] = useState<string>('0');
  const [expenseDesc, setExpenseDesc] = useState('');

  // Salary Form states
  const [empName, setEmpName] = useState('');
  const [salaryMonth, setSalaryMonth] = useState('January');
  const [salaryAmt, setSalaryAmt] = useState<string>('0');

  // Incomes Form states
  const [incomeSource, setIncomeSource] = useState('');
  const [incomeAmt, setIncomeAmt] = useState<string>('0');
  const [otherIncomes, setOtherIncomes] = useState<{ id: string; source: string; amount: number; date: string }[]>([]);

  // Message states
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    fetchAccountsData();
  }, []);

  const fetchAccountsData = async () => {
    try {
      const { data: bData } = await supabase.from('bank_ledger').select('*');
      if (bData) setLedger(bData);

      const { data: eData } = await supabase.from('expenses').select('*');
      if (eData) setExpenses(eData);

      const { data: sData } = await supabase.from('salaries').select('*');
      if (sData) setSalaries(sData);

      const { data: txData } = await supabase.from('transactions').select('*');
      if (txData) setTransactions(txData);

      const { data: pData } = await supabase.from('wholesale_purchases').select('*');
      if (pData) setPurchases(pData);

      setOtherIncomes(JSON.parse(localStorage.getItem('tk_other_incomes') || '[]'));
    } catch (err) {
      console.error(err);
    }
  };

  const handleSubmitBank = async () => {
    const amt = parseFloat(bankAmt) || 0;
    if (amt <= 0 || !bankRef.trim()) {
      setErrorMsg('Please input a valid amount and reference.');
      setTimeout(() => setErrorMsg(''), 4000);
      return;
    }

    try {
      const record = {
        type: bankType,
        amount: amt,
        reference: bankRef,
        date: new Date().toISOString()
      };

      await supabase.from('bank_ledger').insert([record]);
      setSuccessMsg('Bank transaction recorded.');
      setTimeout(() => setSuccessMsg(''), 4000);
      setBankAmt('0');
      setBankRef('');
      fetchAccountsData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleSubmitExpense = async () => {
    const amt = parseFloat(expenseAmt) || 0;
    if (amt <= 0 || !expenseDesc.trim()) {
      setErrorMsg('Please input a valid amount and description.');
      setTimeout(() => setErrorMsg(''), 4000);
      return;
    }

    try {
      const record = {
        category: expenseCat,
        amount: amt,
        description: expenseDesc,
        date: new Date().toISOString()
      };

      await supabase.from('expenses').insert([record]);
      setSuccessMsg('Expense logged successfully.');
      setTimeout(() => setSuccessMsg(''), 4000);
      setExpenseAmt('0');
      setExpenseDesc('');
      fetchAccountsData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleSubmitSalary = async () => {
    const amt = parseFloat(salaryAmt) || 0;
    if (amt <= 0 || !empName.trim()) {
      setErrorMsg('Employee name and salary amount required.');
      setTimeout(() => setErrorMsg(''), 4000);
      return;
    }

    try {
      const record = {
        employee_name: empName,
        amount: amt,
        month: salaryMonth,
        date: new Date().toISOString()
      };

      await supabase.from('salaries').insert([record]);
      setSuccessMsg('Employee salary logged.');
      setTimeout(() => setSuccessMsg(''), 4000);
      setEmpName('');
      setSalaryAmt('0');
      fetchAccountsData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleSubmitIncome = () => {
    const amt = parseFloat(incomeAmt) || 0;
    if (amt <= 0 || !incomeSource.trim()) {
      setErrorMsg('Please enter a valid source and amount.');
      setTimeout(() => setErrorMsg(''), 4000);
      return;
    }

    const items = JSON.parse(localStorage.getItem('tk_other_incomes') || '[]');
    const record = {
      id: `inc-${Date.now()}`,
      source: incomeSource,
      amount: amt,
      date: new Date().toLocaleDateString()
    };
    items.push(record);
    localStorage.setItem('tk_other_incomes', JSON.stringify(items));
    setOtherIncomes(items);
    setSuccessMsg('Other income logged.');
    setTimeout(() => setSuccessMsg(''), 4000);
    setIncomeSource('');
    setIncomeAmt('0');
  };

  const activeSalesTotal = transactions.filter(t => !t.is_voided).reduce((sum, t) => sum + t.total, 0);
  const otherIncomesTotal = otherIncomes.reduce((sum, i) => sum + i.amount, 0);
  const wholesalePurchasesTotal = purchases.reduce((sum, p) => sum + p.total, 0);
  const expensesTotal = expenses.reduce((sum, e) => sum + e.amount, 0);
  const salariesTotal = salaries.reduce((sum, s) => sum + s.amount, 0);

  const bankDeposits = ledger.filter(l => l.type === 'deposit').reduce((sum, l) => sum + l.amount, 0);
  const bankWithdrawals = ledger.filter(l => l.type === 'withdrawal').reduce((sum, l) => sum + l.amount, 0);

  const totalRevenue = activeSalesTotal + otherIncomesTotal;
  const totalOutflow = wholesalePurchasesTotal + expensesTotal + salariesTotal;
  const netEarnings = totalRevenue - totalOutflow;

  return (
    <div className="space-y-4 max-w-7xl mx-auto p-1">
      {/* Title */}
      <div className="bg-tk-surface border border-tk-border p-4 rounded-2xl tk-glass">
        <h1 className="text-xl font-bold font-display text-tk-text-primary">Accounts & Ledgers</h1>
        <p className="text-xs text-tk-text-secondary">Manage shop expenses, bank audits, cashier payroll, and view net cash statements</p>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1.5 bg-tk-surface-2 p-1 border border-tk-border rounded-xl max-w-2xl">
        {[
          { id: 'Statement', label: 'Financial Statement' },
          { id: 'Expenses', label: 'Expenses Logger' },
          { id: 'Salaries', label: 'Cashier Salaries' },
          { id: 'Bank', label: 'Bank Audits' },
          { id: 'Income', label: 'Other Incomes' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`py-2 px-4 text-3xs font-bold rounded-lg transition-colors cursor-pointer ${
              activeTab === tab.id ? 'bg-tk-blue-mid text-white' : 'text-tk-text-secondary hover:text-tk-text-primary'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Messages */}
      {successMsg && (
        <div className="bg-green-500/10 border border-green-500/20 text-green-500 p-3 rounded-xl flex items-center space-x-2 text-xs">
          <CheckCircle2 className="w-4.5 h-4.5" />
          <span>{successMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-505 p-3 rounded-xl flex items-center space-x-2 text-xs">
          <AlertTriangle className="w-4.5 h-4.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Statements Tab */}
      {activeTab === 'Statement' && (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          <div className="md:col-span-8 bg-tk-surface border border-tk-border p-6 rounded-2xl tk-glass space-y-4">
            <h2 className="text-sm font-bold text-tk-text-primary font-display border-b border-tk-border pb-2">Business Cash Flow Statement</h2>
            
            <div className="space-y-3.5 text-xs text-tk-text-primary">
              <div>
                <p className="text-3xs text-green-500 font-bold uppercase tracking-wider mb-2">Total Inflow / Revenues</p>
                <div className="space-y-2 pl-3">
                  <div className="flex justify-between text-tk-text-secondary">
                    <span>Retail Shop Sales (Completed):</span>
                    <span>₹{activeSalesTotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-tk-text-secondary">
                    <span>Other Logged Incomes:</span>
                    <span>₹{otherIncomesTotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-bold border-t border-tk-border pt-1.5">
                    <span>Gross Cash Inflow:</span>
                    <span className="text-green-500">₹{totalRevenue.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <p className="text-3xs text-red-500 font-bold uppercase tracking-wider mb-2">Total Outflow / Cost & Expenses</p>
                <div className="space-y-2 pl-3">
                  <div className="flex justify-between text-tk-text-secondary">
                    <span>Wholesale Inventory Purchases:</span>
                    <span>₹{wholesalePurchasesTotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-tk-text-secondary">
                    <span>Logged Shop Expenses (Rent/Taxes/Utilities):</span>
                    <span>₹{expensesTotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-tk-text-secondary">
                    <span>Logged Salary Payments:</span>
                    <span>₹{salariesTotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-bold border-t border-tk-border pt-1.5">
                    <span>Gross Cash Outflow:</span>
                    <span className="text-red-550">₹{totalOutflow.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="md:col-span-4 space-y-4">
            <div className="bg-tk-surface border border-tk-border p-6 rounded-2xl tk-glass text-center space-y-2.5">
              <IndianRupee className="w-8 h-8 text-tk-gold mx-auto mb-1" />
              <p className="text-3xs text-tk-text-secondary uppercase font-semibold">Net Earnings (Profit/Loss)</p>
              <h3 className={`text-2xl font-extrabold font-display ${netEarnings >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {netEarnings >= 0 ? '+' : ''}₹{netEarnings.toFixed(2)}
              </h3>
              <p className="text-3xs text-tk-text-tertiary">Calculated across active database nodes</p>
            </div>

            <div className="bg-tk-surface border border-tk-border p-4 rounded-2xl text-xs space-y-2.5">
              <p className="font-bold text-tk-text-primary font-display border-b border-tk-border pb-1">Shop Bank Ledger</p>
              <div className="flex justify-between text-tk-text-secondary">
                <span>Total Bank Deposits:</span>
                <span className="text-tk-text-primary">₹{bankDeposits}</span>
              </div>
              <div className="flex justify-between text-tk-text-secondary">
                <span>Total Bank Withdrawals:</span>
                <span className="text-tk-text-primary">₹{bankWithdrawals}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Expenses Logger Tab */}
      {activeTab === 'Expenses' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-4 bg-tk-surface border border-tk-border p-5 rounded-2xl space-y-3.5 h-[340px]">
            <h2 className="text-xs font-bold text-tk-text-primary font-display">Log utilities expense</h2>
            <div className="space-y-3.5">
              <div>
                <label className="text-3xs text-tk-text-secondary uppercase font-semibold mb-1 block">Expense Category</label>
                <select
                  value={expenseCat}
                  onChange={(e) => setExpenseCat(e.target.value)}
                  className="w-full bg-tk-surface-2 border border-tk-border rounded-lg p-2 text-xs text-tk-text-primary focus:outline-none"
                >
                  <option value="Utilities" className="bg-tk-surface">Shop Utilities / Electricity</option>
                  <option value="Rent" className="bg-tk-surface">Shop Rent</option>
                  <option value="Packaging" className="bg-tk-surface">Product Packaging</option>
                  <option value="Marketing" className="bg-tk-surface">Advertisements & Leaflets</option>
                  <option value="Other" className="bg-tk-surface">Other Miscellaneous</option>
                </select>
              </div>
              <div>
                <label className="text-3xs text-tk-text-secondary uppercase font-semibold mb-1 block">Expense Amount (₹)</label>
                <input
                  type="text"
                  value={expenseAmt}
                  onChange={(e) => setExpenseAmt(e.target.value)}
                  className="w-full bg-tk-surface-2 border border-tk-border rounded-lg p-2 text-xs text-tk-text-primary focus:outline-none"
                />
              </div>
              <div>
                <label className="text-3xs text-tk-text-secondary uppercase font-semibold mb-1 block">Expense Description</label>
                <input
                  type="text"
                  placeholder="Electricity bill for May 2026"
                  value={expenseDesc}
                  onChange={(e) => setExpenseDesc(e.target.value)}
                  className="w-full bg-tk-surface-2 border border-tk-border rounded-lg p-2 text-xs text-tk-text-primary focus:outline-none"
                />
              </div>
              <button
                onClick={handleSubmitExpense}
                className="w-full bg-tk-blue-mid hover:bg-tk-blue-deep text-white font-bold text-xs py-2 rounded-lg cursor-pointer"
              >
                Log Expense
              </button>
            </div>
          </div>

          <div className="lg:col-span-8 bg-tk-surface border border-tk-border p-5 rounded-2xl h-[340px] flex flex-col justify-between">
            <h2 className="text-xs font-bold text-tk-text-primary font-display border-b border-tk-border pb-2 mb-3">Expenses Ledger</h2>
            <div className="flex-1 overflow-y-auto pr-1 no-scrollbar text-xs">
              {expenses.length === 0 ? (
                <p className="text-tk-text-secondary py-10 text-center">No expenses recorded yet.</p>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-tk-border text-tk-text-secondary font-semibold">
                      <th className="py-2">Category</th>
                      <th className="py-2">Description</th>
                      <th className="py-2 text-right">Amount</th>
                      <th className="py-2 text-center">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {expenses.map(e => (
                      <tr key={e.id} className="border-b border-tk-border hover:bg-tk-blue-light/10">
                        <td className="py-2.5 font-semibold text-tk-text-primary">{e.category}</td>
                        <td className="py-2.5 text-tk-text-secondary">{e.description}</td>
                        <td className="py-2.5 text-right font-bold text-red-500">₹{e.amount}</td>
                        <td className="py-2.5 text-center text-tk-text-secondary">{new Date(e.date).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Salary Payments Tab */}
      {activeTab === 'Salaries' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-4 bg-tk-surface border border-tk-border p-5 rounded-2xl space-y-3.5 h-[300px]">
            <h2 className="text-xs font-bold text-tk-text-primary font-display">Log Employee Salary</h2>
            <div className="space-y-3.5">
              <div>
                <label className="text-3xs text-tk-text-secondary uppercase font-semibold mb-1 block">Employee / Cashier Name</label>
                <input
                  type="text"
                  placeholder="e.g. Amit Kumar"
                  value={empName}
                  onChange={(e) => setEmpName(e.target.value)}
                  className="w-full bg-tk-surface-2 border border-tk-border rounded-lg p-2 text-xs text-tk-text-primary focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-3xs text-tk-text-secondary uppercase font-semibold mb-1 block">Payout Month</label>
                  <select
                    value={salaryMonth}
                    onChange={(e) => setSalaryMonth(e.target.value)}
                    className="w-full bg-tk-surface-2 border border-tk-border rounded-lg p-2 text-xs text-tk-text-primary focus:outline-none"
                  >
                    {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map(m => (
                      <option key={m} value={m} className="bg-tk-surface">{m}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-3xs text-tk-text-secondary uppercase font-semibold mb-1 block">Salary Paid (₹)</label>
                  <input
                    type="text"
                    value={salaryAmt}
                    onChange={(e) => setSalaryAmt(e.target.value)}
                    className="w-full bg-tk-surface-2 border border-tk-border rounded-lg p-2 text-xs text-tk-text-primary focus:outline-none"
                  />
                </div>
              </div>
              <button
                onClick={handleSubmitSalary}
                className="w-full bg-tk-blue-mid hover:bg-tk-blue-deep text-white font-bold text-xs py-2 rounded-lg cursor-pointer"
              >
                Log Salary Payout
              </button>
            </div>
          </div>

          <div className="lg:col-span-8 bg-tk-surface border border-tk-border p-5 rounded-2xl h-[300px] flex flex-col justify-between">
            <h2 className="text-xs font-bold text-tk-text-primary font-display border-b border-tk-border pb-2 mb-3">Salary Payout Logs</h2>
            <div className="flex-1 overflow-y-auto pr-1 no-scrollbar text-xs">
              {salaries.length === 0 ? (
                <p className="text-tk-text-secondary py-10 text-center">No employee salaries logged yet.</p>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-tk-border text-tk-text-secondary font-semibold">
                      <th className="py-2">Employee Name</th>
                      <th className="py-2 text-center">Month</th>
                      <th className="py-2 text-right">Amount Paid</th>
                      <th className="py-2 text-center">Payout Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {salaries.map(s => (
                      <tr key={s.id} className="border-b border-tk-border hover:bg-tk-blue-light/10">
                        <td className="py-2.5 font-semibold text-tk-text-primary">{s.employee_name}</td>
                        <td className="py-2.5 text-center text-tk-text-primary">{s.month}</td>
                        <td className="py-2.5 text-right font-bold text-red-500">₹{s.amount}</td>
                        <td className="py-2.5 text-center text-tk-text-secondary">{new Date(s.date).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Bank Audits Tab */}
      {activeTab === 'Bank' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-4 bg-tk-surface border border-tk-border p-5 rounded-2xl space-y-3.5 h-[300px]">
            <h2 className="text-xs font-bold text-tk-text-primary font-display">Record bank ledger entry</h2>
            <div className="space-y-3.5">
              <div>
                <label className="text-3xs text-tk-text-secondary uppercase font-semibold mb-1 block">Audit Type</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setBankType('deposit')}
                    className={`py-1.5 text-2xs font-bold border rounded-lg text-center cursor-pointer ${
                      bankType === 'deposit' ? 'bg-tk-blue-mid border-tk-blue-bright text-white' : 'bg-tk-surface-2 border-tk-border text-tk-text-secondary'
                    }`}
                  >
                    Deposit
                  </button>
                  <button
                    onClick={() => setBankType('withdrawal')}
                    className={`py-1.5 text-2xs font-bold border rounded-lg text-center cursor-pointer ${
                      bankType === 'withdrawal' ? 'bg-tk-blue-mid border-tk-blue-bright text-white' : 'bg-tk-surface-2 border-tk-border text-tk-text-secondary'
                    }`}
                  >
                    Withdrawal
                  </button>
                </div>
              </div>
              <div>
                <label className="text-3xs text-tk-text-secondary uppercase font-semibold mb-1 block">Transaction Amount (₹)</label>
                <input
                  type="text"
                  value={bankAmt}
                  onChange={(e) => setBankAmt(e.target.value)}
                  className="w-full bg-tk-surface-2 border border-tk-border rounded-lg p-2 text-xs text-tk-text-primary focus:outline-none"
                />
              </div>
              <div>
                <label className="text-3xs text-tk-text-secondary uppercase font-semibold mb-1 block">Deposit/Withdrawal Reference</label>
                <input
                  type="text"
                  placeholder="e.g. Deposit of retail cash sales"
                  value={bankRef}
                  onChange={(e) => setBankRef(e.target.value)}
                  className="w-full bg-tk-surface-2 border border-tk-border rounded-lg p-2 text-xs text-tk-text-primary focus:outline-none"
                />
              </div>
              <button
                onClick={handleSubmitBank}
                className="w-full bg-tk-blue-mid hover:bg-tk-blue-deep text-white font-bold text-xs py-2 rounded-lg cursor-pointer"
              >
                Save Bank entry
              </button>
            </div>
          </div>

          <div className="lg:col-span-8 bg-tk-surface border border-tk-border p-5 rounded-2xl h-[300px] flex flex-col justify-between">
            <h2 className="text-xs font-bold text-tk-text-primary font-display border-b border-tk-border pb-2 mb-3">Bank Ledgers</h2>
            <div className="flex-1 overflow-y-auto pr-1 no-scrollbar text-xs">
              {ledger.length === 0 ? (
                <p className="text-tk-text-secondary py-10 text-center">No bank entries recorded yet.</p>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-tk-border text-tk-text-secondary font-semibold">
                      <th className="py-2">Reference Info</th>
                      <th className="py-2 text-center">Type</th>
                      <th className="py-2 text-right">Transaction amount</th>
                      <th className="py-2 text-center">Audit Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ledger.map(l => (
                      <tr key={l.id} className="border-b border-tk-border hover:bg-tk-blue-light/10">
                        <td className="py-2.5 font-semibold text-tk-text-primary">{l.reference}</td>
                        <td className="py-2.5 text-center">
                          <span className={`text-3xs px-2 py-0.5 rounded font-bold capitalize ${
                            l.type === 'deposit' ? 'text-green-500 bg-green-500/10' : 'text-red-500 bg-red-500/10'
                          }`}>
                            {l.type}
                          </span>
                        </td>
                        <td className="py-2.5 text-right font-bold text-tk-text-primary">₹{l.amount}</td>
                        <td className="py-2.5 text-center text-tk-text-secondary">{new Date(l.date).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Other Incomes Tab */}
      {activeTab === 'Income' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-4 bg-tk-surface border border-tk-border p-5 rounded-2xl space-y-3.5 h-[260px]">
            <h2 className="text-xs font-bold text-tk-text-primary font-display">Log external shop revenue</h2>
            <div className="space-y-3.5">
              <div>
                <label className="text-3xs text-tk-text-secondary uppercase font-semibold mb-1 block">Income Source Description</label>
                <input
                  type="text"
                  placeholder="e.g. Scrap sales, Bank interest"
                  value={incomeSource}
                  onChange={(e) => setIncomeSource(e.target.value)}
                  className="w-full bg-tk-surface-2 border border-tk-border rounded-lg p-2 text-xs text-tk-text-primary focus:outline-none"
                />
              </div>
              <div>
                <label className="text-3xs text-tk-text-secondary uppercase font-semibold mb-1 block">Amount Received (₹)</label>
                <input
                  type="text"
                  value={incomeAmt}
                  onChange={(e) => setIncomeAmt(e.target.value)}
                  className="w-full bg-tk-surface-2 border border-tk-border rounded-lg p-2 text-xs text-tk-text-primary focus:outline-none"
                />
              </div>
              <button
                onClick={handleSubmitIncome}
                className="w-full bg-tk-blue-mid hover:bg-tk-blue-deep text-white font-bold text-xs py-2 rounded-lg cursor-pointer"
              >
                Log Other Income
              </button>
            </div>
          </div>

          <div className="lg:col-span-8 bg-tk-surface border border-tk-border p-5 rounded-2xl h-[260px] flex flex-col justify-between">
            <h2 className="text-xs font-bold text-tk-text-primary font-display border-b border-tk-border pb-2 mb-3">Other Income Ledger</h2>
            <div className="flex-1 overflow-y-auto pr-1 no-scrollbar text-xs">
              {otherIncomes.length === 0 ? (
                <p className="text-tk-text-secondary py-10 text-center">No other income recorded yet.</p>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-tk-border text-tk-text-secondary font-semibold">
                      <th className="py-2">Source</th>
                      <th className="py-2 text-right">Amount</th>
                      <th className="py-2 text-center">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {otherIncomes.map(i => (
                      <tr key={i.id} className="border-b border-tk-border hover:bg-tk-blue-light/10">
                        <td className="py-2.5 font-semibold text-tk-text-primary">{i.source}</td>
                        <td className="py-2.5 text-right font-bold text-green-500">₹{i.amount}</td>
                        <td className="py-2.5 text-center text-tk-text-secondary">{i.date}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
