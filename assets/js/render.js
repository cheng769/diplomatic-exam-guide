async function loadJSON(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`無法載入 ${path}`);
  return res.json();
}

function el(tag, opts = {}, children = []) {
  const node = document.createElement(tag);
  if (opts.class) node.className = opts.class;
  if (opts.text) node.textContent = opts.text;
  if (opts.html) node.innerHTML = opts.html;
  children.forEach((c) => c && node.appendChild(c));
  return node;
}

function renderSourceList(sources) {
  const ul = el("ul", { class: "source-list" });
  sources.forEach((s) => {
    const li = el("li");
    const a = el("a", { text: `來源：${s.title}` });
    a.href = s.url;
    a.target = "_blank";
    a.rel = "noopener";
    li.appendChild(a);
    ul.appendChild(li);
  });
  return ul;
}

async function renderExamSubjects() {
  const mount = document.getElementById("exam-subjects-mount");
  if (!mount) return;
  const data = await loadJSON("data/exam-subjects.json");

  mount.appendChild(
    el("div", {
      class: "notice",
      html: `本頁考科資訊查核日期：${data.retrieved_date}。考科每年可能微調，正式報考前請務必核對考選部官方簡章：` +
        data.primary_sources.map((s) => `<a href="${s.url}" target="_blank" rel="noopener">${s.title}</a>`).join("、"),
    })
  );

  data.categories.forEach((cat) => {
    const card = el("div", { class: "card" });
    card.appendChild(el("h3", { text: cat.name }));
    if (cat.note) card.appendChild(el("div", { class: "meta", text: cat.note }));

    const table = el("table", { class: "subject-table" });
    const rows = [
      ["共同科目", cat.common_subjects.map((s) => s.name + (s.detail ? `（${s.detail}）` : "")).join("、")],
      ["專業科目", cat.professional_subjects.map((s) => s.name + (s.weight ? `（${s.weight}）` : "")).join("、")],
      ["第二試", cat.second_stage],
      ["成績計算", cat.score_composition],
    ];
    rows.forEach(([th, td]) => {
      const tr = el("tr");
      tr.appendChild(el("th", { text: th }));
      tr.appendChild(el("td", { text: td }));
      table.appendChild(tr);
    });
    card.appendChild(table);
    card.appendChild(renderSourceList(cat.sources));
    mount.appendChild(card);
  });
}

function evidenceTag(level) {
  if (level === "syllabus+review") return el("span", { class: "tag review", text: "課程大綱＋公開評價" });
  if (level === "syllabus+review_partial_match") return el("span", { class: "tag partial", text: "評價來源部分對應，待查證" });
  if (level === "syllabus_only_partial_match") return el("span", { class: "tag partial", text: "僅課程大綱，主題部分吻合" });
  if (level === "department_description") return el("span", { class: "tag syllabus", text: "系所官方課程介紹，尚無公開評價" });
  return el("span", { class: "tag syllabus", text: "僅課程大綱，尚無公開評價" });
}

async function renderCourseMapping() {
  const mount = document.getElementById("course-mapping-mount");
  const filterBar = document.getElementById("subject-filter-bar");
  if (!mount) return;
  const [examData, courseData] = await Promise.all([
    loadJSON("data/exam-subjects.json"),
    loadJSON("data/courses.json"),
  ]);

  const allSubjects = new Set();
  courseData.courses.forEach((c) => c.related_subjects.forEach((s) => allSubjects.add(s)));

  let activeSubject = "all";

  function draw() {
    mount.innerHTML = "";
    const courses = courseData.courses.filter(
      (c) => activeSubject === "all" || c.related_subjects.includes(activeSubject)
    );
    if (courses.length === 0) {
      mount.appendChild(el("p", { text: "此考科目前尚無對照課程資料。" }));
      return;
    }
    courses.forEach((c) => {
      const card = el("div", { class: "card" });
      card.appendChild(el("h3", { text: c.course }));
      card.appendChild(evidenceTag(c.evidence_level));
      card.appendChild(el("div", { class: "meta", text: `參考開課紀錄：${c.instructor_example}` }));

      const chipWrap = el("div");
      c.related_subjects.forEach((s) => chipWrap.appendChild(el("span", { class: "subject-chip", text: s })));
      card.appendChild(chipWrap);

      const reasonList = el("ul", { class: "reason-list" });
      c.reasons.forEach((r) => {
        reasonList.appendChild(el("li", { text: r.text }));
      });
      card.appendChild(reasonList);
      mount.appendChild(card);
    });
  }

  if (filterBar) {
    filterBar.innerHTML = "";
    const makeBtn = (label, value) => {
      const btn = el("button", { text: label });
      if (value === activeSubject) btn.classList.add("active");
      btn.addEventListener("click", () => {
        activeSubject = value;
        filterBar.querySelectorAll("button").forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        draw();
      });
      return btn;
    };
    filterBar.appendChild(makeBtn("全部考科", "all"));
    [...allSubjects].forEach((s) => filterBar.appendChild(makeBtn(s, s)));
  }

  draw();
}

document.addEventListener("DOMContentLoaded", () => {
  renderExamSubjects();
  renderCourseMapping();
});
