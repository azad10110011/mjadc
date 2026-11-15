"use client";

import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { PanelLayout } from "@/components/layout";
import { Button, Select, Card, CardContent } from "@/components/ui";
import { EXAM_NAMES, type StudentClass } from "@/types";
import { api, UPLOAD_BASE } from "@/lib/api";
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

interface AvailableSubjectItem {
  key: string;
  label: string;
  code: string | null;
  subject_name: string;
  paper_name: string | null;
}

interface SubjectWithParts {
  key?: string;
  label?: string;
  code?: string | null;
  name: string;
  subject_name: string;
  parts: SubjectPart[];
  students: MarkStudent[];
}

export default function AdminMarkEntryFormPage() {
  const { user, loading: authLoading } = useAuth();
  const requestVersion = useRef(0);
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [cls, setCls] = useState("");
  const [examName, setExamName] = useState("");
  const [group, setGroup] = useState("");
  const [subjects, setSubjects] = useState<SubjectWithParts[]>([]);
  const [availableSubjects, setAvailableSubjects] = useState<AvailableSubjectItem[]>([]);
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [examLabel, setExamLabel] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingSubjects, setLoadingSubjects] = useState(false);
  const [error, setError] = useState("");
  // College logo left of the college name (same source as Admit Card / ID Cards)
  const [logoSrc, setLogoSrc] = useState("");

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
  // Fail closed: a sheet must match BOTH a configured checkbox and its selection.
  const allowedKeys = new Set(availableSubjects.map((item) => item.key));
  const shownSubjects = subjects.filter((s) =>
    typeof s.key === "string" && allowedKeys.has(s.key) && selectedKeys.includes(s.key),
  );

  const getGroupPriority = (grp: string | null | undefined): number => {
    const g = (grp || "").trim().toLowerCase();
    if (g.includes("science")) return 1;
    if (g.includes("business")) return 2;
    if (g.includes("humanities")) return 3;
    return 4;
  };

  const sortStudents = (studentsList: MarkStudent[]): MarkStudent[] => {
    return [...studentsList].sort((a, b) => {
      const pA = getGroupPriority(a.student_group);
      const pB = getGroupPriority(b.student_group);
      if (pA !== pB) return pA - pB;

      const rollA = a.class_roll ? parseInt(a.class_roll, 10) : 0;
      const rollB = b.class_roll ? parseInt(b.class_roll, 10) : 0;
      if (rollA && rollB && rollA !== rollB) return rollA - rollB;

      return (a.student_id || "").localeCompare(b.student_id || "");
    });
  };

  // Auto-load subjects when exam is selected
  useEffect(() => {
    let active = true;
    requestVersion.current += 1;
    const loadAvailableSubjects = async () => {
      setAvailableSubjects([]);
      setSelectedKeys([]);
      setError("");
      setLoading(false);
      if (!year || !cls || !examName || !user?.roles.includes("admin")) {
        setAvailableSubjects([]);
        setSelectedKeys([]);
        setLoadingSubjects(false);
        setAvailableSubjects([]);
        setSelectedKeys([]);
        setSubjects([]);
        return;
      }
      
      setLoadingSubjects(true);
      setSubjects([]);
      try {
        const res: {
          status: number;
          data: { subjects: AvailableSubjectItem[] };
        } = await api.get(
          `/admin/mark-entry-form/subjects?year=${year}&class=${cls}&exam_name=${encodeURIComponent(examName)}`
        );
        if (!active) return;
        const subjectList = res.data?.subjects || [];
        setAvailableSubjects(subjectList);
        setSelectedKeys(subjectList.map((s) => s.key)); // All selected by default
      } catch (err: unknown) {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Failed to load configured subjects");
        setAvailableSubjects([]);
        setSelectedKeys([]);
      } finally {
        if (active) setLoadingSubjects(false);
      }
    };

    const timer = window.setTimeout(loadAvailableSubjects, 0);
    return () => {
      active = false;
      requestVersion.current += 1;
      window.clearTimeout(timer);
    };
  }, [year, cls, examName, user]);

  useEffect(() => {
    // Prefer the admin-uploaded logo from settings (same source as Admit Card),
    // fall back to the static /logo.png.
    api
      .get<{ status: number; data: { setting_key: string; setting_value?: string }[] }>(
        "/admin/settings",
      )
      .then((res) => {
        const logo = (res.data || []).find(
          (s) => s.setting_key === "college_logo" && s.setting_value,
        );
        if (logo?.setting_value)
          setLogoSrc(`${UPLOAD_BASE}/${logo.setting_value.replace(/^\/+/, "")}`);
        else setLogoSrc("/logo.png");
      })
      .catch(() => setLogoSrc("/logo.png"));
  }, []);

  const toggleSubject = (key: string) => {
    setSelectedKeys((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    );
  };

  const handleGenerate = async () => {
    const requestedKeys = selectedKeys.filter((key) => allowedKeys.has(key));
    if (!cls || !examName || !year || loadingSubjects || requestedKeys.length === 0) {
      setError("Select a class, exam, year, and at least one configured subject");
      return;
    }
    const version = ++requestVersion.current;
    setLoading(true);
    setSubjects([]);
    setError("");
    try {
      const res: {
        status: number;
        data: { subjects: SubjectWithParts[] };
      } = await api.post("/admin/mark-entry-form", {
        year,
        class: cls,
        exam_name: examName,
        selected_keys: requestedKeys,
        ...(group && { group }),
      });
      if (version !== requestVersion.current) return;
      const returned = res.data?.subjects || [];
      const valid = returned.filter((sheet) =>
        typeof sheet.key === "string" && requestedKeys.includes(sheet.key),
      );
      setSubjects(valid);
      if (returned.length > 0 && valid.length === 0) {
        setError("No returned forms matched the selected exam papers. The Mark Entry Form API must return the configured paper keys.");
      }
      setExamLabel(`${examName} Examination - ${year} • Class ${cls}`);
    } catch (err: unknown) {
      if (version !== requestVersion.current) return;
      setError(
        err instanceof Error ? err.message : "Failed to load mark entry form",
      );
      setSubjects([]);
    } finally {
      if (version === requestVersion.current) setLoading(false);
    }
  };

  if (authLoading) return <p className="p-6">Loading...</p>;
  if (!user?.roles.includes("admin")) {
    return <p className="p-6 text-red-600">Only Admin can access Mark Entry Form Download.</p>;
  }

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

          {/* Subject selection — shown after exam is selected */}
          {availableSubjects.length > 0 && (
            <div>
              <div className="mb-2 flex items-center gap-3">
                <p className="text-sm font-medium text-gray-700">
                  Select Subjects ({selectedKeys.length} of {availableSubjects.length} selected):
                </p>
                <button
                  type="button"
                  className="text-xs text-blue-600 hover:underline"
                  onClick={() =>
                    setSelectedKeys(
                      selectedKeys.length === availableSubjects.length
                        ? []
                        : availableSubjects.map((s) => s.key),
                    )
                  }
                >
                  {selectedKeys.length === availableSubjects.length
                    ? "Deselect all"
                    : "Select all"}
                </button>
              </div>
              <div className="grid max-h-56 grid-cols-2 gap-2 overflow-y-auto rounded border border-gray-200 p-3 sm:grid-cols-3 lg:grid-cols-4">
                {availableSubjects.map((item) => (
                  <label
                    key={item.key}
                    className="flex cursor-pointer items-center gap-2 text-sm text-gray-700 hover:text-gray-900"
                  >
                    <input
                      type="checkbox"
                      checked={selectedKeys.includes(item.key)}
                      onChange={() => toggleSubject(item.key)}
                      className="h-4 w-4 rounded accent-blue-600"
                    />
                    <span>{item.label}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {cls && examName && !loadingSubjects && availableSubjects.length === 0 && (
            <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              No subjects or papers have been configured for this exam yet. Please configure them in{" "}
              <strong>Exam Management → Exam Paper Selection</strong> first.
            </div>
          )}

          <div className="flex gap-2">
            <Button
              variant="primary"
              onClick={handleGenerate}
              disabled={loading || loadingSubjects || !cls || !examName || !year || selectedKeys.length === 0}
            >
              {loading ? "Loading..." : "Generate Mark Entry Form"}
            </Button>
            {shownSubjects.length > 0 && (
              <Button variant="secondary" onClick={() => window.print()}>
                <Printer className="mr-1 h-4 w-4" /> Print / PDF
              </Button>
            )}
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          {loadingSubjects && (
            <p className="text-sm text-gray-500">Loading subjects...</p>
          )}
        </CardContent>
      </Card>

      {shownSubjects.length > 0 && (
        <div className="mark-entry-print-container">
          {shownSubjects.map((subject, sIdx) => {
            const parts =
              subject.parts.length > 0
                ? subject.parts
                : [{ part_name: "Total", full_mark: "100", pass_mark: "33" }];
            return (
              <div
                key={subject.key || subject.name}
                className={`mark-entry-sheet${sIdx < shownSubjects.length - 1 ? " break-after" : ""}`}
              >
                <div className="header-area">
                  <div className="header-logo-row">
                    {logoSrc && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={logoSrc} alt="Logo" className="college-logo" />
                    )}
                    <h2 className="college-name">
                      Miah Jinnah Alam Degree College
                    </h2>
                  </div>
                  <p className="college-address">
                    Garaganj, Shailkupa, Jhenaidah
                  </p>
                  <p className="sheet-title">Mark Entry Form</p>
                  <p className="exam-label">{examLabel}</p>
                  <p className="subject-label">
                    Subject: <strong>{subject.label || subject.name}</strong>
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
                    {sortStudents(subject.students).map((st, i) => (
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

      {cls && examName && !loading && !loadingSubjects && shownSubjects.length === 0 && (
        <p className="text-sm text-gray-500">
          No selected configured subjects have students enrolled for this class/group.
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
        .header-logo-row {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
        }
        .college-logo {
          height: 52px;
          width: 52px;
          object-fit: contain;
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
          // Public website footer (site credits / web address at the bottom-left)
          // must not appear on the printed mark entry forms
          :global(footer) {
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
          /* margin: 0 removes the browser's own print header/footer (page URL etc.),
             which live inside the page margin box; the sheets carry their own padding. */
          @page {
            size: A4;
            margin: 0;
          }
        }
      `}</style>
    </PanelLayout>
  );
}
