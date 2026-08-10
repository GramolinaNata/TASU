# -*- coding: utf-8 -*-
"""
Добавляет в бланк ТТН (public/templates/ttn_2026.xlsx) токены, которых там
не было: данные автомобиля и водителя.

ПОЧЕМУ ЭТИ ГРАФЫ ПЕЧАТАЛИСЬ ПУСТЫМИ. Дело не в данных — в шаблоне для них
просто не существовало токенов. При переводе бланка на ExcelJS токены
поставили в 15 ячеек (номер, даты, стороны, адреса, груз, места, вес),
а «Автомобиль» и «Водитель» оставили под ручное заполнение: тогда эти поля
никто не заполнял, из 22 заявок не было ни одной с данными. Сейчас данные
автотранспорта обязательны при формировании ТТН, поэтому графы подключаем.

КУДА СТАВИМ (по разметке бланка):
  O10 — строка под подписью «Автомобиль» (O9), объединение O10:T10;
        сюда идёт марка + госномер одной строкой, отдельной графы под номер
        в бланке нет.
  N11 — сразу после подписи «Водитель» (L11); ФИО водителя.
        Телефон водителя в накладную НЕ выводится — заказчик просил хранить
        его в базе, но не печатать.

Запуск: python scripts/fix-ttn-template.py [--check]
"""
import re
import shutil
import sys
import zipfile
from pathlib import Path

XLSX = Path("public/templates/ttn_2026.xlsx")
CHECK = "--check" in sys.argv

# ячейка -> текст токена
PATCH = {
    "O10": "{vehicle}",
    "N11": "{driver}",
    # ЯКОРЬ ПЕЧАТИ. В Excel картинка не привязана к токену, как в docx: она
    # кладётся поверх листа по координатам ячейки. Поэтому в бланк ставится
    # служебный токен — экспорт находит его координаты, гасит текст и кладёт
    # печать в эту позицию. Так печать переедет вместе с бланком, если заказчик
    # пришлёт новую версию формы.
    #
    # D47 — пустая строка прямо под подписью «должность, ФИО, подпись, штамп»
    # (D44) со стороны сдающего, то есть компании-экспедитора.
    "D47": "{stamp_here}",
}


def read_parts(path):
    with zipfile.ZipFile(path) as z:
        return {n: z.read(n) for n in z.namelist()}


def write_parts(path, parts):
    tmp = path.with_suffix(".tmp.xlsx")
    with zipfile.ZipFile(path) as src, zipfile.ZipFile(tmp, "w", zipfile.ZIP_DEFLATED) as dst:
        for item in src.infolist():
            dst.writestr(item, parts[item.filename])
    shutil.move(str(tmp), str(path))


def main():
    if not XLSX.exists():
        print(f"НЕ НАЙДЕН: {XLSX}")
        return 1

    parts = read_parts(XLSX)
    sheet = parts["xl/worksheets/sheet1.xml"].decode("utf-8")
    shared = parts["xl/sharedStrings.xml"].decode("utf-8")

    # Добавляем токены в sharedStrings и запоминаем их индексы.
    items = re.findall(r"<si>.*?</si>", shared, re.S)
    count = len(items)
    added = 0
    index_of = {}

    for cell, token in PATCH.items():
        # Уже есть такая строка? Переиспользуем.
        found = None
        for i, si in enumerate(items):
            if f"<t>{token}</t>" in si or f'<t xml:space="preserve">{token}</t>' in si:
                found = i
                break
        if found is None:
            index_of[cell] = count + added
            shared = shared.replace("</sst>", f"<si><t>{token}</t></si></sst>")
            added += 1
        else:
            index_of[cell] = found

    if added:
        # count/uniqueCount в шапке должны сойтись, иначе Excel ругается на файл.
        shared = re.sub(r'count="(\d+)" uniqueCount="(\d+)"',
                        lambda m: f'count="{int(m.group(1)) + added}" uniqueCount="{int(m.group(2)) + added}"',
                        shared, count=1)

    report = []
    for cell, token in PATCH.items():
        idx = index_of[cell]
        # Ячейка в листе уже существует (пустая) — подменяем её целиком,
        # сохраняя ссылку на стиль s="…", иначе поедет оформление бланка.
        pat = re.compile(r'<c r="%s"([^>]*?)(/>|>.*?</c>)' % cell, re.S)
        m = pat.search(sheet)
        if not m:
            report.append(f"{cell}: ЯЧЕЙКА НЕ НАЙДЕНА — пропущена")
            continue
        attrs = m.group(1)
        style = re.search(r'\ss="\d+"', attrs)
        style = style.group(0) if style else ""
        if f'<v>{idx}</v>' in m.group(0) and 't="s"' in m.group(0):
            report.append(f"{cell}: токен уже стоит")
            continue
        sheet = sheet[:m.start()] + f'<c r="{cell}"{style} t="s"><v>{idx}</v></c>' + sheet[m.end():]
        report.append(f"{cell}: поставлен {token}")

    print("\n".join("  " + r for r in report))

    if CHECK:
        print("\n--check: файл НЕ изменён")
        return 0

    parts["xl/worksheets/sheet1.xml"] = sheet.encode("utf-8")
    parts["xl/sharedStrings.xml"] = shared.encode("utf-8")
    write_parts(XLSX, parts)
    print(f"\nЗаписано: {XLSX}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
