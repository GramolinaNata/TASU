import { api } from "../api/api";

const EVT = "tasu_acts_changed";
let actsCache = [];

function emit() {
    window.dispatchEvent(new Event(EVT));
}

export async function loadActs() {
    try {
        const list = await api.requests.list();
        actsCache = list;
        emit();
        return list;
    } catch (err) {
        console.error("Failed to load acts:", err);
        return actsCache;
    }
}

export function subscribeActs(cb) {
    const handler = () => cb(actsCache);
    window.addEventListener(EVT, handler);
    return () => {
        window.removeEventListener(EVT, handler);
    };
}

export function getActs() {
    return actsCache;
}

export async function addAct(actData) {
    const newAct = await api.requests.create(actData);
    await loadActs();
    return newAct;
}

export function getActById(id) {
    return actsCache.find((x) => x.id === id) || null;
}

export async function updateAct(id, patch) {
    const updated = await api.requests.update(id, patch);
    await loadActs();
    return updated;
}

export async function deleteAct(id) {
    await api.requests.delete(id);
    await loadActs();
}

export function getActsByDocType(docType) {
    return actsCache.filter((a) => a.type === docType);
}
