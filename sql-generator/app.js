(function () {
  "use strict";

  var input = document.getElementById("input");
  var output = document.getElementById("output");
  var warnings = document.getElementById("warnings");
  var toast = document.getElementById("toast");

  var EXAMPLES = [
    "환자 테이블에서 이름이 김으로 시작하는 사람 조회",
    "매출 테이블에서 2026년 1월 데이터를 금액 큰 순으로 상위 10개",
    "직원 테이블에서 나이가 30 이상인 사람",
    "매출 테이블에서 고객별 금액 합계",
    "주문 테이블에서 이메일이 gmail을 포함하는 주문",
    "회원 테이블에서 개수 조회"
  ];

  var WARN_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>';
  var ARROW_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>';

  function render() {
    var result = SqlEngine.convert(input.value);

    if (!result.sql) {
      output.textContent = "여기에 SQL이 표시됩니다.";
      output.classList.add("empty");
    } else {
      output.textContent = result.sql;
      output.classList.remove("empty");
    }

    warnings.innerHTML = "";
    (result.warnings || []).forEach(function (w) {
      var div = document.createElement("div");
      div.className = "warning";
      div.innerHTML = WARN_ICON + "<span></span>";
      div.querySelector("span").textContent = w;
      warnings.appendChild(div);
    });
  }

  function showToast() {
    toast.classList.add("show");
    setTimeout(function () { toast.classList.remove("show"); }, 2000);
  }

  function copyOutput() {
    if (output.classList.contains("empty")) return;
    var text = output.textContent;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(showToast, fallbackCopy.bind(null, text));
    } else {
      fallbackCopy(text);
    }
  }

  function copyWithExecCommand() {
    return document.execCommand("copy");
  }

  function fallbackCopy(text) {
    var ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    var copied = false;
    try {
      copied = copyWithExecCommand();
    } catch (e) {
      copied = false;
    }
    document.body.removeChild(ta);
    if (copied) showToast();
  }

  function buildExamples() {
    var list = document.getElementById("examples");
    EXAMPLES.forEach(function (ex) {
      var li = document.createElement("li");
      var btn = document.createElement("button");
      btn.className = "example-btn";
      btn.type = "button";
      btn.innerHTML = ARROW_ICON + "<span></span>";
      btn.querySelector("span").textContent = ex;
      btn.addEventListener("click", function () {
        input.value = ex;
        render();
        input.focus();
      });
      li.appendChild(btn);
      list.appendChild(li);
    });
  }

  document.getElementById("run").addEventListener("click", render);
  document.getElementById("copy").addEventListener("click", copyOutput);
  document.getElementById("clear").addEventListener("click", function () {
    input.value = "";
    render();
    input.focus();
  });
  input.addEventListener("keydown", function (e) {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") { render(); }
  });

  buildExamples();
})();
