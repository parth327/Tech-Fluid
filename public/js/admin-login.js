(function () {
  'use strict';

  var toggle = document.getElementById('toggle-password');
  var input = document.getElementById('password');
  var eyeIcon = document.getElementById('eye-icon');
  var eyeUse = eyeIcon ? eyeIcon.querySelector('use') : null;

  if (toggle && input && eyeUse) {
    toggle.addEventListener('click', function () {
      var showing = input.type === 'text';
      input.type = showing ? 'password' : 'text';
      toggle.setAttribute('aria-pressed', String(!showing));
      toggle.setAttribute('aria-label', showing ? 'Show password' : 'Hide password');
      eyeUse.setAttribute('href', showing ? '#icon-eye' : '#icon-eye-off');
    });
  }

  var form = document.getElementById('login-form');
  var submitBtn = document.getElementById('login-submit');
  if (form && submitBtn) {
    form.addEventListener('submit', function () {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Signing in…';
    });
  }
})();
