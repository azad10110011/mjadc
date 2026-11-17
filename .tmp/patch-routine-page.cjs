// Add Time support to exam-routine page: interface, states, handlers, add form, table (incl. edit row + print).
const fs = require('fs');
const f = 'd:/opencode 09062026/frontend/src/app/p_Xk7mN/exam-routine/page.tsx';
let c = fs.readFileSync(f, 'utf8');

// interface
c = c.replace(
  "  exam_date: string;\n  subjects: string[];\n}",
  "  exam_date: string;\n  exam_time: string | null;\n  subjects: string[];\n}",
);

// add-form state
c = c.replace(
  '  const [newDate, setNewDate] = useState("");\n  const [newSubjects, setNewSubjects] = useState<string[]>([]);',
  '  const [newDate, setNewDate] = useState("");\n  const [newTime, setNewTime] = useState("");\n  const [newSubjects, setNewSubjects] = useState<string[]>([]);',
);
// edit state
c = c.replace(
  '  const [editDate, setEditDate] = useState("");\n  const [editSubjects, setEditSubjects] = useState<string[]>([]);',
  '  const [editDate, setEditDate] = useState("");\n  const [editTime, setEditTime] = useState("");\n  const [editSubjects, setEditSubjects] = useState<string[]>([]);',
);

// handleAdd payload
c = c.replace(
  '        exam_date: newDate,\n        subjects: newSubjects,',
  '        exam_date: newDate,\n        exam_time: newTime || undefined,\n        subjects: newSubjects,',
);
c = c.replace('      setNewDate("");\n      setNewSubjects([]);', '      setNewDate("");\n      setNewTime("");\n      setNewSubjects([]);');

// startEdit
c = c.replace(
  '    setEditingId(e.id);\n    setEditDate(e.exam_date);\n    setEditSubjects(e.subjects);',
  '    setEditingId(e.id);\n    setEditDate(e.exam_date);\n    setEditTime(e.exam_time || "");\n    setEditSubjects(e.subjects);',
);

// handleUpdate payload
c = c.replace(
  '        exam_date: editDate,\n        subjects: editSubjects,',
  '        exam_date: editDate,\n        exam_time: editTime || undefined,\n        subjects: editSubjects,',
);

// Add form: add Time input after the date input
c = c.replace(
  `                <div className="grid gap-4 sm:grid-cols-[200px_1fr]">
                  <Input
                    label="Exam Date"
                    type="date"
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                  />`,
  `                <div className="grid gap-4 sm:grid-cols-[200px_160px_1fr]">
                  <Input
                    label="Exam Date"
                    type="date"
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                  />
                  <Input
                    label="Time"
                    type="time"
                    value={newTime}
                    onChange={(e) => setNewTime(e.target.value)}
                  />`,
);

// table header: add Time column
c = c.replace(
  '                          <th className="px-3 py-2">Date</th>\n                          <th className="px-3 py-2">Subjects</th>',
  '                          <th className="px-3 py-2">Date</th>\n                          <th className="px-3 py-2">Time</th>\n                          <th className="px-3 py-2">Subjects</th>',
);

// edit row: add Time cell after date cell
c = c.replace(
  `                              <td className="px-3 py-2">
                                <input
                                  type="date"
                                  value={editDate}
                                  onChange={(ev) => setEditDate(ev.target.value)}
                                  className="rounded border border-gray-300 px-2 py-1 text-sm"
                                />
                              </td>`,
  `                              <td className="px-3 py-2">
                                <input
                                  type="date"
                                  value={editDate}
                                  onChange={(ev) => setEditDate(ev.target.value)}
                                  className="rounded border border-gray-300 px-2 py-1 text-sm"
                                />
                              </td>
                              <td className="px-3 py-2">
                                <input
                                  type="time"
                                  value={editTime}
                                  onChange={(ev) => setEditTime(ev.target.value)}
                                  className="rounded border border-gray-300 px-2 py-1 text-sm"
                                />
                              </td>`,
);

// normal row: add time cell after date cell
c = c.replace(
  `                            <td className="px-3 py-2 font-medium">
                              {fmtDate(e.exam_date)}
                            </td>
                            <td className="px-3 py-2">
                              {showList(e.subjects)}
                            </td>`,
  `                            <td className="px-3 py-2 font-medium">
                              {fmtDate(e.exam_date)}
                            </td>
                            <td className="px-3 py-2">{e.exam_time || "-"}</td>
                            <td className="px-3 py-2">
                              {showList(e.subjects)}
                            </td>`,
);

fs.writeFileSync(f, c, 'utf8');
console.log('routine page patched');
