// Add "All Fee Amounts" CRUD table to Exam Fee Set page (edit inline + delete).
const fs = require('fs');
const f = 'd:/opencode 09062026/frontend/src/app/p_Xk7mN/exam-fee-set/page.tsx';
let c = fs.readFileSync(f, 'utf8');
if (c.includes('allAmounts')) { console.log('already added'); process.exit(0); }

// state + loader after "const [message, setMessage]"
const stateAnchor = 'const [message, setMessage] = useState("");';
const stateIns = stateAnchor + `
  const [allAmounts, setAllAmounts] = useState<{ exam_name: string; amount: number; editValue: string }[]>([]);
  const [amountsLoading, setAmountsLoading] = useState(false);

  const loadAllAmounts = async () => {
    setAmountsLoading(true);
    try {
      const res = await api.get<{ status: number; data: { exam_name: string; amount: number }[] }>(
        "/admin/exam-fees/amounts",
      );
      setAllAmounts((res.data || []).map((r) => ({ ...r, editValue: String(r.amount) })));
    } catch {
      /* ignore */
    } finally {
      setAmountsLoading(false);
    }
  };

  const saveAmount = async (examName: string, editValue: string) => {
    if (!editValue || Number(editValue) <= 0) { alert("Enter a valid amount"); return; }
    try {
      await api.post("/admin/exam-fees/amount", { exam_name: examName, amount: Number(editValue) });
      setMessage(\`Saved: \${examName} = ৳\${editValue}\`);
      loadAllAmounts();
    } catch (e: any) {
      setMessage(e.message || "Failed to save");
    }
  };

  const deleteAmount = async (examName: string) => {
    if (!confirm(\`Delete fee amount for \${examName}?\`)) return;
    try {
      await api.delete(\`/admin/exam-fees/amount?exam_name=\${encodeURIComponent(examName)}\`);
      setMessage(\`Deleted: \${examName}\`);
      loadAllAmounts();
    } catch (e: any) {
      setMessage(e.message || "Failed to delete");
    }
  };`;
if (!c.includes(stateAnchor)) { console.error('state anchor missing'); process.exit(1); }
c = c.replace(stateAnchor, stateIns);

// hook the loader to the year effect: after setLoading(false) in the discovery effect — simplest: add own effect
const effectAnchor = '  const keyFor = (cls: string, exam: string) => `${exam} (${cls})`;';
const effectIns = `
  useEffect(() => {
    const t = setTimeout(loadAllAmounts, 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
` + effectAnchor;
if (!c.includes(effectAnchor)) { console.error('effect anchor missing'); process.exit(1); }
c = c.replace(effectAnchor, effectIns);
fs.writeFileSync(f, c, 'utf8');
console.log('state + loaders added');
