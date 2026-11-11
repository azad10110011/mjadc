"use client";

import { useState, Suspense } from "react";
import { PanelLayout } from "@/components/layout";
import { Button, Input, Card, CardContent } from "@/components/ui";
import { api } from "@/lib/api";

function fmt(n: number) {
  return `৳${n.toLocaleString("en-US")}`;
}

function ExamFeeWaiverInner() {
  const [lookupId, setLookupId] = useState("");
  const [student, setStudent] = useState<any | null>(null);
  const [error, setError] = useState("");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [due, setDue] = useState<number | null>(null);
  const [totalFee, setTotalFee] = useState(0);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const findStudent = async () => {
    if (!lookupId.trim()) return;
    setError("");
    setStudent(null);
    setDue(null);
    try {
      const res = await api.get<{ status: number; data: any }>(
        `/admin/students/lookup?id=${encodeURIComponent(lookupId.trim())}`,
      );
      setStudent(res.data);
      // fetch fee status for this student's default exam to show due
      const exam = res.data.default_exam;
      const year = new Date().getFullYear();
      try {
        const st = await api.post<{
          status: number;
          data: { total_fee: number; students: Record<string, any> };
        }>("/admin/exam-fees/status", { year, exam_name: `${exam} (${res.data.class})` });
        setTotalFee(st.data?.total_fee || 0);
        const s = st.data?.students?.[String(res.data.user_id)];
        setDue(s?.due ?? st.data?.total_fee ?? 0);
        setAmount(String(s?.due ?? st.data?.total_fee ?? 0));
      } catch {
        setDue(totalFee);
      }
    } catch (e: any) {
      const msg = e.message || "Lookup failed";
      setError(msg.toLowerCase().includes("not found") ? "Student not found — check the ID" : `Lookup failed: ${msg}`);
    }
  };

  const applyWaiver = async () => {
    if (!student || !amount || Number(amount) <= 0) return;
    setSaving(true);
    setMessage("");
    try {
      await api.post("/admin/exam-fees/waiver", {
        student_user_id: student.user_id,
        year: new Date().getFullYear(),
        exam_name: `${student.default_exam} (${student.class})`,
        amount: Number(amount),
        reason: reason || undefined,
      });
      setMessage(`Waiver of ৳${amount} applied for ${student.name} (${student.student_id})`);
      setStudent(null);
      setLookupId("");
      setAmount("");
      setReason("");
      setDue(null);
    } catch (e: any) {
      setMessage(e.message || "Failed to apply waiver");
    } finally {
      setSaving(false);
    }
  };

  return (
    <PanelLayout role="admin" title="Exam Fee Waiver">
      <div className="mx-auto max-w-3xl space-y-4">
        {message && (
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-700">{message}</div>
        )}

        <Card>
          <CardContent className="space-y-3">
            <h3 className="font-semibold">Waive Exam Fee</h3>
            <div>
              <label className="mb-1 block text-sm font-medium">Student ID</label>
              <div className="flex gap-2">
                <Input
                  value={lookupId}
                  onChange={(e) => setLookupId(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") findStudent();
                  }}
                  placeholder="e.g. 271009"
                />
                <Button variant="outline" onClick={findStudent}>
                  Find
                </Button>
              </div>
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}

            {student && (
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                <div className="grid gap-2 text-sm sm:grid-cols-3">
                  <div>
                    <span className="text-gray-500">Name: </span>
                    <span className="font-semibold">{student.name}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Father: </span>
                    <span className="font-semibold">{student.father_name || "-"}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">
                      Due ({student.default_exam}):{" "}
                    </span>
                    <span className="font-semibold text-red-600">{fmt(due ?? totalFee)}</span>
                  </div>
                </div>

                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm font-medium">Waiver Amount (৳)</label>
                    <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium">Reason (optional)</label>
                    <Input
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      placeholder="e.g. merit waiver"
                    />
                  </div>
                </div>

                <div className="mt-3 flex gap-2">
                  <Button onClick={applyWaiver} disabled={saving}>
                    {saving ? "Applying…" : "Apply Waiver"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setStudent(null);
                      setLookupId("");
                      setAmount("");
                      setReason("");
                      setDue(null);
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </PanelLayout>
  );
}

export default function ExamFeeWaiverPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: "100vh" }} />}>
      <ExamFeeWaiverInner />
    </Suspense>
  );
}
