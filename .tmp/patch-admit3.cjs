// Phase 3: color design (CSS) + PDF accents.
const fs = require('fs');
const f = 'd:/opencode 09062026/frontend/src/app/p_Xk7mN/admit-card/page.tsx';
let c = fs.readFileSync(f, 'utf8');

// --- CSS: replace the style block's core rules with a colored theme ---
// card border + header banner
c = c.replace(
  `        .admit-card {
           border: 2px solid black;
           padding: 14px 18px;
           flex: 1;
         }
         .header-area {
           text-align: center;
           margin-bottom: 10px;
         }`,
  `        .admit-card {
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
         }`,
);
// college name in navy
c = c.replace(
  `         .college-name {
           font-size: 18px;
           font-weight: bold;
           margin: 0;
         }`,
  `         .college-name {
           font-size: 18px;
           font-weight: bold;
           margin: 0;
           color: #1e3a8a;
           letter-spacing: 0.4px;
         }`,
);
// admit title as an accent chip
c = c.replace(
  `         .admit-title {
           font-size: 14px;
           font-weight: 600;
           margin-top: 6px;
           margin-bottom: 0;
         }
         .exam-label {
           font-size: 12px;
           margin-top: 2px;
         }`,
  `         .admit-title {
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
         }`,
);
// student photo: blue frame
c = c.replace(
  `         .student-photo {
           width: 90px;
           height: 115px;
           object-fit: cover;
           border: 1px solid black;
         }`,
  `         .student-photo {
           width: 90px;
           height: 115px;
           object-fit: cover;
           border: 2px solid #1e3a8a;
           border-radius: 6px;
           background: #fff;
         }`,
);
// info labels in navy, values darker
c = c.replace(
  `         .info-label {
           font-weight: 600;
         }`,
  `         .info-label {
           font-weight: 700;
           color: #1e3a8a;
         }`,
);
// routine table: navy header row, alternating rows
c = c.replace(
  `         .routine-table th,
         .routine-table td {
           border: 1px solid #333;
           padding: 3px 6px;
           text-align: left;
         }
         .routine-table th {
           background: #eee;
           font-weight: bold;
         }`,
  `         .routine-table th,
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
         }`,
);
// EXAM ROUTINE mini-heading
c = c.replace(
  `         .routine-note {
           font-size: 9px;
           margin: 3px 0 0;
           color: #333;
         }`,
  `         .routine-note {
           font-size: 9px;
           margin: 3px 0 0;
           color: #1e3a8a;
           font-weight: 600;
         }`,
);
// QR caption navy
c = c.replace(
  `         .qr-caption {
           display: block;
           font-size: 8px;
           color: #444;
           margin-top: 2px;
         }`,
  `         .qr-caption {
           display: block;
           font-size: 8px;
           color: #1e3a8a;
           font-weight: 600;
           margin-top: 2px;
         }`,
);

// --- PDF: navy accents ---
c = c.replace(
  `   doc.setLineWidth(0.6);
   doc.rect(margin, y, cardW, cardH);`,
  `   doc.setLineWidth(0.6);
   doc.setDrawColor(30, 58, 138); // navy border
   doc.roundedRect(margin, y, cardW, cardH, 2, 2);
   // header banner
   doc.setFillColor(219, 234, 254);
   doc.rect(margin, y, cardW, 30, "F");
   doc.setDrawColor(30, 58, 138);
   doc.line(margin, y + 30, margin + cardW, y + 30);`,
);
// college name in navy in PDF
c = c.replace(
  `   doc.setFont("times", "bold");
   doc.setFontSize(15);
   doc.text(config.college_name, margin + cardW / 2, y + 10, {
     align: "center",
   });`,
  `   doc.setTextColor(30, 58, 138);
   doc.setFont("times", "bold");
   doc.setFontSize(15);
   doc.text(config.college_name, margin + cardW / 2, y + 10, {
     align: "center",
   });
   doc.setTextColor(0, 0, 0);`,
);
// ADMIT CARD chip in PDF
c = c.replace(
  `   doc.setFont("times", "bold");
   doc.setFontSize(11);
   doc.text("ADMIT CARD", margin + cardW / 2, y + 22, { align: "center" });`,
  `   doc.setFont("times", "bold");
   doc.setFontSize(10.5);
   doc.setFillColor(30, 58, 138);
   const chipW = 46;
   doc.roundedRect(margin + cardW / 2 - chipW / 2, y + 18, chipW, 6.5, 3, 3, "F");
   doc.setTextColor(255, 255, 255);
   doc.text("ADMIT CARD", margin + cardW / 2, y + 22.6, { align: "center" });
   doc.setTextColor(185, 28, 28);`,
);
// exam label red
c = c.replace(
  `   doc.setFont("times", "normal");
   doc.setFontSize(9);
   doc.text(examLabel, margin + cardW / 2, y + 27.5, {
     align: "center",
   });`,
  `   doc.setFont("times", "bold");
   doc.setFontSize(9);
   doc.text(examLabel.toUpperCase(), margin + cardW / 2, y + 27.5, {
     align: "center",
   });
   doc.setTextColor(0, 0, 0);`,
);
// routine header row navy in PDF
c = c.replace(
  `     doc.rect(cols[0], headY - 3.4, colW[0] + colW[1] + colW[2], 4.6);
     doc.text("Date", cols[0] + 1, headY);
     doc.text("Day", cols[1] + 1, headY);
     doc.text("Subject", cols[2] + 1, headY);
     doc.setFont("times", "normal");`,
  `     doc.setFillColor(30, 58, 138);
     doc.rect(cols[0], headY - 3.4, colW[0] + colW[1] + colW[2], 4.6, "F");
     doc.setTextColor(255, 255, 255);
     doc.text("Date", cols[0] + 1, headY);
     doc.text("Day", cols[1] + 1, headY);
     doc.text("Subject", cols[2] + 1, headY);
     doc.setTextColor(0, 0, 0);
     doc.setFont("times", "normal");`,
);

// PDF routine with Time column: shift columns
c = c.replace(
  `     const cols = [margin + 6, margin + 42, margin + 78];
     const colW = [36, 36, cardW - 78];`,
  `     const cols = [margin + 6, margin + 42, margin + 74, margin + 104];
     const colW = [36, 32, 30, cardW - 98];`,
);
c = c.replace(
  `     doc.text("Date", cols[0] + 1, headY);
     doc.text("Day", cols[1] + 1, headY);
     doc.text("Subject", cols[2] + 1, headY);
     doc.setTextColor(0, 0, 0);
     doc.setFont("times", "normal");`,
  `     doc.text("Date", cols[0] + 1, headY);
     doc.text("Day", cols[1] + 1, headY);
     doc.text("Time", cols[2] + 1, headY);
     doc.text("Subject", cols[3] + 1, headY);
     doc.setTextColor(0, 0, 0);
     doc.setFont("times", "normal");`,
);
c = c.replace(
  `     doc.rect(cols[0], rowY - 3.4, colW[0] + colW[1] + colW[2], 4.6);
       doc.text(dateStr, cols[0] + 1, rowY);
       doc.text(dayStr, cols[1] + 1, rowY);
       doc.text(r.subjects.map((sb) => routineLabel.current[sb] || sb).join(", "), cols[2] + 1, rowY, { maxWidth: colW[2] - 2 });
       rowY += 4.6;`,
  `     doc.rect(cols[0], rowY - 3.4, colW[0] + colW[1] + colW[2] + colW[3], 4.6);
       doc.text(dateStr, cols[0] + 1, rowY);
       doc.text(dayStr, cols[1] + 1, rowY);
       doc.text(r.exam_time || "-", cols[2] + 1, rowY);
       doc.text(r.subjects.map((sb) => routineLabel.current[sb] || sb).join(", "), cols[3] + 1, rowY, { maxWidth: colW[3] - 2 });
       rowY += 4.6;`,
);

fs.writeFileSync(f, c, 'utf8');
console.log('phase 3 done');
