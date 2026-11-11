const XLSX = require("xlsx");
const fs = require("fs");

const CODE_TO_SUBJECT = {
  "101_102": "Bangla",
  "107_108": "English",
  275: "Information and Communication Technology",
  "174_175": "Physics",
  "176_177": "Chemistry",
  "178_179": "Biology",
  "265_266": "Higher Mathematics",
  "109_110": "Economics",
  "117_118": "Sociology",
  "121_122": "Logic",
  "123_124": "Psychology",
  "125_126": "Geography",
  "239_240": "Agriculture Studies",
  "249_250": "Islamic Studies",
  "253_254": "Accounting",
  "267_268": "Islamic History and Culture",
  "269_270": "Civics and Good Governance",
  "271_272": "Social Work",
  "273_274": "Home Science",
  "277_278": "Business Organization and Management",
  "286_287": "Production Management and Marketing",
  "292_293": "Finance, Banking and Insurance",
  "304_305": "History",
};
const GROUP_CODE = { Science: 1, "Business Studies": 2, Humanities: 3 };

const wb = XLSX.readFile("d:/opencode 09062026/students.xlsx");
const ws = wb.Sheets[wb.SheetNames[0]];
const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });

const clean = (v) =>
  (v == null ? "" : String(v).trim()).replace(/\s+/g, " ").toUpperCase();
const normGroup = (v) => {
  const u = clean(v);
  if (/SCIENCE/.test(u)) return "Science";
  if (/BUSINESS/.test(u)) return "Business Studies";
  if (/HUMANIT/.test(u)) return "Humanities";
  return u;
};

const students = [];
// Only Science rolls 1-3 were added manually (rolls restart per group,
// so Business/Humanities rolls 1-3 must NOT be skipped).
rows.slice(1).forEach((r) => {
  if (!r || r.length < 13) return;
  const roll = Number(r[0]);
  if (normGroup(r[1]) === "Science" && [1, 2, 3].includes(roll)) return;
  const group = normGroup(r[1]);
  const gcode = GROUP_CODE[group];
  const studentId = `27${gcode}${String(roll).padStart(3, "0")}`;
  const sub = (i) => CODE_TO_SUBJECT[String(r[i]).trim()];
  const compulsory = [sub(6), sub(7), sub(8)].filter(Boolean);
  const selective = [sub(9), sub(10), sub(11)].filter(Boolean);
  const optional = sub(12);
  students.push({
    student_id: studentId,
    name: clean(r[2]),
    father_name: clean(r[3]),
    mother_name: clean(r[4]),
    gender: clean(r[5]),
    student_group: group,
    class_roll: String(roll),
    class: "12th",
    academic_session: "2027",
    joining_year: "2027",
    mobile: "12345678",
    compulsory_subjects: JSON.stringify(compulsory),
    selective_subjects: JSON.stringify(selective),
    optional_subject: optional || "",
  });
});

fs.writeFileSync(
  __dirname + "/import-students.json",
  JSON.stringify(students, null, 1),
);
console.log("prepared:", students.length, "students (skipped rolls 1-3)");
console.log("sample:", JSON.stringify(students[0], null, 1));
