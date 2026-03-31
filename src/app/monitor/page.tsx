"use client";

import { useState, useEffect, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { GROUPS } from "@/lib/keywords";
import type { CollectedItem } from "@/lib/types";
import NewsCard from "@/components/NewsCard";

type SourceFilter = "all" | "news" | "community" | "youtube" | "blog";

export default function MonitorPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-96 text-gray-400 dark:text-slate-500">로딩 중...</div>}>
      <MonitorContent />
    </Suspense>
  );
}

function MonitorContent() {
  const searchParams = useSearchParams();
  const initialGroup = searchParams.get("group") || "all";

  const [items, setItems] = useState<CollectedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGroup, setSelectedGroup] = useState(initialGroup);
  const [selectedMember, setSelectedMember] = useState<string | null>(null);
  const [selectedSource, setSelectedSource] = useState<SourceFilter>("all");
  const [searchKeyword, setSearchKeyword] = useState("");

  useEffect(() => {
    fetch("/api/data?type=latest")
      .then((r) => r.json())
      .then((data) => setItems(data.items || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    setSelectedGroup(searchParams.get("group") || "all");
    setSelectedMember(null);
  }, [searchParams]);

  const currentGroup = GROUPS.find((g) => g.id === selectedGroup);
  const allMembers = useMemo(() => {
    if (selectedGroup === "all") {
      return GROUPS.flatMap((g) => g.members.map((m) => ({ ...m, groupId: g.id, groupName: g.name })));
    }
    const group = GROUPS.find((g) => g.id === selectedGroup);
    return group ? group.members.map((m) => ({ ...m, groupId: group.id, groupName: group.name })) : [];
  }, [selectedGroup]);

  const filteredItems = useMemo(() => {
    let result = [...items];

    // 그룹 필터
    if (selectedGroup !== "all") {
      result = result.filter((i) => i.groupId === selectedGroup);
    }

    // 멤버 필터
    if (selectedMember) {
      result = result.filter((i) => i.memberName === selectedMember);
    }

    // 소스 필터
    if (selectedSource !== "all") {
      result = result.filter((i) => i.sourceType === selectedSource);
    }

    // 키워드 검색
    if (searchKeyword.trim()) {
      const kw = searchKeyword.toLowerCase();
      result = result.filter(
        (i) =>
          i.title.toLowerCase().includes(kw) ||
          (i.snippet && i.snippet.toLowerCase().includes(kw)) ||
          (i.memberName && i.memberName.includes(kw))
      );
    }

    // 시간순 정렬
    result.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());

    return result;
  }, [items, selectedGroup, selectedMember, selectedSource, searchKeyword]);

  const sourceCount = useMemo(() => {
    const base = selectedGroup === "all" ? items : items.filter((i) => i.groupId === selectedGroup);
    return {
      all: base.length,
      news: base.filter((i) => i.sourceType === "news").length,
      community: base.filter((i) => i.sourceType === "community").length,
      youtube: base.filter((i) => i.sourceType === "youtube").length,
      blog: base.filter((i) => i.sourceType === "blog").length,
    };
  }, [items, selectedGroup]);

  if (loading) {
    return <div className="flex items-center justify-center h-96 text-gray-400 dark:text-slate-500">로딩 중...</div>;
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-5">
      {/* 헤더 */}
      <div>
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">
          {currentGroup ? `${currentGroup.emoji} ${currentGroup.name}` : "📊 전체"} 모니터링
        </h1>
        <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">
          그룹 · 멤버 · 키워드로 필터링 | 시간순 정렬
        </p>
      </div>

      {/* 필터 영역 */}
      <div className="space-y-3 bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-xl p-4">
        {/* 그룹 선택 */}
        <div>
          <label className="text-[10px] font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wider mb-1.5 block">그룹</label>
          <div className="flex gap-1.5 flex-wrap">
            <button
              onClick={() => { setSelectedGroup("all"); setSelectedMember(null); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                selectedGroup === "all"
                  ? "bg-indigo-600 text-white"
                  : "bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-700"
              }`}
            >
              전체
            </button>
            {GROUPS.map((g) => (
              <button
                key={g.id}
                onClick={() => { setSelectedGroup(g.id); setSelectedMember(null); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  selectedGroup === g.id
                    ? "text-white"
                    : "bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-700"
                }`}
                style={selectedGroup === g.id ? { backgroundColor: g.color } : {}}
              >
                {g.emoji} {g.name}
              </button>
            ))}
          </div>
        </div>

        {/* 멤버 선택 */}
        <div>
          <label className="text-[10px] font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wider mb-1.5 block">멤버</label>
          <div className="flex gap-1.5 flex-wrap">
            <button
              onClick={() => setSelectedMember(null)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                selectedMember === null
                  ? "bg-indigo-600 text-white"
                  : "bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-700"
              }`}
            >
              전체
            </button>
            {allMembers.map((m) => {
              const count = items.filter((i) => i.memberName === m.name && (selectedGroup === "all" || i.groupId === m.groupId)).length;
              return (
                <button
                  key={`${m.groupId}-${m.name}`}
                  onClick={() => setSelectedMember(m.name)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    selectedMember === m.name
                      ? "bg-indigo-600 text-white"
                      : "bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-700"
                  }`}
                >
                  {m.name} <span className="opacity-60">({count})</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 소스 필터 */}
        <div>
          <label className="text-[10px] font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wider mb-1.5 block">소스</label>
          <div className="flex gap-1.5 flex-wrap">
            {(["all", "news", "community", "youtube", "blog"] as SourceFilter[]).map((src) => {
              const labels: Record<string, string> = { all: "전체", news: "📰 뉴스", community: "💬 커뮤니티", youtube: "📺 YouTube", blog: "📝 블로그" };
              return (
                <button
                  key={src}
                  onClick={() => setSelectedSource(src)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    selectedSource === src
                      ? "bg-indigo-600 text-white"
                      : "bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-700"
                  }`}
                >
                  {labels[src]} <span className="opacity-60">({sourceCount[src]})</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 키워드 검색 */}
        <div>
          <label className="text-[10px] font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wider mb-1.5 block">키워드 검색</label>
          <input
            type="text"
            placeholder="제목, 내용, 멤버 이름으로 검색..."
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            className="w-full px-3 py-2 rounded-lg text-sm bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-900 dark:text-slate-100 placeholder:text-gray-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
          />
        </div>
      </div>

      {/* 결과 카운트 */}
      <div className="text-xs text-gray-500 dark:text-slate-400">
        검색 결과: <strong className="text-gray-700 dark:text-slate-200">{filteredItems.length}</strong>건
        {searchKeyword && <span className="ml-2">&#34;{searchKeyword}&#34; 검색 중</span>}
      </div>

      {/* 결과 리스트 (시간순) */}
      <div className="space-y-2">
        {filteredItems.map((item) => (
          <NewsCard key={item.id} item={item} />
        ))}
        {filteredItems.length === 0 && (
          <div className="text-center text-sm text-gray-400 dark:text-slate-500 py-12">
            해당 조건에 맞는 데이터가 없습니다.
          </div>
        )}
      </div>
    </div>
  );
}
