(() => {
  "use strict";

  const config = window.JD_LANDING_CONFIG || {};
  const loginUrl = typeof config.appUrl === "string" ? config.appUrl.trim() : "";
  const leadEndpoint = typeof config.leadEndpoint === "string" ? config.leadEndpoint.trim() : "";

  document.querySelectorAll("[data-login-link]").forEach((link) => {
    link.href = loginUrl || "#";
    if (loginUrl) {
      link.target = "_blank";
      link.rel = "noopener";
    }
  });

  document.querySelectorAll("[data-current-year]").forEach((element) => {
    element.textContent = String(new Date().getFullYear());
  });

  const header = document.querySelector("[data-header]");
  const syncHeader = () => header?.classList.toggle("is-scrolled", window.scrollY > 12);
  syncHeader();
  window.addEventListener("scroll", syncHeader, { passive: true });

  const menuButton = document.querySelector("[data-menu-button]");
  const mobileNav = document.querySelector("[data-mobile-nav]");
  const closeMobileNav = () => {
    menuButton?.setAttribute("aria-expanded", "false");
    mobileNav?.classList.remove("is-open");
  };

  menuButton?.addEventListener("click", () => {
    const willOpen = menuButton.getAttribute("aria-expanded") !== "true";
    menuButton.setAttribute("aria-expanded", String(willOpen));
    mobileNav?.classList.toggle("is-open", willOpen);
  });

  mobileNav?.querySelectorAll("a, button").forEach((item) => {
    item.addEventListener("click", closeMobileNav);
  });

  const tabs = Array.from(document.querySelectorAll("[role='tab']"));
  const panels = Array.from(document.querySelectorAll("[role='tabpanel']"));

  const activateTab = (tab) => {
    const target = tab.dataset.tab;
    tabs.forEach((item) => {
      const selected = item === tab;
      item.setAttribute("aria-selected", String(selected));
      item.tabIndex = selected ? 0 : -1;
    });
    panels.forEach((panel) => {
      const selected = panel.dataset.panel === target;
      panel.hidden = !selected;
      panel.classList.toggle("is-active", selected);
    });
  };

  tabs.forEach((tab, index) => {
    tab.addEventListener("click", () => activateTab(tab));
    tab.addEventListener("keydown", (event) => {
      if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
      event.preventDefault();
      let nextIndex = index;
      if (event.key === "ArrowRight") nextIndex = (index + 1) % tabs.length;
      if (event.key === "ArrowLeft") nextIndex = (index - 1 + tabs.length) % tabs.length;
      if (event.key === "Home") nextIndex = 0;
      if (event.key === "End") nextIndex = tabs.length - 1;
      tabs[nextIndex].focus();
      activateTab(tabs[nextIndex]);
    });
  });

  const revealItems = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window) {
    const revealObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -35px" });
    revealItems.forEach((item) => revealObserver.observe(item));
  } else {
    revealItems.forEach((item) => item.classList.add("is-visible"));
  }

  const dialog = document.querySelector("[data-contact-dialog]");
  const leadForm = document.querySelector("[data-lead-form]");
  const formStatus = document.querySelector("[data-form-status]");
  const submitButton = document.querySelector("[data-submit-lead]");
  let pendingRequestId = "";
  let pendingTimer = 0;

  const setFormStatus = (message, type = "") => {
    if (!formStatus) return;
    formStatus.textContent = message;
    formStatus.classList.toggle("is-error", type === "error");
    formStatus.classList.toggle("is-success", type === "success");
  };

  const openContact = () => {
    closeMobileNav();
    setFormStatus("");
    if (dialog?.showModal) {
      dialog.showModal();
      document.body.classList.add("dialog-open");
      window.setTimeout(() => dialog.querySelector("select, input")?.focus(), 40);
    }
  };

  const closeContact = () => {
    dialog?.close();
    document.body.classList.remove("dialog-open");
  };

  document.querySelectorAll("[data-open-contact]").forEach((button) => {
    button.addEventListener("click", openContact);
  });

  document.querySelector("[data-close-contact]")?.addEventListener("click", closeContact);

  dialog?.addEventListener("click", (event) => {
    const bounds = dialog.getBoundingClientRect();
    const outside = event.clientX < bounds.left || event.clientX > bounds.right ||
      event.clientY < bounds.top || event.clientY > bounds.bottom;
    if (outside) closeContact();
  });

  dialog?.addEventListener("close", () => document.body.classList.remove("dialog-open"));

  const finishSubmission = (message, type) => {
    window.clearTimeout(pendingTimer);
    pendingRequestId = "";
    submitButton.disabled = false;
    submitButton.textContent = "ส่งข้อมูล";
    setFormStatus(message, type);
  };

  const createRequestId = () => {
    if (window.crypto?.randomUUID) return window.crypto.randomUUID();
    return `lead-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  };

  const getSubmissionFrame = () => {
    let frame = document.querySelector("[data-lead-frame]");
    if (frame) return frame;
    frame = document.createElement("iframe");
    frame.name = "jd-lead-submission-frame";
    frame.title = "ผลการส่งแบบฟอร์มติดต่อ";
    frame.hidden = true;
    frame.dataset.leadFrame = "";
    document.body.appendChild(frame);
    return frame;
  };

  window.addEventListener("message", (event) => {
    const result = event.data;
    if (!result || result.type !== "JD_LEAD_RESULT" || result.requestId !== pendingRequestId) return;

    if (result.success) {
      leadForm.reset();
      finishSubmission("ส่งข้อมูลเรียบร้อยแล้ว ผู้ดูแลระบบจะติดต่อกลับ", "success");
      window.setTimeout(closeContact, 1800);
      return;
    }

    finishSubmission(result.message || "ส่งข้อมูลไม่สำเร็จ กรุณารอสักครู่แล้วลองใหม่", "error");
  });

  leadForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    setFormStatus("");

    if (!leadForm.checkValidity()) {
      leadForm.reportValidity();
      setFormStatus("กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน", "error");
      return;
    }

    const trap = leadForm.elements.namedItem("company_website");
    if (trap && trap.value) {
      setFormStatus("ส่งข้อมูลเรียบร้อยแล้ว", "success");
      leadForm.reset();
      return;
    }

    if (!/^https:\/\/script\.google\.com\/macros\/s\/[a-zA-Z0-9_-]+\/exec$/.test(leadEndpoint)) {
      setFormStatus("แบบฟอร์มยังอยู่ระหว่างเชื่อมระบบรับข้อมูล กรุณาลองอีกครั้งภายหลัง", "error");
      return;
    }

    const frame = getSubmissionFrame();
    pendingRequestId = createRequestId();
    leadForm.elements.namedItem("request_id").value = pendingRequestId;
    leadForm.elements.namedItem("page_url").value = window.location.href;
    leadForm.elements.namedItem("user_agent").value = navigator.userAgent;
    leadForm.action = leadEndpoint;
    leadForm.method = "POST";
    leadForm.target = frame.name;
    leadForm.enctype = "application/x-www-form-urlencoded";

    submitButton.disabled = true;
    submitButton.textContent = "กำลังส่ง...";
    pendingTimer = window.setTimeout(() => {
      finishSubmission("การส่งข้อมูลใช้เวลานานกว่าปกติ กรุณาลองใหม่อีกครั้ง", "error");
    }, 25000);

    leadForm.submit();
  });
})();
