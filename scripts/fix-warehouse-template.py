# -*- coding: utf-8 -*-
"""
Правка шаблона складской накладной public/templates/template_warehouse.docx.

ЧТО ДЕЛАЕТ.
  1. Убирает метку «(ВТВ)» из подписи над таблицей услуг:
     «Вид услуги (ВТВ):» → «Вид услуги:».
     Метка целиком лежит в одном текстовом run ('и (ВТВ)'), поэтому замена
     точечная и разметку не рвёт.
  2. Добавляет в таблицу услуг итоговую строку «Итого:» с суммой {total_sum}.
     Строка клонируется из ЗАГОЛОВКА таблицы: у него по одному run в ячейке
     и жирное начертание — то, что нужно итогу. Клонировать строку цикла
     нельзя: в ней сидят теги {#warehouse_services}/{/warehouse_services},
     и итог попал бы внутрь цикла, повторившись на каждой услуге.
     Новая строка вставляется ПОСЛЕ строки цикла, то есть вне его.

Таблиц услуг в шаблоне две, они посимвольно одинаковы (второй экземпляр акта
на том же листе) — правка применяется к обеим.

Запуск: python scripts/fix-warehouse-template.py [--check]
  --check  только показать, что будет сделано, файл не трогать
"""
import re
import shutil
import sys
import zipfile
from pathlib import Path

DOCX = Path("public/templates/template_warehouse.docx")
CHECK = "--check" in sys.argv

TOTAL_LABEL = "Итого:"
TOTAL_TAG = "{total_sum}тг."


def read_document(path):
    with zipfile.ZipFile(path) as z:
        return z.read("word/document.xml").decode("utf-8"), z.namelist()


def write_document(path, new_xml):
    """Перепаковка: все прочие части архива переносятся байт в байт."""
    tmp = path.with_suffix(".tmp.docx")
    with zipfile.ZipFile(path) as src, zipfile.ZipFile(tmp, "w", zipfile.ZIP_DEFLATED) as dst:
        for item in src.infolist():
            data = src.read(item.filename)
            if item.filename == "word/document.xml":
                data = new_xml.encode("utf-8")
            dst.writestr(item, data)
    shutil.move(str(tmp), str(path))


def build_total_row(header_row_xml):
    """Итоговая строка из заголовка: подписи ячеек заменяются на «Итого:» и тег суммы."""
    row = header_row_xml
    for old, new in (
        ("Наименование услуги", TOTAL_LABEL),
        ("Кол-во", ""),
        ("Цена", ""),
        ("Сумма", TOTAL_TAG),
    ):
        # Заменяем ровно содержимое <w:t>…</w:t>, а не любое вхождение в разметке.
        row = re.sub(
            r"(<w:t[^>]*>)" + re.escape(old) + r"(</w:t>)",
            lambda m, n=new: m.group(1) + n + m.group(2),
            row,
            count=1,
        )
    return row


def main():
    if not DOCX.exists():
        print(f"НЕ НАЙДЕН: {DOCX}")
        return 1

    xml, _ = read_document(DOCX)
    original = xml
    report = []

    # --- 1. метка (ВТВ) ---
    label_hits = len(re.findall(r"(<w:t[^>]*>)и \(ВТВ\)(</w:t>)", xml))
    if label_hits:
        xml = re.sub(r"(<w:t[^>]*>)и \(ВТВ\)(</w:t>)", r"\1и\2", xml)
        report.append(f"метка «(ВТВ)» убрана из подписи, вхождений: {label_hits}")
    else:
        report.append("метка «(ВТВ)» не найдена — возможно, уже убрана")

    # --- 2. итоговая строка ---
    tables = re.findall(r"<w:tbl>.*?</w:tbl>", xml, re.S)
    service_tables = [t for t in tables if "{#warehouse_services}" in t]
    report.append(f"таблиц услуг найдено: {len(service_tables)}")

    added = 0
    for tbl in service_tables:
        if TOTAL_TAG in tbl:
            report.append("  в таблице уже есть итог — пропущена")
            continue
        rows = re.findall(r"<w:tr[ >].*?</w:tr>", tbl, re.S)
        if len(rows) < 2:
            report.append("  СТРУКТУРА НЕ УЗНАНА (меньше двух строк) — пропущена")
            continue
        header_row, loop_row = rows[0], rows[-1]
        total_row = build_total_row(header_row)
        # Вставляем после строки цикла → итог оказывается вне {#warehouse_services}.
        new_tbl = tbl.replace(loop_row, loop_row + total_row, 1)
        xml = xml.replace(tbl, new_tbl)  # обе одинаковые таблицы разом
        added += xml.count(TOTAL_TAG) - added
        report.append("  добавлена строка «Итого:» с {total_sum}")
        break  # обе таблицы идентичны, replace выше накрыл обе

    print("\n".join("  " + r for r in report))
    print(f"\nвхождений «{TOTAL_TAG}» в итоге: {xml.count(TOTAL_TAG)}")

    if CHECK:
        print("\n--check: файл НЕ изменён")
        return 0
    if xml == original:
        print("\nизменений нет, файл не переписан")
        return 0

    write_document(DOCX, xml)
    print(f"\nЗаписано: {DOCX}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
