import React, { useEffect, useState } from "react";
import { api } from "../../shared/api/api.js";
import Loader from "../../shared/components/Loader";
const CATS = ["Ремонт машины","Заправка","Зарплата сотрудников","Техническое обслуживание","Аренда","Прочее"];
export default function AccountantExpensesPage() {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ date: new Date().toISOString().split("T")[0], category: CATS[0], description: "", amount: "", docNumber: "" });
  const load = async () => { setLoading(true); try { const d = await api.expenses.list(); setExpenses(Array.isArray(d) ? d : []); } catch(e) { setExpenses([]); } finally { setLoading(false); } };
  useEffect(() => { load(); }, []);
  const total = expenses.reduce((a, e) => a + (Number(e.amount) || 0), 0);
  const save = async (e) => { e.preventDefault(); setSaving(true); try { await api.expenses.create({ ...form, amount: parseFloat(form.amount) }); setForm({ date: new Date().toISOString().split("T")[0], category: CATS[0], description: "", amount: "", docNumber: "" }); setShowForm(false); load(); } catch(e) { alert("Ошибка: " + e.message); } finally { setSaving(false); } };
  const del = async (id) => { if (window.confirm("Удалить?")) { try { await api.expenses.delete(id); load(); } catch(e) { alert("Ошибка"); } } };
  return (
    <>
      <div className="navbar">
        <div style={{display:"flex",alignItems:"center",gap:12}}><h1>Расходы НОВЫЙ</h1></div>
        <div style={{display:"flex",gap:8}}>
          <button className="btn btn--accent" onClick={() => setShowForm(!showForm)}>+ Добавить расход</button>
        </div>
      </div>
      <div style={{marginTop:16,padding:16,background:"var(--card)",borderRadius:8}}>Итого: <strong>{total.toLocaleString()} тг</strong></div>
      {showForm && (
        <div className="card" style={{marginTop:16}}>
          <div className="card_body">
            <form onSubmit={save} style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:16}}>
              <div className="field"><div className="label">Дата</div><input type="date" value={form.date} onChange={e=>setForm({...form,date:e.target.value})} required /></div>
              <div className="field"><div className="label">Категория</div><select value={form.category} onChange={e=>setForm({...form,category:e.target.value})}>{CATS.map(c=><option key={c}>{c}</option>)}</select></div>
              <div className="field"><div className="label">Сумма</div><input type="number" value={form.amount} onChange={e=>setForm({...form,amount:e.target.value})} required /></div>
              <div className="field"><div className="label">Накладная</div><input value={form.docNumber} onChange={e=>setForm({...form,docNumber:e.target.value})} /></div>
              <div className="field" style={{gridColumn:"span 2"}}><div className="label">Описание</div><input value={form.description} onChange={e=>setForm({...form,description:e.target.value})} /></div>
              <div style={{gridColumn:"span 3",display:"flex",gap:12}}><button className="btn btn--accent" type="submit" disabled={saving}>{saving?"Сохранение...":"Сохранить"}</button><button className="btn" type="button" onClick={()=>setShowForm(false)}>Отмена</button></div>
            </form>
          </div>
        </div>
      )}
      <div className="table_wrap" style={{marginTop:16}}>
        {loading ? <Loader /> : (
          <table className="table_fixed">
            <thead><tr><th>Дата</th><th>Категория</th><th>Описание</th><th>Накладная</th><th>Сумма</th><th></th></tr></thead>
            <tbody>
              {expenses.length === 0 ? <tr><td colSpan={6} className="muted" style={{padding:16}}>Расходов пока нет.</td></tr> :
                expenses.map(e => <tr key={e.id}><td>{e.date}</td><td>{e.category}</td><td>{e.description||"—"}</td><td>{e.docNumber||"—"}</td><td style={{fontWeight:700}}>{Number(e.amount).toLocaleString()} тг</td><td><button className="btn btn--sm btn--danger" onClick={()=>del(e.id)}>х</button></td></tr>)
              }
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}