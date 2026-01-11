// Initialize Supabase client (only needed on pages with waitlist form)
let supabase = null;
if (typeof window.supabase !== 'undefined') {
  const { createClient } = window.supabase;
  supabase = createClient(
    'https://roxtlerjyeftjdfcqtmi.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJveHRsZXJqeWVmdGpkZmNxdG1pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE3Nzg4NjIsImV4cCI6MjA3NzM1NDg2Mn0.Dj3qhP3tHPKUBAAadpN2b9dD9iolbPqk3wlsslRpj1o'
  );
}

// Track user metadata (UTM params and location)
// Track user metadata (UTM params and location)
async function trackUserMetadata() {
  const params = new URLSearchParams(window.location.search);
  const utmKeys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'];

  // Store UTM parameters
  utmKeys.forEach(key => {
    if (params.has(key)) {
      localStorage.setItem(key, params.get(key));
    }
  });

  // Return a promise that resolves when location data is available
  try {
    const res = await fetch('https://ipinfo.io/json?token=88ecb60e4e95cc');
    const data = await res.json();

    // Store in local storage for later use (e.g. forms)
    localStorage.setItem('user_city', data.city || '');
    localStorage.setItem('user_region', data.region || '');
    localStorage.setItem('user_zip', data.postal || '');

    // Return all data including IP
    return {
      ip: data.ip,
      city: data.city,
      region: data.region,
      country: data.country,
      loc: data.loc,
      org: data.org,
      postal: data.postal,
      timezone: data.timezone
    };
  } catch (err) {
    console.warn('Location fetch failed:', err);
    localStorage.setItem('user_city', '');
    localStorage.setItem('user_region', '');
    localStorage.setItem('user_zip', '');
    return null;
  }
}

// Track visit to Supabase
async function trackVisit() {
  if (!supabase) return;

  try {
    const locationData = await trackUserMetadata();

    // Construct metadata object
    const metadata = {
      timestamp: new Date().toISOString(),
      url: window.location.href,
      referrer: document.referrer,
      userAgent: navigator.userAgent,
      ...locationData // spread location data which includes IP if available
    };

    // Insert into track_visitors table
    const { error } = await supabase
      .from('track_visitors')
      .insert([{ metadata: metadata }]); // Assuming column name is 'metadata'

    if (error) {
      console.error('Error tracking visit:', error);
    } else {
      console.log('Visit tracked successfully');
    }

  } catch (err) {
    console.error('Tracking failed:', err);
  }
}

// Run tracking on page load
// Use DOMContentLoaded to ensure Supabase might be ready if it was deferred, 
// though here it is initialized at the top.
document.addEventListener('DOMContentLoaded', () => {
  trackVisit();
});

// Mobile navigation toggle
const navToggle = document.querySelector('.nav-toggle');
const navMenu = document.querySelector('.nav-links');

if (navToggle && navMenu) {
  navToggle.addEventListener('click', () => {
    const isOpen = navMenu.classList.toggle('open');
    navToggle.setAttribute('aria-expanded', isOpen);
  });
}

// Add scrolled class to nav on scroll
const nav = document.querySelector('nav');
window.addEventListener('scroll', () => {
  if (nav) {
    if (window.scrollY > 50) {
      nav.classList.add('scrolled');
    } else {
      nav.classList.remove('scrolled');
    }
  }
});

// Intersection Observer for fade-in animations (homepage)
const observerOptions = {
  threshold: 0.1,
  rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.style.opacity = '1';
      entry.target.style.transform = 'translateY(0)';
    }
  });
}, observerOptions);

document.querySelectorAll('.feature-card, .stat-card').forEach(el => {
  el.style.opacity = '0';
  el.style.transform = 'translateY(20px)';
  el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
  observer.observe(el);
});

// Waitlist form submission (homepage only)
const waitlistForm = document.getElementById('waitlistForm');
if (waitlistForm && supabase) {
  waitlistForm.addEventListener('submit', async function (e) {
    e.preventDefault();

    // Ensure tracking data is loaded
    await trackUserMetadata();

    const emailInput = document.getElementById('email');
    const submitBtn = document.getElementById('submitBtn');
    const formNote = document.getElementById('formNote');
    const sourceInput = document.getElementById('source');

    const email = emailInput.value.trim();

    // Validation
    if (!email) {
      formNote.textContent = 'Please enter your email address.';
      formNote.classList.add('error');
      return;
    }

    // Disable button and show loading state
    submitBtn.disabled = true;
    submitBtn.textContent = 'Joining...';

    // Get tracking data from localStorage
    const utm_source = localStorage.getItem('utm_source') || '';
    const utm_medium = localStorage.getItem('utm_medium') || '';
    const utm_campaign = localStorage.getItem('utm_campaign') || '';
    const utm_term = localStorage.getItem('utm_term') || '';
    const utm_content = localStorage.getItem('utm_content') || '';
    const user_city = localStorage.getItem('user_city') || '';
    const user_region = localStorage.getItem('user_region') || '';
    const user_zip = localStorage.getItem('user_zip') || '';

    const payload = {
      email,
      name: '', // Empty since we removed it
      role: sourceInput ? sourceInput.value : 'guest', // Use source if available, otherwise guest
      utm_source,
      utm_medium,
      utm_campaign,
      utm_term,
      utm_content,
      user_city,
      user_region,
      user_zip
    };

    console.log('Submitting payload:', payload);

    try {
      const { error } = await supabase.from('waitlist').insert([payload]);

      if (error) throw error;

      // Success - show success message and reset form
      formNote.textContent = '✓ Success! Check your email for next steps.';
      formNote.classList.remove('error');
      formNote.style.color = '#10b981';
      emailInput.value = '';

      // Re-enable button after 2 seconds
      setTimeout(() => {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Join waitlist';
        formNote.textContent = "You'll receive priority booking when we launch in Q1 2026";
        formNote.style.color = '';
      }, 3000);

    } catch (error) {
      console.error('Submission error:', error);

      // Check if it's a duplicate email error
      if (error.code === '23505' || error.message.includes('duplicate')) {
        formNote.textContent = "You're already on the waitlist! Check your email for updates.";
      } else {
        formNote.textContent = 'Submission failed. Please try again or contact us at hello@maisonly.io';
      }

      formNote.classList.add('error');

      // Re-enable button
      submitBtn.disabled = false;
      submitBtn.textContent = 'Join waitlist';
    }
  });
}

// Tab switching functionality (FAQ page only)
const tabs = document.querySelectorAll('.tab');
const sections = document.querySelectorAll('.faq-section');

if (tabs.length > 0 && sections.length > 0) {
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      // Remove active class from all tabs and sections
      tabs.forEach(t => t.classList.remove('active'));
      sections.forEach(s => s.classList.remove('active'));

      // Add active class to clicked tab
      tab.classList.add('active');

      // Show corresponding section
      const targetId = tab.getAttribute('data-tab');
      const targetSection = document.getElementById(targetId);
      if (targetSection) {
        targetSection.classList.add('active');
      }
    });
  });
}