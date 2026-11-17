export default async function run(page, ui) {
  await page.goto("http://localhost:3000/MAKA/tea/");
  await page.waitForTimeout(1500);
  await page.evaluate(async () => {
    const r = await fetch("http://localhost/mjadc-api/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "admin@mjadc.ac.bd", password: "admin123" }),
    });
    const j = await r.json();
    localStorage.setItem("token", j.data.token);
    localStorage.setItem("user", JSON.stringify(j.data.user));
  });

  // --- Mark entry page test ---
  await page.goto("http://localhost:3000/admin/mark-entry-form/");
  await page.waitForTimeout(3000);
  const selects = await page.locator("select").all();
  await selects[1].selectOption("11th");
  await page.waitForTimeout(400);
  await selects[2].selectOption({ label: "Half Yearly" });
  await page.waitForTimeout(300);
  const buttons = await page.locator("button").all();
  for (const b of buttons) {
    const t = await b.innerText().catch(() => "");
    if (t.includes("Generate")) { await b.click(); break; }
  }
  await page.waitForTimeout(6000);

  const subjectInfo = await page.evaluate(() => {
    const boxes = Array.from(document.querySelectorAll('input[type="checkbox"]'));
    const labels = boxes.slice(0, 5).map((b) => b.parentElement?.innerText.trim());
    const checkedCount = boxes.filter((b) => b.checked).length;
    const selText = document.body.innerText.match(/Select Subjects \([^)]+\)/)?.[0];
    const sheetCount = document.querySelectorAll(".mark-entry-sheet").length;
    return { checkboxCount: boxes.length, firstLabels: labels, checkedCount, selText, sheetCount };
  });

  // Uncheck all but one subject -> sheet count should drop
  await page.evaluate(() => {
    const boxes = Array.from(document.querySelectorAll('input[type="checkbox"]'));
    boxes.forEach((b, i) => { if (i > 0 && b.checked) b.click(); });
  });
  await page.waitForTimeout(800);
  const afterDeselect = await page.evaluate(() => ({
    sheetCount: document.querySelectorAll(".mark-entry-sheet").length,
    selText: document.body.innerText.match(/Select Subjects \([^)]+\)/)?.[0],
  }));

  // --- Admit card page test ---
  await page.goto("http://localhost:3000/admin/admit-card/");
  await page.waitForTimeout(3000);
  const selects2 = await page.locator("select").all();
  await selects2[1].selectOption("11th");
  await page.waitForTimeout(400);
  await selects2[2].selectOption({ label: "Half Yearly" });
  await page.waitForTimeout(300);
  const buttons2 = await page.locator("button").all();
  for (const b of buttons2) {
    const t = await b.innerText().catch(() => "");
    if (t.includes("Generate")) { await b.click(); break; }
  }
  await page.waitForTimeout(6000);
  const admitInfo = await page.evaluate(() => {
    const pages = document.querySelectorAll(".admit-page").length;
    const cards = document.querySelectorAll(".admit-card").length;
    const perPageSelect = Array.from(document.querySelectorAll("select")).find((s) =>
      s.parentElement?.innerText.includes("Cards per Page"),
    );
    return { pages, cards, perPage: perPageSelect?.value, hasConfig: document.body.innerText.includes("Admit Card Configuration") };
  });

  return { subjectInfo, afterDeselect, admitInfo };
}
