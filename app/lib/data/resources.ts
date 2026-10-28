/**
 * GSU resources, colleges, and student group chats (the /resources page).
 *
 * Started from CSEG's Linktree (linktr.ee/cseg.gsu), then expanded with GSU offices and
 * colleges, October 2026. Keep the Linktree in sync when adding or retiring a link.
 */
import {
  BookOpen,
  Building2,
  GraduationCap,
  HeartHandshake,
  HeartPulse,
  Sparkles,
  Users,
  Wallet,
  type LucideIcon,
} from 'lucide-react'

export type ResourceLink = {
  readonly label: string
  readonly href: string
  /** One line on what it's for */
  readonly description: string
  /** Campus map pin for the office's building (an id from ./places) */
  readonly placeId?: string
}

export type ResourceGroup = {
  /** Anchor id, e.g. "money" for /resources#money */
  readonly id: string
  readonly title: string
  readonly description: string
  readonly Icon: LucideIcon
  readonly links: readonly ResourceLink[]
}

export const RESOURCE_GROUPS: readonly ResourceGroup[] = [
  {
    id: 'academics',
    title: 'Academics & careers',
    description: 'Registration, advising, research, and the tools you will use every semester.',
    Icon: BookOpen,
    links: [
      {
        label: 'PAWS',
        href: 'https://paws.gsu.edu',
        description: 'Panther Access to Web Services: register for classes, check grades, and manage your student account.',
      },
      {
        label: 'University Advisement',
        href: 'https://advisement.gsu.edu/',
        description: 'Meet with an advisor to plan your courses and stay on track to graduate.',
      },
      {
        label: 'iCollege',
        href: 'https://icollege.gsu.edu/',
        description: 'GSU’s online learning platform for course materials, assignments, and grades.',
      },
      {
        label: 'Office of the Registrar',
        href: 'https://registrar.gsu.edu/',
        placeId: 'student-success-center',
        description: 'Transcripts, enrollment verification, the academic calendar, and graduation.',
      },
      {
        label: 'Course Catalog',
        href: 'https://catalogs.gsu.edu/',
        description: 'Degree requirements and course descriptions for every program.',
      },
      {
        label: 'University Library',
        href: 'https://library.gsu.edu/',
        placeId: 'library-north',
        description: 'Books, databases, study rooms, and research help from librarians.',
      },
      {
        label: 'Writing Studio',
        href: 'https://writingstudio.gsu.edu/',
        placeId: '25-park-place',
        description: 'One-on-one help with writing for any class.',
      },
      {
        label: 'Learning & Tutoring Center',
        href: 'https://success.students.gsu.edu/learning-tutoring-center/',
        description: 'Free tutoring and workshops for Perimeter College students.',
      },
      {
        label: 'University Career Services',
        href: 'https://career.gsu.edu/',
        placeId: '25-park-place',
        description: 'Résumé help, career fairs, and support finding jobs and internships.',
      },
      {
        label: 'Technology Services',
        href: 'https://technology.gsu.edu/',
        description: 'Software, accounts, Wi-Fi, and tech help.',
      },
      {
        label: 'EXLAB',
        href: 'https://technology.gsu.edu/technology-services/technology-labs-printing/exlab/',
        description: 'Experience, Experiment, Explore: a hands-on lab for trying out emerging technology.',
      },
      {
        label: 'EXCEN Recruiter',
        href: 'https://excen.gsu.edu/recruiter/index.php',
        description: 'Create a profile to take part in studies run by GSU’s Experimental Economics Center.',
      },
      {
        label: '25Live',
        href: 'https://25live.collegenet.com/pro/gsu',
        description: 'GSU’s room and event-space scheduling system.',
      },
    ],
  },
  {
    id: 'money',
    title: 'Money',
    description: 'Paying for school and getting the aid you qualify for.',
    Icon: Wallet,
    links: [
      {
        label: 'Student Financial Management Services',
        href: 'https://sfs.gsu.edu/',
        placeId: 'student-success-center',
        description: 'Tuition bills, payments, payment plans, and refunds.',
      },
      {
        label: 'Apply for Financial Aid (FAFSA)',
        href: 'https://studentaid.gov/h/apply-for-aid/fafsa',
        description: 'The federal application for grants, loans, and work-study. File it every year.',
      },
      {
        label: 'Scholarship Resource Center',
        href: 'https://success.students.gsu.edu/scholarship-resource-center/',
        description: 'Find and apply for scholarships year-round.',
      },
      {
        label: 'Student Employment',
        href: 'https://sfs.gsu.edu/resources/accepting-financial-aid/student-employment/',
        description: 'On-campus jobs, including Federal Work-Study.',
      },
      {
        label: 'Panther Book Access Program',
        href: 'https://sfs.gsu.edu/resources/panther-book-access-program/',
        description: 'Get your required digital textbooks at the start of each semester.',
      },
    ],
  },
  {
    id: 'wellness',
    title: 'Health & wellness',
    description: 'Care for your body and mind, and help with the basics.',
    Icon: HeartPulse,
    links: [
      {
        label: 'Student Health Clinic',
        href: 'https://health.gsu.edu/',
        placeId: '75-piedmont',
        description: 'Medical care for enrolled Georgia State students.',
      },
      {
        label: 'Counseling Center',
        href: 'https://counseling.gsu.edu/',
        placeId: '75-piedmont',
        description: 'Counseling, testing, psychiatric, and holistic health services for students.',
      },
      {
        label: 'Student Victim Assistance',
        href: 'https://counseling.gsu.edu/student-victim-assistance/',
        placeId: '75-piedmont',
        description: 'Crisis intervention, advocacy, and support for students.',
      },
      {
        label: 'Recreational Services',
        href: 'https://recreation.gsu.edu/',
        placeId: 'student-recreation-center',
        description: 'The rec center, fitness programs, and intramural sports.',
      },
      {
        label: 'BeWellPanthers',
        href: 'https://pin.gsu.edu/organization/bewellpanthers',
        description: 'Health and wellness programs and events for students.',
      },
      {
        label: 'Panther Pantry',
        href: 'https://pantry.gsu.edu/',
        placeId: '75-piedmont',
        description: 'Free food and essentials for GSU students.',
      },
    ],
  },
  {
    id: 'support',
    title: 'Student support',
    description: 'Offices that help when you need accommodations or don’t know where to turn.',
    Icon: HeartHandshake,
    links: [
      {
        label: 'Office of the Dean of Students',
        href: 'https://deanofstudents.gsu.edu/',
        placeId: 'student-center-east',
        description: 'Support for students facing personal, academic, or emergency challenges.',
      },
      {
        label: 'Access and Accommodations Center',
        href: 'https://access.gsu.edu/',
        placeId: 'student-center-east',
        description: 'Accommodations and access to campus resources for students with disabilities.',
      },
      {
        label: 'Military-connected Students',
        href: 'https://military.gsu.edu/',
        description: 'Support for veterans, current service members, and their families.',
      },
      {
        label: 'Office of the Ombudsperson',
        href: 'https://ombuds.gsu.edu/',
        placeId: '75-piedmont',
        description: 'Confidential, informal help resolving a problem with the university.',
      },
    ],
  },
  {
    id: 'campus-life',
    title: 'Campus life',
    description: 'Your ID, where you live, and getting around campus safely.',
    Icon: Building2,
    links: [
      {
        label: 'PantherCard',
        href: 'https://services.gsu.edu/panthercard-mobile/',
        placeId: 'student-center-west',
        description: 'Your student ID, on a card or on your phone with PantherCard Mobile.',
      },
      {
        label: 'University Housing',
        href: 'https://myhousing.gsu.edu/',
        description: 'Apply for on-campus housing and manage your assignment.',
      },
      {
        label: 'Student Center',
        href: 'https://engagement.gsu.edu/student-center/',
        placeId: 'student-center-east',
        description: 'Student Center East and West: hubs for student life, activities, and reservable spaces.',
      },
      {
        label: 'PantherDining',
        href: 'https://dining.gsu.edu/',
        description: 'Dining halls, meal plans, and hours. See also our Places to eat page.',
      },
      {
        label: 'University Bookstore',
        href: 'https://services.gsu.edu/university-bookstore/',
        placeId: 'university-bookstore',
        description: 'Textbooks, supplies, and Georgia State gear.',
      },
      {
        label: 'Parking & Transportation',
        href: 'https://parking.gsu.edu/',
        description: 'Parking permits, decks, and getting to campus.',
      },
      {
        label: 'Safety & Security',
        href: 'https://safety.gsu.edu/',
        placeId: 'gsu-police',
        description: 'The GSU Police Department and campus safety information.',
      },
      {
        label: 'LiveSafe',
        href: 'https://safety.gsu.edu/livesafe/',
        description: 'GSU’s safety app for contacting police and sharing tips.',
      },
    ],
  },
  {
    id: 'student-life',
    title: 'Student Life',
    description:
      'Departments in GSU’s Division of Student Engagement. Its health and support offices are listed in those sections above.',
    Icon: Users,
    links: [
      {
        label: 'Student Orientation & Family Engagement',
        href: 'https://orientation.gsu.edu/',
        placeId: 'student-center-east',
        description: 'New Student Orientation and resources for you and your family.',
      },
      {
        label: 'Student Organizations',
        href: 'https://engagement.gsu.edu/student-organizations/',
        placeId: 'student-center-west',
        description: 'Find your fit among 500+ registered student organizations.',
      },
      {
        label: 'Student Government Association',
        href: 'https://engagement.gsu.edu/sga/',
        placeId: 'student-center-west',
        description: 'The elected voice of Georgia State students.',
      },
      {
        label: 'Spotlight Programs Board',
        href: 'https://engagement.gsu.edu/spotlight/',
        placeId: 'student-center-west',
        description: 'Social, cultural, and educational events, often free to attend.',
      },
      {
        label: 'Cultures, Communities & Inclusion',
        href: 'https://engagement.gsu.edu/cci/',
        placeId: 'student-center-east',
        description: 'Programs reflecting the cultures, identities, and experiences of GSU students.',
      },
      {
        label: 'Fraternity & Sorority Life',
        href: 'https://engagement.gsu.edu/fraternity-sorority-life/',
        placeId: 'student-center-west',
        description: 'Join a fraternity or sorority on the Atlanta Campus.',
      },
      {
        label: 'Leadership & Service',
        href: 'https://engagement.gsu.edu/leadership-and-service/',
        placeId: 'student-center-west',
        description: 'Grow as a leader and get involved in your community.',
      },
      {
        label: 'Student Media',
        href: 'https://engagement.gsu.edu/student-media/',
        placeId: 'student-center-west',
        description: 'Student-run media, with hands-on experience for media careers.',
      },
      {
        label: 'International Student & Scholar Services',
        href: 'https://isss.gsu.edu/',
        placeId: 'student-success-center',
        description: 'Immigration and support resources for international students.',
      },
      {
        label: 'Commuter Students',
        href: 'https://engagement.gsu.edu/commuters/',
        placeId: 'student-center-west',
        description: 'Resources for students who commute to campus.',
      },
      {
        label: 'Testing Centers',
        href: 'https://testing.gsu.edu/',
        description: 'Exams, placement tests, and proctoring.',
      },
    ],
  },
  {
    id: 'involved',
    title: 'Get involved',
    description: 'Organizations, events, service, and school spirit.',
    Icon: Sparkles,
    links: [
      {
        label: 'Panther Involvement Network (PIN)',
        href: 'https://pin.gsu.edu',
        description: 'Find student organizations and RSVP to campus events.',
      },
      {
        label: 'Event Pass',
        href: 'https://pin.gsu.edu/eventpass',
        description: 'Your PIN pass for checking in at campus events.',
      },
      {
        label: 'POUNCE Rewards',
        href: 'https://pin.gsu.edu/organization/pouncerewards',
        description: 'GSU’s rewards program for getting involved on campus.',
      },
      {
        label: 'Paws for a Cause',
        href: 'https://gsu.givepulse.com',
        description: 'Find volunteer opportunities and track service hours on GivePulse.',
      },
      {
        label: 'GSU Athletics Schedule',
        href: 'https://georgiastatesports.com/calendar',
        description: 'Upcoming games for the Georgia State Panthers.',
      },
      {
        label: 'Homecoming',
        href: 'https://homecoming.gsu.edu/',
        description: 'A week of Panther pride events every fall.',
      },
    ],
  },
  {
    id: 'colleges',
    title: 'Colleges & schools',
    description: 'Find your college for advising, department contacts, and program news.',
    Icon: GraduationCap,
    links: [
      {
        label: 'College of Arts & Sciences',
        href: 'https://cas.gsu.edu/',
        placeId: '25-park-place',
        description: 'Majors across the humanities, natural sciences, and social sciences.',
      },
      {
        label: 'Robinson College of Business',
        href: 'https://robinson.gsu.edu/',
        placeId: 'robinson-college-of-business',
        description: 'Business degrees, research, and career-focused programs.',
      },
      {
        label: 'College of Education & Human Development',
        href: 'https://education.gsu.edu/',
        placeId: 'college-of-education',
        description: 'Programs in teaching, counseling, kinesiology, and human development.',
      },
      {
        label: 'Lewis College of Nursing & Health Professions',
        href: 'https://lewis.gsu.edu/',
        description: 'Nursing and health professions, with hands-on clinical training across Atlanta.',
      },
      {
        label: 'Andrew Young School of Policy Studies',
        href: 'https://ays.gsu.edu/',
        placeId: '55-park-place',
        description: 'Public policy, economics, criminal justice, and social work.',
      },
      {
        label: 'School of Public Health',
        href: 'https://publichealth.gsu.edu/',
        placeId: 'urban-life',
        description: 'Public health degrees, research, and community outreach.',
      },
      {
        label: 'Creative Media Industries Institute',
        href: 'https://cmii.gsu.edu/',
        placeId: '25-park-place',
        description: 'Connects students with the entertainment and media industries through tech training.',
      },
      {
        label: 'Honors College',
        href: 'https://honors.gsu.edu/',
        placeId: 'centennial-hall',
        description: 'Honors courses, advising, and research opportunities.',
      },
      {
        label: 'Perimeter College',
        href: 'https://perimeter.gsu.edu/',
        description: 'Associate degrees at GSU’s campuses across metro Atlanta.',
      },
      {
        label: 'College of Law',
        href: 'https://law.gsu.edu/',
        placeId: 'college-of-law',
        description: 'Georgia State’s law school.',
      },
      {
        label: 'Institute for Biomedical Sciences',
        href: 'https://biomedical.gsu.edu/',
        description: 'Graduate programs and research in the biomedical sciences.',
      },
      {
        label: 'The Graduate School',
        href: 'https://graduate.gsu.edu/',
        description: 'Master’s and doctoral programs across the university.',
      },
    ],
  },
]

/** Student-run GroupMe chats. */
export const GROUP_CHATS: readonly ResourceLink[] = [
  {
    label: 'GSU: The Panther’s Den',
    href: 'https://groupme.com/join_group/85358656/FPPSWTKT',
    description: 'The general chat for Georgia State students.',
  },
  {
    label: 'Free Foodies @ GSU',
    href: 'https://groupme.com/join_group/66858807/gnE4R3Sr',
    description: 'Heads-ups on free food at events around campus.',
  },
  {
    label: 'Housing & Roommates @ GSU',
    href: 'https://groupme.com/join_group/60204497/dfvGJd1T',
    description: 'Find roommates, subleases, and places to live.',
  },
]
