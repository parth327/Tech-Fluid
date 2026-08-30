(function () {
  'use strict';

  var bubble = document.getElementById('chatbot-bubble');
  var panel = document.getElementById('chatbot-panel');
  var closeBtn = document.getElementById('chatbot-close');
  var messagesEl = document.getElementById('chatbot-messages');
  var quickRepliesEl = document.getElementById('chatbot-quick-replies');
  var form = document.getElementById('chatbot-form');
  var input = document.getElementById('chatbot-input');

  if (!bubble || !panel) return;

  var kb = null; // knowledge base, fetched lazily on first open
  var kbPromise = null;
  var opened = false;

  // Guided "Get a Quote" flow state. `step` null = not in the flow.
  var flow = { step: null, data: {} };

  function fetchKb() {
    if (!kbPromise) {
      kbPromise = fetch('/api/chatbot-data').then(function (res) { return res.json(); });
    }
    return kbPromise;
  }

  function scrollToBottom() {
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function addMessage(text, from) {
    var bubbleEl = document.createElement('div');
    bubbleEl.className = 'chatbot-msg chatbot-msg--' + from;
    bubbleEl.textContent = text;
    messagesEl.appendChild(bubbleEl);
    scrollToBottom();
  }

  function addBotHtml(html) {
    var bubbleEl = document.createElement('div');
    bubbleEl.className = 'chatbot-msg chatbot-msg--bot';
    bubbleEl.innerHTML = html;
    messagesEl.appendChild(bubbleEl);
    scrollToBottom();
  }

  function typingThenBot(text, delay) {
    var typing = document.createElement('div');
    typing.className = 'chatbot-msg chatbot-msg--bot chatbot-msg--typing';
    typing.innerHTML = '<span></span><span></span><span></span>';
    messagesEl.appendChild(typing);
    scrollToBottom();
    setTimeout(function () {
      typing.remove();
      addMessage(text, 'bot');
    }, delay || 500);
  }

  function setQuickReplies(items) {
    quickRepliesEl.innerHTML = '';
    if (!items || items.length === 0) {
      quickRepliesEl.hidden = true;
      return;
    }
    quickRepliesEl.hidden = false;
    items.forEach(function (item) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'chatbot-chip';
      btn.textContent = item.label;
      btn.addEventListener('click', function () {
        addMessage(item.label, 'user');
        setQuickReplies([]);
        item.action();
      });
      quickRepliesEl.appendChild(btn);
    });
  }

  function mainMenu() {
    setQuickReplies([
      { label: '📦 Product Info', action: showProducts },
      { label: '💰 Get a Quote', action: startQuoteFlow },
      { label: '🏭 Industries We Serve', action: showIndustries },
      { label: '✅ Quality & Testing', action: showQuality },
      { label: '💬 Talk to a Human', action: showHuman },
    ]);
  }

  function showProducts() {
    fetchKb().then(function (data) {
      var lines = data.products.map(function (p) { return '<strong>' + p.name + '</strong> — ' + p.tagline; });
      typingThenBot('Here\u2019s our range:', 400);
      setTimeout(function () {
        addBotHtml(lines.join('<br><br>'));
        setQuickReplies([
          { label: 'Get a Quote', action: startQuoteFlow },
          { label: '⬅ Main Menu', action: mainMenu },
        ]);
      }, 700);
    });
  }

  function showIndustries() {
    fetchKb().then(function (data) {
      typingThenBot('We build for these industries:', 400);
      setTimeout(function () {
        addBotHtml(data.industries.map(function (i) { return '<strong>' + i.name + '</strong>'; }).join(' &middot; '));
        setQuickReplies([
          { label: 'Get a Quote', action: startQuoteFlow },
          { label: '⬅ Main Menu', action: mainMenu },
        ]);
      }, 700);
    });
  }

  function showQuality() {
    fetchKb().then(function (data) {
      typingThenBot('Every unit is tested before it ships:', 400);
      setTimeout(function () {
        var lines = data.quality.slice(0, 4).map(function (q) { return q.label + ': ' + q.value; });
        addBotHtml(lines.join('<br>'));
        setQuickReplies([
          { label: 'Get a Quote', action: startQuoteFlow },
          { label: '⬅ Main Menu', action: mainMenu },
        ]);
      }, 700);
    });
  }

  function showHuman() {
    fetchKb().then(function (data) {
      var wa = data.company.whatsapp ? data.company.whatsapp.replace(/\D/g, '') : '';
      var html = 'You can reach our team directly:<br><br>' +
        '📞 <a href="tel:' + data.company.phone.replace(/\s+/g, '') + '">' + data.company.phone + '</a><br>' +
        (wa ? '💬 <a href="https://wa.me/' + wa + '" target="_blank" rel="noopener">WhatsApp us</a><br>' : '') +
        '✉️ <a href="mailto:' + data.company.email + '">' + data.company.email + '</a>';
      typingThenBot('Sure \u2014', 350);
      setTimeout(function () {
        addBotHtml(html);
        setQuickReplies([{ label: '⬅ Main Menu', action: mainMenu }]);
      }, 600);
    });
  }

  /* ---------------------------------------------------------------------
     Guided "Get a Quote" flow — collects name, phone, category, message,
     then submits to the same /api/rfq endpoint the contact form uses.
     --------------------------------------------------------------------- */
  function startQuoteFlow() {
    flow = { step: 'name', data: {} };
    typingThenBot('Happy to help! What\u2019s your name?', 400);
    setQuickReplies([]);
    setTimeout(function () { input.focus(); }, 500);
  }

  function handleFlowInput(text) {
    if (flow.step === 'name') {
      flow.data.name = text;
      flow.step = 'phone';
      typingThenBot('Thanks, ' + text.split(' ')[0] + '! What\u2019s the best phone number to reach you?', 500);
      return true;
    }
    if (flow.step === 'phone') {
      flow.data.phone = text;
      flow.step = 'category';
      typingThenBot('Got it. Which product are you interested in?', 500);
      setTimeout(function () {
        setQuickReplies([
          { label: 'Hydraulic Cylinders', action: function () { pickCategory('cylinders', 'Hydraulic Cylinders'); } },
          { label: 'Power Packs', action: function () { pickCategory('power-packs', 'Power Packs'); } },
          { label: 'Jacks & Lifting', action: function () { pickCategory('jacks', 'Jacks & Lifting'); } },
          { label: 'Not Sure', action: function () { pickCategory('other', 'Not sure yet'); } },
        ]);
      }, 700);
      return true;
    }
    if (flow.step === 'message') {
      flow.data.message = text;
      submitQuote();
      return true;
    }
    return false;
  }

  function pickCategory(slug, label) {
    addMessage(label, 'user');
    flow.data.productCategory = slug;
    flow.step = 'message';
    typingThenBot('Last thing — anything specific about your requirement? (bore, stroke, pressure, tonnage, timeline — or just say "no")', 500);
    setTimeout(function () { input.focus(); }, 600);
  }

  function submitQuote() {
    typingThenBot('Submitting your request…', 300);
    var payload = {
      name: flow.data.name,
      phone: flow.data.phone,
      email: 'not-provided-via-chat@techfluidindustries.com',
      productCategory: flow.data.productCategory,
      message: flow.data.message === 'no' ? '' : ('(via chat widget) ' + flow.data.message),
      website: '', // honeypot field, always empty from the chat flow
    };

    fetch('/api/rfq', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
      .then(function (res) { return res.json().then(function (data) { return { ok: res.ok, data: data }; }); })
      .then(function (result) {
        setTimeout(function () {
          if (result.ok && result.data.success) {
            addBotHtml('✅ Got it! Our engineering team will reach out to <strong>' + flow.data.phone + '</strong> within one business day. You can also call us directly any time.');
          } else {
            addBotHtml('Hmm, I couldn\u2019t submit that automatically. Please call or WhatsApp us directly and we\u2019ll take it from there.');
          }
          flow = { step: null, data: {} };
          setQuickReplies([
            { label: '💬 Talk to a Human', action: showHuman },
            { label: '⬅ Main Menu', action: mainMenu },
          ]);
        }, 600);
      })
      .catch(function () {
        setTimeout(function () {
          addBotHtml('Network hiccup — please call or WhatsApp us directly and we\u2019ll take it from there.');
          flow = { step: null, data: {} };
          setQuickReplies([{ label: '💬 Talk to a Human', action: showHuman }, { label: '⬅ Main Menu', action: mainMenu }]);
        }, 600);
      });
  }

  /* ---------------------------------------------------------------------
     Free-text FAQ matching — simple keyword overlap scoring against the
     researched FAQ content, so typed questions get a real answer instead
     of only working through buttons.
     --------------------------------------------------------------------- */
  var STOPWORDS = ['the', 'a', 'an', 'is', 'are', 'do', 'does', 'you', 'your', 'what', 'how', 'i', 'to', 'for', 'of', 'and', 'my', 'on', 'in'];

  function tokenize(text) {
    return text.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(function (w) {
      return w.length > 2 && STOPWORDS.indexOf(w) === -1;
    });
  }

  // Crude stem: compare the first 5 characters so plural/verb-tense
  // variants still match ("cylinders" vs "cylinder", "test" vs "tested")
  // without pulling in a full stemming library for a chat widget.
  function stem(word) {
    return word.length > 5 ? word.slice(0, 5) : word;
  }

  function matchFaq(text, faqs) {
    var queryStems = tokenize(text).map(stem);
    if (queryStems.length === 0) return null;
    var best = null;
    var bestScore = 0;
    faqs.forEach(function (faq) {
      var faqStems = tokenize(faq.question + ' ' + faq.answer).map(stem);
      var score = 0;
      queryStems.forEach(function (w) {
        if (faqStems.indexOf(w) !== -1) score += 1;
      });
      // Question-word matches count double — the question is a much
      // stronger signal of topic than incidental words in a long answer.
      var questionStems = tokenize(faq.question).map(stem);
      queryStems.forEach(function (w) {
        if (questionStems.indexOf(w) !== -1) score += 1;
      });
      if (score > bestScore) {
        bestScore = score;
        best = faq;
      }
    });
    return bestScore >= 2 ? best : null;
  }

  function handleFreeText(text) {
    if (handleFlowInput(text)) return;

    fetchKb().then(function (data) {
      var match = matchFaq(text, data.faqs);
      if (match) {
        typingThenBot(match.answer, 500);
        setTimeout(function () {
          setQuickReplies([{ label: '💬 Talk to a Human', action: showHuman }, { label: '⬅ Main Menu', action: mainMenu }]);
        }, 800);
      } else {
        typingThenBot('I\u2019m not sure about that one \u2014 but our team can help directly.', 500);
        setTimeout(function () {
          setQuickReplies([
            { label: '💬 Talk to a Human', action: showHuman },
            { label: '💰 Get a Quote', action: startQuoteFlow },
            { label: '⬅ Main Menu', action: mainMenu },
          ]);
        }, 800);
      }
    });
  }

  /* ---------------------------------------------------------------------
     Open / close + wiring
     --------------------------------------------------------------------- */
  function openChat() {
    panel.hidden = false;
    bubble.classList.add('is-open');
    bubble.setAttribute('aria-expanded', 'true');
    if (!opened) {
      opened = true;
      typingThenBot('Hi! I\u2019m the Tech Fluid Industries assistant. How can I help?', 350);
      setTimeout(mainMenu, 700);
    }
    setTimeout(function () { input.focus(); }, 200);
  }

  function closeChat() {
    panel.hidden = true;
    bubble.classList.remove('is-open');
    bubble.setAttribute('aria-expanded', 'false');
  }

  bubble.addEventListener('click', function () {
    if (panel.hidden) openChat(); else closeChat();
  });
  if (closeBtn) closeBtn.addEventListener('click', closeChat);

  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var text = input.value.trim();
      if (!text) return;
      addMessage(text, 'user');
      input.value = '';
      handleFreeText(text);
    });
  }

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !panel.hidden) closeChat();
  });
})();
