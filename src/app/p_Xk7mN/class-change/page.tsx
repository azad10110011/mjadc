"use client";

import { useState, useEffect } from "react";
import { PanelLayout } from "@/components/layout";
import {
  Button,
  Select,
  Card,
  CardContent,
  DataTable,
  PhotoWithPreview,
} from "@/components/ui";
import { api, UPLOAD_BASE } from "@/lib/api";

const CLASSES = [
  { value: "11th", label: "11th" },
  { value: "12th", label: "12th" },
  { value: "Old", label: "Old (Ex-Student)" },
];

interface StudentRow {
  id: number;
  student_id: string;
  name: string;
  class: string;
  section: string;
  student_group: string;
  photo_path: string | null;
}

export default function ClassChangePage() {
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [fromClass, setFromClass] = useState("");
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [toClass, setToClass] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const fetchStudents = () => {
    api
      .get<{ status: number; data: StudentRow[] }>("/admin/students")
      .then((r) => setStudents(r.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  const available = fromClass
    ? students.filter((s) => s.class === fromClass)
    : students;

  const toggleOne = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const handleSubmit = async () => {
    setError("");
    setMessage("");
    if (!toClass) {
      setError("Select the target class");
      return;
    }
    if (selectedIds.length === 0 && !fromClass) {
      setError('Select students (or choose a source class for "all" mode)');
      return;
    }
    if (selectedIds.length > 0 && fromClass) {
      const same = students
        .filter((s) => selectedIds.includes(s.id))
        .every((s) => s.class === toClass);
      if (same) {
        setError("Selected students are already in the target class");
        return;
      }
    }
    const label =
      selectedIds.length > 0
        ? `${selectedIds.length} selected student(s)`
        : `ALL students in "${fromClass}"`;
    if (!confirm(`Move ${label} to "${toClass}"?`)) return;
    setSubmitting(true);
    try {
      const payload: Record<string, unknown> = { to_class: toClass };
      if (selectedIds.length > 0) payload.student_ids = selectedIds;
      else payload.from_class = fromClass;
      const res = await api.post<{ message: string }>(
        "/admin/students/bulk-change-class",
        payload,
      );
      setMessage(res.message);
      setSelectedIds([]);
      fetchStudents();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to change class");
    } finally {
      setSubmitting(false);
    }
  };

  const columns = [
    { key: "checkbox", label: "Select" },
    { key: "sl", label: "SL" },
    { key: "photo", label: "Photo" },
    { key: "student_id", label: "Student ID" },
    { key: "name", label: "Name" },
    { key: "class", label: "Current Class" },
    { key: "section", label: "Section" },
    { key: "student_group", label: "Group" },
  ];

  const rows = available.map((s, i) => ({
    ...s,
    sl: i + 1,
    checkbox: (
      <input
        type="checkbox"
        checked={selectedIds.includes(s.id)}
        onChange={() => toggleOne(s.id)}
      />
    ),
    photo: s.photo_path ? (
      <PhotoWithPreview
        src={`${UPLOAD_BASE}/${s.photo_path}`}
        alt={s.name}
        className="h-10 w-10 rounded-full object-cover"
      />
    ) : (
      <div className="h-10 w-10 rounded-full bg-gray-200" />
    ),
    student_group: s.student_group || "-",
    section: s.section || "-",
  }));

  return (
    <PanelLayout role="admin" title="Class Change">
      <Card className="mb-6">
        <CardContent className="space-y-4 pt-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <Select
              label="Current Class (source)"
              options={[{ value: "", label: "All Classes" }, ...CLASSES]}
              value={fromClass}
              onChange={(e) => {
                setFromClass(e.target.value);
                setSelectedIds([]);
              }}
            />
            <Select
              label="Move To (target class) *"
              options={CLASSES}
              value={toClass}
              onChange={(e) => setToClass(e.target.value)}
              placeholder="Select target class"
            />
            <div className="flex items-end">
              <Button
                variant="primary"
                onClick={handleSubmit}
                disabled={submitting}
              >
                {submitting
                  ? "Changing..."
                  : selectedIds.length > 0
                    ? `Move ${selectedIds.length} Selected`
                    : fromClass
                      ? "Move All of Source Class"
                      : "Move All Students"}
              </Button>
            </div>
          </div>
          <p className="text-sm text-gray-500">
            Tick checkboxes to move specific students. Leave everything unticked
            and pick a source class to move all of them, or pick no source class
            to move every student.
          </p>
          {error && <p className="text-sm text-red-600">{error}</p>}
          {message && <p className="text-sm text-green-600">{message}</p>}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h3 className="font-semibold text-gray-900">
              Students {fromClass ? `in "${fromClass}"` : "(all classes)"} —{" "}
              {available.length}
              {selectedIds.length > 0 && (
                <span className="ml-2 text-blue-600">({selectedIds.length} selected)</span>
              )}
            </h3>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedIds(available.map((s) => s.id))}
                disabled={available.length === 0}
              >
                Select All ({available.length})
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedIds([])}
                disabled={selectedIds.length === 0}
              >
                Clear Selection
              </Button>
            </div>
          </div>
          <DataTable
            columns={columns}
            data={rows}
            loading={loading}
            emptyMessage="No students found"
          />
        </CardContent>
      </Card>
    </PanelLayout>
  );
}
