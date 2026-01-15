// ========================================
// DJHAKK Lazy Loading Utilities
// ========================================

/**
 * Lazy load images using Intersection Observer
 * Add data-src attribute to images and class="lazy"
 * 
 * Example:
 * <img class="lazy" data-src="image.jpg" src="placeholder.jpg">
 */
const lazyLoadImages = () => {
    const images = document.querySelectorAll('img.lazy');
    
    if ('IntersectionObserver' in window) {
        const imageObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    
                    // Load the image
                    if (img.dataset.src) {
                        img.src = img.dataset.src;
                        img.removeAttribute('data-src');
                    }
                    
                    // Load srcset if present
                    if (img.dataset.srcset) {
                        img.srcset = img.dataset.srcset;
                        img.removeAttribute('data-srcset');
                    }
                    
                    img.classList.remove('lazy');
                    img.classList.add('lazy-loaded');
                    
                    observer.unobserve(img);
                }
            });
        }, {
            rootMargin: '50px 0px', // Start loading 50px before visible
            threshold: 0.01
        });
        
        images.forEach(img => imageObserver.observe(img));
    } else {
        // Fallback for older browsers
        images.forEach(img => {
            if (img.dataset.src) {
                img.src = img.dataset.src;
            }
            if (img.dataset.srcset) {
                img.srcset = img.dataset.srcset;
            }
            img.classList.remove('lazy');
        });
    }
};

/**
 * Lazy load scripts
 * Usage: await lazyLoadScript('path/to/script.js')
 */
const lazyLoadScript = (src, async = true) => {
    return new Promise((resolve, reject) => {
        // Check if already loaded
        if (document.querySelector(`script[src="${src}"]`)) {
            resolve();
            return;
        }
        
        const script = document.createElement('script');
        script.src = src;
        script.async = async;
        
        script.onload = resolve;
        script.onerror = reject;
        
        document.body.appendChild(script);
    });
};

/**
 * Lazy load CSS
 * Usage: lazyLoadCSS('path/to/styles.css')
 */
const lazyLoadCSS = (href) => {
    return new Promise((resolve, reject) => {
        // Check if already loaded
        if (document.querySelector(`link[href="${href}"]`)) {
            resolve();
            return;
        }
        
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = href;
        
        link.onload = resolve;
        link.onerror = reject;
        
        document.head.appendChild(link);
    });
};

/**
 * Lazy load module (Stripe, Audio Player, etc.)
 * Usage: await lazyLoadModule('stripe')
 */
const moduleLoaders = {
    stripe: async () => {
        // Load Stripe.js from CDN if not present
        if (!window.Stripe) {
            await lazyLoadScript('https://js.stripe.com/v3/');
        }
        // Load our Stripe integration
        await lazyLoadScript('js/stripe.js');
    },
    
    audioPlayer: async () => {
        await lazyLoadScript('js/audio-player.js');
    },
};

const lazyLoadModule = async (moduleName) => {
    const loader = moduleLoaders[moduleName];
    if (loader) {
        await loader();
    } else {
        console.warn(`Unknown module: ${moduleName}`);
    }
};

/**
 * Prefetch pages for faster navigation
 * Usage: prefetchPage('events.html')
 */
const prefetchPage = (url) => {
    const link = document.createElement('link');
    link.rel = 'prefetch';
    link.href = url;
    document.head.appendChild(link);
};

/**
 * Prefetch common pages on idle
 */
const prefetchCommonPages = () => {
    if ('requestIdleCallback' in window) {
        requestIdleCallback(() => {
            const pages = ['events.html', 'timeline.html', 'productions.html', 'place.html'];
            pages.forEach(page => prefetchPage(page));
        });
    }
};

/**
 * Initialize lazy loading on page load
 */
const initLazyLoading = () => {
    // Lazy load images when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', lazyLoadImages);
    } else {
        lazyLoadImages();
    }
    
    // Re-run when new content is added (for infinite scroll)
    // Call lazyLoadImages() after adding new content
    
    // Prefetch common pages on idle
    prefetchCommonPages();
};

// Auto-initialize
initLazyLoading();

// Export functions for use in other modules
window.lazyLoad = {
    images: lazyLoadImages,
    script: lazyLoadScript,
    css: lazyLoadCSS,
    module: lazyLoadModule,
    prefetch: prefetchPage,
};
