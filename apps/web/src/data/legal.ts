export interface LegalSection {
  id: string;
  title: string;
  paragraphs: string[];
  bullets?: string[];
}

export const LEGAL_UPDATED = "12 September 2026";

export const TERMS_SECTIONS: LegalSection[] = [
  {
    id: "about",
    title: "1. About GraceRun",
    paragraphs: [
      "GraceRun is a grocery delivery service for students at The Chinese University of Hong Kong (CUHK). We match customer orders from Fusion supermarket with independent student runners who pick up items and deliver them to college hall lobbies.",
      "By creating an account or placing an order, you agree to these Terms & Conditions, our Refund / Cancellation Policy, and our Privacy Policy.",
    ],
  },
  {
    id: "eligibility",
    title: "2. Eligibility",
    paragraphs: [
      "You must be 18 years or older to use GraceRun, or you must have parental or guardian consent. The service is for CUHK students.",
      "Every account must use a CUHK student email ending in @link.cuhk.edu.hk. We send a one-time passcode to that email before the account is activated.",
    ],
  },
  {
    id: "accounts",
    title: "3. Your account",
    paragraphs: [
      "You are responsible for keeping your login details secure and for activity on your account. Provide accurate information and keep it up to date.",
    ],
  },
  {
    id: "verification",
    title: "3a. Account verification",
    paragraphs: [
      "To create an account you must verify CUHK student status using a one-time passcode (OTP) sent to your university email ending in @link.cuhk.edu.hk.",
      "That verification ties the account to a CUHK identity. Impersonation, sharing codes, or using someone else’s student email is grounds for immediate termination.",
    ],
  },
  {
    id: "delivery-info",
    title: "4. Delivery information",
    paragraphs: [
      "You must provide accurate delivery details so a runner can complete the drop-off. That includes your college, hall, and lobby, and any room number or notes you add to an order.",
      "Deliveries are made to the hall lobby, not to individual rooms, unless a runner agrees otherwise.",
    ],
  },
  {
    id: "delivery-times",
    title: "5. Delivery times",
    paragraphs: [
      "Times shown in the app (including estimated arrival) are estimates, not guarantees. Traffic, queue length at Fusion, weather, item availability, and runner availability can delay an order.",
    ],
  },
  {
    id: "payment",
    title: "6. Payment and pricing",
    paragraphs: [
      "Prices shown in the app are estimates based on our catalog. The runner pays Fusion at the till and uploads the receipt.",
      "GraceRun reimburses the runner after delivery. You pay GraceRun the receipt total, delivery fee, and any tip via PayMe or FPS.",
      "Customers agree to pay GraceRun back within 24 hours of delivery.",
      "If the Fusion receipt total is lower than the app estimate, we refund the exact difference. If it is higher, we show the new total and you may approve it or cancel for a full refund of amounts already paid.",
    ],
  },
  {
    id: "stock",
    title: "7. Stock and substitutions",
    paragraphs: [
      "GraceRun is not responsible if Fusion is out of an item. We will try to substitute a similar product or refund that line. If we cannot reach you, the runner may skip the item and the line will not be charged.",
    ],
  },
  {
    id: "runners",
    title: "8. Runner responsibilities",
    paragraphs: [
      "Runners are independent contractors, not employees of GraceRun or CUHK. GraceRun matches orders; we do not employ runners.",
      "Runners are required to write the customer's full name on the Fusion receipt and attach it to the grocery bag. This is for verification and safety purposes.",
      "Runners must upload both a photo of the receipt and a screenshot of the bank transaction before the order can be completed.",
      "Before marking an order as delivered, every runner must complete all of the following steps:",
    ],
    bullets: [
      "Write the customer's full name on the Fusion receipt and attach it to the grocery bag.",
      "Upload the Fusion receipt photo and a bank or FPS screenshot of the till payment.",
      "Take a photo of the bag at the lobby with the named receipt visible.",
    ],
  },
  {
    id: "runners-conduct",
    title: "8a. Runner conduct and location",
    paragraphs: [
      "While an order is active, the runner’s device may share GPS location with the customer so they can see progress toward Fusion and then the dorm. Location sharing stops when the order is delivered or cancelled.",
      "Failing to attach the receipt, omitting a name on the bag, or submitting a delivery photo without a visible receipt may lead to a withheld payout for that order while we investigate.",
      "Theft, fraud, or failing to deliver after pickup will result in account termination and may be reported to CUHK authorities and campus security.",
    ],
  },
  {
    id: "cancellations",
    title: "9. Cancellations",
    paragraphs: [
      "You may cancel in the app while the order is still waiting for a runner (not yet picked up from Fusion).",
      "If Fusion store prices are higher than the app estimate, you may cancel at that point for a full refund of anything already paid. Once a runner has picked up the bag, cancellations are not available except as required by law or a goodwill adjustment we choose to make.",
    ],
  },
  {
    id: "our-rights",
    title: "10. Our rights",
    paragraphs: [
      "We may refuse, delay, or cancel any order for any reason, including suspected fraud, unsafe delivery conditions, abuse of the service, or operational limits. We may suspend or close accounts that break these terms.",
    ],
  },
  {
    id: "liability",
    title: "11. Liability",
    paragraphs: [
      "To the fullest extent permitted by law, GraceRun is not liable for indirect loss, missed classes, spoiled food after delivery, or delays beyond the estimates shown in the app. Nothing in these terms limits liability that cannot be excluded under Hong Kong law.",
    ],
  },
  {
    id: "changes",
    title: "12. Changes",
    paragraphs: [
      "We may update these terms from time to time. The date at the top of this page is the latest version. Continued use of GraceRun after a change means you accept the updated terms.",
    ],
  },
];

export const REFUND_SECTIONS: LegalSection[] = [
  {
    id: "price-lower",
    title: "1. Fusion price lower than the app",
    paragraphs: [
      "If the actual Fusion receipt total is lower than the price shown in the app, you are refunded the exact difference.",
      "Refunds are processed by an administrator via PayMe, FPS, or bank transfer, usually within 3–5 business days. The app shows when a refund is pending and when it has been marked complete.",
    ],
  },
  {
    id: "price-higher",
    title: "2. Fusion price higher than the app",
    paragraphs: [
      "If the actual total is higher, we notify you in the app and show the new total. You may approve the new amount or cancel the order.",
      "If you cancel because of a price increase, you receive a full refund of anything already paid.",
    ],
  },
  {
    id: "cancel-before-pickup",
    title: "3. Cancelling before pickup",
    paragraphs: [
      "If your order is still pending (no runner has picked up at Fusion), you may cancel in the app. You will not be charged for a cancelled order that was never picked up.",
    ],
  },
  {
    id: "after-pickup",
    title: "4. After a runner picks up",
    paragraphs: [
      "No refunds for change of mind once the order has been picked up, including if you are not at the lobby.",
      "If items are missing, damaged in transit through runner negligence, or charged in error, contact us through the app as soon as you can. We may refund or replace that portion at our discretion.",
    ],
  },
  {
    id: "oos-refunds",
    title: "5. Out of stock",
    paragraphs: [
      "Unavailable items are not billed. Substitutions are only made when you have agreed or when a close equivalent is clearly appropriate.",
    ],
  },
  {
    id: "platform-cancel",
    title: "6. If we cancel",
    paragraphs: [
      "If GraceRun or a runner cancels for operational reasons (no runner available, store closed, unsafe conditions), you will not be charged. We are not obliged to complete a replacement delivery the same day.",
    ],
  },
];

export const PRIVACY_SECTIONS: LegalSection[] = [
  {
    id: "collect",
    title: "1. What we collect",
    paragraphs: [
      "We collect information you give us and information created when you use the app:",
    ],
    bullets: [
      "Name (English, and Chinese if you provide it)",
      "Email address and username",
      "Phone number (if you provide it)",
      "Student ID",
      "College, hall, and lobby / delivery notes (which may include a room number)",
      "Order history, cart contents, payment confirmation status, and in-app messages about an order",
      "Approximate GPS location of a runner while they are completing your order",
      "Account credentials stored by Firebase Authentication",
    ],
  },
  {
    id: "use",
    title: "2. How we use it",
    paragraphs: ["We use this data to:"],
    bullets: [
      "Create and secure your account",
      "Process, assign, and deliver orders",
      "Contact you about your delivery (including substitutions and arrival)",
      "Show runners the details they need to fulfill an order",
      "Show customers a live map of the runner during an active delivery",
      "Improve the service, fix bugs, and prevent abuse",
    ],
  },
  {
    id: "share",
    title: "3. Sharing",
    paragraphs: [
      "We do not sell your data. We do not share it with third parties for their marketing.",
      "We share order and delivery details with the runner assigned to your order so they can pick up and drop off groceries. Firebase (Google) processes authentication and database storage on our behalf. We may disclose information if required by law or to protect users’ safety.",
    ],
  },
  {
    id: "storage",
    title: "4. Storage and security",
    paragraphs: [
      "Your data is stored in Firebase (Authentication, Firestore, and related services) with access controlled by our security rules. No method of transmission or storage is completely secure, but we take reasonable steps to protect your information.",
    ],
  },
  {
    id: "cookies",
    title: "5. Cookies and similar technology",
    paragraphs: [
      "We use cookies and browser storage for authentication so you can stay signed in. Analytics cookies, if used, are optional and not required to place an order. You can block optional analytics in your browser; essential sign-in storage is needed for the app to remember your session.",
    ],
  },
  {
    id: "retention",
    title: "6. Retention and deletion",
    paragraphs: [
      "We keep account and order records for as long as needed to operate the service, handle disputes, and meet legal obligations.",
      "You can request deletion of your data at any time by contacting us through the app (Profile) or by emailing us from the address on your account. We may retain limited records where we must (for example, completed orders) or where deletion would break an active delivery.",
    ],
  },
  {
    id: "choices",
    title: "7. Your choices",
    paragraphs: [
      "You can update delivery details in your profile. You can sign out at any time. For a copy of your data or a deletion request, contact us as described above.",
    ],
  },
];
