export type UserRole = 'visitor' | 'student' | 'teacher' | 'staff' | 'exam_controller' | 'administration' | 'principal' | 'admin'

export interface User {
  id: number
  name: string
  email: string
  password_hash: string
  gender: 'male' | 'female'
  roles: UserRole[]
  status: 'active' | 'frozen'
  created_at: string
}

export type StudentGroup = 'Science' | 'Business Studies' | 'Humanities'

export interface Student {
  id: number
  user_id?: number
  student_id: string
  name: string
  father_name: string
  mother_name: string
  date_of_birth?: string
  class: '11th' | '12th'
  section?: string
  joining_year: number
  mobile: string
  email?: string
  gender: 'male' | 'female'
  parent_mobile?: string
  whatsapp?: string
  present_address?: string
  permanent_address?: string
  student_group?: StudentGroup
  compulsory_subjects?: string[]
  selective_subjects?: string[]
  photo_path?: string
}

export interface Teacher {
  id: number
  user_id?: number
  name: string
  gender: 'male' | 'female'
  designation: Designation
  subject: Subject
  joining_date: string
  mobile: string
  email: string
  photo_path?: string
}

export interface Staff {
  id: number
  user_id?: number
  name: string
  gender: 'male' | 'female'
  designation: StaffDesignation
  subject?: Subject
  joining_date: string
  mobile: string
  email: string
  photo_path?: string
}

export type Designation =
  | 'Principal' | 'Vice-Principal' | 'Assistant Professor'
  | 'Lecturer' | 'Library Lecturer' | 'Demonstrator'
  | 'Physical Teacher' | 'Assistant Teacher'

export type StaffDesignation =
  | 'Lab Assistant' | '3rd Class Employee'
  | '4th Class Employee' | 'Office Assistant (MLSS)'

export type Subject =
  | 'Bangla' | 'English' | 'ICT' | 'Political Science'
  | 'Economics' | 'Geography' | 'Philosophy' | 'Sociology'
  | 'Social Welfare' | 'History' | 'Islamic History'
  | 'Islamic Studies' | 'Psychology' | 'Statistics'
  | 'Agriculture' | 'Home Economics' | 'Physics' | 'Chemistry'
  | 'Biology' | 'Higher Math' | 'Management' | 'Marketing'
  | 'Production Management & Marketing' | 'Accounting'
  | 'Finance Banking & Insurance' | 'Finance & Banking'

export type StudentClass = '11th' | '12th'

export type ExamName =
  | 'Half Yearly' | 'Year Final' | 'Model Test'
  | 'Pre-Test' | 'Test'

export const EXAM_NAMES: Record<StudentClass, ExamName[]> = {
  '11th': ['Half Yearly', 'Year Final', 'Model Test'],
  '12th': ['Pre-Test', 'Test', 'Model Test'],
}

export interface ExamResult {
  id: number
  student_id: number
  year: number
  class: StudentClass
  exam_name: ExamName
  subject: Subject
  mcq: number
  cq: number
  practical: number
  total: number
  grade: string
  gpa: number
  status: 'draft' | 'approved' | 'published'
  uploaded_by?: number
  approved_by?: number
}

export interface Notice {
  id: number
  title: string
  body: string
  status: 'published' | 'draft'
  pdf_path?: string
  published_at: string
  created_by: number
}

export interface TuitionFee {
  id: number
  student_id: number
  year: number
  month: number
  amount_due: number
  amount_paid: number
  paid_at?: string
  payment_method: 'cash' | 'online'
  transaction_id?: string
  waiver_amount: number
}

export interface LeaveAllocation {
  id: number
  role_type: 'teacher' | 'staff' | 'principal'
  leave_type: LeaveType
  total_days: number
}

export interface LeaveApplication {
  id: number
  applicant_id: number
  applicant_role: 'teacher' | 'staff' | 'principal'
  leave_type: LeaveType
  from_date: string
  to_date: string
  reason: string
  document_path?: string
  status: 'pending' | 'approved' | 'rejected'
  reviewed_by?: number
  reviewed_at?: string
  created_at: string
}

export type LeaveType = 'casual' | 'medical' | 'maternity' | 'without_pay'

export interface Admission {
  id: number
  applicant_name: string
  programme: '11th' | '12th' | 'Degree (Pass)'
  group?: 'Science' | 'Business Studies' | 'Humanities'
  form_data: Record<string, unknown>
  fee_paid: boolean
  transaction_id?: string
  submitted_at: string
}

export interface GalleryImage {
  id: number
  caption: string
  event_name: string
  photo_path: string
  uploaded_at: string
}

export interface CalendarEvent {
  id: number
  title: string
  description: string
  event_date: string
}

export interface Syllabus {
  id: number
  class: StudentClass | 'Degree'
  department?: string
  subject?: Subject
  pdf_path: string
  uploaded_at: string
}

export interface ClassRoutine {
  id: number
  class: StudentClass
  section?: string
  pdf_path: string
  uploaded_at: string
}

export interface DownloadableForm {
  id: number
  form_name: string
  pdf_path: string
  uploaded_at: string
}

export interface SiteSetting {
  id: number
  setting_key: string
  setting_value: string
  updated_by?: number
  updated_at: string
}

export interface GoverningBodyMember {
  id: number
  name: string
  designation: string
  position: string
  photo_path?: string
  sort_order: number
}

export interface CoCurricularMember {
  id: number
  club: 'BNCC' | 'Rover Scout' | 'Science Club' | 'Debating Club'
  name: string
  designation: string
  mobile: string
  photo_path?: string
}

export interface GradePoint {
  min: number
  max: number
  grade: string
  points: number
}

export const GRADE_TABLE: GradePoint[] = [
  { min: 80, max: 100, grade: 'A+', points: 5.00 },
  { min: 70, max: 79, grade: 'A', points: 4.00 },
  { min: 60, max: 69, grade: 'A-', points: 3.50 },
  { min: 50, max: 59, grade: 'B', points: 3.00 },
  { min: 40, max: 49, grade: 'C', points: 2.00 },
  { min: 33, max: 39, grade: 'D', points: 1.00 },
  { min: 0, max: 32, grade: 'F', points: 0.00 },
]

export const SUBJECTS: Subject[] = [
  'Bangla', 'English', 'ICT', 'Political Science',
  'Economics', 'Geography', 'Philosophy', 'Sociology',
  'Social Welfare', 'History', 'Islamic History',
  'Islamic Studies', 'Psychology', 'Statistics',
  'Agriculture', 'Home Economics', 'Physics', 'Chemistry',
  'Biology', 'Higher Math', 'Management', 'Marketing',
  'Production Management & Marketing', 'Accounting',
  'Finance Banking & Insurance', 'Finance & Banking',
]

export const DEPARTMENTS = [
  { slug: 'science', name: 'Science' },
  { slug: 'business-studies', name: 'Business Studies' },
  { slug: 'humanities', name: 'Humanities' },
  { slug: 'bmt', name: 'BMT (Business Management & Technology)' },
]

export const CO_CURRICULAR_CLUBS = [
  { slug: 'bncc', name: 'BNCC' },
  { slug: 'rover-scout', name: 'Rover Scout' },
  { slug: 'science-club', name: 'Science Club' },
  { slug: 'debating-club', name: 'Debating Club' },
]

export function calculateGrade(total: number): { grade: string; points: number } {
  for (const row of GRADE_TABLE) {
    if (total >= row.min && total <= row.max) {
      return { grade: row.grade, points: row.points }
    }
  }
  return { grade: 'F', points: 0.00 }
}

export const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]
