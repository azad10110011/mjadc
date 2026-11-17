"use client";

import { useCallback, useEffect, useState } from "react";
import jsPDF from "jspdf";
import { PanelLayout } from "@/components/layout";
import { Button, Card, CardContent, Input, Select } from "@/components/ui";
import { EXAM_NAMES, type StudentClass } from "@/types";
import { api } from "@/lib/api";
import { Pencil, Plus, Printer, Download, Trash2 } from "lucide-react";

interface RoutineEntry {
  id: number;
  year: string;
  class: string;
  exam_name: string;
  exam_date: string;
  subjects: string[];
}

interface SubjectOption {
  name: string;
  label: string;
}

// Subjects are fetched from /subjects-with-codes (objects with coded labels).

// Module-level cache of coded subject labels, filled by the fetch effect and
// read by the exam-papers effect (avoids ref-in-render lint restrictions).
const codedLabelsCache: SubjectOption[] = [];

export default function AdminExamRoutinePage() {
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [cls, setCls] = useState("");
  const [examName, setExamName] = useState("");
  const [entries, setEntries] = useState<RoutineEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  // add form
  const [newDate, setNewDate] = useState("");
  const [newSubjects, setNewSubjects] = useState<string[]>([]);
  const [adding, setAdding] = useState(false);

  // edit state
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editDate, setEditDate] = useState("");
  const [editSubjects, setEditSubjects] = useState<string[]>([]);

  const years = Array.from({ length: 25 }, (_, i) => ({
    value: String(2026 + i),
    label: String(2026 + i),
  }));
  const examOptions = cls
    ? (EXAM_NAMES[cls as StudentClass]?.map((e) => ({ value: e, label: e })) ??
      [])
    : [];

  // Subjects with paper codes for the checkbox labels ("253_254 Accounting")
  const [subjectOptions, setSubjectOptions] = useState<SubjectOption[]>([]);
  useEffect(() => {
    let active = true;
    api
      .get<{
        status: number;
        data: { name: string; label: string }[];
      }>("/subjects-with-codes")
      .then((res) => {
        if (!active) return;
        setSubjectOptions(
          (res.data || []).map((s) => ({ name: s.name, label: s.label || s.name })),
        );
        codedLabelsCache.length = 0;
        codedLabelsCache.push(...(res.data || []).map((s) => ({ name: s.name, label: s.label || s.name })));
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  // Subjects allowed in the routine = those configured in Exam Paper Selection
  // for this year/class/exam (unique subject names from the saved selections).
  const [paperSubjectNames, setPaperSubjectNames] = useState<string[] | null>(
    null,
  );
  // subject name -> display label for THIS exam. Single-selected paper ->
  // "code paper-name" (routine shows the paper actually examined); otherwise
  // the coded subject label from /subjects-with-codes ("253_254 Accounting").
  const [labelBySubject, setLabelBySubject] = useState<
    Record<string, string>
  >({});
  useEffect(() => {
    let active = true;
    if (!cls || !examName) return;
    const params = new URLSearchParams({
      year,
      class: cls,
      exam_name: examName,
    });
    api
      .get<{
        status: number;
        data: {
          configured: boolean;
          selections: {
            subject_id: number;
            paper_name?: string | null;
            paper_code?: string | null;
            subject_name?: string | null;
          }[];
        };
      }>(`/admin/exam-papers?${params}`)
      .then(async (res) => {
        if (!active) return;
        if (!res.data.configured || !res.data.selections?.length) {
          setPaperSubjectNames(null);
          return;
        }
        // Map subject_id -> subject name via the subjects tree
        const tree = await api
          .get<{
            status: number;
            data: { id: number; name: string }[];
          }>("/admin/subjects/tree")
          .catch(() => null);
        if (!active) return;
        const rows: { id: number; name: string }[] = tree?.data || [];
        const nameById = new Map<number, string>(
          rows.map((s) => [s.id, s.name]),
        );
        // Count papers per subject: >1 paper selected -> multi-paper subject
        const papersPerSubject = new Map<number, number>();
        res.data.selections.forEach((sel) => {
          papersPerSubject.set(
            sel.subject_id,
            (papersPerSubject.get(sel.subject_id) || 0) + 1,
          );
        });
        const codedLabel = new Map(
          codedLabelsCache.map((s) => [s.name, s.label]),
        );
        const labels: Record<string, string> = {};
        const names = new Set<string>();
        res.data.selections.forEach((sel) => {
          const subjectName = sel.subject_name || nameById.get(sel.subject_id);
          if (!subjectName) return;
          names.add(subjectName);
          if ((papersPerSubject.get(sel.subject_id) || 0) > 1) {
            // multiple papers of the subject sit in this exam -> show subject
            labels[subjectName] = codedLabel.get(subjectName) || subjectName;
          } else if (sel.paper_name) {
            // exactly one paper examined -> routine shows the paper itself
            labels[subjectName] = sel.paper_code
              ? `${sel.paper_code} ${sel.paper_name}`
              : sel.paper_name;
          } else {
            labels[subjectName] = codedLabel.get(subjectName) || subjectName;
          }
        });
        setLabelBySubject(labels);
        setPaperSubjectNames([...names]);
      })
      .catch(() => {
        if (active) setPaperSubjectNames(null);
      });
    return () => {
      active = false;
    };
  }, [year, cls, examName]);

  const allSubjects = subjectOptions;
  const availableSubjects = paperSubjectNames
    ? allSubjects.filter((s) => paperSubjectNames.includes(s.name))
    : allSubjects;

  const fetchEntries = useCallback(async () => {
    if (!cls || !examName) {
      setEntries([]);
      return;
    }
    setLoading(true);
    try {
      const res = await api.get<{ status: number; data: RoutineEntry[] }>(
        `/admin/exam-routines?year=${year}&class=${encodeURIComponent(cls)}&exam_name=${encodeURIComponent(examName)}`,
      );
      setEntries(res.data || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load routine");
    } finally {
      setLoading(false);
    }
  }, [year, cls, examName]);

  useEffect(() => {
    const t = window.setTimeout(() => fetchEntries(), 0);
    return () => window.clearTimeout(t);
  }, [fetchEntries]);

  const toggleNewSubject = (s: string) =>
    setNewSubjects((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s],
    );
  const toggleEditSubject = (s: string) =>
    setEditSubjects((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s],
    );

  const handleAdd = async () => {
    setError("");
    if (!newDate || newSubjects.length === 0) {
      setError("Pick a date and at least one subject");
      return;
    }
    setAdding(true);
    try {
      await api.post("/admin/exam-routines", {
        year,
        class: cls,
        exam_name: examName,
        exam_date: newDate,
        subjects: newSubjects,
      });
      setNewDate("");
      setNewSubjects([]);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      fetchEntries();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to add entry");
    } finally {
      setAdding(false);
    }
  };

  const startEdit = (e: RoutineEntry) => {
    setEditingId(e.id);
    setEditDate(e.exam_date);
    setEditSubjects(e.subjects);
  };

  const handleUpdate = async () => {
    if (!editingId) return;
    setError("");
    if (!editDate || editSubjects.length === 0) {
      setError("Pick a date and at least one subject");
      return;
    }
    try {
      await api.put(`/admin/exam-routines/${editingId}`, {
        exam_date: editDate,
        subjects: editSubjects,
      });
      setEditingId(null);
      fetchEntries();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update entry");
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this routine entry?")) return;
    await api.delete(`/admin/exam-routines/${id}`).catch(() => {});
    if (editingId === id) setEditingId(null);
    fetchEntries();
  };

  /** Display label: paper name (single-paper exams) or coded subject label. */
  const showSubject = (name: string) => labelBySubject[name] || name;
  const showList = (subs: string[]) =>
    subs.map(showSubject).join(", ");

  const fmtDate = (d: string) => {
    const dt = new Date(d + "T00:00:00");
    return isNaN(dt.getTime())
      ? d
      : dt.toLocaleDateString("en-GB", {
          weekday: "short",
          day: "numeric",
          month: "short",
          year: "numeric",
        });
  };

  const handlePrint = () => window.print();

  const handleDownload = () => {
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });
    const pageW = doc.internal.pageSize.getWidth();
    const margin = 14;
    let y = 20;
    doc.setFont("times", "bold");
    doc.setFontSize(15);
    doc.text("Miah Jinnah Alam Degree College", pageW / 2, y, {
      align: "center",
    });
    y += 6;
    doc.setFont("times", "normal");
    doc.setFontSize(10);
    doc.text("Garaganj, Shailkupa, Jhenaidah", pageW / 2, y, {
      align: "center",
    });
    y += 8;
    doc.setFont("times", "bold");
    doc.setFontSize(12);
    doc.text(`${examName} Examination - ${year} (Class ${cls})`, pageW / 2, y, {
      align: "center",
    });
    y += 4;
    doc.setFont("times", "normal");
    y += 6;
    doc.setFontSize(11);
    doc.text("EXAM ROUTINE", pageW / 2, y, { align: "center" });
    y += 10;

    doc.setFontSize(10);
    // table header
    doc.setFillColor(235, 235, 235);
    doc.rect(margin, y - 5, pageW - margin * 2, 8, "F");
    doc.setFont("times", "bold");
    doc.text("Date", margin + 3, y);
    doc.text("Day", margin + 55, y);
    doc.text("Subjects", margin + 85, y);
    y += 8;
    doc.setFont("times", "normal");
    entries.forEach((e) => {
      const day = new Date(e.exam_date + "T00:00:00").toLocaleDateString(
        "en-GB",
        { weekday: "long" },
      );
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
      doc.text(fmtDate(e.exam_date), margin + 3, y);
      doc.text(day, margin + 55, y);
      doc.text(showList(e.subjects), margin + 85, y, {
        maxWidth: pageW - margin - 88,
      });
      y += 7;
      doc.setDrawColor(200);
      doc.line(margin, y - 4, pageW - margin, y - 4);
    });

    doc.save(`exam-routine-${cls}-${examName}-${year}.pdf`);
  };

  return (
    <PanelLayout role="admin" title="Exam Routine">
      <Card className="mb-6 no-print">
        <CardContent className="space-y-4 pt-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Select
              label="Year"
              options={years}
              value={year}
              onChange={(e) => setYear(e.target.value)}
            />
            <Select
              label="Class"
              options={[
                { value: "11th", label: "11th" },
                { value: "12th", label: "12th" },
              ]}
              value={cls}
              onChange={(e) => {
                setCls(e.target.value);
                setExamName("");
                setEntries([]);
              }}
              placeholder="Select Class"
            />
            <Select
              label="Exam Name"
              options={examOptions}
              value={examName}
              onChange={(e) => setExamName(e.target.value)}
              placeholder={cls ? "Select Exam" : "Select class first"}
              disabled={!cls}
            />
          </div>

          {cls && examName && (
            <>
              <div className="rounded-lg border border-gray-200 p-4">
                <h4 className="mb-3 text-sm font-semibold text-gray-800">
                  <Plus className="mr-1 inline h-4 w-4" /> Add Date Entry
                </h4>
                <div className="grid gap-4 sm:grid-cols-[200px_1fr]">
                  <Input
                    label="Exam Date"
                    type="date"
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                  />
                  <div>
                    <p className="mb-2 text-sm font-medium text-gray-700">
                      Subjects on this date (multiple selectable)
                    </p>
                    {availableSubjects.length === 0 ? (
                      <p className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                        No Exam Paper Selection has been saved for {examName} —
                        {year} yet. Configure it first on the Exam Paper
                        Selection page, then the subjects will appear here.
                      </p>
                    ) : (
                    <div className="flex max-h-40 flex-wrap gap-2 overflow-y-auto rounded-lg border border-gray-200 p-3">
                      {availableSubjects.map((s) => (
                        <label
                          key={s.name}
                          className="flex items-center gap-1.5 rounded-lg border border-gray-100 bg-gray-50 px-2.5 py-1 text-sm hover:bg-gray-100"
                        >
                          <input
                            type="checkbox"
                            checked={newSubjects.includes(s.name)}
                            onChange={() => toggleNewSubject(s.name)}
                          />{" "}
                          {showSubject(s.name)}
                        </label>
                      ))}
                    </div>
                    )}
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-3">
                  <Button
                    variant="primary"
                    onClick={handleAdd}
                    disabled={adding}
                  >
                    {adding ? "Adding..." : "Add Entry"}
                  </Button>
                  {saved && (
                    <span className="text-sm text-green-600">Entry added</span>
                  )}
                </div>
              </div>

              <div>
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="font-semibold text-gray-900">
                    {examName} Examination — {year}, Class {cls}
                  </h3>
                  {entries.length > 0 && (
                    <div className="flex gap-2 no-print">
                      <Button variant="secondary" onClick={handlePrint}>
                        <Printer className="mr-1 h-4 w-4" /> Print
                      </Button>
                      <Button variant="secondary" onClick={handleDownload}>
                        <Download className="mr-1 h-4 w-4" /> Download PDF
                      </Button>
                    </div>
                  )}
                </div>
                {loading ? (
                  <p className="text-sm text-gray-500">Loading...</p>
                ) : entries.length === 0 ? (
                  <p className="text-sm text-gray-500">
                    No routine entries yet. Add the first date above.
                  </p>
                ) : (
                  <div className="overflow-hidden rounded-lg border border-gray-200">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
                        <tr>
                          <th className="px-3 py-2">Date</th>
                          <th className="px-3 py-2">Subjects</th>
                          <th className="px-3 py-2 no-print">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {entries.map((e) =>
                          editingId === e.id ? (
                            <tr key={e.id} className="border-t border-gray-100 bg-blue-50">
                              <td className="px-3 py-2">
                                <input
                                  type="date"
                                  value={editDate}
                                  onChange={(ev) => setEditDate(ev.target.value)}
                                  className="rounded border border-gray-300 px-2 py-1 text-sm"
                                />
                              </td>
                              <td className="px-3 py-2">
                                <div className="flex max-w-xl flex-wrap gap-2">
                                  {availableSubjects.map((s) => (
                                    <label key={s.name} className="flex items-center gap-1.5 rounded-lg border border-gray-100 bg-white px-2 py-0.5 text-xs">
                                      <input
                                        type="checkbox"
                                        checked={editSubjects.includes(s.name)}
                                        onChange={() => toggleEditSubject(s.name)}
                                      />{" "}{showSubject(s.name)}
                                    </label>
                                  ))}
                                </div>
                              </td>
                              <td className="px-3 py-2 no-print">
                                <div className="flex gap-1">
                                  <Button variant="primary" size="sm" onClick={handleUpdate}>Save</Button>
                                  <Button variant="ghost" size="sm" onClick={() => setEditingId(null)}>Cancel</Button>
                                </div>
                              </td>
                            </tr>
                          ) : (
                          <tr key={e.id} className="border-t border-gray-100">
                            <td className="px-3 py-2 font-medium">
                              {fmtDate(e.exam_date)}
                            </td>
                            <td className="px-3 py-2">
                              {showList(e.subjects)}
                            </td>
                            <td className="px-3 py-2 no-print">
                              <div className="flex gap-1">
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  onClick={() => startEdit(e)}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="danger"
                                  size="sm"
                                  onClick={() => handleDelete(e.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                          )
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}
          {error && <p className="text-sm text-red-600">{error}</p>}
        </CardContent>
      </Card>

      {/* Printable routine sheet */}
      {cls && examName && entries.length > 0 && (
        <div className="routine-sheet">
          <h2 className="rs-college">Miah Jinnah Alam Degree College</h2>
          <p className="rs-address">Garaganj, Shailkupa, Jhenaidah</p>
          <h3 className="rs-title">
            {examName} Examination — {year} (Class {cls})
          </h3>
          <table className="rs-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Day</th>
                <th>Subjects</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => (
                <tr key={e.id}>
                  <td>{fmtDate(e.exam_date)}</td>
                  <td>
                    {new Date(e.exam_date + "T00:00:00").toLocaleDateString(
                      "en-GB",
                      { weekday: "long" },
                    )}
                  </td>
                  <td>{showList(e.subjects)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <style jsx>{`
        .no-print {
          font-family: inherit;
        }
        .routine-sheet {
          font-family: "Times New Roman", Times, serif;
          background: white;
          padding: 24px;
          border: 1px solid #ddd;
        }
        .rs-college {
          text-align: center;
          font-size: 20px;
          font-weight: bold;
          margin: 0;
        }
        .rs-address {
          text-align: center;
          font-size: 13px;
          margin: 2px 0 8px;
        }
        .rs-title {
          text-align: center;
          font-size: 15px;
          margin: 6px 0 14px;
        }
        .rs-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 13px;
        }
        .rs-table th,
        .rs-table td {
          border: 1px solid #333;
          padding: 8px 10px;
          text-align: left;
        }
        .rs-table th {
          background: #f0f0f0;
        }
        @media print {
          :global(html),
          :global(body) {
            margin: 0 !important;
            padding: 0 !important;
          }
          :global(aside),
          :global(header) {
            display: none !important;
          }
          :global(.flex-1.overflow-auto) {
            overflow: visible !important;
            padding: 0 !important;
          }
          :global(.flex.min-h-screen),
          :global(.flex.flex-1.flex-col) {
            display: block !important;
          }
          .no-print {
            display: none !important;
          }
          .routine-sheet {
            border: none;
            padding: 0;
          }
          @page {
            margin: 12mm;
          }
        }
      `}</style>
    </PanelLayout>
  );
}
