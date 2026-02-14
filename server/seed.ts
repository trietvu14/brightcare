import { db } from "./db";
import { documents, prompts } from "@shared/schema";
import { sql } from "drizzle-orm";

export async function seedDatabase() {
  const existingDocs = await db.select({ count: sql<number>`count(*)::int` }).from(documents);
  if (existingDocs[0].count > 0) return;

  await db.insert(documents).values([
    {
      title: "Hours of Operation",
      content: `BrightCare Daycare is open Monday through Friday from 6:30 AM to 6:30 PM. We are closed on weekends, major federal holidays, and two staff development days per year (dates announced in January). Early drop-off begins at 6:30 AM and late pickup ends at 6:30 PM. A late pickup fee of $1 per minute applies after 6:30 PM.`,
      category: "operations",
      isActive: true,
    },
    {
      title: "Tuition and Fees",
      content: `Tuition rates at BrightCare Daycare:
- Infants (6 weeks - 12 months): $325/week
- Toddlers (1 - 2 years): $295/week
- Preschool (3 - 4 years): $265/week
- Pre-K (4 - 5 years): $245/week
- Before/After School (5 - 12 years): $150/week

A non-refundable registration fee of $150 is required upon enrollment. Tuition is due every Monday. A 10% sibling discount is available for families with multiple children enrolled. We accept various payment methods including credit cards, checks, and automatic bank transfers.`,
      category: "tuition",
      isActive: true,
    },
    {
      title: "Health and Safety Policies",
      content: `Health & Safety at BrightCare Daycare:
- Children must be up to date on all state-required immunizations
- Children with a fever of 100.4F or higher must stay home until fever-free for 24 hours without medication
- We maintain a 1:4 staff-to-child ratio for infants, 1:6 for toddlers, and 1:10 for preschoolers
- All staff are CPR and First Aid certified
- Background checks are required for all employees
- The facility is cleaned and sanitized daily
- Hand washing is required upon arrival and throughout the day
- Parents must notify us immediately if their child has been exposed to a contagious illness
- We have a registered nurse on staff Monday through Friday`,
      category: "health",
      isActive: true,
    },
    {
      title: "Feeding and Nutrition Policies",
      content: `Feeding & Nutrition at BrightCare Daycare:
- We serve breakfast (8:00 AM), lunch (11:30 AM), and an afternoon snack (3:00 PM)
- All meals are prepared on-site by our licensed kitchen staff
- Menus are planned by a certified nutritionist and rotate on a 4-week cycle
- We accommodate food allergies and dietary restrictions with advance notice
- For infants, parents must provide breast milk or formula; we provide baby food for 6+ months
- We follow USDA Child and Adult Care Food Program (CACFP) guidelines
- Fresh fruits and vegetables are served daily
- No nuts or nut products are allowed in the facility due to allergy concerns
- Parents are welcome to review our monthly menus posted on the parent board`,
      category: "nutrition",
      isActive: true,
    },
    {
      title: "Enrollment Process",
      content: `Enrollment at BrightCare Daycare:
1. Schedule a facility tour (available Monday-Friday, 9 AM - 4 PM)
2. Complete the enrollment application
3. Submit required documents: immunization records, emergency contacts, authorized pickup list, and any custody documentation
4. Pay the non-refundable registration fee ($150)
5. Attend a parent orientation session
6. Complete a transition period (1 week of half-days recommended for new children)

Wait list: When classes are full, families can join our wait list. Priority is given to siblings of currently enrolled children. We accept children from 6 weeks to 12 years of age. A two-week written notice is required for withdrawal.`,
      category: "enrollment",
      isActive: true,
    },
  ]);

  await db.insert(prompts).values([
    {
      name: "Friendly Greeting Style",
      content: "Always greet parents warmly and use their name if known. Maintain an encouraging and supportive tone throughout the conversation.",
      type: "system",
      isActive: true,
    },
    {
      name: "Safety First Response",
      content: "When discussing any child safety topics, always emphasize that the safety and well-being of every child is our top priority at BrightCare Daycare.",
      type: "system",
      isActive: true,
    },
  ]);

  console.log("Database seeded with initial documents and prompts");
}
