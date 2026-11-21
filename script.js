(() => {
  const toggle = document.querySelector(".menu-toggle");
  const nav = document.querySelector("#site-nav");
  const year = document.querySelector("#year");

  if (year) year.textContent = new Date().getFullYear();

  if (toggle && nav) {
    const closeMenu = () => {
      toggle.setAttribute("aria-expanded", "false");
      nav.classList.remove("is-open");
    };

    toggle.addEventListener("click", () => {
      const isOpen = toggle.getAttribute("aria-expanded") === "true";
      toggle.setAttribute("aria-expanded", String(!isOpen));
      nav.classList.toggle("is-open", !isOpen);
    });

    nav.querySelectorAll("a").forEach((link) => link.addEventListener("click", closeMenu));
    document.addEventListener("keydown", (event) => { if (event.key === "Escape") closeMenu(); });
    window.addEventListener("resize", () => { if (window.innerWidth > 620) closeMenu(); });
  }

  const postsList = document.querySelector("#posts-list");
  const postsStatus = document.querySelector("#posts-status");
  if (!postsList || !postsStatus) return;

  const makeInlineContent = (parent, source) => {
    const pattern = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g;
    let lastIndex = 0;
    let match;
    while ((match = pattern.exec(source)) !== null) {
      if (match.index > lastIndex) parent.append(document.createTextNode(source.slice(lastIndex, match.index)));
      const token = match[0];
      const element = document.createElement(token.startsWith("**") ? "strong" : token.startsWith("*") ? "em" : "code");
      element.textContent = token.startsWith("**") ? token.slice(2, -2) : token.slice(1, -1);
      parent.append(element);
      lastIndex = pattern.lastIndex;
    }
    if (lastIndex < source.length) parent.append(document.createTextNode(source.slice(lastIndex)));
  };

  const renderMarkdown = (container, markdown) => {
    const lines = markdown.replace(/\r/g, "").split("\n");
    let paragraph = [];
    let list = null;
    const flushParagraph = () => {
      if (!paragraph.length) return;
      const p = document.createElement("p");
      makeInlineContent(p, paragraph.join(" "));
      container.append(p);
      paragraph = [];
    };
    const closeList = () => { if (list) { container.append(list); list = null; } };

    lines.forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed) { flushParagraph(); closeList(); return; }
      const heading = trimmed.match(/^(#{1,3})\s+(.+)$/);
      if (heading) {
        flushParagraph(); closeList();
        const h = document.createElement(heading[1].length === 1 ? "h2" : "h3");
        makeInlineContent(h, heading[2]); container.append(h); return;
      }
      if (/^---+$/.test(trimmed)) { flushParagraph(); closeList(); container.append(document.createElement("hr")); return; }
      const listItem = trimmed.match(/^[-*]\s+(.+)$/);
      if (listItem) {
        flushParagraph(); if (!list) list = document.createElement("ul");
        const li = document.createElement("li"); makeInlineContent(li, listItem[1]); list.append(li); return;
      }
      if (trimmed.startsWith("> ")) {
        flushParagraph(); closeList();
        const quote = document.createElement("blockquote"); makeInlineContent(quote, trimmed.slice(2)); container.append(quote); return;
      }
      closeList(); paragraph.push(trimmed);
    });
    flushParagraph(); closeList();
  };

  const formatDate = (dateText) => {
    const date = new Date(`${dateText}T12:00:00`);
    return Number.isNaN(date.getTime()) ? dateText : new Intl.DateTimeFormat("pl-PL", { day: "numeric", month: "long", year: "numeric" }).format(date);
  };

  const makePostCard = (post, index) => {
    const titleMatch = post.content.match(/^#\s+(.+)$/m);
    const title = titleMatch ? titleMatch[1].trim() : post.name.replace(/\.md$/i, "").replace(/[-_]/g, " ");
    const dateMatch = post.name.match(/^(\d{4}-\d{2}-\d{2})/);
    const date = dateMatch ? formatDate(dateMatch[1]) : "Wpis z dziennika";
    const excerpt = post.content.replace(/^#\s+.+$/m, "").split(/\n\s*\n/).map((part) => part.trim()).find((part) => part && !part.startsWith("#") && !part.startsWith("—")) || "Otwórz wpis i przeczytaj całą opowieść.";
    const summaryText = excerpt.replace(/\s+/g, " ").replace(/\*\*/g, "");
    const details = document.createElement("details");
    details.className = "thought-card post-card";
    const summary = document.createElement("summary");
    const number = document.createElement("span"); number.className = "card-number"; number.textContent = String(index + 1).padStart(2, "0");
    const symbol = document.createElement("span"); symbol.className = "card-symbol"; symbol.setAttribute("aria-hidden", "true"); symbol.textContent = "✧";
    const heading = document.createElement("h3"); heading.textContent = title;
    const description = document.createElement("p"); description.textContent = summaryText.length > 190 ? `${summaryText.slice(0, 187).trim()}…` : summaryText;
    const foot = document.createElement("span"); foot.className = "card-foot"; foot.textContent = date;
    summary.append(number, symbol, heading, description, foot);
    const body = document.createElement("div"); body.className = "post-body";
    body.append; 
    renderMarkdown(body, post.content.replace(/^#\s+.+\n?/, ""));
    details.append(summary, body);
    return details;
  };

  const loadPosts = async () => {
    try {
      const response = await fetch("posts-index.json", { cache: "no-store" });
      if (!response.ok) throw new Error(`Nie udało się pobrać indeksu dziennika (HTTP ${response.status})`);
      const data = await response.json();
      const posts = Array.isArray(data.posts) ? data.posts : [];
      if (!posts.length) { postsStatus.textContent = "Dziennik dopiero czeka na pierwsze wpisy. Wróć tu wkrótce."; return; }
      posts.sort((a, b) => b.name.localeCompare(a.name));
      posts.forEach((post, index) => postsList.append(makePostCard(post, index)));
      postsStatus.textContent = `W dzienniku jest ${posts.length} ${posts.length === 1 ? "wpis" : posts.length < 5 ? "wpisy" : "wpisów"}. Wybierz tytuł, aby rozwinąć opowieść.`;
    } catch (error) {
      console.error("Nie udało się wczytać dziennika Wilczka:", error);
      postsStatus.textContent = "Nie udało się teraz pobrać dziennika. Spróbuj odświeżyć stronę za chwilę.";
    }
  };
  loadPosts();
})();