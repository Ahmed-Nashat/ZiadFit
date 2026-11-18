// Safe initial content. The public CMS contract and plan identifiers are pending agreement.
export const fallback = {
  hero: {
    eyebrow: "تدريب أونلاين · متابعة 1:1",
    title: "خطة تمرين وتغذية على مقاسك.",
    description:
      "كابتن زياد بيكتبلك خطتك ويتابعك على واتساب لحد ما توصل لهدفك. كل خطة بتتعمل على جسمك ويومك أنت.",
    image: "/images/coach-cutout.png",
  },
  brand: "COACH ZIAD",
  heroButtons: { start: "ابدأ تحوّلك", prices: "شوف الأسعار", imageAlt: "كابتن زياد" },
  sections: {
    steps: { label: "إزاي بنشتغل", title: "4 خطوات لخطة", highlight: "على مقاسك.", description: "من أول رسالة على واتساب لحد ما توصل لهدفك." },
    results: { label: "النتائج", title: "شوف", highlight: "الفرق.", description: "اسحب الخط الأصفر على كل صورة عشان تقارن بين قبل وبعد." },
    certificates: { label: "الشهادات والاعتمادات", title: "الشهادات", highlight: "والاعتمادات." },
    pricing: { label: "الأسعار", title: "اختار مدة", highlight: "الاشتراك.", description: "كل المدد فيها نفس المميزات. كل ما المدة تطول، السعر في الشهر بيقل.", cardTitle: "خطتك تبدأ هنا", subscribe: "اشترك دلوقتي", featuresTitle: "الاشتراك يشمل", unavailable: "السعر غير متاح حالياً", currency: "ج.م" },
    faq: { label: "أسئلة شائعة", title: "قبل ما", highlight: "تسأل." }
  },
  comparison: { before: "قبل", after: "بعد", coaching: "الخطة والمتابعة", coach: "كابتن زياد", drag: "اسحب الخط" },
  footer: { top: "COACH", name: "ZIAD", phone: "0128 731 2665", copyright: "© 2026 COACH ZIAD", back: "العودة للأعلى ↑" },
  steps: [
    ["التقييم", "تبعت وزنك وطولك وخبرتك وأي إصابات، مع صور لجسمك."],
    ["خطتك", "خطة تمرين ونظام غذائي مكتوبين على هدفك ويومك."],
    ["المتابعة", "متابعة تمرينك وأكلك، ورد على أسئلتك على واتساب."],
    ["التطوّر", "الخطة بتتعدل كل ما تتقدم، ومراجعة دورية لقياساتك."],
  ],
  transformations: [1, 2, 3].map((n) => ({
    label: `تحوّل 0${n}`,
    after: `/images/image-${n * 2 - 1}.jpg`,
    before: `/images/image-${n * 2}.jpg`,
  })),
  plans: [
    { label: "شهر", price: 650 },
    { label: "شهرين", price: 1100 },
    { label: "3 شهور", price: 1500 },
  ],
  features: [
    "برنامج تمارين مخصص ليك",
    "نظام غذائي على مقاسك",
    "متابعة أسبوعية بالصور والقياسات",
    "تعديل الخطة حسب تقدمك",
    "رد على الواتساب خلال 24 ساعة",
  ],
  certificates: [],
  faqs: [
    { question: "التدريب الأونلاين بيشتغل إزاي؟", answer: "بعد الاشتراك بتبعت بياناتك، وبيكتبلك خطة تمرين وتغذية مناسبة ليك، وبنتابع على واتساب." },
    { question: "طريقة الدفع إيه؟", answer: "بنتفق عليها على الواتساب بعد ما تختار المدة." },
    { question: "أقدر أمدد الاشتراك بعد ما يخلص؟", answer: "أيوه، تقدر تجدد في أي وقت وتختار المدة اللي تناسبك." },
    { question: "محتاج جيم؟", answer: "لا، الخطة بتتكتب على المتاح عندك: جيم أو بيت." }
  ],
  phone: "201287312665",
};


