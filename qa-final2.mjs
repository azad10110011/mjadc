export default async function run(page, ui) {
  await page.goto("http://localhost:3000/MAKA/tea/", { waitUntil: "domcontentloaded", timeout: 90000 });
  await page.waitForTimeout(1500);
  await page.evaluate(async () => {
    const r = await fetch("http://localhost/mjadc-api/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "admin@mjadc.ac.bd",
        password: "admin123",
      }),
    });
    const j = await r.json();
    localStorage.setItem("token", j.data.token);
    localStorage.setItem("user", JSON.stringify(j.data.user));
  });

  // --- Mark entry: per-subject students ---
  await page.goto("http://localhost:3000/admin/mark-entry-form/", { waitUntil: "domcontentloaded", timeout: 90000 });
  await page.waitForTimeout(3000);
  const selects = await page.locator("select").all();
  await selects[1].selectOption("11th");
  await page.waitForTimeout(400);
  await selects[2].selectOption({ label: "Half Yearly" });
  await page.waitForTimeout(300);
  const btns = await page.locator("button").all();
  for (const b of btns) {
    const t = await b.innerText().catch(() => "");
    if (t.includes("Generate")) {
      await b.click();
      break;
    }
  }
  await page.waitForTimeout(7000);
  const markInfo = await page.evaluate(() => {
    const sheets = document.querySelectorAll(".mark-entry-sheet").length;
    const firstHeader = document.querySelector(
      ".mark-entry-sheet .subject-label",
    )?.innerText;
    const hasRoll = document.body.innerText.includes("Class Roll");
    const hasGrade = document.body.innerText.includes("Letter");
    const hasGP = document.body.innerText.includes("Grade Point");
    const selText = document.body.innerText.match(
      /Select Subjects \([^)]+\)/,
    )?.[0];
    // count rows in the first sheet body
    const firstRows = document.querySelectorAll(
      ".mark-entry-sheet tbody tr",
    ).length;
    return {
      sheets,
      firstHeader,
      hasRoll,
      hasGrade,
      hasGP,
      selText,
      firstRows,
    };
  });

  // --- Admit card: QR presence ---
  await page.goto("http://localhost:3000/admin/admit-card/", { waitUntil: "domcontentloaded", timeout: 90000 });
  await page.waitForTimeout(3000);
  const selects2 = await page.locator("select").all();
  await selects2[1].selectOption("11th");
  await page.waitForTimeout(400);
  await selects2[2].selectOption({ label: "Half Yearly" });
  await page.waitForTimeout(300);
  const btns2 = await page.locator("button").all();
  for (const b of btns2) {
    const t = await b.innerText().catch(() => "");
    if (t.includes("Generate")) {
      await b.click();
      break;
    }
  }
  await page.waitForTimeout(8000);
  const admitInfo = await page.evaluate(() => {
    const cards = document.querySelectorAll(".admit-card").length;
    const qrs = document.querySelectorAll(".qr-img").length;
    const perPageSel = Array.from(document.querySelectorAll("select")).find(
      (s) => Array.from(s.options).some((o) => o.label.includes("per page")),
    );
    const sigSpace = document.body.innerText.includes("Space before Signature");
    return { cards, qrs, perPageValue: perPageSel?.value, sigSpace };
  });

  return { markInfo, admitInfo };
}
