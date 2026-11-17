"use client";

import { useState, useEffect } from "react";
import { PanelLayout } from "@/components/layout";
import { Button, Select, Card, CardContent, DataTable } from "@/components/ui";
import {
  calculateGradeFromParts,
  type SubjectPart,
} from "@/types";
import { useExamNames } from "@/lib/catalog";
import { api } from "@/lib/api";
import { exportToExcel, exportToPDF } from "@/lib/export";

interface ExamSubjectItem {
  key: string;
  label: string;
  subject_id: number;
  subject_name: string;
  paper_id: number | null;
  paper_name: string | null;
}

export default function ExamControllerUploadResultPage() {
  const EXAM_NAMES = useExamNames();
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [cls, setCls] = useState("");
  const [examName, setExamName] = useState("");
  const [subject, setSubject] = useState("");
  const [students, setStudents] = useState<any[]>([]);
  const [dueNote, setDueNote] = useState(''); // Session 100: students hidden by the admin's fee rule
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [partConfigs, setPartConfigs] = useState<SubjectPart[]>([]);
  const [availableSubjects, setAvailableSubjects] = useState<ExamSubjectItem[]>(
    [],
  );
  const [loadingSubjects, setLoadingSubjects] = useState(false);
  const [subjectError, setSubjectError] = useState("");

  // Subject list = only the papers/subjects admin configured for this exam (Exam Paper Selection)
  useEffect(() => {
    if (!year || !cls || !examName) return;

    let active = true;
    // Deferred so the effect body never setStates synchronously (project lint rule)
    const resetTimer = window.setTimeout(() => {
      if (!active) return;
      setLoadingSubjects(true);
      setSubjectError("");
      setAvailableSubjects([]);
      setSubject("");
      setStudents([]);
      setLoaded(false);
    }, 0);

    api
      .get<{ status: number; data: { subjects: ExamSubjectItem[] } }>(
        `/teacher/results/exam-subjects?year=${year}&class=${encodeURIComponent(cls)}&exam_name=${encodeURIComponent(examName)}`,
      )
      .then((res) => {
        if (active) setAvailableSubjects(res.data?.subjects || []);
      })
      .catch((error: unknown) => {
        if (active)
          setSubjectError(
            error instanceof Error
              ? error.message
              : "Failed to load configured exam subjects",
          );
      })
      .finally(() => {
        if (active) setLoadingSubjects(false);
      });

    return () => {
      active = false;
      window.clearTimeout(resetTimer);
    };
  }, [year, cls, examName]);

  const years = Array.from({ length: 25 }, (_, i) => ({
    value: String(2026 + i),
    label: String(2026 + i),
  }));
  const examOptions = cls
    ? EXAM_NAMES[cls]?.map((e) => ({ value: e, label: e }))
    : [];
  const subjectOptions = availableSubjects.map((s) => ({
    value: s.key,
    label: s.label,
  }));

  const getColumns = () => {
    const cols = [
      { key: "sl", label: "SL No" },
      { key: "student_id", label: "Roll" },
      { key: "name", label: "Name" },
      { key: "student_group", label: "Group" },
    ];
    partConfigs.forEach((p) => {
      cols.push({ key: p.part_name, label: p.part_name.toUpperCase() });
    });
    cols.push(
      { key: "total", label: "Total" },
      { key: "grade", label: "Grade" },
      { key: "gpa", label: "GPA" },
    );
    return cols;
  };

  const handleLoad = async () => {
    if (!year || !cls || !examName || !subject) return;
    const selected = availableSubjects.find((item) => item.key === subject);
    if (!selected) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({
        year,
        class: cls,
        exam_name: examName,
        subject: selected.subject_name,
        subject_id: String(selected.subject_id),
        paper_name: selected.paper_name || "",
      });
      const res: any = await api.get(
        `/teacher/results/load-students?${params}`,
      );
      const configs: SubjectPart[] = res.data?.part_configs || [];
      setPartConfigs(configs);
      const data = res.data?.students || [];
      setDueNote(res.data?.hidden_due ? `${res.data.hidden_due} student(s) are not listed: the admin allows mark entry only for "${res.data.mark_entry_rule_label}" students. Contact the admin / exam office.` : '');
      setStudents(
        data.map((s: any, i: number) => {
          const absentIn: string[] = [...(s.absent_in || [])];
          const rawParts: Record<string, number> = s.parts_data || {};
          const partsData: Record<string, number> = {};
          configs.forEach((p) => {
            const val =
              rawParts[p.part_name] !== undefined
                ? Number(rawParts[p.part_name])
                : Number(s[p.part_name]) || 0;
            partsData[p.part_name] = val;
            if (val > 0 && absentIn.includes(p.part_name)) {
              const idx = absentIn.indexOf(p.part_name);
              if (idx !== -1) absentIn.splice(idx, 1);
            }
          });
          const total = configs.reduce(
            (sum, p) => sum + (partsData[p.part_name] ?? 0),
            0,
          );
          const gradeInfo = calculateGradeFromParts(
            partsData,
            configs,
            absentIn,
          );
          return {
            ...s,
            sl: i + 1,
            partsData: { ...partsData },
            absentIn: [...absentIn],
            grade: gradeInfo.grade,
            gpa: gradeInfo.points,
            total,
          };
        }),
      );
      setLoaded(true);
    } catch {
      setStudents([]);
      setLoaded(true);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    const selected = availableSubjects.find((item) => item.key === subject);
    if (!selected) {
      alert("Choose an exam-configured subject before saving.");
      return;
    }
    setSaving(true);
    try {
      const marks = students.map((s) => ({
        student_id: s.student_id,
        parts_data: s.partsData || {},
        absent_in: s.absentIn || [],
      }));
      await api.post("/teacher/results/upload", {
        year,
        class: cls,
        exam_name: examName,
        subject: selected.subject_name,
        subject_id: selected.subject_id,
        paper_name: selected.paper_name,
        status: "draft",
        marks,
      });
      alert("Results uploaded successfully");
      handleLoad();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setSaving(false);
    }
  };

  const getExportColumns = () => {
    const cols = [
      { key: "sl", label: "SL No" },
      { key: "student_id", label: "Roll" },
      { key: "name", label: "Name" },
      { key: "student_group", label: "Group" },
    ];
    partConfigs.forEach((p) => {
      cols.push({ key: p.part_name, label: p.part_name.toUpperCase() });
    });
    cols.push(
      { key: "total", label: "Total" },
      { key: "grade", label: "Grade" },
      { key: "gpa", label: "GPA" },
    );
    return cols;
  };

  const getExportData = () =>
    students.map((s) => {
      const row: any = {
        sl: s.sl,
        student_id: s.student_id,
        name: s.name,
        student_group: s.student_group || "",
        total: s.total,
        grade: s.grade,
        gpa: s.gpa,
      };
      partConfigs.forEach((p) => {
        row[p.part_name] = s.partsData?.[p.part_name] ?? 0;
      });
      return row;
    });

  const selectedLabel =
    availableSubjects.find((item) => item.key === subject)?.label || subject;

  const handleDownloadExcel = () => {
    const cols = getExportColumns();
    const data = getExportData();
    const filename = `marks_${cls}_${examName}_${selectedLabel}_${year}`;
    exportToExcel(data, cols, filename);
  };

  const handleDownloadPDF = () => {
    const cols = getExportColumns();
    const data = getExportData();
    const title = `Mark Sheet - ${examName} ${cls} ${year} - ${selectedLabel}`;
    const filename = `marks_${cls}_${examName}_${selectedLabel}_${year}`;
    exportToPDF(data, cols, title, filename);
  };

  const updateMark = (idx: number, partName: string, value: string) => {
    setStudents((prev) => {
      const updated = [...prev];
      const s = { ...updated[idx] };
      s.absentIn = s.absentIn || [];
      s.partsData = { ...s.partsData, [partName]: Number(value) || 0 };
      if (s.absentIn.includes(partName)) {
        s.absentIn = s.absentIn.filter((f: string) => f !== partName);
      }
      const gradeInfo = calculateGradeFromParts(
        s.partsData,
        partConfigs,
        s.absentIn,
      );
      s.total = partConfigs.reduce(
        (sum, p) => sum + (s.partsData[p.part_name] ?? 0),
        0,
      );
      s.grade = gradeInfo.grade;
      s.gpa = gradeInfo.points;
      updated[idx] = s;
      return updated;
    });
  };

  const toggleAbsent = (idx: number, partName: string) => {
    setStudents((prev) => {
      const updated = [...prev];
      const s = { ...updated[idx] };
      s.partsData = { ...s.partsData };
      s.absentIn = [...(s.absentIn || [])];
      if (s.absentIn.includes(partName)) {
        s.absentIn = s.absentIn.filter((f: string) => f !== partName);
        s.partsData[partName] = 0;
      } else {
        s.absentIn = [...s.absentIn, partName];
        s.partsData[partName] = 0;
      }
      const gradeInfo = calculateGradeFromParts(
        s.partsData,
        partConfigs,
        s.absentIn,
      );
      s.total = partConfigs.reduce(
        (sum, p) => sum + (s.partsData[p.part_name] ?? 0),
        0,
      );
      s.grade = gradeInfo.grade;
      s.gpa = gradeInfo.points;
      updated[idx] = s;
      return updated;
    });
  };

  const tableData = students.map((s, i) => {
    const row: any = {
      sl: s.sl,
      student_id: s.student_id,
      name: s.name,
      student_group: s.student_group || "-",
    };
    partConfigs.forEach((p) => {
      const config = p;
      const val = s.partsData?.[p.part_name] ?? 0;
      const absent = s.absentIn?.includes(p.part_name) ?? false;
      const isRed = absent || val < config.pass_mark || val > config.full_mark;
      row[p.part_name] = (
        <div className="flex items-center gap-1">
          <input
            type="number"
            className={`w-14 rounded border px-1 py-0.5 text-sm ${isRed ? "bg-red-50 text-red-700 border-red-300" : ""}`}
            value={val}
            disabled={absent}
            min={0}
            max={config.full_mark}
            onChange={(e) =>
              updateMark(
                i,
                p.part_name,
                String(
                  Math.min(
                    config.full_mark,
                    Math.max(0, Number(e.target.value) || 0),
                  ),
                ),
              )
            }
          />
          <label className="flex items-center gap-0.5 text-xs whitespace-nowrap">
            <input
              type="checkbox"
              checked={absent}
              onChange={() => toggleAbsent(i, p.part_name)}
            />
            Absent
          </label>
        </div>
      );
    });
    row.total = s.total;
    row.grade = (
      <span
        className={`text-sm font-medium ${s.grade === "Absent" || s.grade === "F" ? "text-red-600" : ""}`}
      >
        {s.grade}
      </span>
    );
    row.gpa = s.grade === "Absent" ? "Absent" : Number(s.gpa).toFixed(2);
    return row;
  });

  return (
    <PanelLayout role="exam_controller" title="Upload Result">
      {dueNote && <p className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">{dueNote}</p>}
      <Card className="mb-6">
        <CardContent className="space-y-4 pt-6">
          {examName &&
            !loadingSubjects &&
            availableSubjects.length === 0 &&
            !subjectError && (
              <p className="text-xs text-amber-600">
                No subjects are configured for this exam. Ask an admin to
                configure Exam Paper Selection.
              </p>
            )}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Select
              label="Year"
              options={years}
              value={year}
              onChange={(e) => {
                setYear(e.target.value);
                setSubject("");
                setStudents([]);
                setLoaded(false);
              }}
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
                setSubject("");
                setStudents([]);
                setLoaded(false);
              }}
              placeholder="Select Class"
            />
            <Select
              label="Exam Name"
              options={examOptions}
              value={examName}
              onChange={(e) => {
                setExamName(e.target.value);
                setSubject("");
                setStudents([]);
                setLoaded(false);
              }}
              placeholder={cls ? "Select Exam" : "Select class first"}
              disabled={!cls}
            />
            <Select
              label="Subject"
              options={subjectOptions}
              value={subject}
              onChange={(e) => {
                setSubject(e.target.value);
                setStudents([]);
                setLoaded(false);
              }}
              placeholder={
                loadingSubjects
                  ? "Loading configured subjects..."
                  : subjectError
                    ? "Could not load subjects"
                    : availableSubjects.length === 0
                      ? "No subjects configured for this exam"
                      : "Select Subject"
              }
              disabled={loadingSubjects || availableSubjects.length === 0}
            />
          </div>
          {subjectError && (
            <p className="text-sm text-red-600">{subjectError}</p>
          )}
          <Button
            onClick={handleLoad}
            disabled={!year || !cls || !examName || !subject || loading}
          >
            {loading ? "Loading..." : "Load Students"}
          </Button>
        </CardContent>
      </Card>

      {loaded && (
        <Card>
          <CardContent className="pt-6">
            <DataTable
              key={`grid-${subject}`}
              columns={getColumns()}
              data={tableData}
              emptyMessage="No students enrolled in this subject"
            />
            <div className="mt-4 flex gap-2">
              <Button
                onClick={handleSave}
                disabled={saving || students.length === 0}
              >
                {saving ? "Saving..." : "Save Results"}
              </Button>
              {students.length > 0 && (
                <>
                  <Button variant="secondary" onClick={handleDownloadExcel}>
                    Download Excel
                  </Button>
                  <Button variant="secondary" onClick={handleDownloadPDF}>
                    Download PDF
                  </Button>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </PanelLayout>
  );
}
