// ============================================================
// Единый способ отправки наклейки на печать — через скрытый iframe.
//
// ЗАЧЕМ. Раньше каждая наклейка открывалась в новой вкладке
// (window.open(blob)). У этого способа два практических минуса на
// термопринтере: вкладку может срезать блокировщик всплывающих окон, а
// печать идёт из контекста отдельной страницы, где браузер сам решает,
// что делать с масштабом и полями. Печать из iframe остаётся внутри
// текущей страницы и ведёт себя одинаково во всех местах вызова.
//
// ЧТО ЭТОТ МОДУЛЬ НЕ ДЕЛАЕТ. Он не трогает вид наклейки: ни вёрстку, ни
// размер листа, ни состав полей, ни QR. На вход приходит готовый HTML,
// модуль отвечает только за доставку его на принтер.
//
// Встроенный в шаблон авто-print вырезается намеренно: иначе печать
// вызвалась бы дважды — один раз скриптом внутри документа, второй раз
// отсюда. Управление печатью держим в одном месте.
// ============================================================

const IFRAME_ID = "tasu-label-print-frame";
// Сколько ждать до удаления iframe. Убирать сразу нельзя: диалог печати
// в части браузеров читает документ уже после возврата из print().
const CLEANUP_MS = 60_000;

function stripScripts(html) {
  return String(html || "").replace(/<script\b[\s\S]*?<\/script>/gi, "");
}

/**
 * Печатает готовый HTML-документ через скрытый iframe.
 * @param {string} html — самодостаточный документ наклейки (со своими стилями и @page)
 * @param {{ title?: string }} [opts]
 */
export function printLabelViaIframe(html, opts = {}) {
  // Хвост от предыдущей печати мог остаться, если пользователь закрыл
  // диалог очень быстро, — переиспользуем один и тот же узел.
  const old = document.getElementById(IFRAME_ID);
  if (old && old.parentNode) old.parentNode.removeChild(old);

  const frame = document.createElement("iframe");
  frame.id = IFRAME_ID;
  frame.setAttribute("aria-hidden", "true");
  frame.title = opts.title || "Печать наклейки";
  // Не display:none: часть браузеров не печатает скрытый таким образом
  // документ. Уводим за пределы экрана — но с РЕАЛЬНЫМИ размерами.
  //
  // Раньше здесь стояло width:0;height:0;visibility:hidden — и наклейка
  // печаталась на два листа: в вырожденном вьюпорте браузер считал раскладку
  // непредсказуемо, блок с flex:1 распирало выше листа, и хвост (QR) уезжал
  // на вторую страницу. Размер под этикетку 100×150 мм (≈378×567 px при 96 dpi)
  // даёт документу нормальный вьюпорт, а @page внутри всё равно решает,
  // каким будет физический лист.
  frame.style.cssText =
    "position:fixed;left:-10000px;top:0;width:378px;height:567px;border:0;";

  document.body.appendChild(frame);

  const doc = frame.contentWindow?.document;
  if (!doc) {
    // Крайне маловероятно, но молча терять печать нельзя.
    if (frame.parentNode) frame.parentNode.removeChild(frame);
    throw new Error("Не удалось подготовить окно печати");
  }

  doc.open();
  doc.write(stripScripts(html));
  doc.close();

  // Защёлка: печать должна произойти ровно один раз, какой бы из
  // триггеров ниже ни сработал первым.
  let printed = false;
  const run = () => {
    if (printed) return;
    printed = true;
    try {
      frame.contentWindow.focus();
      frame.contentWindow.print();
    } catch (e) {
      console.error("Печать наклейки не удалась:", e);
    } finally {
      setTimeout(() => {
        const node = document.getElementById(IFRAME_ID);
        if (node && node.parentNode) node.parentNode.removeChild(node);
      }, CLEANUP_MS);
    }
  };

  // Картинки (логотип, QR) — data: URI, но браузеру всё равно нужен тик,
  // чтобы разложить документ. Печать до этого даёт пустой лист.
  if (frame.contentWindow.document.readyState === "complete") {
    setTimeout(run, 50);
  } else {
    frame.onload = () => setTimeout(run, 50);
    // Подстраховка: если onload по какой-то причине не придёт, печать
    // всё равно должна состояться (защёлка не даст напечатать дважды).
    setTimeout(run, 1500);
  }
}
