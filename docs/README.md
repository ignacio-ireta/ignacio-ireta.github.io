# League of Legends ML Project Website

This directory contains the source code for the League of Legends Machine Learning Project website, which showcases an end-to-end machine learning lifecycle demonstration.

## Website Structure

```
docs/
├── index.html          # Main HTML file with all 9 ML lifecycle sections
├── styles.css          # Modern CSS with parallax effects and responsive design
├── script.js           # JavaScript for interactions and animations
├── assets/             # Static assets directory
│   └── dragontail_data/    # Slimmed League of Legends game assets
│       ├── 15.10.1/        # Version-specific data files
│       └── img/            # Champion and game images
└── README.md           # This file
```

## Features

### Visual Design
- **Modern UI/UX**: Clean, professional design with League of Legends theming
- **Parallax Scrolling**: Background images move at different speeds for depth
- **Responsive Layout**: Optimized for desktop, tablet, and mobile devices
- **Smooth Animations**: Fade-in effects and hover interactions

### Navigation
- **Fixed Header**: Always accessible navigation bar with smooth scrolling
- **Mobile Menu**: Hamburger menu for mobile devices
- **Active Section Highlighting**: Current section highlighted in navigation
- **Progress Indicator**: Visual scroll progress bar

### Content Sections

1. **Objective Definition** - Project goals and success metrics
2. **Data Collection** - Data sources and acquisition methods
3. **Data Cleaning and Preprocessing** - Data preparation pipeline
4. **Exploratory Data Analysis** - Data insights and patterns
5. **Model Selection and Training** - Algorithm comparison and training
6. **Model Evaluation and Validation** - Performance metrics and validation
7. **Deployment** - Production pipeline and infrastructure
8. **Monitoring and Maintenance** - System health and monitoring
9. **Feedback and Iteration** - Continuous improvement cycle

### Interactive Elements
- **Animated Counters**: Numbers animate when scrolled into view
- **Hover Effects**: Interactive cards and buttons
- **Typing Animation**: Hero title types out dynamically
- **Mouse Parallax**: Hero background responds to mouse movement

## Technical Stack

- **HTML5**: Semantic markup with accessibility considerations
- **CSS3**: Modern features including Grid, Flexbox, and CSS animations
- **Vanilla JavaScript**: No external libraries for optimal performance
- **GitHub Pages**: Static site hosting with Jekyll integration

## Asset Management

The website uses slimmed League of Legends assets from Data Dragon:
- Champion images for parallax backgrounds
- Game data for potential future interactive features
- Optimized file structure for web delivery

## Performance Optimizations

- **Image Preloading**: Critical images loaded in advance
- **Lazy Loading**: Non-critical content loaded on demand
- **Throttled Scroll Events**: Optimized scroll event handling
- **CSS/JS Minification**: Production-ready compressed assets

## Browser Support

- Modern browsers (Chrome 70+, Firefox 65+, Safari 12+, Edge 79+)
- Graceful degradation for older browsers
- Mobile-first responsive design

## Development

To develop locally:
1. Clone the repository
2. Navigate to the docs directory
3. Serve with any local web server (e.g., `python -m http.server`)
4. Open `http://localhost:8000` in your browser

## Deployment

The website is automatically deployed via GitHub Pages when changes are pushed to the main branch. The `_config.yml` file configures Jekyll to serve from the `docs/` directory.

## Future Enhancements

- Interactive data visualizations
- Real model prediction interface
- Additional case studies
- Blog section for project updates
- Performance dashboard integration 