"use client";

import { useState } from "react";
import { PanelLayout } from "@/components/layout";
import { Button, Select, Card, CardContent } from "@/components/ui";
import { EXAM_NAMES, type StudentClass } from "@/types";
import { api } from "@/lib/api";
import { Printer } from "lucide-react";

interface MarkStudent {
  student_id: string;
  name: string;
  class_roll: string | null;
  class: string;
  section: string | null;
  student_group: string | null;
}

interface SubjectPart {
  part_name: string;
  full_mark: string;
  pass_mark: string;
}

interface SubjectWithParts {
  name: string;
  subject_name: string;
  parts: SubjectPart[];
  students: MarkStudent[];
}

export default function AdminMarkEntryFormPage() {
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [cls, setCls] = useState("");
  const [examName, setExamName] = useState("");
  const [group, setGroup] = useState("");
  const [subjects, setSubjects] = useState<SubjectWithParts[]>([]);
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [examLabel, setExamLabel] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const years = Array.from({ length: 25 }, (_, i) => ({
    value: String(2026 + i),
    label: String(2026 + i),
  }));
  const examOptions = cls
    ? EXAM_NAMES[cls as StudentClass]?.map((e) => ({ value: e, label: e }))
    : [];
  const groupOptions = [
    { value: "", label: "All Groups" },
    { value: "Science", label: "Science" },
    { value: "Business Studies", label: "Business Studies" },
    { value: "Humanities", label: "Humanities" },
  ];
  const shownSubjects = subjects.filter((s) =>
    selectedSubjects.includes(s.name),
  );

  const toggleSubject = (name: string) => {
    setSelectedSubjects((prev) =>
      prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name],
    );
  };

  const handleGenerate = async () => {
    if (!cls || !examName || !year) {
      setError("Class, Exam Name, and Year are required");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res: {
        status: number;
        data: { subjects: SubjectWithParts[] };
      } = await api.post("/admin/mark-entry-form", {
        class: cls,
        ...(group && { group }),
      });
      setSubjects(res.data?.subjects || []);
      setSelectedSubjects((res.data?.subjects || []).map((s) => s.name));
      setExamLabel(`${examName} Examination - ${year}`);
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Failed to load mark entry form",
      );
      setSubjects([]);
      setSelectedSubjects([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <PanelLayout role="admin" title="Mark Entry Form Download">
      <Card className="mb-6 no-print">
        <CardContent className="space-y-4 pt-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
            <Select
              label="Group (Optional)"
              options={groupOptions}
              value={group}
              onChange={(e) => setGroup(e.target.value)}
            />
          </div>

          {/* Subject selection — only shown after subjects are loaded */}
          {subjects.length > 0 && (
            <div>
              <div className="mb-2 flex items-center gap-3">
                <p className="text-sm font-medium text-gray-700">
                  Select Subjects ({selectedSubjects.length} of {subjects.length} selected):
                </p>
                <button
                  type="button"
                  className="text-xs text-blue-600 hover:underline"
                  onClick={() =>
                    setSelectedSubjects(
                      selectedSubjects.length === subjects.length
                        ? []
                        : subjects.map((s) => s.name),
                    )
                  }
                >
                  {selectedSubjects.length === subjects.length
                    ? "Deselect all"
                    : "Select all"}
                </button>
              </div>
              <div className="grid max-h-48 grid-cols-2 gap-2 overflow-y-auto rounded border border-gray-200 p-3 sm:grid-cols-3 lg:grid-cols-4">
                {subjects.map((s) => (
                  <label
                    key={s.name}
                    className="flex items-center gap-2 text-sm text-gray-700"
                  >
                    <input
                      type="checkbox"
                    checked={selectedSubjects.includes(s.name)}
                      onChange={() => toggleSubject(s.name)}
                      className="h-4 w-4 accent-blue-600"
                    />
                    {s.name}
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <Button
              variant="primary"
              onClick={handleGenerate}
              disabled={loading || !cls || !examName || !year}
            >
              {loading ? "Loading..." : "Generate Mark Entry Form"}
            </Button>
            {subjects.length > 0 && (
              <Button variant="secondary" onClick={() => window.print()}>
                <Printer className="mr-1 h-4 w-4" /> Print / PDF
              </Button>
            )}
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </CardContent>
      </Card>

      {subjects.length > 0 && (
        <div className="mark-entry-print-container">
          {shownSubjects.map((subject, sIdx) => {
            const parts =
              subject.parts.length > 0
                ? subject.parts
                : [{ part_name: "Total", full_mark: "100", pass_mark: "33" }];
            return (
              <div
                key={subject.name}
                className={`mark-entry-sheet${sIdx < shownSubjects.length - 1 ? " break-after" : ""}`}
              >
                <div className="header-area">
                  <h2 className="college-name">
                    Miah Jinnah Alam Degree College
                  </h2>
                  <p className="college-address">
                    Garaganj, Shailkupa, Jhenaidah
                  </p>
                  <p className="sheet-title">Mark Entry Form</p>
                  <p className="exam-label">{examLabel}</p>
                  <p className="subject-label">
                    Subject: <strong>{subject.name}</strong>
                  </p>
                </div>

                <table className="marks-table">
                  <thead>
                    <tr>
                      <th className="col-sl">SL</th>
                      <th className="col-id">Student ID</th>
                      <th className="col-name">Student Name</th>
                      {parts.map((p) => (
                        <th key={p.part_name} className="col-part">
                          {p.part_name}
                          <br />
                          <span className="th-sub">
                            Full: {p.full_mark}
                            <br />
                            Pass: {p.pass_mark}
                          </span>
                        </th>
                      ))}
                      <th className="col-total">Total</th>
                      <th className="col-grade">Letter<br />Grade</th>
                      <th className="col-gp">Grade<br />Point</th>
                      <th className="col-remarks">Remarks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {subject.students.map((st, i) => (
                      <tr key={st.student_id}>
                        <td className="text-center">{i + 1}</td>
                        <td className="text-center">{st.student_id}</td>
                        <td>{st.name}</td>
                        {parts.map((p) => (
                          <td key={p.part_name} className="entry-cell" />
                        ))}
                        <td className="entry-cell" />
                        <td className="entry-cell" />
                        <td className="entry-cell" />
                        <td className="entry-cell" />
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div className="footer-area">
                  <div className="footer-left">
                    <div className="signature-line" />
                    <span>Subject Teacher</span>
                  </div>
                  <div className="footer-mid">
                    <div className="signature-line" />
                    <span>Controller of Examinations</span>
                  </div>
                  <div className="footer-right">
                    <div className="signature-line" />
                    <span>Principal</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {subjects.length === 0 && !loading && (
        <p className="text-sm text-gray-500">
          No subjects with enrolled students found for this class/group.
        </p>
      )}

      <style jsx>{`
        .no-print {
          font-family: inherit;
        }
        .mark-entry-print-container {
          font-family: "Times New Roman", Times, serif;
        }
        .mark-entry-sheet {
          padding: 0;
        }
        .header-area {
          text-align: center;
          margin-bottom: 14px;
        }
        .college-name {
          font-size: 20px;
          font-weight: bold;
          margin: 0;
        }
        .college-address {
          font-size: 13px;
          margin: 2px 0;
        }
        .sheet-title {
          font-size: 15px;
          font-weight: 600;
          margin-top: 8px;
          margin-bottom: 0;
        }
        .exam-label {
          font-size: 13px;
          margin-top: 2px;
        }
        .subject-label {
          font-size: 14px;
          margin-top: 6px;
        }
        .marks-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 12px;
        }
        .marks-table th,
        .marks-table td {
          border: 1px solid black;
          padding: 4px 6px;
        }
        .marks-table th {
          font-weight: bold;
          text-align: center;
          vertical-align: top;
        }
        .th-sub {
          font-size: 10px;
          font-weight: normal;
        }
        .entry-cell {
          height: 22px;
        }
        .col-sl {
          width: 36px;
        }
        .col-id {
          width: 80px;
        }
        .col-name {
          width: 180px;
        }
        .col-part {
          width: 70px;
        }
        .col-total {
          width: 60px;
        }
        .col-grade {
          width: 55px;
        }
        .col-gp {
          width: 55px;
        }
        .col-remarks {
          width: 80px;
        }
        .text-center {
          text-align: center;
        }
        .footer-area {
          display: flex;
          justify-content: space-between;
          font-size: 13px;
          margin-top: 40px;
        }
        .footer-left,
        .footer-mid,
        .footer-right {
          text-align: center;
        }
        .signature-line {
          width: 160px;
          border-top: 1px solid black;
          margin-bottom: 4px;
        }
        @media print {
          :global(html),
          :global(body) {
            margin: 0 !important;
            padding: 0 !important;
          }
          :global(aside) {
            display: none !important;
          }
          :global(header) {
            display: none !important;
          }
          :global(.flex-1.overflow-auto) {
            overflow: visible !important;
            padding: 0 !important;
          }
          :global(.flex.min-h-screen) {
            display: block !important;
          }
          :global(.flex.flex-1.flex-col) {
            display: block !important;
          }
          .break-after {
            page-break-after: always;
            break-after: page;
          }
          .no-print {
            display: none !important;
          }
          :global(body) {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .mark-entry-sheet {
            padding: 20px 30px;
            page-break-inside: avoid;
          }
          @page {
            margin: 10mm;
          }
        }
      `}</style>
    </PanelLayout>
  );
}
