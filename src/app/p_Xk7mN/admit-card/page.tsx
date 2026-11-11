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
  exam_time?: string | null;
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
  { value: "student_group", label: "Group", key: "student_group" },
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
  const [logoSrc, setLogoSrc] = useState<string>("");

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

  useEffect(() => {
    // prefer admin-uploaded logo from settings, fall back to /logo.png
    // /admin/settings returns the full settings list — the same source the
    // ID Cards page uses for college_logo (key + stored path).
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

  /** Title Case: "SHATHI KHATUN" -> "Shathi Khatun" (shortens long caps names). */
  const titleCase = (v: string): string =>
    v
      .toLowerCase()
      .replace(/(^|[\s.'-])([\p{L}])/gu, (_m, p, c) => p + c.toUpperCase());

  const studentFields = (s: AdmitStudent): [string, string][] =>
    FIELD_OPTIONS.filter((f) => config.fields.includes(f.value)).map((f) => {
      const label = f.label
        .replace(" (Student ID)", "")
        .replace(" (Bangla)", "");
      let value = String(s[f.key] ?? "") || "N/A";
      // Names stored in ALL CAPS waste width and force ugly wraps on the card
      // — display them in Title Case so they fit on one line.
      if (["Student Name", "Father's Name", "Mother's Name"].includes(label)) {
        value = titleCase(value);
      }
      if (
        ["Student Name", "Father's Name", "Mother's Name", "Group", "Student Type"].includes(
          label,
        )
      ) {
        value = "\u00A0 " + value; // one space after colon
      }
      return [label, value] as [string, string];
    });

  const handleDownload = async () => {
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

    // Logo → data URL + HTMLImageElement so the PDF embeds it (jsPDF addImage
    // needs a data URL; the element gives natural dimensions for aspect ratio)
    let logoDataUrl: string | null = null;
    let logoImg: HTMLImageElement | null = null;
    // Per-student photo cache (same pipeline as the logo)
    const photoCache = new Map<string, { url: string | null; img: HTMLImageElement | null }>();
    const loadPhoto = async (s: AdmitStudent) => {
      if (!s.photo_path) return { url: null, img: null };
      if (photoCache.has(s.photo_path)) return photoCache.get(s.photo_path)!;
      const url = `${UPLOAD_BASE}/uploads/${s.photo_path}`;
      const entry = await new Promise<{ url: string | null; img: HTMLImageElement | null }>(
        (resolve) => {
          const img = new Image();
          img.crossOrigin = "anonymous";
          img.onload = () => resolve({ url, img });
          img.onerror = () => resolve({ url: null, img: null });
          img.src = url;
        },
      );
      if (entry.img) {
        try {
          const canvas = document.createElement("canvas");
          canvas.width = entry.img.naturalWidth;
          canvas.height = entry.img.naturalHeight;
          canvas.getContext("2d")!.drawImage(entry.img, 0, 0);
          photoCache.set(s.photo_path, { url: canvas.toDataURL("image/png"), img: entry.img });
        } catch {
          photoCache.set(s.photo_path, { url: null, img: null });
        }
      } else {
        photoCache.set(s.photo_path, { url: null, img: null });
      }
      return photoCache.get(s.photo_path)!;
    };
    if (logoSrc) {
      try {
        logoImg = await new Promise<HTMLImageElement>((resolve) => {
          const img = new Image();
          img.crossOrigin = "anonymous";
          img.onload = () => resolve(img);
          img.onerror = () => resolve(null as unknown as HTMLImageElement);
          img.src = logoSrc;
        });
        if (logoImg) {
          const canvas = document.createElement("canvas");
          canvas.width = logoImg.naturalWidth;
          canvas.height = logoImg.naturalHeight;
          canvas.getContext("2d")!.drawImage(logoImg, 0, 0);
          logoDataUrl = canvas.toDataURL("image/png");
        }
      } catch {}
    }

    for (let i = 0; i < students.length; i++) {
      const s = students[i];
      if (i > 0 && i % perPage === 0) doc.addPage();
      const idxOnPage = i % perPage;
      const y = margin + idxOnPage * (cardH + gap);
      const ph = await loadPhoto(s);
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
        logoDataUrl,
        logoImg,
        ph.url,
        ph.img,
      );
    }

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
                <Button variant="secondary" onClick={() => handleDownload()}>
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
                    <div className="header-logo-row">
                      {logoSrc && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={logoSrc} alt="Logo" className="college-logo" />
                      )}
                      <h2 className="college-name">{config.college_name}</h2>
                    </div>
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
                            <th>Time</th>
                            <th>Subject</th>
                          </tr>
                        </thead>
                        <tbody>
                          {routineFor(s, routine).map((r) => (
                            <tr key={r.id}>
                              <td>{fmtDate(r.exam_date)}</td>
                              <td>{dayName(r.exam_date)}</td>
                              <td>{r.exam_time || "-"}</td>
                              <td>{r.subjects.map((sb) => routineLabel.current[sb] || sb).join(", ")}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      <p className="routine-note" style={{ textAlign: "center", fontSize: 12 }}>Exam Routine (own subjects only)</p>
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
          border: 2px solid #1e3a8a;
          border-radius: 10px;
          overflow: hidden;
          padding: 0 18px 14px;
          flex: 1;
          background: #ffffff;
        }
        .header-area {
          text-align: center;
          margin: 0 -18px 10px;
          padding: 10px 12px 8px;
          background: linear-gradient(180deg, #dbeafe 0%, #eff6ff 100%);
          border-bottom: 2px solid #1e3a8a;
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
          font-size: 18px;
          font-weight: bold;
          margin: 0;
          color: #1e3a8a;
          letter-spacing: 0.4px;
        }
        .college-address {
          font-size: 12px;
          margin: 2px 0;
        }
        .admit-title {
          display: inline-block;
          font-size: 13px;
          font-weight: 700;
          margin-top: 6px;
          margin-bottom: 0;
          background: #1e3a8a;
          color: #ffffff;
          padding: 2px 18px;
          border-radius: 999px;
          letter-spacing: 2px;
        }
        .exam-label {
          font-size: 12.5px;
          font-weight: 600;
          margin-top: 5px;
          color: #b91c1c;
          text-transform: uppercase;
          letter-spacing: 0.6px;
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
          width: 70px;
          height: 90px;
          object-fit: cover;
          border: 2px solid #1e3a8a;
          border-radius: 6px;
          background: #fff;
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
          font-size: 12.5px;
          flex: 1;
        }
        .info-grid.full-width {
          grid-template-columns: 1fr 1fr;
        }
        .info-label {
          font-weight: 700;
          color: #1e3a8a;
        }
        .qr-area {
          flex-shrink: 0;
          text-align: center;
        }
        .qr-img {
          width: 45px;
          height: 45px;
        }
        .qr-caption {
          display: block;
          font-size: 9px;
          color: #1e3a8a;
          font-weight: 600;
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
          font-size: 11.5px;
        }
        .routine-table th,
        .routine-table td {
          border: 1px solid #94a3b8;
          padding: 3px 6px;
          text-align: left;
        }
        .routine-table th {
          background: #1e3a8a;
          color: #fff;
          font-weight: bold;
        }
        .routine-table tbody tr:nth-child(even) {
          background: #eff6ff;
        }
        .routine-note {
          font-size: 12px;
          margin: 3px 0 0;
          color: #1e3a8a;
          font-weight: 600;
          text-align: center;
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
  routine: { id: number; exam_date: string; exam_time?: string | null; subjects: string[] }[] = [],
  logoDataUrl?: string | null,
  logoImg?: HTMLImageElement | null,
  photoDataUrl?: string | null,
  photoImg?: HTMLImageElement | null,
) {
  const NAVY = [30, 58, 138] as const;

  // Card frame (navy, rounded) + header banner — mirrors .admit-card/.header-area
  doc.setLineWidth(0.6);
  doc.setDrawColor(NAVY[0], NAVY[1], NAVY[2]);
  doc.roundedRect(margin, y, cardW, cardH, 2, 2);
  const headerH = 30;
  doc.setFillColor(219, 234, 254); // #dbeafe
  doc.rect(margin + 0.3, y + 0.3, cardW - 0.6, headerH, "F");
  doc.line(margin, y + headerH, margin + cardW, y + headerH);

  // College logo (left of college name), same as screen header-logo-row.
  // IMPORTANT: set the name's font BEFORE measuring — getTextWidth uses the
  // current font state, which is stale from the previous card otherwise
  // (that's why only the 1st card's logo sat correctly).
  const nameX = margin + cardW / 2;
  doc.setFont("times", "bold");
  doc.setFontSize(15);
  if (logoImg && logoDataUrl) {
    const logoH = 14;
    const ratio = logoImg.width && logoImg.height ? logoImg.width / logoImg.height : 1;
    const logoW = Math.min(logoH * ratio, 18);
    const nameW2 = doc.getTextWidth(config.college_name) / 2 + 2; // half name width + gap
    const lx = Math.max(margin + 4, nameX - nameW2 - logoW - 2); // never past card edge
    try {
      doc.addImage(logoDataUrl, "PNG", lx, y + 4, logoW, logoH);
    } catch {}
  }
  doc.setTextColor(NAVY[0], NAVY[1], NAVY[2]);
  doc.text(config.college_name, nameX, y + 10, {
    align: "center",
  });
  doc.setTextColor(0, 0, 0);
  doc.setFont("times", "normal");
  doc.setFontSize(9);
  doc.text(config.college_address, margin + cardW / 2, y + 15.5, {
    align: "center",
  });
  // ADMIT CARD navy chip, same as .admit-title pill
  doc.setFont("times", "bold");
  doc.setFontSize(10.5);
  const chipW = 46;
  doc.setFillColor(NAVY[0], NAVY[1], NAVY[2]);
  doc.roundedRect(margin + cardW / 2 - chipW / 2, y + 18, chipW, 6.5, 3, 3, "F");
  doc.setTextColor(255, 255, 255);
  doc.text("ADMIT CARD", margin + cardW / 2, y + 22.6, { align: "center" });
  doc.setTextColor(185, 28, 28); // #b91c1c exam label
  doc.setFontSize(9);
  doc.text(examLabel.toUpperCase(), margin + cardW / 2, y + 27.5, {
    align: "center",
  });
  doc.setTextColor(0, 0, 0);

  const contentY = y + 33;
  let infoX = margin + 6;
  const photoW = 20;
  const photoH = 25;
  if (config.photo) {
    doc.setLineWidth(0.3);
    doc.setDrawColor(NAVY[0], NAVY[1], NAVY[2]);
    doc.roundedRect(margin + 6, contentY, photoW, photoH, 1, 1);
    if (photoDataUrl && photoImg) {
      try {
        doc.addImage(photoDataUrl, "PNG", margin + 6.15, contentY + 0.15, photoW - 0.3, photoH - 0.3);
      } catch {
        doc.setFontSize(6.5);
        doc.text("Photo", margin + 6 + photoW / 2, contentY + photoH / 2 + 1, {
          align: "center",
        });
      }
    } else {
      doc.setFontSize(6.5);
      doc.text("Photo", margin + 6 + photoW / 2, contentY + photoH / 2 + 1, {
        align: "center",
      });
    }
    doc.setDrawColor(0, 0, 0);
    infoX = margin + 6 + photoW + 5;
  }

  // QR code (fee verification) on the right edge
  let qrX = margin + cardW - 6;
  if (qrDataUrl) {
    const qrSize = 15;
    qrX = margin + cardW - 6 - qrSize;
    doc.addImage(qrDataUrl, "PNG", qrX, contentY, qrSize, qrSize);
    doc.setFontSize(6.5);
    doc.setTextColor(NAVY[0], NAVY[1], NAVY[2]);
    doc.text("Fee Verify QR", qrX + qrSize / 2, contentY + qrSize + 3, {
      align: "center",
    });
    doc.setTextColor(0, 0, 0);
  }

  const colW = (cardW - (infoX - margin) - 8 - (qrDataUrl ? 26 : 0)) / 2;
  doc.setFontSize(9.5);
  fields.forEach(([label, value], fi) => {
    const col = fi % 2;
    const row = Math.floor(fi / 2);
    const fx = infoX + col * colW;
    const fy = contentY + 4 + row * 5.5;
    doc.setFont("times", "bold");
    doc.setTextColor(NAVY[0], NAVY[1], NAVY[2]);
    doc.text(`${label}:`, fx, fy);
    doc.setTextColor(0, 0, 0);
    doc.setFont("times", "normal");
    // Long names (esp. Bangla) would run into the neighbouring column or the
    // QR — clamp the value width and splitLines() wraps it onto extra lines
    const vx = fx + doc.getTextWidth(`${label}: `) + 1;
    const maxW = colW - doc.getTextWidth(`${label}: `) - 4;
    let lines: string[] = doc.splitTextToSize(value, Math.max(maxW, 12));
    if (lines.length > 1) {
      // A 2nd line looks bad — shrink the font (9.5 → 6.5pt) until it fits ONE
      // line instead of wrapping.
      for (let fs2 = 9; fs2 >= 6.5; fs2 -= 0.5) {
        doc.setFontSize(fs2);
        lines = doc.splitTextToSize(value, Math.max(maxW, 12));
        if (lines.length <= 1) break;
      }
    }
    lines.forEach((ln: string, li: number) => {
      doc.text(ln, vx, fy + li * 4.4);
    });
    doc.setFontSize(9.5);
  });

  if (routine.length > 0) {
    // row height grows with font size; heading sits above the table
    const rowH = 5.4;
    // signature block needs ~22mm (line + caption + breathing room) —
    // previously 18mm squeezed the signature area; also honor signature_space
    const sigReserve = config.signatures ? 22 + (config.signature_space || 0) / 2 : 8;
    const rh = Math.min(routine.length * rowH + 11, cardH / 3);
    const ry = y + cardH - rh - sigReserve;
    doc.setLineWidth(0.2);
    doc.setFontSize(10);
    doc.setFont("times", "bold");
    doc.setTextColor(NAVY[0], NAVY[1], NAVY[2]);
    doc.text("EXAM ROUTINE (own subjects only)", margin + cardW / 2, ry + 3, {
      align: "center",
    });
    doc.setTextColor(0, 0, 0);
    // Narrow Date/Day/Time; Subject takes exactly the remainder so the table
    // right edge sits 6mm INSIDE the card border (right: margin+cardW-6).
    doc.setFontSize(9); // header + row cell font
    const cols = [margin + 6, margin + 36, margin + 66, margin + 90];
    const tableRight = margin + cardW - 6;
    const colW = [30, 30, 24, tableRight - (margin + 90)];
    const headY = ry + 9;
    doc.setFillColor(NAVY[0], NAVY[1], NAVY[2]);
    doc.rect(cols[0], headY - 4, tableRight - cols[0], 5, "F");
    doc.setTextColor(255, 255, 255);
    doc.text("Date", cols[0] + 1, headY);
    doc.text("Day", cols[1] + 1, headY);
    doc.text("Time", cols[2] + 1, headY);
    doc.text("Subject", cols[3] + 1, headY);
    doc.setTextColor(0, 0, 0);
    doc.setFont("times", "normal");
    let rowY = headY + 5;
    const rowsDrawn = Math.min(routine.length, 8);
    const tableBottom = headY + 5 + rowsDrawn * rowH;
    // zebra fills FIRST — grid lines are drawn after, so the fills can never
    // paint over them (that was the broken-line bug)
    routine.slice(0, 8).forEach((_, ri) => {
      if (ri % 2 === 1) {
        doc.setFillColor(239, 246, 255); // #eff6ff
        doc.rect(cols[0], headY + 1 + ri * rowH, tableRight - cols[0], rowH, "F");
      }
    });
    routine.slice(0, 8).forEach((r) => {
      const dt = new Date(r.exam_date + "T00:00:00");
      const dateStr = isNaN(dt.getTime())
        ? r.exam_date
        : dt.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
      const dayStr = isNaN(dt.getTime()) ? "" : dt.toLocaleDateString("en-GB", { weekday: "long" });
      doc.text(dateStr, cols[0] + 1, rowY);
      doc.text(dayStr, cols[1] + 1, rowY);
      doc.text(r.exam_time || "-", cols[2] + 1, rowY);
      doc.text(r.subjects.map((sb) => routineLabel.current[sb] || sb).join(", "), cols[3] + 1, rowY, { maxWidth: colW[3] - 2 });
      rowY += rowH;
    });
    // continuous full grid: outer frame + every column separator, one stroke
    const colXs = [cols[0], cols[1], cols[2], cols[3], tableRight];
    doc.setDrawColor(148, 163, 184); // #94a3b8 like the preview borders
    colXs.forEach((cx) => doc.line(cx, headY - 4, cx, tableBottom - 4));
    doc.line(cols[0], headY - 4, tableRight, headY - 4);
    doc.line(cols[0], tableBottom - 4, tableRight, tableBottom - 4);
    for (let ri = 1; ri < rowsDrawn; ri++) {
      const ly = headY + 1 + ri * rowH;
      doc.line(cols[0], ly, tableRight, ly);
    }
    doc.setDrawColor(0, 0, 0);
  }

  if (config.signatures) {
    // keep the signature line clear of the routine table bottom
    const sigY = y + cardH - 12 - (config.signature_space || 0) / 2;
    doc.line(margin + 10, sigY, margin + 60, sigY);
    doc.setFontSize(8.5);
    doc.text("Controller of Examinations", margin + 35, sigY + 4.5, {
      align: "center",
    });
    doc.line(margin + cardW - 60, sigY, margin + cardW - 10, sigY);
    doc.text("Principal", margin + cardW - 35, sigY + 4.5, { align: "center" });
  }
}
