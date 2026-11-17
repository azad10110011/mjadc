const fs = require('fs');
const f = 'd:/opencode 09062026/frontend/src/app/p_Xk7mN/exam-fee-collection/page.tsx';
let c = fs.readFileSync(f, 'utf8');
if (c.includes('paymentCrudId, setPaymentCrudId')) { console.log('state already present'); process.exit(0); }
const anchor = 'const [tab, setTab] = useState<"collect" | "report">("collect");';
if (!c.includes(anchor)) { console.error('anchor missing'); process.exit(1); }
const ins = anchor + `

  // admin CRUD for payment records (report tab)
  const isAdmin = role === "admin";
  const [paymentCrudId, setPaymentCrudId] = useState<number | null>(null);
  const [crudAmount, setCrudAmount] = useState("");

  const updatePayment = async (id: number) => {
    if (!crudAmount || Number(crudAmount) <= 0) { alert("Enter a valid amount"); return; }
    try {
      await api.put("/admin/exam-fees/" + id, { amount: Number(crudAmount) });
      setMessage("Payment record updated");
      setPaymentCrudId(null);
      runReport();
    } catch (e: any) {
      setMessage(e.message || "Failed to update");
    }
  };

  const deletePayment = async (id: number) => {
    if (!confirm("Delete this payment record?")) return;
    try {
      await api.delete("/admin/exam-fees/" + id);
      setMessage("Payment record deleted");
      runReport();
    } catch (e: any) {
      setMessage(e.message || "Failed to delete");
    }
  };`;
c = c.replace(anchor, ins);
fs.writeFileSync(f, c, 'utf8');
console.log('CRUD state + functions added');
