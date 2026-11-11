"use client";

import { useState, useEffect, Suspense } from "react";
import { PanelLayout } from "@/components/layout";
import { Button, Input, Select, Card, CardContent } from "@/components/ui";
import { api, UPLOAD_BASE } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { exportToPDF, type ExportColumn } from "@/lib/export";
import { CheckCircle2, XCircle, Printer, FileDown, Wallet } from "lucide-react";

interface ExamOption {
  value: string;
  label: string;
}

interface StudentStatus {
  paid: boolean;
  paid_total: number;
  waived_total: number;
  total_fee: number;
  due: number;
  fully_paid: boolean;
  will_pay_within?: string | null;
  payment_method?: string;
  collected_at?: string;
}

function fmt(n: number) {
  return `৳${n.toLocaleString("en-US")}`;
}

function ExamFeeCollectionInner() {
  const { user } = useAuth();
  const role = user?.default_role || "";
  const canCollect = role === "admin" || role === "exam_controller";
  const isAdmin = role === "admin";

  const [tab, setTab] = useState<"collect" | "report">("collect");

  // collect tab state
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [examName, setExamName] = useState("");
  const [examOptions, setExamOptions] = useState<ExamOption[]>([]);
  const [totalFee, setTotalFee] = useState(0);
  const [students, setStudents] = useState<any[]>([]);
  const [statusMap, setStatusMap] = useState<Record<string, StudentStatus>>({});
  const [loading, setLoading] = useState(false);
  const [amount, setAmount] = useState("");
  const [perStudentAmount, setPerStudentAmount] = useState("");
  const [method, setMethod] = useState("cash");
  const [willPayWithin, setWillPayWithin] = useState("");
  const [message, setMessage] = useState("");
  const [classFilter, setClassFilter] = useState("all");
  const [groupFilter, setGroupFilter] = useState("all");
  const [waiverTarget, setWaiverTarget] = useState<any | null>(null);
  const [waiverAmount, setWaiverAmount] = useState("");
  const [waiverReason, setWaiverReason] = useState("");

  // single-student collection (by Student ID lookup)
  const [lookupId, setLookupId] = useState("");
  const [lookupStudent, setLookupStudent] = useState<any | null>(null);
  const [lookupError, setLookupError] = useState("");
  const [lookupAmount, setLookupAmount] = useState("");
  const [lookupMethod, setLookupMethod] = useState("cash");
  const [lookupWillPay, setLookupWillPay] = useState("");
  const [savingLookup, setSavingLookup] = useState(false);

  // report tab state
  const [repExam, setRepExam] = useState("");
  const [repFrom, setRepFrom] = useState("");
  const [repTo, setRepTo] = useState("");
  const [repUserId, setRepUserId] = useState("");
  const [repData, setRepData] = useState<any>(null);
  const [repLoading, setRepLoading] = useState(false);

  const years = Array.from({ length: 14 }, (_, i) => ({
    value: String(2027 + i),
    label: String(2027 + i),
  }));

  // Class-based exam lists: 11th -> Half Yearly/Year Final/Model Test; 12th -> Pre-Test/Test/Model Test
  const EXAMS_BY_CLASS: Record<string, string[]> = {
    "11th": ["Half Yearly", "Year Final", "Model Test"],
    "12th": ["Pre-Test", "Test", "Model Test"],
  };
  const [feeClass, setFeeClass] = useState("");
  const classExams = feeClass
    ? EXAMS_BY_CLASS[feeClass].map((e) => ({ value: e, label: e }))
    : [];

  // For non-admin users, exam options derive from the selected class (EXAMS_BY_CLASS).
  // Admin still discovers exam names from the exams table.
  useEffect(() => {
    if (isAdmin) {
      const t = setTimeout(async () => {
        try {
          const res = await api.get<{ status: number; data: any[] }>(
            `/admin/exams?year=${year}`,
          );
          const list = res.data || [];
          setExamOptions(
            list
              .filter((r) => r.exam_name)
              .map((r) => ({
                value: r.exam_name,
                label: r.class ? `${r.exam_name} (${r.class})` : r.exam_name,
              })),
          );
        } catch {
          /* ignore */
        }
      }, 0);
      return () => clearTimeout(t);
    }
  }, [year, isAdmin]);

  // load per-exam fee amount when exam chosen
  useEffect(() => {
    if (!examName) return;
    api
      .get<{ status: number; data: { amount: number } }>(
        `/admin/exam-fees/amount?exam_name=${encodeURIComponent(examName)}`,
      )
      .then((r) => {
        setTotalFee(r.data?.amount || 0);
        setAmount(r.data?.amount ? String(r.data.amount) : "");
      })
      .catch(() => {});
  }, [examName]);

  const loadStatus = () => {
    return api
      .post<{
        status: number;
        data: { total_fee: number; students: Record<string, StudentStatus> };
      }>("/admin/exam-fees/status", {
        year: Number(year),
        exam_name: examName,
      })
      .then((r) => {
        setTotalFee(r.data?.total_fee || 0);
        setStatusMap(r.data?.students || {});
      });
  };

  useEffect(() => {
    if (!year || !examName) return;
    setLoading(true);
    setMessage("");
    Promise.all([
      api.get<{ status: number; data: any[] }>(`/admin/students`),
      loadStatus(),
    ])
      .then(([studentsRes]) => setStudents(studentsRes.data || []))
      .catch((e: unknown) =>
        setMessage(e instanceof Error ? e.message : "Failed to load"),
      )
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year, examName]);

  const collect = async (s: any) => {
    const amt = Number(perStudentAmount || amount);
    if (!amt || amt <= 0) {
      alert("Enter the exam fee amount first");
      return;
    }
    setMessage("");
    try {
      await api.post("/admin/exam-fees/collect", {
        student_user_id: s.user_id,
        year: Number(year),
        exam_name: examName,
        amount: amt,
        payment_method: method,
        will_pay_within: willPayWithin || undefined,
      });
      await loadStatus();
      setPerStudentAmount("");
      setWillPayWithin("");
      setMessage(`৳${amt} collected for ${s.name}`);
    } catch (e: any) {
      setMessage(e.message || "Failed to collect fee");
    }
  };

  const waive = async () => {
    if (!waiverTarget || !waiverAmount || Number(waiverAmount) <= 0) return;
    try {
      await api.post("/admin/exam-fees/waiver", {
        student_user_id: waiverTarget.user_id,
        year: Number(year),
        exam_name: examName,
        amount: Number(waiverAmount),
        reason: waiverReason || undefined,
      });
      await loadStatus();
      setMessage(`Waiver ৳${waiverAmount} applied for ${waiverTarget.name}`);
      setWaiverTarget(null);
      setWaiverAmount("");
      setWaiverReason("");
    } catch (e: any) {
      setMessage(e.message || "Failed to apply waiver");
    }
  };

  const undo = async (row: any) => {
    if (!confirm(`Remove all payment records for ${row.name}?`)) return;
    try {
      await api.delete(
        `/admin/exam-fees/by-student/${row.user_id}/${year}/${encodeURIComponent(examName)}`,
      );
      await loadStatus();
      setMessage("Fee record removed");
    } catch (e: any) {
      setMessage(e.message || "Failed to remove fee record");
    }
  };

  const saveExamAmount = async () => {
    if (!isAdmin) return;
    try {
      await api.post("/admin/exam-fees/amount", {
        exam_name: examName,
        amount: Number(amount),
      });
      setTotalFee(Number(amount));
      await loadStatus();
      setMessage(`Exam fee total for ${examName} set to ৳${amount}`);
    } catch (e: any) {
      setMessage(e.message || "Failed to save fee amount");
    }
  };

  // ---------------- single-student lookup + collect ----------------
  const lookupStudentById = async () => {
    if (!lookupId.trim()) return;
    setLookupError("");
    setLookupStudent(null);
    try {
      const res = await api.get<{ status: number; data: any }>(
        `/admin/students/lookup?id=${encodeURIComponent(lookupId.trim())}`,
      );
      setLookupStudent(res.data);
      const st = statusMap[String(res.data.user_id)];
      setLookupAmount(st?.due > 0 ? String(st.due) : totalFee ? String(totalFee) : "");
    } catch (e: any) {
      const msg = e.message || "Lookup failed";
      setLookupError(
        msg.toLowerCase().includes("not found")
          ? "Student not found — check the ID"
          : `Lookup failed: ${msg} (are you logged in as Admin or Exam Controller?)`,
      );
    }
  };

  const saveLookupCollection = async () => {
    if (!lookupStudent) return;
    const amt = Number(lookupAmount);
    if (!amt || amt <= 0) {
      alert("Enter the payment amount");
      return;
    }
    setSavingLookup(true);
    setMessage("");
    try {
      await api.post("/admin/exam-fees/collect", {
        student_user_id: lookupStudent.user_id,
        year: Number(year),
        exam_name: examName,
        amount: amt,
        payment_method: lookupMethod,
        will_pay_within: lookupWillPay || undefined,
      });
      await loadStatus();
      setMessage(`Saved: ৳${amt} collected for ${lookupStudent.name} (${lookupStudent.student_id})`);
      setLookupStudent(null);
      setLookupId("");
      setLookupAmount("");
      setLookupWillPay("");
    } catch (e: any) {
      setMessage(e.message || "Failed to save collection");
    } finally {
      setSavingLookup(false);
    }
  };

  // ---------------- report ----------------
  const runReport = async (preset?: "today") => {
    setRepLoading(true);
    try {
      const body: any = { year: Number(year) };
      if (examName) body.exam_name = examName;
      if (repExam && repExam !== examName) body.exam_name = repExam;
      if (preset === "today") {
        body.date_from = new Date().toISOString().slice(0, 10);
        body.date_to = body.date_from;
      } else {
        if (repFrom) body.date_from = repFrom;
        if (repTo) body.date_to = repTo;
      }
      if (repUserId) body.collected_by = Number(repUserId);
      const res = await api.post<{ status: number; data: any }>(
        "/admin/exam-fees/report",
        body,
      );
      setRepData(res.data);
    } catch (e: any) {
      setMessage(e.message || "Report failed");
    } finally {
      setRepLoading(false);
    }
  };

  const reportExport = (mode: "pdf" | "print") => {
    if (!repData) return;
    const title = `Exam Fee Collection Report — ${repData.rows[0]?.exam_name || examName || "All Exams"} (${year})`;
    if (mode === "print") {
      const w = window.open("", "_blank");
      if (!w) return;
      const rowsHtml = repData.rows
        .map(
          (r: any) =>
            `<tr><td>${r.student_id || "-"}</td><td>${r.student_name || "-"}</td><td>${r.exam_name}</td><td>${fmt(Number(r.amount))}</td><td>${r.payment_method || ""}</td><td>${r.collector_name || "-"}</td><td>${new Date(r.collected_at).toLocaleString()}</td></tr>`,
        )
        .join("");
      const usersHtml = repData.by_user
        .map(
          (u: any) =>
            `<tr><td>${u.name || "-"}</td><td>${u.collections}</td><td>${fmt(Number(u.total))}</td></tr>`,
        )
        .join("");
      w.document
        .write(`<html><head><title>${title}</title></head><body style="font-family:Times New Roman;padding:24px">
        <h2 style="text-align:center;margin:0">Miah Jinnah Alam Degree College</h2>
        <h3 style="text-align:center;margin:4px 0 16px">${title}</h3>
        <p><b>Total Collection:</b> ${fmt(repData.total)} &nbsp; <b>Payments:</b> ${repData.count}</p>
        <h4>Payments</h4>
        <table border="1" cellpadding="4" cellspacing="0" style="border-collapse:collapse;width:100%;font-size:12px">
        <tr style="background:#eee"><th>Student ID</th><th>Name</th><th>Exam</th><th>Amount</th><th>Method</th><th>Collected By</th><th>At</th></tr>${rowsHtml}</table>
        <h4>User-wise Summary</h4>
        <table border="1" cellpadding="4" cellspacing="0" style="border-collapse:collapse;font-size:12px">
        <tr style="background:#eee"><th>Collector</th><th>Payments</th><th>Total</th></tr>${usersHtml}</table>
        </body></html>`);
      w.document.close();
      w.print();
    } else {
      const cols: ExportColumn[] = [
        { key: "student_id", label: "Student ID" },
        { key: "student_name", label: "Name" },
        { key: "exam_name", label: "Exam" },
        { key: "amount", label: "Amount" },
        { key: "payment_method", label: "Method" },
        { key: "collector_name", label: "Collected By" },
        { key: "collected_at", label: "At" },
      ];
      exportToPDF(repData.rows, cols, title, "Exam Fee");
    }
  };

  const filtered = students.filter(
    (s) =>
      (classFilter === "all" || s.class === classFilter) &&
      (groupFilter === "all" || s.student_group === groupFilter),
  );

  return (
    <PanelLayout role="admin" title="Exam Fee Collection">
      <div className="mx-auto max-w-6xl space-y-4">
        <div className="flex gap-2">
          <Button
            variant={tab === "collect" ? "primary" : "outline"}
            onClick={() => setTab("collect")}
          >
            <Wallet className="mr-2 h-4 w-4" /> Collect
          </Button>
          <Button
            variant={tab === "report" ? "primary" : "outline"}
            onClick={() => setTab("report")}
          >
            Reports
          </Button>
        </div>

        {message && (
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-700">
            {message}
          </div>
        )}

        {tab === "collect" && (
          <>
            {!isAdmin && (
              <>
                {/* Simplified collect flow for Exam Controller & Administration */}
                <Card>
                  <CardContent className="grid gap-4 sm:grid-cols-3">
                    <div>
                      <label className="mb-1 block text-sm font-medium">Year</label>
                      <Select
                        value={year}
                        onChange={(e) => {
                          setYear(e.target.value);
                          setFeeClass("");
                          setExamName("");
                        }}
                        options={years}
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium">Class</label>
                      <Select
                        value={feeClass}
                        onChange={(e) => {
                          setFeeClass(e.target.value);
                          setExamName("");
                        }}
                        options={[
                          { value: "", label: "Select class" },
                          { value: "11th", label: "11th" },
                          { value: "12th", label: "12th" },
                        ]}
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium">Exam</label>
                      <Select
                        value={examName}
                        onChange={(e) => setExamName(e.target.value)}
                        options={[
                          { value: "", label: "Select exam" },
                          ...classExams,
                        ]}
                      />
                    </div>
                  </CardContent>
                </Card>

                {examName && (
                  <Card>
                    <CardContent className="space-y-3">
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
                            <Button variant="outline" onClick={lookupStudentById}>
                              Find
                            </Button>
                          </div>
                        </div>
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
                      </div>
                      {lookupError && (
                        <p className="text-sm text-red-600">{lookupError}</p>
                      )}
                      {lookupStudent && (
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
                            Number(lookupAmount) < (statusMap[String(lookupStudent.user_id)]?.due ?? totalFee) && (
                              <div className="mt-2">
                                <label className="mb-1 block text-sm font-medium">
                                  Will pay within (if partial)
                                </label>
                                <Input
                                  type="date"
                                  value={lookupWillPay}
                                  onChange={(e) => setLookupWillPay(e.target.value)}
                                  className="sm:max-w-xs"
                                />
                              </div>
                            )}
                          <div className="mt-3 flex gap-2">
                            <Button onClick={saveLookupCollection} disabled={savingLookup}>
                              {savingLookup ? "Saving…" : "Save"}
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
                    </CardContent>
                  </Card>
                )}
              </>
            )}

            {isAdmin && (
              <>
            <Card>
              <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div>
                  <label className="mb-1 block text-sm font-medium">Year</label>
                  <Select
                    value={year}
                    onChange={(e) => setYear(e.target.value)}
                    options={years}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">Exam</label>
                  <Select
                    value={examName}
                    onChange={(e) => setExamName(e.target.value)}
                    options={[
                      { value: "", label: "Select exam" },
                      ...examOptions,
                    ]}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">
                    Exam Fee Total (৳) — editable
                  </label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="e.g. 500"
                    />
                    <Button variant="outline" onClick={saveExamAmount}>
                      Save
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className="mb-1 block text-sm font-medium">
                  This Payment (৳) — blank = full fee
                </label>
                <Input
                  type="number"
                  value={perStudentAmount}
                  onChange={(e) => setPerStudentAmount(e.target.value)}
                  placeholder={`Full: ${fmt(totalFee)}`}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">
                  Payment Method
                </label>
                <Select
                  value={method}
                  onChange={(e) => setMethod(e.target.value)}
                  options={[
                    { value: "cash", label: "Cash" },
                    { value: "online", label: "Online" },
                  ]}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">
                  Will pay within (if partial)
                </label>
                <Input
                  type="date"
                  value={willPayWithin}
                  onChange={(e) => setWillPayWithin(e.target.value)}
                />
              </div>
            </div>

            {examName && canCollect && (
              <Card>
                <CardContent className="space-y-3">
                  <h3 className="font-semibold">Collect by Student ID</h3>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div>
                      <label className="mb-1 block text-sm font-medium">
                        Student ID
                      </label>
                      <div className="flex gap-2">
                        <Input
                          value={lookupId}
                          onChange={(e) => setLookupId(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") lookupStudentById();
                          }}
                          placeholder="e.g. 271001"
                        />
                        <Button variant="outline" onClick={lookupStudentById}>
                          Find
                        </Button>
                      </div>
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium">
                        Payment (৳) — blank = full fee
                      </label>
                      <Input
                        type="number"
                        value={lookupAmount}
                        onChange={(e) => setLookupAmount(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium">
                        Will pay within (if partial)
                      </label>
                      <Input
                        type="date"
                        value={lookupWillPay}
                        onChange={(e) => setLookupWillPay(e.target.value)}
                      />
                    </div>
                  </div>
                  {lookupError && (
                    <p className="text-sm text-red-600">{lookupError}</p>
                  )}
                  {lookupStudent && (
                    <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                      <div className="grid gap-2 text-sm sm:grid-cols-3">
                        <div>
                          <span className="text-gray-500">Name: </span>
                          <span className="font-semibold">
                            {lookupStudent.name}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500">Father: </span>
                          <span className="font-semibold">
                            {lookupStudent.father_name || "-"}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500">Due: </span>
                          <span className="font-semibold text-red-600">
                            {fmt(
                              statusMap[String(lookupStudent.user_id)]?.due ??
                                totalFee,
                            )}
                          </span>
                        </div>
                      </div>
                      <div className="mt-3 flex gap-2">
                        <Button
                          onClick={saveLookupCollection}
                          disabled={savingLookup}
                        >
                          {savingLookup ? "Saving…" : "Save"}
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => {
                            setLookupStudent(null);
                            setLookupId("");
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            </>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium">
                  Class filter
                </label>
                <Select
                  value={classFilter}
                  onChange={(e) => setClassFilter(e.target.value)}
                  options={[
                    { value: "all", label: "All Classes" },
                    { value: "11th", label: "11th" },
                    { value: "12th", label: "12th" },
                    { value: "Old", label: "Old" },
                  ]}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">
                  Group filter
                </label>
                <Select
                  value={groupFilter}
                  onChange={(e) => setGroupFilter(e.target.value)}
                  options={[
                    { value: "all", label: "All Groups" },
                    { value: "Science", label: "Science" },
                    { value: "Business Studies", label: "Business Studies" },
                    { value: "Humanities", label: "Humanities" },
                  ]}
                />
              </div>
            </div>

            {examName && (
              <Card>
                <CardContent>
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="font-semibold">
                      Students — {examName} {year}
                    </h3>
                    {canCollect && waiverTarget === null && (
                      <span className="text-sm text-gray-500">
                        Fee total: {fmt(totalFee)}
                      </span>
                    )}
                  </div>
                  {loading ? (
                    <p className="text-sm text-gray-500">Loading…</p>
                  ) : filtered.length === 0 ? (
                    <p className="text-sm text-gray-500">
                      No students match the filters.
                    </p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b text-left text-gray-600">
                            <th className="py-2 pr-3">Student ID</th>
                            <th className="py-2 pr-3">Name</th>
                            <th className="py-2 pr-3">Paid</th>
                            <th className="py-2 pr-3">Waived</th>
                            <th className="py-2 pr-3">Due</th>
                            <th className="py-2 pr-3">Status</th>
                            <th className="py-2 pr-3">Will pay within</th>
                            <th className="py-2">Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filtered.map((s) => {
                            const st = statusMap[String(s.user_id)];
                            const due = st?.due ?? totalFee;
                            return (
                              <tr key={s.id} className="border-b last:border-0">
                                <td className="py-2 pr-3 font-mono">
                                  {s.student_id}
                                </td>
                                <td className="py-2 pr-3">{s.name}</td>
                                <td className="py-2 pr-3">
                                  {st?.paid_total ? fmt(st.paid_total) : "-"}
                                </td>
                                <td className="py-2 pr-3">
                                  {st?.waived_total
                                    ? fmt(st.waived_total)
                                    : "-"}
                                </td>
                                <td className="py-2 pr-3">
                                  {totalFee > 0 ? (
                                    <span
                                      className={
                                        due > 0
                                          ? "font-semibold text-red-600"
                                          : "text-green-600"
                                      }
                                    >
                                      {fmt(due)}
                                    </span>
                                  ) : (
                                    "-"
                                  )}
                                </td>
                                <td className="py-2 pr-3">
                                  {st?.fully_paid ? (
                                    <span className="inline-flex items-center gap-1 text-green-600">
                                      <CheckCircle2 className="h-4 w-4" /> Paid
                                    </span>
                                  ) : st?.paid ? (
                                    <span className="text-amber-600">
                                      Partial
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 text-red-500">
                                      <XCircle className="h-4 w-4" /> Unpaid
                                    </span>
                                  )}
                                </td>
                                <td className="py-2 pr-3 text-xs text-gray-500">
                                  {st?.will_pay_within || "-"}
                                </td>
                                <td className="py-2 space-x-2">
                                  {canCollect ? (
                                    st?.fully_paid ? (
                                      isAdmin && (
                                        <Button
                                          variant="outline"
                                          onClick={() => undo(s)}
                                        >
                                          Remove
                                        </Button>
                                      )
                                    ) : (
                                      <>
                                        <Button
                                          onClick={() => collect(s)}
                                          disabled={totalFee <= 0}
                                        >
                                          Collect
                                        </Button>
                                        <Button
                                          variant="outline"
                                          onClick={() => {
                                            setWaiverTarget(s);
                                            setWaiverAmount(
                                              due > 0 ? String(due) : "",
                                            );
                                          }}
                                        >
                                          Waive
                                        </Button>
                                      </>
                                    )
                                  ) : (
                                    <span className="text-xs text-gray-400">
                                      view only
                                    </span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Waiver dialog */}
            {waiverTarget && (
              <Card>
                <CardContent className="space-y-3">
                  <h3 className="font-semibold">
                    Waive exam fee — {waiverTarget.name} (
                    {waiverTarget.student_id})
                  </h3>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-sm font-medium">
                        Waiver Amount (৳)
                      </label>
                      <Input
                        type="number"
                        value={waiverAmount}
                        onChange={(e) => setWaiverAmount(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium">
                        Reason (optional)
                      </label>
                      <Input
                        value={waiverReason}
                        onChange={(e) => setWaiverReason(e.target.value)}
                        placeholder="e.g. merit waiver"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={waive}>Apply Waiver</Button>
                    <Button
                      variant="outline"
                      onClick={() => setWaiverTarget(null)}
                    >
                      Cancel
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}

        {tab === "report" && (
          <>
            <Card>
              <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <label className="mb-1 block text-sm font-medium">
                    Exam (optional)
                  </label>
                  <Select
                    value={repExam}
                    onChange={(e) => setRepExam(e.target.value)}
                    options={[
                      { value: "", label: "All exams" },
                      ...examOptions,
                    ]}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">From</label>
                  <Input
                    type="date"
                    value={repFrom}
                    onChange={(e) => setRepFrom(e.target.value)}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">To</label>
                  <Input
                    type="date"
                    value={repTo}
                    onChange={(e) => setRepTo(e.target.value)}
                  />
                </div>
                {canCollect && (
                  <div>
                    <label className="mb-1 block text-sm font-medium">
                      Collector (optional)
                    </label>
                    <Input
                      type="number"
                      value={repUserId}
                      onChange={(e) => setRepUserId(e.target.value)}
                      placeholder="user id — blank = all"
                    />
                  </div>
                )}
              </CardContent>
            </Card>
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => runReport("today")}>Today</Button>
              <Button variant="outline" onClick={() => runReport()}>
                Apply Filters
              </Button>
              <Button variant="outline" onClick={() => runReport()}>
                Total (all time in {year})
              </Button>
              {repData && (
                <>
                  <Button variant="outline" onClick={() => reportExport("pdf")}>
                    <FileDown className="mr-2 h-4 w-4" /> PDF
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => reportExport("print")}
                  >
                    <Printer className="mr-2 h-4 w-4" /> Print
                  </Button>
                </>
              )}
            </div>

            {repLoading && <p className="text-gray-500">Loading report…</p>}
            {repData && !repLoading && (
              <>
                <div className="grid gap-4 sm:grid-cols-3">
                  <Card>
                    <CardContent>
                      <p className="text-sm text-gray-500">Total Collection</p>
                      <p className="text-2xl font-bold">{fmt(repData.total)}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent>
                      <p className="text-sm text-gray-500">Payments</p>
                      <p className="text-2xl font-bold">{repData.count}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent>
                      <p className="text-sm text-gray-500">Collectors</p>
                      <p className="text-2xl font-bold">
                        {repData.by_user.length}
                      </p>
                    </CardContent>
                  </Card>
                </div>

                {canCollect && (
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
                            <tr
                              key={u.collected_by}
                              className="border-b last:border-0"
                            >
                              <td className="py-2 pr-3">{u.name || "-"}</td>
                              <td className="py-2 pr-3">{u.collections}</td>
                              <td className="py-2 font-semibold">
                                {fmt(Number(u.total))}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </CardContent>
                  </Card>
                )}

                <Card>
                  <CardContent>
                    <h3 className="mb-3 font-semibold">Payment Details</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b text-left text-gray-600">
                            <th className="py-2 pr-3">Student ID</th>
                            <th className="py-2 pr-3">Name</th>
                            <th className="py-2 pr-3">Exam</th>
                            <th className="py-2 pr-3">Amount</th>
                            <th className="py-2 pr-3">Method</th>
                            <th className="py-2 pr-3">Collected By</th>
                            <th className="py-2">At</th>
                          </tr>
                        </thead>
                        <tbody>
                          {repData.rows.map((r: any) => (
                            <tr key={r.id} className="border-b last:border-0">
                              <td className="py-2 pr-3 font-mono">
                                {r.student_id || "-"}
                              </td>
                              <td className="py-2 pr-3">
                                {r.student_name || "-"}
                              </td>
                              <td className="py-2 pr-3">{r.exam_name}</td>
                              <td className="py-2 pr-3">
                                {fmt(Number(r.amount))}
                              </td>
                              <td className="py-2 pr-3">
                                {r.payment_method || "-"}
                              </td>
                              <td className="py-2 pr-3">
                                {r.collector_name || "-"}
                              </td>
                              <td className="py-2">
                                {new Date(r.collected_at).toLocaleString()}
                              </td>
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
