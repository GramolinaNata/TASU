const KEY = "tasu_acts_v1";
const EVT = "tasu_acts_changed";

function emit() {
    window.dispatchEvent(new Event(EVT));
}

export function subscribeActs(cb) {
    const handler = () => cb(getActs());
    window.addEventListener(EVT, handler);
    window.addEventListener("storage", handler);
    return () => {
        window.removeEventListener(EVT, handler);
        window.removeEventListener("storage", handler);
    };
}

export function getActs() {
    try {
        const raw = localStorage.getItem(KEY);
        const parsed = raw ? JSON.parse(raw) : [];
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}

export function setActs(list) {
    localStorage.setItem(KEY, JSON.stringify(list));
    emit();
}

export function addAct(act) {
    const list = getActs();
    const next = [act, ...list];
    setActs(next);
    return act;
}

export function getActById(id) {
    return getActs().find((x) => x.id === id) || null;
}
export function updateAct(id, patch) {
    const list = getActs();
    const next = list.map((a) => (a.id === id ? {
        ...a,
        ...patch,
        updatedAt: Date.now()
    } : a));
    setActs(next);
    return next.find((x) => x.id === id) || null;
}
export function getActsByDocType(docType) {
    return getActs().filter((a) => a.docType === docType);
}

export function deleteAct(id) {
    const list = getActs();
    const next = list.filter((a) => a.id !== id);
    setActs(next);
}