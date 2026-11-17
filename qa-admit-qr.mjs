export default async function run(page, ui) {
  await page.goto("http://localhost:3000/MAKA/tea/", { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(1000);
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
  await page.goto("http://localhost:3000/admin/admit-card/", { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(2500);
  const selects = await page.locator("select").all();
  await selects[1].selectOption("11th");
  await page.waitForTimeout(300);
  await selects[2].selectOption({ label: "Half Yearly" });
  await page.waitForTimeout(200);
  const btns = await page.locator("button").all();
  for (const b of btns) {
    const t = await b.innerText().catch(() => "");
    if (t.includes("Generate")) { await b.click(); break; }
  }
  await page.waitForTimeout(8000);
  return await page.evaluate(() => {
    const cards = document.querySelectorAll(".admit-card").length;
    const qrs = document.querySelectorAll(".qr-img").length;
    const perPageSel = Array.from(document.querySelectorAll("select")).find((s) =>
      Array.from(s.options).some((o) => o.label.includes("per page")),
    );
    const opts = perPageSel ? Array.from(perPageSel.options).map((o) => o.label) : [];
    const sigSpace = document.body.innerText.includes("Space before Signature");
    return { cards, qrs, perPageOptions: opts, sigSpace };
  });
}
