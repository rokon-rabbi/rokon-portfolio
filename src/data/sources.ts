export const SOURCE_IDS = [
  "user-content-brief",
  "user-about-contact-brief",
  "nstu-institution-name",
  "hands-on-readme",
  "hands-on-manifests",
  "hands-on-controllers",
  "chemistry-repository",
  "chemistry-code",
  "chemistry-panels",
] as const;
export type SourceId = (typeof SOURCE_IDS)[number];

interface ContentSource {
  readonly label: string;
  readonly kind: "user-confirmation" | "repository" | "institution";
  readonly reviewedAt: string;
  readonly urls: readonly string[];
  readonly scope: string;
}

const handsOn =
  "https://github.com/rokon-rabbi/hands-on-volunteering-platform/blob/706acfa98f3e9bd6153146a306b81f06c5f688d6";
const chemistry =
  "https://github.com/rokon-rabbi/chemistry-calculator/blob/a8ebfc9c694907611e5f8fd1ad388cc65ae78bb9";

export const SOURCES = {
  "user-about-contact-brief": {
    label: "User's About, Contact, and public resume instruction",
    kind: "user-confirmation",
    reviewedAt: "2026-10-10",
    urls: [],
    scope: "Education at NSTU and authorization to publish a professional-only resume. No degree, graduation status, dates, email, or LinkedIn URL supplied. CV remains unavailable.",
  },
  "nstu-institution-name": {
    label: "NSTU official institution website",
    kind: "institution",
    reviewedAt: "2026-10-10",
    urls: ["https://nstu.edu.bd/"],
    scope: "Expansion of NSTU to Noakhali Science and Technology University only; does not establish the user's degree, dates, or academic results.",
  },
  "user-content-brief": {
    label: "User-confirmed professional content brief",
    kind: "user-confirmation",
    reviewedAt: "2026-10-10",
    urls: [],
    scope:
      "Name, positioning, core areas, employers, titles, dates, contribution areas, LMS name, and featured personal project names. Not a CV review.",
  },
  "hands-on-readme": {
    label: "HandsOn project overview",
    kind: "repository",
    reviewedAt: "2026-10-10",
    urls: [`${handsOn}/README.md`],
    scope:
      "Project identity and described volunteering workflows; does not establish production results or sole authorship.",
  },
  "hands-on-manifests": {
    label: "HandsOn dependency manifests",
    kind: "repository",
    reviewedAt: "2026-10-10",
    urls: [`${handsOn}/backend/pom.xml`, `${handsOn}/frontend/package.json`],
    scope:
      "Java, Spring Boot, PostgreSQL, Spring Security/JWT, React and Tailwind CSS dependencies.",
  },
  "hands-on-controllers": {
    label: "HandsOn event and help-request controllers",
    kind: "repository",
    reviewedAt: "2026-10-10",
    urls: [
      `${handsOn}/backend/src/main/java/com/volunteeringPlatform/volunteeringPlatformBackend/controller/EventController.java`,
      `${handsOn}/backend/src/main/java/com/volunteeringPlatform/volunteeringPlatformBackend/controller/HelpRequestController.java`,
    ],
    scope:
      "Event creation/filtering/joining and help-request API endpoints; not a runtime or security test.",
  },
  "chemistry-repository": {
    label: "Chemistry Calculator fork metadata",
    kind: "repository",
    reviewedAt: "2026-10-10",
    urls: [
      "https://api.github.com/repos/rokon-rabbi/chemistry-calculator",
      "https://github.com/IIT-NSTU/chemistry-calculator",
    ],
    scope:
      "Public fork and upstream attribution; individual contribution scope is not verified.",
  },
  "chemistry-code": {
    label: "Chemistry Calculator Java implementation",
    kind: "repository",
    reviewedAt: "2026-10-10",
    urls: [
      `${chemistry}/ChemistryCalculator/frontend/Home.java`,
      `${chemistry}/ChemistryCalculator/backend/EquationBalancer.java`,
      `${chemistry}/ChemistryCalculator/frontend/MolarMassPanel.java`,
    ],
    scope:
      "Java/Swing desktop UI, equation balancing and molar-mass calculation code; not a claim of sole authorship or tested scientific accuracy.",
  },
  "chemistry-panels": {
    label: "Chemistry Calculator panel workflows",
    kind: "repository",
    reviewedAt: "2026-10-10",
    urls: [
      `${chemistry}/ChemistryCalculator/frontend/EquationBalancePanel.java`,
      `${chemistry}/ChemistryCalculator/frontend/MolarMassPanel.java`,
    ],
    scope:
      "Observed panel-to-calculation calls and visible error handling. Not verification of numerical accuracy, runtime behavior, or Rokon’s individual implementation ownership.",
  },
} as const satisfies Record<SourceId, ContentSource>;
