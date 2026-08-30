const express = require('express');
const router = express.Router();
const {
  products, industries, qualityChecks, whyChooseUs, trustBadges, stats, processSteps, faqs,
} = require('../data/content');

router.get('/', (req, res) => {
  res.render('index', {
    pageTitle: 'Hydraulic Cylinder Manufacturer in Ahmedabad | Tech Fluid Industries',
    metaDescription:
      'Tech Fluid Industries designs and manufactures custom hydraulic cylinders, ' +
      'power packs and industrial jacks in Ahmedabad, India, since 2009. ' +
      '100% pressure-tested, pan-India delivery.',
    products,
    industries,
    whyChooseUs,
    trustBadges,
    qualityChecks,
    stats,
    processSteps,
    faqs,
    breadcrumb: null,
  });
});

router.get('/about', (req, res) => {
  res.render('about', {
    pageTitle: 'About Us | Tech Fluid Industries',
    metaDescription:
      'Since 2009, Tech Fluid Industries has engineered custom hydraulic cylinders, ' +
      'power packs and lifting equipment from Ahmedabad, Gujarat for customers across India.',
    whyChooseUs,
    breadcrumb: 'About Us',
  });
});

router.get('/products', (req, res) => {
  const activeSlug = ['cylinders', 'power-packs', 'jacks'].includes(req.query.category)
    ? req.query.category
    : products[0].slug;

  res.render('products', {
    pageTitle: 'Hydraulic Cylinders, Power Packs & Jacks | Tech Fluid Industries',
    metaDescription:
      'Browse Tech Fluid Industries\u2019 hydraulic product range: precision cylinders, ' +
      'custom power packs (HPUs) and high-tonnage hydraulic jacks, all built and ' +
      'pressure-tested in Ahmedabad, India.',
    products,
    activeSlug,
    breadcrumb: 'Products',
  });
});

router.get('/applications', (req, res) => {
  res.render('applications', {
    pageTitle: 'Industries We Serve | Tech Fluid Industries',
    metaDescription:
      'From construction and earthmoving to marine and mining \u2014 see how Tech Fluid ' +
      'Industries\u2019 hydraulic cylinders and power packs perform across demanding industries.',
    industries,
    breadcrumb: 'Applications',
  });
});

router.get('/quality', (req, res) => {
  res.render('quality', {
    pageTitle: 'Quality Assurance & Testing | Tech Fluid Industries',
    metaDescription:
      'Every hydraulic cylinder, power pack and jack from Tech Fluid Industries is ' +
      '100% leak-tested and load-tested before dispatch. See our full QA protocol.',
    qualityChecks,
    faqs,
    breadcrumb: 'Quality',
  });
});

router.get('/contact', (req, res) => {
  const activeSlug = ['cylinders', 'power-packs', 'jacks'].includes(req.query.category)
    ? req.query.category
    : '';

  res.render('contact', {
    pageTitle: 'Request a Quote | Tech Fluid Industries',
    metaDescription:
      'Get a custom quote on hydraulic cylinders, power packs or jacks from Tech Fluid ' +
      'Industries, Ahmedabad. Tell us your bore, stroke, pressure or tonnage requirement.',
    products,
    activeSlug,
    submitted: false,
    breadcrumb: 'Contact',
  });
});

// Read-only knowledge base for the site-wide chat widget (public/js/chatbot.js).
// Kept as a small, purpose-built payload rather than reusing the full
// content module directly, so the chatbot stays fast and the answers stay
// deliberately short — chat bubbles are not the place for full spec sheets.
router.get('/api/chatbot-data', (req, res) => {
  res.json({
    company: {
      phone: res.locals.company.phone,
      whatsapp: res.locals.company.whatsapp,
      email: res.locals.company.email,
    },
    products: products.map((p) => ({
      slug: p.slug,
      name: p.name,
      tagline: p.tagline,
      specs: p.specs,
    })),
    industries: industries.map((i) => ({ name: i.name, description: i.description })),
    quality: qualityChecks,
    faqs,
  });
});

module.exports = router;
