// Patch exam-fee-collection page:
// 1. Bottom "Today's Collection" list = ONLY the logged-in user's own collections
// 2. Re-add a Report tab: admin/exam_controller see everyone; administration sees own only
const fs = require('fs');
const f = 'd:/opencode 09062026/frontend/src/app/p_Xk7mN/exam-fee-collection/page.tsx';
let c = fs.readFileSync(f, 'utf8');

// --- 1. self-only today's list: pass collected_by = own id ---
const needle1 = 'date_to: new Date().toISOString().slice(0, 10),';
if (!c.includes(needle1)) { console.error('today probe needle missing'); process.exit(1); }
c = c.replace(
  needle1,
  needle1 + '\n          collected_by: Number(user?.id || 0) || undefined,',
);
// backend enforces administration anyway; for admin/exam_controller this makes the bottom list self-only
// report state + loader for the report tab
if (!c.includes('repData')) {
  const reportState = `
  // report tab state
  const [repFrom, setRepFrom] = useState("");
  const [repTo, setRepTo] = useState("");
  const [repData, setRepData] = useState<any>(null);
  const [repLoading, setRepLoading] = useState(false);

  const runReport = async (preset?: "today" | "total") => {
    setRepLoading(true);
    try {
      const body: any = { year: new Date().getFullYear() };
      if (preset === "today") {
        body.date_from = new Date().toISOString().slice(0, 10);
        body.date_to = body.date_from;
      } else if (preset === "total") {
        // no dates = whole year
      } else {
        if (repFrom) body.date_from = repFrom;
        if (repTo) body.date_to = repTo;
      }
      const res = await api.post<{ status: number; data: any }>("/admin/exam-fees/report", body);
      setRepData(res.data);
    } catch (e: any) {
      setMessage(e.message || "Report failed");
    } finally {
      setRepLoading(false);
    }
  };

  const reportExport = (mode: "pdf" | "print") => {
    if (!repData?.rows?.length) return;
    const rows = repData.rows;
    const title = "Exam Fee Collection Report (" + new Date().toLocaleDateString() + ")";
    if (mode === "print") {
      const w = window.open("", "_blank");
      if (!w) return;
      const rowsHtml = rows
        .map((r: any) =>
          "<tr><td>" + (r.student_id || "-") + "</td><td>" + (r.student_name || "-") + "</td><td>" + (r.exam_name || "-") + "</td><td>" + fmt(Number(r.amount)) + "</td><td>" + (r.collector_name || "-") + "</td><td>" + new Date(r.collected_at).toLocaleString() + "</td></tr>")
        .join("");
      const usersHtml = (repData.by_user || [])
        .map((u: any) => "<tr><td>" + (u.name || "-") + "</td><td>" + u.collections + "</td><td>" + fmt(Number(u.total)) + "</td></tr>")
        .join("");
      w.document.write('<html><head><title>' + title + '</title></head><body style="font-family:Times New Roman;padding:24px">' +
        '<h2 style="text-align:center;margin:0">Miah Jinnah Alam Degree College</h2>' +
        '<h3 style="text-align:center;margin:4px 0 16px">' + title + '</h3>' +
        '<p><b>Total:</b> ' + fmt(repData.total) + ' &nbsp; <b>Payments:</b> ' + repData.count + '</p>' +
        '<table border="1" cellpadding="4" cellspacing="0" style="border-collapse:collapse;width:100%;font-size:12px">' +
        '<tr style="background:#eee"><th>Student ID</th><th>Name</th><th>Exam</th><th>Amount</th><th>Collected By</th><th>At</th></tr>' + rowsHtml + '</table>' +
        (canCollect ? '<h4>User-wise Summary</h4><table border="1" cellpadding="4" cellspacing="0" style="border-collapse:collapse;font-size:12px"><tr style="background:#eee"><th>Collector</th><th>Payments</th><th>Total</th></tr>' + usersHtml + '</table>' : "") +
        '</body></html>');
      w.document.close();
      w.print();
    } else {
      const cols: ExportColumn[] = [
        { key: "student_id", label: "Student ID" },
        { key: "student_name", label: "Name" },
        { key: "exam_name", label: "Exam" },
        { key: "amount", label: "Amount" },
        { key: "collector_name", label: "Collected By" },
        { key: "collected_at", label: "At" },
      ];
      exportToPDF(rows, cols, title, "Exam Fee");
    }
  };
`;
  const anchor = '  const currentYear = new Date().getFullYear();';
  if (!c.includes(anchor)) { console.error('report anchor missing'); process.exit(1); }
  c = c.replace(anchor, anchor + '\n' + reportState);
}
fs.writeFileSync(f, c, 'utf8');
console.log('patched: self-only list + report tab logic');
