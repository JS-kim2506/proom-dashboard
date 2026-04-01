"use client";

import { useState, useEffect, useCallback } from "react";

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

// === 3. 클릭 이스터에그 (헤더 로고를 여러번 클릭) ===
export function FubaoClickEgg({ children }: { children: React.ReactNode }) {
  const [clicks, setClicks] = useState(0);
  const [showPanda, setShowPanda] = useState(false);
  const [pandaPos, setPandaPos] = useState({ x: 0, y: 0 });

  const handleClick = useCallback(() => {
    setClicks((prev) => {
      const next = prev + 1;
      if (next >= 7) {
        setShowPanda(true);
        setPandaPos({
          x: Math.random() * 60 + 20,
          y: Math.random() * 40 + 30,
        });
        setTimeout(() => setShowPanda(false), 3000);
        return 0;
      }
      return next;
    });
  }, []);

  // 클릭 카운트 리셋 (3초 이내에 연속 클릭해야 함)
  useEffect(() => {
    if (clicks > 0 && clicks < 7) {
      const timer = setTimeout(() => setClicks(0), 3000);
      return () => clearTimeout(timer);
    }
  }, [clicks]);

  return (
    <>
      <div onClick={handleClick} className="cursor-pointer">
        {children}
      </div>
      {showPanda && (
        <div
          className="fixed z-[9999] pointer-events-none animate-fubao-appear"
          style={{ left: `${pandaPos.x}%`, top: `${pandaPos.y}%` }}
        >
          <div className="relative">
            <div className="text-6xl animate-bounce">🐼</div>
            <div className="absolute -top-10 left-1/2 -translate-x-1/2 whitespace-nowrap bg-white dark:bg-slate-800 text-xs font-medium text-gray-700 dark:text-slate-200 px-3 py-1.5 rounded-full shadow-lg border border-gray-200 dark:border-slate-700">
              {["바오는 행복해! 🎋", "대나무 줘! 🌿", "안녕 푸름! 👋", "놀아줘~ 🐾"][Math.floor(Math.random() * 4)]}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
