import { api } from "../api/api";

const EVT = "tasu_contracts_changed";
let contractsCache = [];

function emit() {
    window.dispatchEvent(new Event(EVT));
}

export async function loadContracts() {
    try {
        // Договоры лежат в СВОЕЙ таблице (модель Contract, роут /contracts).
        // Здесь стояло `api.requests.list()` с фильтром `type === 'Contract'` —
        // со времён, когда договор был разновидностью заявки. Заявок с таким
        // типом в базе нет, поэтому кэш всегда получался пустым, а на каждый
        // вход в систему уезжал запрос за ВСЕМИ заявками, результат которого
        // тут же выбрасывался.
        const list = await api.contracts.list();
        contractsCache = Array.isArray(list) ? list : [];
        emit();
        return contractsCache;
    } catch (err) {
        console.error("Failed to load contracts:", err);
        return contractsCache;
    }
}

export const getContracts = () => {
    return contractsCache;
};

// Создание/правка/удаление идут в ТУ ЖЕ таблицу, из которой читает
// loadContracts. Раньше они писали в requests с type: 'Contract' —
// запись уходила не туда, где её потом ищут.
export const addContract = async (contractData) => {
    const newContract = await api.contracts.create(contractData);
    await loadContracts();
    // Здесь стояло `return newAct` — переменной с таким именем в модуле нет.
    // В ES-модуле это ReferenceError: договор создавался, а вызывающий получал
    // исключение и считал, что создание не прошло.
    return newContract;
};

export const updateContract = async (id, data) => {
    const updated = await api.contracts.update(id, data);
    await loadContracts();
    return updated;
};

export const deleteContract = async (id) => {
    await api.contracts.delete(id);
    await loadContracts();
};

export const getContractById = (id) => {
    return contractsCache.find((c) => c.id === id);
};

export function subscribeContracts(cb) {
    const handler = () => cb(contractsCache);
    window.addEventListener(EVT, handler);
    return () => {
        window.removeEventListener(EVT, handler);
    };
}

