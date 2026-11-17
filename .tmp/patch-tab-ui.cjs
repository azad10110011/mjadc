// Add tab buttons + report tab JSX; relabel bottom list as "My Collection".
const fs = require('fs');
const f = 'd:/opencode 09062026/frontend/src/app/p_Xk7mN/exam-fee-collection/page.tsx';
let c = fs.readFileSync(f, 'utf8');

// 1. insert tab buttons right after the opening container div
const containerAnchor = '<div className="mx-auto max-w-6xl space-y-4">';
if (!c.includes(containerAnchor)) { console.error('container anchor missing'); process.exit(1); }
if (!c.includes('{tab === "report" && (')) {
  const tabs = `
        <div className="flex gap-2">
          <Button variant={tab === "collect" ? "primary" : "outline"} onClick={() => setTab("collect")}>
            Collect
          </Button>
          <Button variant={tab === "report" ? "primary" : "outline"} onClick={() => { setTab("report"); runReport("today"); }}>
            Reports
          </Button>
        </div>`;
  c = c.replace(containerAnchor, containerAnchor + tabs);
}

// 2. relabel the bottom list heading
c = c.split("Today&apos;s Collection").join('My Collection (Today)');
c = c.split("Today's Collection").join('My Collection (Today)');

// 3. append the report tab JSX before the final closing of the container
const endAnchor = '</Card>\n      </div>\n    </PanelLayout>';
if (!c.includes(endAnchor)) { console.error('end anchor missing'); process.exit(1); }
const reportJsx = `</Card>

        {tab === "report" && (
          <>
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => runReport("today")}>Today</Button>
              <Button variant="outline" onClick={() => runReport("total")}>Total (This Year)</Button>
              <Input type="date" value={repFrom} onChange={(e) => setRepFrom(e.target.value)} className="sm:w-auto" />
              <Input type="date" value={repTo} onChange={(e) => setRepTo(e.target.value)} className="sm:w-auto" />
              <Button variant="outline" onClick={() => runReport()}>Apply Range</Button>
              {repData && (
                <>
                  <Button variant="outline" onClick={() => reportExport("pdf")}>
                    <FileDown className="mr-2 h-4 w-4" /> PDF
                  </Button>
                  <Button variant="outline" onClick={() => reportExport("print")}>
                    <Printer className="mr-2 h-4 w-4" /> Print
                  </Button>
                </>
              )}
            </div>

            {repLoading && <p className="text-gray-500">Loading report…</p>}
            {repData && !repLoading && (
              <>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Card>
                    <CardContent>
                      <p className="text-sm text-gray-500">{canCollect ? 'Total Collection (all users)' : 'My Total Collection'}</p>
                      <p className="text-2xl font-bold">{fmt(repData.total)}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent>
                      <p className="text-sm text-gray-500">Payments</p>
                      <p className="text-2xl font-bold">{repData.count}</p>
                    </CardContent>
                  </Card>
                </div>

                {canCollect && repData.by_user?.length > 0 && (
                  <Card>
                    <CardContent>
                      <h3 className="mb-3 font-semibold">User-wise Summary</h3>
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b text-left text-gray-600">
                            <th className="py-2 pr-3">Collector</th>
                            <th className="py-2 pr-3">Payments</th>
                            <th className="py-2">Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {repData.by_user.map((u: any) => (
                            <tr key={u.collected_by} className="border-b last:border-0">
                              <td className="py-2 pr-3">{u.name || "-"}</td>
                              <td className="py-2 pr-3">{u.collections}</td>
                              <td className="py-2 font-semibold">{fmt(Number(u.total))}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </CardContent>
                  </Card>
                )}

                <Card>
                  <CardContent>
                    <h3 className="mb-3 font-semibold">{canCollect ? 'All Payments' : 'My Payments'}</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b text-left text-gray-600">
                            <th className="py-2 pr-3">Student ID</th>
                            <th className="py-2 pr-3">Name</th>
                            <th className="py-2 pr-3">Exam</th>
                            <th className="py-2 pr-3">Amount</th>
                            <th className="py-2 pr-3">Collected By</th>
                            <th className="py-2">At</th>
                          </tr>
                        </thead>
                        <tbody>
                          {repData.rows.map((r: any) => (
                            <tr key={r.id} className="border-b last:border-0">
                              <td className="py-2 pr-3 font-mono">{r.student_id || "-"}</td>
                              <td className="py-2 pr-3">{r.student_name || "-"}</td>
                              <td className="py-2 pr-3">{r.exam_name || "-"}</td>
                              <td className="py-2 pr-3 font-semibold">{fmt(Number(r.amount))}</td>
                              <td className="py-2 pr-3">{r.collector_name || "-"}</td>
                              <td className="py-2">{new Date(r.collected_at).toLocaleString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </>
        )}
      </div>
    </PanelLayout>`;
c = c.replace(endAnchor, reportJsx);
fs.writeFileSync(f, c, 'utf8');
console.log('tabs + report UI added');
