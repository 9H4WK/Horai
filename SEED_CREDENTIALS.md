# HORAI Labs — demo seed credentials

This project is positioned as **one company (HORAI Labs)** with an internal **careers / recruitment portal**, not a multi-employer job board like LinkedIn.

Seed data is applied automatically when the API starts (`api/seed.js`).

## Company

| Field | Value |
|--------|--------|
| Name | **HORAI Labs** |
| Roles seeded | 5 open roles (Engineering, Data, Product, Design, Growth) |

### Seeded jobs

1. **Senior Full-Stack Engineer** (Engineering) — best match for Aisha  
2. **Data Scientist** (Data & Insights)  
3. **Product Manager** (Product)  
4. **UX Designer** (Design)  
5. **Marketing Specialist** (Growth)  

## Accounts

| Role | Email | Password | Purpose |
|------|--------|----------|---------|
| **Admin** | `admin@horailabs.com` | `Admin123!` | Admin dashboard |
| **HR / Employer** | `hr@horailabs.com` | `HrDemo123!` | Candidate screening, edit postings, post roles |
| **Perfect-fit seeker** | `aisha.okello@gmail.com` | `SeekerDemo123!` | Strong Full-Stack profile + CV analysis |
| **Weaker-fit seeker** | `sam.mwangi@gmail.com` | `SeekerDemo123!` | Marketing profile (lower engineering match) |
| Legacy admin (if present) | `admin@searchera.local` | `Admin123!` | Older default |

## Suggested demo path

1. Sign in as **Aisha** (`aisha.okello@gmail.com`) → open **Senior Full-Stack Engineer** → Apply (no AI mention yet).  
2. After apply, open assessment → disclaimer explains a **short AI-powered assessment**.  
3. Sign in as **HR** → **Candidate screening** → compare Aisha vs Sam on the engineering role.  
4. Sign in as **HR** → **Browse roles** → **Edit posting** on a HORAI Labs job.

## Notes

- Applicants should **not** see AI language on the landing page or job board.  
- AI appears for applicants at the **assessment disclaimer** step.  
- HR screens with AI match scores internally.
