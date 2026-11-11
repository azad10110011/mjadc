"use client";

import { useCallback, useEffect, useState } from "react";
import { PanelLayout } from "@/components/layout";
import { Button, Card, CardContent, Input, Select } from "@/components/ui";
import { api } from "@/lib/api";
import { GripVertical, Pencil, Trash2 } from "lucide-react";

const TARGETS = [
  { value: "student", label: "Student (Add New Student)" },
  { value: "teacher", label: "Teacher (Add New Teacher)" },
  { value: "staff", label: "Staff (Add New Staff)" },
];

const FIELD_TYPES = [
  { value: "text", label: "Text" },
  { value: "number", label: "Number" },
  { value: "date", label: "Date" },
  { value: "dropdown", label: "Dropdown" },
  { value: "yes_no", label: "Yes / No" },
];

interface FieldDef {
  id: number;
  target: string;
  field_key: string | null;
  is_builtin: boolean;
  label: string;
  field_type: string;
  options: string[];
  required: boolean;
  sort_order: number;
}

type Target = "student" | "teacher" | "staff";

/**
 * Built-in fields with special logic (auto-generation, file upload, subject
 * pickers, code-backed option lists, backend-required fields). These are
 * FIXED: visible and drag-reorderable, but not editable/deletable.
 * The value is the accurate widget description shown in the Type column.
 */
const LOGIC_FIELDS: Partial<Record<Target, Record<string, string>>> = {
  student: {
    student_id: "auto-generated",
    hsc_batch: "dropdown (fixed options)",
    class_roll: "number (ID logic)",
    name: "text (required)",
    mobile: "text (login password)",
    student_class: "dropdown (fixed options)",
    gender: "dropdown (fixed options)",
    blood_group: "dropdown (fixed options)",
    student_group: "dropdown (ID logic)",
    photo: "file upload",
    compulsory_subjects: "fixed tag list",
    selective_subjects: "checkbox list",
    optional_subject: "subject dropdown",
  },
  teacher: {
    name: "text (required)",
    designation: "dropdown (fixed options)",
    teacher_group: "dropdown (filters subjects)",
    subjects: "checkbox list",
    joining_date: "date (required)",
    gender: "dropdown (fixed options)",
    mobile: "text (login password)",
    password: "login credential",
    photo: "file upload",
  },
  staff: {
    name: "text (required)",
    designation: "dropdown (fixed options)",
    subject: "dropdown (fixed options)",
    joining_date: "date (required)",
    gender: "dropdown (fixed options)",
    mobile: "text (login password)",
    password: "login credential",
    photo: "file upload",
  },
};

export default function AdminCustomFieldsPage() {
  const [target, setTarget] = useState<Target>("student");
  const [fields, setFields] = useState<FieldDef[]>([]);
  const [loading, setLoading] = useState(true);

  // add form state
  const [label, setLabel] = useState("");
  const [fieldType, setFieldType] = useState("text");
  const [optionsText, setOptionsText] = useState("");
  const [required, setRequired] = useState(false);
  const [saving, setSaving] = useState(false);

  // edit state
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [editType, setEditType] = useState("text");
  const [editOptions, setEditOptions] = useState("");
  const [editRequired, setEditRequired] = useState(false);
  const [error, setError] = useState("");
  const [dragId, setDragId] = useState<number | null>(null);
  const [overId, setOverId] = useState<number | null>(null);
  const [renameOnly, setRenameOnly] = useState(false);

  const targetFields = fields.filter((f) => f.target === target);

  const fetchAll = useCallback(() => {
    setLoading(true);
    api
      .get<{ status: number; data: FieldDef[] }>("/admin/custom-fields")
      .then((res) => setFields(res.data || []))
      .catch(() => setFields([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(() => {
      if (!active) return;
      setLoading(true);
      api
        .get<{ status: number; data: FieldDef[] }>("/admin/custom-fields")
        .then((res) => { if (active) setFields(res.data || []); })
        .catch(() => { if (active) setFields([]); })
        .finally(() => { if (active) setLoading(false); });
    }, 0);
    return () => { active = false; window.clearTimeout(timer); };
  }, [fetchAll]);

  const resetAddForm = () => {
    setLabel("");
    setFieldType("text");
    setOptionsText("");
    setRequired(false);
    setError("");
  };

  const handleAdd = async () => {
    setError("");
    if (!label.trim()) {
      setError("Label is required");
      return;
    }
    if (
      fields.some(
        (f) => f.target === target && f.label.toLowerCase() === label.trim().toLowerCase(),
      )
    ) {
      setError(`A field named "${label.trim()}" already exists on this form`);
      return;
    }
    if (fieldType === "dropdown" && !optionsText.trim()) {
      setError("Dropdown needs at least one option");
      return;
    }
    setSaving(true);
    try {
      await api.post("/admin/custom-fields", {
        target,
        label: label.trim(),
        field_type: fieldType,
        options:
          fieldType === "dropdown"
            ? optionsText
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean)
            : [],
        required,
      });
      resetAddForm();
      fetchAll();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to add field");
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (f: FieldDef) => {
    setEditingId(f.id);
    setEditLabel(f.label);
    setEditType(f.field_type);
    setEditOptions(f.options.join(", "));
    setEditRequired(f.required);
  };

  // Fixed (logic) fields: label-only rename
  const startRename = (f: FieldDef) => {
    setEditingId(f.id);
    setEditLabel(f.label);
    setEditType(f.field_type);
    setEditOptions(f.options.join(", "));
    setEditRequired(f.required);
    setRenameOnly(true);
  };

  const handleUpdate = async () => {
    if (!editingId) return;
    setError("");
    if (!editLabel.trim()) {
      setError("Label is required");
      return;
    }
    if (
      fields.some(
        (f) =>
          f.target ===
            fields.find((x) => x.id === editingId)?.target &&
          f.id !== editingId &&
          f.label.toLowerCase() === editLabel.trim().toLowerCase(),
      )
    ) {
      setError(`A field named "${editLabel.trim()}" already exists on this form`);
      return;
    }
    if (editType === "dropdown" && !editOptions.trim()) {
      setError("Dropdown needs at least one option");
      return;
    }
    try {
      await api.put(
        `/admin/custom-fields/${editingId}`,
        renameOnly
          ? { label: editLabel.trim() }
          : {
              label: editLabel.trim(),
              field_type: editType,
              options:
                editType === "dropdown"
                  ? editOptions
                      .split(",")
                      .map((s) => s.trim())
                      .filter(Boolean)
                  : [],
              required: editRequired,
            },
      );
      setEditingId(null);
      setRenameOnly(false);
      fetchAll();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update field");
    }
  };

  const handleDelete = async (id: number) => {
    if (
      !confirm(
        "Delete this field? It will be removed from the form. Saved values for it will remain in existing records.",
      )
    )
      return;
    await api.delete(`/admin/custom-fields/${id}`).catch(() => {});
    if (editingId === id) setEditingId(null);
    fetchAll();
  };

  // ---- Mouse drag & drop reorder ----
  const onDragStart = (id: number) => setDragId(id);
  const onDragOver = (e: React.DragEvent, id: number) => {
    e.preventDefault();
    setOverId(id);
  };
  const onDrop = (id: number) => {
    setDragId(null);
    setOverId(null);
    if (dragId === null || dragId === id) return;
    const next = [...targetFields];
    const from = next.findIndex((f) => f.id === dragId);
    const to = next.findIndex((f) => f.id === id);
    if (from === -1 || to === -1) return;
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    setFields([
      ...fields.filter((f) => f.target !== target),
      ...next.map((f, i) => ({ ...f, sort_order: i + 1 })),
    ]);
    api
      .post("/admin/custom-fields/reorder", { ids: next.map((f) => f.id) })
      .catch(() => {});
  };
  const onDragEnd = () => {
    setDragId(null);
    setOverId(null);
  };

  const typeLabel = (t: string) => t.replace(/_/g, " ");

  return (
    <PanelLayout role="admin" title="Custom Entry Fields">
      <Card className="mb-6">
        <CardContent className="space-y-4 pt-6">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Configure form for
            </label>
            <Select
              options={TARGETS}
              value={target}
              onChange={(e) => setTarget(e.target.value as Target)}
            />
            <p className="mt-1 text-xs text-gray-500">
              Every input field of the selected form is listed below. Fields
              with form logic (marked <b>Fixed</b> — auto-generated IDs, photo
              upload, subject pickers, login credentials) can be reordered but
              not edited or deleted. All other fields are fully editable:
              rename, change type, toggle required, delete, and add new ones.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Input
              label="Field Label *"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. Previous School"
            />
            <Select
              label="Field Type *"
              options={FIELD_TYPES}
              value={fieldType}
              onChange={(e) => setFieldType(e.target.value)}
            />
            {fieldType === "dropdown" && (
              <Input
                label="Dropdown Options (comma separated)"
                value={optionsText}
                onChange={(e) => setOptionsText(e.target.value)}
                placeholder="Option 1, Option 2, Option 3"
              />
            )}
            <div className="flex items-end gap-2 pb-1">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={required}
                  onChange={(e) => setRequired(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600"
                />
                Required
              </label>
              <Button variant="primary" onClick={handleAdd} disabled={saving}>
                {saving ? "Adding..." : "Add Field"}
              </Button>
            </div>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <h3 className="mb-4 font-semibold text-gray-900">
            {TARGETS.find((t) => t.value === target)?.label} — all fields (drag
            to reorder)
          </h3>
          {loading ? (
            <p className="text-sm text-gray-500">Loading...</p>
          ) : targetFields.length === 0 ? (
            <p className="text-sm text-gray-500">
              No fields configured. Add one above.
            </p>
          ) : (
            <div className="overflow-hidden rounded-lg border border-gray-200">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
                  <tr>
                    <th className="px-3 py-2">Order</th>
                    <th className="px-3 py-2">Label</th>
                    <th className="px-3 py-2">Type</th>
                    <th className="px-3 py-2">Options</th>
                    <th className="px-3 py-2">Required</th>
                    <th className="px-3 py-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {targetFields.map((f, i) => {
                    const hasLogic = f.is_builtin && !!LOGIC_FIELDS[target]?.[f.field_key ?? ""];
                    const logicType = hasLogic ? LOGIC_FIELDS[target]![f.field_key ?? ""] : null;
                    const displayType = logicType ?? typeLabel(f.field_type);
                    return (
                    <tr
                      key={f.id}
                      draggable
                      onDragStart={() => onDragStart(f.id)}
                      onDragOver={(e) => onDragOver(e, f.id)}
                      onDrop={() => onDrop(f.id)}
                      onDragEnd={onDragEnd}
                      className={`border-t border-gray-100 ${dragId === f.id ? "opacity-40" : ""} ${overId === f.id && dragId !== f.id ? "ring-2 ring-inset ring-blue-400" : ""}`}
                    >
                      <td className="px-3 py-2">
                        <span
                          className="flex cursor-grab items-center gap-1 text-gray-400"
                          title="Drag to reorder"
                        >
                          <GripVertical className="h-4 w-4" /> {i + 1}
                        </span>
                      </td>
                      <td className="px-3 py-2 font-medium text-gray-900">
                        {f.label}
                      </td>
                      <td className="px-3 py-2 capitalize">
                        {displayType}
                      </td>
                      <td className="px-3 py-2 text-gray-500">
                        {f.field_type === "dropdown" && f.options.length > 0
                          ? f.options.join(", ")
                          : "-"}
                      </td>
                      <td className="px-3 py-2">{f.required ? "Yes" : "No"}</td>
                      <td className="px-3 py-2">
                        <div className="flex gap-1">
                          {hasLogic ? (
                            <>
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => startRename(f)}
                                title="Rename this field"
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <span
                                className="inline-flex items-center rounded bg-gray-100 px-2 py-1 text-xs text-gray-500"
                                title="This field has form logic: only the name can be changed"
                              >
                                Fixed
                              </span>
                            </>
                          ) : (
                            <>
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => startEdit(f)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="danger"
                                size="sm"
                                onClick={() => handleDelete(f.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {editingId !== null && (
            <div className="mt-4 space-y-3 rounded-lg border border-blue-200 bg-blue-50 p-4">
              <h4 className="font-medium text-gray-900">
                {renameOnly ? "Rename Field (name only — type and settings are fixed)" : "Edit Field"}
              </h4>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Input
                  label="Label"
                  value={editLabel}
                  onChange={(e) => setEditLabel(e.target.value)}
                />
                {!renameOnly && (
                <Select
                  label="Type"
                  options={FIELD_TYPES}
                  value={editType}
                  onChange={(e) => setEditType(e.target.value)}
                />
                )}
                {!renameOnly && editType === "dropdown" && (
                  <Input
                    label="Options (comma separated)"
                    value={editOptions}
                    onChange={(e) => setEditOptions(e.target.value)}
                  />
                )}
                <div className="flex items-end gap-2 pb-1">
                  {!renameOnly && (
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={editRequired}
                      onChange={(e) => setEditRequired(e.target.checked)}
                      className="h-4 w-4 rounded border-gray-300 text-blue-600"
                    />
                    Required
                  </label>
                  )}
                  <Button variant="primary" size="sm" onClick={handleUpdate}>
                    Save
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => { setEditingId(null); setRenameOnly(false); }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </PanelLayout>
  );
}
