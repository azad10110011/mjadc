"use client";

import { useState, useEffect, Suspense } from "react";
import { PanelLayout } from "@/components/layout";
import { Button, Input, Select, Card, CardContent } from "@/components/ui";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { exportToPDF, type ExportColumn } from "@/lib/export";
import { Printer, FileDown } from "lucide-react";

interface StudentStatus {
  paid_total: number;
  waived_total: number;
  total_fee: number;
  due: number;
  fully_paid: boolean;
}

function fmt(n: number) {
  return `৳${n.toLocaleString("en-US")}`;
}

function ExamFeeCollectionInner() {
  const { user } = useAuth();
  const role = user?.default_role || "";
  const canCollect = role === "admin" || role === "exam_controller";
  const [tab, setTab] = useState<"collect" | "report">("collect");

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
  };

  // student lookup + collection
  const [lookupId, setLookupId] = useState("");
  const [lookupStudent, setLookupStudent] = useState<any | null>(null);
  const [lookupError, setLookupError] = useState("");
  const [lookupAmount, setLookupAmount] = useState("");
  const [lookupWillPay, setLookupWillPay] = useState("");
  const [statusMap, setStatusMap] = useState<Record<string, StudentStatus>>({});
  const [totalFee, setTotalFee] = useState(0);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  // today's collection list
  const [todayData, setTodayData] = useState<any>(null);
  const [todayLoading, setTodayLoading] = useState(false);
  const [listClass, setListClass] = useState("all");
  const [listGroup, setListGroup] = useState("all");

  const currentYear = new Date().getFullYear();

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


  const loadToday = async () => {
    setTodayLoading(true);
    try {
      const res = await api.post<{ status: number; data: any }>(
        "/admin/exam-fees/report",
        {
          year: currentYear,
          date_from: new Date().toISOString().slice(0, 10),
          date_to: new Date().toISOString().slice(0, 10),
          collected_by: Number(user?.id || 0) || undefined,
        },
      );
      setTodayData(res.data);
    } catch (e: any) {
      setMessage(e.message || "Failed to load today's collection");
    } finally {
      setTodayLoading(false);
    }
  };

  useEffect(() => {
    const t = setTimeout(loadToday, 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const lookupStudentById = async () => {
    if (!lookupId.trim()) return;
    setLookupError("");
    setLookupStudent(null);
    try {
      const res = await api.get<{ status: number; data: any }>(
        `/admin/students/lookup?id=${encodeURIComponent(lookupId.trim())}`,
      );
      setLookupStudent(res.data);
      // due for this student across the current year's exams
      const st = await api.post<{
        status: number;
        data: { total_fee: number; students: Record<string, StudentStatus> };
      }>("/admin/exam-fees/status", { year: currentYear, exam_name: res.data.default_exam });
      setTotalFee(st.data?.total_fee || 0);
      setStatusMap(st.data?.students || {});
      setLookupAmount("");
      setLookupWillPay("");
    } catch (e: any) {
      const msg = e.message || "Lookup failed";
      setLookupError(
        msg.toLowerCase().includes("not found")
          ? "Student not found — check the ID"
          : `Lookup failed: ${msg}`,
      );
    }
  };

  const saveCollection = async () => {
    if (!lookupStudent) return;
    const amt = Number(lookupAmount);
    if (!amt || amt <= 0) {
      alert("Enter the payment amount");
      return;
    }
    setSaving(true);
    setMessage("");
    try {
      await api.post("/admin/exam-fees/collect", {
        student_user_id: lookupStudent.user_id,
        year: currentYear,
        exam_name: lookupStudent.default_exam,
        amount: amt,
        payment_method: "cash",
        will_pay_within: lookupWillPay || undefined,
      });
      setMessage(`Saved: ৳${amt} collected for ${lookupStudent.name} (${lookupStudent.student_id})`);
      setLookupStudent(null);
      setLookupId("");
      setLookupAmount("");
      setLookupWillPay("");
      loadToday();
    } catch (e: any) {
      setMessage(e.message || "Failed to save collection");
    } finally {
      setSaving(false);
    }
  };

  const filtered = (todayData?.rows || []).filter(
    (r: any) =>
      (listClass === "all" || r.class === listClass) &&
      (listGroup === "all" || r.student_group === listGroup),
  );
  const filteredTotal = filtered.reduce((s: number, r: any) => s + Number(r.amount || 0), 0);

  const exportList = (mode: "pdf" | "print") => {
    const rows = filtered;
    if (!rows.length) return;
    const title = `Exam Fee Collection — Today (${new Date().toLocaleDateString()})`;
    if (mode === "print") {
      const w = window.open("", "_blank");
      if (!w) return;
      const rowsHtml = rows
        .map(
          (r: any) =>
            `<tr><td>${r.student_id || "-"}</td><td>${r.student_name || "-"}</td><td>${r.class || "-"}</td><td>${r.student_group || "-"}</td><td>${fmt(Number(r.amount))}</td><td>${r.collector_name || "-"}</td><td>${new Date(r.collected_at).toLocaleTimeString()}</td></tr>`,
        )
        .join("");
      w.document.write(`<html><head><title>${title}</title></head><body style="font-family:Times New Roman;padding:24px">
        <h2 style="text-align:center;margin:0">Miah Jinnah Alam Degree College</h2>
        <h3 style="text-align:center;margin:4px 0 16px">${title}</h3>
        <p><b>Total:</b> ${fmt(filteredTotal)} &nbsp; <b>Payments:</b> ${rows.length}</p>
        <table border="1" cellpadding="4" cellspacing="0" style="border-collapse:collapse;width:100%;font-size:12px">
        <tr style="background:#eee"><th>Student ID</th><th>Name</th><th>Class</th><th>Group</th><th>Amount</th><th>Collected By</th><th>Time</th></tr>${rowsHtml}</table>
        </body></html>`);
      w.document.close();
      w.print();
    } else {
      const cols: ExportColumn[] = [
        { key: "student_id", label: "Student ID" },
        { key: "student_name", label: "Name" },
        { key: "class", label: "Class" },
        { key: "student_group", label: "Group" },
        { key: "amount", label: "Amount" },
        { key: "collector_name", label: "Collected By" },
        { key: "collected_at", label: "Time" },
      ];
      exportToPDF(rows, cols, title, "Exam Fee");
    }
  };

  return (
    <PanelLayout role="admin" title="Exam Fee Collection">
      <div className="mx-auto max-w-6xl space-y-4">
        <div className="flex gap-2">
          <Button variant={tab === "collect" ? "primary" : "outline"} onClick={() => setTab("collect")}>
            Collect
          </Button>
          <Button variant={tab === "report" ? "primary" : "outline"} onClick={() => { setTab("report"); runReport("today"); }}>
            Reports
          </Button>
        </div>
        {message && (
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-700">
            {message}
          </div>
        )}

        {/* Student ID collection */}
        <Card>
          <CardContent className="space-y-3">
            <h3 className="font-semibold">Collect Exam Fee</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium">Student ID</label>
                <div className="flex gap-2">
                  <Input
                    value={lookupId}
                    onChange={(e) => setLookupId(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") lookupStudentById();
                    }}
                    placeholder="e.g. 271009"
                  />
                  {canCollect && (
                    <Button variant="outline" onClick={lookupStudentById}>
                      Find
                    </Button>
                  )}
                </div>
              </div>
              {lookupStudent && canCollect && (
                <div>
                  <label className="mb-1 block text-sm font-medium">
                    This Payment (৳) — blank = full fee
                  </label>
                  <Input
                    type="number"
                    value={lookupAmount}
                    onChange={(e) => setLookupAmount(e.target.value)}
                    placeholder={totalFee ? `Full: ${fmt(totalFee)}` : "e.g. 500"}
                  />
                </div>
              )}
            </div>
            {lookupError && <p className="text-sm text-red-600">{lookupError}</p>}
            {lookupStudent && canCollect && (
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                <div className="grid gap-2 text-sm sm:grid-cols-3">
                  <div>
                    <span className="text-gray-500">Name: </span>
                    <span className="font-semibold">{lookupStudent.name}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Father: </span>
                    <span className="font-semibold">{lookupStudent.father_name || "-"}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Due: </span>
                    <span className="font-semibold text-red-600">
                      {fmt(statusMap[String(lookupStudent.user_id)]?.due ?? totalFee)}
                    </span>
                  </div>
                </div>
                {Number(lookupAmount) > 0 &&
                  totalFee > 0 &&
                  Number(lookupAmount) < (statusMap[String(lookupStudent.user_id)]?.due ?? totalFee) && (
                    <div className="mt-2 sm:max-w-xs">
                      <label className="mb-1 block text-sm font-medium">
                        Will pay within (if partial)
                      </label>
                      <Input
                        type="date"
                        value={lookupWillPay}
                        onChange={(e) => setLookupWillPay(e.target.value)}
                      />
                    </div>
                  )}
                <div className="mt-3 flex gap-2">
                  <Button onClick={saveCollection} disabled={saving}>
                    {saving ? "Saving…" : "Save"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setLookupStudent(null);
                      setLookupId("");
                      setLookupAmount("");
                      setLookupWillPay("");
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
            {!canCollect && (
              <p className="text-xs text-gray-400">View only — collection is done by Admin / Exam Controller.</p>
            )}
          </CardContent>
        </Card>

        {/* Today's collection list */}
        <Card>
          <CardContent>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <h3 className="font-semibold">
                My Collection (Today){" "}
                <span className="text-sm font-normal text-gray-500">
                  — {fmt(todayData?.total ?? 0)} ({todayData?.count ?? 0} payments)
                </span>
              </h3>
              <div className="flex flex-wrap items-center gap-2">
                <Select
                  value={listClass}
                  onChange={(e) => setListClass(e.target.value)}
                  options={[
                    { value: "all", label: "All Classes" },
                    { value: "11th", label: "11th" },
                    { value: "12th", label: "12th" },
                    { value: "Old", label: "Old" },
                  ]}
                />
                <Select
                  value={listGroup}
                  onChange={(e) => setListGroup(e.target.value)}
                  options={[
                    { value: "all", label: "All Groups" },
                    { value: "Science", label: "Science" },
                    { value: "Business Studies", label: "Business Studies" },
                    { value: "Humanities", label: "Humanities" },
                  ]}
                />
                <Button variant="outline" onClick={() => loadToday()}>
                  Refresh
                </Button>
                {filtered.length > 0 && (
                  <>
                    <Button variant="outline" onClick={() => exportList("pdf")}>
                      <FileDown className="mr-2 h-4 w-4" /> PDF
                    </Button>
                    <Button variant="outline" onClick={() => exportList("print")}>
                      <Printer className="mr-2 h-4 w-4" /> Print
                    </Button>
                  </>
                )}
              </div>
            </div>
            {todayLoading ? (
              <p className="text-sm text-gray-500">Loading…</p>
            ) : filtered.length === 0 ? (
              <p className="text-sm text-gray-500">No collections today.</p>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-gray-600">
                        <th className="py-2 pr-3">Student ID</th>
                        <th className="py-2 pr-3">Name</th>
                        <th className="py-2 pr-3">Class</th>
                        <th className="py-2 pr-3">Group</th>
                        <th className="py-2 pr-3">Amount</th>
                        <th className="py-2 pr-3">Collected By</th>
                        <th className="py-2">Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((r: any) => (
                        <tr key={r.id} className="border-b last:border-0">
                          <td className="py-2 pr-3 font-mono">{r.student_id || "-"}</td>
                          <td className="py-2 pr-3">{r.student_name || "-"}</td>
                          <td className="py-2 pr-3">{r.class || "-"}</td>
                          <td className="py-2 pr-3">{r.student_group || "-"}</td>
                          <td className="py-2 pr-3 font-semibold">{fmt(Number(r.amount))}</td>
                          <td className="py-2 pr-3">{r.collector_name || "-"}</td>
                          <td className="py-2">{new Date(r.collected_at).toLocaleTimeString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="mt-3 text-right text-sm font-semibold">
                  Filtered total: {fmt(filteredTotal)}
                </p>
              </>
            )}
          </CardContent>
        </Card>

        {tab === "report" && (
          <>
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => runReport("today")}>Today</Button>
              <Button variant="outline" onClick={() => runReport("total")}>Total (This Year)</Button>
              <Input type="date" value={repFrom} onChange={(e) => setRepFrom(e.target.value)} className="sm:w-auto" />
              <Input type="date" value={repTo} onChange={(e) => setRepTo(e.target.value)} className="sm:w-auto" />
              <Button variant="outline" onClick={() => runReport()}>Apply Range</Button>
              {repData && (
                <>
                  <Button variant="outline" onClick={() => reportExport("pdf")}>
                    <FileDown className="mr-2 h-4 w-4" /> PDF
                  </Button>
                  <Button variant="outline" onClick={() => reportExport("print")}>
                    <Printer className="mr-2 h-4 w-4" /> Print
                  </Button>
                </>
              )}
            </div>

            {repLoading && <p className="text-gray-500">Loading report…</p>}
            {repData && !repLoading && (
              <>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Card>
                    <CardContent>
                      <p className="text-sm text-gray-500">{canCollect ? 'Total Collection (all users)' : 'My Total Collection'}</p>
                      <p className="text-2xl font-bold">{fmt(repData.total)}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent>
                      <p className="text-sm text-gray-500">Payments</p>
                      <p className="text-2xl font-bold">{repData.count}</p>
                    </CardContent>
                  </Card>
                </div>

                {canCollect && repData.by_user?.length > 0 && (
                  <Card>
                    <CardContent>
                      <h3 className="mb-3 font-semibold">User-wise Summary</h3>
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b text-left text-gray-600">
                            <th className="py-2 pr-3">Collector</th>
                            <th className="py-2 pr-3">Payments</th>
                            <th className="py-2">Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {repData.by_user.map((u: any) => (
                            <tr key={u.collected_by} className="border-b last:border-0">
                              <td className="py-2 pr-3">{u.name || "-"}</td>
                              <td className="py-2 pr-3">{u.collections}</td>
                              <td className="py-2 font-semibold">{fmt(Number(u.total))}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </CardContent>
                  </Card>
                )}

                <Card>
                  <CardContent>
                    <h3 className="mb-3 font-semibold">{canCollect ? 'All Payments' : 'My Payments'}</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b text-left text-gray-600">
                            <th className="py-2 pr-3">Student ID</th>
                            <th className="py-2 pr-3">Name</th>
                            <th className="py-2 pr-3">Exam</th>
                            <th className="py-2 pr-3">Amount</th>
                            <th className="py-2 pr-3">Collected By</th>
                            <th className="py-2">At</th>
                            {isAdmin && <th className="py-2">Actions</th>}
                          </tr>
                        </thead>
                        <tbody>
                          {repData.rows.map((r: any) => (
                            <tr key={r.id} className="border-b last:border-0">
                              <td className="py-2 pr-3 font-mono">{r.student_id || "-"}</td>
                              <td className="py-2 pr-3">{r.student_name || "-"}</td>
                              <td className="py-2 pr-3">{r.exam_name || "-"}</td>
                              <td className="py-2 pr-3 font-semibold">{fmt(Number(r.amount))}</td>
                              <td className="py-2 pr-3">{r.collector_name || "-"}</td>
                              <td className="py-2">{new Date(r.collected_at).toLocaleString()}</td>
                              {isAdmin && (
                                <td className="py-2">
                                  {paymentCrudId === r.id ? (
                                    <div className="flex gap-1">
                                      <Input type="number" value={crudAmount} onChange={(e) => setCrudAmount(e.target.value)} className="w-24" />
                                      <Button onClick={() => updatePayment(r.id)}>Save</Button>
                                      <Button variant="outline" onClick={() => setPaymentCrudId(null)}>Cancel</Button>
                                    </div>
                                  ) : (
                                    <>
                                      <Button variant="outline" onClick={() => { setPaymentCrudId(r.id); setCrudAmount(String(r.amount)); }}>Edit</Button>
                                      <Button variant="outline" onClick={() => deletePayment(r.id)}>Delete</Button>
                                    </>
                                  )}
                                </td>
                              )}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </>
        )}
      </div>
    </PanelLayout>
  );
}

export default function ExamFeeCollectionPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: "100vh" }} />}>
      <ExamFeeCollectionInner />
    </Suspense>
  );
}
