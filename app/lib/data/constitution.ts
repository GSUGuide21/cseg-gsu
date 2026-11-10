/**
 * The CSEG constitution, from "CSEG Constitution (2025-2026).docx", the copy on file with
 * Georgia State. The /constitution page draws it, and scripts/site-pages.ts seeds the
 * dashboard's draft from it, so the two say the same thing. When the officers amend it,
 * change it here (and on PIN).
 *
 * Corrected from the .docx (Nov 2026), which still needs the same fixes: the two articles
 * cross-referenced (IV §6, VII §1), "members are", "take roll", "brief … on", the outgoing
 * officers' commas (VII §1), an officer's reinstatement at two-thirds rather than "two-thirds
 * (or majority)", votes taken by the Executive Council as a body (IV §6, V §5), the honorary
 * members line dropped from IV §1 (IV §5 already says it), and the Code of Conduct holding
 * the University's rules (Glossary).
 */

/** A list item: its words, or its words with a list under them */
export type ConstitutionItem = string | { readonly text: string; readonly items: readonly ConstitutionItem[] }

/** A paragraph, or a numbered list (1., then a., then i., as the document numbers them) */
export type ConstitutionBlock = string | { readonly items: readonly ConstitutionItem[] }

export type ConstitutionSection = { readonly title: string; readonly blocks: readonly ConstitutionBlock[] }

/** An article: its own words, or its sections, numbered in order */
export type ConstitutionArticle = {
  readonly title: string
  readonly blocks?: readonly ConstitutionBlock[]
  readonly sections?: readonly ConstitutionSection[]
}

export const CONSTITUTION_TERM = 'Fall 2025 – Spring 2026'

/** The Executive Council's offices, in the constitution's order (Article V, Section 2) */
export const OFFICER_TITLES = [
  'Executive Director',
  'Director',
  'Secretary',
  'Finance Manager',
  'Public Relations Manager',
  'Programming Manager',
  'Marketing Manager',
  'Outreach Manager',
  'Historian',
  'Resident Artist',
] as const

const list = (...items: ConstitutionItem[]): ConstitutionBlock => ({ items })
const sub = (text: string, ...items: ConstitutionItem[]): ConstitutionItem => ({ text, items })

export const CONSTITUTION_ARTICLES: readonly ConstitutionArticle[] = [
  {
    title: 'Name',
    blocks: [
      'The name of this organization shall officially be the Campus Survival and Engagement Group. This organization shall also be known as CSEG, the Campus Survival Group, or the Campus Engagement Group.',
    ],
  },
  {
    title: 'Mission Statement',
    blocks: [
      'The mission of the Campus Survival and Engagement Group is to create an environment for Georgia State University students to easily navigate the campus atmosphere and succeed in their studies. This registered student organization assists students with managing social anxiety (and other common issues), expanding their networks, and seeking outreach and job opportunities by providing tips and useful resources.',
    ],
  },
  {
    title: 'Objective',
    blocks: [
      'The Campus Survival and Engagement Group aims to enhance, foster, and maintain campus involvement, create an environment for attaining useful resources and understanding campus issues, and increase enrollment. CSEG is determined to assist students with common student issues (including social anxiety, food insecurity, homelessness, and issues that prevent students from engaging with the campus environment) by providing tips/resources and seeking opportunities after graduation.',
    ],
  },
  {
    title: 'Membership and Organization Rules',
    sections: [
      {
        title: 'Organization Rules',
        blocks: [
          list(
            'All official members of the Campus Survival and Engagement Group must be enrolled in any Georgia State University campus.',
            'Members are expected to actively support the purpose and values of the Campus Survival and Engagement Group.',
            'Members are not allowed to disparage, harass, or defame the Campus Survival and Engagement Group, its members, its officers, or its affiliates. In addition, members must show respect to their fellow members, affiliates, and the Executive Council.',
            'Hate speech, harassment, disruption, intentional destruction of school/organization property, and any form of offensive misconduct will not be tolerated in the Campus Survival and Engagement Group.',
            'Members are required to abide by all applicable University policies (including the Student Code of Conduct) and local/state/federal laws at all times.'
          ),
        ],
      },
      {
        title: 'Eligibility',
        blocks: [
          'To be eligible for any official membership in the Campus Survival and Engagement Group, all students must be:',
          list(
            'Enrolled in any Georgia State University campus (including the Atlanta and Perimeter campuses).',
            'Registered as a member of CSEG on the Panther Involvement Network (PIN) through https://pin.gsu.edu/organization/cseg.',
            'Not currently in a membership revocation period with the organization.'
          ),
          'Additionally, discrimination against members based on race, religion, national origin, sexual orientation, gender, age, color, disability status, and any other protected class is not permitted in CSEG and serves as a violation of the GSU Student Code of Conduct.',
        ],
      },
      {
        title: 'Recruitment',
        blocks: ['Recruitment shall take place throughout the academic year and membership of CSEG shall remain open to all students at all times.'],
      },
      {
        title: 'Privileges',
        blocks: [
          'All official members of the Campus Survival and Engagement Group are allotted the following privileges:',
          list(
            'Members can vote in Executive Council elections.',
            'Members can hold offices as members of the Executive Council.',
            'Members will be notified of any impending events and meetings.',
            'Members can participate in outreach activities hosted by the Campus Survival and Engagement Group.'
          ),
        ],
      },
      {
        title: 'Honorary Membership',
        blocks: [
          'Alumni, affiliates, and anyone not enrolled in Georgia State University can be classified as honorary members of the Campus Survival and Engagement Group. Honorary members are allowed the same privileges as official members, excluding:',
          list('Voting in Executive Council elections.', 'Holding leadership positions in the Campus Survival and Engagement Group Executive Council.'),
        ],
      },
      {
        title: 'Membership Revocation',
        blocks: [
          'Although a member maintains eligibility for membership, their membership is subject to be revoked at any time if that member violates the organization rules (outlined in Section 1) and/or any applicable University policies (and laws).',
          'The revocation process will occur in the following steps:',
          list(
            'An offense is made by a member of the Campus Survival and Engagement Group.',
            'The member in question is notified of the offense within 48 hours.',
            'The member is allowed an opportunity to present a defense before the vote.',
            'The Executive Council will review any relevant information about the offense in question.',
            'A vote is taken by the Executive Council (Executive Director, Director, Secretary, Public Relations Manager, etc.) in a meeting that does not take place during the general body meeting.',
            'At least a two-thirds majority vote is required for the membership revocation process to proceed. Depending on the nature and/or the severity of the offense, the membership revocation period will last up to 2 full semesters (one academic year), not including the current semester.'
          ),
        ],
      },
      {
        title: 'Appeal Process',
        blocks: [
          'If a member wishes to appeal the decision, they are allotted a total of 168 hours (7 full calendar days) to submit an appeal to the current Executive Director or the Director of the Campus Survival and Engagement Group. In the following meeting, the Executive Director (or Director) will discuss the offense made and the member must read the appeal to the organization. A two-thirds vote is required for the member to be reinstated.',
        ],
      },
    ],
  },
  {
    title: 'The Executive Council',
    sections: [
      {
        title: 'Eligibility',
        blocks: [
          'All Executive Council members of the Campus Survival and Engagement Group shall be enrolled with at least 6 credit hours (part-time) at Georgia State University and demonstrate knowledge about the Georgia State University campus. CSEG also recommends that any prospective officers have experience as an officer of other Georgia State University registered student organizations.',
        ],
      },
      {
        title: 'Titles and Terms',
        blocks: [
          list(
            'The principal governing body of the Campus Survival and Engagement Group shall be officially named the Executive Council, also known as the Executive Committee and the Executive Board.',
            sub('The officers of this registered student organization shall include the following:', ...OFFICER_TITLES),
            'No officer shall hold more than one position simultaneously without the express approval of the Executive Director or the Director.'
          ),
        ],
      },
      {
        title: 'General Responsibilities',
        blocks: [
          'All Executive Council members are expected to:',
          list(
            'Supervise the activities of the Campus Survival and Engagement Group and improve on the organization’s issues.',
            'Assist other Executive Council members with performing their duties when necessary.',
            'Meet at least 30 minutes prior to every general body meeting or programming event to discuss the agenda and any current issues (if present).'
          ),
        ],
      },
      {
        title: 'Executive Meetings',
        blocks: [
          'A two-thirds vote from the Executive Council is required to conduct any form of business or execute a plan of action. Additionally, decisions of the Executive Council shall be reached and become effective provided a quorum exists (two-thirds of the Executive Council are present).',
        ],
      },
      {
        title: 'Removal of Officer',
        blocks: [
          'An Executive Council member may be removed at any time for violating the organization rules (outlined in Article IV, Section 1) and/or the Student Code of Conduct, in addition to the following:',
          list(
            'Failure to execute duties consistent with being a student organization leader or misusing executive powers.',
            'Misappropriating organization funds or Executive Council powers.'
          ),
          'The officer removal process will occur in the following steps:',
          list(
            'An Executive Council member makes an offense.',
            'The officer in question is notified of the offense within 48 hours.',
            'The officer is allowed to present a defense before the vote.',
            'The remaining Executive Council members will review the member’s position and any relevant information about the offense in question.',
            'The remaining Executive Council members take a vote in an executive meeting.',
            'A two-thirds vote of the remaining Executive Committee members is required to continue the officer removal process.',
            'If the Executive Council votes to continue the officer removal process, the officer must provide all documents related to the organization and brief their replacement on current plans in their care.'
          ),
        ],
      },
      {
        title: 'Appeal Process',
        blocks: [
          list(
            'If an officer wishes to appeal the decision, they are allotted 168 hours (7 full calendar days) to submit an appeal to a remaining member of the Executive Council of the organization.',
            'In the following executive meeting, the remaining Executive Council members will discuss the offense made and the officer must read the appeal to the remaining Executive Council members. A two-thirds vote is required to reinstate the officer.'
          ),
        ],
      },
      {
        title: 'Resignation',
        blocks: [
          list(
            'If an officer no longer wishes to serve on the Executive Council, they must submit their resignation to the Executive Council at least 14 calendar days (2 weeks) in advance.',
            'Prior to the officer’s final day of service, they shall provide all documents related to the organization and brief their replacement on current plans in their care.'
          ),
        ],
      },
    ],
  },
  {
    title: 'Officer Duties',
    sections: [
      {
        title: 'Executive Director',
        blocks: [
          'The Executive Director, also known as the President, is expected to:',
          list(
            'Act as the voice and primary representative of the Campus Survival and Engagement Group.',
            'Supervise all activities of the Campus Survival and Engagement Group.',
            'Ensure all Executive Council members are executing their assigned duties.',
            'Serve as the First Contact of the Campus Survival and Engagement Group on the Panther Involvement Network.',
            'Serve as a signer of all financial documents on behalf of the Campus Survival and Engagement Group.',
            'Ensure compliance with all applicable University policies and procedures (including the Student Code of Conduct), and local/state/federal laws.',
            'Re-register CSEG as a student organization yearly.',
            'Preside over all general body and executive meetings and call all meetings to order.',
            'Approve all service opportunities on behalf of CSEG.',
            'Update and maintain contact with all advisors, including the primary advisor.',
            'Delegate roles and responsibilities to other Executive Council members.'
          ),
        ],
      },
      {
        title: 'Director',
        blocks: [
          'The Director, also known as the Vice President, is expected to:',
          list(
            'Maintain a copy of the Constitution to review with members when necessary.',
            'Create plans and goals for the other Executive Council members and make them aware.',
            'Serve as the Second Contact of the Campus Survival and Engagement Group on the Panther Involvement Network.',
            'Delegate roles and responsibilities to other Executive Council members.',
            'Supervise all activities of the Campus Survival and Engagement Group.',
            'Perform an audit of all financial transactions of the organization once per semester.',
            'Serve in place of the Executive Director when the Executive Director is unavailable.'
          ),
        ],
      },
      {
        title: 'Secretary',
        blocks: [
          'The Secretary is expected to:',
          list(
            'Create official correspondence for the Campus Survival and Engagement Group.',
            'Maintain a copy of the Constitution to review with members when necessary.',
            'Notify all members of upcoming meetings and other forms of programming at least 24 hours in advance.',
            'Take roll at all meetings and events.',
            'Coordinate food, merchandise, and promotional materials for all events.',
            'Draft and maintain the minutes for all general body and executive meetings.'
          ),
        ],
      },
      {
        title: 'Finance Manager',
        blocks: [
          'The Finance Manager, also known as the Treasurer, is expected to:',
          list(
            'Create yearly budget proposals and reports.',
            'Allocate the budget for every event.',
            'Serve as the Financial Contact of the Campus Survival and Engagement Group on the Panther Involvement Network.',
            'Serve as a signer of all financial documents on behalf of the Campus Survival and Engagement Group.',
            'Utilize organization finances appropriately and in a way that benefits the Campus Survival and Engagement Group and its members.',
            'Coordinate food, merchandise, and promotional materials for all events.',
            'Collect membership dues and proceeds from all fundraising events.'
          ),
        ],
      },
      {
        title: 'Public Relations Manager',
        blocks: [
          'The Public Relations Manager is expected to:',
          list(
            'Maintain all social media and email profiles for the Campus Survival and Engagement Group.',
            'Supervise all recruitment events.',
            'Maintain records of all recruitment events.',
            'Check the organization roster for prospective members and ensure the organization roster is updated consistently.',
            'Maintain an accurate list of members and their contact information.',
            'Maintain an attendance record for all members.',
            'Invite special guests and affiliates to meetings and events.',
            'Assist the Marketing Manager in posting marketing material on social media.',
            'Reserve spaces for all events through the CollegeNet reservation system.'
          ),
        ],
      },
      {
        title: 'Programming Manager',
        blocks: [
          'The Programming Manager is expected to:',
          list(
            'Plan all general body meetings, fundraisers, and programming events.',
            'Supervise and approve all fundraisers, recruitment events, and major events.',
            'Post and update all events on the Panther Involvement Network (PIN).',
            'Maintain all files related to general body meetings and programming events.',
            'Reserve spaces for all events through the CollegeNet reservation system.'
          ),
        ],
      },
      {
        title: 'Marketing Manager',
        blocks: [
          'The Marketing Manager is expected to:',
          list(
            'Create marketing material for CSEG, such as flyers, banners, and promotional materials.',
            'Post marketing material to the appropriate locations.',
            'Maintain all records of marketing materials.',
            'Reserve spaces for all events through the CollegeNet reservation system.',
            'Assist the Public Relations Manager in posting marketing material on social media.'
          ),
        ],
      },
      {
        title: 'Outreach Manager',
        blocks: [
          'The Outreach Manager is expected to:',
          list(
            'Maintain an accurate list of members participating in a service opportunity and their contact information.',
            'Supervise all service opportunities for CSEG.',
            'Contact special guests, companies, and affiliates about service opportunities.',
            'Maintain all files related to service opportunities.'
          ),
        ],
      },
      {
        title: 'Historian',
        blocks: [
          'The Historian is expected to:',
          list(
            'Research and collect relevant information about the campus and common campus issues.',
            'Maintain and update all historical records of the Campus Survival and Engagement Group.',
            'Review all marketing material and minutes for accuracy and grammatical errors.'
          ),
        ],
      },
      {
        title: 'Resident Artist',
        blocks: [
          'The Resident Artist is expected to:',
          list(
            'Assist the Marketing Manager with designing marketing material for the Campus Survival and Engagement Group, such as flyers, banners, and promotional items.',
            'Design the necessary assets for CSEG, such as logos, icons, and images.',
            'Edit documents for meetings and other programming events when necessary.'
          ),
        ],
      },
    ],
  },
  {
    title: 'Elections',
    sections: [
      {
        title: 'Election Process',
        blocks: [
          list(
            'The current administration reserves the right to decide whether they will proceed with an election in the current year.',
            'If the current administration votes to proceed with the election of officers, it shall take place in April of that year.',
            sub(
              'The process of elections shall be the following:',
              'Grades are checked when deemed necessary by the current administration.',
              'The outgoing officers not seeking reelection, the advisor, or at least one community or University member, will conduct interviews.',
              'A slate will be presented to the general body.',
              'Voting shall take place on the slate.',
              'If the slate does not pass, nominations will come to the floor. Each candidate will have a maximum of three minutes to speak. Voting will be done by a secret ballot. The order of elections will be according to the list outlined in Article V, Section 2.'
            )
          ),
        ],
      },
      {
        title: 'Vacancies',
        blocks: [
          'Should a position become vacant throughout the academic year, the following process shall be:',
          list(
            'Notice will be given to the general body that there is an available position and voting will take place at the next scheduled meeting. In case there is only one candidate for a position, voting may not take place.',
            'Interviews will be conducted by the incumbent Executive Committee members, the advisor, or at least one community or University member.',
            'Nominations will come from the floor. Each candidate will have a maximum of three minutes to speak. Voting will be by a secret ballot.'
          ),
        ],
      },
    ],
  },
  {
    title: 'Programming',
    sections: [
      {
        title: 'General Body Meetings',
        blocks: [
          list(
            'The current administration of the Executive Council will schedule general body meetings. Meetings are generally held twice a month.',
            'General body meetings can also serve as informational meetings, giving essential information about the organization and the campus.',
            'General body meetings will be run by the Executive Director, Director, Secretary, or another Executive Council member.',
            'Members can request an additional general body meeting with the Executive Council when necessary.',
            sub(
              'General outline of the General Body Meetings:',
              'Introduction',
              'Icebreaker',
              'Campus Update',
              sub('Campus Highlights', 'University Department of the Day', 'Student Organization of the Day'),
              'Meeting Ideas and Announcements',
              'Discussion',
              'Any additional elements can be added if needed or requested.'
            )
          ),
        ],
      },
      {
        title: 'Collaborations',
        blocks: [
          list(
            'Only the Executive Director, Director, Secretary, and Programming Manager can sign up for collaborations on behalf of the Campus Survival and Engagement Group.',
            'The collaborating organizations for events can be University departments, other registered student organizations, and affiliated parties.'
          ),
        ],
      },
      {
        title: 'Service Opportunities',
        blocks: [
          list(
            'Only the Executive Director, Director, Secretary, Programming Manager, and Outreach Manager can sign up for service opportunities on behalf of the Campus Survival and Engagement Group.',
            'All service opportunities are expected to be approved by the Executive Director or Director.'
          ),
        ],
      },
      {
        title: 'Special Guests',
        blocks: [
          list(
            'Only the Executive Director, Director, Secretary, and Programming Manager can invite special guests to meetings and events.',
            'Special guests must be finalized at least one week before the meeting or other programming event.',
            'Special guests must be approved by at least two-thirds of the Executive Council.'
          ),
        ],
      },
      {
        title: 'Emergency Meetings',
        blocks: [
          'A member of the Executive Council can call a Special or Emergency meeting if the membership is given at least a 48-hour notice. A member of the Campus Survival and Engagement Group can appeal to the Executive Council to schedule an emergency meeting.',
        ],
      },
    ],
  },
  {
    title: 'Finances',
    sections: [
      {
        title: 'Membership Dues',
        blocks: [
          'All students at Georgia State University who joined the organization through the Panther Involvement Network (PIN) are automatically listed as members. However, membership dues assist the Campus Survival and Engagement Group with funding expenses related to maintaining the organization and planning engaging events for our members. Please note that membership dues are non-refundable. The current administration determines the membership dues.',
        ],
      },
      {
        title: 'Using Organization Finances',
        blocks: [
          list(
            'Only the Executive Director, Director, and Finance Manager can sign on the organization’s account(s).',
            'Organization funds may only be spent on supplies, events, activities, travel expenses, food, administrative expenses, or anything that benefits the Campus Survival and Engagement Group.',
            'Additionally, all purchases must benefit the Campus Survival and Engagement Group and are not permitted to be used for anything that violates any applicable University policies (including the Student Code of Conduct), and applicable local, state, and federal laws.',
            'All purchases must include proof of transaction and a reason for purchase.',
            sub(
              'The Executive Council is responsible for making and maintaining all financial decisions on behalf of the Campus Survival and Engagement Group.',
              'At the discretion of the current administration, the Executive Council will present a budget to the general members each semester at the first general body meeting or within the first four weeks of the semester.',
              'The general members will have the opportunity to review and vote for its approval of the proposed budget.',
              sub(
                'The Executive Council must present any expenditure(s) to the general members for approval if:',
                'The expenditure is not listed in the approved budget.',
                'The expenditure is $500 or more.'
              )
            )
          ),
        ],
      },
      {
        title: 'Dissolution of the Organization',
        blocks: [
          'If the Campus Survival and Engagement Group dissolves, any non-university-owned assets will be retained by the organization for two (2) years in case the organization re-establishes. After two (2) years, any assets will be donated to a charity or another registered student organization with a mission similar to the Campus Survival and Engagement Group, as determined by the Executive Council.',
        ],
      },
    ],
  },
  {
    title: 'Governance',
    sections: [
      {
        title: 'Agreement to University Policies and Applicable Laws',
        blocks: [
          'The Campus Survival and Engagement Group (CSEG) and its members agree to abide by all applicable University policies (including the Student Code of Conduct) and local, state, and federal laws.',
        ],
      },
      {
        title: 'Non-Discrimination Policy',
        blocks: [
          'Membership, leadership, and participation in CSEG must always be open to all students without regard to race, color, sex (unless exempt under Title IX), age, religion, national origin, sexual orientation, gender identity, marital status, disability, or status as a U.S. veteran.',
        ],
      },
      {
        title: 'Hazing Policy',
        blocks: [
          'CSEG prohibits its members, both individually and collectively, from committing any acts of hazing as defined in the Student Code of Conduct at Georgia State University.',
        ],
      },
      {
        title: 'Organization Agreement',
        blocks: [
          'CSEG agrees to abide by the Student Code of Conduct, RSO Handbook, and all pertinent university policies, protocols, and procedures. Certain RSO benefits may require specific obligations. RSO student leaders must regularly engage designated communication and organizational management tools, maintain relevant RSO records and participation data, complete designated trainings, and participate in designated activities that promote RSOs and their activities to the broader student body.',
        ],
      },
      {
        title: 'Special Event/Late Night Policy',
        blocks: [
          'CSEG agrees to comply with the Special Event/Late Night Policy in the case they choose to host an event after 11pm or with an expected attendance of more than 300 guests.',
        ],
      },
    ],
  },
  {
    title: 'Advisor',
    sections: [
      {
        title: 'General Terms/Rules for Advisors',
        blocks: [
          list(
            'All advisors must be approved by the Executive Council every academic year before renewing the organization.',
            'The advisor(s) shall serve as a mentor to the organization guiding the officers.',
            'The Campus Survival and Engagement Group must have only one Primary Advisor; however, CSEG can have up to three secondary advisors.'
          ),
        ],
      },
      {
        title: 'Faculty/Staff Advisor',
        blocks: [
          list(
            'The faculty/staff advisor must be a full-time, benefits-eligible employee of Georgia State University.',
            'The faculty/staff advisor has no term limit other than that they must be a current full-time employee.',
            'One or more persons may serve as a faculty/staff advisor; however, only one person may serve as a Primary Advisor.'
          ),
        ],
      },
      {
        title: 'Community/Alumni Advisor',
        blocks: [
          list(
            'If the advisor does not meet the above criteria, they can qualify as a community/alumni advisor.',
            'One or more persons may serve as a community/alumni advisor.',
            'Their election and tenure run the same schedule as the officers.'
          ),
        ],
      },
    ],
  },
  {
    title: 'Amendments',
    blocks: [
      list(
        'The Constitution shall be reviewed and updated at least once every academic year.',
        'Any active member can propose an amendment to the Executive Council for review.',
        'A two-thirds vote can approve any amendment presented by the Executive Council or the active members present at the meeting.'
      ),
    ],
  },
]

export const CONSTITUTION_GLOSSARY: readonly { readonly term: string; readonly definition: string }[] = [
  { term: 'Advisor', definition: 'A mentor to the Campus Survival and Engagement Group guiding the officers and its members.' },
  { term: 'Constitution', definition: 'A set of rules, regulations, and guidelines members of the Campus Survival and Engagement Group must follow.' },
  {
    term: 'Executive Council',
    definition: 'The principal governing body of the Campus Survival and Engagement Group. Also known as the Executive Committee and the Executive Board.',
  },
  {
    term: 'Members/Membership',
    definition: 'These terms refer to Georgia State University students who registered for the Campus Survival and Engagement Group through the Panther Involvement Network.',
  },
  { term: 'Officer', definition: 'A student holding any leadership position in the Campus Survival and Engagement Group.' },
  { term: 'Organization', definition: 'This term refers to the current organization, the Campus Survival and Engagement Group.' },
  {
    term: 'Panther Involvement Network',
    definition:
      'The primary platform for locating student organization resources, joining student organizations, finding and attending events, and showcasing your involvement. This platform serves as a tool for student leaders to manage the organization’s roster, finances, and profile. You can visit the Panther Involvement Network at https://pin.gsu.edu.',
  },
  {
    term: 'Registered Student Organization (RSO)',
    definition: 'A student organization at Georgia State University that is registered under applicable University policies and procedures.',
  },
  {
    term: 'Student Code of Conduct',
    definition:
      'A set of policies and procedures that promote the mission of the University and protect the rights of students, faculty, and staff. It contains the University’s rules and regulations. The current version of the Code of Conduct is found online at https://codeofconduct.gsu.edu.',
  },
  { term: 'University', definition: 'This term refers to Georgia State University and its affiliates.' },
]

/** Amendments and constitution history, oldest first */
export const CONSTITUTION_HISTORY: readonly { readonly date: string; readonly note: string }[] = [
  { date: '2022-05-06', note: 'Created and initialized by the First Administration of the Campus Survival and Engagement Group.' },
  { date: '2023-09-04', note: 'Constitution has been updated and more detail has been added.' },
  { date: '2024-01-13', note: 'The language on the Constitution has been updated.' },
  { date: '2024-06-04', note: 'Added the required language to the constitution.' },
]

const ROMAN: readonly [number, string][] = [
  [10, 'X'],
  [9, 'IX'],
  [5, 'V'],
  [4, 'IV'],
  [1, 'I'],
]

/** 1 → "I", 12 → "XII" (the articles never pass 39) */
export const toRoman = (n: number) => {
  let out = ''
  for (const [value, numeral] of ROMAN) for (; n >= value; n -= value) out += numeral
  return out
}

/** "Article IV: Membership and Organization Rules" */
export const articleHeading = (index: number, article: ConstitutionArticle) => `Article ${toRoman(index + 1)}: ${article.title}`

/** "Section 2: Eligibility" */
export const sectionHeading = (index: number, section: ConstitutionSection) => `Section ${index + 1}: ${section.title}`

/** An article's #link, "article-iv", and its sections', "article-iv-section-2" */
export const articleId = (index: number) => `article-${toRoman(index + 1).toLowerCase()}`
export const articleSectionId = (articleIndex: number, sectionIndex: number) => `${articleId(articleIndex)}-section-${sectionIndex + 1}`

export const GLOSSARY_ID = 'glossary'
export const HISTORY_ID = 'history'

/** Words with the web addresses in them as links: strings are plain text, [words, url] pairs are links */
export const withLinks = (text: string): (string | [string, string])[] =>
  text
    .split(/(https:\/\/[^\s]+?)(?=[.,;)]?(?:\s|$))/)
    .filter(Boolean)
    .map((part) => (part.startsWith('https://') ? [part.replace(/^https:\/\//, ''), part] : part))

/** Items' words, and their own lists', for a test or a count */
export const itemText = (item: ConstitutionItem): string => (typeof item === 'string' ? item : [item.text, ...item.items.map(itemText)].join('\n'))
