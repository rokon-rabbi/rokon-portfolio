# Responsive QA screenshots

Captured from the built static site in Playwright. The route matrix uses reduced motion for stable layout review. Viewport captures are 390 × 844, 768 × 1000, and 1440 × 1000. Full-page captures supplement mobile and desktop. Both themes are included. Separate scene captures exercise real Three.js under a test-only software-WebGL capability override.

| Route | Mobile | Tablet | Desktop | Mobile dark | Desktop dark |
| --- | --- | --- | --- | --- | --- |
| home | [390](screenshots/home-light-390.png) | [768](screenshots/home-light-768.png) | [1440](screenshots/home-light-1440.png) | [390](screenshots/home-dark-390.png) | [1440](screenshots/home-dark-1440.png) |
| about | [390](screenshots/about-light-390.png) | [768](screenshots/about-light-768.png) | [1440](screenshots/about-light-1440.png) | [390](screenshots/about-dark-390.png) | [1440](screenshots/about-dark-1440.png) |
| contact | [390](screenshots/contact-light-390.png) | [768](screenshots/contact-light-768.png) | [1440](screenshots/contact-light-1440.png) | [390](screenshots/contact-dark-390.png) | [1440](screenshots/contact-dark-1440.png) |
| resume | [390](screenshots/resume-light-390.png) | [768](screenshots/resume-light-768.png) | [1440](screenshots/resume-light-1440.png) | [390](screenshots/resume-dark-390.png) | [1440](screenshots/resume-dark-1440.png) |
| work | [390](screenshots/work-light-390.png) | [768](screenshots/work-light-768.png) | [1440](screenshots/work-light-1440.png) | [390](screenshots/work-dark-390.png) | [1440](screenshots/work-dark-1440.png) |
| chemistry | [390](screenshots/chemistry-light-390.png) | [768](screenshots/chemistry-light-768.png) | [1440](screenshots/chemistry-light-1440.png) | [390](screenshots/chemistry-dark-390.png) | [1440](screenshots/chemistry-dark-1440.png) |
| volunteering | [390](screenshots/volunteering-light-390.png) | [768](screenshots/volunteering-light-768.png) | [1440](screenshots/volunteering-light-1440.png) | [390](screenshots/volunteering-dark-390.png) | [1440](screenshots/volunteering-dark-1440.png) |
| courseflow | [390](screenshots/courseflow-light-390.png) | [768](screenshots/courseflow-light-768.png) | [1440](screenshots/courseflow-light-1440.png) | [390](screenshots/courseflow-dark-390.png) | [1440](screenshots/courseflow-dark-1440.png) |
| blog | [390](screenshots/blog-light-390.png) | [768](screenshots/blog-light-768.png) | [1440](screenshots/blog-light-1440.png) | [390](screenshots/blog-dark-390.png) | [1440](screenshots/blog-dark-1440.png) |
| gallery | [390](screenshots/gallery-light-390.png) | [768](screenshots/gallery-light-768.png) | [1440](screenshots/gallery-light-1440.png) | [390](screenshots/gallery-dark-390.png) | [1440](screenshots/gallery-dark-1440.png) |
| 404 | [390](screenshots/404-light-390.png) | [768](screenshots/404-light-768.png) | [1440](screenshots/404-light-1440.png) | [390](screenshots/404-dark-390.png) | [1440](screenshots/404-dark-1440.png) |

Temporary publication fixtures use the real MDX templates and draft article bodies; they are isolated test material and have been removed from source and the release build.

- article: [mobile](fixture-screenshots/article-light-390.png), [tablet](fixture-screenshots/article-light-768.png), [desktop](fixture-screenshots/article-light-1440.png), [dark mobile](fixture-screenshots/article-dark-390.png).
- jenkins: [mobile](fixture-screenshots/jenkins-light-390.png), [tablet](fixture-screenshots/jenkins-light-768.png), [desktop](fixture-screenshots/jenkins-light-1440.png), [dark mobile](fixture-screenshots/jenkins-dark-390.png).
- spring: [mobile](fixture-screenshots/spring-light-390.png), [tablet](fixture-screenshots/spring-light-768.png), [desktop](fixture-screenshots/spring-light-1440.png), [dark mobile](fixture-screenshots/spring-dark-390.png).
- tag: [mobile](fixture-screenshots/tag-light-390.png), [tablet](fixture-screenshots/tag-light-768.png), [desktop](fixture-screenshots/tag-light-1440.png), [dark mobile](fixture-screenshots/tag-dark-390.png).
- media: [mobile](fixture-screenshots/media-light-390.png), [tablet](fixture-screenshots/media-light-768.png), [desktop](fixture-screenshots/media-light-1440.png), [dark mobile](fixture-screenshots/media-dark-390.png).

Component and fix review: [code at 320](fixture-screenshots/article-code-320.png), [TOC before](before/article-toc-double-offset-320.png), [TOC after](fixture-screenshots/article-toc-320.png), [uncropped project media](fixture-screenshots/project-media-320.png), [paused desktop scene](screenshots/scene-chromium-paused.png), [paused touch scene](screenshots/scene-touch-chromium-paused.png).

Firefox and touch-emulation comparisons are named with `-firefox` and `-touch-chromium` suffixes beside the main captures. All raw measurements and test outcomes are in [summary.json](summary.json), [release results](playwright-results.json), and [fixture results](fixture-playwright-results.json).

Lower-page specimens: [mobile dark tabs and filters](screenshots/gallery-controls-dark-320.png), [desktop light tabs and filters](screenshots/gallery-controls-light-1440.png), [mobile light input states](screenshots/gallery-inputs-light-320.png). Capture these with `node scripts/capture-responsive-components.mjs` before regenerating this index.
