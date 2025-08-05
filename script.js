// Initialize everything when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Website initialized successfully!');
    
    // Initialize all components
    initializeLazyLoading();
    initializeChart();
    initializeAnimations();
    initializeSmoothScroll();
    
    console.log('✅ All components loaded');
});

// Lazy Loading for Images
function initializeLazyLoading() {
    const images = document.querySelectorAll('img[loading="lazy"]');
    
    if ('IntersectionObserver' in window) {
        const imageObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    img.classList.add('loaded');
                    observer.unobserve(img);
                }
            });
        });
        
        images.forEach(img => imageObserver.observe(img));
    } else {
        // Fallback for older browsers
        images.forEach(img => img.classList.add('loaded'));
    }
}

// Initialize Chart
function initializeChart() {
    const ctx = document.getElementById('performanceChart');
    if (!ctx) return;
    
    // Load chart data
    fetch('assets/data/chart-data.json')
        .then(response => response.json())
        .then(data => createChart(ctx, data))
        .catch(error => {
            console.warn('Chart data not found, using default data');
            createChart(ctx, getDefaultChartData());
        });
}

function createChart(ctx, data) {
    new Chart(ctx, {
        type: 'radar',
        data: {
            labels: data.labels,
            datasets: [{
                label: 'Nuestro Modelo',
                data: data.ourModel,
                borderColor: '#007bff',
                backgroundColor: 'rgba(0, 123, 255, 0.2)',
                borderWidth: 3,
                pointBackgroundColor: '#007bff',
                pointBorderColor: '#fff',
                pointBorderWidth: 2,
                pointRadius: 6
            }, {
                label: 'Línea Base',
                data: data.baseline,
                borderColor: '#dc3545',
                backgroundColor: 'rgba(220, 53, 69, 0.2)',
                borderWidth: 3,
                pointBackgroundColor: '#dc3545',
                pointBorderColor: '#fff',
                pointBorderWidth: 2,
                pointRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: 'Comparación de Rendimiento',
                    font: {
                        size: 18,
                        weight: 'bold'
                    }
                },
                legend: {
                    position: 'bottom',
                    labels: {
                        padding: 20,
                        font: {
                            size: 14
                        }
                    }
                }
            },
            scales: {
                r: {
                    beginAtZero: true,
                    max: 100,
                    grid: {
                        color: 'rgba(0, 0, 0, 0.1)'
                    },
                    pointLabels: {
                        font: {
                            size: 12,
                            weight: 'bold'
                        }
                    },
                    ticks: {
                        stepSize: 20,
                        font: {
                            size: 10
                        }
                    }
                }
            },
            animation: {
                duration: 2000,
                easing: 'easeInOutQuart'
            }
        }
    });
}

function getDefaultChartData() {
    return {
        labels: ['Precisión', 'Velocidad', 'Eficiencia de Memoria', 'Escalabilidad', 'Robustez', 'Interpretabilidad'],
        ourModel: [98.7, 95, 88, 92, 89, 85],
        baseline: [85, 60, 70, 75, 72, 68]
    };
}

// Smooth scrolling for navigation links
function initializeSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                const headerOffset = 80;
                const elementPosition = target.getBoundingClientRect().top;
                const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

                window.scrollTo({
                    top: offsetPosition,
                    behavior: 'smooth'
                });
            }
        });
    });
}

// Animations on scroll
function initializeAnimations() {
    const animatedElements = document.querySelectorAll('.fade-in-up');
    
    if ('IntersectionObserver' in window) {
        const animationObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.style.animation = 'fadeInUp 0.8s ease-out forwards';
                }
            });
        }, {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        });
        
        animatedElements.forEach(el => {
            el.style.opacity = '0';
            animationObserver.observe(el);
        });
    } else {
        // Fallback: show all elements immediately
        animatedElements.forEach(el => {
            el.style.animation = 'fadeInUp 0.8s ease-out forwards';
        });
    }
}

// Copy to clipboard functionality
function copyToClipboard() {
    const citationText = document.getElementById('citationText');
    const copyButton = document.getElementById('copyButton');
    
    if (!citationText || !copyButton) return;
    
    const text = citationText.textContent;
    
    // Modern approach
    if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(text)
            .then(() => showCopyFeedback(copyButton, '¡Copiado!'))
            .catch(err => {
                console.error('Failed to copy:', err);
                fallbackCopyTextToClipboard(text, copyButton);
            });
    } else {
        // Fallback approach
        fallbackCopyTextToClipboard(text, copyButton);
    }
}

function fallbackCopyTextToClipboard(text, button) {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    try {
        const successful = document.execCommand('copy');
        if (successful) {
            showCopyFeedback(button, '¡Copiado!');
        } else {
            showCopyFeedback(button, 'Error al copiar');
        }
    } catch (err) {
        console.error('Fallback copy failed:', err);
        showCopyFeedback(button, 'Error al copiar');
    }
    
    document.body.removeChild(textArea);
}

function showCopyFeedback(button, message) {
    const originalText = button.textContent;
    button.textContent = message;
    button.style.background = message === '¡Copiado!' ? '#28a745' : '#dc3545';
    
    setTimeout(() => {
        button.textContent = originalText;
        button.style.background = '#007bff';
    }, 2000);
}

// Handle navigation bar background on scroll
window.addEventListener('scroll', function() {
    const nav = document.querySelector('nav');
    if (window.scrollY > 50) {
        nav.style.background = 'rgba(255, 255, 255, 0.98)';
        nav.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.1)';
    } else {
        nav.style.background = 'rgba(255, 255, 255, 0.95)';
        nav.style.boxShadow = 'none';
    }
});

// 3D Model Viewer Event Handling
document.addEventListener('DOMContentLoaded', function() {
    const modelViewer = document.querySelector('model-viewer');
    if (modelViewer) {
        modelViewer.addEventListener('load', function() {
            console.log('✅ 3D model loaded successfully!');
        });
        
        modelViewer.addEventListener('error', function(event) {
            console.warn('⚠️ 3D model failed to load, but that\'s okay for demo purposes');
        });
    }
});

// Console welcome message
console.log(`
🎨 Revolutionary AI Research Website
✨ Built with vanilla HTML, CSS, and JavaScript
🚀 Optimized for performance and accessibility
📱 Fully responsive design
`);