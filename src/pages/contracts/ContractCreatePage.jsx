import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../../shared/api/api.js";
import { getSelectedCompany } from "../../shared/storage/companyStorage.js";

function formatDisplayDate(val) {
  if (!val) return "—";
  const d = new Date(val);
  if (isNaN(d.getTime())) return val;
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}.${month}.${year}`;
}

export default function ContractCreatePage() {
  const nav = useNavigate();
  const [loading, setLoading] = useState(false);
  const [availableActs, setAvailableActs] = useState([]);
  const [counterparties, setCounterparties] = useState([]);
  const [selectedCp, setSelectedCp] = useState(null);
  const [existingContract, setExistingContract] = useState(null);
  const [allContracts, setAllContracts] = useState([]);

  const [formData, setFormData] = useState({
    type: "warehouse",
    number: "",
    date: new Date().toISOString().split('T')[0],
    actId: "",
    counterpartyId: "",
    directorName: "",
    directorPosition: "Директор",
  });

  const company = getSelectedCompany();

  useEffect(() => {
    const loadData = async () => {
      try {
        const [actsList, contractsList, cpList] = await Promise.all([
          api.requests.list(),
          api.contracts.list(),
          api.counterparties.list(),
        ]);

        setCounterparties(Array.isArray(cpList) ? cpList : []);
        setAllContracts(Array.isArray(contractsList) ? contractsList : []);

        const usedActIds = new Set(contractsList.map(c => c.actId).filter(Boolean));

        const filtered = actsList
          .filter(a => {
            if (usedActIds.has(a.id)) return false;
            let details = {};
            if (a.details) {
              try { details = typeof a.details === 'string' ? JSON.parse(a.details) : a.details; }
              catch (e) {}
            }
            if (a.readyForAccountant || details.readyForAccountant || a.isDeferredForAccountant || details.isDeferredForAccountant) return false;
            if (formData.type === 'warehouse') {
              return (details.isWarehouse || a.isWarehouse) && a.companyId === company?.id;
            }
            const docType = a.docType || details.docType;
            return (docType === 'ttn' || docType === 'smr') && a.companyId === company?.id;
          })
          .map(a => {
            let details = {};
            if (a.details) {
              try { details = typeof a.details === 'string' ? JSON.parse(a.details) : a.details; }
              catch (e) {}
            }
            return { ...a, ...details };
          });

        setAvailableActs(filtered);

        if (company && formData.type) {
          const companyContracts = contractsList.filter(c => c.companyId === company.id && c.type === formData.type);
          let maxNum = 0;
          companyContracts.forEach(c => {
            const cleaned = String(c.number).replace(/№\s*/, "");
            const match = cleaned.match(/^(\d+)/);
            if (match) {
              const n = parseInt(match[1], 10);
              if (n > maxNum) maxNum = n;
            }
          });
          const nextNum = maxNum + 1;
          const yearSuffix = new Date().getFullYear().toString();
          const typeSuffix = formData.type === 'warehouse' ? 'С' : 'Т';
          const formattedNum = `№ ${String(nextNum).padStart(3, '0')}/${yearSuffix}-${typeSuffix}`;
          setFormData(prev => ({ ...prev, number: formattedNum }));
        }
      } catch (e) {
        console.error(e);
      }
    };
    if (company) loadData();
  }, [company, formData.type]);

  const handleCpChange = (cpId) => {
    const cp = counterparties.find(c => c.id === cpId);
    setSelectedCp(cp || null);

    // Проверяем есть ли уже договор для этого контрагента
    const existing = allContracts.find(c => c.counterpartyId === cpId);
    setExistingContract(existing || null);

    setFormData(prev => ({
      ...prev,
      counterpartyId: cpId,
      directorName: cp?.director || "",
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.number) return alert("Введите номер договора");
    if (formData.type === 'warehouse' && !formData.actId) return alert("Выберите заявку");
    if (existingContract) return alert("Для этого контрагента уже существует договор!");

    setLoading(true);
    try {
      const selectedAct = availableActs.find(a => a.id === formData.actId);
      const contractData = {
        ...formData,
        companyId: company.id,
        customerName: selectedCp?.name || selectedAct?.customer?.companyName || selectedAct?.customer?.fio || "",
        actData: selectedAct,
      };
      await api.contracts.create(contractData);
      nav("/contracts");
    } catch (e) {
      console.error(e);
      alert("Ошибка при создании");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="navbar">
        <h1>Создание договора</h1>
        <button className="btn" onClick={() => nav("/contracts")}>Отмена</button>
      </div>

      <form onSubmit={handleSubmit} style={{ marginTop: 20 }}>
        <div className="card">
          <div className="card_head">
            <div className="card_title">Основная информация</div>
          </div>
          <div className="card_body">
            <div className="form_grid">

              <div className="field field--full">
                <div className="label">Тип договора</div>
                <div style={{ display: 'flex', gap: 20, marginTop: 10 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                    <input type="radio" name="type" value="warehouse" checked={formData.type === 'warehouse'} onChange={e => setFormData({ ...formData, type: e.target.value })} style={{ height: 'auto' }} />
                    <span>На оказание складских услуг</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                    <input type="radio" name="type" value="transport" checked={formData.type === 'transport'} onChange={e => setFormData({ ...formData, type: e.target.value })} style={{ height: 'auto' }} />
                    <span>Транспортной экспедиции</span>
                  </label>
                </div>
              </div>

              <div className="field">
                <div className="label">Номер договора</div>
                <input value={formData.number} onChange={e => setFormData({ ...formData, number: e.target.value })} placeholder="№123-С" />
              </div>

              <div className="field">
                <div className="label">Дата договора</div>
                <input type="date" value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} />
              </div>

              <div className="field field--full">
                <div className="label">Контрагент</div>
                <select value={formData.counterpartyId} onChange={e => handleCpChange(e.target.value)}>
                  <option value="">-- Выберите контрагента --</option>
                  {counterparties.map(cp => (
                    <option key={cp.id} value={cp.id}>{cp.name} {cp.companyName ? `(${cp.companyName})` : ''}</option>
                  ))}
                </select>
                {existingContract && (
                  <div style={{ marginTop: 8, padding: '8px 12px', background: '#fff2f0', border: '1px solid #ffccc7', borderRadius: 6, color: '#cf1322', fontSize: '0.9rem' }}>
                    ⚠️ Для этого контрагента уже существует договор №{existingContract.number}. Создание второго договора невозможно.
                  </div>
                )}
              </div>

              {selectedCp && (
                <div className="field field--full" style={{ background: 'var(--bg)', padding: 12, borderRadius: 8, border: '1px solid var(--line)' }}>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 8 }}>Реквизиты контрагента:</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: '0.9rem' }}>
                    {selectedCp.bin && <div><strong>БИН:</strong> {selectedCp.bin}</div>}
                    {selectedCp.bank && <div><strong>Банк:</strong> {selectedCp.bank}</div>}
                    {selectedCp.account && <div><strong>IBAN:</strong> {selectedCp.account}</div>}
                    {selectedCp.address && <div style={{ gridColumn: 'span 2' }}><strong>Адрес:</strong> {selectedCp.address}</div>}
                  </div>
                </div>
              )}

              <div className="field">
                <div className="label">Должность подписанта</div>
                <input value={formData.directorPosition} onChange={e => setFormData({ ...formData, directorPosition: e.target.value })} placeholder="Директор" />
              </div>
              <div className="field">
                <div className="label">ФИО директора</div>
                <input value={formData.directorName} onChange={e => setFormData({ ...formData, directorName: e.target.value })} placeholder="Иванов Иван Иванович" />
              </div>

              <div className="field field--full">
                <div className="label">{formData.type === 'warehouse' ? "Выберите складскую заявку" : "Выберите заявку"}</div>
                <select value={formData.actId} onChange={e => setFormData({ ...formData, actId: e.target.value })} style={{ fontWeight: 'bold' }}>
                  <option value="">-- Выберите заявку --</option>
                  {availableActs.map(a => {
                    const details = typeof a.details === 'string' ? JSON.parse(a.details || '{}') : (a.details || {});
                    const actualDocType = a.docType || details.docType;
                    const customerInfo = a.customer?.companyName || a.customer?.fio || "";
                    return (
                      <option key={a.id} value={a.id}>
                        №{a.docNumber || a.number} от {formatDisplayDate(a.date)} {actualDocType ? `(${actualDocType.toUpperCase()})` : ""} {customerInfo ? `— ${customerInfo}` : ""}
                      </option>
                    );
                  })}
                </select>
              </div>

            </div>
          </div>
          <div className="table_actions">
            <button className="btn btn--accent" type="submit" disabled={loading || !!existingContract}>
              {loading ? "Формирование договора..." : "Создать договор"}
            </button>
          </div>
        </div>
      </form>
    </>
  );
}