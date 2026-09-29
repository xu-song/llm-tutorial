"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const prefixPattern = /^\s*(?:第\s*)?(?:[一二三四五六七八九十百千万〇零两]+|\d+)\s*[、.．)）]\s*|^\s*[①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯⑰⑱⑲⑳]\s*/;
const labelSelector = "[data-tutorial-section-number]";

function toChineseNumber(value: number) {
  const digits = ["零", "一", "二", "三", "四", "五", "六", "七", "八", "九"];

  if (value <= 10) {
    return value === 10 ? "十" : digits[value];
  }

  if (value < 20) {
    return `十${digits[value % 10]}`;
  }

  const tens = Math.floor(value / 10);
  const ones = value % 10;
  return `${digits[tens]}十${ones === 0 ? "" : digits[ones]}`;
}

function stripLeadingPrefix(element: HTMLElement) {
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
  let node = walker.nextNode() as Text | null;

  while (node && node.textContent?.trim() === "") {
    node = walker.nextNode() as Text | null;
  }

  if (node?.textContent) {
    node.textContent = node.textContent.replace(prefixPattern, "");
  }
}

function numberHeadings() {
  const article = document.querySelector("article");
  if (!article) return;

  const headings = Array.from(article.querySelectorAll("h2")) as HTMLElement[];
  let changed = false;
  let n = 0;

  headings.forEach((heading) => {
    // 「参考资料」不纳入正文章节编号(见 CLAUDE.md);已存原始 HTML 时恢复,清掉历史残留编号
    if (isReferencesHeading(heading)) {
      if (heading.dataset.originalHtml) {
        heading.innerHTML = heading.dataset.originalHtml;
        delete heading.dataset.originalHtml;
        changed = true;
      }
      return;
    }

    n += 1;
    const expectedLabel = `${toChineseNumber(n)}、`;
    const existingLabel = heading.querySelector(labelSelector);
    if (existingLabel?.textContent === expectedLabel) return;

    if (heading.dataset.originalHtml) {
      heading.innerHTML = heading.dataset.originalHtml;
    } else {
      heading.dataset.originalHtml = heading.innerHTML;
    }

    stripLeadingPrefix(heading);

    const label = document.createElement("span");
    label.dataset.tutorialSectionNumber = "";
    label.className = "mr-1 text-emerald-700 dark:text-emerald-400";
    label.textContent = expectedLabel;
    heading.prepend(label);
    changed = true;
  });

  if (changed) {
    window.dispatchEvent(new Event("tutorial-section-numbers-ready"));
  }
}

function isReferencesHeading(heading: HTMLElement): boolean {
  const clone = heading.cloneNode(true) as HTMLElement;
  clone.querySelectorAll(labelSelector).forEach((el) => el.remove());
  return clone.textContent?.trim() === "参考资料";
}

export default function TutorialSectionNumbers() {
  const pathname = usePathname();

  useEffect(() => {
    let frame = 0;
    const scheduleNumbering = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(numberHeadings);
    };
    const observer = new MutationObserver(scheduleNumbering);

    observer.observe(document.body, { childList: true, subtree: true });
    scheduleNumbering();

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [pathname]);

  return null;
}
