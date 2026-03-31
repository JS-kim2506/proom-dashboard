"use client";

import type { TrendTopic } from "@/lib/types";

interface Props {
  topics: TrendTopic[];
}

export default function TopTopics({ topics }: Props) {
  if (topics.length === 0) {
    return (
      <div className="text-center text-sm text-gray-400 dark:text-slate-500 py-12">
        트렌드 토픽 데이터가 없습니다.
      </div>
    );
  }

  return (
    <div className="grid gap-2">
      {topics.map((topic, i) => (
        <a
          key={i}
          href={topic.link}
          target="_blank"
          rel="noopener noreferrer"
          className="group flex items-center gap-3 bg-white dark:bg-slate-900 rounded-xl border border-gray-100 dark:border-slate-800 px-4 py-3 hover:border-gray-300 dark:hover:border-slate-600 hover:shadow-sm transition-all"
        >
          <span className={`text-base font-bold w-7 text-center ${
            i < 3 ? "text-indigo-500 dark:text-indigo-400" : "text-gray-300 dark:text-slate-600"
          }`}>
            {i + 1}
          </span>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-gray-900 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 truncate transition-colors">
              {topic.title}
            </div>
          </div>
          <div className="text-[11px] text-gray-400 dark:text-slate-500 flex-shrink-0">
            {new Date(topic.publishedAt).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}
          </div>
        </a>
      ))}
    </div>
  );
}
