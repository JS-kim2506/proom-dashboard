"use client";

import { useState } from "react";

// === 1. 로딩 메시지 ===
const LOADING_MESSAGES = [
  "🐼 푸바오가 대나무 먹는 중...",
  "🐼 푸바오가 굴러다니는 중...",
  "🐼 푸바오가 낮잠에서 깨어나는 중...",
  "🐼 푸바오가 사육사한테 안기는 중...",
  "🐼 푸바오가 눈 굴리는 중...",
  "🐼 푸바오가 미끄럼틀 타는 중...",
  "🐼 푸바오가 간식 기다리는 중...",
  "🐼 푸바오가 뒤뚱뒤뚱 걷는 중...",
  "🐼 아이바오가 푸바오 깨우는 중...",
  "🐼 푸바오가 나무 위에서 내려오는 중...",
];

export function getRandomLoadingMessage() {
  return LOADING_MESSAGES[Math.floor(Math.random() * LOADING_MESSAGES.length)];
}

// === 2. 빈 화면 안내 ===
const EMPTY_MESSAGES = [
  { emoji: "🐼", text: "푸바오가 데이터를 찾고 있어요... 아직 없나 봐요!" },
  { emoji: "🎋", text: "대나무숲은 비어있어요. 새로고침으로 데이터를 심어보세요!" },
  { emoji: "🐼", text: "푸바오: \"밥 줘...\" (데이터를 수집해주세요)" },
  { emoji: "🐾", text: "푸바오 발자국만 남아있어요. 데이터를 불러와볼까요?" },
];

export function FubaoEmptyState({ message }: { message?: string }) {
  const [msg] = useState(() => EMPTY_MESSAGES[Math.floor(Math.random() * EMPTY_MESSAGES.length)]);

  return (
    <div className="text-center py-16 select-none">
      <div className="text-5xl mb-4 animate-bounce">{msg.emoji}</div>
      <p className="text-sm text-gray-400 dark:text-slate-500">
        {message || msg.text}
      </p>
    </div>
  );
}

// === 3. 오른쪽 하단 푸바오 플로팅 버튼 ===
const FUBAO_QUOTES = [
  "오늘도 화이팅이다 바오! 🎋",
  "대나무 먹고 싶다... 🌿",
  "푸름아 안녕~ 👋",
  "놀아줘~ 심심해 🐾",
  "바오는 행복해! ✨",
  "간식 줘... 배고파 🍎",
  "오늘 뉴스 많다 바오! 📰",
  "뒤뚱뒤뚱~ 🐼",
  "아이바오 보고 싶다... 💕",
  "나무 올라갈 거야! 🌳",
];

// === 4. 점심 메뉴 추천 ===
const LUNCH_MENUS = [
  { menu: "김치찌개", desc: "역시 한국인은 김치찌개지!", emoji: "🍲" },
  { menu: "돈까스", desc: "바삭한 돈까스 어때요?", emoji: "🍛" },
  { menu: "초밥", desc: "오늘은 좀 특별하게!", emoji: "🍣" },
  { menu: "떡볶이", desc: "매콤달콤 분식 타임~", emoji: "🌶️" },
  { menu: "된장찌개", desc: "구수한 된장찌개 한 그릇!", emoji: "🥘" },
  { menu: "짜장면", desc: "중식의 정석!", emoji: "🍜" },
  { menu: "비빔밥", desc: "건강하게 비빔밥!", emoji: "🍚" },
  { menu: "칼국수", desc: "따뜻한 칼국수 어때요?", emoji: "🍲" },
  { menu: "햄버거", desc: "간단하게 버거 고?", emoji: "🍔" },
  { menu: "파스타", desc: "오늘은 양식 기분!", emoji: "🍝" },
  { menu: "쌀국수", desc: "베트남 쌀국수 어때?", emoji: "🍜" },
  { menu: "제육볶음", desc: "밥도둑 제육볶음!", emoji: "🥩" },
  { menu: "샐러드", desc: "가볍게 샐러드로!", emoji: "🥗" },
  { menu: "삼겹살", desc: "점심부터 고기 파티?!", emoji: "🥓" },
  { menu: "카레", desc: "든든한 카레 한 그릇!", emoji: "🍛" },
];

export function LunchRecommend() {
  const [open, setOpen] = useState(false);
  const [menu, setMenu] = useState<typeof LUNCH_MENUS[0] | null>(null);

  const handleClick = () => {
    if (!open) {
      setMenu(LUNCH_MENUS[Math.floor(Math.random() * LUNCH_MENUS.length)]);
    }
    setOpen(!open);
  };

  return (
    <div className="fixed top-4 right-4 lg:top-6 lg:right-6 z-50 flex flex-col items-end gap-2">
      {open && menu && (
        <div className="animate-fubao-appear bg-white dark:bg-slate-800 text-sm text-gray-700 dark:text-slate-200 px-4 py-3 rounded-2xl rounded-tr-sm shadow-lg border border-gray-200 dark:border-slate-700 max-w-[220px] mt-14 lg:mt-0">
          <p className="text-2xl mb-1">{menu.emoji}</p>
          <p className="font-bold text-base">{menu.menu}</p>
          <p className="text-xs text-gray-400 dark:text-slate-400 mt-1">{menu.desc}</p>
          <button
            onClick={(e) => { e.stopPropagation(); setMenu(LUNCH_MENUS[Math.floor(Math.random() * LUNCH_MENUS.length)]); }}
            className="mt-2 text-xs text-indigo-500 hover:text-indigo-400 font-medium"
          >
            🎲 다시 뽑기
          </button>
        </div>
      )}
      <button
        onClick={handleClick}
        className={`w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900 border-2 border-amber-300 dark:border-amber-600 shadow-md flex items-center justify-center text-xl hover:scale-110 active:scale-95 transition-transform ${open ? "ring-2 ring-amber-400 ring-offset-2 dark:ring-offset-slate-950" : ""}`}
        title="점심 뭐 먹지?"
      >
        🍽️
      </button>
    </div>
  );
}

export function FubaoFloating() {
  const [open, setOpen] = useState(false);
  const [quote, setQuote] = useState("");

  const handleClick = () => {
    if (!open) {
      setQuote(FUBAO_QUOTES[Math.floor(Math.random() * FUBAO_QUOTES.length)]);
    }
    setOpen(!open);
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2">
      {/* 말풍선 */}
      {open && (
        <div className="animate-fubao-appear bg-white dark:bg-slate-800 text-sm text-gray-700 dark:text-slate-200 px-4 py-3 rounded-2xl rounded-br-sm shadow-lg border border-gray-200 dark:border-slate-700 max-w-[200px]">
          <p>{quote}</p>
        </div>
      )}
      {/* 푸바오 버튼 */}
      <button
        onClick={handleClick}
        className={`w-14 h-14 rounded-full bg-green-100 dark:bg-green-900 border-2 border-green-300 dark:border-green-600 shadow-[0_4px_20px_rgba(34,197,94,0.3)] flex items-center justify-center text-3xl hover:scale-110 active:scale-95 transition-transform ${open ? "ring-2 ring-green-400 ring-offset-2 dark:ring-offset-slate-950" : ""}`}
        title="푸바오와 대화하기"
      >
        🐼
      </button>
    </div>
  );
}
