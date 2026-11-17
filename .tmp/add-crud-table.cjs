// Insert "All Fee Amounts" CRUD table before the page's final closing tags.
const fs = require('fs');
const f = 'd:/opencode 09062026/frontend/src/app/p_Xk7mN/exam-fee-set/page.tsx';
let c = fs.readFileSync(f, 'utf8');
const anchor = `</Card>
      ))}
      </div>
    </PanelLayout>`;
const fallback = `</div>
    </PanelLayout>`;
if (!c.includes(anchor)) {
  console.log('using fallback anchor');
  const table = `<Card>
          <CardContent>
            <h3 className="mb-3 font-semibold">All Configured Fee Amounts</h3>
            {amountsLoading ? (
              <p className="text-sm text-gray-500">Loading…</p>
            ) : allAmounts.length === 0 ? (
              <p className="text-sm text-gray-500">No fee amounts configured yet.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-gray-600">
                    <th className="py-2 pr-3">Exam</th>
                    <th className="py-2 pr-3">Amount (৳)</th>
                    <th className="py-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {allAmounts.map((a) => (
                    <tr key={a.exam_name} className="border-b last:border-0">
                      <td className="py-2 pr-3 font-medium">{a.exam_name}</td>
                      <td className="py-2 pr-3">
                        <Input
                          type="number"
                          value={a.editValue}
                          onChange={(e) =>
                            setAllAmounts((prev) =>
                              prev.map((x) =>
                                x.exam_name === a.exam_name ? { ...x, editValue: e.target.value } : x,
                              ),
                            )
                          }
                        />
                      </td>
                      <td className="py-2 space-x-2">
                        <Button onClick={() => saveAmount(a.exam_name, a.editValue)}>Save</Button>
                        <Button variant="outline" onClick={() => deleteAmount(a.exam_name)}>
                          Delete
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      </div>
    </PanelLayout>`;
  const idx = c.lastIndexOf(fallback);
  if (idx === -1) { console.error('fallback anchor missing too'); process.exit(1); }
  c = c.slice(0, idx) + table + c.slice(idx + fallback.length);
} else {
  console.log('primary anchor found (unused path)');
}
fs.writeFileSync(f, c, 'utf8');
console.log('CRUD table inserted');
