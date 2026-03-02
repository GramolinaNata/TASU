export const getContracts = () => {
    const contracts = localStorage.getItem("tasu_contracts");
    return contracts ? JSON.parse(contracts) : [];
};

export const saveContracts = (contracts) => {
    localStorage.setItem("tasu_contracts", JSON.stringify(contracts));
};

export const addContract = (contract) => {
    const contracts = getContracts();
    const newContract = {
        ...contract,
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
    };
    contracts.push(newContract);
    saveContracts(contracts);
    return newContract;
};

export const updateContract = (id, data) => {
    const contracts = getContracts();
    const index = contracts.findIndex((c) => c.id === id);
    if (index !== -1) {
        contracts[index] = { ...contracts[index], ...data, updatedAt: new Date().toISOString() };
        saveContracts(contracts);
        return contracts[index];
    }
    return null;
};

export const deleteContract = (id) => {
    const contracts = getContracts();
    const filtered = contracts.filter((c) => c.id !== id);
    saveContracts(filtered);
};

export const getContractById = (id) => {
    const contracts = getContracts();
    return contracts.find((c) => c.id === id);
};
