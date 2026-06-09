export interface User {
  id: number;
  name: string;
  matricula: string;
  career: string;
  role: 'Alumno' | 'Profesor' | 'Bibliotecario';
  activeLoans: number;
  email?: string;
  password: string;
}