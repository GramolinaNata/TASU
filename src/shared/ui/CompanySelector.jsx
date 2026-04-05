import React, { useEffect, useState } from "react";
import Modal from "./Modal.jsx";
import Loader from "../components/Loader";
import {
  getCompanies,
  getSelectedCompanyId,
  setSelectedCompanyId,
  subscribeCompanies,
} from "../storage/companyStorage.js";

export default function CompanySelector({ open, onClose }) {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const current = getCompanies();
    setCompanies(current);
    if (current.length > 0) {
      setLoading(false);
    }
    
    return subscribeCompanies((list) => {
      setCompanies(list);
      setLoading(false);
    });
  }, []);

  const select = (id) => {
    setSelectedCompanyId(id);
    onClose();
  };

  // Если открыто, но компании не загрузились (первый рендер),
  // но useEffect скоро сработает.

  if (!open) return null;

  return (
    <Modal title="Выберите компанию" onClose={onClose} closable={true}>
      <div className="company_list">
        {loading ? (
          <div style={{ padding: "40px 0" }}>
            <Loader text="Загрузка списка компаний..." />
          </div>
        ) : (
          <>
            {companies.map((c) => (
              <div key={c.id} className="company_item" onClick={() => select(c.id)}>
                <div className="company_name">{c.name}</div>
                <div className="company_meta">БИН: {c.bin || "—"}</div>
                <div className="company_meta">{c.address || "—"}</div>
              </div>
            ))}

            {companies.length === 0 && <div className="muted">Нет доступных компаний</div>}
          </>
        )}
      </div>
    </Modal>
  );
}
