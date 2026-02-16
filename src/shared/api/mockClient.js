import { getActs, addAct, updateAct, deleteAct, getActById } from "../storage/actsStorage.js";
import { getCompanies, addCompany, updateCompany, deleteCompany } from "../storage/companyStorage.js";

const DELAY = 600; // Имитация задержки сети

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export const api = {
  acts: {
    list: async () => {
      await delay(DELAY);
      return getActs();
    },
    get: async (id) => {
      await delay(DELAY);
      return getActById(id);
    },
    create: async (data) => {
      await delay(DELAY);
      return addAct(data);
    },
    update: async (id, data) => {
      await delay(DELAY);
      return updateAct(id, data);
    },
    delete: async (id) => {
      await delay(DELAY);
      return deleteAct(id);
    },
  },
  companies: {
    list: async () => {
      await delay(DELAY);
      return getCompanies();
    },
    create: async (data) => {
        await delay(DELAY);
        return addCompany(data);
    },
    update: async (id, data) => {
        await delay(DELAY);
        return updateCompany(id, data);
    },
    delete: async (id) => {
        await delay(DELAY);
        return deleteCompany(id);
    }
  }
};
