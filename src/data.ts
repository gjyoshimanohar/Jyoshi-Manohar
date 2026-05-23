import { Service, BlogPost } from './types';

export const services: Service[] = [
 {
 id: '1',
 title: 'Business Advisory',
 description: 'Strategic advice on business restructuring, mergers & acquisitions, and corporate governance for growth-oriented firms.',
 iconName: 'BarChart'
 },
 {
 id: '2',
 title: 'Startup Advisory',
 description: 'End-to-end support for startups including incorporation, funding consultancy, and specialized financial management.',
 iconName: 'Rocket'
 },
 {
 id: '3',
 title: 'Taxation Services',
 description: 'Expert guidance on Direct and Indirect tax planning, compliance, and representation for individuals and corporates.',
 iconName: 'Calculator'
 },
 {
 id: '4',
 title: 'Audit & Assurance',
 description: 'Internal audits and comprehensive assurance services to ensure financial integrity and compliance.',
 iconName: 'ShieldCheck'
 },
 {
 id: '5',
 title: 'Compliance Services',
 description: 'Expert guidance on corporate compliance, regulatory filings, and statutory requirements for seamless operations.',
 iconName: 'ClipboardCheck'
 }
];

export const blogPosts: BlogPost[] = [
 {
 id: '1',
 title: 'Navigating New Tax Amendments for 2026',
 slug: 'tax-amendments-2026',
 excerpt: 'A deep dive into the recent changes in individual and corporate tax structures and how they impact your financial planning.',
 category: 'Taxation',
 date: 'May 10, 2026',
 readTime: '6 min read',
 content: `
# Navigating New Tax Amendments for 2026

The landscape of professional taxation is shifting rapidly. With the new 2026 amendments, both individuals and business owners need to be more vigilant than ever...

### Key Changes to Watch
1. **Digital Asset Taxation**: Closer scrutiny on cross-border crypto transactions.
2. **Standard Deduction Revisions**: Incremental benefits for the middle-income bracket.
3. **Corporate Surcharge Reductions**: Encouraging reinvestment in local manufacturing.

As a Semi-Qualified Chartered Accountant, I recommend reviewing your portfolio before the next quarter...
 `
 },
 {
 id: '2',
 title: '5 Financial Mistakes Startups Should Avoid',
 slug: 'startup-financial-mistakes',
 excerpt: 'Common pitfalls early-stage founders face and how internal audits can save your business from costly errors.',
 category: 'Business Strategy',
 date: 'April 22, 2026',
 readTime: '4 min read',
 content: `
# 5 Financial Mistakes Startups Should Avoid

Building a startup is exhilarating, but financial missteps can ground your vision before it takes flight.

### 1. Mixing Personal and Business Expenses
One of the most frequent issues I see is the lack of a clear boundary between founder funds and company capital...

### 2. Ignoring Cash Flow Projections
Profit is not the same as cash. Many profitable companies fail because they couldn't pay their bills on time...
 `
 },
 {
 id: '3',
 title: 'The Role of AI in Modern Auditing',
 slug: 'ai-in-auditing',
 excerpt: 'Exploring how artificial intelligence is enhancing accuracy and risk detection in internal auditing processes.',
 category: 'Technology',
 date: 'March 15, 2026',
 readTime: '5 min read',
 content: `
# The Role of AI in Modern Auditing

Artificial Intelligence is no longer a future concept—it is here, and it is revolutionizing the accounting path. From sample selection to anomaly detection, AI tools are making audits more robust...
 `
 },
 {
 id: '4',
 title: 'New GST Rule Alert: Understanding Section 74A of the CGST Act (Effective FY 2024–25)',
 slug: 'understanding-section-74a-cgst-act',
 excerpt: 'A comprehensive guide to the newly introduced Section 74A of the CGST Act, its impact on GST compliance, demand, and recovery from FY 2024-25.',
 category: 'Taxation',
 date: '17 Jun 2025',
 readTime: '7 min read',
 content: `
# New GST Rule Alert: Understanding Section 74A of the CGST Act (Effective FY 2024–25)

If you’re a business owner, finance professional, or GST practitioner, **Section 74A** of the Central Goods and Services Tax (CGST) Act, 2017 is one update you need to pay attention to. Brought in by the **Finance Act (No. 2), 2024**, this new section simplifies the process of dealing with GST short payments and incorrect input tax credit (ITC) claims — especially from **FY 2024–25 onward**.

In this blog, we break down what Section 74A means, why it matters, and how it changes the landscape of GST compliance.

## 🚢 What Is Section 74A All About?

Until now, GST law had two separate routes to handle tax discrepancies:

- **Section 73**: For cases without fraud or wilful misstatement
- **Section 74**: For cases with fraud, suppression, or intent to evade tax

This split often led to confusion and procedural delays. With the introduction of **Section 74A**, the government has unified these processes into a **single, streamlined framework** — making it simpler, faster, and more predictable.

✅ **Effective Date**: Applicable for all tax periods starting **April 1, 2024** (i.e., FY 2024–25 onwards).

## 📋 When Does Section 74A Apply?

Section 74A kicks in when a **proper officer** believes there has been:

- **Short payment or non-payment of tax**
- **Erroneous refund**
- **Wrongly availed or utilized ITC**

This could be due to errors or fraudulent intent — and the section has built-in mechanisms to handle both situations differently but within the same framework.

🔍 **Important**: If the tax amount involved is less than **₹1,000**, no notice will be issued.

## 📅 Timelines You Should Know

- **Notice Issuance**: Within **42 months** from the due date of the **annual return** or the **erroneous refund date**, whichever applies.
- **Order Issuance**: Within **12 months** from the date of SCN. The Commissioner can extend this by **6 more months**, if needed.

## ⚖️ Penalty & Relief Structure Under Section 74A

The section clearly distinguishes between **honest mistakes** and **fraudulent conduct**, offering **graduated reliefs** to encourage early compliance.

### 🟢 If No Fraud Is Involved

| Timing | What You Pay | Penalty | Outcome |
| :--- | :--- | :--- | :--- |
| Before SCN | Tax + Interest | ❌ No | SCN not issued |
| Within 60 days of SCN | Tax + Interest | ❌ No | Proceedings closed |

### 🔴 If Fraud/Suppression Is Involved

| Timing | What You Pay | Penalty | Outcome |
| :--- | :--- | :--- | :--- |
| Before SCN | Tax + Interest + 15% penalty | ✅ 15% | SCN not issued |
| Within 60 days of SCN | Tax + Interest + 25% penalty | ✅ 25% | Proceedings closed |
| Within 60 days of order | Tax + Interest + 50% penalty | ✅ 50% | Proceedings closed |

💡 **Pro Tip**: Voluntary payment before a show cause notice can help you **avoid unnecessary penalties and litigation**.

## 💻 Other Highlights

- If your voluntary payment is **less than the correct amount**, the officer can still issue an SCN for the **balance**.
- If tax collected or self-assessed tax is unpaid for over **30 days**, you are **automatically liable** for the applicable penalty.

## 🚀 Why This Matters for Businesses

Section 74A is a welcome change for businesses and tax professionals who’ve long dealt with procedural inconsistencies in GST enforcement. Here's why it matters:

- ✅ **Single procedure** regardless of intent (error or fraud)
- ✅ **Clear deadlines** for SCN and orders
- ✅ **Opportunity to settle early and save on penalties**
- ✅ **Reduced ambiguity and litigation risks**

In short, the new provision promotes **compliance over confrontation** — a step forward for taxpayer convenience and efficient administration.

## ✍️ Final Thoughts

With GST compliance tightening year by year, **Section 74A** represents a smart shift in tax governance — aligning enforcement with fairness. Whether you're a taxpayer or advisor, understanding this section will be critical to navigating assessments and reducing exposure to penalties.

Make sure your systems, records, and processes are up to date from **FY 2024–25 onward**, and stay proactive in addressing any discrepancies.

Need help assessing your GST risk under the new rules? Consult our team of GST experts early and stay ahead of the curve.

*Stay tuned for more updates on GST law and tax reform. For personalized guidance, feel free to reach out in the comments or connect directly!*
 `
 }
];
