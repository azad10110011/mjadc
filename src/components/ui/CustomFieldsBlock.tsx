"use client";

import { Fragment, type ReactNode } from "react";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Input, Select } from "@/components/ui";

export interface CustomFieldDef {
  id: number;
  target: string;
  field_key: string | null;
  is_builtin: boolean;
  label: string;
  field_type: "text" | "number" | "date" | "dropdown" | "yes_no";
  options: string[];
  required: boolean;
  sort_order: number;
}

export type CustomFieldValues = Record<string, string>;

/**
 * Loads field definitions for a target (student/teacher/staff) in saved
 * sort order. Includes built-in form fields (is_builtin, field_key set) and
 * admin-added custom fields (field_key=null). Values are keyed by label.
 */
export function useCustomFields(target: "student" | "teacher" | "staff") {
  const [defs, setDefs] = useState<CustomFieldDef[]>([]);
  useEffect(() => {
    let active = true;
    api
      .get<{ status: number; data: CustomFieldDef[] }>(
        `/admin/custom-fields?target=${target}`,
      )
      .then((res) => {
        if (active) setDefs(res.data || []);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [target]);
  return defs;
}

interface Props {
  defs: CustomFieldDef[];
  values: CustomFieldValues;
  onChange: (label: string, value: string) => void;
}

/** Renders one generic custom field (admin-added, no field_key). */
export function CustomFieldInput({
  def,
  values,
  onChange,
}: {
  def: CustomFieldDef;
  values: CustomFieldValues;
  onChange: (label: string, value: string) => void;
}) {
  const label = `${def.label}${def.required ? " *" : ""}`;
  if (def.field_type === "dropdown") {
    return (
      <Select
        label={label}
        options={def.options.map((o) => ({ value: o, label: o }))}
        value={values[def.label] || ""}
        onChange={(e) => onChange(def.label, e.target.value)}
        placeholder={`Select ${def.label}`}
      />
    );
  }
  if (def.field_type === "yes_no") {
    return (
      <Select
        label={label}
        options={[
          { value: "Yes", label: "Yes" },
          { value: "No", label: "No" },
        ]}
        value={values[def.label] || ""}
        onChange={(e) => onChange(def.label, e.target.value)}
        placeholder={`Select ${def.label}`}
      />
    );
  }
  const type =
    def.field_type === "number"
      ? "number"
      : def.field_type === "date"
        ? "date"
        : "text";
  return (
    <Input
      label={label}
      type={type}
      value={values[def.label] || ""}
      onChange={(e) => onChange(def.label, e.target.value)}
    />
  );
}

export function CustomFieldsBlock({ defs, values, onChange }: Props) {
  if (defs.length === 0) return null;
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {defs.filter((f) => !f.is_builtin).map((f) => {
        const label = `${f.label}${f.required ? " *" : ""}`;
        if (f.field_type === "dropdown") {
          return (
            <Select
              key={f.id}
              label={label}
              options={f.options.map((o) => ({ value: o, label: o }))}
              value={values[f.label] || ""}
              onChange={(e) => onChange(f.label, e.target.value)}
              placeholder={`Select ${f.label}`}
            />
          );
        }
        if (f.field_type === "yes_no") {
          return (
            <Select
              key={f.id}
              label={label}
              options={[
                { value: "Yes", label: "Yes" },
                { value: "No", label: "No" },
              ]}
              value={values[f.label] || ""}
              onChange={(e) => onChange(f.label, e.target.value)}
              placeholder={`Select ${f.label}`}
            />
          );
        }
        const type =
          f.field_type === "number"
            ? "number"
            : f.field_type === "date"
              ? "date"
              : "text";
        return (
          <Input
            key={f.id}
            label={label}
            type={type}
            value={values[f.label] || ""}
            onChange={(e) => onChange(f.label, e.target.value)}
          />
        );
      })}
    </div>
  );
}

interface DynamicFieldsProps {
  /** All field definitions (built-in + custom) in saved order. */
  defs: CustomFieldDef[];
  /**
   * Renderers for built-in fields, keyed by field_key. Each receives the
   * definition so the form applies the admin's label/options/required.
   */
  renderers: Record<string, (def: CustomFieldDef) => ReactNode>;
  /** Rendered for admin-added custom fields (no field_key / no renderer). */
  fallback: (def: CustomFieldDef) => ReactNode;
}

/**
 * Renders a form's fields dynamically in admin-defined order. Built-in
 * fields use their renderer (with admin overrides applied); deleted fields
 * simply don't render; custom fields use the fallback renderer.
 */
export function DynamicFields({ defs, renderers, fallback }: DynamicFieldsProps) {
  return (
    <>
      {defs.map((def) => {
        const renderer = def.field_key ? renderers[def.field_key] : undefined;
        return (
          <Fragment key={def.id}>
            {renderer ? renderer(def) : fallback(def)}
          </Fragment>
        );
      })}
    </>
  );
}
