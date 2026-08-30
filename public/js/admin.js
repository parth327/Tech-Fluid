(function () {
  'use strict';

  /* ---------------------------------------------------------------------
     Toast notifications — stacked, so a quick sequence of actions (e.g.
     several status changes) doesn't clobber each other.
     --------------------------------------------------------------------- */
  var toastStack = document.getElementById('admin-toast-stack');
  function showToast(message, kind) {
    if (!toastStack) return;
    var el = document.createElement('div');
    el.className = 'admin-toast-item admin-toast-item--' + (kind || 'success');
    el.textContent = message;
    toastStack.appendChild(el);
    requestAnimationFrame(function () { el.classList.add('is-visible'); });
    setTimeout(function () {
      el.classList.remove('is-visible');
      setTimeout(function () { el.remove(); }, 250);
    }, 3200);
  }

  /* ---------------------------------------------------------------------
     Keyboard shortcut: "/" focuses the search box (unless already typing
     in a field), Escape closes any open modal.
     --------------------------------------------------------------------- */
  var searchInput = document.getElementById('search-input');
  document.addEventListener('keydown', function (e) {
    if (e.key === '/' && searchInput && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
      e.preventDefault();
      searchInput.focus();
    }
  });

  /* ---------------------------------------------------------------------
     Expand / collapse lead detail rows
     --------------------------------------------------------------------- */
  document.querySelectorAll('.js-toggle-detail').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var id = btn.getAttribute('data-lead-id');
      var detail = document.getElementById('detail-' + id);
      if (!detail) return;
      var isOpen = btn.getAttribute('aria-expanded') === 'true';
      detail.hidden = isOpen;
      btn.setAttribute('aria-expanded', String(!isOpen));
      btn.classList.toggle('is-open', !isOpen);
    });
  });

  /* ---------------------------------------------------------------------
     Status change (AJAX, no page reload)
     --------------------------------------------------------------------- */
  document.querySelectorAll('.js-status-select').forEach(function (select) {
    select.addEventListener('change', function () {
      var id = select.getAttribute('data-lead-id');
      var newStatus = select.value;
      var previous = select.getAttribute('data-status');
      select.disabled = true;

      fetch('/admin/api/rfq/' + id + '/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
        .then(function (res) { return res.json().then(function (data) { return { ok: res.ok, data: data }; }); })
        .then(function (result) {
          if (result.ok && result.data.success) {
            select.setAttribute('data-status', newStatus);
            showToast('Status updated to "' + newStatus + '".', 'success');
          } else {
            select.value = previous;
            showToast(result.data.message || 'Could not update status.', 'error');
            if (result.data.message && result.data.message.indexOf('log in') !== -1) {
              setTimeout(function () { window.location.href = '/admin/login'; }, 1200);
            }
          }
        })
        .catch(function () {
          select.value = previous;
          showToast('Network error — status not updated.', 'error');
        })
        .finally(function () {
          select.disabled = false;
        });
    });
  });

  /* ---------------------------------------------------------------------
     Save internal notes (AJAX)
     --------------------------------------------------------------------- */
  document.querySelectorAll('.js-save-notes').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var id = btn.getAttribute('data-lead-id');
      var field = document.getElementById('notes-' + id);
      if (!field) return;
      var original = btn.textContent;
      btn.disabled = true;
      btn.textContent = 'Saving…';

      fetch('/admin/api/rfq/' + id + '/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: field.value }),
      })
        .then(function (res) { return res.json().then(function (data) { return { ok: res.ok, data: data }; }); })
        .then(function (result) {
          if (result.ok && result.data.success) {
            showToast('Notes saved.', 'success');
          } else {
            showToast(result.data.message || 'Could not save notes.', 'error');
          }
        })
        .catch(function () {
          showToast('Network error — notes not saved.', 'error');
        })
        .finally(function () {
          btn.disabled = false;
          btn.textContent = original;
        });
    });
  });

  /* ---------------------------------------------------------------------
     Delete a single lead — custom confirm modal, then AJAX DELETE
     --------------------------------------------------------------------- */
  var modal = document.getElementById('delete-modal');
  var confirmBtn = document.getElementById('confirm-delete-btn');
  var pendingDeleteId = null;

  function removeLeadFromDom(id) {
    var row = document.querySelector('.admin-lead-row[data-lead-id="' + id + '"]');
    var detailRow = document.getElementById('detail-' + id);
    if (row) row.remove();
    if (detailRow) detailRow.remove();
    var mobileCheckbox = document.querySelector('.admin-lead-card input.admin-row-check[value="' + id + '"]');
    if (mobileCheckbox) {
      var card = mobileCheckbox.closest('.admin-lead-card');
      if (card) card.remove();
    }
  }

  function openModal(id) {
    pendingDeleteId = id;
    if (modal) modal.hidden = false;
  }
  function closeModal() {
    pendingDeleteId = null;
    if (modal) modal.hidden = true;
  }

  document.querySelectorAll('.js-delete-lead').forEach(function (btn) {
    btn.addEventListener('click', function () {
      openModal(btn.getAttribute('data-lead-id'));
    });
  });
  document.querySelectorAll('.js-close-modal').forEach(function (el) {
    el.addEventListener('click', closeModal);
  });

  if (confirmBtn) {
    confirmBtn.addEventListener('click', function () {
      if (!pendingDeleteId) return;
      var id = pendingDeleteId;
      confirmBtn.disabled = true;
      confirmBtn.textContent = 'Deleting…';

      fetch('/admin/api/rfq/' + id, { method: 'DELETE' })
        .then(function (res) { return res.json().then(function (data) { return { ok: res.ok, data: data }; }); })
        .then(function (result) {
          if (result.ok && result.data.success) {
            removeLeadFromDom(id);
            showToast('Lead deleted.', 'success');
          } else {
            showToast(result.data.message || 'Could not delete lead.', 'error');
          }
        })
        .catch(function () {
          showToast('Network error — lead not deleted.', 'error');
        })
        .finally(function () {
          confirmBtn.disabled = false;
          confirmBtn.textContent = 'Delete';
          closeModal();
        });
    });
  }

  /* ---------------------------------------------------------------------
     Bulk selection + bulk actions
     --------------------------------------------------------------------- */
  var bulkBar = document.getElementById('bulk-bar');
  var bulkCountEl = document.getElementById('bulk-count');
  var selectAll = document.getElementById('select-all');
  var bulkStatusSelect = document.getElementById('bulk-status-select');
  var bulkDeleteBtn = document.getElementById('bulk-delete-btn');
  var bulkClearBtn = document.getElementById('bulk-clear-btn');
  var bulkModal = document.getElementById('bulk-delete-modal');
  var bulkDeleteCountEl = document.getElementById('bulk-delete-count');
  var confirmBulkDeleteBtn = document.getElementById('confirm-bulk-delete-btn');

  function getRowChecks() {
    // A lead can appear twice in the DOM (desktop row + mobile card) — we
    // de-duplicate by value so a lead selected via either view counts once.
    var seen = {};
    return Array.from(document.querySelectorAll('.admin-row-check')).filter(function (cb) {
      if (seen[cb.value]) return false;
      seen[cb.value] = true;
      return true;
    });
  }

  function syncCheckboxesForId(id, checked) {
    document.querySelectorAll('.admin-row-check[value="' + id + '"]').forEach(function (cb) {
      cb.checked = checked;
    });
  }

  function updateBulkBar() {
    var checks = getRowChecks();
    var selected = checks.filter(function (cb) { return cb.checked; });
    if (bulkCountEl) bulkCountEl.textContent = String(selected.length);
    if (bulkBar) bulkBar.classList.toggle('is-visible', selected.length > 0);
  }

  document.querySelectorAll('.admin-row-check').forEach(function (cb) {
    cb.addEventListener('change', function () {
      syncCheckboxesForId(cb.value, cb.checked);
      updateBulkBar();
      if (selectAll && !cb.checked) selectAll.checked = false;
    });
  });

  if (selectAll) {
    selectAll.addEventListener('change', function () {
      getRowChecks().forEach(function (cb) {
        cb.checked = selectAll.checked;
        syncCheckboxesForId(cb.value, selectAll.checked);
      });
      updateBulkBar();
    });
  }

  function selectedIds() {
    return getRowChecks().filter(function (cb) { return cb.checked; }).map(function (cb) { return cb.value; });
  }

  function clearSelection() {
    document.querySelectorAll('.admin-row-check').forEach(function (cb) { cb.checked = false; });
    if (selectAll) selectAll.checked = false;
    updateBulkBar();
  }

  if (bulkClearBtn) bulkClearBtn.addEventListener('click', clearSelection);

  if (bulkStatusSelect) {
    bulkStatusSelect.addEventListener('change', function () {
      var status = bulkStatusSelect.value;
      var ids = selectedIds();
      if (!status || ids.length === 0) return;
      bulkStatusSelect.disabled = true;

      fetch('/admin/api/rfq/bulk/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: ids, status: status }),
      })
        .then(function (res) { return res.json().then(function (data) { return { ok: res.ok, data: data }; }); })
        .then(function (result) {
          if (result.ok && result.data.success) {
            ids.forEach(function (id) {
              document.querySelectorAll('.js-status-select[data-lead-id="' + id + '"]').forEach(function (sel) {
                sel.value = status;
                sel.setAttribute('data-status', status);
              });
              document.querySelectorAll('.status-select[data-lead-id="' + id + '"]').forEach(function (pill) {
                pill.setAttribute('data-status', status);
                pill.textContent = status;
              });
            });
            showToast('Updated ' + result.data.changed + ' lead(s) to "' + status + '".', 'success');
            clearSelection();
          } else {
            showToast(result.data.message || 'Could not update leads.', 'error');
          }
        })
        .catch(function () {
          showToast('Network error — leads not updated.', 'error');
        })
        .finally(function () {
          bulkStatusSelect.disabled = false;
          bulkStatusSelect.value = '';
        });
    });
  }

  if (bulkDeleteBtn) {
    bulkDeleteBtn.addEventListener('click', function () {
      var ids = selectedIds();
      if (ids.length === 0) return;
      if (bulkDeleteCountEl) bulkDeleteCountEl.textContent = String(ids.length);
      if (bulkModal) bulkModal.hidden = false;
    });
  }
  document.querySelectorAll('.js-close-bulk-modal').forEach(function (el) {
    el.addEventListener('click', function () { if (bulkModal) bulkModal.hidden = true; });
  });

  if (confirmBulkDeleteBtn) {
    confirmBulkDeleteBtn.addEventListener('click', function () {
      var ids = selectedIds();
      if (ids.length === 0) return;
      confirmBulkDeleteBtn.disabled = true;
      confirmBulkDeleteBtn.textContent = 'Deleting…';

      fetch('/admin/api/rfq/bulk/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: ids }),
      })
        .then(function (res) { return res.json().then(function (data) { return { ok: res.ok, data: data }; }); })
        .then(function (result) {
          if (result.ok && result.data.success) {
            ids.forEach(removeLeadFromDom);
            showToast('Deleted ' + result.data.deleted + ' lead(s).', 'success');
            clearSelection();
          } else {
            showToast(result.data.message || 'Could not delete leads.', 'error');
          }
        })
        .catch(function () {
          showToast('Network error — leads not deleted.', 'error');
        })
        .finally(function () {
          confirmBulkDeleteBtn.disabled = false;
          confirmBulkDeleteBtn.textContent = 'Delete All';
          if (bulkModal) bulkModal.hidden = true;
        });
    });
  }

  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    if (modal && !modal.hidden) closeModal();
    if (bulkModal && !bulkModal.hidden) bulkModal.hidden = true;
  });
})();
