import type { Course, Student } from '../types'
import coursesJson from './courses.json'
import studentsJson from './students.json'

export const COURSES = coursesJson as Course[]
export const STUDENTS = studentsJson as Student[]
