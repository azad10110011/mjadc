// Phase 2: spacing, routine Time, logo, colors.
const fs = require('fs');
const f = 'd:/opencode 09062026/frontend/src/app/p_Xk7mN/admit-card/page.tsx';
let c = fs.readFileSync(f, 'utf8');

// A. 2 spaces after specific labels (screen + PDF share studentFields; add spacer on value)
c = c.replace(
  `    FIELD_OPTIONS.filter((f) => config.fields.includes(f.value)).map((f) => [
      f.label.replace(" (Student ID)", "").replace(" (Bangla)", ""),
      String(s[f.key] ?? "") || "N/A",
    ]);`,
  `    FIELD_OPTIONS.filter((f) => config.fields.includes(f.value)).map((f) => {
      const label = f.label.replace(" (Student ID)", "").replace(" (Bangla)", "");
      let value = String(s[f.key] ?? "") || "N/A";
      if (["Student Name", "Father's Name", "Mother's Name", "Group", "Student Type"].includes(label)) {
        value = "\\u00A0\\u00A0 " + value; // two spaces after colon
      }
      return [label, value] as [string, string];
    });`,
);

// B. Logo state + fetch (uses settings college_logo if exists, else /logo.png)
c = c.replace(
  '  const [routine, setRoutine] = useState<RoutineEntry[]>([]);',
  `  const [routine, setRoutine] = useState<RoutineEntry[]>([]);
  const [logoSrc, setLogoSrc] = useState<string>("");`,
);

// logo fetch effect after config load effect
c = c.replace(
  `      .catch(() => {})
      .finally(() => setConfigLoading(false));
  }, []);`,
  `      .catch(() => {})
      .finally(() => setConfigLoading(false));
  }, []);

  useEffect(() => {
    // prefer admin-uploaded logo from settings, fall back to /logo.png
    api
      .get<{ status: number; data: { setting_value?: string } | null }>(
        "/settings/college_logo",
      )
      .then((res) => {
        if (res.data?.setting_value) setLogoSrc(UPLOAD_BASE + "/uploads/" + res.data.setting_value);
        else setLogoSrc("/logo.png");
      })
      .catch(() => setLogoSrc("/logo.png"));
  }, []);`,

);

// C. Header JSX: logo left of college name
c = c.replace(
  `                   <div className="header-area">
                     <h2 className="college-name">{config.college_name}</h2>`,
  `                   <div className="header-area">
                     <div className="header-logo-row">
                       {logoSrc && (
                         // eslint-disable-next-line @next/next/no-img-element
                         <img src={logoSrc} alt="Logo" className="college-logo" />
                       )}
                       <h2 className="college-name">{config.college_name}</h2>
                     </div>`,
);

// D. Routine table: add Time column (header + row)
c = c.replace(
  `                           <tr>
                             <th>Date</th>
                             <th>Day</th>
                             <th>Subject</th>
                           </tr>`,
  `                           <tr>
                             <th>Date</th>
                             <th>Day</th>
                             <th>Time</th>
                             <th>Subject</th>
                           </tr>`,
);
c = c.replace(
  `                           {routineFor(s, routine).map((r) => (
                             <tr key={r.id}>
                               <td>{fmtDate(r.exam_date)}</td>
                               <td>{dayName(r.exam_date)}</td>
                               <td>{r.subjects.map((sb) => routineLabel.current[sb] || sb).join(", ")}</td>
                             </tr>
                           ))}`,
  `                           {routineFor(s, routine).map((r) => (
                             <tr key={r.id}>
                               <td>{fmtDate(r.exam_date)}</td>
                               <td>{dayName(r.exam_date)}</td>
                               <td>{(r as any).exam_time || "-"}</td>
                               <td>{r.subjects.map((sb) => routineLabel.current[sb] || sb).join(", ")}</td>
                             </tr>
                           ))}`,
);

fs.writeFileSync(f, c, 'utf8');
console.log('phase 2 done');
