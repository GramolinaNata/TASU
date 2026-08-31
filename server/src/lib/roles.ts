// Роли пользователей — серверное зеркало.
//
// ⚠️ ЗЕРКАЛО ФРОНТА: src/shared/auth/roles.js. Общий модуль сделать нельзя —
// образ бэка собирается из каталога server/ и до src/ не достаёт (та же
// причина, что у courierCity, cargoStatus и accessLink).
// ПРИ ПРАВКЕ МЕНЯТЬ В ДВУХ МЕСТАХ.
//
// ЭТАП «ФУНДАМЕНТ». Модуль пока НЕ управляет доступом: инлайновые проверки в
// request.controller.ts ('COURIER', ['MANAGER','ADMIN'] и прочие) оставлены
// как есть и работают по-прежнему. Здесь лежат значения и справочные функции,
// на которые будут переезжать проверки следующим шагом.

export const ROLE = {
  // --- существующие, менять запрещено: строки лежат в базе и в JWT ---
  ADMIN: 'ADMIN',
  MANAGER: 'MANAGER',
  MANAGER2: 'MANAGER2',
  ACCOUNTANT: 'ACCOUNTANT',
  ACCOUNTANT2: 'ACCOUNTANT2',
  COURIER: 'COURIER',
  PRIVATE: 'PRIVATE',

  // --- новые (ТЗ: роли и цепочка подписей) ---
  WAREHOUSE_KEEPER: 'WAREHOUSE_KEEPER',
  COURIER_LOCAL: 'COURIER_LOCAL',
  COURIER_REGION: 'COURIER_REGION',
  OPS_MANAGER: 'OPS_MANAGER',
} as const;

export type RoleValue = (typeof ROLE)[keyof typeof ROLE];

type RoleMeta = { label: string; company: boolean; city: boolean; cabinet: boolean };

export const ROLE_META: Record<string, RoleMeta> = {
  [ROLE.ADMIN]:       { label: 'Админ',                  company: false, city: false, cabinet: true },
  [ROLE.MANAGER]:     { label: 'Менеджер',                company: false, city: false, cabinet: true },
  [ROLE.MANAGER2]:    { label: 'Менеджер (ограниченный)', company: true,  city: false, cabinet: true },
  [ROLE.ACCOUNTANT]:  { label: 'Бухгалтер',               company: false, city: false, cabinet: true },
  [ROLE.ACCOUNTANT2]: { label: 'Бухгалтер 2',             company: false, city: false, cabinet: true },
  [ROLE.COURIER]:     { label: 'Курьер',                  company: false, city: true,  cabinet: true },
  [ROLE.PRIVATE]:     { label: 'Частное лицо',            company: true,  city: false, cabinet: true },

  [ROLE.WAREHOUSE_KEEPER]: { label: 'Кладовщик',             company: false, city: true,  cabinet: false },
  [ROLE.COURIER_LOCAL]:    { label: 'Курьер (местный)',      company: false, city: true,  cabinet: false },
  [ROLE.COURIER_REGION]:   { label: 'Курьер (региональный)', company: false, city: true,  cabinet: false },
  [ROLE.OPS_MANAGER]:      { label: 'Операционный менеджер', company: false, city: false, cabinet: false },
};

// COURIER_LOCAL сделан на основе COURIER, но НЕ заменяет его: у живых
// пользователей в базе стоит COURIER, и эта строка обязана работать дальше.
export const COURIER_FAMILY: string[] = [ROLE.COURIER, ROLE.COURIER_LOCAL, ROLE.COURIER_REGION];
export const MANAGER_FAMILY: string[] = [ROLE.MANAGER, ROLE.MANAGER2, ROLE.OPS_MANAGER];
export const ACCOUNTANT_FAMILY: string[] = [ROLE.ACCOUNTANT, ROLE.ACCOUNTANT2];

export const COMPANY_BOUND_ROLES: string[] = Object.keys(ROLE_META).filter((r) => ROLE_META[r].company);
export const CITY_BOUND_ROLES: string[] = Object.keys(ROLE_META).filter((r) => ROLE_META[r].city);
export const PENDING_CABINET_ROLES: string[] = Object.keys(ROLE_META).filter((r) => !ROLE_META[r].cabinet);

export function isKnownRole(role: unknown): boolean {
  return Object.prototype.hasOwnProperty.call(ROLE_META, String(role || ''));
}

export function roleName(role: string): string {
  return ROLE_META[role]?.label || ROLE_META[ROLE.MANAGER].label;
}

export function isCourierFamily(role: string): boolean {
  return COURIER_FAMILY.indexOf(role) !== -1;
}

export function isManagerFamily(role: string): boolean {
  return MANAGER_FAMILY.indexOf(role) !== -1;
}

export function isAccountantFamily(role: string): boolean {
  return ACCOUNTANT_FAMILY.indexOf(role) !== -1;
}

export function needsCompany(role: string): boolean {
  return !!ROLE_META[role]?.company;
}

export function needsCity(role: string): boolean {
  return !!ROLE_META[role]?.city;
}
