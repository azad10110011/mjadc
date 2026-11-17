// Add admin Edit/Delete actions to report payment rows in exam-fee-collection page.
const fs = require('fs');
const f = 'd:/opencode 09062026/frontend/src/app/p_Xk7mN/exam-fee-collection/page.tsx';
let c = fs.readFileSync(f, 'utf8');
if (c.includes('paymentCrudId')) { console.log('already added'); process.exit(0); }

// 1. state after "const [repLoading, setRepLoading]"
const stateAnchor = 'const [repLoading, setRepLoading] = useState(false);';
const stateIns = stateAnchor + `
  const [paymentCrudId, setPaymentCrudId] = useState<number | null>(null);
  const [crudAmount, setCrudAmount] = useState("");

  const updatePayment = async (id: number) => {
    if (!crudAmount || Number(crudAmount) <= 0) { alert("Enter a valid amount"); return; }
    try {
      await api.put(\`/admin/exam-fees/\${id}\`, { amount: Number(crudAmount) });
      setMessage("Payment record updated");
      setPaymentCrudId(null);
      runReport();
    } catch (e: any) {
      setMessage(e.message || "Failed to update");
    }
  };

  const deletePayment = async (id: number) => {
    if (!confirm("Delete this payment record?")) return;
    try {
      await api.delete(\`/admin/exam-fees/\${id}\`);
      setMessage("Payment record deleted");
      runReport();
    } catch (e: any) {
      setMessage(e.message || "Failed to delete");
    }
  };`;
if (!c.includes(stateAnchor)) { console.error('state anchor missing'); process.exit(1); }
c = c.replace(stateAnchor, stateIns);

// 2. Actions column header in the report payment table
const thAnchor = '<th className="py-2 pr-3">Collected By</th>\n                            <th className="py-2">At</th>';
const thRepl = '<th className="py-2 pr-3">Collected By</th>\n                            <th className="py-2 pr-3">At</th>\n                            {canCollect && <th className="py-2">Actions</th>}';
if (!c.includes(thAnchor)) { console.error('th anchor missing'); process.exit(1); }
c = c.replace(thAnchor, thRepl);

// 3. row cell: add editable amount + buttons after the time cell
const tdAnchor = `<td className="py-2">{new Date(r.collected_at).toLocaleString()}</td>
                          </tr>`;
const tdRepl = `<td className="py-2">{new Date(r.collected_at).toLocaleString()}</td>
                          {canCollect && (
                            <td className="py-2">
                              {isAdmin && paymentCrudId === r.id ? (
                                <div className="flex gap-1">
                                  <Input
                                    type="number"
                                    value={crudAmount}
                                    onChange={(e) => setCrudAmount(e.target.value)}
                                    className="w-24"
                                  />
                                  <Button onClick={() => updatePayment(r.id)}>Save</Button>
                                  <Button variant="outline" onClick={() => setPaymentCrudId(null)}>
                                    Cancel
                                  </Button>
                                </div>
                              ) : isAdmin ? (
                                <div className="flex gap-1">
                                  <Button
                                    variant="outline"
                                    onClick={() => {
                                      setPaymentCrudId(r.id);
                                      setCrudAmount(String(r.amount));
                                    }}
                                  >
                                    Edit
                                  </Button>
                                  <Button variant="outline" onClick={() => deletePayment(r.id)}>
                                    Delete
                                  </Button>
                                </div>
                              ) : (
                                <span className="text-xs text-gray-400">—</span>
                              )}
                            </td>
                          )}
                        </tr>`;
if (!c.includes(tdAnchor)) { console.error('td anchor missing'); process.exit(1); }
c = c.replace(tdAnchor, tdRepl);

fs.writeFileSync(f, c, 'utf8');
console.log('payment CRUD UI added');
