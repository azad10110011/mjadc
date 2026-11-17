"use client";

import { useState, useEffect, useMemo, useCallback, Suspense } from "react";
import Link from "next/link";
import { PanelLayout } from "@/components/layout";
import { Button, Input, Card, CardContent } from "@/components/ui";
import { api } from "@/lib/api";
import { refreshCatalog, useExamNames } from "@/lib/catalog";
import { Plus, Settings2 } from "lucide-react";

const CLASSES = ["11th", "12th"];
const keyFor = (cls: string, exam: string) => `${exam} (${cls})`;

function ExamFeeSetInner() {
  const examNames = useExamNames();
  const thisYear = new Date().getFullYear();
  const [year, setYear] = useState(String(thisYear));
  const [yearExams, setYearExams] = useState<Record<string, string[]>>({});
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [allAmounts, setAllAmounts] = useState<{ exam_name: string; amount: number; editValue: string }[]>([]);
  const [amountsLoading, setAmountsLoading] = useState(true);
  const [newCls, setNewCls] = useState("11th");
  const [newName, setNewName] = useState("");
  const [adding, setAdding] = useState(false);

  const loadAllAmounts = useCallback(async () => {
    try {
      const res = await api.get<{ data: { exam_name: string; amount: number }[] }>("/admin/exam-fees/amounts");
      const list = res.data || [];
      setAllAmounts(list.map((r) => ({ ...r, editValue: String(r.amount) })));
      setEdits(Object.fromEntries(list.map((r) => [r.exam_name.toLowerCase(), String(r.amount)])));
    } catch {
      /* ignore */
    } finally {
      setAmountsLoading(false);
    }
  }, []);

  // exams already created for the selected year (results, routines, papers or "Add exam")
  const loadYearExams = useCallback(async (y: string) => {
    try {
      const res = await api.get<{ data: { class: string; exam_name: string }[] }>(`/admin/exams?year=${y}`);
      const byClass: Record<string, string[]> = {};
      for (const r of res.data || []) {
        if (!r.exam_name || !r.class) continue;
        if (!(byClass[r.class] ||= []).includes(r.exam_name)) byClass[r.class].push(r.exam_name);
      }
      setYearExams(byClass);
    } catch {
      setMessage({ ok: false, text: "Failed to load exams" });
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => void loadYearExams(year), 0);
    return () => clearTimeout(t);
  }, [year, loadYearExams]);

  useEffect(() => {
    const t = setTimeout(() => void loadAllAmounts(), 0);
    return () => clearTimeout(t);
  }, [loadAllAmounts]);

  // every exam name in the catalog for the class + anything created for this year
  const examsByClass = useMemo(() => {
    const out: Record<string, string[]> = {};
    for (const c of CLASSES) {
      const list = [...(examNames[c] || [])];
      for (const e of yearExams[c] || []) if (!list.includes(e)) list.push(e);
      out[c] = list;
    }
    return out;
  }, [examNames, yearExams]);

  const save = async (cls: string, exam: string) => {
    const amount = (edits[keyFor(cls, exam).toLowerCase()] || "").trim();
    if (!amount || Number(amount) <= 0) {
      setMessage({ ok: false, text: `Enter a valid amount for ${keyFor(cls, exam)}` });
      return;
    }
    try {
      await api.post("/admin/exam-fees/amount", { exam_name: keyFor(cls, exam), amount: Number(amount) });
      setMessage({ ok: true, text: `Saved: ${keyFor(cls, exam)} = ৳${amount}` });
      void loadAllAmounts();
    } catch (e: unknown) {
      setMessage({ ok: false, text: e instanceof Error ? e.message : "Failed to save" });
    }
  };

  const saveAmount = async (examName: string, editValue: string) => {
    if (!editValue || Number(editValue) <= 0) { setMessage({ ok: false, text: "Enter a valid amount" }); return; }
    try {
      await api.post("/admin/exam-fees/amount", { exam_name: examName, amount: Number(editValue) });
      setMessage({ ok: true, text: `Saved: ${examName} = ৳${editValue}` });
      void loadAllAmounts();
    } catch (e: unknown) {
      setMessage({ ok: false, text: e instanceof Error ? e.message : "Failed to save" });
    }
  };

  const deleteAmount = async (examName: string) => {
    if (!confirm(`Delete fee amount for ${examName}?`)) return;
    try {
      await api.delete(`/admin/exam-fees/amount?exam_name=${encodeURIComponent(examName)}`);
      setMessage({ ok: true, text: `Deleted: ${examName}` });
      void loadAllAmounts();
    } catch (e: unknown) {
      setMessage({ ok: false, text: e instanceof Error ? e.message : "Failed to delete" });
    }
  };

  const addExam = async () => {
    const name = newName.trim().replace(/\s+/g, " ");
    if (!name) return;
    setAdding(true);
    try {
      await api.post("/admin/exams", { year, class: newCls, exam_name: name });
      setMessage({ ok: true, text: `Exam created: ${name} ${year} (${newCls}). Set its fee below.` });
      setNewName("");
      await Promise.all([refreshCatalog(), loadYearExams(year)]);
    } catch (e: unknown) {
      setMessage({ ok: false, text: e instanceof Error ? e.message : "Failed to create exam" });
    } finally {
      setAdding(false);
    }
  };

  const years = Array.from({ length: 13 }, (_, i) => String(thisYear - 2 + i));

  return (
    <PanelLayout role="admin" title="Exam Fee Set">
      <div className="mx-auto max-w-4xl space-y-4">
        <Card>
          <CardContent className="grid gap-4 md:grid-cols-[10rem_1fr]">
            <div>
              <label className="mb-1 block text-sm font-medium">Year</label>
              <select
                value={year}
                onChange={(e) => setYear(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              >
                {years.map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Add a new exam for {year}</label>
              <div className="flex flex-col gap-2 sm:flex-row">
                <select
                  value={newCls}
                  onChange={(e) => setNewCls(e.target.value)}
                  className="rounded-lg border border-gray-300 px-3 py-2 text-sm sm:w-28"
                  aria-label="Class"
                >
                  {CLASSES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
                <input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") void addExam(); }}
                  placeholder="Exam name, e.g. Monthly Test"
                  maxLength={50}
                  className="min-w-0 flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  aria-label="Exam name"
                />
                <Button onClick={addExam} disabled={adding || !newName.trim()}>
                  <Plus className="mr-1 h-4 w-4" /> {adding ? "Adding…" : "Add Exam"}
                </Button>
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Manage exam names and student groups in{" "}
                <Link href="/p_Xk7mN/exams-groups/" className="inline-flex items-center gap-0.5 font-medium text-blue-700 hover:underline">
                  <Settings2 className="h-3 w-3" /> Exams &amp; Groups
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>

        {message && (
          <div className={`rounded-lg border p-3 text-sm ${message.ok ? "border-green-200 bg-green-50 text-green-800" : "border-red-200 bg-red-50 text-red-700"}`}>
            {message.text}
          </div>
        )}

        {CLASSES.map((cls) => (
          <Card key={cls}>
            <CardContent>
              <h3 className="mb-3 font-semibold">Class {cls}</h3>
              {(examsByClass[cls] || []).length === 0 ? (
                <p className="text-sm text-gray-500">No exams for class {cls}. Add one above.</p>
              ) : (
                <div className="overflow-x-auto">
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
                        const k = keyFor(cls, exam);
                        const saved = allAmounts.find((a) => a.exam_name.toLowerCase() === k.toLowerCase());
                        const value = edits[k.toLowerCase()] ?? "";
                        return (
                          <tr key={exam} className="border-b last:border-0">
                            <td className="py-2 pr-3 font-medium">
                              {exam}
                              {!saved && <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-800">Not set</span>}
                            </td>
                            <td className="py-2 pr-3">
                              <Input
                                type="number"
                                min={1}
                                value={value}
                                onChange={(e) => setEdits((p) => ({ ...p, [k.toLowerCase()]: e.target.value }))}
                                placeholder="e.g. 500"
                              />
                            </td>
                            <td className="py-2">
                              <Button onClick={() => save(cls, exam)} disabled={!value.trim() || value === (saved ? String(saved.amount) : "")}>
                                Save
                              </Button>
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
        ))}

        <Card>
          <CardContent>
            <h3 className="mb-3 font-semibold">All Configured Fee Amounts</h3>
            {amountsLoading ? (
              <p className="text-sm text-gray-500">Loading…</p>
            ) : allAmounts.length === 0 ? (
              <p className="text-sm text-gray-500">No fee amounts configured yet.</p>
            ) : (
              <div className="overflow-x-auto">
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
                                prev.map((x) => (x.exam_name === a.exam_name ? { ...x, editValue: e.target.value } : x)),
                              )
                            }
                          />
                        </td>
                        <td className="space-x-2 whitespace-nowrap py-2">
                          <Button onClick={() => saveAmount(a.exam_name, a.editValue)}>Save</Button>
                          <Button variant="outline" onClick={() => deleteAmount(a.exam_name)}>Delete</Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
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
