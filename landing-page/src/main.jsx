import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { fallback } from "./content";
import "./style.css";

function Comparison({ item, index, total, labels }) {
  const [value, setValue] = useState(50);
  return (
    <article className="result-card">
      <div className="result-top">
        <span>{item.label}</span>
        <span dir="ltr">{String(index + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}</span>
      </div>
      <div className="comparison" style={{ "--split": `${value}%` }} dir="ltr">
        <img src={item.after} alt={`${labels.after} — ${item.label}`} loading="lazy" />
        <img
          className="before"
          src={item.before}
          alt={`${labels.before} — ${item.label}`}
          loading="lazy"
        />
        <span className="badge after-label">{labels.after}</span>
        <span className="badge before-label">{labels.before}</span>
        <div className="divider">
          <span>↔</span>
        </div>
        <input
          type="range"
          min="0"
          max="100"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          aria-label={`المقارنة بين قبل وبعد: ${item.label}`}
        />
      </div>
      <div className="result-bottom">
        <div>
          <small>{labels.coaching}</small>
          <strong>{labels.coach}</strong>
        </div>
        <span>↔ &nbsp; {labels.drag}</span>
      </div>
    </article>
  );
}
// Merge only fields matching the local public-content shape; incomplete responses
// retain the approved fallback instead of breaking the page.
function mergeContent(base, incoming) {
  if (Array.isArray(base)) {
    if (!Array.isArray(incoming)) return base;
    if (base.length === 0) return incoming;
    return incoming.every(item => {
      const template = base[0];
      if (Array.isArray(template)) return Array.isArray(item) && item.length >= template.length && item.every(value => typeof value === "string");
      if (template && typeof template === "object") return item && typeof item === "object" && Object.keys(template).every(key => template[key] == null || typeof item[key] === typeof template[key]);
      return typeof item === typeof template;
    }) ? incoming : base;
  }
  if (base && typeof base === "object") {
    if (!incoming || typeof incoming !== "object" || Array.isArray(incoming)) return base;
    return Object.fromEntries(Object.keys(base).map(key => [key, mergeContent(base[key], incoming[key])]));
  }
  return typeof incoming === typeof base ? incoming : base;
}
function FAQItem({ item }) {
  const [open, setOpen] = useState(false);
  return <div className="faq-item">
    <button type="button" className="faq-toggle" aria-expanded={open} onClick={() => setOpen(!open)}>
      {item.question}<span aria-hidden="true">{open ? "−" : "+"}</span>
    </button>
    <div className={`faq-answer${open ? " is-open" : ""}`} aria-hidden={!open}>
      <div><p>{item.answer}</p></div>
    </div>
  </div>;
}
function App() {
  const [data, setData] = useState(fallback),
    [selected, setSelected] = useState(0);
  const revealed = useRef(new WeakSet());
  useEffect(() => {
    // Only a complete, explicitly published payload is eligible to replace the local fallback.
    fetch("/api/public/site")
      .then((r) => {
        if (!r.ok) throw Error();
        return r.json();
      })
      .then((payload) => {
        if (
          payload?.published === true &&
          payload.content &&
          typeof payload.content === "object"
        )
          setData(mergeContent(fallback, payload.content));
      })
      .catch(() => {});
  }, []);
  useEffect(() => {
    if (!("IntersectionObserver" in window) || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(({ target, isIntersecting }) => {
        if (!isIntersecting) return;
        observer.unobserve(target);
        if (revealed.current.has(target)) return;
        revealed.current.add(target);
        if (typeof target.animate === "function") {
          target.animate(
            [{ opacity: 0 }, { opacity: 1 }],
            { duration: 450, easing: "ease-out" },
          );
        }
      });
    }, { rootMargin: "0px 0px 100px 0px", threshold: 0 });

    document.querySelectorAll(".section-head, .step, .result-card, .certificate, .pricing-layout > div, .faq-section > div, .footer-inner").forEach((element) => {
      if (revealed.current.has(element)) return;
      if (element.getBoundingClientRect().top < window.innerHeight) {
        revealed.current.add(element);
      } else {
        observer.observe(element);
      }
    });
    return () => observer.disconnect();
  }, [data]);
  const plan = data.plans[selected] || data.plans[0];
  const register = plan?.id
    ? `/register?planId=${encodeURIComponent(plan.id)}`
    : "/register";

  return (
    <>
      <main id="top">
        <section className="hero wrap">
          <div className="hero-backdrop" aria-hidden="true" dir="ltr">
            {data.brand}
          </div>
          <div className="hero-pattern" aria-hidden="true" dir="ltr">
            {Array.from({ length: 7 }, (_, i) => (
              <span key={i}>{data.brand}</span>
            ))}
          </div>
          <div className="hero-copy">
            <div className="eyebrow">{data.hero.eyebrow}</div>
            <h1>{data.hero.title}</h1>
            <p>{data.hero.description}</p>
            <div className="actions">
              <a className="button" href="/register">
                {data.heroButtons.start} <span>↖</span>
              </a>
              <a className="button secondary" href="#pricing">
                {data.heroButtons.prices} <span>←</span>
              </a>
            </div>
            <div className="hero-note">
              <span className="note-icon">✳</span>
              <div>
                <b>الخطة والمتابعة</b>
                <small>كابتن زياد</small>
              </div>
              <span className="note-line" />
              <div>
                <b>الخبرة</b>
                <small>5 سنين تدريب</small>
              </div>
            </div>
          </div>
          <div className="hero-visual">
            <div className="visual-frame">
              <img src={data.hero.image} alt={data.heroButtons.imageAlt} />
              <div className="image-overlay" />
              <div className="visual-caption">
                <small>COACHING THAT FITS YOU</small>
                <strong>كابتن زياد</strong>
                <span>بيكتب خطتك ويتابعك</span>
              </div>
            </div>
            <div className="experience">
              <b>5</b>
              <span>
                سنين
                <br />
                خبرة
              </span>
              <i>✳</i>
            </div>
            <div className="side-text" dir="ltr">
              YOUR JOURNEY STARTS HERE — COACH ZIAD
            </div>
          </div>
        </section>
        <div className="ticker" aria-hidden="true">
          <div dir="ltr">
            YOUR GOALS <span>✳</span> YOUR PLAN <span>✳</span> YOUR PROGRESS{" "}
            <span>✳</span> YOUR GOALS <span>✳</span> YOUR PLAN <span>✳</span>{" "}
            YOUR PROGRESS
          </div>
        </div>
        <section className="section wrap" id="how">
          <div className="section-head">
            <div>
              <div className="section-label">
                <span>01</span> {data.sections.steps.label}
              </div>
              <h2>
                {data.sections.steps.title} <em>{data.sections.steps.highlight}</em>
              </h2>
            </div>
            <p>{data.sections.steps.description}</p>
          </div>
          <div className="steps">
            {data.steps.map(([title, desc], i) => (
              <article className="step" key={title}>
                <div className="step-top">
                  <span dir="ltr">0{i + 1}</span>
                  <i>↖</i>
                </div>
                <div>
                  <h3>{title}</h3>
                  <p>{desc}</p>
                </div>
              </article>
            ))}
          </div>
        </section>
        <section className="section results-section" id="results">
          <div className="wrap">
            <div className="section-head">
              <div>
                <div className="section-label">
                  <span>02</span> {data.sections.results.label}
                </div>
                <h2>
                  {data.sections.results.title} <em>{data.sections.results.highlight}</em>
                </h2>
              </div>
              <p>{data.sections.results.description}</p>
            </div>
            <div className="results-grid">
              {data.transformations.map((item, i) => (
                <Comparison key={item.label} item={item} index={i} total={data.transformations.length} labels={data.comparison} />
              ))}
            </div>
          </div>
        </section>
        <section className="section wrap certificates" id="certificates">
          <div className="section-head">
            <div>
              <div className="section-label">
                <span>03</span> {data.sections.certificates.label}
              </div>
              <h2>
                {data.sections.certificates.title} <em>{data.sections.certificates.highlight}</em>
              </h2>
            </div>
          </div>
          {data.certificates.length > 0 && (
            <div className="certificate-grid">
              {data.certificates.map((c) => (
                <article className="certificate" key={c.title}>
                  {c.image && (
                    <a href={c.image} target="_blank" rel="noreferrer">
                      <img src={c.image} alt={c.title} loading="lazy" />
                    </a>
                  )}
                  <h3>{c.title}</h3>
                  <p>{c.issuer}</p>
                </article>
              ))}
            </div>
          )}
        </section>
        <section className="section pricing-section" id="pricing">
          <div className="wrap pricing-layout">
            <div>
              <div className="section-label">
                <span>04</span> {data.sections.pricing.label}
              </div>
              <h2>
                {data.sections.pricing.title} <em>{data.sections.pricing.highlight}</em>
              </h2>
              <p className="lead">
                {data.sections.pricing.description}
              </p>
              <div className="pricing-decoration" dir="ltr">
                YOUR
                <br />
                <span>MOVE.</span>
              </div>
            </div>
            <div className="price-card">
              <div className="price-card-top">
                <span>{data.sections.pricing.cardTitle}</span>
              </div>
              <div
                className="plan-selector"
                style={{ "--selected": selected, "--count": Math.max(data.plans.length, 1) }}
                role="group"
                aria-label="مدة الاشتراك"
              >
                {data.plans.map((p, i) => (
                  <button
                    key={p.label}
                    className={selected === i ? "active" : ""}
                    aria-pressed={selected === i}
                    onClick={() => setSelected(i)}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
              <div className="price">
                {plan?.price != null ? (
                  <>
                    <b>{plan.price}</b>
                    <span>{data.sections.pricing.currency}</span>
                  </>
                ) : (
                  <span className="pending">{data.sections.pricing.unavailable}</span>
                )}
              </div>
              <a className="button full" href={register}>
                {data.sections.pricing.subscribe} <span>↖</span>
              </a>
              <div className="features-title">{data.sections.pricing.featuresTitle}</div>
              <ul>
                {data.features.map((f) => (
                  <li key={f}>
                    <span>✓</span>
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>
        <section className="section wrap faq-section" id="faq">
          <div>
            <div className="section-label">
              <span>05</span> {data.sections.faq.label}
            </div>
            <h2>
              {data.sections.faq.title} <em>{data.sections.faq.highlight}</em>
            </h2>
          </div>
          <div className="faq-list">
            {data.faqs.map((f) =>
              f.answer ? (
                <FAQItem key={f.question} item={f} />
              ) : (
                <div className="faq-question" key={f.question}>
                  {f.question}
                  <span>—</span>
                </div>
              ),
            )}
          </div>
        </section>
      </main>
      <footer>
        <div className="wrap footer-inner">
          <a className="logo" href="#top" dir="ltr">
            <span>{data.footer.top}</span>
            <b>
              {data.footer.name}<span>.</span>
            </b>
          </a>
          <a dir="ltr" href={`tel:${data.footer.phone.replace(/\s/g, "")}`}>
            {data.footer.phone}
          </a>
          <small dir="ltr">{data.footer.copyright}</small>
          <a href="#top">{data.footer.back}</a>
        </div>
      </footer>
    </>
  );
}
createRoot(document.getElementById("root")).render(<App />);
