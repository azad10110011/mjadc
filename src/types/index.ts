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
  name_bangla?: string
  gender: 'male' | 'female'
  designation: Designation
  subject: Subject
  joining_date: string
  date_of_birth?: string
  first_mpo_date?: string
  nid_number?: string
  mobile: string
  whatsapp_number?: string
  email: string
  photo_path?: string
  present_address?: string
  permanent_address?: string
}

export interface Staff {
  id: number
  user_id?: number
  name: string
  name_bangla?: string
  gender: 'male' | 'female'
  designation: StaffDesignation
  subject?: Subject
  joining_date: string
  date_of_birth?: string
  first_mpo_date?: string
  nid_number?: string
  mobile: string
  whatsapp_number?: string
  email: string
  photo_path?: string
  present_address?: string
  permanent_address?: string
}

export type Designation =
  | 'Principal' | 'Vice-Principal' | 'Assistant Professor'
  | 'Lecturer' | 'Library Lecturer' | 'Demonstrator'
  | 'Physical Teacher' | 'Assistant Teacher'

export type StaffDesignation =
  | 'Lab Assistant' | '3rd Class Employee'
  | '4th Class Employee' | 'Office Assistant (MLSS)'

export type Subject = string

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
  parts_data?: Record<string, number> | null
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
  user_id?: number | null
  user_name?: string
  leave_type: LeaveType
  total_days: number
  period: 'yearly' | 'lifetime'
}

export interface LeaveTaken {
  id: number
  user_id: number
  user_name?: string
  year: number
  leave_type: LeaveType
  period: 'yearly' | 'lifetime'
  days_taken: number
}

export interface LeaveSummaryItem {
  type: string
  allocated: number
  taken: number
  remaining: number
  period: 'yearly' | 'lifetime'
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
  position?: string
  mobile?: string
  photo_path?: string
  sort_order: number
}

export interface Principal {
  id: number
  name: string
  designation: string
  photo_path?: string
  message?: string
  sort_order: number
}

export interface TeachersCouncilMember {
  id: number
  name: string
  designation: string
  position?: string
  photo_path?: string
  sort_order: number
}

export interface CareerClubMember {
  id: number
  name: string
  designation: string
  position?: string
  photo_path?: string
  sort_order: number
}

export interface AcademicApproval {
  id: number
  heading: string
  image_path?: string
  image_width?: number
  image_height?: number
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

export interface SubjectPart {
  id?: number
  subject: Subject
  part_name: string
  full_mark: number
  pass_mark: number
  sort_order: number
}

export interface ChangelogEntry {
  id: number
  exam_result_id: number | null
  action: string
  old_data: Record<string, unknown> | null
  new_data: Record<string, unknown> | null
  user_id: number
  user_name: string
  user_email: string
  subject: string
  student_id: string
  exam_name: string
  class: string
  year: number
  created_at: string
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

export const DEFAULT_PARTS: SubjectPart[] = [
  { subject: '' as Subject, part_name: 'mcq', full_mark: 50, pass_mark: 8, sort_order: 1 },
  { subject: '' as Subject, part_name: 'cq', full_mark: 50, pass_mark: 17, sort_order: 2 },
  { subject: '' as Subject, part_name: 'practical', full_mark: 50, pass_mark: 8, sort_order: 3 },
]

export function calculateGradeFromParts(
  parts: Record<string, number>,
  partConfigs: SubjectPart[],
  absentIn: string[] = []
): { grade: string; points: number } {
  const hasAbsent = absentIn.length > 0
  let hasFail = false
  let total = 0

  for (const config of partConfigs) {
    const mark = parts[config.part_name] ?? 0
    if (absentIn.includes(config.part_name)) {
      continue
    }
    if (mark < config.pass_mark) {
      hasFail = true
    }
    total += mark
  }

  if (hasAbsent) {
    return { grade: 'Absent', points: 0.00 }
  }

  if (hasFail) {
    return { grade: 'F', points: 0.00 }
  }

  return calculateGrade(total)
}

export const DEPARTMENTS = [
  { slug: 'science', name: 'Science' },
  { slug: 'business-studies', name: 'Business Studies' },
  { slug: 'humanities', name: 'Humanities' },
  { slug: 'general', name: 'General' },
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

export function calculateGradeFromMarks(mcq: number, cq: number, practical: number, absentIn: string[] = []): { grade: string; points: number } {
  const hasAbsent = absentIn.length > 0

  const mcqFail = !absentIn.includes('mcq') && mcq < 8
  const cqFail = !absentIn.includes('cq') && cq < 17
  const practicalFail = !absentIn.includes('practical') && practical < 8
  const belowThreshold = mcqFail || cqFail || practicalFail

  if (hasAbsent) {
    return { grade: 'Absent', points: 0.00 }
  }

  if (belowThreshold) {
    return { grade: 'F', points: 0.00 }
  }

  const total = mcq + cq + practical
  return calculateGrade(total)
}

export const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]
