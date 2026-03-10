import { api } from "../api/api";

const EVT = "tasu_contracts_changed";
let contractsCache = [];

function emit() {
    window.dispatchEvent(new Event(EVT));
}

export async function loadContracts() {
    try {
        const list = await api.requests.list();
        // Фильтруем только договоры, если на бекенде они все в одной таблице requests
        contractsCache = list.filter(r => r.type === 'Contract');
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

export const addContract = async (contractData) => {
    const newContract = await api.requests.create({
        ...contractData,
        type: 'Contract'
    });
    await loadContracts();
    return newAct;
};

export const updateContract = async (id, data) => {
    const updated = await api.requests.update(id, data);
    await loadContracts();
    return updated;
};

export const deleteContract = async (id) => {
    await api.requests.delete(id);
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

