(function () {
  'use strict';

  /* ---------------------------------------------------------------------
     Mobile nav toggle
     --------------------------------------------------------------------- */
  var navToggle = document.getElementById('nav-toggle');
  var mainNav = document.getElementById('main-nav');
  if (navToggle && mainNav) {
    navToggle.addEventListener('click', function () {
      var isOpen = mainNav.classList.toggle('is-open');
      navToggle.setAttribute('aria-expanded', String(isOpen));
      navToggle.innerHTML = isOpen
        ? '<svg class="icon" aria-hidden="true"><use href="#icon-close"/></svg>'
        : '<svg class="icon" aria-hidden="true"><use href="#icon-menu"/></svg>';
    });
    mainNav.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', function () {
        mainNav.classList.remove('is-open');
        navToggle.setAttribute('aria-expanded', 'false');
        navToggle.innerHTML = '<svg class="icon" aria-hidden="true"><use href="#icon-menu"/></svg>';
      });
    });
  }

  /* ---------------------------------------------------------------------
     Scroll-reveal
     --------------------------------------------------------------------- */
  var revealEls = document.querySelectorAll('.reveal');
  if (revealEls.length && 'IntersectionObserver' in window) {
    var revealObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          revealObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    revealEls.forEach(function (el) { revealObserver.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add('is-visible'); });
  }

  /* ---------------------------------------------------------------------
     Product category tabs (Products page)
     --------------------------------------------------------------------- */
  var tabButtons = document.querySelectorAll('[data-tab-target]');
  var panels = document.querySelectorAll('[data-tab-panel]');
  if (tabButtons.length && panels.length) {
    tabButtons.forEach(function (btn) {
      btn.addEventListener('click', function () {
        var target = btn.getAttribute('data-tab-target');

        tabButtons.forEach(function (b) {
          var active = b === btn;
          b.classList.toggle('is-active', active);
          b.setAttribute('aria-selected', String(active));
        });
        panels.forEach(function (p) {
          p.classList.toggle('is-active', p.getAttribute('data-tab-panel') === target);
        });

        var url = new URL(window.location.href);
        url.searchParams.set('category', target);
        window.history.replaceState({}, '', url);
      });
    });
  }

  /* ---------------------------------------------------------------------
     RFQ form — AJAX submit with inline validation & status message
     --------------------------------------------------------------------- */
  var rfqForm = document.getElementById('rfq-form');
  if (rfqForm) {
    var statusBox = document.getElementById('rfq-status');
    var submitBtn = rfqForm.querySelector('[type="submit"]');

    // Pre-select product category from ?category= query param (arriving
    // from a product card's "Request a Quote" link).
    var params = new URLSearchParams(window.location.search);
    var presetCategory = params.get('category');
    if (presetCategory) {
      var select = rfqForm.querySelector('[name="productCategory"]');
      if (select && select.querySelector('option[value="' + presetCategory + '"]')) {
        select.value = presetCategory;
      }
    }

    function clearErrors() {
      rfqForm.querySelectorAll('.field').forEach(function (f) {
        f.classList.remove('has-error');
      });
    }

    function showStatus(kind, message) {
      statusBox.className = 'form-status is-visible form-status--' + kind;
      statusBox.textContent = message;
      statusBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    rfqForm.addEventListener('submit', function (e) {
      e.preventDefault();
      clearErrors();
      statusBox.className = 'form-status';

      submitBtn.disabled = true;
      submitBtn.textContent = 'Submitting…';

      // multipart/form-data (not JSON) so the optional drawing/spec
      // attachment rides along in the same request. Let the browser set
      // its own Content-Type with the multipart boundary.
      var formData = new FormData(rfqForm);

      fetch('/api/rfq', {
        method: 'POST',
        body: formData,
      })
        .then(function (res) { return res.json().then(function (data) { return { ok: res.ok, data: data }; }); })
        .then(function (result) {
          if (result.ok && result.data.success) {
            showStatus('success', result.data.message);
            rfqForm.reset();
          } else {
            if (result.data.errors) {
              Object.keys(result.data.errors).forEach(function (key) {
                var field = rfqForm.querySelector('[name="' + key + '"]');
                if (field) {
                  var wrap = field.closest('.field');
                  if (wrap) {
                    wrap.classList.add('has-error');
                    var errEl = wrap.querySelector('.field-error');
                    if (errEl) errEl.textContent = result.data.errors[key];
                  }
                }
              });
            }
            showStatus('error', result.data.message || 'Please correct the highlighted fields.');
          }
        })
        .catch(function () {
          showStatus('error', 'We could not reach the server. Please check your connection and try again.');
        })
        .finally(function () {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Submit RFQ';
        });
    });
  }

  /* ---------------------------------------------------------------------
     Sticky header shadow after scroll (subtle depth cue)
     --------------------------------------------------------------------- */
  var header = document.getElementById('site-header');
  if (header) {
    var onScroll = function () {
      header.classList.toggle('is-scrolled', window.scrollY > 8);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  /* ---------------------------------------------------------------------
     FAQ accordion
     --------------------------------------------------------------------- */
  document.querySelectorAll('.faq-item__q').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var answer = document.getElementById(btn.getAttribute('aria-controls'));
      var isOpen = btn.getAttribute('aria-expanded') === 'true';
      btn.setAttribute('aria-expanded', String(!isOpen));
      if (answer) answer.hidden = isOpen;
    });
  });

  /* ---------------------------------------------------------------------
     Back-to-top button
     --------------------------------------------------------------------- */
  var backToTop = document.getElementById('backtotop');
  if (backToTop) {
    var toggleBackToTop = function () {
      backToTop.classList.toggle('is-visible', window.scrollY > 600);
    };
    window.addEventListener('scroll', toggleBackToTop, { passive: true });
    toggleBackToTop();
    backToTop.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }
})();
