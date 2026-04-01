export interface Member {
  name: string;
  primaryKeywords: string[];
  excludeKeywords: string[];
}

export interface Group {
  id: string;
  name: string;
  emoji: string;
  color: string;
  members: Member[];
  groupKeywords: string[];
  /** 수집된 기사가 이 그룹/멤버와 관련 있는지 검증할 때 쓰는 키워드. 하나라도 포함되어야 통과 */
  verifyKeywords: string[];
}

export const GROUPS: Group[] = [
  {
    id: "pisik",
    name: "피식대학",
    emoji: "\uD83C\uDF93",
    color: "#6366f1",
    groupKeywords: ["피식대학", "피식유니버시티"],
    verifyKeywords: ["피식", "피식대학", "피식유니버시티", "한사랑산악회", "B주류경제학"],
    members: [
      {
        name: "김민수",
        primaryKeywords: ["피식대학 김민수", "피식 김민수"],
        excludeKeywords: ["김민수 교수", "김민수 선수", "김민수 의원", "김민수 박사", "김민수 대표", "김민수 감독"],
      },
      {
        name: "정재형",
        primaryKeywords: ["피식대학 정재형", "피식 정재형"],
        excludeKeywords: ["정재형 가수", "정재형 음악", "정재형 피아니스트", "정재형 작곡"],
      },
      {
        name: "이용주",
        primaryKeywords: ["피식대학 이용주", "피식 이용주"],
        excludeKeywords: ["이용주 의원", "이용주 교수", "이용주 박사", "이용주 대표", "이용주 국회의원", "이용주 판사"],
      },
    ],
  },
  {
    id: "beautifulnerd",
    name: "뷰티풀너드",
    emoji: "\uD83E\uDD13",
    color: "#ec4899",
    groupKeywords: ["뷰티풀너드"],
    verifyKeywords: ["뷰티풀너드", "뷰티풀 너드"],
    members: [
      {
        name: "최제우",
        primaryKeywords: ["뷰티풀너드 최제우"],
        excludeKeywords: ["최제우 동학", "최제우 종교"],
      },
      {
        name: "전경민",
        primaryKeywords: ["뷰티풀너드 전경민"],
        excludeKeywords: [],
      },
      {
        name: "정희수",
        primaryKeywords: ["뷰티풀너드 정희수"],
        excludeKeywords: [],
      },
    ],
  },
  {
    id: "monnomz",
    name: "몬놈즈",
    emoji: "\uD83D\uDE08",
    color: "#f59e0b",
    groupKeywords: ["몬놈즈"],
    verifyKeywords: ["몬놈즈", "몬놈"],
    members: [
      {
        name: "이찬희",
        primaryKeywords: ["몬놈즈 이찬희"],
        excludeKeywords: [],
      },
      {
        name: "안상민",
        primaryKeywords: ["몬놈즈 안상민"],
        excludeKeywords: [],
      },
    ],
  },
];

export function getAllSearchKeywords(): { keyword: string; groupId: string; memberName?: string }[] {
  const keywords: { keyword: string; groupId: string; memberName?: string }[] = [];

  for (const group of GROUPS) {
    // 그룹 키워드로 검색
    for (const gk of group.groupKeywords) {
      keywords.push({ keyword: gk, groupId: group.id });
    }
    // 멤버 키워드로 검색 (그룹명 포함된 조합만)
    for (const member of group.members) {
      for (const pk of member.primaryKeywords) {
        keywords.push({ keyword: pk, groupId: group.id, memberName: member.name });
      }
    }
  }

  return keywords;
}

/**
 * 수집된 기사가 해당 그룹/멤버의 실제 기사인지 검증합니다.
 * 제목+스니펫에 그룹 관련 키워드가 최소 1개 포함되어야 통과.
 * 그룹 키워드로 검색한 결과(memberName 없음)는 그룹 키워드가 이미 있으므로 통과.
 */
export function isRelevantArticle(
  title: string,
  snippet: string | undefined,
  groupId: string,
  memberName?: string
): boolean {
  const group = GROUPS.find((g) => g.id === groupId);
  if (!group) return false;

  const titleLower = title.toLowerCase();
  const snippetLower = (snippet || "").toLowerCase();
  const text = `${titleLower} ${snippetLower}`;

  // 1) 제외 키워드 체크 (동명이인 등 필터링)
  if (memberName) {
    const member = group.members.find((m) => m.name === memberName);
    if (member) {
      for (const ek of member.excludeKeywords) {
        if (text.includes(ek.toLowerCase())) return false;
      }
    }
  }

  // 2) 그룹 전체 키워드 검색의 경우
  if (!memberName) {
    // 제목이나 스니펫에 그룹 인증 키워드가 있어야 함
    return group.verifyKeywords.some((vk) => text.includes(vk.toLowerCase()));
  }

  // 3) 멤버 검색의 경우
  // 3-1) 제목에 멤버 이름이 있으면 가중치 높음
  const hasMemberInTitle = titleLower.includes(memberName.toLowerCase());
  const hasMemberInSnippet = snippetLower.includes(memberName.toLowerCase());
  
  if (!hasMemberInTitle && !hasMemberInSnippet) return false;

  // 3-2) 그룹 인증 키워드가 반드시 하나는 있어야 함 (동명이인 방지 핵심)
  const hasGroupContext = group.verifyKeywords.some((vk) => text.includes(vk.toLowerCase()));
  if (!hasGroupContext) return false;

  return true;
}
