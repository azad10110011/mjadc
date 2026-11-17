export default async function run(page, ui) {
  await page.goto("http://localhost:3000/MAKA/tea/");
  await page.waitForTimeout(1500);
  const login = await page.evaluate(async () => {
    const r = await fetch("http://localhost/mjadc-api/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "admin@mjadc.ac.bd", password: "admin123" }),
    });
    const j = await r.json();
    localStorage.setItem("token", j.data.token);
    localStorage.setItem("user", JSON.stringify(j.data.user));
    return { tokenLen: (j.data?.token || "").length };
  });
  await page.goto("http://localhost:3000/admin/mark-entry-form/");
  await page.waitForTimeout(4000);
  const state = await page.evaluate(() => ({
    url: location.href,
    selects: Array.from(document.querySelectorAll("select")).map((s) => ({
      label: s.closest("div")?.parentElement?.querySelector("label")?.innerText || "?",
      options: Array.from(s.options).slice(0, 4).map((o) => o.value),
    })),
    bodyStart: document.body.innerText.slice(0, 150),
  }));
  return { login, state };
}
