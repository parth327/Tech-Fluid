// data/content.js
// Static marketing/spec content shared between routes and views. Kept as
// plain data (not hardcoded in templates) so product specs stay in one
// place and are easy to correct or extend later — swap this module for
// database-backed queries if the catalog needs to change without a
// deploy.

const products = [
  {
    slug: 'cylinders',
    image: '/images/products/cylinder.svg',
    tabLabel: 'Hydraulic Cylinders',
    name: 'Precision Hydraulic Cylinders',
    tagline: 'Single & double acting cylinders engineered to your bore, stroke and mounting spec.',
    description:
      'Built for earthmoving, material handling and heavy manufacturing duty cycles. ' +
      'Every cylinder is machined in-house and matched to the pressure and side-load ' +
      'requirements of the application before it leaves the shop floor.',
    variants: ['Single Acting', 'Double Acting', 'Earthmoving Duty', 'Welded Body', 'Tie-Rod Body'],
    specs: [
      { label: 'Bore Range', value: '25 mm – 400 mm' },
      { label: 'Stroke Length', value: 'Up to 6,000 mm' },
      { label: 'Working Pressure', value: '3,000 – 5,000 PSI (207–345 Bar)' },
      { label: 'Seal Type', value: 'PU / NBR, custom seal kits' },
      { label: 'Mounting Style', value: 'Flange, Trunnion, Clevis, Foot' },
    ],
    icon: 'cylinder',
  },
  {
    slug: 'power-packs',
    image: '/images/products/power-pack.svg',
    tabLabel: 'Power Packs',
    name: 'Hydraulic Power Packs (HPUs)',
    tagline: 'Custom-engineered power units, from compact bench HPUs to high-pressure industrial packs.',
    description:
      'Motor, pump, reservoir, valve bank and controls integrated as a single tested unit. ' +
      'Configured around your flow rate, duty cycle and control scheme — manual, ' +
      'solenoid or PLC-interfaced.',
    variants: ['Compact Bench HPU', 'High-Pressure Industrial Pack', 'Mobile / Skid-Mounted', 'Twin-Pump Units'],
    specs: [
      { label: 'Motor Rating', value: '1 HP – 100 HP' },
      { label: 'Flow Rate', value: '2 – 250 LPM' },
      { label: 'Working Pressure', value: 'Up to 5,000 PSI (345 Bar)' },
      { label: 'Reservoir', value: '20 L – 1,000 L, MS / SS' },
      { label: 'Control', value: 'Manual, Solenoid, PLC-ready' },
    ],
    icon: 'powerpack',
  },
  {
    slug: 'jacks',
    image: '/images/products/jack.svg',
    tabLabel: 'Jacks & Lifting',
    name: 'Hydraulic Jacks & Lifting Equipment',
    tagline: 'High-tonnage portable and industrial jacks built for repeatable, safe lifting.',
    description:
      'From site-portable bottle jacks to fixed industrial lifting stations. Load-tested ' +
      'to rated tonnage before dispatch, with safety overload margins built into every ' +
      'ram design.',
    variants: ['Portable Bottle Jacks', 'Industrial Toe Jacks', 'Synchronous Lifting Sets', 'Custom Ram Assemblies'],
    specs: [
      { label: 'Capacity', value: '5 – 500 Tonnes' },
      { label: 'Stroke', value: '50 – 500 mm' },
      { label: 'Working Pressure', value: 'Up to 700 Bar (10,000 PSI)' },
      { label: 'Construction', value: 'Alloy Steel, Hard-Chrome Ram' },
      { label: 'Mounting Style', value: 'Portable, Base-Plate, Flanged' },
    ],
    icon: 'jack',
  },
];

const industries = [
  {
    slug: 'construction',
    image: '/images/industries/construction.svg',
    name: 'Construction & Earthmoving',
    description: 'Excavator, loader and crane cylinders engineered for continuous off-road duty cycles and side-load resistance.',
    icon: 'excavator',
  },
  {
    slug: 'manufacturing',
    image: '/images/industries/manufacturing.svg',
    name: 'Manufacturing Presses',
    description: 'High-tonnage press cylinders and power packs built for repeatable stamping, forging and moulding pressure.',
    icon: 'press',
  },
  {
    slug: 'material-handling',
    image: '/images/industries/material-handling.svg',
    name: 'Material Handling',
    description: 'Lift, tilt and clamp cylinders for forklifts, stackers and conveyor systems in high-cycle environments.',
    icon: 'forklift',
  },
  {
    slug: 'marine',
    image: '/images/industries/marine.svg',
    name: 'Marine',
    description: 'Corrosion-resistant steering, hatch and winch cylinders built in stainless steel for saltwater exposure.',
    icon: 'marine',
  },
  {
    slug: 'mining',
    image: '/images/industries/mining.svg',
    name: 'Mining',
    description: 'Heavy-duty rams and power packs rated for abrasive, high-shock loads in underground and open-pit operations.',
    icon: 'mining',
  },
];

const qualityChecks = [
  { label: 'Test Pressure', value: '1.5 \u00d7 Rated Working Pressure' },
  { label: 'Hold Time', value: '5 minutes, zero leakage tolerance' },
  { label: 'Load Test', value: '100% of rated tonnage / thrust' },
  { label: 'Surface Finish', value: 'Ra \u2264 0.4 \u03bcm on rod \u0026 bore' },
  { label: 'Material Traceability', value: 'Mill-certified alloy \u0026 stainless steel' },
  { label: 'Standards Reference', value: 'Designed to ISO 4413 \u0026 ISO 6020/6022 principles' },
];

const whyChooseUs = [
  {
    title: 'Custom Engineering',
    description: 'Every cylinder, HPU and jack is specified to your bore, stroke, pressure and mounting — not pulled from a generic catalog.',
    icon: 'blueprint',
  },
  {
    title: '100% Pre-Dispatch Testing',
    description: 'Every unit is leak-tested and load-tested at 1.5\u00d7 rated pressure before it ships — no exceptions.',
    icon: 'gauge',
  },
  {
    title: 'Alloy & Stainless Construction',
    description: 'Rod and barrel materials matched to the duty cycle, from hard-chrome alloy steel to marine-grade stainless.',
    icon: 'shield',
  },
  {
    title: 'Pan-India Logistics',
    description: 'Dispatch and technical support that reaches project sites and production floors across the country, fast.',
    icon: 'truck',
  },
];

const trustBadges = [
  '15+ Years of Engineering Experience',
  '100% Pressure-Tested Before Dispatch',
  'Custom Bore & Stroke on Every Order',
];

const stats = [
  { value: '15+', label: 'Years Engineering Hydraulics' },
  { value: '03', label: 'Core Product Lines' },
  { value: '100%', label: 'Units Pressure-Tested' },
  { value: '2009', label: 'Founded in Ahmedabad' },
];

const processSteps = [
  {
    title: 'Enquiry & Spec Review',
    description: 'Send your bore, stroke, pressure or tonnage requirement. Our engineers confirm feasibility within one business day.',
    icon: 'quote',
  },
  {
    title: 'Drawing & Approval',
    description: 'We draft to your mounting and duty-cycle requirement and share a drawing for sign-off before cutting any steel.',
    icon: 'blueprint',
  },
  {
    title: 'Manufacturing',
    description: 'Machined and assembled in-house at Kathwada GIDC, with material traceability logged against your order.',
    icon: 'cylinder',
  },
  {
    title: 'Pressure & Load Testing',
    description: 'Every unit is tested at 1.5\u00d7 rated working pressure with zero leakage tolerance before it\u2019s cleared to ship.',
    icon: 'gauge',
  },
  {
    title: 'Dispatch & Support',
    description: 'Packed and dispatched pan-India, with our engineering team on call for install or commissioning questions.',
    icon: 'truck',
  },
];

const faqs = [
  {
    question: 'What\u2019s the difference between NBR and polyurethane (PU) seals?',
    answer:
      'NBR (nitrile) is the standard choice for mineral-oil hydraulic systems up to roughly ' +
      '100\u00b0C and costs less than PU for an equivalent seal profile. Polyurethane holds up ' +
      'far better under abrasion and high-cycle duty \u2014 the usual pick for dusty earthmoving ' +
      'or high-speed rod applications. For high-temperature or synthetic-fluid systems, FKM ' +
      '(fluoroelastomer) seals are specified instead. We select seal material against your ' +
      'fluid, temperature and duty cycle rather than defaulting to one type.',
  },
  {
    question: 'What surface finish and tolerance do you hold on bore and rod?',
    answer:
      'Cylinder bores are honed to Ra 0.2\u20130.8 \u03bcm with bore tolerance held to H8/H9. Piston ' +
      'rods are ground and hard-chrome plated (or nitrided) to Ra 0.1\u20130.4 \u03bcm with an h9 rod ' +
      'tolerance \u2014 the fits recommended for reciprocating hydraulic seals under ISO 5597. ' +
      'Tighter fits are used for cold-climate or high-pressure applications where seal ' +
      'contraction or extrusion is a risk.',
  },
  {
    question: 'What pressure is a cylinder tested at before it ships?',
    answer:
      'Every cylinder and power pack is proof-tested at 1.5\u00d7 its rated working pressure for ' +
      'a minimum 5-minute hold, with zero leakage tolerance at any seal point \u2014 standard ' +
      'practice across the hydraulics industry, and one we apply to 100% of units, not a ' +
      'sample batch.',
  },
  {
    question: 'Welded body, tie-rod, or telescopic \u2014 which construction do I need?',
    answer:
      'Welded-body cylinders handle the highest pressures and suit permanent, high-load ' +
      'installations. Tie-rod construction costs less and allows seals to be replaced in the ' +
      'field \u2014 common on presses and general industrial machinery. Telescopic cylinders give ' +
      'a long stroke from a short retracted length, typically for tipper and dump-body ' +
      'applications. We\u2019ll recommend the right construction once we know your pressure, ' +
      'mounting envelope and service-access needs.',
  },
  {
    question: 'How is the force a cylinder can produce calculated?',
    answer:
      'Force = Pressure \u00d7 Area (F = P\u00d7A). On the extend stroke, area is the full bore ' +
      'circle; on retract, it\u2019s the annular area between bore and rod. Because seal friction ' +
      'and backpressure absorb some of that force in practice, we size for 85\u201395% mechanical ' +
      'efficiency rather than the theoretical number \u2014 and size toward the higher end of that ' +
      'range whenever the application can\u2019t tolerate a shortfall.',
  },
  {
    question: 'What standards do your cylinders and power packs follow?',
    answer:
      'Design follows ISO 4413 (general rules and safety requirements for hydraulic fluid ' +
      'power systems) and ISO 6020/6022 (mounting and port dimensions), with seal housings ' +
      'to ISO 5597 where interchangeability matters. For customers on NFPA/JIC standards, we ' +
      'build to that interchange spec instead \u2014 tell us which one your fleet uses when you ' +
      'send an RFQ.',
  },
];

module.exports = { products, industries, qualityChecks, whyChooseUs, trustBadges, stats, processSteps, faqs };
