// ========================================
// Patisserie Rose Pale - Main JavaScript
// ========================================

document.addEventListener('DOMContentLoaded', function() {

  // --- Header scroll behavior ---
  const header = document.getElementById('site-header');
  
  function handleScroll() {
    if (window.scrollY > 80) {
      header.classList.add('scrolled');
      header.classList.remove('header-transparent');
    } else {
      header.classList.remove('scrolled');
      if (document.body.id === 'page-top') {
        header.classList.add('header-transparent');
      }
    }

    // Back to top button
    const backToTop = document.getElementById('back-to-top');
    if (backToTop) {
      if (window.scrollY > 400) {
        backToTop.classList.add('visible');
      } else {
        backToTop.classList.remove('visible');
      }
    }
  }

  window.addEventListener('scroll', handleScroll, { passive: true });
  handleScroll(); // run once on load

  // --- Hamburger menu ---
  const hamburgerBtn = document.getElementById('hamburger-btn');
  const navOverlay = document.getElementById('nav-overlay');

  if (hamburgerBtn && navOverlay) {
    hamburgerBtn.addEventListener('click', function() {
      hamburgerBtn.classList.toggle('open');
      navOverlay.classList.toggle('open');
      document.body.style.overflow = navOverlay.classList.contains('open') ? 'hidden' : '';
    });

    // Close on nav link click
    navOverlay.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', function() {
        hamburgerBtn.classList.remove('open');
        navOverlay.classList.remove('open');
        document.body.style.overflow = '';
      });
    });

    // Close on overlay background click
    navOverlay.addEventListener('click', function(e) {
      if (e.target === navOverlay) {
        hamburgerBtn.classList.remove('open');
        navOverlay.classList.remove('open');
        document.body.style.overflow = '';
      }
    });
  }

  // --- Hero ken-burns effect ---
  const heroSection = document.querySelector('.hero-section');
  if (heroSection) {
    setTimeout(() => {
      heroSection.classList.add('loaded');
    }, 100);
  }

  // --- Scroll reveal animations ---
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
      }
    });
  }, {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
  });

  document.querySelectorAll('.fade-in-up, .fade-in').forEach(el => {
    observer.observe(el);
  });

  // --- Back to top ---
  const backToTop = document.getElementById('back-to-top');
  if (backToTop) {
    backToTop.addEventListener('click', function() {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  // --- Stagger fade-in for grids ---
  const staggerGroups = document.querySelectorAll('.product-grid, .gallery-grid');
  staggerGroups.forEach(group => {
    const children = group.querySelectorAll('.product-card, .gallery-item');
    children.forEach((child, i) => {
      child.style.transitionDelay = `${i * 0.08}s`;
      child.classList.add('fade-in-up');
      observer.observe(child);
    });
  });

  // --- Gallery Slider ---
  const slider = document.getElementById('gallery-slider');
  const slides = document.querySelectorAll('.gallery-slide');
  const prevBtn = document.getElementById('slider-prev');
  const nextBtn = document.getElementById('slider-next');
  const dotsContainer = document.getElementById('slider-dots');

  if (slider && slides.length > 0) {
    let currentSlide = 0;
    let slideInterval;

    function showSlide(index) {
      if (index >= slides.length) {
        currentSlide = 0;
      } else if (index < 0) {
        currentSlide = slides.length - 1;
      } else {
        currentSlide = index;
      }

      slides.forEach((slide, i) => {
        if (i === currentSlide) {
          slide.classList.add('active');
        } else {
          slide.classList.remove('active');
        }
      });

      const dots = dotsContainer.querySelectorAll('.slider-dot');
      dots.forEach((dot, i) => {
        if (i === currentSlide) {
          dot.classList.add('active');
        } else {
          dot.classList.remove('active');
        }
      });
    }

    function nextSlide() {
      showSlide(currentSlide + 1);
    }

    function prevSlide() {
      showSlide(currentSlide - 1);
    }

    function startAutoSlide() {
      stopAutoSlide();
      slideInterval = setInterval(nextSlide, 5000);
    }

    function stopAutoSlide() {
      if (slideInterval) {
        clearInterval(slideInterval);
      }
    }

    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        nextSlide();
        startAutoSlide();
      });
    }

    if (prevBtn) {
      prevBtn.addEventListener('click', () => {
        prevSlide();
        startAutoSlide();
      });
    }

    if (dotsContainer) {
      dotsContainer.innerHTML = '';
      slides.forEach((_, i) => {
        const dot = document.createElement('span');
        dot.classList.add('slider-dot');
        if (i === 0) dot.classList.add('active');
        dot.addEventListener('click', () => {
          showSlide(i);
          startAutoSlide();
        });
        dotsContainer.appendChild(dot);
      });
    }

    const sliderContainer = document.querySelector('.gallery-slider-container');
    if (sliderContainer) {
      sliderContainer.addEventListener('mouseenter', stopAutoSlide);
      sliderContainer.addEventListener('mouseleave', startAutoSlide);
      
      let startX = 0;
      let endX = 0;
      
      sliderContainer.addEventListener('touchstart', (e) => {
        startX = e.touches[0].clientX;
      }, { passive: true });
      
      sliderContainer.addEventListener('touchend', (e) => {
        endX = e.changedTouches[0].clientX;
        const diffX = startX - endX;
        if (Math.abs(diffX) > 50) {
          if (diffX > 0) {
            nextSlide();
          } else {
            prevSlide();
          }
          startAutoSlide();
        }
      }, { passive: true });
    }

    startAutoSlide();
  }

});
