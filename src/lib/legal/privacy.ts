import { SUPPORT_EMAIL_PLACEHOLDER } from "./support";

/**
 * DRAFT privacy policy, for owner review. Not legal advice and not yet in
 * force. Every "[OWNER TO CONFIRM: …]" is a decision the owner (and their
 * lawyer) still has to make. The data and providers listed were taken from
 * the code on 12 November 2026; the owner must confirm which are switched on
 * in production.
 */
export const PRIVACY_LAST_EDITED = "12 November 2026";

export const PRIVACY_DRAFT = `
## 1. Who is responsible for your data

Project Coordinator Launchpad ("Launchpad", "we", "us") is operated by **[OWNER TO CONFIRM: legal name of the business, and its registered address]**.

For any privacy question or request, write to **${SUPPORT_EMAIL_PLACEHOLDER}**.

## 2. What we collect

**You give us:**

- your name and email address when you create an account;
- the work you upload for grading (for example Word documents and spreadsheets), and the text we extract from it;
- your quiz answers, mock interview answers and messages to the tutor chat.

**We create as you use Launchpad:**

- your progress: videos watched, quizzes passed, assignments submitted, scores, feedback and your portfolio;
- a record of your purchase: the amount, the date and Stripe's reference for the payment;
- how you found us, if you arrived from a link that says so;
- technical information such as error reports and, if analytics are switched on, pages viewed.

**We do not collect** your card or bank details. Stripe handles payment and we only receive confirmation that you paid.

## 3. How we use it

- to run your account and give you access to what you paid for;
- to grade your work and show you feedback;
- to answer your questions in the tutor chat;
- to send you service emails (confirming your account, your receipt, password resets) and a weekly progress email, which you can switch off at any time with the unsubscribe link in the email or on your profile page;
- to find and fix problems, and to prevent abuse;
- to understand how the programme is used so we can improve it.

We do not sell your personal information.

**[OWNER TO CONFIRM WITH A LAWYER: the legal basis for each use, if you have customers in the UK or EU.]**

## 4. AI processing

When you submit work for grading, or use the tutor chat or mock interviews, the text is sent to our AI provider, Anthropic, so that it can produce a response. **[OWNER TO CONFIRM: Anthropic's data terms for your account, including whether inputs are used for training. Do not state it here until checked.]**

Please do not upload confidential information belonging to an employer or client, or personal information about other people.

## 5. Who we share it with

We use other companies to run Launchpad. They process your data on our behalf.

| Company | What for |
| --- | --- |
| Neon | Database, sign-in and file storage |
| Vercel | Hosting the website |
| Stripe | Taking payment |
| Anthropic | AI grading, tutor chat and mock interviews |
| Resend | Sending email |
| Sentry | Error reports |
| PostHog | Usage analytics |

**[OWNER TO CONFIRM: that this list matches what is switched on in production, and add the video host if one is used.]**

We may also share information if the law requires it.

## 6. Where your data is kept

**[OWNER TO CONFIRM: the country or region where the database and files are hosted, and the safeguards for transfers if you have customers in the UK or EU.]**

## 7. How long we keep it

- Tutor chat messages are deleted automatically after 30 days.
- **[OWNER TO CONFIRM: how long account details, uploaded work, grades and purchase records are kept, including after an account is closed. Purchase records usually have to be kept for tax reasons.]**

## 8. Your choices and rights

- You can change your name, and switch the weekly progress email on or off, on your profile page.
- You can ask us for a copy of your data, to correct it, or to delete your account and data, by writing to **${SUPPORT_EMAIL_PLACEHOLDER}**.

**[OWNER TO CONFIRM WITH A LAWYER: the rights that apply where your customers live, and the time limit for answering a request.]**

## 9. Cookies

We use cookies that are needed to keep you signed in. **[OWNER TO CONFIRM: whether analytics cookies are used, and whether a consent banner is needed.]**

## 10. Children

Launchpad is for adults. **[OWNER TO CONFIRM: minimum age.]**

## 11. Security

We limit who can access your data and use providers that encrypt it in transit. No online service can promise perfect security. If we learn of a breach that affects you, we will tell you. **[OWNER TO CONFIRM: breach notice commitments.]**

## 12. Changes to this policy

We may update this policy. If a change is significant we will tell you by email or in the app.
`;
