import { collectGoogleNews } from "../src/lib/collectors/googleNews";

async function test() {
  console.log("--- 구글 뉴스 수집 테스트 (이용주) ---");
  const items = await collectGoogleNews("피식대학 이용주", "pisik", "이용주");
  
  items.slice(0, 5).forEach(item => {
    console.log(`제목: ${item.title}`);
    console.log(`출처: ${item.source}`);
    console.log(`날짜: ${item.publishedAt}`);
    console.log(`링크: ${item.link.slice(0, 50)}...`);
    console.log("---");
  });
}

test();
