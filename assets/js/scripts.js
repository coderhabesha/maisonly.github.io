// Initialize Supabase client (only needed on pages with waitlist form)
let supabaseClient = null;
if (typeof window.supabase !== "undefined") {
  const { createClient } = window.supabase;
  supabaseClient = createClient(
    "https://roxtlerjyeftjdfcqtmi.supabase.co",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJveHRsZXJqeWVmdGpkZmNxdG1pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE3Nzg4NjIsImV4cCI6MjA3NzM1NDg2Mn0.Dj3qhP3tHPKUBAAadpN2b9dD9iolbPqk3wlsslRpj1o",
  );
}

// Track user metadata (UTM params and location)
async function trackUserMetadata() {
  const params = new URLSearchParams(window.location.search);
  const utmKeys = [
    "utm_source",
    "utm_medium",
    "utm_campaign",
    "utm_term",
    "utm_content",
  ];

  // Store UTM parameters
  utmKeys.forEach((key) => {
    if (params.has(key)) {
      localStorage.setItem(key, params.get(key));
    }
  });

  // Return a promise that resolves when location data is available
  try {
    const res = await fetch("https://ipinfo.io/json?token=88ecb60e4e95cc");
    const data = await res.json();

    // Store in local storage for later use (e.g. forms)
    localStorage.setItem("user_city", data.city || "");
    localStorage.setItem("user_region", data.region || "");
    localStorage.setItem("user_zip", data.postal || "");

    // Return all data including IP
    return {
      ip: data.ip,
      city: data.city,
      region: data.region,
      country: data.country,
      loc: data.loc,
      org: data.org,
      postal: data.postal,
      timezone: data.timezone,
    };
  } catch (err) {
    console.warn("Location fetch failed:", err);
    localStorage.setItem("user_city", "");
    localStorage.setItem("user_region", "");
    localStorage.setItem("user_zip", "");
    return null;
  }
}

function applyVariant() {
  const params = new URLSearchParams(window.location.search);
  const variant = params.get("utm_content");

  if (!variant) return;

  const swapMap = {
    "emerging-chef": {
      ".chef-label": "emerging chef",
      ".chef-label-cap": "Emerging Chef",
      ".testimonial-quote": '"The whole experience felt incredibly high-end. Our chef was an absolute pro and the plating was gorgeous."',
      ".testimonial-author": "— Recent host, San Francisco"
    },
    "student-chef": {
      ".chef-label": "student chef",
      ".chef-label-cap": "Student Chef",
    },
  };

  const swaps = swapMap[variant];
  if (!swaps) return;

  Object.entries(swaps).forEach(([selector, text]) => {
    document.querySelectorAll(selector).forEach((el) => {
      el.textContent = text;
    });
  });
}

// Track visit to Supabase
async function trackVisit() {
  if (!supabaseClient) {
    console.warn("Supabase client not initialized");
    return;
  }

  try {
    const locationData = await trackUserMetadata();


    // Construct metadata object
    const ip_info = {
      timestamp: new Date().toISOString(),
      url: window.location.href,
      referrer: document.referrer,
      userAgent: navigator.userAgent,
      ...locationData, // spread location data which includes IP if available
    };

    console.log("Attempting to track visit with data:", ip_info); // Add logging

    // Insert into track_visitors table
    const { data, error } = await supabaseClient
      .from("track_visitors")
      .insert([{ ip_info: ip_info }]);

    if (error) {
      console.error("Error tracking visit:", error);
    } else {
      console.log("Visit tracked successfully", data);
    }
  } catch (err) {
    console.error("Tracking failed:", err);
  }
}

// Run tracking on page load
if (typeof window !== "undefined") {
  // Use window.onload to ensure Supabase script is fully loaded
  window.addEventListener("load", () => {
    // Add a small delay to ensure Supabase client is initialized
    setTimeout(() => {
      trackVisit();
    }, 100);
  });
}

// Apply variant immediately since the script is deferred and DOM is ready
applyVariant();

const navToggle = document.getElementById("navToggle");
const navMenu = document.querySelector(".nav-links");

if (navToggle && navMenu) {
  navToggle.addEventListener("click", () => {
    const isOpen = navMenu.classList.toggle("open");
    navToggle.setAttribute("aria-expanded", isOpen);
  });
}

document.addEventListener("click", (e) => {
  if (navToggle && navMenu && navMenu.classList.contains("open")) {
    if (!navToggle.contains(e.target) && !navMenu.contains(e.target)) {
      navMenu.classList.remove("open");
      navToggle.setAttribute("aria-expanded", false);
    }
  }
});

// Add scrolled class to nav on scroll
const nav = document.querySelector("nav");
window.addEventListener("scroll", () => {
  if (nav) {
    if (window.scrollY > 50) {
      nav.classList.add("scrolled");
    } else {
      nav.classList.remove("scrolled");
    }
  }
});

// Intersection Observer for fade-in animations (homepage)
const observerOptions = {
  threshold: 0.1,
  rootMargin: "0px 0px -50px 0px",
};

const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.style.opacity = "1";
      entry.target.style.transform = "translateY(0)";
    }
  });
}, observerOptions);

document.querySelectorAll(".feature-card, .stat-card").forEach((el) => {
  el.style.opacity = "0";
  el.style.transform = "translateY(20px)";
  el.style.transition = "opacity 0.6s ease, transform 0.6s ease";
  observer.observe(el);
});

// Waitlist form submission (homepage only)
const waitlistForm = document.getElementById("waitlistForm");
if (waitlistForm && supabaseClient) {
  waitlistForm.addEventListener("submit", async function (e) {
    e.preventDefault();

    // Ensure tracking data is loaded
    await trackUserMetadata();

    const emailInput = document.getElementById("email");
    const submitBtn = document.getElementById("submitBtn");
    const formNote = document.getElementById("formNote");
    const sourceInput = document.getElementById("source");

    const email = emailInput.value.trim();

    // Validation
    if (!email) {
      formNote.textContent = "Please enter your email address.";
      formNote.classList.add("error");
      return;
    }

    // Disable button and show loading state
    submitBtn.disabled = true;
    submitBtn.textContent = "Requesting...";

    // Get tracking data from localStorage
    const utm_source = localStorage.getItem("utm_source") || "";
    const utm_medium = localStorage.getItem("utm_medium") || "";
    const utm_campaign = localStorage.getItem("utm_campaign") || "";
    const utm_term = localStorage.getItem("utm_term") || "";
    const utm_content = localStorage.getItem("utm_content") || "";
    const user_city = localStorage.getItem("user_city") || "";
    const user_region = localStorage.getItem("user_region") || "";
    const user_zip = localStorage.getItem("user_zip") || "";

    const payload = {
      email,
      name: "", // Empty since we removed it
      role: sourceInput ? sourceInput.value : "guest", // Use source if available, otherwise guest
      utm_source,
      utm_medium,
      utm_campaign,
      utm_term,
      utm_content,
      user_city,
      user_region,
      user_zip,
    };

    console.log("Submitting payload:", payload);

    try {
      const { error } = await supabaseClient.from("waitlist").insert([payload]);

      if (error) throw error;

      // --- GOOGLE ADS CONVERSION TRACKING ---
      if (typeof gtag === "function") {
        gtag("event", "conversion", {
          send_to: "AW-959510559/31lkCJCpmYEcEJ_ww8kD",
        });
      }

      // Success - show success message and reset form
      formNote.textContent = "✓ Success! Check your email for next steps.";
      formNote.classList.remove("error");
      formNote.style.color = "#10b981";
      emailInput.value = "";

      // Re-enable button after 3 seconds
      setTimeout(() => {
        submitBtn.disabled = false;
        submitBtn.textContent = "Claim $60 Off →";
        formNote.textContent =
          "We'll be in touch shortly to plan your menu and secure your date.";
        formNote.style.color = "";
      }, 3000);
    } catch (error) {
      console.error("Submission error:", error);

      // Check if it's a duplicate email error
      if (error.code === "23505" || error.message.includes("duplicate")) {
        formNote.textContent =
          "We already have your request! We'll be in touch very soon.";
      } else {
        formNote.textContent =
          "Submission failed. Please try again or contact us at hello@maisonly.io";
      }

      formNote.classList.add("error");

      // Re-enable button
      submitBtn.disabled = false;
      submitBtn.textContent = "Claim $60 Off →";
    }
  });
}

// Tab switching functionality (FAQ page only)
const tabs = document.querySelectorAll(".tab");
const sections = document.querySelectorAll(".faq-section");

if (tabs.length > 0 && sections.length > 0) {
  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      // Remove active class from all tabs and sections
      tabs.forEach((t) => t.classList.remove("active"));
      sections.forEach((s) => s.classList.remove("active"));

      // Add active class to clicked tab
      tab.classList.add("active");

      // Show corresponding section
      const targetId = tab.getAttribute("data-tab");
      const targetSection = document.getElementById(targetId);
      if (targetSection) {
        targetSection.classList.add("active");
      }
    });
  });
}

// ── Email Popup ──
(function () {
  const popup = document.getElementById('emailPopup');
  const closeBtn = document.getElementById('popupClose');
  const form = document.getElementById('popupForm');
  const emailInput = document.getElementById('popupEmail');
  const submitBtn = document.getElementById('popupSubmit');
  const note = document.getElementById('popupNote');

  if (!popup || !supabaseClient) return;

  const STORAGE_KEY = 'maisonly_popup_seen';

  // Don't show if already signed up or dismissed recently
  if (localStorage.getItem(STORAGE_KEY)) return;

  // Show after 6 seconds
  const timer = setTimeout(() => {
    popup.classList.add('active');
    emailInput.focus();
  }, 6000);

  function closePopup() {
    popup.classList.remove('active');
    clearTimeout(timer);
    localStorage.setItem(STORAGE_KEY, '1');
  }

  closeBtn.addEventListener('click', closePopup);
  popup.addEventListener('click', (e) => {
    if (e.target === popup) closePopup();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closePopup();
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = emailInput.value.trim();
    if (!email) return;

    submitBtn.disabled = true;
    submitBtn.textContent = 'Requesting...';

    const utm_source = localStorage.getItem('utm_source') || '';
    const utm_medium = localStorage.getItem('utm_medium') || '';
    const utm_campaign = localStorage.getItem('utm_campaign') || '';
    const utm_content = localStorage.getItem('utm_content') || '';
    const user_city = localStorage.getItem('user_city') || '';
    const user_region = localStorage.getItem('user_region') || '';
    const user_zip = localStorage.getItem('user_zip') || '';

    try {
      const { error } = await supabaseClient.from('waitlist').insert([{
        email, name: '', role: 'guest',
        utm_source, utm_medium, utm_campaign, utm_content,
        user_city, user_region, user_zip,
      }]);

      if (error && error.code !== '23505') throw error;

      if (typeof gtag === 'function') {
        gtag('event', 'conversion', { send_to: 'AW-959510559/31lkCJCpmYEcEJ_ww8kD' });
      }

      note.textContent = '✓ We\'ll be in touch within 24 hours!';
      emailInput.value = '';
      localStorage.setItem(STORAGE_KEY, '1');

      setTimeout(closePopup, 2500);

    } catch (err) {
      note.style.color = '#ef4444';
      note.textContent = 'Something went wrong — try again or email hello@maisonly.io';
      submitBtn.disabled = false;
      submitBtn.textContent = 'Let\'s Plan Your Dinner →';
    }
  });
})();