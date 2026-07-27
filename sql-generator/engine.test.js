var engine = require("./engine.js");

var cases = [
  {
    input: "환자 테이블에서 이름이 김으로 시작하는 사람 조회",
    expect: ["FROM 환자", "이름 LIKE '김%'"]
  },
  {
    input: "고객에서 상태가 1인 데이터 조회",
    expect: ["FROM 고객", "상태 = 1"]
  },
  {
    input: "직원 테이블에서 나이가 30 이상인 사람",
    expect: ["FROM 직원", "나이 >= 30"]
  },
  {
    input: "상품 테이블에서 가격이 10000 미만인 상품",
    expect: ["FROM 상품", "가격 < 10000"]
  },
  {
    input: "매출 테이블에서 2026년 1월 데이터를 금액 큰 순으로 상위 10개",
    expect: ["ROWNUM <= 10", "ORDER BY 금액 DESC", "TO_DATE('20260101','YYYYMMDD')", "TO_DATE('20260201','YYYYMMDD')", "RN >= 1"]
  },
  {
    input: "회원 테이블에서 개수 조회",
    expect: ["COUNT(*) AS cnt", "FROM 회원"]
  },
  {
    input: "매출 테이블에서 고객별 금액 합계",
    expect: ["SUM(금액)", "GROUP BY 고객", "FROM 매출"]
  },
  {
    input: "주문 테이블에서 이메일이 gmail을 포함하는 주문",
    expect: ["이메일 LIKE '%gmail%'", "FROM 주문"]
  },
  {
    input: "제품 테이블에서 이름이 폰으로 끝나는 제품",
    expect: ["이름 LIKE '%폰'", "FROM 제품"]
  },
  {
    input: "직원 테이블에서 급여 평균",
    expect: ["AVG(급여)", "FROM 직원"]
  }
];

var mustNotContain = ["FETCH FIRST", "OFFSET"];

var passed = 0;
var failed = 0;

cases.forEach(function (c, i) {
  var result = engine.convert(c.input);
  var sql = result.sql;
  var ok = true;
  var reasons = [];

  c.expect.forEach(function (frag) {
    if (sql.indexOf(frag) === -1) {
      ok = false;
      reasons.push("누락: " + frag);
    }
  });
  mustNotContain.forEach(function (frag) {
    if (sql.indexOf(frag) !== -1) {
      ok = false;
      reasons.push("금지문법 포함: " + frag);
    }
  });

  if (ok) {
    passed++;
    console.log("[PASS] #" + (i + 1) + " " + c.input);
  } else {
    failed++;
    console.log("[FAIL] #" + (i + 1) + " " + c.input);
    console.log("  이유: " + reasons.join(", "));
    console.log("  생성된 SQL:\n" + sql.split("\n").map(function (l) { return "    " + l; }).join("\n"));
  }
});

console.log("\n결과: " + passed + " passed, " + failed + " failed (총 " + cases.length + ")");
process.exit(failed === 0 ? 0 : 1);
