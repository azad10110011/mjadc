const fs = require('fs');
const f = 'd:/opencode 09062026/frontend/src/app/p_Xk7mN/exam-fee-collection/page.tsx';
let c = fs.readFileSync(f, 'utf8');
if (c.startsWith('"Conuse client"')) {
  c = '"use client"' + c.slice('"Conuse client"'.length);
}
// report table row: toLocaleString at 8-space indent (line 528)
const reportTd = '                              <td className="py-2">{new Date(r.collected_at).toLocaleString()}</td>\n                            </tr>';
if (c.includes(reportTd) && !c.includes('paymentCrudId === r.id')) {
  const repl = `                              <td className="py-2">{new Date(r.collected_at).toLocaleString()}</td>
                              {isAdmin && (
                                <td className="py-2">
                                  {paymentCrudId === r.id ? (
                                    <div className="flex gap-1">
                                      <Input type="number" value={crudAmount} onChange={(e) => setCrudAmount(e.target.value)} className="w-24" />
                                      <Button onClick={() => updatePayment(r.id)}>Save</Button>
                                      <Button variant="outline" onClick={() => setPaymentCrudId(null)}>Cancel</Button>
                                    </div>
                                  ) : (
                                    <>
                                      <Button variant="outline" onClick={() => { setPaymentCrudId(r.id); setCrudAmount(String(r.amount)); }}>Edit</Button>
                                      <Button variant="outline" onClick={() => deletePayment(r.id)}>Delete</Button>
                                    </>
                                  )}
                                </td>
                              )}
                            </tr>`;
  c = c.replace(reportTd, repl);
  // header row: add Actions after At in report table header
  const th = '                            <th className="py-2 pr-3">Collected By</th>\n                            <th className="py-2">At</th>';
  if (c.includes(th)) {
    c = c.replace(th, th + '\n                            {isAdmin && <th className="py-2">Actions</th>}');
  }
  fs.writeFileSync(f, c, 'utf8');
  console.log('actions cell + header added');
} else if (c.includes('paymentCrudId === r.id')) {
  console.log('already present');
} else {
  console.error('anchor missing');
  process.exit(1);
}
