const fs = require('fs');
const f = 'd:/opencode 09062026/frontend/src/app/p_Xk7mN/exam-fee-collection/page.tsx';
let c = fs.readFileSync(f, 'utf8');
if (c.startsWith('"Conuse client"')) {
  c = '"use client"' + c.slice('"Conuse client"'.length);
  fs.writeFileSync(f, c, 'utf8');
  console.log('shebang fixed');
} else {
  console.log('starts with:', JSON.stringify(c.slice(0, 15)));
}
// Then patch the td row (line 528 area): single-line td
const tdAnchor = '<td className="py-2">{new Date(r.collected_at).toLocaleString()}</td>\n                          </tr>';
if (c.includes(tdAnchor)) {
  const tdRepl = `<td className="py-2">{new Date(r.collected_at).toLocaleString()}</td>
                          {canCollect && (
                            <td className="py-2">
                              {isAdmin && paymentCrudId === r.id ? (
                                <div className="flex gap-1">
                                  <Input type="number" value={crudAmount} onChange={(e) => setCrudAmount(e.target.value)} className="w-24" />
                                  <Button onClick={() => updatePayment(r.id)}>Save</Button>
                                  <Button variant="outline" onClick={() => setPaymentCrudId(null)}>Cancel</Button>
                                </div>
                              ) : isAdmin ? (
                                <div className="flex gap-1">
                                  <Button variant="outline" onClick={() => { setPaymentCrudId(r.id); setCrudAmount(String(r.amount)); }}>Edit</Button>
                                  <Button variant="outline" onClick={() => deletePayment(r.id)}>Delete</Button>
                                </div>
                              ) : (
                                <span className="text-xs text-gray-400">—</span>
                              )}
                            </td>
                          )}
                        </tr>`;
  c = c.replace(tdAnchor, tdRepl);
  fs.writeFileSync(f, c, 'utf8');
  console.log('td actions cell added');
} else if (c.includes('paymentCrudId === r.id')) {
  console.log('td actions cell already present');
} else {
  console.error('td anchor not found');
  process.exit(1);
}
