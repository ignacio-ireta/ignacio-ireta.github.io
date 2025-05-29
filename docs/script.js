// DOM Elements
const hamburger = document.querySelector('.hamburger');
const navMenu = document.querySelector('.nav-menu');
const navLinks = document.querySelectorAll('.nav-link');
const parallaxElements = document.querySelectorAll('.parallax-bg');

// Mobile Navigation Toggle
hamburger.addEventListener('click', () => {
    hamburger.classList.toggle('active');
    navMenu.classList.toggle('active');
});

// Close mobile menu when clicking on a link
navLinks.forEach(link => {
    link.addEventListener('click', () => {
        hamburger.classList.remove('active');
        navMenu.classList.remove('active');
    });
});

// Parallax Scrolling Effect
function updateParallax() {
    const scrollTop = window.pageYOffset;
    
    parallaxElements.forEach(element => {
        const speed = 0.2;
        const yPos = -(scrollTop * speed);
        // Temporarily disable transform to test static positioning
        // element.style.transform = `translateY(${yPos}px)`;
    });
}

// Set background images for parallax elements
function setParallaxBackgrounds() {
    parallaxElements.forEach(element => {
        const bgImage = element.getAttribute('data-bg');
        if (bgImage) {
            element.style.backgroundImage = `url('${bgImage}')`;
        }
    });
}

// Smooth scrolling for navigation links
function initSmoothScrolling() {
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = link.getAttribute('href');
            const targetSection = document.querySelector(targetId);
            
            if (targetSection) {
                const offsetTop = targetSection.offsetTop - 80; // Account for fixed navbar
                window.scrollTo({
                    top: offsetTop,
                    behavior: 'smooth'
                });
            }
        });
    });
}

// Active navigation highlighting
function updateActiveNav() {
    const sections = document.querySelectorAll('.section');
    const scrollPos = window.scrollY + 100;
    
    sections.forEach(section => {
        const sectionTop = section.offsetTop;
        const sectionHeight = section.offsetHeight;
        const sectionId = section.getAttribute('id');
        
        if (scrollPos >= sectionTop && scrollPos < sectionTop + sectionHeight) {
            // Remove active class from all nav links
            navLinks.forEach(link => {
                link.classList.remove('active');
            });
            
            // Add active class to current section nav link
            const activeLink = document.querySelector(`.nav-link[href="#${sectionId}"]`);
            if (activeLink) {
                activeLink.classList.add('active');
            }
        }
    });
}

// Intersection Observer for animations
function initIntersectionObserver() {
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate');
            }
        });
    }, observerOptions);
    
    // Observe all metric cards and content items
    const animateElements = document.querySelectorAll(
        '.metric-card, .source-item, .step, .insight, .model-item, .stack-item, .aspect, .cycle-step'
    );
    
    animateElements.forEach(element => {
        observer.observe(element);
    });
}

// Navbar background opacity on scroll
function updateNavbarOnScroll() {
    const navbar = document.querySelector('.navbar');
    const scrollTop = window.pageYOffset;
    
    if (scrollTop > 50) {
        navbar.style.background = 'rgba(13, 17, 23, 0.98)';
    } else {
        navbar.style.background = 'rgba(13, 17, 23, 0.95)';
    }
}

// Dynamic typing effect for hero section
function initTypingEffect() {
    const heroTitle = document.querySelector('.hero-content h1');
    if (heroTitle) {
        const originalText = heroTitle.textContent;
        heroTitle.textContent = '';
        let i = 0;
        
        const typeWriter = () => {
            if (i < originalText.length) {
                heroTitle.textContent += originalText.charAt(i);
                i++;
                setTimeout(typeWriter, 50);
            }
        };
        
        // Start typing effect after a short delay
        setTimeout(typeWriter, 500);
    }
}

// Counter animation for metrics
function animateCounters() {
    const counters = document.querySelectorAll('.metric-value, .value');
    
    counters.forEach(counter => {
        const target = counter.textContent;
        const numericValue = parseFloat(target.replace(/[^\d.-]/g, ''));
        
        if (!isNaN(numericValue)) {
            counter.textContent = '0';
            const increment = numericValue / 50;
            let current = 0;
            
            const updateCounter = () => {
                current += increment;
                if (current < numericValue) {
                    counter.textContent = target.replace(numericValue.toString(), Math.floor(current).toString());
                    requestAnimationFrame(updateCounter);
                } else {
                    counter.textContent = target;
                }
            };
            
            // Start animation when element comes into view
            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        updateCounter();
                        observer.disconnect();
                    }
                });
            }, { threshold: 0.5 });
            
            observer.observe(counter);
        }
    });
}

// Loading animation
function initLoadingAnimation() {
    const sections = document.querySelectorAll('.section-content');
    
    sections.forEach((section, index) => {
        section.style.opacity = '0';
        section.style.transform = 'translateY(30px)';
        section.style.transition = 'opacity 0.8s ease, transform 0.8s ease';
        
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    setTimeout(() => {
                        entry.target.style.opacity = '1';
                        entry.target.style.transform = 'translateY(0)';
                    }, index * 100);
                    observer.disconnect();
                }
            });
        }, { threshold: 0.2 });
        
        observer.observe(section);
    });
}

// Enhanced parallax with mouse movement
function initMouseParallax() {
    const heroBackground = document.querySelector('.hero-background');
    
    if (heroBackground) {
        document.addEventListener('mousemove', (e) => {
            const mouseX = e.clientX / window.innerWidth;
            const mouseY = e.clientY / window.innerHeight;
            
            const moveX = (mouseX - 0.5) * 20;
            const moveY = (mouseY - 0.5) * 20;
            
            heroBackground.style.transform = `translate(${moveX}px, ${moveY}px)`;
        });
    }
}

// Scroll progress indicator
function initScrollProgress() {
    const progressBar = document.createElement('div');
    progressBar.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 0%;
        height: 3px;
        background: linear-gradient(90deg, #C89B3C, #E6C565);
        z-index: 9999;
        transition: width 0.1s ease;
    `;
    document.body.appendChild(progressBar);
    
    window.addEventListener('scroll', () => {
        const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
        const scrollTop = window.pageYOffset;
        const scrollPercent = (scrollTop / scrollHeight) * 100;
        
        progressBar.style.width = `${scrollPercent}%`;
    });
}

// Performance optimization for scroll events
let ticking = false;

function onScroll() {
    if (!ticking) {
        requestAnimationFrame(() => {
            updateParallax();
            updateNavbarOnScroll();
            updateActiveNav();
            ticking = false;
        });
        ticking = true;
    }
}

// Event Listeners
window.addEventListener('scroll', onScroll);
window.addEventListener('resize', () => {
    // Recalculate parallax on resize
    updateParallax();
});

// Initialize all features when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    setParallaxBackgrounds();
    initSmoothScrolling();
    initIntersectionObserver();
    initTypingEffect();
    animateCounters();
    initLoadingAnimation();
    initMouseParallax();
    initScrollProgress();
    
    // Add CSS for active nav links
    const style = document.createElement('style');
    style.textContent = `
        .nav-link.active {
            color: #C89B3C !important;
        }
        .nav-link.active::after {
            width: 100% !important;
        }
        .animate {
            animation: fadeInUp 0.8s ease-out forwards;
        }
    `;
    document.head.appendChild(style);
});

// Preload critical images
function preloadImages() {
    const criticalImages = [
        'assets/dragontail_data/img/champion/splash/Jhin_0.jpg',
        'assets/dragontail_data/img/champion/splash/Kaisa_0.jpg',
        'assets/dragontail_data/img/champion/splash/Ezreal_0.jpg',
        'assets/dragontail_data/img/champion/splash/LeeSin_0.jpg'
    ];
    
    criticalImages.forEach(src => {
        const img = new Image();
        img.src = src;
    });
}

// Initialize preloading
preloadImages();

// Handle browser back/forward navigation
window.addEventListener('popstate', () => {
    updateActiveNav();
});

// Error handling for missing images
document.addEventListener('error', (e) => {
    if (e.target.tagName === 'IMG' || e.target.style.backgroundImage) {
        console.warn('Failed to load image:', e.target.src || e.target.style.backgroundImage);
        // Could implement fallback images here
    }
}, true); 