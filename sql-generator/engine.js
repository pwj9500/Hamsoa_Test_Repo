(function (global) {
  "use strict";

  function trim(s) { return (s || "").replace(/^\s+|\s+$/g, ""); }

  function isNumeric(v) {
    return /^-?\d+(\.\d+)?$/.test(trim(v));
  }

  function isYyyymmdd(v) {
    return /^\d{8}$/.test(trim(v));
  }

  function toLiteral(v) {
    v = trim(v);
    if (isNumeric(v)) return v;
    if (isYyyymmdd(v)) return "TO_DATE('" + v + "','YYYYMMDD')";
    return "'" + v.replace(/'/g, "''") + "'";
  }

  function extractLimit(text) {
    var m = text.match(/상위\s*(\d+)\s*(개|건|명|행)?/) ||
            text.match(/(\d+)\s*(개|건|명|행)\s*(만|까지)?/) ||
            text.match(/(\d+)\s*(개|건|명|행)/);
    if (m) return parseInt(m[1], 10);
    return null;
  }

  function extractOrder(text) {
    var descPat = /([가-힣A-Za-z0-9_]+)\s*(큰|많은|높은|최신|내림차순|역순|desc)/i;
    var ascPat = /([가-힣A-Za-z0-9_]+)\s*(작은|적은|낮은|오래된|오름차순|정순|asc)/i;
    var m;
    if ((m = text.match(descPat))) return { col: m[1], dir: "DESC" };
    if ((m = text.match(ascPat))) return { col: m[1], dir: "ASC" };
    var m2 = text.match(/([가-힣A-Za-z0-9_]+)\s*순(으로)?\s*(정렬)?/);
    if (m2 && !/역|내림/.test(text)) return { col: m2[1], dir: "ASC" };
    return null;
  }

  function extractAggregate(text) {
    if (/개수|건수|카운트|몇\s*(개|건|명)|count/i.test(text)) return { fn: "COUNT", expr: "*" };
    var sum = text.match(/([가-힣A-Za-z0-9_]+)\s*(의)?\s*(합계|총합|합|sum)/i);
    if (sum) return { fn: "SUM", expr: sum[1] };
    var avg = text.match(/([가-힣A-Za-z0-9_]+)\s*(의)?\s*(평균|avg)/i);
    if (avg) return { fn: "AVG", expr: avg[1] };
    var max = text.match(/([가-힣A-Za-z0-9_]+)\s*(의)?\s*(최대|최댓값|max)/i);
    if (max) return { fn: "MAX", expr: max[1] };
    var min = text.match(/([가-힣A-Za-z0-9_]+)\s*(의)?\s*(최소|최솟값|min)/i);
    if (min) return { fn: "MIN", expr: min[1] };
    return null;
  }

  function extractTable(text) {
    var m = text.match(/([가-힣A-Za-z0-9_]+)\s*테이블\s*에서/);
    if (m) return m[1];
    m = text.match(/([가-힣A-Za-z0-9_]+)\s*에서/);
    if (m) return m[1];
    return null;
  }

  function extractPeriod(text) {
    var ym = text.match(/(\d{4})\s*년\s*(\d{1,2})\s*월/);
    if (ym) {
      var y = ym[1];
      var mo = ("0" + ym[2]).slice(-2);
      var start = y + mo + "01";
      var nextMo = parseInt(ym[2], 10) + 1;
      var nextY = parseInt(y, 10);
      if (nextMo > 12) { nextMo = 1; nextY += 1; }
      var end = "" + nextY + ("0" + nextMo).slice(-2) + "01";
      return { start: start, end: end };
    }
    var yOnly = text.match(/(\d{4})\s*년(?!\s*\d)/);
    if (yOnly) {
      var yy = yOnly[1];
      return { start: yy + "0101", end: (parseInt(yy, 10) + 1) + "0101" };
    }
    return null;
  }

  function stripJosa(word) {
    return word.replace(/(으로|로|을|를|이|가|은|는|의|에|와|과)$/, "");
  }

  function extractConditions(text) {
    var conds = [];

    var likeStart = text.match(/([가-힣A-Za-z0-9_]+)\s+([가-힣A-Za-z0-9_]+?)(?:으로|로)\s*시작/);
    if (likeStart) conds.push({ col: stripJosa(likeStart[1]), op: "LIKE", val: "'" + likeStart[2] + "%'" });

    var likeEnd = text.match(/([가-힣A-Za-z0-9_]+)\s+([가-힣A-Za-z0-9_]+?)(?:으로|로)\s*끝/);
    if (likeEnd) conds.push({ col: stripJosa(likeEnd[1]), op: "LIKE", val: "'%" + likeEnd[2] + "'" });

    var likeMid = text.match(/([가-힣A-Za-z0-9_]+)\s+([가-힣A-Za-z0-9_]+?)(?:을|를)?\s*포함/);
    if (likeMid) conds.push({ col: stripJosa(likeMid[1]), op: "LIKE", val: "'%" + stripJosa(likeMid[2]) + "%'" });

    var gte = text.match(/([가-힣A-Za-z0-9_]+)\s+([0-9][0-9.]*)\s*(?:이상|보다 크거나 같)/);
    if (gte) conds.push({ col: stripJosa(gte[1]), op: ">=", val: toLiteral(gte[2]) });

    var lte = text.match(/([가-힣A-Za-z0-9_]+)\s+([0-9][0-9.]*)\s*(?:이하|보다 작거나 같)/);
    if (lte) conds.push({ col: stripJosa(lte[1]), op: "<=", val: toLiteral(lte[2]) });

    var gt = text.match(/([가-힣A-Za-z0-9_]+)\s+([0-9][0-9.]*)\s*(?:초과|보다 큰|보다 크)/);
    if (gt) conds.push({ col: stripJosa(gt[1]), op: ">", val: toLiteral(gt[2]) });

    var lt = text.match(/([가-힣A-Za-z0-9_]+)\s+([0-9][0-9.]*)\s*(?:미만|보다 작은|보다 작)/);
    if (lt) conds.push({ col: stripJosa(lt[1]), op: "<", val: toLiteral(lt[2]) });

    var alreadyMatched = conds.length > 0;

    var ne = text.match(/([가-힣A-Za-z0-9_]+)\s+([가-힣A-Za-z0-9_.]+?)(?:이|가)?\s*아닌/);
    if (ne) conds.push({ col: stripJosa(ne[1]), op: "<>", val: toLiteral(stripJosa(ne[2])) });

    if (!alreadyMatched) {
      var eq = text.match(/([가-힣A-Za-z0-9_]+)\s+([가-힣A-Za-z0-9_.]+?)\s*인(?!\s*경우)/);
      if (eq) conds.push({ col: stripJosa(eq[1]), op: "=", val: toLiteral(eq[2]) });
    }

    return conds;
  }

  function indent(lines, n) {
    var pad = new Array(n + 1).join(" ");
    return lines.map(function (l) { return pad + l; }).join("\n");
  }

  function convert(korean) {
    var text = trim(korean);
    var warnings = [];
    if (!text) {
      return { sql: "", warnings: ["입력이 비어 있습니다."], table: null };
    }

    var table = extractTable(text);
    if (!table) {
      warnings.push("테이블명을 찾지 못했습니다. \"OO 테이블에서\" 또는 \"OO에서\" 형태로 입력하세요. (임시로 <테이블>로 표기)");
      table = "<테이블>";
    }

    var agg = extractAggregate(text);
    var conds = extractConditions(text);
    var period = extractPeriod(text);
    var order = extractOrder(text);
    var limit = extractLimit(text);

    if (period) {
      var dateCol = "등록일";
      var dm = text.match(/([가-힣A-Za-z0-9_]*(일자|일시|날짜|등록일|생성일|기준일))/);
      if (dm) dateCol = dm[1];
      conds.push({ col: dateCol, op: ">=", val: "TO_DATE('" + period.start + "','YYYYMMDD')" });
      conds.push({ col: dateCol, op: "<", val: "TO_DATE('" + period.end + "','YYYYMMDD')" });
    }

    var seen = {};
    conds = conds.filter(function (c) {
      var k = c.col + "|" + c.op + "|" + c.val;
      if (seen[k]) return false;
      seen[k] = true;
      return true;
    });

    var selectExpr = "*";
    var groupByCol = null;
    if (agg) {
      var grp = text.match(/([가-힣A-Za-z0-9_]+)\s*별(로)?/);
      if (grp) {
        groupByCol = grp[1];
        selectExpr = groupByCol + ", " + agg.fn + "(" + agg.expr + ") AS " + (agg.fn.toLowerCase() + "_val");
      } else {
        selectExpr = agg.fn + "(" + agg.expr + ")" + (agg.fn === "COUNT" ? " AS cnt" : " AS " + agg.fn.toLowerCase() + "_val");
      }
    }

    var whereClause = "";
    if (conds.length) {
      whereClause = conds.map(function (c) {
        return c.col + " " + c.op + " " + c.val;
      }).join("\n  AND ");
    }

    var orderClause = order ? (order.col + " " + order.dir) : "";

    var sql;

    if (limit && !agg) {
      var inner = "SELECT * FROM " + table;
      if (whereClause) inner += "\n    WHERE " + whereClause.replace(/\n {2}AND /g, "\n      AND ");
      if (orderClause) inner += "\n    ORDER BY " + orderClause;
      else warnings.push("상위 N개인데 정렬 기준이 없습니다. ORDER BY 없이 ROWNUM만 적용되어 순서가 보장되지 않을 수 있습니다.");

      sql =
        "SELECT * FROM (\n" +
        "  SELECT A.*, ROWNUM AS RN FROM (\n" +
        indent(inner.split("\n"), 4) + "\n" +
        "  ) A WHERE ROWNUM <= " + limit + "\n" +
        ") WHERE RN >= 1;";
      return { sql: sql, warnings: warnings, table: table };
    }

    sql = "SELECT " + selectExpr + "\nFROM " + table;
    if (whereClause) sql += "\nWHERE " + whereClause;
    if (groupByCol) sql += "\nGROUP BY " + groupByCol;
    if (orderClause) sql += "\nORDER BY " + orderClause;
    sql += ";";

    return { sql: sql, warnings: warnings, table: table };
  }

  var api = { convert: convert, toLiteral: toLiteral };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  } else {
    global.SqlEngine = api;
  }
})(typeof window !== "undefined" ? window : this);
