import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../../shared/api/api.js";
import { getSelectedCompany } from "../../shared/storage/companyStorage.js";
import { exportToDocx } from "../../shared/export/docxExport.js";

export default function ContractCreatePage() {
  const nav = useNavigate();
  const [loading, setLoading] = useState(false);
  const [availableActs, setAvailableActs] = useState([]);
  
  const [formData, setFormData] = useState({
    type: "warehouse",
    number: "",
    date: new Date().toISOString().split('T')[0],
    actId: "",
  });

  const company = getSelectedCompany();

  useEffect(() => {
    const loadData = async () => {
      try {
        const [actsList, contractsList] = await Promise.all([
          api.requests.list(),
          api.contracts.list()
        ]);

        // 0. Составляем список ID заявок, для которых уже есть договоры
        const usedActIds = new Set(contractsList.map(c => c.actId).filter(Boolean));

        // 1. Фильтруем заявки для этой компании согласно типу договора
        const filtered = actsList
          .filter(a => {
            // Исключаем, если договор уже есть
            if (usedActIds.has(a.id)) return false;

            let details = {};
            if (a.details) {
              try {
                details = typeof a.details === 'string' ? JSON.parse(a.details) : a.details;
              } catch (e) { console.error("Parse details error", e); }
            }

            // Исключаем те, что уже ушли бухгалтеру или отложены
            if (a.readyForAccountant || details.readyForAccountant || a.isDeferredForAccountant || details.isDeferredForAccountant) {
              return false;
            }

            if (formData.type === 'warehouse') {
              return (details.isWarehouse || a.isWarehouse) && a.companyId === company?.id;
            }
            
            // Для транспорта показываем только те, по которым сформированы документы (ТТН или СМР)
            const docType = a.docType || details.docType;
            return (docType === 'ttn' || docType === 'smr') && a.companyId === company?.id;
          })
          .map(a => {
            // Важно: мержим детали, чтобы поля customer, warehouseServices и т.д. были на верхнем уровне
            let details = {};
            if (a.details) {
              try {
                details = typeof a.details === 'string' ? JSON.parse(a.details) : a.details;
              } catch (e) { }
            }
            return { ...a, ...details };
          });

        setAvailableActs(filtered);

        // 2. Генерируем следующий номер договора
        if (company && formData.type) {
          const companyContracts = contractsList.filter(
            c => c.companyId === company.id && c.type === formData.type
          );
          
          let maxNum = 0;
          companyContracts.forEach(c => {
            // Извлекаем число. Ищем первую последовательность цифр в строке (напр. "№ 001/26-С" -> 1)
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.number) return alert("Введите номер договора");
    if (formData.type === 'warehouse' && !formData.actId) return alert("Выберите заявку");

    setLoading(true);
    try {
      const selectedAct = availableActs.find(a => a.id === formData.actId);
      
      const contractData = {
        ...formData,
        companyId: company.id,
        customerName: selectedAct?.customer?.companyName || selectedAct?.customer?.fio || "",
        // Сохраняем ссылку на акт для экспорта
        actData: selectedAct
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
                    <input 
                        type="radio" 
                        name="type" 
                        value="warehouse" 
                        checked={formData.type === 'warehouse'} 
                        onChange={e => setFormData({ ...formData, type: e.target.value })}
                        style={{ height: 'auto' }}
                    />
                    <span>На оказание складских услуг</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                    <input 
                        type="radio" 
                        name="type" 
                        value="transport" 
                        checked={formData.type === 'transport'} 
                        onChange={e => setFormData({ ...formData, type: e.target.value })}
                        style={{ height: 'auto' }}
                    />
                    <span>Транспортной экспедиции</span>
                  </label>
                </div>
              </div>

              <div className="field">
                <div className="label">Номер договора</div>
                <input 
                    value={formData.number} 
                    onChange={e => setFormData({ ...formData, number: e.target.value })} 
                    placeholder="Напр: №123-С" 
                />
              </div>

              <div className="field">
                <div className="label">Дата договора</div>
                <input 
                    type="date" 
                    value={formData.date} 
                    onChange={e => setFormData({ ...formData, date: e.target.value })} 
                />
              </div>

                <div className="field field--full">
                  <div className="label">
                    {formData.type === 'warehouse' ? "Выберите складскую заявку" : "Выберите заявку"}
                  </div>
                  <select 
                    value={formData.actId} 
                    onChange={e => setFormData({ ...formData, actId: e.target.value })}
                    style={{ fontWeight: 'bold' }}
                  >
                    <option value="">-- Выберите заявку --</option>
                    {availableActs.map(a => {
                        const details = typeof a.details === 'string' ? JSON.parse(a.details) : (a.details || {});
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
            <button className="btn btn--accent" type="submit" disabled={loading}>
              {loading ? "Формирование договора..." : "Создать договор"}
            </button>
          </div>
        </div>
      </form>
    </>
  );
}

function formatDisplayDate(val) {
    if (!val) return "—";
    const d = new Date(val);
    if (isNaN(d.getTime())) return val;
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}.${month}.${year}`;
}
