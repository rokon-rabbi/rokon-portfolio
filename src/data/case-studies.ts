import type { CaseStudy } from "../schemas/portfolio";

export const createPlannedCaseStudy = (publicPreview = false): CaseStudy => ({
  status: "planned",
  publicPreview,
  sections: [
    {
      id: "problem",
      status: "missing",
      claims: [],
      missingDetails:
        "The project’s problem statement and motivation have not been confirmed.",
    },
    {
      id: "role",
      status: "missing",
      claims: [],
      missingDetails:
        "Exact responsibilities, collaborators, and individual contributions have not been confirmed.",
    },
    {
      id: "architecture",
      status: "missing",
      claims: [],
      missingDetails:
        "The repository, technologies, and architecture have not been verified.",
    },
    {
      id: "decisions",
      status: "missing",
      claims: [],
      missingDetails:
        "Engineering decisions and their tradeoffs still need an author account.",
    },
    {
      id: "features",
      status: "missing",
      claims: [],
      missingDetails: "Features and workflows have not been verified.",
    },
    {
      id: "challenges",
      status: "missing",
      claims: [],
      missingDetails:
        "Concrete challenges, attempted approaches, and solutions have not been documented.",
    },
    {
      id: "lessons",
      status: "missing",
      claims: [],
      missingDetails:
        "A firsthand reflection on lessons learned has not been supplied.",
    },
  ],
  media: [],
  codeSamples: [],
  metrics: [],
});

export const VOLUNTEERING_CASE_STUDY: CaseStudy = {
  status: "partial",
  publicPreview: false,
  sections: [
    {
      id: "problem",
      status: "partial",
      claims: [
        {
          text: "The repository describes a platform for discovering volunteering events and coordinating community help requests.",
          sourceIds: ["hands-on-readme"],
        },
      ],
      missingDetails:
        "The original motivation, intended audience research, and project constraints still need a firsthand account.",
    },
    {
      id: "role",
      status: "partial",
      claims: [
        {
          text: "This is listed as my personal project in the confirmed portfolio brief.",
          sourceIds: ["user-content-brief"],
        },
      ],
      missingDetails:
        "My exact implementation responsibilities, collaborators, and contribution boundaries have not yet been documented. The repository alone does not establish sole authorship.",
    },
    {
      id: "architecture",
      status: "partial",
      claims: [
        {
          text: "The project has a React frontend and a Java/Spring Boot backend. The project documentation identifies PostgreSQL for persistence.",
          sourceIds: ["hands-on-readme", "hands-on-manifests"],
        },
        {
          text: "The reviewed controllers expose REST endpoints for events and help requests and delegate their work to service classes.",
          sourceIds: ["hands-on-controllers"],
        },
        {
          text: "Spring Security and JWT appear in the backend dependencies. Their presence does not establish a tested security guarantee.",
          sourceIds: ["hands-on-manifests"],
        },
      ],
      missingDetails:
        "Deployment topology, runtime behavior, and operational characteristics have not been verified.",
    },
    {
      id: "decisions",
      status: "partial",
      claims: [
        {
          text: "The source separates frontend and backend directories, and the event/help-request controllers call service classes. These are observable code-organization choices.",
          sourceIds: ["hands-on-manifests", "hands-on-controllers"],
        },
      ],
      missingDetails:
        "The rationale, alternatives considered, and tradeoffs behind these choices need confirmation; they are not inferred from the code.",
    },
    {
      id: "features",
      status: "verified",
      claims: [
        {
          text: "Event endpoints support creation, filtering by category and location, joining an event, and retrieving event details.",
          sourceIds: ["hands-on-controllers"],
        },
        {
          text: "Help-request endpoints support creating and listing requests, retrieving an individual request, and updating its status with PATCH.",
          sourceIds: ["hands-on-controllers"],
        },
      ],
    },
    {
      id: "challenges",
      status: "missing",
      claims: [],
      missingDetails:
        "No verified account of implementation challenges or the solutions I contributed has been supplied.",
    },
    {
      id: "lessons",
      status: "missing",
      claims: [],
      missingDetails:
        "Personal lessons and what I would change next need a firsthand account.",
    },
  ],
  diagram: {
    title: "A repository-level system sketch",
    caption:
      "Conceptual diagram based on the README, dependency manifests, and reviewed controllers. It shows documented application layers, not a verified deployment topology.",
    nodes: [
      {
        id: "client",
        label: "React client",
        detail: "Frontend application",
        sourceIds: ["hands-on-manifests"],
      },
      {
        id: "api",
        label: "Spring Boot",
        detail: "Event & help-request APIs",
        sourceIds: ["hands-on-manifests", "hands-on-controllers"],
      },
      {
        id: "database",
        label: "PostgreSQL",
        detail: "Documented persistence",
        sourceIds: ["hands-on-readme", "hands-on-manifests"],
      },
    ],
    edges: [
      {
        from: "client",
        to: "api",
        label: "API communication",
        sourceIds: ["hands-on-readme"],
      },
      {
        from: "api",
        to: "database",
        label: "Persistence",
        sourceIds: ["hands-on-readme"],
      },
    ],
  },
  media: [],
  codeSamples: [
    {
      id: "event-routes",
      title: "Reviewed event endpoint shapes",
      language: "http",
      code: "GET  /api/events\nPOST /api/events/{eventId}/join",
      caption:
        "Endpoint shapes transcribed from EventController.java. This is a source reference, not a live API console or a runtime test.",
      sourceIds: ["hands-on-controllers"],
    },
  ],
  metrics: [],
};

export const CHEMISTRY_CASE_STUDY: CaseStudy = {
  status: "partial",
  publicPreview: false,
  sections: [
    {
      id: "problem",
      status: "partial",
      claims: [
        {
          text: "The repository provides a desktop interface for chemistry calculations, including equation balancing and molar mass.",
          sourceIds: ["chemistry-code"],
        },
      ],
      missingDetails:
        "The original project motivation and intended users have not been documented in this portfolio.",
    },
    {
      id: "role",
      status: "partial",
      claims: [
        {
          text: "My repository is a fork of IIT-NSTU/chemistry-calculator. The upstream project must be credited.",
          sourceIds: ["chemistry-repository"],
        },
      ],
      missingDetails:
        "My exact changes and contribution scope have not been verified. The features described here belong to the reviewed repository and are not claimed as my individual implementation.",
    },
    {
      id: "architecture",
      status: "partial",
      claims: [
        {
          text: "Home.java builds a Swing desktop interface and uses CardLayout to organize calculation panels.",
          sourceIds: ["chemistry-code"],
        },
        {
          text: "EquationBalancePanel calls a separate EquationBalancer class. MolarMassPanel uses Compound and Atom calculation classes.",
          sourceIds: ["chemistry-panels"],
        },
      ],
      missingDetails:
        "Packaging, distribution, and runtime or scientific-accuracy verification are not available.",
    },
    {
      id: "decisions",
      status: "partial",
      claims: [
        {
          text: "The reviewed implementation separates calculation panels from supporting Java calculation classes and switches panels through CardLayout.",
          sourceIds: ["chemistry-code", "chemistry-panels"],
        },
      ],
      missingDetails:
        "These are observed implementation choices. Their design rationale and my involvement in those choices have not been confirmed.",
    },
    {
      id: "features",
      status: "verified",
      claims: [
        {
          text: "The equation panel accepts reactants and products, calls the balancing logic, and displays the resulting equation or an error message.",
          sourceIds: ["chemistry-panels"],
        },
        {
          text: "The molar-mass panel accepts a compound, displays its calculated mass and atom table, and shows an error for invalid input.",
          sourceIds: ["chemistry-panels"],
        },
      ],
    },
    {
      id: "challenges",
      status: "partial",
      claims: [
        {
          text: "The reviewed panels catch calculation-related exceptions and show visible error messages. This is an observable error-handling behavior in source code.",
          sourceIds: ["chemistry-panels"],
        },
      ],
      missingDetails:
        "The development challenges, why this handling was selected, and any fixes I personally made have not been verified.",
    },
    {
      id: "lessons",
      status: "missing",
      claims: [],
      missingDetails:
        "A personal reflection on this project has not been supplied; no lessons are attributed to me without that account.",
    },
  ],
  diagram: {
    title: "From desktop panels to calculation logic",
    caption:
      "Source-based conceptual diagram of the Swing interface and Java calculation classes. No server, cloud infrastructure, or scientific-accuracy guarantee is implied.",
    nodes: [
      {
        id: "window",
        label: "Swing interface",
        detail: "Home.java / CardLayout",
        sourceIds: ["chemistry-code"],
      },
      {
        id: "panels",
        label: "Calculation panels",
        detail: "Equation balance & molar mass",
        sourceIds: ["chemistry-code", "chemistry-panels"],
      },
      {
        id: "logic",
        label: "Java logic",
        detail: "EquationBalancer / Compound",
        sourceIds: ["chemistry-panels"],
      },
    ],
    edges: [
      {
        from: "window",
        to: "panels",
        label: "Panel navigation",
        sourceIds: ["chemistry-code"],
      },
      {
        from: "panels",
        to: "logic",
        label: "Calculation calls",
        sourceIds: ["chemistry-panels"],
      },
    ],
  },
  media: [],
  codeSamples: [
    {
      id: "calculation-call",
      title: "A reviewed balancing call",
      language: "java",
      code: "EquationBalancer balancer = new EquationBalancer(reactants, products);\nbalancedEquation = balancer.balance();",
      caption:
        "A short excerpt from EquationBalancePanel.java, with surrounding error-handling code omitted. It describes repository behavior, not a verified individual contribution.",
      sourceIds: ["chemistry-panels"],
    },
  ],
  metrics: [],
};
