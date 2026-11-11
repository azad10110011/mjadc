"use client";

import { useEffect, useState } from "react";
import jsPDF from "jspdf";
import QRCode from "qrcode";
import { PanelLayout } from "@/components/layout";
import {
  Button,
  Select,
  Input,
  Card,
  CardContent,
} from "@/components/ui";
import { EXAM_NAMES, type StudentClass } from "@/types";
import { api, UPLOAD_BASE } from "@/lib/api";
import { Printer, Download, Save } from "lucide-react";

interface AdmitStudent {
  student_id: string;
  name: string;
  name_bn: string | null;
  father_name: string | null;
  mother_name: string | null;
  date_of_birth: string | null;
  registration_no: string | null;
  class: string;
  section: string | null;
  student_group: string | null;
  student_type: string | null;
  academic_session: string | null;
  class_roll: string | null;
  photo_path: string | null;
  student_user_id?: number;
  selective_subjects?: string[] | string | null;
  optional_subject?: string | null;
}

interface RoutineEntry {
  id: number;
  exam_date: string;
  subjects: string[];
}

// Paper-label map for the routine: fetched with the routine when generating
// cards (subject name -> "code paper-name" or coded subject label).
const routineLabel = { current: {} as Record<string, string> };

interface AdmitConfig {
  fields: string[];
  per_page: number;
  signature_space: number;
  photo: boolean;
  signatures: boolean;
  college_name: string;
  college_address: string;
}

const FIELD_OPTIONS: {
  value: string;
  label: string;
  key: keyof AdmitStudent;
}[] = [
  { value: "class_roll", label: "Class Roll", key: "class_roll" },
  { value: "student_id", label: "Roll Number (Student ID)", key: "student_id" },
  { value: "name", label: "Student Name", key: "name" },
  { value: "name_bn", label: "Student Name (Bangla)", key: "name_bn" },
  { value: "father_name", label: "Father's Name", key: "father_name" },
  { value: "mother_name", label: "Mother's Name", key: "mother_name" },
  { value: "date_of_birth", label: "Date of Birth", key: "date_of_birth" },
  {
    value: "registration_no",
    label: "Registration No",
    key: "registration_no",
  },
  { value: "class", label: "Class", key: "class" },
  { value: "section", label: "Section", key: "section" },
  { value: "student_group", label: "Group/Department", key: "student_group" },
  { value: "student_type", label: "Student Type", key: "student_type" },
  {
    value: "academic_session",
    label: "Academic Session",
    key: "academic_session",
  },
];

const DEFAULT_CONFIG: AdmitConfig = {
  fields: FIELD_OPTIONS.map((f) => f.value),
  per_page: 2,
  signature_space: 20,
  photo: true,
  signatures: true,
  college_name: "Miah Jinnah Alam Degree College",
  college_address: "Garaganj, Shailkupa, Jhenaidah",
};

const COMPULSORY_SUBJECTS = ["Bangla", "English", "ICT"];

/** Subject name equality that tolerates spelling variants (ICT vs full name). */
const sameSubject = (a: string, b: string): boolean => {
  const norm = (x: string) =>
    x.trim().toLowerCase().replace(/\s+/g, " ").replace(/^information and communication technology$/, "ict");
  return norm(a) === norm(b);
};

/** Student's full subject list: compulsory + selective + optional. */
const studentSubjects = (s: AdmitStudent): string[] => {
  let sel: string[] = [];
  const raw = s.selective_subjects;
  if (Array.isArray(raw)) sel = raw;
  else if (typeof raw === "string") {
    try { sel = JSON.parse(raw); } catch { sel = []; }
  }
  const list = [...COMPULSORY_SUBJECTS, ...sel];
  if (s.optional_subject) list.push(s.optional_subject);
  return list;
};

/** Routine entries filtered to the subjects this student actually takes. */
const routineFor = (s: AdmitStudent, routine: RoutineEntry[]): RoutineEntry[] =>
  routine
    .map((r) => ({
      ...r,
      subjects: r.subjects.filter((sub) =>
        studentSubjects(s).some((mine) => sameSubject(mine, sub)),
      ),
    }))
    .filter((r) => r.subjects.length > 0);

export default function AdminAdmitCardPage() {
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [cls, setCls] = useState("");
  const [examName, setExamName] = useState("");
  const [studentId, setStudentId] = useState("");
  const [group, setGroup] = useState("");
  const [students, setStudents] = useState<AdmitStudent[]>([]);
  const [examLabel, setExamLabel] = useState("");
  const [qrCodes, setQrCodes] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [routine, setRoutine] = useState<RoutineEntry[]>([]);

  const [config, setConfig] = useState<AdmitConfig>(DEFAULT_CONFIG);
  const [configLoading, setConfigLoading] = useState(true);
  const [configSaving, setConfigSaving] = useState(false);
  const [configMsg, setConfigMsg] = useState("");

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

  useEffect(() => {
    api
      .get<{ status: number; data: AdmitConfig | null }>(
        "/admin/admit-card-config",
      )
      .then((res) => {
        if (res.data) {
          setConfig({ ...DEFAULT_CONFIG, ...res.data });
        }
      })
      .catch(() => {})
      .finally(() => setConfigLoading(false));
  }, []);

  const handleSaveConfig = async () => {
    setConfigSaving(true);
    setConfigMsg("");
    try {
      await api.put("/admin/admit-card-config", config);
      setConfigMsg("Configuration saved");
      setTimeout(() => setConfigMsg(""), 3000);
    } catch (err: unknown) {
      setConfigMsg(
        err instanceof Error ? err.message : "Failed to save configuration",
      );
    } finally {
      setConfigSaving(false);
    }
  };

  const toggleField = (value: string) => {
    setConfig((c) => ({
      ...c,
      fields: c.fields.includes(value)
        ? c.fields.filter((f) => f !== value)
        : [...c.fields, value],
    }));
  };

  const handleGenerate = async () => {
    if (!cls || !examName || !year) {
      setError("Class, Exam Name, and Year are required");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res: { status: number; data: AdmitStudent[] } = await api.post(
        "/admin/admit-card",
        {
          class: cls,
          ...(studentId && { student_id: studentId }),
          ...(group && { group }),
        },
      );
      const list = res.data || [];
      setStudents(list);
      // Load the exam routine for the same year/class/exam (per-student subject filter)
      api
        .get<{ status: number; data: RoutineEntry[] }>(
          `/admin/exam-routines?year=${year}&class=${encodeURIComponent(cls)}&exam_name=${encodeURIComponent(examName)}`,
        )
        .then((r) => setRoutine(r.data || []))
        .catch(() => setRoutine([]));
      // Build paper-label map from Exam Paper Selection so the card routine
      // shows the paper (with code) examined for each subject.
      try {
        const pp = new URLSearchParams({ year, class: cls, exam_name: examName });
        const cfg = await api.get<{
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
        }>(`/admin/exam-papers?${pp}`);
        if (cfg.data.configured && cfg.data.selections?.length) {
          const counts = new Map<number, number>();
          cfg.data.selections.forEach((s) =>
            counts.set(s.subject_id, (counts.get(s.subject_id) || 0) + 1),
          );
          const labels: Record<string, string> = {};
          cfg.data.selections.forEach((s) => {
            const name = s.subject_name;
            if (!name) return;
            if ((counts.get(s.subject_id) || 0) > 1) return;
            if (s.paper_name) {
              labels[name] = s.paper_code ? `${s.paper_code} ${s.paper_name}` : s.paper_name;
            }
          });
          routineLabel.current = labels;
        } else {
          routineLabel.current = {};
        }
      } catch {
        routineLabel.current = {};
      }
      // Pre-generate QR code data URL per student (verify URL scanned by anyone)
      const qrMap: Record<string, string> = {};
      for (const s of list) {
        const verifyUrl = `${window.location.origin}/verify/exam-fee?student_id=${encodeURIComponent(s.student_id)}&year=${year}&exam=${encodeURIComponent(examName)}`;
        qrMap[s.student_id] = await QRCode.toDataURL(verifyUrl, {
          width: 200,
          margin: 1,
        });
      }
      setQrCodes(qrMap);
      setExamLabel(`${examName} Examination - ${year}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load students");
      setStudents([]);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const fmtDate = (d: string) => {
    const dt = new Date(d + "T00:00:00");
    return isNaN(dt.getTime())
      ? d
      : dt.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  };
  const dayName = (d: string) => {
    const dt = new Date(d + "T00:00:00");
    return isNaN(dt.getTime()) ? "" : dt.toLocaleDateString("en-GB", { weekday: "long" });
  };

  const studentFields = (s: AdmitStudent): [string, string][] =>
    FIELD_OPTIONS.filter((f) => config.fields.includes(f.value)).map((f) => [
      f.label.replace(" (Student ID)", "").replace(" (Bangla)", ""),
      String(s[f.key] ?? "") || "N/A",
    ]);

  const handleDownload = () => {
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const margin = 12;
    const perPage = config.per_page;
    const gap = 8;
    const cardW = pageW - margin * 2;
    const cardH =
      perPage === 2 ? (pageH - margin * 2 - gap) / 2 : pageH - margin * 2;

    students.forEach((s, i) => {
      if (i > 0 && i % perPage === 0) doc.addPage();
      const idxOnPage = i % perPage;
      const y = margin + idxOnPage * (cardH + gap);
      drawCardPdf(
        doc,
        margin,
        y,
        cardW,
        cardH,
        config,
        examLabel,
        studentFields(s),
        qrCodes[s.student_id] || null,
        routineFor(s, routine),
      );
    });

    doc.save(`admit-cards-${cls}-${year}.pdf`);
  };

  // Group students into pages for the on-screen preview (each page holds perPage cards)
  const pages: AdmitStudent[][] = [];
  for (let i = 0; i < students.length; i += config.per_page) {
    pages.push(students.slice(i, i + config.per_page));
  }

  return (
    <PanelLayout role="admin" title="Admit Card">
      {/* Configuration section */}
      <Card className="mb-6 no-print">
        <CardContent className="space-y-4 pt-6">
          <h3 className="text-sm font-semibold text-gray-800">
            Admit Card Configuration
          </h3>
          {configLoading ? (
            <p className="text-sm text-gray-500">Loading configuration...</p>
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <Input
                  label="College Name"
                  value={config.college_name}
                  onChange={(e) =>
                    setConfig((c) => ({ ...c, college_name: e.target.value }))
                  }
                />
                <Input
                  label="College Address"
                  value={config.college_address}
                  onChange={(e) =>
                    setConfig((c) => ({
                      ...c,
                      college_address: e.target.value,
                    }))
                  }
                />
              </div>
              <div>
                <p className="mb-2 text-sm font-medium text-gray-700">
                  Information to include:
                </p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                  {FIELD_OPTIONS.map((f) => (
                    <label
                      key={f.value}
                      className="flex items-center gap-2 text-sm text-gray-700"
                    >
                      <input
                        type="checkbox"
                        checked={config.fields.includes(f.value)}
                        onChange={() => toggleField(f.value)}
                        className="h-4 w-4 accent-blue-600"
                      />
                      {f.label}
                    </label>
                  ))}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-6">
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={config.photo}
                    onChange={(e) =>
                      setConfig((c) => ({ ...c, photo: e.target.checked }))
                    }
                    className="h-4 w-4 accent-blue-600"
                  />
                  Show Photo
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={config.signatures}
                    onChange={(e) =>
                      setConfig((c) => ({ ...c, signatures: e.target.checked }))
                    }
                    className="h-4 w-4 accent-blue-600"
                  />
                  Signature Lines
                </label>
                <div className="w-48">
                  <Select
                    label="Cards per Page"
                    options={
                      [
                        1,
                        2,
                        3,
                        4,
                        5,
                      ].map((n) => ({
                        value: String(n),
                        label: `${n} per page`,
                      })) as { value: string; label: string }[]
                    }
                    value={String(config.per_page)}
                    onChange={(e) =>
                      setConfig((c) => ({
                        ...c,
                        per_page: Number(e.target.value),
                      }))
                    }
                  />
                </div>
                <div className="w-48">
                  <Input
                    label="Space before Signature (mm)"
                    type="number"
                    min={0}
                    max={60}
                    value={String(config.signature_space)}
                    onChange={(e) =>
                      setConfig((c) => ({
                        ...c,
                        signature_space: Math.max(
                          0,
                          Math.min(60, Number(e.target.value) || 0),
                        ),
                      }))
                    }
                  />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Button
                  variant="primary"
                  onClick={handleSaveConfig}
                  disabled={configSaving}
                >
                  <Save className="mr-1 h-4 w-4" />
                  {configSaving ? "Saving..." : "Save Configuration"}
                </Button>
                {configMsg && (
                  <span className="text-sm text-green-600">{configMsg}</span>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Generation section */}
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
            <Input
              label="Student ID (Optional)"
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              placeholder="Leave empty for all"
            />
          </div>
          <div className="flex gap-2">
            <Button
              variant="primary"
              onClick={handleGenerate}
              disabled={loading || !cls || !examName || !year}
            >
              {loading ? "Loading..." : "Generate Admit Cards"}
            </Button>
            {students.length > 0 && (
              <>
                <Button variant="secondary" onClick={handleDownload}>
                  <Download className="mr-1 h-4 w-4" /> Download PDF
                </Button>
                <Button variant="secondary" onClick={handlePrint}>
                  <Printer className="mr-1 h-4 w-4" /> Print
                </Button>
              </>
            )}
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </CardContent>
      </Card>

      {students.length > 0 && (
        <div className="admit-print-container">
          {pages.map((pageStudents, pIdx) => (
            <div
              key={pIdx}
              className={`admit-page${pIdx < pages.length - 1 ? " break-after" : ""}`}
            >
              {pageStudents.map((s) => (
                <div key={s.student_id} className="admit-card">
                  <div className="header-area">
                    <h2 className="college-name">{config.college_name}</h2>
                    <p className="college-address">{config.college_address}</p>
                    <p className="admit-title">Admit Card</p>
                    <p className="exam-label">{examLabel}</p>
                  </div>

                  <div className="card-body">
                    {config.photo && (
                      <div className="photo-area">
                        {s.photo_path ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={`${UPLOAD_BASE}/uploads/${s.photo_path}`}
                            alt={s.name}
                            className="student-photo"
                          />
                        ) : (
                          <div className="student-photo photo-placeholder">
                            Photo
                          </div>
                        )}
                      </div>
                    )}
                    <div
                      className={`info-grid${config.photo ? "" : " full-width"}`}
                    >
                      {studentFields(s).map(([label, value]) => (
                        <div key={label} className="info-item">
                          <span className="info-label">{label}:</span> {value}
                        </div>
                      ))}
                    </div>
                    {qrCodes[s.student_id] && (
                      <div className="qr-area">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={qrCodes[s.student_id]} alt="Fee QR" className="qr-img" />
                        <span className="qr-caption">Fee Verify QR</span>
                      </div>
                    )}
                  </div>

                  {routine.length > 0 && (
                    <div className="routine-area">
                      <table className="routine-table">
                        <thead>
                          <tr>
                            <th>Date</th>
                            <th>Day</th>
                            <th>Subject</th>
                          </tr>
                        </thead>
                        <tbody>
                          {routineFor(s, routine).map((r) => (
                            <tr key={r.id}>
                              <td>{fmtDate(r.exam_date)}</td>
                              <td>{dayName(r.exam_date)}</td>
                              <td>{r.subjects.map((sb) => routineLabel.current[sb] || sb).join(", ")}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      <p className="routine-note">Exam Routine (own subjects only)</p>
                    </div>
                  )}

                  {config.signatures && (
                    <div className="footer-area">
                      <div className="footer-left">
                        <div className="signature-line" />
                        <span>Controller of Examinations</span>
                      </div>
                      <div className="footer-right">
                        <div className="signature-line" />
                        <span>Principal</span>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      <style jsx>{`
        .no-print {
          font-family: inherit;
        }
        .admit-print-container {
          font-family: "Times New Roman", Times, serif;
        }
        .admit-page {
          display: flex;
          flex-direction: column;
          gap: 10px;
          border: 1px dashed #ccc;
          padding: 16px;
          margin-bottom: 16px;
          background: white;
        }
        .admit-card {
          border: 2px solid black;
          padding: 14px 18px;
          flex: 1;
        }
        .header-area {
          text-align: center;
          margin-bottom: 10px;
        }
        .college-name {
          font-size: 18px;
          font-weight: bold;
          margin: 0;
        }
        .college-address {
          font-size: 12px;
          margin: 2px 0;
        }
        .admit-title {
          font-size: 14px;
          font-weight: 600;
          margin-top: 6px;
          margin-bottom: 0;
        }
        .exam-label {
          font-size: 12px;
          margin-top: 2px;
        }
        .card-body {
          display: flex;
          gap: 16px;
          align-items: flex-start;
        }
        .photo-area {
          flex-shrink: 0;
        }
        .student-photo {
          width: 90px;
          height: 115px;
          object-fit: cover;
          border: 1px solid black;
        }
        .photo-placeholder {
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 11px;
          color: #666;
          background: #f5f5f5;
        }
        .info-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1px 18px;
          font-size: 12px;
          flex: 1;
        }
        .info-grid.full-width {
          grid-template-columns: 1fr 1fr;
        }
        .info-label {
          font-weight: 600;
        }
        .qr-area {
          flex-shrink: 0;
          text-align: center;
        }
        .qr-img {
          width: 60px;
          height: 60px;
        }
        .qr-caption {
          display: block;
          font-size: 8px;
          color: #444;
          margin-top: 2px;
        }
        .footer-area {
          display: flex;
          justify-content: space-between;
          font-size: 12px;
          margin-top: 20px;
        }
        .routine-area {
          margin-top: 10px;
        }
        .routine-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 10.5px;
        }
        .routine-table th,
        .routine-table td {
          border: 1px solid #333;
          padding: 3px 6px;
          text-align: left;
        }
        .routine-table th {
          background: #eee;
          font-weight: bold;
        }
        .routine-note {
          font-size: 9px;
          margin: 3px 0 0;
          color: #333;
        }
        .footer-left,
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
          .admit-page {
            border: none;
            padding: 0;
            margin: 0;
            gap: 6mm;
            height: 100vh;
          }
          .admit-card {
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

function drawCardPdf(
  doc: jsPDF,
  margin: number,
  y: number,
  cardW: number,
  cardH: number,
  config: AdmitConfig,
  examLabel: string,
  fields: [string, string][],
  qrDataUrl: string | null,
  routine: { id: number; exam_date: string; subjects: string[] }[] = [],
) {
  doc.setLineWidth(0.6);
  doc.rect(margin, y, cardW, cardH);

  doc.setFont("times", "bold");
  doc.setFontSize(15);
  doc.text(config.college_name, margin + cardW / 2, y + 10, {
    align: "center",
  });
  doc.setFont("times", "normal");
  doc.setFontSize(9);
  doc.text(config.college_address, margin + cardW / 2, y + 15.5, {
    align: "center",
  });
  doc.setFont("times", "bold");
  doc.setFontSize(11);
  doc.text("ADMIT CARD", margin + cardW / 2, y + 22, { align: "center" });
  doc.setFont("times", "normal");
  doc.setFontSize(9);
  doc.text(examLabel, margin + cardW / 2, y + 27.5, { align: "center" });

  const contentY = y + 33;
  let infoX = margin + 6;
  const photoW = 24;
  const photoH = 30;
  if (config.photo) {
    doc.setLineWidth(0.3);
    doc.rect(margin + 6, contentY, photoW, photoH);
    doc.setFontSize(6.5);
    doc.text("Photo", margin + 6 + photoW / 2, contentY + photoH / 2 + 1, {
      align: "center",
    });
    infoX = margin + 6 + photoW + 5;
  }

  // QR code (fee verification) on the right edge
  let qrX = margin + cardW - 6;
  if (qrDataUrl) {
    const qrSize = 20;
    qrX = margin + cardW - 6 - qrSize;
    doc.addImage(qrDataUrl, "PNG", qrX, contentY, qrSize, qrSize);
    doc.setFontSize(5.5);
    doc.text("Fee Verify", qrX + qrSize / 2, contentY + qrSize + 3, {
      align: "center",
    });
  }

  const colW = (cardW - (infoX - margin) - 6 - (qrDataUrl ? 24 : 0)) / 2;
  doc.setFontSize(8.5);
  fields.forEach(([label, value], fi) => {
    const col = fi % 2;
    const row = Math.floor(fi / 2);
    const fx = infoX + col * colW;
    const fy = contentY + 4 + row * 5.5;
    doc.setFont("times", "bold");
    doc.text(`${label}:`, fx, fy);
    doc.setFont("times", "normal");
    doc.text(value, fx + doc.getTextWidth(`${label}: `) + 1, fy);
  });

  if (routine.length > 0) {
    const rh = Math.min(routine.length * 5 + 9, cardH / 3);
    const ry = y + cardH - rh - (config.signatures ? 18 : 8);
    doc.setLineWidth(0.2);
    doc.setFontSize(7.5);
    doc.setFont("times", "bold");
    doc.text("EXAM ROUTINE", margin + 6, ry + 3);
    const cols = [margin + 6, margin + 42, margin + 78];
    const colW = [36, 36, cardW - 78];
    const headY = ry + 7;
    doc.rect(cols[0], headY - 3.4, colW[0] + colW[1] + colW[2], 4.6);
    doc.text("Date", cols[0] + 1, headY);
    doc.text("Day", cols[1] + 1, headY);
    doc.text("Subject", cols[2] + 1, headY);
    doc.setFont("times", "normal");
    let rowY = headY + 4.6;
    routine.slice(0, 8).forEach((r) => {
      const dt = new Date(r.exam_date + "T00:00:00");
      const dateStr = isNaN(dt.getTime())
        ? r.exam_date
        : dt.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
      const dayStr = isNaN(dt.getTime()) ? "" : dt.toLocaleDateString("en-GB", { weekday: "long" });
      doc.rect(cols[0], rowY - 3.4, colW[0] + colW[1] + colW[2], 4.6);
      doc.text(dateStr, cols[0] + 1, rowY);
      doc.text(dayStr, cols[1] + 1, rowY);
      doc.text(r.subjects.map((sb) => routineLabel.current[sb] || sb).join(", "), cols[2] + 1, rowY, { maxWidth: colW[2] - 2 });
      rowY += 4.6;
    });
  }

  if (config.signatures) {
    const sigY = y + cardH - 10 - (config.signature_space || 0) / 2;
    doc.line(margin + 10, sigY, margin + 60, sigY);
    doc.setFontSize(8.5);
    doc.text("Controller of Examinations", margin + 35, sigY + 4.5, {
      align: "center",
    });
    doc.line(margin + cardW - 60, sigY, margin + cardW - 10, sigY);
    doc.text("Principal", margin + cardW - 35, sigY + 4.5, { align: "center" });
  }
}
