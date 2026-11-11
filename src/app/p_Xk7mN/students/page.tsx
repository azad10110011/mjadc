"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { PanelLayout } from "@/components/layout";
import {
  Button,
  Input,
  Select,
  Card,
  CardContent,
  DataTable,
  Badge,
  PhotoWithPreview,
} from "@/components/ui";
import { ArrowUp, ArrowDown, Copy } from "lucide-react"; // Copy used in details view

import { api, UPLOAD_BASE } from "@/lib/api";
import { exportToExcel, exportToPDF, type ExportColumn } from "@/lib/export";

const GROUPS = [
  { value: "Science", label: "Science" },
  { value: "Business Studies", label: "Business Studies" },
  { value: "Humanities", label: "Humanities" },
];

const CLASSES = [
  { value: "11th", label: "11th" },
  { value: "12th", label: "12th" },
  { value: "Old", label: "Old (Ex-Student)" },
];

function StudentsPageInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const urlClass = searchParams.get("class");
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewingStudent, setViewingStudent] = useState<any | null>(null);
  const [search, setSearch] = useState("");
  const [filterClass, setFilterClass] = useState("");
  const [filterGroup, setFilterGroup] = useState("");
  const [resetPwValue, setResetPwValue] = useState("");
  const [resetPwResult, setResetPwResult] = useState("");
  const [resetPwLoading, setResetPwLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copiedField, setCopiedField] = useState("");

  const copySingle = (val: string, field: string) => {
    if (!val || val === "-") return;
    navigator.clipboard.writeText(val);
    setCopiedField(field);
    setTimeout(() => setCopiedField(""), 1500);
  };

  const copyStudentText = (s: any) => {
    const subs = (() => {
      const raw = s.selective_subjects;
      if (Array.isArray(raw)) return raw.join(", ");
      if (typeof raw === "string") {
        try {
          return JSON.parse(raw).join(", ");
        } catch {
          return raw;
        }
      }
      return "-";
    })();
    const lines = [
      `Student ID: ${s.student_id}`,
      `Name: ${s.name}`,
      `Father's Name: ${s.father_name || "-"}`,
      `Mother's Name: ${s.mother_name || "-"}`,
      `Date of Birth: ${s.date_of_birth ? s.date_of_birth.slice(0, 10) : "-"}`,
      `Class: ${s.class}`,
      `Section: ${s.section || "-"}`,
      `Group: ${s.student_group || "-"}`,
      `Gender: ${s.gender}`,
      `Mobile: ${s.mobile || "-"}`,
      `Parent Mobile: ${s.parent_mobile || "-"}`,
      `WhatsApp: ${s.whatsapp || "-"}`,
      `Selective Subjects: ${subs}`,
      `Optional Subject: ${s.optional_subject || "-"}`,
      `Present Address: ${s.present_address || "-"}`,
      `Permanent Address: ${s.permanent_address || "-"}`,
    ].join("\n");
    navigator.clipboard.writeText(lines).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const fetchStudents = () => {
    api
      .get<any>("/admin/students")
      .then((r) => {
        const all = r.data || [];
        setStudents(
          urlClass ? all.filter((s: any) => s.class === urlClass) : all,
        );
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  const handleView = (s: any) => {
    setViewingStudent(s);
    setResetPwValue("");
    setResetPwResult("");
  };

  const handleResetPassword = async () => {
    if (!viewingStudent || !viewingStudent.user_id) return;
    setResetPwLoading(true);
    setResetPwResult("");
    try {
      const payload: any = {};
      if (resetPwValue) payload.password = resetPwValue;
      const res = await api.post<{
        status: number;
        data: { new_password: string };
      }>(`/admin/users/${viewingStudent.user_id}/reset-password`, payload);
      setResetPwResult(`New Password: ${res.data.new_password}`);
    } catch (err: unknown) {
      setResetPwResult(
        err instanceof Error ? err.message : "Failed to reset password",
      );
    }
    setResetPwLoading(false);
  };

  const handleEdit = (s: any) => {
    // Inline add/edit form removed — edit opens on the dedicated Add/Edit Student page
    router.push(`/p_Xk7mN/students/add?id=${s.id}`);
  };

  const handleDelete = async (id: number) => {
    if (
      !confirm("Delete this student? This will also remove their user account.")
    )
      return;
    try {
      await api.delete(`/admin/students/${id}`);
      fetchStudents();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to delete");
    }
  };

  const handleReorder = useCallback((reordered: Record<string, unknown>[]) => {
    const ids = reordered.map((row) => row.id as number);
    api.post("/admin/students/reorder", { ids }).catch(() => {});
  }, []);

  const handleFreeze = (userId: number) => {
    api
      .post(`/admin/users/${userId}/freeze`, {})
      .then(() => fetchStudents())
      .catch(() => alert("Failed to freeze"));
  };

  const handleUnfreeze = (userId: number) => {
    api
      .post(`/admin/users/${userId}/unfreeze`, {})
      .then(() => fetchStudents())
      .catch(() => alert("Failed to unfreeze"));
  };

  const handleMoveUp = (id: number) => {
    api
      .post(`/admin/students/${id}/move-up`, {})
      .then(() => fetchStudents())
      .catch(() => alert("Already at top"));
  };

  const handleMoveDown = (id: number) => {
    api
      .post(`/admin/students/${id}/move-down`, {})
      .then(() => fetchStudents())
      .catch(() => alert("Already at bottom"));
  };

  const filtered = students.filter((s) => {
    const q = search.trim().toLowerCase();
    if (
      q &&
      !(
        String(s.student_id || "")
          .toLowerCase()
          .includes(q) ||
        String(s.name || "")
          .toLowerCase()
          .includes(q) ||
        String(s.mobile || "")
          .toLowerCase()
          .includes(q)
      )
    )
      return false;
    if (filterClass && s.class !== filterClass) return false;
    if (filterGroup && s.student_group !== filterGroup) return false;
    return true;
  });

  const columns = [
    { key: "sl", label: "SL" },
    { key: "photo", label: "Photo" },
    { key: "student_id", label: "Student ID" },
    { key: "name", label: "Name" },
    { key: "class", label: "Class" },
    { key: "mobile", label: "Mobile" },
    { key: "student_group", label: "Group" },
    { key: "selective_subjects", label: "Selective Subjects" },
    { key: "optional_subject", label: "Optional Subject" },
    { key: "user_status", label: "Account" },
    { key: "actions", label: "Actions" },
  ];

  const rows = filtered.map((s, i) => ({
    ...s,
    sl: i + 1,
    photo: s.photo_path ? (
      <PhotoWithPreview
        src={`${UPLOAD_BASE}/${s.photo_path}`}
        alt={s.name}
        className="h-10 w-10 rounded-full object-cover"
      />
    ) : (
      <div className="h-10 w-10 rounded-full bg-gray-200" />
    ),
    student_id: s.student_id,
    name: s.name,
    class: s.class,
    mobile: s.mobile,
    student_group: s.student_group || "-",
    selective_subjects: (() => {
      const raw = s.selective_subjects;
      let subs: string[] = [];
      if (Array.isArray(raw)) subs = raw;
      else if (typeof raw === "string") {
        try {
          subs = JSON.parse(raw);
        } catch {
          subs = [];
        }
      }
      return subs.length > 0 ? (
        <div className="flex max-w-[200px] flex-wrap gap-0.5">
          {subs.map((sub) => (
            <span
              key={sub}
              className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-700"
            >
              {sub}
            </span>
          ))}
        </div>
      ) : (
        <span className="text-xs text-gray-400">-</span>
      );
    })(),
    optional_subject: s.optional_subject || (
      <span className="text-xs text-gray-400">-</span>
    ),
    user_status: (
      <Badge variant={s.user_status === "frozen" ? "danger" : "success"}>
        {s.user_status || "active"}
      </Badge>
    ),
    actions: (
      <div className="flex gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleMoveUp(s.id)}
          disabled={i === 0}
          title="Move up"
        >
          <ArrowUp className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleMoveDown(s.id)}
          disabled={i === filtered.length - 1}
          title="Move down"
        >
          <ArrowDown className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="sm" onClick={() => handleView(s)}>
          View
        </Button>
        <Button variant="secondary" size="sm" onClick={() => handleEdit(s)}>
          Edit
        </Button>
        {s.user_id &&
          (s.user_status === "frozen" ? (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => handleUnfreeze(s.user_id)}
            >
              Unfreeze
            </Button>
          ) : (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => handleFreeze(s.user_id)}
            >
              Freeze
            </Button>
          ))}
        <Button variant="danger" size="sm" onClick={() => handleDelete(s.id)}>
          Delete
        </Button>
      </div>
    ),
  }));

  return (
    <PanelLayout role="admin" title="Student Management">
      {viewingStudent && (
        <Card className="mb-6">
          <CardContent className="space-y-4 pt-6">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">Student Details</h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => copyStudentText(viewingStudent)}
                  className="rounded px-1.5 py-0.5 text-xs font-medium text-blue-600 hover:bg-blue-50"
                >
                  {copied ? "Copied!" : "Copy"}
                </button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setViewingStudent(null)}
                >
                  Close
                </Button>
              </div>
            </div>
            <div className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
              {[
                ["Student ID", viewingStudent.student_id],
                ["Name", viewingStudent.name],
                ["Father's Name", viewingStudent.father_name],
                ["Mother's Name", viewingStudent.mother_name],
                [
                  "Date of Birth",
                  viewingStudent.date_of_birth
                    ? String(viewingStudent.date_of_birth).slice(0, 10)
                    : null,
                ],
                ["Class", viewingStudent.class],
                ["Section", viewingStudent.section],
                ["Group", viewingStudent.student_group],
                ["Gender", viewingStudent.gender],
                ["Mobile", viewingStudent.mobile],
                ["Parent Mobile", viewingStudent.parent_mobile],
                ["WhatsApp", viewingStudent.whatsapp],
                ["Blood Group", viewingStudent.blood_group],
                ["HSC Batch", viewingStudent.academic_session],
                ["Class Roll", viewingStudent.class_roll],
                [
                  "Selective Subjects",
                  (() => {
                    const raw = viewingStudent.selective_subjects;
                    if (Array.isArray(raw)) return raw.join(", ");
                    if (typeof raw === "string") {
                      try {
                        return JSON.parse(raw).join(", ");
                      } catch {
                        return raw;
                      }
                    }
                    return null;
                  })(),
                ],
                ["Optional Subject", viewingStudent.optional_subject],
                ["Present Address", viewingStudent.present_address],
                ["Permanent Address", viewingStudent.permanent_address],
              ].map(([lbl, val]) => (
                <div key={String(lbl)} className="flex items-center gap-1">
                  <span className="font-semibold text-gray-700">{lbl}:</span>
                  <span className="text-gray-900">{val || "-"}</span>
                  <button
                    onClick={() => copySingle(String(val || ""), String(lbl))}
                    className="ml-1 rounded px-1 text-blue-600 hover:bg-blue-50"
                    title="Copy"
                  >
                    <Copy className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
            <div className="rounded-lg border border-gray-200 p-4">
              <h4 className="mb-2 text-sm font-semibold text-gray-800">
                Reset Password
              </h4>
              <div className="flex items-center gap-2">
                <Input
                  label=""
                  value={resetPwValue}
                  onChange={(e) => setResetPwValue(e.target.value)}
                  placeholder="Leave empty for mobile number"
                />
                <Button
                  variant="primary"
                  onClick={handleResetPassword}
                  disabled={resetPwLoading}
                >
                  Reset
                </Button>
              </div>
              {resetPwResult && (
                <p className="rounded-md bg-green-50 p-2 text-center text-sm font-medium text-green-700">
                  {resetPwResult}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}
      <Card>
        <CardContent className="pt-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h3 className="font-semibold text-gray-900">All Students</h3>
            <div className="flex flex-wrap items-center gap-2">
              <Input
                label=""
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search ID / name / mobile"
                className="w-56"
              />
              <Select
                label=""
                options={[{ value: "", label: "All Classes" }, ...CLASSES]}
                value={filterClass}
                onChange={(e) => setFilterClass(e.target.value)}
              />
              <Select
                label=""
                options={[{ value: "", label: "All Groups" }, ...GROUPS]}
                value={filterGroup}
                onChange={(e) => setFilterGroup(e.target.value)}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const cols: ExportColumn[] = [
                    { key: "student_id", label: "Student ID" },
                    { key: "name", label: "Name" },
                    { key: "father_name", label: "Father" },
                    { key: "mother_name", label: "Mother" },
                    { key: "date_of_birth", label: "DOB" },
                    { key: "class", label: "Class" },
                    { key: "section", label: "Section" },
                    { key: "student_group", label: "Group" },
                    { key: "gender", label: "Gender" },
                    { key: "mobile", label: "Mobile" },
                    { key: "parent_mobile", label: "Parent Mobile" },
                    { key: "whatsapp", label: "WhatsApp" },
                    { key: "present_address", label: "Present Address" },
                    { key: "permanent_address", label: "Permanent Address" },
                    { key: "optional_subject", label: "Optional Subject" },
                  ];
                  exportToExcel(filtered, cols, "Students");
                }}
              >
                Excel
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const cols: ExportColumn[] = [
                    { key: "student_id", label: "Student ID" },
                    { key: "name", label: "Name" },
                    { key: "father_name", label: "Father" },
                    { key: "mother_name", label: "Mother" },
                    { key: "date_of_birth", label: "DOB" },
                    { key: "class", label: "Class" },
                    { key: "section", label: "Section" },
                    { key: "student_group", label: "Group" },
                    { key: "gender", label: "Gender" },
                    { key: "mobile", label: "Mobile" },
                    { key: "parent_mobile", label: "Parent Mobile" },
                    { key: "whatsapp", label: "WhatsApp" },
                    { key: "present_address", label: "Present Address" },
                    { key: "permanent_address", label: "Permanent Address" },
                    { key: "optional_subject", label: "Optional Subject" },
                  ];
                  exportToPDF(filtered, cols, "Students List", "Students");
                }}
              >
                PDF
              </Button>
            </div>
          </div>
          <DataTable
            columns={columns}
            data={rows}
            loading={loading}
            emptyMessage="No students"
            onRowReorder={handleReorder}
          />
        </CardContent>
      </Card>
    </PanelLayout>
  );
}

export default function AllStudentsPage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 text-center text-sm text-gray-500">Loading...</div>
      }
    >
      <StudentsPageInner />
    </Suspense>
  );
}
