You are a senior SaaS engineer, UX designer, CRO specialist, and gamification expert.

Your task is to upgrade my existing "Premium Spin & Win v2.0" application while preserving all existing functionality, UI quality, animations, and responsiveness.

CURRENT FEATURES:

* Lead capture form
* Weighted probability wheel
* Coupon distribution system
* Admin dashboard
* CSV export
* LocalStorage persistence
* Glassmorphism design
* Responsive mobile-first interface
* Real-time wheel customization
* Lead tracking (IP, country, city, browser, language, resolution)

OBJECTIVE:
Transform the product into a premium commercial-grade marketing tool that can be sold as a high-value SaaS-style digital product.

REQUIREMENTS:

1. CLOUD DATABASE

* Replace LocalStorage with Supabase (preferred) or Firebase.
* Real-time synchronization.
* Multi-device access.
* Secure storage of leads, coupons, and settings.
* Database schema creation.
* Row-level security.
* Environment variables configuration.

2. ANTI-FRAUD SYSTEM

* One spin per verified email.
* Temporary email detection.
* Duplicate email prevention.
* Duplicate IP detection.
* Device fingerprinting.
* Cooldown system.
* Fraud attempt logging.

3. EMAIL VERIFICATION

* Verification code sent before spinning.
* Verification status stored in database.
* Prevent spin until verification is completed.

4. ADVANCED ANALYTICS DASHBOARD
   Create beautiful KPI cards:

* Total Leads
* Spins Today
* Spins This Month
* Conversion Rate
* Prize Distribution
* Most Won Prize
* Top Countries
* Coupon Usage Rate
* Returning Visitors

Include:

* Interactive charts
* Date filtering
* Export analytics to CSV

5. MARKETING AUTOMATION INTEGRATIONS
   Create connectors for:

* Mailchimp
* Klaviyo
* Brevo
* Shopify
* WooCommerce

Allow automatic lead synchronization.

6. ADVANCED CAMPAIGN TRIGGERS

* Exit intent popup
* Delayed popup trigger
* Scroll percentage trigger
* Click trigger
* Purchase completion trigger
* Manual trigger button

7. PREMIUM REWARD SYSTEM
   Add:

* Unlimited prizes
* Prize inventory management
* Coupon expiration dates
* Auto-generated coupon codes
* QR code generation
* Referral rewards

8. PROFESSIONAL THEMES
   Create ready-made themes:

* Luxury Black & Gold
* Modern SaaS
* Neon Cyberpunk
* Black Friday
* Christmas
* Valentine's Day
* Minimal Clean

Theme switcher must work instantly.

9. MULTI-LANGUAGE SYSTEM
   Support:

* English
* French
* Spanish
* German
* Arabic

All texts editable from admin panel.

10. UX IMPROVEMENTS

* Smooth micro-interactions
* Confetti animations
* Sound controls
* Accessibility support
* Mobile-first optimization
* Loading skeletons
* Success animations

11. ADMIN PANEL IMPROVEMENTS
    Add:

* Search leads
* Filter leads
* Sort leads
* Bulk actions
* Lead notes
* Campaign management
* User management
* Backup & restore

12. SECURITY

* Secure API communication
* XSS protection
* CSRF protection
* Rate limiting
* Input sanitization
* Secure authentication

13. PERFORMANCE

* Lazy loading
* Asset optimization
* Code splitting
* Fast rendering
* Lighthouse score above 95

OUTPUT FORMAT:
Generate complete production-ready code architecture, database structure, folder organization, UI improvements, implementation plan, and all necessary files while maintaining the current visual identity and ensuring enterprise-level quality.

The final result should feel comparable to premium SaaS marketing tools and justify a selling price between $99 and $199.
