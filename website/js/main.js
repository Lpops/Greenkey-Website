/* GREENKEY AFRICA: shared interactions */
(function () {
  // Opt in to the scroll-reveal styles only once JS is confirmed running.
  document.documentElement.classList.add("js");

  // Sticky nav
  const nav = document.querySelector(".nav");
  const onScroll = () => nav.classList.toggle("scrolled", window.scrollY > 40);
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  // Mobile menu
  const toggle = document.querySelector(".nav__toggle");
  const links = document.querySelector(".nav__links");
  if (toggle && links) {
    toggle.addEventListener("click", () => {
      links.classList.toggle("open");
      toggle.setAttribute("aria-expanded", links.classList.contains("open"));
    });
    links.querySelectorAll("a").forEach((a) =>
      a.addEventListener("click", () => links.classList.remove("open"))
    );
  }

  // Scroll reveal
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add("visible");
          observer.unobserve(e.target);
        }
      });
    },
    { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
  );
  document.querySelectorAll(".reveal").forEach((el) => observer.observe(el));

  // Advisor filters
  const chips = document.querySelectorAll(".advisor-filters .chip");
  const advisors = document.querySelectorAll(".advisor-grid .advisor");
  chips.forEach((chip) => {
    chip.addEventListener("click", () => {
      chips.forEach((c) => c.classList.remove("active"));
      chip.classList.add("active");
      const filter = chip.dataset.filter;
      advisors.forEach((card) => {
        const match = filter === "all" || card.dataset.sector === filter;
        card.classList.toggle("hidden", !match);
      });
    });
  });

  // Advisor bio modals
  const modal = document.getElementById("advisor-modal");
  if (modal) {
    const panelName = modal.querySelector("[data-modal-name]");
    const panelRole = modal.querySelector("[data-modal-role]");
    const panelBio = modal.querySelector("[data-modal-bio]");
    const panelInitials = modal.querySelector("[data-modal-initials]");
    const openModal = (card) => {
      panelName.textContent = card.dataset.name;
      panelRole.textContent = card.dataset.role;
      panelBio.textContent = card.dataset.bio;
      panelInitials.textContent = card.dataset.initials;
      modal.classList.add("open");
      document.body.style.overflow = "hidden";
    };
    const closeModal = () => {
      modal.classList.remove("open");
      document.body.style.overflow = "";
    };
    document.querySelectorAll(".advisor[data-name]").forEach((card) =>
      card.addEventListener("click", () => openModal(card))
    );
    modal.querySelector(".modal__backdrop").addEventListener("click", closeModal);
    modal.querySelector(".modal__close").addEventListener("click", closeModal);
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeModal();
    });
  }

  // Contact forms: posted to the /api/contact serverless function.
  document.querySelectorAll("form[data-contact]").forEach((form) => {
    const btn = form.querySelector("button[type=submit]");
    const status = form.querySelector(".form-status");
    const original = btn.textContent;

    const say = (message, state) => {
      if (!status) return;
      status.textContent = message;
      status.dataset.state = state || "";
    };

    form.addEventListener("submit", async (e) => {
      e.preventDefault();

      if (!form.checkValidity()) {
        form.reportValidity();
        return;
      }

      const data = { form: form.dataset.contact };
      new FormData(form).forEach((value, key) => {
        if (key in data && key !== "form") {
          data[key] = [].concat(data[key], value);
        } else {
          data[key] = value;
        }
      });

      btn.disabled = true;
      btn.textContent = "Sending…";
      say("", "");

      try {
        const res = await fetch("/api/contact", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
        const body = await res.json().catch(() => ({}));

        if (res.ok && body.ok) {
          form.reset();
          btn.textContent = original;
          say("Thank you. We'll be in touch within two working days.", "ok");
        } else {
          btn.textContent = original;
          say(
            body.error || "Something went wrong. Please email naheed.popat@greenkeyafrica.com.",
            "error"
          );
        }
      } catch (err) {
        btn.textContent = original;
        say(
          "Couldn't reach the server. Please email naheed.popat@greenkeyafrica.com.",
          "error"
        );
      } finally {
        btn.disabled = false;
      }
    });
  });
})();
