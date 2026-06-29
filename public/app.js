document.addEventListener('DOMContentLoaded', () => {
  initScrollspy();
  initTelemetryCounter();
  initProjectFilters();
  initFormConsole();
  initScrollToTop();
});

/**
 * 1. Scrollspy for Active Navigation Highlight
 */
function initScrollspy() {
  const sections = document.querySelectorAll('section');
  const navLinks = document.querySelectorAll('.nav-link');
  
  const options = {
    root: null,
    rootMargin: '-30% 0px -60% 0px', // Trigger when section occupies the middle portion
    threshold: 0
  };
  
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const id = entry.target.getAttribute('id');
        navLinks.forEach(link => {
          link.classList.remove('active');
          if (link.getAttribute('href') === `#${id}`) {
            link.classList.add('active');
          }
        });
      }
    });
  }, options);
  
  sections.forEach(section => {
    observer.observe(section);
  });
}

/**
 * 2. Simulated Dynamic Dashboard Telemetry
 * Slightly fluctuates stats to feel like a "live" analytics dashboard.
 */
function initTelemetryCounter() {
  const runsCount = document.getElementById('kpi-runs');
  const dbStatusWidget = document.getElementById('db-status-widget');
  
  if (!runsCount) return;
  
  // Simulated monthly run counter incrementing
  let currentRuns = parseInt(runsCount.textContent);
  setInterval(() => {
    // 5% chance of automated ETL job run simulation
    if (Math.random() > 0.95) {
      currentRuns += 1;
      runsCount.textContent = currentRuns;
      
      // Flash the kpi card green for positive event
      const parentCard = runsCount.closest('.kpi-mini-card');
      parentCard.style.borderColor = 'var(--accent-emerald)';
      parentCard.style.boxShadow = '0 0 10px rgba(16, 185, 129, 0.2)';
      setTimeout(() => {
        parentCard.style.borderColor = 'var(--panel-border)';
        parentCard.style.boxShadow = 'none';
      }, 1000);
    }
  }, 4000);

  // Fluctuating network latency text in footer
  const latencyWidget = document.querySelector('.footer-meta .meta-item:nth-child(2)');
  if (latencyWidget) {
    setInterval(() => {
      const randomLatency = Math.floor(Math.random() * 5) + 2; // 2ms to 6ms
      latencyWidget.innerHTML = `<i class="fa-solid fa-bolt"></i> LATENCY: ${randomLatency}ms`;
    }, 5000);
  }
}

/**
 * 3. Interactive Project Grid Filtering
 */
function initProjectFilters() {
  const filterButtons = document.querySelectorAll('.filter-btn');
  const projectCards = document.querySelectorAll('#projects-grid-container .project-card');
  
  filterButtons.forEach(button => {
    button.addEventListener('click', () => {
      // Toggle button active classes
      filterButtons.forEach(btn => btn.classList.remove('active'));
      button.classList.add('active');
      
      const filterValue = button.getAttribute('data-filter');
      
      projectCards.forEach(card => {
        const categories = card.getAttribute('data-category').split(' ');
        
        if (filterValue === 'all' || categories.includes(filterValue)) {
          // Show project card with simple fade animation
          card.style.display = 'flex';
          setTimeout(() => {
            card.style.opacity = '1';
            card.style.transform = 'translateY(0)';
          }, 50);
        } else {
          // Hide project card
          card.style.opacity = '0';
          card.style.transform = 'translateY(10px)';
          setTimeout(() => {
            card.style.display = 'none';
          }, 300);
        }
      });
    });
  });
}

/**
 * 4. Lead Gen Form Submission
 */
function initFormConsole() {
  const leadForm = document.getElementById('lead-form');
  const overlay = document.getElementById('form-overlay-container');
  const loaderContent = document.getElementById('loader-content');
  const successContent = document.getElementById('success-content');
  const consoleLogs = document.getElementById('console-logs');
  const successResetBtn = document.getElementById('btn-success-reset');
  const submitBtn = document.getElementById('btn-submit-form');
  const whatsappBtn = document.getElementById('btn-whatsapp');
  
  if (!leadForm) return;

  // Helper to construct WhatsApp message text based on current form state
  function buildWhatsAppMessage() {
    const nameVal = document.getElementById('user-name').value.trim();
    const companyVal = document.getElementById('company-name').value.trim();
    const emailVal = document.getElementById('user-email').value.trim();
    const phoneVal = document.getElementById('phone-number').value.trim();
    const typeVal = document.getElementById('project-type').value;
    const msgVal = document.getElementById('user-message').value.trim();
    
    return `Hello Rishik! I found your portfolio and would like to discuss a project with you. Please let me know when you're available.`;
  }

  // Handle WhatsApp button click
  if (whatsappBtn) {
    whatsappBtn.addEventListener('click', () => {
      const text = encodeURIComponent(buildWhatsAppMessage());
      window.open(`https://wa.me/919640929350?text=${text}`, '_blank');
    });
  }

  leadForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    // Grab Form inputs
    const nameInput = document.getElementById('user-name');
    const companyInput = document.getElementById('company-name');
    const emailInput = document.getElementById('user-email');
    const phoneInput = document.getElementById('phone-number');
    const typeInput = document.getElementById('project-type');
    const msgInput = document.getElementById('user-message');
    
    // Reset validation border styles for required fields
    [nameInput, emailInput, typeInput, msgInput].forEach(input => {
      input.classList.remove('is-invalid');
      input.style.borderColor = 'var(--panel-border)';
    });
    
    const nameVal = nameInput.value.trim();
    const companyVal = companyInput.value.trim();
    const emailVal = emailInput.value.trim();
    const phoneVal = phoneInput.value.trim();
    const typeVal = typeInput.value.trim();
    const msgVal = msgInput.value.trim();
    
    // Client-side Validation Rules
    let hasError = false;
    
    if (!nameVal) {
      nameInput.classList.add('is-invalid');
      nameInput.style.borderColor = 'var(--accent-rose)';
      hasError = true;
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailVal || !emailRegex.test(emailVal)) {
      emailInput.classList.add('is-invalid');
      emailInput.style.borderColor = 'var(--accent-rose)';
      hasError = true;
    }

    if (!typeVal) {
      typeInput.classList.add('is-invalid');
      typeInput.style.borderColor = 'var(--accent-rose)';
      hasError = true;
    }
    
    if (!msgVal || msgVal.length < 10) {
      msgInput.classList.add('is-invalid');
      msgInput.style.borderColor = 'var(--accent-rose)';
      hasError = true;
    }
    
    if (hasError) {
      showToast('Validation failed. Please verify the required fields.', 'error');
      return;
    }

    // Lock submit button to prevent duplicate submissions
    submitBtn.disabled = true;
    
    // Toggle Loading Overlay
    overlay.classList.add('active');
    loaderContent.style.display = 'block';
    successContent.style.display = 'none';
    if(consoleLogs) consoleLogs.style.display = 'none'; // hide fake console
    
    // Our custom backend API endpoint
    fetch('/api/contact', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        name: nameVal,
        email: emailVal,
        phone: phoneVal,
        company: companyVal,
        service: typeVal,
        message: msgVal
      })
    })
    .then(async (response) => {
      let json = await response.json();
      if (response.status === 200) {
        // Success
        loaderContent.style.display = 'none';
        successContent.style.display = 'block';
        showToast("Your inquiry has been submitted successfully. I'll contact you soon.", "success");
      } else {
        // Validation or Rate Limit Error
        overlay.classList.remove('active');
        submitBtn.disabled = false;
        showToast(json.message || "Failed to submit. Please try again.", "error");
      }
    })
    .catch(error => {
      // Network Error
      overlay.classList.remove('active');
      submitBtn.disabled = false;
      showToast("Network error. Please try again later.", "error");
    });
  });
  
  // Success Reset logic
  successResetBtn.addEventListener('click', () => {
    overlay.classList.remove('active');
    loaderContent.style.display = 'none';
    successContent.style.display = 'none';
    if(consoleLogs) consoleLogs.innerHTML = '';
    
    // Clear form inputs and restore submit button
    leadForm.reset();
    submitBtn.disabled = false;
  });
}

/**
 * Custom Toast Notification trigger
 */
function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  
  const icon = document.createElement('i');
  if (type === 'success') {
    icon.className = 'fa-solid fa-circle-check toast-icon';
  } else {
    icon.className = 'fa-solid fa-circle-exclamation toast-icon';
  }
  
  const content = document.createElement('div');
  content.className = 'toast-content';
  content.textContent = message;
  
  const closeBtn = document.createElement('button');
  closeBtn.className = 'toast-close';
  closeBtn.innerHTML = '&times;';
  closeBtn.onclick = () => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 400);
  };
  
  toast.appendChild(icon);
  toast.appendChild(content);
  toast.appendChild(closeBtn);
  
  container.appendChild(toast);
  
  // Force reflow
  toast.offsetHeight;
  
  toast.classList.add('show');
  
  // Auto-dismiss
  setTimeout(() => {
    if (toast.parentNode) {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 400);
    }
  }, 5000);
}

/**
 * 5. Page Up / Scroll-To-Top Toggler
 */
function initScrollToTop() {
  const scrollTopBtn = document.getElementById('scroll-to-top');
  if (!scrollTopBtn) return;
  
  window.addEventListener('scroll', () => {
    // Show button when scrolled down more than 300px
    if (window.scrollY > 300) {
      scrollTopBtn.classList.add('visible');
    } else {
      scrollTopBtn.classList.remove('visible');
    }
  });
  
  scrollTopBtn.addEventListener('click', () => {
    // Smooth scroll back to top of the page
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  });
}
