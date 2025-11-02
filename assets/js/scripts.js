// Initialize Supabase client (only needed on pages with waitlist form)
let supabase = null;
if (typeof window.supabase !== 'undefined') {
  const { createClient } = window.supabase;
  supabase = createClient(
    'https://roxtlerjyeftjdfcqtmi.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJveHRsZXJqeWVmdGpkZmNxdG1pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE3Nzg4NjIsImV4cCI6MjA3NzM1NDg2Mn0.Dj3qhP3tHPKUBAAadpN2b9dD9iolbPqk3wlsslRpj1o'
  );
}

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
  waitlistForm.addEventListener('submit', async function(e) {
    e.preventDefault();

    const nameInput = document.getElementById('name');
    const emailInput = document.getElementById('email');
    const roleSelect = document.getElementById('role');
    const submitBtn = document.getElementById('submitBtn');
    const formNote = document.getElementById('formNote');

    const name = nameInput.value.trim();
    const email = emailInput.value.trim();
    const role = roleSelect.value;

    // Validation
    if (!name || !email || !role) {
      formNote.textContent = 'Please fill in all fields.';
      formNote.classList.add('error');
      return;
    }

    // Disable button and show loading state
    submitBtn.disabled = true;
    submitBtn.textContent = 'Joining...';

    try {
      const { error } = await supabase
        .from('waitlist')
        .insert([{ name, email, role }]);

      if (error) {
        throw error;
      }

      // Success - redirect to survey
      const guestForm = 'https://forms.gle/faNkDNyr5DWmUFWW6';
      const studentForm = 'https://forms.gle/j2tSD7F1EjgwMei4A';
      const redirectUrl = role === 'student' ? studentForm : guestForm;
      window.location.href = redirectUrl;
      
    } catch (error) {
      console.error('Submission error:', error);
      formNote.textContent = 'Submission failed. Please try again or contact us directly at hello@maisonly.io';
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