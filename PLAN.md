# Technical Plan & Website Architecture

This document outlines the technical specifications, project structure, and development plan for the project showcase website.

## 1. Technology Stack

The technology choices prioritize performance, ease of development, and compatibility with GitHub Pages. The stack is based on modern, lightweight, and widely-supported standards.

-   **Core Languages:**
    -   **HTML5:** For the website's structure and content.
    -   **CSS3:** For styling and presentation.
    -   **JavaScript (ES6+):** For interactivity, lazy loading, and dynamic content.

-   **CSS Framework:**
    -   **Tailwind CSS:** A utility-first CSS framework that allows for rapid UI development directly within the HTML. It is highly performant because it can generate a very small CSS file by "purging" all unused styles during the build process.

-   **JavaScript Libraries & Components:**
    -   **Plotting:** `Chart.js`. A lightweight and powerful library for creating beautiful, interactive, and responsive charts and graphs.
    -   **3D Model Viewing:** Google's `<model-viewer>`. A web component that makes it incredibly simple to add interactive 3D models to a webpage.
    -   **Code Highlighting:** `highlight.js`. A library to automatically detect and highlight syntax in code snippets, making them readable and professional.
    -   **Animations:** We will primarily use native **CSS Transitions and Animations** for performance. For scroll-triggered animations, we will use the native **Intersection Observer API**, which is also the core of our lazy-loading strategy.

-   **Build Tools:**
    -   **Node Package Manager (npm):** For managing project dependencies (like Tailwind CSS).
    -   **Tailwind CLI:** The command-line tool for processing our `input.css` file and generating the final `style.css` file.

## 2. Project Structure

The file and folder structure is designed to be logical and maintainable. We will separate source files from compiled output files.

```
ss-website/
├── .gitignore
├── index.html              # The main (and only) HTML page
├── requirements.md         # The informal requirements document
├── PLAN.md                 # This technical plan
├── package.json            # Defines dependencies and build scripts
├── tailwind.config.js      # Configuration for Tailwind CSS
│
├── assets/                 # For all static media assets.
│   ├── images/             # Static images, logos, favicons.
│   ├── videos/             # Looping background videos (MP4).
│   ├── models/             # 3D models (.glb).
│   └── data/               # Dummy data for plots (e.g., JSON files).
│
├── src/
│   └── input.css           # The source CSS file with Tailwind directives.
│
└── dist/
    ├── style.css           # The final, compiled, and purged CSS file.
    └── script.js           # The main JavaScript file for all interactivity.
```

## 3. Development Plan (Step-by-Step)

### Step 1: Project Initialization
1.  Initialize the project with `npm init -y` to create `package.json`.
2.  Install Tailwind CSS: `npm install -D tailwindcss`.
3.  Initialize Tailwind: `npx tailwindcss init` to create `tailwind.config.js`.
4.  Configure `tailwind.config.js` to scan `.html` and `.js` files for classes.
5.  Create the `package.json` script for building the CSS: `"build": "tailwindcss -i ./src/input.css -o ./dist/style.css --minify"`.
6.  Create the full directory structure outlined above.

### Step 2: HTML Scaffolding (`index.html`)
1.  Create the basic HTML5 document structure.
2.  Link to the compiled stylesheet: `<link rel="stylesheet" href="dist/style.css">`.
3.  Link to the script file at the end of the body: `<script defer src="dist/script.js"></script>`. The `defer` attribute ensures it doesn't block HTML parsing.
4.  Lay out all the `<section>` tags with their respective IDs (`#hero`, `#abstract`, `#results`, etc.) and placeholder content.

### Step 3: JavaScript Core Logic (`dist/script.js`)
1.  **Implement Lazy Loading:**
    -   Create a single `IntersectionObserver`.
    -   Target elements to be lazy-loaded will have a `data-src` attribute instead of `src`.
    -   When an element intersects with the viewport, the observer's callback will swap the `data-src` value to the `src` attribute, triggering the browser to load the asset.
    -   This will be used for images, iframes, and for triggering the instantiation of plots and 3D models.
2.  **Implement Smooth Scrolling:** Add an event listener to the navigation links that uses `element.scrollIntoView({ behavior: 'smooth' })` to navigate the page.

### Step 4: Styling and Component Building
1.  Style the page section by section using Tailwind's utility classes directly in `index.html`.
2.  Start with the navigation, then the hero section, then work down the page.
3.  Run the `npm run build` command periodically to see the styling applied.

### Step 5: Integrating Libraries & Interactive Content
1.  **Chart.js:**
    -   Add a `<canvas>` element in the "Quantitative Analysis" section.
    -   Use the Intersection Observer to detect when the canvas is visible.
    -   Once visible, fetch dummy data (from `assets/data/` or defined in `script.js`) and instantiate the `Chart` object.
2.  **<model-viewer>:**
    -   Add the `<model-viewer>` script tag in the `<head>` of `index.html`.
    -   Place the `<model-viewer>` tag in the "3D Model Showcase" section, using a `data-src` attribute for the model file.
    -   Use the Intersection Observer to set the `src` attribute when the component is scrolled into view.
3.  **highlight.js:**
    -   Add the library's JS and a theme CSS file via CDN links in `index.html`.
    -   After the page loads, call its initialization function to highlight all `<pre><code>` blocks.

### Step 6: Content Population
1.  Populate the `assets` folder with placeholder images, a short MP4 video, and a dummy `.glb` 3D model.
2.  Replace all placeholder text in `index.html` with more descriptive dummy text (e.g., Lorem Ipsum).

### Step 7: Final Polish & Deployment
1.  Review for performance bottlenecks.
2.  Ensure all committed code is formatted and clean.
3.  Since we have a build step, the `dist/` folder **must** be committed to the repository.
4.  Configure GitHub Pages to deploy from the `main` branch and the `/` (root) directory.
