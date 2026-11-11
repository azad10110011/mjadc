"use client";

import { useState, useEffect, Suspense } from "react";
import { PanelLayout } from "@/components/layout";
import { Button, Input, Card, CardContent } from "@/components/ui";
import { api } from "@/lib/api";

function fmt(n: number) {
  return `৳${n.toLocaleString("en-US")}`;
}

const CLASSES = ["11th", "12th"];
const EXAMS_BY_CLASS: Record<string, string[]> = {
  "11th": ["Half Yearly", "Year Final", "Model Test"],
  "12th": ["Pre-Test", "Test", "Model Test"],
};

function ExamFeeSetInner() {
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [classes, setClasses] = useState<string[]>([]);
  const [examsByClass, setExamsByClass] = useState<Record<string, string[]>>({});
  const [rows, setRows] = useState<{ cls: string; exam: string; amount: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
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
      setMessage(`Saved: ${examName} = ৳${editValue}`);
      loadAllAmounts();
    } catch (e: any) {
      setMessage(e.message || "Failed to save");
    }
  };

  const deleteAmount = async (examName: string) => {
    if (!confirm(`Delete fee amount for ${examName}?`)) return;
    try {
      await api.delete(`/admin/exam-fees/amount?exam_name=${encodeURIComponent(examName)}`);
      setMessage(`Deleted: ${examName}`);
      loadAllAmounts();
    } catch (e: any) {
      setMessage(e.message || "Failed to delete");
    }
  };

  // discover classes + exams for the selected year from the exams table
  useEffect(() => {
    const t = setTimeout(async () => {
      try {
        const res = await api.get<{ status: number; data: any[] }>(`/admin/exams?year=${year}`);
        const list = res.data || [];
        const byClass: Record<string, string[]> = {};
        for (const r of list) {
          if (!r.exam_name || !r.class) continue;
          if (!byClass[r.class]) byClass[r.class] = [];
          if (!byClass[r.class].includes(r.exam_name)) byClass[r.class].push(r.exam_name);
        }
        setClasses(Object.keys(byClass).sort());
        setExamsByClass(byClass);
        // preload existing amounts
        setLoading(true);
        const newRows: { cls: string; exam: string; amount: string }[] = [];
        for (const cls of Object.keys(byClass)) {
          for (const exam of byClass[cls]) {
            try {
              const a = await api.get<{ status: number; data: { amount: number } }>(
                `/admin/exam-fees/amount?exam_name=${encodeURIComponent(`${exam} (${cls})`)}`,
              );
              newRows.push({ cls, exam, amount: a.data?.amount ? String(a.data.amount) : "" });
            } catch {
              newRows.push({ cls, exam, amount: "" });
            }
          }
        }
        setRows(newRows);
        setLoading(false);
      } catch {
        setMessage("Failed to load exams");
        setLoading(false);
      }
    }, 0);
    return () => clearTimeout(t);
  }, [year]);


  useEffect(() => {
    const t = setTimeout(loadAllAmounts, 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const keyFor = (cls: string, exam: string) => `${exam} (${cls})`;

  const save = async (cls: string, exam: string, amount: string) => {
    if (!amount || Number(amount) <= 0) {
      alert(`Enter a valid amount for ${exam} (${cls})`);
      return;
    }
    try {
      await api.post("/admin/exam-fees/amount", {
        exam_name: keyFor(cls, exam),
        amount: Number(amount),
      });
      setMessage(`Saved: ${exam} (${cls}) = ৳${amount}`);
    } catch (e: any) {
      setMessage(e.message || "Failed to save");
    }
  };

  const years = Array.from({ length: 14 }, (_, i) => ({ value: String(2027 + i), label: String(2027 + i) }));

  return (
    <PanelLayout role="admin" title="Exam Fee Set">
      <div className="mx-auto max-w-4xl space-y-4">
        <Card>
          <CardContent className="sm:max-w-xs">
            <label className="mb-1 block text-sm font-medium">Year</label>
            <select
              value={year}
              onChange={(e) => setYear(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            >
              {years.map((y) => (
                <option key={y.value} value={y.value}>{y.label}</option>
              ))}
            </select>
          </CardContent>
        </Card>

        {message && (
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-700">{message}</div>
        )}

        {loading && <p className="text-gray-500">Loading…</p>}

        {!loading && classes.length === 0 && (
          <p className="text-gray-500">No exams configured for {year}. Add exams in Exam Management first.</p>
        )}

        {classes.map((cls) => (
          <Card key={cls}>
            <CardContent>
              <h3 className="mb-3 font-semibold">Class {cls}</h3>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-gray-600">
                    <th className="py-2 pr-3">Exam</th>
                    <th className="py-2 pr-3">Fee Amount (৳)</th>
                    <th className="py-2">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {(examsByClass[cls] || []).map((exam) => {
                    const row = rows.find((r) => r.cls === cls && r.exam === exam);
                    return (
                      <tr key={exam} className="border-b last:border-0">
                        <td className="py-2 pr-3 font-medium">{exam}</td>
                        <td className="py-2 pr-3">
                          <Input
                            type="number"
                            value={row?.amount || ""}
                            onChange={(e) =>
                              setRows((prev) =>
                                prev.map((r) =>
                                  r.cls === cls && r.exam === exam ? { ...r, amount: e.target.value } : r,
                                ),
                              )
                            }
                            placeholder="e.g. 500"
                          />
                        </td>
                        <td className="py-2">
                          <Button
                            onClick={() => save(cls, exam, row?.amount || "")}
                            disabled={!(row?.amount || "").trim()}
                          >
                            Save
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </CardContent>
          </Card>
        ))}
      <Card>
          <CardContent>
            <h3 className="mb-3 font-semibold">All Configured Fee Amounts</h3>
            {amountsLoading ? (
              <p className="text-sm text-gray-500">Loading…</p>
            ) : allAmounts.length === 0 ? (
              <p className="text-sm text-gray-500">No fee amounts configured yet.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-gray-600">
                    <th className="py-2 pr-3">Exam</th>
                    <th className="py-2 pr-3">Amount (৳)</th>
                    <th className="py-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {allAmounts.map((a) => (
                    <tr key={a.exam_name} className="border-b last:border-0">
                      <td className="py-2 pr-3 font-medium">{a.exam_name}</td>
                      <td className="py-2 pr-3">
                        <Input
                          type="number"
                          value={a.editValue}
                          onChange={(e) =>
                            setAllAmounts((prev) =>
                              prev.map((x) =>
                                x.exam_name === a.exam_name ? { ...x, editValue: e.target.value } : x,
                              ),
                            )
                          }
                        />
                      </td>
                      <td className="py-2 space-x-2">
                        <Button onClick={() => saveAmount(a.exam_name, a.editValue)}>Save</Button>
                        <Button variant="outline" onClick={() => deleteAmount(a.exam_name)}>
                          Delete
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      </div>
    </PanelLayout>
  );
}

export default function ExamFeeSetPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: "100vh" }} />}>
      <ExamFeeSetInner />
    </Suspense>
  );
}
